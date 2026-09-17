import {
  ProviderError,
  type GenerateRequest,
  type GenerateResult,
  type GenerationMode,
  type ImageProvider,
} from "./types";

const API = "https://api.replicate.com/v1";

/**
 * Replicate-hosted generation.
 *
 * Model slugs are configurable because input schemas differ per model family;
 * `buildInput` below knows the three common families (flux, sdxl/sd, esrgan).
 * A slug with a `:version` suffix is run through /predictions, a bare
 * `owner/name` through the official-model endpoint.
 */
export class ReplicateProvider implements ImageProvider {
  readonly id = "replicate";

  private get token() {
    return process.env.REPLICATE_API_TOKEN;
  }
  private get textModel() {
    return process.env.REPLICATE_MODEL ?? "black-forest-labs/flux-schnell";
  }
  private get imageModel() {
    return process.env.REPLICATE_IMG2IMG_MODEL ?? process.env.REPLICATE_MODEL ?? "black-forest-labs/flux-dev";
  }
  private get upscaleModel() {
    return (
      process.env.REPLICATE_UPSCALE_MODEL ??
      "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa"
    );
  }

  unavailableReason(): string | null {
    return this.token
      ? null
      : "REPLICATE_API_TOKEN is not set. Add it to .env.local or switch PROVIDER=mock.";
  }

  supports(_mode: GenerationMode): boolean {
    return true;
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const reason = this.unavailableReason();
    if (reason) throw new ProviderError(reason, 503);

    const model =
      req.mode === "upscale"
        ? this.upscaleModel
        : req.mode === "img2img"
          ? this.imageModel
          : this.textModel;

    const input = buildInput(model, req);
    const prediction = await this.createPrediction(model, input);
    const output = await this.awaitOutput(prediction);

    return {
      image: { url: output, contentType: "image/png" },
      model,
    };
  }

  private async createPrediction(model: string, input: Record<string, unknown>) {
    const [slug, version] = model.split(":");
    const url = version ? `${API}/predictions` : `${API}/models/${slug}/predictions`;
    const body = version ? { version, input } : { input };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        // Ask Replicate to hold the connection open until the run finishes.
        Prefer: "wait=60",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });

    const json = (await res.json().catch(() => ({}))) as ReplicatePrediction & {
      detail?: string;
      title?: string;
    };

    if (!res.ok) {
      throw new ProviderError(
        `Replicate rejected the request (${res.status}): ${json.detail ?? json.title ?? "unknown error"}`,
        res.status === 402 ? 402 : 502,
      );
    }
    return json;
  }

  /** `Prefer: wait` usually returns a finished run; poll if it didn't. */
  private async awaitOutput(prediction: ReplicatePrediction): Promise<string> {
    let current = prediction;
    const deadline = Date.now() + 120_000;

    while (current.status === "starting" || current.status === "processing") {
      if (Date.now() > deadline) {
        throw new ProviderError("Generation timed out after 2 minutes.", 504);
      }
      await new Promise((r) => setTimeout(r, 1500));
      const res = await fetch(current.urls?.get ?? `${API}/predictions/${current.id}`, {
        headers: { Authorization: `Bearer ${this.token}` },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new ProviderError(`Replicate poll failed (${res.status}).`);
      current = (await res.json()) as ReplicatePrediction;
    }

    if (current.status !== "succeeded") {
      throw new ProviderError(
        `Generation ${current.status}: ${current.error ?? "no detail returned"}`,
      );
    }

    const url = Array.isArray(current.output) ? current.output[0] : current.output;
    if (typeof url !== "string") {
      throw new ProviderError("Replicate returned no image URL.");
    }
    return url;
  }
}

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
  urls?: { get?: string };
}

type Family = "flux" | "sdxl" | "upscaler" | "generic";

function familyOf(model: string): Family {
  const m = model.toLowerCase();
  if (/esrgan|swinir|upscal|clarity/.test(m)) return "upscaler";
  if (m.includes("flux")) return "flux";
  if (/sdxl|stable-diffusion/.test(m)) return "sdxl";
  return "generic";
}

/** Flux takes a named aspect ratio rather than explicit pixel dimensions. */
function aspectRatio(width: number, height: number): string {
  const options: Array<[string, number]> = [
    ["1:1", 1], ["16:9", 16 / 9], ["9:16", 9 / 16], ["3:2", 3 / 2],
    ["2:3", 2 / 3], ["4:5", 4 / 5], ["5:4", 5 / 4], ["21:9", 21 / 9], ["9:21", 9 / 21],
  ];
  const target = width / height;
  return options.reduce((best, cur) =>
    Math.abs(cur[1] - target) < Math.abs(best[1] - target) ? cur : best,
  )[0];
}

function buildInput(model: string, req: GenerateRequest): Record<string, unknown> {
  const family = familyOf(model);

  if (req.mode === "upscale" || family === "upscaler") {
    return { image: req.sourceImage, scale: req.scale ?? 2, face_enhance: false };
  }

  if (family === "flux") {
    const input: Record<string, unknown> = {
      prompt: req.prompt,
      aspect_ratio: aspectRatio(req.width, req.height),
      num_outputs: 1,
      output_format: "png",
      seed: req.seed,
    };
    // flux-schnell fixes its step count; only -dev / -pro accept these.
    if (!model.includes("schnell")) {
      input.num_inference_steps = Math.min(req.steps, 50);
      input.guidance = req.guidance;
    }
    if (req.mode === "img2img" && req.sourceImage) {
      input.image = req.sourceImage;
      input.prompt_strength = req.strength ?? 0.65;
    }
    return input;
  }

  // sdxl / stable-diffusion / anything else that speaks the classic schema
  const input: Record<string, unknown> = {
    prompt: req.prompt,
    negative_prompt: req.negativePrompt || undefined,
    width: req.width,
    height: req.height,
    num_inference_steps: req.steps,
    guidance_scale: req.guidance,
    seed: req.seed,
    num_outputs: 1,
  };
  if (req.mode === "img2img" && req.sourceImage) {
    input.image = req.sourceImage;
    input.prompt_strength = req.strength ?? 0.65;
  }
  return input;
}

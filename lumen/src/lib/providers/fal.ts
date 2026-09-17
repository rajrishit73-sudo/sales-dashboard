import {
  ProviderError,
  type GenerateRequest,
  type GenerateResult,
  type GenerationMode,
  type ImageProvider,
} from "./types";

/**
 * fal.ai synchronous endpoints (https://fal.run/<model>). Usually the cheapest
 * and fastest of the hosted options; the response shape is uniform across
 * their image models, so this adapter stays small.
 */
export class FalProvider implements ImageProvider {
  readonly id = "fal";

  private get key() {
    return process.env.FAL_KEY;
  }
  private model(mode: GenerationMode): string {
    if (mode === "upscale") return process.env.FAL_UPSCALE_MODEL ?? "fal-ai/esrgan";
    if (mode === "img2img") {
      return process.env.FAL_IMG2IMG_MODEL ?? "fal-ai/flux/dev/image-to-image";
    }
    return process.env.FAL_MODEL ?? "fal-ai/flux/schnell";
  }

  unavailableReason(): string | null {
    return this.key
      ? null
      : "FAL_KEY is not set. Add it to .env.local or switch PROVIDER=mock.";
  }

  supports(_mode: GenerationMode): boolean {
    return true;
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const reason = this.unavailableReason();
    if (reason) throw new ProviderError(reason, 503);

    const model = this.model(req.mode);
    const res = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${this.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildInput(req)),
      signal: AbortSignal.timeout(120_000),
    });

    const json = (await res.json().catch(() => ({}))) as FalResponse;

    if (!res.ok) {
      throw new ProviderError(
        `fal.ai rejected the request (${res.status}): ${json.detail ?? "unknown error"}`,
        res.status === 402 ? 402 : 502,
      );
    }

    const image = json.images?.[0] ?? json.image;
    if (!image?.url) throw new ProviderError("fal.ai returned no image.");

    return {
      image: { url: image.url, contentType: image.content_type ?? "image/png" },
      model,
    };
  }
}

interface FalImage {
  url: string;
  content_type?: string;
}
interface FalResponse {
  images?: FalImage[];
  image?: FalImage;
  detail?: string;
}

function buildInput(req: GenerateRequest): Record<string, unknown> {
  if (req.mode === "upscale") {
    return { image_url: req.sourceImage, scale: req.scale ?? 2 };
  }

  const input: Record<string, unknown> = {
    prompt: req.prompt,
    negative_prompt: req.negativePrompt || undefined,
    image_size: { width: req.width, height: req.height },
    num_inference_steps: req.steps,
    guidance_scale: req.guidance,
    num_images: 1,
    seed: req.seed,
    enable_safety_checker: true,
  };

  if (req.mode === "img2img" && req.sourceImage) {
    input.image_url = req.sourceImage;
    input.strength = req.strength ?? 0.65;
  }
  return input;
}

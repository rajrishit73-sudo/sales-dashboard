import "server-only";
import { prisma } from "@/lib/db";
import { applyPreset } from "@/lib/presets";
import { creditCost, type Plan } from "@/lib/plans";
import { refundCredits, spendCredits } from "@/lib/credits";
import { getImage, persistProviderImage } from "@/lib/storage";
import { getProvider, ProviderError, type GenerationMode } from "@/lib/providers";

export interface RunGenerationInput {
  userId: string;
  plan: Plan;
  mode: GenerationMode;
  prompt: string;
  negativePrompt?: string | null;
  preset?: string | null;
  width: number;
  height: number;
  steps: number;
  guidance: number;
  seed?: number | null;
  strength?: number | null;
  scale?: number | null;
  sourceImageUrl?: string | null;
}

/**
 * The whole generation lifecycle: clamp to plan limits, debit credits, record
 * the attempt, call the provider, persist the image. Credits are refunded on
 * any provider failure so users never pay for our errors.
 */
export async function runGeneration(input: RunGenerationInput) {
  const provider = getProvider();

  const unavailable = provider.unavailableReason();
  if (unavailable) throw new ProviderError(unavailable, 503);
  if (!provider.supports(input.mode)) {
    throw new ProviderError(`Provider "${provider.id}" can't do ${input.mode}.`, 400);
  }

  const { width, height } = clampToPlan(input.width, input.height, input.plan);
  const seed = input.seed ?? Math.floor(Math.random() * 2_147_483_647);
  const cost = creditCost({
    mode: input.mode,
    width,
    height,
    scale: input.scale ?? undefined,
  });

  await spendCredits(input.userId, cost, `generation_${input.mode}`, {
    prompt: input.prompt.slice(0, 120),
  });

  const { positive, negative } = applyPreset(
    input.preset,
    input.prompt,
    input.negativePrompt,
  );

  const record = await prisma.generation.create({
    data: {
      userId: input.userId,
      mode: input.mode,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt || null,
      preset: input.preset || null,
      width,
      height,
      steps: input.steps,
      guidance: input.guidance,
      seed,
      strength: input.strength ?? null,
      scale: input.scale ?? null,
      sourceImageUrl: input.sourceImageUrl || null,
      provider: provider.id,
      model: "pending",
      status: "pending",
      creditsCost: cost,
    },
  });

  const startedAt = Date.now();
  try {
    const sourceImage = input.sourceImageUrl
      ? await resolveSourceImage(input.sourceImageUrl)
      : undefined;

    const result = await provider.generate({
      mode: input.mode,
      prompt: positive,
      negativePrompt: negative,
      width,
      height,
      steps: input.steps,
      guidance: input.guidance,
      seed,
      strength: input.strength ?? undefined,
      scale: input.scale ?? undefined,
      sourceImage,
    });

    const imageUrl = await persistProviderImage(input.userId, result.image);

    return prisma.generation.update({
      where: { id: record.id },
      data: {
        status: "succeeded",
        imageUrl,
        model: result.model,
        durationMs: Date.now() - startedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    await prisma.generation.update({
      where: { id: record.id },
      data: { status: "failed", error: message.slice(0, 500), durationMs: Date.now() - startedAt },
    });
    await refundCredits(input.userId, cost, `refund_${input.mode}_failed`, {
      generationId: record.id,
    });
    throw error;
  }
}

/** Plans cap output size; scale the request down rather than rejecting it. */
function clampToPlan(width: number, height: number, plan: Plan) {
  const max = plan.maxResolution;
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const factor = max / longest;
  // Diffusion models want multiples of 8.
  const round8 = (n: number) => Math.max(512, Math.round((n * factor) / 8) * 8);
  return { width: round8(width), height: round8(height) };
}

/**
 * Providers fetch source images over the public internet, which can't reach a
 * local /api/files URL. Inline those as data URLs; pass real URLs through.
 */
async function resolveSourceImage(url: string): Promise<string> {
  if (url.startsWith("data:") || /^https?:\/\//.test(url)) return url;

  const key = url.replace(/^\/api\/files\//, "");
  const file = await getImage(key);
  if (!file) throw new ProviderError("Source image could not be found.", 404);

  return `data:${file.contentType};base64,${file.bytes.toString("base64")}`;
}

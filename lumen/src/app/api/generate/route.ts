import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { runGeneration } from "@/lib/generate";
import { fail, handleError, ok } from "@/lib/http";
import { PRESET_MAP } from "@/lib/presets";

const schema = z
  .object({
    mode: z.enum(["txt2img", "img2img", "upscale"]).default("txt2img"),
    prompt: z.string().trim().max(2000).default(""),
    negativePrompt: z.string().trim().max(1000).optional(),
    preset: z.string().optional(),
    width: z.number().int().min(512).max(2048).default(1024),
    height: z.number().int().min(512).max(2048).default(1024),
    steps: z.number().int().min(1).max(60).default(30),
    guidance: z.number().min(0).max(20).default(7),
    seed: z.number().int().min(0).max(2_147_483_647).nullish(),
    strength: z.number().min(0.05).max(1).optional(),
    scale: z.union([z.literal(2), z.literal(4)]).optional(),
    sourceImageUrl: z.string().max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode !== "upscale" && value.prompt.length < 2) {
      ctx.addIssue({ code: "custom", path: ["prompt"], message: "Describe what you want to see." });
    }
    if (value.mode !== "txt2img" && !value.sourceImageUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceImageUrl"],
        message: "Pick a source image first.",
      });
    }
    if (value.preset && !PRESET_MAP.has(value.preset)) {
      ctx.addIssue({ code: "custom", path: ["preset"], message: "Unknown style preset." });
    }
  });

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to generate images.", 401);

    const input = schema.parse(await request.json());

    const generation = await runGeneration({
      userId: user.id,
      plan: user.plan,
      mode: input.mode,
      prompt: input.mode === "upscale" && !input.prompt ? "Upscale" : input.prompt,
      negativePrompt: input.negativePrompt,
      preset: input.mode === "upscale" ? null : input.preset,
      width: input.width,
      height: input.height,
      steps: input.steps,
      guidance: input.guidance,
      seed: input.seed ?? null,
      strength: input.strength,
      scale: input.scale,
      sourceImageUrl: input.sourceImageUrl,
    });

    return ok({ generation, creditsRemaining: user.credits - generation.creditsCost });
  } catch (error) {
    return handleError(error);
  }
}

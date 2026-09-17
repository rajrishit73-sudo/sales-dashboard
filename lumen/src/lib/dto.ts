import type { Generation } from "@prisma/client";

/** Plain, serialisable shape handed to client components. */
export interface GenerationDTO {
  id: string;
  mode: string;
  prompt: string;
  negativePrompt: string | null;
  preset: string | null;
  width: number;
  height: number;
  steps: number;
  guidance: number;
  seed: number | null;
  strength: number | null;
  scale: number | null;
  sourceImageUrl: string | null;
  provider: string;
  model: string;
  status: string;
  error: string | null;
  imageUrl: string | null;
  creditsCost: number;
  favorite: boolean;
  durationMs: number | null;
  createdAt: string;
}

export function toDTO(generation: Generation): GenerationDTO {
  return { ...generation, createdAt: generation.createdAt.toISOString() };
}

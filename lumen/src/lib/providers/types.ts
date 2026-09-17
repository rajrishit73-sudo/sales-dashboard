export type GenerationMode = "txt2img" | "img2img" | "upscale";

export interface GenerateRequest {
  mode: GenerationMode;
  /** Already expanded through the style preset. */
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  guidance: number;
  seed: number;
  /** img2img only: 0 = keep source, 1 = ignore source. */
  strength?: number;
  /** upscale only: 2 or 4. */
  scale?: number;
  /** img2img / upscale: absolute URL or data: URL of the source image. */
  sourceImage?: string;
}

export interface ProviderImage {
  bytes?: Uint8Array;
  url?: string;
  contentType: string;
}

export interface GenerateResult {
  image: ProviderImage;
  model: string;
}

export interface ImageProvider {
  readonly id: string;
  /** Human-readable reason this provider can't run, or null when ready. */
  unavailableReason(): string | null;
  supports(mode: GenerationMode): boolean;
  generate(req: GenerateRequest): Promise<GenerateResult>;
}

export class ProviderError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
    this.name = "ProviderError";
  }
}

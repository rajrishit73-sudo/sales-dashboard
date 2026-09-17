/**
 * Style presets. The concept (and the prompt-template shape with a {prompt}
 * placeholder) follows InvokeAI's style-preset system: the preset wraps the
 * user's prompt rather than replacing it, so the user's intent survives.
 */
export interface StylePreset {
  key: string;
  label: string;
  description: string;
  /** `{prompt}` is substituted with the user's text. */
  positive: string;
  negative: string;
  guidance: number;
  steps: number;
  /** Two CSS colors used for the swatch in the picker. */
  swatch: [string, string];
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    key: "none",
    label: "None",
    description: "Your prompt, untouched.",
    positive: "{prompt}",
    negative: "",
    guidance: 7,
    steps: 30,
    swatch: ["#64748b", "#334155"],
  },
  {
    key: "photoreal",
    label: "Photoreal",
    description: "Full-frame camera look, natural light.",
    positive:
      "{prompt}, photorealistic, shot on a full-frame DSLR, 85mm lens, natural lighting, shallow depth of field, high detail, colour-graded",
    negative:
      "illustration, drawing, painting, cartoon, anime, cgi, render, plastic skin, lowres, watermark, text",
    guidance: 5.5,
    steps: 34,
    swatch: ["#d6bfa6", "#6b4f3a"],
  },
  {
    key: "cinematic",
    label: "Cinematic",
    description: "Anamorphic, moody, film-grade colour.",
    positive:
      "{prompt}, cinematic still, anamorphic lens flare, dramatic rim lighting, teal and orange colour grade, film grain, 35mm, shallow focus",
    negative: "flat lighting, snapshot, lowres, watermark, text, oversaturated",
    guidance: 7,
    steps: 36,
    swatch: ["#1e3a5f", "#e8813a"],
  },
  {
    key: "product",
    label: "Product Shot",
    description: "Clean studio packshot on seamless backdrop.",
    positive:
      "{prompt}, professional product photography, seamless studio backdrop, soft box lighting, crisp reflections, centred composition, ultra sharp, commercial catalogue quality",
    negative:
      "cluttered background, hands, people, text, watermark, harsh shadows, lowres, blurry",
    guidance: 6,
    steps: 34,
    swatch: ["#f4f4f5", "#a1a1aa"],
  },
  {
    key: "illustration",
    label: "Illustration",
    description: "Editorial vector-ish illustration.",
    positive:
      "{prompt}, modern editorial illustration, bold flat shapes, limited colour palette, clean linework, subtle grain texture, balanced composition",
    negative: "photorealistic, 3d render, photograph, watermark, text, cluttered",
    guidance: 8,
    steps: 30,
    swatch: ["#ff7a59", "#2d3a8c"],
  },
  {
    key: "anime",
    label: "Anime",
    description: "Modern cel-shaded anime key art.",
    positive:
      "{prompt}, anime key visual, cel shading, crisp lineart, vibrant colours, detailed eyes, studio-quality background art",
    negative:
      "photorealistic, 3d render, western cartoon, deformed hands, extra limbs, lowres, watermark, text",
    guidance: 8.5,
    steps: 32,
    swatch: ["#ff9ecd", "#5b6ee1"],
  },
  {
    key: "concept",
    label: "Concept Art",
    description: "Painterly production design.",
    positive:
      "{prompt}, concept art, matte painting, dramatic scale, atmospheric perspective, painterly brushwork, production design, trending on artstation",
    negative: "snapshot, lowres, jpeg artifacts, watermark, text, flat lighting",
    guidance: 7.5,
    steps: 36,
    swatch: ["#6d5b8f", "#c9a227"],
  },
  {
    key: "3d",
    label: "3D Render",
    description: "Soft-lit stylised 3D.",
    positive:
      "{prompt}, stylised 3d render, octane render, soft global illumination, subsurface scattering, pastel materials, clean topology, studio hdri",
    negative: "photograph, 2d illustration, flat, lowres, watermark, text, noisy",
    guidance: 7,
    steps: 32,
    swatch: ["#b7e0ff", "#7c5cff"],
  },
  {
    key: "minimal",
    label: "Minimal",
    description: "Negative space, one idea, calm palette.",
    positive:
      "{prompt}, minimalist composition, generous negative space, muted palette, soft even lighting, geometric balance, elegant restraint",
    negative: "busy, cluttered, ornate, high contrast, text, watermark, noisy",
    guidance: 6.5,
    steps: 28,
    swatch: ["#ede9e3", "#8c8478"],
  },
  {
    key: "neon",
    label: "Neon Noir",
    description: "Rain-slick streets and hard neon.",
    positive:
      "{prompt}, neon noir, rain-slicked reflective streets, magenta and cyan neon signage, volumetric fog, high contrast, night, cinematic",
    negative: "daylight, pastel, flat lighting, lowres, watermark, text",
    guidance: 8,
    steps: 34,
    swatch: ["#ff2e88", "#00e5ff"],
  },
];

export const PRESET_MAP = new Map(STYLE_PRESETS.map((p) => [p.key, p]));

export function applyPreset(
  presetKey: string | null | undefined,
  prompt: string,
  userNegative?: string | null,
): { positive: string; negative: string } {
  const preset = PRESET_MAP.get(presetKey ?? "none") ?? PRESET_MAP.get("none")!;
  const positive = preset.positive.replace("{prompt}", prompt.trim());
  const negative = [userNegative?.trim(), preset.negative]
    .filter(Boolean)
    .join(", ");
  return { positive, negative };
}

export interface AspectRatio {
  key: string;
  label: string;
  hint: string;
  width: number;
  height: number;
}

/** SDXL-friendly buckets — these are the resolutions the model was trained on. */
export const ASPECT_RATIOS: AspectRatio[] = [
  { key: "1:1", label: "Square", hint: "1024 x 1024", width: 1024, height: 1024 },
  { key: "4:5", label: "Portrait", hint: "896 x 1152", width: 896, height: 1152 },
  { key: "2:3", label: "Tall", hint: "832 x 1216", width: 832, height: 1216 },
  { key: "3:2", label: "Landscape", hint: "1216 x 832", width: 1216, height: 832 },
  { key: "16:9", label: "Wide", hint: "1344 x 768", width: 1344, height: 768 },
];

export function ratioForSize(width: number, height: number): AspectRatio {
  return (
    ASPECT_RATIOS.find((r) => r.width === width && r.height === height) ??
    ASPECT_RATIOS[0]
  );
}

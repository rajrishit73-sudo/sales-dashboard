import { createHash } from "node:crypto";
import type {
  GenerateRequest,
  GenerateResult,
  GenerationMode,
  ImageProvider,
} from "./types";

/**
 * Offline provider. Renders a deterministic abstract composition as SVG so the
 * whole product — credits, gallery, history, billing — is exercisable with no
 * API key and no GPU. Swap PROVIDER=replicate|fal for real generations.
 */
export class MockProvider implements ImageProvider {
  readonly id = "mock";

  unavailableReason(): string | null {
    return null;
  }

  supports(_mode: GenerationMode): boolean {
    return true;
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    // A touch of latency so loading states are visible while developing.
    await new Promise((r) => setTimeout(r, 450 + Math.random() * 700));

    const width = req.mode === "upscale" ? req.width * (req.scale ?? 2) : req.width;
    const height = req.mode === "upscale" ? req.height * (req.scale ?? 2) : req.height;
    const svg = renderSvg(req, width, height);

    return {
      image: {
        bytes: new TextEncoder().encode(svg),
        contentType: "image/svg+xml",
      },
      model: "lumen-mock-v1",
    };
  }
}

/** Deterministic number stream seeded by prompt + seed. */
function rng(seedInput: string): () => number {
  let digest = createHash("sha256").update(seedInput).digest();
  let index = 0;
  return () => {
    if (index >= digest.length - 4) {
      digest = createHash("sha256").update(digest).digest();
      index = 0;
    }
    const value = digest.readUInt32BE(index) / 0xffffffff;
    index += 4;
    return value;
  };
}

function renderSvg(req: GenerateRequest, width: number, height: number): string {
  const next = rng(`${req.prompt}|${req.seed}|${req.mode}`);
  const baseHue = Math.floor(next() * 360);
  const scheme = [0, 35, -40, 150, 190].map((offset) => (baseHue + offset + 360) % 360);

  const blobs = Array.from({ length: 7 }, (_, i) => {
    const hue = scheme[i % scheme.length];
    const cx = Math.round(next() * width);
    const cy = Math.round(next() * height);
    const r = Math.round((0.18 + next() * 0.38) * Math.max(width, height));
    const sat = 55 + Math.round(next() * 35);
    const light = 38 + Math.round(next() * 34);
    const opacity = (0.45 + next() * 0.4).toFixed(2);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="hsl(${hue} ${sat}% ${light}%)" opacity="${opacity}"/>`;
  }).join("");

  const strokes = Array.from({ length: 5 }, () => {
    const y = Math.round(next() * height);
    const sweep = Math.round((next() - 0.5) * height * 0.6);
    const hue = scheme[Math.floor(next() * scheme.length)];
    const w = (1 + next() * 3).toFixed(1);
    return `<path d="M -40 ${y} Q ${width / 2} ${y + sweep} ${width + 40} ${y - sweep / 2}" fill="none" stroke="hsl(${hue} 90% 78%)" stroke-width="${w}" opacity="0.35"/>`;
  }).join("");

  const label = escapeXml(truncate(req.prompt, 72));
  const badge = req.mode === "upscale" ? `upscaled ${req.scale ?? 2}x` : req.mode;
  const fontSize = Math.max(13, Math.round(width / 46));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${scheme[0]} 60% 12%)"/>
      <stop offset="100%" stop-color="hsl(${scheme[2]} 55% 24%)"/>
    </linearGradient>
    <filter id="soften" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${Math.round(Math.max(width, height) / 18)}"/>
    </filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="${req.seed % 9999}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.08"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <g filter="url(#soften)">${blobs}</g>
  <g filter="url(#soften)" opacity="0.8">${strokes}</g>
  <rect width="${width}" height="${height}" filter="url(#grain)" opacity="0.9"/>
  <rect x="0" y="${height - fontSize * 3.6}" width="${width}" height="${fontSize * 3.6}" fill="rgba(6,8,15,0.55)"/>
  <text x="${fontSize}" y="${height - fontSize * 1.9}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${fontSize}" fill="rgba(255,255,255,0.92)">${label}</text>
  <text x="${fontSize}" y="${height - fontSize * 0.7}" font-family="ui-monospace, monospace" font-size="${Math.round(fontSize * 0.78)}" fill="rgba(255,255,255,0.55)">mock provider &#183; ${badge} &#183; seed ${req.seed} &#183; ${width}&#215;${height}</text>
</svg>`;
}

function truncate(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
}

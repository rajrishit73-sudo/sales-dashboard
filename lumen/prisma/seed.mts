/**
 * Seeds a demo account with a handful of mock generations so a fresh clone has
 * something to look at. Safe to re-run: it upserts and skips if images exist.
 *
 * Standalone on purpose — no imports from src/ — so it runs under plain node.
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@lumen.studio";
const DEMO_PASSWORD = "demo1234";
const STORAGE_DIR = path.resolve(
  process.env.STORAGE_DIR ?? path.join(process.cwd(), ".data", "uploads"),
);

const SAMPLES = [
  { prompt: "a lighthouse on a basalt cliff at dusk, storm rolling in", preset: "cinematic", w: 1216, h: 832 },
  { prompt: "a brass astrolabe on weathered oak, morning light", preset: "photoreal", w: 1024, h: 1024 },
  { prompt: "minimal ceramic vase, single dried stem, paper backdrop", preset: "product", w: 896, h: 1152 },
  { prompt: "rain-slick alley, noodle stall, hard neon signage", preset: "neon", w: 1344, h: 768 },
  { prompt: "isometric cutaway of a cosy reading nook", preset: "3d", w: 1024, h: 1024 },
  { prompt: "editorial illustration: a person untangling a knot of wires", preset: "illustration", w: 896, h: 1152 },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Demo",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      plan: "free",
      credits: 25,
      creditsResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      creditEntries: { create: { delta: 25, reason: "signup_grant" } },
    },
  });

  const existing = await prisma.generation.count({ where: { userId: user.id } });
  if (existing > 0) {
    console.log(`Demo account already has ${existing} generations — nothing to do.`);
    return;
  }

  for (const [index, sample] of SAMPLES.entries()) {
    const seed = 100_000 + index * 7919;
    const svg = renderSvg(sample.prompt, seed, sample.w, sample.h);

    const key = `${user.id}/${randomUUID()}.svg`;
    const target = path.join(STORAGE_DIR, key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, svg);

    await prisma.generation.create({
      data: {
        userId: user.id,
        mode: "txt2img",
        prompt: sample.prompt,
        preset: sample.preset,
        width: sample.w,
        height: sample.h,
        steps: 30,
        guidance: 7,
        seed,
        provider: "mock",
        model: "lumen-mock-v1",
        status: "succeeded",
        imageUrl: `/api/files/${key}`,
        creditsCost: 1,
        favorite: index === 0,
        durationMs: 800 + index * 120,
        createdAt: new Date(Date.now() - (SAMPLES.length - index) * 3_600_000),
      },
    });
  }

  console.log(`Seeded ${SAMPLES.length} generations.`);
  console.log(`\n  Sign in with  ${DEMO_EMAIL}  /  ${DEMO_PASSWORD}\n`);
}

/** Small standalone copy of the mock renderer (see src/lib/providers/mock.ts). */
function renderSvg(prompt: string, seed: number, width: number, height: number): string {
  let digest = createHash("sha256").update(`${prompt}|${seed}`).digest();
  let cursor = 0;
  const next = () => {
    if (cursor >= digest.length - 4) {
      digest = createHash("sha256").update(digest).digest();
      cursor = 0;
    }
    const value = digest.readUInt32BE(cursor) / 0xffffffff;
    cursor += 4;
    return value;
  };

  const baseHue = Math.floor(next() * 360);
  const scheme = [0, 35, -40, 150, 190].map((o) => (baseHue + o + 360) % 360);

  const blobs = Array.from({ length: 7 }, (_, i) => {
    const hue = scheme[i % scheme.length];
    return `<circle cx="${Math.round(next() * width)}" cy="${Math.round(next() * height)}" r="${Math.round((0.18 + next() * 0.38) * Math.max(width, height))}" fill="hsl(${hue} ${55 + Math.round(next() * 35)}% ${38 + Math.round(next() * 34)}%)" opacity="${(0.45 + next() * 0.4).toFixed(2)}"/>`;
  }).join("");

  const label = prompt.length > 72 ? `${prompt.slice(0, 71)}…` : prompt;
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
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="${seed % 9999}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.08"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <g filter="url(#soften)">${blobs}</g>
  <rect width="${width}" height="${height}" filter="url(#grain)" opacity="0.9"/>
  <rect x="0" y="${height - fontSize * 3.6}" width="${width}" height="${fontSize * 3.6}" fill="rgba(6,8,15,0.55)"/>
  <text x="${fontSize}" y="${height - fontSize * 1.9}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${fontSize}" fill="rgba(255,255,255,0.92)">${escapeXml(label)}</text>
  <text x="${fontSize}" y="${height - fontSize * 0.7}" font-family="ui-monospace, monospace" font-size="${Math.round(fontSize * 0.78)}" fill="rgba(255,255,255,0.55)">mock provider &#183; seed ${seed} &#183; ${width}&#215;${height}</text>
</svg>`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

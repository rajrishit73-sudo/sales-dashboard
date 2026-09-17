"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ASPECT_RATIOS, STYLE_PRESETS } from "@/lib/presets";
import { creditCost, type Plan } from "@/lib/plans";
import type { GenerationDTO } from "@/lib/dto";

type Mode = "txt2img" | "img2img" | "upscale";

const MODES: Array<{ key: Mode; label: string; hint: string }> = [
  { key: "txt2img", label: "Text", hint: "Start from a description." },
  { key: "img2img", label: "Image", hint: "Start from a reference image." },
  { key: "upscale", label: "Upscale", hint: "Enlarge an image you already have." },
];

export function Studio({
  plan,
  credits,
  recent,
  providerReady,
  providerReason,
}: {
  plan: Plan;
  credits: number;
  recent: GenerationDTO[];
  providerReady: boolean;
  providerReason: string | null;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("txt2img");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [preset, setPreset] = useState("photoreal");
  const [ratio, setRatio] = useState(ASPECT_RATIOS[0]);
  const [steps, setSteps] = useState(30);
  const [guidance, setGuidance] = useState(7);
  const [seed, setSeed] = useState<number | null>(null);
  const [strength, setStrength] = useState(0.65);
  const [scale, setScale] = useState<2 | 4>(2);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [result, setResult] = useState<GenerationDTO | null>(recent[0] ?? null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cost = creditCost({
    mode,
    width: ratio.width,
    height: ratio.height,
    scale,
  });
  const needsSource = mode !== "txt2img";
  const canGenerate =
    providerReady &&
    !busy &&
    credits >= cost &&
    (mode === "upscale" || prompt.trim().length > 1) &&
    (!needsSource || Boolean(sourceImageUrl));

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      setSourceImageUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }, []);

  async function generate() {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prompt: mode === "upscale" ? prompt || "Upscale" : prompt,
          negativePrompt: negativePrompt || undefined,
          preset: mode === "upscale" ? undefined : preset,
          width: ratio.width,
          height: ratio.height,
          steps,
          guidance,
          seed,
          strength: mode === "img2img" ? strength : undefined,
          scale: mode === "upscale" ? scale : undefined,
          sourceImageUrl: needsSource ? sourceImageUrl : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");

      setResult(data.generation);
      // Re-render the server shell so the credit meter and recent strip update.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  function reuse(generation: GenerationDTO) {
    setResult(generation);
    setPrompt(generation.prompt);
    setNegativePrompt(generation.negativePrompt ?? "");
    if (generation.preset) setPreset(generation.preset);
    setSeed(generation.seed);
    const match = ASPECT_RATIOS.find(
      (r) => r.width === generation.width && r.height === generation.height,
    );
    if (match) setRatio(match);
  }

  function refineFrom(generation: GenerationDTO) {
    if (!generation.imageUrl) return;
    setMode("img2img");
    setSourceImageUrl(generation.imageUrl);
    setPrompt(generation.prompt);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function upscaleFrom(generation: GenerationDTO) {
    if (!generation.imageUrl) return;
    setMode("upscale");
    setSourceImageUrl(generation.imageUrl);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Studio</h1>
        <p className="mt-1 text-sm text-mist-400">
          Describe it, choose a look, and generate. Everything you make is saved to your gallery.
        </p>
      </header>

      {!providerReady && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
        >
          {providerReason}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* ---------------- Controls ---------------- */}
        <section className="card h-fit min-w-0 p-5">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-ink-850 p-1">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                title={m.hint}
                className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                  mode === m.key
                    ? "bg-ink-700 text-mist-50"
                    : "text-mist-400 hover:text-mist-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-2 px-0.5 text-xs text-mist-500">
            {MODES.find((m) => m.key === mode)?.hint}
          </p>

          {needsSource && (
            <div className="mt-5">
              <span className="label">Source image</span>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                }}
              />

              {sourceImageUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-ink-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sourceImageUrl}
                    alt="Selected source"
                    className="h-36 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setSourceImageUrl(null)}
                    className="absolute right-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-xs text-white backdrop-blur transition-colors hover:bg-black/90"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink-600 bg-ink-850/60 text-sm text-mist-400 transition-colors hover:border-brand-500/60 hover:text-mist-200 disabled:opacity-60"
                >
                  {uploading ? (
                    "Uploading…"
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                        <path d="M12 16V4m0 0L8 8m4-4 4 4M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" />
                      </svg>
                      Upload an image
                      <span className="text-xs text-mist-500">PNG, JPEG or WebP · max 10 MB</span>
                    </>
                  )}
                </button>
              )}

              <p className="mt-2 text-xs text-mist-500">
                Or pick one from the strip below and hit{" "}
                {mode === "upscale" ? "Upscale" : "Refine"}.
              </p>
            </div>
          )}

          {mode !== "upscale" && (
            <>
              <div className="mt-5">
                <label className="label" htmlFor="prompt">Prompt</label>
                <textarea
                  id="prompt"
                  rows={4}
                  className="field resize-y leading-relaxed"
                  placeholder="a lighthouse on a basalt cliff at dusk, storm rolling in"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  maxLength={2000}
                />
              </div>

              <div className="mt-4">
                <span className="label">Style</span>
                <div className="grid grid-cols-5 gap-1.5">
                  {STYLE_PRESETS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        setPreset(p.key);
                        setSteps(p.steps);
                        setGuidance(p.guidance);
                      }}
                      title={`${p.label} — ${p.description}`}
                      aria-pressed={preset === p.key}
                      className={`group relative aspect-square overflow-hidden rounded-lg border transition-all ${
                        preset === p.key
                          ? "border-brand-400 ring-2 ring-brand-500/40"
                          : "border-ink-700 hover:border-ink-500"
                      }`}
                      style={{
                        background: `linear-gradient(140deg, ${p.swatch[0]}, ${p.swatch[1]})`,
                      }}
                    >
                      <span className="sr-only">{p.label}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-mist-500">
                  {STYLE_PRESETS.find((p) => p.key === preset)?.label} ·{" "}
                  {STYLE_PRESETS.find((p) => p.key === preset)?.description}
                </p>
              </div>

              <div className="mt-4">
                <span className="label">Aspect ratio</span>
                <div className="grid grid-cols-5 gap-1.5">
                  {ASPECT_RATIOS.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRatio(r)}
                      title={r.hint}
                      aria-pressed={ratio.key === r.key}
                      className={`rounded-lg border py-2 text-xs transition-colors ${
                        ratio.key === r.key
                          ? "border-brand-400 bg-ink-800 text-mist-50"
                          : "border-ink-700 text-mist-400 hover:text-mist-200"
                      }`}
                    >
                      {r.key}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {mode === "img2img" && (
            <div className="mt-4">
              <label className="label" htmlFor="strength">
                Strength · {strength.toFixed(2)}
              </label>
              <input
                id="strength"
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={strength}
                onChange={(e) => setStrength(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
              <p className="mt-1 text-xs text-mist-500">
                Lower keeps more of the source; higher follows the prompt.
              </p>
            </div>
          )}

          {mode === "upscale" && (
            <div className="mt-5">
              <span className="label">Scale factor</span>
              <div className="grid grid-cols-2 gap-1.5">
                {([2, 4] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScale(s)}
                    aria-pressed={scale === s}
                    className={`rounded-lg border py-2.5 text-sm transition-colors ${
                      scale === s
                        ? "border-brand-400 bg-ink-800 text-mist-50"
                        : "border-ink-700 text-mist-400 hover:text-mist-200"
                    }`}
                  >
                    {s}× <span className="text-xs text-mist-500">({s === 2 ? 2 : 4} cr)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode !== "upscale" && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-xs uppercase tracking-wider text-mist-500 transition-colors hover:text-mist-300"
                aria-expanded={showAdvanced}
              >
                Advanced
                <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {showAdvanced && (
                <div className="space-y-4 rounded-xl border border-ink-800 p-3.5">
                  <div>
                    <label className="label" htmlFor="negative">Negative prompt</label>
                    <input
                      id="negative"
                      className="field"
                      placeholder="blurry, watermark, extra fingers"
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      maxLength={1000}
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="steps">Steps · {steps}</label>
                    <input
                      id="steps"
                      type="range"
                      min={10}
                      max={50}
                      value={steps}
                      onChange={(e) => setSteps(Number(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="guidance">
                      Guidance · {guidance.toFixed(1)}
                    </label>
                    <input
                      id="guidance"
                      type="range"
                      min={1}
                      max={15}
                      step={0.5}
                      value={guidance}
                      onChange={(e) => setGuidance(Number(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="seed">Seed</label>
                    <div className="flex gap-2">
                      <input
                        id="seed"
                        className="field"
                        inputMode="numeric"
                        placeholder="Random each run"
                        value={seed ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "");
                          setSeed(v ? Math.min(Number(v), 2_147_483_647) : null);
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost shrink-0"
                        onClick={() => setSeed(Math.floor(Math.random() * 2_147_483_647))}
                      >
                        Roll
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-mist-500">
                      Lock a seed to make small prompt edits comparable.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={generate}
            disabled={!canGenerate}
            className="btn btn-primary mt-5 w-full py-3"
          >
            {busy
              ? "Generating…"
              : credits < cost
                ? "Not enough credits"
                : `Generate · ${cost} credit${cost === 1 ? "" : "s"}`}
          </button>

          {credits < cost && (
            <a href="/app/billing" className="mt-2 block text-center text-xs text-brand-300 hover:text-brand-400">
              Top up your plan →
            </a>
          )}
        </section>

        {/* ---------------- Canvas ---------------- */}
        <section className="min-w-0 space-y-5">
          <div className="card grid min-h-[22rem] place-items-center overflow-hidden p-4 sm:min-h-[30rem]">
            {busy ? (
              <div className="w-full max-w-lg">
                <div
                  className="shimmer aspect-square w-full rounded-xl"
                  style={{ aspectRatio: `${ratio.width} / ${ratio.height}` }}
                />
                <p className="mt-4 text-center text-sm text-mist-400">
                  Painting your image…
                </p>
              </div>
            ) : result?.imageUrl ? (
              <figure className="fade-up w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.imageUrl}
                  alt={result.prompt}
                  className="mx-auto max-h-[62vh] w-auto rounded-xl border border-ink-700 object-contain"
                />
                <figcaption className="mt-4 space-y-3">
                  <p className="text-sm leading-relaxed text-mist-300">{result.prompt}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-mist-500">
                    <span>{result.width}×{result.height}</span>
                    <span>seed {result.seed}</span>
                    <span>{result.model}</span>
                    {result.durationMs && <span>{(result.durationMs / 1000).toFixed(1)}s</span>}
                    <span>{result.creditsCost} cr</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={result.imageUrl}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost"
                    >
                      Download
                    </a>
                    <button type="button" className="btn btn-ghost" onClick={() => refineFrom(result)}>
                      Refine
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => upscaleFrom(result)}>
                      Upscale
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        reuse(result);
                        setSeed(Math.floor(Math.random() * 2_147_483_647));
                      }}
                    >
                      Re-roll
                    </button>
                  </div>
                </figcaption>
              </figure>
            ) : (
              <div className="px-6 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-ink-700 bg-ink-850 text-mist-500">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
                  </svg>
                </div>
                <p className="mt-4 text-sm text-mist-400">
                  Your image will appear here.
                </p>
                <p className="mt-1 text-xs text-mist-500">
                  Try: &ldquo;a brass astrolabe on weathered oak, morning light&rdquo;
                </p>
              </div>
            )}
          </div>

          {recent.length > 0 && (
            <div>
              <h2 className="mb-2.5 text-xs uppercase tracking-wider text-mist-500">Recent</h2>
              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {recent.map((generation) => (
                  <button
                    key={generation.id}
                    type="button"
                    onClick={() => reuse(generation)}
                    title={generation.prompt}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border transition-all hover:-translate-y-0.5 ${
                      result?.id === generation.id
                        ? "border-brand-400 ring-2 ring-brand-500/30"
                        : "border-ink-700"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={generation.imageUrl ?? ""}
                      alt={generation.prompt}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

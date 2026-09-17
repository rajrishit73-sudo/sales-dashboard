import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PRESET_MAP } from "@/lib/presets";

export const metadata: Metadata = { title: "Prompt history" };
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  succeeded: "bg-accent-500/15 text-accent-400",
  failed: "bg-red-500/15 text-red-300",
  pending: "bg-amber-500/15 text-amber-300",
};

export default async function HistoryPage() {
  const user = await requireUser();

  const generations = await prisma.generation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const spent = generations
    .filter((g) => g.status === "succeeded")
    .reduce((sum, g) => sum + g.creditsCost, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Prompt history</h1>
        <p className="mt-1 text-sm text-mist-400">
          Every run, including the ones that failed. {generations.length} total ·{" "}
          {spent} credits spent.
        </p>
      </header>

      {generations.length === 0 ? (
        <div className="card grid place-items-center px-6 py-20 text-center">
          <p className="text-sm text-mist-400">No runs yet.</p>
          <Link href="/app" className="btn btn-primary mt-4">Open the studio</Link>
        </div>
      ) : (
        <div className="card divide-y divide-ink-800 overflow-hidden">
          {generations.map((generation) => (
            <article key={generation.id} className="flex gap-4 p-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-ink-700 bg-ink-850">
                {generation.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={generation.imageUrl}
                    alt={generation.prompt}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-mist-600">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${
                      STATUS_STYLES[generation.status] ?? "bg-ink-800 text-mist-400"
                    }`}
                  >
                    {generation.status}
                  </span>
                  <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[0.6875rem] text-mist-400">
                    {generation.mode}
                  </span>
                  {generation.preset && generation.preset !== "none" && (
                    <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[0.6875rem] text-mist-400">
                      {PRESET_MAP.get(generation.preset)?.label ?? generation.preset}
                    </span>
                  )}
                  <time
                    dateTime={generation.createdAt.toISOString()}
                    className="ml-auto text-xs text-mist-500"
                  >
                    {generation.createdAt.toLocaleString()}
                  </time>
                </div>

                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-mist-200">
                  {generation.prompt}
                </p>

                {generation.error && (
                  <p className="mt-1 line-clamp-2 text-xs text-red-300/80">{generation.error}</p>
                )}

                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[0.6875rem] text-mist-500">
                  <span>{generation.width}×{generation.height}</span>
                  <span>seed {generation.seed ?? "—"}</span>
                  <span>steps {generation.steps}</span>
                  <span>cfg {generation.guidance}</span>
                  <span>{generation.creditsCost} cr</span>
                  {generation.durationMs != null && (
                    <span>{(generation.durationMs / 1000).toFixed(1)}s</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

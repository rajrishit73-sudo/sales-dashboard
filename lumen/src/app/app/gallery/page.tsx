import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toDTO } from "@/lib/dto";
import { GalleryGrid } from "@/components/gallery-grid";

export const metadata: Metadata = { title: "Gallery" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "txt2img", label: "Text to image" },
  { key: "img2img", label: "Image to image" },
  { key: "upscale", label: "Upscales" },
];

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; q?: string; favorites?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const mode = params.mode ?? "all";
  const query = params.q?.trim() ?? "";
  const favoritesOnly = params.favorites === "1";

  const items = await prisma.generation.findMany({
    where: {
      userId: user.id,
      status: "succeeded",
      ...(mode !== "all" ? { mode } : {}),
      ...(favoritesOnly ? { favorite: true } : {}),
      ...(query ? { prompt: { contains: query } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  const buildHref = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { mode, q: query, favorites: favoritesOnly ? "1" : undefined, ...patch };
    for (const [key, value] of Object.entries(merged)) {
      if (value && value !== "all") next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `/app/gallery?${qs}` : "/app/gallery";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gallery</h1>
          <p className="mt-1 text-sm text-mist-400">
            {items.length} image{items.length === 1 ? "" : "s"}
            {query && <> matching &ldquo;{query}&rdquo;</>}
          </p>
        </div>

        <form action="/app/gallery" className="flex gap-2">
          {mode !== "all" && <input type="hidden" name="mode" value={mode} />}
          {favoritesOnly && <input type="hidden" name="favorites" value="1" />}
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search prompts…"
            className="field w-44 sm:w-60"
            aria-label="Search prompts"
          />
          <button type="submit" className="btn btn-ghost">Search</button>
        </form>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={buildHref({ mode: filter.key })}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              mode === filter.key
                ? "bg-ink-800 font-medium text-mist-50"
                : "text-mist-400 hover:bg-ink-850 hover:text-mist-200"
            }`}
          >
            {filter.label}
          </Link>
        ))}

        <span className="mx-1 h-5 w-px bg-ink-700" aria-hidden="true" />

        <Link
          href={buildHref({ favorites: favoritesOnly ? undefined : "1" })}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
            favoritesOnly
              ? "bg-ink-800 font-medium text-amber-300"
              : "text-mist-400 hover:bg-ink-850 hover:text-mist-200"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={favoritesOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
          </svg>
          Starred
        </Link>
      </div>

      <GalleryGrid items={items.map(toDTO)} />
    </div>
  );
}

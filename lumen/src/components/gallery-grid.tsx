"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GenerationDTO } from "@/lib/dto";

export function GalleryGrid({ items }: { items: GenerationDTO[] }) {
  const router = useRouter();
  const [active, setActive] = useState<GenerationDTO | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localFavorites, setLocalFavorites] = useState<Record<string, boolean>>({});

  async function toggleFavorite(generation: GenerationDTO) {
    const next = !(localFavorites[generation.id] ?? generation.favorite);
    setLocalFavorites((prev) => ({ ...prev, [generation.id]: next }));

    const res = await fetch(`/api/generations/${generation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: next }),
    });
    // Roll the optimistic update back if the server disagreed.
    if (!res.ok) {
      setLocalFavorites((prev) => ({ ...prev, [generation.id]: !next }));
    }
  }

  async function remove(generation: GenerationDTO) {
    if (!window.confirm("Delete this image permanently?")) return;
    setBusyId(generation.id);
    try {
      const res = await fetch(`/api/generations/${generation.id}`, { method: "DELETE" });
      if (res.ok) {
        if (active?.id === generation.id) setActive(null);
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="card grid place-items-center px-6 py-20 text-center">
        <p className="text-sm text-mist-400">Nothing here yet.</p>
        <a href="/app" className="btn btn-primary mt-4">Generate your first image</a>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const favorite = localFavorites[item.id] ?? item.favorite;
          return (
            <figure
              key={item.id}
              className={`group relative overflow-hidden rounded-xl border border-ink-700 bg-ink-900 transition-opacity ${
                busyId === item.id ? "opacity-40" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setActive(item)}
                className="block w-full"
                aria-label={`Open ${item.prompt}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl ?? ""}
                  alt={item.prompt}
                  loading="lazy"
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </button>

              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="line-clamp-2 text-xs leading-snug text-white/90">{item.prompt}</p>
              </figcaption>

              <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => toggleFavorite(item)}
                  aria-pressed={favorite}
                  aria-label={favorite ? "Remove from favourites" : "Add to favourites"}
                  className="grid h-7 w-7 place-items-center rounded-lg bg-black/70 text-white backdrop-blur transition-colors hover:bg-black/90"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={favorite ? "#fbbf24" : "none"} stroke={favorite ? "#fbbf24" : "currentColor"} strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => remove(item)}
                  aria-label="Delete image"
                  className="grid h-7 w-7 place-items-center rounded-lg bg-black/70 text-white backdrop-blur transition-colors hover:bg-red-600/90"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
                  </svg>
                </button>
              </div>

              {favorite && (
                <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-lg bg-black/60 backdrop-blur group-hover:opacity-0">
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="#fbbf24" aria-hidden="true">
                    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
                  </svg>
                </span>
              )}
            </figure>
          );
        })}
      </div>

      {active && <Lightbox item={active} onClose={() => setActive(null)} />}
    </>
  );
}

function Lightbox({ item, onClose }: { item: GenerationDTO; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.prompt}
      className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card max-h-[92dvh] w-full max-w-4xl overflow-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm leading-relaxed text-mist-200">{item.prompt}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn btn-ghost shrink-0 px-2.5 py-1.5"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl ?? ""}
          alt={item.prompt}
          className="mt-4 max-h-[62dvh] w-full rounded-xl object-contain"
        />

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-mist-500">
          <span>{item.mode}</span>
          <span>{item.width}×{item.height}</span>
          <span>seed {item.seed}</span>
          {item.preset && <span>{item.preset}</span>}
          <span>{item.model}</span>
          <span>{new Date(item.createdAt).toLocaleString()}</span>
          <a
            href={item.imageUrl ?? "#"}
            download
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost ml-auto"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
}

import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * Where generated images live.
 *
 *  - "local"       (default) writes bytes under STORAGE_DIR and serves them
 *                  from /api/files/<key>. Great for local dev and any host
 *                  with a persistent disk.
 *  - "passthrough" keeps the provider's own CDN URL. Zero storage cost, but
 *                  those URLs expire (Replicate's within ~1 hour), so the
 *                  gallery will eventually show broken images. See README.
 */
export type StorageDriver = "local" | "passthrough";

export const storageDriver: StorageDriver =
  (process.env.STORAGE_DRIVER as StorageDriver) ?? "local";

// turbopackIgnore keeps the bundler from tracing the whole project just
// because this path is built from an env var at runtime.
const STORAGE_DIR = path.resolve(
  /*turbopackIgnore: true*/ process.env.STORAGE_DIR ??
    path.join(process.cwd(), ".data", "uploads"),
);

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export function extensionFor(contentType: string): string {
  return EXT_BY_TYPE[contentType] ?? "png";
}

export function contentTypeFor(key: string): string {
  const ext = path.extname(key).slice(1).toLowerCase();
  const found = Object.entries(EXT_BY_TYPE).find(([, e]) => e === ext);
  return found?.[0] ?? "application/octet-stream";
}

/** Storage keys are `<userId>/<uuid>.<ext>` — scoped so one user can't guess another's. */
export async function putImage(
  userId: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const key = `${userId}/${randomUUID()}.${extensionFor(contentType)}`;
  const target = path.join(STORAGE_DIR, key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return `/api/files/${key}`;
}

/** Resolve a public `/api/files/...` URL back to bytes, refusing path traversal. */
export async function getImage(
  key: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const safe = path
    .normalize(key)
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .replace(/^[/\\]+/, "");
  const target = path.join(STORAGE_DIR, safe);
  if (!target.startsWith(STORAGE_DIR + path.sep)) return null;

  try {
    const info = await stat(target);
    if (!info.isFile()) return null;
    return { bytes: await readFile(target), contentType: contentTypeFor(safe) };
  } catch {
    return null;
  }
}

/**
 * Persist whatever a provider returned. Providers hand back either raw bytes
 * or a URL; in passthrough mode we keep the URL as-is.
 */
export async function persistProviderImage(
  userId: string,
  image: { bytes?: Uint8Array; url?: string; contentType: string },
): Promise<string> {
  if (image.bytes) {
    if (storageDriver === "passthrough" && image.url) return image.url;
    return putImage(userId, image.bytes, image.contentType);
  }
  if (!image.url) throw new Error("Provider returned neither bytes nor a URL.");
  if (storageDriver === "passthrough") return image.url;

  const res = await fetch(image.url);
  if (!res.ok) throw new Error(`Could not download generated image (${res.status}).`);
  const contentType = res.headers.get("content-type") ?? image.contentType;
  const bytes = new Uint8Array(await res.arrayBuffer());
  return putImage(userId, bytes, contentType);
}

/** Deterministic pseudo-random in [0,1) from a string — used by the mock provider. */
export function seededUnit(input: string): number {
  const hash = createHash("sha256").update(input).digest();
  return hash.readUInt32BE(0) / 0xffffffff;
}

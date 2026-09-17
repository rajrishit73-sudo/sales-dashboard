import { getCurrentUser } from "@/lib/auth";
import { getImage } from "@/lib/storage";
import { fail } from "@/lib/http";

type Params = { params: Promise<{ key: string[] }> };

/**
 * Serves stored images. Keys are `<userId>/<uuid>.<ext>`, and we check the
 * prefix against the session so one account can never read another's files.
 */
export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first.", 401);

  const { key } = await params;
  if (key[0] !== user.id) return fail("Not found.", 404);

  const file = await getImage(key.join("/"));
  if (!file) return fail("Not found.", 404);

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Length": String(file.bytes.byteLength),
    },
  });
}

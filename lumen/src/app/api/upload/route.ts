import { getCurrentUser } from "@/lib/auth";
import { putImage } from "@/lib/storage";
import { fail, handleError, ok } from "@/lib/http";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in first.", 401);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("No file was uploaded.", 400);
    if (!ALLOWED.has(file.type)) {
      return fail("Upload a PNG, JPEG, or WebP image.", 415);
    }
    if (file.size > MAX_BYTES) return fail("Images must be under 10 MB.", 413);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const url = await putImage(user.id, bytes, file.type);

    return ok({ url }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/http";

const patchSchema = z.object({ favorite: z.boolean() });

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in first.", 401);

    const { id } = await params;
    const { favorite } = patchSchema.parse(await request.json());

    // updateMany scopes the write to the owner in a single statement.
    const result = await prisma.generation.updateMany({
      where: { id, userId: user.id },
      data: { favorite },
    });
    if (result.count === 0) return fail("Generation not found.", 404);

    return ok({ id, favorite });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in first.", 401);

    const { id } = await params;
    const result = await prisma.generation.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return fail("Generation not found.", 404);

    return ok({ id, deleted: true });
  } catch (error) {
    return handleError(error);
  }
}

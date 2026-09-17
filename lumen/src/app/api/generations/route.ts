import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/http";

const PAGE_SIZE = 24;

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to view your gallery.", 401);

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const mode = url.searchParams.get("mode");
    const search = url.searchParams.get("q")?.trim();
    const favoritesOnly = url.searchParams.get("favorites") === "1";
    const take = Math.min(Number(url.searchParams.get("limit")) || PAGE_SIZE, 60);

    const items = await prisma.generation.findMany({
      where: {
        userId: user.id,
        status: "succeeded",
        ...(mode && mode !== "all" ? { mode } : {}),
        ...(favoritesOnly ? { favorite: true } : {}),
        ...(search ? { prompt: { contains: search } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > take;
    return ok({
      items: hasMore ? items.slice(0, take) : items,
      nextCursor: hasMore ? items[take - 1].id : null,
    });
  } catch (error) {
    return handleError(error);
  }
}

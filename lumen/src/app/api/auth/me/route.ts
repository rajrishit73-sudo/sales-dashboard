import { getCurrentUser } from "@/lib/auth";
import { ok } from "@/lib/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return ok({ user: null });
  return ok({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan.key,
      credits: user.credits,
    },
  });
}

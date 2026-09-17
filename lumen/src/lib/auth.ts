import "server-only";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { getPlan, PLANS } from "@/lib/plans";

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Resolves the signed-in user and lazily refreshes their monthly free-plan
 * credit grant. Returns null when signed out.
 */
export async function getCurrentUser() {
  const session = await readSession();
  if (!session) return null;

  let user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user) return null;

  user = await maybeRefreshCredits(user);

  const plan = getPlan(user.plan);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan,
    credits: user.credits,
    creditsResetAt: user.creditsResetAt,
    stripeCustomerId: user.stripeCustomerId,
    createdAt: user.createdAt,
  };
}

/** For pages: bounce to /login when signed out. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

type DbUser = Awaited<ReturnType<typeof prisma.user.findUnique>>;

/**
 * Free-plan credits refill every 30 days. Paid plans are refilled by the
 * Stripe `invoice.paid` webhook instead, so we leave them alone here.
 */
async function maybeRefreshCredits(user: NonNullable<DbUser>) {
  if (user.plan !== "free") return user;

  const now = new Date();
  const due = !user.creditsResetAt || user.creditsResetAt <= now;
  if (!due) return user;

  const next = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const grant = PLANS.free.credits;

  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { credits: Math.max(user.credits, grant), creditsResetAt: next },
    }),
    prisma.creditEntry.create({
      data: {
        userId: user.id,
        delta: Math.max(0, grant - user.credits),
        reason: "monthly_free_grant",
      },
    }),
  ]);
  return updated;
}

import "server-only";
import { prisma } from "@/lib/db";

export class InsufficientCreditsError extends Error {
  constructor(public required: number, public available: number) {
    super(`Not enough credits: need ${required}, have ${available}.`);
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Atomically debit credits. The `gte` guard in the WHERE clause means two
 * concurrent generations can never drive a balance negative — the second
 * update simply matches zero rows.
 */
export async function spendCredits(
  userId: string,
  amount: number,
  reason: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  if (amount <= 0) return;

  const result = await prisma.user.updateMany({
    where: { id: userId, credits: { gte: amount } },
    data: { credits: { decrement: amount } },
  });

  if (result.count === 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });
    throw new InsufficientCreditsError(amount, user?.credits ?? 0);
  }

  await prisma.creditEntry.create({
    data: {
      userId,
      delta: -amount,
      reason,
      meta: meta ? JSON.stringify(meta) : null,
    },
  });
}

/** Give credits back when a generation fails — the user shouldn't pay for our errors. */
export async function refundCredits(
  userId: string,
  amount: number,
  reason: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  if (amount <= 0) return;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
    }),
    prisma.creditEntry.create({
      data: {
        userId,
        delta: amount,
        reason,
        meta: meta ? JSON.stringify(meta) : null,
      },
    }),
  ]);
}

/** Set a balance outright (used by the Stripe webhook on plan change / renewal). */
export async function grantPlanCredits(
  userId: string,
  credits: number,
  reason: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { credits } }),
    prisma.creditEntry.create({
      data: {
        userId,
        delta: credits - (user?.credits ?? 0),
        reason,
        meta: meta ? JSON.stringify(meta) : null,
      },
    }),
  ]);
}

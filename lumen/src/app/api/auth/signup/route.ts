import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { PLANS } from "@/lib/plans";
import { fail, handleError, ok } from "@/lib/http";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
  name: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  try {
    const { email, password, name } = schema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return fail("That email is already registered. Try signing in.", 409);

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash: await hashPassword(password),
        plan: "free",
        credits: PLANS.free.credits,
        creditsResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        creditEntries: {
          create: { delta: PLANS.free.credits, reason: "signup_grant" },
        },
      },
    });

    await createSession({ uid: user.id, email: user.email });
    return ok({ id: user.id, email: user.email, credits: user.credits }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

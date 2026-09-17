import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { fail, handleError, ok } from "@/lib/http";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function POST(request: Request) {
  try {
    const { email, password } = schema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email } });

    // Same message either way so this endpoint can't be used to enumerate accounts.
    const invalid = fail("Email or password is incorrect.", 401);
    if (!user) {
      // Equalise timing against the bcrypt compare below.
      await verifyPassword(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin");
      return invalid;
    }
    if (!(await verifyPassword(password, user.passwordHash))) return invalid;

    await createSession({ uid: user.id, email: user.email });
    return ok({ id: user.id, email: user.email });
  } catch (error) {
    return handleError(error);
  }
}

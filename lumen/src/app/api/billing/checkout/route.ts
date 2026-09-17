import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS, type PlanKey } from "@/lib/plans";
import { appUrl, getStripe } from "@/lib/stripe";
import { fail, handleError, ok } from "@/lib/http";

const schema = z.object({ plan: z.enum(["starter", "pro"]) });

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in first.", 401);

    const stripe = getStripe();
    if (!stripe) {
      return fail(
        "Billing isn't configured. Add STRIPE_SECRET_KEY to your environment.",
        503,
      );
    }

    const { plan: planKey } = schema.parse(await request.json());
    const plan = PLANS[planKey as PlanKey];
    const priceId = plan.stripePriceEnv ? process.env[plan.stripePriceEnv] : undefined;
    if (!priceId) {
      return fail(`${plan.stripePriceEnv} is not set — create the price in Stripe first.`, 503);
    }

    // Reuse the Stripe customer so upgrades don't fragment billing history.
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl()}/app/billing?checkout=success`,
      cancel_url: `${appUrl()}/app/billing?checkout=cancelled`,
      allow_promotion_codes: true,
      client_reference_id: user.id,
      // Echoed back on the webhook so we can map the subscription to a user.
      subscription_data: { metadata: { userId: user.id, planKey } },
      metadata: { userId: user.id, planKey },
    });

    if (!session.url) return fail("Stripe did not return a checkout URL.", 502);
    return ok({ url: session.url });
  } catch (error) {
    return handleError(error);
  }
}

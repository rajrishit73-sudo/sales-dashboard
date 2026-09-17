import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { grantPlanCredits } from "@/lib/credits";
import { getPlan, planForPriceId, PLANS } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";
import { fail, ok } from "@/lib/http";

export const runtime = "nodejs";
// Signature verification needs the unparsed body.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return fail("Billing isn't configured.", 503);

  const signature = request.headers.get("stripe-signature");
  if (!signature) return fail("Missing stripe-signature header.", 400);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    console.error("[lumen] webhook signature check failed:", error);
    return fail("Invalid signature.", 400);
  }

  // Stripe retries deliveries; make replays a no-op.
  const seen = await prisma.webhookEvent.findUnique({ where: { id: event.id } });
  if (seen) return ok({ received: true, duplicate: true });

  try {
    await handleEvent(stripe, event);
    await prisma.webhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch (error) {
    console.error(`[lumen] webhook ${event.type} failed:`, error);
    // Non-2xx tells Stripe to retry.
    return fail("Webhook handler failed.", 500);
  }

  return ok({ received: true });
}

async function handleEvent(stripe: Stripe, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId ?? session.client_reference_id;
      if (!userId || !session.subscription) break;

      const subscription = await stripe.subscriptions.retrieve(
        typeof session.subscription === "string" ? session.subscription : session.subscription.id,
      );
      await applySubscription(userId, subscription);
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = await resolveUserId(subscription);
      if (userId) await applySubscription(userId, subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = await resolveUserId(subscription);
      if (!userId) break;
      await prisma.user.update({
        where: { id: userId },
        data: { plan: "free", stripeSubscriptionId: null },
      });
      await grantPlanCredits(userId, PLANS.free.credits, "downgrade_to_free", {
        subscriptionId: subscription.id,
      });
      break;
    }

    case "invoice.paid": {
      // Each successful renewal refills the monthly allowance.
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) break;

      const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
      if (!user || user.plan === "free") break;

      const plan = getPlan(user.plan);
      await grantPlanCredits(user.id, plan.credits, "subscription_renewal", {
        invoiceId: invoice.id,
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { creditsResetAt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000) },
      });
      break;
    }

    default:
      break;
  }
}

async function resolveUserId(subscription: Stripe.Subscription): Promise<string | null> {
  if (subscription.metadata?.userId) return subscription.metadata.userId;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return null;

  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  return user?.id ?? null;
}

async function applySubscription(userId: string, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = planForPriceId(priceId);
  if (!plan) {
    console.warn(`[lumen] no plan mapped to price ${priceId}; check STRIPE_PRICE_* env vars.`);
    return;
  }

  const active = subscription.status === "active" || subscription.status === "trialing";
  const targetPlan = active ? plan.key : "free";
  const credits = active ? plan.credits : PLANS.free.credits;

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: targetPlan,
      stripeSubscriptionId: subscription.id,
      creditsResetAt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
    },
  });

  await grantPlanCredits(userId, credits, `plan_${targetPlan}`, {
    subscriptionId: subscription.id,
    status: subscription.status,
  });
}

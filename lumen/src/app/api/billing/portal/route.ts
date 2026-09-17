import { getCurrentUser } from "@/lib/auth";
import { appUrl, getStripe } from "@/lib/stripe";
import { fail, handleError, ok } from "@/lib/http";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in first.", 401);

    const stripe = getStripe();
    if (!stripe) return fail("Billing isn't configured.", 503);
    if (!user.stripeCustomerId) return fail("No billing account yet — subscribe first.", 400);

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl()}/app/billing`,
    });

    return ok({ url: session.url });
  } catch (error) {
    return handleError(error);
  }
}

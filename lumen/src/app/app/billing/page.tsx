import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { billingEnabled } from "@/lib/stripe";
import { CheckoutButton, ManageBillingButton } from "@/components/billing-actions";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

const LEDGER_LABELS: Record<string, string> = {
  signup_grant: "Welcome credits",
  monthly_free_grant: "Monthly free refresh",
  subscription_renewal: "Subscription renewal",
  downgrade_to_free: "Downgraded to Free",
  generation_txt2img: "Text to image",
  generation_img2img: "Image to image",
  generation_upscale: "Upscale",
  refund_txt2img_failed: "Refund — generation failed",
  refund_img2img_failed: "Refund — generation failed",
  refund_upscale_failed: "Refund — upscale failed",
  plan_starter: "Switched to Starter",
  plan_pro: "Switched to Pro",
  plan_free: "Switched to Free",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await requireUser();
  const { checkout } = await searchParams;
  const stripeReady = billingEnabled();

  const ledger = await prisma.creditEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-mist-400">
          You&apos;re on <strong className="text-mist-200">{user.plan.name}</strong> with{" "}
          <strong className="text-mist-200">{user.credits}</strong> credits left.
        </p>
      </header>

      {checkout === "success" && (
        <p className="mb-5 rounded-xl border border-accent-500/30 bg-accent-500/10 px-4 py-3 text-sm text-accent-400">
          Payment received. Your new credits land as soon as Stripe confirms the
          subscription — refresh in a moment if the balance above still looks old.
        </p>
      )}
      {checkout === "cancelled" && (
        <p className="mb-5 rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-mist-400">
          Checkout cancelled — no charge was made.
        </p>
      )}
      {!stripeReady && (
        <p className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Stripe isn&apos;t configured yet. Add <code className="font-mono">STRIPE_SECRET_KEY</code>{" "}
          and the <code className="font-mono">STRIPE_PRICE_*</code> variables to enable checkout —
          see the README.
        </p>
      )}

      <section className="grid gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((key) => {
          const plan = PLANS[key];
          const current = user.plan.key === key;

          return (
            <div
              key={key}
              className={`card relative flex flex-col p-6 ${
                current ? "border-brand-500/60 ring-1 ring-brand-500/25" : ""
              }`}
            >
              {current && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand-500 px-2.5 py-1 text-[0.6875rem] font-medium text-white">
                  Current plan
                </span>
              )}

              <h2 className="text-lg font-medium">{plan.name}</h2>
              <p className="mt-1 text-sm text-mist-500">{plan.blurb}</p>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight">{plan.priceLabel}</span>
                <span className="text-sm text-mist-500">/month</span>
              </div>

              <ul className="mt-5 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-mist-300">
                    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" fill="currentColor" aria-hidden="true">
                      <path d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {current ? (
                <div className="mt-7">
                  {key === "free" ? (
                    <p className="text-center text-xs text-mist-500">
                      Upgrade any time — credits carry over.
                    </p>
                  ) : (
                    <ManageBillingButton />
                  )}
                </div>
              ) : key === "free" ? (
                <div className="mt-7">
                  <p className="text-center text-xs text-mist-500">
                    Downgrade from the billing portal.
                  </p>
                </div>
              ) : (
                <CheckoutButton
                  plan={key}
                  label={`Upgrade to ${plan.name}`}
                  highlight={plan.highlight}
                  disabled={!stripeReady}
                />
              )}
            </div>
          );
        })}
      </section>

      {stripeReady && (
        <p className="mt-6 text-center text-xs text-mist-500">
          Stripe test mode: pay with{" "}
          <code className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-mist-300">
            4242 4242 4242 4242
          </code>
          , any future expiry, any CVC.
        </p>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-mist-200">Credit activity</h2>

        {ledger.length === 0 ? (
          <p className="card px-4 py-6 text-center text-sm text-mist-500">
            No activity yet.
          </p>
        ) : (
          <ul className="card divide-y divide-ink-800 overflow-hidden">
            {ledger.map((entry) => (
              <li key={entry.id} className="flex items-center gap-4 px-4 py-3">
                <span
                  className={`font-mono text-sm tabular-nums ${
                    entry.delta >= 0 ? "text-accent-400" : "text-mist-400"
                  }`}
                >
                  {entry.delta >= 0 ? "+" : ""}
                  {entry.delta}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-mist-300">
                  {LEDGER_LABELS[entry.reason] ?? entry.reason}
                </span>
                <time
                  dateTime={entry.createdAt.toISOString()}
                  className="shrink-0 text-xs text-mist-500"
                >
                  {entry.createdAt.toLocaleDateString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

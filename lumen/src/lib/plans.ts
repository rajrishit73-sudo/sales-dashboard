/**
 * Plan catalogue. Credits are granted on signup and refreshed every 30 days
 * (free plan) or on each Stripe `invoice.paid` (paid plans).
 *
 * `stripePriceEnv` names the env var holding the Stripe Price ID, so the same
 * code works against your test-mode and live-mode price objects.
 */
export type PlanKey = "free" | "starter" | "pro";

export interface Plan {
  key: PlanKey;
  name: string;
  priceLabel: string;
  priceMonthly: number;
  credits: number;
  maxResolution: number;
  concurrency: number;
  stripePriceEnv?: string;
  blurb: string;
  features: string[];
  highlight?: boolean;
}

export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: "free",
    name: "Free",
    priceLabel: "$0",
    priceMonthly: 0,
    credits: 25,
    maxResolution: 1024,
    concurrency: 1,
    blurb: "Kick the tyres. No card required.",
    features: [
      "25 credits per month",
      "Up to 1024 x 1024",
      "All style presets",
      "Image-to-image",
      "Private gallery & prompt history",
    ],
  },
  starter: {
    key: "starter",
    name: "Starter",
    priceLabel: "$9",
    priceMonthly: 9,
    credits: 500,
    maxResolution: 1536,
    concurrency: 2,
    stripePriceEnv: "STRIPE_PRICE_STARTER",
    highlight: true,
    blurb: "For steady solo output.",
    features: [
      "500 credits per month",
      "Up to 1536 x 1536",
      "2x / 4x upscaling",
      "Image-to-image & variations",
      "Full prompt history + re-run",
      "Commercial usage rights",
    ],
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceLabel: "$29",
    priceMonthly: 29,
    credits: 2000,
    maxResolution: 2048,
    concurrency: 4,
    stripePriceEnv: "STRIPE_PRICE_PRO",
    blurb: "For teams shipping every day.",
    features: [
      "2,000 credits per month",
      "Up to 2048 x 2048",
      "2x / 4x upscaling",
      "Priority generation queue",
      "Bulk download from gallery",
      "Commercial usage rights",
    ],
  },
};

export const PLAN_ORDER: PlanKey[] = ["free", "starter", "pro"];

export function getPlan(key: string | null | undefined): Plan {
  return PLANS[(key ?? "free") as PlanKey] ?? PLANS.free;
}

/** Reverse lookup: Stripe Price ID -> plan. Used by the webhook handler. */
export function planForPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  for (const plan of Object.values(PLANS)) {
    if (!plan.stripePriceEnv) continue;
    if (process.env[plan.stripePriceEnv] === priceId) return plan;
  }
  return null;
}

/**
 * Credit pricing. Bigger canvases and upscales cost more because they cost us
 * more at the provider; keep this in one place so the UI and the API agree.
 */
export function creditCost(opts: {
  mode: "txt2img" | "img2img" | "upscale";
  width?: number;
  height?: number;
  scale?: number;
}): number {
  if (opts.mode === "upscale") return opts.scale && opts.scale >= 4 ? 4 : 2;
  const pixels = (opts.width ?? 1024) * (opts.height ?? 1024);
  if (pixels > 1536 * 1536) return 4;
  if (pixels > 1024 * 1024) return 2;
  return 1;
}

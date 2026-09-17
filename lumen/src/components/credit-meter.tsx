import Link from "next/link";
import type { Plan } from "@/lib/plans";

export function CreditMeter({
  credits,
  plan,
  compact = false,
}: {
  credits: number;
  plan: Plan;
  compact?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (credits / plan.credits) * 100));
  const low = credits <= Math.max(3, plan.credits * 0.1);

  if (compact) {
    return (
      <Link
        href="/app/billing"
        className="flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900 px-3 py-1.5 text-xs"
      >
        <span className={low ? "text-amber-300" : "text-mist-200"}>{credits}</span>
        <span className="text-mist-500">credits</span>
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wider text-mist-500">Credits</span>
        <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[0.6875rem] text-mist-400">
          {plan.name}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={`text-2xl font-semibold ${low ? "text-amber-300" : "text-mist-50"}`}>
          {credits}
        </span>
        <span className="text-xs text-mist-500">/ {plan.credits}</span>
      </div>

      <div
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-800"
        role="progressbar"
        aria-valuenow={credits}
        aria-valuemin={0}
        aria-valuemax={plan.credits}
        aria-label="Credits remaining"
      >
        <div
          className={`h-full rounded-full transition-all ${low ? "bg-amber-400" : "bg-gradient-to-r from-brand-500 to-accent-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {plan.key === "free" && (
        <Link
          href="/app/billing"
          className="mt-3 block text-center text-xs font-medium text-brand-300 transition-colors hover:text-brand-400"
        >
          Upgrade for more →
        </Link>
      )}
    </div>
  );
}

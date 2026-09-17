"use client";

import { useState } from "react";
import type { PlanKey } from "@/lib/plans";

export function CheckoutButton({
  plan,
  label,
  highlight,
  disabled,
}: {
  plan: PlanKey;
  label: string;
  highlight?: boolean;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not start checkout.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setPending(false);
    }
  }

  return (
    <div className="mt-7">
      <button
        type="button"
        onClick={start}
        disabled={pending || disabled}
        className={`btn w-full py-2.5 ${highlight ? "btn-primary" : "btn-ghost"}`}
      >
        {pending ? "Redirecting…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

export function ManageBillingButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not open the portal.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the portal.");
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={open} disabled={pending} className="btn btn-ghost">
        {pending ? "Opening…" : "Manage subscription"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </>
  );
}

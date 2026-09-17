import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { InsufficientCreditsError } from "@/lib/credits";
import { ProviderError } from "@/lib/providers";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** One place that decides how each error class is surfaced to the client. */
export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return fail(first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input.", 422);
  }
  if (error instanceof InsufficientCreditsError) {
    return fail(error.message, 402, {
      code: "insufficient_credits",
      required: error.required,
      available: error.available,
    });
  }
  if (error instanceof ProviderError) {
    return fail(error.message, error.status);
  }
  console.error("[lumen] unhandled error:", error);
  return fail("Something went wrong on our side. Please try again.", 500);
}

import { MockProvider } from "./mock";
import { ReplicateProvider } from "./replicate";
import { FalProvider } from "./fal";
import type { ImageProvider } from "./types";

export * from "./types";

const REGISTRY: Record<string, () => ImageProvider> = {
  mock: () => new MockProvider(),
  replicate: () => new ReplicateProvider(),
  fal: () => new FalProvider(),
};

/**
 * Resolve the configured backend. Defaults to `mock` so a fresh clone runs
 * with no credentials; set PROVIDER=replicate or PROVIDER=fal for real output.
 */
export function getProvider(): ImageProvider {
  const key = (process.env.PROVIDER ?? "mock").toLowerCase();
  const factory = REGISTRY[key];
  if (!factory) {
    throw new Error(
      `Unknown PROVIDER "${key}". Expected one of: ${Object.keys(REGISTRY).join(", ")}.`,
    );
  }
  return factory();
}

export function providerStatus() {
  const provider = getProvider();
  return {
    id: provider.id,
    ready: provider.unavailableReason() === null,
    reason: provider.unavailableReason(),
  };
}

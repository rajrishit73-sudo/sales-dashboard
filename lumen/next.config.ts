import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root. Without this, Turbopack walks up the tree looking
  // for a lockfile and can latch onto a stray one in your home directory.
  turbopack: {
    root: path.resolve("."),
  },

  // Remote generation providers return image URLs on their own CDNs.
  // We proxy + persist most images ourselves, but allow these for direct preview.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "replicate.delivery" },
      { protocol: "https", hostname: "*.replicate.delivery" },
      { protocol: "https", hostname: "fal.media" },
      { protocol: "https", hostname: "*.fal.media" },
    ],
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;

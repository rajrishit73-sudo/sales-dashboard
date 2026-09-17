import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toDTO } from "@/lib/dto";
import { providerStatus } from "@/lib/providers";
import { Studio } from "@/components/studio";

export const metadata: Metadata = { title: "Studio" };
export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const user = await requireUser();
  const provider = providerStatus();

  const recent = await prisma.generation.findMany({
    where: { userId: user.id, status: "succeeded" },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return (
    <Studio
      plan={user.plan}
      credits={user.credits}
      recent={recent.map(toDTO)}
      providerReady={provider.ready}
      providerReason={provider.reason}
    />
  );
}

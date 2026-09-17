import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { MobileNav, SidebarNav, SignOutButton } from "@/components/app-nav";
import { CreditMeter } from "@/components/credit-meter";
import { providerStatus } from "@/lib/providers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const provider = providerStatus();

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-ink-800 bg-ink-950/90 px-4 backdrop-blur-lg lg:hidden">
        <Link href="/app" aria-label="Lumen Studio">
          <Logo />
        </Link>
        <CreditMeter credits={user.credits} plan={user.plan} compact />
      </header>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-ink-800 bg-ink-950 p-4 lg:flex">
        <Link href="/" className="px-1 py-2" aria-label="Lumen Studio home">
          <Logo />
        </Link>

        <div className="mt-6 flex-1">
          <SidebarNav />
        </div>

        <div className="space-y-3">
          <CreditMeter credits={user.credits} plan={user.plan} />

          <div className="rounded-lg border border-ink-800 px-3 py-2">
            <div className="flex items-center gap-2 text-[0.6875rem]">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${provider.ready ? "bg-accent-400" : "bg-amber-400"}`}
              />
              <span className="text-mist-500">Engine</span>
              <span className="ml-auto font-mono text-mist-400">{provider.id}</span>
            </div>
          </div>

          <div className="border-t border-ink-800 pt-3">
            <div className="truncate px-3 py-1 text-xs text-mist-500" title={user.email}>
              {user.name || user.email}
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="flex-1 pb-20 lg:pb-0">{children}</main>

      <MobileNav />
    </div>
  );
}

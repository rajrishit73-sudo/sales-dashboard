"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/app", label: "Studio", icon: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" },
  { href: "/app/gallery", label: "Gallery", icon: "M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4" },
  { href: "/app/history", label: "History", icon: "M12 7v5l3 2M3 12a9 9 0 1 0 2.6-6.4M3 4v4h4" },
  { href: "/app/billing", label: "Billing", icon: "M3 7h18v10H3zM3 11h18" },
];

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-ink-800 font-medium text-mist-50"
                : "text-mist-400 hover:bg-ink-850 hover:text-mist-200"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={link.icon} />
            </svg>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Bottom tab bar — the sidebar is hidden below `lg`. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-950/95 backdrop-blur-lg lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[0.6875rem] transition-colors ${
                active ? "text-brand-300" : "text-mist-500"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={link.icon} />
              </svg>
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="w-full rounded-lg px-3 py-2 text-left text-sm text-mist-500 transition-colors hover:bg-ink-850 hover:text-mist-200"
    >
      Sign out
    </button>
  );
}

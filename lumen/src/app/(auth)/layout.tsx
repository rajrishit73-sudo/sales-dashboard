import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate grid min-h-dvh place-items-center px-4 py-12">
      <div className="aurora" aria-hidden="true" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Lumen Studio home">
            <Logo />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}

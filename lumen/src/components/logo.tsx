export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg shadow-brand-600/30">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden="true">
          <path
            d="M12 3.2 13.9 9l5.9 1.9-4.8 3.7.6 6-3.6-2.6-3.6 2.6.6-6L4.2 10.9 10.1 9Z"
            fill="white"
            fillOpacity="0.95"
          />
        </svg>
      </span>
      <span className="text-[1.0625rem] font-semibold tracking-tight text-mist-50">
        Lumen<span className="text-mist-400"> Studio</span>
      </span>
    </span>
  );
}

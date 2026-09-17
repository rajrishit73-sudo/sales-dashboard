import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { STYLE_PRESETS } from "@/lib/presets";
import { PLAN_ORDER, PLANS } from "@/lib/plans";

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="relative overflow-x-hidden">
      <SiteNav signedIn={Boolean(user)} />
      <Hero signedIn={Boolean(user)} />
      <Proof />
      <Features />
      <HowItWorks />
      <PresetShowcase />
      <Pricing />
      <Faq />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

function SiteNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-800/80 bg-ink-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Lumen Studio home">
          <Logo />
        </Link>

        <div className="hidden items-center gap-8 text-sm text-mist-400 md:flex">
          <a href="#features" className="transition-colors hover:text-mist-50">Features</a>
          <a href="#how" className="transition-colors hover:text-mist-50">How it works</a>
          <a href="#pricing" className="transition-colors hover:text-mist-50">Pricing</a>
          <a href="#faq" className="transition-colors hover:text-mist-50">FAQ</a>
        </div>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/app" className="btn btn-primary">Open studio</Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">Sign in</Link>
              <Link href="/signup" className="btn btn-primary">Start free</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative isolate">
      <div className="aurora" aria-hidden="true" />
      <div className="absolute inset-0 grid-backdrop" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900/70 px-3 py-1 text-xs text-mist-400">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
            SDXL &amp; FLUX on tap — no GPU required
          </span>

          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            <span className="text-gradient">AI images</span> for people
            <br className="hidden sm:block" /> who actually ship
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-mist-400 sm:text-lg">
            Describe it, pick a look, and get a usable image in seconds. Refine with
            image-to-image, upscale to print size, and keep every prompt you&apos;ve ever
            run in one searchable place.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={signedIn ? "/app" : "/signup"} className="btn btn-primary w-full px-6 py-3 sm:w-auto">
              {signedIn ? "Open the studio" : "Start free — 25 credits"}
            </Link>
            <a href="#how" className="btn btn-ghost w-full px-6 py-3 sm:w-auto">
              See how it works
            </a>
          </div>

          <p className="mt-4 text-xs text-mist-500">
            No credit card to start · Cancel anytime · Your images stay private
          </p>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

/** A non-interactive mock of the studio, so the hero shows the product itself. */
function HeroPreview() {
  const tiles = [
    { from: "#7c5cff", to: "#14c8b8", label: "Cinematic" },
    { from: "#ff7a59", to: "#2d3a8c", label: "Illustration" },
    { from: "#b7e0ff", to: "#7c5cff", label: "3D Render" },
    { from: "#ff2e88", to: "#00e5ff", label: "Neon Noir" },
  ];

  return (
    <div className="fade-up relative mx-auto mt-16 max-w-4xl">
      <div className="card overflow-hidden shadow-2xl shadow-black/60">
        <div className="flex items-center gap-2 border-b border-ink-700 bg-ink-850/80 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-600" />
          <span className="ml-3 font-mono text-xs text-mist-500">lumen.studio/app</span>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="field flex-1 truncate text-left text-mist-200">
              a lighthouse on a basalt cliff at dusk, storm rolling in
            </div>
            <div className="btn btn-primary pointer-events-none shrink-0">
              Generate · 1 credit
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map((tile, i) => (
              <div
                key={tile.label}
                className="group relative aspect-square overflow-hidden rounded-xl border border-ink-700"
                style={{
                  background: `linear-gradient(140deg, ${tile.from}, ${tile.to})`,
                  animationDelay: `${i * 70}ms`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2.5 text-[0.6875rem] font-medium text-white/90">
                  {tile.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Proof() {
  const stats = [
    { value: "~4s", label: "Median time to first image" },
    { value: "10", label: "Tuned style presets" },
    { value: "2048px", label: "Max output on Pro" },
    { value: "$0", label: "To try it properly" },
  ];

  return (
    <section className="border-y border-ink-800 bg-ink-900/40">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-4 py-10 sm:px-6 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="px-2 text-center lg:px-6">
            <div className="text-2xl font-semibold tracking-tight text-mist-50 sm:text-3xl">
              {stat.value}
            </div>
            <div className="mt-1 text-xs text-mist-500 sm:text-sm">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      title: "Text to image",
      body: "Type a prompt, pick an aspect ratio, and go. Steps, guidance, and seed are there when you want them — and out of the way when you don't.",
      icon: "M4 6h16M4 12h10M4 18h7",
    },
    {
      title: "Image to image",
      body: "Upload a reference or start from a previous generation, then dial strength to decide how much of the original survives.",
      icon: "M4 16l5-5 4 4 7-7M4 20h16",
    },
    {
      title: "Upscaling",
      body: "Take any generation to 2x or 4x with Real-ESRGAN when you need print resolution or a hero image that holds up.",
      icon: "M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5",
    },
    {
      title: "Style presets",
      body: "Ten tuned looks that wrap your prompt instead of replacing it — photoreal, cinematic, product shot, anime, and more.",
      icon: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z",
    },
    {
      title: "Searchable gallery",
      body: "Every image you make, filterable by mode, starred, and full-text searchable by prompt. Download or delete in a click.",
      icon: "M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4",
    },
    {
      title: "Credits that make sense",
      body: "One credit per standard image, more for big canvases and upscales. Failed generations are refunded automatically.",
      icon: "M12 3v18M7 8h7a2.5 2.5 0 010 5H7h8",
    },
  ];

  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <SectionHeading
        eyebrow="Everything in one tab"
        title="A complete studio, not a demo"
        body="The pieces you actually need to produce finished work — and nothing you have to configure before your first image."
      />

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="card group p-6 transition-colors hover:border-ink-600"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg border border-ink-700 bg-ink-850 text-brand-300 transition-colors group-hover:border-brand-500/50 group-hover:text-brand-400">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={feature.icon} />
              </svg>
            </span>
            <h3 className="mt-4 text-base font-medium text-mist-50">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-mist-400">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Describe the image",
      body: "Write it the way you'd brief a designer. Add a negative prompt if there's something you never want to see.",
    },
    {
      n: "02",
      title: "Choose a look",
      body: "Pick a style preset and aspect ratio. The preset wraps your prompt with camera, lighting, and finish language that actually moves the model.",
    },
    {
      n: "03",
      title: "Refine and export",
      body: "Re-roll the seed, push it through image-to-image, upscale the keeper, and download. Everything lands in your gallery.",
    },
  ];

  return (
    <section id="how" className="border-y border-ink-800 bg-ink-900/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps, about ten seconds"
          body="No node graphs, no model downloads, no CUDA errors at midnight."
        />

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.n} className="card relative p-6">
              <span className="font-mono text-sm text-brand-400">{step.n}</span>
              <h3 className="mt-3 text-lg font-medium text-mist-50">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function PresetShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <SectionHeading
        eyebrow="Style presets"
        title="Ten looks, tuned by hand"
        body="Each preset carries its own guidance scale, step count, and negative prompt — so switching styles switches the whole recipe, not just a few words."
      />

      <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STYLE_PRESETS.filter((p) => p.key !== "none").map((preset) => (
          <div
            key={preset.key}
            className="group overflow-hidden rounded-xl border border-ink-700 transition-transform hover:-translate-y-0.5"
          >
            <div
              className="aspect-4/5 w-full"
              style={{
                background: `linear-gradient(150deg, ${preset.swatch[0]}, ${preset.swatch[1]})`,
              }}
            />
            <div className="bg-ink-900 px-3 py-2.5">
              <div className="text-sm font-medium text-mist-50">{preset.label}</div>
              <div className="mt-0.5 line-clamp-1 text-xs text-mist-500">
                {preset.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="border-y border-ink-800 bg-ink-900/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <SectionHeading
          eyebrow="Pricing"
          title="Start free, upgrade when it pays for itself"
          body="Credits refresh every month. One credit is one standard image — large canvases and upscales cost a little more."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {PLAN_ORDER.map((key) => {
            const plan = PLANS[key];
            return (
              <div
                key={key}
                className={`card relative flex flex-col p-7 ${
                  plan.highlight ? "border-brand-500/60 ring-1 ring-brand-500/25" : ""
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-7 rounded-full bg-brand-500 px-2.5 py-1 text-[0.6875rem] font-medium text-white">
                    Most popular
                  </span>
                )}

                <h3 className="text-lg font-medium text-mist-50">{plan.name}</h3>
                <p className="mt-1 text-sm text-mist-500">{plan.blurb}</p>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-4xl font-semibold tracking-tight">{plan.priceLabel}</span>
                  <span className="text-sm text-mist-500">/month</span>
                </div>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-mist-200">
                      <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" fill="currentColor" aria-hidden="true">
                        <path d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`btn mt-7 w-full py-2.5 ${plan.highlight ? "btn-primary" : "btn-ghost"}`}
                >
                  {plan.priceMonthly === 0 ? "Start free" : `Choose ${plan.name}`}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-mist-500">
          Payments run through Stripe. In this build Stripe is in test mode — use card
          <code className="mx-1.5 rounded bg-ink-800 px-1.5 py-0.5 font-mono text-mist-200">4242 4242 4242 4242</code>
          to walk the full checkout.
        </p>
      </div>
    </section>
  );
}

function Faq() {
  const faqs = [
    {
      q: "Which model actually runs my prompt?",
      a: "Whatever you point it at. Lumen talks to hosted providers through a small adapter — FLUX and SDXL on Replicate or fal.ai out of the box, and a built-in offline mock so you can run the whole app with no API key at all.",
    },
    {
      q: "Do I need a GPU?",
      a: "No. Generation happens at the provider. Lumen itself is a normal web app that runs comfortably on a laptop or a small cloud instance.",
    },
    {
      q: "What happens if a generation fails?",
      a: "The credit goes straight back to your balance and the attempt is recorded with its error, so you can see what happened rather than guessing.",
    },
    {
      q: "Who owns the images?",
      a: "You do. Paid plans include commercial usage rights. Your gallery is private to your account and served behind your session.",
    },
    {
      q: "Can I cancel?",
      a: "Any time, from the billing page — it opens the Stripe customer portal. You keep your remaining credits until the end of the period.",
    },
  ];

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
      <SectionHeading eyebrow="FAQ" title="Questions worth asking" />

      <div className="mt-12 divide-y divide-ink-800 border-y border-ink-800">
        {faqs.map((faq) => (
          <details key={faq.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium text-mist-50">
              {faq.q}
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-mist-500 transition-transform group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </summary>
            <p className="mt-3 pr-8 text-sm leading-relaxed text-mist-400">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden border-t border-ink-800">
      <div className="aurora" aria-hidden="true" />
      <div className="relative mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Your first 25 images are on us
        </h2>
        <p className="mx-auto mt-4 max-w-md text-mist-400">
          No card, no sales call. Sign up and you&apos;re generating inside a minute.
        </p>
        <Link href="/signup" className="btn btn-primary mt-8 px-7 py-3">
          Create your account
        </Link>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-ink-800 bg-ink-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-4 py-10 sm:flex-row sm:px-6">
        <Logo />
        <div className="flex items-center gap-6 text-sm text-mist-500">
          <a href="#features" className="transition-colors hover:text-mist-200">Features</a>
          <a href="#pricing" className="transition-colors hover:text-mist-200">Pricing</a>
          <Link href="/login" className="transition-colors hover:text-mist-200">Sign in</Link>
        </div>
        <p className="text-xs text-mist-500">
          © {new Date().getFullYear()} Lumen Studio
        </p>
      </div>
    </footer>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-brand-400">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {body && (
        <p className="mt-4 text-pretty leading-relaxed text-mist-400">{body}</p>
      )}
    </div>
  );
}

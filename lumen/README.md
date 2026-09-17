# Lumen Studio

A lean, self-hostable AI image studio you can charge for: text-to-image with
style presets, image-to-image, upscaling, a searchable gallery, per-plan
credits, and Stripe subscriptions.

It runs **with no API key and no GPU** out of the box — a built-in mock
provider renders deterministic placeholder art so you can exercise the entire
product (signup, credits, gallery, checkout) before you spend a cent. Point
`PROVIDER` at Replicate or fal.ai when you want real images.

---

## Quickstart

```bash
git clone <your-repo> && cd lumen
npm install
cp .env.example .env
npm run setup      # prisma generate + db push + seed demo data
npm run dev
```

Open <http://localhost:3000>. Sign up, or use the seeded demo account:

```
demo@lumen.studio  /  demo1234
```

`npm run setup` creates a SQLite database at `prisma/dev.db` and writes sample
images to `.data/uploads/`. Both are gitignored.

> **Set `AUTH_SECRET` before deploying.** It signs the session cookie. The app
> falls back to a fixed development secret when it's unset and **refuses to
> boot in production without it**. Generate one with:
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Serve the production build |
| `npm run setup` | Generate client, push schema, seed demo data |
| `npm run db:push` | Sync `schema.prisma` to the database |
| `npm run db:studio` | Prisma Studio (browse the data) |
| `npm run db:seed` | Seed the demo account |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run stripe:listen` | Forward Stripe webhooks to localhost |

---

## Environment variables

Only `DATABASE_URL` is required to boot. Everything else unlocks a feature.

### Core

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | SQLite locally; a Postgres URL in production (see [Deploying](#deploying)) |
| `AUTH_SECRET` | dev fallback | 32+ random chars. **Required in production.** |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Absolute URL, used for Stripe redirects |

### Image generation

| Variable | Default | Notes |
| --- | --- | --- |
| `PROVIDER` | `mock` | `mock`, `replicate`, or `fal` |
| `REPLICATE_API_TOKEN` | — | From <https://replicate.com/account/api-tokens> |
| `REPLICATE_MODEL` | `black-forest-labs/flux-schnell` | Text-to-image model |
| `REPLICATE_IMG2IMG_MODEL` | `black-forest-labs/flux-dev` | Image-to-image model |
| `REPLICATE_UPSCALE_MODEL` | `nightmareai/real-esrgan:f121d640…` | Upscaler |
| `FAL_KEY` | — | From <https://fal.ai/dashboard/keys> |
| `FAL_MODEL` / `FAL_IMG2IMG_MODEL` / `FAL_UPSCALE_MODEL` | FLUX / ESRGAN | fal.ai model slugs |

A Replicate slug written as `owner/name` uses the official-model endpoint; add
`:version` to pin an exact version. **To use SDXL instead of FLUX:**

```bash
REPLICATE_MODEL="stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc"
```

### Storage

| Variable | Default | Notes |
| --- | --- | --- |
| `STORAGE_DRIVER` | `local` | `local` downloads and stores image bytes; `passthrough` keeps the provider's CDN URL |
| `STORAGE_DIR` | `.data/uploads` | Where `local` writes |

> `passthrough` costs nothing to run but **Replicate URLs expire after about an
> hour**, so gallery images will break. Use `local` with a persistent volume, or
> swap `src/lib/storage.ts` for S3/R2/Vercel Blob before going to production on
> a serverless host.

### Stripe (test mode)

| Variable | Notes |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_…` from <https://dashboard.stripe.com/test/apikeys> |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…`, printed by `stripe listen` |
| `STRIPE_PRICE_STARTER` | Price ID of a recurring monthly price |
| `STRIPE_PRICE_PRO` | Price ID of a recurring monthly price |

Billing degrades gracefully: with no Stripe keys the app runs fine and the
billing page explains what's missing.

---

## Setting up Stripe

1. Create two **recurring monthly** prices in the Stripe test dashboard (the
   defaults in `src/lib/plans.ts` assume $9 and $29) and copy their price IDs
   into `STRIPE_PRICE_STARTER` and `STRIPE_PRICE_PRO`.
2. Forward webhooks while developing:
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```
   Paste the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET` and restart.
3. Upgrade from `/app/billing` and pay with `4242 4242 4242 4242`, any future
   expiry, any CVC.

The webhook handles `checkout.session.completed`,
`customer.subscription.created|updated|deleted`, and `invoice.paid` (which
refills the monthly credit allowance). Deliveries are de-duplicated by event ID
in the `WebhookEvent` table, so Stripe's retries are safe.

In production, register the endpoint at
`https://your-domain/api/billing/webhook` in the Stripe dashboard and use that
endpoint's signing secret.

---

## How it works

```
src/
  app/
    page.tsx                  Landing page
    (auth)/login|signup       Email + password auth
    app/                      Signed-in product
      page.tsx                Studio (generate)
      gallery/                Searchable, filterable gallery
      history/                Every run, including failures
      billing/                Plans, checkout, credit ledger
    api/
      auth/…                  signup / login / logout / me
      generate/               All three generation modes
      generations/[id]/       Favourite, delete
      upload/                 Source images for img2img
      files/[...key]/         Serves stored images, scoped to the owner
      billing/…               Checkout, portal, webhook
  lib/
    plans.ts                  Plan catalogue + credit pricing
    presets.ts                Style presets + aspect ratios
    generate.ts               Generation lifecycle
    credits.ts                Atomic debit / refund ledger
    storage.ts                Image persistence
    providers/                mock | replicate | fal adapters
```

**Adding a provider.** Implement the `ImageProvider` interface in
`src/lib/providers/types.ts`, register it in `src/lib/providers/index.ts`, and
select it with `PROVIDER=yourprovider`. Nothing else needs to change — a
self-hosted InvokeAI or ComfyUI instance fits here too.

**Credits.** Debits use a conditional `UPDATE … WHERE credits >= amount`, so
concurrent generations can't drive a balance negative. Every provider failure
refunds automatically and records the error against the generation, and every
movement is written to a `CreditEntry` ledger surfaced on the billing page.

**Plan limits.** `maxResolution` clamps oversized requests down to what the plan
allows (rather than rejecting them), and the user is charged for the size they
actually get.

**Access control.** Stored images live under `<userId>/<uuid>.<ext>` and
`/api/files/*` checks that prefix against the session, so one account can never
read another's files. Mutations scope their `WHERE` clause to the owner.

---

## Deploying

### Switch to Postgres

SQLite is for local development. For anything hosted:

1. In `prisma/schema.prisma`, change the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set `DATABASE_URL` to your Postgres connection string (Neon, Supabase, RDS…).
3. Run `npx prisma db push` (or `npx prisma migrate deploy` if you adopt
   migrations).

### Vercel

1. Push the repo and import it at <https://vercel.com/new>.
2. Add every environment variable from the tables above. Set
   `NEXT_PUBLIC_APP_URL` to your real domain.
3. Because Vercel's filesystem is ephemeral, either set
   `STORAGE_DRIVER=passthrough` (accepting expiring URLs) or replace
   `putImage`/`getImage` in `src/lib/storage.ts` with S3, R2, or Vercel Blob.
4. Add the Stripe webhook endpoint and its signing secret.

The build command is `npm run build`, which runs `prisma generate` first.

### Docker / a VPS

A plain Node host is the simpler path since `STORAGE_DRIVER=local` just works
with a mounted volume:

```bash
npm ci
npm run build
STORAGE_DIR=/var/lib/lumen/uploads npm start
```

Put it behind nginx or Caddy for TLS, and point `STORAGE_DIR` and
`DATABASE_URL` at persistent storage.

### Pre-flight checklist

- [ ] `AUTH_SECRET` set to a real random value
- [ ] `DATABASE_URL` points at Postgres, schema pushed
- [ ] `NEXT_PUBLIC_APP_URL` is the public URL
- [ ] Storage survives a restart (volume or object storage)
- [ ] Stripe webhook registered, using live keys when you go live
- [ ] `PROVIDER` set to `replicate` or `fal` with a funded account

---

## Notes on prior art

The brief suggested starting from [InvokeAI](https://github.com/invoke-ai/InvokeAI).
This codebase does **not** contain InvokeAI code. Two reasons:

- InvokeAI is **AGPL-3.0**. Running a modified version as a network service
  obliges you to offer your source to your users — awkward for a paid product.
- It's a multi-gigabyte Python/PyTorch application that expects a local GPU,
  which fights the goal of a lean app you can run on a laptop and deploy cheaply.

What is borrowed is the *design*: the style-preset system here follows
InvokeAI's approach of wrapping the user's prompt with a `{prompt}` template
plus a preset-specific negative prompt and sampler settings, rather than
replacing what the user wrote. If you later want local inference, add an
InvokeAI or ComfyUI provider behind the adapter interface and keep it in a
separate process — your application code stays under your own license.

---

## Limitations

Things a real launch would want that this MVP does not have:

- No email verification or password reset (add an email provider and a
  `PasswordResetToken` table).
- No rate limiting beyond the credit system.
- No content moderation on prompts; fal.ai's safety checker is enabled, and
  you should add your own policy layer before opening signups.
- Generations run synchronously inside the request. Slow models will need a job
  queue and a polling or websocket endpoint.
- No test suite yet.

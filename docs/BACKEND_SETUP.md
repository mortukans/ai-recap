# Backend + purchases setup (M0-5 · M5-1 · M5-2)

> **Status 2026-09-19:** sections A, C and D are DONE (Supabase project `syjpumaqnlmglrokiujy`, RevenueCat project `19269c38`, EAS env vars set). Section B products are created; the **Paid Apps Agreement, sandbox tester and the E verification are still open** — see `docs/STATUS.md`.
>
> Hosted AI functions `transcribe` and `recap-generate` are deployed too (Unlimited users only, fair-use capped). They need one more secret before an Unlimited user can use them:
> ```bash
> npx supabase secrets set OPENROUTER_API_KEY=sk-or-...
> ```

Everything the code needs is already in the repo (`supabase/` schema + Edge Functions, `apps/mobile/src/purchases/*`).
This checklist covers the accounts and dashboard steps that can only be done by hand. ~45 minutes.

## A. Supabase (service plane — no user content)

1. https://supabase.com → **New project**. Organization: yours. Region: **EU (Frankfurt `eu-central-1`)**. Save the DB password somewhere safe.
2. Dashboard → **Authentication → Providers → Anonymous sign-ins → Enable**.
3. Dashboard → **Project Settings → API**: copy **Project URL** and **anon public key**.
4. Link the CLI and push schema + functions (from the repo root; CLI is already available via `npx`):
   ```bash
   npx supabase login
   npx supabase link --project-ref <PROJECT_REF>
   npx supabase db push
   npx supabase functions deploy entitlements quota-consume transcribe recap-generate
   npx supabase functions deploy revenuecat-webhook --no-verify-jwt
   ```
5. Generate a webhook secret and store it as a function secret (any long random string):
   ```bash
   npx supabase secrets set REVENUECAT_WEBHOOK_SECRET=<RANDOM_64_CHARS>
   ```

## B. App Store Connect — products

App Store Connect → **AI Recap → Monetization → In-App Purchases / Subscriptions**.
(If not done yet: **Business → Agreements → Paid Apps** must be signed and banking/tax filled, or purchases never load.)

| Product | Type | Product ID (exact) | Price |
|---|---|---|---|
| Unlimited | Auto-renewable subscription, group "AI Recap Plans" | `lv.airecap.unlimited.monthly` | €19.99 / month |
| BYOK lifetime | Non-consumable | `lv.airecap.byok.lifetime` | €99 |

Add a localization (LV + EN name/description) to each and a review screenshot later; they can stay "Ready to Submit" for TestFlight testing.

Sandbox tester: **Users and Access → Sandbox → Testers → +** (a new Apple ID you don't use elsewhere). On the iPhone: Settings → App Store → Sandbox Account → sign in with it.

## C. RevenueCat

1. https://app.revenuecat.com → **New project** "AI Recap" → **Add app → App Store**: bundle id `lv.airecap.app`.
   Upload the **In-App Purchase Key** (App Store Connect → Users and Access → Integrations → In-App Purchase → generate `.p8`) and the **App-Specific Shared Secret**.
2. **Products**: import the two products above.
3. **Entitlements**: create `unlimited` (attach `lv.airecap.unlimited.monthly`) and `byok` (attach `lv.airecap.byok.lifetime`). *IDs must be exactly these.*
4. **Offerings**: `default` offering with two packages: `$rc_monthly` → Unlimited, `$rc_lifetime` → BYOK. Make it current.
5. **Integrations → Webhooks → Add**:
   URL `https://<PROJECT_REF>.supabase.co/functions/v1/revenuecat-webhook`,
   Authorization header value `Bearer <RANDOM_64_CHARS>` (same secret as A.5).
6. **API keys**: copy the **Apple App Store public key** (`appl_…`).

## D. Hand the values to the app (EAS secrets, never committed)

```bash
cd apps/mobile
npx eas-cli env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value https://<PROJECT_REF>.supabase.co --environment production --environment preview --environment development --visibility plaintext
npx eas-cli env:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <ANON_KEY> --environment production --environment preview --environment development --visibility plaintext
npx eas-cli env:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_xxx --environment production --environment preview --environment development --visibility plaintext
```
(The anon key and the RevenueCat public key are designed to ship in the app; RLS and RevenueCat's server protect the data.)

Then a new production build (`eas build --profile production --platform ios --auto-submit`) picks them up.

## E. Verify

- App → Settings → Plan row opens the paywall with both prices from the store (sandbox account signed in).
- Buy Unlimited with the sandbox tester → Plan shows "Unlimited", daily counter disappears.
- Supabase → Table editor → `entitlements`: the row for your anonymous user shows `unlimited_active = true` (webhook worked).
- 6th recording of the day on a Free account is blocked with "See plans" (server-verified when online).

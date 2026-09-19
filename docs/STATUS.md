# AI Recap — project status

_Last updated: 2026-09-19 (early morning). Owner: Martins Mortukans._

## Where we are

**On the phone (TestFlight 0.0.1 (7))**
- Record → chunked audio → transcribe (Latvian/English via OpenRouter, Apple on-device fallback) → structured AI recap → transcript, speakers, Ask-AI chat, notes-for-AI, search, share/export.
- Live Activity in the Dynamic Island / Lock Screen; phone-call and AirPods interruption handling.
- Apple Watch app: remote control when the phone app is open; records on the watch itself otherwise and hands the audio to the phone.
- Free plan enforced: 15-min recordings, 5 recaps/day (server-verified when online). Paywall with Unlimited + BYOK lifetime (prices appear once Apple's Paid Apps Agreement is active).

**Backend (Supabase, EU/Ireland, project `syjpumaqnlmglrokiujy`)**
- Anonymous auth, `entitlements`/`usage_events`/`daily_quota` tables with RLS, Edge Functions `entitlements`, `quota-consume`, `revenuecat-webhook` — all deployed and smoke-tested.

**Purchases**
- App Store Connect: subscription group "AI Recap Plans"; `lv.airecap.unlimited.monthly` €19.99/mo; `lv.airecap.byok.lifetime` €99.99 (Apple has no €99 tier). All regions, EN localizations. Status "Prepare for Submission" (ships with the next app version review).
- RevenueCat project "AI Recap": App Store app linked (IAP key + shared secret), products, entitlements `unlimited`/`byok`, offering `default` (`$rc_monthly`, `$rc_lifetime`), webhook → Supabase (test event 200).

**Build & release**
- EAS Free plan iOS quota exhausted until 2026-10-01. Builds now run on **GitHub Actions macOS runners** via `eas build --local` (no EAS quota) and upload through EAS Submit: `.github/workflows/ios-build.yml`, repo `github.com/mortukans/ai-recap` (private). ~23 min per build, ≈8 builds/month on the free private-repo allowance.
  - Trigger: `gh workflow run ios-build.yml -f profile=production -f submit=true`
- EAS env vars (all profiles): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.

## Open items — owner: Martins (account/legal)

1. **Paid Apps Agreement** (App Store Connect → Business → Agreements): confirm Legal Entity → DSA trader compliance → accept agreement → banking + tax forms. _Gates every purchase, including sandbox tests._
2. **Sandbox tester** Apple ID (Users and Access → Sandbox → Testers) and sign in on the iPhone (Settings → App Store → Sandbox Account).
3. After 1–2: buy Unlimited with the sandbox account → Plan row shows "Unlimited", Supabase `entitlements.unlimited_active = true`.
4. Optional: Latvian localizations for both products in App Store Connect.

## Open items — owner: engineering

- **M2-1 / M3-2 hosted AI path** for Unlimited (transcription + recap via Edge Functions with our provider keys, metered into `usage_events`). Today Unlimited only lifts limits; hosted AI is not wired.
- **M1-7** 60-minute locked-recording verification (+ automatic chunk-gap check).
- **M2-2** LV/EN transcription benchmark with real recordings (gates final pricing).
- **M2-5** real speaker diarization (needs a hosted provider that returns speaker labels).
- **M5-5** usage accounting → backend.
- Android: recorder (Kotlin foreground service), Play Billing, build/submit.
- Watch: complication / Smart Stack tile, haptics.
- Before public launch: re-check Free caps, App Review notes/screenshots for IAPs, privacy labels.

## Reference

- Setup runbook: `docs/BACKEND_SETUP.md` · Tasks: `docs/AI_RECAP_MVP_TASKS.md` · Architecture: `docs/AI_RECAP_TECHNICAL_ARCHITECTURE.md`
- App Store Connect app id `6813450802` · RevenueCat project `19269c38` · EAS project `77676bfa-…`

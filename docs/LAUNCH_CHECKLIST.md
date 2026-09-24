# Launch checklist — AI Recap 1.0 (iOS)

Ordered. "Me" = engineering (Claude), "M" = Martins. Everything marked Me is done or scripted; M items need accounts, legal or a physical device.

## A. Product decisions (M)
- [ ] Final default models (from the per-recording experiments): transcription ______ , summary ______ . → Me: set `DEFAULT_TRANSCRIPTION_MODEL` / `DEFAULT_SUMMARY_MODEL`, hosted `LLM_TIERS`, remove or hide the experiment UI.
- [ ] Paid recording length: keep 90 min or the plan's 60? → one value in `packages/core/src/capabilities.ts` (`LIMITS.paidMinutes`).
- [ ] Optional: custom domain (e.g. airecap.lv) for the GitHub Pages site; the github.io URLs work for the App Store meanwhile.

## B. Code flips before the release build (Me, 10 minutes once A is decided)
- [ ] `TESTING_MODE = false` in `packages/core/src/capabilities.ts` (restores Free 15 min / 5 per day). Tests adapt automatically.
- [ ] Remove the "AI modeļi šim ierakstam" experiment group from the notes sheet, or gate it behind BYOK.
- [ ] Version `1.0.0` in `apps/mobile/app.config.ts`; build number keeps auto-incrementing.
- [ ] Onboarding / paywall copy already states 15 min / 5 per day — verify once more.
- [ ] `pnpm -r typecheck && pnpm test`, then `gh workflow run ios-build.yml -f profile=production -f submit=true`.

## C. Accounts (M)
- [x] Paid Apps Agreement ACTIVE (2026-09-25); tax forms Active; DSA Active.
- [x] Sandbox tester created; sandbox purchase verified 2026-09-25 (BYOK Lifetime €99.99 — RevenueCat shows entitlement `byok` active). Unlimited monthly not yet purchased in sandbox.
- [x] `OPENROUTER_API_KEY` secret set on Supabase (2026-09-24).
- [ ] `eas credentials -p ios` once on branch `feat/watch-complication` → Me merges the watch-face complication.

## D. App Store Connect content
- [x] Listing texts entered in ASC version 1.0 (English U.S.): promo text, description, keywords, support/marketing URL, copyright, review notes, contact name+email. Saved 2026-09-24 incl. contact phone; Sign-in required unchecked. App Information: name `AI Recap – Meeting Recaps`, subtitle, categories Productivity/Business saved.
- [ ] Screenshots 6.7" + 6.1" (M captures on device following the shot list; Me can frame/caption them).
- [x] App Privacy: policy URL set; 4 data types (Audio Data, User ID, Purchase History, Product Interaction) — App Functionality, not linked, no tracking.
- [x] Privacy policy + support page hosted on GitHub Pages: https://mortukans.github.io/ai-recap/ and https://mortukans.github.io/ai-recap/privacy.html (M: fill in controller name + support email in `docs/index.html` / `docs/privacy.html`; a custom domain can be pointed later).
- [x] App review notes pasted (version 1.0, 2026-09-24).
- [ ] **IAP review screenshot** on each product (M: screenshot of Settings → Plāns paywall with both prices; upload under Review Information → Screenshot on `In-App Purchases → BYOK Lifetime` and `Subscriptions → AI Recap Plans → Unlimited Monthly`). Once both are uploaded, the "In-App Purchases and Subscriptions" section appears on the version page → attach both. Without this, both products stay "Prepare for Submission" and the version cannot include them.
- [x] Age rating 4+ (global, regional exceptions auto), Content Rights (no third-party content). Category + URLs done.
- [x] App price Free (USD base, 175 countries) + availability all countries, saved 2026-09-25. Version release: automatic after approval (change to Manual on the version page if you want to pick the day).
- [x] IAP review notes entered on both products (2026-09-25). Prices verified: Unlimited €19.99/mo (US $17.99), BYOK Lifetime €99.99 base Latvia.

## E. Verification on the release build (M, ~90 minutes)
- [ ] 60–90 min locked-phone recording with a phone call and an AirPods switch in the middle → exact duration, no "audio missing" banner.
- [ ] Free account: 6th recap of the day is blocked with the paywall alert; 15-minute auto-stop saves the recording.
- [ ] Watch: start from watch with the phone app closed → recording appears on the phone and processes.
- [ ] Live Activity buttons, share to Notes, language switch.

## F. Submit
- [ ] Add build to version 1.0.0, submit for review. Typical review time 24–48 h.
- [ ] After approval: make the repo private again if desired (Actions minutes reset on the 1st; EAS quota also resets).

## Post-launch backlog
- Android (recorder foreground service, Play Billing, build/submit).
- Real speaker diarization provider; transcription benchmark numbers.
- Watch complication in the store build; Dynamic Type mapping for custom fonts.

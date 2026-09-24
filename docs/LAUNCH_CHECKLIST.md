# Launch checklist — AI Recap 1.0 (iOS)

Ordered. "Me" = engineering (Claude), "M" = Martins. Everything marked Me is done or scripted; M items need accounts, legal or a physical device.

## A. Product decisions (M)
- [x] Default models decided 2026-09-25: transcription **google/gemini-2.5-flash-lite**, summary **google/gemini-2.5-flash-lite** (BYOK defaults + hosted `LLM_TIERS` fast/balanced + hosted `TRANSCRIPTION_MODEL`). Hosted functions redeployed 2026-09-25. Experiment UI still to remove/hide before release (§B).
- [x] Paid recording length: **90 min** (decided 2026-09-25; `LIMITS.paidMinutes`). Paywall copy and both ASC IAP descriptions updated to 90-min.
- [ ] Optional: custom domain (e.g. airecap.lv) for the GitHub Pages site; the github.io URLs work for the App Store meanwhile.

## B. Code flips before the release build (Me, 10 minutes once A is decided)
- [x] `TESTING_MODE = false` (Free 15 min / 5 per day, paid 90 min) — 2026-09-25.
- [x] Model-experiment group in the notes sheet shown only when an OpenRouter key is stored (BYOK).
- [x] Version `1.0.0`; build number keeps auto-incrementing.
- [x] Onboarding / paywall copy: 15 min / 5 per day verified; "up to 90 minutes" on the paywall.
- [x] Typecheck + tests green; release build triggered 2026-09-25 (first 1.0.0 build).

## C. Accounts (M)
- [x] Paid Apps Agreement ACTIVE (2026-09-25); tax forms Active; DSA Active.
- [x] Sandbox tester created; sandbox purchase verified 2026-09-25 (BYOK Lifetime €99.99 — RevenueCat shows entitlement `byok` active). Unlimited monthly not yet purchased in sandbox.
- [x] `OPENROUTER_API_KEY` secret set on Supabase (2026-09-24).
- [ ] `eas credentials -p ios` once on branch `feat/watch-complication` → Me merges the watch-face complication.

## D. App Store Connect content
- [x] Listing texts entered in ASC version 1.0 (English U.S.): promo text, description, keywords, support/marketing URL, copyright, review notes, contact name+email. Saved 2026-09-24 incl. contact phone; Sign-in required unchecked. App Information: name `AI Recap – Meeting Recaps`, subtitle, categories Productivity/Business saved.
- [x] Screenshots: 7 renders from the design canvas uploaded to version 1.0 (iPhone 6.5" slot, 1284×2778; used for all sizes) — 2026-09-25. Device captures can replace them later if App Review asks (`design/store-screenshots/make_shots.py`).
- [x] App Privacy: policy URL set; 4 data types (Audio Data, User ID, Purchase History, Product Interaction) — App Functionality, not linked, no tracking.
- [x] Privacy policy + support page hosted on GitHub Pages: https://mortukans.github.io/ai-recap/ and https://mortukans.github.io/ai-recap/privacy.html (M: fill in controller name + support email in `docs/index.html` / `docs/privacy.html`; a custom domain can be pointed later).
- [x] App review notes pasted (version 1.0, 2026-09-24).
- [x] IAP review screenshot (paywall render) uploaded to both products; descriptions say 90-min; both added to the **Draft review submission** via "Add for Review" (status Ready for Review). The draft is submitted together with version 1.0 from App Review → Drafts → Submit for Review (NOT yet pressed).
- [x] Age rating 4+ (global, regional exceptions auto), Content Rights (no third-party content). Category + URLs done.
- [x] App price Free (USD base, 175 countries) + availability all countries, saved 2026-09-25. Version release: automatic after approval (change to Manual on the version page if you want to pick the day).
- [x] IAP review notes entered on both products (2026-09-25). Prices verified: Unlimited €19.99/mo (US $17.99), BYOK Lifetime €99.99 base Latvia.

## E. Verification on the release build (M, ~90 minutes)
- [ ] 60–90 min locked-phone recording with a phone call and an AirPods switch in the middle → exact duration, no "audio missing" banner.
- [ ] Free account: 6th recap of the day is blocked with the paywall alert; 15-minute auto-stop saves the recording.
- [ ] Watch: start from watch with the phone app closed → recording appears on the phone and processes.
- [ ] Live Activity buttons, share to Notes, language switch.

## F. Submit
- [ ] Select build 1.0.0 (32) on the version page after M's release checks (§E), then App Review → Drafts → Submit for Review (version + both IAPs go together). Typical review time 24–48 h.
- [ ] After approval: make the repo private again if desired (Actions minutes reset on the 1st; EAS quota also resets).

## Post-launch backlog
- Android (recorder foreground service, Play Billing, build/submit).
- Real speaker diarization provider; transcription benchmark numbers.
- Watch complication in the store build; Dynamic Type mapping for custom fonts.

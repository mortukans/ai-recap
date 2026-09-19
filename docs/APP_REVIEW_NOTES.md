# App Review preparation — AI Recap (iOS)

Working notes for the first App Store submission (0.0.x). Keep in sync with `docs/STATUS.md`.

## Review notes (paste into App Store Connect → App Review Information → Notes)

> AI Recap records meetings on the user's device, transcribes them and writes a structured recap.
> Audio, transcripts and recaps are stored only on the device (SQLite + app Documents); our backend
> (Supabase, EU) stores no user content — only an anonymous account id, purchase entitlements and
> anonymous usage counters (seconds, tokens).
>
> To test: tap "Start Recap", speak for 20–30 seconds in English or Latvian, tap Finish. The recap
> screen shows the transcript and (after a few seconds) the AI recap.
>
> AI processing options: (1) Free — on-device Apple Speech; (2) "Bring your own key" — the user's
> own OpenRouter API key, stored in the iOS keychain, calls go directly from the device to OpenRouter;
> (3) Unlimited subscription — processing through our server with our provider key.
> The in-app purchases are: `lv.airecap.unlimited.monthly` (auto-renewable, monthly) and
> `lv.airecap.byok.lifetime` (non-consumable). Restore Purchases is on the paywall (Settings → Plan).
>
> Apple Watch app: remote control for the iPhone recorder; when the iPhone app is not in the
> foreground it records on the watch and transfers the audio to the phone. Live Activity shows the
> recording timer. Microphone and Speech Recognition permissions are requested on first recording.

Demo account: not needed (no sign-in).

## IAP review screenshots
Each product needs a screenshot of the purchase surface: the paywall (`Settings → Plan`) with both prices visible. Take on a real device once prices load (Paid Apps Agreement active). 1284×2778 or any supported size.

## App Privacy (nutrition labels) — proposed answers
- **Data collected:** Purchases (linked to an anonymous identifier, for entitlements) · Usage data / product interaction (anonymous seconds/tokens counters) · Identifiers (anonymous Supabase user id). No contact info, no location, no user content.
- **Audio / transcripts:** not collected by us. When the user selects BYOK or Unlimited, audio chunks and transcripts are sent to the AI provider for processing (OpenRouter → model vendor) and are not stored by us. Disclose as "Audio data — used for App Functionality — not linked to identity — not used for tracking" if Apple's questionnaire asks about third-party processing.
- **Tracking:** none. No ads, no cross-app tracking, no ATT prompt.

## Export compliance
`ITSAppUsesNonExemptEncryption = false` is set in the Info.plist (standard TLS only).

## Pre-submission checklist
- [ ] Paid Apps Agreement active; banking + tax complete
- [ ] Both IAPs "Ready to Submit" with screenshots; attached to the version
- [ ] Free caps verified in `FREE_CAPABILITIES` (15 min / 5 per day)
- [ ] App Privacy answers entered
- [ ] Screenshots for 6.7" and 6.1" iPhones; Watch screenshots optional
- [ ] Support URL + privacy policy URL live (domain still to be chosen by Martins; draft text in `docs/PRIVACY_POLICY.md`)
- [ ] Version notes (LV + EN)

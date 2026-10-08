# AI Recap — roadmap (post-launch)

Live: **1.0.1** on the App Store. In review: **1.0.2** (fixed English screenshots + genericized
description + the audit fixes + OpenAI-path removal). Audit backlog: `docs/AUDIT_2026-10.md`.

## Track A — 1.0.3 "quality + growth" ✅ built
1. ✅ **App Store ratings prompt** — `expo-store-review`, requested once after the 2nd successful recap
   (never on failure/first run); iOS throttles further. Tested.
2. ✅ **Transcript virtualization** — the transcript is now a `FlatList` (recycled rows, no per-row
   entrance animation) instead of a ScrollView that mounted every segment. Tap-to-seek + highlight
   preserved; compare mode kept in the list header. **Verify on TestFlight** (long transcript scroll).
3. ✅ **Lint → green + dead-code cleanup** — hoisted the mid-render components, renamed the `useVersion`
   that tripped the hooks rule, fixed/annotated the load effects, deleted the dead Expo-template
   cluster + duplicate `useTheme`. CI lint is now **blocking**.

Shipped to TestFlight as **1.0.3**; verify on device, then submit.

## Track B — product analytics (next, in parallel)
Currently flying blind on activation, paywall view→purchase, and failed-transcription rate. Plan:
a privacy-respecting, anonymous event layer keyed to the existing anonymous account id — a small
`analytics_events` table (service-role insert only) + a thin client logger, instrumenting a handful
of funnel events (onboarding choice, paywall view, purchase, recap success/failure). Disclosed in the
privacy policy as anonymous product analytics (no content, no tracking). This is what makes the *next*
roadmap decisions data-driven instead of guesses.

## Strategic bets (pick after A/B)
- **Server-side background processing** for Unlimited — long recordings finish while the app is closed
  (push/notify on completion). The biggest paid-tier value + removes the "resume all" friction. Large.
- **Watch-face complication** — ready on `feat/watch-complication` (one `eas credentials` step). One-tap
  record from the watch face: differentiation + a marketing angle. Low effort.

## Backlog (from the audit)
- Expo SDK patch bumps (deliberate: bump `overrides.expo` + lockfile, native-build test).
- `log-error` server-side rate limiting + body-size cap.
- Transcription test coverage (`openrouterAudio`/`openrouterStt` orchestration, `parseTranscript`,
  `normalizeChunks`).
- Dynamic Type / contrast / touch-target polish; port the 3 legacy-styled screens to the design system.
- Dedupe the two OpenRouter transcribers' shared chunk-loop.
- **Android** — recorder (Kotlin) + Play Billing + build/submit. Large; after iOS is validated.

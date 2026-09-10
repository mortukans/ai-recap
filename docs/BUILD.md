# Building AI Recap from Windows (no Mac)

AI Recap is an Expo / React Native app. It uses **custom native modules** (the recorder), so it runs
in a **development build** (custom dev client), **not Expo Go**. iOS builds happen in the cloud via
**EAS Build** — you never need a local Mac to build or submit.

## Prerequisites

- Node 20+ and `pnpm` (`npm i -g pnpm`).
- `eas-cli` (`npm i -g eas-cli`) and an Expo account.
- **Apple Developer Program** membership (~€99/yr) — required even for TestFlight.
- **Google Play Developer** account (~$25 one-time) — for the Android fast-follow.
- A physical iPhone (for testing the recorder) and/or an Android device or emulator.

## First-time setup

```bash
pnpm install
cp apps/mobile/.env.example apps/mobile/.env   # fill in Supabase + RevenueCat public keys
```

## Verify the code (works fully on Windows)

```bash
pnpm -r typecheck                    # core, prompts, and the app
pnpm --filter mobile db:generate     # regenerate SQLite migrations after schema changes
```

## Run in development

### Android (fully local)
```bash
# One-time: build a dev client for Android (needs Android Studio / JDK, or use EAS cloud):
pnpm --filter mobile exec eas build --profile development --platform android
# Then start Metro and open the dev client:
pnpm --filter mobile start
```

### iOS (cloud build — no Mac)
```bash
# Build a dev client on EAS's macOS workers and install it on your iPhone (internal distribution):
pnpm --filter mobile exec eas build --profile development --platform ios
# Start Metro from Windows; the dev client reloads JS over the LAN:
pnpm --filter mobile start
```

> **Native iOS debugging.** EAS *builds* the Swift recorder/Live Activity for you, but debugging a
> native iOS crash (as opposed to JS) needs Xcode. Rent a cloud Mac by the hour (MacinCloud /
> MacStadium) for those sessions. Day-to-day JS work stays on Windows.

## TestFlight & release

```bash
pnpm --filter mobile exec eas build --profile production --platform ios
pnpm --filter mobile exec eas submit --platform ios         # → App Store Connect / TestFlight
```

`eas.json` build profiles are created on first `eas build`. Ship JS-only changes without a store
review using **EAS Update**.

## Backend (Supabase)

Apply `supabase/migrations/*.sql` to an EU-region Supabase project, enable **anonymous auth**, and
create a private `processing-audio` storage bucket. Set the project URL + anon key in `.env`.

# First running build — step by step (from Windows)

Goal: get the AI Recap shell running on a real device via **EAS cloud builds** (no Mac). The recorder's
native audio isn't finished yet (that's M1-3), but the app launches, the tabs work, the DB opens, and
Start Recap opens the recording screen.

Two paths. **Android is the fastest first run** (no Apple account, APK installs on any Android phone).
**iOS** needs a paid Apple Developer account. Pick the one matching what you have; the JS shell is
identical on both.

---

## 0. One-time tooling (both paths)

```bash
npm i -g eas-cli          # or use `npx eas-cli@latest` in place of `eas` below
eas login                 # create a free Expo account if you don't have one
```

Then link the project (run inside `apps/mobile`):

```bash
cd "D:/VM Linux 2/PROJECTS/AI-Recap/apps/mobile"
eas init
```

`eas init` prints a **Project ID** (a public UUID). Because our config is dynamic (`app.config.ts`),
it won't auto-write it — do one of:
- paste it into `apps/mobile/.env` as `EAS_PROJECT_ID=<the-uuid>` (copy `.env.example` first), **or**
- hardcode it in `app.config.ts` → `extra.eas.projectId`.

Sanity check it's linked:

```bash
eas whoami
npx expo config --type public | grep -i projectId
```

---

## Path A — Android first (no Apple account, ~15 min)

1. Build a development client in the cloud:
   ```bash
   eas build --profile development --platform android
   ```
   - First run asks to **generate a new Android Keystore** → answer **Yes** (EAS stores it).
   - Wait for the cloud build (~10–15 min). It prints a URL + QR when done.

2. Install it:
   - On a physical Android phone: open the QR/link, download the **APK**, allow "install unknown apps",
     install.
   - Or drag the APK onto an Android emulator (if you later install Android Studio).

3. Start Metro from Windows and connect:
   ```bash
   pnpm --filter mobile start   # or: cd apps/mobile && npx expo start --dev-client
   ```
   Open the installed **AI Recap (dev)** app; it connects to Metro over your LAN (same Wi-Fi).

You should see the **Recaps / Contexts / Settings** tabs, seeded built-in contexts under Contexts, and
Start Recap opening the recording screen.

---

## Path B — iOS on your iPhone (needs Apple Developer Program, ~20 min)

Prerequisite: an **Apple Developer Program** membership (~€99/yr) and your iPhone.

1. Register your iPhone with EAS (so the build's provisioning profile includes it):
   ```bash
   eas device:create
   ```
   Follow the printed URL/QR **on the iPhone** and install the profile (Settings may ask to approve it).

2. Build a development client in the cloud:
   ```bash
   eas build --profile development --platform ios
   ```
   - It will ask to **log in to your Apple account** (or use an App Store Connect API key) and to
     **generate credentials** (distribution cert + provisioning profile) → let EAS manage them.
   - Make sure your iPhone is selected as a registered device.
   - Wait ~15–20 min for the macOS cloud build.

3. Install it: open the printed link/QR **on the iPhone** and install **AI Recap (dev)**.
   - First launch: Settings → General → VPN & Device Management → trust the developer profile.

4. Start Metro and connect:
   ```bash
   pnpm --filter mobile start
   ```
   Open the app; it connects to Metro over your LAN.

---

## What works now vs. what's still stubbed

- ✅ App launches, tabs, navigation, LV/EN, encrypted SQLite opens + migrates, built-in contexts seed,
  library/detail screens, Start Recap → recording screen.
- ⚠️ Pressing record calls the native recorder, whose **capture internals are not implemented yet**
  (M1-3). Expect a clear "recorder native module…" behavior rather than real audio. That's the next
  build task, done against this running dev client.
- ⚠️ Backend calls (transcription/hosted AI) are stubs until Supabase + M2/M3.

## After the first run — iterating

- **JS/UI changes**: just save; Metro fast-refreshes on the device. No rebuild needed.
- **Native changes** (recorder Swift/Kotlin, new native deps, app.config native settings): rebuild the
  dev client (`eas build --profile development --platform <ios|android>`).
- **Ship JS updates without a store**: `eas update`.

## Common snags

- **Dev client can't reach Metro**: phone and PC must be on the same network; try
  `npx expo start --dev-client --tunnel`.
- **`projectId` errors**: ensure `EAS_PROJECT_ID` is set (or hardcoded in `app.config.ts`) and
  `eas whoami` shows you logged in.
- **iOS "device not registered"**: re-run `eas device:create`, then rebuild.

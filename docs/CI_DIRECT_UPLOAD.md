# Fast TestFlight uploads — App Store Connect API key (one-time, ~10 min)

By default the CI build hands the `.ipa` to **EAS Submit**, whose free-tier queue took ~3 hours on
2026-09-25. With an App Store Connect API key stored as GitHub secrets, the build instead uploads
**directly to Apple** with `xcrun altool`, so a build reaches TestFlight ~25 min after the push with
no queue. The workflow auto-detects the secrets; without them nothing changes.

## 1. Create the API key (App Store Connect)

1. App Store Connect → **Users and Access** → **Integrations** tab → **App Store Connect API**
   (the "Team Keys" section). https://appstoreconnect.apple.com/access/integrations/api
2. Click **+** (Generate API Key).
   - Name: `GitHub Actions upload`
   - Access: **App Manager** (enough to upload builds; do not use Admin).
3. **Generate**, then **Download API Key**. The `.p8` file downloads **once only** — keep it safe.
   You cannot download it again; if lost, revoke and make a new one.
4. Note two values shown on that page:
   - **Key ID** (10 chars, e.g. `2X9ABC1DEF`) — also in the `.p8` filename `AuthKey_<KeyID>.p8`.
   - **Issuer ID** (a UUID at the top of the Keys list, e.g. `69a6de70-…`).

## 2. Store them as GitHub secrets

Run these in the repo (`gh` is already authenticated on this machine). Replace the placeholders and
point the last command at the downloaded `.p8`:

```bash
gh secret set ASC_API_KEY_ID --body "PASTE_KEY_ID"
gh secret set ASC_API_ISSUER_ID --body "PASTE_ISSUER_ID"
base64 -i ~/Downloads/AuthKey_PASTE_KEY_ID.p8 | gh secret set ASC_API_KEY_BASE64
```

(The key is base64-encoded so the multi-line `.p8` survives as a single secret. GitHub encrypts all
three at rest; they are never printed in logs.)

## 3. Done

The next `production` build with **Submit = true** uploads directly to Apple. The step logs
`Uploading directly to App Store Connect with altool`. If a secret is missing it logs the EAS-Submit
fallback instead, so a half-finished setup can't break a release.

To revoke later: App Store Connect → Users and Access → Integrations → the key → Revoke, then delete
the three secrets with `gh secret delete`.

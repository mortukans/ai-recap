# Release 1.1.1 — App Store submission checklist

First public release since **1.0.2**. Version `1.1.1` in `apps/mobile/app.config.ts`; EAS build **54**
(CI run 43072817009) uploaded to App Store Connect. The headline is the **Calendar** feature.

> **STATUS: SUBMITTED 2026-11-11 — "Waiting for Review"** (build 54, auto-release after approval).
> What's New (EN below) attached. Screenshots carried over from 1.0 (the new ASC product-page UI has
> no inline portrait-carousel editor). A **landscape calendar hero** for the Search Results slot is
> built at `design/store-screenshots/search-results-calendar-3840x2560.png` (via `make_hero.py`) but
> the listing is **locked during review** — upload it to Product Page → Header and Search Results →
> Search Results once 1.1.1 is approved. Promotional text can also be refreshed then (it's live-editable).

## In this release (since 1.0.1, all built to TestFlight first)
- **Calendar is a real feature** (1.1.0): its own tab with **month + list** views, color-coded event
  types, filters, a "Next up" bar on Home, and a Dates card on each recap. The app scans recaps for
  dates and shows past + upcoming.
- **Add to Apple Calendar** with a customizable reminder (native EventKitUI editor, iOS 17 write-only).
- **Accurate dates** — the recap prompt resolves "next Tuesday"/"the 15th" to the real date against the
  recording date (no more wrong-year ISO).
- **Recording reliability** (1.0.10): recover from a rare stuck-audio-session error (560226676).
- **BYOK: no daily limit** (1.1.1) — your own key, your cost, so the 5/day cap is lifted.

## Submit in App Store Connect (you do this — ASC login is yours)
1. **App Store Connect → My Apps → AI Recap → App Store** tab.
2. Blue **+ (Version or Platform) → iOS**, enter **1.1.1**, Create.
3. On the 1.1.1 page:
   - **What's New in This Version** → paste the notes below (English; add the Latvian localization too
     if the LV locale is present).
   - **Build** → **+ Add Build** → pick **build 48 (1.1.1)**. If it's not listed yet, it's still
     "Processing" — wait a few minutes and refresh.
   - **Screenshots**: existing ones carry over. Optional but nice — add one Calendar screenshot since
     it's the headline feature (not required to submit).
   - **Export compliance**: no prompt — `ITSAppUsesNonExemptEncryption: false` is set in the build.
   - **Version Release**: Automatic (ships on approval) or Manual (you pick the day).
4. Top-right **Add for Review → Submit for Review**.
5. **No IAP changes** → no need to re-submit products. (Optional: update the live BYOK listing line to
   add "no daily limit" — see `docs/APP_STORE_LISTING.md`, already updated.)

## What's New — paste into ASC

### EN
```
New Calendar. AI Recap now finds the dates in your recordings and shows them on a clean calendar — month and list views, upcoming and past. Add any date to your iPhone calendar with a reminder in a couple of taps.

• Calendar is now its own tab, with month and list views, color-coded event types and filters.
• Dates in your recaps are accurate now — "next Tuesday" and the like resolve to the real date.
• More reliable recording (fixed a rare audio error).
• Bring your own key: no more daily limit — use it as much as you need.
```

### LV
```
Jauns kalendārs. AI Recap tagad atrod datumus tavos ierakstos un parāda tos pārskatāmā kalendārā — mēneša un saraksta skatā, nākamos un pagājušos. Jebkuru datumu pāris pieskārienos pievieno iPhone kalendāram ar atgādinājumu.

• Kalendārs tagad ir atsevišķa cilne ar mēneša un saraksta skatu, krāsainiem notikumu tipiem un filtriem.
• Datumi pārskatos tagad ir precīzi — "nākamo otrdienu" u.tml. pārrēķina uz īstu datumu.
• Stabilāka ierakstīšana (novērsta reta audio kļūda).
• Sava atslēga: vairs nav dienas limita — izmanto, cik nepieciešams.
```

"""Render the landscape "calendar hero" creative asset for the App Store Connect product page
(Header / Search Results slots on the new product-page UI). 3:2, English/generic, on-brand.

Reuses the calendar mock + helpers from make_shots.py. Output: 3840x2560 (a supported size; also
downscales cleanly to 1920x1280). Run:  python design/store-screenshots/make_hero.py
Needs Chrome at make_shots.CHROME and network for Google Fonts.
"""
import os
import make_shots as m

# 1920x1280 CSS layout, rendered at device-scale 2 -> 3840x2560 PNG (both are supported sizes).
W, H = 1920, 1280
th = m.LIGHT


def hero_html() -> str:
    mock = m.english_mock("CalendarL.dc.html")  # 390x844 English/generic calendar month view
    # Phone on the right, scaled to ~1040px tall.
    s = 1040 / 844
    pw, ph = 390 * s, 844 * s
    phone_left = W - pw - 150
    phone_top = (H - ph) / 2
    frame = f'''<div style="position:absolute;left:{phone_left:.0f}px;top:{phone_top:.0f}px;width:{pw:.0f}px;height:{ph:.0f}px;border-radius:{54*s:.0f}px;overflow:hidden;box-shadow:0 40px 120px rgba(22,24,29,0.22), 0 0 0 {3*s:.0f}px {th["line"]};background:{th["frame"]}">
{m.iframe(mock, 390, 844, s)}</div>'''
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8">{m.FONTS}
<style>html,body{{margin:0;width:{W}px;height:{H}px;overflow:hidden;font-family:'Hanken Grotesk',system-ui,sans-serif;-webkit-font-smoothing:antialiased;
background:linear-gradient(135deg,#FCF3E4 0%,#F4F5F7 58%)}}
.eyebrow{{display:flex;align-items:center;gap:14px;color:#A8661A;font-weight:600;font-size:30px;letter-spacing:0.02em}}
h1{{margin:26px 0 0;font-family:'Newsreader',Georgia,serif;font-weight:500;font-size:104px;line-height:1.02;letter-spacing:-0.02em;color:#16181D}}
p{{margin:34px 0 0;font-size:40px;line-height:1.32;color:#656A73;max-width:880px}}
.chips{{display:flex;gap:16px;margin-top:44px}}
.chip{{display:flex;align-items:center;gap:11px;font-size:28px;color:#16181D;background:#FFFFFF;border:1px solid #E1E4E9;border-radius:999px;padding:12px 22px}}
.d{{width:13px;height:13px;border-radius:7px}}
</style></head><body>
<div style="position:absolute;left:150px;top:0;height:{H}px;width:980px;display:flex;flex-direction:column;justify-content:center">
  <div class="eyebrow">
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#A8661A" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 3v4M16 3v4"/></svg>
    AI Recap · Calendar
  </div>
  <h1>Every date your<br>meetings mention.</h1>
  <p>AI Recap pulls the dates out of your recordings and lays them on a calendar — month and list, past and upcoming. Add any one to your calendar with a reminder.</p>
  <div class="chips">
    <div class="chip"><span class="d" style="background:#E9A24A"></span>Events</div>
    <div class="chip"><span class="d" style="background:#C4372A"></span>Deadlines</div>
    <div class="chip"><span class="d" style="background:#3A6E9A"></span>Dates</div>
  </div>
</div>
{frame}
{m.EXPAND_JS}
</body></html>'''


if __name__ == "__main__":
    hp = os.path.join(m.WORK, "hero-calendar.html")
    os.makedirs(m.WORK, exist_ok=True)
    open(hp, "w", encoding="utf-8").write(hero_html())
    pp = os.path.join(m.OUT, "search-results-calendar-3840x2560.png")
    pw, ph = m.shoot(hp, pp, W, H, scale=2)
    print(f"{pw}x{ph}  {pp}")

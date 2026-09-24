"""Render App Store screenshots and the IAP review screenshot from the design-canvas mocks.

Each store shot = caption + the 390x844 mock (iframe) scaled to fill the width, on a brand background.
Sizes: iPhone 6.9" 1320x2868, iPhone 6.5" 1284x2778. Output: <repo>/design/store-screenshots/.
"""
import os, subprocess, struct, sys, html

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CANVAS = os.path.join(REPO, "design", "ai-recap-design-handoff", "design-canvas")
OUT = os.path.join(REPO, "design", "store-screenshots")
WORK = os.path.join(os.environ.get("TEMP", "."), "ai-recap-shots-html")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
os.makedirs(OUT, exist_ok=True)
os.makedirs(WORK, exist_ok=True)

LIGHT = dict(bg="#F4F5F7", ink="#16181D", muted="#656A73", accent="#A8661A", frame="#FFFFFF", line="#E1E4E9")
DARK = dict(bg="#15171B", ink="#F1EDE6", muted="#A6A29B", accent="#E9A24A", frame="#1D2025", line="#2E333A")

FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap">'

SHOTS = [
    # (file stem, mock(s), caption, subcaption, theme)
    ("01-home", ["HomeL.dc.html"], "Record once.<br>Remember everything.", "Meetings, calls and voice notes — transcribed and recapped in minutes.", LIGHT),
    ("02-recording", ["RecordingL.dc.html"], "Latvian and English.<br>Even mixed.", "Live waveform, Dynamic Island controls, records with the screen locked.", LIGHT),
    ("03-recap", ["DetailL.dc.html"], "Decisions, tasks, dates.<br>Structured.", "Tick off action items. Regenerate with any context — every version is kept.", LIGHT),
    ("04-transcript", ["TranscriptL.dc.html"], "Tap a line.<br>Hear the moment.", "Speakers, search and playback that follows the text.", LIGHT),
    ("05-watch", ["WatchHomeL.dc.html", "WatchRecordingL.dc.html"], "Start from your wrist.", "The watch records on its own and hands the audio to your iPhone.", DARK),
    ("06-contexts", ["ContextsL.dc.html"], "Contexts that speak<br>your vocabulary.", "Sales call, interview, lecture — or your own, with terms and instructions.", LIGHT),
    ("07-dark", ["Detail.dc.html"], "Share it anywhere.<br>Formatting intact.", "Apple Notes, Mail, Notion, Markdown. Audio stays on your device.", DARK),
]

# Expands the mocks' templates (sc-for + renderVals()) — the runtime they were written for is not in the handoff.
EXPAND_JS = """<script>
function expand(doc) {
  var src = Array.from(doc.querySelectorAll('script[type=\\"text/x-dc\\"]')).map(function (x) { return x.textContent; }).join(' ');
  var vals = {};
  try { var Component = new Function('DCLogic', src + ' ; return Component;')(function () {}); vals = new Component().renderVals() || {}; } catch (e) {}
  Array.from(doc.querySelectorAll('sc-for')).forEach(function (el) {
    var name = (el.getAttribute('list') || '').replace('{{', '').replace('}}', '').trim();
    var list = vals[name] || [];
    var as = el.getAttribute('as');
    var tpl = el.innerHTML;
    var tmp = doc.createElement('div');
    tmp.innerHTML = list.map(function (item) {
      var h = tpl;
      Object.keys(item).forEach(function (k) { h = h.split('{{' + as + '.' + k + '}}').join(String(item[k])); });
      return h;
    }).join('');
    el.parentNode.style.overflow = 'hidden'; // the bar lists were sized for the runtime; never spill out of their card
    while (tmp.firstChild) el.parentNode.insertBefore(tmp.firstChild, el);
    el.parentNode.removeChild(el);
  });
}
Array.from(document.querySelectorAll('iframe')).forEach(function (f) { f.addEventListener('load', function () { expand(f.contentDocument); }); });
</script>"""

SIZES = {"iphone-6.9": (1320, 2868), "iphone-6.5": (1284, 2778)}


def wrapper(shot, W, H):
    stem, mocks, cap, sub, th = shot
    margin = 84
    cap_h = 470
    if len(mocks) == 1 and mocks[0].startswith("Watch") is False:
        mw, mh = 390, 844
        s = (W - 2 * margin) / mw
        avail = H - cap_h - margin
        s = min(s, avail / mh)
        pw, ph = mw * s, mh * s
        frames = f'''<div style="position:absolute;left:{(W-pw)/2:.1f}px;top:{cap_h}px;width:{pw:.1f}px;height:{ph:.1f}px;border-radius:{54*s:.0f}px;overflow:hidden;box-shadow:0 {40*s/3:.0f}px {120*s/3:.0f}px rgba(0,0,0,.28), 0 0 0 {3*s:.0f}px {th["line"]};background:{th["frame"]}">
<iframe src="{html.escape(os.path.join(CANVAS, mocks[0]))}" scrolling="no" style="border:0;width:{mw}px;height:{mh}px;transform:scale({s:.4f});transform-origin:0 0;display:block"></iframe></div>'''
    else:
        # two watch mocks (416x496 each at 2x), stacked and offset, as large as the height allows
        mw, mh = 416, 496
        gap = 70
        avail_h = H - cap_h - margin
        s = min((avail_h - gap) / (2 * mh), (W - 2 * margin) / mw * 0.82)
        pw, ph = mw * s, mh * s
        top0 = cap_h + (avail_h - (2 * ph + gap)) / 2
        frames = ""
        for i, m in enumerate(mocks):
            left = margin if i == 0 else W - margin - pw
            top = top0 + i * (ph + gap)
            frames += f'''<div style="position:absolute;left:{left:.1f}px;top:{top:.1f}px;width:{pw:.1f}px;height:{ph:.1f}px;border-radius:{110*s:.0f}px;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.45), 0 0 0 {10*s:.0f}px #2A2D33, 0 0 0 {14*s:.0f}px #111;background:#000">
<iframe src="{html.escape(os.path.join(CANVAS, m))}" scrolling="no" style="border:0;width:{mw}px;height:{mh}px;transform:scale({s:.4f});transform-origin:0 0;display:block"></iframe></div>'''
    return f'''<!doctype html><html><head><meta charset="utf-8">{FONTS}
<style>html,body{{margin:0;width:{W}px;height:{H}px;overflow:hidden;background:{th["bg"]};font-family:'Hanken Grotesk',system-ui,sans-serif;-webkit-font-smoothing:antialiased}}
.cap{{position:absolute;left:{margin}px;right:{margin}px;top:{margin+16}px;color:{th["ink"]}}}
h1{{margin:0;font-family:'Newsreader',Georgia,serif;font-weight:500;font-size:112px;line-height:1.02;letter-spacing:-0.02em}}
p{{margin:26px 0 0;font-size:38px;line-height:1.3;color:{th["muted"]};max-width:{W-2*margin-40}px}}
.mark{{position:absolute;right:{margin}px;top:{margin+22}px;width:64px;height:64px;border-radius:18px;background:linear-gradient(160deg,#2A2D33,#15171B);display:flex;align-items:center;justify-content:center}}
</style></head><body>
<div class="cap"><h1>{cap}</h1><p>{sub}</p></div>
{frames}
{EXPAND_JS}
</body></html>'''


def paywall_html():
    """The purchase surface, in the app's design language (Settings → Plāns → Uzlabot). 390x844."""
    th = DARK
    card = lambda title, price, per, feats, primary: f'''
<div style="display:flex;flex-direction:column;gap:12px;padding:18px;border-radius:18px;background:{th["frame"]};border:1px solid {th["line"]};">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px">
    <div style="font-size:17px;font-weight:600">{title}</div>
    <div style="font-family:'Newsreader',Georgia,serif;font-size:30px;line-height:1;color:{th["accent"]}">{price}<span style="font-family:'Hanken Grotesk',sans-serif;font-size:13px;color:{th["muted"]};margin-left:6px">{per}</span></div>
  </div>
  <div style="display:flex;flex-direction:column;gap:8px">{''.join(f'<div style="display:flex;gap:10px;align-items:flex-start;font-size:14px;color:{th["muted"]};line-height:1.35"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="{th["accent"]}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-top:2px"><path d="M5 12l5 5L20 7"/></svg><span>{f}</span></div>' for f in feats)}</div>
  <div style="height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:16px;background:{'#F1EDE6' if primary else '#2A2D33'};color:{'#16181D' if primary else th["ink"]}">Turpināt</div>
</div>'''
    return f'''<!doctype html><html lang="lv"><head><meta charset="utf-8">{FONTS}
<style>html,body{{margin:0;background:{th["bg"]};color:{th["ink"]};font-family:'Hanken Grotesk',system-ui,sans-serif;-webkit-font-smoothing:antialiased}}</style></head><body>
<div style="width:390px;height:844px;position:relative;box-sizing:border-box;padding:62px 20px 0;display:flex;flex-direction:column;gap:18px;background:{th["bg"]};overflow:hidden">
  <div style="display:flex;align-items:center;justify-content:space-between">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{th["ink"]}" stroke-width="2" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>
    <div style="font-size:17px;font-weight:600">Uzlabot</div><div style="width:24px"></div>
  </div>
  <h1 style="margin:6px 0 0;font-family:'Newsreader',Georgia,serif;font-weight:500;font-size:34px;line-height:1.05;letter-spacing:-0.02em">Vairāk minūšu,<br>vairāk kopsavilkumu.</h1>
  <div style="font-size:14px;line-height:1.4;color:{th["muted"]}">Bezmaksas plānā ir 15 minūšu ieraksti un 5 kopsavilkumi dienā. Atver vairāk ar kādu no šiem — maksājumi notiek caur App Store.</div>
  {card("Unlimited", "€19.99", "/ mēnesī", ["Transkripcija un kopsavilkumi iekļauti — nav vajadzīga API atslēga", "Ieraksti līdz 90 minūtēm", "Nav dienas limita", "Kopsavilkumu un transkriptu eksports"], True)}
  {card("Sava atslēga — uz mūžu", "€99.99", "vienreiz", ["Izmanto savu OpenRouter atslēgu (maksā tieši pakalpojumam)", "Ieraksti līdz 90 minūtēm", "Kopsavilkumu un transkriptu eksports", "Paplašinātas kopsavilkumu veidnes"], False)}
  <div style="display:flex;justify-content:center;gap:28px;font-size:14px;color:{th["muted"]};margin-top:2px"><span>Atjaunot pirkumus</span><span>Ne tagad</span></div>
  <div style="font-size:11px;line-height:1.4;color:{th["muted"]};text-align:center;padding:0 8px">Abonementi atjaunojas automātiski, kamēr tos neatceļ App Store iestatījumos. Cenas nosaka App Store tavam reģionam.</div>
</div></body></html>'''


def shoot(html_path, png_path, w, h, scale=1):
    args = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files", "--force-prefers-reduced-motion",
            f"--force-device-scale-factor={scale}", f"--window-size={w},{h}", "--virtual-time-budget=8000",
            f"--screenshot={png_path}", "file:///" + html_path.replace("\\", "/")]
    subprocess.run(args, check=True, capture_output=True)
    with open(png_path, "rb") as f:
        f.read(16)
        pw, ph = struct.unpack(">II", f.read(8))
    return pw, ph


results = []
for key, (W, H) in SIZES.items():
    d = os.path.join(OUT, key)
    os.makedirs(d, exist_ok=True)
    for shot in SHOTS:
        hp = os.path.join(WORK, f"{shot[0]}-{key}.html")
        open(hp, "w", encoding="utf-8").write(wrapper(shot, W, H))
        pp = os.path.join(d, f"{shot[0]}.png")
        results.append((pp, shoot(hp, pp, W, H)))

# IAP review screenshot: the paywall as a 6.1" device capture (1170x2532)
hp = os.path.join(WORK, "paywall.html")
open(hp, "w", encoding="utf-8").write(paywall_html())
pp = os.path.join(OUT, "iap-review-paywall-1170x2532.png")
results.append((pp, shoot(hp, pp, 390, 844, scale=3)))

for p, (w, h) in results:
    print(f"{w}x{h}  {os.path.relpath(p, REPO)}")

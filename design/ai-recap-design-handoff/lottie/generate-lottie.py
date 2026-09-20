import json, math

def col(h):
    h=h.lstrip('#'); return [int(h[i:i+2],16)/255 for i in (0,2,4)]+[1]
AMBER=col('#E9A24A'); RED=col('#E0432F'); INK=col('#16181D'); DARK=col('#1A1408'); WHITE=[1,1,1,1]

def ease(t, s, i=(0.42,1), o=(0.58,0)):
    n=len(s)
    return {"i":{"x":[i[0]]*n,"y":[i[1]]*n},"o":{"x":[o[0]]*n,"y":[o[1]]*n},"t":t,"s":s}

def static(v): return {"a":0,"k":v}
def anim(kfs): return {"a":1,"k":kfs}

def tr(): return {"ty":"tr","p":static([0,0]),"a":static([0,0]),"s":static([100,100]),"r":static(0),"o":static(100),"sk":static(0),"sa":static(0)}
def fill(c): return {"ty":"fl","c":static(c),"o":static(100),"r":1}
def stroke(c,w): return {"ty":"st","c":static(c),"o":static(100),"w":static(w),"lc":2,"lj":2}
def rect(w,h,r): return {"ty":"rc","d":1,"s":static([w,h]),"p":static([0,0]),"r":static(r)}
def ellipse(d): return {"ty":"el","d":1,"s":static([d,d]),"p":static([0,0])}

def layer(ind,name,shapes,p,op,s=None,o=None,ip=0,st=0):
    return {"ddd":0,"ind":ind,"ty":4,"nm":name,"sr":1,
            "ks":{"o":o or static(100),"r":static(0),"p":static([p[0],p[1],0]),"a":static([0,0,0]),"s":s or static([100,100,100])},
            "ao":0,"shapes":[{"ty":"gr","it":shapes+[tr()],"nm":name}],"ip":ip,"op":op,"st":st,"bm":0}

def comp(name,w,h,op,layers,fr=60):
    return {"v":"5.7.4","fr":fr,"ip":0,"op":op,"w":w,"h":h,"nm":name,"ddd":0,"assets":[],"layers":layers,
            "markers":[]}

def sine_scale_kfs(op, period, phase, lo, hi, step):
    kfs=[]; t=0
    while t<=op:
        v=lo+(hi-lo)*(0.5+0.5*math.sin(2*math.pi*(t+phase)/period))
        kfs.append(ease(t,[100,round(v,1),100],(0.5,1),(0.5,0)))
        t+=step
    return kfs

# 1. Logo mark — 4 bars breathe, dot pops (200x200, 2s loop)
def logo():
    op=120; layers=[]
    bars=[(-51,22),(-17,40),(17,52),(51,30)]  # x, base height (in 64 grid ×3)
    for i,(x,h) in enumerate(bars):
        kfs=sine_scale_kfs(op,80,i*10,45,100,10)
        layers.append(layer(i+1,f"bar{i+1}",[rect(18,h*3,9),fill(AMBER)],[100+x*1.0,100],op,s=anim(kfs)))
    dot_s=anim([ease(0,[0,0,100],(0.2,1),(0.7,0)),ease(18,[125,125,100],(0.3,1),(0.7,0)),ease(30,[100,100,100]),{"t":100,"s":[100,100,100]},ease(100,[100,100,100],(0.4,1),(0.6,0)),{"t":120,"s":[0,0,100]}])
    layers.append(layer(5,"dot",[ellipse(21),fill(RED)],[172,148],op,s=dot_s))
    return comp("AI Recap – logo mark",200,200,op,layers)

# 2. Record pulse — red button + two expanding rings (200x200, 1.2s loop)
def record_pulse():
    op=72; layers=[]
    def ring(ind,phase):
        kf_s=[];kf_o=[]
        for t0,s0,o0,t1,s1,o1 in [(0,100,45,op,175,0)]:
            pass
        # ring travels 100->175 over op; second ring offset by half
        a=phase; b=phase+op//2
        kf_s=[ease(0,[100+75*(phase/op)]*2+[100]),ease(op-phase,[175,175,100]),{"t":op-phase+0.01,"s":[100,100,100]},ease(op-phase,[100,100,100]),{"t":op,"s":[100+75*(phase/op)]*2+[100]}]
        kf_o=[ease(0,[45*(1-phase/op)]),ease(op-phase,[0]),{"t":op-phase+0.01,"s":[45]},ease(op-phase,[45]),{"t":op,"s":[45*(1-phase/op)]}]
        return layer(ind,f"ring{ind}",[ellipse(64),stroke(RED,3)],[100,100],op,s=anim(kf_s),o=anim(kf_o))
    layers.append(ring(1,0)); layers.append(ring(2,op//2))
    btn_s=anim(sine_scale_kfs(op,op,0,97,103,op//4))
    layers.append(layer(3,"button",[ellipse(64),fill(RED)],[100,100],op,s=btn_s))
    # mic glyph (simplified: capsule + arc as stroke)
    mic=[{"ty":"rc","d":1,"s":static([12,24]),"p":static([0,-6]),"r":static(6)},fill(WHITE)]
    layers.append(layer(4,"mic",mic,[100,98],op))
    arc={"ty":"sh","ks":static({"i":[[0,0],[-6,0],[0,6],[6,0]],"o":[[0,6],[6,0],[0,0],[-6,0]],"v":[[-14,-6],[-8,8],[8,8],[14,-6]],"c":False}),"nm":"arc"}
    stem={"ty":"sh","ks":static({"i":[[0,0],[0,0]],"o":[[0,0],[0,0]],"v":[[0,8],[0,16]],"c":False})}
    layers.append(layer(5,"mic-arc",[arc,stem,stroke(WHITE,3.2)],[100,100],op))
    return comp("AI Recap – record pulse",200,200,op,layers)

# 3. Live waveform — 24 bars (400x120, 1.5s loop)
def waveform():
    op=90; layers=[]
    heights=[20,34,52,74,96,80,58,38,26,44,70,92,104,84,60,40,28,46,66,54,36,24,18,14]
    n=len(heights); gap=400/(n+1)
    for i,h in enumerate(heights):
        kfs=sine_scale_kfs(op,op,(i*7%11)*op/11,28,100,op//6)
        layers.append(layer(i+1,f"bar{i+1}",[rect(6,h,3),fill(AMBER)],[gap*(i+1),60],op,s=anim(kfs)))
    return comp("AI Recap – live waveform",400,120,op,layers)

# 4. Check draw — amber disc pops, check strokes on (200x200, one-shot 1.2s)
def check():
    op=72
    disc_s=anim([ease(0,[0,0,100],(0.2,1),(0.6,0)),ease(18,[110,110,100],(0.3,1),(0.6,0)),{"t":28,"s":[100,100,100]}])
    disc=layer(2,"disc",[ellipse(120),fill(AMBER)],[100,100],op,s=disc_s)
    path={"ty":"sh","ks":static({"i":[[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0]],"v":[[-30,2],[-8,24],[34,-20]],"c":False}),"nm":"check"}
    trim={"ty":"tm","s":static(0),"e":anim([ease(18,[0],(0.3,1),(0.5,0)),{"t":48,"s":[100]}]),"o":static(0),"m":1}
    chk=layer(1,"check",[path,stroke(DARK,10),trim],[100,100],op)
    return comp("AI Recap – check",200,200,op,[chk,disc])

# 5. Processing indicator — 3 small bars (60x40, 1s loop)
def processing():
    op=60; layers=[]
    for i in range(3):
        kfs=sine_scale_kfs(op,op,i*op/5,35,100,op//6)
        layers.append(layer(i+1,f"bar{i+1}",[rect(6,28,3),fill(AMBER)],[18+i*12,20],op,s=anim(kfs)))
    return comp("AI Recap – processing",60,40,op,layers)

# 6. Saved: disc + check + rise is check; also a "listening halo" for recording screen bg (400x400 soft ring breathing)
def halo():
    op=180
    s=anim(sine_scale_kfs(op,op,0,88,100,op//8))
    o=anim([ease(t,[round(55+25*math.sin(2*math.pi*t/op),1)],(0.5,1),(0.5,0)) for t in range(0,op+1,op//8)])
    ring=layer(1,"halo",[ellipse(300),stroke(AMBER,60)],[200,200],op,s=s,o=o)
    ring["shapes"][0]["it"].insert(1,{"ty":"fl","c":static(AMBER),"o":static(12),"r":1})
    return comp("AI Recap – halo",400,400,op,[ring])

files={"logo-mark":logo(),"record-pulse":record_pulse(),"waveform-live":waveform(),"check-draw":check(),"processing-bars":processing(),"halo-breathe":halo()}
import os; os.makedirs("out",exist_ok=True)
for k,v in files.items():
    with open(f"out/{k}.json","w") as f: json.dump(v,f,separators=(",",":"))
    print(k, os.path.getsize(f"out/{k}.json"),"bytes")

# Builds AIS-Social-Studio.html: 15 editable Instagram posts in three styles (Poster, Collage, Explainer).
# Run: python3 make_studio.py   (pulls photos from the site and this month's top news)
import json, math, html

import os
SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
OUT = SITE + 'studio/index.html'
# served from the site itself, so photos load from /assets (same origin, which PNG export needs)
def img(n, w=1200):
    return '/assets/photos/' + n + '.jpg'
PH = {k: img(k) for k in ['naais-capitol', 'naais-gala', 'circle', 'naais-sling', 'founder', 'naais-group', 'naais-theatre', 'lecture', 'conference', 'india-tour', 'naais-campus', 'naais-talk']}
E = lambda s: html.escape(s, quote=False)
news = json.load(open(SITE + 'data/news.json'))
MON = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

CIRCLE = '<svg class="draw" viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M9 23 C 6 10, 30 4, 55 5 C 82 6, 97 13, 95 23 C 93 33, 68 38, 44 37 C 20 36, 4 30, 6 20 C 8 12, 22 7, 42 6"/></svg>'
UNDER = '<svg class="under" viewBox="0 0 100 12" preserveAspectRatio="none"><path d="M2 8 C 25 3, 50 10, 75 5 S 96 6, 98 7"/></svg>'
ARROW = '<svg class="arrow" viewBox="0 0 120 90"><path d="M10 10 C 40 70, 80 80, 110 60 M110 60 L92 52 M110 60 L100 76"/></svg>'
TICK = '<svg class="tick" viewBox="0 0 40 40"><path d="M6 22 L16 32 L35 8"/></svg>'

CSS = r'''
:root{--red:#c0201f;--ink:#1a1312;--paper:#f6f0e8;--on:#fbf7f2;--yel:#ffd24a;--mut:#6b5f5c;--f:"Schibsted Grotesk",Arial,sans-serif;--h:"Caveat Brush",cursive}
*{box-sizing:border-box}
body{margin:0;background:#e3ddd6;font:400 15px/1.5 var(--f);color:var(--ink)}
.topbar{position:sticky;top:0;z-index:10;background:var(--ink);color:var(--on);padding:14px 24px;display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.topbar b{font-size:18px}.topbar span{opacity:.75;font-size:13.5px}
.topbar button{margin-left:auto}
button{font:600 14px/1 var(--f);border:0;background:var(--on);color:var(--ink);padding:11px 16px;cursor:pointer}
.sec{padding:26px 24px 0;font:800 22px/1 var(--f);letter-spacing:-.02em}
.sec small{font:500 14px/1 var(--f);color:var(--mut);margin-left:8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:24px;padding:18px 24px 30px}
.card{background:#fff;padding:14px;display:grid;gap:10px;align-content:start}
.card h2{margin:0;font-size:14.5px}.card h2 small{font-weight:500;color:var(--mut)}
.bar{display:flex;gap:6px;align-items:center}
.bar .dl{margin-left:auto;background:var(--red);color:var(--on);padding:9px 12px;font-size:13px}
.stage{position:relative;overflow:hidden;background:#ddd}
.stage > .art{position:absolute;left:0;top:0;transform-origin:0 0}
.hint{font-size:12.5px;color:var(--mut);margin:0}
/* artboards */
.art{width:1080px;height:1350px;position:relative;overflow:hidden;font-family:var(--f)}
.art.s{height:1920px}
[contenteditable]{outline:none}
[contenteditable]:hover{box-shadow:0 0 0 3px rgba(255,210,74,.7)}
.exporting [contenteditable]:hover{box-shadow:none}
.ab{position:absolute}
.ph{position:absolute;background:center/cover no-repeat;cursor:pointer}
.ph::after{content:"Click to replace photo";position:absolute;right:14px;top:14px;font:600 18px/1 var(--f);background:rgba(0,0,0,.6);color:#fff;padding:8px 10px;opacity:0}
.ph:hover::after{opacity:1}.exporting .ph::after{opacity:0 !important}
.cut{position:absolute;background:center/cover no-repeat;box-shadow:0 18px 30px rgba(0,0,0,.18);border:14px solid #fff;cursor:pointer}
.tape{position:absolute;width:190px;height:54px;background:rgba(255,210,74,.85);z-index:3}
.hand{font-family:var(--h);color:var(--red);line-height:1}
.draw,.under,.arrow,.tick{position:absolute;overflow:visible}
.draw path,.under path,.arrow path,.tick path{fill:none;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.draw path{stroke:var(--ink);stroke-width:5}.under path{stroke:var(--red);stroke-width:8}.arrow path{stroke:var(--red);stroke-width:6}.tick path{stroke:var(--red);stroke-width:7}
.dots{position:absolute;display:flex;gap:12px}.dots i{width:18px;height:18px;border-radius:50%;background:currentColor;opacity:.3}.dots i:first-child{opacity:1;width:48px;border-radius:9px}
.paper{background:var(--paper);color:var(--ink)}
.paper::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(0,0,0,.06) 1px,transparent 1.2px);background-size:9px 9px;pointer-events:none}
.red{background:var(--red);color:var(--on)}.ink{background:var(--ink);color:var(--on)}.white{background:#fff;color:var(--ink)}
.h9{font-weight:900;letter-spacing:-.06em;line-height:.9;margin:0}
.kick{font:800 28px/1 var(--f);letter-spacing:.13em;text-transform:uppercase}
.pill{display:inline-block;padding:13px 17px}
.xbar{position:absolute;left:0;top:0;width:1080px;height:120px;background:var(--red);color:var(--on);display:flex;align-items:center;justify-content:space-between;padding:0 70px;font:800 30px/1 var(--f)}
.wm{font:800 28px/1 var(--f);letter-spacing:-.02em}
.mut{opacity:.75}
'''

posts = []
def post(sec, pid, title, size, inner, hint=''):
    posts.append((sec, pid, title, size, inner, hint))

# ---------------- POSTER ----------------
post('A', 'stat', 'Big number', 'f', f'''<div class="art red">
 <div class="ab kick" style="right:62px;top:70px;writing-mode:vertical-rl;transform:rotate(180deg);letter-spacing:.18em" contenteditable>Association of Indian Students</div>
 <div class="ab h9" style="left:-30px;top:120px;font-size:520px;letter-spacing:-.08em;white-space:nowrap" contenteditable>1.25</div>
 <div class="ab h9" style="right:130px;top:600px;font-size:230px;color:var(--ink)" contenteditable>million</div>
 <div class="ab" style="left:70px;bottom:190px;width:760px;font:800 64px/1.02 var(--f);letter-spacing:-.04em" contenteditable>Indian students study abroad. Every one deserves a voice.</div>
 <div class="ab mut" style="left:70px;bottom:86px;font:600 26px/1 var(--f)" contenteditable>India MEA, 1 January 2025</div>
 <div class="ab" style="right:70px;bottom:78px;width:170px;height:170px;border-radius:50%;background:var(--ink);display:grid;place-items:center;text-align:center;font:800 28px/1.05 var(--f);transform:rotate(-12deg)" contenteditable>Join your chapter</div>
</div>''', 'Swap the number for any verified figure, and keep the source line.')

t0 = news['top'][0] if news.get('top') else {'country': 'Australia', 'title': 'Rent, jobs and visa worries', 'source': 'The Indian Express', 'date': '2026-09-30'}
y, m, d = t0['date'].split('-')
post('A', 'news', 'News headline', 'f', f'''<div class="art ink">
 <div class="ph" style="left:0;top:0;width:1080px;height:860px;background-image:url({PH['naais-capitol']})"></div>
 <div class="ab" style="left:0;top:700px;width:1080px;height:650px;background:var(--red);clip-path:polygon(0 70px,100% 0,100% 100%,0 100%)"></div>
 <div class="ab kick pill" style="left:70px;top:820px;background:var(--ink)" contenteditable>This month · {E(t0['country'])}</div>
 <div class="ab h9" style="left:70px;top:900px;width:940px;font-size:84px;line-height:.95" contenteditable>{E(t0['title'])}</div>
 <div class="ab" style="left:70px;bottom:70px;font:600 26px/1 var(--f)" contenteditable>{E(t0['source'])}, {int(d)} {MON[int(m)]} {y}</div>
 <div class="ab" style="right:70px;bottom:62px;font:800 30px/1 var(--f)" contenteditable>Swipe &rarr;</div>
</div>''', 'Filled with this month’s top story. Shorten the headline if it runs long.')

post('A', 'event', 'Event poster', 'f', f'''<div class="art red">
 <div class="ab h9" style="left:56px;top:60px;font-size:400px;letter-spacing:-.08em" contenteditable>18</div>
 <div class="ab h9" style="left:60px;top:400px;font-size:150px;color:var(--ink)" contenteditable>OCT</div>
 <div class="ph" style="right:0;top:0;width:470px;height:720px;background-image:url({PH['circle']})"></div>
 <div class="ab kick" style="left:70px;top:790px" contenteditable>AIS Chapter Name presents</div>
 <div class="ab h9" style="left:70px;top:850px;width:940px;font-size:118px" contenteditable>Welcome evening for new students</div>
 <div class="ab" style="left:70px;bottom:80px;font:700 34px/1.25 var(--f)" contenteditable>6:00 pm · Venue name, City</div>
 <div class="ab pill" style="right:70px;bottom:70px;background:var(--on);color:var(--red);font:800 30px/1 var(--f)" contenteditable>RSVP: link in bio</div>
</div>''', 'Replace the date, venue and photo. Every text block is editable.')

post('A', 'quote', 'Statement', 'f', '''<div class="art ink">
 <div class="ab h9" style="left:56px;top:40px;font-size:420px;color:var(--red);line-height:1">&ldquo;</div>
 <div class="ab h9" style="left:70px;top:360px;width:960px;font-size:132px" contenteditable>Moving abroad should not mean leaving India behind.</div>
 <div class="ab" style="left:70px;bottom:150px;width:120px;height:8px;background:var(--red)"></div>
 <div class="ab wm" style="left:70px;bottom:80px" contenteditable>Association of Indian Students</div>
</div>''', 'For positions, statements and short quotes.')

post('A', 'joinstory', 'Story: join', 's', f'''<div class="art s red">
 <div class="ph" style="left:0;top:0;width:1080px;height:980px;background-image:url({PH['naais-group']})"></div>
 <div class="ab" style="left:0;top:880px;width:1080px;height:1040px;background:var(--red);clip-path:polygon(0 100px,100% 0,100% 100%,0 100%)"></div>
 <div class="ab kick" style="left:80px;top:1060px" contenteditable>Studying abroad, or about to?</div>
 <div class="ab h9" style="left:76px;top:1120px;font-size:210px" contenteditable>Find your people.</div>
 <div class="ab" style="left:80px;top:1560px;width:900px;font:700 46px/1.2 var(--f)" contenteditable>Chapters in 30 countries. Join free at globalindianstudents.org</div>
 <div class="ab wm" style="left:80px;bottom:110px" contenteditable>Association of Indian Students</div>
</div>''', 'Leave space at the bottom for a link sticker.')

# ---------------- COLLAGE ----------------
post('B', 'germany', 'Chapter stat', 'f', f'''<div class="art paper">
 <div class="ab h9" style="left:70px;top:90px;font-size:150px;line-height:.86" contenteditable>Germany<br>gets it.</div>
 <div class="ab" style="right:70px;top:110px;width:210px;height:210px;border-radius:50%;background:var(--red);color:var(--on);display:grid;place-items:center;text-align:center;font:900 25px/1.05 var(--f);transform:rotate(10deg);padding:30px" contenteditable>Largest international group</div>
 <div class="ab h9" style="left:70px;top:430px;font-size:280px;color:var(--red)" contenteditable>59,000</div>
 <div class="ab" style="left:36px;top:400px;width:690px;height:300px">{CIRCLE.replace('class="draw"', 'class="draw" style="width:100%;height:100%"')}</div>
 <div class="ab" style="left:480px;top:650px;width:120px;height:90px">{ARROW.replace('class="arrow"', 'class="arrow" style="width:100%;height:100%"')}</div>
 <div class="ab hand" style="left:600px;top:690px;font-size:58px;transform:rotate(-6deg);width:420px" contenteditable>Indian students in Germany right now</div>
 <div class="tape" style="left:150px;top:820px;transform:rotate(-8deg)"></div>
 <div class="cut" style="left:90px;top:840px;width:520px;height:380px;transform:rotate(-4deg);background-image:url({PH['naais-gala']})"></div>
 <div class="ab" style="right:70px;bottom:70px;font:700 28px/1.2 var(--f);text-align:right" contenteditable>DAAD, winter semester 2024/25<br>Association of Indian Students</div>
</div>''', 'Use one per chapter: change the country, number and source.')

post('B', 'realtalk', 'Real talk tip', 'f', f'''<div class="art paper">
 <div class="ab kick pill" style="left:70px;top:80px;background:var(--ink);color:var(--on)" contenteditable>Real talk</div>
 <div class="ab h9" style="left:70px;top:170px;width:940px;font-size:104px;line-height:.92" contenteditable>Your degree might be <span style="background:linear-gradient(transparent 55%,rgba(255,210,74,.9) 55%,rgba(255,210,74,.9) 92%,transparent 92%)">free</span>. Your rent is <span style="background:linear-gradient(transparent 55%,rgba(255,210,74,.9) 55%,rgba(255,210,74,.9) 92%,transparent 92%)">not</span>.</div>
 <div class="tape" style="left:420px;top:640px;transform:rotate(6deg)"></div>
 <div class="cut" style="left:330px;top:660px;width:660px;height:440px;transform:rotate(3deg);background-image:url({PH['circle']})"></div>
 <div class="ab hand" style="left:70px;top:760px;font-size:62px;transform:rotate(-7deg);width:260px" contenteditable>budget before you book!</div>
 <div class="ab" style="left:70px;bottom:70px;font:700 28px/1.2 var(--f)" contenteditable>Ask your chapter · globalindianstudents.org</div>
</div>''', 'A format for practical tips. Swap the line and the note.')

post('B', 'welcome', 'Chapter welcome', 'f', f'''<div class="art paper">
 <div class="ab hand" style="left:70px;top:70px;font-size:88px;transform:rotate(-4deg)" contenteditable>new in town?</div>
 <div class="ab h9" style="left:70px;top:170px;font-size:190px" contenteditable>Hello,<br>Dublin.</div>
 <div class="tape" style="left:110px;top:560px;transform:rotate(-10deg)"></div>
 <div class="cut" style="left:60px;top:580px;width:470px;height:360px;transform:rotate(-5deg);background-image:url({PH['naais-talk']})"></div>
 <div class="tape" style="left:690px;top:640px;transform:rotate(8deg)"></div>
 <div class="cut" style="left:560px;top:660px;width:460px;height:340px;transform:rotate(4deg);background-image:url({PH['naais-theatre']})"></div>
 <div class="ab" style="left:420px;top:1000px;width:120px;height:90px;transform:scaleX(-1)">{ARROW.replace('class="arrow"', 'class="arrow" style="width:100%;height:100%"')}</div>
 <div class="ab hand" style="left:560px;top:1040px;font-size:60px;transform:rotate(-3deg);width:440px" contenteditable>your people are here</div>
 <div class="ab" style="left:70px;bottom:80px;font:800 34px/1.2 var(--f)" contenteditable>AIS Ireland · Join us at globalindianstudents.org</div>
</div>''', 'Change the city and chapter name for any chapter’s welcome week.')

post('B', 'festival', 'Festival', 'f', f'''<div class="art red">
 <div class="cut" style="left:140px;top:110px;width:800px;height:560px;transform:rotate(-3deg);background-image:url({PH['lecture']})"></div>
 <div class="tape" style="left:460px;top:90px;transform:rotate(4deg)"></div>
 <div class="ab hand" style="left:70px;top:720px;font-size:76px;color:var(--yel);transform:rotate(-4deg)" contenteditable>Happy Diwali from</div>
 <div class="ab h9" style="left:70px;top:820px;width:960px;font-size:150px" contenteditable>7,000 km from home.</div>
 <div class="ab" style="left:70px;top:1130px;width:900px;font:700 40px/1.25 var(--f)" contenteditable>Wherever you are this year, your chapter is celebrating. Find yours.</div>
 <div class="ab wm" style="left:70px;bottom:70px" contenteditable>Association of Indian Students</div>
</div>''', 'Use for Diwali, Holi, Eid, Pongal, Onam or Independence Day. Edit the distance for each city.')

post('B', 'checklist', 'Story: before you move', 's', f'''<div class="art s paper">
 <div class="ab hand" style="left:80px;top:150px;font-size:80px;transform:rotate(-3deg)" contenteditable>save this!</div>
 <div class="ab h9" style="left:80px;top:250px;width:920px;font-size:140px" contenteditable>Before you move abroad</div>
 <div class="ab" style="left:80px;top:690px;width:920px;display:grid;gap:52px;font:700 50px/1.15 var(--f)">
  <div style="display:grid;grid-template-columns:80px 1fr;gap:20px;align-items:start"><span style="position:relative;width:64px;height:64px;border:5px solid var(--ink)">{TICK.replace('class="tick"', 'class="tick" style="left:-6px;top:-14px;width:80px;height:80px"')}</span><span contenteditable>Check the visa rule on the official government site</span></div>
  <div style="display:grid;grid-template-columns:80px 1fr;gap:20px;align-items:start"><span style="position:relative;width:64px;height:64px;border:5px solid var(--ink)">{TICK.replace('class="tick"', 'class="tick" style="left:-6px;top:-14px;width:80px;height:80px"')}</span><span contenteditable>Keep digital copies of every document</span></div>
  <div style="display:grid;grid-template-columns:80px 1fr;gap:20px;align-items:start"><span style="position:relative;width:64px;height:64px;border:5px solid var(--ink)">{TICK.replace('class="tick"', 'class="tick" style="left:-6px;top:-14px;width:80px;height:80px"')}</span><span contenteditable>Know how many hours you are allowed to work</span></div>
  <div style="display:grid;grid-template-columns:80px 1fr;gap:20px;align-items:start"><span style="position:relative;width:64px;height:64px;border:5px solid var(--ink)"></span><span contenteditable>Save the Indian embassy or consulate number</span></div>
  <div style="display:grid;grid-template-columns:80px 1fr;gap:20px;align-items:start"><span style="position:relative;width:64px;height:64px;border:5px solid var(--ink)"></span><span contenteditable>Find your AIS chapter before you land</span></div>
 </div>
 <div class="tape" style="left:700px;top:1560px;transform:rotate(-6deg)"></div>
 <div class="cut" style="left:560px;top:1580px;width:440px;height:260px;transform:rotate(3deg);background-image:url({PH['india-tour']})"></div>
 <div class="ab wm" style="left:80px;bottom:110px" contenteditable>globalindianstudents.org</div>
</div>''', 'Tick boxes are drawn on the first three. Edit any line.')

# ---------------- EXPLAINER ----------------
rows = [('NZ', 36), ("Australia*", 36), ('US STEM', 36), ("Ireland*", 24), ('Finland', 24), ('Germany', 18), ('Netherlands', 12), ('Poland', 9), ('Switzerland', 6)]
viz = ''
for i, (n, mo) in enumerate(rows):
    r = 14 + math.sqrt(mo / 36) * 64
    cx = 95 + (i % 5) * 188; cy = 140 + (i // 5) * 300
    viz += (f'<circle cx="{cx}" cy="{cy}" r="{r:.0f}" fill="#c0201f"/><text x="{cx}" y="{cy + 10}" text-anchor="middle" font-family="Schibsted Grotesk" font-weight="900" font-size="{max(24, r * 0.6):.0f}" fill="#fbf7f2">{mo}</text>'
            f'<text x="{cx}" y="{cy + r + 44}" text-anchor="middle" font-family="Schibsted Grotesk" font-weight="700" font-size="28" fill="#1a1312">{n}</text>')
viz += '<text x="940" y="630" text-anchor="end" font-family="Schibsted Grotesk" font-weight="600" font-size="26" fill="#6b5f5c">Months. *Master’s graduates</text>'
post('C', 'work', 'Explainer chart', 'f', f'''<div class="art white">
 <div class="xbar"><span contenteditable>AIS Explains</span><span contenteditable>1 / 6</span></div>
 <div class="ab h9" style="left:70px;top:180px;width:940px;font-size:92px;line-height:.94" contenteditable>How long can you stay to find work after graduating?</div>
 <svg class="ab" style="left:70px;top:520px;width:940px;height:640px" viewBox="0 0 940 640">{viz}</svg>
 <div class="ab" style="left:70px;bottom:70px;right:70px;font:600 24px/1.3 var(--f);color:var(--mut)" contenteditable>Maximum stay for the qualification shown. Official sources at globalindianstudents.org</div>
</div>''', 'Cover slide of a carousel. Follow it with one country per slide.')

post('C', 'myth', 'Myth vs fact', 'f', '''<div class="art ink">
 <div class="xbar"><span contenteditable>AIS Explains</span><span contenteditable>Myth vs fact</span></div>
 <div class="ab kick" style="left:70px;top:200px;color:var(--yel)" contenteditable>Myth</div>
 <div class="ab h9" style="left:70px;top:260px;width:940px;font-size:120px" contenteditable>&ldquo;Studying in Norway is free.&rdquo;</div>
 <div class="ab" style="left:70px;top:740px;width:940px;font:600 46px/1.25 var(--f)" contenteditable><b style="color:var(--yel)">Fact:</b> Norway has charged tuition to students from outside the EU and EEA since 2023. Check the real cost before you apply.</div>
 <div class="dots" style="left:70px;bottom:80px;color:var(--yel)"><i></i><i></i><i></i><i></i></div>
 <div class="ab" style="right:70px;bottom:70px;font:800 30px/1 var(--f)" contenteditable>Swipe &rarr;</div>
</div>''', 'Run a series: one myth per slide, sourced fact underneath.')

ranks = [('United States', 363019, '363,019'), ('Australia', 139720, '139,720'), ('Germany', 59000, '59,000'), ('Ireland', 9175, '9,175'), ('France', 9100, '9,100')]
rk = ''.join(f'<div style="display:grid;grid-template-columns:70px 1fr;gap:18px;align-items:end;padding:26px 0;border-top:3px solid var(--ink)"><b style="font:900 64px/1 var(--f);color:var(--red)">{i+1}</b><div><div style="display:flex;justify-content:space-between;align-items:baseline;font:800 46px/1 var(--f);letter-spacing:-.03em"><span contenteditable>{n}</span><span contenteditable>{v}</span></div><div style="height:16px;margin-top:16px;background:#eee6de"><div style="height:100%;width:{max(2, val / 363019 * 100):.1f}%;background:var(--red)"></div></div></div></div>' for i, (n, val, v) in enumerate(ranks))
post('C', 'ranks', 'Rankings', 'f', f'''<div class="art white">
 <div class="xbar"><span contenteditable>AIS Explains</span><span contenteditable>By the numbers</span></div>
 <div class="ab h9" style="left:70px;top:180px;width:940px;font-size:100px" contenteditable>Where Indian students are going</div>
 <div class="ab" style="left:70px;top:470px;width:940px">{rk}</div>
 <div class="ab" style="left:70px;bottom:70px;right:70px;font:600 23px/1.35 var(--f);color:var(--mut)" contenteditable>Latest official figures, different years: IIE Open Doors 2024/25, Australian Dept of Education Jan to Sep 2025, DAAD WS 2024/25, HEA 2024/25, Campus France 2024/25</div>
</div>''', 'Bars are drawn to scale. Update numbers from the chapter pages.')

post('C', 'medical', 'Rules explainer', 'f', '''<div class="art red">
 <div class="xbar" style="background:var(--ink)"><span contenteditable>AIS Explains</span><span contenteditable>Studying medicine abroad?</span></div>
 <div class="ab h9" style="left:70px;top:180px;width:940px;font-size:104px" contenteditable>3 rules your degree must meet to practise in India</div>
 <div class="ab" style="left:70px;top:610px;width:940px;display:grid;gap:30px">
  <div style="display:grid;grid-template-columns:150px 1fr;gap:24px;align-items:center;padding-top:26px;border-top:3px solid var(--on)"><b style="font:900 110px/.8 var(--f);letter-spacing:-.06em" contenteditable>54</b><span style="font:700 40px/1.2 var(--f)" contenteditable>months minimum for the course</span></div>
  <div style="display:grid;grid-template-columns:150px 1fr;gap:24px;align-items:center;padding-top:26px;border-top:3px solid var(--on)"><b style="font:900 110px/.8 var(--f);letter-spacing:-.06em" contenteditable>12</b><span style="font:700 40px/1.2 var(--f)" contenteditable>months of internship at the same institution</span></div>
  <div style="display:grid;grid-template-columns:150px 1fr;gap:24px;align-items:center;padding-top:26px;border-top:3px solid var(--on)"><b style="font:900 110px/.8 var(--f);letter-spacing:-.06em" contenteditable>1</b><span style="font:700 40px/1.2 var(--f)" contenteditable>licensing test to pass in India</span></div>
 </div>
 <div class="ab" style="left:70px;bottom:70px;right:70px;font:600 24px/1.3 var(--f);opacity:.85" contenteditable>National Medical Commission, Foreign Medical Graduate Licentiate Regulations 2021</div>
</div>''', 'Numbers-led rules. Reuse the format for visas or work hours.')

items = ''
for it in news.get('top', [])[:3]:
    yy, mm, dd = it['date'].split('-')
    items += f'''<div style="padding:34px 0;border-top:3px solid rgba(251,247,242,.3)"><div style="display:flex;gap:14px;margin-bottom:18px"><span class="pill" style="background:var(--red);font:800 26px/1 var(--f);padding:10px 14px" contenteditable>{E(it['country'])}</span><span style="font:700 26px/1.6 var(--f);opacity:.7" contenteditable>{int(dd)} {MON[int(mm)]}</span></div><div style="font:800 54px/1.08 var(--f);letter-spacing:-.03em" contenteditable>{E(it['title'])}</div><div style="font:600 26px/1 var(--f);opacity:.7;margin-top:16px" contenteditable>{E(it['source'])}</div></div>'''
post('C', 'brief', 'Story: monthly brief', 's', f'''<div class="art s ink">
 <div class="xbar" style="height:160px;padding-top:40px"><span contenteditable>The monthly brief</span><span contenteditable>{E(MON[int(news['updated'][5:7]) - 1 or 12])} 2026</span></div>
 <div class="ab h9" style="left:80px;top:250px;width:920px;font-size:130px" contenteditable>What happened this month</div>
 <div class="ab" style="left:80px;top:700px;width:920px">{items}</div>
 <div class="ab wm" style="left:80px;bottom:110px" contenteditable>Read more: globalindianstudents.org</div>
</div>''', 'Filled with this month’s top three stories.')

# ---------------- page ----------------
SEC = {'A': ('Poster', 'Loud, campaign-style'), 'B': ('Collage', 'Student, human, hand-made'), 'C': ('Explainer', 'Useful, saveable carousels')}
body = ''
for code in 'ABC':
    body += f'<div class="sec">{SEC[code][0]}<small>{SEC[code][1]}</small></div><main class="grid">'
    for sec, pid, title, size, inner, hint in [p for p in posts if p[0] == code]:
        dims = '1080 × 1920 story' if size == 's' else '1080 × 1350 feed post'
        body += f'<section class="card" data-id="{pid}"><h2>{title} <small>{dims}</small></h2><div class="bar"><button type="button" class="dl">Download PNG</button></div><div class="stage">{inner}</div><p class="hint">{E(hint)}</p></section>'
    body += '</main>'

JS = r'''
(function(){
  var KEY='ais-studio-v2', saved={}; try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(saved))}catch(e){}}
  document.querySelectorAll('.card').forEach(function(card){
    var id=card.dataset.id, art=card.querySelector('.art'), stage=card.querySelector('.stage'), H=art.offsetHeight;
    function fit(){var k=stage.clientWidth/1080; art.style.transform='scale('+k+')'; stage.style.height=(H*k)+'px'}
    fit(); window.addEventListener('resize',fit);
    var edits=art.querySelectorAll('[contenteditable]'), photos=art.querySelectorAll('.ph,.cut'), st=saved[id]||{};
    if(st.text) edits.forEach(function(e,i){ if(st.text[i]!=null) e.innerHTML=st.text[i]; });
    if(st.photos) photos.forEach(function(p,i){ if(st.photos[i]) p.style.backgroundImage='url('+st.photos[i]+')'; });
    function store(){ saved[id]=saved[id]||{}; saved[id].text=Array.prototype.map.call(edits,function(e){return e.innerHTML}); save(); }
    edits.forEach(function(e){ e.addEventListener('input',store) });
    photos.forEach(function(p,i){ p.addEventListener('click',function(){
      var pick=document.getElementById('pick'); pick.value='';
      pick.onchange=function(){ var f=pick.files[0]; if(!f) return; var r=new FileReader();
        r.onload=function(){ p.style.backgroundImage='url('+r.result+')'; saved[id]=saved[id]||{}; saved[id].photos=saved[id].photos||[]; saved[id].photos[i]=r.result; save(); };
        r.readAsDataURL(f); };
      pick.click(); }) });
    var dl=card.querySelector('.dl');
    dl.onclick=function(){ dl.textContent='Rendering…'; art.classList.add('exporting'); var prev=art.style.transform; art.style.transform='none';
      htmlToImage.toPng(art,{width:1080,height:H,pixelRatio:1,cacheBust:true}).then(function(u){ var a=document.createElement('a'); a.href=u; a.download='ais-'+id+'.png'; a.click(); })
      .catch(function(err){ alert('Could not render: '+err) }).finally(function(){ art.style.transform=prev; art.classList.remove('exporting'); dl.textContent='Download PNG' }); };
  });
  document.getElementById('reset').onclick=function(){ if(confirm('Reset every post to its original text and photos?')){ try{localStorage.removeItem(KEY)}catch(e){} location.reload(); } };
})();
'''
page = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AIS Social Studio</title><meta name="robots" content="noindex,nofollow"><link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml">'
        '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        '<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400..900;1,400..900&family=Caveat+Brush&display=swap" rel="stylesheet">'
        '<style>' + CSS + '</style><script src="https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js"></script></head><body>'
        '<header class="topbar"><b>AIS Social Studio</b><a href="/sources/" style="color:#fbf7f2;font-size:13.5px">Back to the site</a><span>15 posts in three styles. Click any text to edit it, click a photo to replace it, then Download PNG. Edits are saved in this browser.</span><button type="button" id="reset">Reset all edits</button></header>'
        + body + '<input type="file" id="pick" accept="image/*" hidden><script>' + JS + '</script></body></html>')
assert '—' not in page
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w').write(page)
print('posts', len(posts), 'size', len(page) // 1024, 'KB')

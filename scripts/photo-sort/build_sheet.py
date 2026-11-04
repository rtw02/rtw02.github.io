#!/usr/bin/env python3.11
"""
Stage 2b — build the local review sheet.

Reads scratch/ranking.json + scratch/previews/, writes scratch/review.html:
a best-first grid where you approve photos and assign each to a gallery.
Clicking "Generate manifest" produces scratch/manifest.json content (copy/
download) for Stage 3 ingest.

LOCAL ONLY — never publish this (private photos; tattoo rule). Open with:
  open scratch/review.html

  /usr/local/opt/python@3.11/bin/python3.11 scripts/photo-sort/build_sheet.py
"""
import json, html, os

RANKING = "scratch/ranking.json"
OUT = "scratch/review.html"
# existing gallery slugs (keep in sync with src/data/galleries.ts)
SLUGS = ["mission-2026", "emma-jazz-2026", "euro-summa-2026"]


def reason_tags(sub):
    order = sorted(sub.items(), key=lambda kv: -kv[1])
    tags = []
    for k, v in order[:2]:
        if v > 0.2:
            tags.append((k, v, "good"))
    for k, v in order[-1:]:
        if v < -0.1:
            tags.append((k, v, "bad"))
    return tags


def main():
    rows = json.load(open(RANKING))
    opts = "".join(f'<option value="{s}">{s}</option>' for s in SLUGS)

    from collections import defaultdict
    groups = defaultdict(list)  # primary album -> [card html]
    counts = defaultdict(int)
    for i, r in enumerate(rows):
        uuid = r["uuid"]
        prev = f"previews/{uuid}.jpg"
        if not os.path.exists(os.path.join("scratch", "previews", uuid + ".jpg")):
            continue
        album = (r["albums"][0] if r["albums"] else "(no album)")
        fn = html.escape(r["filename"])
        make = html.escape(r["make"] or "—")
        date = r["date"][:10]
        score = r["score"]
        tags = "".join(
            f'<span class="tag {c}">{html.escape(k)} {v:+.2f}</span>'
            for k, v, c in reason_tags(r["sub"])
        )
        groups[album].append(f"""
<div class="card" data-uuid="{uuid}" data-score="{score}" data-make="{html.escape((r['make'] or '').lower())}">
  <div class="thumb"><img loading="lazy" src="{prev}" alt="{fn}"></div>
  <div class="meta">
    <div class="row"><span class="rank">#{i+1}</span><span class="score">{score:+.3f}</span><span class="make">{make}</span></div>
    <div class="fn">{fn} · {date}</div>
    <div class="tags">{tags}</div>
    <label class="approve"><input type="checkbox" class="chk"> Approve</label>
    <select class="gal"><option value="">— gallery —</option>{opts}<option value="__new__">+ new gallery…</option></select>
    <input class="newslug" placeholder="new-gallery-slug" style="display:none">
  </div>
</div>""")
        counts[album] += 1

    # named albums by size desc, "(no album)" always last
    order = sorted([a for a in groups if a != "(no album)"], key=lambda a: -counts[a])
    if "(no album)" in groups:
        order.append("(no album)")
    sections = []
    total_cards = 0
    for album in order:
        total_cards += counts[album]
        sections.append(
            f'<section class="album"><div class="albumhdr">'
            f'<span class="aname">{html.escape(album.strip())}</span>'
            f'<span class="acount">{counts[album]} photos</span>'
            f'<span class="actrl">'
            f'<select class="albumgal"><option value="">— assign gallery —</option>{opts}<option value="__new__">+ new…</option></select>'
            f'<input class="albumnewslug" placeholder="new-gallery-slug" style="display:none">'
            f'<button class="small approvealbum" type="button">approve whole album</button>'
            f'<button class="ghost small clearalbum" type="button">clear</button>'
            f'<button class="ghost small removealbum" type="button">remove album</button>'
            f'</span></div>'
            f'<div class="grid">{"".join(groups[album])}</div></section>'
        )
    cards = sections  # reuse downstream join
    len_cards = total_cards

    page = f"""<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Photo review — DSLR after 2024-06</title>
<style>
  :root {{ --bg:#0d0d10; --fg:#ece7df; --muted:#8a847c; --line:#26262c; --accent:#D6603A; --good:#3a8d5a; --bad:#9d3a3a; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--bg); color:var(--fg); font:14px/1.4 -apple-system,Helvetica,Arial,sans-serif; }}
  header {{ position:sticky; top:0; z-index:5; background:rgba(13,13,16,.95); backdrop-filter:blur(8px); border-bottom:1px solid var(--line); padding:12px 16px; }}
  h1 {{ font-size:15px; margin:0 0 6px; }}
  .warn {{ color:var(--accent); font-weight:600; font-size:13px; margin:0 0 8px; }}
  .controls {{ display:flex; gap:12px; flex-wrap:wrap; align-items:center; font-size:12px; color:var(--muted); }}
  .controls select, .controls input {{ background:#17171c; color:var(--fg); border:1px solid var(--line); border-radius:6px; padding:4px 6px; }}
  .count {{ color:var(--fg); font-weight:600; }}
  .newgalbox {{ display:inline-flex; gap:6px; align-items:center; }}
  #newgal {{ width:150px; }}
  section.album {{ border-top:1px solid var(--line); }}
  section.album.removed {{ opacity:.4; }}
  section.album.removed .albumhdr {{ text-decoration:line-through; }}
  section.album.removed .albumhdr .removealbum {{ text-decoration:none; }}
  .albumhdr {{ position:sticky; top:96px; z-index:3; margin:0; padding:10px 16px; background:rgba(13,13,16,.95); backdrop-filter:blur(8px);
               font-size:14px; display:flex; align-items:center; gap:10px; }}
  .acount {{ color:var(--muted); font-weight:400; font-size:12px; }}
  .actrl {{ margin-left:auto; display:flex; gap:6px; align-items:center; flex-wrap:wrap; }}
  .albumhdr select, .albumhdr input {{ background:#17171c; color:var(--fg); border:1px solid var(--line); border-radius:6px; padding:3px 6px; font-size:11px; }}
  button.small {{ padding:3px 9px; font-size:11px; font-weight:600; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:14px; padding:14px 16px; }}
  .card {{ border:1px solid var(--line); border-radius:10px; overflow:hidden; background:#121216; }}
  .card.approved {{ outline:2px solid var(--good); }}
  .thumb {{ aspect-ratio:3/4; background:#000; display:flex; align-items:center; justify-content:center; overflow:hidden; }}
  .thumb img {{ width:100%; height:100%; object-fit:cover; display:block; }}
  .meta {{ padding:8px 10px; display:flex; flex-direction:column; gap:6px; }}
  .row {{ display:flex; gap:8px; align-items:center; }}
  .rank {{ color:var(--muted); font-size:11px; }}
  .score {{ font-weight:700; color:var(--accent); }}
  .make {{ margin-left:auto; font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; }}
  .fn {{ font-size:11px; color:var(--muted); word-break:break-all; }}
  .tags {{ display:flex; gap:4px; flex-wrap:wrap; }}
  .tag {{ font-size:10px; padding:2px 5px; border-radius:100px; border:1px solid var(--line); }}
  .tag.good {{ color:#9fe0b8; border-color:#2c5c40; }}
  .tag.bad {{ color:#e0a0a0; border-color:#5c2c2c; }}
  .approve {{ display:flex; gap:6px; align-items:center; cursor:pointer; }}
  select.gal, .newslug {{ width:100%; }}
  footer {{ position:sticky; bottom:0; background:rgba(13,13,16,.97); border-top:1px solid var(--line); padding:10px 16px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }}
  button {{ background:var(--accent); color:#120a07; border:none; border-radius:8px; padding:8px 14px; font-weight:700; cursor:pointer; }}
  button.ghost {{ background:transparent; color:var(--fg); border:1px solid var(--line); }}
  textarea {{ width:100%; height:120px; background:#0a0a0d; color:#9fe0b8; border:1px solid var(--line); border-radius:8px; padding:8px; font:12px/1.4 monospace; display:none; margin:10px 16px; }}
</style></head><body>
<header>
  <h1>Sony review · {len_cards} photos · grouped by album, best-first by Apple aesthetic score</h1>
  <p class="warn">⚠ Tattoo rule: eyeball every photo for visible tattoos before approving. Nothing publishes without your OK.</p>
  <div class="controls">
    <label>min score <input type="range" id="minscore" min="-0.5" max="0.7" step="0.05" value="-0.5"><span id="minval">-0.50</span></label>
    <label>camera <select id="camfilter"><option value="">all</option><option>sony</option><option>canon</option><option>fujifilm</option></select></label>
    <label><input type="checkbox" id="appronly"> approved only</label>
    <label><input type="checkbox" id="showremoved"> show removed albums</label>
    <span class="newgalbox"><input id="newgal" placeholder="create-gallery-slug"><button id="addgal" class="small" type="button">+ gallery</button></span>
    <span class="count"><span id="napr">0</span> approved</span>
  </div>
</header>
<div id="grid">{''.join(cards)}</div>
<textarea id="manifest" readonly></textarea>
<footer>
  <button id="gen">Generate manifest</button>
  <button class="ghost" id="dl">Download manifest.json</button>
  <span class="count"><span id="napr2">0</span> approved · assign each a gallery before generating</span>
</footer>
<script>
const grid=document.getElementById('grid');
function cards(){{return [...grid.querySelectorAll('.card')];}}
function refresh(){{
  const n=cards().filter(c=>c.querySelector('.chk').checked).length;
  document.getElementById('napr').textContent=n;
  document.getElementById('napr2').textContent=n;
}}
// custom galleries created during review — registered into every dropdown
const customGals=new Set();
function slugify(s){{return (s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}}
function addCustomGallery(raw){{
  const g=slugify(raw); if(!g) return '';
  if(!customGals.has(g)){{
    customGals.add(g);
    document.querySelectorAll('select.gal, select.albumgal').forEach(sel=>{{
      const nw=[...sel.options].find(o=>o.value==='__new__');
      const opt=document.createElement('option'); opt.value=g; opt.textContent=g+' (new)';
      sel.insertBefore(opt,nw);
    }});
  }}
  return g;
}}
document.getElementById('addgal').onclick=()=>{{
  const inp=document.getElementById('newgal'); const g=addCustomGallery(inp.value);
  if(g) inp.value='';
}};
// commit an inline "+ new…" slug so it shows up in all dropdowns
grid.addEventListener('change',e=>{{
  if(!e.target.classList.contains('newslug') && !e.target.classList.contains('albumnewslug')) return;
  const g=addCustomGallery(e.target.value);
  const sel=e.target.previousElementSibling;
  if(g && sel && sel.tagName==='SELECT'){{ sel.value=g; e.target.style.display='none'; }}
}});
grid.addEventListener('change',e=>{{
  const card=e.target.closest('.card');
  if(e.target.classList.contains('chk')) card.classList.toggle('approved',e.target.checked);
  if(e.target.classList.contains('gal')) card.querySelector('.newslug').style.display = e.target.value==='__new__'?'block':'none';
  refresh();
}});
// album-level: +new toggle
grid.addEventListener('change',e=>{{
  if(!e.target.classList.contains('albumgal')) return;
  const sec=e.target.closest('section.album');
  sec.querySelector('.albumnewslug').style.display = e.target.value==='__new__'?'inline-block':'none';
}});
function setCardGallery(c,g){{
  const gal=c.querySelector('.gal');
  if([...gal.options].some(o=>o.value===g)){{ gal.value=g; c.querySelector('.newslug').style.display='none'; }}
  else {{ gal.value='__new__'; const ns=c.querySelector('.newslug'); ns.value=g; ns.style.display='block'; }}
}}
// filters
const ms=document.getElementById('minscore'),mv=document.getElementById('minval');
const cf=document.getElementById('camfilter'),ao=document.getElementById('appronly');
function applyFilters(){{
  mv.textContent=parseFloat(ms.value).toFixed(2);
  cards().forEach(c=>{{
    const ok = parseFloat(c.dataset.score)>=parseFloat(ms.value)
      && (!cf.value || c.dataset.make.includes(cf.value))
      && (!ao.checked || c.querySelector('.chk').checked);
    c.style.display=ok?'':'none';
  }});
  // album section visibility: removed sections hide unless "show removed"
  const sr=document.getElementById('showremoved').checked;
  grid.querySelectorAll('section.album').forEach(s=>{{
    const removed=s.dataset.removed==='1';
    const any=[...s.querySelectorAll('.card')].some(c=>c.style.display!=='none');
    s.classList.toggle('removed',removed);
    s.style.display=((removed&&!sr)||!any)?'none':'';
  }});
}}
[ms,cf,ao,document.getElementById('showremoved')].forEach(el=>el.addEventListener('input',applyFilters));
// album-level approve / clear
grid.addEventListener('click',e=>{{
  const sec=e.target.closest('section.album');
  if(!sec) return;
  if(e.target.classList.contains('approvealbum')){{
    const sel=sec.querySelector('.albumgal').value;
    const g = sel==='__new__' ? sec.querySelector('.albumnewslug').value.trim() : sel;
    if(!g){{ alert('Pick a gallery for this album first.'); return; }}
    sec.querySelectorAll('.card').forEach(c=>{{
      c.querySelector('.chk').checked=true; c.classList.add('approved'); setCardGallery(c,g);
    }});
    refresh();
  }}
  if(e.target.classList.contains('clearalbum')){{
    sec.querySelectorAll('.card').forEach(c=>{{
      c.querySelector('.chk').checked=false; c.classList.remove('approved');
    }});
    refresh();
  }}
  if(e.target.classList.contains('removealbum')){{
    const nowRemoved = sec.dataset.removed!=='1';
    sec.dataset.removed = nowRemoved?'1':'0';
    e.target.textContent = nowRemoved?'restore album':'remove album';
    if(nowRemoved){{
      sec.querySelectorAll('.card').forEach(c=>{{
        c.querySelector('.chk').checked=false; c.classList.remove('approved');
      }});
    }}
    refresh(); applyFilters();
  }}
}});
// manifest
function build(){{
  const out=[]; const err=[];
  cards().forEach(c=>{{
    if(!c.querySelector('.chk').checked) return;
    const sel=c.querySelector('.gal').value;
    let g = sel==='__new__' ? slugify(c.querySelector('.newslug').value) : sel;
    if(!g){{ err.push(c.dataset.uuid); return; }}
    out.push({{uuid:c.dataset.uuid, filename:c.querySelector('img').alt, gallery:g}});
  }});
  if(err.length) alert(err.length+' approved photo(s) have no gallery assigned.');
  return out;
}}
document.getElementById('gen').onclick=()=>{{
  const t=document.getElementById('manifest');
  t.value=JSON.stringify({{approved:build()}},null,2); t.style.display='block'; t.select();
}};
document.getElementById('dl').onclick=()=>{{
  const blob=new Blob([JSON.stringify({{approved:build()}},null,2)],{{type:'application/json'}});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='manifest.json'; a.click();
}};
</script></body></html>"""

    with open(OUT, "w") as f:
        f.write(page)
    print(f"wrote {OUT} ({len_cards} cards in {len(cards)} album sections)")
    print("open with:  open scratch/review.html")


if __name__ == "__main__":
    main()

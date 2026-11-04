#!/usr/bin/env python3.11
"""
Stage 3 — ingest approved photos into the site galleries.

Reads a manifest (from the review sheet) -> downloads full-res originals from
iCloud via PhotoKit -> copies them into private-photos/galleries/<slug>/ ->
appends Gallery entries to src/data/galleries.ts.

Requires: terminal app granted Photos access
  (System Settings > Privacy & Security > Photos).

  /usr/local/opt/python@3.11/bin/python3.11 scripts/photo-sort/ingest_approved.py \
      --manifest /Users/ryanwong/Desktop/manifest.json

Afterwards: upload with
  BLOB_READ_WRITE_TOKEN=... npx tsx scripts/upload-to-blob.ts
"""
import argparse, json, os, re, shutil, subprocess, sys, datetime
from collections import defaultdict, OrderedDict

try:
    import osxphotos
except ImportError:
    sys.exit("osxphotos not importable — use the 3.11 interpreter.")

ROOT = os.getcwd()
GALLERIES_DIR = os.path.join(ROOT, "private-photos", "galleries")
CATALOG_JSON = os.path.join(ROOT, "private-photos", "catalog.json")
ORIG_DIR = os.path.join(ROOT, "scratch", "originals")
OSXPHOTOS = os.path.expanduser("~/Library/Python/3.11/bin/osxphotos")

# slug corrections (typos caught during review)
SLUG_FIX = {"switerland-2026": "switzerland-2026"}

# nice display titles / subtitles where the slug alone isn't enough
TITLE_SLUG = {
    "nyc-2025": "NYC", "la-2026": "LA", "costa-rica-2025": "Costa Rica",
    "mission-sep-2025": "Mission", "mission-april-2026": "Mission",
}
TITLE_OVERRIDE = {"nyc": "NYC", "la": "LA"}
SUBTITLE = {
    "nyc-2025": "New York City", "japan-2026": "Japan", "fishkill-2026": "Fishkill Farms",
    "thailand-2026": "Thailand", "costa-rica-2025": "Costa Rica",
    "mission-sep-2025": "New York City", "mission-april-2026": "New York City",
    "switzerland-2026": "Switzerland", "korea-2024": "Korea",
    "paris-2025": "Paris", "la-2026": "Los Angeles",
}
MONTHS = ["", "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]


def fix_slug(s):
    return SLUG_FIX.get(s, s)


def title_from_slug(slug):
    if slug in TITLE_SLUG:
        return TITLE_SLUG[slug]
    base = re.sub(r"-?20\d\d$", "", slug)  # drop trailing year
    parts = base.split("-")
    return " ".join(TITLE_OVERRIDE.get(p, p.capitalize()) for p in parts if p)


def sips_wh(path):
    o = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", path],
                       capture_output=True, text=True).stdout
    w = h = 0
    for line in o.splitlines():
        if "pixelWidth" in line:
            w = int(line.split(":")[1])
        if "pixelHeight" in line:
            h = int(line.split(":")[1])
    return w, h


def download_originals(uuids):
    os.makedirs(ORIG_DIR, exist_ok=True)
    uf = os.path.join(ROOT, "scratch", "ingest_uuids.txt")
    with open(uf, "w") as f:
        f.write("\n".join(uuids))
    print(f"downloading {len(uuids)} originals via PhotoKit…")
    r = subprocess.run(
        [OSXPHOTOS, "export", ORIG_DIR, "--uuid-from-file", uf,
         "--download-missing", "--use-photokit", "--convert-to-jpeg",
         "--jpeg-quality", "0.9", "--filename", "{uuid}", "--overwrite"],
        capture_output=True, text=True,
    )
    tail = (r.stdout + r.stderr).strip().splitlines()[-4:]
    print("  " + "\n  ".join(tail))
    if "could not get authorization" in (r.stdout + r.stderr):
        sys.exit("\nPhotos access not granted — enable it for your terminal app in "
                 "System Settings > Privacy & Security > Photos, then re-run.")


def gen_gallery(slug, title, subtitle, date, photos):
    yr = date.split()[-1] if date else ""
    return {
        "slug": slug,
        "title": title,
        "subtitle": subtitle,
        "date": date,
        "cover": f"/api/photo/{slug}/{photos[0]['filename']}",
        "photos": [
            {
                "src": f"/api/photo/{slug}/{p['filename']}",
                "alt": f"{title} {yr}".strip(),
                "filename": p["filename"],
                "w": p["w"], "h": p["h"],
            }
            for p in photos
        ],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--skip-download", action="store_true",
                    help="reuse already-downloaded scratch/originals/")
    args = ap.parse_args()

    approved = json.load(open(args.manifest))["approved"]
    for e in approved:
        e["gallery"] = fix_slug(e["gallery"])

    uuids = list(OrderedDict((e["uuid"], None) for e in approved))
    if not args.skip_download:
        download_originals(uuids)

    db = osxphotos.PhotosDB()
    by_uuid = {p.uuid: p for p in db.photos()}

    by_gallery = defaultdict(list)
    missing = []
    for e in approved:
        src = next((os.path.join(ORIG_DIR, e["uuid"] + ext)
                    for ext in (".jpg", ".jpeg", ".JPG", ".JPEG")
                    if os.path.exists(os.path.join(ORIG_DIR, e["uuid"] + ext))), None)
        if not src:
            missing.append(e["filename"])
            continue
        slug = e["gallery"]
        gdir = os.path.join(GALLERIES_DIR, slug)
        os.makedirs(gdir, exist_ok=True)
        fn = e["filename"]
        dest = os.path.join(gdir, fn)
        n = 1
        while os.path.exists(dest):  # avoid collisions within a gallery
            stem, ext = os.path.splitext(e["filename"])
            fn = f"{stem}-{n}{ext}"
            dest = os.path.join(gdir, fn)
            n += 1
        shutil.copyfile(src, dest)
        w, h = sips_wh(dest)
        p = by_uuid.get(e["uuid"])
        by_gallery[slug].append({"filename": fn, "w": w, "h": h, "date": p.date if p else None})

    if missing:
        print(f"\n⚠ {len(missing)} not downloaded (iCloud/permission): {', '.join(missing[:10])}")

    # build gallery objects
    new_galleries = []
    print("\ngalleries created:")
    for slug, photos in by_gallery.items():
        dates = [p["date"] for p in photos if p["date"]]
        if dates:
            d = max(set(x.month for x in dates), key=lambda m: sum(1 for x in dates if x.month == m))
            datestr = f"{MONTHS[d]} {max(dates).year}"
        else:
            datestr = ""
        title = title_from_slug(slug)
        subtitle = SUBTITLE.get(slug, title)
        new_galleries.append(gen_gallery(slug, title, subtitle, datestr, photos))
        print(f"  {len(photos):3d}  {slug}  ·  {title} / {subtitle} / {datestr}")

    # merge into catalog.json (source of truth; uploaded to Blob). Replace any
    # gallery with the same slug, otherwise append.
    try:
        existing = json.load(open(CATALOG_JSON))
    except Exception:
        existing = []
    by_slug = OrderedDict((g["slug"], g) for g in existing)
    for g in new_galleries:
        by_slug[g["slug"]] = g
    os.makedirs(os.path.dirname(CATALOG_JSON), exist_ok=True)
    with open(CATALOG_JSON, "w") as f:
        json.dump(list(by_slug.values()), f, indent=2)
    print(f"\nmerged {len(new_galleries)} galleries into {CATALOG_JSON}"
          f" ({len(by_slug)} total)")
    print("\nNEXT:  npx tsx scripts/upload-to-blob.ts   (uploads photos + catalog.json)")


if __name__ == "__main__":
    main()

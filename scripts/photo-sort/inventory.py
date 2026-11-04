#!/usr/bin/env python3.11
"""
Stage 1 — inventory + rank photos from the local Photos library.

Reads ~/Pictures/Photos Library.photoslibrary (read-only), filters by camera
+ date, ranks by Apple's built-in aesthetic score, writes ranking.json.

Run with the 3.11 interpreter that has osxphotos installed:
  /usr/local/opt/python@3.11/bin/python3.11 scripts/photo-sort/inventory.py --help

Findings baked in (2026-11): iCloud *shared albums* strip EXIF camera info and
carry NO Apple aesthetic score (all 0.0), so they can't be DSLR-filtered or
ranked. Real DSLR work with full metadata lives in the main (non-shared)
library — that's the default source here.
"""
import argparse, datetime, json, re, sys
from collections import defaultdict

# Sony cameras name files DSC#####.jpg (edited copies may be DSC#####-2.jpg)
SONY_PATTERN = re.compile(r"^DSC\d+(-\d+)?\.jpe?g$", re.I)

try:
    import osxphotos
except ImportError:
    sys.exit("osxphotos not importable — use the 3.11 interpreter it was installed under.")

DSLR_MAKES = {"sony", "canon", "fujifilm", "panasonic",
              "olympus imaging corp.", "nikon", "leica"}


def utc(d):
    if not d:
        return None
    return d.astimezone(datetime.timezone.utc) if d.tzinfo else d.replace(tzinfo=datetime.timezone.utc)


def make_of(p):
    ex = p.exif_info
    return (ex.camera_make.strip() if ex and ex.camera_make else "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", default="2024-06-01", help="capture date floor YYYY-MM-DD")
    ap.add_argument("--source", choices=["library-dslr", "album", "shared-album"],
                    default="library-dslr")
    ap.add_argument("--album", default=None, help="album name for --source album/shared-album")
    ap.add_argument("--out", default="scratch/ranking.json")
    ap.add_argument("--top", type=int, default=25, help="print top N to stdout")
    args = ap.parse_args()

    cut = datetime.datetime.fromisoformat(args.since).replace(tzinfo=datetime.timezone.utc)
    db = osxphotos.PhotosDB()

    if args.source == "library-dslr":
        pool = [p for p in db.photos() if not p.shared]
        # Sony-only, by filename pattern (DSC#####.jpg) per Ryan's request
        keep = lambda p: bool(SONY_PATTERN.match(p.original_filename or ""))
    elif args.source == "album":
        pool = db.photos(albums=[args.album])
        keep = lambda p: True
    else:  # shared-album
        pool = [p for p in db.photos() if p.shared and args.album in p.albums]
        keep = lambda p: True

    rows = []
    for p in pool:
        if not p.date or utc(p.date) < cut or not keep(p):
            continue
        rows.append({
            "uuid": p.uuid,
            "filename": p.original_filename,
            "date": utc(p.date).isoformat(),
            "make": make_of(p) or None,
            "score": round(getattr(p.score, "overall", 0.0) or 0.0, 4),
            "sub": {
                "sharp": round(getattr(p.score, "sharply_focused_subject", 0.0) or 0.0, 3),
                "composition": round(getattr(p.score, "pleasant_composition", 0.0) or 0.0, 3),
                "lighting": round(getattr(p.score, "pleasant_lighting", 0.0) or 0.0, 3),
                "subject": round(getattr(p.score, "well_chosen_subject", 0.0) or 0.0, 3),
            },
            "albums": p.albums,
        })

    rows.sort(key=lambda r: -r["score"])
    import os
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(rows, f, indent=2)

    print(f"source={args.source} album={args.album} since={args.since}")
    print(f"kept {len(rows)} photos -> {args.out}")
    bym = defaultdict(int)
    for r in rows:
        bym[r["date"][:7]] += 1
    print("by month:", dict(sorted(bym.items())))
    print(f"\nTOP {args.top} by Apple aesthetic score:")
    for r in rows[:args.top]:
        print(f"  {r['score']:+.3f}  {(r['make'] or '-'):8s} {r['date'][:10]}  {r['filename']}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3.11
"""
Re-encode gallery JPEGs to web size (<=2000px long edge, quality ~82) in place.
Shrinks the heavy full-res ingest to fast-loading web renditions. sips only.

  /usr/local/opt/python@3.11/bin/python3.11 scripts/photo-sort/resize_web.py <slug> [<slug> ...]
  (no args = all new galleries listed in NEW_SLUGS)
"""
import os, subprocess, sys

ROOT = os.getcwd()
GDIR = os.path.join(ROOT, "private-photos", "galleries")
MAXEDGE = 2000
QUALITY = "82"
NEW_SLUGS = ["fishkill-2026", "thailand-2024", "mission-sep-2025",
             "mission-april-2026", "japan-2026", "switzerland-2026",
             "korea-2024", "costa-rica-2025", "paris-2025", "nyc-2026", "la-2025"]


def main():
    slugs = sys.argv[1:] or NEW_SLUGS
    before = after = 0
    n = 0
    for slug in slugs:
        d = os.path.join(GDIR, slug)
        if not os.path.isdir(d):
            print(f"  skip (missing): {slug}")
            continue
        for fn in sorted(os.listdir(d)):
            if not fn.lower().endswith((".jpg", ".jpeg")):
                continue
            p = os.path.join(d, fn)
            before += os.path.getsize(p)
            subprocess.run(
                ["sips", "-s", "format", "jpeg", "-s", "formatOptions", QUALITY,
                 "-Z", str(MAXEDGE), p, "--out", p],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            after += os.path.getsize(p)
            n += 1
        print(f"  done: {slug}")
    print(f"\nre-encoded {n} photos: {before//1024//1024} MB -> {after//1024//1024} MB")


if __name__ == "__main__":
    main()

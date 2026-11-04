#!/usr/bin/env python3.11
"""
Stage 2a — export downsized previews for the review sheet.

Reads scratch/ranking.json, resizes each photo's original to ~1200px long edge
into scratch/previews/<uuid>.jpg via `sips`. iCloud-only (not downloaded)
originals are reported and skipped.

  /usr/local/opt/python@3.11/bin/python3.11 scripts/photo-sort/export_previews.py
"""
import json, os, shutil, subprocess, sys

try:
    import osxphotos
except ImportError:
    sys.exit("osxphotos not importable — use the 3.11 interpreter.")

RANKING = "scratch/ranking.json"
OUT = "scratch/previews"
MAXEDGE = 1200


def main():
    rows = json.load(open(RANKING))
    os.makedirs(OUT, exist_ok=True)
    db = osxphotos.PhotosDB()
    by_uuid = {p.uuid: p for p in db.photos()}

    done = skipped = missing = 0
    missing_list = []
    for i, r in enumerate(rows, 1):
        dest = os.path.join(OUT, r["uuid"] + ".jpg")
        if os.path.exists(dest):
            skipped += 1
            continue
        p = by_uuid.get(r["uuid"])
        src = p.path if (p and p.path and os.path.exists(p.path)) else None
        if src:
            # full-res original on disk → resize down
            subprocess.run(
                ["sips", "-s", "format", "jpeg", "-Z", str(MAXEDGE), src, "--out", dest],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
        else:
            # iCloud-only: use the largest locally-cached derivative as-is
            derivs = (p.path_derivatives or []) if p else []
            derivs = [d for d in derivs if os.path.exists(d)]
            if not derivs:
                missing += 1
                missing_list.append(r["filename"])
                continue
            shutil.copyfile(derivs[0], dest)  # first = largest
        done += 1
        if done % 25 == 0:
            print(f"  {i}/{len(rows)} exported…")

    print(f"\nexported={done} skipped(existing)={skipped} missing(iCloud-only)={missing}")
    if missing_list:
        print("iCloud-only (not on disk):", ", ".join(missing_list[:20]),
              ("…" if len(missing_list) > 20 else ""))


if __name__ == "__main__":
    main()

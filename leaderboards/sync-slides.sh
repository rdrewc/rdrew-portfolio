#!/usr/bin/env bash
# Rebuild assets/slides, assets/thumbs and slides.json from a folder of exports.
#
#   ./sync-slides.sh [source-folder]
#
# Exports are ordered by the trailing number in their filename ("Framing 2.png"
# before "Framing 10.png"). Titles and notes already in slides.json are kept,
# matched by position, so a re-export never wipes the writing.
set -euo pipefail

SRC="${1:-$HOME/Desktop/Portfolio 2026/Netflix/Friends Leaderboards/slides/Crit Share 8}"
DIR="$(cd "$(dirname "$0")" && pwd)"

[ -d "$SRC" ] || { echo "No such folder: $SRC" >&2; exit 1; }

rm -rf "$DIR/assets/slides" "$DIR/assets/thumbs"
mkdir -p "$DIR/assets/slides" "$DIR/assets/thumbs"

# Sort by the numeric suffix, not lexically.
i=0
while IFS= read -r f; do
  i=$((i + 1))
  n=$(printf "%02d" "$i")
  sips -Z 2560 -s format jpeg -s formatOptions 88 "$f" --out "$DIR/assets/slides/$n.jpg" >/dev/null
  sips -Z 640  -s format jpeg -s formatOptions 72 "$f" --out "$DIR/assets/thumbs/$n.jpg" >/dev/null
  echo "  $n  $(basename "$f")"
done < <(find "$SRC" -maxdepth 1 -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \) \
         | sed -E 's/.*[^0-9]([0-9]+)\.[^.]+$/\1&/' | sort -n | sed -E 's/^[0-9]+//')

COUNT="$i" python3 - "$DIR" <<'PY'
import json, os, sys, time

d = sys.argv[1]
count = int(os.environ["COUNT"])
path = os.path.join(d, "slides.json")

deck = {"title": "Friends Leaderboards", "section": "Games Social", "slides": []}
if os.path.exists(path):
    with open(path) as fh:
        deck = json.load(fh)

old = deck.get("slides", [])
out = []
for i in range(count):
    n = "%02d" % (i + 1)
    prev = old[i] if i < len(old) else {}
    out.append({
        "id": prev.get("id", "slide-%s" % n),
        "src": "assets/slides/%s.jpg" % n,
        "thumb": "assets/thumbs/%s.jpg" % n,
        "title": prev.get("title", "Slide %d" % (i + 1)),
        "notes": prev.get("notes", ""),
    })

deck["slides"] = out
deck["rev"] = int(time.time())   # busts the browser cache on re-export
with open(path, "w") as fh:
    json.dump(deck, fh, indent=2)
    fh.write("\n")
print("slides.json: %d slides (%d titles carried over)" % (count, min(count, len(old))))
PY

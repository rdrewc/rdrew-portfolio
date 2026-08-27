#!/usr/bin/env bash
# Bumps the ?v= cache-busting query on slides.css/slides.js/slide-overlays.js
# in index.html. Run this after editing any of those three files — the static
# server here sends no cache-control headers, so without a version bump a
# browser that already loaded the deck can keep running old JS/CSS after a
# plain reload.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
V="$(date +%s)"

python3 - "$DIR/index.html" "$V" <<'PY'
import re, sys
path, v = sys.argv[1], sys.argv[2]
s = open(path, encoding='utf-8').read()
s = re.sub(r'(slides\.css|slides\.js|slide-overlays\.js)(\?v=\d+)?(?=["\'])',
            lambda m: m.group(1) + '?v=' + v, s)
open(path, 'w', encoding='utf-8').write(s)
PY

echo "asset version bumped to $V"

# Avatar Upscaler

Previews a cut-out Netflix avatar composited onto a TV screen and a portrait
phone shell, to judge how a 160–320px source avatar holds up when blown up to a
hero render.

Served statically from the repo root, same as `gamesprofiles/`:
<https://rdrew.com/avatar-upscaler/>

## TV screen

`assets/tv-screen.png` — 2560×1440, the **empty shell**: the left profile card
has no character and no name/stats, so layers composite cleanly on top of it.
Source: `Desktop/Portfolio 2026/Netflix/Player Profiles/Fandom Profile - Shell.png`.

`assets/tv-screen-reference.png` is the filled version (Zoeooo049 in the card),
kept only as a composition reference. It is not loaded by the page.

To swap the screen, drop any 16:9 image at `assets/tv-screen.png`; if it is ever
missing the TV renders a placeholder naming the path. The avatar slots sit on
top of whatever image is there, so a re-shot screen means retuning the two
`.slot--*` rules (see **Slot positions**) and nothing else.

## Local preview

```bash
cd /Users/rcasey/code/rdrew-portfolio && python3 -m http.server 8787
```

Then open <http://localhost:8787/avatar-upscaler/>.

## Layout

| File | Purpose |
| --- | --- |
| `index.html` | Markup: control sidebar, TV surface, phone shell |
| `avatar-upscaler.css` | Sidebar tokens/styling carried over from `gamesprofiles/`, plus stage |
| `avatar-upscaler.js` | Library load, selection, placement, drag, persistence |
| `assets/avatars/` | 56 transparent cut-outs + `index.json` |

Netflix Sans is referenced from `../gamesprofiles/assets/fonts/` rather than
duplicated, so both prototypes share one copy.

## Avatar library

56 avatars, cut from the 659-avatar Netflix set. Each was kept only if its
subject separates cleanly from the background — a contained silhouette, a matte
that holds together as one solid region, and a character rather than a logo or
prop. `index.json` carries `title`, `show`, `source_size`, `output_size`,
`upscale`, and the original Netflix `url` for each.

Cut-outs are cropped to the silhouette and resampled to a 512px long edge with
Lanczos (1.6×–3.4×). That is clean resampling, not detail synthesis — the
photographic ones stay soft at full size. Swapping in a real upscaler
(Real-ESRGAN, Topaz) means regenerating `assets/avatars/` and leaving
`index.json` otherwise intact.

## Slot positions

Measured against the shell: the profile card is `127,345 → 819,1086`
(692×741 px) = `left 4.96% / top 23.96% / 27.03% × 51.46%`.

The TV slots are percentage boxes over the screen image, in
`avatar-upscaler.css`:

- `.slot--hero` — the upscaled render. Covers the card's **art region**, the top
  72% of the card where the original character sat, and is bottom-anchored
  (`place-items: end center`) so the head reaches the card top and the shoulders
  land on the same baseline. The lower ~28% of the card stays clear for a
  name/stats layer.
- `.slot--chip` — source-resolution avatar over the top-left nav avatar.

Both are draggable in the UI; the sliders drive whichever hero was last touched.
Placement and render toggles persist to `localStorage` under
`avatar-upscaler:v1`. If you re-shoot the TV screen at a different composition,
retune the two `.slot--*` rules rather than the JS.

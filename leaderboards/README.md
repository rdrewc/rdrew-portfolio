# Friends Leaderboards — slides

Static deck viewer for the Friends Leaderboards crit share. The exported
frames live in `assets/`; everything about the deck's structure lives in
`slides.json`.

    /leaderboards/            index.html, slides.css, slides.js
    /leaderboards/slides.json manifest — order, titles, speaker notes
    /leaderboards/assets/slides   2560px JPEGs shown on stage
    /leaderboards/assets/thumbs   640px JPEGs for the overview grid

## Re-exporting

    ./sync-slides.sh                 # defaults to the Desktop export folder
    ./sync-slides.sh /path/to/export

Frames are ordered by the trailing number in their filename, so
`Framing 2.png` lands before `Framing 10.png`. Titles and notes already in
`slides.json` are carried over by position — a re-export of the same deck
keeps the writing, and only new frames come through with placeholder titles.

The script also bumps a `rev` stamp in `slides.json`, which the viewer appends
to every image URL — so a re-export shows up straight away instead of behind a
cached copy.

`index.html` carries the same kind of stamp on `slides.css`, `slides.js` and
`slide-overlays.js` (a `?v=` on each tag). Unlike the image rev, this one
isn't automatic — run this after editing any of those three files:

    ./bump-asset-version.sh

Without it, a browser that already loaded the deck once can keep running old
JS/CSS after a plain reload — the static server here sends no cache-control
headers, so it's purely up to the browser's own heuristics, and those aren't
reliable.

## Shortcuts

`→` `Space` next · `←` previous · `Home`/`End` first/last · `1`–`9` jump ·
`G` overview · `S` speaker notes · `F` fullscreen · `C` hide chrome ·
`Esc` close.

Deep links use the slide id: `/leaderboards/#anatomy`.

## Adding interactivity to a slide

Each slide gets an overlay layer sized to the artwork. Register a mount
function against the slide's manifest `id` and position children in percentage
units so they track the image at any window size:

```js
Deck.registerOverlay('anatomy', function (layer, slide) {
  var hotspot = document.createElement('button');
  hotspot.style.cssText = 'position:absolute;left:42%;top:31%;width:16%;height:9%';
  hotspot.addEventListener('click', function () { /* ... */ });
  layer.appendChild(hotspot);

  return function () { /* optional teardown when the slide is left */ };
});
```

The layer is cleared and re-mounted on every slide change, and it ignores
pointer events itself (only its children opt back in) so nothing you add ever
has to fight the frame underneath for clicks. Sizes and positions use `cqw` /
`cqh`, which resolve against the artwork box, so a piece stays registered to
the image at any window size.

The stage has no click-to-advance zones — clicking a slide does nothing
unless something you registered there handles it. Advancing is `→`/`←`/
`Space`, the footer's prev/next buttons, or a touch swipe; that's deliberate,
so a slide's own clickable content (like the tv DP hotspots on "What about
the future of tv DP?") never double-fires as a navigation click too.

### Live edits on top of the export

`slide-overlays.js` currently carries changes that are **not** in the Figma
source yet:

- **Slide 5 (Cross Platform)** — a Leaderboards row under More Info, in the
  selected (white) state, and the leaderboard module's Close button reading
  See all.
- **Slides 3 & 4 (The Player Journey)** — both slides share one background
  asset (`assets/slides/03.jpg` and `04.jpg` are byte-identical): the ring,
  title and footer only, with all five phase call-outs — including Play
  Again — painted out of the export (median-filtered from their own
  surrounding gradient, so the patch is seamless). Every call-out is rebuilt
  as one shared template (`.pj-block`: a bar, a heading, a body) rendered
  twice with different active/dim state:
  - Slide 3 (`player-journey`) renders all five active — full white, full
    color bar.
  - Slide 4 (`player-journey-highlight`) renders only Play Again active; the
    rest carry `data-state="dim"`, which drops the block to ~40% opacity —
    matching the ~35% dim treatment measured across every inactive block in
    the original export.

  Bar width, the 1.145cqw gap between bar and text, and letter-spacing
  (0.15em heading / 0.14em body — much wider than a first pass assumed) were
  all measured off the pristine 3840px export rather than the compressed web
  JPEG, and held consistent within 0.01 across all five blocks, which is why
  one template covers all of them rather than five hand-tuned approximations.
  Font weight is Bold (700); Netflix Sans itself was re-vendored from the
  real desktop family (Thin through Black) rather than the web-mirror subset
  used originally — the two are different cuts of "Netflix Sans" with
  different letterforms, which is what made the first pass read as an off
  font even though the family name matched and the fonts were loading fine.

- **Slide 7 (What about the future of tv DP?)** — the static Details mock is
  now a real Details / Updates / Leaderboards tab flow. `assets/tv-dp/` holds
  one screenshot per state; all three mount at once (stacked, opacity-swapped)
  so switching is instant with no fetch-on-click flash, and only the visible
  image accepts pointer events so a click never lands on the wrong state. The
  panel box (`.dp-panel`) sits exactly where the old static mock did — a true
  16:9 sub-frame of a 16:9 deck, which is why its `cqw`/`cqh` values are
  numerically equal. Tab hit zones (`.dp-tab-hit`) reuse one set of x-ranges
  across all three images, since the tab bar's horizontal layout is identical
  in every state — only its height moves (bottom of the hero art in Details,
  top of a dimmed backdrop in Updates/Leaderboards), so the hit zones just
  relocate to `--bottom` or `--top` on state change rather than needing
  three separate coordinate sets. How to Play and Previews & Extras are
  visible but inert — only Updates and Leaderboards are wired up, since
  those are the only other states there are screenshots for.

Positions and type sizes were measured off the export itself, so they line up
with what's already in the artwork. Fold these back into Figma when the deck
is next revised, then delete the corresponding block from `slide-overlays.js`
(and, for the Player Journey, drop slide 4 in favor of the original Figma
export, or vice versa depending on which state Figma ends up authoring).

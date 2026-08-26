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
pointer events itself so click-to-advance keeps working around whatever you
add. Sizes and positions use `cqw` / `cqh`, which resolve against the artwork
box, so a piece stays registered to the image at any window size.

### Live edits on top of the export

`slide-overlays.js` currently carries two changes to slide 5 that are **not**
in the Figma source yet:

- a **Leaderboards** row under More Info, in the selected (white) state
- the leaderboard module's **Close** button reading **See all**

Positions and type sizes were measured off the export itself, so they line up
with the rows already in the artwork. Fold these back into Figma when the deck
is next revised, then delete them from `slide-overlays.js`.

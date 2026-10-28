# Storm tracker

Branch `storm-tracker` (from `main`), worktree `.claude/worktrees/storm-tracker`. Not pushed or deployed. Preview: `storm-tracker` in `/Users/rcasey/claude/.claude/launch.json`, port 4182.

Turning the homepage background into an El Niño storm tracker for winter 2026-27: powder forecasts for Tahoe, Shasta and Whitney, plus storm prep for the house.

## Step 1: top-down map and forecast radar (done, rough)
- `assets/storm-map.js` replaces `assets/terrain.js` on the homepage. It draws a straight-down topo map with MapLibre GL 5.24.0, using maplibre-contour 0.1.1 to make contour lines (in feet) from the AWS Terrarium elevation tiles. Contours below sea level are hidden.
- `assets/storm/west-outlines.geojson` (206 KB) holds the coast, lakes, and state and country lines from Natural Earth 5.1.2, clipped to 29–51.5° N, 130–111° W.
- Forecast radar is HRRR simulated reflectivity tiles from the Iowa Environmental Mesonet: 19 hourly frames covering 0–18 h of the latest run, opening on the frame nearest now. The tile URLs include the run hour, so a new run doesn't reuse old tiles.
- Footer: West / Tahoe / Shasta / Whitney fly the camera (the choice is saved as `map-view`), and **Tracker** hides the page so you can drag and zoom the map and play or scrub the radar. Esc leaves Tracker mode. Outside Tracker mode the map is a still background.
- Top bar: in the West view it shows the radar's valid time; in a zone it shows the current weather and elevation, as before.
- 3D terrain was tried and dropped. Stray spikes in the elevation tiles (for example on Tahoe's north shore) stood up as needles. Now every view is straight down.
- `assets/terrain.js` stays because `gate.html` still uses it.

## Step 1 follow-ups (done)
- The dark-mode scrim went from 0.5 to 0.72 and radar opacity outside Tracker mode from 0.6 to 0.45, so the map is quieter behind the portfolio.
- The on-screen credit line is gone. Sources are credited in comments in `storm-map.js` only.
- Opening Tracker mode slides `.page` up out of view (translateY -100%, 0.7 s) instead of fading it; closing slides it back.
- A home icon (the one from the case study header) sits centered in the top bar while tracking and closes the tracker. The footer's "Tracker" text is now a snowflake button styled like the theme toggle.
- Totals cards for Tahoe, Shasta and Whitney show snow and liquid precip for the next 24 h, 3 days and 7 days. It's one Open-Meteo request for all three, at mid-mountain points: Ward Peak 8,000 ft, Bunny Flat 7,000 ft, Outpost Camp 10,000 ft. Clicking a card flies there. They sit in a column on desktop and a swipeable row on phones.

## Locations, elevations, Tahoe shore (done)
- Mammoth added. Zones now run north to south (Shasta, Tahoe, Mammoth, Whitney), and Tahoe is the default view.
- Elevations fixed:
  - Top bar: shows each spot's published elevation instead of an elevation-service lookup, which had smoothed Shasta down to 14,108. Values: lake surface 6,225, Shasta 14,179, Mammoth 11,053, Whitney 14,505.
  - Totals cards: the old labels were round guesses (Tahoe said 8,000 ft at a 6,900 ft spot). Each card now uses a named point, with its elevation read off the z13 terrain tiles: Ward Peak 8,630, Bunny Flat 6,930, Mammoth Main Lodge 8,790, below Trail Camp 11,630.
- Location tabs live inside the snowflake pill and only appear in Tracker mode. The pill grows to the left (grid 0fr→1fr), the tabs slide out one after another nearest-first, and the snowflake turns 90°. People with reduced motion turned on get no animation.
- Lake Tahoe's shoreline is traced from z13 Terrarium tiles (~15 m per pixel, the contour 0.5 m above the 1,897.55 m lake surface), 1,425 points. It replaces Natural Earth's coarse outline in `west-outlines.geojson`. The scripts (`dem.py`, `tahoe_shore.py`, `clip_west.py`) are in the session scratchpad, not the repo.

## Contrast, carousel, bar charts (done)
- Map lines have two contrast levels. Outside Tracker mode they're quiet: minor contours at 0.4, major at 0.75, the coast and lakes in the same terrain color at width 1. Tracker mode switches to `--terrain-line-strong`, raises the opacities, and widens the coast to 1.2, easing over 600 ms. The Tahoe shore is defined without standing out.
- The totals cards are a carousel at every screen size: one card in view, with back / next carets and "2 / 4" underneath. The carets step through the zones and fly the map; they're disabled at the ends, and picking a footer tab moves the carousel too.
- The selected location tab is accent text only (no pill), with 6 px of space before the snowflake.
- Each card has two daily bar charts for the next 7 days, snow and precip. They're separate charts because the measures don't share a scale, and each scale is shared across all cards, with floors of 4" snow and 0.40" precip. Hovering a bar shows its day and amount. Colors are violet `--snow-bar` and green `--precip-bar`, validated as a pair in both themes with the dataviz palette script.

- On phones the cards start collapsed to the name and totals (118 px tall instead of 255). A chart button beside the carets grows the bar charts in (grid rows 0fr→1fr) and hides them again. Desktop always shows the charts.

## Named forecast targets (done)
- Each zone forecasts for one named target. The top bar's weather, elevation and coordinates, the totals card and the map marker all use the same point:
  - Shasta: Shastina summit, Shasta's west-side peak. 41.4092, -122.2233, 12,330 ft (terrain tiles say 12,313). It was Hidden Valley at 9,200 ft until Ryan asked for higher.
  - Tahoe: Granite Chief, the top of Palisades. 39.1983, -120.2870, 9,006 ft (terrain tiles say 9,025). It was KT-22 first. The Tahoe view is framed to the lake plus Granite Chief so both fit on any screen.
  - Mammoth: Mammoth Mountain summit. 37.6308, -119.0326, 11,053 ft.
  - Whitney: summit. 36.5786, -118.2921, 14,505 ft.
  - Positions are OpenStreetMap's (Nominatim) for each named place. The old split between a top-bar spot and a card spot is gone.
- Tracker mode puts a target marker at each point (MapLibre markers, so they move with the map). Each has a label with the name, GPS position and elevation. Labels hide below zoom 7 (the whole-coast view), the current zone's target is accent-colored, and clicking one flies there. The cards also show the target name and coordinates.

## Motion system and entrance sequence (done)
- `assets/site.css` now holds shared motion tokens for the whole site:
  - Easing: `--ease-out`, `--ease-in-out`, `--ease-in`.
  - Durations: `--dur-quick` 0.2s, `--dur-base` 0.55s, `--dur-slow` 0.7s.
  - `--stagger` 80ms and `--enter-rise` 10px.
  - The `.enter` pattern: it rises and fades in when an ancestor gets `.is-entered`, after `--enter-wait` plus `--i` times the stagger, and leaves quickly all at once. It uses `translate`, so existing transforms still work.
  - The homepage's literal cubic-beziers now use the tokens. Ryan wants this system reused for future animation.
- Opening the tracker: the page slides out over `--dur-slow`, then the totals card (`--i` 0), the radar timeline (1) and the four targets (2–5) enter in sequence. Everything has settled by about 2 s. Closing: those leave first (`--dur-quick`), then the page slides back.
- Framed views (the whole coast, Tahoe) now pad around the top bar, timeline, footer and totals card, so the whole lake and Granite Chief show on desktop and phones.

## Live cams, header, snowflake (done)
- The selected target's map label (not the weather card) shows the latest frame from a mountain camera, not a highway camera. Other targets' labels stay text-only, and the cam is 240 px wide (180 on phones). The cameras are ALERTCalifornia's (UC San Diego) pan-tilt units on peaks and lookouts.
  - On first tracker open, the public feed (`all_cameras-v3.json`, about 137 KB gzipped, cross-origin allowed) gives every camera's position, current heading and field of view. Per target, the card picks the nearest camera within 25 mi that's pointed at it (or sits on it, under 1 mi), then the nearest of the rest. It keeps the top 3 to fall back through if one fails to load.
  - Images are `/{id}/latest-thumb.jpg`, 480x270 at about 22 KB, time stamped and watermarked by ALERTCalifornia. They reload every minute while the tracker is open.
  - `cams` in VIEWS is the fallback if the feed doesn't load: Weed 2 for Shastina, Duncan Peak Lookout for Granite Chief, the Mammoth Mtn. summit cams, and Whitney Portal 1.
  - The Palisades webcam page uses an Ozolio player embed, not plain image files, so resort cams weren't used.
  - On 2026-10-28, no camera within 25 mi was pointed at Granite Chief, so Tahoe falls back to the nearest (Duncan Peak Lookout, 12.5 mi west).
- The top bar outside Tracker mode always shows home, as before: Lake Tahoe at 39.0968° N, 120.0324° W, 6,225 ft, with Tahoe City weather. Inside Tracker mode it shows the selected target.
- The snowflake is always a filled circle, like the theme toggle's indicator, and turns accent-colored when on. Closed, the pill is a 34 px circle; the space before the snowflake is a margin on the last tab, so it folds away with the tabs.

## Leader lines, card footer (done, checked on screen)
- Each target label hangs off a leader line: an elbow from the crosshair's ring at 45°, then flat into the label. The label hangs down from the leader's end (44 px right, top at -17 px) so the leader meets it at the name line. A tall label with its cam grows downward instead of up under the totals card. The leader is accent-colored on the selected target and hides with the labels at whole-coast zoom.
- The carousel arrows moved into a footer inside the card's stroke: back and next in the bottom corners, the count between them. The footer stays fixed while the cards slide under it, and cards got 50 px of bottom padding for it. On phones a chevron next to the count replaces the chart icon for opening the bars, and turns over when open.
- Checked on screen at phone and desktop sizes. Fixes from that check:
  - The label now hangs down rather than centering on the leader.
  - The cam caption is two lines, so the camera name isn't cut to one letter.
  - `.stats-track` is `overflow: clip`. With `hidden`, focusing the expand chevron scrolled the track 20 px and knocked the carousel sideways.

## Pacific Maritime Snowpack card (done)
- The carousel now opens with a region card for the West view: `CARDS` is `['west']` plus the zones, so it counts "1 / 5" and the West tab or the back arrow lands on it. It covers the Cascades to the Sierra, 8 sites: Mt. Baker 5,000 ft, Mt. Hood/Timberline 6,000, Bachelor 7,000, Crater Lake 7,100, plus the four zone targets.
- The data is one Open-Meteo request: past 7 days plus next 7, daily snow, precip and mean temperature, averaged across the sites.
  - A generated trend sentence compares next week with last week: wetter or drier, warmer or colder by 3°F or more, totals, and the snowiest site.
  - Two 14-day bar charts, with past days faded and today outlined.
  - A next-7-days table by site.
- The El Niño summary is hand-written in `ENSO` in `storm-map.js`, because NOAA's CPC files don't allow cross-origin requests. It cites the CPC discussion of Oct 8, weekly Niño-3.4 +3.4°C for the week of Oct 21, and NOAA's winter outlook of Oct 15. It needs updating after each monthly CPC discussion (2nd Thursday) until the Worker fetches it.
- Cards cap their height to the window and scroll inside, and the footer is now solid so content doesn't show through it. On phones the region card collapses to its trend sentence.

## Region card: temp trend and snow callout (done, checked on screen)
- The snowiest site for the next 7 days is pulled out of the trend sentence into its own callout: a 36 px number, the site name, and its precip and elevation, under a "Most snow, next 7 days" label with the snow swatch. If no site expects 0.5" or more, it says "No snow ahead". The number uses text color, per the dataviz rules; the swatch carries the meaning.
- A "Past week · next week" block now stacks an average-temperature line above the precip bars, then the snow bars, all on the same day columns. Temperature gets its own chart instead of a second axis. Past days are dashed and today has a dot; the header shows the low–high range, and hovering a column shows that day's value.
- Temperature color: `--temp-line` (#d95926 dark, #eb6834 light), validated together with the snow and precip colors in both themes.
- Checked on screen on desktop.
- Cards keep their own height: the rail is top-aligned (`align-items: flex-start`) and the track eases to the height of the card in view, so the footer sits at that card's bottom. A ResizeObserver follows height changes such as the phone chart toggle. Before this, every card stretched to the 622 px region card; zone cards are back to 311 px.

## Siberia target, whole-card paging, ski pole cursor (done)
- Tahoe's target is now Siberia at Palisades: the top of Siberia Express (from OpenStreetMap), 39.1828, -120.2722, 8,630 ft from the terrain tiles. It was Granite Chief before.
- Each card carries its own footer (`cardFooter(i)`), so a card and its arrows slide sideways as one piece.
  - The track clips sideways only (`overflow-x: clip`); cards keep their own heights and nothing animates vertically when paging. The track-height easing and ResizeObserver are gone.
  - Cards are now `div`s, since buttons can't hold buttons. One click listener on the rail handles arrows, the expand chevron (all cards together) and fly-to. Off-screen cards are `inert`.
  - The footer is sticky to the bottom of a card that scrolls (the tall region card). `.site-stats` lets clicks through below a short card.
- In Tracker mode the map cursor is an inline-SVG ski pole: an old big strapped basket and a leather grip, with the tip as the hotspot (3, 29) and a white outline. It falls back to `grab`.
- Still waiting on Ryan for the cam he meant ("use this cam"); no link came through.

## Not done yet
- On narrow phones a target's label can run off the right edge.
- A couple of tiny rings at Tahoe's north and south shores are elevation-tile glitches, not real features.
- On phones the totals cards cover the north end of the lake.
- The radar uses IEM's built-in colors; recoloring it to match the site comes later. HRRR only covers the lower 48, so BC is blank.
- Some of the terrain tiles' sources (Canada's elevation data, for one) ask for credit, which still needs a home, e.g. a Sources link.
- No forecast past 18 h yet. Open-Meteo days 2–7 come in step 2.
- The old drag-to-glow effect on the contour lines didn't carry over.

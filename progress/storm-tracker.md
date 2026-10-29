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
- The cam Ryan pointed to (OpenSnow cam 2627, "Siberia") is Palisades' own camera, but its only public stills are OpenSnow's copies on OpenSnow's servers, and Palisades' public webcam page doesn't list it. So it isn't used.
- Ryan chose Palisades' official Scope 8,200' cam (High Camp) for the Siberia label instead.
  - Its Ozolio live player only plays on palisadestahoe.com: embedded elsewhere it shows only its poster, and it refuses to open on its own.
  - So the label shows that poster as a still: `pub.api?cmd=poster&oid=EMB_EIFC0000015B`, 1920x1080, cross-origin allowed, cached 15 min. The camera pans, so the view varies.
  - Targets with `fixedCams: true` always use their listed cam (with `url` and `credit`) instead of the nearest ALERTCalifornia pick.

## Step 2: zone panels (done, browser-only data)
- Each zone card now has Snow / Wind / Odds tabs, following OpenSnow's feature set but not its look. The tab choice lives on the rail (`data-tab`), so every card shows the same tab and paging keeps it. On phones the tabs sit in the collapsible section.
- **Data:** one Open-Meteo request for the 4 targets (10-day daily snow and precip; 240 h hourly snow, precip, gusts and direction in mph), plus the ECMWF ensemble (51 runs, daily snowfall, used only for the Odds tab's 6"+ chance) and NOAA WPC winter odds (`wpc_prob_winter_precip` identify, one per target, cross-origin allowed). The ensemble and NOAA are optional; the card still renders if they fail.
- **Snow tab:** totals for days 1–5 and 6–10, then 10-day snow and precip bars (shared scales across zone cards). A likely-range overlay and a snow-level chart were tried and removed at Ryan's request (cluttered); the freezing level and base elevations went with them.
- **Wind tab:** the next 24 h's peak gust and direction in words, daily peak gust bars (neutral ink, darker past 40 mph) with a lift-hold line at 40 mph, and daily direction arrows (vector-averaged, pointing where the wind blows).
- **Odds tab:** NOAA's days 1–3 chance of 4", 8" and 12"+ as WPC categories (no polygon at the point means "<10%"), then the share of ensemble runs with 6"+ for each of the 10 days.

## Bottom controls (done)
- The location tabs left the footer. They're their own pill above it, aligned right (`#view-tabs`, `.enter` with `--i` 1, waiting `--dur-slow` like the rest of the tracker). The radar timeline is aligned left on the same row and narrows (clamp 280–520 px) to leave room. The snowflake stays in the footer and still opens the tracker, and the tabs with it.
- The snowflake circle is transparent when off and fills (`--glass-indicator`, accent icon) when on.
- Phones: the footer wraps to 82 px, so the tabs sit full width at `bottom: 94px` with the radar above them at 150 px. The map framing's phone bottom padding went from 170 to 210.

## Tracker map interaction fix (done)
- Bug since step 1: in Tracker mode the map stayed at z-index -2, under the body's box, so the body caught the pointer. Dragging, scroll-zoom and the ski pole cursor never reached the map.
- Fix: `body.is-tracking #storm-map{z-index:1}`, above the hidden page and still under every tracker panel (z 40+). Outside Tracker mode it drops back behind the page, so the portfolio stays clickable.
- Verified: a pointer on the map hits the canvas with the pole cursor, a drag pans, the wheel zooms, and the cards are still on top.

## Title font: ARS Maquette Pro (done)
- Ryan's licensed ARS Maquette Pro, converted from his OTFs to WOFF2: Medium 500 (used) and Bold 700 (declared, only downloads if used), about 88 KB each, in `assets/fonts/`.
- `@font-face` and `--font-title` live in `site.css`, so every page that loads it gets the font.
- Applied to page titles (homepage h1, case study h1 and its pinned copy), project card names, location card titles (`.stat-name`, now 17 px, 30% over 13 px, wrapping with line-height 1.2), and map label titles. Section labels, body, mono lists and small text are unchanged.
- `site.css` is now ?v=23 and `case-study.css` ?v=25 on every page.
- To confirm: self-hosting a commercial font on a public site needs ARS Type's webfont license, not just the desktop one.

## rdrew.com/elnino (done)
- The Worker serves the homepage at `/elnino` (the address stays), and `/elnino/` redirects to `/elnino` because the homepage's asset paths are relative. `storm-map.js` opens the tracker when the path is `/elnino`. Opening or closing the tracker by hand switches the address between `/elnino` and `/` with `replaceState`, so the link can be copied from inside.
- Locally `serve.py` has no Worker, so `/elnino` 404s there; test it on the preview URL.

## Overlays, SF and LA, closable labels (done)
- The radar bar's model-run label ("HRRR 17Z +2h") is gone; the bar shows just the valid time.
- **Overlay switch** at the start of the radar bar: Radar (default, the only one with a timeline), Wind, Temp. Play and the slider step aside for Wind and Temp, and the label says what's showing.
  - Temp: NOAA NDFD temperature as ArcGIS `export` tiles (`{bbox-epsg-3857}`, `layers=show:0,1,4`), under the contours at 0.55 opacity. NOAA's image has a one-pixel line at its grid's west edge near 130 W, so an ocean strip from 133 to 128.5 W is painted in `--bg` (the coastal data stops near 126 W).
  - Wind: no wind tiles are available (NOAA's map services and nowCOAST don't offer forecast wind), so it's Open-Meteo's current wind on a 14x18 grid over the visible bounds, refetched 250 ms after the map settles, and only while Wind is on. The first version drew arrows; Ryan wanted something more like Apple Weather, so it's now an animated particle flow:
    - The grid becomes a screen-space flow field every 16 px (bilinear; Mercator keeps angles, so east/north map to x/-y).
    - About one particle per 520 px² rides the field on a canvas inside MapLibre's canvas container (above the map, under the target markers), each living up to 130 frames.
    - Speed is 0.035 px per frame per mph (slowed from 0.055 at Ryan's request).
    - Each frame fades the canvas to 95.5% (`destination-in`), which leaves short trails. Strokes are batched into 4 speed steps: brighter and slightly thicker as wind picks up.
    - Strokes use the accent color so they separate from the white contours. Motion scales up gently past zoom 6.
    - The canvas hides while the map moves and resumes on `moveend`. With reduced motion it draws 60 steps once as a still.
  - The radar bar label for Wind is just "Wind now".
- **SF and LA** sit right after West (tabs and cards: West, SF, LA, Shasta, Tahoe, Mammoth, Whitney).
  - SF: Golden Gate Bridge (37.8183, -122.4784, 220 ft roadway).
  - LA: Hollywood Sign (34.1341, -118.3217, 1,575 ft from the terrain tiles).
  - Both are `landmark: true`: the cam picker wants a camera aimed at them, since the Mt. Lee cams sit on the sign and look away from it. Picks today: Sutro Tower 2 for the bridge, Star Mtn. for the sign.
  - Landmarks stay out of the Pacific Maritime region averages.
- **Target labels:** the crosshair is now its own button inside a div marker. Each label has an X that closes just the label, and clicking the crosshair reopens it (and selects the target).
- **Reopening unfurls:** the leader draws out (stroke-dashoffset, `--dur-quick`), then the label unrolls from the top (clip-path, `--dur-base`, after `--dur-quick`). No animation with reduced motion turned on.
- Phones: the radar bar wraps (switch on its own row), and the map framing's bottom padding is now 250.

## Label padding, wind fetch budget (done)
- The label's X now reserves its space on the title line only (`.target-name` padding-right), so the cam runs edge to edge with even 9 px sides.
- "Forecast unavailable" showed up once. The wind grid was spending Open-Meteo's free per-minute budget (252 points per pan), so:
  - Wind now samples 10x12 over the view plus a 25% margin on every side, and reuses that data while the view stays inside it.
  - The cards retry once after 4 s before showing the note.
  - The note is framed like a card.
  - The real fix for traffic is still the Worker cache (step 3+).

## Names (done)
- Cards use full names where the tabs use short ones: `VIEWS[k].title` (San Francisco, Los Angeles) beats `label` (SF, LA) on cards. The region card is "Pacific Maritime El Niño", and the West tab reads "Overview".
- Phone tabs went to 5 px side padding so all seven fit on 375 px.

## Opens on Overview, storm-colored titles (done)
- The tracker now opens on the Overview card every time. The homepage keeps its saved view (Tahoe by default), because `select(key, animate, keepSaved)` skips saving when the tracker switches to West on its own.
- Card titles use Barlow Condensed italic 900 in caps at 32 px. That's the one new font; nothing else changed.
- The title color comes from the next 24 hours of Open-Meteo hourly snowfall and precipitation (`stormLevel`):
  - Red (`--storm-big`) means at least 6" of snow or 1" of precipitation.
  - Yellow (`--storm-mid`) means at least 1" of snow or 0.25" of precipitation.
  - White means anything less.
  - The Overview title takes the worst level across all sites. Screen readers get the level as hidden text.
- The title stands alone on its line. Elevation moved to the line below (place, elevation, coordinates), with 10 px of space under the title on every card.

## Most rain callout, taller Overview (done)
- The Overview card has a second callout under the snow one: "Most rain, next 7 days". It takes the wettest of 14 low-elevation spots in the western US states, from Ketchikan to San Diego (the two BC sites were dropped) (`RAIN_SITES`), using Open-Meteo `rain_sum` so mountain snow isn't counted. It's a separate request; if it fails, the card shows without it.
- On desktop the cards can grow 54 px taller (the max-height reserve went from 150 px to 96 px), which puts the Overview card's bottom 16 px above the radar panel.

## Rain to one decimal, snow spot, footer hides in the tracker (done)
- The most-rain callout shows one decimal place.
- The most-snow callout names the exact forecast point (Siberia, Palisades; Timberline Lodge; and so on) and its elevation, in place of the precip line.
- Opening the tracker slides the whole footer (contacts, theme toggle) down and out with the page. The snowflake flies (FLIP, `dockTrackerButton`) to the right of the location tabs, where the button itself becomes one filled 48 px glass circle (no outer ring), on the motion tokens: `--dur-slow` and `--ease-in-out` on the way out, and on close it waits `--dur-quick` and flies back with the footer.
- With the footer gone, the radar panel and tabs sit 16 px from the bottom, and cards can grow by one more bar height.
- On phones the tabs tightened (3 px padding, 0.02em tracking) so all seven fit beside the snowflake.

## Not done yet
- On narrow phones a target's label can run off the right edge.
- A couple of tiny rings at Tahoe's north and south shores are elevation-tile glitches, not real features.
- On phones the totals cards cover the north end of the lake.
- The radar uses IEM's built-in colors; recoloring it to match the site comes later. HRRR only covers the lower 48, so BC is blank.
- Some of the terrain tiles' sources (Canada's elevation data, for one) ask for credit, which still needs a home, e.g. a Sources link.
- No forecast past 18 h yet. Open-Meteo days 2–7 come in step 2.
- The old drag-to-glow effect on the contour lines didn't carry over.

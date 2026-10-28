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

## Not done yet
- The radar uses IEM's built-in colors; recoloring it to match the site comes later. HRRR only covers the lower 48, so BC is blank.
- No forecast past 18 h yet. Open-Meteo days 2–7 come in step 2.
- The old drag-to-glow effect on the contour lines didn't carry over.

# tracker-legends

Branch `tracker-legends` (from `main` at d84320d), worktree `.claude/worktrees/tracker-legends`. Not pushed.

## Done
- Wind is the default overlay everywhere (homepage background and tracker). The coast view's top readout names the overlay: Wind · Now, Temperature · NOAA forecast, or Forecast radar and its time.
- Legends in the radar panel, in the timeline's place: Temp is a slim gradient bar of NOAA's NDFD scale (0 to 100 F, stops from the MapServer legend, at the map's 0.55 opacity). Wind is an animated strip of the same particles, 0 mph at the left to 30+ at the right, using the map's speed, brightness and width steps (sparser, shorter trails so streaks stay distinct). It only draws while tracking.
- Fixed: setOverlay waited on map.isStyleLoaded(), which stays false while radar tiles load, so a non-radar default never started. It now waits on a `mapReady` flag set at 'load'.

## Local preview
`python3 .claude/serve.py 4177` from this worktree (preview config `portfolio-tracker-legends`). Open the tracker with the snowflake (the /elnino path needs the Worker).

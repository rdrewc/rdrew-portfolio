# storm-legend

Branch `storm-legend` (from `main` at b06c5ea), worktree `.claude/worktrees/storm-legend`. Not pushed.

## Done
- Carousel cards drop the GPS position from their subtitle (name and elevation stay). The map's target cards keep it.
- Fourth storm level, Extreme (18"+ snow or 3"+ precip in 24 h), in a new darker red: --storm-extreme #c8102e dark / #8a0f1a light.
- Storm-risk legend above the cards: a small "Storm risk" label with the title colors as one gradient. It opens over the card to a table of the four levels with their snow and precip thresholds (built from STORM in storm-map.js), plus how the level is assessed and the source (Open-Meteo hourly forecast, an estimate, not an NWS warning). Cards are 34px shorter to make room.

## Open
- Extreme thresholds are a first guess; tune STORM.extreme if they should be higher or lower.

## Local preview
`python3 .claude/serve.py 4178` from this worktree (preview config `portfolio-storm-legend`); open the tracker with the snowflake.

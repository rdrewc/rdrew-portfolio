# personal-projects

Branch `personal-projects` (from `main` at 8c0387e), worktree `.claude/worktrees/personal-projects`. Not pushed.

## Done
- Homepage: new Personal Projects section after Coming Soon, with an El Niño Tracker card that opens /elnino directly (no project page).
- Thumbnail `assets/thumbs/elnino.gif`: from Desktop/Portfolio 2026/Side Projects/Elnino/El nino tumbnail.mov at full height, cropped (2186x1324 at x=10, y=4) so the card has 34 source px (9px in the GIF) on its left, top and bottom. The source is narrower than 16:9, so the frame sits left on a 640x360 canvas in the map's background colour (23, 25, 31) and its right edge fades into it over 90px. 30fps, 214 frames, about 6.4MB.
- Clicking the card opens the tracker in place with the snowflake's animation (storm-map.js handles links to /elnino); modified clicks still open the link normally.

## Local preview
`python3 .claude/serve.py 4176` from this worktree (preview config `portfolio-personal-projects`). A plain click opens the tracker in place; /elnino itself is served by the Worker, so a new-tab open only works live or under `npx wrangler@4 dev`.

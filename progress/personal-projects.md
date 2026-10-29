# personal-projects

Branch `personal-projects` (from `main` at 8c0387e), worktree `.claude/worktrees/personal-projects`. Not pushed.

## Done
- Homepage: new Personal Projects section after Coming Soon, with an El Niño Tracker card that opens /elnino directly (no project page).
- Thumbnail `assets/thumbs/elnino.gif`: from Desktop/Portfolio 2026/Side Projects/Elnino/El nino tumbnail.mov, cropped to 16:9 (2190x1232 at x=6) so the card's left and top margins match (11px each at 640x360), 30fps, 214 frames, about 7MB. The card runs off the bottom edge, since the source is narrower than 16:9.

## Local preview
`python3 .claude/serve.py 4176` from this worktree (preview config `portfolio-personal-projects`). /elnino is served by the Worker, so the card's link only works live or under `npx wrangler@4 dev`.

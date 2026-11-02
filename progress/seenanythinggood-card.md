# seenanythinggood-card

Branch `seenanythinggood-card` (from `main` at a379a98), worktree `.claude/worktrees/seenanythinggood-card`. Not pushed.

## Done
- Personal Projects: a Seen Anything Good? card after El Niño Tracker, linking to /seenanythinggood/ (served by its own Worker, repo `~/code/seen-anything-good`).
- Thumbnail `assets/thumbs/seenanythinggood.jpg`, 800x450: the tracker's Films/Music/Shows/Games tabs over the newest posters sized by rating. It's rendered by `scripts/thumbnail.mjs` in the tracker repo, which also makes the link-preview image `assets/og.jpg` there.

## Local preview
`python3 .claude/serve.py 4196` from this worktree (preview config `portfolio-seenanythinggood-card`). The card's link only resolves live, since /seenanythinggood is another Worker.

# elnino-share-image

Branch `elnino-share-image` (from `main` at eb06720), worktree `.claude/worktrees/elnino-share-image`. Not pushed.

## Done
- `assets/elnino-share.jpg`, 1200x630: a still of the live tracker zoomed to California (one double-click in from the West view), with the six targets and the wind overlay, and the cards, tabs, top bar and snowflake hidden. It's a one-time capture, so the wind in it is from 2026-11-02.
- The Worker serves /elnino through HTMLRewriter, swapping the homepage's description, og: and twitter: tags for the tracker's (title "El Niño Tracker", the still above, `summary_large_image`, plus og:image width and height). The homepage's own tags are unchanged. The page's `<title>` is still the homepage's.

## Local preview
`npx wrangler@4 dev --port 4197` from this worktree; /elnino needs the Worker, so `serve.py` won't show the new tags.

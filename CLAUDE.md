# rdrew.com

Static portfolio site (HTML, CSS, JS). No build step.

## Parallel sessions
I often run several Claude sessions on this repo at the same time.
- Before editing any file, check whether you're in a worktree (your path contains `.claude/worktrees/`). If not, enter a new worktree named after the task first. Never edit files in the main checkout.
- Commit your work on the worktree's branch. Don't merge into main; tell me when it's ready and I'll merge.
- Write progress notes to `progress/<worktree-name>.md`, not to the shared `progress.md`.

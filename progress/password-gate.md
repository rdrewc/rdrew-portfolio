# password-gate

Branch `password-gate` (from `case-studies`), worktree `.claude/worktrees/password-gate`. Not pushed or deployed.

## Done
- `worker/index.js`: every request runs through a Worker first. Homepage and `/assets/` (thumbnails, CSS, JS) are public; all project pages, their media and the older prototypes need the password (tahoe, case-insensitive). Unlocking sets a session cookie, so it's asked once per browser session.
- `gate.html`: the password page, served at the locked URL itself. Homepage terrain backdrop with the Tahoe / Shasta / Whitney picker, theme toggle, one field; shakes on a wrong password.
- `wrangler.jsonc`: `main`, `ASSETS` binding, `run_worker_first`. `.assetsignore` keeps `worker/`, `CLAUDE.md` and `progress/` out of the deploy.

## Open
- The GitHub repo is public, so the case study files are readable there regardless of the gate. Decide whether to make it private before pushing.
- Merge into main and push to deploy (Ryan merges).

## Local preview
The Python preview doesn't run the Worker. To test the gate: `npx wrangler@4 dev --port 8787` from this worktree.

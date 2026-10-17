# case-study-edits

Branch `case-study-edits` (from `main`), worktree `.claude/worktrees/case-study-edits`. Not pushed or deployed.

## Done
- Pinned title keeps the h1's size and only slides into the left panel (wraps if it needs to).
- Role reads Lead Product Designer on every project; the Launch row is now Links everywhere.
- Remix: only the Discord Blog link.
- Facebook TV: new Early Explorations section after Project Overview, with the layout grid from the deck (text panel cropped off).
- Responsive project pages: the gap between columns never closes (40 to 96px). Phones and other fixed-size media scale to the work column (container query), so nothing spills into Details or scrolls the page sideways. Detail rows stack name over value when the panel can't fit the longest row. Checked on all eight projects from 320 to 1600px wide.

## Local preview
`python3 .claude/serve.py 4175` from this worktree. Preview config name: `portfolio-case-study-edits`.

# case-study-edits

Branch `case-study-edits` (from `main`), worktree `.claude/worktrees/case-study-edits`. Not pushed or deployed.

## Done
- Pinned title keeps the h1's size and only slides into the left panel (wraps if it needs to).
- Role reads Lead Product Designer on every project; the Launch row is now Links everywhere.
- Remix: only the Discord Blog link.
- Facebook TV: new Early Explorations section after Project Overview, with the layout grid from the deck (text panel cropped off).
- Responsive project pages: the gap between columns never closes (40 to 96px). Phones and other fixed-size media scale to the work column (container query), so nothing spills into Details or scrolls the page sideways. Detail rows stack name over value when the panel can't fit the longest row. Checked on all eight projects from 320 to 1600px wide.
- Project order (homepage grid and previous / next): Password Sharing, Remix, Player Profiles, Spatial Audio, Dynamic Ads, IGTV, Stage Channels, Facebook TV.
- Header, homepage top bar and footer: 90% page color with a 12px backdrop blur (--bar-bg, --bar-blur in site.css).
- Homepage: Netflix 2024 – 2026.
- Stage Channels renamed Video Stage Channels (page, homepage card, previous / next); Links goes to discord.com/stages.
- Confetti Live Trivia: new case study at /confetti/ from Figma file MHL7Xlp3lnMkCdbfZBa9Xz slides 33 to 44 (group 40000008:116844, top row). Last in the order, after Facebook TV. Phone screens cropped from the original design boards; page copy drafted from the slides and the board notes.
- Password gate now covers Spatial Audio only (PROTECTED_PATHS in worker/index.js); every other page is public. Homepage section renamed Shipped Projects.
- Confetti hero is now the launch video (Figma Slides 9YmdOTvrakijTRBFpqVezi node 401:162). Pulled from the video embedded in ~/Downloads/Ryan Slides local.fig (videos/be35eb99...), re-encoded to H.264 1600x900 30fps, 7.7MB. The TV still it replaced was removed.

## Open
- Confetti numbers disagree: the launch video shows 3,070,496 viewers per day, $1,004,139 in prize money and a Confetti Canada edition; the page says 30k daily live viewers across the USA, Mexico, and Indonesia.
- Confetti: Links row is still [Link]. Copy is a draft for Ryan to review (A Live Show First, Before / During / After Gameplay, Confetti Pages were written from the boards; the slide text under Key Animations and Confetti Pages was a placeholder). Learnings said "three North American countries" but the overview lists USA, Mexico, Indonesia, so the page says "between countries".
- Facebook Social Player: not in the linked group; waiting on its Figma link.

## Local preview
`python3 .claude/serve.py 4175` from this worktree. Preview config name: `portfolio-case-study-edits`.

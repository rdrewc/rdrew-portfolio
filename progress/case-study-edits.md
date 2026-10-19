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
- Confetti: A Live Show First is now the Live Trivia video (Figma YICBFWzEkZ78saTTyw9XES node 4023:131; from Ryan Slides local.fig videos/a4c81148...), cropped to the screen and shown in the site's phone frame. Phone stills re-cropped 1 to 5px tighter so no board background shows at the edges.
- All projects: 40px between copy and the media below it (28px on phones), 32px between stacked media (.story rules in case-study.css).
- Confetti: full state boards (Selected Works slides 56, 57, 101, 102; same source screenshots as the Ryan Slides local boards) with every title and note removed and the screens repacked into even rows. News Feed's board replaced; Before / During / After each get their board after the close-up phones.
- Facebook Social Player: new case study at /social-player/, last in the order after Confetti. From Selected Works slides (YICBFWzEkZ78saTTyw9XES node 6123:47057). All four media are the slide videos (Ryan Slides local.fig: shelf 474732d4, vertical 614e8818, sports 8f3b84c5, landscape b7824f95), cropped to the screen; the landscape one is the hero. Thumbnail composed from the three phone posters on Facebook blue.
- Password removed from every page (PROTECTED_PATHS is empty in worker/index.js).
- Spatial Audio and Player Profiles are assets only: the overview paragraph ends, after a blank line, with "*Launching in Q4 2026. Full case study coming soon." Spatial Audio keeps its three big videos (banner removed) and links to about.netflix.com/en/news/netflix-spatial-audio. Player Profiles shows Current dashboard, Player profile V1 and Full demo from Case Studies slide 401:77, with captions. Full demo is the video from Desktop/Portfolio 2026/Netflix/Player Profiles/trim.mov (H.264 960x564, 30fps), poster from the slide still.
- Links rows filled: Password Sharing (Netflix News), Player Profiles (Netflix Tudum), Dynamic Ads (Instagram for Business), Confetti (Facebook Newsroom). Not pushed yet.
- Social Player phones: modern-height phone frame at 330px (.phones.is-large), videos letterboxed in black (.screen.is-contain). Thumbnail rebuilt with the same proportions.
- Social Player Links: Facebook Newsroom (about.fb.com/news/2018/12/facebook-watch-what-weve-built-whats-ahead). Every project now has a real link.
- Homepage: "Currently available for full-time roles." Space above Shipped Projects is 67px on desktop (one bio line less than 96px); mobile unchanged at 56px.

## Open
- Social Player: The slide's Problems text was copied from Facebook TV (mentions TV), so the page keeps only the video-variety part. Slide 55 (Baseline) had no media, so it isn't on the page.
- Confetti: Copy is a draft for Ryan to review (A Live Show First, Before / During / After Gameplay, Confetti Pages were written from the boards; the slide text under Key Animations and Confetti Pages was a placeholder). Stats follow the launch video: 3 million daily viewers, $1 million in prizes, US / Canada / Mexico.

## Local preview
`python3 .claude/serve.py 4175` from this worktree. Preview config name: `portfolio-case-study-edits`.

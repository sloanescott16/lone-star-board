# Handoff: v116 Game Center clock (job 1010-1609-a00)

Branch game-clock in worktree builds/press-box/lsb-clock (repo sloanescott16/lone-star-board), from origin/main fc89a6e.
The college Game Center is this board (Press Box links to lone-star-board/?lg=cfb#game-<id>), so the fix is here.
The hub-clock worktree of the Press Box repo was made first and is unused (no commits).

## Cause
ESPN's college feed stamps a game clock only on plays whose text carries one ("(10:09) Shotgun ..." or "Timeout Oklahoma,
clock 03:43"). Every other play repeats the last stamp, and the board and summary header clock sit on it too. So in a
no-huddle drive with no timeout, every play and the header read 10:09. Mid-drive ESPN also files the live drive as
"N plays, Y yards, 0:00" with start "OU 0" (seen live again at 16:17: "TEX 3 plays, 23 yards, 0:00 from OU 0").
The page showed those values as they came.

## Fix (index.html, all marked v116)
- ckOf: a play's clock counts only when stamped (in its text, a new value, or a new period). Plays between two stamps
  share out the time between them; plays after the last stamp each take a typical slice (36 s, 7 s for incompletions,
  penalties and out of bounds, 6 s for kicks, 0 for timeouts), never more than the real time between the feed's wallclocks.
- ckLive (called at the end of ofGame): the header and pinned clock move on, marked "~", when ESPN's clock is still on
  the last stamp and plays have run since. A fresh ESPN clock is left alone.
- ckPlay: each play row shows its own clock, "~" where worked out.
- ckDrive: drive time from the play clocks when the drive is live or ESPN says 0:00; ESPN's own figure otherwise.
- ckFrom: drive start from the first snap's spot when ESPN's start is missing or on the goal line ("OU 0"); also used by
  the field graphic and the older drive panel.
- The pinned score bar now runs through ofGame too, so it shows the same clock as the header.

## How to run and test
- bun test _tests/game-clock  (6 tests on the saved feeds, including the Captain's moment rebuilt from the snapshot)
- bun _tests/game-clock/serve.js  (static server on 8716), then
  bun _tests/game-clock/live-check.js moment   (feeds as at his report, screenshots 390 and 1440 into shots/)
  bun _tests/game-clock/live-check.js live     (real ESPN feeds, prints page beside ESPN; ESPN calls go through curl
  because headless Chrome gets an HTML page from ESPN)
- Browser profile: _tests/game-clock/edge-profile, reused, git-ignored.
- Saved feeds: _tests/game-clock/fixtures (summary-*, scoreboard-* about every 90 s, live-summary-* from live runs).

## Unsure
- The worked-out clock is an estimate. At his moment it reads ~4:53 against TV 4:29 (24 s off).
- Scoreboard tiles and the Saturday ticker still show ESPN's board clock (they have no play list to work from).
- The win probability chart and its tooltip still place plays by ESPN's raw clock.
- This repo has no other checks; the page loaded with no page errors at 390 and 1440, live and on the saved feeds.
- Not pushed, not merged.

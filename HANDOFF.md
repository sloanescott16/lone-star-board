# Handoff: Saturday "Big plays" ticker jumps (job 1017-1402-5wo, 2026-10-17)

Branch ticker-smooth-5wo in worktree builds/press-box/lsb-tick5wo (repo sloanescott16/lone-star-board), from the live
head origin/main 8e872e9. Not pushed, not merged. Publishing needs the Captain's typed yes.

## What was wrong (measured, headless Chrome, mocked live Saturday, 24 s with plays landing on the 5 s polls)
- The animation engine itself was fine: one compositor animation, whole-pixel frames, no frames over 1.5x, no long
  main-thread tasks, no composite failures in the trace. Dropped frames in the trace 8 to 9 before, 6 to 8 after (noise).
- The fault was the content. Plays are newest first, so a new play went in at the front of the strip while the reel kept
  its offset: every play on screen slid along by the new play's width. An extra point relabels "TD + XP" and widens a
  play, which slid everything after it. Measured jumps of a play on screen at 1440: 994, 61, 428, 61, 449 px in 24 s.
- With one short play on a wide screen only two copies were made, so 819 px at the right of the track went blank.
- Phone (390, one play at a time): a new play swapped the play on show at once (6 of 8 changes under 4.5 s).

## The fix (index.html, all marked "5wo")
- New content waits (TKR.pend) until the plays on screen read the same, in the same order, in the new list (tkrSafe).
  Then it goes in with the offset moved so those plays stay exactly where they were. A changed play on screen scrolls
  off first. While hovered it waits. Out of sight it goes in at once. After 30 s, or if the strip is shorter than the
  track, it goes in anyway, anchored on the first play on screen.
- Enough copies to cover the track (1 + ceil(track / copy)); a resize only re-boxes if more copies are needed.
- Phone mode keeps the play on show for its full 5 s; if its own text changes it is updated in place.
- Reduced motion unchanged: no animation, new plays go straight in. Sunday's fantasy reel uses the same engine and
  gets the same benefit.

## Before and after (8e872e9 against this branch)
- diag.js, 1440: 5 jumps (61 to 994 px) before, 0 after. 390: 6 early swaps before, 0 after. Frame timing the same
  (median 16.7 ms). Logs: _tests/ticker-5wo/results/diag-*.log
- tick-jump.test.js: 18/23 before (fails on the jump at 1440 and 1280@1.5x, the blank on a short reel, the phone swap,
  and the hover hold), 23/23 after. Logs: results/tick-jump-*.log

## How to run
- From _tests/ticker-5wo: `bun tick-jump.test.js` (or give a path to another index.html). Set TEMP, TMP and PW_TMP to
  a scratch folder; the Chrome profile is made there and removed after. Sound muted, speech stubbed, no network.
- `bun diag.js <index.html> <label>` prints the measurements (and a trace summary).

## Older tests, honestly
- pc-test/cc-v112/test-sattick3-v112-mock.js on this branch: 215/228. The 13 failures are its own assumptions that a
  new play is on the reel on the very poll that brings it, with one rebuild, and that later samples see no rebuild;
  both are now deliberately deferred. The transform "jump" it reports during one loop sample is the anchored rebuild
  (the transform moves, the plays on screen do not; tick-jump checks that on screen).
- test-suntick-mock.js needed "two boxes" changed to "at least two" (copy in _tests/ticker-5wo/v112-copies): 159/178,
  all 16 failures are the same deferral assumptions (rerun after the resize fix; resize checks pass).

## Unsure of
- Headless Chrome runs at 60 Hz with software compositing; a real high-refresh monitor was not tested.
- No version marker was bumped; the publish step should tag it (next after v116) if wanted.
- A new play can take up to about 25 s at 1440 to appear while the plays around the loop point are on screen. That is
  the price of never moving what is on screen.

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

## Round 2 (checker's findings)
- Header never ahead of real time: up to the last snap as the plays say, then no more than the real time since that snap,
  and never more than the real time since the last real ESPN clock (CK.nowMs lets tests set "now"). With no play
  timestamps the header goes at most one typical play (36 s) past the real clock, and the plays keep ESPN's value.
- Overtime (period 5 and on): no estimate anywhere; ESPN's value or none.
- Clocks never go up within a quarter: a real clock higher than the one before is a correction; the plays before it in
  that quarter are lifted to it and marked "~", and estimates go on from it.
- Text clock vs ESPN's field: the text clock is shown, marked "~" (the field is the stale value this job is about; the
  text is the scorer's own note, but it is not ESPN's field, hence the mark).
- Legend "~ estimated" under the header clock and above the drive list when any clock shown is worked out; the pinned bar
  carries it as a tooltip.
- Tests: _tests/game-clock/round2.test.js (the checker's cases). The checker's fx.js still prints BACKWARDS for
  401856717328 in the 1624 and 1625 snapshots: its loop counts the live drive twice (ESPN lists it in previous and
  current); the page drops the copy, and the new test that does the same finds no clock going up.
- Feed capture loop stopped at 16:26; its last snapshots are committed.

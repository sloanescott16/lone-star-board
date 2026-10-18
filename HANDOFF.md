# Handoff: fantasy accuracy against the Sleeper app (job 1018-1644-bej, branch fan2-1018 from 54f96c1)

The Captain at 4:43 PM: ours said 131.7 v 93.5 and 95/5, Sleeper said 126.67 v 92.09 and 89/11.
- Sleeper has no public live projection or win probability feed (projections endpoint values stay pregame, the player and
  "live" variants tried return the same or a 404). So the in-game curve is fitted instead.
- Pregame projection is now the league-scored stat line (sum of projected stats x the league's scoring_settings), which
  is what Sleeper shows: Watson 18.54, Pickens 13.58, Kraft 13.21, Golden 15.67 match it exactly. The "since kickoff"
  baseline uses the same numbers.
- In progress: points + projection x rem^1.23 (FXL.share). Fitted on Cousins, McBride, Nacua, Dicker: all within 0.9 of
  Sleeper, totals 126.79 v 92.42. A pace blend was tried on paper and does not fit (McBride ran hot and Sleeper still cut him).
- Win chance: per-player spread 2.5 + k x projection (QB .38, RB .50, WR/TE/DEF .55, K .45) x sqrt(time left), same-team
  correlation .25 and same-game .10 in the variance of the difference (FXL.match), then a t distribution with 5 df.
  The 4:43 snapshot gives 88.9 v 11.1.
- Test: bun _tests/fan-1018/snapshot-1643.test.js prints before and after against Sleeper (13 checks).
- Unsure: one snapshot of four live players is a thin fit; the exponent and spread should be checked against a few more
  Sleeper readings. Day lines saved earlier today were drawn by the old model, so the line steps down at the update.

---

# Handoff: live fantasy projections and win chance (job 1018-1528-m21, 2026-10-18)

Branch fan-1018 in worktree builds/press-box/lsb-fan1018 (repo sloanescott16/lone-star-board), from the live head
origin/main 1d4eed5. Not pushed, not merged. Publishing needs the Captain's yes.

## What changed (index.html, search "fan-1018")
- FXL block (pure maths, between "fan-1018 FXL start" and "end"): remFrac (share of a game left from quarter and clock;
  1 before kickoff, 0 when final or a bye, overtime counts only its own clock), player (final = actual, not started =
  pregame projection, in progress = points + projection x share left; a defence blends projection into actual because its
  points-allowed tier is scored all at once), team (sum, plus spread), winProb (normal approximation), pct.
- Spread per player: 2 + k x projection for a full game (k: QB .30, RB .45, WR/TE/DEF .50, K .40), times the square root of
  the share left. Team spreads add as variances. Win chance = Phi((my live proj - their live proj) / sqrt(var sum)).
  Sleeper's public API has no win probability (the matchups feed carries points, starters, players_points only).
- renderFxHead: the matchup header, now redrawn on every board refresh (5 s while live) as well as every Sleeper poll
  (30 s). Shows live projection per side, arrows for the change since the last Sleeper refresh and since kickoff, the
  win chance in big type with a two-colour bar, and a line of win chance through the day.
- fxMark (each Sleeper poll): keeps the last refresh's numbers and appends to localStorage "lsb-fxwp-<season>-<week>-<roster>"
  (a point a minute or on a 1 percent move, last 720 kept). Line starts when the page is first opened that day.
  fxPrune, once per page load at the first refresh: removes lsb-fxwp- keys for any other season or week.
- Each lineup row: "proj X" before kickoff, live projection with an arrow against pregame while playing, "final · proj was X"
  after. A starter on a bye reads "bye", one with no team "no game".

## How to test
- bun _tests/fan-1018/fxl.test.js : unit tests on the real block from index.html.
- bun _tests/fan-1018/live-check.js : real Sleeper (read only) and ESPN (through curl). 1440 and 390 screenshots and
  live-HHMM.json go to C:\NIGEL-scratch\m21\shots (env SHOTS), outside the repo, so they never publish. One reused profile,
  C:\NIGEL-scratch\m21\profile (env PW_PROFILE); the pw-shim.js copy here honours it and deletes nothing. Audio muted, speech
  stubbed. Also checks that a stale week's day line is pruned and that bye and no-team starters read "bye" and "no game".
- Sunday ticker regression: _tests/ticker-5wo/v112-copies/test-suntick-mock.js on this file and on the live file.

## Unsure
- The spread constants are judgement, not fitted to data. The number feels like ESPN's but is not calibrated.
- Between Sleeper polls the clock keeps running while points wait for the next poll, so projections ease down a little
  and jump when points land. That is the "fluctuate" look, but it is partly feed lag.
- Day line lives in each browser's localStorage only, so phone and desktop each draw their own.

---

# Handoff: Saturday "Big plays" ticker jumps (job 1017-1402-5wo, 2026-10-17, round 2 after the checker)

Branch ticker-smooth-5wo in worktree builds/press-box/lsb-tick5wo (repo sloanescott16/lone-star-board), from the live
head origin/main 8e872e9. Not pushed, not merged. Publishing needs the Captain's typed yes.

## What was wrong (measured, headless Chrome, mocked live Saturday)
- The animation engine itself was fine: compositor animation, whole-pixel frames, no long tasks.
- The content was the fault. Plays are newest first, so a new play went in at the front of the strip and every play
  on screen slid along by its width (994, 61, 428, 61, 449 px jumps in 24 s at 1440). An extra point relabelling
  "TD + XP" widened a play on screen. One short play on a wide screen left 819 px blank. On a phone a new play swapped
  the play on show early.

## The fix (index.html, marked "5wo")
- Round 1 waited for a safe moment; the checker found new plays took up to 75 s to show, relabels 21 to 30 s, a forced
  30 s insertion that moved things, and a wait timer reset by each change. All of that is gone.
- Round 2 (tkrBuild, tkrDrop): on the next frame after new data, the plays on screen are moved, as they are (same
  nodes), into a lead-in box (.tkp) at the start of the strip, and the full list follows it, newest first (with nothing
  new, it carries on from the last play on screen), repeated enough to cover the track. The first play on screen keeps
  its exact place. So new plays come in from the right as soon as the play crossing the right edge has passed, and
  nothing on screen moves, pops, vanishes or changes wording. A play relabelled while on screen keeps its label until it
  scrolls off; the copies after it already say TD + XP. When the lead-in has scrolled off the left it is taken out and
  the reel loops on the copies (exact, both are whole steps).
- Phone: the play on show stays, unchanged, for its full 5 s (with only one play it is updated at once).
- Reduced motion, hover, hidden tab, no Web Animations: unchanged behaviour. Sunday's reel shares the engine.

## Tests (_tests/ticker-5wo)
- tick-jump.test.js (cases flow1440, flow1280 at 1.5x, two1440, short1440, short1920, hover, reduce, phone) uses the
  checker's every-play, every-frame sampler (sampler.js). Run from that folder: `bun tick-jump.test.js [index.html] [case ...]`,
  with TEMP, TMP and PW_TMP set to a scratch folder. After: 49/52. The three failures are the 3 s time-to-visible check
  at 1440, and it cannot pass without moving something on screen: the newest play shows exactly when the play crossing
  the right edge clears it (to within 40 ms every time), and with these plays (60ch of text, about 1000 px) that took
  5.6 to 15.1 s. Before (8e872e9, earlier version of the test): 24/52.
- Older tests: test-sattick3-v112 203/228, test-suntick (copy, "two boxes" relaxed) 149/178. The failures read the
  reel's first box as a full copy and expect two equal boxes, a new play in the first box on the poll that brings it,
  and the loop length unchanged; the first box is now the lead-in. Their "loop point seamless" screenshot check shows
  the picture moving the right 5 px (it fails only on the loop-length number).

## Unsure of
- Headless Chrome at 60 Hz with software compositing; a real high-refresh monitor was not tested.
- Getting new plays on screen within 3 s needs narrower plays (for example play text capped near 30ch on the reel) or
  letting the play at the right edge be pushed along, which is a visible move. That is the Captain's call.
- No version marker bumped.

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

## Option B (Captain's choice): short play lines
- tkShort in index.html ("5wo-B") makes the reel line from the feed text: "Manning 41-yd TD to Coleman", "Roberts 80-yd
  TD run", "Woodson picks off Taylor", "Carter recovers Brown fumble", "Dicker 45-yd FG wide left", "Lee Jr. 30-yd
  pick-six". Cap 36 characters (an optional tail is dropped first, then a shorter wording, then a word-boundary cut).
  It keeps the tidied feed text whole when the play was nullified, reversed or overturned, carries a live penalty or a
  conversion note that matters, or has a shape it does not know. The tap card still shows the full play text.
- Test: `bun _tests/ticker-5wo/short.test.js` (26/26: 20 real Saturday and Sunday strings, 4 fallbacks, cap, empty).
- Unsure: surnames only, so a two-word surname shows its last word ("Echeverria Lozano" shows "Lozano"); all-caps
  "SURNAME, First" feed text is not shortened (kept whole). Item width is still mostly label, logo, team and time, so
  bursts still take about 9 s per play at 1440.

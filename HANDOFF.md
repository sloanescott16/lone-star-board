# Handoff: simplify, v120 round 2 (job 1024-1750-si2, branch cc-simplify-si2). Staged, not published.

Round 2 (read this first; round 1's "Unsure" below is now answered):
- Final tests on v120: regress 58/66, the same 8 known 5wo timing fails as v119; tick-smooth 1920 no seen jumps, step miss
  0; hz-sim no held frames at 60, 120, 144, 165 Hz. Logs: pc-test\cc-v120\final-tests.log, final-tests2.log, regress-v120.log.
- "Draw skipped" was the test harness, not Chrome stalling. The headless window is smaller than the emulated 1920x1080
  page, so the ticker at the page foot is outside the display surface and viz clips its damage away. A bare test page with
  one div on a compositor translate: every draw skipped at the bottom or at top:1000px, every frame drawn at top:200 to
  800px, and every frame drawn at the bottom once the window is 2000x1400. The pulse only seemed to fix it because its
  damage was inside the window. Screencast frames (cast.js) show the reel moving at 61 px/s with no held frames with the
  pulse, without it, and with no game live. On a real window the ticker is inside the window, so this does not arise.
- No page fix needed. The one change is the comment on the top-bar pulse (index.html line 80): it stays as the live cue,
  not for the reel. It could go with no harm to the reel if the Captain wants it static too.
- Final GPU numbers: PROGRESS.md, round 2. Draw skipped 0 in all six runs. Run harness with PW_EXTRA="--window-size=2000,1400"
  (r2-final.sh) or its numbers are wrong for anything near the page foot. The v118 and v119 baselines in base-summ.log were
  taken with the small window; their ticker draws were carried by their pulses, so they are still fair for comparison.
- Unsure: one 50 ms main-thread task in the plays run (round 1 saw 34 ms there), likely the board redraw when the burst
  lands; not chased. Not seen in a visible window (no screen use allowed).

---
# Handoff: simplify for a smooth ticker, v120 (job 1024-1750-si2, branch cc-simplify-si2 from ead052d v119). Staged, not published.

What changed (index.html, search "v120"):
- Live dots on game cards, the game centre and the On air bar are static: no pulse, no glow. The one top-bar live chip dot
  keeps its pulse (see Unsure). Every dot is still there, so "live" still shows.
- Confetti is off (confetti() returns at once). Final cards, banners and the final sheet are unchanged. The Tech kickoff
  tortillas (v109) are kept: a deliberate tradition, a few seconds once a game; the Captain may want them gone too.
- Clock and "Updated Ns ago" are written only when the text changes, in place on the text node; "Updated" sits in a fixed
  width contain: strict box.
- The board replaces only the game cards whose markup changed (patchKids), not the whole board each poll.
- Home and Schedule panels not on screen draw in idle time (requestIdleCallback, 1.5 s timeout); a view switch draws
  them first (idleFlush in route()).
- fitBoard skips its layout read after a redraw when card count, window, body class and head text length are unchanged.
- Not changed: the reel (5wo lead-in logic, two boxed copies; the 13208 px width only while new plays scroll in, rastered
  3 times in 20 s), will-change (already reel only), no backdrop-filter or animated gradients found.

How to test (builds\press-box\pc-test\cc-v120, TEMP/TMP C:\NIGEL-scratch\1024-1750-si2):
- bash runall.sh <label> <page>: steady, refresh (clocks change each poll, no plays) and plays runs, 20 s, GPU on; summ.js
  prints one line per run. base-summ.log has v118 and v119, v120.log has v120 and the stage-1-only variant.
- bash tests.sh: tick-smooth 1920, hz-sim, regress (58/66 expected, the 8 known 5wo timing fails).
- probe.js <page>: the reel runs and is on screen. cmp-names.js <traceA> <traceB>: event count differences.

Unsure: with every pulse gone the GPU trace showed Viz skipping every draw (Draw skipped 3286, renderer DroppedFrame 3287)
while the reel animation runs (probe.js shows it moving). One pulse back and every frame draws. This may be a headless
quirk, but it is not explained. When no game is live the chip is hidden, so that case has no pulse at all. Needs a look
in a visible window (with his OK) or a further trace. Final v120 trace and test runs were started at the cap; the logs
are final-v120.log and final-tests.log in pc-test\cc-v120, not read by the builder.

---
﻿# Handoff: ticker round 3, v119 (job 1024-1509-yxc, branch ticker-smooth-yxc3 from 88e8b17 v118). Staged, not published.

The PC: Windows primary is the Acer XF273 S at 1920x1080 165 Hz; the Dell P2319H to its left is 1920x1080 60 Hz. The
Helm's Chrome window sits on the Dell. Windows 10 Chrome takes its frame clock from the primary display: even headless it
drew at 6.06 ms (165 Hz). On the 60 Hz Dell that means each shown frame carries 3, 3, 3 then 2 of Chrome's frames, so the
reel moves 1.09, 1.09, 1.09, 0.73 px per shown frame at 60 px/s, a 15 Hz wobble no page change can remove
(pc-test/cc-v119/mixed-sim.js). The fix for that is on the PC (watch on the Acer, or make the Dell primary, or run the
Acer at 120 Hz so the frames divide evenly); that is the Captain's call, nothing was changed.

What the GPU trace showed on the page itself (pc-test/cc-v119, bun gpu-trace.js <page|url> <label> [secs], PW_GPU=1):
the reel runs on the compositor, its layer is never re-rastered, no checkerboarding, pulses are composited. But v118's
rAF loop polled the lead-in every frame while new plays scrolled in (2212 calls in 20 s), forcing a main frame on every
display frame. v119 sleeps on a timer instead (index.html, "v119"). Also ?tk=N sets the speed (20 to 300 px/s, kept in
localStorage cc-tkpxs) so he can try 90 or 120 on his own screen; default stays 60.

How to test: gpu-trace.js as above (steady with STEADY=1), trace-dig.js, dig2.js, dig3.js on the saved trace in
C:\NIGEL-scratch\1024-1509-yxc. tick-smooth.js, hz-sim.js and regress as for v118 (cc-v118).
Unsure: the 165 Hz frame clock on a window on the Dell is inferred from headless and how Chrome works on Windows 10, not
seen in a visible window. The live page had no plays on the reel when traced.

---
# Handoff: smooth bottom ticker, v118 (job 1024-1509-yxc, branch ticker-smooth-yxc from 4fac9d8 v117). Staged, not published.

What was wrong: the reel was already a Web Animations transform on the compositor, but v111 to v117 locked it to the
display: it measured the frame rate with requestAnimationFrame and, above 60 Hz, used steps() easing so it moved 1 device
px every 2nd frame at 120 Hz and every 3rd frame at 144 and 165 Hz (48 and 55 px a second). On a fast monitor the text
sits still for 2 frames, then hops: stutter. It also re-wrote the animation's startTime every 2 seconds (phase lock),
and any small error in the measured rate makes the holds uneven. At 60 Hz it was fine, which is why headless checks passed.

What v118 does (index.html, search "v118"): one linear translate3d loop over boxed copies, 60 CSS px a second on every
display (duration = copy width / speed), nothing measured, no re-seek, no steps. The rAF loop never moves the reel; it
only builds new content (the 5wo lead-in logic is unchanged, so plays on screen stay put), drops the lead-in, runs the
phone card, then sleeps. .ticker and .track have contain: layout paint; the reel has will-change: transform and its own
layer from the start. Reduced motion: unchanged (no animation, the strip scrolls by hand). There is no cache name or
version label in this file, so the version marker is the "v118" comments and the commit messages, as v117 did.

How to test (from builds\press-box\pc-test\cc-v118, bun, TEMP/TMP set to C:\NIGEL-scratch\1024-1509-yxc):
- bun tick-smooth.js <page> <label> [w h dpr] : 10 s steady, refresh and added-play runs, frame timings, transform steps,
  every play's on-screen x per frame, animation writes, trace counts. Results in result-<label>.json.
- bun hz-sim.js <page> <label> : what the animation draws at 60/120/144/165 Hz.
- regress\tick-jump.test.js <page> : the 5wo jump suite, run with the profile-keeping shim.

Not sure of: headless Chrome draws at 60 Hz only, so the fast-display result is read from the animation's own timing
(hz-sim), not seen on a real 144 Hz panel. Sub-pixel motion on the compositor layer is smooth but text may be a touch
softer than v117's whole-pixel stops; I did not judge that by eye. A refresh still costs one 33 ms main-thread frame
(both versions, from the board redraw); the reel is on the compositor so it should not hitch, but that was not proven on a GPU.

Fix round 2 (page fix in commit 3037714; the PROGRESS line in bc74bf0 is round 1's late note, superseded by this):
- Hover "jump" was the harness, not the page. regress/sampler.js learns the reel speed from its first 20 frames; the
  hover case puts the mouse on the reel right after starting the sampler, so all 20 frames were held and it learned
  0 px/ms (now printed: deltas all 0, reel paused). After the mouse left, every normal 1 px move read as a miss. v117 hid
  this because its reel only starts after its 1 s frame-rate measure. Sampler fixed (learns only from running frames).
  v118's resume by play() is fine: no jumps at 0.5 px tolerance after the fix.
- Timing checks (burst within 20 s, newest within 3 s at 1440) are pre-existing: v117 burst 10.2, 19.4, 30.6 s, worst
  10.2 s; v118 10.1, 19.3, 30.4 s, worst 10.1 s. Both equal the time the play at the right edge needs to clear (5wo design).
- One real v118 fault: with reduced motion the reel kept its standing translate3d, so its transform was not "none".
  The reduced-motion CSS now sets transform none and will-change auto. Reduce and hover cases 6/6 after.
- Logs in pc-test/cc-v118/regress: run-v118-r2.log (full suite 57/66 before the CSS fix: 8 timing fails plus reduce),
  run-v118-r2-reduce.log (after), run-v117.log (hover1440, flow1440, hover: 20/24, only the timing checks fail).
  Frame timings in pc-test/cc-v118/timing-r2.log: v118 60 px/s, step miss 0, seen jump 0, one 33 ms frame on refresh,
  no compositor failures; hz-sim v118 no held frames at 60 to 165 Hz, v117 holds 60, 96, 110 frames a second at 120/144/165.
- Not rerun: the full suite after the CSS fix (only the cases it touches).

---

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
- Each lineup row: "proj X" before kickoff, live projection with an arrow against pregame while playing, "final Â· proj was X"
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
# Handoff: v117 Next One Up countdown (job 1019-1149-un1)

Branch countdown-fix-1019, worktree C:\NIGEL-scratch\1019-un1\wt, off main ba383c9 (v116). Not merged, pushed or deployed.

## Cause
Home tab, regroup mode, card "Next one up": `days = Math.ceil((nx.date - Date.now()) / 86400000)`. That is elapsed time
rounded up, so on Mon 19 Oct at 11:49 AM CT the 7 days 7.4 hours to Mon 26 Oct 7:15 PM came out as 8.

## Fix (index.html, marked v117)
- `ctDayNo(d)`: the Central (America/Chicago) calendar date of a moment, via Intl formatToParts, as a day number.
- `ctDaysUntil(d, now)`: game's Central date minus today's Central date, never below 0. Ignores the device's own zone
  and DST (the day number comes from the Central Y-M-D, not from hours).
- The card uses `ctDaysUntil(nx.date)`. Wording unchanged: "N days", "1 day", 0 is "Kickoff today. Straight to it."

## Tests
- `bun test _tests` (all): 24 pass, 0 fail. New file `_tests/countdown/countdown.test.js` (10 tests): 19 Oct any time to
  26 Oct 7:15 PM = 7, 25 Oct 11:59 PM CT = 1, 26 Oct 00:01 CT = game day, never negative, 1 Nov fall back and 14 Mar
  spring forward, UTC date vs Central date near midnight, device clock in UTC, Pacific and Tokyo. Also passes with TZ set
  to UTC, America/Los_Angeles and America/Chicago for the whole run.
- Browser: `bun _tests/countdown/browser-check.js <shots dir> <profile dir>` serves the worktree on 8791, live ESPN and
  Sleeper feeds through curl, fakes Date, overrides the device time zone, stubs speech and audio, headless.
  Results: now 7 (Central and UTC device), 19 Oct 23:59:30 CT 7, 20 Oct 00:00:30 CT 6, 25 Oct 23:59 CT 1 (also Pacific),
  26 Oct 00:01 CT Kickoff today (also Pacific), 19 Oct 23:30 CT with a UTC device 7. No page errors.
  Screenshots in C:\NIGEL-scratch\1019-un1\shots.

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
- The card only shows after a Cowboys loss (regroup mode), so the browser check relies on the live week 6 loss at Green
  Bay; on the faked later dates the feed is still today's real one, only the clock is moved.
- No version marker is visible on the page; versions are marked in code comments and commit messages, as v116 did.

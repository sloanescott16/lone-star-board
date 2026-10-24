# Ticker smooth, v118 (job 1024-1509-yxc), branch ticker-smooth-yxc from 4fac9d8 (v117)

- Stage 1 (15:4x): harness pc-test/cc-v118/tick-smooth.js and hz-sim.js. At 60 Hz headless v117 is already clean
  (no step misses, no visible jumps). The cause is the display-locked engine: at 120/144/165 Hz v117 uses steps() and
  moves 1 px every 2nd or 3rd frame (48 to 60 moves a second, held 60 to 110 frames a second), plus a startTime re-seek
  every 2 s. v118: one linear translate3d loop at 60 CSS px/s on every display, no measuring, no re-seek, loop sleeps
  when idle, ticker contained in its own layer. Stage 1 code committed.
- Stage 2 (16:0x): measured. 60 Hz headless both clean; hz-sim v117 at 144 Hz 48 moves/s with 96 held frames a second, v118 144 moves/s, 0 held. 5wo jump suite (regress/) on v118: hover case shows a steady 1 px per-frame miss after the mouse leaves; burst-within-20 s and 3 s checks fail; v117 comparison run in progress at the cap. Not yet resolved.
- Fix round 2 (15:2x to 15:3x): hover miss was the harness, not the page. The sampler learned its speed from its first 20 frames, but the hover case puts the mouse on the reel straight after starting it, so all 20 were held frames and it learned 0 px/ms (logged: deltas all 0, reel paused). Every moving frame after the mouse left then read as a 1 px miss. v117 hid it because its reel only starts after its 1 s frame-rate measure. Sampler fixed (learns only from running frames); v118 hover case now has no jumps at 0.5 px. Timing checks: v117 fails them the same way (burst 10.2, 19.4, 30.6 s; worst 10.2 s), v118 10.1, 19.3, 30.4 s; pre-existing, from the 5wo design (a new play waits for the play at the right edge). Full suite on v118 found reduced motion failing (standing translate3d layer); fixed in CSS, commit 3037714. Full v118 suite 57/66 before that fix (8 fails are the two pre-existing timing checks in four 1440 cases, plus reduced motion); reduce and hover cases rerun after it, 6/6. Full suite not rerun after the CSS fix. Frame timings rerun: clean.
- Suite finished after handback: v118 56 ok, v117 44 ok. The burst 20 s and 3 s timing fails are the same on v117 (inherited). Real v118 regressions: (1) hover1440 1 px per-frame miss after the mouse leaves, (2) "reduced motion: no animation on the reel" fails (likely the loop sleeping before tkrStop runs, or the stop path). Fix these two next.

---

# Fantasy accuracy against Sleeper (job 1018-1644-bej), branch fan2-1018 from 54f96c1

- 16:5x: league-scored pregame projections, in-game share rem^1.23, wider spread, same-game correlation, t(5). Snapshot test 13/13 (126.79 v 92.42, 88.9 v 11.1; Sleeper 126.67 v 92.09, 89 v 11). Unit tests 30/30.
- 16:49 live check: 75.04 v 61.02, proj 125.1 v 92.3, pregame 134.0 v 102.7, win chance 88.5 v 11.5, no page errors, prune and bye checks pass. Shots in C:/NIGEL-scratch/m21/shots (1648). Day line now always reaches the right edge.

---

# Live fantasy projections and win chance (job 1018-1528-m21)

Branch fan-1018, worktree builds/press-box/lsb-fan1018, from origin/main 1d4eed5 (live).

- Stage 1 (15:45): FXL maths block in index.html (remFrac, player, team, winProb), renderFxHead with live projections, arrows, win chance bars and the day's line (localStorage lsb-fxwp-*), per-player live projection cells. Not yet tested.
- Stages 2 to 4 (15:44): unit tests 30/30 (_tests/fan-1018/fxl.test.js). Live check on real Sleeper and ESPN at 3:41 PM: 62.62 vs 58.30, live proj 139.3 vs 93.6 (pregame 135.5 vs 105.4), win chance 96.3 percent, no page errors, scoreboard still draws 4 live tiles; shots in _tests/fan-1018/shots (1540). Sunday ticker test: 148/178 on this file, 147/178 on the live file, no check fails here that passes on live. Done, not pushed.
- Checker fixes (16:0x): day lines for other weeks pruned once per load; screenshots and live JSON moved to C:/NIGEL-scratch/m21/shots and removed from the repo; pw-shim.js copy honours PW_PROFILE and deletes nothing; bye and no-team starters read "bye" and "no game". Unit tests 30/30.

---

# Saturday ticker smooth (job 1017-1402-5wo)

Branch ticker-smooth-5wo, worktree builds/press-box/lsb-tick5wo, from origin/main 8e872e9 (live).

- Stage 1 done: diagnosis harness in _tests/ticker-5wo (diag.js). Live version: the reel animation itself is steady
  (composited, whole-pixel frames, no long tasks), but every new play or extra point moves what is on screen:
  jumps of 994, 61, 428, 61 and 449 px in 24 s at 1440. Cause: plays are newest first, so a new play is put in at the
  front of the strip and the reel keeps the same offset, which slides every visible play along; an extra point
  relabels "TD + XP" and widens an item. On a phone the shown play is swapped early (6 of 8 changes under 4.5 s).
- Stage 2 done: fix in index.html ("5wo"): new content waits for a moment nobody sees and goes in anchored, copies cover
  the track, phone keeps the play on show. tick-jump.test.js 23/23 after, 18/23 on live 8e872e9. See HANDOFF.md.
- Round 2 done (checker fail): new plays go in past the right edge on the next frame (lead-in box keeps what is on
  screen), no waiting, no forced insertion; phone keeps the play on show unchanged. tick-jump 49/52 (the three misses are
  the 3 s time-to-visible check at 1440: worst 15.1 s, exactly the time the play at the right edge needs to clear).
- Round 3 (16:05): the lead-in now keeps each play's exact sub-pixel gap and starts with a sub-pixel pad, so the offset is
  a whole step with no rounding (the 1.5 to 2 px hop at rebuilds came from packing the plays and rounding the offset).
  Still 1 px at the first rebuild after a mouse hold (hover test at 0.5 px fails). New plays from one refresh go in as
  one group after plays still waiting; bursts arrive back to back, but the third play of a burst needs about 27 s at
  1440 (each play is about 750 px), so the 20 s burst check fails.
- Option B (16:4x, Captain chose B): short play text on the reel. tkShort (index.html, "5wo-B") turns the feed text into
  "Manning 41-yd TD to Coleman", "Roberts 80-yd TD run", "Woodson picks off Taylor", "Dicker 45-yd FG wide left"; cap 36
  characters; keeps the tidied feed text whole when a play was nullified, reversed, overturned or carries a live penalty,
  or the shape is unknown. The tap card still shows the full play. short.test.js 25/25 (19 real Saturday and Sunday
  strings, 4 fallbacks). Over 621 real scoring and take plays: average 76 characters before, 23 after, 5 kept whole.
- Option B stage 2: "for 45 yds" completions read too (harness string). short.test.js 26/26. tick-jump (all cases but
  phone, run before this last fix): same 9 checks fail as round 3 and no new ones; no jumps in flow1440, flow1280, two1440,
  short1440, short1920; the hover case keeps its known 1 px hop on the pre-loaded plays. phone 3/3. flow1440 after the
  fix: worst time to visible 10.2 s (was 15.1 s), burst 10.2, 19.4, 30.6 s (was 15.1, 27.4, 42.1 s).
- Option B fix round 1 (checker FAIL on 206e529): reversed / overturned / nullified / no play / defensive two-point read
  on the whole text first; an interception fumbled back kept whole; TD printed only when the words say touchdown (or the
  scoring-summary shape "N Yd pass from / Run / Return"); a long passing TD keeps the scorer ("Turner-Bradshaw 3-yd TD
  catch"); "J. Echeverria Lozano" keeps the whole surname. short.test.js 41/41. Checker's harness over 439 plays: 391
  shortened, 48 kept whole, an automatic check (yards, names, TD, misses against the full text) flags none wrong.

# Round 3 (job 1024-1509-yxc, branch ticker-smooth-yxc3 from 88e8b17 v118, worktree wt3)

- Stage 1 (15:2x): displays read only. Windows primary is DISPLAY2, Acer XF273 S, 1920x1080 at 165 Hz (pos 0,0).
  DISPLAY1 is the Dell P2319H, 1920x1080 at 60 Hz, to the left. Mixed refresh. The Helm's Chrome window sits on the Dell.
  GPU harness pc-test/cc-v119/gpu-trace.js (headless=new, ANGLE d3d11, GPU raster): GPU is the RX 6700 XT, gpu
  compositing enabled, raster enabled_force; Chrome draws at 6.06 ms (165 Hz) even headless, so it takes vsync from the
  primary. v118 on the GPU: reel on the compositor, reel layer 13208 x 26, 9 raster tasks in 20 s, no checkerboard;
  but the ticker rAF loop ran 2212 times in 20 s (it polls the lead-in every frame), so there is a main frame on every
  display frame; 484 frames presented partial, 4 dropped, 5 missed vsyncs.
- Stage 2: v119a, the loop sleeps on a timer while the lead-in scrolls off. Measuring.

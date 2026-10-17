# Saturday ticker smooth (job 1017-1402-5wo)

Branch ticker-smooth-5wo, worktree builds/press-box/lsb-tick5wo, from origin/main 8e872e9 (live).

- Stage 1 done: diagnosis harness in _tests/ticker-5wo (diag.js). Live version: the reel animation itself is steady
  (composited, whole-pixel frames, no long tasks), but every new play or extra point moves what is on screen:
  jumps of 994, 61, 428, 61 and 449 px in 24 s at 1440. Cause: plays are newest first, so a new play is put in at the
  front of the strip and the reel keeps the same offset, which slides every visible play along; an extra point
  relabels "TD + XP" and widens an item. On a phone the shown play is swapped early (6 of 8 changes under 4.5 s).

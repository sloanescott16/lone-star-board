# v116 game clock (job 1010-1609-a00)

Branch game-clock, worktree builds/press-box/lsb-clock, from origin/main fc89a6e.
The Game Center lives in this repo (lone-star-board), not in the Press Box hub; hub-clock was made first and left unused.

- Stage 3 done (16:20): live freeze caught again, ESPN 2:00 and "0:00 from OU 0", page ~1:03 and "~2:40 from TEX 35". browser checks (moment and live) at 390 and 1440, no page errors; see HANDOFF.md.
- Stage 2 done: fix in index.html (ckOf, ckLive, ckPlay, ckDrive, ckFrom), tests in _tests/game-clock (bun test _tests/game-clock).
- Stage 1 done: live ESPN feeds for Texas at Oklahoma (event 401856717) saved in _tests/game-clock/fixtures, about every 90 s.
- Cause: ESPN's college feed only stamps a game clock on plays whose text carries one ("(10:09)" or "clock 03:43").
  Every other play repeats the last stamped clock, and the board and header clock stay on it too, so a no-huddle drive with
  no timeout reads 10:09 throughout. Mid-drive ESPN also files the drive as "0:00" from "OU 0".

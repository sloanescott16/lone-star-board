// fan2-1018: the Captain's 4:43 PM snapshot (18 Oct 2026, Week 6), our numbers before and after, against the Sleeper app.
// bun snapshot-1643.test.js   Real points from Sleeper's matchups feed at 4:45 PM (totals matched the app: 73.54 vs 61.02).
// Pregame projections: Sleeper's projections feed, PPR column (what the page used before) and league-scored (what it uses now).
const fs = require("fs"), path = require("path");
const page = fs.readFileSync(path.join(__dirname, "..", "..", "index.html"), "utf8");
const FXL = new Function(page.match(/\/\* fan-1018 FXL start[\s\S]*?\/\* fan-1018 FXL end \*\//)[0] + "\nreturn FXL;")();
let pass = 0, fail = 0; const ok = (c, n) => { if (c) pass++; else { fail++; console.log("FAIL", n); } };
const G = (state, period, clock) => ({ state, period, clock });
const FIN = G("post", 4, "0:00"), PRE = G("pre", 0, "0:00");
// name, pos, team, game, clock, points at 4:43, pregame PPR, pregame league-scored, Sleeper live proj at 4:43 (where the Captain read it)
const MINE = [
  ["Cousins", "QB", "LV", "BUF-LV", G("in", 2, "0:09"), 5.04, 17.68, 16.29, 11.97],
  ["Irving", "RB", "TB", "PIT-TB", FIN, 6.9, 14.51, 14.52],
  ["Hubbard", "RB", "CAR", "CAR-PHI", FIN, 24.1, 16.03, 16.04],
  ["Watson", "WR", "GB", "DAL-GB", PRE, 0, 18.56, 18.54, 18.54],
  ["Pickens", "WR", "DAL", "DAL-GB", PRE, 0, 13.57, 13.59, 13.58],
  ["McBride", "TE", "ARI", "ARI-LAR", G("in", 3, "11:17"), 8.6, 16.4, 16.37, 13.65],
  ["Nacua", "WR", "LAR", "ARI-LAR", G("in", 3, "11:17"), 3.6, 22.69, 22.63, 12.63],
  ["Boswell", "K", "PIT", "PIT-TB", FIN, 17, 7.77, 5.84],
  ["Seahawks", "DEF", "SEA", "SEA-DEN", FIN, 8.3, 8.34, 10.17],
];
const OPP = [
  ["Rodgers", "QB", "PIT", "PIT-TB", FIN, 14.52, 16.37, 15.17],
  ["Henry", "RB", "BAL", "BAL-CLE", FIN, 5, 17.89, 17.88],
  ["Kamara", "RB", "NO", "NO-NYG", FIN, 14.9, 9.8, 9.77],
  ["Odunze", "WR", "CHI", "CHI-ATL", FIN, 6.9, 9.7, 9.72],
  ["Doubs", "WR", "GB", "X", FIN, 15.2, 9.43, 9.41],
  ["Kraft", "TE", "GB", "DAL-GB", PRE, 0, 13.2, 13.21, 13.21],
  ["Golden", "WR", "GB", "DAL-GB", PRE, 0, 15.68, 15.67, 15.67],
  ["Dicker", "K", "LAC", "LAC-KC", G("in", 2, "0:44"), 3, 7, 5.73, 5.19],
  ["Texans", "DEF", "HOU", "HOU-JAX", FIN, 1.5, 6.34, 6.17],
];
const SLEEPER = { a: 126.67, b: 92.09, p: 0.89 };
const sumPts = l => l.reduce((s, x) => s + x[5], 0);
ok(Math.abs(sumPts(MINE) - 73.54) < 0.01 && Math.abs(sumPts(OPP) - 61.02) < 0.01, "points match the app: 73.54 vs 61.02");

// BEFORE: the fan-1018 model (PPR projections, linear time share, narrow spread, normal, no correlation), copied here as it shipped
const OLD = { QB: 0.30, RB: 0.45, WR: 0.50, TE: 0.50, K: 0.40, DEF: 0.50 };
function before(L) { let live = 0, v = 0, pre = 0; for (const x of L) { const rem = FXL.remFrac(x[4]), P = x[6], pts = x[5];
  live += x[1] === "DEF" ? rem * P + (1 - rem) * pts : pts + rem * P; const sd = (2 + OLD[x[1]] * P) * Math.sqrt(rem); v += sd * sd; pre += P; } return { live, v, pre }; }
const bA = before(MINE), bB = before(OPP), bP = FXL.phi((bA.live - bB.live) / Math.sqrt(bA.v + bB.v));
// AFTER: the page's real block
const item = x => ({ pts: x[5], proj: x[7], pos: x[1], rem: FXL.remFrac(x[4]), gid: x[3], tm: x[2] });
const M = FXL.match(MINE.map(item), OPP.map(item));
const f = n => n.toFixed(2), pc = p => (p * 100).toFixed(1) + "%";
console.log(`             Sleeper app      before (fan-1018)        after (fan2-1018)`);
console.log(`Totals       ${f(SLEEPER.a)} v ${f(SLEEPER.b)}  ${f(bA.live)} v ${f(bB.live)}          ${f(M.a.live)} v ${f(M.b.live)}`);
console.log(`Win chance   89% v 11%        ${pc(bP)} v ${pc(1 - bP)}          ${pc(M.p)} v ${pc(1 - M.p)}`);
console.log(`Pregame      (league)         ${f(bA.pre)} v ${f(bB.pre)}          ${f(M.a.pre)} v ${f(M.b.pre)}`);
for (const x of [...MINE, ...OPP].filter(x => x[8] != null)) {
  const old = x[5] + FXL.remFrac(x[4]) * x[6], now = FXL.player(item(x)).live;
  console.log(`${x[0].padEnd(12)} Sleeper ${f(x[8]).padStart(6)}   before ${f(old).padStart(6)}   after ${f(now).padStart(6)}   off by ${f(now - x[8])}`);
  ok(Math.abs(now - x[8]) <= 1.0, `${x[0]} within 1 point of Sleeper (${f(now)} v ${x[8]})`);
}
ok(Math.abs(M.a.live - SLEEPER.a) <= 1 && Math.abs(M.b.live - SLEEPER.b) <= 1, "team totals within 1 point of Sleeper");
ok(Math.abs(M.p - SLEEPER.p) <= 0.03, `win chance within 3 points of Sleeper's 89 (${pc(M.p)})`);
ok(Math.abs(bA.live - SLEEPER.a) > 3 && bP > 0.93, "the old model was off, as the Captain saw (131.7 v 93.5, 95 v 5)");
// correlation matters: the same lineups with no shared games are less certain for the side whose players share a game with the opponent's
const Mn = FXL.match(MINE.map(x => ({ ...item(x), gid: x[3] + "a" })), OPP.map(x => ({ ...item(x), gid: x[3] + "b" })));
ok(Mn.sd > M.sd, `same-game players with opposite owners cancel some swing (${f(M.sd)} with, ${f(Mn.sd)} without)`);
console.log(`${fail ? "FAILED" : "PASSED"} ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);

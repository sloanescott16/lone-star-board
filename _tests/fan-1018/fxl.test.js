// fan-1018: unit tests for the live projection and win chance maths, run against the real block in index.html. bun fxl.test.js
const fs = require("fs"), path = require("path");
const page = fs.readFileSync(path.join(__dirname, "..", "..", "index.html"), "utf8");
const m = page.match(/\/\* fan-1018 FXL start[\s\S]*?\/\* fan-1018 FXL end \*\//);
if (!m) throw new Error("FXL block not found");
const FXL = new Function(m[0] + "\nreturn FXL;")();
let pass = 0, fail = 0;
const ok = (c, name) => { if (c) pass++; else { fail++; console.log("FAIL", name); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const G = (state, period, clock) => ({ state, period, clock });

// game time left
ok(FXL.remFrac(G("pre", 0, "0:00")) === 1, "pre is 1");
ok(FXL.remFrac(G("post", 4, "0:00")) === 0, "final is 0");
ok(FXL.remFrac(null) === 0, "bye is 0");
ok(near(FXL.remFrac(G("in", 1, "15:00")), 1), "kickoff is 1");
ok(near(FXL.remFrac(G("in", 2, "0:00")), 0.5), "halftime is 0.5");
ok(near(FXL.remFrac(G("in", 3, "7:30")), 0.375), "mid 3rd");
ok(near(FXL.remFrac(G("in", 4, "2:00")), 120 / 3600), "2 min left");
ok(near(FXL.remFrac(G("in", 5, "4:47")), 287 / 3600), "overtime: only the overtime clock is left");
ok(near(FXL.remFrac(G("in", 4, "0:42.3")), 42 / 3600), "tenths on the clock");

// one player
let r = FXL.player({ pts: 0, proj: 15, pos: "RB", rem: 1 });
ok(r.state === "up" && near(r.live, 15) && near(r.sd, FXL.sdFull("RB", 15)), "not started keeps projection, full spread");
r = FXL.player({ pts: 22.4, proj: 15, pos: "RB", rem: 0 });
ok(r.state === "done" && near(r.live, 22.4) && r.sd === 0, "finished locked at actual, no spread");
r = FXL.player({ pts: 8, proj: 16, pos: "WR", rem: 0.5 });
ok(r.state === "live" && near(r.live, 16) && near(r.sd, FXL.sdFull("WR", 16) * Math.sqrt(0.5)), "half time: points plus half the projection");
r = FXL.player({ pts: 3, proj: 20, pos: "QB", rem: 0.25 });
ok(near(r.live, 8), "quarter left: 3 + 5");
r = FXL.player({ pts: 10, proj: 7, pos: "DEF", rem: 0.75 });
ok(near(r.live, 0.75 * 7 + 0.25 * 10), "defence blends projection into actual");
r = FXL.player({ pts: 0, proj: null, pos: "WR", rem: 1 });
ok(near(r.live, 0) && r.sd > 0, "no projection: zero, small spread");

const T = list => FXL.team(list);
// all done
let a = T([{ pts: 20, proj: 15, pos: "QB", rem: 0 }, { pts: 12, proj: 14, pos: "WR", rem: 0 }]);
let b = T([{ pts: 18, proj: 15, pos: "QB", rem: 0 }, { pts: 10, proj: 14, pos: "WR", rem: 0 }]);
ok(near(a.live, 32) && a.sd === 0 && near(a.pre, 29), "all done: team is the sum of actuals");
ok(FXL.winProb(a, b) === 1 && FXL.winProb(b, a) === 0, "all done: winner 100, loser 0");
ok(FXL.winProb(a, a) === 0.5, "all done and tied: 50");
ok(FXL.pct(1, false) === "100%" && FXL.pct(1, true) === ">99%" && FXL.pct(0.001, true) === "<1%", "percent text");

// none started
const lineup = (projs, rem = 1, pts = 0) => projs.map(([pos, proj]) => ({ pts, proj, pos, rem }));
const myL = [["QB", 20], ["RB", 15], ["RB", 12], ["WR", 16], ["WR", 13], ["TE", 9], ["WR", 11], ["K", 8], ["DEF", 7]];
const opL = [["QB", 17], ["RB", 11], ["RB", 9], ["WR", 13], ["WR", 10], ["TE", 7], ["WR", 9], ["K", 7], ["DEF", 6]];
a = T(lineup(myL)); b = T(lineup(opL));
const sum = x => x.reduce((s, [, p]) => s + p, 0);
ok(near(a.live, sum(myL)) && near(b.live, sum(opL)), "none started: live equals pregame");
let p = FXL.winProb(a, b);
ok(p > 0.5 && p < 0.95, "none started, 111 vs 89: favourite but not certain (" + p.toFixed(3) + ")");
ok(near(FXL.winProb(a, a), 0.5), "none started, same lineups: 50");
ok(near(FXL.winProb(a, b) + FXL.winProb(b, a), 1, 1e-7), "both sides add to 100");

// mid game: same score gap, less time left means a surer result
const atRem = rem => [T(lineup(myL, rem, 0).map(x => ({ ...x }))), T(lineup(opL, rem, 0))];
const pMid = (() => { const A = T([{ pts: 40, proj: 30, pos: "QB", rem: 0.5 }]), B = T([{ pts: 30, proj: 30, pos: "QB", rem: 0.5 }]); return FXL.winProb(A, B); })();
const pLate = (() => { const A = T([{ pts: 40, proj: 30, pos: "QB", rem: 0.1 }]), B = T([{ pts: 30, proj: 30, pos: "QB", rem: 0.1 }]); return FXL.winProb(A, B); })();
ok(pMid > 0.5 && pLate > pMid, "10 point lead counts for more late (" + pMid.toFixed(3) + " then " + pLate.toFixed(3) + ")");
a = T([{ pts: 12, proj: 20, pos: "QB", rem: 0.5 }, { pts: 0, proj: 15, pos: "RB", rem: 1 }, { pts: 18, proj: 12, pos: "WR", rem: 0 }]);
ok(near(a.live, 12 + 10 + 15 + 18) && near(a.pre, 47), "mid game team sum");
ok(near(a.sd, Math.sqrt(Math.pow(FXL.sdFull("QB", 20), 2) * 0.5 + Math.pow(FXL.sdFull("RB", 15), 2))), "spread shrinks with games finished");

// big lead late
a = T([{ pts: 120, proj: 100, pos: "QB", rem: 0 }, { pts: 4, proj: 12, pos: "WR", rem: 0.05 }]);
b = T([{ pts: 80, proj: 100, pos: "QB", rem: 0 }, { pts: 2, proj: 14, pos: "WR", rem: 0.05 }]);
p = FXL.winProb(a, b);
ok(p > 0.999, "40 point lead, one player with 3 minutes left: over 99.9 (" + p + ")");
ok(FXL.pct(p, true) === ">99%", "shows >99% while a game is still on");
// trailing by little with lots left is close to a coin
a = T([{ pts: 30, proj: 25, pos: "QB", rem: 0 }, ...lineup(myL.slice(1), 1)]);
b = T([{ pts: 33, proj: 25, pos: "QB", rem: 0 }, ...lineup(myL.slice(1), 1)]);
p = FXL.winProb(a, b);
ok(p > 0.4 && p < 0.5, "3 behind with eight to play: just under half (" + p.toFixed(3) + ")");

// normal CDF sanity
ok(near(FXL.phi(0), 0.5, 1e-7) && near(FXL.phi(1.96), 0.975, 1e-4) && near(FXL.phi(-1), 0.1587, 1e-4), "phi");

console.log(`${fail ? "FAILED" : "PASSED"} ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);

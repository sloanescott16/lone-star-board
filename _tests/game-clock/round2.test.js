// v116 round 2: the checker's cases (header never ahead of real time, no overtime estimate, clocks never go up, text vs field clock).
import { test, expect, beforeEach } from "bun:test";
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8");
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error("cut " + a); return html.slice(i, j); };
const M = new Function("GC", [cut("const OF = {", "\n"), cut("function ofFlat(sum)", "function ofPlayOf"),
  cut("const CK = { map", "/* =====================================================================\r\n   ESPN: scoreboard"),
  'const ordinal = n => ({1:"1st",2:"2nd",3:"3rd",4:"4th"}[n] || (n > 4 ? "OT" : ""));',
  "return { CK, ckOf, ckLive, ckDrive, ckPlay, setSum: s => { GC.sum = s; } };"].join("\n"))({ sum: null });
const T0 = Date.parse("2026-10-10T20:00:00Z"); let id = 0;
const P = (per, raw, text, type, wsec) => ({ id: String(++id), period: { number: per }, clock: raw == null ? undefined : { displayValue: raw }, text, type: { text: type },
  wallclock: wsec == null ? undefined : new Date(T0 + wsec * 1000).toISOString(), start: { possessionText: "TEX 30" } });
const sec = s => { const v = String(s).split(" ").pop().replace("~", ""); if (!v.includes(":")) return null; const [m, x] = v.split(":").map(Number); return m * 60 + x; };
function setup(plays, nowSec) {
  const d = { plays, description: "x", timeElapsed: { displayValue: "0:00" }, start: { text: "OU 0" } };
  const sum = { drives: { previous: [], current: d } }; M.setSum(sum); M.CK.nowMs = nowSec == null ? null : T0 + nowSec * 1000;
  return { sum, d, rows: plays.map(p => M.ckPlay(p)) };
}
const header = (sum, per, clock, status = "In Progress") => { const g = { live: true, period: per, clock, status }; M.ckLive(g, sum); return g; };
beforeEach(() => { id = 0; M.CK.nowMs = null; });

test("1. header right after a snap: never ahead of real time (2-minute drill, 5 s after the snap)", () => {
  const { sum } = setup([P(4, "2:00", "(02:00) Shotgun pass complete for 12", "Pass Reception", 0), P(4, "2:00", "pass complete for 8", "Pass Reception", 5)], 10);
  const g = header(sum, 4, "2:00");
  expect(sec(g.clock)).toBeGreaterThanOrEqual(120 - 10);   // 10 s of real time since the real 2:00
});
test("1. header capped by real time since the last real clock, even with many plays", () => {
  const { sum } = setup([P(2, "8:00", "(08:00) rush 3", "Rush", 0), P(2, "8:00", "rush 3", "Rush", 20), P(2, "8:00", "rush 3", "Rush", 40), P(2, "8:00", "rush 3", "Rush", 60)], 70);
  const g = header(sum, 2, "8:00");
  expect(g.clockEst).toBe(true); expect(sec(g.clock)).toBeGreaterThanOrEqual(480 - 70);
});
test("1. no play timestamps: no more than one typical play past the real clock", () => {
  const ps = [P(4, "2:00", "(02:00) rush 3", "Rush", null)]; for (let i = 0; i < 4; i++) ps.push(P(4, "2:00", "rush 3", "Rush", null));
  const { sum, rows } = setup(ps, 9999);
  const g = header(sum, 4, "2:00");
  expect(sec(g.clock)).toBeGreaterThanOrEqual(120 - 36);
  for (const r of rows) expect(sec(r)).toBeGreaterThanOrEqual(sec(g.clock));   // the header never reads below a play
});
test("2. overtime: no estimate, ESPN's value or none", () => {
  for (const raw of ["0:00", "15:00", null]) {
    id = 0;
    const { sum, d, rows } = setup([P(5, raw, "Shotgun rush for 3", "Rush", 0), P(5, raw, "pass for 10", "Pass Reception", 40), P(5, raw, "rush 2", "Rush", 80)], 200);
    for (const r of rows) expect(r.includes("~")).toBe(false);
    for (const r of rows) expect(r).toBe(("OT " + (raw || "")).trim());
    const g = header(sum, 5, raw || ""); expect(g.clockEst).toBeUndefined(); expect(g.clock).toBe(raw || "");
    expect(M.ckDrive(d, true).est).toBe(false);
  }
});
test("3. a real clock higher than the one before is a correction: shown clocks never go up within a quarter", () => {
  const { rows } = setup([P(2, "10:17", "(10:17) rush 3", "Rush", 0), P(2, "10:17", "rush 4", "Rush", 40), P(2, "10:17", "pass 9", "Pass Reception", 80),
    P(2, "11:52", "Timeout Texas, clock 11:52", "Timeout", 120), P(2, "11:52", "rush 2", "Rush", 160), P(2, "11:52", "rush 5", "Rush", 200)], 210);
  const s = rows.map(sec);
  for (let i = 1; i < s.length; i++) expect(s[i]).toBeLessThanOrEqual(s[i - 1]);
  expect(rows[3]).toBe("2nd 11:52");                         // ESPN's corrected clock stands
  expect(rows[0].includes("~")).toBe(true);                  // the plays before it are lifted, marked
  expect(s[5]).toBeLessThan(s[3]);                           // estimates go on from the correction (a timeout takes no game time)
});
test("3. the checker's 5:00 then 5:10 case", () => {
  const { rows } = setup([P(2, "5:00", "(05:00) rush for 3", "Rush", 0), P(2, "5:00", "rush 4", "Rush", 40), P(2, "5:00", "rush 5", "Rush", 80), P(2, "5:10", "(05:10) rush 6", "Rush", 120)], 130);
  const s = rows.map(sec); for (let i = 1; i < s.length; i++) expect(s[i]).toBeLessThanOrEqual(s[i - 1]);
});
test("4. text clock differs from ESPN's field: the text clock is shown, marked ~", () => {
  const { rows } = setup([P(2, "6:00", "(06:00) rush 3", "Rush", 0), P(2, "6:00", "Timeout Oklahoma, clock 05:20", "Timeout", 50), P(2, "5:20", "(05:20) rush 4", "Rush", 90)], 100);
  expect(rows[1]).toBe("2nd ~5:20");
  expect(rows[2]).toBe("2nd 5:20");
  expect(rows[0]).toBe("2nd 6:00");
});
test("saved feeds: no clock goes up within a quarter, and no clock outside 0 to 15:00", () => {
  const FX = path.join(__dirname, "fixtures");
  for (const f of fs.readdirSync(FX).filter(f => /summary.*\.json$/.test(f))) {
    const sum = JSON.parse(fs.readFileSync(path.join(FX, f), "utf8")); M.setSum(sum); const m = M.ckOf(sum);
    let last = null, lp = null; const seen = new Set();
    for (const d of [...sum.drives.previous, sum.drives.current].filter(Boolean)) for (const p of d.plays || []) {
      if (seen.has(p.id)) continue; seen.add(p.id); const c = m.get(p.id); if (!c || c.s == null) continue; const per = p.period.number;
      expect(c.s).toBeGreaterThanOrEqual(0); expect(c.s).toBeLessThanOrEqual(900);
      if (lp === per && !/end (of )?(period|quarter|half)|end period/i.test(p.type?.text || "")) expect(c.s).toBeLessThanOrEqual(last);
      last = c.s; lp = per;
    }
  }
});

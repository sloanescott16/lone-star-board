// v116 game clock checks against the saved Texas at Oklahoma feeds. Run: bun test _tests/game-clock
import { test, expect } from "bun:test";
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8");
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error("cut " + a); return html.slice(i, j); };
const src = [
  cut("const OF = {", "\n"), cut("function ofFlat(sum)", "function ofPlayOf"),
  cut("const CK = { map", "/* =====================================================================\r\n   ESPN: scoreboard"),
  'const ordinal = n => ({1:"1st",2:"2nd",3:"3rd",4:"4th"}[n] || (n > 4 ? "OT" : ""));',
  "return { ckOf, ckLive, ckDrive, ckFrom, ckPlay, setSum: s => { GC.sum = s; } };",
].join("\n");
const M = new Function("GC", src)({ sum: null });
const FX = path.join(__dirname, "fixtures");
const load = f => JSON.parse(fs.readFileSync(path.join(FX, f), "utf8"));
const sums = fs.readdirSync(FX).filter(f => /^summary-\d+\.json$/.test(f)).sort();
const sec = s => { const [m, x] = s.split(" ").pop().replace("~", "").split(":").map(Number); return m * 60 + x; };

// The Captain's moment: 21:08:41Z, after the 3rd and 15 catch, before the field goal. ESPN had every play at 10:09.
function atCaptainsMoment() {
  const j = load(sums[0]);
  const drives = j.drives.previous.slice();
  const ou = JSON.parse(JSON.stringify(drives[drives.length - 1]));
  ou.plays = ou.plays.filter(p => p.wallclock <= "2026-10-10T21:08:41Z");
  ou.description = "10 plays, 41 yards, 0:00"; ou.timeElapsed = { displayValue: "0:00" }; ou.start = { ...ou.start, yardLine: 0, text: "OU 0" };
  drives[drives.length - 1] = ou;
  return { drives: { previous: drives.slice(0, -1), current: ou }, header: j.header };
}

test("snapshots saved", () => { expect(sums.length).toBeGreaterThan(0); });

test("header clock moves on from a stuck 10:09 at the Captain's moment (TV 4:29)", () => {
  const sum = atCaptainsMoment(); M.setSum(sum);
  const g = { live: true, period: 2, clock: "10:09", status: "In Progress" };
  M.ckLive(g, sum);
  expect(g.clockEst).toBe(true);
  expect(Math.abs(sec(g.clock) - sec("4:29"))).toBeLessThanOrEqual(75);
});

test("each play in the stuck drive gets its own, falling clock", () => {
  const sum = atCaptainsMoment(); M.setSum(sum);
  const rows = sum.drives.current.plays.map(p => M.ckPlay(p));
  const after = rows.slice(2);   // kickoff and first snap are stamped 10:09
  expect(rows[0]).toBe("2nd 10:09"); expect(rows[1]).toBe("2nd 10:09");
  expect(new Set(after).size).toBe(after.length);
  for (let i = 1; i < after.length; i++) expect(sec(after[i])).toBeLessThanOrEqual(sec(after[i - 1]));
  expect(after.every(r => r.includes("~"))).toBe(true);
});

test("live drive time and start are right, not 0:00 from OU 0", () => {
  const sum = atCaptainsMoment(); M.setSum(sum);
  const d = sum.drives.current, ck = M.ckDrive(d, true);
  expect(ck.est).toBe(true); expect(sec(ck.te)).toBeGreaterThan(240);
  expect(M.ckFrom(d)).toBe("OU 25");
});

test("saved snapshots: plays between two stamps fit between them, and a fresh board clock is left alone", () => {
  for (const f of sums) {
    const sum = load(f); M.setSum(sum);
    const m = M.ckOf(sum);
    const prev = sum.drives.previous; const ou = prev.find(d => d.description === "11 plays, 40 yards, 6:26");
    if (ou) {
      const s = ou.plays.map(p => m.get(p.id).s);
      for (let i = 1; i < s.length; i++) expect(s[i]).toBeLessThanOrEqual(s[i - 1]);
      expect(s[0]).toBe(609); expect(s[s.length - 1]).toBe(223);
      expect(M.ckDrive(ou, false).te).toBe("6:26");   // ESPN's own figure, once it is right
    }
    const hc = sum.header.competitions[0].status;
    const g = { live: true, period: hc.period, clock: hc.displayClock, status: hc.type.description };
    const before = g.clock; M.ckLive(g, sum);
    if (!g.clockEst) expect(g.clock).toBe(before); else expect(sec(g.clock)).toBeLessThan(sec(before));
  }
});

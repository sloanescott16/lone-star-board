// Prints what v116 shows at the Captain's moment (21:08:41Z, TV 4:29). Run: bun test _tests/game-clock/show.test.js
import { test } from "bun:test";
test("show", () => {
  const fs = require("fs"), path = require("path");
  const html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8");
  const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); return html.slice(i, j); };
  const M = new Function("GC", [cut("const OF = {", "\n"), cut("function ofFlat(sum)", "function ofPlayOf"), cut("const CK = { map", "/* =====================================================================\r\n   ESPN: scoreboard"),
    'const ordinal = n => ({1:"1st",2:"2nd",3:"3rd",4:"4th"}[n] || "");', "return { ckLive, ckDrive, ckFrom, ckPlay, set: s => { GC.sum = s; } };"].join("\n"))({});
  const FX = path.join(__dirname, "fixtures"), f = fs.readdirSync(FX).filter(f => /^summary-\d+\.json$/.test(f)).sort()[0];
  const j = JSON.parse(fs.readFileSync(path.join(FX, f), "utf8")), prev = j.drives.previous.slice();
  const ou = JSON.parse(JSON.stringify(prev[prev.length - 1])); ou.plays = ou.plays.filter(p => p.wallclock <= "2026-10-10T21:08:41Z");
  ou.timeElapsed = { displayValue: "0:00" }; ou.start = { ...ou.start, yardLine: 0, text: "OU 0" };
  const sum = { drives: { previous: prev.slice(0, -1), current: ou } }; M.set(sum);
  const g = { live: true, period: 2, clock: "10:09", status: "In Progress" }; M.ckLive(g, sum);
  console.log("header", g.clock, g.clockEst ? "(est)" : "", "| drive", M.ckDrive(ou, true), "from", M.ckFrom(ou));
  for (const p of ou.plays) console.log("  ", M.ckPlay(p), String(p.text).slice(0, 50));
});

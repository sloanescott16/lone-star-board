// Summarise a saved summary + scoreboard pair: header clock, board clock, current drive and its last plays.
const fs = require("fs");
for (const f of process.argv.slice(2)) {
  const j = JSON.parse(fs.readFileSync(f));
  const sbf = f.replace("summary-", "scoreboard-");
  let bc = "";
  try { const e = JSON.parse(fs.readFileSync(sbf)).events.find(e => e.id === "401856717"); bc = e.status.displayClock + " p" + e.status.period; } catch {}
  const h = j.header.competitions[0].status;
  const d = j.drives?.current;
  console.log(f.slice(-11, -5), "hdr", h.displayClock, "p" + h.period, "board", bc, "| cur:", d ? `${d.team?.abbreviation} "${d.description}" start=${JSON.stringify(d.start?.text)}/${d.start?.yardLine} ${d.start?.clock?.displayValue} end=${d.end?.clock?.displayValue} te=${d.timeElapsed?.displayValue}` : "none");
  if (d) for (const p of (d.plays || []).slice(-3)) console.log("    ", p.clock?.displayValue, p.wallclock, String(p.text).slice(0, 70));
}

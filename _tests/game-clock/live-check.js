/* v116 browser check of the Game Center for Texas at Oklahoma (event 401856717). bun _tests/game-clock/live-check.js live|moment
   live:   the page on the real ESPN feeds; prints what it shows beside what ESPN's summary says at the same moment.
   moment: ESPN's feeds as they stood at the Captain's report (every play and the clock at 10:09, drive "0:00" from "OU 0"),
           rebuilt from the saved snapshot. Screenshots at 390 px and 1440 px into shots/. Needs serve.js running on 8716.
   One browser profile, edge-profile/ here, reused by every run and never removed. */
process.env.PW_PROFILE = process.env.PW_PROFILE || require("path").join(__dirname, "edge-profile");
const { chromium } = require("./pw-shim.js");
const fs = require("fs"), path = require("path");
const mode = process.argv[2] || "live", ID = "401856717", FX = path.join(__dirname, "fixtures");
const stamp = new Date().toTimeString().slice(0, 8).replace(/:/g, "");
function momentFeeds() {
  const sf = fs.readdirSync(FX).filter(f => /^summary-\d+\.json$/.test(f)).sort()[0];
  const sum = JSON.parse(fs.readFileSync(path.join(FX, sf), "utf8")), prev = sum.drives.previous.slice();
  const ou = JSON.parse(JSON.stringify(prev[prev.length - 1]));
  ou.plays = ou.plays.filter(p => p.wallclock <= "2026-10-10T21:08:41Z");
  ou.description = "10 plays, 41 yards, 0:00"; ou.timeElapsed = { displayValue: "0:00" }; ou.start = { ...ou.start, yardLine: 0, text: "OU 0" };
  ou.end = { ...ou.end, clock: { displayValue: "10:09" } }; delete ou.result; delete ou.displayResult; delete ou.shortDisplayResult;
  sum.drives = { previous: prev.slice(0, -1), current: ou };
  const st = sum.header.competitions[0].status; Object.assign(st, { displayClock: "10:09", clock: 609 });
  const sb = JSON.parse(fs.readFileSync(path.join(FX, sf.replace("summary-", "scoreboard-")), "utf8"));
  const e = sb.events.find(x => x.id === ID), c = e.competitions[0], lp = ou.plays[ou.plays.length - 1];
  for (const s of [e.status, c.status]) Object.assign(s, { displayClock: "10:09", clock: 609 });
  c.situation.lastPlay = { ...c.situation.lastPlay, id: lp.id, text: lp.text, type: lp.type };
  return { sum, sb };
}
(async () => {
  const F = mode === "moment" ? momentFeeds() : null;
  const b = await chromium.launch(), out = {};
  for (const [w, h, nm] of [[390, 844, "phone"], [1440, 1000, "desktop"]]) {
    const page = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 })).newPage();
    const errs = []; page.on("pageerror", e => errs.push(e.message));
    await page.route("**/*", r => {
      const u = r.request().url();
      if (F && /site\.api\.espn\.com\/.*college-football\/summary/.test(u)) return r.fulfill({ json: F.sum });
      if (F && /site\.api\.espn\.com\/.*college-football\/scoreboard/.test(u)) return r.fulfill({ json: F.sb });
      if (/\.espn\.com\//.test(u)) {   // headless Chrome gets an HTML page from ESPN, so live ESPN calls go through curl (still the real live feed)
        try { return r.fulfill({ body: require("child_process").execFileSync("curl", ["-s", "--max-time", "15", u]).toString(), contentType: "application/json" }); } catch (e) { return r.abort(); }
      }
      return r.continue();
    });
    await page.goto(`http://localhost:8716/?lg=cfb#game-${ID}`);
    try { await page.waitForFunction(() => /\d:\d\d/.test(document.querySelector("#gcPin")?.textContent || "") && document.querySelector(".gc-dr"), undefined, { timeout: 25000 }); } catch (e) { errs.push("timeout waiting for the game center"); }
    await page.waitForTimeout(1500);
    out[nm] = await page.evaluate(() => {
      const t = s => (document.querySelector(s)?.textContent || "").replace(/\s+/g, " ").trim();
      const cur = document.querySelector(".gc-dr.cur") || document.querySelector(".gc-dr");
      return { header: t(".gc-top .gc-st") || t("#gcPin .mid"), pin: t("#gcPin .mid"),
        drive: cur ? (cur.querySelector(".dr-main")?.textContent || "").replace(/\s+/g, " ").trim() : "",
        plays: cur ? [...cur.querySelectorAll(".dr-plays li .pl-dd small")].slice(0, 14).map(x => x.textContent) : [] };
    });
    out[nm].errors = errs;
    const shot = path.join(__dirname, "shots", `${mode}-${nm}-${stamp}.png`);
    fs.writeFileSync(shot, Buffer.from(await page.screenshot({ fullPage: nm === "desktop" ? false : false }), "base64"));
    out[nm].shot = path.basename(shot);
    await page.close();
  }
  if (mode === "live") {
    const raw = require("child_process").execFileSync("curl", ["-s", `https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event=${ID}`]).toString();
    const j = JSON.parse(raw); fs.writeFileSync(path.join(FX, `live-summary-${stamp}.json`), raw);
    const st = j.header.competitions[0].status, d = j.drives?.current;
    out.espn = { clock: `${st.period} ${st.displayClock}`, drive: d ? `${d.team?.abbreviation} ${d.description} from ${d.start?.text}` : "", plays: (d?.plays || []).slice(-6).reverse().map(p => p.clock?.displayValue) };
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });

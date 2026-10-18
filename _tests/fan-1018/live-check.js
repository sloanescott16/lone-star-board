/* fan-1018 live check: the Fantasy page on today's real feeds (Sleeper read-only, ESPN through curl), at 390 and 1440 wide.
   bun _tests/fan-1018/live-check.js   (starts its own static server on 8731). Speech and audio stubbed, audio muted.
   One browser profile, C:\NIGEL-scratch\m21\profile, reused and never removed (pw-shim.js here honours PW_PROFILE and deletes nothing).
   Screenshots and numbers go to C:\NIGEL-scratch\m21\shots (SHOTS), outside the repo, so they never publish. */
process.env.PW_PROFILE = process.env.PW_PROFILE || "C:/NIGEL-scratch/m21/profile";
const { chromium } = require("./pw-shim.js");
const fs = require("fs"), path = require("path"), cp = require("child_process");
const root = path.join(__dirname, "..", "..");
const SHOTS = process.env.SHOTS || "C:/NIGEL-scratch/m21/shots";   // outside the repo, so screenshots never publish
Bun.serve({ port: 8731, fetch(req) { let p = new URL(req.url).pathname; if (p.endsWith("/")) p += "index.html"; return new Response(Bun.file(root + p)); } });
const stamp = new Date().toTimeString().slice(0, 5).replace(":", "");
const WAIT = +(process.env.WAIT || 40000);
fs.mkdirSync(path.join(SHOTS), { recursive: true });
(async () => {
  const b = await chromium.launch(), out = {};
  for (const [w, h, nm] of [[1440, 1000, "desktop"], [390, 844, "phone"]]) {
    const page = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 })).newPage();
    const errs = []; page.on("pageerror", e => errs.push(e.message));
    await page.addInitScript(() => {
      const s = { speak() {}, cancel() {}, pause() {}, resume() {}, getVoices: () => [], speaking: false, pending: false, addEventListener() {} };
      try { Object.defineProperty(window, "speechSynthesis", { value: s, configurable: true }); } catch (e) {}
      HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
      if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", "1"); localStorage.setItem("lsb-fxwp-2026-5-9", "[{\"t\":1,\"p\":0.5}]"); }   // a stale week, which the page must prune
    });
    await page.route("**/*", r => {
      const u = r.request().url();
      if (/\.espn\.com\//.test(u)) {
        try { return r.fulfill({ body: cp.execFileSync("curl", ["-s", "--max-time", "15", u]).toString(), contentType: "application/json" }); } catch (e) { return r.abort(); }
      }
      return r.continue();
    });
    await page.goto("http://localhost:8731/#fantasy");
    try { await page.waitForFunction(() => document.querySelector("#fxHead .fx-wp"), undefined, { timeout: 60000 }); } catch (e) { errs.push("timeout waiting for the win chance block"); }
    await page.waitForTimeout(nm === "desktop" ? WAIT : 6000);   // desktop waits past one Sleeper refresh so the 'last refresh' arrows show
    out[nm] = await page.evaluate(() => {
      const t = s => (document.querySelector(s)?.textContent || "").replace(/\s+/g, " ").trim();
      const L = typeof fxLive === "function" ? fxLive() : null, sl = S.sleeper;
      const side = m => (m?.starters || []).filter(p => p && p !== "0").map(pid => { const x = fxPlayerIn(pid, m.players_points?.[pid]); const r = FXL.player(x); return `${(sl.players?.[pid] || [pid])[0]} ${x.pts.toFixed(1)}/${x.proj.toFixed(1)} rem ${x.rem.toFixed(2)} -> ${r.live.toFixed(1)}`; });
      const sl2 = S.sleeper; sl2.proj.__t = 5; sl2.players.__t = ["Test Bye", "WR", "BYE"]; const byeTxt = fxProjCell("__t", 0); sl2.players.__t = ["Test None", "WR", ""]; const noneTxt = fxProjCell("__t", 0); delete sl2.proj.__t; delete sl2.players.__t;
      const staleGone = localStorage.getItem("lsb-fxwp-2026-5-9") === null, fxKeys = Object.keys(localStorage).filter(k => k.startsWith("lsb-fxwp-"));
      return { byeTxt, noneTxt, staleGone, fxKeys, time: new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago" }), me: sl.me?.name, opp: sl.opp?.name,
        pts: [sl.mine?.points, sl.oppM?.points], live: L && [L.a.live.toFixed(1), L.b.live.toFixed(1)], pre: L && [L.a.pre.toFixed(1), L.b.pre.toFixed(1)],
        sd: L && [L.a.sd.toFixed(1), L.b.sd.toFixed(1)], p: L && L.p, head: t("#fxHead"), rows: document.querySelectorAll("#roster [data-lp]").length,
        mine: side(sl.mine), theirs: side(sl.oppM), hist: store.get(fxWpKey(), []).length, trace: S.fxl && S.fxl.trace, ref: S.fxl && S.fxl.ref, poll: S.fxl && S.fxl.poll, mineAt: Object.fromEntries((sl.mine?.starters||[]).map(p=>[(sl.players?.[p]||[p])[0], sl.mine.players_points?.[p]])), board: document.querySelectorAll("#board .bg, #board > *").length };
    });
    out[nm].errors = errs;
    const shot = path.join(SHOTS, `fantasy-${nm}-${w}-${stamp}.png`);
    fs.writeFileSync(shot, Buffer.from(await page.screenshot({}), "base64"));
    out[nm].shot = shot;
    if (nm === "desktop") {   // the scoreboard still draws
      await page.evaluate(() => { location.hash = "#scores"; });
      await page.waitForTimeout(3000);
      out.scores = await page.evaluate(() => ({ tiles: document.querySelectorAll("#view-scores .bg").length, text: (document.querySelector("#view-scores")?.textContent || "").replace(/\s+/g, " ").slice(0, 160) }));
      const s2 = path.join(SHOTS, `scores-desktop-${stamp}.png`); fs.writeFileSync(s2, Buffer.from(await page.screenshot({}), "base64")); out.scores.shot = s2;
    }
    await page.close();
  }
  fs.writeFileSync(path.join(SHOTS, `live-${stamp}.json`), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1).slice(0, 6000));
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

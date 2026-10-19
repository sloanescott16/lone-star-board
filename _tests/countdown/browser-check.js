/* v117 browser check of the Home tab's "Next one up" card with the clock faked. bun _tests/countdown/browser-check.js <shots dir> <profile dir>
   Serves this worktree on 8791, feeds go through curl (live ESPN and Sleeper, nothing else leaves the PC), speech and audio stubbed.
   Each case: a fake "now" and a device time zone; prints the card's countdown line and saves a screenshot. */
const path = require("path"), fs = require("fs");
const SHOTS = process.argv[2] || path.join(__dirname, "shots"); fs.mkdirSync(SHOTS, { recursive: true });
process.env.PW_PROFILE = process.argv[3] || path.join(__dirname, "edge-profile");
const { chromium } = require("../game-clock/pw-shim.js");
const root = path.join(__dirname, "../..");
Bun.serve({ port: 8791, fetch(req) { let p = new URL(req.url).pathname; if (p.endsWith("/")) p += "index.html"; return new Response(Bun.file(root + p)); } });
const cache = {};
const CASES = [
  ["now", null, "America/Chicago"],
  ["now-utc", null, "UTC"],
  ["19oct-2359ct", "2026-10-19T23:59:30-05:00", "America/Chicago"],
  ["20oct-0000ct", "2026-10-20T00:00:30-05:00", "America/Chicago"],
  ["25oct-2359ct", "2026-10-25T23:59:00-05:00", "America/Chicago"],
  ["26oct-0001ct", "2026-10-26T00:01:00-05:00", "America/Chicago"],
  ["19oct-2330ct-utc", "2026-10-19T23:30:00-05:00", "UTC"],
  ["26oct-0001ct-pacific", "2026-10-26T00:01:00-05:00", "America/Los_Angeles"],
  ["25oct-2359ct-pacific", "2026-10-25T23:59:00-05:00", "America/Los_Angeles"],
];
const fake = at => `(() => {
  const R = Date, off = ${at ? Date.parse(at) : 0} ? ${at ? Date.parse(at) : 0} - R.now() : 0;
  class D extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off); } static now() { return R.now() + off; } }
  window.Date = D;
  const ss = { speak() {}, cancel() {}, pause() {}, resume() {}, getVoices: () => [], speaking: false, pending: false, addEventListener() {}, removeEventListener() {} };
  try { Object.defineProperty(window, "speechSynthesis", { value: ss, configurable: true }); } catch (e) {}
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
})();`;
(async () => {
  const b = await chromium.launch(), out = [];
  for (const [nm, at, tz] of CASES) {
    const page = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
    const errs = []; page.on("pageerror", e => errs.push(e.message));
    await page.send("Page.addScriptToEvaluateOnNewDocument", { source: fake(at) });
    await page.send("Emulation.setTimezoneOverride", { timezoneId: tz });
    await page.route("**/*", r => {
      const u = r.request().url();
      if (u.startsWith("http://localhost:8791/")) return r.continue();
      if (/espn\.com\/|sleeper\.(app|com)\//.test(u) && !/\.(png|jpg|svg)/.test(u)) {
        try { cache[u] = cache[u] || require("child_process").execFileSync("curl", ["-s", "--max-time", "15", u]).toString(); return r.fulfill({ body: cache[u], contentType: "application/json" }); } catch (e) { return r.abort(); }
      }
      return r.abort();
    });
    await page.goto("http://localhost:8791/#home");
    let line = "", when = "", dev = "";
    try { await page.waitForFunction(() => [...document.querySelectorAll("#regroup .rg-card h3")].some(h => /next one up/i.test(h.textContent)) && /redemption|Kickoff today/.test(document.querySelector("#regroup")?.textContent || ""), undefined, { timeout: 30000 }); }
    catch (e) { errs.push("timeout waiting for the Next one up card"); }
    const r = await page.evaluate(() => {
      const c = [...document.querySelectorAll("#regroup .rg-card")].find(x => /next one up/i.test(x.querySelector("h3")?.textContent || ""));
      if (c) c.scrollIntoView({ block: "center" });
      const ls = c ? [...c.querySelectorAll(".rg-l")].map(x => x.textContent.replace(/\s+/g, " ").trim()) : [];
      const b = c ? c.getBoundingClientRect() : null;
      return { ls, dev: new Date().toString(), box: b && { x: b.x, y: b.y, width: b.width, height: b.height } };
    });
    await page.waitForTimeout(400);
    const box = (await page.evaluate(() => { const c = [...document.querySelectorAll("#regroup .rg-card")].find(x => /next one up/i.test(x.querySelector("h3")?.textContent || "")); const b = c?.getBoundingClientRect(); return b && { x: Math.max(0, b.x - 20), y: Math.max(0, b.y + scrollY - 20), width: b.width + 40, height: b.height + 40 }; }));
    await page.screenshot({ path: path.join(SHOTS, `next-one-up-${nm}.png`), ...(box && box.width > 60 ? { clip: box } : {}) });
    out.push({ case: nm, tz, device: r.dev, card: r.ls, errors: errs });
    await page.close();
  }
  await b.close();
  console.log(JSON.stringify(out, null, 1));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

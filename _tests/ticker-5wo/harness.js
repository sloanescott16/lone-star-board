/* Job 1017-1402-5wo: shared set-up for the Saturday ticker diagnosis and test.
   Fully mocked feeds (nothing reaches the internet), headless Chrome through pw-shim.js, speech and sound stubbed.
   A live Saturday is played out: 14 games, plays already on the reel, and touchdowns (then the extra point)
   landing on later polls, which is what changes the reel's content in real life. */
const { chromium } = require("./pw-shim.js");
const fs = require("fs"), path = require("path");
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const TEAMS = {}; let tid = 100;
const team = (ab, loc, conf) => { TEAMS[ab] = TEAMS[ab] || { id: String(tid++), abbreviation: ab, location: loc, shortDisplayName: loc, name: "X", nickname: "X", displayName: loc + " X", color: "CC0000", alternateColor: "000000", conferenceId: String(conf), logo: PNG, logos: [{ href: PNG }] }; return TEAMS[ab]; };
["SHSU:Sam Houston:25", "TTU:Texas Tech:4", "TEX:Texas:8", "TENN:Tennessee:8", "COLO:Colorado:4", "BAY:Baylor:4", "ILL:Illinois:5", "OSU:Ohio State:5", "CSU:Colorado St:17", "UTSA:UTSA:151", "WAKE:Wake Forest:1", "LOU:Louisville:1", "BUCK:Bucknell:99", "PITT:Pitt:1", "VT:Virginia Tech:1", "BC:Boston College:1", "SDSU:San Diego St:17", "TOL:Toledo:15", "NEV:Nevada:17", "AKR:Akron:15", "BALL:Ball State:15", "KENT:Kent State:15", "USA:South Alabama:37", "UK:Kentucky:8", "LIN:Lindenwood:99", "EMU:E Michigan:15", "CAL:California:1", "UNLV:UNLV:17"].forEach(s => { const [a, b, c] = s.split(":"); team(a, b, c); });
const PAIRS = [["SHSU", "TTU"], ["TEX", "TENN"], ["COLO", "BAY"], ["ILL", "OSU"], ["CSU", "UTSA"], ["WAKE", "LOU"], ["BUCK", "PITT"], ["VT", "BC"], ["SDSU", "TOL"], ["NEV", "AKR"], ["BALL", "KENT"], ["USA", "UK"], ["LIN", "EMU"], ["CAL", "UNLV"]];
const NOW = Date.now();
const TEXTS = ["#3 J.Sagapolutele pass complete short right to #22 T.Purcell caught at CAL25, for 91 yards to the UNLV00 TOUCHDOWN, clock 11:30, 1ST DOWN",
  "(9:51) Shotgun N.Iamaleava pass complete to J.Horton for 45 yds for a TD", "(4:10) #2 R.Robinson II rush middle for 8 yards to the SAM00 TOUCHDOWN", ""];

/* the live state the mock board reports; scoreTD and scorePAT change it, and the page sees it on its next poll */
function newWorld() {
  const w = { g: PAIRS.map((p, i) => ({ a: p[0], h: p[1], as: 7 + (i % 3) * 7, hs: 3 + (i % 4) * 7, lp: { id: i * 100 + 1, type: "Rush", text: "run for 3", sv: 0 } })), polls: 0 };
  w.scoreTD = (i, side, txt) => { const g = w.g[i % w.g.length]; g[side] += 6; g.lp = { id: g.lp.id + 1, type: "Passing Touchdown", text: txt ?? TEXTS[i % TEXTS.length], sv: 6 }; };
  w.scorePAT = (i, side) => { const g = w.g[i % w.g.length]; g[side] += 1; g.lp = { id: g.lp.id + 1, type: "Extra Point", text: "(B. Boehm KICK)", sv: 1 }; };
  return w;
}
function board(w) {
  const comp = (t, s, home) => ({ id: t.id, homeAway: home ? "home" : "away", team: t, score: String(s), records: [{ type: "total", summary: "2-1" }], curatedRank: { current: 99 } });
  return { season: { year: 2026, type: 2 }, week: { number: 5 }, events: w.g.map((g, i) => ({ id: String(i + 1), date: new Date(NOW - 90 * 60e3).toISOString(),
    status: { type: { state: "in", completed: false, description: "In Progress", shortDetail: "4th 0:00", name: "S" }, period: 4, displayClock: "0:00" },
    competitions: [{ id: String(i + 1), competitors: [comp(TEAMS[g.h], g.hs, true), comp(TEAMS[g.a], g.as, false)],
      situation: { shortDownDistanceText: "1st & 10", possessionText: g.h + " 25", possession: TEAMS[g.h].id, lastPlay: { id: String(g.lp.id), type: { text: g.lp.type }, text: g.lp.text, scoreValue: g.lp.sv, statYardage: 0 } },
      broadcasts: [{ names: ["ESPN"] }], geoBroadcasts: [{ media: { shortName: "ESPN" } }], odds: [] }] })) };
}
/* plays already on the reel when the page opens (as a Saturday afternoon would have them stored) */
function stored(n, short) {
  const out = [];
  for (let i = 0; i < n; i++) { const p = PAIRS[i % PAIRS.length];
    out.push({ t: Date.now() - (i + 1) * 90e3, k: `s-pre-${i}`, kind: i % 3 === 2 ? "fg" : "td", gid: String((i % PAIRS.length) + 1), team: p[i % 2], lbl: i % 3 === 2 ? "Field goal" : "Touchdown", pts: 6,
      text: short ? "" : TEXTS[i % TEXTS.length], when: "4th · 0:00", sc: { a: p[0], h: p[1], as: 21, hs: 17, ar: 0, hr: 0 }, pri: 10 }); }
  return out;
}
async function launch() { process.env.PW_TMP = process.env.PW_TMP || "C:/NIGEL-scratch/5wo"; fs.mkdirSync(process.env.PW_TMP, { recursive: true }); return chromium.launch(); }
async function open(browser, file, o) {
  const html = fs.readFileSync(path.resolve(file), "utf8");
  const ctx = await browser.newContext({ viewport: { width: o.w, height: o.h }, deviceScaleFactor: o.dpr || 1 });
  const page = await ctx.newPage(); const errs = []; page.on("pageerror", e => errs.push(String(e)));
  const world = newWorld();
  await page.addInitScript(a => {
    // no sound and no speech, ever
    try { const ss = { speak() {}, cancel() {}, pause() {}, resume() {}, getVoices: () => [], speaking: false, pending: false, addEventListener() {} }; Object.defineProperty(window, "speechSynthesis", { value: ss, configurable: true }); } catch (e) {}
    try { HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; } catch (e) {}
    try { localStorage.setItem("cc-league", JSON.stringify("cfb")); localStorage.setItem("lsb-cfb-tick-5", JSON.stringify(a.items)); } catch (e) {}
    // counters: animations started on the reel, start-time writes, and how many times the reel's children were replaced
    window.__k = { anims: 0, seeks: 0, rebuilds: 0 };
    const A = Element.prototype.animate; Element.prototype.animate = function () { if (this.id === "reel") window.__k.anims++; return A.apply(this, arguments); };
    const d = Object.getOwnPropertyDescriptor(Animation.prototype, "startTime");
    if (d && d.set) Object.defineProperty(Animation.prototype, "startTime", { get: d.get, set(v) { window.__k.seeks++; d.set.call(this, v); }, configurable: true });
    document.addEventListener("DOMContentLoaded", () => { const r = document.querySelector("#reel"); if (r) new MutationObserver(m => { if (m.some(x => x.target === r && x.type === "childList")) window.__k.rebuilds++; }).observe(r, { childList: true }); });
    window.__rx = () => { const r = document.querySelector("#reel"); return r ? new DOMMatrixReadOnly(getComputedStyle(r).transform).m41 : 0; };
    /* samples every frame for ms: frame time, the reel's transform, where one play sits on screen, and whether the track's right edge is covered */
    window.__run = (ms, key) => new Promise(res => { const out = []; let t0 = 0;
      const f = t => { if (!t0) t0 = t; const r = document.querySelector("#reel"), tr = document.querySelector(".ticker .track");
        const el = key ? r.querySelector(`.tk[data-k="${key}"]`) : null, tb = tr.getBoundingClientRect();
        const last = r.lastElementChild ? r.lastElementChild.getBoundingClientRect() : { right: 0 }, flip = document.querySelector(".ticker").classList.contains("flip");
        const first = r.querySelector(".tk"), shown = first ? first.getAttribute("data-k") || "" : "";
        out.push([t, window.__rx(), el ? el.getBoundingClientRect().left : null, flip ? 0 : Math.max(0, tb.right - last.right), (typeof TKR !== "undefined" ? TKR.half : 0), shown]);
        if (t - t0 < ms) requestAnimationFrame(f); else res(out); };
      requestAnimationFrame(f); });
  }, { items: stored(o.stored ?? 6, o.short) });
  if (o.reduce) await page.emulateMedia({ reducedMotion: "reduce" });
  const json = (r, b) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
  await page.route("**/*", r => { const u = r.request().url();
    if (u.startsWith("http://mock/")) return r.fulfill({ status: 200, contentType: "text/html", body: html });
    if (u.includes("site.api.espn.com")) { if (u.includes("/scoreboard")) world.polls++; return json(r, u.includes("/scoreboard") ? board(world) : { events: [], children: [] }); }
    if (u.includes("watch.product.api.espn.com")) return json(r, { page: { buckets: [] } });
    if (/espn\.com|sleeper\.(app|com)/.test(u)) return json(r, {});
    if (u.includes("fonts.googleapis.com")) return r.fulfill({ status: 200, contentType: "text/css", body: "" });
    return r.abort(); });
  await page.goto("http://mock/index.html#scores");
  return { ctx, page, errs, world };
}
const ready = (page, flip) => page.waitForFunction(f => typeof TKR !== "undefined" && document.querySelectorAll("#board .bg").length > 0 && (f ? document.querySelector(".ticker.flip #reel .tk") : TKR.ok && TKR.anim && !TKR.dirty), flip, { timeout: 25000 });
const poll = page => page.evaluate(() => espnLoop().then(() => { document.querySelectorAll(".toast").forEach(t => t.style.display = "none"); }));
/* jumps: a play that moves on screen by more than lim CSS px away from where steady motion puts it (the loop point aside) */
function jumps(samp, lim = 2) {
  const out = []; let v = null;
  for (let i = 1; i < samp.length; i++) { const a = samp[i - 1], b = samp[i]; if (a[2] == null || b[2] == null) continue;
    const dt = b[0] - a[0], dx = b[2] - a[2], half = b[4] || a[4] || 1e9;
    if (v == null && i > 5) { const s = samp.slice(1, 6).map((s, j) => (s[2] - samp[j][2]) / (s[0] - samp[j][0])).sort((p, q) => p - q); v = s[2]; }
    if (v == null) continue;
    let e = dx - v * dt; e -= Math.round(e / half) * half;   // passing the loop point moves a play by one copy's width: not a jump
    if (Math.abs(e) > lim) out.push({ i, t: Math.round(b[0]), e: +e.toFixed(1) }); }
  return out;
}
function frames(samp) { const g = samp.slice(1).map((s, i) => s[0] - samp[i][0]), med = [...g].sort((a, b) => a - b)[g.length >> 1];
  return { n: samp.length, med: +med.toFixed(2), long: g.filter(x => x > med * 1.5).length, worst: +Math.max(...g).toFixed(1) }; }
module.exports = { launch, open, ready, poll, jumps, frames, stored };

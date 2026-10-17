/* job 5wo copy: boxes may be more than two now (enough copies to cover the track), so "=== 2" became ">= 2". Nothing else changed. */
/* v112: Sunday's fantasy ticker on the v111 reel engine (one engine, both leagues), plus the three small v111 gaps:
   web fonts arriving late, a hidden ticker, and a browser with no Element.animate. Fully mocked feeds (ESPN and Sleeper);
   nothing reaches the internet.
     bun test-suntick-mock.js <path to index.html> [folder for screenshots]
   Runs on the PC with bun and pw-shim.js beside this file (the installed Chrome over DevTools). With real Playwright
   instead (no shim beside it) the same calls are used, but that path has not been run. */
let chromium; try { ({ chromium } = require("./pw-shim.js")); } catch (e) { ({ chromium } = require("playwright")); }
const path = require("path"), fs = require("fs"), zlib = require("zlib");
const FILE = process.argv[2] || "index.html"; const OUT = process.argv[3] || "shots";
fs.mkdirSync(OUT, { recursive: true });
const html = fs.readFileSync(path.resolve(FILE), "utf8");
const ONLY = (process.env.ONLY || "").split(",").filter(Boolean), want = n => !ONLY.length || ONLY.some(x => n.startsWith(x));   // ONLY=font-sat,noanimate-sat runs just those sections (used to try the new checks on an older file)
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const FONT_FILE = ["C:/Windows/Fonts/ARIALN.TTF", "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf"].find(p => fs.existsSync(p));   // any font much narrower than the page's fallback (Arial)

/* ---- ESPN: a small NFL board and a small college board ---- */
const TEAMS = {}; let tid = 100;
const team = (ab, loc, conf) => { TEAMS[ab] = TEAMS[ab] || { id: String(tid++), abbreviation: ab, location: loc, shortDisplayName: loc, name: "X", nickname: "X", displayName: loc + " X", color: "CC0000", alternateColor: "000000", conferenceId: String(conf), logo: PNG, logos: [{ href: PNG }] }; return TEAMS[ab]; };
const NOW = Date.now();
function game(id, a, h, as, hs, net, sit, rank, o = {}) {
  const comp = (t, s, home, rk) => ({ id: t.id, homeAway: home ? "home" : "away", team: t, score: String(s), records: [{ type: "total", summary: "2-1" }], curatedRank: { current: rk || 99 } });
  const st = o.state || "in", per = o.period || 2;
  return { id: String(id), date: new Date(NOW - 50 * 60e3).toISOString(), status: { type: { state: st, completed: st === "post", description: st === "post" ? "Final" : "In Progress", shortDetail: st === "post" ? "Final" : `${per} 10:57`, name: "S" }, period: per, displayClock: o.clock || "10:57" },
    competitions: [{ id: String(id), competitors: [comp(team(...h), hs, true, rank && rank[1]), comp(team(...a), as, false, rank && rank[0])], situation: sit || {}, broadcasts: [{ names: [net] }], geoBroadcasts: [{ media: { shortName: net } }], odds: [] }] };
}
const sit = (t, p, possAb, lp) => ({ shortDownDistanceText: t, possessionText: p, possession: possAb ? TEAMS[possAb]?.id : undefined, lastPlay: lp });
["DAL:Dallas:1", "PHI:Philadelphia:1", "NYG:New York:1", "WSH:Washington:1", "CHI:Chicago:2", "DET:Detroit:2", "TTU:Texas Tech:4", "SHSU:Sam Houston:25", "TEX:Texas:8", "TENN:Tennessee:8", "COLO:Colorado:4", "BAY:Baylor:4"].forEach(s => { const [a, b, c] = s.split(":"); team(a, b, c); });
const T = ab => [ab, TEAMS[ab].location, TEAMS[ab].conferenceId];
const nflBoard = () => ({ season: { year: 2026, type: 2 }, week: { number: 5 }, events: [
  game(1, T("PHI"), T("DAL"), 10, 17, "FOX", sit("2nd & 7", "DAL 34", "DAL")),
  game(2, T("WSH"), T("NYG"), 3, 0, "CBS", sit("1st & 10", "NYG 25", "NYG")),
  game(3, T("DET"), T("CHI"), 0, 0, "NBC", {}, null, { state: "pre", period: 1 }),
] });
const cfbBoard = () => ({ season: { year: 2026, type: 2 }, week: { number: 5 }, events: [
  game(11, T("SHSU"), T("TTU"), 7, 28, "TNT", sit("1st & 10", "TTU 11", "TTU"), [0, 11]),
  game(12, T("TEX"), T("TENN"), 10, 13, "ABC", sit("", "", "TENN"), [1, 14], { period: 3 }),
  game(13, T("COLO"), T("BAY"), 3, 3, "ESPN2", sit("1st & 10", "COLO 36", "COLO")),
] });
const OLD_STORED = [{ t: NOW - 120e3, k: "b-old-1", kind: "big", team: "TTU", lbl: "54-yard catch", gid: "11", text: "J.Smith pass complete for 54 yards", when: "2nd 12:40", sc: { a: "SHSU", h: "TTU", as: 7, hs: 14, ar: 0, hr: 11 }, pri: 15 }];   // a Saturday play already saved, so the Saturday reel has content at once

/* ---- Sleeper: one league, two teams, nine starters each ---- */
const LID = "1398686698723868672";
const PLAYERS = {   // id: [first, last, position, team]
  1: ["Quinn", "Passer", "QB", "DAL"], 2: ["Rudy", "Runner", "RB", "DAL"], 3: ["Rex", "Backfield", "RB", "PHI"], 4: ["Will", "Wideout", "WR", "DAL"], 5: ["Walt", "Receiver", "WR", "PHI"],
  6: ["Terry", "Tightend", "TE", "NYG"], 7: ["Flex", "Fielder", "WR", "WSH"], 8: ["Kirk", "Kicker", "K", "DAL"], DAL: ["Dallas", "Cowboys", "DEF", "DAL"],
  11: ["Oscar", "Opponent", "QB", "PHI"], 12: ["Ray", "Rusher", "RB", "NYG"], 13: ["Rob", "Rival", "RB", "WSH"], 14: ["Wade", "Wide", "WR", "PHI"], 15: ["Wes", "West", "WR", "DAL"],
  16: ["Tim", "Tight", "TE", "WSH"], 17: ["Fran", "Flexible", "RB", "NYG"], 18: ["Karl", "Kicks", "K", "PHI"], PHI: ["Philadelphia", "Eagles", "DEF", "PHI"],
  21: ["Bench", "Benchley", "WR", "DAL"],
};
const MINE = ["1", "2", "3", "4", "5", "6", "7", "8", "DAL"], OPP = ["11", "12", "13", "14", "15", "16", "17", "18", "PHI"];
const SCORING = { pass_yd: 0.04, pass_td: 4, pass_int: -2, rush_yd: 0.1, rush_td: 6, rec: 1, rec_yd: 0.1, rec_td: 6, fgm: 3, xpm: 1, sack: 1, def_td: 6 };
const baseStats = () => ({ 1: { pass_yd: 212, pass_td: 1 }, 2: { rush_yd: 64, rec: 2, rec_yd: 15 }, 3: { rush_yd: 30 }, 4: { rec: 5, rec_yd: 71 }, 5: { rec: 3, rec_yd: 40, rec_td: 1 }, 6: { rec: 2, rec_yd: 18 }, 7: { rec: 4, rec_yd: 33 }, 8: { fgm: 2, xpm: 2 }, DAL: { sack: 3 },
  11: { pass_yd: 180, pass_td: 1 }, 12: { rush_yd: 41 }, 13: { rush_yd: 22, rec: 1, rec_yd: 6 }, 14: { rec: 4, rec_yd: 55 }, 15: { rec: 2, rec_yd: 20 }, 16: { rec: 3, rec_yd: 28 }, 17: { rush_yd: 19 }, 18: { fgm: 1, xpm: 1 }, PHI: { sack: 2 } });
const ptsOf = st => Object.entries(st || {}).reduce((a, [k, v]) => a + (SCORING[k] || 0) * v, 0);
function matchups(stats) {
  const side = (rid, ids) => { const pp = {}; ids.forEach(id => { pp[id] = Math.round(ptsOf(stats[id]) * 100) / 100; }); return { roster_id: rid, matchup_id: 1, starters: ids, players: ids.concat(rid === 1 ? ["21"] : []), players_points: pp, points: Object.values(pp).reduce((a, b) => a + b, 0) }; };
  return [side(1, MINE), side(2, OPP)];
}
function sleeper(u, ctl) {
  const j = b => ({ json: b });
  if (u.includes("/v1/state/nfl")) return j({ week: 5, season: "2026", league_season: "2026" });
  if (u.endsWith("/v1/players/nfl")) { const o = {}; for (const [id, p] of Object.entries(PLAYERS)) o[id] = { first_name: p[0], last_name: p[1], position: p[2], team: p[3], status: "Active" }; return j(o); }
  if (u.includes("/matchups/")) { ctl.hits.matchups++; return j(matchups(ctl.stats)); }
  if (u.includes("/stats/nfl/regular/")) { ctl.hits.stats++; return j(ctl.stats); }
  if (u.includes("/rosters")) return j([{ roster_id: 1, owner_id: "u1", starters: MINE, players: MINE.concat(["21"]) }, { roster_id: 2, owner_id: "u2", starters: OPP, players: OPP }]);
  if (u.includes("/users")) return j([{ user_id: "u1", display_name: "gonzo", username: "gonzowiththewind", metadata: { team_name: "Nacua Matata" } }, { user_id: "u2", display_name: "Rival", username: "rival", metadata: { team_name: "Rival Squad" } }]);
  if (u.includes("/league/" + LID)) return j({ name: "Mock League", roster_positions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF", "BN"], scoring_settings: SCORING });
  if (u.includes("sleeper.com/projections")) return j([]);
  return j({});
}

/* ---- a small PNG reader, so screenshots of the reel can be compared pixel for pixel ---- */
function png(buf) {
  let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p), type = buf.toString("latin1", p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } else if (type === "IDAT") idat.push(d); p += 12 + len; }
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), line = w * bpp, out = Buffer.alloc(line * h);
  for (let y = 0; y < h; y++) { const f = raw[y * (line + 1)], src = y * (line + 1) + 1, dst = y * line;
    for (let i = 0; i < line; i++) { const a = i >= bpp ? out[dst + i - bpp] : 0, b = y ? out[dst - line + i] : 0, c = y && i >= bpp ? out[dst - line + i - bpp] : 0, x = raw[src + i];
      let v = x; if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1); else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      out[dst + i] = v & 255; } }
  return { w, h, bpp, px: out };
}
// the smallest whole number of pixels s for which picture B is exactly picture A moved left by s, or -1 if there is none
function shiftOf(A, B, max) { const line = A.w * A.bpp;
  for (let s = 0; s <= max; s++) { let same = true; for (let y = 0; y < A.h && same; y++) if (!A.px.subarray(y * line + s * A.bpp, (y + 1) * line).equals(B.px.subarray(y * line, (y + 1) * line - s * A.bpp))) same = false; if (same) return s; }
  return -1; }
/* samples are [frame timestamp, reel x in CSS px]. Reports, in device pixels: how far any sample sits from a whole pixel,
   how far any move is from (frames elapsed x n), and the longest run of back-to-back frames. */
function track(samp, fi, n, dpr, half) {
  const tot = half * dpr; let maxOff = 0, maxStep = 0, run = 1, best = 1;
  samp.forEach((s, i) => { const d = Math.abs(s[1] * dpr), off = Math.abs(d - Math.round(d)); if (off > maxOff) maxOff = off;
    if (!i) return;
    const fr = Math.round((s[0] - samp[i - 1][0]) / fi), dx = ((((samp[i - 1][1] - s[1]) * dpr) % tot) + tot) % tot, want = (fr * n) % tot;
    let e = Math.abs(dx - want); e = Math.min(e, tot - e); if (e > maxStep) maxStep = e;
    if (fr === 1) { run++; if (run > best) best = run; } else run = 1; });
  return { maxOff: +maxOff.toFixed(4), maxStep: +maxStep.toFixed(4), run: best, frames: samp.length };
}
/* A rebuild must carry the reel on from where it was. Walking the samples in order (distance run = minus x): every frame has to
   be the last one plus the frames elapsed, wrapped at the half width in force; the one frame where the reel is rebuilt may wrap
   at the new half width instead. Returns how many frames were not a plain step, and how far the worst one missed. */
function carried(samp, fi, H0, H1) {
  let jumps = 0, worst = 0;
  for (let i = 1; i < samp.length; i++) {
    const fr = Math.round((samp[i][0] - samp[i - 1][0]) / fi), prev = -samp[i - 1][1], now = -samp[i][1], want = prev + fr;
    const ds = [Math.abs(now - want), Math.abs(now - (want % H0)), Math.abs(now - (want % H1))]; const e = Math.min(...ds);
    if (e > worst) worst = e; if (Math.abs(now - want) > 0.05) jumps++;
  }
  return { jumps, worst: +worst.toFixed(4) };
}

(async () => {
  const browser = await chromium.launch();
  const checks = []; const ok = (n, c, x = "") => checks.push([n, !!c, typeof x === "string" ? x : JSON.stringify(x)]);
  const notes = []; const note = (n, x) => notes.push(`note  ${n}: ${JSON.stringify(x)}`);   // measured numbers, printed after the checks
  async function open(w, h, lg, hash, o = {}) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: o.dpr || 1 });
    const page = await ctx.newPage(); const errs = []; page.on("pageerror", e => errs.push(String(e)));
    const ctl = { stats: baseStats(), hits: { board: 0, matchups: 0, stats: 0 }, fontMs: 0, fonts: 0 };
    ctl.fontGate = new Promise(r => { ctl.releaseFont = r; });   // the web font is held back until the test lets it go
    await page.addInitScript(a => {
      try { localStorage.setItem("cc-league", JSON.stringify(a.lg)); if (a.old) localStorage.setItem("lsb-cfb-tick-5", JSON.stringify(a.old)); } catch (e) {}
      if (a.noAnimate) delete Element.prototype.animate;
      else { const A = Element.prototype.animate; window.__anims = 0; Element.prototype.animate = function () { if (this.id === "reel") window.__anims++; return A.apply(this, arguments); }; }   // counts every animation the page starts on the reel
      window.__rx = () => new DOMMatrixReadOnly(getComputedStyle(document.querySelector("#reel")).transform).m41;
      // the reel's computed transform, read inside n successive requestAnimationFrame callbacks
      window.__samp = n => new Promise(res => { const out = []; const f = t => { out.push([t, window.__rx()]); out.length < n ? requestAnimationFrame(f) : res(out); }; requestAnimationFrame(f); });
      // the same, with a poll (a function that returns a promise) started in the middle: pre frames, then poll(), then post frames after it has finished
      window.__across = (poll, pre, post) => new Promise(res => { const out = []; let i0 = -1, i1 = -1, left = -1;
        const f = t => { out.push([t, window.__rx()]);
          if (out.length === pre) { i0 = out.length; Promise.resolve(window[poll]()).then(() => { i1 = out.length; left = post; }); }
          if (left > 0) left--; if (left === 0 || out.length > 1500) return res({ out, i0, i1 });
          requestAnimationFrame(f); };
        requestAnimationFrame(f); });
    }, { lg, old: o.old ? OLD_STORED : null, noAnimate: !!o.noAnimate });
    if (o.reduce) await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/*", async r => { const u = r.request().url();
      if (u.startsWith("http://mock/")) return r.fulfill({ status: 200, contentType: "text/html", body: html });
      if (u.includes("api.sleeper.app") || u.includes("api.sleeper.com")) { const s = sleeper(u, ctl); return r.fulfill({ status: 200, contentType: "application/json", json: s.json }); }
      if (u.includes("site.api.espn.com")) { let b = { events: [], children: [] }; if (u.includes("/scoreboard")) { ctl.hits.board++; b = u.includes("/football/nfl/") ? nflBoard() : cfbBoard(); } return r.fulfill({ status: 200, contentType: "application/json", json: b }); }
      if (u.includes("watch.product.api.espn.com")) return r.fulfill({ status: 200, contentType: "application/json", json: { page: { buckets: [] } } });
      if (/espn\.com/.test(u)) return r.fulfill({ status: 200, contentType: "application/json", json: {} });
      if (u.includes("fonts.googleapis.com")) {
        if (!o.lateFont || !FONT_FILE) return r.fulfill({ status: 200, contentType: "text/css", body: "" });
        const face = (fam, w) => `@font-face { font-family: "${fam}"; font-style: normal; font-weight: ${w}; font-display: swap; src: url(https://fonts.gstatic.com/s/mock/${fam.replace(/ /g, "")}.ttf) format("truetype"); }`;
        return r.fulfill({ status: 200, contentType: "text/css", body: [face("Barlow", "400 600"), face("Barlow Condensed", "500 900")].join("\n") }); }
      if (u.includes("fonts.gstatic.com/s/mock/") && o.lateFont && FONT_FILE) { ctl.fonts++; await ctl.fontGate; ctl.fontMs = Date.now(); return r.fulfill({ status: 200, contentType: "font/ttf", body: fs.readFileSync(FONT_FILE) }); }
      return r.abort(); });
    await page.goto("http://mock/index.html" + hash, o.lateFont ? { wait: false, waitUntil: "commit" } : undefined);   // a font still loading holds up the load event, so do not wait for it
    return { ctx, page, errs, ctl };
  }
  const ready = page => page.waitForFunction(() => typeof TKR !== "undefined" && TKR.ok && TKR.anim && !TKR.dirty && document.querySelectorAll("#reel .tk").length > 0, null, { timeout: 25000 });
  const sleepPoll = (page, stale) => page.evaluate(stale => { if (stale) S.sleeper.statsT = 0; return sleeperLoop(); }, !!stale);
  const eng = page => page.evaluate(() => ({ fi: TKR.fi, n: TKR.n, k: TKR.k, N: TKR.N, half: TKR.half, dpr: TKR.dpr, ok: TKR.ok, bad: TKR.bad, wait: TKR.wait, dirty: TKR.dirty, anims: window.__anims, ps: TKR.anim ? TKR.anim.playState : "none", ease: TKR.anim ? TKR.anim.effect.getTiming().easing : "", real: devicePixelRatio, w: document.querySelector("#reel").children[0]?.style.width || "" }));
  const reelItems = page => page.evaluate(() => [...document.querySelectorAll("#reel .tkc:first-child > .tk")].map(t => t.className + " | " + t.textContent.replace(/\s+/g, " ").trim()));
  const reelAnims = page => page.evaluate(() => document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.id === "reel").length);
  const hookBuild = page => page.evaluate(() => { window.__builds = 0; const b = tkrBuild; tkrBuild = function () { window.__builds++; return b.apply(this, arguments); }; });
  /* the gap at the loop point: how much wider the boxed copy is than the plays inside it, in CSS px */
  const seamGap = page => page.evaluate(() => { const bx = document.querySelector("#reel .tkc"), last = bx.lastElementChild; return bx.getBoundingClientRect().width - (last.getBoundingClientRect().right - bx.getBoundingClientRect().left); });

  const frames = (page, n) => page.evaluate(n => new Promise(res => { let i = 0; const f = () => { ++i < n ? requestAnimationFrame(f) : res(window.__builds); }; requestAnimationFrame(f); }), n);

  /* ---- 1. Sunday at four widths ---- */
  for (const [w, h] of [[1600, 1000], [1280, 800], [948, 795], [390, 844]]) {
    const tag = `sun-${w}`; if (!want("sun-")) continue;
    const { ctx, page, errs, ctl } = await open(w, h, "nfl", "#scores");
    await ready(page);
    await page.evaluate(() => { window.__sp = () => { S.sleeper.statsT = 0; return sleeperLoop(); }; window.__opened = ""; const o = openPlayer; openPlayer = function (pid) { window.__opened = pid; return o.apply(this, arguments); }; });
    const items = await reelItems(page);
    ok(`${tag}: the fantasy plays are on the reel (both lineups, YOU and OPP)`, items.length === 18 && items.filter(t => /YOU/.test(t)).length === 9 && items.filter(t => /OPP/.test(t)).length === 9 && /Quinn Passer/.test(items[0]), items.slice(0, 2));
    const st = await page.evaluate(() => { const r = document.querySelector("#reel"), c = [...r.children], tk = document.querySelector(".ticker"), tg = document.querySelector("#tkTag");
      return { kids: c.length, cls: c.map(x => x.className).join(","), same: c[0].innerHTML === c[1].innerHTML, w: c.map(x => x.style.width), ow: c.map(x => x.offsetWidth), wc: getComputedStyle(r).willChange, an: getComputedStyle(r).animationName, inline: r.style.transform,
        n: r.getAnimations().length, css: r.getAnimations().filter(a => a instanceof CSSAnimation).length, flip: tk.classList.contains("flip"), disp: getComputedStyle(tk).display, label: tk.getAttribute("aria-label"), tag: tg.textContent.replace(/\s+/g, " ").trim(), tagDisp: getComputedStyle(tg).display,
        kf: [...document.styleSheets].some(ss => { try { return [...ss.cssRules].some(x => x.type === 7 && x.name === "reel"); } catch (e) { return false; } }), pids: c[0].querySelectorAll(".tk[data-pid]").length, ks: c[0].querySelectorAll(".tk[data-k]").length }; });
    ok(`${tag}: reel is two boxed copies of the same plays`, st.kids === 2 && st.cls === "tkc,tkc" && st.same && st.pids === 18 && st.ks === 0, st);
    ok(`${tag}: each copy is a whole number of pixels wide, both the same`, st.w[0] === st.w[1] && /^\d+px$/.test(st.w[0]) && st.ow[0] === st.ow[1] && st.ow[0] === parseInt(st.w[0]) && st.ow[0] > 1000, st);
    ok(`${tag}: no CSS animation on the reel, the old reel keyframes are gone, will-change kept`, st.an === "none" && st.css === 0 && !st.kf && st.wc === "transform", st);
    ok(`${tag}: exactly one animation on the reel and no transform written by script`, st.n === 1 && (await reelAnims(page)) === 1 && st.inline === "", st);
    ok(`${tag}: no phone mode on Sunday (scrolls at every width), ticker shown, fantasy label and tag unchanged`, !st.flip && st.disp === "flex" && /Fantasy/.test(st.label) && /Nacua Matata/.test(st.tag) && /\d/.test(st.tag) && st.tagDisp !== "none", st);
    let e = await eng(page);
    ok(`${tag}: frame interval measured near 60 Hz, 1 px every frame, linear`, e.ok && Math.abs(1000 / e.fi - 60) < 0.5 && e.n === 1 && e.k === 1 && e.ease === "linear", e);
    let s = await page.evaluate(() => window.__samp(200)), tr = track(s, e.fi, e.n, 1, e.half);
    note(`${tag} 200 frames, in device px: furthest from a whole pixel, furthest from an even step, longest run of back-to-back frames`, { ...tr, frameMs: +e.fi.toFixed(4), half: e.half });
    ok(`${tag}: every sampled frame sits on a whole device pixel (within 0.05)`, tr.maxOff <= 0.05, tr);
    ok(`${tag}: at least 120 successive frames sampled`, tr.run >= 120, tr);
    ok(`${tag}: the reel moves by the same amount every frame (1 px, within 0.05)`, tr.maxStep <= 0.05, tr);
    // a Sleeper poll that changes nothing (the stats are fetched again), then a board poll that changes nothing
    const a0 = e.anims, m0 = ctl.hits.matchups, s0 = ctl.hits.stats, b0 = ctl.hits.board;
    await page.evaluate(() => { TKR.anim.__mark = 1; });
    let ac = await page.evaluate(() => window.__across("__sp", 20, 40)); e = await eng(page); tr = track(ac.out, e.fi, 1, 1, e.half);
    ok(`${tag}: a Sleeper poll that changes nothing ran inside the sample (matchups and stats fetched once, 20 frames before it, 40 after)`, ctl.hits.matchups === m0 + 1 && ctl.hits.stats === s0 + 1 && ac.i0 === 20 && ac.i1 >= ac.i0 && ac.out.length >= ac.i1 + 39, { m: ctl.hits.matchups - m0, s: ctl.hits.stats - s0, i0: ac.i0, i1: ac.i1, frames: ac.out.length });
    ok(`${tag}: no restart across it (same animation, none started)`, e.anims === a0 && await page.evaluate(() => TKR.anim.__mark === 1), { before: a0, after: e.anims });
    ok(`${tag}: the reel runs straight through it, on whole pixels, in step`, tr.maxOff <= 0.05 && tr.maxStep <= 0.05, tr);
    ac = await page.evaluate(() => window.__across("espnLoop", 20, 40)); e = await eng(page); tr = track(ac.out, e.fi, 1, 1, e.half);
    ok(`${tag}: a board poll that changes nothing ran inside the sample (at least one scoreboard request)`, ctl.hits.board >= b0 + 1 && ac.i0 === 20 && ac.i1 >= ac.i0 && ac.out.length >= ac.i1 + 39, { board: ctl.hits.board - b0, i0: ac.i0, i1: ac.i1 });
    ok(`${tag}: no restart across it, still on whole pixels`, e.anims === a0 && tr.maxOff <= 0.05 && tr.maxStep <= 0.05, { anims: [a0, e.anims], tr });
    // hover pauses and resumes
    const tb = await page.evaluate(() => { const r = document.querySelector(".ticker .track").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(tb.x, tb.y); await page.waitForTimeout(200);
    const p1 = await page.evaluate(() => ({ x: window.__rx(), ps: TKR.anim.playState })); await page.waitForTimeout(500); const p2 = await page.evaluate(() => ({ x: window.__rx(), ps: TKR.anim.playState }));
    ok(`${tag}: hover pauses the reel, held on a whole pixel`, p1.ps === "paused" && p1.x === p2.x && Number.isInteger(p1.x) && p1.x < 0, { p1, p2 });
    await page.mouse.move(5, 5); s = await page.evaluate(() => window.__samp(90)); tr = track(s, e.fi, 1, 1, e.half);
    ok(`${tag}: leaving resumes it from where it was held, on whole pixels`, (await page.evaluate(() => TKR.anim.playState)) === "running" && s[0][1] <= p2.x && s[0][1] > p2.x - 40 && s[89][1] < p2.x - 60 && tr.maxOff <= 0.05 && tr.maxStep <= 0.05, { held: p2.x, first: s[0][1], last: s[89][1], tr });
    ok(`${tag}: pausing and resuming started no new animation`, (await eng(page)).anims === a0);
    // clicking a player on the reel opens what it opens today
    await page.evaluate(() => document.querySelector('#reel .tk[data-pid="DAL"] .who').click()); await page.waitForTimeout(400);
    const pm = await page.evaluate(() => ({ opened: window.__opened, open: !document.querySelector("#pmodal").hidden, title: document.querySelector("#pmTitle").textContent }));
    ok(`${tag}: clicking a defense on the reel opens its player pop-up`, pm.opened === "DAL" && pm.open && pm.title === "Dallas Cowboys", pm);
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    ok(`${tag}: Escape closes it`, await page.evaluate(() => document.querySelector("#pmodal").hidden));
    await page.evaluate(() => { window.__opened = ""; document.querySelector('#reel .tkc:last-child .tk[data-pid="4"]').click(); }); await page.waitForTimeout(500);
    const pm2 = await page.evaluate(() => ({ opened: window.__opened, title: document.querySelector("#pmTitle").textContent, open: !document.querySelector("#pmodal").hidden }));
    ok(`${tag}: clicking a player in the second copy asks for the same player`, pm2.opened === "4", pm2);
    await page.evaluate(() => { if (typeof closePlayer === "function") closePlayer(); document.querySelectorAll(".modal").forEach(m => { if (m.id === "pmodal" || m.id === "snPmod") m.hidden = true; }); });
    // a player's points change: the content changes, the reel is rebuilt once and carries on from where it was
    e = await eng(page); const a1 = e.anims, H0 = e.half;
    ctl.stats[4] = { rec: 6, rec_yd: 83 };
    ac = await page.evaluate(() => window.__across("__sp", 20, 40)); e = await eng(page);
    let items2 = await reelItems(page), cr = carried(ac.out, e.fi, H0, e.half);
    note(`${tag} points change, idle lineup to one play: half width before and after, frames that were not a plain step, worst miss`, { H0, H1: e.half, ...cr });
    ok(`${tag}: the new play is on the reel (+1 rec, +12 rec yd, +2.20) and the content changed`, items2.length === 1 && /Will Wideout/.test(items2[0]) && /\+1 rec, \+12 rec yd/.test(items2[0]) && /\+2\.20/.test(items2[0]) && e.half !== H0, items2);
    ok(`${tag}: rebuilt once for it, nothing else`, e.anims === a1 + 1 && (await reelAnims(page)) === 1, { before: a1, after: e.anims });
    ok(`${tag}: the offset carried on (a plain step every frame, or wrapped at the new width at the one rebuild; never back to zero)`, cr.jumps <= 1 && cr.worst <= 0.05, cr);
    tr = track(ac.out.slice(ac.out.length - 40), e.fi, 1, 1, e.half);
    ok(`${tag}: after the rebuild every frame is on a whole pixel, in step`, tr.maxOff <= 0.05 && tr.maxStep <= 0.05, tr);
    // a second play makes the reel longer: the offset must carry on exactly
    const H1 = e.half; ctl.stats[2] = { rush_yd: 74, rec: 2, rec_yd: 15 };
    ac = await page.evaluate(() => window.__across("__sp", 20, 40)); e = await eng(page); items2 = await reelItems(page); cr = carried(ac.out, e.fi, H1, e.half);
    ok(`${tag}: the second play lands in front of the first, the reel is longer`, items2.length === 2 && /Rudy Runner/.test(items2[0]) && /Will Wideout/.test(items2[1]) && e.half > H1, { items2, H1, H: e.half });
    ok(`${tag}: rebuilt once more, and the offset carried on exactly (not one frame out of step, not back to zero)`, e.anims === a1 + 2 && cr.jumps === 0 && cr.worst <= 0.05 && ac.out[ac.out.length - 1][1] < -20, { anims: [a1, e.anims], cr, last: ac.out[ac.out.length - 1][1] });
    await page.evaluate(() => { S.finals = []; document.querySelectorAll(".toast").forEach(t => t.style.display = "none"); });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(`${tag}: no sideways scroll`, over <= 0, over);
    await page.screenshot({ path: `${OUT}/v112-sunday-${tag}.png` });
    ok(`${tag}: no page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ---- 2. reduced motion: no animation, the track scrolls by hand ---- */
  for (const [w, h] of [[1600, 1000], [390, 844]]) {
    const tag = `sun-reduced-${w}`; if (!want("sun-reduced")) continue;
    const { ctx, page, errs } = await open(w, h, "nfl", "#scores", { reduce: true });
    await page.waitForFunction(() => document.querySelectorAll("#reel .tk").length > 0, null, { timeout: 25000 });
    await page.waitForTimeout(1500);
    const rd = () => page.evaluate(() => { const r = document.querySelector("#reel"); return { mq: matchMedia("(prefers-reduced-motion: reduce)").matches, started: window.__anims, n: r.getAnimations().length, anim: TKR.anim === null, x: window.__rx(), tks: r.querySelectorAll(".tk").length, scroll: getComputedStyle(document.querySelector(".ticker .track")).overflowX }; });
    const r1 = await rd(); await page.waitForTimeout(600); const r2 = await rd();
    ok(`${tag}: reduced motion gives no animation at all (none ever started)`, r1.mq && r1.started === 0 && r1.n === 0 && r1.anim, r1);
    ok(`${tag}: the reel sits still at zero with its plays, and the track can be scrolled by hand`, r1.x === 0 && r2.x === 0 && r1.tks > 0 && r1.scroll === "auto", { r1, r2 });
    await page.evaluate(() => { window.__opened = ""; const o = openPlayer; openPlayer = function (pid) { window.__opened = pid; return o.apply(this, arguments); }; document.querySelector('#reel .tk[data-pid="DAL"] .who').click(); }); await page.waitForTimeout(300);
    ok(`${tag}: a click on a player still opens the pop-up`, (await page.evaluate(() => window.__opened)) === "DAL");
    await page.evaluate(() => { closePlayer(); });
    if (w === 1600) {
      await page.emulateMedia({ reducedMotion: "no-preference" }); await page.waitForFunction(() => TKR.anim && TKR.ok && !TKR.dirty, null, { timeout: 15000 });
      const e = await eng(page), s = await page.evaluate(() => window.__samp(60)), tr = track(s, e.fi, 1, 1, e.half);
      ok(`${tag}: with the setting off the reel starts, on whole pixels`, e.ps === "running" && tr.maxOff <= 0.05 && tr.maxStep <= 0.05, { e, tr });
      await page.emulateMedia({ reducedMotion: "reduce" }); await page.waitForTimeout(400); const r3 = await rd();
      ok(`${tag}: turned on while running: the animation is cancelled and the reel goes back to zero`, r3.mq && r3.n === 0 && r3.anim && r3.x === 0, r3);
    }
    ok(`${tag}: no page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ---- 3. league round trips: one animation, the right content, nothing piles up ---- */
  if (want("trip")) {
    const tag = "trip";
    const { ctx, page, errs, ctl } = await open(1280, 800, "nfl", "#scores", { old: true });
    await ready(page);
    const fx = () => page.waitForFunction(() => LG.key === "nfl" && TKR.anim && !TKR.dirty && document.querySelectorAll("#reel .tk[data-pid]").length > 0 && document.querySelectorAll("#reel .tkc").length >= 2, null, { timeout: 25000 });
    const sat = () => page.waitForFunction(() => LG.key === "cfb" && TKR.anim && !TKR.dirty && document.querySelectorAll("#reel .tk[data-k]").length > 0 && document.querySelectorAll("#reel .tkc").length >= 2, null, { timeout: 25000 });
    const look = () => page.evaluate(() => ({ lg: LG.key, anims: document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.id === "reel").length, boxes: document.querySelectorAll("#reel .tkc").length, pid: document.querySelectorAll("#reel .tkc:first-child .tk[data-pid]").length, k: document.querySelectorAll("#reel .tkc:first-child .tk[data-k]").length,
      label: document.querySelector(".ticker").getAttribute("aria-label"), tag: document.querySelector("#tkTag").textContent.replace(/\s+/g, " ").trim(), flip: document.querySelector(".ticker").classList.contains("flip"), started: window.__anims, css: document.querySelector("#reel").getAnimations().filter(a => a instanceof CSSAnimation).length }));
    let L = await look();
    ok(`${tag}: starts on Sunday with one animation and the fantasy plays`, L.lg === "nfl" && L.anims === 1 && L.pid === 18 && L.k === 0 && /Fantasy/.test(L.label), L);
    const startedAt = L.started;
    for (let i = 1; i <= 3; i++) {
      await page.evaluate(() => setLeague("cfb")); await sat(); await page.waitForTimeout(300); L = await look();
      ok(`${tag} ${i}: Saturday: one animation, two boxes, Saturday plays only, Saturday label and tag`, L.lg === "cfb" && L.anims === 1 && L.boxes >= 2 && L.k >= 1 && L.pid === 0 && /Saturday/.test(L.label) && /Saturday/.test(L.tag) && L.css === 0, L);
      let e = await eng(page), s = await page.evaluate(() => window.__samp(90)), tr = track(s, e.fi, 1, 1, e.half);
      ok(`${tag} ${i}: Saturday reel on whole pixels`, tr.maxOff <= 0.05 && tr.maxStep <= 0.05, tr);
      await page.evaluate(() => setLeague("nfl")); await fx(); await page.waitForTimeout(300); L = await look();
      ok(`${tag} ${i}: Sunday again: one animation, two boxes, fantasy plays only, fantasy label and tag, no phone class`, L.lg === "nfl" && L.anims === 1 && L.boxes >= 2 && L.pid === 18 && L.k === 0 && /Fantasy/.test(L.label) && /Nacua Matata/.test(L.tag) && !L.flip && L.css === 0, L);
      e = await eng(page); s = await page.evaluate(() => window.__samp(90)); tr = track(s, e.fi, 1, 1, e.half);
      ok(`${tag} ${i}: Sunday reel on whole pixels`, tr.maxOff <= 0.05 && tr.maxStep <= 0.05, tr);
    }
    L = await look();
    note(`${tag} animations started on the reel over 3 round trips (6 switches)`, L.started - startedAt);
    ok(`${tag}: nothing piled up: still one animation, and no more than 3 started per switch`, L.anims === 1 && L.started - startedAt <= 18, { anims: L.anims, started: L.started - startedAt });
    // a Sleeper reply that lands after the switch to Saturday must not write Sunday's plays into Saturday's reel
    await page.evaluate(() => setLeague("cfb")); await sat(); const before = (await eng(page)).anims;
    await page.evaluate(() => renderFantasy()); await page.waitForTimeout(600); L = await look();
    ok(`${tag}: a late Sleeper render on Saturday leaves the Saturday reel alone`, L.lg === "cfb" && L.pid === 0 && L.k >= 1 && L.anims === 1 && (await eng(page)).anims === before && /Saturday/.test(L.label), { L, before });
    ok(`${tag}: no page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ---- 4. a web font that arrives late (v111 left a blank at the loop point until the next rebuild) ---- */
  for (const lg of ["nfl", "cfb"]) {
    const tag = `font-${lg === "nfl" ? "sun" : "sat"}`; if (!want(tag)) continue;
    ok(`${tag}: a font file is available to serve late`, !!FONT_FILE, "no Arial Narrow or DejaVu Condensed found");
    if (!FONT_FILE) continue;
    const { ctx, page, errs, ctl } = await open(1280, 800, lg, "#scores", { lateFont: true, old: lg === "cfb" });
    await ready(page); await page.waitForTimeout(1000);
    const early = { served: ctl.fontMs !== 0, asked: ctl.fonts, status: await page.evaluate(() => document.fonts.status), gap: await seamGap(page), eng: await eng(page) };
    ok(`${tag}: the reel was first boxed while the font was still on its way`, !early.served && early.asked >= 1 && early.status === "loading" && Math.abs(early.gap) < 1.5, early);
    ctl.releaseFont();
    await page.waitForFunction(() => document.fonts.status === "loaded" && !TKR.dirty, null, { timeout: 25000 }); await page.waitForTimeout(500);
    const late = { gap: await seamGap(page), eng: await eng(page), face: await page.evaluate(() => [...document.fonts].map(f => f.family + ":" + f.status).join(",")) };
    note(`${tag} half width before and after the font, gap at the seam before and after (CSS px), animations started`, { before: early.eng.half, after: late.eng.half, gapBefore: +early.gap.toFixed(2), gapAfter: +late.gap.toFixed(2), anims: [early.eng.anims, late.eng.anims] });
    ok(`${tag}: the font changed the text widths (the test would see a blank)`, Math.abs(late.eng.half - early.eng.half) > 60 && /loaded/.test(late.face), { before: early.eng.half, after: late.eng.half, face: late.face });
    ok(`${tag}: once it has loaded there is no gap at the seam (under 1 px)`, Math.abs(late.gap) < 1.5, late.gap);
    ok(`${tag}: it was rebuilt for the font, once or twice, not every frame`, late.eng.anims > early.eng.anims && late.eng.anims <= early.eng.anims + 2, { early: early.eng.anims, late: late.eng.anims });
    const s = await page.evaluate(() => window.__samp(120)), tr = track(s, late.eng.fi, 1, 1, late.eng.half);
    ok(`${tag}: after the rebuild the reel is on whole pixels, in step`, tr.maxOff <= 0.05 && tr.maxStep <= 0.05, tr);
    // control: put a 46 px blank back by hand; the measurement sees it, and the next rebuild takes it out
    await page.evaluate(() => { const c = document.querySelectorAll("#reel .tkc"); c[0].style.width = c[1].style.width = (parseFloat(c[0].style.width) + 46) + "px"; });
    const blank = await seamGap(page); await page.evaluate(() => { TKR.dirty = true; }); await page.waitForFunction(() => !TKR.dirty, null, { timeout: 5000 }); await page.waitForTimeout(100); const healed = await seamGap(page);
    ok(`${tag}: control: a 46 px blank is seen as one, and a rebuild takes it out`, Math.abs(blank - 46) < 1.5 && Math.abs(healed) < 1.5, { blank, healed });
    ok(`${tag}: no page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ---- 5. a hidden ticker waits instead of trying a layout every frame ---- */
  if (want("hidden")) {
    const tag = "hidden";
    const { ctx, page, errs, ctl } = await open(1280, 800, "nfl", "#scores");
    await ready(page);
    await page.evaluate(() => { window.__sp = () => { S.sleeper.statsT = 0; return sleeperLoop(); }; }); await hookBuild(page);
    // (a) the Scoreboard tab is not showing (the ticker is hidden with it)
    await page.evaluate(() => { location.hash = "#home"; }); await page.waitForTimeout(400);
    ok(`${tag}: on the Home tab the ticker is not showing`, await page.evaluate(() => getComputedStyle(document.querySelector(".ticker")).display === "none"));
    let e = await eng(page); const a0 = e.anims; ctl.stats[4] = { rec: 6, rec_yd: 83 };
    await page.evaluate(() => window.__sp()); await page.waitForTimeout(200);
    let b = await frames(page, 90);
    ok(`${tag}: content changed while hidden: no layout tried in 90 frames`, b === 0, b);
    await page.evaluate(() => { location.hash = "#scores"; }); await page.waitForFunction(() => !TKR.dirty && getComputedStyle(document.querySelector(".ticker")).display === "flex", null, { timeout: 5000 }); await page.waitForTimeout(200);
    e = await eng(page); b = await frames(page, 5);
    let items = await reelItems(page), s = await page.evaluate(() => window.__samp(90)), tr = track(s, e.fi, 1, 1, e.half);
    ok(`${tag}: shown again: it was built then, once, with the new play, running on whole pixels`, b >= 1 && b <= 2 && e.anims === a0 + 1 && items.length === 1 && /Will Wideout/.test(items[0]) && e.ps === "running" && tr.maxOff <= 0.05 && tr.maxStep <= 0.05, { builds: b, anims: [a0, e.anims], items: items.length, tr });
    // (b) the ticker is hidden but the scoreboard is on (something else hides it)
    await page.evaluate(() => { window.__builds = 0; document.querySelector(".ticker").style.setProperty("display", "none", "important"); });
    ctl.stats[2] = { rush_yd: 74, rec: 2, rec_yd: 15 }; await page.evaluate(() => window.__sp()); await page.waitForTimeout(200);
    b = await frames(page, 90); e = await eng(page);
    ok(`${tag}: ticker hidden under the scoreboard, content changed: one try, then it waits (not every frame)`, b <= 1 && e.wait === true && e.dirty === false, { builds: b, wait: e.wait, dirty: e.dirty });
    await page.evaluate(() => { window.__builds = 0; document.querySelector(".ticker").style.removeProperty("display"); });
    await page.waitForFunction(() => TKR.wait === false && !TKR.dirty, null, { timeout: 5000 }); await page.waitForTimeout(200);
    b = await frames(page, 30); e = await eng(page); items = await reelItems(page); s = await page.evaluate(() => window.__samp(90)); tr = track(s, e.fi, 1, 1, e.half);
    ok(`${tag}: shown again: built at once with both plays, on whole pixels`, b >= 1 && b <= 2 && items.length === 2 && e.ps === "running" && e.wait === false && tr.maxOff <= 0.05 && tr.maxStep <= 0.05, { builds: b, items: items.length, e, tr });
    ok(`${tag}: no page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }
  if (want("empty")) {
    const tag = "empty";   // Sunday with nothing to show yet: no animation, no layout per frame, then plays arrive
    const { ctx, page, errs, ctl } = await open(1280, 800, "nfl", "#scores");
    ctl.stats = {};
    await page.waitForFunction(() => S.sleeper && S.sleeper.mine && document.querySelector("#tkTag").textContent.includes("Nacua"), null, { timeout: 25000 });
    await page.waitForTimeout(1500); await hookBuild(page);
    let L = await page.evaluate(() => ({ kids: document.querySelector("#reel").children.length, anim: TKR.anim === null, n: document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.id === "reel").length, key: TKR.key }));
    let b = await frames(page, 90);
    ok(`${tag}: nothing to show: an empty reel, no animation, no layout in 90 frames`, L.kids === 0 && L.anim && L.n === 0 && b === 0, { L, b });
    ctl.stats = baseStats(); await page.evaluate(() => { S.sleeper.statsT = 0; return sleeperLoop(); }); await ready(page);
    L = await page.evaluate(() => ({ tks: document.querySelectorAll("#reel .tkc:first-child .tk").length, n: document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.id === "reel").length }));
    ok(`${tag}: plays arrive: the reel is built and runs`, L.tks > 0 && L.n === 1, L);
    ok(`${tag}: no page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ---- 6. no Element.animate in this browser: nothing throws, the reel stays still ---- */
  for (const lg of ["nfl", "cfb"]) {
    const tag = `noanimate-${lg === "nfl" ? "sun" : "sat"}`; if (!want(tag)) continue;
    const { ctx, page, errs } = await open(1280, 800, lg, "#scores", { noAnimate: true, old: lg === "cfb" });
    await page.waitForFunction(() => document.querySelectorAll("#reel .tk").length > 0, null, { timeout: 25000 });
    await page.waitForTimeout(2500);
    if (lg === "nfl") { await page.evaluate(() => { S.sleeper.statsT = 0; return sleeperLoop(); }); await page.waitForTimeout(500); }
    const r = await page.evaluate(() => { const reel = document.querySelector("#reel"); return { has: typeof Element.prototype.animate, tks: reel.querySelectorAll(".tk").length, kids: reel.children.length, n: document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.id === "reel").length, tf: getComputedStyle(reel).transform, anim: TKR.anim, raf: !!TKR.raf, dirty: TKR.dirty }; });
    ok(`${tag}: animate is missing, the plays are on the reel, no animation, reel still at zero`, r.has === "undefined" && r.tks > 0 && r.kids === 2 && r.n === 0 && (r.tf === "none" || r.tf === "matrix(1, 0, 0, 1, 0, 0)") && r.anim === null, r);
    ok(`${tag}: and nothing throws (not one page error in 3 seconds of frames)`, errs.length === 0, errs.slice(0, 3).join(" | "));
    await ctx.close();
  }

  /* ---- 7. crossing the phone width on Sunday changes nothing: no restart, no phone mode ---- */
  if (want("sun-resize")) {
    const tag = "sun-resize";
    const { ctx, page, errs } = await open(1280, 800, "nfl", "#scores");
    await ready(page);
    await page.evaluate(() => { TKR.anim.__mark = 1; }); const a0 = (await eng(page)).anims;
    for (const [w, h] of [[390, 844], [1280, 800], [360, 740]]) {
      await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(700);
      const e = await eng(page), s = await page.evaluate(() => window.__samp(90)), tr = track(s, e.fi, 1, 1, e.half);
      const st = await page.evaluate(() => ({ flip: document.querySelector(".ticker").classList.contains("flip"), pid: document.querySelectorAll("#reel .tkc:first-child .tk[data-pid]").length, same: TKR.anim.__mark === 1 }));
      ok(`${tag}: at ${w} wide: same animation (no restart), no phone mode, all 18 plays, whole pixels`, e.anims === a0 && st.same && !st.flip && st.pid === 18 && e.ps === "running" && tr.maxOff <= 0.05 && tr.maxStep <= 0.05, { anims: [a0, e.anims], st, tr });
    }
    ok(`${tag}: no page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ---- 8. pixel ratio 2 on Sunday ---- */
  if (want("sun-dpr")) {
    const tag = "sun-dpr-2";
    const { ctx, page, errs } = await open(1280, 800, "nfl", "#scores", { dpr: 2 });
    await ready(page);
    const e = await eng(page), s = await page.evaluate(() => window.__samp(160)), tr = track(s, e.fi, e.n, 2, e.half);
    ok(`${tag}: 2 device px a frame, one copy a whole number of device pixels, a multiple of n`, e.real === 2 && e.dpr === 2 && e.n === 2 && e.k === 1 && Math.abs(e.half * 2 - Math.round(e.half * 2)) < 1e-6 && Math.round(e.half * 2) % 2 === 0, e);
    ok(`${tag}: every frame on a whole device pixel (within 0.05), same move every frame`, tr.maxOff <= 0.05 && tr.maxStep <= 0.05 && tr.run >= 120, tr);
    ok(`${tag}: no page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }
  await browser.close();
  let bad = 0; for (const [n, p, x] of checks) { if (!p) bad++; console.log(`${p ? "ok  " : "FAIL"}  ${n}${!p ? "  [" + x + "]" : ""}`); }
  console.log("\n" + notes.join("\n"));
  console.log(`\n${checks.length - bad}/${checks.length} checks passed`); process.exit(bad ? 1 : 0);
})();

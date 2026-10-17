/* v111: Saturday ticker. The desktop reel is one compositor animation locked to whole device pixels, and the play
   text is tidied. Fully mocked feeds; nothing reaches the internet.
   THIS COPY (v112) is test-sattick3-mock.js with three Sunday checks changed, because v112 put Sunday's reel on the same engine
   and removed the CSS reel keyframes that the v111 versions of those checks looked for. Marked "v112:" below. Nothing else differs.
     bun test-sattick3-v112-mock.js <path to index.html> [folder for screenshots]
   Runs on the PC with bun and pw-shim.js beside this file (the installed Chrome over DevTools). With real Playwright
   instead (no shim beside it) the same calls are used, but that path has not been run. */
let chromium; try { ({ chromium } = require("./pw-shim.js")); } catch (e) { ({ chromium } = require("playwright")); }
const path = require("path"), fs = require("fs"), zlib = require("zlib");
const FILE = process.argv[2] || "index.html"; const OUT = process.argv[3] || "shots";
fs.mkdirSync(OUT, { recursive: true });
const html = fs.readFileSync(path.resolve(FILE), "utf8");
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/* ---- the brief's table: stat-crew text in, tidy text out ---- */
const ROWS = [
  ["#3 J.Sagapolutele pass complete short right to #22 T.Purcell caught at CAL25, for 91 yards to the UNLV00 TOUCHDOWN, clock 11:30, 1ST DOWN", "J. Sagapolutele pass complete short right to T. Purcell for 91 yards, touchdown"],
  ["(14:58) Shotgun #10 J.Sayin pass complete short middle to #4 J.Smith caught at OSU40, for 54 yards to the IOWA21 (#6 Z.Lutmer), 1ST DOWN", "J. Sayin pass complete short middle to J. Smith for 54 yards to the IOWA 21, 1st down"],
  ["(00:39) Shotgun #3 J.Sagapolutele pass intercepted by #5 Q.Keyes at UNLV28 #5 Q.Keyes return 44 yards to the CAL28 (#81 T.Sams)", "J. Sagapolutele pass intercepted by Q. Keyes at UNLV 28, Q. Keyes return 44 yards to the CAL 28"],
  ["(06:48) #92 J.Echeverria Lozano field goal attempt from 30 yards GOOD (H: #42 D.Drennan, LS: #46 L.Raab), clock 06:48", "J. Echeverria Lozano field goal attempt from 30 yards, good"],
  ["(09:51) No Huddle-Shotgun #6 B.Roggow sacked for loss of 8 yards to the Akron18 (#97 M.Van Fleet)", "B. Roggow sacked for loss of 8 yards to the Akron 18"],
  ["(04:55) #47 B.Braun punt 71 yards to the UNM18, out of bounds at UNM18", "B. Braun punt 71 yards to the UNM 18, out of bounds at UNM 18"],
  ["#2 R.Robinson II rush middle for 8 yards gain to the SAM33 (#30 N.Holton; #9 L.Young), 1ST DOWN", "R. Robinson II rush middle for 8 yards gain to the SAM 33, 1st down"],
  ["(9:51) Shotgun N.Iamaleava pass complete to J.Horton for 45 yds for a TD", "N. Iamaleava pass complete to J. Horton for 45 yds for a TD"],
  ["(B. Boehm KICK)", "(B. Boehm KICK)"],
  ["End of 1st quarter.", "End of 1st quarter."],
];
const OLD_STORED = "#10 J.Sayin pass complete short middle to #4 J.Smith caught at OSU40, for 54 yards to the IOWA21 (#6 Z.Lutmer), 1ST DOWN";   // row 2 as v110 saved it

/* ---- mock board (from test-sattick2, plus California at UNLV with the play from the complaint) ---- */
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
const lp = (id, type, text, extra = {}) => ({ id: String(id), type: { text: type }, text, scoreValue: 0, statYardage: 0, ...extra });
["SHSU:Sam Houston:25", "TTU:Texas Tech:4", "TEX:Texas:8", "TENN:Tennessee:8", "COLO:Colorado:4", "BAY:Baylor:4", "ILL:Illinois:5", "OSU:Ohio State:5", "CSU:Colorado St:17", "UTSA:UTSA:151", "WAKE:Wake Forest:1", "LOU:Louisville:1", "BUCK:Bucknell:99", "PITT:Pitt:1", "VT:Virginia Tech:1", "BC:Boston College:1", "SDSU:San Diego St:17", "TOL:Toledo:15", "NEV:Nevada:17", "AKR:Akron:15", "BALL:Ball State:15", "KENT:Kent State:15", "USA:South Alabama:37", "UK:Kentucky:8", "LIN:Lindenwood:99", "EMU:E Michigan:15", "CAL:California:1", "UNLV:UNLV:17"].forEach(s => { const [a, b, c] = s.split(":"); team(a, b, c); });
const T = ab => [ab, TEAMS[ab].location, TEAMS[ab].conferenceId];
// step 0 = the page's first poll (seed); step 1 = plays land; step 2 = one more play (the Colorado field goal)
function board(step) {
  const s1 = step >= 1;
  return { season: { year: 2026, type: 2 }, week: { number: 5 }, events: [
    game(1, T("SHSU"), T("TTU"), s1 ? 7 : 0, s1 ? 28 : 21, "TNT", sit("1st & 10", "TTU 11", s1 ? "TTU" : "SHSU", s1 ? lp(12, "Interception Return", "(3:05) Shotgun SHSU pass intercepted by #9 somebody", { statYardage: 0 }) : lp(11, "Rush", "run for 3")), [0, 11]),
    game(2, T("TEX"), T("TENN"), 10, s1 ? 13 : 3, "ABC", sit("", "", "TENN", s1 ? lp(22, "Passing Touchdown", ROWS[7][0], { scoreValue: 6 }) : lp(21, "Rush", "run")), [1, 14], { period: 3 }),
    game(3, T("COLO"), T("BAY"), step >= 2 ? 6 : 3, 3, "ESPN2", sit("1st & 10", "COLO 36", "COLO", step >= 2 ? lp(33, "Field Goal Good", ROWS[3][0], { scoreValue: 3 }) : s1 ? lp(32, "Pass Reception", "(4:10) Shotgun S.Sanders pass complete to J.Horton for 52 yards", { statYardage: 52 }) : lp(31, "Rush", "run"))),
    game(4, T("ILL"), T("OSU"), 7, s1 ? 17 : 14, "FOX", sit("2nd & 7", "OSU 34", "ILL", s1 ? lp(42, "Field Goal Good", "(0:02) J.Fielding 38 yd FG GOOD", { scoreValue: 3 }) : lp(41, "Rush", "run")), [0, 7]),
    game(5, T("CSU"), T("UTSA"), 14, 28, "ESPNU", {}, null, s1 ? { state: "post", period: 4 } : { period: 4 }),
    game(6, T("WAKE"), T("LOU"), 10, 7, "ESPN", sit("1st & 10", "LOU 39", "LOU"), [0, 16], { period: 3 }),
    game(7, T("BUCK"), T("PITT"), 0, 21, "ACCNX", {}),
    game(8, T("VT"), T("BC"), 0, 0, "ACC Network", sit("2nd & 10", "VT 30")),
    game(9, T("SDSU"), T("TOL"), 3, 7, "CBSSN", sit("3rd & 12", "50")),
    game(10, T("NEV"), T("AKR"), 14, 7, "ESPN+", sit("2nd & 7", "NEV 12")),
    game(11, T("BALL"), T("KENT"), 0, 14, "ESPN+", sit("1st & 10", "BALL 25")),
    game(12, T("USA"), T("UK"), s1 ? 17 : 10, 14, "SEC Network", sit("1st & 10", "50"), [0, 22], s1 ? { period: 4 } : { period: 3 }),
    game(13, T("LIN"), T("EMU"), 0, 0, "ESPN+", sit("2nd & 8", "LIN 27")),
    game(14, T("CAL"), T("UNLV"), s1 ? 7 : 0, 0, "CBSSN", sit("", "", "CAL", s1 ? lp(142, "Passing Touchdown", ROWS[0][0], { scoreValue: 6 }) : lp(141, "Rush", "run"))),
  ] };
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

(async () => {
  const EXE = ["/opt/pw-browsers/chromium/chrome-linux/chrome", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(p => fs.existsSync(p));
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const checks = []; const ok = (n, c, x = "") => checks.push([n, !!c, typeof x === "string" ? x : JSON.stringify(x)]);
  const notes = []; const note = (n, x) => notes.push(`note  ${n}: ${JSON.stringify(x)}`);   // measured numbers, printed after the checks
  const json = (r, b) => r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(b) });
  async function open(w, h, lg, hash, o = {}) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: o.dpr || 1 });
    const page = await ctx.newPage(); const errs = []; page.on("pageerror", e => errs.push(String(e)));
    const ctl = { step: 0, polls: 0 };
    await page.addInitScript(a => {
      try { localStorage.setItem("cc-league", JSON.stringify(a.lg));
        if (a.old && !localStorage.getItem("lsb-cfb-tick-5")) localStorage.setItem("lsb-cfb-tick-5", JSON.stringify([{ t: Date.now() - 120e3, k: "b-old-1", kind: "big", team: "OSU", lbl: "54-yard catch", gid: "4", text: a.old, when: "2nd · 12:40", sc: { a: "ILL", h: "OSU", as: 7, hs: 14, ar: 0, hr: 7 }, pri: 15 }]));
      } catch (e) {}
      const A = Element.prototype.animate; window.__anims = 0;   // counts every animation the page starts on the reel
      Element.prototype.animate = function () { if (this.id === "reel") window.__anims++; return A.apply(this, arguments); };
      window.__rx = () => new DOMMatrixReadOnly(getComputedStyle(document.querySelector("#reel")).transform).m41;
      // the reel's computed transform, read inside n successive requestAnimationFrame callbacks
      window.__samp = n => new Promise(res => { const out = []; const f = t => { out.push([t, window.__rx()]); out.length < n ? requestAnimationFrame(f) : res(out); }; requestAnimationFrame(f); });
      // the same, with a board poll in the middle: pre frames, then espnLoop(), then post frames after it has finished
      window.__across = (pre, post) => new Promise(res => { const out = []; let i0 = -1, i1 = -1, left = -1;
        const f = t => { out.push([t, window.__rx()]);
          if (out.length === pre) { i0 = out.length; espnLoop().then(() => { i1 = out.length; left = post; }); }
          if (left > 0) left--; if (left === 0 || out.length > 1500) return res({ out, i0, i1 });
          requestAnimationFrame(f); };
        requestAnimationFrame(f); });
    }, { lg, old: o.old ? OLD_STORED : "" });
    if (o.reduce) await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/*", r => { const u = r.request().url();
      if (u.startsWith("http://mock/")) return r.fulfill({ status: 200, contentType: "text/html", body: html });
      if (u.includes("site.api.espn.com")) { if (u.includes("/scoreboard")) ctl.polls++; return json(r, u.includes("/scoreboard") ? board(ctl.step) : { events: [], children: [] }); }
      if (u.includes("watch.product.api.espn.com")) return json(r, { page: { buckets: [] } });
      if (/espn\.com|sleeper\.(app|com)/.test(u)) return json(r, {});
      if (u.includes("fonts.googleapis.com")) return r.fulfill({ status: 200, contentType: "text/css", body: "" });
      return r.abort(); });
    await page.goto("http://mock/index.html" + hash);
    return { ctx, page, errs, ctl };
  }
  const cdpOf = async (page, ctx) => page.send ? { send: (m, p) => page.send(m, p), on: (e, h) => page.on(e, h) } : await ctx.newCDPSession(page);
  const ready = page => page.waitForFunction(() => typeof TKR !== "undefined" && TKR.ok && TKR.anim && !TKR.dirty && document.querySelectorAll("#board .bg").length > 0, null, { timeout: 20000 });
  const poll = async (page, ctl, step) => { ctl.step = step; await page.evaluate(() => espnLoop()); await page.evaluate(() => { if (typeof closeFinal === "function") { S.finals = []; closeFinal(); } document.querySelectorAll(".toast").forEach(t => t.style.display = "none"); }); };
  const eng = page => page.evaluate(() => ({ fi: TKR.fi, n: TKR.n, k: TKR.k, N: TKR.N, half: TKR.half, dpr: TKR.dpr, ok: TKR.ok, bad: TKR.bad, anims: window.__anims, ps: TKR.anim ? TKR.anim.playState : "none", ease: TKR.anim ? TKR.anim.effect.getTiming().easing : "", real: devicePixelRatio, w: document.querySelector("#reel").children[0]?.style.width || "" }));
  const reelTexts = page => page.evaluate(() => [...document.querySelectorAll("#reel .tkc:first-child > .tk")].map(t => t.className + " | " + t.textContent.replace(/\s+/g, " ").trim()));

  /* ---- 1. the play text, through the real function in the page ---- */
  {
    const { ctx, page, errs } = await open(1280, 800, "cfb", "#scores");
    await page.waitForFunction(() => typeof tkClean === "function", null, { timeout: 15000 });
    const got = await page.evaluate(ins => ins.map(s => [tkClean(s), tkClean(tkClean(s))]), ROWS.map(r => r[0]));
    ROWS.forEach((r, i) => ok(`text: row ${i + 1} comes out exactly as the brief says`, got[i][0] === r[1], `in: ${r[0]} | got: ${got[i][0]} | want: ${r[1]}`));
    ok("text: running it twice changes nothing (stored items get cleaned again when drawn)", got.every(g => g[0] === g[1]), got.filter(g => g[0] !== g[1]));
    const odd = await page.evaluate(() => [tkClean(""), tkClean(null), tkClean(undefined), tkClean("   ")]);
    ok("text: an empty string stays empty", odd.every(x => x === ""), odd);
    const more = await page.evaluate(() => [tkClean("#7 D.Lee punt 45 yards to the NCSU07, fair catch by #1 J.Doe at NCSU07"), tkClean("PENALTY CAL holding (#70 J.Doe) 10 yards from UNLV30 to UNLV40, NO PLAY"), tkClean("(3:10) #9 K.Jones field goal attempt from 45 yards NO GOOD, clock 03:05"), tkClean("Kyle Monangai 5 Yd Run (Jai Patel Kick)")]);
    ok("text: NCSU07 becomes NCSU 7", more[0] === "D. Lee punt 45 yards to the NCSU 7, fair catch by J. Doe at NCSU 7", more[0]);
    ok("text: PENALTY and NO PLAY are lowered", more[1] === "Penalty CAL holding 10 yards from UNLV 30 to UNLV 40, no play", more[1]);
    ok("text: NO GOOD is lowered, with a comma", more[2] === "K. Jones field goal attempt from 45 yards, no good", more[2]);
    ok("text: ESPN's older scoring summary is left alone", more[3] === "Kyle Monangai 5 Yd Run (Jai Patel Kick)", more[3]);
    const names = await page.evaluate(s => tkNames(tkClean(s)), ROWS[0][0]);
    ok("text: the X search names for row 1 are Sagapolutele and Purcell", names.join(",") === "Sagapolutele,Purcell", names);
    const picks = await page.evaluate(() => [[60, 1], [120, 1], [144, 1], [165, 1], [240, 1], [75, 1], [30, 1], [60, 2], [60, 1.5], [60, 1.25]].map(([hz, d]) => { const p = tkrPick(hz, d); return `${hz}@${d}=${p.n}/${p.k}/${Math.round(p.v)}`; }).join(" "));
    ok("speed: n device px every k frames, as the brief sets out (60 Hz is 1 px a frame, 60 px a second)", picks === "60@1=1/1/60 120@1=1/2/60 144@1=1/3/48 165@1=1/3/55 240@1=1/4/60 75@1=1/1/75 30@1=2/1/60 60@2=2/1/60 60@1.5=1/1/40 60@1.25=1/1/48", picks);
    ok("text: no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ---- 2. the desktop reel at three widths ---- */
  for (const [w, h] of [[1600, 1000], [1280, 800], [948, 795]]) {
    const tag = `sat-${w}`;
    const { ctx, page, errs, ctl } = await open(w, h, "cfb", "#scores", { old: true });
    await ready(page);
    const seed = await reelTexts(page);
    ok(`${tag}: a play saved by v110 is drawn tidy`, seed.length === 1 && seed[0].includes(ROWS[1][1]) && !/#10|OSU40|Lutmer|1ST DOWN/.test(seed[0]), seed);
    ok(`${tag}: seed poll replays no scores`, !seed.some(k => /Touchdown|Field goal/.test(k)), seed);
    await poll(page, ctl, 1);
    await page.waitForFunction(() => !TKR.dirty, null, { timeout: 5000 });
    const kinds = await reelTexts(page), has = re => kinds.some(k => re.test(k));
    ok(`${tag}: Tennessee TD on the reel`, has(/k-td.*Touchdown.*Tennessee/), kinds.join("\n"));
    ok(`${tag}: Ohio State FG`, has(/k-fg.*Field goal.*Ohio State/));
    ok(`${tag}: big play and takeaway`, has(/k-big.*52-yard catch/) && has(/k-take.*Interception.*Texas Tech/));
    ok(`${tag}: no upset alerts, finals or live filler`, !has(/k-alert|k-final|k-upset|k-live/), kinds.join("\n"));
    ok(`${tag}: no team score lines in items`, await page.evaluate(() => document.querySelectorAll("#reel .sl").length === 0));
    const tagTxt = await page.evaluate(() => document.querySelector("#tkTag").textContent.replace(/\s+/g, " "));
    ok(`${tag}: tag carries no scores`, !/\d/.test(tagTxt), tagTxt);
    ok(`${tag}: the California touchdown reads tidy on the reel`, has(new RegExp("k-td.*California.*" + ROWS[0][1].replace(/[.]/g, "\\."))), kinds.join("\n"));
    const rows = await page.evaluate(ins => ins.map(s => tkClean(s)), ROWS.map(r => r[0]));
    ok(`${tag}: all ten rows of the brief's table come out exact here too`, ROWS.every((r, i) => rows[i] === r[1]), rows);
    ok(`${tag}: no stat-crew leftovers anywhere on the reel (UNLV00, jersey numbers, clock, caught at, tacklers)`, !kinds.some(k => /UNLV00|#\d+ [A-Z]\.|clock \d|caught at|\(#|TOUCHDOWN|1ST DOWN|\b[A-Z]\.[A-Z][a-z]/.test(k)), kinds.join("\n"));
    const box = await page.evaluate(() => { const r = document.querySelector("#reel"), c = [...r.children]; return { kids: c.length, cls: c.map(x => x.className).join(","), w: c.map(x => x.style.width), ow: c.map(x => x.offsetWidth), same: c[0].innerHTML === c[1].innerHTML, wc: getComputedStyle(r).willChange, an: getComputedStyle(r).animationName, inline: r.style.transform, n: r.getAnimations().length }; });
    ok(`${tag}: reel is two boxed copies of the same plays`, box.kids === 2 && box.cls === "tkc,tkc" && box.same, box);
    ok(`${tag}: each copy is a whole number of pixels wide, both the same`, box.w[0] === box.w[1] && /^\d+px$/.test(box.w[0]) && box.ow[0] === box.ow[1] && box.ow[0] === parseInt(box.w[0]) && box.ow[0] > 500, box);
    ok(`${tag}: no CSS animation on the Saturday reel, will-change kept`, box.an === "none" && box.wc === "transform", box);
    ok(`${tag}: exactly one animation on the reel and no transform written by script`, box.n === 1 && box.inline === "", box);
    let e = await eng(page);
    ok(`${tag}: frame interval measured near 60 Hz, 1 px every frame, linear`, e.ok && Math.abs(1000 / e.fi - 60) < 0.5 && e.n === 1 && e.k === 1 && e.ease === "linear", e);
    // smooth: 200 successive frames
    let s = await page.evaluate(() => window.__samp(200)), tr = track(s, e.fi, e.n, 1, e.half);
    note(`${tag} 200 frames, in device px: furthest from a whole pixel, furthest from an even step, longest run of back-to-back frames`, { ...tr, frameMs: +e.fi.toFixed(4), half: e.half });
    ok(`${tag}: every sampled frame sits on a whole device pixel (within 0.05)`, tr.maxOff <= 0.05, tr);
    ok(`${tag}: at least 120 successive frames sampled`, tr.run >= 120, tr);
    ok(`${tag}: the reel moves by the same amount every frame (1 px, within 0.05)`, tr.maxStep <= 0.05, tr);
    // a poll that changes nothing: same animation, no restart
    await page.evaluate(() => { TKR.anim.__mark = 1; });
    const a0 = e.anims, p0 = ctl.polls; let ac = await page.evaluate(() => window.__across(20, 40)); e = await eng(page); tr = track(ac.out, e.fi, 1, 1, e.half);
    ok(`${tag}: a poll that changes nothing ran inside the sample (one scoreboard request, 20 frames before it, 40 after)`, ctl.polls === p0 + 1 && ac.i0 === 20 && ac.i1 >= ac.i0 && ac.out.length >= ac.i1 + 39, { polls: ctl.polls - p0, i0: ac.i0, i1: ac.i1, frames: ac.out.length });
    ok(`${tag}: no restart across a poll that changes nothing (same animation, none started)`, e.anims === a0 && await page.evaluate(() => TKR.anim.__mark === 1), { before: a0, after: e.anims });
    ok(`${tag}: the reel runs straight through that poll, still on whole pixels`, tr.maxOff <= 0.05 && tr.maxStep <= 0.05, tr);
    // a poll that adds a play: rebuilt once, carrying on from the same offset
    ctl.step = 2; const halfBefore = e.half, p1c = ctl.polls;
    ac = await page.evaluate(() => window.__across(20, 40)); e = await eng(page);
    await page.evaluate(() => { S.finals = []; closeFinal(); });
    const kinds2 = await reelTexts(page);
    ok(`${tag}: the next poll adds the Colorado field goal, tidy`, kinds2.some(t => /k-fg.*Field goal.*Colorado/.test(t) && t.includes(ROWS[3][1])) && !kinds2.some(t => /Drennan|Raab|GOOD/.test(t)), kinds2.join("\n"));
    ok(`${tag}: the reel was rebuilt once for the new play (one poll), and is longer`, ctl.polls === p1c + 1 && e.anims === a0 + 1 && e.half > halfBefore, { polls: ctl.polls - p1c, before: a0, after: e.anims, halfBefore, half: e.half });
    const pre = ac.out[ac.i0 - 1], post = ac.out[ac.out.length - 1], fr = Math.round((post[0] - pre[0]) / e.fi);
    ok(`${tag}: the offset carries on across the poll that adds a play (not back to zero)`, Math.abs((pre[1] - post[1]) - fr) <= 0.05 && post[1] < pre[1] && post[1] < -50, { before: pre[1], after: post[1], frames: fr });
    tr = track(ac.out, e.fi, 1, 1, 1e9);
    ok(`${tag}: every frame through the rebuild is on a whole pixel and in step`, tr.maxOff <= 0.05 && tr.maxStep <= 0.05, tr);
    // hover pauses and resumes
    const tb = await page.evaluate(() => { const r = document.querySelector(".ticker .track").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(tb.x, tb.y); await page.waitForTimeout(200);
    const p1 = await page.evaluate(() => ({ x: window.__rx(), ps: TKR.anim.playState })); await page.waitForTimeout(500); const p2 = await page.evaluate(() => ({ x: window.__rx(), ps: TKR.anim.playState }));
    ok(`${tag}: hover pauses the reel, held on a whole pixel`, p1.ps === "paused" && p1.x === p2.x && Number.isInteger(p1.x) && p1.x <= post[1] + 0.05 && p1.x > post[1] - 60, { p1, p2, post });
    await page.mouse.move(5, 5); s = await page.evaluate(() => window.__samp(90)); tr = track(s, e.fi, 1, 1, e.half);
    const p3 = await page.evaluate(() => TKR.anim.playState);
    ok(`${tag}: leaving resumes it from where it was held`, p3 === "running" && s[0][1] <= p2.x && s[0][1] > p2.x - 40 && s[89][1] < p2.x - 60, { held: p2.x, first: s[0][1], last: s[89][1], p3 });
    ok(`${tag}: after resuming it is back on whole pixels, in step`, tr.maxOff <= 0.05 && tr.maxStep <= 0.05, tr);
    ok(`${tag}: pausing and resuming started no new animation`, (await eng(page)).anims === a0 + 1);
    // the pop-up for the play in the complaint
    await page.evaluate(() => document.querySelector('#reel .tk[data-k^="s-14-"]').click()); await page.waitForTimeout(300);
    const pop = await page.evaluate(() => ({ open: !document.querySelector("#tkmod").hidden, p: document.querySelector("#tkmod .tkp-text")?.textContent || "", all: document.querySelector("#tkpBody").textContent.replace(/\s+/g, " "), v: document.querySelector("#tkmod a.x")?.href || "", tgt: document.querySelector("#tkmod a.x")?.target, links: [...document.querySelectorAll("#tkmod a.btn")].map(a => a.href) }));
    ok(`${tag}: clicking the California touchdown opens the play pop-up`, pop.open, pop.all.slice(0, 120));
    ok(`${tag}: the pop-up shows the tidy text, exactly`, pop.p === ROWS[0][1], pop.p);
    ok(`${tag}: no "UNLV00", "#3" or "clock" in the pop-up`, !/UNLV00|#3|clock/i.test(pop.all), pop.all);
    const q = decodeURIComponent(pop.v);
    ok(`${tag}: the X link names both players and the school`, /x\.com\/search/.test(pop.v) && q.includes('("California" OR Sagapolutele OR Purcell)'), q);
    ok(`${tag}: Video on X searches videos since today`, /filter:videos/.test(q) && /since:\d{4}-\d{2}-\d{2}/.test(q) && !/touchdown|field goal|#|UNLV/.test(q), q);
    ok(`${tag}: Latest clips link sorts newest first`, pop.links.some(a => /f=live/.test(a) && /filter%3Avideos/.test(a) && /Sagapolutele/.test(a)), pop.links);
    ok(`${tag}: X link opens in a new tab`, pop.tgt === "_blank");
    if (w === 1600) await page.screenshot({ path: `${OUT}/v111-pop-${tag}.png` });
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    ok(`${tag}: Escape closes it`, await page.evaluate(() => document.querySelector("#tkmod").hidden));
    // the play v110 had saved: tidy in its pop-up too, and the tackler is not searched
    await page.evaluate(() => document.querySelector('#reel .tk[data-k="b-old-1"]').click()); await page.waitForTimeout(300);
    const pop2 = await page.evaluate(() => ({ p: document.querySelector("#tkmod .tkp-text").textContent, q: decodeURIComponent(document.querySelector("#tkmod a.x").href) }));
    ok(`${tag}: the saved v110 play is tidy in its pop-up`, pop2.p === ROWS[1][1], pop2.p);
    ok(`${tag}: its X search names the passer, not the tackler or a jersey number`, /Sayin/.test(pop2.q) && !/Lutmer|#|%23/.test(pop2.q), pop2.q);
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector("#reel .tk.k-big[data-k^='b-3-']").click()); await page.waitForTimeout(300);
    const q2 = decodeURIComponent(await page.evaluate(() => document.querySelector("#tkmod a.x").href));
    ok(`${tag}: big play search ORs school and player names`, /\("Colorado" OR Sanders OR Horton\)|\("Colorado" OR Horton\)/.test(q2), q2);
    await page.click("[data-tkgc]"); await page.waitForTimeout(500);
    ok(`${tag}: Game center button opens the game`, (await page.evaluate(() => location.hash)) === "#game-3");
    await page.evaluate(() => { location.hash = "#scores"; }); await page.waitForTimeout(1500);
    s = await page.evaluate(() => window.__samp(60)); e = await eng(page); tr = track(s, e.fi, 1, 1, e.half);
    ok(`${tag}: back on the scoreboard the reel is still running on whole pixels`, e.ps === "running" && tr.maxOff <= 0.05 && tr.maxStep <= 0.05 && e.anims === a0 + 1, { tr, anims: e.anims });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(`${tag}: no sideways scroll`, over <= 0, over);
    await page.evaluate(() => document.querySelectorAll(".modal, .toast").forEach(m => m.style.display = "none"));
    await page.screenshot({ path: `${OUT}/v111-ticker-${tag}.png` });

    if (w === 1600) {
      // what is actually drawn: screenshots a moment apart must be the same picture moved a whole number of pixels
      const clip = await page.evaluate(() => { const r = document.querySelector(".ticker .track").getBoundingClientRect(); return { x: Math.round(r.left + r.width * 0.2), y: Math.round(r.top) + 4, width: Math.round(r.width * 0.6), height: Math.round(r.height) - 8 }; });
      const shots = []; for (let i = 0; i < 7; i++) { shots.push(png(await page.screenshot({ clip }))); await page.waitForTimeout(40); }
      const sh = shots.slice(1).map((b, i) => shiftOf(shots[i], b, 200));
      ok(`${tag}: on screen, each screenshot is the last one moved a whole number of pixels (sharp text, no soft frames)`, sh.every(x => x > 0), sh);
      // and the check can tell: hold the reel half a pixel off and the picture no longer matches
      await page.evaluate(() => { tkrPause(true); TKR.anim.currentTime += 3 * TKR.fi; }); await page.waitForTimeout(150); const c0 = png(await page.screenshot({ clip }));
      await page.evaluate(() => { TKR.anim.currentTime += 3 * TKR.fi; }); await page.waitForTimeout(150); const c1 = png(await page.screenshot({ clip }));
      await page.evaluate(() => { TKR.anim.currentTime += 2.5 * TKR.fi; }); await page.waitForTimeout(150); const c2 = png(await page.screenshot({ clip }));
      ok(`${tag}: control: held 3 px on, the picture matches at 3; held half a pixel off, it matches nowhere`, shiftOf(c0, c1, 200) === 3 && shiftOf(c1, c2, 200) === -1, [shiftOf(c0, c1, 200), shiftOf(c1, c2, 200)]);
      // the loop point: 3 px before the end of the loop and 2 px after the start are the same picture 5 px apart
      await page.evaluate(() => { TKR.anim.currentTime = (TKR.N - 3) * TKR.fi; }); await page.waitForTimeout(150); const w0 = png(await page.screenshot({ clip })), wx0 = await page.evaluate(() => window.__rx());
      await page.evaluate(() => { TKR.anim.currentTime = (TKR.N + 2) * TKR.fi; }); await page.waitForTimeout(150); const w1 = png(await page.screenshot({ clip })), wx1 = await page.evaluate(() => window.__rx());
      ok(`${tag}: on screen the loop point is seamless (the picture carries straight on across it)`, shiftOf(w0, w1, 200) === 5 && wx0 === -(e.half - 3) && wx1 === -2, { shift: shiftOf(w0, w1, 200), wx0, wx1, half: e.half });
      await page.evaluate(() => { TKR.anim.currentTime = (TKR.N - 40) * TKR.fi; tkrPause(false); }); await page.waitForTimeout(100);
      s = await page.evaluate(() => window.__samp(100)); tr = track(s, e.fi, 1, 1, e.half);
      ok(`${tag}: running across the loop point: every frame on a whole pixel, 1 px a frame, no jump`, tr.maxOff <= 0.05 && tr.maxStep <= 0.05 && s[0][1] < -(e.half - 45) && s[99][1] > -100 && s[99][1] < 0, { tr, first: s[0][1], last: s[99][1], half: e.half });
      // on the compositor: the reel keeps moving while the main thread is blocked for a second and a half
      const cdp = await cdpOf(page, ctx), frames = []; let t0 = 0;
      await page.evaluate(() => { const st = document.createElement("style"); st.textContent = "*, *::before, *::after { animation: none !important; transition: none !important; }"; document.head.appendChild(st); });   // so only the reel can move
      cdp.on("Page.screencastFrame", p => { frames.push({ at: Date.now() - t0, data: p.data }); cdp.send("Page.screencastFrameAck", { sessionId: p.sessionId }).catch(() => {}); });
      await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1 }); await page.waitForTimeout(500);
      const block = async () => { frames.length = 0; t0 = Date.now(); await page.evaluate(() => { const end = performance.now() + 1500; let i = 0; while (performance.now() < end) i++; return i; }); const took = Date.now() - t0; return new Set(frames.filter(f => f.at > 100 && f.at < took - 100).map(f => f.data)).size; };
      const moving = await block();
      await page.evaluate(() => tkrPause(true)); await page.waitForTimeout(300); const held = await block(); await page.evaluate(() => tkrPause(false));
      await cdp.send("Page.stopScreencast");
      note(`${tag} different frames drawn during a 1.5 s main-thread block, reel running then reel held`, [moving, held]); note(`${tag} whole-pixel shifts between screenshots taken 40 ms apart`, sh);
      ok(`${tag}: the reel keeps moving while the main thread is blocked (new frames drawn during a 1.5 s block)`, moving >= 30, moving);
      ok(`${tag}: control: with the reel held, nothing is drawn during the same block`, held === 0, held);
      await page.waitForTimeout(1200); s = await page.evaluate(() => window.__samp(90)); e = await eng(page); tr = track(s, e.fi, 1, 1, e.half);
      ok(`${tag}: after those long stalls the reel is running on whole pixels, 1 px a frame`, e.ps === "running" && tr.maxOff <= 0.05 && tr.maxStep <= 0.05, { tr, ps: e.ps });
    }
    ok(`${tag}: no page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ---- 3. the phase lock, the stepped mode, league and phone switches ---- */
  {
    const tag = "lock";
    const { ctx, page, errs, ctl } = await open(1280, 800, "cfb", "#scores");
    await ready(page); await poll(page, ctl, 1); await page.waitForFunction(() => !TKR.dirty, null, { timeout: 5000 });
    let e = await eng(page); const fi0 = e.fi, a0 = e.anims;
    // as if the window moved to a display that runs 1.3% slower: three checks off in a row, then measure again and rebuild
    await page.evaluate(() => { window.__sawOff = false; TKR.fi *= 1.013; const i = setInterval(() => { if (!TKR.ok) window.__sawOff = true; }, 20); setTimeout(() => clearInterval(i), 15000); });
    await page.waitForFunction(() => window.__sawOff && TKR.ok && !TKR.dirty, null, { timeout: 15000 });
    e = await eng(page); let s = await page.evaluate(() => window.__samp(150)), tr = track(s, e.fi, 1, 1, e.half);
    note(`${tag} frame interval before, and after being set 1.3% wrong and left to recover`, { before: fi0, after: e.fi });
    ok(`${tag}: a wrong frame interval is caught by the 2-second check: measured again and rebuilt`, Math.abs(e.fi / fi0 - 1) < 0.001 && e.anims > a0 && e.bad === 0, { fi0, fi: e.fi, anims: [a0, e.anims] });
    ok(`${tag}: after that the reel is back on whole pixels, 1 px a frame`, tr.maxOff <= 0.05 && tr.maxStep <= 0.05 && tr.run >= 120, tr);
    // left alone, the lock holds: sample again after three more checks
    await page.waitForTimeout(6500); e = await eng(page); s = await page.evaluate(() => window.__samp(150)); tr = track(s, e.fi, 1, 1, e.half);
    ok(`${tag}: six seconds on, still on whole pixels with no strikes`, tr.maxOff <= 0.05 && tr.maxStep <= 0.05 && e.bad === 0 && e.ok, { tr, e });
    // the mode a 120 Hz display gets (1 px every 2 frames, held with steps). This display is 60 Hz, so it is forced by halving the interval.
    await page.evaluate(() => { TKR.fi /= 2; TKR.dirty = true; }); await page.waitForTimeout(400);
    e = await eng(page); s = await page.evaluate(() => window.__samp(150)); tr = track(s, e.fi * 2, 1, 1, e.half);
    ok(`${tag}: stepped mode (forced): k = 2, steps easing`, e.k === 2 && e.n === 1 && /^steps\(/.test(e.ease), e);
    ok(`${tag}: stepped mode: every frame on a whole pixel, even steps`, tr.maxOff === 0 && tr.maxStep === 0 && tr.run >= 120, tr);
    await page.waitForTimeout(4500); const e2 = await eng(page); s = await page.evaluate(() => window.__samp(60)); tr = track(s, e2.fi * 2, 1, 1, e2.half);
    ok(`${tag}: stepped mode: the lock leaves it alone`, e2.k === 2 && e2.bad === 0 && e2.anims === e.anims && tr.maxOff === 0 && tr.maxStep === 0, { e2, tr });
    await page.evaluate(() => { TKR.fi *= 2; TKR.dirty = true; }); await page.waitForTimeout(400);
    // phone width: the animation is cancelled, one play at a time; back to desktop: it runs again
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
    const ph = await page.evaluate(() => { const r = document.querySelector("#reel"); return { flip: document.querySelector(".ticker").classList.contains("flip"), anim: TKR.anim === null, n: r.getAnimations().length, tf: getComputedStyle(r).transform, kids: r.children.length, cls: r.children[0]?.className || "" }; });
    ok(`${tag}: narrowed to a phone: animation cancelled, transform cleared, one play showing`, ph.flip && ph.anim && ph.n === 0 && ph.tf === "none" && ph.kids === 1 && /\btk\b/.test(ph.cls), ph);
    await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(700);
    e = await eng(page); s = await page.evaluate(() => window.__samp(60)); tr = track(s, e.fi, 1, 1, e.half);
    ok(`${tag}: widened again: the reel runs again on whole pixels`, e.ps === "running" && e.k === 1 && tr.maxOff <= 0.05 && tr.maxStep <= 0.05, { e, tr });
    // Saturday to Sunday: the animation is cancelled and the transform cleared; Sunday's CSS reel takes over
    await page.evaluate(() => setLeague("nfl")); await page.waitForTimeout(600);
    const sun = await page.evaluate(() => { const r = document.querySelector("#reel"); return { anim: TKR.anim === null, waapi: r.getAnimations().filter(a => !(a instanceof CSSAnimation)).length, inline: r.style.transform, name: getComputedStyle(r).animationName, boxes: r.querySelectorAll(".tkc").length, flip: document.querySelector(".ticker").classList.contains("flip") }; });
    ok(`${tag}: switching to Sunday cancels the animation and clears the transform`, sun.anim && sun.waapi === 0 && sun.inline === "" && sun.boxes === 0 && !sun.flip, sun);
    ok(`${tag}: v112: Sunday has no CSS reel animation any more (the reel keyframes are gone; its own test is test-suntick-mock.js)`, sun.name === "none", sun);   // v111 asked for name === "reel"
    await page.evaluate(() => setLeague("cfb")); await page.waitForFunction(() => TKR.anim && !TKR.dirty && document.querySelectorAll("#reel .tk").length > 0, null, { timeout: 15000 });
    e = await eng(page); s = await page.evaluate(() => window.__samp(60)); tr = track(s, e.fi, 1, 1, e.half);
    ok(`${tag}: back to Saturday: the reel runs again on whole pixels`, e.ps === "running" && tr.maxOff <= 0.05 && tr.maxStep <= 0.05, { e, tr });
    ok(`${tag}: no page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ---- 4. reduced motion: no animation, at the same three widths ---- */
  for (const [w, h] of [[1600, 1000], [1280, 800], [948, 795]]) {
    const tag = `reduced-${w}`;
    const { ctx, page, errs, ctl } = await open(w, h, "cfb", "#scores", { reduce: true });
    await page.waitForFunction(() => document.querySelectorAll("#board .bg").length > 0 && document.querySelectorAll("#reel .tk").length > 0, null, { timeout: 15000 });
    await poll(page, ctl, 1); await page.waitForTimeout(1500);
    const rd = () => page.evaluate(() => { const r = document.querySelector("#reel"); return { mq: matchMedia("(prefers-reduced-motion: reduce)").matches, started: window.__anims, n: r.getAnimations().length, anim: TKR.anim === null, x: window.__rx(), tks: r.querySelectorAll(".tk").length, scroll: getComputedStyle(document.querySelector(".ticker .track")).overflowX }; });
    const r1 = await rd(); await page.waitForTimeout(600); const r2 = await rd();
    ok(`${tag}: reduced motion gives no animation at all (none ever started)`, r1.mq && r1.started === 0 && r1.n === 0 && r1.anim, r1);
    ok(`${tag}: the reel sits still at zero with its plays, and the track can be scrolled by hand`, r1.x === 0 && r2.x === 0 && r1.tks > 0 && r1.scroll === "auto", { r1, r2 });
    await page.emulateMedia({ reducedMotion: "no-preference" }); await page.waitForFunction(() => TKR.anim && TKR.ok && !TKR.dirty, null, { timeout: 15000 });
    const e = await eng(page), s = await page.evaluate(() => window.__samp(60)), tr = track(s, e.fi, 1, 1, e.half);
    ok(`${tag}: with the setting off the reel starts, on whole pixels`, e.ps === "running" && tr.maxOff <= 0.05 && tr.maxStep <= 0.05, { e, tr });
    await page.emulateMedia({ reducedMotion: "reduce" }); await page.waitForTimeout(400); const r3 = await rd();
    ok(`${tag}: turned on while running: the animation is cancelled and the reel goes back to zero`, r3.mq && r3.n === 0 && r3.anim && r3.x === 0, r3);
    ok(`${tag}: no page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ---- 5. other pixel ratios: still whole device pixels ---- */
  for (const [dpr, n, v] of [[2, 2, 60], [1.5, 1, 40], [1.25, 1, 48]]) {
    const tag = `dpr-${dpr}`;
    const { ctx, page, errs, ctl } = await open(1280, 800, "cfb", "#scores", { dpr });
    await ready(page); await poll(page, ctl, 1); await page.waitForFunction(() => !TKR.dirty, null, { timeout: 5000 });
    let e = await eng(page), s = await page.evaluate(() => window.__samp(160)), tr = track(s, e.fi, e.n, dpr, e.half);
    ok(`${tag}: ${n} device px a frame (${v} CSS px a second)`, e.real === dpr && e.dpr === dpr && e.n === n && e.k === 1, e);
    ok(`${tag}: one copy of the reel is a whole number of device pixels, a multiple of n`, Math.abs(e.half * dpr - Math.round(e.half * dpr)) < 1e-6 && Math.round(e.half * dpr) % n === 0, { half: e.half, dev: e.half * dpr });
    note(`${tag} 160 frames, in device px`, { ...tr, n: e.n, k: e.k, half: e.half });
    ok(`${tag}: every frame on a whole device pixel (within 0.05), same move every frame`, tr.maxOff <= 0.05 && tr.maxStep <= 0.05 && tr.run >= 120, tr);
    if (dpr === 1.25) {   // the ratio changes under a running reel (zoom, or another monitor): boxed and measured again, same offset
      const cdp = await cdpOf(page, ctx), x0 = await page.evaluate(() => window.__rx()), a0 = e.anims;
      await page.evaluate(() => { window.__sawOff = false; const i = setInterval(() => { if (!TKR.ok) window.__sawOff = true; }, 20); setTimeout(() => clearInterval(i), 15000); });
      await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 2, mobile: false });
      await page.waitForFunction(() => devicePixelRatio === 2 && TKR.dpr === 2 && window.__sawOff && TKR.ok && !TKR.dirty, null, { timeout: 15000 });
      e = await eng(page); s = await page.evaluate(() => window.__samp(160)); tr = track(s, e.fi, e.n, 2, e.half);
      ok(`${tag}: ratio changed to 2 while running: measured again, rebuilt at 2 device px a frame`, e.n === 2 && e.anims > a0 && Math.round(e.half * 2) % 2 === 0, e);
      ok(`${tag}: after the change every frame is on a whole device pixel, carrying on (not from zero)`, tr.maxOff <= 0.05 && tr.maxStep <= 0.05 && s[0][1] < x0, { tr, x0, x: s[0][1] });
    }
    ok(`${tag}: no page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ---- 6. phone: one play at a time, exactly as before ---- */
  for (const [w, h] of [[390, 844], [360, 740]]) {
    const tag = `sat-${w}`;
    const { ctx, page, errs, ctl } = await open(w, h, "cfb", "#scores", { old: true });
    await page.waitForFunction(() => document.querySelectorAll("#board .bg").length > 0 && document.querySelectorAll("#reel .tk").length > 0, null, { timeout: 15000 });
    await poll(page, ctl, 1); await page.waitForTimeout(600);
    const r = await page.evaluate(() => { const t = document.querySelector(".ticker"), k = [...document.querySelectorAll("#reel > .tk")]; const tr = t.getBoundingClientRect(), reel = document.querySelector("#reel");
      return { flip: t.classList.contains("flip"), n: k.length, tag: getComputedStyle(document.querySelector("#tkTag")).display, inside: k.every(x => { const b = x.getBoundingClientRect(); return b.left >= tr.left - 1 && b.right <= tr.right + 1 && b.top >= tr.top - 1 && b.bottom <= tr.bottom + 1; }), fs: k[0] ? parseFloat(getComputedStyle(k[0].querySelector(".who")).fontSize) : 0, txt: k[0]?.textContent,
        anims: window.__anims, live: reel.getAnimations().length, anim: TKR.anim === null, tf: getComputedStyle(reel).transform, boxes: reel.querySelectorAll(".tkc").length, list: TKR.list.join(" ").replace(/<[^>]+>/g, " ") }; });
    ok(`${tag}: phone ticker shows one play at a time`, r.flip && r.n === 1, JSON.stringify(r).slice(0, 300));
    ok(`${tag}: no tag box eating the width`, r.tag === "none");
    ok(`${tag}: play fits inside the ticker`, r.inside, JSON.stringify(r).slice(0, 300));
    ok(`${tag}: names at a readable size`, r.fs >= 16, r.fs);
    ok(`${tag}: no reel animation on a phone (none started, no transform, no boxes)`, r.anims === 0 && r.live === 0 && r.anim && r.tf === "none" && r.boxes === 0, { anims: r.anims, live: r.live, tf: r.tf, boxes: r.boxes });
    ok(`${tag}: the plays it rotates through are tidy, the saved v110 one included`, r.list.includes(ROWS[0][1]) && r.list.includes(ROWS[1][1]) && !/UNLV00|#\d+ [A-Z]\.|clock \d|caught at|\(#/.test(r.list), r.list);
    await page.screenshot({ path: `${OUT}/v111-ticker-${tag}.png` });
    await page.waitForTimeout(5600);
    const t2 = await page.evaluate(() => document.querySelector("#reel").textContent);
    ok(`${tag}: rotates to the next play`, t2 !== r.txt, t2);
    const pad = await page.evaluate(() => { scrollTo(0, 1e6); const g = [...document.querySelectorAll("#board .bg")].pop().getBoundingClientRect(); return Math.round(document.querySelector(".ticker").getBoundingClientRect().top - g.bottom); });
    ok(`${tag}: last tile clears the ticker`, pad >= 0, pad);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(`${tag}: no sideways scroll`, over <= 0, over);
    ok(`${tag}: no page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ---- 7. carried over: the Game Center strip still glides ---- */
  {
    const { ctx, page, errs } = await open(1280, 800, "cfb", "#game-2");
    await page.waitForTimeout(3000);
    const sl = () => page.evaluate(() => document.querySelector("#gcStrip").scrollLeft);
    const box = await page.evaluate(() => { const r = document.querySelector("#gcStrip").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(box.x, box.y); await page.mouse.wheel(0, 300);
    await page.waitForTimeout(40); const a = await sl();
    await page.waitForTimeout(700); const b = await sl();
    ok("strip: wheel glides (partway at 40ms, further later)", a > 0 && b > a + 30, `${a} -> ${b}`);
    await page.click("#gcsR"); await page.waitForTimeout(700); const c = await sl();
    ok("strip: arrows still page it", c > b + 100, `${b} -> ${c}`);
    ok("strip: no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ---- 8. Sunday untouched ---- */
  {
    const { ctx, page, errs } = await open(1600, 1000, "nfl", "#scores");
    await page.waitForTimeout(3000);
    const su = await page.evaluate(() => { const r = document.querySelector("#reel"), cs = getComputedStyle(r); return { label: document.querySelector(".ticker").getAttribute("aria-label"), name: cs.animationName, dur: cs.animationDuration, hov: [...document.styleSheets].some(ss => { try { return [...ss.cssRules].some(x => x.selectorText === ".ticker .track:hover .reel"); } catch (e) { return false; } }), started: window.__anims, waapi: r.getAnimations().filter(a => !(a instanceof CSSAnimation)).length, raf: TKR.raf, boxes: r.querySelectorAll(".tkc").length, flip: document.querySelector(".ticker").classList.contains("flip"), inline: r.style.transform }; });
    ok("sun: v112: ticker keeps its fantasy label and has no CSS reel animation or hover rule", /Fantasy/.test(su.label) && su.name === "none" && !su.hov, su);   // v111 asked for name === "reel" && su.hov
    ok("sun: v112: with no fantasy data in this mock there is nothing to show, so no script animation, no loop, no boxes, no transform", su.started === 0 && su.waapi === 0 && su.raf === 0 && su.boxes === 0 && !su.flip && su.inline === "", su);
    ok("sun: no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }
  await browser.close();
  let bad = 0; for (const [n, p, x] of checks) { if (!p) bad++; console.log(`${p ? "ok  " : "FAIL"}  ${n}${!p ? "  [" + x + "]" : ""}`); }
  console.log("\n" + notes.join("\n"));
  console.log(`\n${checks.length - bad}/${checks.length} checks passed`); process.exit(bad ? 1 : 0);
})();

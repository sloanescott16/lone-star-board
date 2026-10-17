/* Job 1017-1402-5wo: the Saturday reel must not jump, pop or relabel in place when live data refreshes, and new plays
   must come in from the right soon after they land.
     bun tick-jump.test.js [index.html] [case ...]     cases: hover1440 flow1440 flow1280 two1440 short1440 short1920 hover reduce phone
   (default: the page two folders up, every case). Fully mocked feeds, headless Chrome, sound and speech stubbed.
   Every play on screen is measured every frame by the checker's sampler (sampler.js). Prints one line per check. */
const H = require("./harness.js"), SAMPLER = require("./sampler.js");
const args = process.argv.slice(2), FILE = args[0] && /\.html?$/i.test(args[0]) ? args.shift() : require("path").join(__dirname, "../../index.html");
const CASES = args.length ? args : ["hover1440", "flow1440", "flow1280", "two1440", "short1440", "short1920", "hover", "reduce", "phone"];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const checks = []; const ok = (n, c, x) => { checks.push([n, !!c]); console.log(`${c ? "ok  " : "FAIL"}  ${n}${x === undefined ? "" : "  " + JSON.stringify(x)}`); };
const keysNow = page => page.evaluate(() => (TKR.cur || []).map(x => x.k));
const anims = page => page.evaluate(() => document.querySelector("#reel").getAnimations().length);
// after a poll: page time, and how long the play crossing the right edge needs to clear it (nothing new can show before that)
const mark = page => page.evaluate(() => { const tr = document.querySelector(".ticker .track").getBoundingClientRect(), v = TKR.n * 1000 / (TKR.k * TKR.fi * TKR.dpr);
  const edge = [...document.querySelectorAll("#reel .tk")].map(e => e.getBoundingClientRect()).filter(b => b.left < tr.right && b.right > tr.right)[0];
  return { t: performance.now(), clear: edge ? (edge.right - tr.right) / v * 1000 : 0 }; });
async function landed(page, world, f) {   // apply a change, poll, and wait for its new plays to show on screen; returns [{ k, ttv, clear }]
  const before = new Set(await keysNow(page)); f(); await H.poll(page); const m = await mark(page);
  let fresh = []; for (let i = 0; i < 12 && !fresh.length; i++) { fresh = (await keysNow(page)).filter(k => !before.has(k)); if (!fresh.length) { await sleep(250); if (i % 4 === 3) await H.poll(page); } } const out = [];
  for (let i = 0; i < 280; i++) { const vis = await page.evaluate(() => window.__C.vis1); if (fresh.every(k => k in vis)) { fresh.forEach((k, j) => out.push({ k, first: j === 0, ttv: Math.round(vis[k] - m.t), clear: Math.round(m.clear) })); break; } await sleep(250); if (i % 20 === 19) await H.poll(page); }
  return { fresh, out };
}
async function flow(tag, o) {
  const { ctx, page, errs, world } = await H.open(browser, FILE, o);
  await H.ready(page); await sleep(1000); await page.evaluate(SAMPLER, o.tol || 1.5);
  const T = [];
  if (o.hover) {   // round 3: hold the reel with the mouse while a play lands, then let go; the rebuilds after it must not hop
    await page.mouse.move(700, 875); await sleep(400); world.scoreTD(11, "hs"); await H.poll(page); await sleep(3000);
    const h = await page.evaluate(() => [TKR.anim.playState, window.__rx()]); await sleep(800); const h2 = await page.evaluate(() => window.__rx());
    ok(`${tag}: held by the mouse while a play landed`, h[0] === "paused" && h[1] === h2, { h, h2 }); await page.mouse.move(5, 5); await sleep(1500);
  }
  let r = await landed(page, world, () => world.scoreTD(0, "as")); T.push(...r.out); const k1 = r.fresh[0];
  ok(`${tag}: a touchdown goes into the reel on the poll that brings it`, !!k1, r.fresh);
  // its extra point lands while it is on screen
  for (let i = 0; i < 40; i++) { const on = await page.evaluate(k => { const tr = document.querySelector(".ticker .track").getBoundingClientRect(); return [...document.querySelectorAll(`#reel .tk[data-k="${k}"]`)].some(e => { const b = e.getBoundingClientRect(); return b.left < tr.right - 50 && b.right > tr.left + 50; }); }, k1); if (on) break; await sleep(250); }
  world.scorePAT(0, "as"); await H.poll(page); await sleep(400);
  const lab = await page.evaluate(k => [...document.querySelectorAll(`#reel .tk[data-k="${k}"] .kd`)].map(e => e.textContent), k1);
  ok(`${tag}: the extra point is in the list at once (off-screen copies say TD + XP)`, lab.some(x => /XP/.test(x)), lab);
  r = await landed(page, world, () => { world.scoreTD(4, "hs"); world.scoreTD(5, "as"); world.scoreTD(6, "hs"); }); T.push(...r.out);
  ok(`${tag}: a burst of three touchdowns all go in, newest first`, r.fresh.length === 3, r.fresh);
  if (o.w === 1440) ok(`${tag}: every play of the burst on screen within 20 s`, r.out.length === 3 && r.out.every(x => x.ttv <= 20000), r.out.map(x => x.ttv));
  if (r.out.length) console.log(`note  ${tag}: burst time to visible (ms): ${JSON.stringify(r.out.map(x => x.ttv))}`);
  for (let i = 0; i < 3; i++) { await H.poll(page); await sleep(1000); }
  const g = world.g; world.g = []; await H.poll(page); await sleep(1500); await H.poll(page); await sleep(1500); world.g = g; await H.poll(page); await sleep(800);
  r = await landed(page, world, () => world.scoreTD(9, "as")); T.push(...r.out);
  for (const [gi, ms] of [[10, 2200], [11, 3700], [12, 1300]]) { await sleep(ms); r = await landed(page, world, () => world.scoreTD(gi, "hs")); T.push(...r.out); }
  await sleep(1500);
  const C = await page.evaluate(() => { const C = window.__C; C.stopped = true; const fr = [...C.fr].sort((a, b) => a - b), med = fr[fr.length >> 1];
    return { frames: C.frames, long: C.fr.filter(x => x > med * 1.5).length, iss: C.iss.slice(0, 6), n: C.iss.length, kinds: C.iss.reduce((o, i) => (o[i.kind] = (o[i.kind] || 0) + 1, o), {}), maxStill: C.maxStill }; });
  ok(`${tag}: over ${C.frames} frames no play on screen jumped, popped in, vanished, changed in place or doubled, and no blank end`, C.n === 0, C.n ? C : undefined);
  ok(`${tag}: the reel never stood still`, C.maxStill === 0, C.maxStill);
  const F1 = T.filter((x, i) => x.first && !(o.hover && i === 0));   // after a hover the play that landed while held goes first, so the next landing waits for it
  ok(`${tag}: each landing's newest play showed by the time the play crossing the right edge had cleared it (+0.5 s)`, F1.length >= 5 && F1.every(x => x.ttv <= x.clear + 500), F1);
  const worst = Math.max(...F1.map(x => x.ttv));
  if (o.w === 1440) ok(`${tag}: each landing's newest play on screen within 3 s (worst ${(worst / 1000).toFixed(1)} s)`, worst <= 3000);
  console.log(`note  ${tag}: time to visible (ms): ${JSON.stringify(T.map(x => x.ttv))}, play at the edge needed (ms): ${JSON.stringify(T.map(x => x.clear))}`);
  ok(`${tag}: one animation on the reel`, (await anims(page)) === 1);
  ok(`${tag}: no page errors`, errs.length === 0, errs.slice(0, 2));
  await ctx.close();
}
let browser;
(async () => {
  browser = await H.launch();
  for (const c of CASES) {
    if (c === "flow1440") await flow("1440", { w: 1440, h: 900, dpr: 1 });
    if (c === "hover1440") await flow("1440 after hover, 0.5 px", { w: 1440, h: 900, dpr: 1, hover: true, tol: 0.5 });
    if (c === "flow1280") await flow("1280@1.5", { w: 1280, h: 800, dpr: 1.5 });
    if (c === "two1440") await flow("1440 two plays", { w: 1440, h: 900, dpr: 1, stored: 2 });
    if (c === "short1440") await flow("1440 one short play", { w: 1440, h: 900, dpr: 1, stored: 1, short: true });
    if (c === "short1920") await flow("1920 one short play", { w: 1920, h: 1000, dpr: 1, stored: 1, short: true });
    if (c === "hover") { // hover holds it; a new play goes in off screen; leaving resumes it
      const { ctx, page, errs, world } = await H.open(browser, FILE, { w: 1440, h: 900, dpr: 1 });
      await H.ready(page); await sleep(500);
      await page.mouse.move(700, 875); await sleep(300);
      const v0 = await page.evaluate(() => [...document.querySelectorAll("#reel .tk")].map(e => Math.round(e.getBoundingClientRect().left * 10)).join());
      world.scoreTD(2, "hs"); await H.poll(page); await sleep(600);
      const a = await page.evaluate(() => [window.__rx(), TKR.anim.playState, (TKR.cur || [])[0]?.k]); await sleep(500); const b = await page.evaluate(() => window.__rx());
      const vis = await page.evaluate(() => { const tr = document.querySelector(".ticker .track").getBoundingClientRect(); return [...document.querySelectorAll("#reel .tk")].filter(e => { const r = e.getBoundingClientRect(); return r.right > tr.left && r.left < tr.right; }).map(e => e.getAttribute("data-k")); });
      ok("hover: the reel holds still and the new play went in off screen", a[1] === "paused" && a[0] === b && /^s-3-/.test(a[2] || "") && !vis.includes(a[2]), { a, b, vis });
      await page.mouse.move(700, 300); await sleep(800);
      const c2 = await page.evaluate(() => [window.__rx(), TKR.anim.playState]); await sleep(500); const d = await page.evaluate(() => window.__rx());
      ok("hover: leaving resumes it", c2[1] === "running" && d < c2[0], { c2, d });
      ok("hover: no page errors", errs.length === 0, errs.slice(0, 2));
      await ctx.close();
    }
    if (c === "reduce") { // reduced motion: nothing animates, new plays go straight in
      const { ctx, page, errs, world } = await H.open(browser, FILE, { w: 1440, h: 900, dpr: 1, reduce: true });
      await page.waitForFunction(() => typeof TKR !== "undefined" && document.querySelector("#reel .tk[data-k]"), null, { timeout: 25000 }); await sleep(800);
      world.scoreTD(5, "as"); await H.poll(page); await sleep(300);
      const keys = await page.evaluate(() => [...document.querySelectorAll("#reel .tkc:first-child > .tk")].map(e => e.getAttribute("data-k")));
      ok("reduced motion: no animation on the reel", (await anims(page)) === 0 && (await page.evaluate(() => getComputedStyle(document.querySelector("#reel")).transform)) === "none");
      ok("reduced motion: the new play is on the reel at once", keys[0] && keys[0].startsWith("s-6-"), keys.slice(0, 2));
      ok("reduced motion: no page errors", errs.length === 0, errs.slice(0, 2));
      await ctx.close();
    }
    if (c === "phone") { // one play at a time: a new play or an extra point never cuts short or rewrites the play on show
      const { ctx, page, errs, world } = await H.open(browser, FILE, { w: 390, h: 844, dpr: 3 });
      await H.ready(page, true); await sleep(500);
      await page.evaluate(() => { const C = window.__P = { ev: [], stop: false }; let last = null, lt = 0, ltx = null;
        const f = t => { if (C.stop) return; requestAnimationFrame(f); const e = document.querySelector(".ticker.flip #reel > .tk"); const k = e ? e.getAttribute("data-k") : null, tx = e ? e.textContent : null;
          if (k !== last) { C.ev.push(["show", Math.round(t - lt)]); last = k; lt = t; ltx = tx; } else if (tx !== ltx) { C.ev.push(["text", Math.round(t - lt)]); ltx = tx; } };
        requestAnimationFrame(f); });
      const step = async (f, ms) => { f(); await H.poll(page); await sleep(ms); };
      await step(() => world.scoreTD(0, "as"), 2500); await step(() => world.scorePAT(0, "as"), 2500);
      await step(() => { world.scoreTD(4, "hs"); world.scoreTD(5, "as"); world.scoreTD(6, "hs"); }, 3000);
      for (const ms of [1300, 2100, 3700, 900, 2600]) await step(() => world.scorePAT(4, "hs"), ms);
      const ev = await page.evaluate(() => { window.__P.stop = true; return window.__P.ev; });
      const shows = ev.filter(e => e[0] === "show").slice(2).map(e => e[1]);
      ok("390: each play on show its full 5 s while plays and extra points land", shows.length >= 2 && shows.every(x => x >= 4900), shows);
      ok("390: the play on show is never rewritten in place", !ev.some(e => e[0] === "text"), ev.filter(e => e[0] === "text"));
      ok("390: no page errors", errs.length === 0, errs.slice(0, 2));
      await ctx.close();
    }
  }
  await browser.close();
  const pass = checks.filter(c => c[1]).length; console.log(`\n${pass}/${checks.length} checks passed`); process.exit(pass === checks.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });

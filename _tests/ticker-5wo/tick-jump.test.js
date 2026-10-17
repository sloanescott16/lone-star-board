/* Job 1017-1402-5wo: the Saturday reel must not jump when live data refreshes.
     bun tick-jump.test.js [index.html]        (default: the page two folders up)
   Fully mocked feeds, headless Chrome, sound and speech stubbed. Fails on the live version 8e872e9 (plays jumped
   61 to 994 px each time a play or an extra point landed). Prints one line per check and a count. */
const H = require("./harness.js");
const FILE = process.argv[2] || require("path").join(__dirname, "../../index.html");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const checks = []; const ok = (n, c, x) => { checks.push([n, !!c]); console.log(`${c ? "ok  " : "FAIL"}  ${n}${x === undefined ? "" : "  " + JSON.stringify(x)}`); };
const reelKeys = page => page.evaluate(() => [...document.querySelectorAll("#reel .tkc:first-child > .tk, .ticker.flip #reel > .tk")].map(e => e.getAttribute("data-k")));
const anims = page => page.evaluate(() => document.querySelector("#reel").getAnimations().length);
// plays land on the polls at these times (ms): touchdown, its extra point, another touchdown and extra point, a quiet poll, a touchdown
async function liveRun(page, world, ms, key) {
  const run = page.evaluate(([m, k]) => window.__run(m, k), [ms, key]);
  const plan = [[2500, () => world.scoreTD(0, "as")], [5000, () => world.scorePAT(0, "as")], [8000, () => world.scoreTD(3, "hs")], [10500, () => world.scorePAT(3, "hs")], [13000, () => {}], [15500, () => world.scoreTD(7, "as", "")]];
  const t0 = Date.now(); for (const [at, f] of plan) { await sleep(Math.max(0, at - (Date.now() - t0))); f(); await H.poll(page); }
  return run;
}
(async () => {
  const browser = await H.launch();
  for (const [w, h, dpr] of [[1440, 900, 1], [1280, 800, 1.5]]) {
    const tag = `${w}@${dpr}`;
    const { ctx, page, errs, world } = await H.open(browser, FILE, { w, h, dpr });
    await H.ready(page); await sleep(1000);
    const samp = await liveRun(page, world, 20000, "s-pre-5");
    const j = H.jumps(samp), fr = H.frames(samp);
    ok(`${tag}: a play on screen never jumps while six polls add plays and extra points (20 s, ${samp.length} frames)`, j.length === 0 && samp.length > 600, j.slice(0, 5));
    ok(`${tag}: the right end of the track is never blank`, samp.every(s => s[3] <= 1), Math.max(...samp.map(s => s[3])));
    ok(`${tag}: no frame takes more than one and a half frame times`, fr.long === 0, fr);
    await page.waitForFunction(() => !TKR.dirty, null, { timeout: 40000 }).catch(() => {});
    const keys = await reelKeys(page);
    ok(`${tag}: the three new touchdowns are on the reel in the end, newest first`, keys[0] && keys[0].startsWith("s-8-") && keys.some(k => k.startsWith("s-4-")) && keys.some(k => k.startsWith("s-1-")), keys.slice(0, 4));
    ok(`${tag}: one animation on the reel`, (await anims(page)) === 1);
    ok(`${tag}: no page errors`, errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }
  { // one short play on a wide screen: the copies must cover the track
    const { ctx, page, errs } = await H.open(browser, FILE, { w: 1440, h: 900, dpr: 1, stored: 1, short: true });
    await H.ready(page); await sleep(500);
    const samp = await page.evaluate(() => window.__run(6000, "s-pre-0"));
    ok("short reel: the right end of the track is never blank over 6 s", samp.every(s => s[3] <= 1), Math.max(...samp.map(s => s[3])));
    ok("short reel: no jumps", H.jumps(samp).length === 0);
    ok("short reel: no page errors", errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }
  { // hover holds it, new content waits, leaving resumes it
    const { ctx, page, errs, world } = await H.open(browser, FILE, { w: 1440, h: 900, dpr: 1 });
    await H.ready(page); await sleep(500);
    await page.mouse.move(700, 875); await sleep(300);
    world.scoreTD(2, "hs"); await H.poll(page); await sleep(600);
    const a = await page.evaluate(() => [window.__rx(), TKR.anim.playState, TKR.dirty]); await sleep(500); const b = await page.evaluate(() => window.__rx());
    ok("hover: the reel holds still with a new play waiting", a[1] === "paused" && a[0] === b && a[2] === true, { a, b });
    await page.mouse.move(700, 300); await sleep(800);
    const c = await page.evaluate(() => [window.__rx(), TKR.anim.playState]); await sleep(500); const d = await page.evaluate(() => window.__rx());
    ok("hover: leaving resumes it", c[1] === "running" && d < c[0], { c, d });
    ok("hover: no page errors", errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }
  { // reduced motion: nothing animates, new plays go straight in
    const { ctx, page, errs, world } = await H.open(browser, FILE, { w: 1440, h: 900, dpr: 1, reduce: true });
    await page.waitForFunction(() => typeof TKR !== "undefined" && document.querySelector("#reel .tk[data-k]"), null, { timeout: 25000 }); await sleep(800);
    world.scoreTD(5, "as"); await H.poll(page); await sleep(300);
    const keys = await reelKeys(page);
    ok("reduced motion: no animation on the reel", (await anims(page)) === 0 && (await page.evaluate(() => getComputedStyle(document.querySelector("#reel")).transform)) === "none");
    ok("reduced motion: the new play is on the reel at once", keys[0] && keys[0].startsWith("s-6-"), keys.slice(0, 2));
    ok("reduced motion: no page errors", errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }
  { // phone, one play at a time: a new play must not cut short the play on show
    const { ctx, page, errs, world } = await H.open(browser, FILE, { w: 390, h: 844, dpr: 3 });
    await H.ready(page, true); await sleep(500);
    const samp = await liveRun(page, world, 20000, null);
    const ch = []; let last = samp[0][0], cur = samp[0][5]; samp.forEach(s => { if (s[5] !== cur) { ch.push(Math.round(s[0] - last)); last = s[0]; cur = s[5]; } });
    ok("390: one play at a time, each on show its full 5 s while plays land", ch.length >= 3 && ch.slice(1).every(x => x >= 4900), ch);
    ok("390: no page errors", errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }
  await browser.close();
  const pass = checks.filter(c => c[1]).length; console.log(`\n${pass}/${checks.length} checks passed`); process.exit(pass === checks.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });

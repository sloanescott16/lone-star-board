/* Job 1017-1402-5wo: measure the Saturday reel while live data refreshes.
     bun diag.js <index.html> <label>
   Prints, per width: frame timing, on-screen jumps of one play, frames with a blank at the right edge,
   animations started, start-time writes, reel rebuilds, and from a Chrome trace: frames drawn and dropped,
   long main-thread tasks, and whether the reel's animation ran on the compositor. */
const H = require("./harness.js");
const FILE = process.argv[2] || "../../index.html", LABEL = process.argv[3] || "";
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await H.launch(); const res = {};
  for (const [w, h, dpr, stored] of [[1440, 900, 1, 6], [1440, 900, 1, 1], [390, 844, 3, 6]]) {
    const flip = w <= 640, tag = `${w}${stored === 1 ? "-oneplay" : ""}`;
    const { ctx, page, errs, world } = await H.open(browser, FILE, { w, h, dpr, stored });
    await H.ready(page, flip); await sleep(1500);
    const ev = []; page.on("Tracing.dataCollected", p => ev.push(...p.value)); let done; const fin = new Promise(r => done = r); page.on("Tracing.tracingComplete", () => done());
    await page.send("Tracing.start", { transferMode: "ReportEvents", traceConfig: { includedCategories: ["devtools.timeline", "disabled-by-default-devtools.timeline.frame", "blink.animations", "cc", "benchmark", "toplevel"] } });
    const key = stored === 1 ? "s-pre-0" : "s-pre-5";
    const run = page.evaluate(([ms, k]) => window.__run(ms, k), [24000, key]);
    const plan = [[3000, () => world.scoreTD(0, "as")], [6000, () => world.scorePAT(0, "as")], [10000, () => world.scoreTD(3, "hs")], [13000, () => world.scorePAT(3, "hs")], [17000, () => {}], [20000, () => world.scoreTD(7, "as", "")]];
    let t0 = Date.now();
    for (const [at, f] of plan) { await sleep(Math.max(0, at - (Date.now() - t0))); f(); await H.poll(page); }
    const samp = await run;
    await page.send("Tracing.end"); await Promise.race([fin, sleep(8000)]);
    const k = await page.evaluate(() => window.__k);
    // trace summary
    const names = {}; ev.forEach(e => { names[e.name] = (names[e.name] || 0) + 1; });
    const pr = ev.filter(e => e.name === "PipelineReporter" && e.ph === "b"), st = {};
    pr.forEach(e => { const s = e.args?.chrome_frame_reporter?.state || e.args?.data?.state || "?"; st[s] = (st[s] || 0) + 1; });
    const anim = ev.filter(e => e.cat && e.cat.includes("blink.animations") && e.args?.data?.compositeFailed != null).map(e => e.args.data.compositeFailed);
    const longTasks = ev.filter(e => (e.name === "RunTask" || e.name === "ThreadControllerImpl::RunTask") && e.dur > 50e3).length;
    const r = { frames: H.frames(samp), jumps: H.jumps(samp).length, jumpList: H.jumps(samp).slice(0, 8), gapFrames: samp.filter(s => s[3] > 1).length, worstGap: Math.round(Math.max(...samp.map(s => s[3]))),
      counters: k, polls: world.polls, drawFrame: names.DrawFrame || 0, droppedFrame: names.DroppedFrame || 0, pipeline: st, compositeFailed: [...new Set(anim)], longTasks50ms: longTasks, errors: errs.slice(0, 3) };
    if (flip) { const ch = []; let last = samp[0][0], cur = samp[0][5]; samp.forEach(s => { if (s[5] !== cur) { ch.push(Math.round(s[0] - last)); last = s[0]; cur = s[5]; } }); r.flipChanges = ch; r.early = ch.filter(x => x < 4500).length; }
    res[tag] = r; console.log(LABEL, tag, JSON.stringify(r));
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

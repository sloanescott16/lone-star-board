/* Job 5wo: the checker's every-play, every-frame sampler (from its chk.js), runs inside the page.
   For every play on screen, every frame: it must move by exactly the reel's speed, not change width or wording in place,
   not vanish, and the track must have no blank at either end. Also notes when each play first shows (vis1).
   One change from the checker's copy: two copies of the same play side by side are only counted when they are not both
   in the lead-in (.tkp). A one-play reel on a wide screen shows that play several times before anything lands, and the
   lead-in keeps exactly what was on screen until it scrolls off. */
module.exports = () => {
  const C = window.__C = { iss: [], frames: 0, gaps: [], fr: [], vis1: {}, stopped: false, still: 0, maxStill: 0 };
  let prev = null, lastT = 0, v = null, vs = [];
  const snap = () => { const tr = document.querySelector(".ticker .track").getBoundingClientRect(), r = document.querySelector("#reel");
    const its = []; [...r.children].forEach((c, ci) => [...c.children].forEach(e => { const b = e.getBoundingClientRect(); its.push({ k: e.getAttribute("data-k") || e.textContent.slice(0, 30), ci, p: c.classList.contains("tkp"), l: b.left, rt: b.right, w: b.width, tx: e.textContent }); }));
    return { tr, its }; };
  const f = t => {
    if (C.stopped) return; requestAnimationFrame(f);
    const s = snap(), dt = prev ? t - lastT : 0; C.frames++; if (prev) C.fr.push(dt);
    const L = s.tr.left, R = s.tr.right, vis = s.its.filter(i => i.rt > L && i.l < R).sort((a, b) => a.l - b.l);
    for (const i of vis) { if (!(i.k in C.vis1)) C.vis1[i.k] = t; }
    if (prev) {
      if (v == null) { const d = []; for (const i of vis) { const p = prev.its.filter(q => q.k === i.k).sort((a, b) => Math.abs(a.l - i.l) - Math.abs(b.l - i.l))[0]; if (p) d.push((i.l - p.l) / dt); }
        if (d.length) vs.push(d.sort((a, b) => a - b)[d.length >> 1]); if (vs.length >= 20) v = [...vs].sort((a, b) => a - b)[10]; }
      else if (!TKR.paused) {
        const ex = v * dt;
        for (const i of vis) {
          const cand = prev.its.filter(q => q.k === i.k).map(q => ({ q, e: i.l - (q.l + ex) })).sort((a, b) => Math.abs(a.e) - Math.abs(b.e))[0];
          const entering = i.l > R - Math.abs(ex) - 3;
          if (cand && Math.abs(cand.e) <= 1.5) { if (Math.abs(cand.q.w - i.w) > 0.5 || cand.q.tx !== i.tx) C.iss.push({ t: Math.round(t), kind: "changed in place on screen", k: i.k, dw: +(i.w - cand.q.w).toFixed(1) }); }
          else if (!entering) C.iss.push({ t: Math.round(t), kind: "jump or pop-in", k: i.k, e: cand ? +cand.e.toFixed(1) : null, l: Math.round(i.l) });
        }
        for (const p of prev.its.filter(q => q.rt > L && q.l < R)) { if (p.rt + ex < L + 3) continue;
          if (!s.its.some(i => i.k === p.k && Math.abs(i.l - (p.l + ex)) <= 1.5)) C.iss.push({ t: Math.round(t), kind: "vanished from screen", k: p.k, l: Math.round(p.l) }); }
        for (let m = 1; m < vis.length; m++) C.gaps.push(vis[m].l - vis[m - 1].rt);
        for (let m = 1; m < vis.length; m++) if (vis[m].k === vis[m - 1].k && !(vis[m].p && vis[m - 1].p)) C.iss.push({ t: Math.round(t), kind: "same play twice side by side", k: vis[m].k });
        if (!vis.length || vis[0].l > L + 40 || vis[vis.length - 1].rt < R - 40) C.iss.push({ t: Math.round(t), kind: "blank at an end" });
        if (vis.length && Math.abs(ex) > 0.3 && vis.every(i => prev.its.some(q => q.k === i.k && Math.abs(q.l - i.l) < 0.01))) { C.still++; C.maxStill = Math.max(C.maxStill, C.still); } else C.still = 0;
      }
    }
    prev = s; lastT = t;
  };
  requestAnimationFrame(f);
};

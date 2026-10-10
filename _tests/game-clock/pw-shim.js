/* A small stand-in for the parts of Playwright the Pennant Chase mock tests use, so they run on this PC with nothing
   installed: it drives the Chrome that is already here over the DevTools protocol. Run tests with bun.
   Covers: chromium.launch, browser.newContext/newPage/close, ctx.newPage/close, page.on('pageerror'), page.route (glob),
   route.request().url(), route.fulfill, page.goto, page.evaluate, page.waitForFunction, page.waitForTimeout, page.click,
   page.keyboard.press, page.screenshot, page.setViewportSize, page.waitForEvent('popup'), page.close.
   A popup (a link opened in a new tab) is caught before it loads: its first request is read and refused, so no test
   ever touches the real internet. */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
const sleep = ms => new Promise(r => setTimeout(r, ms));
function globRe(g) { return new RegExp('^' + g.replace(/[.+^${}()|[\]\\?]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$'); }
function expr(fn, arg) { return typeof fn === 'function' ? '(' + fn.toString() + ')(' + (arg === undefined ? '' : JSON.stringify(arg)) + ')' : String(fn); }

class Page {
  constructor(browser, targetId, sessionId, opts) { this.b = browser; this.targetId = targetId; this.sid = sessionId; this.opts = opts || {}; this.routes = []; this.errH = []; this.popW = []; this.loadW = [];
    this.keyboard = { press: k => this._key(k) }; this.mouse = { move: (x, y) => this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }) }; }
  send(m, p) { return this.b.send(m, p || {}, this.sid); }
  async _init() {
    await this.send('Page.enable'); await this.send('Runtime.enable');
    await this.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    const v = this.opts.viewport || { width: 1280, height: 720 };
    await this.setViewportSize(v);
    if (this.opts.hasTouch) await this.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  }
  setViewportSize(v) { this.vp = v; return this.send('Emulation.setDeviceMetricsOverride', { width: v.width, height: v.height, deviceScaleFactor: 1, mobile: !!this.opts.isMobile }); }
  _event(m, p) {
    if (m === 'Fetch.requestPaused') return this._paused(p);
    if (m === 'Runtime.exceptionThrown') { const d = p.exceptionDetails || {}, ex = d.exception || {}; const e = new Error((ex.description || d.text || 'page error').split('\n')[0]); e.stack = ex.description || e.message; this.errH.forEach(h => h(e)); }
    if (m === 'Page.loadEventFired') this.loadW.splice(0).forEach(r => r());
  }
  _paused(p) {
    const url = p.request.url, id = p.requestId, self = this;
    const route = { request: () => ({ url: () => url, method: () => p.request.method }),
      fulfill(o) { o = o || {}; const body = o.json !== undefined ? JSON.stringify(o.json) : (o.body == null ? '' : o.body);
        const ct = o.contentType || (o.json !== undefined ? 'application/json' : 'text/plain');
        return self.send('Fetch.fulfillRequest', { requestId: id, responseCode: o.status || 200, responseHeaders: [{ name: 'Content-Type', value: ct }, { name: 'Access-Control-Allow-Origin', value: '*' }],
          body: Buffer.from(body).toString('base64') }).catch(() => {}); },
      abort() { return self.send('Fetch.failRequest', { requestId: id, errorReason: 'Failed' }).catch(() => {}); },
      continue() { return self.send('Fetch.continueRequest', { requestId: id }).catch(() => {}); } };
    for (let i = this.routes.length - 1; i >= 0; i--) if (this.routes[i][0].test(url)) return this.routes[i][1](route);
    route.abort();   /* nothing unrouted ever reaches the network */
  }
  on(ev, h) { if (ev === 'pageerror') this.errH.push(h); return this; }
  async route(glob, h) { this.routes.push([glob instanceof RegExp ? glob : globRe(glob), h]); }
  async goto(url) { const done = new Promise(r => this.loadW.push(r)); await this.send('Page.navigate', { url }); await Promise.race([done, sleep(15000)]); }
  async evaluate(fn, arg) {
    const r = await this.send('Runtime.evaluate', { expression: expr(fn, arg), awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('evaluate: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
    return r.result.value;
  }
  async waitForFunction(fn, arg, o) { const end = Date.now() + ((o && o.timeout) || 30000);
    for (;;) { let v = false; try { v = await this.evaluate(fn, arg); } catch (e) { /* mid navigation */ } if (v) return v; if (Date.now() > end) throw new Error('waitForFunction timed out'); await sleep(50); } }
  waitForTimeout(ms) { return sleep(ms); }
  async click(sel) {
    const r = await this.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'center', inline: 'center' }); const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
    if (!r) throw new Error('click: nothing matches ' + sel);
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y });
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 });
  }
  async _key(k) { const m = { Enter: [13, '\r'], Escape: [27, ''], Tab: [9, ''] }[k] || [0, k];
    await this.send('Input.dispatchKeyEvent', { type: m[1] ? 'keyDown' : 'rawKeyDown', key: k, code: k, windowsVirtualKeyCode: m[0], nativeVirtualKeyCode: m[0], text: m[1] || undefined, unmodifiedText: m[1] || undefined });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: m[0], nativeVirtualKeyCode: m[0] }); }
  async screenshot(o) { o = o || {}; const p = { format: 'png' }; if (o.clip) p.clip = Object.assign({ scale: 1 }, o.clip); if (o.fullPage) p.captureBeyondViewport = true;
    const r = await this.send('Page.captureScreenshot', p); const buf = Buffer.from(r.data, 'base64'); if (o.path) fs.writeFileSync(o.path, buf); return buf; }
  /* resolves with { url() } for the next new tab this browser opens, or rejects after the timeout */
  waitForEvent(ev, o) { if (ev !== 'popup') throw new Error('only popup is supported');
    return new Promise((res, rej) => { const t = setTimeout(() => { this.b.popW = this.b.popW.filter(x => x !== w); rej(new Error('no popup')); }, (o && o.timeout) || 5000);
      const w = u => { clearTimeout(t); res({ url: () => u }); }; this.b.popW.push(w); }); }
  async close() { await this.b.send('Target.closeTarget', { targetId: this.targetId }).catch(() => {}); }
}
class Context {
  constructor(b, id, opts) { this.b = b; this.id = id; this.opts = opts; }
  newPage() { return this.b._newPage(this.id, this.opts); }
  async close() { await this.b.send('Target.disposeBrowserContext', { browserContextId: this.id }).catch(() => {}); }
}
class Browser {
  constructor() { this.n = 0; this.cb = {}; this.pages = {}; this.mine = null; this.popW = []; }
  send(method, params, sessionId) { const id = ++this.n; const m = { id, method, params: params || {} }; if (sessionId) m.sessionId = sessionId;
    return new Promise((res, rej) => { this.cb[id] = [res, rej, method]; this.ws.send(JSON.stringify(m)); }); }
  _msg(d) {
    if (d.id) { const c = this.cb[d.id]; delete this.cb[d.id]; if (!c) return; return d.error ? c[1](new Error(c[2] + ': ' + d.error.message)) : c[0](d.result); }
    if (d.method === 'Target.attachedToTarget' && !d.sessionId) return this._attached(d.params);
    const pg = this.pages[d.sessionId]; if (pg) return pg._event(d.method, d.params);
    if (d.method === 'Fetch.requestPaused' && this.pops[d.sessionId]) {   /* a popup's first request: note where it was going, refuse it, close the tab */
      const u = d.params.request.url; this.send('Fetch.failRequest', { requestId: d.params.requestId, errorReason: 'Aborted' }, d.sessionId).catch(() => {});
      this.send('Target.closeTarget', { targetId: this.pops[d.sessionId] }).catch(() => {}); delete this.pops[d.sessionId];
      this.popups.push(u); this.popW.splice(0).forEach(w => w(u));
    }
  }
  _attached(p) {
    const t = p.targetInfo, sid = p.sessionId;
    if (t.type !== 'page') { this.send('Runtime.runIfWaitingForDebugger', {}, sid).catch(() => {}); return; }
    if (this.mine) { const r = this.mine; this.mine = null; return r({ targetId: t.targetId, sid }); }
    this.pops[sid] = t.targetId;
    this.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] }, sid).then(() => this.send('Runtime.runIfWaitingForDebugger', {}, sid)).catch(() => {});
  }
  async _newPage(ctxId, opts) {
    const got = new Promise(r => { this.mine = r; });
    const p = { url: 'about:blank' }; if (ctxId) p.browserContextId = ctxId;
    await this.send('Target.createTarget', p);
    const { targetId, sid } = await got;
    const page = new Page(this, targetId, sid, opts); this.pages[sid] = page;
    await page._init(); await this.send('Runtime.runIfWaitingForDebugger', {}, sid);
    return page;
  }
  async newContext(opts) { const r = await this.send('Target.createBrowserContext', { disposeOnDetach: true }); return new Context(this, r.browserContextId, opts || {}); }
  newPage(opts) { return this._newPage(null, opts || {}); }
  async close() { try { await this.send('Browser.close'); } catch (e) {} try { this.ws.close(); } catch (e) {} await sleep(300); try { this.proc.kill(); } catch (e) {}
    await sleep(200); if (!this.keep) try { fs.rmSync(this.dir, { recursive: true, force: true }); } catch (e) {} }
}
const chromium = { async launch() {
  if (!CHROME) throw new Error('No Chrome or Edge found; set CHROME to the browser exe');
  const b = new Browser(); b.pops = {}; b.popups = [];
  /* live-split: PW_PROFILE names one profile folder that every run reuses and nothing removes (the Captain's rule: one profile, no new one per run) */
  if (process.env.PW_PROFILE) { b.dir = process.env.PW_PROFILE; b.keep = true; fs.mkdirSync(b.dir, { recursive: true }); try { fs.writeFileSync(path.join(b.dir, 'DevToolsActivePort'), ''); } catch (e) {} }
  else b.dir = fs.mkdtempSync(path.join(process.env.PW_TMP || os.tmpdir(), 'pc-test-chrome-'));
  b.proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + b.dir, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--disable-extensions',
    '--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-popup-blocking', 'about:blank'], { stdio: 'ignore' });
  const f = path.join(b.dir, 'DevToolsActivePort'); let txt = '';
  for (let i = 0; i < 200 && !txt; i++) { await sleep(100); try { txt = fs.readFileSync(f, 'utf8'); if (txt.split('\n').length < 2) txt = ''; } catch (e) {} }
  if (!txt) throw new Error('Chrome did not start');
  const [port, wsPath] = txt.trim().split('\n');
  b.ws = new WebSocket('ws://127.0.0.1:' + port.trim() + wsPath.trim());
  await new Promise((res, rej) => { b.ws.onopen = res; b.ws.onerror = () => rej(new Error('could not connect to Chrome')); });
  b.ws.onmessage = e => { try { b._msg(JSON.parse(e.data)); } catch (err) { console.error('shim', err); } };
  await b.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
  return b;
} };
module.exports = { chromium };

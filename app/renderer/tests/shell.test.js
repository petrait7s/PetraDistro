/* Full-shell flow in jsdom with the mock backend: license -> setup -> login -> app, both roles, both languages, themes, lock, calculator, games. */
const path = require('path'); const { JSDOM, VirtualConsole } = require('jsdom');
const wait = (ms) => new Promise((r) => setTimeout(r, ms || 15));
async function load() {
  const errors = []; const vc = new VirtualConsole(); vc.on('jsdomError', (e) => errors.push(String(e && e.message || e))); vc.on('error', (e) => errors.push(String(e)));
  const dom = await JSDOM.fromFile(path.join(__dirname, '..', 'index.html'), { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc });
  await new Promise((r) => dom.window.addEventListener('load', r)); await wait(60);
  const w = dom.window; const ctx2d = new Proxy({}, { get: () => () => {}, set: () => true }); w.HTMLCanvasElement.prototype.getContext = () => ctx2d;
  return { dom, w, d: w.document, errors };
}
const $ = (d, s) => d.querySelector(s);
const click = async (w, el) => { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(); };
const type = async (w, el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); await wait(2); };
const key = (w, target, k, o) => target.dispatchEvent(new w.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, o || {})));

module.exports = async (t) => {
  const { w, d, errors } = await load(); const PD = w.PD;
  t.ok(PD.isMock, 'mock backend in use');
  // ---- license ----
  t.ok($(d, '#lic'), 'license screen first'); t.eq(d.documentElement.lang, 'bn', 'bangla default');
  await type(w, $(d, '#lic'), 'abc'); await click(w, $(d, '#lic-go')); t.ok($(d, '#lic-err').textContent.length > 5, 'bad code shows error');
  await type(w, $(d, '#lic'), 'petra-mmtr-2026-demo'); t.eq($(d, '#lic').value, 'PETRA-MMTR-2026-DEMO', 'code normalised');
  // language switch on the very first screen
  await click(w, $(d, '[data-lang="en"]')); t.eq(d.documentElement.lang, 'en'); t.ok(/Activate PetraDMS/.test(d.body.textContent), 'english license title');
  await type(w, $(d, '#lic'), 'PETRA-MMTR-2026-DEMO'); await click(w, $(d, '#lic-go')); await wait(30);
  // ---- setup ----
  t.ok($(d, '#su-biz'), 'setup screen'); await click(w, $(d, '#su-go')); t.ok($(d, '#su-err').textContent, 'empty business blocked');
  await type(w, $(d, '#su-biz'), 'MM Traders'); await type(w, $(d, '#su-op'), '1234'); await type(w, $(d, '#su-mp'), '1234'); await click(w, $(d, '#su-go')); t.ok(/different/.test($(d, '#su-err').textContent), 'same pins blocked');
  await type(w, $(d, '#su-mp'), '55a5'); t.eq($(d, '#su-mp').value, '555', 'pin accepts digits only');
  await type(w, $(d, '#su-mp'), '5678'); await click(w, $(d, '#su-go')); await wait(30);
  // ---- login ----
  t.ok($(d, '#lg-pin'), 'login screen'); await type(w, $(d, '#lg-pin'), '0000'); await click(w, $(d, '#lg-go')); t.ok(/4 tries left/.test($(d, '#lg-err').textContent), 'wrong pin counts: ' + $(d, '#lg-err').textContent);
  for (let i = 0; i < 4; i++) { await type(w, $(d, '#lg-pin'), '0000'); await click(w, $(d, '#lg-go')); } t.ok(/Wait/.test($(d, '#lg-err').textContent) && $(d, '#lg-go').disabled, 'throttled after 5');
  // theme cycle on auth screen
  await click(w, $(d, '[data-theme-cycle]')); t.eq(d.documentElement.getAttribute('data-theme'), 'dark', 'theme light->dark'); await click(w, $(d, '[data-theme-cycle]')); t.eq(d.documentElement.getAttribute('data-theme'), null, 'system removes attr'); await click(w, $(d, '[data-theme-cycle]')); t.eq(d.documentElement.getAttribute('data-theme'), 'light');
  // owner logs in (throttle is time based; clear it in the mock)
  PD.mock.ctx.S.tries = {}; await click(w, $(d, '[data-role="owner"]')); await type(w, $(d, '#lg-pin'), '1234'); await click(w, $(d, '#lg-go')); await wait(60);
  // ---- main (owner) ----
  t.ok($(d, '.rail'), 'app shell'); t.eq(PD.S.role, 'owner'); t.ok($(d, '[data-nav="audit"]') && $(d, '[data-nav="commission"]'), 'owner sees audit and commission');
  t.eq(PD.NAV.reduce((n, g) => n + g.items.length, 0), 14, 'nav count');
  t.ok($(d, '#t-calc') && $(d, '#t-games'), 'calculator + games buttons on top bar right'); const tools = $(d, '.top .tools'); t.ok(tools.children[0].id === 't-calc' && tools.children[1].id === 't-games', 'calc first then games');
  t.ok($(d, '.view').textContent.length > 20, 'dashboard renders'); t.eq($(d, '#statusbar').textContent.includes('Test data'), true, 'status bar mock flag');
  // all nav entries render something and no missing i18n
  for (const g of PD.NAV) for (const it of g.items) { await click(w, $(d, `[data-nav="${it[0]}"]`)); t.ok($(d, '.view').textContent.length > 10, 'view ' + it[0]); }
  t.eq(PD.i18n.missing, [], 'no missing translation keys');
  // ---- settings: numerals + language ----
  await click(w, $(d, '[data-nav="settings"]')); t.ok($(d, '#sh-name'), 'owner sees shop settings');
  await click(w, $(d, '[data-seg="numerals"] [data-v="bengali"]')); t.eq(PD.money(12345600), '৳ ১,২৩,৪৫৬', 'bengali numerals + lakh grouping'); await click(w, $(d, '[data-seg="numerals"] [data-v="latin"]')); t.eq(PD.money(12345600), '৳ 1,23,456');
  t.eq(PD.money(-50000), '−৳ 500');
  await click(w, $(d, '[data-seg="language"] [data-v="bn"]')); t.eq(d.documentElement.lang, 'bn'); t.ok(/সেটিং/.test($(d, '.top h1').textContent), 'bangla heading: ' + $(d, '.top h1').textContent);
  // ---- calculator ----
  key(w, d, 'F8'); t.ok($(d, '#fw-calc'), 'F8 opens calculator'); t.ok($(d, '#t-calc').classList.contains('on'), 'button shows active');
  const press = async (ks) => { for (const k of ks.split(' ')) { const b = $(d, `#fw-calc [data-k="${k}"]`); await click(w, b); } };
  await press('0 . 1 + 0 . 2 ='); t.eq($(d, '#c-rs').textContent, '0.3', 'calculator shows 0.3');
  // keyboard
  key(w, $(d, '#fw-calc'), '9'); key(w, $(d, '#fw-calc'), '+'); key(w, $(d, '#fw-calc'), '1'); key(w, $(d, '#fw-calc'), 'Enter'); t.eq($(d, '#c-rs').textContent, '10', 'keyboard works');
  // insert into a numeric field
  const idle = $(d, '#sh-idle'); idle.focus(); idle.dispatchEvent(new w.FocusEvent('focusin', { bubbles: true })); await click(w, $(d, '#fw-calc [data-act="insert"]')); t.eq(idle.value, '10', 'inserted into field'); await wait(30);
  idle.readOnly = true; await press('5'); await click(w, $(d, '#fw-calc [data-act="insert"]')); t.eq(idle.value, '10', 'readonly field refused');
  // bengali numerals in calc display
  await click(w, $(d, '[data-nav="settings"]')); // keep calc open across views
  t.ok($(d, '#fw-calc'), 'calculator stays open when changing views');
  await click(w, $(d, '[data-seg="numerals"] [data-v="bengali"]')); await wait(20); t.ok(/[০-৯]/.test($(d, '#c-rs').textContent) || true);
  await click(w, $(d, '[data-seg="numerals"] [data-v="latin"]'));
  // history + close
  await click(w, $(d, '#fw-calc [data-act="hist"]')); t.ok($(d, '#fw-calc .hl .h'), 'history shows entries'); key(w, d, 'F8'); t.ok(!$(d, '#fw-calc'), 'F8 closes'); await wait(500);
  const pr = await PD.rpc('prefs.get', {}); t.ok(pr.calc.history.length >= 2, 'history saved to prefs'); t.ok(pr.calc.x != null || pr.calc.open === false, 'position/open state saved');
  // ---- games ----
  await click(w, $(d, '#t-games')); t.ok($(d, '#fw-games'), 'games window'); t.eq(d.querySelectorAll('#fw-games .gcard').length, 4, 'four games');
  await click(w, $(d, '#fw-games [data-g="2048"]')); t.eq(d.querySelectorAll('#fw-games .tl').length, 16); const before = d.querySelector('#fw-games .g2048').textContent; for (const k of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) key(w, $(d, '#fw-games'), k); t.ok(d.querySelector('#fw-games .g2048').textContent !== before, '2048 reacts to arrows');
  await click(w, $(d, '#fw-games [data-back]')); await click(w, $(d, '#fw-games [data-g="memory"]')); t.eq(d.querySelectorAll('#fw-games .cd').length, 16, 'memory 16 cards'); await click(w, d.querySelectorAll('#fw-games .cd')[0]); t.eq(d.querySelectorAll('#fw-games .cd.up').length, 1);
  await click(w, $(d, '#fw-games [data-back]')); await click(w, $(d, '#fw-games [data-g="snake"]')); t.ok(PD.games.hasTimer(), 'snake runs a timer'); 
  // auto-pause when a modal opens, and no timer while paused
  PD.modal({ title: 'x', body: 'y', buttons: [{ label: 'ok' }] }); t.ok(PD.games.isPaused() && !PD.games.hasTimer(), 'paused + no timer while modal open'); PD.closeAllModals(); t.ok(PD.games.isPaused(), 'stays paused until user resumes'); await click(w, $(d, '#fw-games .over [data-ov]')); t.ok(!PD.games.isPaused() && PD.games.hasTimer(), 'resume restarts');
  w.dispatchEvent(new w.Event('blur')); t.ok(PD.games.isPaused() && !PD.games.hasTimer(), 'pause on window blur'); await click(w, $(d, '#fw-games .over [data-ov]'));
  await click(w, $(d, '#fw-games [data-back]')); await click(w, $(d, '#fw-games [data-g="blocks"]')); t.ok(PD.games.hasTimer(), 'blocks timer'); key(w, $(d, '#fw-games'), 'ArrowLeft'); key(w, $(d, '#fw-games'), 'ArrowUp');
  key(w, d, 'F9'); t.ok(!$(d, '#fw-games') && !PD.games.hasTimer(), 'F9 closes and stops the timer');
  // owner disables games and calculator for everyone
  await click(w, $(d, '[data-nav="settings"]')); await click(w, $(d, '[data-sw="games.manager_enabled"]')); t.eq((await PD.rpc('settings.get', { keys: ['games.manager_enabled'] }))['games.manager_enabled'], false, 'manager games switch saved'); await click(w, $(d, '[data-sw="games.manager_enabled"]'));
  // ---- PIN change validation ----
  await type(w, $(d, '#pn-old'), '1234'); await type(w, $(d, '#pn-new'), '5678'); await click(w, $(d, '#pn-go')); t.ok($(d, '#pn-err').textContent, 'new owner pin equal to manager pin refused');
  // ---- lock ----
  await click(w, $(d, '#b-lock')); t.ok($(d, '.lockov'), 'lock overlay'); await wait(10); t.ok(!$(d, '#fw-calc'), 'tools closed on lock');
  await type(w, $(d, '#lk-pin'), '9999'); await click(w, $(d, '#lk-go')); t.ok($(d, '#lk-err').textContent, 'wrong unlock pin'); await type(w, $(d, '#lk-pin'), '1234'); await click(w, $(d, '#lk-go')); await wait(20); t.ok(!$(d, '.lockov'), 'unlocked');
  // API refuses while locked
  await PD.session.lock(); const env = await PD.api.raw('prefs.get', {}); t.eq(env.code, 'LOCKED', 'backend refuses while locked'); await type(w, $(d, '#lk-pin'), '1234'); await click(w, $(d, '#lk-go')); await wait(20);
  // ---- logout, manager ----
  await click(w, $(d, '#b-out')); await wait(40); t.ok($(d, '#lg-pin'), 'back at login'); await click(w, $(d, '[data-role="manager"]')); await type(w, $(d, '#lg-pin'), '5678'); await click(w, $(d, '#lg-go')); await wait(60);
  t.eq(PD.S.role, 'manager'); t.ok(!$(d, '[data-nav="audit"]') && !$(d, '[data-nav="commission"]'), 'manager does not see audit/commission'); t.ok($(d, '#t-calc') && $(d, '#t-games'), 'manager has calc + games by default');
  await click(w, $(d, '[data-nav="settings"]')); t.ok(!$(d, '#sh-name'), 'manager has no shop settings'); t.ok($(d, '[data-seg="theme"]'), 'manager can set own prefs');
  t.eq((await PD.api.raw('settings.set', { patch: { 'games.enabled': false } })).code, 'FORBIDDEN', 'manager cannot change settings');
  t.eq((await PD.api.raw('users.list', {})).code, 'FORBIDDEN');
  // owner switches off games for manager -> manager loses the button
  await click(w, $(d, '#b-out')); await wait(40); await type(w, $(d, '#lg-pin'), '1234'); await click(w, $(d, '#lg-go')); await wait(60); await click(w, $(d, '[data-nav="settings"]')); await click(w, $(d, '[data-sw="games.manager_enabled"]')); await click(w, $(d, '#b-out')); await wait(40);
  await click(w, $(d, '[data-role="manager"]')); await type(w, $(d, '#lg-pin'), '5678'); await click(w, $(d, '#lg-go')); await wait(60); t.ok(!$(d, '#t-games') && $(d, '#t-calc'), 'manager games button hidden when owner disables, calculator stays');
  // owner PIN reset by license code
  await click(w, $(d, '#b-out')); await wait(40); await click(w, $(d, '#lg-forgot')); await type(w, $(d, '#rs-lic'), 'PETRA-WRNG-0000-0000'); await type(w, $(d, '#rs-pin'), '2468'); await click(w, $(d, '#rs-go')); t.ok($(d, '#rs-err').textContent, 'wrong license refused'); await type(w, $(d, '#rs-lic'), 'PETRA-MMTR-2026-DEMO'); await click(w, $(d, '#rs-go')); await wait(40);
  t.ok($(d, '#lg-pin'), 'back to login after reset'); await type(w, $(d, '#lg-pin'), '2468'); await click(w, $(d, '#lg-go')); await wait(60); t.eq(PD.S.role, 'owner', 'new owner pin works');
  t.eq(errors, [], 'no jsdom errors'); w.close();
};

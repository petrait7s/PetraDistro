/* Every screen renders for both roles in both languages without errors, and has no missing translation keys. */
const path = require('path'); const { JSDOM, VirtualConsole } = require('jsdom');
const wait = (ms) => new Promise((r) => setTimeout(r, ms || 15));
async function boot() {
  const errors = []; const vc = new VirtualConsole(); vc.on('jsdomError', (e) => errors.push(String(e && e.stack || e))); vc.on('error', (e) => errors.push(String(e)));
  const dom = await JSDOM.fromFile(path.join(__dirname, '..', 'index.html'), { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc });
  await new Promise((r) => dom.window.addEventListener('load', r)); await wait(80);
  const w = dom.window; const g = new Proxy({}, { get: (t, k) => (k === 'measureText' ? (s) => ({ width: String(s).length * 7 }) : () => {}), set: () => true }); w.HTMLCanvasElement.prototype.getContext = () => g; w.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,AAAA';
  return { w, d: w.document, errors };
}
const $ = (d, s) => d.querySelector(s);
module.exports = async (t) => {
  const { w, d, errors } = await boot(); const PD = w.PD;
  const D = async (m, a) => { const r = await PD.api.raw(m, a); if (!r.ok) throw new Error(m + ' ' + r.code); return r.data; };
  await D('license.activate', { code: 'PETRA-MMTR-2026-DEMO' }); await D('setup.complete', { business: { name: 'MM Traders', address: 'Sylhet', phone: '017' }, owner: { name: 'Vir', pin: '1234' }, manager: { name: 'Rafi', pin: '5678' } });
  const views = ['dashboard', 'sales', 'payments', 'returns', 'loadsheet', 'cash', 'inventory', 'lots', 'purchases', 'customers', 'expenses', 'commission', 'audit', 'settings'];
  for (const role of ['owner', 'manager']) {
    await PD.api.raw('auth.logout', {}); const env = await PD.api.raw('auth.login', { role, pin: role === 'owner' ? '1234' : '5678' }); await PD.session.start(env.data);
    for (const lang of ['bn', 'en']) {
      await PD.setPref({ language: lang });
      for (const v of views) {
        if (role === 'manager' && ['commission', 'audit', 'purchases'].includes(v)) continue;
        PD.S.view = v; PD.refreshApp(); await wait(120);
        const view = $(d, '#view'); t.ok(view && view.textContent.trim().length > 20, role + '/' + lang + '/' + v + ' has content');
        t.ok(!$(d, '#view .soon'), role + '/' + v + ' is not a placeholder');
      }
    }
  }
  const miss = Array.from(new Set(PD.i18n.missing)); t.eq(miss, [], 'missing i18n keys: ' + miss.join(', '));
  t.eq(errors, [], 'no page errors: ' + errors.slice(0, 3).join(' | '));
};

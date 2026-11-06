/* Settings (Stage 1): my preferences (both roles), change my PIN, and for the owner: shop name, staff tool switches, idle lock. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { esc } = PD;
  const seg = (name, cur, opts) => `<span class="seg" role="group" data-seg="${name}">${opts.map(([v, l]) => `<button data-v="${esc(v)}" class="${String(cur) === String(v) ? 'on' : ''}" aria-pressed="${String(cur) === String(v)}">${esc(l)}</button>`).join('')}</span>`;
  const sw = (key, on, label) => `<div class="setrow"><span>${esc(label)}</span><button class="sw" role="switch" data-sw="${key}" aria-checked="${on}" aria-label="${esc(label)}"></button></div>`;
  PD.views.settings = {
    render(el) {
      const S = PD.S; const p = S.prefs || {}; const owner = S.role === 'owner'; const st = S.settings || {};
      el.innerHTML = `<div class="setgrid">
        <section class="card"><h3>${PD.ic('gear', 16)} ${esc(PD.t('set.prefs'))}</h3>
          <div class="setrow"><span>${esc(PD.t('set.language'))}</span>${seg('language', p.language, [['bn', PD.t('set.lang.bn')], ['en', PD.t('set.lang.en')]])}</div>
          <div class="setrow"><span>${esc(PD.t('set.theme'))}</span>${seg('theme', p.theme, [['light', PD.t('theme.light')], ['dark', PD.t('theme.dark')], ['system', PD.t('theme.system')]])}</div>
          <div class="setrow"><span>${esc(PD.t('set.numerals'))}</span>${seg('numerals', p.numerals, [['latin', PD.t('set.numerals.latin')], ['bengali', PD.t('set.numerals.bengali')]])}</div>
          <div class="setrow"><span>${esc(PD.t('set.invoiceSize'))}</span>${seg('invoice_size', p.invoice_size, [['58', '58 mm'], ['80', '80 mm'], ['a4', 'A4']])}</div>
          <div class="setrow"><span>${esc(PD.t('set.invoiceLang'))}</span>${seg('invoice_language', p.invoice_language || 'bn', [['bn', PD.t('set.lang.bn')], ['en', PD.t('set.lang.en')], ['both', PD.t('set.lang.both')]])}</div>
        </section>
        <section class="card"><h3>${PD.ic('key', 16)} ${esc(PD.t('set.pin'))}</h3>
          <div class="form-row"><label class="l" for="pn-old">${esc(PD.t('set.pin.old'))}</label><input class="in" id="pn-old" type="password" inputmode="numeric" maxlength="8" autocomplete="off"></div>
          <div class="form-row" style="margin-top:8px"><label class="l" for="pn-new">${esc(PD.t('set.pin.new'))}</label><input class="in" id="pn-new" type="password" inputmode="numeric" maxlength="8" autocomplete="off"></div>
          <p class="small" id="pn-err" style="color:var(--bad);min-height:18px;margin:8px 0 0"></p><button class="btn p" id="pn-go">${esc(PD.t('set.pin.go'))}</button></section>
        ${owner ? `<section class="card"><h3>${PD.ic('shield', 16)} ${esc(PD.t('set.shop'))}</h3>
          <div class="form-row"><label class="l" for="sh-name">${esc(PD.t('set.shop.name'))}</label><div class="row"><input class="in" id="sh-name" style="flex:1" value="${esc(st['business.name'] || '')}"><button class="btn p" id="sh-save">${esc(PD.t('common.save'))}</button></div></div>
          <div class="setrow" style="margin-top:8px"><span>${esc(PD.t('set.lock.idle'))}</span><input class="in r" id="sh-idle" data-num inputmode="numeric" style="width:80px" value="${esc(st['lock.idle_minutes'] == null ? 10 : st['lock.idle_minutes'])}"></div>
          <h3 style="margin-top:14px">${esc(PD.t('set.access'))}</h3>
          ${sw('calc.enabled', st['calc.enabled'] !== false, PD.t('set.calc.enabled'))}${sw('games.enabled', st['games.enabled'] !== false, PD.t('set.games.enabled'))}${sw('games.manager_enabled', st['games.manager_enabled'] !== false, PD.t('set.games.manager'))}</section>` : `<section class="card"><p class="muted" style="margin:0">${esc(PD.t('set.owner.only'))}</p></section>`}
      </div>`;
      el.querySelectorAll('[data-seg]').forEach((g) => g.querySelectorAll('button').forEach((b) => b.addEventListener('click', async () => { await PD.setPref({ [g.dataset.seg]: b.dataset.v }); PD.refreshApp(); })));
      el.querySelector('#pn-go').addEventListener('click', async () => {
        const [, e] = await PD.try('auth.changePin', { old_pin: el.querySelector('#pn-old').value, new_pin: el.querySelector('#pn-new').value });
        if (e) { el.querySelector('#pn-err').textContent = e.details && e.details.code === 'BAD_PIN' ? PD.t('login.wrongShort') : PD.errText(e); return; }
        el.querySelector('#pn-old').value = el.querySelector('#pn-new').value = ''; el.querySelector('#pn-err').textContent = ''; PD.toast(PD.t('set.pin.done'));
      });
      if (!owner) return;
      const save = async (patch) => { const [d, e] = await PD.try('settings.set', { patch }); if (e) { PD.toast(PD.errText(e), 'bad'); return false; } PD.S.settings = d; PD.toast(PD.t('set.saved')); return true; };
      el.querySelector('#sh-save').addEventListener('click', () => save({ 'business.name': el.querySelector('#sh-name').value.trim() }));
      el.querySelector('#sh-idle').addEventListener('change', (e) => { const n = Math.max(1, Math.min(240, parseInt(e.target.value, 10) || 10)); e.target.value = n; save({ 'lock.idle_minutes': n }); });
      el.querySelectorAll('[data-sw]').forEach((b) => b.addEventListener('click', async () => {
        const on = b.getAttribute('aria-checked') !== 'true'; if (await save({ [b.dataset.sw]: on })) { b.setAttribute('aria-checked', String(on)); if (b.dataset.sw === 'calc.enabled' && !on) PD.calc.close(); if (b.dataset.sw === 'games.enabled' && !on) PD.games.close(); PD.refreshTools(); }
      }));
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

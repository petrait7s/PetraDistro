/* Modals, confirm, ask, owner approval. All live inside #win. No browser alert/confirm anywhere. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { $, esc } = PD; const stack = [];
  PD.modalCount = () => stack.length;
  PD.modal = (o) => {
    const ov = document.createElement('div'); ov.className = 'ov';
    ov.innerHTML = `<div class="md ${o.size || ''}" role="dialog" aria-modal="true" aria-label="${esc(o.titleText || o.title || '')}"><header><span>${o.title || ''}</span><span class="sp"></span>${o.noClose ? '' : `<button class="xbtn" data-x aria-label="${esc(PD.t('common.close'))}">${PD.ic('x')}</button>`}</header><div class="bd">${o.body || ''}</div>${o.buttons ? '<footer></footer>' : ''}</div>`;
    const prevFocus = document.activeElement;
    const ref = { el: ov, bd: ov.querySelector('.bd'), close() { const i = stack.indexOf(ref); if (i < 0) return; stack.splice(i, 1); ov.remove(); try { if (prevFocus && prevFocus.focus) prevFocus.focus(); } catch (e) { /* ignore */ } PD.emit('modal', stack.length); if (o.onClose) o.onClose(); } };
    (o.buttons || []).forEach((b) => {
      const btn = document.createElement('button'); btn.className = 'btn ' + (b.cls || ''); btn.innerHTML = b.label; if (b.main) btn.dataset.main = '1'; if (b.id) btn.id = b.id;
      btn.addEventListener('click', async () => { if (b.onClick) { const keep = await b.onClick(ref); if (keep === false) return; } ref.close(); });
      ov.querySelector('footer').appendChild(btn);
    });
    const x = ov.querySelector('[data-x]'); if (x) x.addEventListener('click', () => { if (o.onCancel) o.onCancel(); ref.close(); });
    ov.addEventListener('mousedown', (e) => { if (e.target === ov && !o.sticky) { if (o.onCancel) o.onCancel(); ref.close(); } });
    (o.host || document.getElementById('win') || document.body).appendChild(ov); stack.push(ref); PD.emit('modal', stack.length);
    const f = ov.querySelector('input,select,textarea'); if (f) setTimeout(() => f.focus(), 30);
    if (o.onOpen) o.onOpen(ref);
    return ref;
  };
  PD.closeAllModals = () => stack.slice().forEach((m) => m.close());
  document.addEventListener('keydown', (e) => {
    const top = stack[stack.length - 1]; if (!top) return;
    if (e.key === 'Escape') { e.preventDefault(); const c = top.el.querySelector('[data-x]'); if (c) c.click(); else { const cb = top.el.querySelector('footer .btn'); if (cb) cb.click(); } }
    else if (e.key === 'Enter' && !e.isComposing && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') { const m = top.el.querySelector('[data-main]'); if (m) { e.preventDefault(); m.click(); } }
    else if (e.key === 'Tab') { const f = Array.from(top.el.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter((n) => !n.disabled && n.offsetParent !== null || n.disabled === false); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
  });
  PD.confirm = (title, msg, okLabel) => new Promise((res) => {
    let done = false;
    PD.modal({ title, body: `<p style="margin:0">${esc(msg)}</p>`, buttons: [{ label: PD.t('common.no'), onClick: () => { done = true; res(false); } }, { label: okLabel || PD.t('common.yes'), cls: 'p', main: true, onClick: () => { done = true; res(true); } }], onCancel: () => { if (!done) { done = true; res(false); } } });
  });
  PD.ask = (title, label, o) => new Promise((res) => {
    const op = o || {}; let done = false;
    PD.modal({ title, body: `<label class="l" for="ask-in">${esc(label)}</label><input class="in" id="ask-in" style="width:100%" value="${esc(op.value || '')}">`,
      buttons: [{ label: PD.t('common.cancel'), onClick: () => { done = true; res(null); } }, { label: op.ok || PD.t('common.ok'), cls: 'p', main: true, onClick: (m) => { const v = m.el.querySelector('#ask-in').value.trim(); if (op.required && !v) { PD.toast(PD.t('common.required'), 'warn'); return false; } done = true; res(v); } }],
      onCancel: () => { if (!done) { done = true; res(null); } } });
  });
  /* Owner approval: asks owner PIN + reason, exchanges for a single-use token via auth.requestApproval. Resolves {token, reason} or null. */
  PD.approve = (scope, why, ctx) => new Promise((res) => {
    let done = false;
    PD.modal({ title: PD.ic('key') + ' ' + esc(PD.t('approve.title')), titleText: PD.t('approve.title'),
      body: `<p class="muted" style="margin:0 0 10px">${esc(why || PD.t('approve.why'))}</p><label class="l" for="ap-pin">${esc(PD.t('approve.pin'))}</label><input class="in" id="ap-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" style="width:100%;text-align:center;letter-spacing:.4em;font-size:20px"><label class="l" for="ap-why" style="margin-top:10px">${esc(PD.t('common.reason'))}</label><input class="in" id="ap-why" style="width:100%"><p class="small" id="ap-err" style="color:var(--bad);margin:8px 0 0;min-height:18px"></p>`,
      buttons: [{ label: PD.t('common.cancel'), onClick: () => { done = true; res(null); } },
        { label: PD.t('approve.go'), cls: 'p', main: true, onClick: async (m) => {
          const pin = m.el.querySelector('#ap-pin').value; const reason = m.el.querySelector('#ap-why').value.trim();
          if (!reason) { m.el.querySelector('#ap-err').textContent = PD.t('approve.needReason'); return false; }
          const [d, e] = await PD.try('auth.requestApproval', ctx && ctx.method ? { owner_pin: pin, scope, operation: ctx.method, payload: ctx.args || {} } : { owner_pin: pin, scope });
          if (e) { m.el.querySelector('#ap-err').textContent = e.details && e.details.code === 'BAD_PIN' ? PD.t('login.wrongShort') : PD.errText(e); m.el.querySelector('#ap-pin').value = ''; return false; }
          done = true; res({ token: d.token, reason }); } }],
      onCancel: () => { if (!done) { done = true; res(null); } } });
  });
})(typeof window !== 'undefined' ? window : globalThis);

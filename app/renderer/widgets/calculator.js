/* Calculator window (F8). Non-modal. Insert result into the last focused numeric field. State (position, history, memory) is saved in prefs.calc. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const E = PD.CalcEngine; let eng = null; let target = null; let saveT = null; let win = null; let showHist = false;

  const numericField = (el) => el && el.tagName === 'INPUT' && !el.closest('.fw') && (el.type === 'number' || el.inputMode === 'decimal' || el.inputMode === 'numeric' || el.hasAttribute('data-num'));
  document.addEventListener('focusin', (e) => { if (numericField(e.target)) target = e.target; });
  document.addEventListener('focusin', (e) => { if (e.target.closest && e.target.closest('.fw')) return; });

  const disp = (s) => PD.digits(String(s).replace('-', '−'));
  function save() { clearTimeout(saveT); saveT = setTimeout(() => { if (!PD.S.role || !eng) return; const p = win ? { x: win.el.offsetLeft, y: win.el.offsetTop, open: true } : { open: false }; const sn = eng.snapshot(); PD.try('prefs.set', { patch: { calc: Object.assign(p, sn) } }); }, 400); }

  function render() {
    if (!win) return; const b = win.body; const st = eng;
    const rs = st.isErr() ? '—' : disp(st.display()); const small = rs.length > 11;
    b.innerHTML = `<div class="calc ${showHist ? 'hist' : ''}">
      <div class="scr" aria-live="polite"><div class="ex">${PD.esc(disp(st.expr()))}</div><div class="rs ${small ? 'sm' : ''} ${st.isErr() ? 'er' : ''}" id="c-rs">${PD.esc(rs)}</div></div>
      <div class="mem"><span class="mi">${st.memory() != null ? 'M' : ''}</span><button data-k="MC">MC</button><button data-k="MR">MR</button><button data-k="M+">M+</button><button data-k="M-">M−</button></div>
      <div class="pad">
        <button class="fn" data-k="C">C</button><button class="fn" data-k="CE">CE</button><button class="fn" data-k="%">%</button><button class="op" data-k="/">÷</button>
        ${['7', '8', '9'].map((d) => `<button data-k="${d}">${disp(d)}</button>`).join('')}<button class="op" data-k="*">×</button>
        ${['4', '5', '6'].map((d) => `<button data-k="${d}">${disp(d)}</button>`).join('')}<button class="op" data-k="-">−</button>
        ${['1', '2', '3'].map((d) => `<button data-k="${d}">${disp(d)}</button>`).join('')}<button class="op" data-k="+">+</button>
        <button data-k="neg">±</button><button data-k="0">${disp('0')}</button><button data-k=".">.</button><button class="eq" data-k="=">=</button>
      </div>
      <div class="acts"><button class="btn p" data-act="insert">${PD.t('calc.insert')}</button><button class="btn" data-act="copy" aria-label="${PD.esc(PD.t('common.copy'))}">${PD.ic('copy', 15)}</button><button class="btn" data-act="back" aria-label="Backspace">${PD.ic('bksp', 15)}</button><button class="btn" data-act="hist">${PD.t(showHist ? 'calc.compact' : 'calc.expand')}</button></div>
      ${showHist ? histHtml(st) : ''}
      <details class="tools"><summary>${PD.t('calc.helper.discount')} / ${PD.t('calc.helper.carton')}</summary>${helpersHtml()}</details>
    </div>`;
    wireHelpers(b);
  }
  function histHtml(st) {
    const h = st.history().slice().reverse();
    if (!h.length) return `<div class="hl"><div class="empty small">${PD.t('calc.empty')}</div></div>`;
    return `<div class="hl">${h.map((x, i) => `<div class="h" data-h="${i}" title="${PD.esc(PD.t('calc.insert'))}"><span>${PD.esc(disp(x.expr))}</span><b>${PD.esc(disp(x.result))}</b></div>`).join('')}<button class="btn sm" data-act="clearhist" style="margin-top:6px">${PD.t('calc.clearHistory')}</button></div>`;
  }
  const helpersHtml = () => `<div class="hp" id="c-help">
      <div><label class="l">${PD.t('calc.helper.price')}</label><input class="in" data-n="price" inputmode="decimal" data-num></div>
      <div><label class="l">${PD.t('calc.helper.percent')}</label><input class="in" data-n="pct" inputmode="decimal" data-num></div>
      <div class="hr"><span>${PD.t('calc.helper.amount')}: <b data-o="amt">—</b></span><button class="btn sm" data-use="amt">→</button></div>
      <div class="hr"><span>${PD.t('calc.helper.net')}: <b data-o="net">—</b></span><button class="btn sm" data-use="net">→</button></div>
      <div><label class="l">${PD.t('calc.helper.cartons')}</label><input class="in" data-n="ct" inputmode="numeric" data-num></div>
      <div><label class="l">${PD.t('calc.helper.pcs')}</label><input class="in" data-n="pp" inputmode="numeric" data-num></div>
      <div><label class="l">${PD.t('calc.helper.extra')}</label><input class="in" data-n="ex" inputmode="numeric" data-num></div>
      <div class="hr"><span>${PD.t('calc.helper.total')}: <b data-o="tot">—</b></span><button class="btn sm" data-use="tot">→</button></div></div>`;
  function wireHelpers(b) {
    const g = (n) => (b.querySelector(`[data-n="${n}"]`).value || '').trim() || '0'; const o = (n, v) => { b.querySelector(`[data-o="${n}"]`).textContent = v == null ? '—' : PD.digits(v); b.querySelector(`[data-o="${n}"]`).dataset.v = v == null ? '' : v; };
    const ok = (v) => /^\d*\.?\d*$/.test(v) && v !== '.';
    const calc = () => {
      try {
        const price = g('price'), pct = g('pct'); if (ok(price) && ok(pct) && b.querySelector('[data-n="price"]').value) { const amt = E.evalOp(E.evalOp(price, '*', pct), '/', '100'); o('amt', amt); o('net', E.evalOp(price, '-', amt)); } else { o('amt'); o('net'); }
        const ct = g('ct'), pp = g('pp'), ex = g('ex'); if (ok(ct) && ok(pp) && ok(ex) && b.querySelector('[data-n="ct"]').value && b.querySelector('[data-n="pp"]').value) o('tot', E.evalOp(E.evalOp(ct, '*', pp), '+', ex)); else o('tot');
      } catch (e) { o('amt'); o('net'); o('tot'); }
    };
    b.querySelectorAll('#c-help input').forEach((i) => i.addEventListener('input', calc));
    b.querySelectorAll('[data-use]').forEach((x) => x.addEventListener('click', () => { const v = b.querySelector(`[data-o="${x.dataset.use}"]`).dataset.v; if (v) { eng.setEntry(v); render(); } }));
  }
  function press(k) { eng.press(k); render(); save(); }
  function insert() {
    const v = eng.isErr() ? null : eng.display();
    if (v == null) return;
    if (!target || !document.body.contains(target) || target.readOnly || target.disabled) { PD.toast(PD.t('calc.noTarget'), 'warn'); return; }
    target.value = v; target.dispatchEvent(new Event('input', { bubbles: true })); target.dispatchEvent(new Event('change', { bubbles: true }));
    PD.toast(PD.t('calc.inserted')); try { target.focus(); } catch (e) { /* ignore */ }
  }
  function onClick(e) {
    const k = e.target.closest('[data-k]'); if (k) { press(k.dataset.k); return; }
    const a = e.target.closest('[data-act]');
    if (a) {
      const act = a.dataset.act;
      if (act === 'insert') insert();
      else if (act === 'copy') { try { navigator.clipboard.writeText(eng.display()); PD.toast(PD.t('calc.copied')); } catch (x) { /* ignore */ } }
      else if (act === 'back') press('back');
      else if (act === 'hist') { showHist = !showHist; render(); }
      else if (act === 'clearhist') { eng.clearHistory(); render(); save(); }
      return;
    }
    const h = e.target.closest('[data-h]'); if (h) { const item = eng.history().slice().reverse()[+h.dataset.h]; if (item) { eng.setEntry(item.result); render(); } }
  }
  function onKey(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SUMMARY' || (e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' '))) return;
    const k = e.key; let m = null;
    if (/^[0-9.]$/.test(k)) m = k; else if (k === ',') m = '.'; else if ('+-*/'.includes(k)) m = k; else if (k === 'Enter' || k === '=') m = '='; else if (k === 'Backspace') m = 'back'; else if (k === 'Delete') m = 'CE'; else if (k === 'Escape') m = 'C'; else if (k === '%') m = '%';
    if (m) { e.preventDefault(); e.stopPropagation(); press(m); }
  }
  PD.calc = {
    isOpen: () => !!win,
    open() {
      if (win) { win.focus(); return win; }
      const c = (PD.S.prefs && PD.S.prefs.calc) || {};
      if (!eng) eng = E.create({ history: c.history, memory: c.memory });
      win = PD.float.create({ id: 'calc', title: PD.ic('calc', 15) + ' ' + PD.esc(PD.t('calc.title')), titleText: PD.t('calc.title'), x: c.x, y: c.y, onMove: save, onClose: () => { win = null; save(); PD.emit('calc', false); } });
      win.el.addEventListener('click', onClick); win.el.addEventListener('keydown', onKey); win.el.tabIndex = -1;
      render(); if (c.x == null) win.place(win.el.parentNode.clientWidth - win.el.offsetWidth - 16, 70); else win.place(c.x, c.y); win.el.focus(); PD.emit('calc', true); save(); return win;
    },
    close() { if (win) win.close(); },
    toggle() { if (win) win.close(); else this.open(); },
    reset() { eng = null; showHist = false; if (win) win.close(); },
    rerender: render,
    _engine: () => eng
  };
})(typeof window !== 'undefined' ? window : globalThis);

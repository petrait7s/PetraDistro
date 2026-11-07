/* Shared UI helpers for every screen: tables, pickers, quantity inputs, date ranges, charts, downloads, paging. No business arithmetic. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { $, $$, esc, ic } = PD;
  const U = (PD.ui = {});
  const p2 = (n) => String(n).padStart(2, '0');
  U.ymd = (d) => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  U.today = () => U.ymd(new Date());
  U.addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return U.ymd(d); };
  U.monthStart = (s) => (s || U.today()).slice(0, 8) + '01';
  U.debounce = (f, ms) => { let t; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => f.apply(null, a), ms || 220); }; };
  U.qty = (q) => (q ? PD.digits(q.text[PD.lang()] || q.text.en) : '');
  U.dt = (ts) => PD.date(ts) + ' ' + PD.time(ts);
  U.h = (title, right, sub) => `<div class="phead"><h2>${esc(title)}</h2>${sub ? `<span class="muted small">${esc(sub)}</span>` : ''}<span class="sp"></span>${right || ''}</div>`;
  U.field = (id, label, input, cls) => `<div class="fld ${cls || ''}"><label class="l" for="${id}">${esc(label)}</label>${input}</div>`;
  U.opts = (list, sel) => list.map((o) => `<option value="${esc(o[0])}" ${String(o[0]) === String(sel) ? 'selected' : ''}>${esc(o[1])}</option>`).join('');
  U.pill = (kind, text) => `<span class="pill ${kind}">${esc(text)}</span>`;
  U.empty = (text) => `<div class="empty-s">${esc(text || PD.t('ui.nothing'))}</div>`;
  U.busy = async (btn, fn) => { if (btn.disabled) return; btn.disabled = true; try { return await fn(); } finally { btn.disabled = false; } };
  U.err = (e) => PD.toast(PD.errText(e), 'bad');

  /* table: cols [{k, label, r:bool, f:(row)=>html|text, raw:bool}] */
  U.table = (cols, rows, o) => {
    o = o || {}; if (!rows.length) return `<div class="tw">${U.empty(o.empty)}</div>`;
    const head = cols.map((c) => `<th class="${c.r ? 'r' : ''}">${esc(c.label)}</th>`).join('');
    const body = rows.map((r, i) => `<tr data-i="${i}" class="${o.rowCls ? o.rowCls(r) : ''}">${cols.map((c) => { const v = c.f ? c.f(r) : r[c.k]; return `<td class="${c.r ? 'r' : ''} ${c.cls || ''}">${c.raw ? v : esc(v == null ? '' : v)}</td>`; }).join('')}</tr>`).join('');
    const foot = o.foot ? `<tfoot><tr>${o.foot.map((c, i) => `<td class="${cols[i] && cols[i].r ? 'r' : ''}">${c == null ? '' : c}</td>`).join('')}</tr></tfoot>` : '';
    return `<div class="tw ${o.cls || ''}"><table class="t"><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table></div>`;
  };
  U.onRow = (host, rows, fn) => { $$('tbody tr', host).forEach((tr) => { tr.style.cursor = 'pointer'; tr.addEventListener('click', (e) => { if (e.target.closest('button,a,input,select')) return; fn(rows[+tr.dataset.i], tr, e); }); }); };

  /* cursor paging: load(cursor) -> {rows,page}; renders into host via draw(allRows) and keeps a "more" button */
  U.pager = (host, load, draw) => {
    let rows = []; let cursor = null; let busy = false;
    async function go(reset) {
      if (busy) return; busy = true; if (reset) { rows = []; cursor = null; }
      const [d, e] = await load(cursor); busy = false; if (e) { U.err(e); return; }
      rows = rows.concat(d.rows); cursor = d.page ? d.page.next_cursor : null; draw(rows, d);
      const m = $('[data-more]', host); if (m) m.remove();
      if (cursor) { const b = document.createElement('button'); b.className = 'btn sm'; b.dataset.more = '1'; b.style.margin = '10px 0'; b.textContent = PD.t('ui.more'); b.addEventListener('click', () => go(false)); host.appendChild(b); }
    }
    go(true); return { reload: () => go(true), rows: () => rows };
  };

  /* download a file the backend produced (mock) or ask the backend to save it (Electron) */
  U.download = (name, mime, b64) => {
    try { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); const url = URL.createObjectURL(new Blob([a], { type: mime })); const l = document.createElement('a'); l.href = url; l.download = name; document.body.appendChild(l); if (!/jsdom/i.test(navigator.userAgent)) l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); } catch (e) { /* no DOM download in tests */ }
  };

  U.exportTable = async (table, format, filters) => { const [d, e] = await PD.try('export.table', { table, format: format || 'csv', filters }); if (e) { U.err(e); return; } PD.toast(PD.t('doc.saved', { p: d.saved_to }), 'ok'); if (PD.isMock && PD.mockLastExport) { const x = PD.mockLastExport; U.download(x.name, x.mime, btoa(unescape(encodeURIComponent(x.text)))); } };

  /* quantity input. carton_pcs: cartons + pcs. by_kg: kg. Reads back as QtyIn. */
  U.qtyHtml = (id, p, v) => {
    v = v || {};
    if (p && p.sell_mode === 'by_kg') return `<span class="qty"><input class="in r" id="${id}-kg" inputmode="decimal" value="${esc(v.kg || '')}" placeholder="0"><i>${esc(PD.t('unit.kg'))}</i></span>`;
    return `<span class="qty"><input class="in r" id="${id}-c" inputmode="numeric" value="${esc(v.cartons || '')}" placeholder="0"><i>${esc(PD.t('unit.ctn'))}</i><input class="in r" id="${id}-p" inputmode="numeric" value="${esc(v.pcs || '')}" placeholder="0"><i>${esc(PD.t('unit.pcs'))}</i></span>`;
  };
  U.qtyRead = (host, id, p) => {
    if (p && p.sell_mode === 'by_kg') { const kg = U.nd(($('#' + id + '-kg', host) || {}).value || '').trim().replace(/[^0-9.]/g, ''); return kg && parseFloat(kg) > 0 ? { kg } : {}; }
    const c = U.int(($('#' + id + '-c', host) || {}).value); const q = U.int(($('#' + id + '-p', host) || {}).value); const o = {}; if (c) o.cartons = c; if (q) o.pcs = q; return o;
  };
  U.qtyEmpty = (q) => !q || (!q.cartons && !q.pcs && !(q.kg && parseFloat(q.kg) > 0));
  U.qtyBig = (b) => { b.addEventListener('focus', () => b.select && b.select()); };

  /* money input: shows taka, returns paisa (integer). Accepts up to 2 decimals. */
  U.nd = (s) => String(s == null ? '' : s).replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09E6)).replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));
  U.int = (s) => parseInt(U.nd(s).replace(/\D/g, ''), 10) || 0;
  U.takaToPaisa = (s) => { const t = U.nd(s).trim().replace(/,/g, ''); if (!/^\d+(\.\d{1,2})?$/.test(t)) return null; const [a, b] = t.split('.'); return parseInt(a, 10) * 100 + parseInt(((b || '') + '00').slice(0, 2), 10); };
  U.paisaToTaka = (n) => { if (n == null) return ''; const neg = n < 0; n = Math.abs(n); const a = Math.floor(n / 100), b = n % 100; return (neg ? '-' : '') + a + (b ? '.' + p2(b) : ''); };
  U.moneyIn = (id, v, ph) => `<input class="in r" id="${id}" inputmode="decimal" value="${esc(v == null ? '' : U.paisaToTaka(v))}" placeholder="${esc(ph || '0')}">`;
  U.moneyRead = (host, id) => { const el = $('#' + id, host); const s = el ? el.value.trim() : ''; return s === '' ? null : U.takaToPaisa(s); };

  /* search-as-you-type picker. o: {fetch(q)->Promise<[{id,label,sub}]>, onPick(item), placeholder, value} */
  U.picker = (host, o) => {
    host.classList.add('picker'); host.innerHTML = `<input class="in" autocomplete="off" placeholder="${esc(o.placeholder || PD.t('common.search'))}" value="${esc(o.value || '')}"><div class="pop" hidden></div>`;
    const inp = host.querySelector('input'); const pop = host.querySelector('.pop'); let items = []; let hi = 0; let seq = 0;
    const close = () => { pop.hidden = true; };
    const draw = () => { pop.innerHTML = items.length ? items.map((it, i) => `<div class="opt ${i === hi ? 'on' : ''}" data-i="${i}"><b>${esc(it.label)}</b>${it.sub ? `<span class="muted small">${esc(it.sub)}</span>` : ''}</div>`).join('') : `<div class="opt muted">${esc(PD.t('ui.nothing'))}</div>`; pop.hidden = false; $$('.opt[data-i]', pop).forEach((n) => n.addEventListener('mousedown', (e) => { e.preventDefault(); pick(items[+n.dataset.i]); })); };
    const pick = (it) => { close(); if (!it) return; inp.value = o.keep ? it.label : ''; if (o.onPick) o.onPick(it); };
    const run = U.debounce(async () => { const my = ++seq; const r = await o.fetch(inp.value.trim()); if (my !== seq) return; items = r; hi = 0; draw(); }, 160);
    inp.addEventListener('input', run); inp.addEventListener('focus', () => { inp.select(); run(); }); inp.addEventListener('blur', () => setTimeout(close, 120));
    inp.addEventListener('keydown', (e) => { if (pop.hidden && (e.key === 'ArrowDown')) { run(); return; } if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(items.length - 1, hi + 1); draw(); } else if (e.key === 'ArrowUp') { e.preventDefault(); hi = Math.max(0, hi - 1); draw(); } else if (e.key === 'Enter' && !pop.hidden && items[hi]) { e.preventDefault(); e.stopPropagation(); pick(items[hi]); } else if (e.key === 'Escape' && !pop.hidden) { e.stopPropagation(); close(); } });
    return { input: inp, set(v) { inp.value = v || ''; }, focus() { inp.focus(); } };
  };
  /* checklist dialog: tick many products, add them in one step. o: {isIn(p), price(p), onAdd([p])} */
  U.pickMany = (o) => {
    const sel = new Map(); let q = ''; let rows = [];
    const label = () => ic('check') + ' ' + esc(PD.t('sales.manyAdd', { n: PD.digits(sel.size) }));
    const m = PD.modal({ title: esc(PD.t('sales.many')), titleText: PD.t('sales.many'), size: 'wide', body: `<div class="row" style="gap:8px;margin-bottom:8px"><input class="in" id="pm-q" placeholder="${esc(PD.t('sales.manyQ'))}" style="flex:1"><label class="row small" style="gap:6px"><input type="checkbox" id="pm-all"> ${esc(PD.t('ui.selAll'))}</label></div><div id="pm-l" style="max-height:52vh;overflow:auto"></div>`,
      buttons: [{ label: PD.t('common.cancel') }, { label: label(), cls: 'p', main: true, id: 'pm-ok', onClick: () => { if (!sel.size) return false; o.onAdd(Array.from(sel.values())); } }] });
    const L = $('#pm-l', m.el); const cnt = () => { const b = $('#pm-ok'); if (b) b.innerHTML = label(); };
    async function load() {
      const [d] = await PD.try('products.list', { q: q || undefined, limit: 200 }); rows = d ? d.rows : [];
      L.innerHTML = rows.length ? `<table class="t pm"><tbody>${rows.map((p) => { const inn = o.isIn(p); return `<tr data-pr="${p.id}" class="${inn ? 'muted' : ''}"><td style="width:30px"><input type="checkbox" data-pm="${p.id}" ${inn || sel.has(p.id) ? 'checked' : ''} ${inn ? 'disabled' : ''}></td><td><b>${esc(p.name)}</b><div class="muted small">${esc(p.sku)}${p.company_name ? ' · ' + esc(p.company_name) : ''}</div></td><td class="r">${PD.money(o.price(p) || 0)}</td><td class="r muted small">${esc(U.qty(p.stock))}</td></tr>`; }).join('')}</tbody></table>` : `<div class="empty">${esc(PD.t('ui.nothing'))}</div>`;
      $$('[data-pm]', L).forEach((c) => c.addEventListener('change', () => { const p = rows.find((x) => x.id === +c.dataset.pm); if (c.checked) sel.set(p.id, p); else sel.delete(p.id); cnt(); }));
      $$('tr[data-pr] td:not(:first-child)', L).forEach((td) => td.addEventListener('click', () => { const c = td.parentNode.querySelector('[data-pm]'); if (c.disabled) return; c.checked = !c.checked; c.dispatchEvent(new Event('change')); }));
    }
    $('#pm-all', m.el).addEventListener('change', (e) => { $$('[data-pm]:not(:disabled)', L).forEach((c) => { c.checked = e.target.checked; const p = rows.find((x) => x.id === +c.dataset.pm); if (c.checked) sel.set(p.id, p); else sel.delete(p.id); }); cnt(); });
    $('#pm-q', m.el).addEventListener('input', U.debounce((e) => { q = e.target.value.trim(); load(); })); $('#pm-q', m.el).focus(); load(); return m;
  };
  /* pick an image file and return a small PNG/JPEG data URL (max 360 px side, about 380 KB) or null */
  U.pickLogo = () => new Promise((res) => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0]; if (!f) { res(null); return; }
      const rd = new FileReader(); rd.onerror = () => res(null);
      rd.onload = () => { const img = new Image(); img.onerror = () => { PD.toast(PD.t('brand.bad'), 'bad'); res(null); };
        img.onload = () => { const k = Math.min(1, 360 / Math.max(img.naturalWidth || 360, img.naturalHeight || 360)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round((img.naturalWidth || 360) * k)); c.height = Math.max(1, Math.round((img.naturalHeight || 360) * k));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); let url = c.toDataURL('image/png'); if (url.length > 380000) url = c.toDataURL('image/jpeg', 0.85); res(url.length > 390000 ? (PD.toast(PD.t('brand.big'), 'bad'), null) : url); };
        img.src = rd.result; };
      rd.readAsDataURL(f);
    });
    inp.click();
  });
  U.custPicker = (host, o) => U.picker(host, Object.assign({ placeholder: PD.t('cust.search'), fetch: async (q) => { const [d] = await PD.try('customers.list', { q, limit: 12 }); return d ? d.rows.map((c) => ({ id: c.id, label: c.name, sub: (c.area || '') + (c.due > 0 ? ' · ' + PD.t('cust.due') + ' ' + PD.money(c.due) : ''), raw: c })) : []; } }, o));
  U.prodPicker = (host, o) => U.picker(host, Object.assign({ placeholder: PD.t('prod.search'), fetch: async (q) => { const [d] = await PD.try('products.list', { q, limit: 12 }); return d ? d.rows.map((p) => ({ id: p.id, label: p.name, sub: p.sku + ' · ' + U.qty(p.stock), raw: p })) : []; } }, o));

  /* date range with presets. onChange({from,to}) */
  U.range = (host, o) => {
    o = o || {}; const t = U.today(); const st = { from: o.from || U.monthStart(t), to: o.to || t };
    host.classList.add('range');
    host.innerHTML = `<input type="date" class="in" data-r="from" value="${st.from}"><span class="muted">–</span><input type="date" class="in" data-r="to" value="${st.to}"><span class="seg"><button data-p="today">${esc(PD.t('ui.today'))}</button><button data-p="7">${esc(PD.t('ui.d7'))}</button><button data-p="m">${esc(PD.t('ui.month'))}</button></span>`;
    const fire = () => { if (st.from && st.to && st.from <= st.to && o.onChange) o.onChange({ from: st.from, to: st.to }); };
    $$('input', host).forEach((i) => i.addEventListener('change', () => { st[i.dataset.r] = i.value; fire(); }));
    $$('[data-p]', host).forEach((b) => b.addEventListener('click', () => { const n = U.today(); st.to = n; st.from = b.dataset.p === 'today' ? n : b.dataset.p === '7' ? U.addDays(n, -6) : U.monthStart(n); $('[data-r=from]', host).value = st.from; $('[data-r=to]', host).value = st.to; fire(); }));
    return st;
  };

  /* inline SVG charts. pts [{label,value}], type line|bar. Uses theme variables, titles for hover. */
  U.chart = (pts, o) => {
    o = o || {}; const W = 560, H = o.h || 170, L = 46, R = 8, T = 10, B = 22; if (!pts.length) return U.empty();
    const vals = pts.map((p) => p.value); const max = Math.max(1, ...vals); const min = Math.min(0, ...vals); const span = max - min || 1; const iw = W - L - R, ih = H - T - B;
    const x = (i) => L + (pts.length === 1 ? iw / 2 : (i * iw) / (pts.length - 1)); const y = (v) => T + ih - ((v - min) / span) * ih; const fmt = o.fmt || ((v) => PD.money(v, true));
    const grid = [0, 0.5, 1].map((f) => { const v = min + span * f; return `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="gt">${esc(U.short(v))}</text>`; }).join('');
    const step = Math.ceil(pts.length / 7); const xl = pts.map((p, i) => (i % step === 0 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" class="gt">${esc(p.label)}</text>` : '')).join('');
    let mark;
    if (o.type === 'bar') { const bw = Math.max(2, (iw / pts.length) * 0.66); mark = pts.map((p, i) => { const cx = L + (i + 0.5) * (iw / pts.length); return `<rect x="${cx - bw / 2}" y="${y(Math.max(p.value, 0))}" width="${bw}" height="${Math.max(0, Math.abs(y(p.value) - y(0)))}" rx="2" class="bar ${o.cls || ''}"><title>${esc(p.label + ': ' + fmt(p.value))}</title></rect>`; }).join(''); }
    else { const d = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.value).toFixed(1)).join(' '); mark = `<path d="${d} L${x(pts.length - 1)} ${y(min)} L${x(0)} ${y(min)} Z" class="area ${o.cls || ''}"/><path d="${d}" class="ln ${o.cls || ''}"/>` + pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.value)}" r="${pts.length > 40 ? 0 : 3}" class="dotc ${o.cls || ''}"><title>${esc(p.label + ': ' + fmt(p.value))}</title></circle>`).join(''); }
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || '')}">${grid}${mark}${xl}</svg>`;
  };
  U.short = (v) => { const a = Math.abs(v) / 100; const s = a >= 1e7 ? (a / 1e7).toFixed(1) + (PD.lang() === 'bn' ? ' কো' : 'Cr') : a >= 1e5 ? (a / 1e5).toFixed(1) + (PD.lang() === 'bn' ? ' ল' : 'L') : a >= 1e3 ? (a / 1e3).toFixed(0) + 'k' : String(Math.round(a)); return PD.digits((v < 0 ? '-' : '') + s.replace('.0', '')); };

  /* key-bound list navigation (up/down/enter) for simple tables */
  U.confirmDanger = (title, msg, okLabel) => PD.confirm(title, msg, okLabel);

  /* run an action that may need owner approval; retries once with a token. fn(approval|undefined) -> [data, err] */
  /* owner edit mode: run fn; if backend says edit mode is needed, ask the owner PIN once and retry */
  U.askEditPin = () => new Promise((res) => {
    let done = false;
    PD.modal({ title: PD.ic('key') + ' ' + PD.esc(PD.t('inv.pinTitle')), titleText: PD.t('inv.pinTitle'), body: `<p class="muted" style="margin:0 0 10px">${PD.esc(PD.t('inv.pinText'))}</p><label class="l" for="em2-pin">${PD.esc(PD.t('inv.pin'))}</label><input class="in" id="em2-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" style="width:100%;text-align:center;letter-spacing:.4em"><div class="bad-t small" id="em2-err" style="min-height:18px;margin-top:6px"></div>`,
      buttons: [{ label: PD.t('common.cancel'), onClick: () => { done = true; res(false); } }, { label: PD.t('approve.go'), cls: 'p', main: true, onClick: async (m) => { const [, e] = await PD.try('editmode.enable', { owner_pin: m.el.querySelector('#em2-pin').value }); if (e) { m.el.querySelector('#em2-err').textContent = e.details && e.details.code === 'BAD_PIN' ? PD.t('inv.pinBad') : PD.errText(e); m.el.querySelector('#em2-pin').value = ''; return false; } done = true; res(true); } }],
      onCancel: () => { if (!done) { done = true; res(false); } } });
  });
  U.withEdit = async (fn) => {
    let r = await fn();
    if (r[1] && r[1].code === 'LOCKED' && /edit/i.test(r[1].message || '')) { if (!(await U.askEditPin())) return [null, { code: 'CANCELLED' }]; r = await fn(); }
    return r;
  };
  /* save a product with some fields changed (keeps everything else). patch: {pcs_per_carton, list_price, company_id...} */
  U.patchProduct = (q, patch) => {
    const u = Object.assign({ id: q.id, sku: q.sku, name: q.name, company_id: q.company_id, sell_mode: q.sell_mode, pcs_per_carton: q.pcs_per_carton, pcs_per_dozen: q.pcs_per_dozen, grams_per_carton: q.grams_per_carton, list_price: q.list_price || 0, retail_price: q.retail_price, cost_price: q.cost_price, min_sell_price: q.min_sell_price }, patch);
    u.max_discount = { per_unit: q.max_discount ? q.max_discount.per_unit : 0 }; if (q.max_discount && q.max_discount.percent_bp != null) u.max_discount.percent_bp = q.max_discount.percent_bp;
    Object.keys(u).forEach((k) => { if (u[k] == null) delete u[k]; });
    return U.withEdit(() => PD.try('products.save', u));
  };
  U.withApproval = async (scope, why, fn) => {
    let [d, e] = await fn(undefined); const ctx = PD.lastTry;
    if (e && e.code === 'NEEDS_OWNER_PIN') { const ap = await PD.approve(scope, why, ctx); if (!ap) return [null, { code: 'CANCELLED' }]; [d, e] = await fn(ap); }
    return [d, e];
  };
})(typeof window !== 'undefined' ? window : globalThis);

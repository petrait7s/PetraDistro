/* Simple stock setup table: one row per product with company, pcs/carton, buy rate, sell rate and stock.
   Type what you know, press "Save all". No review dialogs, no reasons. The Excel-like grid stays as "Advanced grid". */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { $, $$, esc, ic } = PD; const U = PD.ui;
  PD.i18n.pairs({
    'sv.switch': ['Simple table', 'সহজ টেবিল'], 'sv.adv': ['Advanced grid', 'অ্যাডভান্স গ্রিড'], 'sv.title': ['Products & stock', 'প্রোডাক্ট ও স্টক'],
    'sv.help': ['Fill what you know in each row, then press Save all. Stock is the number of cartons you have now.', 'প্রতি সারিতে যা জানেন লিখুন, তারপর "সব সেভ" চাপুন। স্টক = এখন কত কার্টন আছে।'],
    'sv.save': ['Save all', 'সব সেভ'], 'sv.changes': ['{n} changed', '{n} টি বদল'], 'sv.none': ['Nothing changed.', 'কিছু বদলানো হয়নি।'],
    'sv.c.product': ['Product', 'পণ্য'], 'sv.c.company': ['Company', 'কোম্পানি'], 'sv.c.ppc': ['Pcs / carton', 'পিস / কার্টন'], 'sv.c.buy': ['Buy rate', 'কেনা রেট'], 'sv.c.sell': ['Wholesale rate', 'পাইকারি রেট'], 'sv.c.retail': ['Retail rate', 'খুচরা রেট'], 'sv.c.stock': ['Stock (ctn)', 'স্টক (কার্টন)'], 'sv.c.stockKg': ['Stock (kg)', 'স্টক (কেজি)'],
    'sv.only': ['Only incomplete', 'শুধু অসম্পূর্ণ'], 'sv.perCtn': ['rates are per carton (per kg for kg items)', 'রেট কার্টন প্রতি (কেজির পণ্যে কেজি প্রতি)'],
    'sv.needPpc': ['pieces per carton needed', 'পিস/কার্টন দিন'], 'sv.needCost': ['buy rate needed', 'কেনা রেট দিন'], 'sv.badNum': ['invalid number', 'সংখ্যা ঠিক নয়'],
    'sv.progress': ['Saving {a} of {b}…', '{b} টির মধ্যে {a} টি সেভ হচ্ছে…'], 'sv.done': ['Saved {n} products.', '{n} টি পণ্য সেভ হয়েছে।'], 'sv.failed': ['{n} could not be saved:', '{n} টি সেভ হয়নি:'], 'sv.fix': ['Fix the marked rows first.', 'আগে লাল সারিগুলো ঠিক করুন।'], 'sv.empty': ['No products yet. Use Quick add names or Import.', 'এখনো পণ্য নেই। "নাম দিয়ে দ্রুত যোগ" বা "ইমপোর্ট" ব্যবহার করুন।']
  });
  const orig = PD.views.inventory;
  PD.views.inventory = {
    async render(el) {
      if (!PD.power() || (PD.S.invMode || 'simple') === 'grid') { return orig.render(el); }
      el.classList.remove('flush'); return simple(el);
    }
  };

  async function simple(el) {
    const S = { rows: [], q: '', co: '', only: false, busy: false }; let companies = [];
    el.innerHTML = `<div class="row wrap" style="gap:8px;margin-bottom:10px"><h2 style="margin:0 12px 0 0;font-size:20px">${esc(PD.t('sv.title'))}</h2><input class="in" id="sv-q" style="width:200px" placeholder="${esc(PD.t('inv.search'))}"><select class="in" id="sv-co"></select><label class="row small" style="gap:6px"><input type="checkbox" id="sv-o"> ${esc(PD.t('sv.only'))}</label><span class="sp"></span>
      <button class="btn" id="sv-imp">${ic('upload')} ${esc(PD.t('inv.import'))}</button><button class="btn" id="sv-qa">${ic('plus')} ${esc(PD.t('qa.btn'))}</button><button class="btn" id="sv-add">${ic('plus')} ${esc(PD.t('inv.add'))}</button><button class="btn" id="sv-adv">${esc(PD.t('sv.adv'))}</button></div>
      <p class="muted small" style="margin:0 0 8px">${esc(PD.t('sv.help'))} <i>(${esc(PD.t('sv.perCtn'))})</i></p>
      <div class="row" style="gap:10px;margin-bottom:8px"><button class="btn p" id="sv-save">${ic('check')} ${esc(PD.t('sv.save'))}</button><b id="sv-cnt" class="muted small"></b><span class="small" id="sv-prog"></span></div><div id="sv-err"></div><div class="tw" id="sv-t" style="max-height:calc(100vh - 290px);overflow:auto"></div>`;
    const [cs] = await PD.try('companies.list', {}); companies = cs ? cs.rows : [];
    $('#sv-co', el).innerHTML = `<option value="">${esc(PD.t('inv.allCo'))}</option>` + companies.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    async function load() {
      let rows = []; let cur; for (let i = 0; i < 40; i++) { const [d, e] = await PD.try('products.list', { limit: 500, cursor: cur || undefined }); if (e) { U.err(e); break; } rows = rows.concat(d.rows); cur = d.page && d.page.next_cursor; if (!cur) break; }
      S.rows = rows; draw();
    }
    const kgMode = (p) => p.sell_mode === 'by_kg';
    const stockStr = (p) => (kgMode(p) ? (p.stock.kg && parseFloat(p.stock.kg) ? String(parseFloat(p.stock.kg)) : '') : (p.stock.cartons ? String(p.stock.cartons) : ''));
    const orig0 = (p) => ({ co: p.company_id ? String(p.company_id) : '', ppc: p.pcs_per_carton ? String(p.pcs_per_carton) : '', cost: p.cost_price > 0 ? U.paisaToTaka(p.cost_price) : '', sell: p.list_price > 0 ? U.paisaToTaka(p.list_price) : '', retail: p.retail_price > 0 ? U.paisaToTaka(p.retail_price) : '', stock: stockStr(p) });
    function visible() { const q = S.q.toLowerCase(); return S.rows.filter((p) => (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) && (!S.co || String(p.company_id) === S.co) && (!S.only || !p.pcs_per_carton && !kgMode(p) || !(p.cost_price > 0) || !(p.list_price > 0) || !p.company_id)); }
    function draw() {
      const rows = visible(); const box = $('#sv-t', el);
      if (!S.rows.length) { box.innerHTML = U.empty(PD.t('sv.empty')); count(); return; }
      box.innerHTML = `<table class="t sv"><thead><tr><th>#</th><th>${esc(PD.t('sv.c.product'))}</th><th>${esc(PD.t('sv.c.company'))}</th><th class="r">${esc(PD.t('sv.c.ppc'))}</th><th class="r">${esc(PD.t('sv.c.buy'))}</th><th class="r">${esc(PD.t('sv.c.sell'))}</th><th class="r">${esc(PD.t('sv.c.retail'))}</th><th class="r">${esc(PD.t('sv.c.stock'))}</th><th></th></tr></thead><tbody>${rows.map((p, i) => { const o = orig0(p); const inp = (f, v, w, extra) => `<input class="in sm r" style="width:${w}px" inputmode="decimal" data-f="${f}" data-id="${p.id}" data-o="${esc(v)}" value="${esc(v)}" ${extra || ''}>`;
        return `<tr data-row="${p.id}"><td class="muted small">${PD.digits(i + 1)}</td><td><b>${esc(p.name)}</b><div class="muted small">${esc(p.sku)}${kgMode(p) ? ' · ' + esc(PD.t('unit.kg')) : ''}</div></td><td><select class="in sm" data-f="co" data-id="${p.id}" data-o="${esc(o.co)}"><option value="">–</option>${companies.map((c) => `<option value="${c.id}" ${String(c.id) === o.co ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></td><td class="r">${kgMode(p) ? '–' : inp('ppc', o.ppc, 70, 'placeholder="?"')}</td><td class="r">${inp('cost', o.cost, 90, 'placeholder="0"')}</td><td class="r">${inp('sell', o.sell, 90, 'placeholder="0"')}</td><td class="r">${inp('retail', o.retail, 90, 'placeholder="–"')}</td><td class="r">${inp('stock', o.stock, 80, 'placeholder="0"')}</td><td class="r"><button class="btn sm" data-ed="${p.id}" title="${esc(PD.t('inv.edit'))}">${ic('edit', 14)}</button> <button class="btn sm" data-ar="${p.id}" title="${esc(PD.t('inv.archive'))}">${ic('x', 14)}</button></td></tr>`; }).join('')}</tbody></table>`;
      $$('[data-f]', box).forEach((n) => { n.addEventListener('input', () => { n.classList.toggle('chg', n.value.trim() !== n.dataset.o); count(); }); n.addEventListener('change', () => { n.classList.toggle('chg', n.value.trim() !== n.dataset.o); count(); });
        n.addEventListener('keydown', (e) => { if (e.key !== 'Enter') return; e.preventDefault(); const same = $$('[data-f="' + n.dataset.f + '"]', box); const k = same.indexOf(n); const nx = same[k + 1]; if (nx) { nx.focus(); if (nx.select) nx.select(); } }); });
      $$('[data-ed]', box).forEach((b) => b.addEventListener('click', () => PD.invTools.productForm(S.rows.find((p) => p.id === +b.dataset.ed), load)));
      $$('[data-ar]', box).forEach((b) => b.addEventListener('click', async () => { const p = S.rows.find((x) => x.id === +b.dataset.ar); if (!(await PD.confirm(PD.t('inv.archive') + ': ' + p.name, PD.t('inv.archiveWhy')))) return; const [, er] = await U.withEdit(() => PD.try('products.archive', { id: p.id, archived: true })); if (er) { if (er.code !== 'CANCELLED') U.err(er); return; } PD.toast(PD.t('inv.archived'), 'ok'); load(); }));
      count();
    }
    function changed() {
      const out = new Map(); $$('[data-f]', el).forEach((n) => { const v = n.value.trim(); if (v === n.dataset.o) return; const id = +n.dataset.id; const r = out.get(id) || {}; r[n.dataset.f] = v; out.set(id, r); }); return out;
    }
    function count() { const n = changed().size; $('#sv-cnt', el).textContent = n ? PD.t('sv.changes', { n: PD.digits(n) }) : ''; }
    const num = (v) => (v === '' ? 0 : /^\d+(\.\d+)?$/.test(v) ? parseFloat(v) : NaN);
    $('#sv-save', el).addEventListener('click', (ev) => U.busy(ev.currentTarget, async () => {
      const ch = changed(); if (!ch.size) { PD.toast(PD.t('sv.none'), 'warn'); return; }
      $$('tr.flag', el).forEach((t) => { t.classList.remove('flag'); }); $$('[data-m]', el).forEach((x) => x.remove());
      const plan = []; const bad = [];
      ch.forEach((c, id) => {
        const p = S.rows.find((x) => x.id === id); const o = orig0(p); const row = $('tr[data-row="' + id + '"]', el); const mark = (msg) => { bad.push(p.name + ': ' + msg); if (row) row.classList.add('flag'); };
        const f = Object.assign({}, o, c); const patch = {}; let stockBase = null;
        if (c.co !== undefined) patch.company_id = c.co ? +c.co : null;
        if (c.ppc !== undefined) { const v = num(c.ppc); if (!(v >= 0) || v % 1) return mark(PD.t('sv.badNum')); if (v) patch.pcs_per_carton = v; }
        if (c.cost !== undefined) { const v = U.takaToPaisa(c.cost || '0'); if (v == null) return mark(PD.t('sv.badNum')); patch.cost_price = v; }
        if (c.sell !== undefined) { const v = U.takaToPaisa(c.sell || '0'); if (v == null) return mark(PD.t('sv.badNum')); patch.list_price = v; }
        if (c.retail !== undefined) { const v = U.takaToPaisa(c.retail || '0'); if (v == null) return mark(PD.t('sv.badNum')); patch.retail_price = v || null; }
        const ppc = patch.pcs_per_carton || p.pcs_per_carton; const cost = patch.cost_price !== undefined ? patch.cost_price : p.cost_price;
        if (c.stock !== undefined) { const v = num(f.stock); if (!(v >= 0)) return mark(PD.t('sv.badNum')); if (kgMode(p)) stockBase = Math.round(v * 1000); else { if (v % 1) return mark(PD.t('sv.badNum')); if (!ppc) return mark(PD.t('sv.needPpc')); stockBase = v * ppc; } if (stockBase > p.stock.base && !(cost > 0)) return mark(PD.t('sv.needCost')); }
        plan.push({ p, patch, stockBase });
      });
      if (bad.length) { $('#sv-err', el).innerHTML = `<div class="note bad" style="margin-bottom:8px"><b>${esc(PD.t('sv.fix'))}</b><br>${bad.slice(0, 6).map(esc).join('<br>')}</div>`; return; }
      $('#sv-err', el).innerHTML = ''; const fails = []; let ok = 0;
      for (let i = 0; i < plan.length; i++) {
        const { p, patch, stockBase } = plan[i]; $('#sv-prog', el).textContent = PD.t('sv.progress', { a: PD.digits(i + 1), b: PD.digits(plan.length) });
        let err = null;
        if (Object.keys(patch).length) { const [, e] = await U.patchProduct(p, patch); if (e) err = e; }
        if (!err && stockBase !== null && stockBase !== p.stock.base) {
          const diff = stockBase - p.stock.base; const delta = kgMode(p) ? { kg: (Math.abs(diff) / 1000).toFixed(3) } : { pcs: Math.abs(diff) };
          const [, e] = await U.withEdit(() => PD.try('stock.adjust', { product_id: p.id, delta, sign: diff > 0 ? 'plus' : 'minus', reason: PD.t('si.reason'), received_date: U.today() })); if (e) err = e;
        }
        if (err) { if (err.code === 'CANCELLED') { fails.push(p.name + ': cancelled'); break; } fails.push(p.name + ': ' + PD.errText(err)); } else ok++;
      }
      $('#sv-prog', el).textContent = ''; PD.toast(PD.t('sv.done', { n: PD.digits(ok) }), ok ? 'ok' : 'warn'); PD.renderStatus();
      await load(); if (fails.length) $('#sv-err', el).innerHTML = `<div class="note bad" style="margin-bottom:8px"><b>${esc(PD.t('sv.failed', { n: PD.digits(fails.length) }))}</b><br>${fails.slice(0, 8).map(esc).join('<br>')}</div>`;
    }));
    $('#sv-q', el).addEventListener('input', U.debounce((e) => { S.q = e.target.value.trim(); draw(); })); $('#sv-co', el).addEventListener('change', (e) => { S.co = e.target.value; draw(); }); $('#sv-o', el).addEventListener('change', (e) => { S.only = e.target.checked; draw(); });
    $('#sv-imp', el).addEventListener('click', () => PD.invTools.importWizard()); $('#sv-qa', el).addEventListener('click', () => PD.invTools.quickAdd(load)); $('#sv-add', el).addEventListener('click', () => PD.invTools.productForm(null, load));
    $('#sv-adv', el).addEventListener('click', () => { PD.S.invMode = 'grid'; PD.refreshApp(); });
    await load();
  }
})(typeof window !== 'undefined' ? window : globalThis);

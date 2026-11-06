/* Purchases (owner): receive goods from a company (creates lots, raises company due), purchase list/detail/cancel, companies and their ledger. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { $, $$, esc, ic } = PD; const U = PD.ui;
  PD.i18n.pairs({
    'pur.c.ppc': ['Pcs/ctn', 'পিস/কার্টন'], 'pur.newProd': ['New product', 'নতুন পণ্য'], 'pur.noCo': ['Add a company first (+)', 'আগে কোম্পানি যোগ করুন (+)'], 'pur.empty': ['Search a product above, or use "Select many products".', 'উপরে পণ্য খুঁজুন, অথবা "একসাথে অনেক পণ্য বাছুন" চাপুন।'], 'pur.lineQty': ['Enter quantity: {name}', 'পরিমাণ দিন: {name}'], 'pur.lineCost': ['Enter buy rate: {name}', 'কেনা রেট দিন: {name}'], 'pur.c.sell': ['Wholesale ৳', 'পাইকারি ৳'], 'pur.ppcNeed': ['Enter pieces per carton for every item.', 'প্রতিটি পণ্যের কার্টনে কত পিস তা দিন।'], 'pur.tab.list': ['Purchases', 'ক্রয়'], 'pur.tab.new': ['Receive goods', 'মাল গ্রহণ'], 'pur.tab.co': ['Companies', 'কোম্পানি'], 'pur.company': ['Company', 'কোম্পানি'], 'pur.date': ['Date', 'তারিখ'], 'pur.invoice': ['Supplier invoice no.', 'সাপ্লায়ারের ইনভয়েস নং'],
    'pur.addProd': ['Add product', 'পণ্য যোগ করুন'], 'pur.c.item': ['Item', 'পণ্য'], 'pur.c.qty': ['Quantity', 'পরিমাণ'], 'pur.c.cost': ['Buy rate ৳ (ctn/kg)', 'কেনা রেট ৳ (কার্টন/কেজি)'], 'pur.c.expiry': ['Expiry', 'মেয়াদ'], 'pur.c.amount': ['Amount', 'টাকা'],
    'pur.total': ['Total', 'মোট'], 'pur.paidNow': ['Paid now ৳', 'এখন দিলাম ৳'], 'pur.method': ['Method', 'মাধ্যম'], 'pur.save': ['Receive & save', 'গ্রহণ করে সেভ করুন'], 'pur.saved': ['Purchase {no} saved', 'ক্রয় {no} সেভ হয়েছে'], 'pur.noLines': ['Add at least one product with quantity and cost.', 'অন্তত একটি পণ্য, পরিমাণ ও দাম দিন।'],
    'pur.l.no': ['No.', 'নং'], 'pur.l.date': ['Date', 'তারিখ'], 'pur.l.co': ['Company', 'কোম্পানি'], 'pur.l.lines': ['Lines', 'লাইন'], 'pur.l.total': ['Total', 'মোট'], 'pur.l.paid': ['Paid', 'দেওয়া'], 'pur.l.due': ['Due', 'বাকি'],
    'pur.cancel': ['Cancel purchase', 'ক্রয় বাতিল'], 'pur.cancelWhy': ['Only possible while none of this stock is sold. Give a reason.', 'এই মালের কিছু বিক্রি না হলেই সম্ভব। কারণ লিখুন।'], 'pur.cancelled': ['Purchase cancelled', 'ক্রয় বাতিল হয়েছে'], 'pur.detail': ['Purchase {no}', 'ক্রয় {no}'],
    'co.name': ['Company name', 'কোম্পানির নাম'], 'co.phone': ['Phone', 'ফোন'], 'co.due': ['We owe', 'আমরা দেবো'], 'co.opening': ['Opening due ৳', 'পুরনো বাকি ৳'], 'co.add': ['Add company', 'নতুন কোম্পানি'], 'co.ledger': ['Company ledger', 'কোম্পানির খাতা'], 'co.saved': ['Company saved', 'কোম্পানি সেভ হয়েছে'], 'co.l.debit': ['Paid / credit note', 'দেওয়া'], 'co.l.credit': ['Bought', 'কেনা']
  });
  PD.views.purchases = {
    render(el) {
      let tab = PD.S.purTab || 'new';
      el.innerHTML = `<div class="tabs">${['new', 'list', 'co'].map((k) => `<button class="tab ${tab === k ? 'on' : ''}" data-tab="${k}">${esc(PD.t('pur.tab.' + k))}</button>`).join('')}</div><div id="pu-b"></div>`;
      $$('[data-tab]', el).forEach((b) => b.addEventListener('click', () => { PD.S.purTab = b.dataset.tab; PD.refreshApp(); }));
      ({ list: listTab, new: newTab, co: coTab })[tab]($('#pu-b'));
    }
  };
  function listTab(h) {
    h.innerHTML = '<div id="pl"></div>';
    U.pager($('#pl'), (cur) => PD.try('purchases.list', { limit: 50, cursor: cur || undefined }), (rows) => {
      const b = $('#pl'); const keep = $('[data-more]', b);
      b.innerHTML = U.table([{ label: PD.t('pur.l.no'), f: (r) => r.no }, { label: PD.t('pur.l.date'), f: (r) => PD.date(r.date) }, { label: PD.t('pur.l.co'), f: (r) => r.company }, { label: PD.t('pur.l.lines'), r: 1, f: (r) => PD.digits(r.lines) }, { label: PD.t('pur.l.total'), r: 1, f: (r) => PD.money(r.total) }, { label: PD.t('pur.l.paid'), r: 1, f: (r) => PD.money(r.paid) }, { label: PD.t('pur.l.due'), r: 1, f: (r) => PD.money(r.due) }, { label: '', raw: 1, f: (r) => (r.status === 'cancelled' ? U.pill('bad', PD.t('sales.st.cancelled')) : '') }], rows, { rowCls: (r) => (r.status === 'cancelled' ? 'cx' : '') });
      U.onRow(b, rows, (r) => detail(r.id)); if (keep) b.appendChild(keep);
    });
  }
  async function detail(id) {
    const [d, e] = await PD.try('purchases.get', { id }); if (e) { U.err(e); return; } const p = d.purchase;
    PD.modal({ title: esc(PD.t('pur.detail', { no: p.no })), titleText: p.no, size: 'wide', body: `<div class="row wrap" style="gap:8px;margin-bottom:10px"><span class="chip">${esc(p.company)}</span><span class="chip">${esc(PD.date(p.date))}</span>${p.supplier_invoice ? `<span class="chip">${esc(p.supplier_invoice)}</span>` : ''}${p.status === 'cancelled' ? U.pill('bad', PD.t('sales.st.cancelled')) : ''}</div>${U.table([{ label: PD.t('pur.c.item'), f: (l) => l.name }, { label: PD.t('pur.c.qty'), f: (l) => U.qty(l.qty) }, { label: PD.t('pur.c.cost'), r: 1, f: (l) => PD.money(l.unit_cost) }, { label: PD.t('pur.c.expiry'), f: (l) => (l.expiry_date ? PD.date(l.expiry_date) : '') }, { label: PD.t('pur.c.amount'), r: 1, f: (l) => PD.money(l.amount) }], p.lines, { foot: ['', '', '', PD.t('pur.total'), PD.money(p.total)] })}`,
      buttons: [{ label: PD.t('common.close') }].concat(p.status === 'active' ? [{ label: ic('x') + ' ' + esc(PD.t('pur.cancel')), cls: 'bad', onClick: async () => { const reason = await PD.ask(PD.t('pur.cancel'), PD.t('pur.cancelWhy'), { required: true }); if (!reason) return false; const [, er] = await U.withApproval('cancel_purchase', PD.t('pur.cancelWhy'), (ap) => PD.try('purchases.cancel', ap ? { id, reason, approval: ap } : { id, reason })); if (er) { if (er.code !== 'CANCELLED') PD.toast(er.code === 'STATE' ? PD.t('err.STATE') : PD.errText(er), 'bad'); return false; } PD.toast(PD.t('pur.cancelled'), 'ok'); PD.refreshApp(); } }] : []) });
  }
  async function newTab(h) {
    const st = { lines: [] }; let co = [];
    h.innerHTML = `<div class="card"><div class="fgrid">${U.field('pn-co', PD.t('pur.company'), `<div class="row" style="gap:6px"><select class="in" id="pn-co" style="flex:1"></select><button class="btn sm" id="pn-coadd" title="${esc(PD.t('co.add'))}">${ic('plus', 14)}</button></div>`)}${U.field('pn-d', PD.t('pur.date'), `<input type="date" class="in" id="pn-d" value="${U.today()}" max="${U.today()}">`)}${U.field('pn-inv', PD.t('pur.invoice'), '<input class="in" id="pn-inv">')}</div>
      <div class="row wrap" style="gap:8px;margin:12px 0"><div id="pn-p" style="flex:1;min-width:260px;max-width:460px"></div><button class="btn" id="pn-many">${ic('plus')} ${esc(PD.t('sales.many'))}</button><button class="btn" id="pn-newp">${ic('plus')} ${esc(PD.t('pur.newProd'))}</button></div>
      <div id="pn-l"></div><div class="fgrid" style="margin-top:12px;max-width:640px">${U.field('pn-paid', PD.t('pur.paidNow'), U.moneyIn('pn-paid', null))}${U.field('pn-m', PD.t('pur.method'), `<select class="in" id="pn-m">${U.opts(PD.PAY_METHODS.map((m) => [m, PD.t('pay.m.' + m)]), 'cash')}</select>`)}</div><div class="row" style="margin-top:14px"><b id="pn-t"></b><span class="sp"></span><button class="btn p" id="pn-save">${ic('check')} ${esc(PD.t('pur.save'))}</button></div></div>`;
    async function loadCo(sel) { const [cs] = await PD.try('companies.list', {}); co = cs ? cs.rows : []; const s = $('#pn-co'); if (!s) return; s.innerHTML = co.length ? co.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('') : `<option value="">${esc(PD.t('pur.noCo'))}</option>`; if (sel) s.value = String(sel); }
    await loadCo();
    $('#pn-coadd').addEventListener('click', () => form(null, (c) => loadCo(c && c.id)));
    const add = (p) => { if (!p || st.lines.some((l) => l.p.id === p.id)) return; if (!st.lines.length && p.company_id && co.some((c) => c.id === p.company_id)) $('#pn-co').value = String(p.company_id); st.lines.push({ p, qty: {}, cost: p.cost_price != null ? p.cost_price : null, sell: p.list_price > 0 ? p.list_price : null, retail: p.retail_price || null, ppc: p.pcs_per_carton || null, exp: '' }); };
    U.prodPicker($('#pn-p'), { placeholder: PD.t('pur.addProd'), onPick: (it) => { add(it.raw); draw(); focusLast(); } });
    $('#pn-many').addEventListener('click', () => U.pickMany({ isIn: (p) => st.lines.some((l) => l.p.id === p.id), price: (p) => p.cost_price || 0, onAdd: (ps) => { ps.forEach(add); draw(); focusLast(); } }));
    $('#pn-newp').addEventListener('click', () => PD.invTools.productForm(null, async (r) => { const p = r && (r.product || r); if (p && p.id) { const [g] = await PD.try('products.get', { id: p.id }); add(g ? g.product : p); draw(); focusLast(); } }));
    const focusLast = () => { const i = st.lines.length - 1; const n = $('#pq' + i + '-c') || $('#pq' + i + '-kg'); if (n) n.focus(); };
    const locked = (l) => l.p.sell_mode === 'by_kg' || (l.p.pcs_per_carton && l.p.stock && l.p.stock.base > 0);
    const amount = (l) => { if (U.qtyEmpty(l.qty) || l.cost == null) return null; const n = l.p.sell_mode === 'by_kg' ? parseFloat(l.qty.kg) * l.cost : ((l.qty.cartons || 0) + (l.qty.pcs || 0) / (l.ppc || 1)) * l.cost; return Math.round(n); };
    function tot() { const t = st.lines.reduce((s, l) => s + (amount(l) || 0), 0); $('#pn-t').textContent = PD.t('pur.total') + ': ' + PD.money(t); }
    const showAm = (i) => { const l = st.lines[i]; const n = $('[data-am="' + i + '"]'); if (n) n.textContent = amount(l) == null ? '–' : PD.money(amount(l)); tot(); };
    function draw() {
      const b = $('#pn-l'); if (!st.lines.length) { b.innerHTML = U.empty(PD.t('pur.empty')); tot(); return; }
      const mi = (id, v, w, dp) => `<input class="in sm r" style="width:${w}px" id="${id}" inputmode="decimal" value="${esc(v == null ? '' : U.paisaToTaka(v))}" placeholder="${dp || '0'}">`;
      b.innerHTML = `<div class="tw"><table class="t"><thead><tr><th>#</th><th>${esc(PD.t('pur.c.item'))}</th><th>${esc(PD.t('pur.c.qty'))}</th><th class="r">${esc(PD.t('pur.c.ppc'))}</th><th class="r">${esc(PD.t('pur.c.cost'))}</th><th class="r">${esc(PD.t('pur.c.amount'))}</th><th class="r">${esc(PD.t('pur.c.sell'))}</th><th class="r">${esc(PD.t('sv.c.retail'))}</th><th>${esc(PD.t('pur.c.expiry'))}</th><th></th></tr></thead><tbody>${st.lines.map((l, i) => `<tr><td class="muted small">${PD.digits(i + 1)}</td><td><b>${esc(l.p.name)}</b><div class="muted small">${esc(l.p.sku)} · ${esc(U.qty(l.p.stock))}</div></td><td>${U.qtyHtml('pq' + i, l.p, l.qty)}</td><td class="r">${l.p.sell_mode === 'by_kg' ? '–' : locked(l) ? PD.digits(l.ppc) : `<input class="in sm r" style="width:54px" data-pp="${i}" inputmode="numeric" value="${l.ppc || ''}" placeholder="?">`}</td><td class="r">${mi('pc' + i, l.cost, 84)}</td><td class="r num" data-am="${i}">–</td><td class="r">${mi('ps' + i, l.sell, 84)}</td><td class="r">${mi('pr' + i, l.retail, 74, '–')}</td><td><input type="date" class="in sm" style="width:132px" data-ex="${i}" value="${esc(l.exp)}"></td><td><button class="btn sm ghost" data-rm="${i}" >${ic('x', 14)}</button></td></tr>`).join('')}</tbody></table></div>`;
      const money = (v) => (String(v).trim() === '' ? null : U.takaToPaisa(v));
      st.lines.forEach((l, i) => {
        $$('#pq' + i + '-kg, #pq' + i + '-c, #pq' + i + '-p', b).forEach((n) => { n.addEventListener('input', () => { l.qty = U.qtyRead(b, 'pq' + i, l.p); showAm(i); }); n.addEventListener('focus', () => n.select()); });
        $('#pc' + i, b).addEventListener('input', (e) => { l.cost = money(e.target.value); showAm(i); });
        $('#ps' + i, b).addEventListener('input', (e) => { l.sell = money(e.target.value); });
        $('#pr' + i, b).addEventListener('input', (e) => { l.retail = money(e.target.value); });
        const pp = $('[data-pp="' + i + '"]', b); if (pp) pp.addEventListener('input', (e) => { l.ppc = U.int(e.target.value) || null; showAm(i); });
        showAm(i);
      });
      $$('[data-ex]', b).forEach((n) => n.addEventListener('change', () => { st.lines[+n.dataset.ex].exp = n.value; })); $$('[data-rm]', b).forEach((n) => n.addEventListener('click', () => { st.lines.splice(+n.dataset.rm, 1); draw(); })); tot();
    }
    draw();
    $('#pn-save').addEventListener('click', (ev) => U.busy(ev.currentTarget, async () => {
      const cid = +$('#pn-co').value; if (!cid) { PD.toast(PD.t('pur.noCo'), 'warn'); return; }
      if (!st.lines.length) { PD.toast(PD.t('pur.noLines'), 'warn'); return; }
      for (const l of st.lines) {
        if (U.qtyEmpty(l.qty)) { PD.toast(PD.t('pur.lineQty', { name: l.p.name }), 'warn'); return; }
        if (l.cost == null) { PD.toast(PD.t('pur.lineCost', { name: l.p.name }), 'warn'); return; }
        if (l.p.sell_mode !== 'by_kg' && !l.ppc) { PD.toast(PD.t('pur.ppcNeed') + ' (' + l.p.name + ')', 'warn'); return; }
      }
      const lines = st.lines.map((l) => { const o = { product_id: l.p.id, qty: l.qty, unit_cost: l.cost }; if (l.exp) o.expiry_date = l.exp; if (l.p.sell_mode !== 'by_kg' && l.ppc !== l.p.pcs_per_carton) o.pcs_per_carton = l.ppc; if (l.sell != null && l.sell !== l.p.list_price) o.sell_price = l.sell; if ((l.retail || null) !== (l.p.retail_price || null)) o.retail_price = l.retail || 0; return o; });
      const b = { company_id: cid, date: $('#pn-d').value, lines }; const inv = $('#pn-inv').value.trim(); if (inv) b.supplier_invoice = inv; const paid = U.moneyRead(h, 'pn-paid'); if (paid) b.paid_now = { amount: paid, method: $('#pn-m').value };
      const [d, e] = await PD.try('purchases.create', b); if (e) { U.err(e); return; } PD.toast(PD.t('pur.saved', { no: d.purchase.no }), 'ok'); PD.renderStatus(); PD.S.purTab = 'list'; PD.refreshApp();
    }));
  }
  async function coTab(h) {
    h.innerHTML = '<div class="row" style="margin-bottom:12px"><span class="sp"></span><button class="btn p" id="co-add"></button></div><div id="co-l"></div>'; $('#co-add').innerHTML = ic('plus') + ' ' + esc(PD.t('co.add'));
    async function go() {
      const [d, e] = await PD.try('companies.list', {}); if (e) { U.err(e); return; }
      $('#co-l').innerHTML = U.table([{ label: PD.t('co.name'), f: (c) => c.name }, { label: PD.t('co.phone'), f: (c) => PD.digits(c.phone || '') }, { label: PD.t('co.due'), r: 1, raw: 1, f: (c) => `<b class="${c.due > 0 ? 'bad-t' : ''}">${PD.money(c.due || 0)}</b>` }, { label: '', raw: 1, r: 1, f: (c) => `<button class="btn sm" data-ed="${c.id}">${ic('edit', 14)}</button>` }], d.rows);
      U.onRow($('#co-l'), d.rows, (c) => ledger(c)); $$('[data-ed]', $('#co-l')).forEach((b) => b.addEventListener('click', () => form(d.rows.find((c) => c.id === +b.dataset.ed), go)));
    }
    $('#co-add').addEventListener('click', () => form(null, go)); go();
  }
  function form(c, done) {
    const m = PD.modal({ title: esc(PD.t('co.add')), titleText: PD.t('co.add'), body: `<div class="fgrid">${U.field('cf-n', PD.t('co.name'), `<input class="in" id="cf-n" value="${esc(c && c.name)}">`)}${U.field('cf-p', PD.t('co.phone'), `<input class="in" id="cf-p" value="${esc(c && c.phone)}">`)}${c ? '' : U.field('cf-o', PD.t('co.opening'), U.moneyIn('cf-o', null))}</div>`, buttons: [{ label: PD.t('common.cancel') }, { label: PD.t('common.save'), cls: 'p', main: true, onClick: async (mm) => {
      const b = { name: $('#cf-n', mm.el).value.trim() }; if (!b.name) { PD.toast(PD.t('common.required'), 'warn'); return false; } if (c) b.id = c.id; const ph = $('#cf-p', mm.el).value.trim(); if (ph) b.phone = ph; if (!c) { const o = U.moneyRead(mm.el, 'cf-o'); if (o) b.opening_due = o; }
      const [r, e] = await PD.try('companies.save', b); if (e) { U.err(e); return false; } PD.toast(PD.t('co.saved'), 'ok'); if (done) done(r && (r.company || r)); } }] });
    void m;
  }
  async function ledger(c) {
    const [d, e] = await PD.try('companies.ledger', { company_id: c.id }); if (e) { U.err(e); return; }
    PD.modal({ title: esc(PD.t('co.ledger') + ': ' + c.name), titleText: c.name, size: 'wide', body: `<div class="kpi b" style="margin-bottom:10px"><span class="k">${esc(PD.t('co.due'))}</span><span class="v">${PD.money(d.due)}</span></div><div style="max-height:50vh;overflow:auto">${U.table([{ label: PD.t('cust.l.date'), f: (r) => PD.date(r.date) }, { label: PD.t('cust.l.ref'), f: (r) => r.ref || '' }, { label: PD.t('co.l.credit'), r: 1, f: (r) => (r.credit ? PD.money(r.credit) : '') }, { label: PD.t('co.l.debit'), r: 1, f: (r) => (r.debit ? PD.money(r.debit) : '') }, { label: PD.t('cust.l.bal'), r: 1, f: (r) => PD.money(r.balance) }], d.rows.slice().reverse())}</div>`, buttons: [{ label: PD.t('common.close') }] });
  }
})(typeof window !== 'undefined' ? window : globalThis);

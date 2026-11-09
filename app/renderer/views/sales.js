/* Sales: fast new-sale screen (customer, lines, per-line discount, invoice discount, pay now) + invoice list and detail. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { $, $$, esc, ic } = PD; const U = PD.ui;
  PD.i18n.pairs({
    'sales.new': ['New sale', 'নতুন বিক্রি'], 'sales.list': ['Invoices', 'ইনভয়েস তালিকা'], 'sales.customer': ['Customer', 'গ্রাহক'], 'sales.pickCust': ['Choose a customer to start', 'শুরু করতে গ্রাহক বেছে নিন'],
    'sales.addProd': ['Add product (name or SKU)', 'পণ্য যোগ করুন (নাম বা SKU)'], 'sales.date': ['Invoice date', 'ইনভয়েসের তারিখ'], 'sales.salesman': ['Salesman', 'বিক্রয়কর্মী'],
    'sales.col.item': ['Item', 'পণ্য'], 'sales.col.qty': ['Quantity', 'পরিমাণ'], 'sales.col.price': ['Price', 'দর'], 'sales.col.disc': ['Discount', 'ছাড়'], 'sales.col.net': ['Amount', 'টাকা'],
    'sales.d.none': ['No discount', 'ছাড় নেই'], 'sales.d.per_unit': ['৳ per ctn/kg', '৳ প্রতি কার্টন/কেজি'], 'sales.d.percent': ['Percent %', 'শতাংশ %'], 'sales.d.line': ['৳ on line', '৳ লাইনে'],
    'sales.invDisc': ['Invoice discount', 'ইনভয়েস ছাড়'], 'sales.id.none': ['None', 'নেই'], 'sales.id.percent': ['Percent %', 'শতাংশ %'], 'sales.id.amount': ['Amount ৳', 'টাকা ৳'],
    'sales.payNow': ['Paid now', 'এখন পরিশোধ'], 'sales.method': ['Method', 'মাধ্যম'], 'sales.ref': ['Reference', 'রেফারেন্স'],
    'sales.subtotal': ['Subtotal', 'মোট'], 'sales.lineDisc': ['Item discounts', 'পণ্যের ছাড়'], 'sales.invDiscAmt': ['Invoice discount', 'ইনভয়েস ছাড়'], 'sales.total': ['Total', 'সর্বমোট'], 'sales.paid': ['Paid', 'পরিশোধ'], 'sales.due': ['Due on this invoice', 'এই ইনভয়েসে বাকি'], 'sales.prevDue': ['Previous due', 'আগের বাকি'], 'sales.afterDue': ['Customer due after', 'বিক্রির পর মোট বাকি'],
    'sales.save': ['Save sale', 'বিক্রি সেভ করুন'], 'sales.clear': ['Clear', 'মুছুন'], 'sales.empty': ['Add products to begin.', 'শুরু করতে পণ্য যোগ করুন।'],
    'sales.overCap': ['Discount is above the allowed limit ({v} per ctn/kg). Owner PIN is needed.', 'ছাড় সীমার ({v} প্রতি কার্টন/কেজি) বেশি। মালিকের PIN লাগবে।'], 'sales.belowMin': ['Price is below the minimum selling price. Owner PIN is needed.', 'দাম সর্বনিম্ন বিক্রয়মূল্যের নিচে। মালিকের PIN লাগবে।'],
    'sales.creditWarn': ['This sale takes the customer above the credit limit.', 'এই বিক্রিতে গ্রাহকের বাকির সীমা ছাড়িয়ে যাবে।'], 'sales.creditBlock': ['Credit limit would be exceeded. Owner PIN is needed.', 'বাকির সীমা ছাড়িয়ে যাবে। মালিকের PIN লাগবে।'],
    'sales.why': ['Owner approval for this sale', 'এই বিক্রির জন্য মালিকের অনুমোদন'], 'sales.saved': ['Saved {no}', '{no} সেভ হয়েছে'], 'sales.noCust': ['Choose a customer first.', 'আগে গ্রাহক বেছে নিন।'], 'sales.noLines': ['Add at least one product.', 'অন্তত একটি পণ্য যোগ করুন।'], 'sales.qtyMissing': ['Enter a quantity for every line.', 'প্রতিটি লাইনে পরিমাণ দিন।'],
    'sales.stockShort': ['Not enough stock: {name} (available {av})', 'স্টক কম: {name} (আছে {av})'], 'sales.newCust': ['New customer', 'নতুন গ্রাহক'], 'sales.perCtn': ['per ctn', 'প্রতি কার্টন'], 'sales.perKg': ['per kg', 'প্রতি কেজি'],
    'sales.f.q': ['Invoice no. or customer', 'ইনভয়েস নং বা গ্রাহক'], 'sales.f.status': ['Status', 'অবস্থা'], 'sales.st.completed': ['Completed', 'সম্পন্ন'], 'sales.st.cancelled': ['Cancelled', 'বাতিল'], 'sales.st.all': ['All', 'সব'],
    'sales.c.no': ['Invoice', 'ইনভয়েস'], 'sales.c.time': ['Time', 'সময়'], 'sales.c.cust': ['Customer', 'গ্রাহক'], 'sales.c.lines': ['Lines', 'লাইন'], 'sales.c.total': ['Total', 'মোট'], 'sales.c.paid': ['Paid', 'পরিশোধ'], 'sales.c.due': ['Due', 'বাকি'], 'sales.c.by': ['By', 'কে'], 'sales.c.flag': ['Override', 'অনুমোদিত ছাড়'],
    'sales.detail': ['Invoice {no}', 'ইনভয়েস {no}'], 'sales.viewInv': ['Open invoice', 'ইনভয়েস খুলুন'], 'sales.cancel': ['Cancel invoice', 'ইনভয়েস বাতিল'], 'sales.cancelWhy': ['Cancelling returns the stock and reverses payments. Give a reason.', 'বাতিল করলে স্টক ফেরত আসবে ও আদায় উল্টে যাবে। কারণ লিখুন।'], 'sales.cancelled': ['Invoice cancelled', 'ইনভয়েস বাতিল হয়েছে'],
    'sales.mode': ['Sale type', 'বিক্রির ধরন'], 'sales.m.direct': ['Direct sale', 'সরাসরি বিক্রি'], 'sales.m.van': ['Van invoice', 'গাড়ির ইনভয়েস'], 'sales.ptype': ['Price', 'দাম'], 'sales.pt.wholesale': ['Wholesale', 'পাইকারি'], 'sales.pt.retail': ['Retail', 'খুচরা'], 'sales.many': ['Select many products', 'একসাথে অনেক পণ্য বাছুন'], 'sales.manyAdd': ['Add selected ({n})', 'বাছাইগুলো যোগ করুন ({n})'], 'sales.manyQ': ['Search product…', 'পণ্য খুঁজুন…'], 'sales.noRetail': ['Retail price not set', 'খুচরা দাম দেওয়া নেই'], 'sales.vanHint': ['Van invoice: stock is deducted now. Use the dispatch date as the invoice date.', 'গাড়ির ইনভয়েস: এখনই স্টক কমবে। ইনভয়েসের তারিখ হিসেবে মাল পাঠানোর তারিখ দিন।'],
    'sales.needPin': ['A discount or price on this invoice is outside the limit. Owner PIN is needed to save.', 'এই ইনভয়েসের ছাড় বা দাম সীমার বাইরে। সেভ করতে মালিকের PIN লাগবে।'], 'sales.makeReturn': ['Return items', 'পণ্য ফেরত'], 'sales.overrideBy': ['Approved by owner: {r}', 'মালিক অনুমোদন করেছেন: {r}'], 'sales.cancelInfo': ['Cancelled by {u}: {r}', '{u} বাতিল করেছেন: {r}'], 'sales.returned': ['Returned', 'ফেরত'], 'sales.lots': ['Lots', 'লট']
  });

  PD.views.sales = {
    render(el) {
      let tab = PD.S.salesTab || 'new';
      el.innerHTML = `<div class="tabs"><button class="tab ${tab === 'new' ? 'on' : ''}" data-tab="new">${ic('plus')} ${esc(PD.t('sales.new'))}</button><button class="tab ${tab === 'list' ? 'on' : ''}" data-tab="list">${ic('receipt')} ${esc(PD.t('sales.list'))}</button></div><div id="s-body"></div>`;
      $$('[data-tab]', el).forEach((b) => b.addEventListener('click', () => { PD.S.salesTab = b.dataset.tab; PD.refreshApp(); }));
      if (tab === 'new') newSale($('#s-body')); else invoiceList($('#s-body'));
    }
  };

  /* ---------------- new sale ---------------- */
  function newSale(host) {
    const owner = PD.power(); const st = { customer: null, lines: [], invDisc: { type: 'none', value: 0 }, pay: { amount: null, method: 'cash', ref: '' }, date: '', salesman: null }; const pre = PD.S.salesPreset || {}; PD.S.salesPreset = null; st.mode = pre.mode || 'direct'; st.priceType = 'wholesale'; if (pre.date) st.date = pre.date; let prev = null; let seq = 0; let employees = [];
    host.innerHTML = `<div class="split"><div class="card" style="padding:12px">
      <div class="fgrid" style="margin-bottom:10px">${U.field('s-cust', PD.t('sales.customer'), '<div id="s-cust"></div>', 'full')}<div id="s-custinfo" class="full"></div>${U.field('s-mode', PD.t('sales.mode'), `<select class="in" id="s-mode">${U.opts([['direct', PD.t('sales.m.direct')], ['van', PD.t('sales.m.van')]], st.mode)}</select>`)}${U.field('s-pt', PD.t('sales.ptype'), `<select class="in" id="s-pt">${U.opts([['wholesale', PD.t('sales.pt.wholesale')], ['retail', PD.t('sales.pt.retail')]], st.priceType)}</select>`)}${owner ? U.field('s-date', PD.t('sales.date'), `<input type="date" class="in" id="s-date" value="${st.date || U.today()}" max="${U.today()}">`) : ''}<div id="s-vh" class="full small muted"></div>${U.field('s-sm', PD.t('sales.salesman'), '<select class="in" id="s-sm"><option value="">—</option></select>')}</div>
      <div class="row" style="gap:8px;margin-bottom:10px"><div id="s-prod" style="flex:1"></div><button class="btn" id="s-many">${ic('plus')} ${esc(PD.t('sales.many'))}</button></div><div id="s-lines"></div></div>
      <div class="card" id="s-side"></div></div>`;
    const vh = () => { $('#s-vh').textContent = st.mode === 'van' ? PD.t('sales.vanHint') : ''; }; vh();
    $('#s-mode').addEventListener('change', (e) => { st.mode = e.target.value; vh(); });
    $('#s-pt').addEventListener('change', (e) => { st.priceType = e.target.value; drawLines(); schedule(); });
    $('#s-many').addEventListener('click', () => pickMany());
    if (owner) $('#s-date').addEventListener('change', (e) => { st.date = e.target.value === U.today() ? '' : e.target.value; });
    (PD.S.role === 'owner' ? PD.try('employees.list', {}) : Promise.resolve([null])).then(([d]) => { if (!d) return; employees = d.rows.filter((r) => r.role === 'salesman'); $('#s-sm').innerHTML += employees.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join(''); }).catch(() => {});
    $('#s-sm').addEventListener('change', (e) => { st.salesman = e.target.value ? +e.target.value : null; });

    const cp = U.custPicker($('#s-cust'), { keep: true, onPick: (it) => { st.customer = it.raw; custInfo(); schedule(); $('#s-prod input').focus(); } });
    const nb = document.createElement('button'); nb.className = 'btn sm'; nb.style.marginTop = '6px'; nb.innerHTML = ic('plus') + ' ' + esc(PD.t('sales.newCust')); $('#s-cust').appendChild(nb);
    nb.addEventListener('click', () => PD.customerForm(null, (c) => { st.customer = c; cp.set(c.name); custInfo(); schedule(); }));
    function custInfo() {
      const c = st.customer; $('#s-custinfo').innerHTML = c ? `<div class="row wrap" style="gap:8px"><span class="chip">${esc(c.area || '')}</span><span class="chip">${esc(PD.t('cust.due'))}: <b class="${c.due > 0 ? 'bad-t' : ''}">${PD.money(c.due)}</b></span>${c.credit_limit ? `<span class="chip">${esc(PD.t('cust.limit'))}: ${PD.money(c.credit_limit)}</span>` : ''}</div>` : `<span class="muted small">${esc(PD.t('sales.pickCust'))}</span>`;
    }
    custInfo();
    U.prodPicker($('#s-prod'), { placeholder: PD.t('sales.addProd'), onPick: (it) => { addLine(it.raw); } });

    function addLine(p) {
      const ex = st.lines.find((l) => l.p.id === p.id); if (ex) { const i = st.lines.indexOf(ex); const n = $('[data-qf="' + i + '"]'); if (n) n.focus(); return; }
      st.lines.push({ p, qty: {}, disc: { type: 'none', input: '' } }); drawLines(); const i = st.lines.length - 1; const n = $('[data-qf="' + i + '"]'); if (n) n.focus(); schedule();
    }
    const priceOf = (p) => (st.priceType === 'retail' ? p.retail_price : p.list_price);
    const pickMany = () => U.pickMany({ isIn: (p) => st.lines.some((l) => l.p.id === p.id), price: (p) => priceOf(p), onAdd: (ps) => { ps.forEach((p) => st.lines.push({ p, qty: {}, disc: { type: 'none', input: '' } })); drawLines(); schedule(); const f = $('[data-qf="' + (st.lines.length - ps.length) + '"]'); if (f) f.focus(); } });
    const unitLabel = (p) => (p.sell_mode === 'by_kg' ? PD.t('sales.perKg') : PD.t('sales.perCtn'));
    function drawLines() {
      const h = $('#s-lines'); if (!st.lines.length) { h.innerHTML = U.empty(PD.t('sales.empty')); return; }
      h.innerHTML = `<div class="tw"><table class="t"><thead><tr><th>${esc(PD.t('sales.col.item'))}</th><th>${esc(PD.t('sales.col.qty'))}</th><th class="r">${esc(PD.t('sales.col.price'))}</th><th>${esc(PD.t('sales.col.disc'))}</th><th class="r">${esc(PD.t('sales.col.net'))}</th><th></th></tr></thead><tbody>${st.lines.map((l, i) => `<tr data-r="${i}"><td><b>${esc(l.p.name)}</b><div class="muted small">${esc(U.qty(l.p.stock))}</div><div class="small bad-t" data-msg="${i}"></div></td><td>${U.qtyHtml('q' + i, l.p, l.qty)}</td><td class="r">${priceOf(l.p) > 0 ? PD.money(priceOf(l.p)) : `<span class="bad-t">${esc(PD.t('sales.noRetail'))}</span>`}<div class="muted small">${esc(unitLabel(l.p))}</div></td><td><select class="in sm" data-dt="${i}">${U.opts(['none', 'per_unit', 'percent', 'line'].map((k) => [k, PD.t('sales.d.' + k)]), l.disc.type)}</select> <input class="in sm r" style="width:84px" inputmode="decimal" data-dv="${i}" value="${esc(l.disc.input)}" ${l.disc.type === 'none' ? 'disabled' : ''}></td><td class="r"><b data-net="${i}">–</b></td><td><button class="btn sm" data-rm="${i}" aria-label="${esc(PD.t('common.close'))}">${ic('x', 14)}</button></td></tr>`).join('')}</tbody></table></div>`;
      st.lines.forEach((l, i) => {
        $$('#q' + i + '-kg, #q' + i + '-c, #q' + i + '-p', h).forEach((n, k) => { if (k === 0) n.dataset.qf = i; n.addEventListener('input', () => { l.qty = U.qtyRead(h, 'q' + i, l.p); schedule(); }); n.addEventListener('focus', () => n.select()); });
      });
      $$('[data-dt]', h).forEach((s) => s.addEventListener('change', () => { const l = st.lines[+s.dataset.dt]; l.disc.type = s.value; const v = $('[data-dv="' + s.dataset.dt + '"]'); v.disabled = s.value === 'none'; if (s.value === 'none') { v.value = ''; l.disc.input = ''; } else v.focus(); schedule(); }));
      $$('[data-dv]', h).forEach((n) => n.addEventListener('input', () => { st.lines[+n.dataset.dv].disc.input = n.value; schedule(); }));
      $$('[data-rm]', h).forEach((b) => b.addEventListener('click', () => { st.lines.splice(+b.dataset.rm, 1); drawLines(); schedule(); }));
    }
    const discOf = (l) => {
      const v = String(l.disc.input || '').trim(); if (l.disc.type === 'none' || v === '') return { type: 'none', value: 0 };
      if (l.disc.type === 'percent') { const m = /^(\d+)(\.\d{1,2})?$/.exec(v); if (!m) return null; return { type: 'percent', value: Math.round(parseFloat(v) * 100) }; }
      const p = U.takaToPaisa(v); return p == null ? null : { type: l.disc.type, value: p };
    };
    function body(withAll) {
      const lines = []; for (let i = 0; i < st.lines.length; i++) { const l = st.lines[i]; if (U.qtyEmpty(l.qty)) { if (withAll) return { err: 'qty' }; continue; } const d = discOf(l); if (!d) return { err: 'disc', i }; lines.push({ product_id: l.p.id, qty: l.qty, discount: d }); }
      const b = { customer_id: st.customer && st.customer.id, lines, price_type: st.priceType }; if (st.mode === 'van') b.van = 'van1'; const idv = String(st.invDisc.value || '').trim();
      if (st.invDisc.type !== 'none' && idv) { const v = st.invDisc.type === 'percent' ? Math.round(parseFloat(idv) * 100) : U.takaToPaisa(idv); if (v == null || isNaN(v)) return { err: 'inv' }; b.invoice_discount = { type: st.invDisc.type, value: v }; }
      const pay = st.pay.amount != null ? st.pay.amount : 0; if (pay > 0) b.pay_now = pay; return { b };
    }
    const schedule = U.debounce(async () => {
      const r = body(false); const my = ++seq; if (r.err || !st.customer || !r.b.lines.length) { prev = null; side(null); return; }
      const [d, e] = await PD.try('sales.preview', r.b); if (my !== seq) return;
      $$('[data-msg]').forEach((n) => { n.textContent = ''; }); $$('[data-net]').forEach((n) => { n.textContent = '–'; });
      if (e) { prev = null; if (e.code === 'STOCK') { ((e.details && e.details.lines) || []).forEach((x) => { const idx = idxOf(r.b, x.index); const n = $('[data-msg="' + idx + '"]'); if (n) n.textContent = PD.t('sales.stockShort', { name: st.lines[idx].p.name, av: x.available && x.available.text ? U.qty(x.available) : PD.digits(String(x.available == null ? 0 : x.available)) }); }); } side(null, e); return; }
      prev = d; const map = []; st.lines.forEach((l, i) => { if (!U.qtyEmpty(l.qty) && discOf(l)) map.push(i); });
      d.lines.forEach((ln, k) => { const i = map[k]; const n = $('[data-net="' + i + '"]'); if (n) n.textContent = PD.money(ln.net); const m = $('[data-msg="' + i + '"]'); if (m) { if (!owner && ln.below_min_price) m.textContent = PD.t('sales.belowMin'); else if (!owner && ln.over_cap) m.textContent = PD.t('sales.overCap', { v: PD.money(ln.allowed_per_unit) }); } });
      side(d);
    }, 240);
    const idxOf = (b, k) => { let c = -1; for (let i = 0; i < st.lines.length; i++) { if (!U.qtyEmpty(st.lines[i].qty)) c++; if (c === k) return i; } return 0; };

    function side(d, err) {
      const ae = document.activeElement; const keep = ae && ae.id && $('#s-side') && $('#s-side').contains(ae) && /^(s-pay|s-idv|s-ref)$/.test(ae.id) ? { id: ae.id, v: ae.value, a: ae.selectionStart, z: ae.selectionEnd } : null;
      const t = d && d.totals; const cs = t && t.credit_state;
      const row = (a, b, cls) => `<span class="${cls || ''}">${esc(a)}</span><b class="num ${cls || ''}" style="text-align:right">${b}</b>`;
      $('#s-side').innerHTML = `<div class="tot">${row(PD.t('sales.subtotal'), t ? PD.money(t.subtotal) : '–')}${t && t.line_discount ? row(PD.t('sales.lineDisc'), '−' + PD.money(t.line_discount)) : ''}${t && t.invoice_discount ? row(PD.t('sales.invDiscAmt'), '−' + PD.money(t.invoice_discount)) : ''}<div class="hr"></div><span class="big">${esc(PD.t('sales.total'))}</span><span class="big num" style="text-align:right">${t ? PD.money(t.total) : '–'}</span>${t && t.paid ? row(PD.t('sales.paid'), PD.money(t.paid)) : ''}${t ? row(PD.t('sales.due'), PD.money(t.due), t.due > 0 ? 'warn-t' : '') : ''}${t ? '<div class="hr"></div>' + row(PD.t('sales.prevDue'), PD.money(t.customer_due_before)) + row(PD.t('sales.afterDue'), PD.money(t.customer_due_after), cs !== 'ok' ? 'bad-t' : '') : ''}</div>
      ${t && t.over_cap_lines.length && !owner ? `<p class="note" style="margin:10px 0 0">${esc(PD.t('sales.needPin'))}</p>` : ''}${cs === 'warn' ? `<p class="note" style="margin:10px 0 0">${esc(PD.t('sales.creditWarn'))}</p>` : ''}${cs === 'blocked' ? `<p class="note bad" style="margin:10px 0 0">${esc(PD.t('sales.creditBlock'))}</p>` : ''}${err && err.code !== 'STOCK' ? `<p class="note bad" style="margin:10px 0 0">${esc(PD.errText(err))}</p>` : ''}
      <hr style="border:0;border-top:1px solid var(--line);margin:12px 0"><div class="fgrid"><div class="full"><label class="l">${esc(PD.t('sales.invDisc'))}</label><div class="row"><select class="in" id="s-idt">${U.opts(['none', 'percent', 'amount'].map((k) => [k, PD.t('sales.id.' + k)]), st.invDisc.type)}</select><input class="in r" id="s-idv" style="width:100px" inputmode="decimal" value="${esc(st.invDisc.value || '')}" ${st.invDisc.type === 'none' ? 'disabled' : ''}></div></div>
      ${U.field('s-pay', PD.t('sales.payNow'), U.moneyIn('s-pay', st.pay.amount))}${U.field('s-pm', PD.t('sales.method'), `<select class="in" id="s-pm">${U.opts(PD.PAY_METHODS.map((m) => [m, PD.t('pay.m.' + m)]), st.pay.method)}</select>`)}${st.pay.method !== 'cash' ? U.field('s-ref', PD.t('sales.ref'), `<input class="in" id="s-ref" value="${esc(st.pay.ref)}">`, 'full') : ''}</div>
      <div class="row" style="margin-top:14px"><button class="btn" id="s-clear">${esc(PD.t('sales.clear'))}</button><span class="sp"></span><button class="btn p" id="s-save">${ic('check')} ${esc(PD.t('sales.save'))} <kbd class="kbd">F2</kbd></button></div>`;
      $('#s-idt').addEventListener('change', (e) => { st.invDisc.type = e.target.value; if (e.target.value === 'none') st.invDisc.value = ''; schedule(); side(prev, err); $('#s-idv').focus(); });
      $('#s-idv').addEventListener('input', (e) => { st.invDisc.value = e.target.value; schedule(); });
      $('#s-pay').addEventListener('input', (e) => { st.pay.amount = U.takaToPaisa(e.target.value); if (e.target.value === '') st.pay.amount = null; schedule(); });
      $('#s-pm').addEventListener('change', (e) => { st.pay.method = e.target.value; side(prev, err); });
      const rf = $('#s-ref'); if (rf) rf.addEventListener('input', (e) => { st.pay.ref = e.target.value; });
      $('#s-clear').addEventListener('click', reset); $('#s-save').addEventListener('click', save);
      if (keep) { const n = $('#' + keep.id); if (n && !n.disabled) { n.value = keep.v; n.focus(); try { n.setSelectionRange(keep.a, keep.z); } catch (x) { /* ignore */ } } }
    }
    function reset() { st.customer = null; st.lines = []; st.invDisc = { type: 'none', value: 0 }; st.pay = { amount: null, method: 'cash', ref: '' }; prev = null; cp.set(''); custInfo(); drawLines(); side(null); }
    async function save() {
      const btn = $('#s-save'); if (!st.customer) { PD.toast(PD.t('sales.noCust'), 'warn'); return; } const r = body(true);
      if (r.err === 'qty') { PD.toast(PD.t('sales.qtyMissing'), 'warn'); return; } if (r.err) { PD.toast(PD.t('err.VALIDATION'), 'warn'); return; } if (!r.b.lines.length) { PD.toast(PD.t('sales.noLines'), 'warn'); return; }
      const b = r.b; if (owner && st.date) b.date = st.date; if (st.salesman) b.salesman_id = st.salesman;
      if (b.pay_now) { b.payment = { amount: b.pay_now, method: st.pay.method }; if (st.pay.ref) b.payment.ref = st.pay.ref; delete b.pay_now; }
      await U.busy(btn, async () => {
        const [d, e] = await U.withApproval('discount_override', PD.t('sales.why'), (ap) => PD.try('sales.create', ap ? Object.assign({}, b, { approval: ap }) : b));
        if (e) { if (e.code !== 'CANCELLED') { if (e.code === 'STOCK') schedule(); U.err(e); } return; }
        PD.toast(PD.t('sales.saved', { no: d.sale.invoice_no }), 'ok'); const id = d.sale.id; reset(); PD.renderStatus(); if (st.mode !== 'van') PD.openInvoice(id, { markPrinted: true });
      });
    }
    drawLines(); side(null);
    host._key = (e) => { if (e.key === 'F2' || (e.key === 'Enter' && e.ctrlKey)) { e.preventDefault(); save(); } };
    if (!PD._salesKey) { PD._salesKey = true; document.addEventListener('keydown', (e) => { const h = $('#s-body'); if (h && h._key && PD.S.view === 'sales' && !PD.modalCount()) h._key(e); }); }
  }

  /* ---------------- invoice list ---------------- */
  function invoiceList(host) {
    const f = { from: U.today(), to: U.today(), q: '', status: '' };
    host.innerHTML = `<div class="row wrap" style="margin-bottom:12px;gap:10px"><span id="l-range"></span><input class="in" id="l-q" style="width:220px" placeholder="${esc(PD.t('sales.f.q'))}"><select class="in" id="l-st">${U.opts([['', PD.t('sales.st.all')], ['completed', PD.t('sales.st.completed')], ['cancelled', PD.t('sales.st.cancelled')]], '')}</select></div><div id="l-body"></div>`;
    let pg; const go = () => { pg = U.pager($('#l-body'), (cur) => PD.try('sales.list', { from: f.from, to: f.to, q: f.q || undefined, status: f.status || undefined, limit: 50, cursor: cur || undefined }), (rows, d) => draw(rows)); };
    U.range($('#l-range'), { from: f.from, to: f.to, onChange: (r) => { f.from = r.from; f.to = r.to; go(); } });
    $('#l-q').addEventListener('input', U.debounce((e) => { f.q = e.target.value.trim(); go(); })); $('#l-st').addEventListener('change', (e) => { f.status = e.target.value; go(); });
    function draw(rows) {
      const body = $('#l-body'); const more = $('[data-more]', body); if (more) more.remove();
      const tbl = U.table([{ label: PD.t('sales.c.no'), f: (r) => r.invoice_no, cls: 'mono' }, { label: PD.t('sales.c.time'), f: (r) => U.dt(r.ts) }, { label: PD.t('sales.c.cust'), f: (r) => r.customer }, { label: PD.t('sales.c.lines'), r: 1, f: (r) => PD.digits(r.lines) }, { label: PD.t('sales.c.total'), r: 1, f: (r) => PD.money(r.total) }, { label: PD.t('sales.c.paid'), r: 1, f: (r) => PD.money(r.paid) }, { label: PD.t('sales.c.due'), r: 1, f: (r) => PD.money(r.due) }, { label: PD.t('sales.c.by'), f: (r) => r.created_by }, { label: '', raw: 1, f: (r) => (r.status === 'cancelled' ? U.pill('bad', PD.t('sales.st.cancelled')) : r.has_override ? U.pill('low', PD.t('sales.c.flag')) : '') }], rows, { rowCls: (r) => (r.status === 'cancelled' ? 'cx' : r.has_override ? 'flag' : '') });
      body.innerHTML = tbl; U.onRow(body, rows, (r) => saleDetail(r.id, go)); if (pg && pg._cursor) { /* more button re-added by pager */ }
    }
    go();
  }
  PD.saleDetail = saleDetail;
  async function saleDetail(id, onChange) {
    const [s, e] = await PD.try('sales.get', { id }); if (e) { U.err(e); return; }
    const lines = U.table([{ label: PD.t('sales.col.item'), raw: 1, f: (l) => `<b>${esc(l.name)}</b>${l.over_cap ? ` <span class="tag">${esc(PD.t('sales.c.flag'))}</span>` : ''}` }, { label: PD.t('sales.col.qty'), f: (l) => U.qty(l.qty) }, { label: PD.t('sales.col.price'), r: 1, f: (l) => PD.money(l.list_price) }, { label: PD.t('sales.col.disc'), r: 1, f: (l) => (l.discount.amount ? '−' + PD.money(l.discount.amount) : '') }, { label: PD.t('sales.col.net'), r: 1, f: (l) => PD.money(l.net) }, { label: PD.t('sales.returned'), r: 1, f: (l) => { const b = l.returned ? l.returned.base : l.returned_base; return b ? (l.returned ? U.qty(l.returned) : PD.digits(String(b))) : ''; } }].concat(PD.S.role === 'owner' ? [{ label: PD.t('inv.profit'), r: 1, f: (l) => (l.profit != null ? PD.money(l.profit) : '') }] : []), s.lines);
    const t = s.totals; const row = (a, b, c) => `<span class="${c || ''}">${esc(a)}</span><b class="num ${c || ''}" style="text-align:right">${b}</b>`;
    const m = PD.modal({ title: esc(PD.t('sales.detail', { no: s.invoice_no })), titleText: s.invoice_no, size: 'wide',
      body: `<div class="row wrap" style="gap:8px;margin-bottom:10px"><span class="chip">${esc(s.customer.name)}</span><span class="chip">${esc(U.dt(s.ts))}</span><span class="chip">${esc(s.created_by)}</span>${s.status === 'cancelled' ? U.pill('bad', PD.t('sales.st.cancelled')) : ''}</div>${s.override ? `<p class="note">${esc(PD.t('sales.overrideBy', { r: s.override.reason || '' }))}</p>` : ''}${s.cancel ? `<p class="note bad">${esc(PD.t('sales.cancelInfo', { u: s.cancel.by, r: s.cancel.reason }))}</p>` : ''}${lines}<div class="tot" style="margin-top:12px;max-width:340px;margin-left:auto">${row(PD.t('sales.subtotal'), PD.money(t.subtotal))}${t.line_discount ? row(PD.t('sales.lineDisc'), '−' + PD.money(t.line_discount)) : ''}${t.invoice_discount ? row(PD.t('sales.invDiscAmt'), '−' + PD.money(t.invoice_discount)) : ''}${row(PD.t('sales.total'), PD.money(t.total))}${row(PD.t('sales.paid'), PD.money(t.paid))}${row(PD.t('sales.due'), PD.money(t.due), t.due > 0 ? 'warn-t' : '')}</div>`,
      buttons: [{ label: PD.t('common.close') }].concat(s.status === 'completed' ? [{ label: ic('undo') + ' ' + esc(PD.t('sales.makeReturn')), onClick: () => { PD.S.view = 'returns'; PD.S.returnSale = s.id; PD.refreshApp(); } }, { label: ic('x') + ' ' + esc(PD.t('sales.cancel')), cls: 'bad', onClick: async (mm) => { const reason = await PD.ask(PD.t('sales.cancel'), PD.t('sales.cancelWhy'), { required: true }); if (!reason) return false; const [, er] = await U.withApproval('cancel_invoice', PD.t('sales.cancelWhy'), (ap) => PD.try('sales.cancel', ap ? { id, reason, approval: ap } : { id, reason })); if (er) { if (er.code !== 'CANCELLED') U.err(er); return false; } PD.toast(PD.t('sales.cancelled'), 'ok'); PD.renderStatus(); if (onChange) onChange(); } }] : []).concat([{ label: ic('print') + ' ' + esc(PD.t('sales.viewInv')), cls: 'p', main: true, onClick: () => { PD.openInvoice(id, {}); return false; } }]) });
    return m;
  }
})(typeof window !== 'undefined' ? window : globalThis);

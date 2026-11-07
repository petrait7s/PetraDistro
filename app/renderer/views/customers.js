/* Customers: list with due and credit use, detail ledger with aging and open invoices, statement, due list with reminder texts, add/edit. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { $, $$, esc, ic } = PD; const U = PD.ui;
  PD.i18n.pairs({
    'cust.title': ['Customers', 'গ্রাহক'], 'cust.tab.all': ['All customers', 'সব গ্রাহক'], 'cust.tab.due': ['Due list', 'বাকির তালিকা'], 'cust.add': ['Add customer', 'নতুন গ্রাহক'], 'cust.search': ['Search customer', 'গ্রাহক খুঁজুন'],
    'cust.due': ['Due', 'বাকি'], 'cust.limit': ['Limit', 'সীমা'], 'cust.name': ['Shop name', 'দোকানের নাম'], 'cust.owner': ['Owner name', 'মালিকের নাম'], 'cust.phone': ['Phone', 'ফোন'], 'cust.area': ['Area', 'এলাকা'], 'cust.route': ['Route', 'রুট'], 'cust.address': ['Address', 'ঠিকানা'], 'cust.creditLimit': ['Credit limit ৳', 'বাকির সীমা ৳'], 'cust.opening': ['Opening due ৳', 'পুরনো বাকি ৳'],
    'cust.c.last': ['Last payment', 'শেষ আদায়'], 'cust.c.days': ['Days', 'দিন'], 'cust.c.used': ['Limit used', 'সীমা ব্যবহার'], 'cust.hasDue': ['With due only', 'শুধু বাকি আছে'], 'cust.sort': ['Sort', 'সাজান'], 'cust.s.name': ['Name', 'নাম'], 'cust.s.due': ['Highest due', 'বাকি বেশি'], 'cust.s.days': ['Longest unpaid', 'অনেক দিন আদায় নেই'],
    'cust.totalDue': ['Total due in market', 'বাজারে মোট বাকি'], 'cust.saved': ['Customer saved', 'গ্রাহক সেভ হয়েছে'], 'cust.dupPhone': ['This phone number already belongs to another customer.', 'এই ফোন নম্বর অন্য গ্রাহকের।'], 'cust.never': ['Never', 'কখনো না'],
    'cust.ledger': ['Ledger', 'খাতা'], 'cust.aging': ['How old is the due', 'বাকি কত পুরনো'], 'cust.a.0': ['0–7 days', '০–৭ দিন'], 'cust.a.1': ['8–30 days', '৮–৩০ দিন'], 'cust.a.2': ['31–60 days', '৩১–৬০ দিন'], 'cust.a.3': ['60+ days', '৬০+ দিন'], 'cust.open': ['Open invoices', 'খোলা ইনভয়েস'],
    'cust.l.date': ['Date', 'তারিখ'], 'cust.l.ref': ['Reference', 'রেফারেন্স'], 'cust.l.debit': ['Debit', 'বাকি হলো'], 'cust.l.credit': ['Credit', 'জমা'], 'cust.l.bal': ['Balance', 'ব্যালেন্স'], 'cust.statement': ['Statement', 'হিসাবের বিবরণ'], 'cust.receive': ['Receive payment', 'টাকা নিন'], 'cust.newSale': ['New sale', 'নতুন বিক্রি'], 'cust.edit': ['Edit', 'সম্পাদনা'],
    'cust.minDays': ['Unpaid at least (days)', 'কমপক্ষে কত দিন বাকি'], 'cust.overdue': ['{n} days', '{n} দিন'], 'cust.copyMsg': ['Copy message', 'মেসেজ কপি'], 'cust.copied': ['Message copied', 'মেসেজ কপি হয়েছে'], 'cust.msgLang': ['Message language', 'মেসেজের ভাষা'], 'cust.export': ['Export', 'এক্সপোর্ট'],
    'ledger.sale': ['Sale', 'বিক্রি'], 'ledger.payment': ['Payment', 'আদায়'], 'ledger.return': ['Return', 'ফেরত'], 'ledger.opening': ['Opening', 'শুরু'], 'ledger.reversal': ['Reversal', 'বাতিল'], 'ledger.cancel': ['Cancelled', 'বাতিল ইনভয়েস']
  });
  PD.customerForm = function customerForm(c, onSaved) {
    const owner = PD.power(); const v = c || {};
    const m = PD.modal({ title: esc(PD.t(c ? 'cust.edit' : 'cust.add')), titleText: PD.t('cust.add'), size: 'wide',
      body: `<div class="fgrid">${U.field('cf-n', PD.t('cust.name'), `<input class="in" id="cf-n" value="${esc(v.name)}">`)}${U.field('cf-o', PD.t('cust.owner'), `<input class="in" id="cf-o" value="${esc(v.owner)}">`)}${U.field('cf-p', PD.t('cust.phone'), `<input class="in" id="cf-p" inputmode="tel" value="${esc(v.phone)}">`)}${U.field('cf-a', PD.t('cust.area'), `<input class="in" id="cf-a" value="${esc(v.area)}">`)}${U.field('cf-r', PD.t('cust.route'), `<input class="in" id="cf-r" value="${esc(v.route)}">`)}${U.field('cf-ad', PD.t('cust.address'), `<input class="in" id="cf-ad" value="${esc(v.address)}">`)}${owner ? U.field('cf-l', PD.t('cust.creditLimit'), U.moneyIn('cf-l', v.credit_limit)) : ''}${owner && !c ? U.field('cf-od', PD.t('cust.opening'), U.moneyIn('cf-od', null)) : ''}</div>`,
      buttons: [{ label: PD.t('common.cancel') }, { label: PD.t('common.save'), cls: 'p', main: true, onClick: async () => {
        const g = (id) => $('#' + id, m.el).value.trim(); if (!g('cf-n')) { PD.toast(PD.t('common.required') + ': ' + PD.t('cust.name'), 'warn'); return false; }
        const b = { name: g('cf-n'), owner: g('cf-o') || undefined, phone: g('cf-p') || undefined, area: g('cf-a') || undefined, route: g('cf-r') || undefined, address: g('cf-ad') || undefined }; if (c) b.id = c.id;
        if (owner) { const l = U.moneyRead(m.el, 'cf-l'); if (l != null) b.credit_limit = l; if (!c) { const od = U.moneyRead(m.el, 'cf-od'); if (od) b.opening_due = od; } }
        const [d, e] = await PD.try('customers.save', b); if (e) { PD.toast(e.code === 'DUPLICATE' ? PD.t('cust.dupPhone') : PD.errText(e), 'bad'); return false; } PD.toast(PD.t('cust.saved'), 'ok'); if (onSaved) onSaved(d); } }] });
  };

  PD.views.customers = {
    render(el) {
      const owner = PD.power(); let tab = PD.S.custTab || 'all';
      el.innerHTML = `<div class="tabs"><button class="tab ${tab === 'all' ? 'on' : ''}" data-tab="all">${esc(PD.t('cust.tab.all'))}</button>${owner ? `<button class="tab ${tab === 'due' ? 'on' : ''}" data-tab="due">${esc(PD.t('cust.tab.due'))}</button>` : ''}</div><div id="c-body"></div>`;
      $$('[data-tab]', el).forEach((b) => b.addEventListener('click', () => { PD.S.custTab = b.dataset.tab; PD.refreshApp(); }));
      if (tab === 'due' && owner) dueList($('#c-body')); else listTab($('#c-body'));
    }
  };
  function listTab(host) {
    const owner = PD.power(); const f = { q: '', has_due: false, sort: 'name' };
    host.innerHTML = `<div class="row wrap" style="margin-bottom:12px;gap:10px"><input class="in" id="c-q" style="width:240px" placeholder="${esc(PD.t('cust.search'))}"><label class="row small" style="gap:6px"><input type="checkbox" id="c-hd"> ${esc(PD.t('cust.hasDue'))}</label><select class="in" id="c-sort">${U.opts([['name', PD.t('cust.s.name')], ['due', PD.t('cust.s.due')], ['days', PD.t('cust.s.days')]], 'name')}</select><span class="sp"></span><span class="chip" id="c-tot"></span><button class="btn p" id="c-add">${ic('plus')} ${esc(PD.t('cust.add'))}</button>${owner ? `<button class="btn" id="c-exp">${ic('download')} ${esc(PD.t('cust.export'))}</button>` : ''}</div><div id="c-list"></div>`;
    let pg; const go = () => { pg = U.pager($('#c-list'), (cur) => PD.try('customers.list', { q: f.q || undefined, has_due: f.has_due || undefined, sort: f.sort, limit: 50, cursor: cur || undefined }), (rows, d) => draw(rows, d)); };
    $('#c-q').addEventListener('input', U.debounce((e) => { f.q = e.target.value.trim(); go(); })); $('#c-hd').addEventListener('change', (e) => { f.has_due = e.target.checked; go(); }); $('#c-sort').addEventListener('change', (e) => { f.sort = e.target.value; go(); });
    $('#c-add').addEventListener('click', () => PD.customerForm(null, () => go()));
    if (owner) $('#c-exp').addEventListener('click', () => U.exportTable('customers', 'csv'));
    function draw(rows, d) {
      $('#c-tot').textContent = PD.t('cust.totalDue') + ': ' + PD.money(d.total_due); const body = $('#c-list'); const keep = $('[data-more]', body);
      body.innerHTML = U.table([{ label: PD.t('cust.name'), raw: 1, f: (c) => `<b>${esc(c.name)}</b>${c.owner ? `<div class="muted small">${esc(c.owner)}</div>` : ''}` }, { label: PD.t('cust.phone'), f: (c) => PD.digits(c.phone || '') }, { label: PD.t('cust.area'), f: (c) => [c.area, c.route].filter(Boolean).join(' · ') }, { label: PD.t('cust.due'), r: 1, raw: 1, f: (c) => `<b class="${c.due > 0 ? 'bad-t' : ''}">${PD.money(c.due)}</b>` }, { label: PD.t('cust.c.used'), raw: 1, f: (c) => (c.credit_limit ? `<div style="width:90px;height:7px;background:var(--head);border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:${Math.min(100, Math.round((c.limit_used_bp || 0) / 100))}%;background:${(c.limit_used_bp || 0) > 10000 ? 'var(--bad)' : (c.limit_used_bp || 0) > 8000 ? '#d98a00' : 'var(--teal)'}"></i></div>` : '') }, { label: PD.t('cust.c.last'), f: (c) => (c.last_payment_date ? PD.date(c.last_payment_date) + ' (' + PD.digits(c.days_since_payment) + ')' : PD.t('cust.never')) }, { label: '', raw: 1, r: 1, f: (c) => `<button class="btn sm" data-rc="${c.id}">${ic('cash', 14)} ${esc(PD.t('cust.receive'))}</button>` }], rows);
      U.onRow(body, rows, (c) => detail(c, go)); $$('[data-rc]', body).forEach((b) => b.addEventListener('click', () => PD.receiveFor(rows.find((r) => r.id === +b.dataset.rc), go))); if (keep) body.appendChild(keep);
    }
    go();
  }
  async function detail(c, onChange) {
    const owner = PD.power(); const [d, e] = await PD.try('customers.ledger', { customer_id: c.id }); if (e) { U.err(e); return; }
    const ag = d.aging; const buckets = [ag.d0_7, ag.d8_30, ag.d31_60, ag.d60p];
    const kindT = (r) => (PD.i18n.dict.en['ledger.' + r.kind] ? PD.t('ledger.' + r.kind) : r.kind);
    const m = PD.modal({ title: esc(c.name), titleText: c.name, size: 'wide',
      body: `<div class="row wrap" style="gap:8px;margin-bottom:10px">${c.owner ? `<span class="chip">${esc(c.owner)}</span>` : ''}${c.phone ? `<span class="chip">${esc(PD.digits(c.phone))}</span>` : ''}${c.area ? `<span class="chip">${esc(c.area)}</span>` : ''}${c.credit_limit ? `<span class="chip">${esc(PD.t('cust.limit'))}: ${PD.money(c.credit_limit)}</span>` : ''}</div><div class="kpis"><div class="kpi b"><span class="k">${esc(PD.t('cust.due'))}</span><span class="v">${PD.money(d.due)}</span></div>${buckets.map((v, i) => `<div class="kpi ${i > 1 ? 'w' : ''}"><span class="k">${esc(PD.t('cust.a.' + i))}</span><span class="v" style="font-size:18px">${PD.money(v)}</span></div>`).join('')}</div>
        ${d.open_items.length ? `<h4 style="margin:6px 0">${esc(PD.t('cust.open'))}</h4>${U.table([{ label: PD.t('cust.l.ref'), f: (x) => (x.opening ? PD.t('pay.opening') : x.ref) }, { label: PD.t('cust.l.date'), f: (x) => PD.date(x.date) }, { label: PD.t('pay.left'), r: 1, f: (x) => PD.money(x.left) }], d.open_items)}` : ''}
        <h4 style="margin:12px 0 6px">${esc(PD.t('cust.ledger'))}</h4><div style="max-height:260px;overflow:auto">${U.table([{ label: PD.t('cust.l.date'), f: (r) => PD.date(r.date) }, { label: PD.t('cust.l.ref'), f: (r) => kindT(r) + ' ' + (r.ref || '') }, { label: PD.t('cust.l.debit'), r: 1, f: (r) => (r.debit ? PD.money(r.debit) : '') }, { label: PD.t('cust.l.credit'), r: 1, f: (r) => (r.credit ? PD.money(r.credit) : '') }, { label: PD.t('cust.l.bal'), r: 1, f: (r) => PD.money(r.balance) }], d.rows.slice().reverse())}</div>`,
      buttons: [{ label: PD.t('common.close') }].concat(owner ? [{ label: ic('edit') + ' ' + esc(PD.t('cust.edit')), onClick: () => { setTimeout(() => PD.customerForm(c, () => { if (onChange) onChange(); }), 0); } }] : []).concat([{ label: ic('receipt') + ' ' + esc(PD.t('cust.statement')), onClick: () => { const t = U.today(); PD.openStatement(c.id, U.addDays(t, -90), t); return false; } }, { label: ic('cash') + ' ' + esc(PD.t('cust.receive')), cls: 'p', main: true, onClick: () => { setTimeout(() => PD.receiveFor(c, onChange), 0); } }]) });
    return m;
  }
  PD.customerDetail = detail;

  function dueList(host) {
    let minDays = 0; let lang = PD.lang();
    host.innerHTML = `<div class="row wrap" style="margin-bottom:12px;gap:10px"><label class="small muted">${esc(PD.t('cust.minDays'))}</label><input class="in r" id="d-min" style="width:80px" inputmode="numeric" value="0"><label class="small muted">${esc(PD.t('cust.msgLang'))}</label><span class="seg" id="d-lang"><button data-v="bn" class="${lang === 'bn' ? 'on' : ''}">বাংলা</button><button data-v="en" class="${lang === 'en' ? 'on' : ''}">English</button></span></div><div id="d-body"></div>`;
    async function go() {
      const [d, e] = await PD.try('customers.dueList', { min_days: minDays || undefined }); if (e) { U.err(e); return; }
      const b = $('#d-body'); b.innerHTML = d.rows.length ? `<div class="lst">${d.rows.map((r, i) => `<div class="it" style="align-items:flex-start"><div style="min-width:200px"><b>${esc(r.customer.name)}</b><div class="muted small">${esc(r.customer.phone ? PD.digits(r.customer.phone) : '')} · ${esc(PD.t('cust.overdue', { n: PD.digits(r.days_overdue) }))}</div></div><b class="bad-t" style="min-width:110px">${PD.money(r.customer.due)}</b><div class="small muted" style="flex:1">${esc(r.reminder[lang])}</div><button class="btn sm" data-cp="${i}">${ic('copy', 14)} ${esc(PD.t('cust.copyMsg'))}</button></div>`).join('')}</div>` : U.empty();
      $$('[data-cp]', b).forEach((n) => n.addEventListener('click', async () => { try { await navigator.clipboard.writeText(d.rows[+n.dataset.cp].reminder[lang]); } catch (er) { /* clipboard not available */ } PD.toast(PD.t('cust.copied'), 'ok'); }));
    }
    $('#d-min').addEventListener('input', U.debounce((e) => { minDays = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0; go(); })); $$('#d-lang button').forEach((b) => b.addEventListener('click', () => { lang = b.dataset.v; $$('#d-lang button').forEach((x) => x.classList.toggle('on', x === b)); go(); })); go();
  }
})(typeof window !== 'undefined' ? window : globalThis);

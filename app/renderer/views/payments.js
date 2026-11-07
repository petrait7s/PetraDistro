/* Payments: receive money (allocation to oldest invoices / manual / on account, cheque details), history, day book, cheques, company payments. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { $, $$, esc, ic } = PD; const U = PD.ui;
  PD.PAY_METHODS = ['cash', 'bkash', 'nagad', 'bank', 'cheque'];
  PD.i18n.pairs({
    'pay.m.cash': ['Cash', 'নগদ'], 'pay.m.bkash': ['bKash', 'বিকাশ'], 'pay.m.nagad': ['Nagad', 'নগদ (অ্যাপ)'], 'pay.m.bank': ['Bank', 'ব্যাংক'], 'pay.m.cheque': ['Cheque', 'চেক'],
    'pay.tab.receive': ['Receive', 'টাকা নিন'], 'pay.tab.history': ['History', 'ইতিহাস'], 'pay.tab.daybook': ['Day book', 'দিনের খাতা'], 'pay.tab.cheques': ['Cheques', 'চেক'], 'pay.tab.company': ['Pay company', 'কোম্পানিকে দিন'],
    'pay.cust': ['Customer', 'গ্রাহক'], 'pay.due': ['Current due', 'বর্তমান বাকি'], 'pay.amount': ['Amount received', 'প্রাপ্ত টাকা'], 'pay.method': ['Method', 'মাধ্যম'], 'pay.ref': ['bKash/Nagad trx id or bank ref', 'বিকাশ/নগদ ট্রানজ্যাকশন আইডি বা ব্যাংক রেফ'], 'pay.note': ['Note', 'মন্তব্য'], 'pay.date': ['Date', 'তারিখ'],
    'pay.alloc': ['Apply to', 'যেখানে জমা হবে'], 'pay.a.auto': ['Oldest invoices first', 'পুরনো ইনভয়েস আগে'], 'pay.a.manual': ['Choose invoices', 'ইনভয়েস বেছে নিন'], 'pay.a.onacc': ['On account (advance)', 'অগ্রিম (অ্যাকাউন্টে)'],
    'pay.chNo': ['Cheque no.', 'চেক নং'], 'pay.chBank': ['Bank', 'ব্যাংক'], 'pay.chDate': ['Deposit date', 'জমার তারিখ'], 'pay.preview': ['Where it goes', 'কোথায় জমা হবে'], 'pay.dueAfter': ['Due after', 'পরে বাকি'], 'pay.save': ['Save payment', 'আদায় সেভ করুন'], 'pay.saved': ['Receipt {no} saved', 'রসিদ {no} সেভ হয়েছে'],
    'pay.pickCust': ['Choose a customer', 'গ্রাহক বেছে নিন'], 'pay.noOpen': ['No open invoices.', 'কোনো খোলা ইনভয়েস নেই।'], 'pay.opening': ['Opening due', 'পুরনো বাকি'], 'pay.onAccount': ['On account', 'অগ্রিম'], 'pay.left': ['left', 'বাকি'], 'pay.apply': ['Apply', 'জমা'], 'pay.sumMismatch': ['Allocated amount must equal the payment.', 'ভাগ করা টাকা আদায়ের সমান হতে হবে।'],
    'pay.c.no': ['Receipt', 'রসিদ'], 'pay.c.time': ['Time', 'সময়'], 'pay.c.party': ['Party', 'পক্ষ'], 'pay.c.amount': ['Amount', 'টাকা'], 'pay.c.method': ['Method', 'মাধ্যম'], 'pay.c.by': ['By', 'কে'], 'pay.c.status': ['Status', 'অবস্থা'], 'pay.st.active': ['Active', 'চালু'], 'pay.st.reversed': ['Reversed', 'বাতিল'],
    'pay.f.q': ['Receipt, name or reference', 'রসিদ, নাম বা রেফারেন্স'], 'pay.f.type': ['Type', 'ধরন'], 'pay.t.customer': ['Customers', 'গ্রাহক'], 'pay.t.company': ['Companies', 'কোম্পানি'], 'pay.t.all': ['All', 'সব'], 'pay.total': ['Total', 'মোট'],
    'pay.reverse': ['Reverse payment', 'আদায় বাতিল'], 'pay.reverseWhy': ['Reversing puts the amount back on the customer. Give a reason.', 'বাতিল করলে টাকাটা আবার গ্রাহকের বাকিতে ফিরবে। কারণ লিখুন।'], 'pay.reversed': ['Payment reversed', 'আদায় বাতিল হয়েছে'], 'pay.receipt': ['Open receipt', 'রসিদ খুলুন'], 'pay.detail': ['Payment {no}', 'আদায় {no}'], 'pay.revInfo': ['Reversed by {u}: {r}', '{u} বাতিল করেছেন: {r}'],
    'day.title': ['Day book', 'দিনের খাতা'], 'day.byMethod': ['By method', 'মাধ্যম অনুযায়ী'], 'day.byUser': ['By user', 'ব্যবহারকারী অনুযায়ী'], 'day.cash': ['Cash expected in hand', 'হাতে নগদ হওয়ার কথা'], 'day.count': ['{n} receipts', '{n}টি রসিদ'],
    'chq.title': ['Cheques', 'চেক'], 'chq.pending': ['Pending', 'অপেক্ষমাণ'], 'chq.cleared': ['Cleared', 'ক্লিয়ার'], 'chq.bounced': ['Bounced', 'ফেরত'], 'chq.clear': ['Mark cleared', 'ক্লিয়ার করুন'], 'chq.bounce': ['Mark bounced', 'ফেরত দিন'], 'chq.c.no': ['Cheque', 'চেক'], 'chq.c.bank': ['Bank', 'ব্যাংক'], 'chq.c.dep': ['Deposit', 'জমা'], 'chq.bounceWhy': ['A bounced cheque reverses the payment. Add a note.', 'ফেরত চেকে আদায়টি বাতিল হবে। মন্তব্য লিখুন।'],
    'cpay.company': ['Company', 'কোম্পানি'], 'cpay.due': ['We owe', 'আমরা দেবো'], 'cpay.alloc': ['Apply to purchases', 'কোন ক্রয়ে জমা'], 'cpay.saved': ['Company payment {no} saved', 'কোম্পানির পেমেন্ট {no} সেভ হয়েছে'], 'cpay.noPurch': ['No unpaid purchases.', 'কোনো বাকি ক্রয় নেই।']
  });
  const fmtDue = (n) => `<b class="${n > 0 ? 'bad-t' : ''}">${PD.money(n)}</b>`;

  /* ---- shared receive form. host: element, cust: customer row (or null -> picker), onDone(result) ---- */
  PD.paymentForm = function paymentForm(host, cust, onDone) {
    const owner = PD.power(); const st = { cust, method: 'cash', mode: 'auto_oldest', manual: {}, open: [], amount: null };
    host.innerHTML = `<div class="fgrid">${cust ? '' : U.field('pf-c', PD.t('pay.cust'), '<div id="pf-c"></div>', 'full')}<div class="full" id="pf-info"></div>${U.field('pf-amt', PD.t('pay.amount'), U.moneyIn('pf-amt', null))}${U.field('pf-m', PD.t('pay.method'), `<select class="in" id="pf-m">${U.opts(PD.PAY_METHODS.map((m) => [m, PD.t('pay.m.' + m)]), 'cash')}</select>`)}<div class="full" id="pf-x"></div>${owner ? U.field('pf-d', PD.t('pay.date'), `<input type="date" class="in" id="pf-d" value="${U.today()}" max="${U.today()}">`) : ''}${U.field('pf-n', PD.t('pay.note'), '<input class="in" id="pf-n">')}<div class="full">${U.field('pf-al', PD.t('pay.alloc'), `<select class="in" id="pf-al">${U.opts([['auto_oldest', PD.t('pay.a.auto')], ['manual', PD.t('pay.a.manual')]].concat(owner ? [['on_account', PD.t('pay.a.onacc')]] : []), 'auto_oldest')}</select>`)}</div><div class="full" id="pf-man"></div><div class="full" id="pf-prev"></div></div><div class="row" style="margin-top:12px"><span class="sp"></span><button class="btn p" id="pf-save">${ic('check')} ${esc(PD.t('pay.save'))}</button></div>`;
    const amt = () => U.moneyRead(host, 'pf-amt');
    async function loadCust(c) {
      st.cust = c; st.manual = {}; const [d] = await PD.try('customers.ledger', { customer_id: c.id }); st.open = d ? d.open_items : [];
      $('#pf-info', host).innerHTML = `<div class="row wrap" style="gap:8px"><span class="chip"><b>${esc(c.name)}</b></span><span class="chip">${esc(PD.t('pay.due'))}: ${fmtDue(d ? d.due : c.due)}</span></div>`; drawManual(); preview();
    }
    if (cust) loadCust(cust); else { U.custPicker($('#pf-c', host), { keep: true, onPick: (it) => loadCust(it.raw) }); $('#pf-info', host).innerHTML = `<span class="muted small">${esc(PD.t('pay.pickCust'))}</span>`; }
    function extra() {
      const m = st.method; $('#pf-x', host).innerHTML = m === 'cash' ? '' : m === 'cheque' ? `<div class="fgrid">${U.field('pf-cn', PD.t('pay.chNo'), '<input class="in" id="pf-cn">')}${U.field('pf-cb', PD.t('pay.chBank'), '<input class="in" id="pf-cb">')}${U.field('pf-cd', PD.t('pay.chDate'), '<input type="date" class="in" id="pf-cd">')}</div>` : U.field('pf-r', PD.t('pay.ref'), '<input class="in" id="pf-r">');
    }
    $('#pf-m', host).addEventListener('change', (e) => { st.method = e.target.value; extra(); }); extra();
    $('#pf-al', host).addEventListener('change', (e) => { st.mode = e.target.value; drawManual(); preview(); });
    function drawManual() {
      const h = $('#pf-man', host); if (st.mode !== 'manual') { h.innerHTML = ''; return; }
      h.innerHTML = st.open.length ? `<div class="tw"><table class="t"><thead><tr><th>${esc(PD.t('sales.c.no'))}</th><th>${esc(PD.t('sales.c.time'))}</th><th class="r">${esc(PD.t('pay.left'))}</th><th class="r">${esc(PD.t('pay.apply'))}</th></tr></thead><tbody>${st.open.map((it, i) => `<tr><td>${esc(it.opening ? PD.t('pay.opening') : it.ref)}</td><td>${esc(PD.date(it.date))}</td><td class="r">${PD.money(it.left)}</td><td class="r"><input class="in sm r" style="width:90px" data-mi="${i}" inputmode="decimal" value="${st.manual[i] ? U.paisaToTaka(st.manual[i]) : ''}"></td></tr>`).join('')}</tbody></table></div>` : U.empty(PD.t('pay.noOpen'));
      $$('[data-mi]', h).forEach((n) => n.addEventListener('input', () => { const v = U.takaToPaisa(n.value); if (v) st.manual[n.dataset.mi] = v; else delete st.manual[n.dataset.mi]; preview(); }));
    }
    function alloc() {
      if (st.mode === 'manual') return { mode: 'manual', items: Object.keys(st.manual).map((i) => { const it = st.open[i]; return it.opening ? { opening: true, amount: st.manual[i] } : { sale_id: it.sale_id, amount: st.manual[i] }; }) };
      return { mode: st.mode };
    }
    const preview = U.debounce(async () => {
      const a = amt(); const h = $('#pf-prev', host); if (!st.cust || !a) { h.innerHTML = ''; return; }
      const [d, e] = await PD.try('payments.preview', { customer_id: st.cust.id, amount: a, allocation: alloc() });
      if (e) { h.innerHTML = `<p class="note bad">${esc(PD.errText(e))}</p>`; return; }
      h.innerHTML = `<div class="small muted" style="margin-bottom:4px">${esc(PD.t('pay.preview'))}</div><div class="lst">${d.allocations.map((x) => `<div class="it"><span>${esc(x.ref === 'OPENING' ? PD.t('pay.opening') : x.ref === 'ON_ACCOUNT' ? PD.t('pay.onAccount') : x.ref)}</span><span class="sp"></span><b>${PD.money(x.applied)}</b></div>`).join('')}<div class="it"><span>${esc(PD.t('pay.dueAfter'))}</span><span class="sp"></span><b>${PD.money(d.due_after)}</b></div></div>`;
    }, 200);
    $('#pf-amt', host).addEventListener('input', preview);
    $('#pf-save', host).addEventListener('click', (ev) => U.busy(ev.currentTarget, async () => {
      if (!st.cust) { PD.toast(PD.t('pay.pickCust'), 'warn'); return; } const a = amt(); if (!a) { PD.toast(PD.t('common.required') + ': ' + PD.t('pay.amount'), 'warn'); return; }
      const b = { customer_id: st.cust.id, amount: a, method: st.method, allocation: alloc() }; const n = $('#pf-n', host).value.trim(); if (n) b.note = n; const dt = $('#pf-d', host); if (dt && dt.value && dt.value !== U.today()) b.date = dt.value;
      if (st.method === 'cheque') { b.cheque = { no: ($('#pf-cn', host).value || '').trim() }; const cb = $('#pf-cb', host).value.trim(); if (cb) b.cheque.bank = cb; const cd = $('#pf-cd', host).value; if (cd) b.cheque.deposit_date = cd; if (!b.cheque.no) { PD.toast(PD.t('common.required') + ': ' + PD.t('pay.chNo'), 'warn'); return; } } else if (st.method !== 'cash') { const r = ($('#pf-r', host).value || '').trim(); if (r) b.ref = r; }
      if (st.mode === 'manual' && b.allocation.items.reduce((t, x) => t + x.amount, 0) !== a) { PD.toast(PD.t('pay.sumMismatch'), 'warn'); return; }
      const [d, e] = await PD.try('payments.receive', b); if (e) { U.err(e); return; }
      PD.toast(PD.t('pay.saved', { no: d.payment.receipt_no }), 'ok'); PD.renderStatus(); PD.openReceipt(d.payment.id); if (onDone) onDone(d);
    }));
  };
  PD.receiveFor = (cust, onDone) => { const m = PD.modal({ title: ic('cash') + ' ' + esc(PD.t('pay.tab.receive')), titleText: PD.t('pay.tab.receive'), size: 'wide', body: '<div id="rf"></div>', buttons: [{ label: PD.t('common.close') }] }); PD.paymentForm($('#rf', m.el), cust, (d) => { m.close(); if (onDone) onDone(d); }); };

  PD.views.payments = {
    render(el) {
      const owner = PD.power(); const tabs = ['receive', 'history', 'daybook'].concat(owner ? ['cheques', 'company'] : []); let tab = PD.S.payTab && tabs.includes(PD.S.payTab) ? PD.S.payTab : 'receive';
      el.innerHTML = `<div class="tabs">${tabs.map((k) => `<button class="tab ${tab === k ? 'on' : ''}" data-tab="${k}">${esc(PD.t('pay.tab.' + k))}</button>`).join('')}</div><div id="p-body"></div>`;
      $$('[data-tab]', el).forEach((b) => b.addEventListener('click', () => { PD.S.payTab = b.dataset.tab; PD.refreshApp(); }));
      const h = $('#p-body'); ({ receive: receiveTab, history: historyTab, daybook: dayBook, cheques: chequesTab, company: companyTab })[tab](h);
    }
  };
  function receiveTab(h) { h.innerHTML = '<div class="card" style="max-width:760px"><div id="rt"></div></div>'; const draw = () => PD.paymentForm($('#rt', h), null, () => draw()); draw(); }

  function historyTab(h) {
    const owner = PD.power(); const t = U.today(); const f = { from: t, to: t, q: '', type: '', method: '', status: '' };
    h.innerHTML = `<div class="row wrap" style="margin-bottom:12px;gap:10px"><span id="h-range"></span><input class="in" id="h-q" style="width:220px" placeholder="${esc(PD.t('pay.f.q'))}"><select class="in" id="h-m">${U.opts([['', PD.t('ui.all')]].concat(PD.PAY_METHODS.map((m) => [m, PD.t('pay.m.' + m)])), '')}</select>${owner ? `<select class="in" id="h-t">${U.opts([['', PD.t('pay.t.all')], ['customer', PD.t('pay.t.customer')], ['company', PD.t('pay.t.company')]], '')}</select>` : ''}</div><div id="h-sum" class="row wrap" style="gap:8px;margin-bottom:10px"></div><div id="h-body"></div>`;
    let pg; const go = () => { pg = U.pager($('#h-body'), (cur) => PD.try('payments.list', { from: f.from, to: f.to, q: f.q || undefined, method: f.method || undefined, party_type: f.type || undefined, limit: 50, cursor: cur || undefined }), (rows, d) => draw(rows, d)); };
    U.range($('#h-range'), { from: f.from, to: f.to, onChange: (r) => { f.from = r.from; f.to = r.to; go(); } });
    $('#h-q').addEventListener('input', U.debounce((e) => { f.q = e.target.value.trim(); go(); })); $('#h-m').addEventListener('change', (e) => { f.method = e.target.value; go(); }); if (owner) $('#h-t').addEventListener('change', (e) => { f.type = e.target.value; go(); });
    function draw(rows, d) {
      const body = $('#h-body'); const more = $('[data-more]', body);
      $('#h-sum').innerHTML = `<span class="chip"><b>${esc(PD.t('pay.total'))}: ${PD.money(d.totals.grand)}</b></span>` + Object.keys(d.totals.by_method).map((m) => `<span class="chip">${esc(PD.t('pay.m.' + m))}: ${PD.money(d.totals.by_method[m])}</span>`).join('');
      const keep = more; body.innerHTML = U.table([{ label: PD.t('pay.c.no'), f: (r) => r.receipt_no }, { label: PD.t('pay.c.time'), f: (r) => U.dt(r.ts) }, { label: PD.t('pay.c.party'), raw: 1, f: (r) => esc(r.party_name) + (r.party_type === 'company' ? ` <span class="tag">${esc(PD.t('pay.t.company'))}</span>` : '') }, { label: PD.t('pay.c.amount'), r: 1, f: (r) => PD.money(r.amount) }, { label: PD.t('pay.c.method'), f: (r) => PD.t('pay.m.' + r.method) }, { label: PD.t('pay.c.by'), f: (r) => r.created_by }, { label: '', raw: 1, f: (r) => (r.status === 'reversed' ? U.pill('bad', PD.t('pay.st.reversed')) : '') }], rows, { rowCls: (r) => (r.status === 'reversed' ? 'cx' : '') });
      U.onRow(body, rows, (r) => payDetail(r.id, go)); if (keep) body.appendChild(keep);
    }
    go();
  }
  async function payDetail(id, onChange) {
    const [p, e] = await PD.try('payments.get', { id }); if (e) { U.err(e); return; }
    const al = (p.allocations || []).map((a) => `<div class="it"><span>${esc(a.invoice_no || (a.opening ? PD.t('pay.opening') : a.purchase_no || PD.t('pay.onAccount')))}</span><span class="sp"></span><b>${PD.money(a.amount)}</b></div>`).join('');
    PD.modal({ title: esc(PD.t('pay.detail', { no: p.receipt_no })), titleText: p.receipt_no,
      body: `<div class="row wrap" style="gap:8px;margin-bottom:10px"><span class="chip"><b>${esc(p.party_name)}</b></span><span class="chip">${esc(PD.t('pay.m.' + p.method))}</span><span class="chip">${esc(U.dt(p.ts))}</span><span class="chip">${esc(p.created_by)}</span>${p.status === 'reversed' ? U.pill('bad', PD.t('pay.st.reversed')) : ''}</div><div class="kpi n" style="margin-bottom:10px"><span class="k">${esc(PD.t('pay.c.amount'))}</span><span class="v">${PD.money(p.amount)}</span></div>${p.ref ? `<p class="small">${esc(PD.t('sales.ref'))}: <b>${esc(p.ref)}</b></p>` : ''}${p.reversal ? `<p class="note bad">${esc(PD.t('pay.revInfo', { u: p.reversal.by, r: p.reversal.reason }))}</p>` : ''}<div class="lst">${al}</div>`,
      buttons: [{ label: PD.t('common.close') }].concat(PD.S.role === 'owner' && p.status === 'active' ? [{ label: ic('undo') + ' ' + esc(PD.t('pay.reverse')), cls: 'bad', onClick: async () => { const reason = await PD.ask(PD.t('pay.reverse'), PD.t('pay.reverseWhy'), { required: true }); if (!reason) return false; const [, er] = await U.withApproval('reverse_payment', PD.t('pay.reverseWhy'), (ap) => PD.try('payments.reverse', ap ? { id, reason, approval: ap } : { id, reason })); if (er) { if (er.code !== 'CANCELLED') U.err(er); return false; } PD.toast(PD.t('pay.reversed'), 'ok'); PD.renderStatus(); if (onChange) onChange(); } }] : []).concat([{ label: ic('print') + ' ' + esc(PD.t('pay.receipt')), cls: 'p', main: true, onClick: () => { PD.openReceipt(id); return false; } }]) });
  }

  function dayBook(h) {
    let date = U.today();
    h.innerHTML = `<div class="row" style="margin-bottom:12px"><input type="date" class="in" id="db-d" value="${date}" max="${date}"></div><div id="db-b"></div>`;
    async function go() {
      const [d, e] = await PD.try('payments.dayBook', { date }); if (e) { U.err(e); return; }
      const total = d.total; const bm = PD.PAY_METHODS.map((m) => `<div class="kpi ${m === 'cash' ? 'n' : ''}"><span class="k">${esc(PD.t('pay.m.' + m))}</span><span class="v">${PD.money(d.by_method[m] || 0)}</span></div>`).join('');
      $('#db-b').innerHTML = `<div class="kpis">${bm}<div class="kpi"><span class="k">${esc(PD.t('pay.total'))}</span><span class="v">${PD.money(total)}</span></div>${d.cash_in_hand_expected != null ? `<div class="kpi w"><span class="k">${esc(PD.t('day.cash'))}</span><span class="v">${PD.money(d.cash_in_hand_expected)}</span></div>` : ''}</div><div class="card"><h3>${esc(PD.t('day.byUser'))}</h3>${U.table([{ label: PD.t('pay.c.by'), f: (r) => r.user }, { label: PD.t('day.count', { n: '' }).replace(/\s*$/, ''), r: 1, f: (r) => PD.digits(r.count) }, { label: PD.t('pay.c.amount'), r: 1, f: (r) => PD.money(r.amount) }], d.by_user)}</div>`;
    }
    $('#db-d').addEventListener('change', (e) => { date = e.target.value; go(); }); go();
  }

  function chequesTab(h) {
    let status = 'pending';
    h.innerHTML = `<div class="row" style="margin-bottom:12px"><span class="seg" id="ch-s">${['pending', 'cleared', 'bounced'].map((s) => `<button data-v="${s}" class="${s === status ? 'on' : ''}">${esc(PD.t('chq.' + s))}</button>`).join('')}</span></div><div id="ch-b"></div>`;
    async function go() {
      $$('#ch-s button').forEach((b) => b.classList.toggle('on', b.dataset.v === status)); const [d, e] = await PD.try('payments.cheques.list', { status }); if (e) { U.err(e); return; }
      const b = $('#ch-b'); b.innerHTML = U.table([{ label: PD.t('chq.c.no'), f: (r) => r.no }, { label: PD.t('pay.c.party'), f: (r) => r.party_name }, { label: PD.t('chq.c.bank'), f: (r) => r.bank || '' }, { label: PD.t('chq.c.dep'), f: (r) => (r.deposit_date ? PD.date(r.deposit_date) : '') }, { label: PD.t('pay.c.amount'), r: 1, f: (r) => PD.money(r.amount) }, { label: '', raw: 1, r: 1, f: (r) => (r.status === 'pending' ? `<button class="btn sm" data-ok="${r.id}">${esc(PD.t('chq.clear'))}</button> <button class="btn sm bad" data-bad="${r.id}">${esc(PD.t('chq.bounce'))}</button>` : '') }], d.rows);
      $$('[data-ok]', b).forEach((n) => n.addEventListener('click', async () => { const [, er] = await PD.try('payments.cheques.setStatus', { id: +n.dataset.ok, status: 'cleared' }); if (er) U.err(er); else go(); }));
      $$('[data-bad]', b).forEach((n) => n.addEventListener('click', async () => { const note = await PD.ask(PD.t('chq.bounce'), PD.t('chq.bounceWhy'), { required: true }); if (!note) return; const [, er] = await PD.try('payments.cheques.setStatus', { id: +n.dataset.bad, status: 'bounced', note }); if (er) U.err(er); else { PD.renderStatus(); go(); } }));
    }
    $$('#ch-s button').forEach((b) => b.addEventListener('click', () => { status = b.dataset.v; go(); })); go();
  }

  async function companyTab(h) {
    const [cs] = await PD.try('companies.list', {}); const comps = cs ? cs.rows : []; const st = { id: comps[0] && comps[0].id, method: 'cash', items: {} }; let purchases = [];
    h.innerHTML = `<div class="card" style="max-width:760px"><div class="fgrid">${U.field('cp-c', PD.t('cpay.company'), `<select class="in" id="cp-c">${comps.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>`)}<div class="full" id="cp-info"></div>${U.field('cp-a', PD.t('pay.amount'), U.moneyIn('cp-a', null))}${U.field('cp-m', PD.t('pay.method'), `<select class="in" id="cp-m">${U.opts(PD.PAY_METHODS.filter((m) => m !== 'cheque' || true).map((m) => [m, PD.t('pay.m.' + m)]), 'cash')}</select>`)}${U.field('cp-r', PD.t('pay.ref'), '<input class="in" id="cp-r">')}${U.field('cp-n', PD.t('pay.note'), '<input class="in" id="cp-n">')}<div class="full" id="cp-pu"></div></div><div class="row" style="margin-top:12px"><span class="sp"></span><button class="btn p" id="cp-save">${ic('check')} ${esc(PD.t('pay.save'))}</button></div></div>`;
    async function load() {
      st.items = {}; const c = comps.find((x) => x.id === st.id); const [pl] = await PD.try('purchases.list', { company_id: st.id, limit: 100 }); purchases = pl ? pl.rows.filter((p) => p.due > 0) : [];
      $('#cp-info').innerHTML = c ? `<span class="chip">${esc(PD.t('cpay.due'))}: ${fmtDue(c.due != null ? c.due : purchases.reduce((t, p) => t + p.due, 0))}</span>` : '';
      $('#cp-pu').innerHTML = purchases.length ? `<label class="l">${esc(PD.t('cpay.alloc'))}</label><div class="tw"><table class="t"><tbody>${purchases.map((p, i) => `<tr><td>${esc(p.no)}</td><td>${esc(PD.date(p.date))}</td><td class="r">${PD.money(p.due)}</td><td class="r"><input class="in sm r" style="width:90px" data-pi="${i}" inputmode="decimal"></td></tr>`).join('')}</tbody></table></div>` : `<span class="muted small">${esc(PD.t('cpay.noPurch'))}</span>`;
      $$('[data-pi]').forEach((n) => n.addEventListener('input', () => { const v = U.takaToPaisa(n.value); if (v) st.items[n.dataset.pi] = v; else delete st.items[n.dataset.pi]; const sum = Object.values(st.items).reduce((t, x) => t + x, 0); if (sum) $('#cp-a').value = U.paisaToTaka(sum); }));
    }
    $('#cp-c').addEventListener('change', (e) => { st.id = +e.target.value; load(); }); $('#cp-m').addEventListener('change', (e) => { st.method = e.target.value; });
    $('#cp-save').addEventListener('click', (ev) => U.busy(ev.currentTarget, async () => {
      const a = U.moneyRead(h, 'cp-a'); if (!a) { PD.toast(PD.t('common.required') + ': ' + PD.t('pay.amount'), 'warn'); return; }
      const items = Object.keys(st.items).map((i) => ({ purchase_id: purchases[i].id, amount: st.items[i] })); const b = { company_id: st.id, amount: a, method: st.method }; if (items.length) b.allocation = { items }; const r = $('#cp-r').value.trim(); if (r) b.ref = r; const n = $('#cp-n').value.trim(); if (n) b.note = n;
      const [d, e] = await PD.try('payments.payCompany', b); if (e) { U.err(e); return; } PD.toast(PD.t('cpay.saved', { no: d.payment ? d.payment.receipt_no : '' }), 'ok'); PD.renderStatus(); $('#cp-a').value = ''; $('#cp-r').value = ''; $('#cp-n').value = ''; load();
    }));
    if (st.id) load();
  }
})(typeof window !== 'undefined' ? window : globalThis);

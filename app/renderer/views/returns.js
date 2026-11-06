/* Returns: record items coming back against an invoice (reason, where the stock goes, how the customer is credited); owner approves or rejects. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { $, $$, esc, ic } = PD; const U = PD.ui;
  PD.i18n.pairs({
    'ret.tab.new': ['New return', 'নতুন ফেরত'], 'ret.tab.list': ['Returns list', 'ফেরতের তালিকা'], 'ret.invoice': ['Find invoice (number or customer)', 'ইনভয়েস খুঁজুন (নম্বর বা গ্রাহক)'], 'ret.pickInv': ['Choose an invoice to return items from', 'যে ইনভয়েসের মাল ফেরত, সেটি বেছে নিন'],
    'ret.c.item': ['Item', 'পণ্য'], 'ret.c.sold': ['Sold', 'বিক্রি'], 'ret.c.returnable': ['Can return', 'ফেরতযোগ্য'], 'ret.c.qty': ['Return qty', 'ফেরত পরিমাণ'],
    'ret.reason': ['Reason', 'কারণ'], 'ret.r.expired': ['Expired', 'মেয়াদ শেষ'], 'ret.r.damaged': ['Damaged', 'নষ্ট'], 'ret.r.unsold': ['Unsold', 'বিক্রি হয়নি'], 'ret.r.wrong_item': ['Wrong item', 'ভুল পণ্য'], 'ret.r.other': ['Other', 'অন্যান্য'],
    'ret.dest': ['Stock goes to', 'মাল যাবে'], 'ret.d.good': ['Good stock (sellable)', 'ভালো স্টক (বিক্রয়যোগ্য)'], 'ret.d.damaged': ['Damaged (not sellable)', 'নষ্ট (বিক্রয় অযোগ্য)'], 'ret.refund': ['Customer is credited', 'গ্রাহককে জমা'], 'ret.f.ledger': ['Against his due', 'বাকির খাতায়'], 'ret.f.cash': ['Cash back', 'নগদ ফেরত'],
    'ret.note': ['Note', 'মন্তব্য'], 'ret.save': ['Submit return', 'ফেরত জমা দিন'], 'ret.saved': ['Return {no} recorded', 'ফেরত {no} লেখা হয়েছে'], 'ret.pendingInfo': ['The owner must approve before stock and balance change.', 'মালিক অনুমোদন না করা পর্যন্ত স্টক ও হিসাব বদলাবে না।'], 'ret.none': ['Enter a quantity for at least one item.', 'অন্তত একটি পণ্যের পরিমাণ দিন।'],
    'ret.l.no': ['Return', 'ফেরত'], 'ret.l.time': ['Time', 'সময়'], 'ret.l.inv': ['Invoice', 'ইনভয়েস'], 'ret.l.cust': ['Customer', 'গ্রাহক'], 'ret.l.item': ['Item', 'পণ্য'], 'ret.l.qty': ['Qty', 'পরিমাণ'], 'ret.l.value': ['Value', 'মূল্য'], 'ret.l.status': ['Status', 'অবস্থা'],
    'ret.st.pending': ['Pending', 'অপেক্ষমাণ'], 'ret.st.approved': ['Approved', 'অনুমোদিত'], 'ret.st.rejected': ['Rejected', 'বাতিল'], 'ret.approve': ['Approve', 'অনুমোদন'], 'ret.reject': ['Reject', 'বাতিল করুন'], 'ret.rejectWhy': ['Why is it rejected?', 'কেন বাতিল?'], 'ret.approved': ['Return approved', 'ফেরত অনুমোদিত'], 'ret.rejected': ['Return rejected', 'ফেরত বাতিল']
  });
  PD.views.returns = {
    render(el) {
      let tab = PD.S.returnSale ? 'new' : PD.S.retTab || (PD.S.role === 'owner' ? 'list' : 'new');
      el.innerHTML = `<div class="tabs"><button class="tab ${tab === 'new' ? 'on' : ''}" data-tab="new">${esc(PD.t('ret.tab.new'))}</button><button class="tab ${tab === 'list' ? 'on' : ''}" data-tab="list">${esc(PD.t('ret.tab.list'))}</button></div><div id="r-b"></div>`;
      $$('[data-tab]', el).forEach((b) => b.addEventListener('click', () => { PD.S.retTab = b.dataset.tab; PD.S.returnSale = null; PD.refreshApp(); }));
      (tab === 'new' ? newTab : listTab)($('#r-b'));
    }
  };
  async function newTab(h) {
    const st = { sale: null }; h.innerHTML = `<div class="card" style="max-width:900px"><div id="rn-p" style="max-width:420px"></div><div id="rn-b" style="margin-top:12px"></div></div>`;
    U.picker($('#rn-p'), { placeholder: PD.t('ret.invoice'), fetch: async (q) => { const [d] = await PD.try('sales.list', { q, status: 'completed', from: U.addDays(U.today(), -120), to: U.today(), limit: 12 }); return d ? d.rows.map((s) => ({ id: s.id, label: s.invoice_no + ' · ' + s.customer, sub: U.dt(s.ts) + ' · ' + PD.money(s.total) })) : []; }, onPick: (it) => load(it.id) });
    async function load(id) { const [s, e] = await PD.try('sales.get', { id }); if (e) { U.err(e); return; } st.sale = s; draw(); }
    function draw() {
      const s = st.sale; const b = $('#rn-b'); if (!s) { b.innerHTML = `<p class="muted">${esc(PD.t('ret.pickInv'))}</p>`; return; }
      b.innerHTML = `<div class="row wrap" style="gap:8px;margin-bottom:10px"><span class="chip"><b>${esc(s.invoice_no)}</b></span><span class="chip">${esc(s.customer.name)}</span><span class="chip">${esc(U.dt(s.ts))}</span></div>${'<div class="tw"><table class="t"><thead><tr><th>' + esc(PD.t('ret.c.item')) + '</th><th>' + esc(PD.t('ret.c.sold')) + '</th><th>' + esc(PD.t('ret.c.returnable')) + '</th><th>' + esc(PD.t('ret.c.qty')) + '</th></tr></thead><tbody>'}${s.lines.map((l, i) => `<tr><td><b>${esc(l.name)}</b></td><td>${esc(U.qty(l.qty))}</td><td>${esc(U.qty(l.returnable))}</td><td>${l.returnable.base > 0 ? U.qtyHtml('rq' + i, { sell_mode: l.qty.unit === 'g' ? 'by_kg' : 'carton_pcs' }, {}) : '–'}</td></tr>`).join('')}</tbody></table></div>
        <div class="fgrid" style="margin-top:12px">${U.field('rn-r', PD.t('ret.reason'), `<select class="in" id="rn-r">${U.opts(['expired', 'damaged', 'unsold', 'wrong_item', 'other'].map((k) => [k, PD.t('ret.r.' + k)]), 'damaged')}</select>`)}${U.field('rn-d', PD.t('ret.dest'), `<select class="in" id="rn-d">${U.opts([['good', PD.t('ret.d.good')], ['damaged', PD.t('ret.d.damaged')]], 'good')}</select>`)}${U.field('rn-f', PD.t('ret.refund'), `<select class="in" id="rn-f">${U.opts([['ledger', PD.t('ret.f.ledger')], ['cash', PD.t('ret.f.cash')]], 'ledger')}</select>`)}${U.field('rn-n', PD.t('ret.note'), '<input class="in" id="rn-n">')}</div>${PD.S.role === 'manager' ? `<p class="note info" style="margin-top:10px">${esc(PD.t('ret.pendingInfo'))}</p>` : ''}<div class="row" style="margin-top:12px"><span class="sp"></span><button class="btn p" id="rn-save">${ic('check')} ${esc(PD.t('ret.save'))}</button></div>`;
      $('#rn-r').addEventListener('change', (e) => { $('#rn-d').value = e.target.value === 'unsold' || e.target.value === 'wrong_item' ? 'good' : 'damaged'; });
      $('#rn-save').addEventListener('click', (ev) => U.busy(ev.currentTarget, async () => {
        const lines = []; s.lines.forEach((l, i) => { if (l.returnable.base <= 0) return; const q = U.qtyRead(b, 'rq' + i, { sell_mode: l.qty.unit === 'g' ? 'by_kg' : 'carton_pcs' }); if (!U.qtyEmpty(q)) lines.push({ sale_item_id: l.sale_item_id, qty: q }); });
        if (!lines.length) { PD.toast(PD.t('ret.none'), 'warn'); return; } const body = { sale_id: s.id, lines, reason: $('#rn-r').value, destination: $('#rn-d').value, refund: $('#rn-f').value }; const n = $('#rn-n').value.trim(); if (n) body.note = n;
        const [d, e] = await PD.try('returns.create', body); if (e) { U.err(e); return; } PD.toast(PD.t('ret.saved', { no: d.return.no }), 'ok'); PD.S.returnSale = null; PD.S.retTab = 'list'; PD.refreshApp();
      }));
    }
    draw(); if (PD.S.returnSale) { const id = PD.S.returnSale; PD.S.returnSale = null; load(id); }
  }
  function listTab(h) {
    const owner = PD.S.role === 'owner'; const t = U.today(); const f = { from: U.addDays(t, -30), to: t, status: '' };
    h.innerHTML = `<div class="row wrap" style="margin-bottom:12px;gap:10px"><span id="rl-r"></span><select class="in" id="rl-s">${U.opts([['', PD.t('ui.all')], ['pending', PD.t('ret.st.pending')], ['approved', PD.t('ret.st.approved')], ['rejected', PD.t('ret.st.rejected')]], '')}</select></div><div id="rl-b"></div>`;
    const go = () => U.pager($('#rl-b'), (cur) => PD.try('returns.list', { from: f.from, to: f.to, status: f.status || undefined, limit: 60, cursor: cur || undefined }), (rows) => {
      const b = $('#rl-b'); const keep = $('[data-more]', b);
      b.innerHTML = U.table([{ label: PD.t('ret.l.no'), f: (r) => r.no }, { label: PD.t('ret.l.time'), f: (r) => U.dt(r.ts) }, { label: PD.t('ret.l.inv'), f: (r) => r.sale_no }, { label: PD.t('ret.l.cust'), f: (r) => r.customer }, { label: PD.t('ret.l.item'), f: (r) => r.product }, { label: PD.t('ret.l.qty'), f: (r) => U.qty(r.qty) }, { label: PD.t('ret.reason'), f: (r) => PD.t('ret.r.' + r.reason) }, { label: PD.t('ret.l.value'), r: 1, f: (r) => PD.money(r.value) }, { label: PD.t('ret.l.status'), raw: 1, f: (r) => U.pill(r.status === 'approved' ? 'ok' : r.status === 'pending' ? 'low' : 'bad', PD.t('ret.st.' + r.status)) }, { label: '', raw: 1, r: 1, f: (r) => (owner && r.status === 'pending' ? `<button class="btn sm p" data-ok="${r.id}">${esc(PD.t('ret.approve'))}</button> <button class="btn sm bad" data-no="${r.id}">${esc(PD.t('ret.reject'))}</button>` : '') }], rows);
      $$('[data-ok]', b).forEach((n) => n.addEventListener('click', async () => { const [, e] = await PD.try('returns.approve', { id: +n.dataset.ok }); if (e) U.err(e); else { PD.toast(PD.t('ret.approved'), 'ok'); go(); } }));
      $$('[data-no]', b).forEach((n) => n.addEventListener('click', async () => { const reason = await PD.ask(PD.t('ret.reject'), PD.t('ret.rejectWhy'), { required: true }); if (!reason) return; const [, e] = await PD.try('returns.reject', { id: +n.dataset.no, reason }); if (e) U.err(e); else { PD.toast(PD.t('ret.rejected'), 'ok'); go(); } })); if (keep) b.appendChild(keep);
    });
    U.range($('#rl-r'), { from: f.from, to: f.to, onChange: (r) => { f.from = r.from; f.to = r.to; go(); } }); $('#rl-s').addEventListener('change', (e) => { f.status = e.target.value; go(); }); go();
  }
})(typeof window !== 'undefined' ? window : globalThis);

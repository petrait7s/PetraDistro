/* Lots & expiry: every received batch with remaining stock, expiry colouring, grouping by received/expiry month. Manager sees no cost. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { $, $$, esc, ic } = PD; const U = PD.ui;
  PD.i18n.pairs({
    'lots.title': ['Lots & expiry', 'লট ও মেয়াদ'], 'lots.c.product': ['Product', 'পণ্য'], 'lots.c.received': ['Received', 'এসেছে'], 'lots.c.expiry': ['Expiry', 'মেয়াদ'], 'lots.c.days': ['Days left', 'বাকি দিন'], 'lots.c.recQty': ['Received qty', 'আসা পরিমাণ'], 'lots.c.remaining': ['Remaining', 'বাকি আছে'], 'lots.c.cost': ['Unit cost', 'একক খরচ'], 'lots.c.month': ['Month', 'মাস'], 'lots.c.kind': ['Source', 'উৎস'],
    'lots.k.purchase': ['Purchase', 'ক্রয়'], 'lots.k.adjustment': ['Adjustment', 'সমন্বয়'], 'lots.k.opening': ['Opening', 'শুরুর স্টক'], 'lots.k.return': ['Return', 'ফেরত'],
    'lots.group': ['Group by', 'ভাগ করুন'], 'lots.g.none': ['No grouping', 'ভাগ নেই'], 'lots.g.received_month': ['Month received', 'আসার মাস'], 'lots.g.expiry_month': ['Month of expiry', 'মেয়াদের মাস'],
    'lots.near': ['Near expiry', 'মেয়াদ কাছে'], 'lots.n.all': ['All', 'সব'], 'lots.only': ['Only with stock left', 'শুধু যার স্টক আছে'], 'lots.expired': ['Expired', 'মেয়াদ শেষ'], 'lots.noExp': ['No expiry', 'মেয়াদ নেই'], 'lots.days': ['{n} days', '{n} দিন']
  });
  PD.views.lots = {
    render(el) {
      const owner = PD.power(); const f = { product: null, group: '', near: 0, only: true };
      el.innerHTML = `${U.h(PD.t('lots.title'), '')}<div class="row wrap" style="margin-bottom:12px;gap:10px"><div id="lt-p" style="width:260px"></div><label class="small muted">${esc(PD.t('lots.group'))}</label><select class="in" id="lt-g">${U.opts(['', 'received_month', 'expiry_month'].map((g) => [g, PD.t('lots.g.' + (g || 'none'))]), '')}</select><label class="small muted">${esc(PD.t('lots.near'))}</label><select class="in" id="lt-n">${U.opts([[0, PD.t('lots.n.all')], [30, PD.t('lots.days', { n: PD.digits(30) })], [60, PD.t('lots.days', { n: PD.digits(60) })], [90, PD.t('lots.days', { n: PD.digits(90) })]], 0)}</select><label class="row small" style="gap:6px"><input type="checkbox" id="lt-o" checked> ${esc(PD.t('lots.only'))}</label>${owner ? `<span class="sp"></span><button class="btn" id="lt-x">${ic('download')} ${esc(PD.t('inv.export'))}</button>` : ''}</div><div id="lt-g2"></div><div id="lt-b"></div>`;
      const pp = U.prodPicker($('#lt-p'), { keep: true, placeholder: PD.t('prod.search'), onPick: (it) => { f.product = it.id; go(); } }); pp.input.addEventListener('input', () => { if (!pp.input.value) { f.product = null; go(); } });
      $('#lt-g').addEventListener('change', (e) => { f.group = e.target.value; go(); }); $('#lt-n').addEventListener('change', (e) => { f.near = +e.target.value; go(); }); $('#lt-o').addEventListener('change', (e) => { f.only = e.target.checked; go(); }); if (owner) $('#lt-x').addEventListener('click', () => U.exportTable('lots', 'csv'));
      const dayCell = (l) => { if (l.days_to_expiry == null) return `<span class="muted">${esc(PD.t('lots.noExp'))}</span>`; const d = l.days_to_expiry; return d < 0 ? U.pill('out', PD.t('lots.expired')) : U.pill(d <= 30 ? 'low' : 'ok', PD.t('lots.days', { n: PD.digits(d) })); };
      const names = {}; let namesLoaded = false;
      async function loadNames() { if (namesLoaded) return; namesLoaded = true; let cur; for (let i = 0; i < 40; i++) { const [d] = await PD.try('products.list', { limit: 500, cursor: cur }); if (!d) break; (d.rows || []).forEach((p) => { names[p.id] = p.name; }); cur = d.page && d.page.next_cursor; if (!cur) break; } }
      function go() {
        U.pager($('#lt-b'), async (cur) => { await loadNames(); return PD.try('lots.list', { limit: 100, cursor: cur || undefined, product_id: f.product || undefined, group_by: f.group || undefined, near_expiry_days: f.near || undefined, only_remaining: f.only }); }, (rows, d) => {
          $('#lt-g2').innerHTML = d.groups && d.groups.length ? `<div class="cardlist" style="margin-bottom:12px">${d.groups.map((g) => `<div class="kpi"><span class="k">${esc(g.label)}</span><span class="v" style="font-size:17px">${esc(U.qty(g.remaining))}</span><span class="s">${esc(PD.t('lots.c.recQty'))}: ${esc(U.qty(g.received))}</span></div>`).join('')}</div>` : '';
          const body = $('#lt-b'); const keep = $('[data-more]', body);
          body.innerHTML = U.table([{ label: PD.t('lots.c.product'), f: (l) => l.product_name || names[l.product_id] || '' }, { label: PD.t('lots.c.received'), f: (l) => PD.date(l.received_date) }, { label: PD.t('lots.c.expiry'), f: (l) => (l.expiry_date ? PD.date(l.expiry_date) : '') }, { label: PD.t('lots.c.days'), raw: 1, f: dayCell }, { label: PD.t('lots.c.recQty'), r: 1, f: (l) => U.qty(l.received) }, { label: PD.t('lots.c.remaining'), r: 1, f: (l) => U.qty(l.remaining) }, { label: PD.t('lots.c.kind'), f: (l) => PD.t('lots.k.' + (l.kind || (l.purchase_id ? 'purchase' : 'opening'))) }].concat(owner ? [{ label: PD.t('lots.c.cost'), r: 1, f: (l) => PD.money(l.unit_cost) }] : []), rows); if (keep) body.appendChild(keep);
        });
      }
      go();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

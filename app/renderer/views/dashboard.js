/* Dashboard: KPIs for a range, trend chart, stock alerts, red flags, discount breakdown, per-product chart. Manager sees own-day numbers only. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { $, $$, esc, ic } = PD; const U = PD.ui;
  PD.i18n.pairs({
    'dash.title': ['Dashboard', 'ড্যাশবোর্ড'], 'dash.mine': ['Your numbers for the selected days', 'আপনার নিজের হিসাব'],
    'dash.sales': ['Sales', 'বিক্রি'], 'dash.invoices': ['{n} invoices', '{n}টি ইনভয়েস'], 'dash.collected': ['Collected', 'আদায়'], 'dash.newDue': ['New due', 'নতুন বাকি'], 'dash.totalDue': ['Total market due', 'মোট বাকি (বাজারে)'],
    'dash.returns': ['Returns', 'ফেরত'], 'dash.expenses': ['Expenses', 'খরচ'], 'dash.cash': ['Expected cash', 'হাতে নগদ হওয়ার কথা'], 'dash.profit': ['Profit (estimate)', 'লাভ (আনুমানিক)'],
    'dash.discount': ['Discount given', 'ছাড় দেওয়া হয়েছে'], 'dash.discCtn': ['avg {v} per carton', 'কার্টন প্রতি গড় {v}'], 'dash.tea': ['Tea sold (net)', 'চা বিক্রি (নিট)'], 'dash.comm': ['Commission est. {v}', 'কমিশন আনুমানিক {v}'],
    'dash.trend': ['Trend', 'ধারা'], 'dash.alerts': ['Stock alerts', 'স্টক সতর্কতা'], 'dash.low': ['Low stock', 'কম স্টক'], 'dash.out': ['Out of stock', 'স্টক শেষ'], 'dash.expiry': ['Near expiry', 'মেয়াদ শেষ হচ্ছে'], 'dash.days': ['{n} days', '{n} দিন'],
    'dash.flags': ['Red flags', 'সন্দেহজনক ঘটনা'], 'dash.noFlags': ['No red flags in this range.', 'এই সময়ে কোনো সন্দেহজনক ঘটনা নেই।'], 'dash.discBy': ['Discount breakdown', 'ছাড়ের হিসাব'],
    'dash.prodChart': ['Product chart', 'পণ্যের চার্ট'], 'dash.pickProd': ['Pick a product', 'একটি পণ্য বেছে নিন'], 'dash.sold': ['Sold', 'বিক্রি'], 'dash.stockLvl': ['Stock level', 'স্টকের অবস্থা'], 'dash.daysLeft': ['Stock lasts about {n} days at this pace', 'এই গতিতে স্টক চলবে প্রায় {n} দিন'],
    'm.sales': ['Sales', 'বিক্রি'], 'm.collected': ['Collected', 'আদায়'], 'm.due': ['Market due', 'বাজারের বাকি'], 'm.expenses': ['Expenses', 'খরচ'], 'm.discount': ['Discount', 'ছাড়'], 'm.profit': ['Profit', 'লাভ'], 'm.returns': ['Returns', 'ফেরত'],
    'g.product': ['By product', 'পণ্য অনুযায়ী'], 'g.per_carton': ['Per carton', 'কার্টন প্রতি'], 'g.user': ['By user', 'ব্যবহারকারী'], 'g.customer': ['By customer', 'গ্রাহক'], 'g.invoice': ['By invoice', 'ইনভয়েস'],
    'dash.col.what': ['What', 'কী'], 'dash.col.amount': ['Amount', 'টাকা'], 'dash.col.qty': ['Qty', 'পরিমাণ'], 'dash.col.avg': ['Avg / ctn', 'গড় / কার্টন'], 'dash.col.inv': ['Invoices', 'ইনভয়েস'],
    'flag.discount_over_cap': ['Discount over cap', 'সীমার বেশি ছাড়'], 'flag.cancel': ['Cancelled invoice', 'বাতিল ইনভয়েস'], 'flag.return': ['Return', 'ফেরত'], 'flag.load_shortage': ['Load shortage', 'গাড়ির ঘাটতি'], 'flag.cash_difference': ['Cash difference', 'নগদে গরমিল'], 'flag.payment_reverse': ['Payment reversed', 'আদায় বাতিল'], 'flag.bounced_cheque': ['Bounced cheque', 'ফেরত চেক'], 'flag.stock_adjust': ['Stock adjusted', 'স্টক সমন্বয়'], 'flag.count_diff': ['Count difference', 'গণনায় গরমিল'],
    'ui.nothing': ['Nothing to show.', 'দেখানোর কিছু নেই।'], 'ui.selAll': ['Select all', 'সব বাছুন'], 'ui.more': ['Load more', 'আরও দেখুন'], 'ui.today': ['Today', 'আজ'], 'ui.d7': ['7 days', '৭ দিন'], 'ui.month': ['This month', 'এই মাস'], 'ui.all': ['All', 'সব'],
    'prod.search': ['Search product', 'পণ্য খুঁজুন'], 'unit.kg': ['kg', 'কেজি'], 'unit.ctn': ['ctn', 'কার্টন'], 'unit.pcs': ['pcs', 'পিস']
  });

  PD.views.dashboard = {
    async render(el) {
      const owner = PD.power(); const t = U.today(); let rg = { from: owner ? U.monthStart(t) : t, to: t }; let metric = 'sales'; let group = 'product';
      el.innerHTML = `${U.h(PD.t('dash.title'), '<span id="d-range"></span>', owner ? '' : PD.t('dash.mine'))}<div id="d-kpi"></div><div class="cols c2" style="margin-top:14px"><div class="card" id="d-trend"></div><div class="card" id="d-alerts"></div></div>${owner ? '<div class="cols c2" style="margin-top:14px"><div class="card" id="d-flags"></div><div class="card" id="d-disc"></div></div><div class="card" id="d-prod" style="margin-top:14px"></div>' : ''}`;
      U.range($('#d-range'), { from: rg.from, to: rg.to, onChange: (r) => { rg = r; load(); } });
      async function kpis() {
        const [d, e] = await PD.try('dashboard.summary', rg); if (e) { $('#d-kpi').innerHTML = `<div class="note bad">${esc(PD.errText(e))}</div>`; return; }
        const k = (cls, label, v, s) => `<div class="kpi ${cls}"><span class="k">${esc(label)}</span><span class="v">${v}</span>${s ? `<span class="s">${s}</span>` : ''}</div>`;
        const by = Object.keys(d.collected_by_method || {}).map((m) => `${esc(PD.t('pay.m.' + m))} ${PD.money(d.collected_by_method[m])}`).join(' · ');
        $('#d-kpi').innerHTML = `<div class="kpis">${k('', PD.t('dash.sales'), PD.money(d.sales), esc(PD.t('dash.invoices', { n: PD.digits(d.invoices) })))}${k('', PD.t('dash.collected'), PD.money(d.collected), by)}${k('w', PD.t('dash.newDue'), PD.money(d.new_due))}${owner ? k('b', PD.t('dash.totalDue'), PD.money(d.total_due)) : ''}${k('n', PD.t('dash.cash'), PD.money(d.expected_cash))}${k('', PD.t('dash.returns'), PD.money(d.returns_value))}${k('', PD.t('dash.expenses'), PD.money(d.expenses))}${owner ? k('n', PD.t('dash.profit'), PD.money(d.profit)) + k('w', PD.t('dash.discount'), PD.money(d.discount_total), (d.discount_per_carton_avg != null ? esc(PD.t('dash.discCtn', { v: PD.money(d.discount_per_carton_avg) })) : '')) + k('', PD.t('dash.tea'), PD.digits(d.tea_net_kg || '0') + ' ' + PD.t('unit.kg'), d.commission_estimate != null ? esc(PD.t('dash.comm', { v: PD.money(d.commission_estimate) })) : '') : ''}</div>`;
      }
      async function trend() {
        if (!owner) { $('#d-trend').innerHTML = `<h3>${ic('chart')} ${esc(PD.t('nav.sales'))}</h3><p class="muted">${esc(PD.t('dash.mine'))}</p><div class="row wrap" style="gap:8px"><button class="btn" data-go="sales">${ic('cart')} ${esc(PD.t('nav.sales'))}</button><button class="btn" data-go="payments">${ic('cash')} ${esc(PD.t('nav.payments'))}</button><button class="btn" data-go="cash">${ic('receipt')} ${esc(PD.t('nav.cash'))}</button></div>`; $$('[data-go]', $('#d-trend')).forEach((b) => b.addEventListener('click', () => { PD.S.view = b.dataset.go; PD.refreshApp(); })); return; }
        const [d, e] = await PD.try('dashboard.series', { from: rg.from, to: rg.to, metric, bucket: 'day' }); const pts = e ? [] : d.points.map((p) => ({ label: PD.digits(p.date.slice(5).replace('-', '/')), value: p.value }));
        $('#d-trend').innerHTML = `<h3>${ic('chart')} ${esc(PD.t('dash.trend'))}<span class="sp"></span><select class="in sm" id="d-metric">${U.opts(['sales', 'collected', 'due', 'expenses', 'discount', 'profit', 'returns'].map((m) => [m, PD.t('m.' + m)]), metric)}</select></h3>${U.chart(pts, { type: metric === 'due' ? 'line' : 'bar', label: PD.t('m.' + metric), cls: metric === 'due' ? 'b' : '' })}`;
        $('#d-metric').addEventListener('change', (ev) => { metric = ev.target.value; trend(); });
      }
      async function alerts() {
        const [d, e] = await PD.try('dashboard.alerts', { limit: 8 }); const h = $('#d-alerts'); if (e) { h.innerHTML = ''; return; }
        const sec = (label, kind, rows) => rows.length ? `<div class="small muted" style="margin:8px 0 3px">${esc(label)} (${PD.digits(rows.length)})</div><div class="lst">${rows.map((r) => `<div class="it"><span class="sdot" style="background:var(--${kind})"></span><b>${esc(r.name)}</b><span class="sp"></span><span class="muted small">${esc(r.sub)}</span></div>`).join('')}</div>` : '';
        const pr = (r) => ({ name: r.product.name, sub: U.qty(r.product.stock) });
        h.innerHTML = `<h3>${ic('warn')} ${esc(PD.t('dash.alerts'))}</h3>${sec(PD.t('dash.out'), 'bad', d.out.map(pr))}${sec(PD.t('dash.low'), 'warn', d.low.map(pr))}${sec(PD.t('dash.expiry'), 'warn', d.near_expiry.map((r) => ({ name: r.name, sub: PD.t('dash.days', { n: PD.digits(r.days) }) + ' · ' + U.qty(r.remaining) })))}${!d.out.length && !d.low.length && !d.near_expiry.length ? U.empty() : ''}`;
      }
      async function flags() {
        const [d, e] = await PD.try('dashboard.flags', { from: rg.from, to: rg.to, limit: 12 }); const h = $('#d-flags'); if (e) return;
        h.innerHTML = `<h3>${ic('shield')} ${esc(PD.t('dash.flags'))}<span class="sp"></span><button class="btn sm" id="d-flag-all">${esc(PD.t('nav.audit'))}</button></h3>` + (d.rows.length ? `<div class="lst">${d.rows.map((r) => `<div class="it"><span class="sdot" style="background:var(--bad)"></span><div><b>${esc(PD.i18n.dict.en['flag.' + r.kind] ? PD.t('flag.' + r.kind) : r.kind)}</b><div class="muted small">${esc(r.user)} · ${esc(U.dt(r.ts))}</div></div><span class="sp"></span>${r.amount != null ? `<b>${PD.money(r.amount)}</b>` : ''}</div>`).join('')}</div>` : `<p class="muted">${esc(PD.t('dash.noFlags'))}</p>`);
        $('#d-flag-all').addEventListener('click', () => { PD.S.view = 'audit'; PD.refreshApp(); });
      }
      async function disc() {
        const [d, e] = await PD.try('dashboard.discounts', { from: rg.from, to: rg.to, group_by: group }); const h = $('#d-disc'); if (e) return;
        const cols = [{ label: PD.t('dash.col.what'), f: (r) => r.label }, { label: PD.t('dash.col.amount'), r: 1, f: (r) => PD.money(r.amount) }, { label: PD.t('dash.col.inv'), r: 1, f: (r) => PD.digits(r.invoices) }];
        if (group === 'product' || group === 'per_carton') { cols.splice(2, 0, { label: PD.t('dash.col.qty'), r: 1, f: (r) => U.qty(r.qty) }); if (group === 'per_carton') cols.splice(3, 0, { label: PD.t('dash.col.avg'), r: 1, f: (r) => (r.avg_per_carton != null ? PD.money(r.avg_per_carton) : '') }); }
        h.innerHTML = `<h3>${ic('percent')} ${esc(PD.t('dash.discBy'))}<span class="sp"></span><select class="in sm" id="d-grp">${U.opts(['product', 'per_carton', 'user', 'customer', 'invoice'].map((g) => [g, PD.t('g.' + g)]), group)}</select></h3><div style="max-height:260px;overflow:auto">${U.table(cols, d.rows.slice(0, 40), { foot: [PD.t('dash.col.amount'), PD.money(d.total)] })}</div>`;
        $('#d-grp').addEventListener('change', (ev) => { group = ev.target.value; disc(); });
      }
      let pid = null;
      async function prodChart() {
        const h = $('#d-prod'); h.innerHTML = `<h3>${ic('box')} ${esc(PD.t('dash.prodChart'))}</h3><div id="d-pp" style="max-width:360px"></div><div id="d-pc" style="margin-top:10px"></div>`;
        U.prodPicker($('#d-pp'), { placeholder: PD.t('dash.pickProd'), onPick: (it) => { pid = it.id; show(); } }); if (pid) show();
        async function show() {
          const [d, e] = await PD.try('dashboard.productChart', { product_id: pid, from: rg.from, to: rg.to }); if (e) { U.err(e); return; }
          const lab = (x) => PD.digits(x.date.slice(5).replace('-', '/'));
          $('#d-pc').innerHTML = `<div class="cols c3"><div><div class="small muted">${esc(PD.t('dash.sold'))} · ${esc(U.qty(d.stats.total))}</div>${U.chart(d.sold.map((x) => ({ label: lab(x), value: x.qty_base })), { type: 'bar', fmt: (v) => PD.digits(v), h: 130 })}</div><div><div class="small muted">${esc(PD.t('m.profit'))}</div>${U.chart(d.profit.map((x) => ({ label: lab(x), value: x.amount })), { type: 'bar', cls: 'n', h: 130 })}</div><div><div class="small muted">${esc(PD.t('dash.stockLvl'))}</div>${U.chart(d.stock.map((x) => ({ label: lab(x), value: x.qty_base })), { fmt: (v) => PD.digits(v), h: 130, cls: 'w' })}</div></div>${d.stats.days_left != null ? `<p class="note info" style="margin-top:10px">${esc(PD.t('dash.daysLeft', { n: PD.digits(d.stats.days_left) }))}</p>` : ''}`;
        }
      }
      async function load() { await Promise.all([kpis(), trend(), alerts()].concat(owner ? [flags(), disc()] : [])); }
      await load(); if (owner) prodChart();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* Mock handlers: purchases, commission, dashboard, audit, backup, drive, license.reveal. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  PD.mockInstallers = PD.mockInstallers || [];
  PD.mockInstallers.push((m) => {
    const { ok } = PD.mockHelpers; const reg = m.register; const B = PD.biz; const U = PD.mockUtil; const { fail, vfail } = B;
    const X = (C) => B.cx(C.S, C.sess.user, C.now(), { consumeApproval: C.consumeApproval });
    const page = (rows, a) => PD.mockPage(rows, a);
    const needTok = (x, a, scope) => { const r = x.consumeApproval(a.approval, scope); if (!r.ok) fail('NEEDS_OWNER_PIN', 'owner PIN needed', { reason_kind: scope }); return r; };

    /* ---- license ---- */
    reg('license.reveal', async (a, C) => { const x = X(C); needTok(x, a, 'license_reveal'); B.audit(x, 'license.reveal', 'license', null, null, null, a.approval && a.approval.reason, true, 'license_reveal'); return ok({ code: C.S.license.code }); });

    /* ---- purchases ---- */
    const puRow = (D, p) => { const co = D.companies.find((c) => c.id === p.company_id); const paid = p.status === 'cancelled' ? 0 : B.purchaseAllocated(D, p); return { id: p.id, no: p.no, date: p.date, company: co ? co.name : '', lines: p.lines.length, total: p.total, paid, due: p.status === 'cancelled' ? 0 : p.total - paid, status: p.status }; };
    reg('purchases.create', async (a, C) => ok({ purchase: B.createPurchase(X(C), a) }));
    reg('purchases.list', async (a, C) => { const D = C.S.d; const rows = D.purchases.filter((p) => (!a.company_id || p.company_id === a.company_id) && (!a.from || p.date >= a.from) && (!a.to || p.date <= a.to)).sort((p, q) => (p.ts < q.ts ? 1 : -1)).map((p) => puRow(D, p)); const pg = page(rows, a); return ok(pg); });
    reg('purchases.get', async (a, C) => { const D = C.S.d; const x = X(C); const p = D.purchases.find((y) => y.id === a.id); if (!p) fail('NOT_FOUND'); const row = puRow(D, p); return ok({ purchase: Object.assign({}, row, { supplier_invoice: p.supplier_invoice, created_by: p.created_by, lines: p.lines.map((l) => { const pr = B.prod(D, l.product_id); return { product_id: l.product_id, name: l.name, qty: U.qtyObj(pr, l.qty_base), unit_cost: l.unit_cost, amount: l.amount, lot_id: l.lot_id, received_date: l.received_date, expiry_date: l.expiry_date }; }) }) }); });
    reg('purchases.cancel', async (a, C) => {
      const D = C.S.d; const x = X(C); const p = D.purchases.find((y) => y.id === a.id); if (!p) fail('NOT_FOUND'); if (p.status !== 'active') fail('STATE'); if (!a.reason || !a.reason.trim()) vfail('reason', 'required'); needTok(x, a, 'cancel_purchase');
      const lots = p.lines.map((l) => D.lots.find((z) => z.id === l.lot_id)); if (lots.some((l) => l.remaining !== l.received)) fail('STATE', 'some stock of this purchase is already sold');
      lots.forEach((l) => { D.lots.splice(D.lots.indexOf(l), 1); }); p.status = 'cancelled'; D.cl.push({ id: B.nid(D, 'cl'), company_id: p.company_id, date: x.today, ts: x.ts(), kind: 'purchase_cancel', ref: p.no, ref_id: p.id, debit: p.total, credit: 0 }); B.audit(x, 'purchase.cancel', 'purchase', p.id, { total: p.total }, { status: 'cancelled' }, a.reason, true, 'purchase_cancel'); return ok(null);
    });

    /* ---- commission ---- */
    const periodStart = (rule, ref) => { const [y, mo] = ref.split('-').map(Number); if (rule.period === 'year') return y + '-01-01'; if (rule.period === 'quarter') return y + '-' + String(Math.floor((mo - 1) / 3) * 3 + 1).padStart(2, '0') + '-01'; return y + '-' + String(mo).padStart(2, '0') + '-01'; };
    const periodEnd = (rule, start) => { const [y, mo] = start.split('-').map(Number); const n = rule.period === 'year' ? 12 : rule.period === 'quarter' ? 3 : 1; const t = new Date(Date.UTC(y, mo - 1 + n, 0)); return t.toISOString().slice(0, 10); };
    const teaGrams = (D, from, to) => { const by = {}; D.sales.forEach((s) => { if (s.status === 'cancelled' || s.date < from || s.date > to) return; s.lines.forEach((l) => { const p = B.prod(D, l.product_id); if (p.sell_mode === 'by_kg') by[p.id] = (by[p.id] || 0) + l.qty_base; }); }); D.returns.forEach((r) => { if (r.status !== 'approved' || r.date < from || r.date > to) return; r.lines.forEach((l) => { const p = B.prod(D, l.product_id); if (p.sell_mode === 'by_kg') by[p.id] = (by[p.id] || 0) - l.qty_base; }); }); return by; };
    const slabCalc = (rule, grams) => {
      if (rule.type === 'per_kg') { const amt = U.mulDiv(grams, rule.per_kg || 0, 1000); return { bands: [{ from_kg: 0, to_kg: null, rate_per_kg: rule.per_kg || 0, kg_in_band: U.gramsToKg(grams), amount: amt }], amount: amt, next: null }; }
      let total = 0; const bands = []; let next = null;
      (rule.slabs || []).forEach((s) => { const lo = s.from_kg * 1000, hi = s.to_kg == null ? Infinity : s.to_kg * 1000; const g = Math.max(0, Math.min(grams, hi) - lo); const amt = U.mulDiv(g, s.rate_per_kg, 1000); total += amt; bands.push({ from_kg: s.from_kg, to_kg: s.to_kg, rate_per_kg: s.rate_per_kg, kg_in_band: U.gramsToKg(g), amount: amt }); if (grams < lo && next == null) next = lo - grams; if (grams >= lo && grams < hi && s.to_kg != null) next = hi - grams; });
      return { bands, amount: total, next };
    };
    PD.mockSlabCalc = slabCalc;
    const ruleOut = (r) => Object.assign({}, r);
    reg('commission.rules.list', async (a, C) => ok({ rows: C.S.d.rules.map(ruleOut) }));
    reg('commission.rules.save', async (a, C) => {
      const D = C.S.d; const x = X(C); if (!String(a.name || '').trim()) vfail('name', 'required'); if (!['month', 'quarter', 'year'].includes(a.period)) vfail('period', 'enum'); if (!['all_tea', 'group', 'product'].includes(a.scope)) vfail('scope', 'enum'); if (!['per_kg', 'slab'].includes(a.type)) vfail('type', 'enum');
      if (a.type === 'per_kg' && (!U.isInt(a.per_kg) || a.per_kg < 0)) vfail('per_kg', 'int>=0');
      if (a.type === 'slab') { const sl = a.slabs; if (!Array.isArray(sl) || !sl.length) vfail('slabs', 'required'); let prev = 0; sl.forEach((s, i) => { if (!U.isInt(s.from_kg) || s.from_kg !== prev) vfail('slabs.' + i + '.from_kg', 'contiguous'); if (!U.isInt(s.rate_per_kg) || s.rate_per_kg < 0) vfail('slabs.' + i + '.rate_per_kg', 'int>=0'); if (s.to_kg == null) { if (i !== sl.length - 1) vfail('slabs.' + i + '.to_kg', 'only_last_open'); } else { if (!U.isInt(s.to_kg) || s.to_kg <= s.from_kg) vfail('slabs.' + i + '.to_kg', 'gt_from'); prev = s.to_kg; } }); }
      const ex = a.id ? D.rules.find((r) => r.id === a.id) : null; if (a.id && !ex) fail('NOT_FOUND'); const r = ex || { id: B.nid(D, 'rule') };
      Object.assign(r, { company_id: a.company_id || null, name: a.name.trim(), basis: 'net_kg_sold', period: a.period, scope: a.scope, scope_ref: a.scope_ref || null, type: a.type, per_kg: a.type === 'per_kg' ? a.per_kg : null, slabs: a.type === 'slab' ? a.slabs.map((s) => ({ from_kg: s.from_kg, to_kg: s.to_kg == null ? null : s.to_kg, rate_per_kg: s.rate_per_kg })) : [], active: a.active !== false }); if (!ex) D.rules.push(r); B.audit(x, 'commission.rules.save', 'rule', r.id, null, { name: r.name }, null, false); return ok(ruleOut(r));
    });
    reg('commission.status', async (a, C) => {
      const D = C.S.d; const x = X(C); const rule = a.rule_id ? D.rules.find((r) => r.id === a.rule_id) : D.rules.find((r) => r.active); if (!rule) return ok({ net_kg: '0.000', estimate: 0, bands: [], to_next_kg: null, by_product: [], rule: null, period_start: null, period_end: null });
      const start = a.period_start || periodStart(rule, x.today); const end = periodEnd(rule, start); const by = teaGrams(D, start, end); const grams = Object.values(by).reduce((t, g) => t + g, 0); const c = slabCalc(rule, grams);
      return ok({ net_kg: U.gramsToKg(grams), estimate: c.amount, bands: c.bands, to_next_kg: c.next == null ? null : U.gramsToKg(c.next), by_product: Object.entries(by).map(([id, g]) => ({ product_id: +id, name: B.prod(D, +id).name, kg: U.gramsToKg(g) })).sort((p, q) => parseFloat(q.kg) - parseFloat(p.kg)), rule: ruleOut(rule), period_start: start, period_end: end });
    });
    reg('commission.accruals.list', async (a, C) => ok({ rows: C.S.d.accruals.slice().sort((p, q) => (p.period < q.period ? 1 : -1)) }));
    reg('commission.accruals.markReceived', async (a, C) => {
      const D = C.S.d; const x = X(C); const ac = D.accruals.find((y) => y.id === a.id); if (!ac) fail('NOT_FOUND'); if (ac.status === 'received') fail('STATE'); if (!['cash', 'against_company_due'].includes(a.settle)) vfail('settle', 'enum');
      ac.status = 'received'; ac.received_date = a.date || x.today; ac.settle = a.settle; if (a.settle === 'against_company_due') { const co = D.companies[0]; if (co) D.cl.push({ id: B.nid(D, 'cl'), company_id: co.id, date: ac.received_date, ts: x.ts(), kind: 'commission', ref: 'COMM-' + ac.period, ref_id: ac.id, debit: ac.amount, credit: 0 }); }
      B.audit(x, 'commission.received', 'accrual', ac.id, { status: 'due' }, { status: 'received', settle: a.settle }, null, false); return ok(null);
    });

    /* ---- dashboard ---- */
    const inRange = (d, a) => d >= a.from && d <= a.to;
    const completed = (D, a, x) => D.sales.filter((s) => s.status !== 'cancelled' && inRange(s.date, a) && (x.role === 'owner' || s.created_by_id === x.user.id));
    reg('dashboard.summary', async (a, C) => {
      const D = C.S.d; const x = X(C); const mgr = x.role === 'manager'; const sales = completed(D, a, x); const pays = D.payments.filter((p) => p.party_type === 'customer' && p.status === 'active' && inRange(p.date, a) && (!mgr || p.created_by_id === x.user.id)); const by = {}; pays.forEach((p) => { by[p.method] = (by[p.method] || 0) + p.amount; });
      const total = sales.reduce((t, s) => t + s.totals.total, 0); const collected = pays.reduce((t, p) => t + p.amount, 0); const rets = D.returns.filter((r) => r.status === 'approved' && inRange(r.date, a) && (!mgr || r.created_by_id === x.user.id)).reduce((t, r) => t + r.lines.reduce((u, l) => u + l.value, 0), 0); const exps = D.expenses.filter((e) => inRange(e.date, a) && (!mgr || e.created_by_id === x.user.id)).reduce((t, e) => t + e.amount, 0);
      const out = { sales: total, invoices: sales.length, collected, collected_by_method: by, new_due: Math.max(0, total - sales.reduce((t, s) => t + B.saleAllocated(D, s), 0)), total_due: mgr ? 0 : D.customers.reduce((t, c) => t + Math.max(0, B.custDue(D, c.id)), 0), returns_value: rets, expenses: exps, expected_cash: B.cashExpected(x, a.to).expected_cash };
      if (mgr) { delete out.total_due; return ok(out); }
      let discount = 0, cartons = 0, cost = 0; sales.forEach((s) => { discount += s.totals.line_discount + s.totals.invoice_discount; s.lines.forEach((l) => { cost += l.cost; const p = B.prod(D, l.product_id); if (p.sell_mode === 'carton_pcs' && p.pcs_per_carton) cartons += l.qty_base / p.pcs_per_carton; }); });
      out.discount_total = discount; out.discount_per_carton_avg = cartons > 0 ? Math.round(discount / cartons) : 0; out.profit = total - cost - rets - exps;
      const rule = D.rules.find((r) => r.active); const start = rule ? periodStart(rule, a.to) : a.from; const g = Object.values(teaGrams(D, start, rule ? periodEnd(rule, start) : a.to)).reduce((t, v) => t + v, 0); out.tea_net_kg = U.gramsToKg(g); out.commission_estimate = rule ? slabCalc(rule, g).amount : 0; return ok(out);
    });
    reg('dashboard.discounts', async (a, C) => {
      const D = C.S.d; const g = {}; const key = a.group_by;
      D.sales.filter((s) => s.status !== 'cancelled' && inRange(s.date, a)).forEach((s) => { const cu = D.customers.find((c) => c.id === s.customer_id); s.lines.forEach((l) => { const p = B.prod(D, l.product_id); if (!l.disc_amount) return; let k, lab; if (key === 'product' || key === 'per_carton') { k = String(p.id); lab = p.name; } else if (key === 'user') { k = s.created_by; lab = s.created_by; } else if (key === 'customer') { k = String(s.customer_id); lab = cu ? cu.name : ''; } else { k = String(s.id); lab = s.invoice_no; } const r = g[k] = g[k] || { key: k, label: lab, amount: 0, qty_base: 0, product: p, inv: new Set() }; r.amount += l.disc_amount; r.qty_base += l.qty_base; r.inv.add(s.id); }); });
      const rows = Object.values(g).map((r) => { const o = { key: r.key, label: r.label, amount: r.amount, invoices: r.inv.size }; if (key === 'product' || key === 'per_carton') { o.qty = U.qtyObj(r.product, r.qty_base); if (r.product.sell_mode === 'carton_pcs' && r.product.pcs_per_carton) o.avg_per_carton = Math.round(r.amount / (r.qty_base / r.product.pcs_per_carton)); } return o; }).sort((p, q) => q.amount - p.amount); return ok({ rows, total: rows.reduce((t, r) => t + r.amount, 0) });
    });
    const bucketKey = (d, b) => { if (b === 'month') return d.slice(0, 7) + '-01'; if (b === 'week') { const t = new Date(d + 'T00:00:00Z'); const wd = (t.getUTCDay() + 6) % 7; return U.addDays(d, -wd); } return d; };
    reg('dashboard.series', async (a, C) => {
      const D = C.S.d; const pts = {}; const add = (d, v) => { const k = bucketKey(d, a.bucket || 'day'); pts[k] = (pts[k] || 0) + v; }; const met = a.metric; const area = a.area;
      const custOk = (cid) => { const c = D.customers.find((y) => y.id === cid); return (!a.customer_id || cid === a.customer_id) && (!area || (c && c.area === area)); };
      if (['sales', 'discount', 'profit'].includes(met)) D.sales.forEach((s) => { if (s.status === 'cancelled' || !inRange(s.date, a) || !custOk(s.customer_id)) return; s.lines.forEach((l) => { if (a.product_id && l.product_id !== a.product_id) return; if (met === 'sales') add(s.date, l.net); else if (met === 'discount') add(s.date, l.disc_amount); else add(s.date, l.net - l.cost); }); });
      else if (met === 'collected') D.payments.forEach((p) => { if (p.party_type === 'customer' && p.status === 'active' && inRange(p.date, a) && custOk(p.party_id)) add(p.date, p.amount); });
      else if (met === 'expenses') D.expenses.forEach((e) => { if (inRange(e.date, a)) add(e.date, e.amount); });
      else if (met === 'returns') D.returns.forEach((r) => { if (r.status === 'approved' && inRange(r.date, a) && custOk(r.customer_id)) r.lines.forEach((l) => { if (!a.product_id || l.product_id === a.product_id) add(r.date, l.value); }); });
      else if (met === 'due') { let run = 0; const days = []; for (let d = a.from; d <= a.to; d = U.addDays(d, 1)) days.push(d); const before = D.ledger.filter((e) => e.date < a.from && custOk(e.customer_id)).reduce((t, e) => t + e.debit - e.credit, 0); run = before; days.forEach((d) => { run += D.ledger.filter((e) => e.date === d && custOk(e.customer_id)).reduce((t, e) => t + e.debit - e.credit, 0); pts[bucketKey(d, a.bucket || 'day')] = run; }); }
      else vfail('metric', 'enum'); return ok({ points: Object.keys(pts).sort().map((d) => ({ date: d, value: pts[d] })) });
    });
    reg('dashboard.productChart', async (a, C) => {
      const D = C.S.d; const p = B.prod(D, a.product_id); const sold = {}, disc = {}, prof = {}; let total = 0;
      D.sales.forEach((s) => { if (s.status === 'cancelled' || !inRange(s.date, a)) return; s.lines.forEach((l) => { if (l.product_id !== p.id) return; sold[s.date] = (sold[s.date] || 0) + l.qty_base; disc[s.date] = (disc[s.date] || 0) + l.disc_amount; prof[s.date] = (prof[s.date] || 0) + l.net - l.cost; total += l.qty_base; }); });
      const days = []; for (let d = a.from; d <= a.to; d = U.addDays(d, 1)) days.push(d); let stock = B.stockOf(D, p.id); const after = {}; D.sales.forEach((s) => { if (s.status !== 'cancelled' && s.date > a.to) s.lines.forEach((l) => { if (l.product_id === p.id) stock += l.qty_base; }); });
      const st = {}; for (let i = days.length - 1; i >= 0; i--) { st[days[i]] = stock; stock += sold[days[i]] || 0; }
      const n = Math.max(1, days.length); const perDay = Math.round(total / n); const cur = B.stockOf(D, p.id);
      return ok({ sold: days.map((d) => ({ date: d, qty_base: sold[d] || 0 })), discount: days.map((d) => ({ date: d, amount: disc[d] || 0 })), profit: days.map((d) => ({ date: d, amount: prof[d] || 0 })), stock: days.map((d) => ({ date: d, qty_base: st[d] })), stats: { total: U.qtyObj(p, total), per_day: U.qtyObj(p, perDay), days_left: perDay > 0 ? Math.floor(cur / perDay) : null } });
    });
    reg('dashboard.flags', async (a, C) => {
      const D = C.S.d; const rows = D.audit.filter((r) => r.flag && r.ts.slice(0, 10) >= a.from && r.ts.slice(0, 10) <= a.to).slice().reverse().slice(0, a.limit || 100).map((r) => { let amount = null; try { const n = r.new ? JSON.parse(r.new) : null; if (n && typeof n.total === 'number') amount = n.total; else if (n && typeof n.amount === 'number') amount = n.amount; else if (n && typeof n.shortage_value === 'number') amount = n.shortage_value; } catch (e) { /* plain text */ } return { audit_id: r.id, ts: r.ts, kind: r.flag_kind || r.action, user: r.user, title: r.action + (r.entity_id ? ' · ' + r.entity_id : ''), amount }; }); return ok({ rows });
    });
    reg('dashboard.alerts', async (a, C) => {
      const D = C.S.d; const x = X(C); const t30 = B.sold30(D, x.today); const warn = B.setting(x, 'expiry.warn_days', 30); const low = [], out = []; const lim = a.limit || 50;
      D.products.forEach((p) => { const st = B.statusOf(D, p, x.today, warn); if (st === 'out') out.push({ product: B.prodOut(x, p, t30) }); else if (st === 'low') low.push({ product: B.prodOut(x, p, t30) }); });
      const near = []; D.lots.forEach((l) => { if (l.remaining <= 0 || !l.expiry_date) return; const d = B.lotDays(l, x.today); if (d != null && d <= warn) { const p = B.prod(D, l.product_id); near.push({ product_id: p.id, name: p.name, lot_id: l.id, days: d, remaining: U.qtyObj(p, l.remaining) }); } }); near.sort((p, q) => p.days - q.days);
      return ok({ low: low.slice(0, lim), out: out.slice(0, lim), near_expiry: near.slice(0, lim) });
    });

    /* ---- audit ---- */
    reg('audit.list', async (a, C) => {
      const D = C.S.d; const q = (a.q || '').toLowerCase().trim(); const rows = D.audit.filter((r) => (!a.from || r.ts.slice(0, 10) >= a.from) && (!a.to || r.ts.slice(0, 10) <= a.to) && (a.flag == null || r.flag === a.flag) && (!a.user_id || r.user_id === a.user_id) && (!a.action || r.action.startsWith(a.action)) && (!q || (r.action + ' ' + r.entity + ' ' + (r.entity_id || '') + ' ' + (r.reason || '') + ' ' + r.user).toLowerCase().includes(q))).slice().reverse(); return ok(page(rows, a));
    });
    reg('audit.verify', async (a, C) => ok(B.verifyChain(C.S.d)));

    /* ---- backup / drive ---- */
    const drv = (C) => C.S.d.drive;
    const mkBackup = (C, x, reason) => { const D = C.S.d; const id = 'bk-' + (D.backups.reduce((t, b) => Math.max(t, parseInt(String(b.id).replace(/\D/g, ''), 10) || 0), 0) + 1); const b = { id, ts: x.ts(), bytes: 480000 + D.sales.length * 900 + D.audit.length * 120, products: D.products.length, invoices: D.sales.length, verified: true, drive: drv(C).connected ? 'queued' : 'none', reason: reason || null }; D.backups.push(b); if (b.drive === 'queued') drv(C).queued++; return b; };
    reg('backup.list', async (a, C) => ok({ rows: C.S.d.backups.slice().sort((p, q) => (p.ts < q.ts ? 1 : -1)).map((b) => ({ id: b.id, ts: b.ts, bytes: b.bytes, products: b.products, invoices: b.invoices, verified: b.verified, drive: b.drive })) }));
    reg('backup.create', async (a, C) => { const x = X(C); const b = mkBackup(C, x, a.reason); B.audit(x, 'backup.create', 'backup', b.id, null, null, a.reason, false); return ok({ id: b.id }); });
    reg('backup.restore', async (a, C) => { const x = X(C); const b = C.S.d.backups.find((y) => y.id === a.id); if (!b) fail('NOT_FOUND'); needTok(x, a, 'restore_backup'); const safety = mkBackup(C, x, 'before restore'); B.audit(x, 'backup.restore', 'backup', b.id, null, { safety: safety.id }, a.approval && a.approval.reason, true, 'backup_restore'); return ok(null); });
    reg('drive.status', async (a, C) => { const d = drv(C); return ok({ connected: d.connected, account: d.account, online: true, queued: d.queued, last_upload: d.last_upload }); });
    reg('drive.connect', async (a, C) => { const x = X(C); const d = drv(C); d.connected = true; d.account = 'owner@mmtraders.example'; B.audit(x, 'drive.connect', 'drive', null, null, { account: d.account }, null, false); return ok({ connected: true, account: d.account }); });
    reg('drive.disconnect', async (a, C) => { const x = X(C); const d = drv(C); d.connected = false; d.account = null; B.audit(x, 'drive.disconnect', 'drive', null, null, null, null, false); return ok(null); });
    reg('drive.uploadNow', async (a, C) => { const D = C.S.d; const d = drv(C); if (!d.connected) fail('STATE', 'drive not connected'); let n = 0; D.backups.forEach((b) => { if (b.drive === 'queued') { b.drive = 'uploaded'; n++; } }); d.queued = 0; d.last_upload = C.now().toISOString(); return ok({ uploaded: n, queued: 0 }); });
  });
})(typeof window !== 'undefined' ? window : globalThis);

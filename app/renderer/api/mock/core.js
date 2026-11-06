/* Mock business core: the same rules the real backend implements (contract section 4). Pure functions over S.d. Handlers call these. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const U = PD.mockUtil; const { mulDiv, rdiv, toBase, unitBase, qtyObj, dateOf, addDays, daysBetween } = U;
  class Fail extends Error { constructor(code, message, details) { super(message || code); this.code = code; this.details = details; } }
  PD.Fail = Fail;
  const fail = (code, message, details) => { throw new Fail(code, message, details); };
  const vfail = (path, rule, message) => fail('VALIDATION', 'bad input', { fields: [{ path, rule, message: message || rule }] });
  const isInt = U.isInt;
  const pad = (n, w) => String(n).padStart(w, '0');

  function newData() {
    return { companies: [], products: [], lots: [], customers: [], employees: [], sales: [], payments: [], returns: [], purchases: [], expenses: [], cheques: [], ledger: [], cl: [], audit: [], counts: [], loads: {}, closes: [], rules: [], accruals: [], backups: [], imports: {}, drive: { connected: false, account: null, queued: 0, last_upload: null }, salaryPaid: {}, advances: [], seq: {} };
  }
  const nid = (D, k) => (D.seq[k] = (D.seq[k] || 0) + 1);

  /* context: who is acting, and what day/time it is */
  function cx(S, user, now, extra) { const d = now instanceof Date ? now : new Date(now); return Object.assign({ S, D: S.d, user: user || { id: 1, name: 'Owner', role: 'owner' }, role: (user && user.role) || 'owner', now: d, today: dateOf(d), ts: () => d.toISOString() }, extra || {}); }
  PD.bizCx = cx;
  const setting = (c, k, def) => (k in c.S.settings ? c.S.settings[k] : def);

  /* ---------- audit (append-only hash chain) ---------- */
  function audit(c, action, entity, entityId, oldV, newV, reason, flag, flagKind) {
    const D = c.D; const prev = D.audit.length ? D.audit[D.audit.length - 1].hash : '0'.repeat(64);
    const row = { id: nid(D, 'audit'), ts: c.ts(), user_id: c.user.id, user: c.user.name, role: c.role, action, entity, entity_id: entityId == null ? null : String(entityId), old: oldV == null ? null : typeof oldV === 'string' ? oldV : JSON.stringify(oldV), new: newV == null ? null : typeof newV === 'string' ? newV : JSON.stringify(newV), reason: reason || null, flag: !!flag, flag_kind: flag ? flagKind || null : null, prev_hash: prev };
    row.hash = U.sha256(prev + JSON.stringify({ id: row.id, ts: row.ts, user_id: row.user_id, action, entity, entity_id: row.entity_id, old: row.old, new: row.new, reason: row.reason }));
    D.audit.push(row); return row;
  }
  function verifyChain(D) { let prev = '0'.repeat(64); for (const r of D.audit) { const h = U.sha256(prev + JSON.stringify({ id: r.id, ts: r.ts, user_id: r.user_id, action: r.action, entity: r.entity, entity_id: r.entity_id, old: r.old, new: r.new, reason: r.reason })); if (r.prev_hash !== prev || r.hash !== h) return { ok: false, checked: D.audit.length, broken_at: r.id }; prev = r.hash; } return { ok: true, checked: D.audit.length }; }

  /* ---------- lots ---------- */
  const lotsOf = (D, pid) => D.lots.filter((l) => l.product_id === pid);
  const stockOf = (D, pid) => lotsOf(D, pid).reduce((s, l) => s + l.remaining, 0);
  const prod = (D, id) => { const p = D.products.find((x) => x.id === id); if (!p) fail('NOT_FOUND', 'product'); return p; };
  const lotDays = (l, today) => (l.expiry_date ? daysBetween(today, l.expiry_date) : null);
  function pickable(D, pid, today) { return lotsOf(D, pid).filter((l) => l.remaining > 0 && (!l.expiry_date || l.expiry_date >= today)).sort((a, b) => { if (!!a.expiry_date !== !!b.expiry_date) return a.expiry_date ? -1 : 1; if (a.expiry_date && a.expiry_date !== b.expiry_date) return a.expiry_date < b.expiry_date ? -1 : 1; return a.received_date < b.received_date ? -1 : a.received_date > b.received_date ? 1 : a.id - b.id; }); }
  /* FEFO then FIFO. reserved: Map lotId -> qty already planned */
  function pick(D, pid, need, today, reserved) {
    const picks = []; let left = need;
    for (const l of pickable(D, pid, today)) { if (left <= 0) break; const avail = l.remaining - ((reserved && reserved.get(l.id)) || 0); if (avail <= 0) continue; const q = Math.min(avail, left); picks.push({ lot: l, qty: q }); left -= q; }
    const expiredAvail = left > 0 ? lotsOf(D, pid).filter((l) => l.expiry_date && l.expiry_date < today).reduce((s, l) => s + l.remaining, 0) : 0;
    return { picks, short: left, expiredOnly: left > 0 && picks.length === 0 && expiredAvail > 0 };
  }
  const lotCost = (p, qty, unitCost) => mulDiv(qty, unitCost, unitBase(p));

  /* ---------- products ---------- */
  function minStockBase(p) { return p.min_stock_base || 0; }
  function statusOf(D, p, today, warnDays) {
    const st = stockOf(D, p.id); if (st <= 0) return 'out'; if (st <= minStockBase(p)) return 'low';
    const near = lotsOf(D, p.id).some((l) => l.remaining > 0 && l.expiry_date && daysBetween(today, l.expiry_date) <= warnDays);
    return near ? 'near_expiry' : 'ok';
  }
  function sold30(D, today) { const m = new Map(); for (const s of D.sales) { if (s.status === 'cancelled') continue; const age = daysBetween(s.date, today); if (age < 0 || age > 29) continue; for (const l of s.lines) { let a = m.get(l.product_id); if (!a) { a = Array(30).fill(0); m.set(l.product_id, a); } a[29 - age] += l.qty_base; } } return m; }
  function prodOut(c, p, t30) {
    const D = c.D; const own = c.role === 'owner'; const warn = setting(c, 'expiry.warn_days', 30); const ls = lotsOf(D, p.id).filter((l) => l.remaining > 0);
    const exp = ls.filter((l) => l.expiry_date).map((l) => l.expiry_date).sort()[0] || null; const comp = D.companies.find((x) => x.id === p.company_id);
    const o = { id: p.id, sku: p.sku, company_id: p.company_id || null, company_name: comp ? comp.name : null, name: p.name, original_name: p.original_name || null, sell_mode: p.sell_mode, pcs_per_carton: p.pcs_per_carton || null, pcs_per_dozen: p.pcs_per_dozen || null, grams_per_carton: p.grams_per_carton || null, list_price: p.list_price, max_discount: { per_unit: p.max_per_unit, percent_bp: p.max_percent_bp || null }, min_stock: qtyObj(p, p.min_stock_base || 0), stock: qtyObj(p, stockOf(D, p.id)), status: statusOf(D, p, c.today, warn), next_expiry: exp, trend30: (t30 && t30.get(p.id)) || Array(30).fill(0), assumed: { pcs_per_carton: !!p.assumed_ppc, cost_price: !!p.assumed_cost }, active: !p.archived };
    if (own) { o.cost_price = p.cost_price; o.margin_bp = p.list_price ? rdiv((p.list_price - p.cost_price) * 10000, p.list_price) : 0; o.min_sell_price = p.min_sell_price || null; o.stock_value = ls.reduce((s, l) => s + lotCost(p, l.remaining, l.unit_cost), 0); }
    return o;
  }
  function lotOut(c, l) {
    const p = prod(c.D, l.product_id); const o = { id: l.id, product_id: l.product_id, product_name: p.name, purchase_id: l.purchase_id || null, received_date: l.received_date, expiry_date: l.expiry_date || null, received: qtyObj(p, l.received), remaining: qtyObj(p, l.remaining), days_to_expiry: lotDays(l, c.today), kind: l.kind || 'purchase' };
    if (c.role === 'owner') o.unit_cost = l.unit_cost; return o;
  }

  /* ---------- customers / ledger ---------- */
  const cust = (D, id) => { const x = D.customers.find((y) => y.id === id); if (!x) fail('NOT_FOUND', 'customer'); return x; };
  const custDue = (D, cid) => D.ledger.reduce((s, e) => (e.customer_id === cid ? s + e.debit - e.credit : s), 0);
  function ledgerAdd(c, cid, kind, ref, refId, debit, credit, date) { const e = { id: nid(c.D, 'ledger'), customer_id: cid, date: date || c.today, ts: c.ts(), kind, ref, ref_id: refId == null ? null : refId, debit: debit || 0, credit: credit || 0 }; c.D.ledger.push(e); return e; }
  function ledgerRows(D, cid, from, to) {
    let bal = 0; const out = []; const all = D.ledger.filter((e) => e.customer_id === cid).sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : a.id - b.id));
    for (const e of all) { bal += e.debit - e.credit; if ((from && e.date < from) || (to && e.date > to)) continue; out.push({ date: e.date, ts: e.ts, kind: e.kind, ref: e.ref, ref_id: e.ref_id, debit: e.debit, credit: e.credit, balance: bal }); }
    return out;
  }
  function saleReturned(D, s) { return D.returns.filter((r) => r.sale_id === s.id && r.status === 'approved').reduce((t, r) => t + r.value, 0); }
  function saleAllocated(D, s) { let t = 0; for (const p of D.payments) { if (p.status !== 'active' || p.party_type !== 'customer') continue; for (const a of p.allocations) if (a.sale_id === s.id) t += a.amount; } return t; }
  const saleLeft = (D, s) => (s.status === 'cancelled' ? 0 : Math.max(0, s.totals.total - saleReturned(D, s) - saleAllocated(D, s)));
  function openingLeft(D, cid) { const op = D.ledger.filter((e) => e.customer_id === cid && e.kind === 'opening').reduce((t, e) => t + e.debit - e.credit, 0); let alloc = 0; for (const p of D.payments) { if (p.status !== 'active' || p.party_type !== 'customer' || p.party_id !== cid) continue; for (const a of p.allocations) if (a.opening) alloc += a.amount; } return Math.max(0, op - alloc); }
  function openItems(D, cid) {
    const items = []; const o = openingLeft(D, cid); const od = D.ledger.find((e) => e.customer_id === cid && e.kind === 'opening');
    if (o > 0) items.push({ ref: 'OPENING', opening: true, date: od ? od.date : '1970-01-01', sale_id: null, left: o, ts: od ? od.ts : '' });
    D.sales.filter((s) => s.customer_id === cid).sort((a, b) => (a.ts < b.ts ? -1 : 1)).forEach((s) => { const l = saleLeft(D, s); if (l > 0) items.push({ ref: s.invoice_no, opening: false, date: s.date, sale_id: s.id, left: l, ts: s.ts }); });
    return items;
  }
  function aging(c, cid) {
    const b = { d0_7: 0, d8_30: 0, d31_60: 0, d60p: 0 };
    for (const it of openItems(c.D, cid)) { const age = daysBetween(it.date, c.today); const k = age <= 7 ? 'd0_7' : age <= 30 ? 'd8_30' : age <= 60 ? 'd31_60' : 'd60p'; b[k] += it.left; }
    return b;
  }
  function custRow(c, x) {
    const due = custDue(c.D, x.id); const pays = c.D.payments.filter((p) => p.party_type === 'customer' && p.party_id === x.id && p.status === 'active').sort((a, b) => (a.ts < b.ts ? 1 : -1));
    const last = pays[0] ? pays[0].date : null; return { id: x.id, name: x.name, owner: x.owner || null, phone: x.phone || null, area: x.area || null, route: x.route || null, credit_limit: x.credit_limit || null, due, last_payment_date: last, days_since_payment: last ? daysBetween(last, c.today) : null, limit_used_bp: x.credit_limit ? Math.max(0, rdiv(due * 10000, x.credit_limit)) : null };
  }

  /* ---------- sales: preview / create ---------- */
  function discAmount(type, value, gross, base, ub) {
    if (type === 'none') return 0; if (!isInt(value) || value < 0) vfail('discount.value', 'int>=0');
    if (type === 'per_unit') return mulDiv(value, base, ub); if (type === 'percent') return mulDiv(gross, value, 10000); if (type === 'line') return value; return vfail('discount.type', 'enum');
  }
  function planSale(c, input) {
    const D = c.D; const customer = cust(D, input.customer_id);
    if (!Array.isArray(input.lines) || !input.lines.length) vfail('lines', 'required');
    const reserved = new Map(); const lines = []; const stockErr = []; let expired = false;
    input.lines.forEach((li, idx) => {
      const p = prod(D, li.product_id); if (p.archived) vfail('lines.' + idx + '.product_id', 'archived');
      const base = toBase(p, li.qty); if (base == null) vfail('lines.' + idx + '.qty', 'qty'); if (base <= 0) vfail('lines.' + idx + '.qty', 'positive');
      const ub = unitBase(p); const gross = mulDiv(base, p.list_price, ub); const d = li.discount || { type: 'none', value: 0 };
      const amount = discAmount(d.type, d.value || 0, gross, base, ub); if (amount > gross) fail('DISCOUNT_LIMIT', 'discount exceeds line total', { line: idx });
      const per = mulDiv(amount, ub, base); let allowed = p.max_per_unit || 0; if (p.max_percent_bp) allowed = Math.min(allowed, mulDiv(p.list_price, p.max_percent_bp, 10000));
      const net = gross - amount; const over = amount > 0 && per > allowed; const below = !!p.min_sell_price && mulDiv(net, ub, base) < p.min_sell_price;
      const pk = pick(D, p.id, base, c.today, reserved);
      if (pk.short > 0) { stockErr.push({ index: idx, product_id: p.id, requested: qtyObj(p, base), available: qtyObj(p, base - pk.short) }); if (pk.expiredOnly) expired = true; }
      pk.picks.forEach((x) => reserved.set(x.lot.id, (reserved.get(x.lot.id) || 0) + x.qty));
      const cost = pk.picks.reduce((t, x) => t + lotCost(p, x.qty, x.lot.unit_cost), 0);
      lines.push({ line_no: idx + 1, p, product_id: p.id, name: p.name, base, list_price: p.list_price, gross, disc: { type: d.type || 'none', input: d.value || 0, amount, per_unit: per }, net, over_cap: over, allowed_per_unit: allowed, below_min: below, picks: pk.picks.map((x) => ({ lot_id: x.lot.id, qty: x.qty })), lotObjs: pk.picks, cost });
    });
    if (stockErr.length) fail('STOCK', 'not enough stock', { lines: stockErr, expired });
    const subtotal = lines.reduce((t, l) => t + l.gross, 0); const lineDisc = lines.reduce((t, l) => t + l.disc.amount, 0); const afterLine = subtotal - lineDisc;
    const idisc = input.invoice_discount || { type: 'none', value: 0 }; let invDisc = 0;
    if (idisc.type === 'percent') invDisc = mulDiv(afterLine, idisc.value || 0, 10000); else if (idisc.type === 'amount') invDisc = idisc.value || 0; else if (idisc.type !== 'none') vfail('invoice_discount.type', 'enum');
    if (!isInt(invDisc) || invDisc < 0) vfail('invoice_discount.value', 'int>=0'); if (invDisc > afterLine) fail('DISCOUNT_LIMIT', 'invoice discount exceeds total');
    const total = afterLine - invDisc; const paid = input.pay_now || (input.payment && input.payment.amount) || 0;
    if (!isInt(paid) || paid < 0) vfail('pay_now', 'int>=0'); if (paid > total) vfail('pay_now', 'max_total', 'payment is more than the invoice total');
    const before = custDue(D, customer.id); const after = before + total - paid; const limit = customer.credit_limit || 0; const mode = setting(c, 'credit.mode', 'warn');
    const creditState = limit && after > limit ? (mode === 'block' ? 'blocked' : 'warn') : 'ok';
    const overLines = lines.filter((l) => l.over_cap || l.below_min).map((l) => l.line_no);
    const needsPin = c.role === 'manager' && (overLines.length > 0 || creditState === 'blocked');
    const reason = overLines.length ? (lines.some((l) => l.below_min) ? 'below_min_price' : 'discount_over_cap') : creditState === 'blocked' ? 'credit_limit' : null;
    return { customer, lines, idisc, totals: { subtotal, line_discount: lineDisc, invoice_discount: invDisc, total, paid, due: total - paid, customer_due_before: before, customer_due_after: after, credit_state: creditState, over_cap_lines: overLines, needs_owner_pin: needsPin }, needsPin, reason, overLines };
  }
  function lineOut(c, l) {
    const p = l.p || prod(c.D, l.product_id); const o = { line_no: l.line_no, sale_item_id: l.sale_item_id || null, product_id: l.product_id, name: l.name, qty: qtyObj(p, l.base != null ? l.base : l.qty_base), list_price: l.list_price, gross: l.gross, discount: { type: l.disc ? l.disc.type : l.disc_type, input: l.disc ? l.disc.input : l.disc_input, amount: l.disc ? l.disc.amount : l.disc_amount, per_unit: l.disc ? l.disc.per_unit : l.per_unit }, net: l.net, over_cap: !!l.over_cap, allowed_per_unit: l.allowed_per_unit, below_min_price: !!(l.below_min), lots: (l.picks || []).map((x) => { const lot = c.D.lots.find((z) => z.id === x.lot_id); return { lot_id: x.lot_id, received_date: lot.received_date, expiry_date: lot.expiry_date || null, qty: qtyObj(p, x.qty) }; }) };
    if (c.role === 'owner') { o.cost = l.cost; o.profit = l.net - l.cost; } return o;
  }
  function previewOut(c, plan) { return { lines: plan.lines.map((l) => lineOut(c, l)), totals: plan.totals }; }

  function saleOut(c, s) {
    const D = c.D; const cu = D.customers.find((x) => x.id === s.customer_id); const paid = s.status === 'cancelled' ? 0 : saleAllocated(D, s); const ret = saleReturned(D, s);
    const lines = s.lines.map((l) => { const o = lineOut(c, Object.assign({}, l, { base: l.qty_base })); o.sale_item_id = l.sale_item_id; const rq = D.returns.filter((r) => r.sale_id === s.id && r.status !== 'rejected').reduce((t, r) => t + r.lines.filter((x) => x.sale_item_id === l.sale_item_id).reduce((u, x) => u + x.qty_base, 0), 0); const p = prod(D, l.product_id); o.returned = qtyObj(p, rq); o.returnable = qtyObj(p, l.qty_base - rq); return o; });
    const t = Object.assign({}, s.totals, { paid, due: s.status === 'cancelled' ? 0 : Math.max(0, s.totals.total - ret - paid), returned: ret });
    const o = { id: s.id, invoice_no: s.invoice_no, date: s.date, ts: s.ts, customer: { id: s.customer_id, name: cu ? cu.name : '' }, status: s.status, lines, totals: t, created_by: s.created_by, salesman: s.salesman || null, override: s.override || null, cancel: s.cancel || null, print_count: s.print_count || 0, invoice_discount: s.inv_disc };
    if (c.role === 'owner') { o.cost_total = s.lines.reduce((x, l) => x + l.cost, 0); }
    return o;
  }

  function createSale(c, input) {
    const D = c.D; const plan = planSale(c, input); const approvalInfo = { used: null };
    if (plan.needsPin) { const a = c.consumeApproval(input.approval, 'discount_override'); if (!a.ok) fail('NEEDS_OWNER_PIN', 'owner approval needed', { reason_kind: plan.reason, lines: plan.overLines }); approvalInfo.used = a; }
    let date = c.today; if (input.date && input.date !== c.today) { if (c.role !== 'owner') vfail('date', 'today_only'); if (input.date > c.today) vfail('date', 'future'); date = input.date; }
    const id = nid(D, 'sale'); const no = 'INV-' + pad(id, 6); const ts = c.ts(); const s = { id, invoice_no: no, date, ts, customer_id: plan.customer.id, status: 'completed', lines: [], inv_disc: { type: plan.idisc.type, value: plan.idisc.value || 0, amount: plan.totals.invoice_discount }, totals: { subtotal: plan.totals.subtotal, line_discount: plan.totals.line_discount, invoice_discount: plan.totals.invoice_discount, total: plan.totals.total, credit_state: plan.totals.credit_state, customer_due_before: plan.totals.customer_due_before }, created_by: c.user.name, created_by_id: c.user.id, salesman_id: input.salesman_id || null, salesman: null, override: null, cancel: null, print_count: 0 };
    if (input.salesman_id) { const e = D.employees.find((x) => x.id === input.salesman_id); if (e) s.salesman = e.name; }
    plan.lines.forEach((l) => { l.picks.forEach((x) => { const lot = D.lots.find((z) => z.id === x.lot_id); lot.remaining -= x.qty; }); s.lines.push({ sale_item_id: nid(D, 'sale_item'), line_no: l.line_no, product_id: l.product_id, name: l.name, qty_base: l.base, list_price: l.list_price, gross: l.gross, disc_type: l.disc.type, disc_input: l.disc.input, disc_amount: l.disc.amount, per_unit: l.disc.per_unit, net: l.net, over_cap: l.over_cap, allowed_per_unit: l.allowed_per_unit, below_min: l.below_min, picks: l.picks, cost: l.cost }); });
    D.sales.push(s); ledgerAdd(c, s.customer_id, 'sale', no, id, plan.totals.total, 0, date);
    if (approvalInfo.used) { s.override = { approved_by: approvalInfo.used.by, reason: approvalInfo.used.reason || '' }; audit(c, 'sale.override', 'sale', id, { allowed: plan.lines.map((l) => l.allowed_per_unit) }, { per_unit: plan.lines.map((l) => l.disc.per_unit) }, approvalInfo.used.reason, true, plan.reason); }
    audit(c, 'sale.create', 'sale', id, null, { no, total: s.totals.total }, null, false);
    let payment = null; const pay = input.payment;
    if (pay && pay.amount > 0) payment = receivePayment(c, { customer_id: s.customer_id, amount: pay.amount, method: pay.method, ref: pay.ref, date, allocation: { mode: 'manual', items: [{ sale_id: id, amount: pay.amount }] } }, true).payment;
    return { sale: saleOut(c, s), payment };
  }

  /* ---------- payments ---------- */
  const METHODS = ['cash', 'bkash', 'nagad', 'bank', 'cheque'];
  function allocPlan(c, cid, amount, alloc) {
    const items = openItems(c.D, cid); const mode = (alloc && alloc.mode) || 'auto_oldest'; const due = custDue(c.D, cid); const out = [];
    if (!isInt(amount) || amount <= 0) vfail('amount', 'positive');
    if (mode === 'on_account') { if (c.role !== 'owner') fail('FORBIDDEN', 'on_account owner only'); let left = amount; for (const it of items) { if (left <= 0) break; const a = Math.min(left, it.left); out.push({ item: it, applied: a }); left -= a; } return { out, mode, credit: left }; }
    if (amount > due) vfail('amount', 'max_due', 'amount is more than the due');
    if (mode === 'manual') { let sum = 0; for (const x of (alloc.items || [])) { const it = items.find((i) => (x.opening ? i.opening : i.sale_id === x.sale_id)); if (!it) vfail('allocation.items', 'unknown_item'); if (!isInt(x.amount) || x.amount <= 0 || x.amount > it.left) vfail('allocation.items', 'amount'); out.push({ item: it, applied: x.amount }); sum += x.amount; } if (sum !== amount) vfail('allocation.items', 'sum_mismatch'); return { out, mode, credit: 0 }; }
    let left = amount; for (const it of items) { if (left <= 0) break; const a = Math.min(left, it.left); out.push({ item: it, applied: a }); left -= a; } return { out, mode: 'auto_oldest', credit: 0 };
  }
  function receivePayment(c, i, internal) {
    const D = c.D; const customer = cust(D, i.customer_id); if (!METHODS.includes(i.method)) vfail('method', 'enum');
    if (i.method === 'cheque' && !(i.cheque && i.cheque.no)) vfail('cheque.no', 'required');
    let date = c.today; if (i.date && i.date !== c.today) { if (c.role !== 'owner') vfail('date', 'today_only'); date = i.date; }
    const before = custDue(D, customer.id); const plan = allocPlan(c, customer.id, i.amount, i.allocation);
    const id = nid(D, 'payment'); const no = 'RCV-' + pad(nid(D, 'receipt'), 5);
    const p = { id, receipt_no: no, ts: c.ts(), date, party_type: 'customer', party_id: customer.id, party_name: customer.name, amount: i.amount, method: i.method, ref: i.ref || null, note: i.note || null, status: 'active', created_by: c.user.name, created_by_id: c.user.id, allocations: plan.out.map((x) => ({ sale_id: x.item.sale_id, invoice_no: x.item.opening ? null : x.item.ref, opening: !!x.item.opening, amount: x.applied })), cheque: null, reversal: null, print_count: 0 };
    if (plan.credit > 0) p.allocations.push({ sale_id: null, invoice_no: null, opening: false, on_account: true, amount: plan.credit });
    if (i.method === 'cheque') { p.cheque = { no: i.cheque.no, bank: i.cheque.bank || null, deposit_date: i.cheque.deposit_date || null, status: 'pending' }; D.cheques.push({ id: nid(D, 'cheque'), payment_id: id, no: i.cheque.no, bank: i.cheque.bank || null, customer: customer.name, amount: i.amount, deposit_date: i.cheque.deposit_date || null, status: 'pending' }); }
    D.payments.push(p); ledgerAdd(c, customer.id, 'payment', no, id, 0, i.amount, date); audit(c, 'payment.receive', 'payment', id, null, { no, amount: i.amount, method: i.method }, null, false);
    const out = { payment: payOut(c, p), customer_due_before: before, customer_due_after: custDue(D, customer.id) }; if (!internal) out.receipt = receiptOut(c, p, '80'); return out;
  }
  function payOut(c, p) { const o = Object.assign({}, p); delete o.created_by_id; delete o.print_count; o.allocations = p.allocations.map((a) => Object.assign({}, a)); return o; }
  function businessOut(c) { const s = c.S.settings; return { name: s['business.name'] || '', address: s['business.address'] || '', phone: s['business.phone'] || '' }; }
  function receiptOut(c, p, size) { return { payment: payOut(c, p), business: businessOut(c), customer_due_after: p.party_type === 'customer' ? custDue(c.D, p.party_id) : null, size, is_copy: (p.print_count || 0) > 0 }; }
  function reversePayment(c, p, reason, kind) {
    if (p.status !== 'active') fail('STATE', 'already reversed'); const D = c.D;
    p.status = 'reversed'; p.reversal = { by: c.user.name, reason, ts: c.ts() };
    if (p.party_type === 'customer') ledgerAdd(c, p.party_id, 'reversal', p.receipt_no, p.id, p.amount, 0, c.today); else D.cl.push({ id: nid(D, 'cl'), company_id: p.party_id, date: c.today, ts: c.ts(), kind: 'reversal', ref: p.receipt_no, ref_id: p.id, debit: 0, credit: p.amount });
    audit(c, 'payment.reverse', 'payment', p.id, { amount: p.amount, status: 'active' }, { status: 'reversed' }, reason, true, kind || 'payment_reversed'); return p;
  }
  function cancelSale(c, s, reason, approval) {
    const D = c.D; if (s.status === 'cancelled') fail('STATE', 'already cancelled'); if (!reason || !String(reason).trim()) vfail('reason', 'required');
    if (D.returns.some((r) => r.sale_id === s.id && r.status !== 'rejected')) fail('STATE', 'sale has returns', { code: 'HAS_RETURNS' });
    const needs = c.role === 'owner' || setting(c, 'cancel.manager_needs_approval', true); let appr = null;
    if (needs) { appr = c.consumeApproval(approval, 'cancel_invoice'); if (!appr.ok) fail('NEEDS_OWNER_PIN', 'owner approval needed', { reason_kind: 'cancel_invoice' }); }
    s.lines.forEach((l) => l.picks.forEach((x) => { const lot = D.lots.find((z) => z.id === x.lot_id); lot.remaining += x.qty; }));
    s.status = 'cancelled'; s.cancel = { by: c.user.name, reason, ts: c.ts() };
    for (const p of D.payments) { if (p.status === 'active' && p.party_type === 'customer' && p.allocations.length && p.allocations.every((a) => a.sale_id === s.id)) reversePayment(c, p, 'sale cancelled: ' + reason, 'payment_reversed'); }
    ledgerAdd(c, s.customer_id, 'cancel', s.invoice_no, s.id, 0, s.totals.total, c.today);
    audit(c, 'sale.cancel', 'sale', s.id, { status: 'completed' }, { status: 'cancelled' }, reason, true, 'invoice_cancelled'); return s;
  }

  /* ---------- returns ---------- */
  function createReturn(c, i) {
    const D = c.D; const s = D.sales.find((x) => x.id === i.sale_id); if (!s) fail('NOT_FOUND', 'sale'); if (s.status === 'cancelled') fail('STATE', 'sale cancelled');
    if (!Array.isArray(i.lines) || !i.lines.length) vfail('lines', 'required'); if (!['expired', 'damaged', 'unsold', 'wrong_item', 'other'].includes(i.reason)) vfail('reason', 'enum'); if (!['good', 'damaged'].includes(i.destination)) vfail('destination', 'enum'); if (!['ledger', 'cash'].includes(i.refund)) vfail('refund', 'enum');
    const used = {}; const lines = []; let value = 0;
    i.lines.forEach((x, idx) => {
      const l = s.lines.find((y) => y.sale_item_id === x.sale_item_id); if (!l) vfail('lines.' + idx + '.sale_item_id', 'unknown'); const p = prod(D, l.product_id); const base = toBase(p, x.qty); if (!base || base <= 0) vfail('lines.' + idx + '.qty', 'positive');
      const already = D.returns.filter((r) => r.sale_id === s.id && r.status !== 'rejected').reduce((t, r) => t + r.lines.filter((q) => q.sale_item_id === l.sale_item_id).reduce((u, q) => u + q.qty_base, 0), 0) + (used[l.sale_item_id] || 0);
      if (base + already > l.qty_base) vfail('lines.' + idx + '.qty', 'over_returnable', 'more than was sold'); used[l.sale_item_id] = (used[l.sale_item_id] || 0) + base;
      let v = mulDiv(base, l.net, l.qty_base); const afterLine = s.totals.subtotal - s.totals.line_discount; if (s.totals.invoice_discount > 0) v = mulDiv(v, s.totals.total, afterLine);
      lines.push({ sale_item_id: l.sale_item_id, product_id: l.product_id, name: l.name, qty_base: base, value: v }); value += v;
    });
    const id = nid(D, 'return'); const r = { id, no: 'RET-' + pad(id, 4), ts: c.ts(), date: c.today, sale_id: s.id, sale_no: s.invoice_no, customer_id: s.customer_id, lines, value, reason: i.reason, note: i.note || null, destination: i.destination, refund: i.refund, status: 'pending', created_by: c.user.name, created_by_id: c.user.id, rejected: null };
    D.returns.push(r); audit(c, 'return.create', 'return', id, null, { no: r.no, value }, i.note || i.reason, true, 'return');
    const auto = c.role === 'owner' || !setting(c, 'returns.manager_needs_approval', true); if (auto) approveReturn(c, r, true);
    return { return: { id, no: r.no, status: r.status, value } };
  }
  function approveReturn(c, r, silent) {
    const D = c.D; if (r.status !== 'pending') fail('STATE', 'not pending'); const s = D.sales.find((x) => x.id === r.sale_id);
    for (const rl of r.lines) { const sl = s.lines.find((x) => x.sale_item_id === rl.sale_item_id); let left = rl.qty_base; rl.restored = [];
      if (r.destination === 'good') { for (const pk of sl.picks.slice().reverse()) { if (left <= 0) break; const room = pk.qty - (pk.returned || 0); const q = Math.min(room, left); if (q <= 0) continue; pk.returned = (pk.returned || 0) + q; D.lots.find((z) => z.id === pk.lot_id).remaining += q; left -= q; rl.restored.push({ lot_id: pk.lot_id, qty: q }); } } }
    r.status = 'approved'; r.approved_by = c.user.name; ledgerAdd(c, s.customer_id, 'return', r.no, r.id, 0, r.value, c.today);
    if (r.refund === 'cash') { ledgerAdd(c, s.customer_id, 'refund', r.no, r.id, r.value, 0, c.today); D.expenses.push({ id: nid(D, 'expense'), ts: c.ts(), date: c.today, type: 'refund', amount: r.value, note: 'cash refund ' + r.no, created_by: c.user.name, created_by_id: c.user.id }); }
    if (!silent) audit(c, 'return.approve', 'return', r.id, { status: 'pending' }, { status: 'approved' }, null, true, 'return'); return r;
  }

  /* ---------- purchases / companies ---------- */
  const comp = (D, id) => { const x = D.companies.find((y) => y.id === id); if (!x) fail('NOT_FOUND', 'company'); return x; };
  const compDue = (D, id) => D.cl.reduce((t, e) => (e.company_id === id ? t + e.credit - e.debit : t), 0);
  function purchaseAllocated(D, pu) { let t = 0; for (const p of D.payments) { if (p.status !== 'active' || p.party_type !== 'company') continue; for (const a of p.allocations) if (a.purchase_id === pu.id) t += a.amount; } return t; }
  function createPurchase(c, i) {
    const D = c.D; const co = comp(D, i.company_id); if (!Array.isArray(i.lines) || !i.lines.length) vfail('lines', 'required'); const date = i.date || c.today; const id = nid(D, 'purchase'); const no = 'PUR-' + pad(id, 4); let total = 0; const lines = []; const lots = [];
    i.lines.forEach((l, idx) => { const p = prod(D, l.product_id); const base = toBase(p, l.qty); if (!base || base <= 0) vfail('lines.' + idx + '.qty', 'positive'); if (!isInt(l.unit_cost) || l.unit_cost < 0) vfail('lines.' + idx + '.unit_cost', 'int>=0'); const amt = mulDiv(base, l.unit_cost, unitBase(p)); total += amt;
      const lot = { id: nid(D, 'lot'), product_id: p.id, purchase_id: id, received_date: l.received_date || date, expiry_date: l.expiry_date || null, received: base, remaining: base, unit_cost: l.unit_cost, kind: 'purchase' }; D.lots.push(lot); lots.push(lot); p.cost_price = l.unit_cost; p.assumed_cost = false; lines.push({ product_id: p.id, name: p.name, qty_base: base, unit_cost: l.unit_cost, amount: amt, lot_id: lot.id, received_date: lot.received_date, expiry_date: lot.expiry_date }); });
    const pu = { id, no, date, ts: c.ts(), company_id: co.id, supplier_invoice: i.supplier_invoice || null, lines, total, status: 'active', created_by: c.user.name }; D.purchases.push(pu);
    D.cl.push({ id: nid(D, 'cl'), company_id: co.id, date, ts: c.ts(), kind: 'purchase', ref: no, ref_id: id, debit: 0, credit: total }); audit(c, 'purchase.create', 'purchase', id, null, { no, total }, null, false);
    if (i.paid_now && i.paid_now.amount > 0) payCompany(c, { company_id: co.id, amount: i.paid_now.amount, method: i.paid_now.method || 'cash', date, allocation: { items: [{ purchase_id: id, amount: Math.min(i.paid_now.amount, total) }] } });
    return { id, no, total, due: total - purchaseAllocated(D, pu), lots: lots.map((l) => lotOut(c, l)) };
  }
  function payCompany(c, i) {
    const D = c.D; const co = comp(D, i.company_id); if (!isInt(i.amount) || i.amount <= 0) vfail('amount', 'positive'); const items = (i.allocation && i.allocation.items) || []; let sum = 0;
    for (const x of items) { const pu = D.purchases.find((y) => y.id === x.purchase_id); if (!pu) vfail('allocation.items', 'unknown_purchase'); if (x.amount > pu.total - purchaseAllocated(D, pu)) vfail('allocation.items', 'amount'); sum += x.amount; } if (sum > i.amount) vfail('allocation.items', 'sum');
    const id = nid(D, 'payment'); const no = 'PAY-' + pad(nid(D, 'cpay'), 5); const date = i.date || c.today;
    const p = { id, receipt_no: no, ts: c.ts(), date, party_type: 'company', party_id: co.id, party_name: co.name, amount: i.amount, method: i.method || 'cash', ref: i.ref || null, note: i.note || null, status: 'active', created_by: c.user.name, created_by_id: c.user.id, allocations: items.map((x) => ({ purchase_id: x.purchase_id, invoice_no: D.purchases.find((y) => y.id === x.purchase_id).no, amount: x.amount })), cheque: null, reversal: null };
    D.payments.push(p); D.cl.push({ id: nid(D, 'cl'), company_id: co.id, date, ts: c.ts(), kind: 'payment', ref: no, ref_id: id, debit: i.amount, credit: 0 }); audit(c, 'payment.company', 'payment', id, null, { no, amount: i.amount }, null, false);
    return { payment: payOut(c, p), company_due_after: compDue(D, co.id) };
  }

  /* ---------- day figures ---------- */
  const paymentsOn = (D, date, type) => D.payments.filter((p) => p.date === date && p.party_type === (type || 'customer'));
  function cashExpected(c, date) {
    const D = c.D; const by = {}; METHODS.forEach((m) => { by[m] = 0; }); const own = c.role === 'manager';
    paymentsOn(D, date).filter((p) => p.status === 'active' && (!own || p.created_by_id === c.user.id)).forEach((p) => { by[p.method] += p.amount; });
    const exp = D.expenses.filter((e) => e.date === date && (!own || e.created_by_id === c.user.id)).reduce((t, e) => t + e.amount, 0); const closed = D.closes.some((x) => x.date === date);
    return { by_method: by, expenses: exp, expected_cash: by.cash - exp, closed };
  }

  PD.biz = { Fail, fail, vfail, newData, nid, cx, setting, audit, verifyChain, lotsOf, stockOf, prod, pick, pickable, lotCost, lotOut, prodOut, sold30, statusOf, cust, custDue, custRow, ledgerAdd, ledgerRows, openItems, openingLeft, aging, saleLeft, saleAllocated, saleReturned, planSale, previewOut, createSale, saleOut, lineOut, receivePayment, receiptOut, payOut, businessOut, reversePayment, cancelSale, allocPlan, createReturn, approveReturn, comp, compDue, createPurchase, payCompany, purchaseAllocated, paymentsOn, cashExpected, METHODS, lotDays };
})(typeof window !== 'undefined' ? window : globalThis);

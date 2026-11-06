/* Mock handlers: customers, payments, cheques, employees, expenses, load sheet, cash. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  PD.mockInstallers = PD.mockInstallers || [];
  PD.mockInstallers.push((m) => {
    const { ok } = PD.mockHelpers; const reg = m.register; const B = PD.biz; const U = PD.mockUtil; const { fail, vfail } = B;
    const X = (C) => B.cx(C.S, C.sess.user, C.now(), { consumeApproval: C.consumeApproval });
    const page = (rows, a) => PD.mockPage(rows, a);
    const fmtTk = (paisa) => { const n = Math.round(paisa / 100); const s = String(Math.abs(n)); const g = s.length <= 3 ? s : s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3); return (n < 0 ? '-' : '') + g; };

    /* ---- customers ---- */
    reg('customers.list', async (a, C) => {
      const D = C.S.d; const x = X(C); const q = (a.q || '').toLowerCase().trim(); let rows = D.customers.filter((c) => (!a.area || c.area === a.area) && (!a.route || c.route === a.route) && (!q || c.name.toLowerCase().includes(q) || (c.owner || '').toLowerCase().includes(q) || (c.phone || '').includes(q))).map((c) => B.custRow(x, c));
      if (a.has_due) rows = rows.filter((r) => r.due > 0); const key = a.sort || 'name'; const f = { name: (r) => r.name, due: (r) => -r.due, last_payment: (r) => r.last_payment_date || '', days: (r) => -(r.days_since_payment || 0) }[key] || ((r) => r.name); rows.sort((p, q2) => (f(p) < f(q2) ? -1 : f(p) > f(q2) ? 1 : 0));
      const pg = page(rows, a); return ok({ rows: pg.rows, page: pg.page, total_due: rows.reduce((t, r) => t + Math.max(0, r.due), 0) });
    });
    reg('customers.save', async (a, C) => {
      const D = C.S.d; const x = X(C); const name = String(a.name || '').trim(); if (!name) vfail('name', 'required'); const ex = a.id ? D.customers.find((c) => c.id === a.id) : null; if (a.id && !ex) fail('NOT_FOUND');
      if (ex && x.role !== 'owner') fail('FORBIDDEN', 'only the owner can edit a customer'); if (x.role !== 'owner' && (a.credit_limit != null || a.opening_due != null)) fail('FORBIDDEN', 'credit limit and opening due are owner only');
      if (a.phone && D.customers.some((c) => c.phone === a.phone && c.id !== (ex && ex.id))) fail('DUPLICATE', 'phone'); if (a.credit_limit != null && (!U.isInt(a.credit_limit) || a.credit_limit < 0)) vfail('credit_limit', 'int>=0');
      const c = ex || { id: B.nid(D, 'customer') }; Object.assign(c, { name, owner: a.owner || null, phone: a.phone || null, area: a.area || null, address: a.address || null, route: a.route || null }); if (a.credit_limit != null) c.credit_limit = a.credit_limit; if (!ex) { D.customers.push(c); if (a.opening_due > 0) B.ledgerAdd(x, c.id, 'opening', 'OPENING', null, a.opening_due, 0, x.today); } B.audit(x, ex ? 'customer.update' : 'customer.create', 'customer', c.id, null, { name }, null, false);
      return ok(B.custRow(x, c));
    });
    reg('customers.ledger', async (a, C) => { const D = C.S.d; const x = X(C); B.cust(D, a.customer_id); return ok({ rows: B.ledgerRows(D, a.customer_id, a.from, a.to), due: B.custDue(D, a.customer_id), aging: B.aging(x, a.customer_id), open_items: B.openItems(D, a.customer_id).map((i) => ({ ref: i.ref, date: i.date, left: i.left, sale_id: i.sale_id, opening: !!i.opening })) }); });
    reg('customers.statement', async (a, C) => {
      const D = C.S.d; const x = X(C); const cu = B.cust(D, a.customer_id); const all = B.ledgerRows(D, a.customer_id); const rows = all.filter((r) => r.date >= a.from && r.date <= a.to); const before = all.filter((r) => r.date < a.from); const opening = before.length ? before[before.length - 1].balance : 0; const closing = rows.length ? rows[rows.length - 1].balance : opening;
      return ok({ business: B.businessOut(x), customer: B.custRow(x, cu), rows, opening, closing, language: a.language || 'bn' });
    });
    reg('customers.dueList', async (a, C) => {
      const D = C.S.d; const x = X(C); const biz = B.businessOut(x).name || 'PetraDMS'; const rows = [];
      D.customers.filter((c) => !a.route || c.route === a.route).forEach((c) => { const due = B.custDue(D, c.id); if (due <= 0) return; const items = B.openItems(D, c.id); const oldest = items.length ? items[0].date : x.today; const days = U.daysBetween(oldest, x.today); if (a.min_days != null && days < a.min_days) return; const row = B.custRow(x, c);
        rows.push({ customer: row, days_overdue: days, reminder: { bn: 'জনাব ' + (c.owner || c.name) + ', ' + c.name + '-এর বকেয়া ৳ ' + fmtTk(due) + ' (' + days + ' দিন)। অনুগ্রহ করে পরিশোধ করুন। ধন্যবাদ। — ' + biz, en: 'Dear ' + (c.owner || c.name) + ', the due of ' + c.name + ' is BDT ' + fmtTk(due) + ' (' + days + ' days). Please pay soon. Thank you. — ' + biz } }); });
      rows.sort((p, q) => q.customer.due - p.customer.due); return ok({ rows });
    });

    /* ---- payments ---- */
    reg('payments.receive', async (a, C) => ok(B.receivePayment(X(C), a)));
    reg('payments.preview', async (a, C) => { const D = C.S.d; const x = X(C); B.cust(D, a.customer_id); const plan = B.allocPlan(x, a.customer_id, a.amount, a.allocation); const due = B.custDue(D, a.customer_id); const items = plan.out.map((o) => ({ ref: o.item.ref, date: o.item.date, due: o.item.left, applied: o.applied })); if (plan.credit > 0) items.push({ ref: 'ON_ACCOUNT', date: x.today, due: 0, applied: plan.credit }); return ok({ allocations: items, due_after: due - a.amount }); });
    reg('payments.list', async (a, C) => {
      const D = C.S.d; const x = X(C); const mgr = x.role === 'manager'; const q = (a.q || '').toLowerCase().trim(); const type = mgr ? 'customer' : a.party_type;
      let rows = D.payments.filter((p) => (!type || p.party_type === type) && (!mgr || p.created_by_id === x.user.id) && (!a.customer_id || (p.party_type === 'customer' && p.party_id === a.customer_id)) && (!a.method || p.method === a.method) && (!a.status || p.status === a.status) && (!a.from || p.date >= a.from) && (!a.to || p.date <= a.to) && (!a.user_id || p.created_by_id === a.user_id) && (!q || p.receipt_no.toLowerCase().includes(q) || p.party_name.toLowerCase().includes(q) || (p.ref || '').toLowerCase().includes(q)));
      rows.sort((p, r) => (p.ts < r.ts ? 1 : -1)); const by = {}; let grand = 0; rows.forEach((p) => { if (p.status === 'active') { by[p.method] = (by[p.method] || 0) + p.amount; grand += p.amount; } }); const pg = page(rows.map((p) => B.payOut(x, p)), a); return ok({ rows: pg.rows, page: pg.page, totals: { by_method: by, grand } });
    });
    const getPay = (C, id) => { const p = C.S.d.payments.find((y) => y.id === id); if (!p) fail('NOT_FOUND'); if (C.sess.role === 'manager' && (p.party_type !== 'customer' || p.created_by_id !== C.sess.user.id)) fail('FORBIDDEN'); return p; };
    reg('payments.get', async (a, C) => ok(B.payOut(X(C), getPay(C, a.id))));
    reg('payments.receipt', async (a, C) => { const x = X(C); const p = getPay(C, a.payment_id); const r = B.receiptOut(x, p, a.size); if (a.mark_printed) { p.print_count = (p.print_count || 0) + 1; } r.language = a.language || 'bn'; return ok(r); });
    reg('payments.reverse', async (a, C) => { const x = X(C); const p = getPay(C, a.id); if (p.status !== 'active') fail('STATE'); if (!a.reason || !a.reason.trim()) vfail('reason', 'required'); const ap = x.consumeApproval(a.approval, 'reverse_payment'); if (!ap.ok) fail('NEEDS_OWNER_PIN', 'owner PIN needed', { reason_kind: 'reverse_payment' }); B.reversePayment(x, p, a.reason); const ch = C.S.d.cheques.find((c) => c.payment_id === p.id); if (ch && ch.status === 'pending') ch.status = 'bounced'; return ok(B.payOut(x, p)); });
    reg('payments.dayBook', async (a, C) => {
      const D = C.S.d; const x = X(C); const mgr = x.role === 'manager'; const ps = B.paymentsOn(D, a.date).filter((p) => p.status === 'active' && (!mgr || p.created_by_id === x.user.id)); const by = {}; B.METHODS.forEach((k) => { by[k] = 0; }); const usr = {}; let total = 0;
      ps.forEach((p) => { by[p.method] += p.amount; total += p.amount; const u = usr[p.created_by] = usr[p.created_by] || { user: p.created_by, amount: 0, count: 0 }; u.amount += p.amount; u.count++; }); const out = { by_method: by, by_user: Object.values(usr), total };
      if (!mgr) out.cash_in_hand_expected = B.cashExpected(x, a.date).expected_cash; return ok(out);
    });
    reg('payments.cheques.list', async (a, C) => { const rows = C.S.d.cheques.filter((c) => !a.status || c.status === a.status).slice().reverse(); return ok({ rows }); });
    reg('payments.cheques.setStatus', async (a, C) => {
      const D = C.S.d; const x = X(C); const ch = D.cheques.find((c) => c.id === a.id); if (!ch) fail('NOT_FOUND'); if (ch.status !== 'pending') fail('STATE'); const p = D.payments.find((y) => y.id === ch.payment_id);
      if (a.status === 'cleared') { ch.status = 'cleared'; p.cheque.status = 'cleared'; B.audit(x, 'cheque.cleared', 'cheque', ch.id, null, null, a.note, false); } else if (a.status === 'bounced') { ch.status = 'bounced'; p.cheque.status = 'bounced'; if (p.status === 'active') B.reversePayment(x, p, a.note || 'cheque bounced', 'bounced_cheque'); } else vfail('status', 'enum'); return ok(null);
    });
    reg('payments.payCompany', async (a, C) => ok(B.payCompany(X(C), a)));

    /* ---- employees / expenses ---- */
    const advLeft = (D, id) => D.advances.filter((x) => x.employee_id === id).reduce((t, x) => t + x.amount - x.deducted, 0);
    reg('employees.list', async (a, C) => { const D = C.S.d; const x = X(C); const month = x.today.slice(0, 7); const from = U.addDays(x.today, -6); return ok({ rows: D.employees.map((e) => ({ id: e.id, name: e.name, role: e.role, phone: e.phone || null, van: e.van || null, salary: e.salary, advance: advLeft(D, e.id), paid_this_month: !!D.salaryPaid[e.id + '|' + month], sold_7d: D.sales.filter((s) => s.salesman_id === e.id && s.status === 'completed' && s.date >= from).reduce((t, s) => t + s.totals.total, 0) })) }); });
    reg('employees.save', async (a, C) => { const D = C.S.d; const x = X(C); if (!String(a.name || '').trim()) vfail('name', 'required'); if (!a.role) vfail('role', 'required'); if (!U.isInt(a.salary) || a.salary < 0) vfail('salary', 'int>=0'); const ex = a.id ? D.employees.find((e) => e.id === a.id) : null; if (a.id && !ex) fail('NOT_FOUND'); const e = ex || { id: B.nid(D, 'employee') }; Object.assign(e, { name: a.name.trim(), role: a.role, phone: a.phone || null, van: a.van || null, salary: a.salary }); if (!ex) D.employees.push(e); B.audit(x, ex ? 'employee.update' : 'employee.create', 'employee', e.id, null, { name: e.name }, null, false); return ok(e); });
    reg('employees.advance', async (a, C) => { const D = C.S.d; const x = X(C); const e = D.employees.find((y) => y.id === a.employee_id); if (!e) fail('NOT_FOUND'); if (!U.isInt(a.amount) || a.amount <= 0) vfail('amount', 'positive'); D.advances.push({ id: B.nid(D, 'advance'), employee_id: e.id, amount: a.amount, deducted: 0, date: x.today, note: a.note || null }); D.expenses.push({ id: B.nid(D, 'expense'), ts: x.ts(), date: x.today, type: 'advance', amount: a.amount, note: e.name, created_by: x.user.name, created_by_id: x.user.id }); B.audit(x, 'employee.advance', 'employee', e.id, null, { amount: a.amount }, a.note, false); return ok(null); });
    reg('employees.paySalary', async (a, C) => { const D = C.S.d; const x = X(C); const e = D.employees.find((y) => y.id === a.employee_id); if (!e) fail('NOT_FOUND'); if (!/^\d{4}-\d{2}$/.test(a.month || '')) vfail('month', 'YYYY-MM'); const key = e.id + '|' + a.month; if (D.salaryPaid[key]) fail('STATE', 'already paid'); let adv = Math.min(e.salary, advLeft(D, e.id)); let left = adv; D.advances.filter((y) => y.employee_id === e.id).forEach((y) => { const k = Math.min(left, y.amount - y.deducted); y.deducted += k; left -= k; }); const net = e.salary - adv; D.salaryPaid[key] = true; D.expenses.push({ id: B.nid(D, 'expense'), ts: x.ts(), date: x.today, type: 'salary', amount: net, note: e.name + ' ' + a.month, created_by: x.user.name, created_by_id: x.user.id }); B.audit(x, 'employee.salary', 'employee', e.id, null, { month: a.month, net }, null, false); return ok({ net }); });
    reg('expenses.create', async (a, C) => { const D = C.S.d; const x = X(C); if (!String(a.type || '').trim()) vfail('type', 'required'); if (!U.isInt(a.amount) || a.amount <= 0) vfail('amount', 'positive'); let date = x.today; if (a.date && a.date !== x.today) { if (x.role !== 'owner') vfail('date', 'today_only'); date = a.date; } const e = { id: B.nid(D, 'expense'), ts: x.ts(), date, type: a.type.trim(), amount: a.amount, note: a.note || null, created_by: x.user.name, created_by_id: x.user.id }; D.expenses.push(e); B.audit(x, 'expense.create', 'expense', e.id, null, { type: e.type, amount: e.amount }, a.note, false); return ok(e); });
    reg('expenses.list', async (a, C) => { const D = C.S.d; const x = X(C); const mgr = x.role === 'manager'; const rows = D.expenses.filter((e) => (!mgr || (e.created_by_id === x.user.id && e.date === x.today)) && (!a.from || e.date >= a.from) && (!a.to || e.date <= a.to) && (!a.type || e.type === a.type)).sort((p, q) => (p.ts < q.ts ? 1 : -1)); const pg = page(rows.map((e) => ({ id: e.id, ts: e.ts, type: e.type, amount: e.amount, note: e.note, created_by: e.created_by })), a); return ok({ rows: pg.rows, page: pg.page, total: rows.reduce((t, e) => t + e.amount, 0) }); });

    /* ---- load sheet ---- */
    const sheetKey = (a) => a.date + '|' + (a.van || '');
    reg('loadsheet.get', async (a, C) => {
      const D = C.S.d; const sh = D.loads[sheetKey(a)] || { lines: {}, submitted: false, counted: {} }; const sold = {}, ret = {};
      D.sales.filter((s) => s.status === 'completed' && s.date === a.date && (!a.van || (D.employees.find((e) => e.id === s.salesman_id) || {}).van === a.van)).forEach((s) => s.lines.forEach((l) => { sold[l.product_id] = (sold[l.product_id] || 0) + l.qty_base; }));
      D.returns.filter((r) => r.status === 'approved' && r.destination === 'good' && r.date === a.date).forEach((r) => r.lines.forEach((l) => { ret[l.product_id] = (ret[l.product_id] || 0) + l.qty_base; }));
      const ids = new Set([...Object.keys(sh.lines), ...Object.keys(sold)].map(Number)); let shortage = 0;
      const lines = Array.from(ids).map((pid) => { const p = B.prod(D, pid); const loaded = sh.lines[pid] || 0, s = sold[pid] || 0, r = ret[pid] || 0, exp = loaded - s + r; const o = { product_id: pid, name: p.name, loaded: U.qtyObj(p, loaded), sold: U.qtyObj(p, s), returned: U.qtyObj(p, r), expected: U.qtyObj(p, exp) }; if (sh.counted[pid] != null) { const d = sh.counted[pid] - exp; o.counted = U.qtyObj(p, sh.counted[pid]); o.diff = U.qtyObj(p, d); o.diff_value = U.mulDiv(d, p.list_price, U.unitBase(p)); if (d < 0) shortage += -o.diff_value; } return o; }).sort((p, q) => p.name.localeCompare(q.name));
      return ok({ id: sh.id || null, lines, submitted: !!sh.submitted, shortage_value: shortage });
    });
    reg('loadsheet.setLoaded', async (a, C) => {
      const D = C.S.d; const x = X(C); const k = sheetKey(a); const sh = D.loads[k] = D.loads[k] || { id: B.nid(D, 'load'), lines: {}, submitted: false, counted: {} }; if (sh.submitted) fail('LOCKED', 'sheet is locked');
      const lines = {}; (a.lines || []).forEach((l, i) => { const p = B.prod(D, l.product_id); const b = U.toBase(p, l.loaded); if (b == null || b < 0) vfail('lines.' + i + '.loaded', 'qty'); if (b > B.stockOf(D, p.id)) fail('STOCK', 'not enough stock', { lines: [{ index: i, product_id: p.id, requested: U.qtyObj(p, b), available: U.qtyObj(p, B.stockOf(D, p.id)) }] }); if (b > 0) lines[p.id] = b; }); sh.lines = lines; B.audit(x, 'loadsheet.set', 'loadsheet', sh.id, null, { lines: Object.keys(lines).length }, null, false); return ok(null);
    });
    reg('loadsheet.submit', async (a, C) => {
      const D = C.S.d; const x = X(C); const k = sheetKey(a); const sh = D.loads[k]; if (!sh) fail('VALIDATION', 'nothing loaded', { fields: [{ path: 'date', rule: 'no_sheet' }] }); if (sh.submitted) fail('LOCKED', 'sheet is locked');
      (a.counted || []).forEach((l, i) => { const p = B.prod(D, l.product_id); const b = U.toBase(p, l.counted); if (b == null || b < 0) vfail('counted.' + i, 'qty'); sh.counted[p.id] = b; }); sh.submitted = true; const env = await PD.mockCall('loadsheet.get', { date: a.date, van: a.van }); const sv = env.data.shortage_value; B.audit(x, 'loadsheet.submit', 'loadsheet', sh.id, null, { shortage_value: sv }, null, sv > 0, 'load_shortage'); return ok({ shortage_value: sv, flagged: sv > 0 });
    });

    /* ---- cash ---- */
    reg('cash.expected', async (a, C) => ok(B.cashExpected(X(C), a.date)));
    reg('cash.close', async (a, C) => { const D = C.S.d; const x = X(C); if (!a.date) vfail('date', 'required'); if (!U.isInt(a.counted) || a.counted < 0) vfail('counted', 'int>=0'); if (D.closes.some((c) => c.date === a.date)) fail('STATE', 'already closed'); const e = B.cashExpected(x, a.date); const diff = a.counted - e.expected_cash; D.closes.push({ date: a.date, expected: e.expected_cash, counted: a.counted, difference: diff, by: x.user.name, note: a.note || null }); B.audit(x, 'cash.close', 'cash', a.date, { expected: e.expected_cash }, { counted: a.counted }, a.note, diff !== 0, 'cash_difference'); return ok({ expected: e.expected_cash, counted: a.counted, difference: diff }); });
    reg('cash.history', async (a, C) => ok({ rows: C.S.d.closes.slice().sort((p, q) => (p.date < q.date ? 1 : -1)).slice(0, a.limit || 60) }));
  });
})(typeof window !== 'undefined' ? window : globalThis);

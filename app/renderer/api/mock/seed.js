/* Demo data for the mock backend: catalog from the contract seed CSV, lots, customers, 30 days of sales and payments. All created through the same core rules the real backend uses. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  PD.seedDemo = function seedDemo(S, nowDate) {
    const B = PD.biz; const U = PD.mockUtil; const rnd = U.prng(20260611); const pick = (a) => a[Math.floor(rnd() * a.length)]; const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const D = (S.d = B.newData()); const now = nowDate || new Date(); const today = U.dateOf(now);
    const at = (iso, h, m) => { const [y, mo, d] = iso.split('-').map(Number); return new Date(y, mo - 1, d, h, m || 0); };
    const owner = { id: 1, name: S.users.owner ? S.users.owner.name : 'Owner', role: 'owner' }; const mgr = { id: 2, name: S.users.manager ? S.users.manager.name : 'Manager', role: 'manager' };
    const mk = (iso, h, m, user) => { const c = B.cx(S, user || owner, at(iso, h, m)); c.consumeApproval = () => ({ ok: true, by: owner.name, reason: 'seed' }); return c; };
    const d0 = (n) => U.addDays(today, -n);
    /* companies + products */
    const names = []; PD.SEED_PRODUCTS.forEach((r) => { const n = r[2] || 'Others'; if (!names.includes(n)) names.push(n); });
    names.forEach((n) => D.companies.push({ id: B.nid(D, 'company'), name: n, phone: '01' + ri(700000000, 999999999) }));
    PD.SEED_PRODUCTS.forEach((r) => {
      const [sku, name, company, value, size, orig] = r; if (value === '' || value == null) return; const co = D.companies.find((x) => x.name === (company || 'Others')); const sz = size === '' ? null : Number(size); const v = Number(value);
      const byKg = sz === 1 && v < 3000; const list = Math.round(v * 100); const cost = Math.round(list * 0.94);
      D.products.push({ id: B.nid(D, 'product'), sku, name, original_name: orig, company_id: co.id, sell_mode: byKg ? 'by_kg' : 'carton_pcs', pcs_per_carton: byKg ? null : 12, pcs_per_dozen: byKg ? null : 12, grams_per_carton: byKg || sz == null ? null : Math.round(sz * 1000), list_price: list, cost_price: cost, max_per_unit: Math.round(list * 0.02), max_percent_bp: null, min_sell_price: Math.round(cost * 1.01), min_stock_base: byKg ? 20000 : 24, assumed_ppc: !byKg, assumed_cost: true, archived: false });
    });
    /* opening company dues */
    D.companies.slice(0, 3).forEach((co) => D.cl.push({ id: B.nid(D, 'cl'), company_id: co.id, date: d0(70), ts: at(d0(70), 9).toISOString(), kind: 'opening', ref: 'OPENING', ref_id: null, debit: 0, credit: ri(2, 9) * 100000 * 100 }));
    /* purchases: first big receive 70 days ago, second 18 days ago */
    D.companies.forEach((co) => {
      const ps = D.products.filter((p) => p.company_id === co.id); if (!ps.length) return;
      [[70, 1], [18, 0.5]].forEach(([ago, share]) => {
        const c = mk(d0(ago), 10, 0); const lines = ps.filter(() => rnd() < share || ago === 70).map((p) => ({ product_id: p.id, qty: p.sell_mode === 'by_kg' ? { kg: String(ri(300, 900)) } : { cartons: ri(40, 90) }, unit_cost: p.cost_price, received_date: d0(ago), expiry_date: U.addDays(d0(ago), ri(240, 420)) })); if (!lines.length) return;
        const tot = lines.reduce((t, l) => { const p = D.products.find((x) => x.id === l.product_id); return t + U.mulDiv(U.toBase(p, l.qty), l.unit_cost, U.unitBase(p)); }, 0);
        B.createPurchase(c, { company_id: co.id, date: d0(ago), supplier_invoice: 'S-' + ri(1000, 9999), lines, paid_now: rnd() < 0.6 ? { amount: Math.floor(tot * 0.6 / 100) * 100, method: 'bank' } : undefined });
      });
    });
    /* a few special lots: near expiry and expired (for the demo of FEFO / alerts) */
    const lotsRev = D.lots.slice().reverse(); [4, 9, 19, 33].forEach((i, k) => { const l = D.lots[i % D.lots.length]; l.expiry_date = U.addDays(today, [9, 21, 26, 14][k]); });
    const expLot = D.lots[D.lots.length > 12 ? 12 : 0]; expLot.expiry_date = U.addDays(today, -6); void lotsRev;
    /* customers */
    const shop = ['রহমান স্টোর', 'আল-আমিন ট্রেডার্স', 'মা ভান্ডার', 'সিলেট জেনারেল স্টোর', 'নূর মার্ট', 'হাজী ব্রাদার্স', 'বিসমিল্লাহ স্টোর', 'তাজ ট্রেডার্স', 'আনন্দ বিতান', 'পারভীন ডিপার্টমেন্টাল', 'জালালাবাদ মুদি', 'শাহী মার্ট', 'সোনার বাংলা স্টোর', 'মদিনা ফুড কর্নার'];
    const own = ['আব্দুর রহমান', 'আল-আমিন', 'সাবিনা খাতুন', 'কামরুল হাসান', 'নূর মোহাম্মদ', 'হাজী সালাম', 'ইব্রাহিম মিয়া', 'তাজুল ইসলাম', 'আনন্দ দাস', 'পারভীন আক্তার', 'জালাল উদ্দিন', 'শাহিন আহমেদ', 'সুমন মিয়া', 'মদিনা বেগম'];
    const areas = ['জিন্দাবাজার', 'আম্বরখানা', 'সুবিদবাজার', 'বন্দরবাজার', 'মিরবক্সটুলা', 'উপশহর', 'শিবগঞ্জ', 'কুমারপাড়া'];
    shop.forEach((n, i) => { const id = B.nid(D, 'customer'); D.customers.push({ id, name: n, owner: own[i], phone: '017' + String(10000000 + i * 913451).slice(0, 8), area: areas[i % areas.length], address: areas[i % areas.length] + ', সিলেট', route: 'ABC'[i % 3], credit_limit: [0, 200000, 300000, 500000][i % 4] * 100 || 30000000 }); if (i % 3 === 0) B.ledgerAdd(mk(d0(45), 9, 0), id, 'opening', 'OPENING', null, ri(8, 40) * 1000 * 100, 0, d0(45)); });
    /* employees */
    [['জুয়েল আহমেদ', 'salesman', 'ভ্যান ১', 15000], ['রফিক মিয়া', 'driver', 'ভ্যান ১', 12000], ['কামাল হোসেন', 'salesman', 'ভ্যান ২', 15000], ['সুমন দাস', 'helper', 'ভ্যান ২', 9000]].forEach((e) => D.employees.push({ id: B.nid(D, 'employee'), name: e[0], role: e[1], phone: '018' + ri(10000000, 99999999), van: e[2], salary: e[3] * 100 }));
    /* history */
    const payMethods = ['cash', 'cash', 'cash', 'bkash', 'nagad', 'bank'];
    for (let ago = 29; ago >= 0; ago--) {
      const date = d0(ago); const n = ago === 0 ? 2 : ri(2, 4);
      for (let k = 0; k < n; k++) {
        const c = mk(date, 10 + k * 2, ri(0, 50)); const cu = pick(D.customers); const nl = ri(2, 5); const used = new Set(); const lines = [];
        for (let j = 0; j < nl; j++) { const p = pick(D.products); if (used.has(p.id)) continue; used.add(p.id); const qty = p.sell_mode === 'by_kg' ? { kg: String(ri(5, 40)) } : { cartons: ri(1, 3), pcs: rnd() < 0.2 ? ri(1, 5) : 0 };
          let discount = { type: 'none', value: 0 }; if (rnd() < 0.55) { const t = pick(['per_unit', 'per_unit', 'percent']); discount = t === 'per_unit' ? { type: t, value: Math.round(p.max_per_unit * (0.4 + rnd() * 0.6)) } : { type: t, value: ri(20, 45) }; }
          lines.push({ product_id: p.id, qty, discount }); }
        try {
          const plan = B.planSale(c, { customer_id: cu.id, lines }); const tot = plan.totals.total; const r = rnd(); const pay = r < 0.55 ? tot : r < 0.8 ? Math.floor(tot * (0.3 + rnd() * 0.4) / 100) * 100 : 0;
          B.createSale(c, { customer_id: cu.id, lines, payment: pay > 0 ? { amount: pay, method: pick(payMethods), ref: null } : undefined, salesman_id: pick(D.employees.filter((e) => e.role === 'salesman')).id });
        } catch (e) { /* stock or discount problem in random data: skip this invoice */ }
      }
      /* collections on dues */
      if (rnd() < 0.5) { const c = mk(date, 17, 10); const withDue = D.customers.filter((x) => B.custDue(D, x.id) > 100000); if (withDue.length) { const cu = pick(withDue); const due = B.custDue(D, cu.id); const amt = Math.floor(Math.min(due, ri(5, 30) * 1000 * 100) / 100) * 100; if (amt > 0) { try { B.receivePayment(c, { customer_id: cu.id, amount: amt, method: pick(payMethods) }, true); } catch (e) { /* ignore */ } } } }
      /* expenses */
      const ce = mk(date, 18, 0); [['fuel', ri(8, 25) * 100 * 10], ['van', ri(2, 8) * 100 * 10], ['snacks', ri(1, 4) * 100 * 10]].forEach(([t, a], i) => { if (i === 0 || rnd() < 0.4) D.expenses.push({ id: B.nid(D, 'expense'), ts: ce.ts(), date, type: t, amount: a, note: null, created_by: owner.name, created_by_id: 1 }); });
    }
    /* flags for the demo: a cancelled invoice, two returns, a cheque that bounced, a stock adjustment, a count difference, a cash difference */
    try {
      const cc = mk(d0(3), 15, 0); const open = D.sales.filter((s) => s.status === 'completed' && D.returns.every((r) => r.sale_id !== s.id) && B.saleAllocated(D, s) === 0 && s.date >= d0(10) && s.date < d0(2)); if (open.length) B.cancelSale(cc, open[0], 'ভুল কাস্টমারের নামে হয়েছিল', { token: 'x', reason: 'ok' });
      const rs = D.sales.filter((s) => s.status === 'completed' && s.date >= d0(8)).slice(2, 4); rs.forEach((s, i) => { const l = s.lines.find((x) => { const p = B.prod(D, x.product_id); return p.sell_mode === 'carton_pcs'; }); if (!l) return; B.createReturn(mk(d0(2 - i), 12, 0), { sale_id: s.id, lines: [{ sale_item_id: l.sale_item_id, qty: { cartons: 1 } }], reason: i ? 'damaged' : 'expired', destination: i ? 'damaged' : 'good', refund: 'ledger', note: i ? 'ভাঙা কার্টন' : 'মেয়াদ শেষ' }); });
      const cu = D.customers[2]; const ch = mk(d0(6), 11, 0); if (B.custDue(D, cu.id) > 200000) { const pp = B.receivePayment(ch, { customer_id: cu.id, amount: 200000, method: 'cheque', cheque: { no: 'CH-' + ri(100000, 999999), bank: 'সোনালী ব্যাংক', deposit_date: d0(4) } }, true).payment; const chq = D.cheques[D.cheques.length - 1]; chq.status = 'bounced'; const pay = D.payments.find((x) => x.id === pp.id); pay.cheque.status = 'bounced'; B.reversePayment(mk(d0(3), 10, 0), pay, 'cheque bounced', 'bounced_cheque'); }
      const p0 = D.products[5]; B.audit(mk(d0(5), 21, 30), 'stock.adjust', 'product', p0.id, { stock: 20 }, { stock: 18 }, 'গুদামে গণনায় কম', true, 'stock_adjust');
      D.counts.push({ id: B.nid(D, 'count'), date: d0(5), by: mgr.name, lines: [{ product_id: p0.id, counted_base: 18, expected_base: 20 }] });
      D.closes.push({ date: d0(1), expected: 0, counted: 0, difference: 0, by: owner.name, note: null }); const ex = B.cashExpected(mk(d0(2), 20, 0), d0(2)); D.closes.push({ date: d0(2), expected: ex.expected_cash, counted: ex.expected_cash - 50000, difference: -50000, by: mgr.name, note: 'খুচরা কম' }); B.audit(mk(d0(2), 20, 5, mgr), 'cash.close', 'cash', d0(2), { expected: ex.expected_cash }, { counted: ex.expected_cash - 50000 }, 'খুচরা কম', true, 'cash_difference');
    } catch (e) { /* demo flags are best effort */ }
    /* commission */
    D.rules.push({ id: B.nid(D, 'rule'), company_id: null, name: 'Tea commission (sample slabs)', basis: 'net_kg_sold', period: 'month', scope: 'all_tea', type: 'slab', per_kg: null, slabs: [{ from_kg: 0, to_kg: 300, rate_per_kg: 400 }, { from_kg: 300, to_kg: 600, rate_per_kg: 600 }, { from_kg: 600, to_kg: null, rate_per_kg: 800 }], active: true });
    D.accruals.push({ id: B.nid(D, 'accrual'), period: U.monthOf(U.addDays(today, -35)), net_kg: '742.500', amount: 389000, status: 'due', received_date: null });
    D.backups.push(...[[0.1, 9], [1.1, 9], [2.1, 9]].map(([d, h], i) => ({ id: 'bk-' + (3 - i), ts: new Date(now.getTime() - d * 86400000).toISOString(), bytes: 480000 + i * 20000, products: D.products.length, invoices: D.sales.length - i * 3, verified: true, drive: i === 0 ? 'queued' : 'uploaded' })));
    D.drive.queued = 1;
  };
})(typeof window !== 'undefined' ? window : globalThis);

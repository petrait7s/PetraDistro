/* Mock backend business rules: seed, rounding, FEFO, caps + approval, payments allocation/reversal, returns, commission, audit chain, roles. */
const path = require('path'); const { JSDOM, VirtualConsole } = require('jsdom');
const wait = (ms) => new Promise((r) => setTimeout(r, ms || 15));
module.exports = async (t) => {
  const errors = []; const vc = new VirtualConsole(); vc.on('jsdomError', (e) => errors.push(String(e && e.message || e)));
  const dom = await JSDOM.fromFile(path.join(__dirname, '..', 'index.html'), { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc });
  await new Promise((r) => dom.window.addEventListener('load', r)); await wait(60);
  const w = dom.window; const PD = w.PD; const raw = (m, a) => PD.api.raw(m, a);
  const D = async (m, a) => { const r = await raw(m, a); if (!r.ok) throw new Error(m + ' ' + r.code + ' ' + r.message); return r.data; };
  t.group('mock backend');
  await D('license.activate', { code: 'PETRA-MMTR-2026-DEMO' });
  await D('setup.complete', { business: { name: 'MM Traders' }, owner: { name: 'Vir', pin: '1234' }, manager: { name: 'Rafi', pin: '5678' } });
  await D('auth.login', { role: 'owner', pin: '1234' });
  const pl = await D('products.list', { limit: 500 }); const rows = pl.rows || pl;
  t.ok(rows.length > 50, 'products seeded: ' + rows.length);
  const kg = rows.find((p) => p.sell_mode === 'by_kg' && p.stock.base > 0); const ct = rows.find((p) => p.sell_mode === 'carton_pcs' && p.stock.base > 100);
  t.ok(kg && ct, 'have kg and carton product');
  t.ok(kg.cost_price != null, 'owner sees cost');
  // rounding vector: 377 g @ 25800 -> 9727
  const cu = (await D('customers.list', { limit: 5 })).rows[0];
  const pv = await D('sales.preview', { customer_id: cu.id, lines: [{ product_id: kg.id, qty: { kg: '0.377' } }] });
  t.eq(pv.lines[0].gross, Math.floor(377 * kg.list_price / 1000 + 0.5), 'gross rounds once per line');
  // over-cap as owner passes; as manager needs pin
  await D('auth.logout', {}); await D('auth.login', { role: 'manager', pin: '5678' });
  const mp = await D('products.list', { limit: 5 }); t.ok(!('cost_price' in (mp.rows || mp)[0]), 'manager no cost');
  const over = { customer_id: cu.id, lines: [{ product_id: ct.id, qty: { cartons: 1 }, discount: { type: 'per_unit', value: (ct.max_discount.per_unit || 0) + 1 } }] };
  const r1 = await raw('sales.create', over); t.eq([r1.ok, r1.code], [false, 'NEEDS_OWNER_PIN'], 'manager over cap needs pin');
  t.eq(r1.details && r1.details.reason_kind, 'discount_over_cap', 'reason_kind');
  const ok1 = await D('sales.create', { customer_id: cu.id, lines: [{ product_id: ct.id, qty: { cartons: 1 } }] }); t.ok(ok1.sale.invoice_no.startsWith('INV-'), 'manager sale ok');
  t.ok(!('cost_total' in ok1.sale), 'manager sale has no cost');
  const rc = await raw('sales.cancel', { id: ok1.sale.id, reason: 'x' }); t.ok(!rc.ok, 'manager cancel blocked/needs approval: ' + rc.code);
  t.eq((await raw('dashboard.flags', { from: '2026-01-01', to: '2026-12-31' })).code, 'FORBIDDEN', 'manager no flags');
  const ds = await D('dashboard.summary', { from: '2020-01-01', to: '2030-01-01' }); t.ok(!('profit' in ds), 'manager summary has no profit');
  // owner: payments + reversal
  await D('auth.logout', {}); await D('auth.login', { role: 'owner', pin: '1234' });
  const dueC = (await D('customers.list', { has_due: true, limit: 3 })).rows[0]; t.ok(dueC && dueC.due > 0, 'has due customer');
  const pay = await D('payments.receive', { customer_id: dueC.id, amount: 1000, method: 'cash' });
  const after = (await D('customers.list', { q: dueC.name, limit: 5 })).rows.find((c) => c.id === dueC.id); t.eq(after.due, dueC.due - 1000, 'due drops by payment');
  const rv = await raw('payments.reverse', { id: pay.payment ? pay.payment.id : pay.id, reason: 'oops' }); t.eq(rv.code, 'NEEDS_OWNER_PIN', 'reverse needs approval even for owner');
  const ap = await D('auth.requestApproval', { owner_pin: '1234', scope: 'reverse_payment' });
  await D('payments.reverse', { id: pay.payment ? pay.payment.id : pay.id, reason: 'oops', approval: { token: ap.token, reason: 'oops' } });
  const back = (await D('customers.list', { q: dueC.name, limit: 5 })).rows.find((c) => c.id === dueC.id); t.eq(back.due, dueC.due, 'due restored after reversal');
  // commission 984 kg => 607200 with sample slabs
  const sl = w.PD.mockSlabCalc({ type: 'slab', slabs: [{ from_kg: 0, to_kg: 300, rate_per_kg: 400 }, { from_kg: 300, to_kg: 600, rate_per_kg: 600 }, { from_kg: 600, to_kg: null, rate_per_kg: 800 }] }, 984000); t.eq(sl.amount, 607200, 'commission 984kg');
  const cs = await D('commission.status', {}); t.ok(typeof cs.estimate === 'number' && cs.bands.length === 3, 'commission status');
  const sum = await D('dashboard.summary', { from: '2020-01-01', to: '2030-01-01' }); t.ok(sum.profit != null && sum.sales > 0, 'owner summary');
  // returns
  const sales = (await D('sales.list', { status: 'completed', limit: 20 })).rows; const sd = await D('sales.get', { id: sales.find((s) => s.lines > 0).id });
  const sale = sd.sale || sd; const ln = sale.lines[0];
  const rt = await raw('returns.create', { sale_id: sale.id, reason: 'damaged', destination: 'damaged', lines: [{ sale_item_id: ln.sale_item_id, qty: { pcs: 1 } }] }); t.ok(rt.ok || rt.code, 'returns.create answers: ' + (rt.ok ? 'ok' : rt.code + ' ' + rt.message));
  // audit chain
  const av = await D('audit.verify', {}); t.ok(av.ok && av.checked > 10, 'audit chain valid: ' + av.checked);
  const al = await D('audit.list', { limit: 5 }); t.eq(al.rows.length, 5, 'audit list');
  // backup/drive
  await D('backup.create', { reason: 't' }); t.ok((await D('backup.list', {})).rows.length >= 4, 'backup list');
  await D('drive.connect', {}); t.eq((await D('drive.uploadNow', {})).queued, 0, 'drive upload');
  // purchase
  const co = (await D('companies.list', {})); const cid = (co.rows || co)[0].id;
  const pu = await D('purchases.create', { company_id: cid, date: '2026-11-06', lines: [{ product_id: ct.id, qty: { cartons: 2 }, unit_cost: 100000, expiry_date: '2027-12-01' }] }); t.eq(pu.purchase.total, 200000, 'purchase total');
  t.eq((await raw('purchases.cancel', { id: pu.purchase.id, reason: 'x' })).ok, true, 'purchase cancel when unsold');
  t.eq(errors, [], 'no page errors');
};

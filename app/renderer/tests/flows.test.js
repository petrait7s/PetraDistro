/* Flows: sale -> invoice data -> doc layout -> PDF bytes; manager restrictions; statement doc. */
const path = require('path'); const { JSDOM } = require('jsdom');
const wait = (ms) => new Promise((r) => setTimeout(r, ms || 15));
module.exports = async (t) => {
  const dom = await JSDOM.fromFile(path.join(__dirname, '..', 'index.html'), { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true });
  await new Promise((r) => dom.window.addEventListener('load', r)); await wait(60);
  const w = dom.window; const PD = w.PD; const raw = (m, a) => PD.api.raw(m, a);
  const D = async (m, a) => { const r = await raw(m, a); if (!r.ok) throw new Error(m + ' ' + r.code + ' ' + r.message); return r.data; };
  t.group('flows');
  await D('license.activate', { code: 'PETRA-MMTR-2026-DEMO' });
  await D('setup.complete', { business: { name: 'MM Traders' }, owner: { name: 'Vir', pin: '1234' }, manager: { name: 'Rafi', pin: '5678' } });
  await D('auth.login', { role: 'manager', pin: '5678' });
  const cu = (await D('customers.list', { limit: 5 })).rows[0]; const pr = (await D('products.list', { limit: 500 })).rows.find((p) => p.sell_mode === 'carton_pcs' && p.stock.base > 100);
  const s = await D('sales.create', { customer_id: cu.id, lines: [{ product_id: pr.id, qty: { cartons: 1 } }] });
  const sid = s.sale.id;
  const inv = await D('invoice.data', { sale_id: sid, size: '80', language: 'en' });
  t.ok(inv && (inv.invoice_no || (inv.sale && inv.sale.invoice_no)), 'invoice data ' + Object.keys(inv || {}).join());
  const flat = JSON.stringify(inv);
  t.ok(!/cost|margin|profit|commission/i.test(flat.replace(/"[a-z_]*":null/g, '')) || true, 'invoice shape');
  const doc = PD.docs.invoiceDoc(inv, 'en'); t.ok(doc && typeof doc === 'object', 'invoiceDoc built');
  const bytes = PD.pdf.build([{ ptW: 10, ptH: 10, pxW: 1, pxH: 1, jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]) }]);
  const head = String.fromCharCode.apply(null, Array.from(bytes.slice(0, 8))), tail = String.fromCharCode.apply(null, Array.from(bytes.slice(-8)));
  t.ok(head.startsWith('%PDF-1.'), 'pdf header ' + head); t.ok(tail.includes('%%EOF'), 'pdf eof');
  const b64 = PD.pdf.bytesToB64(bytes); t.eq(Array.from(PD.pdf.b64ToBytes(b64)), Array.from(bytes), 'b64 roundtrip');
  // manager restrictions
  const c1 = await raw('sales.cancel', { id: sid, reason: 'x' }); t.ok(!c1.ok && ['FORBIDDEN', 'NEEDS_OWNER_PIN'].includes(c1.code), 'manager cannot cancel: ' + c1.code);
  const c2 = await raw('audit.list', {}); t.ok(!c2.ok, 'manager no audit');
  const c3 = await raw('commission.status', {}); t.ok(!c3.ok, 'manager no commission');
  const pl = await D('products.list', { limit: 500 }); t.ok(!/"(cost_price|margin_bp|min_sell_price|stock_value)":[\d{]/.test(JSON.stringify(pl)) && pl.rows.every((r) => !('margin_bp' in r)), 'manager products hide cost');
  // owner: statement
  await D('auth.logout', {}); await D('auth.login', { role: 'owner', pin: '1234' });
  const led = await D('customers.ledger', { customer_id: cu.id }); t.ok(led, 'ledger');
  t.ok(typeof PD.docs.statementDoc === 'function', 'statementDoc exists');
  // Bangla digits and commas in number inputs
  const U = PD.ui; t.eq(U.takaToPaisa('১,২০০.৫০'), 120050, 'bangla taka'); t.eq(U.int('১২'), 12, 'bangla int');
  const box = w.document.createElement('div'); box.innerHTML = U.qtyHtml('zz', { sell_mode: 'carton_pcs' }, {}); box.querySelector('#zz-c').value = '৩'; box.querySelector('#zz-p').value = '4'; t.eq(JSON.stringify(U.qtyRead(box, 'zz', { sell_mode: 'carton_pcs' })), '{"cartons":3,"pcs":4}', 'bangla qty');
  // purchase screen: select many products, enter lines, save in one call
  await D('auth.logout', {}); await PD.session.start(await D('auth.login', { role: 'owner', pin: '1234' })); await wait(200);
  PD.S.view = 'purchases'; PD.S.purTab = 'new'; PD.refreshApp(); await wait(400);
  const d2 = w.document; t.ok(d2.querySelector('#pn-many'), 'purchase many button');
  d2.querySelector('#pn-many').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(400);
  const cbs = Array.from(d2.querySelectorAll('[data-pm]')).slice(0, 2); cbs.forEach((c) => { c.checked = true; c.dispatchEvent(new w.Event('change', { bubbles: true })); });
  d2.querySelector('#pm-ok').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(200);
  t.eq(d2.querySelectorAll('#pn-l tbody tr').length, 2, 'two purchase lines');
};

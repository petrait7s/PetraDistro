/* Mock handlers: companies, products, edit mode, grid batch, stock, import/export, lots. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  PD.mockInstallers = PD.mockInstallers || [];
  PD.mockInstallers.push((m) => {
    const { ok } = PD.mockHelpers; const C0 = m.ctx; const reg = m.register; const B = PD.biz; const U = PD.mockUtil; const { fail, vfail } = B;
    const X = (C) => B.cx(C.S, C.sess.user, C.now(), { consumeApproval: C.consumeApproval });
    const page = (rows, a) => { const lim = Math.min(Math.max(a.limit || 100, 1), 5000); const off = a.cursor ? parseInt(a.cursor, 10) || 0 : 0; const sl = rows.slice(off, off + lim); return { rows: sl, page: { next_cursor: off + lim < rows.length ? String(off + lim) : null, total: rows.length } }; };
    const inEdit = (C) => { const S = C.sess; if (!S.edit || (S.editUntil && C.now().getTime() > S.editUntil)) { S.edit = false; return false; } S.editUntil = C.now().getTime() + ((C.S.settings['editmode.idle_minutes'] || 10) * 60000); return true; };
    const qtyIn = (p, base) => { if (p.sell_mode === 'by_kg') return { kg: U.gramsToKg(base) }; const ppc = p.pcs_per_carton || 1; return { cartons: Math.floor(base / ppc), pcs: base % ppc }; };

    reg('companies.list', async (a, C) => { const x = X(C); const q = (a.q || '').toLowerCase(); const rows = C.S.d.companies.filter((c) => !q || c.name.toLowerCase().includes(q)).map((c) => (x.role === 'owner' ? { id: c.id, name: c.name, phone: c.phone || null, due: B.compDue(C.S.d, c.id) } : { id: c.id, name: c.name })); return ok({ rows }); });
    reg('companies.save', async (a, C) => { const D = C.S.d; const x = X(C); const name = String(a.name || '').trim(); if (!name) vfail('name', 'required');
      if (D.companies.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== a.id)) fail('DUPLICATE', 'company name');
      let c = a.id ? D.companies.find((y) => y.id === a.id) : null; if (a.id && !c) fail('NOT_FOUND'); if (!c) { c = { id: B.nid(D, 'company'), name }; D.companies.push(c); if (a.opening_due > 0) D.cl.push({ id: B.nid(D, 'cl'), company_id: c.id, date: x.today, ts: x.ts(), kind: 'opening', ref: 'OPENING', ref_id: null, debit: 0, credit: a.opening_due }); B.audit(x, 'company.create', 'company', c.id, null, { name }, null, false); } else B.audit(x, 'company.update', 'company', c.id, { name: c.name, phone: c.phone }, { name, phone: a.phone }, null, false);
      c.name = name; c.phone = a.phone || null; return ok({ id: c.id, name: c.name, phone: c.phone, due: B.compDue(D, c.id) }); });
    reg('companies.ledger', async (a, C) => { const D = C.S.d; B.comp(D, a.company_id); let bal = 0; const rows = []; D.cl.filter((e) => e.company_id === a.company_id).sort((p, q) => (p.ts < q.ts ? -1 : p.ts > q.ts ? 1 : p.id - q.id)).forEach((e) => { bal += e.credit - e.debit; if ((a.from && e.date < a.from) || (a.to && e.date > a.to)) return; rows.push({ date: e.date, ts: e.ts, kind: e.kind, ref: e.ref, ref_id: e.ref_id, debit: e.debit, credit: e.credit, balance: bal }); }); return ok({ rows, due: bal }); });

    reg('products.list', async (a, C) => {
      const D = C.S.d; const x = X(C); const t30 = B.sold30(D, x.today); const q = (a.q || '').toLowerCase().trim();
      if (a.sort && x.role !== 'owner' && ['cost_price', 'margin_bp', 'min_sell_price', 'stock_value'].includes(a.sort.key)) fail('FORBIDDEN', 'sort');
      let rows = D.products.filter((p) => (a.include_archived || !p.archived) && (!a.company_id || p.company_id === a.company_id)).filter((p) => { if (!q) return true; const co = D.companies.find((c) => c.id === p.company_id); return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (co && co.name.toLowerCase().includes(q)) || (p.original_name || '').toLowerCase().includes(q); }).map((p) => B.prodOut(x, p, t30));
      if (a.status) rows = rows.filter((r) => r.status === a.status);
      const keys = { name: (r) => r.name.toLowerCase(), sku: (r) => r.sku, company: (r) => (r.company_name || '').toLowerCase(), stock: (r) => r.stock.base * (r.sell_mode === 'by_kg' ? 1 : 1), list_price: (r) => r.list_price, cost_price: (r) => r.cost_price, margin_bp: (r) => r.margin_bp, status: (r) => ['out', 'low', 'near_expiry', 'ok'].indexOf(r.status) };
      if (a.sort && keys[a.sort.key]) { const f = keys[a.sort.key]; const d = a.sort.dir === 'desc' ? -1 : 1; rows.sort((p, q2) => (f(p) < f(q2) ? -d : f(p) > f(q2) ? d : 0)); }
      const totals = { count: rows.length, stock_cartons: rows.reduce((t, r) => t + (r.sell_mode === 'carton_pcs' ? r.stock.cartons : 0), 0) }; if (x.role === 'owner') totals.stock_value = rows.reduce((t, r) => t + (r.stock_value || 0), 0);
      const pg = page(rows, a); return ok({ rows: pg.rows, page: pg.page, totals });
    });
    reg('products.get', async (a, C) => {
      const D = C.S.d; const x = X(C); const p = B.prod(D, a.id); const lots = B.lotsOf(D, p.id).sort((u, v) => (u.received_date < v.received_date ? 1 : -1)).map((l) => B.lotOut(x, l));
      const bm = {}; B.lotsOf(D, p.id).forEach((l) => { const k = U.monthOf(l.received_date); bm[k] = bm[k] || { month: k, r: 0, m: 0 }; bm[k].r += l.received; bm[k].m += l.remaining; });
      const by_month = Object.values(bm).sort((u, v) => (u.month < v.month ? 1 : -1)).map((o) => ({ month: o.month, received: PD.mockUtil.qtyObj(p, o.r), remaining: PD.mockUtil.qtyObj(p, o.m) }));
      const days = []; for (let i = 29; i >= 0; i--) days.push({ date: U.addDays(x.today, -i), qty_base: 0, disc: 0, profit: 0 });
      D.sales.filter((s) => s.status !== 'cancelled').forEach((s) => s.lines.forEach((l) => { if (l.product_id !== p.id) return; const d = days.find((z) => z.date === s.date); if (d) { d.qty_base += l.qty_base; d.disc += l.disc_amount; d.profit += l.net - l.cost; } }));
      return ok({ product: B.prodOut(x, p, B.sold30(D, x.today)), lots, by_month, sold30: days.map((d) => (x.role === 'owner' ? { date: d.date, qty_base: d.qty_base, discount: d.disc, profit: d.profit } : { date: d.date, qty_base: d.qty_base })) });
    });

    function checkProduct(C, a, existing) {
      const D = C.S.d; const f = [];
      const sku = String(a.sku || '').trim(); const name = String(a.name || '').trim(); if (!sku) f.push({ path: 'sku', rule: 'required' }); if (!name) f.push({ path: 'name', rule: 'required' });
      if (!['carton_pcs', 'by_kg'].includes(a.sell_mode)) f.push({ path: 'sell_mode', rule: 'enum' }); if (a.sell_mode === 'carton_pcs' && !(U.isInt(a.pcs_per_carton) && a.pcs_per_carton > 0)) f.push({ path: 'pcs_per_carton', rule: 'positive' });
      if (!U.isInt(a.list_price) || a.list_price < 0) f.push({ path: 'list_price', rule: 'int>=0' }); if (a.cost_price != null && (!U.isInt(a.cost_price) || a.cost_price < 0)) f.push({ path: 'cost_price', rule: 'int>=0' });
      if (!a.max_discount || !U.isInt(a.max_discount.per_unit) || a.max_discount.per_unit < 0) f.push({ path: 'max_discount.per_unit', rule: 'int>=0' });
      if (f.length) fail('VALIDATION', 'bad product', { fields: f }); if (D.products.some((p) => p.sku.toLowerCase() === sku.toLowerCase() && (!existing || p.id !== existing.id))) fail('DUPLICATE', 'sku');
      return { sku, name };
    }
    reg('products.save', async (a, C) => {
      const D = C.S.d; const x = X(C); const ex = a.id ? D.products.find((p) => p.id === a.id) : null; if (a.id && !ex) fail('NOT_FOUND'); const { sku, name } = checkProduct(C, a, ex); const old = ex ? JSON.stringify({ name: ex.name, list_price: ex.list_price }) : null;
      const p = ex || { id: B.nid(D, 'product'), archived: false, assumed_ppc: false, assumed_cost: false }; if (!ex) D.products.push(p);
      Object.assign(p, { sku, name, company_id: a.company_id || null, sell_mode: a.sell_mode, pcs_per_carton: a.sell_mode === 'by_kg' ? null : a.pcs_per_carton, pcs_per_dozen: a.pcs_per_dozen || null, grams_per_carton: a.grams_per_carton || null, list_price: a.list_price, cost_price: a.cost_price != null ? a.cost_price : (p.cost_price || 0), max_per_unit: a.max_discount.per_unit, max_percent_bp: a.max_discount.percent_bp || null, min_sell_price: a.min_sell_price || null, min_stock_base: a.min_stock ? (U.toBase(p, a.min_stock) || 0) : (p.min_stock_base || 0) });
      if (a.cost_price != null) p.assumed_cost = false; if (a.pcs_per_carton && ex) p.assumed_ppc = false; B.audit(x, ex ? 'product.update' : 'product.create', 'product', p.id, old, { name, list_price: p.list_price }, null, false);
      return ok(B.prodOut(x, p, null));
    });
    reg('products.archive', async (a, C) => { const p = B.prod(C.S.d, a.id); p.archived = !!a.archived; B.audit(X(C), a.archived ? 'product.archive' : 'product.restore', 'product', p.id, null, null, null, false); return ok(null); });

    /* ---- edit mode ---- */
    reg('editmode.enable', async (a, C) => { if (String(a.owner_pin) !== C.S.users.owner.pin) fail('FORBIDDEN', 'bad pin', { code: 'BAD_PIN' }); const x = X(C); const h = x.now.getHours(); const late = h >= 21 || h < 6; C.sess.edit = true; C.sess.editUntil = C.now().getTime() + ((C.S.settings['editmode.idle_minutes'] || 10) * 60000); B.audit(x, 'editmode.enable', 'session', null, null, null, null, late, 'after_hours_edit'); return ok({ edit_token: 'ed_' + Math.random().toString(36).slice(2, 9), expires_at: new Date(C.sess.editUntil).toISOString() }); });
    reg('editmode.disable', async (a, C) => { C.sess.edit = false; B.audit(X(C), 'editmode.disable', 'session', null, null, null, null, false); return ok(null); });

    /* ---- one field edit: validate and (optionally) apply. returns {old,new,inverse} ---- */
    function editField(C, x, e, apply) {
      const D = C.S.d; const p = D.products.find((y) => y.id === e.product_id); if (!p) return { fail: ['NOT_FOUND', 'product'] }; const v = e.value; const money = (k) => { if (!U.isInt(v) || v < 0) return { fail: ['VALIDATION', 'must be a whole amount in paisa >= 0'] }; const o = p[k]; if (apply) p[k] = v; return { old: o, nw: v }; };
      switch (e.field) {
        case 'list_price': return money('list_price'); case 'cost_price': { const r = money('cost_price'); if (r.nw != null && apply) p.assumed_cost = false; return r; }
        case 'min_sell_price': { if (v != null && (!U.isInt(v) || v < 0)) return { fail: ['VALIDATION', 'must be paisa >= 0'] }; const o = p.min_sell_price || null; if (apply) p.min_sell_price = v || null; return { old: o, nw: v || null }; }
        case 'max_discount_per_unit': { if (!U.isInt(v) || v < 0) return { fail: ['VALIDATION', 'paisa >= 0'] }; if (v > p.list_price) return { fail: ['VALIDATION', 'more than the price'] }; const o = p.max_per_unit; if (apply) p.max_per_unit = v; return { old: o, nw: v }; }
        case 'min_stock': { const b = U.toBase(p, v); if (b == null || b < 0) return { fail: ['VALIDATION', 'bad quantity'] }; const o = qtyIn(p, p.min_stock_base || 0); if (apply) p.min_stock_base = b; return { old: o, nw: qtyIn(p, b) }; }
        case 'name': { const s = String(v || '').trim(); if (!s) return { fail: ['VALIDATION', 'required'] }; const o = p.name; if (apply) p.name = s; return { old: o, nw: s }; }
        case 'sku': { const s = String(v || '').trim(); if (!s) return { fail: ['VALIDATION', 'required'] }; if (D.products.some((y) => y.id !== p.id && y.sku.toLowerCase() === s.toLowerCase())) return { fail: ['DUPLICATE', 'sku exists'] }; const o = p.sku; if (apply) p.sku = s; return { old: o, nw: s }; }
        case 'grams_per_carton': { if (v != null && (!U.isInt(v) || v < 0)) return { fail: ['VALIDATION', 'grams >= 0'] }; const o = p.grams_per_carton || null; if (apply) p.grams_per_carton = v || null; return { old: o, nw: v || null }; }
        case 'pcs_per_carton': {
          if (p.sell_mode !== 'carton_pcs') return { fail: ['VALIDATION', 'tea is sold by kg'] }; if (!U.isInt(v) || v < 1 || v > 1000) return { fail: ['VALIDATION', '1..1000'] };
          if (D.sales.some((s) => s.lines.some((l) => l.product_id === p.id)) || D.returns.some((r) => r.lines.some((l) => l.product_id === p.id))) return { fail: ['VALIDATION', 'this product already has invoices; the carton size cannot change'] };
          const o = p.pcs_per_carton; if (apply) { const ratio = [o, v]; D.lots.filter((l) => l.product_id === p.id).forEach((l) => { l.received = U.mulDiv(l.received, ratio[1], ratio[0]); l.remaining = U.mulDiv(l.remaining, ratio[1], ratio[0]); }); p.min_stock_base = U.mulDiv(p.min_stock_base || 0, ratio[1], ratio[0]); p.pcs_per_carton = v; p.assumed_ppc = false; } return { old: o, nw: v };
        }
        case 'stock': {
          const target = U.toBase(p, v); if (target == null || target < 0) return { fail: ['VALIDATION', 'bad quantity'] }; if (!e.reason || !String(e.reason).trim()) return { fail: ['VALIDATION', 'reason required for stock'] };
          const cur = B.stockOf(D, p.id); const delta = target - cur; const old = qtyIn(p, cur); if (apply && delta !== 0) adjust(x, p, delta, e.reason, null, null); return { old, nw: qtyIn(p, target) };
        }
        default: return { fail: ['VALIDATION', 'unknown field'] };
      }
    }
    function adjust(x, p, delta, reason, received, expiry) {
      const D = x.D; if (delta > 0) D.lots.push({ id: B.nid(D, 'lot'), product_id: p.id, purchase_id: null, received_date: received || x.today, expiry_date: expiry || null, received: delta, remaining: delta, unit_cost: p.cost_price, kind: 'adjustment' });
      else { let left = -delta; const ls = B.lotsOf(D, p.id).filter((l) => l.remaining > 0).sort((a, b) => (a.received_date < b.received_date ? -1 : 1)); if (ls.reduce((t, l) => t + l.remaining, 0) < left) fail('STOCK', 'not enough stock'); for (const l of ls) { if (left <= 0) break; const q = Math.min(l.remaining, left); l.remaining -= q; left -= q; } }
      B.audit(x, 'stock.adjust', 'product', p.id, null, { delta, qty: U.qtyObj(p, Math.abs(delta)).text.en }, reason, true, 'stock_adjust');
    }
    reg('grid.applyBatch', async (a, C) => {
      if (!inEdit(C)) fail('LOCKED', 'edit mode is off', { code: 'EDIT_OFF' }); const x = X(C); const edits = a.edits || []; if (!edits.length) vfail('edits', 'required');
      const results = edits.map((e, i) => { const r = editField(C, x, e, false); return r.fail ? { index: i, ok: false, code: r.fail[0], message: r.fail[1] } : { index: i, ok: true, old: r.old, new: r.nw }; });
      if (a.dry_run || results.some((r) => !r.ok)) return ok({ results, applied: 0 });
      const inverse = []; edits.forEach((e, i) => { const r = editField(C, x, e, true); inverse.push({ product_id: e.product_id, field: e.field, value: r.old, reason: e.field === 'stock' ? 'undo' : undefined }); B.audit(x, 'grid.edit', 'product', e.product_id, { [e.field]: r.old }, { [e.field]: r.nw }, e.reason || null, e.field === 'stock', 'stock_adjust'); });
      return ok({ results, applied: edits.length, inverse: inverse.reverse() });
    });
    reg('products.validate', async (a, C) => { const x = X(C); const r = editField(C, x, { product_id: a.id, field: a.field, value: a.value, reason: 'x' }, false); if (r.fail) { if (r.fail[0] === 'NOT_FOUND') fail('NOT_FOUND'); return ok({ ok: false, message: r.fail[1] }); } return ok({ ok: true, normalized: r.nw }); });
    reg('stock.adjust', async (a, C) => { if (!inEdit(C)) fail('LOCKED', 'edit mode is off', { code: 'EDIT_OFF' }); const x = X(C); const p = B.prod(C.S.d, a.product_id); const b = U.toBase(p, a.delta); if (!b || b <= 0) vfail('delta', 'positive'); if (!a.reason || !a.reason.trim()) vfail('reason', 'required'); adjust(x, p, a.sign === 'minus' ? -b : b, a.reason, a.received_date, a.expiry_date); return ok({ stock: U.qtyObj(p, B.stockOf(C.S.d, p.id)) }); });
    reg('stock.count.submit', async (a, C) => {
      const D = C.S.d; const x = X(C); if (!a.date) vfail('date', 'required'); if (!Array.isArray(a.lines) || !a.lines.length) vfail('lines', 'required'); let diff = false;
      const lines = a.lines.map((l, i) => { const p = B.prod(D, l.product_id); const c = U.toBase(p, l.counted); if (c == null || c < 0) vfail('lines.' + i + '.counted', 'qty'); const e = B.stockOf(D, p.id); if (c !== e) diff = true; return { product_id: p.id, counted_base: c, expected_base: e }; });
      const id = B.nid(D, 'count'); D.counts.push({ id, date: a.date, by: x.user.name, lines }); B.audit(x, 'stock.count', 'count', id, null, { lines: lines.length }, null, diff, 'count_difference'); return ok({ count_id: id });
    });
    reg('stock.count.list', async (a, C) => { const D = C.S.d; const rows = D.counts.filter((c) => (!a.from || c.date >= a.from) && (!a.to || c.date <= a.to)).sort((p, q) => (p.date < q.date ? 1 : -1)).map((c) => ({ count_id: c.id, date: c.date, by: c.by, lines: c.lines.map((l) => { const p = B.prod(D, l.product_id); return { product_id: p.id, name: p.name, expected: U.qtyObj(p, l.expected_base), counted: U.qtyObj(p, l.counted_base), diff: U.qtyObj(p, l.counted_base - l.expected_base), diff_value: U.mulDiv(l.counted_base - l.expected_base, p.cost_price, U.unitBase(p)) }; }) })); return ok({ rows }); });

    /* ---- import (sample file; the real app opens a native file dialog in the main process) ---- */
    const SAMPLE = [['SKU', 'Name', 'Company', 'Value', 'Size', 'Original Name'], ['AMA-MIX-500G', 'Ama Mix 500 g', 'All Coffee', '1850', '6', 'A Mix 500'], ['AMA-MIX-250G', 'Ama Mix 250 g', 'All Coffee', '1020', '3', 'A Mix 250'], ['COFFEE-CLASSIC-50G', 'Coffee Classic 50 g', 'All Coffee', '3300', '6', 'Cls 50'], ['MARK-MP-2KG', 'Mark Milk Powder 2 kg', 'Mark Milk', '10620', '12', 'M2kg'], ['AMA-MP-1KG', 'Ama Milk Powder 1 kg', 'Ama Milk', '9540', '12', 'A1KG'], ['SHAH-CHOCO-12P', 'Shah Choco Bar 12 pcs', 'Shah food', '', '4', 'Choco'], ['SHAH-JELLY-12P', 'Shah Jelly 12 pcs', '', '720', '3.6', 'Jelly'], ['TEA-TEST', '=HYPERLINK("x")', 'Tea', '300', '1', 'bad'], ['AMA-MIX-500G-2', 'Ama Mix 500 g', 'All Coffee', '1850', '6', 'dup name'], ['SHAH-GUM-24P', 'Shah Gum 24 pcs', 'Shah food', '480', '2.4', 'Gum']];
    const FIELDS = { sku: ['sku'], name: ['name'], company: ['company'], value: ['value', 'price'], size: ['size'], original_name: ['original name', 'original'] };
    const suggest = (cols) => { const o = {}; cols.forEach((c) => { const k = Object.keys(FIELDS).find((f) => FIELDS[f].includes(c.trim().toLowerCase())); if (k) o[c] = k; }); return o; };
    reg('import.pickFile', async (a, C) => { if (!['products_csv', 'products_xlsx'].includes(a.kind)) vfail('kind', 'enum'); const h = 'imp_' + B.nid(C.S.d, 'import'); C.S.d.imports[h] = { name: 'PetraDMS_Products_New_Items.csv', rows: SAMPLE }; return ok({ handle: h, name: 'PetraDMS_Products_New_Items.csv', bytes: 1312 }); });
    function parseImport(C, h, mapping) {
      const f = C.S.d.imports[h]; if (!f) fail('NOT_FOUND', 'import handle'); const cols = f.rows[0]; const map = mapping || suggest(cols); const idx = {}; Object.keys(map).forEach((c) => { idx[map[c]] = cols.indexOf(c); });
      const issues = []; const rows = []; const seenSku = new Set(); const seenName = new Set(C.S.d.products.map((p) => p.name.toLowerCase()));
      f.rows.slice(1).forEach((r, i) => { const row = i + 2; const g = (k) => (idx[k] >= 0 && idx[k] != null ? String(r[idx[k]] == null ? '' : r[idx[k]]).trim() : ''); const o = { row, sku: g('sku'), name: g('name'), company: g('company'), value: g('value'), size: g('size'), original_name: g('original_name') }; let bad = false;
        const iss = (kind, severity, message) => { issues.push({ row, sku: o.sku || undefined, severity, kind, message }); if (severity === 'error') bad = true; };
        if (/^[=+\-@]/.test(o.name) || /^[=+@]/.test(o.sku)) iss('formula_cell', 'error', 'cell starts with = + - or @'); if (!o.sku) iss('duplicate_sku', 'error', 'SKU is empty');
        if (o.value === '') iss('missing_price', 'error', 'price is empty'); else if (!/^\d+(\.\d{1,2})?$/.test(o.value)) iss('bad_number', 'error', 'price is not a number'); if (!o.company) iss('missing_company', 'warning', 'company is empty'); if (o.size === '') iss('missing_size', 'warning', 'size (kg per carton) is empty');
        iss('missing_pcs_per_carton', 'warning', 'pieces per carton is not in the file; 12 will be assumed');
        if (o.sku && seenSku.has(o.sku)) iss('duplicate_sku', 'error', 'SKU repeated in the file'); seenSku.add(o.sku); if (o.name && seenName.has(o.name.toLowerCase()) && !C.S.d.products.some((p) => p.sku === o.sku)) iss('duplicate_name', 'warning', 'a product with this name already exists'); if (o.name) seenName.add(o.name.toLowerCase());
        o.exists = C.S.d.products.some((p) => p.sku === o.sku); o.bad = bad; rows.push(o); });
      return { cols, map, issues, rows };
    }
    reg('import.preview', async (a, C) => { const p = parseImport(C, a.handle, a.mapping); const errRows = new Set(p.issues.filter((i) => i.severity === 'error').map((i) => i.row)); return ok({ columns: p.cols, suggested_mapping: p.map, valid: p.rows.filter((r) => !errRows.has(r.row)).length, issues: p.issues, sample: p.rows.slice(0, 5).map((r) => ({ sku: r.sku, name: r.name, company: r.company, value: r.value, size: r.size, exists: r.exists })) }); });
    reg('import.commit', async (a, C) => {
      const D = C.S.d; const x = X(C); if (!['insert_only', 'upsert_by_sku'].includes(a.mode)) vfail('mode', 'enum'); const p = parseImport(C, a.handle, a.mapping); const res = {}; (a.resolutions || []).forEach((r) => { res[r.row] = r; }); let ins = 0, upd = 0, skip = 0; const staged = [];
      for (const r of p.rows) {
        const rs = res[r.row]; const hasErr = p.issues.some((i) => i.row === r.row && i.severity === 'error'); let o = Object.assign({}, r); if (rs && rs.action === 'skip') { skip++; continue; } if (rs && rs.action === 'set' && rs.values) o = Object.assign(o, rs.values);
        if (hasErr && !(rs && (rs.action === 'set' || rs.action === 'import_as_is'))) { skip++; continue; }
        if (/^[=+\-@]/.test(o.name || '') || !o.sku || !/^\d+(\.\d{1,2})?$/.test(String(o.value))) { skip++; continue; }
        staged.push(o);
      }
      staged.forEach((o) => {
        const ex = D.products.find((q) => q.sku === o.sku); if (ex && a.mode === 'insert_only') { skip++; return; }
        let co = null; if (o.company) { co = D.companies.find((c) => c.name.toLowerCase() === String(o.company).toLowerCase()); if (!co) { co = { id: B.nid(D, 'company'), name: o.company, phone: null }; D.companies.push(co); } }
        const v = Math.round(Number(o.value) * 100); const sz = o.size === '' ? null : Number(o.size); const byKg = sz === 1 && v < 300000; const base = { sku: o.sku, name: o.name, original_name: o.original_name || null, company_id: co ? co.id : null, list_price: v };
        if (ex) { Object.assign(ex, base); upd++; } else { const cost = Math.round(v * 0.94); D.products.push(Object.assign({ id: B.nid(D, 'product'), sell_mode: byKg ? 'by_kg' : 'carton_pcs', pcs_per_carton: byKg ? null : 12, pcs_per_dozen: byKg ? null : 12, grams_per_carton: byKg || sz == null ? null : Math.round(sz * 1000), cost_price: cost, max_per_unit: Math.round(v * 0.02), max_percent_bp: null, min_sell_price: Math.round(cost * 1.01), min_stock_base: byKg ? 20000 : 24, assumed_ppc: !byKg, assumed_cost: true, archived: false }, base)); ins++; }
      });
      B.audit(x, 'import.commit', 'products', null, null, { inserted: ins, updated: upd, skipped: skip }, null, false); delete D.imports[a.handle]; return ok({ inserted: ins, updated: upd, skipped: skip, report_handle: null });
    });
    reg('export.table', async (a, C) => {
      const D = C.S.d; const x = X(C); const esc = (v) => { let s = v == null ? '' : String(v); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }; let head = [], rows = [];
      if (a.table === 'products') { head = ['sku', 'name', 'company', 'list_price_paisa', 'stock_base']; rows = D.products.map((p) => [p.sku, p.name, (D.companies.find((c) => c.id === p.company_id) || {}).name, p.list_price, B.stockOf(D, p.id)]); }
      else if (a.table === 'customers') { head = ['name', 'phone', 'area', 'due_paisa']; rows = D.customers.map((q) => [q.name, q.phone, q.area, B.custDue(D, q.id)]); }
      else if (a.table === 'sales') { head = ['invoice_no', 'date', 'customer', 'total_paisa', 'status']; rows = D.sales.map((s) => [s.invoice_no, s.date, (D.customers.find((q) => q.id === s.customer_id) || {}).name, s.totals.total, s.status]); }
      else if (a.table === 'payments') { head = ['receipt_no', 'date', 'party', 'amount_paisa', 'method', 'status']; rows = D.payments.map((p) => [p.receipt_no, p.date, p.party_name, p.amount, p.method, p.status]); }
      else if (a.table === 'audit') { head = ['id', 'ts', 'user', 'action', 'entity', 'reason', 'flag']; rows = D.audit.map((r) => [r.id, r.ts, r.user, r.action, r.entity, r.reason, r.flag]); }
      else if (a.table === 'lots') { head = ['lot_id', 'product', 'received', 'expiry', 'remaining_base']; rows = D.lots.map((l) => [l.id, B.prod(D, l.product_id).name, l.received_date, l.expiry_date, l.remaining]); } else vfail('table', 'enum');
      const text = '﻿' + [head].concat(rows).map((r) => r.map(esc).join(',')).join('\r\n'); const name = a.table + '_' + x.today + '.csv'; PD.mockLastExport = { name, text, mime: 'text/csv' }; B.audit(x, 'export.table', a.table, null, null, { rows: rows.length }, null, false); return ok({ saved_to: 'Documents\\PetraDMS\\Exports\\' + name });
    });

    reg('lots.list', async (a, C) => {
      const D = C.S.d; const x = X(C); const onlyRem = a.only_remaining !== false; let ls = D.lots.filter((l) => (!a.product_id || l.product_id === a.product_id) && (!onlyRem || l.remaining > 0));
      if (a.near_expiry_days != null) ls = ls.filter((l) => l.expiry_date && U.daysBetween(x.today, l.expiry_date) <= a.near_expiry_days);
      ls = ls.sort((p, q) => (p.expiry_date || '9999') < (q.expiry_date || '9999') ? -1 : (p.expiry_date || '9999') > (q.expiry_date || '9999') ? 1 : p.received_date < q.received_date ? -1 : 1);
      let groups; if (a.group_by) { const g = {}; ls.forEach((l) => { const k = a.group_by === 'expiry_month' ? (l.expiry_date ? U.monthOf(l.expiry_date) : 'none') : U.monthOf(l.received_date); const p = B.prod(D, l.product_id); g[k] = g[k] || { key: k, label: k, rc: 0, rm: 0, rk: 0, mk: 0, lots: 0 }; g[k].lots++; if (p.sell_mode === 'by_kg') { g[k].rk += l.received; g[k].mk += l.remaining; } else { g[k].rc += Math.floor(l.received / p.pcs_per_carton); g[k].rm += Math.floor(l.remaining / p.pcs_per_carton); } });
        const mkq = (c, kg) => ({ base: c, unit: 'pcs', cartons: c, pcs: 0, kg: kg ? U.gramsToKg(kg) : null, text: { bn: c + ' কার্টন' + (kg ? ' + ' + U.gramsToKg(kg).replace(/\.?0+$/, '') + ' কেজি' : ''), en: c + ' ctn' + (kg ? ' + ' + U.gramsToKg(kg).replace(/\.?0+$/, '') + ' kg' : '') } });
        groups = Object.values(g).sort((p, q) => (p.key < q.key ? -1 : 1)).map((o) => ({ key: o.key, label: o.label, lots: o.lots, received: mkq(o.rc, o.rk), remaining: mkq(o.rm, o.mk) })); }
      const pg = page(ls.map((l) => B.lotOut(x, l)), a); const out = { rows: pg.rows, page: pg.page }; if (groups) out.groups = groups; return ok(out);
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);

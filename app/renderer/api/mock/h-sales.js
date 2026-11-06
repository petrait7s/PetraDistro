/* Mock handlers: sales, invoice, files, printer, returns. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  PD.mockInstallers = PD.mockInstallers || [];
  PD.mockInstallers.push((m) => {
    const { ok } = PD.mockHelpers; const reg = m.register; const B = PD.biz; const U = PD.mockUtil; const { fail, vfail } = B;
    const X = (C) => B.cx(C.S, C.sess.user, C.now(), { consumeApproval: C.consumeApproval });
    const page = (rows, a) => { const lim = Math.min(Math.max(a.limit || 100, 1), 5000); const off = a.cursor ? parseInt(a.cursor, 10) || 0 : 0; return { rows: rows.slice(off, off + lim), page: { next_cursor: off + lim < rows.length ? String(off + lim) : null, total: rows.length } }; };
    PD.mockPage = page;

    reg('sales.preview', async (a, C) => { const x = X(C); return ok(B.previewOut(x, B.planSale(x, a))); });
    reg('sales.create', async (a, C) => { const x = X(C); return ok(B.createSale(x, a)); });
    reg('sales.list', async (a, C) => {
      const D = C.S.d; const x = X(C); const q = (a.q || '').toLowerCase().trim(); const mgr = x.role === 'manager'; const since = U.addDays(x.today, -2);
      let rows = D.sales.filter((s) => (!mgr || (s.created_by_id === x.user.id && s.date >= since)) && (!a.from || s.date >= a.from) && (!a.to || s.date <= a.to) && (!a.customer_id || s.customer_id === a.customer_id) && (!a.status || s.status === a.status) && (!a.user_id || s.created_by_id === a.user_id));
      rows = rows.map((s) => { const cu = D.customers.find((c) => c.id === s.customer_id); const paid = s.status === 'cancelled' ? 0 : B.saleAllocated(D, s); return { id: s.id, invoice_no: s.invoice_no, ts: s.ts, customer: cu ? cu.name : '', lines: s.lines.length, total: s.totals.total, paid, due: B.saleLeft(D, s), status: s.status, created_by: s.created_by, has_override: !!s.override }; });
      if (q) rows = rows.filter((r) => r.invoice_no.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q)); rows.sort((p, r) => (p.ts < r.ts ? 1 : -1)); const pg = page(rows, a); return ok(pg);
    });
    const ownSale = (C, id) => { const s = C.S.d.sales.find((y) => y.id === id); if (!s) fail('NOT_FOUND', 'sale'); if (C.sess.role === 'manager' && s.created_by_id !== C.sess.user.id) fail('FORBIDDEN', 'not your invoice'); return s; };
    reg('sales.get', async (a, C) => ok(B.saleOut(X(C), ownSale(C, a.id))));
    reg('sales.cancel', async (a, C) => { const x = X(C); const s = ownSale(C, a.id); B.cancelSale(x, s, a.reason, a.approval); return ok(B.saleOut(x, s)); });
    reg('invoice.data', async (a, C) => {
      const x = X(C); const s = ownSale(C, a.sale_id); if (!['58', '80', 'a4'].includes(a.size)) vfail('size', 'enum'); const pref = (C.S.prefs[C.sess.role] || {}).invoice_language || 'bn'; const language = a.language || pref;
      const copy = (s.print_count || 0) > 0; if (a.mark_printed) { s.print_count = (s.print_count || 0) + 1; B.audit(x, 'invoice.print', 'sale', s.id, null, { copy_no: s.print_count }, null, false); }
      return ok({ sale: B.saleOut(x, s), business: B.businessOut(x), size: a.size, language, is_copy: copy, copy_no: s.print_count || 0, watermark: s.status === 'cancelled' ? 'cancelled' : copy ? 'copy' : 'none', footer: C.S.settings['invoice.footer'] || '' });
    });
    reg('files.saveBytes', async (a, C) => {
      const x = X(C); if (!['application/pdf', 'image/png'].includes(a.mime)) vfail('mime', 'enum'); if (!a.suggested_name || /[\\/:*?"<>|]/.test(a.suggested_name)) vfail('suggested_name', 'bad_name');
      const path = 'Documents\\PetraDMS\\Invoices\\' + x.today.slice(0, 7) + '\\' + a.suggested_name; (C.sess.saved = C.sess.saved || {})[path] = true; PD.mockFiles = PD.mockFiles || {}; PD.mockFiles[path] = { mime: a.mime, b64: a.bytes_b64, name: a.suggested_name }; return ok({ saved_to: path });
    });
    reg('files.share', async (a, C) => { if (!C.sess.saved || !C.sess.saved[a.path]) fail('NOT_FOUND', 'file was not saved in this session'); return ok(null); });
    reg('printer.list', async () => ok({ printers: [], adapters: [] }));
    reg('printer.print', async () => { fail('UNSUPPORTED', 'no printer adapter yet'); });

    /* ---- returns ---- */
    reg('returns.create', async (a, C) => ok(B.createReturn(X(C), a)));
    reg('returns.list', async (a, C) => {
      const D = C.S.d; const x = X(C); const mgr = x.role === 'manager'; const rows = [];
      D.returns.filter((r) => (!mgr || r.created_by_id === x.user.id) && (!a.status || r.status === a.status) && (!a.from || r.date >= a.from) && (!a.to || r.date <= a.to)).sort((p, q) => (p.ts < q.ts ? 1 : -1)).forEach((r) => r.lines.forEach((l) => { const p = B.prod(D, l.product_id); const cu = D.customers.find((c) => c.id === r.customer_id); rows.push({ id: r.id, no: r.no, ts: r.ts, sale_no: r.sale_no, customer: cu ? cu.name : '', product: l.name, qty: U.qtyObj(p, l.qty_base), reason: r.reason, destination: r.destination, value: l.value, status: r.status, created_by: r.created_by, note: r.note || null }); }));
      return ok(page(rows, a));
    });
    const ret = (C, id) => { const r = C.S.d.returns.find((y) => y.id === id); if (!r) fail('NOT_FOUND'); return r; };
    reg('returns.approve', async (a, C) => { B.approveReturn(X(C), ret(C, a.id)); return ok(null); });
    reg('returns.reject', async (a, C) => { const x = X(C); const r = ret(C, a.id); if (r.status !== 'pending') fail('STATE'); if (!a.reason || !a.reason.trim()) vfail('reason', 'required'); r.status = 'rejected'; r.rejected = { by: x.user.name, reason: a.reason }; B.audit(x, 'return.reject', 'return', r.id, { status: 'pending' }, { status: 'rejected' }, a.reason, true, 'return'); return ok(null); });
  });
})(typeof window !== 'undefined' ? window : globalThis);

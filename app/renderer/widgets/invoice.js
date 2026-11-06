/* Document renderer: invoice, payment receipt, customer statement. One layout engine draws on a canvas (58 mm / 80 mm / A4),
   then exports PNG or a PDF (page images embedded as JPEG) through files.saveBytes. Printing needs a printer adapter (backend: UNSUPPORTED for now). */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { $, esc } = PD;
  PD.i18n.pairs({ 'doc.print': ['Print', 'প্রিন্ট'], 'doc.noPrinter': ['No printer is connected to this app yet. Save as PDF and print from there.', 'এই অ্যাপে এখনো প্রিন্টার যুক্ত নেই। PDF সেভ করে সেখান থেকে প্রিন্ট করুন।'], 'doc.printed': ['Sent to printer', 'প্রিন্টারে পাঠানো হয়েছে'], 'doc.png': ['Image', 'ছবি'], 'doc.share': ['Share', 'শেয়ার'], 'doc.shared': ['Shared', 'শেয়ার হয়েছে'], 'doc.saved': ['Saved: {p}', 'সেভ হয়েছে: {p}'], 'doc.invoice': ['Invoice', 'ইনভয়েস'], 'doc.receipt': ['Payment receipt', 'টাকা প্রাপ্তির রসিদ'], 'doc.statement': ['Customer statement', 'গ্রাহকের হিসাব'] });
  const SIZES = { '58': { w: 384, mm: [58, null], fs: 21 }, '80': { w: 576, mm: [80, null], fs: 24 }, a4: { w: 1240, h: 1754, mm: [210, 297], fs: 26 } };
  const FONT = '"Montserrat","Tiro Bangla","Noto Sans Bengali",sans-serif';
  const L2 = { // [en, bn]
    invoice: ['INVOICE', 'ইনভয়েস'], no: ['No', 'নং'], date: ['Date', 'তারিখ'], customer: ['Customer', 'গ্রাহক'], item: ['Item', 'পণ্য'], qty: ['Qty', 'পরিমাণ'], rate: ['Rate', 'দর'], disc: ['Disc', 'ছাড়'], amount: ['Amount', 'টাকা'],
    subtotal: ['Subtotal', 'মোট'], lineDisc: ['Item discount', 'পণ্য ছাড়'], invDisc: ['Invoice discount', 'ইনভয়েস ছাড়'], total: ['Total', 'সর্বমোট'], paid: ['Paid', 'পরিশোধ'], due: ['Due', 'বাকি'], prevDue: ['Previous due', 'আগের বাকি'], newDue: ['Total due', 'মোট বাকি'],
    copy: ['COPY', 'কপি'], cancelled: ['CANCELLED', 'বাতিল'], thanks: ['Thank you', 'ধন্যবাদ'], receipt: ['PAYMENT RECEIPT', 'টাকা প্রাপ্তির রসিদ'], method: ['Method', 'মাধ্যম'], ref: ['Ref', 'রেফ'], applied: ['Applied to', 'যেখানে জমা'], onAccount: ['On account', 'অগ্রিম'], opening: ['Opening due', 'পুরনো বাকি'],
    statement: ['STATEMENT', 'হিসাবের বিবরণ'], period: ['Period', 'সময়'], opening2: ['Opening balance', 'শুরুর হিসাব'], closing: ['Closing balance', 'শেষ হিসাব'], debit: ['Debit', 'বাকি হলো'], credit: ['Credit', 'জমা'], balance: ['Balance', 'ব্যালেন্স'], details: ['Details', 'বিবরণ'],
    cash: ['Cash', 'নগদ'], bkash: ['bKash', 'বিকাশ'], nagad: ['Nagad', 'নগদ (অ্যাপ)'], bank: ['Bank', 'ব্যাংক'], cheque: ['Cheque', 'চেক'], ctn: ['ctn', 'কার্টন'], pcs: ['pcs', 'পিস'], kg: ['kg', 'কেজি'], salesman: ['Salesman', 'বিক্রয়কর্মী']
  };
  const lab = (k, lang) => { const p = L2[k] || [k, k]; return lang === 'en' ? p[0] : lang === 'bn' ? p[1] : p[1] === p[0] ? p[0] : p[1] + ' / ' + p[0]; };
  const dig = (s, lang) => (lang === 'en' ? String(s) : PD.digitsBn ? PD.digitsBn(s) : String(s).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]));
  PD.invoiceLabel = lab;

  /* ---- layout helpers ---- */
  function money(p, lang, nl) { const neg = p < 0; const i = Math.round(Math.abs(p) / 100); const s = String(i); const g = s.length <= 3 ? s : s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3); return dig((neg ? '-' : '') + (nl ? '' : '৳') + g, lang); }
  function qtyText(q, lang) { const l = lang === 'en' ? 'en' : 'bn'; return dig(q.text[l] || q.text.en, lang); }
  const fdate = (ts, lang) => { const d = new Date(ts); const p = (n) => String(n).padStart(2, '0'); return dig(p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()), lang); };

  /* A doc is { rows:[...], watermark, size, lang }. Row kinds: center, kv, sep, item (thermal), thead/trow (a4 table), total, text, gap, big */
  function invoiceDoc(inv, lang) {
    const s = inv.sale, b = inv.business, t = s.totals, size = inv.size; const L = (k) => lab(k, lang); const rows = [];
    rows.push({ k: 'center', text: b.name, bold: true, scale: 1.25 }); if (b.address) rows.push({ k: 'center', text: b.address, small: true }); if (b.phone) rows.push({ k: 'center', text: b.phone, small: true });
    rows.push({ k: 'sep' }); rows.push({ k: 'center', text: L('invoice'), bold: true });
    rows.push({ k: 'kv', a: L('no'), b: s.invoice_no, bold: true }); rows.push({ k: 'kv', a: L('date'), b: fdate(s.ts, lang) }); rows.push({ k: 'kv', a: L('customer'), b: s.customer.name }); if (s.salesman) rows.push({ k: 'kv', a: L('salesman'), b: s.salesman });
    rows.push({ k: 'sep' });
    if (size === 'a4') {
      rows.push({ k: 'thead', cols: [L('item'), L('qty'), L('rate'), L('disc'), L('amount')] });
      s.lines.forEach((l, i) => rows.push({ k: 'trow', cols: [dig(i + 1, lang) + '. ' + l.name, qtyText(l.qty, lang), money(l.list_price, lang, 1), l.discount.amount ? money(l.discount.amount, lang, 1) : '-', money(l.net, lang, 1)] }));
    } else {
      s.lines.forEach((l, i) => { rows.push({ k: 'text', text: dig(i + 1, lang) + '. ' + l.name, bold: true }); rows.push({ k: 'kv', a: qtyText(l.qty, lang) + ' × ' + money(l.list_price, lang, 1), b: money(l.gross, lang, 1), small: true }); if (l.discount.amount) rows.push({ k: 'kv', a: '  − ' + L('disc'), b: '-' + money(l.discount.amount, lang, 1), small: true }); });
    }
    rows.push({ k: 'sep' });
    rows.push({ k: 'total', a: L('subtotal'), b: money(t.subtotal, lang) });
    if (t.line_discount) rows.push({ k: 'total', a: L('lineDisc'), b: '-' + money(t.line_discount, lang) });
    if (t.invoice_discount) rows.push({ k: 'total', a: L('invDisc'), b: '-' + money(t.invoice_discount, lang) });
    rows.push({ k: 'total', a: L('total'), b: money(t.total, lang), big: true });
    if (t.paid) rows.push({ k: 'total', a: L('paid'), b: money(t.paid, lang) });
    rows.push({ k: 'total', a: L('due'), b: money(t.due, lang), bold: true });
    if (t.customer_due_before > 0 || t.due > 0) { rows.push({ k: 'sep' }); rows.push({ k: 'total', a: L('prevDue'), b: money(t.customer_due_before || 0, lang), small: true }); rows.push({ k: 'total', a: L('newDue'), b: money((t.customer_due_before || 0) + t.due, lang), bold: true }); }
    rows.push({ k: 'gap' }); if (inv.footer) rows.push({ k: 'center', text: inv.footer, small: true }); rows.push({ k: 'center', text: L('thanks'), small: true });
    return { rows, size, lang, watermark: inv.watermark === 'none' ? null : L(inv.watermark === 'cancelled' ? 'cancelled' : 'copy'), name: s.invoice_no };
  }
  function receiptDoc(r, lang) {
    const p = r.payment, b = r.business, size = r.size || '80'; const L = (k) => lab(k, lang); const rows = [];
    rows.push({ k: 'center', text: b.name, bold: true, scale: 1.25 }); if (b.address) rows.push({ k: 'center', text: b.address, small: true }); if (b.phone) rows.push({ k: 'center', text: b.phone, small: true });
    rows.push({ k: 'sep' }); rows.push({ k: 'center', text: L('receipt'), bold: true }); rows.push({ k: 'kv', a: L('no'), b: p.receipt_no, bold: true }); rows.push({ k: 'kv', a: L('date'), b: fdate(p.ts, lang) }); rows.push({ k: 'kv', a: L('customer'), b: p.party_name });
    rows.push({ k: 'kv', a: L('method'), b: L(p.method) }); if (p.ref) rows.push({ k: 'kv', a: L('ref'), b: p.ref }); rows.push({ k: 'sep' });
    rows.push({ k: 'total', a: L('amount'), b: money(p.amount, lang), big: true });
    if (p.allocations && p.allocations.length) { rows.push({ k: 'sep' }); rows.push({ k: 'text', text: L('applied'), small: true }); p.allocations.forEach((a) => rows.push({ k: 'kv', a: a.invoice_no || (a.opening ? L('opening') : L('onAccount')), b: money(a.amount, lang, 1), small: true })); }
    if (r.customer_due_after != null) { rows.push({ k: 'sep' }); rows.push({ k: 'total', a: L('newDue'), b: money(r.customer_due_after, lang), bold: true }); }
    rows.push({ k: 'gap' }); rows.push({ k: 'center', text: L('thanks'), small: true });
    return { rows, size, lang, watermark: p.status === 'reversed' ? L('cancelled') : r.is_copy ? L('copy') : null, name: p.receipt_no };
  }
  function statementDoc(st, lang) {
    const b = st.business, c = st.customer; const L = (k) => lab(k, lang); const rows = [];
    rows.push({ k: 'center', text: b.name, bold: true, scale: 1.25 }); if (b.address) rows.push({ k: 'center', text: b.address, small: true }); if (b.phone) rows.push({ k: 'center', text: b.phone, small: true });
    rows.push({ k: 'sep' }); rows.push({ k: 'center', text: L('statement'), bold: true }); rows.push({ k: 'kv', a: L('customer'), b: c.name, bold: true }); rows.push({ k: 'kv', a: L('period'), b: dig(st.from + ' → ' + st.to, lang) }); rows.push({ k: 'sep' });
    rows.push({ k: 'total', a: L('opening2'), b: money(st.opening, lang) });
    rows.push({ k: 'thead', cols: [L('date') + ' · ' + L('details'), L('debit'), L('credit'), L('balance')] });
    st.rows.forEach((r) => rows.push({ k: 'trow', cols: [dig(r.date.slice(5).replace('-', '/'), lang) + '  ' + r.ref, r.debit ? money(r.debit, lang, 1) : '', r.credit ? money(r.credit, lang, 1) : '', money(r.balance, lang, 1)] }));
    rows.push({ k: 'sep' }); rows.push({ k: 'total', a: L('closing'), b: money(st.closing, lang), big: true }); rows.push({ k: 'gap' }); rows.push({ k: 'center', text: L('thanks'), small: true });
    return { rows, size: 'a4', lang, watermark: null, name: 'statement-' + c.name };
  }

  /* ---- canvas drawing ---- */
  function draw(doc, canvasFactory) {
    const cfg = SIZES[doc.size] || SIZES['80']; const W = cfg.w; const pad = Math.round(W * 0.045); const fs = cfg.fs; const pageH = cfg.h || 0;
    const mk = canvasFactory || (() => document.createElement('canvas')); const probe = mk(); const px = probe.getContext('2d');
    const setF = (sz, bold) => { px.font = (bold ? '600 ' : '400 ') + sz + 'px ' + FONT; };
    const mw = (s, sz, bold) => { setF(sz, bold); const m = px.measureText(s); return (m && m.width) || String(s).length * sz * 0.56; };
    const wrap = (s, sz, bold, maxW) => { s = String(s == null ? '' : s); const words = s.split(/(\s+)/); const out = []; let cur = ''; words.forEach((w) => { if (mw(cur + w, sz, bold) <= maxW || !cur) cur += w; else { out.push(cur.trim()); cur = w.trimStart(); } }); if (cur.trim()) out.push(cur.trim()); return out.length ? out : ['']; };
    // pass 1: measure -> list of placed items with page index
    const items = []; let y = pad; let page = 0; const inner = W - pad * 2;
    const need = (h) => { if (pageH && y + h > pageH - pad) { page++; y = pad; } };
    const place = (it, h) => { need(h); it.y = y; it.page = page; items.push(it); y += h; };
    const colW = doc.size === 'a4' ? [0.46, 0.17, 0.13, 0.11, 0.13] : null;
    doc.rows.forEach((r) => {
      const sz = Math.round(fs * (r.scale || 1) * (r.small ? 0.86 : 1)); const lh = Math.round(sz * 1.38);
      if (r.k === 'center') { wrap(r.text, sz, r.bold, inner).forEach((ln) => place({ k: 'text', text: ln, x: W / 2, align: 'center', sz, bold: r.bold }, lh)); }
      else if (r.k === 'text') { wrap(r.text, sz, r.bold, inner).forEach((ln) => place({ k: 'text', text: ln, x: pad, align: 'left', sz, bold: r.bold }, lh)); }
      else if (r.k === 'kv' || r.k === 'total') { const s2 = r.big ? Math.round(sz * 1.3) : sz; const bw = mw(r.b, s2, r.bold || r.big); const al = wrap(r.a, s2, r.bold || r.big, inner - bw - 12); al.forEach((ln, i) => place({ k: 'kv', a: ln, b: i === al.length - 1 ? r.b : '', pad, W, sz: s2, bold: r.bold || r.big }, Math.round(s2 * 1.4))); }
      else if (r.k === 'sep') place({ k: 'sep', pad, W }, Math.round(fs * 0.7));
      else if (r.k === 'gap') y += Math.round(fs * 0.8);
      else if (r.k === 'thead' || r.k === 'trow') {
        const cw = (doc.size === 'a4' && r.cols.length === 5 ? colW : r.cols.length === 4 ? [0.5, 0.17, 0.17, 0.16] : colW || [0.5, 0.25, 0.25]).map((f) => f * inner);
        const first = wrap(r.cols[0], sz, r.k === 'thead', cw[0] - 8); const h = Math.round(sz * 1.45) * first.length + 6;
        place({ k: 'row', cols: r.cols, first, cw, pad, sz, head: r.k === 'thead', lh: Math.round(sz * 1.45), h }, h);
      }
    });
    const pages = doc.size === 'a4' ? page + 1 : 1; const H = doc.size === 'a4' ? pageH : y + pad;
    const canvases = []; for (let i = 0; i < pages; i++) { const c = mk(); c.width = W; c.height = H; canvases.push(c); }
    canvases.forEach((c, pi) => {
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#000'; g.textBaseline = 'alphabetic';
      items.filter((it) => it.page === pi).forEach((it) => {
        if (it.k === 'text') { g.font = (it.bold ? '600 ' : '400 ') + it.sz + 'px ' + FONT; g.textAlign = it.align; g.fillText(it.text, it.x, it.y + it.sz); }
        else if (it.k === 'kv') { g.font = (it.bold ? '600 ' : '400 ') + it.sz + 'px ' + FONT; g.textAlign = 'left'; g.fillText(it.a, it.pad, it.y + it.sz); g.textAlign = 'right'; g.fillText(it.b, it.W - it.pad, it.y + it.sz); }
        else if (it.k === 'sep') { g.fillRect(it.pad, it.y + 6, it.W - it.pad * 2, 1.5); }
        else if (it.k === 'row') {
          g.font = (it.head ? '600 ' : '400 ') + it.sz + 'px ' + FONT; let x = it.pad;
          if (it.head) { g.fillStyle = '#e9eef3'; g.fillRect(it.pad, it.y, it.cw.reduce((a, b) => a + b, 0), it.h); g.fillStyle = '#000'; }
          it.cols.forEach((c2, ci) => { if (ci === 0) { g.textAlign = 'left'; it.first.forEach((ln, li) => g.fillText(ln, x + 4, it.y + it.sz + 2 + li * it.lh)); } else { g.textAlign = 'right'; g.fillText(c2, x + it.cw[ci] - 6, it.y + it.sz + 2); } x += it.cw[ci]; });
          g.fillStyle = '#c9d2dc'; g.fillRect(it.pad, it.y + it.h - 1, it.cw.reduce((a, b) => a + b, 0), 1); g.fillStyle = '#000';
        }
      });
      if (doc.watermark) { g.save(); g.globalAlpha = 0.13; g.fillStyle = '#b42318'; g.font = '700 ' + Math.round(W * 0.2) + 'px ' + FONT; g.textAlign = 'center'; g.translate(W / 2, H / 2); g.rotate(-0.5); g.fillText(doc.watermark, 0, 0); g.restore(); }
    });
    return canvases;
  }

  /* ---- PDF (image pages) ---- */
  function b64ToBytes(b64) { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function bytesToB64(a) { let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); }
  /* pages: [{jpeg:Uint8Array, pxW, pxH, ptW, ptH}] */
  function buildPdf(pages) {
    const enc = (s) => { const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; return a; };
    const parts = []; const offs = []; let len = 0; const push = (u8) => { parts.push(u8); len += u8.length; }; const objStart = (n) => { offs[n] = len; push(enc(n + ' 0 obj\n')); };
    push(enc('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'));
    const n = pages.length; const pageIds = pages.map((_, i) => 3 + i * 3); // page, content, image
    objStart(1); push(enc('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'));
    objStart(2); push(enc('<< /Type /Pages /Count ' + n + ' /Kids [' + pageIds.map((i) => i + ' 0 R').join(' ') + '] >>\nendobj\n'));
    pages.forEach((p, i) => {
      const pid = 3 + i * 3, cid = pid + 1, iid = pid + 2; const w = p.ptW.toFixed(2), h = p.ptH.toFixed(2);
      objStart(pid); push(enc('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + w + ' ' + h + '] /Resources << /XObject << /Im0 ' + iid + ' 0 R >> >> /Contents ' + cid + ' 0 R >>\nendobj\n'));
      const cs = 'q ' + w + ' 0 0 ' + h + ' 0 0 cm /Im0 Do Q'; objStart(cid); push(enc('<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream\nendobj\n'));
      objStart(iid); push(enc('<< /Type /XObject /Subtype /Image /Width ' + p.pxW + ' /Height ' + p.pxH + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>\nstream\n')); push(p.jpeg); push(enc('\nendstream\nendobj\n'));
    });
    const total = 3 + n * 3; const xref = len; let x = 'xref\n0 ' + total + '\n0000000000 65535 f \n'; for (let i = 1; i < total; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
    push(enc(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n'));
    const out = new Uint8Array(len); let o = 0; parts.forEach((p) => { out.set(p, o); o += p.length; }); return out;
  }
  PD.pdf = { build: buildPdf, bytesToB64, b64ToBytes };

  const fileName = (doc, ext) => (doc.name || 'document').replace(/[\\/:*?"<>|\s]+/g, '_') + '-' + doc.size + '.' + ext;
  async function exportPng(doc) { const cs = draw(doc); const url = cs[0].toDataURL('image/png'); return { name: fileName(doc, 'png'), mime: 'image/png', b64: url.split(',')[1] || '' }; }
  async function exportPdf(doc) {
    const cfg = SIZES[doc.size] || SIZES['80']; const cs = draw(doc);
    const pages = cs.map((c) => { const url = c.toDataURL('image/jpeg', 0.92); const ptW = cfg.mm[0] / 25.4 * 72; const ptH = cfg.mm[1] ? cfg.mm[1] / 25.4 * 72 : ptW * (c.height / c.width); return { jpeg: b64ToBytes(url.split(',')[1] || ''), pxW: c.width, pxH: c.height, ptW, ptH }; });
    return { name: fileName(doc, 'pdf'), mime: 'application/pdf', b64: bytesToB64(buildPdf(pages)) };
  }
  PD.docs = { invoiceDoc, receiptDoc, statementDoc, draw, exportPng, exportPdf };

  /* ---- preview dialog ---- */
  PD.showDoc = function showDoc(o) {
    // o: { title, build(size, lang)->Promise<doc|null>, sizes:['58','80','a4'], size, lang, onPrinted }
    let size = o.size || '80'; let lang = o.lang || PD.lang(); let doc = null; let savedPath = null;
    const sizes = o.sizes || ['58', '80', 'a4'];
    const m = PD.modal({ title: esc(o.title), titleText: o.title, size: 'wide',
      body: `<div class="docbar"><span class="seg" data-g="size">${sizes.map((s) => `<button data-v="${s}">${s === 'a4' ? 'A4' : s + ' mm'}</button>`).join('')}</span><span class="seg" data-g="lang"><button data-v="bn">বাংলা</button><button data-v="en">English</button><button data-v="both">বাংলা + En</button></span></div><div class="docview" id="dv"></div>`,
      buttons: [{ label: PD.ic('print') + ' ' + esc(PD.t('doc.print')), id: 'dc-print', onClick: async () => { const [, e] = await PD.try('printer.print', { size }); PD.toast(e && e.code === 'UNSUPPORTED' ? PD.t('doc.noPrinter') : e ? PD.errText(e) : PD.t('doc.printed'), e ? 'warn' : 'ok'); return false; } },
        { label: PD.ic('download') + ' ' + esc(PD.t('doc.png')), id: 'dc-png', onClick: async () => { await save('png'); return false; } },
        { label: PD.ic('download') + ' PDF', id: 'dc-pdf', cls: 'p', main: true, onClick: async () => { await save('pdf'); return false; } },
        { label: PD.ic('share') + ' ' + esc(PD.t('doc.share')), id: 'dc-share', onClick: async () => { if (!savedPath) await save('pdf', true); if (!savedPath) return false; const [, e] = await PD.try('files.share', { path: savedPath }); PD.toast(e ? PD.errText(e) : PD.t('doc.shared'), e ? 'bad' : 'ok'); return false; } },
        { label: PD.t('common.close') }] });
    async function save(kind, quiet) {
      if (!doc) return; const f = kind === 'png' ? await exportPng(doc) : await exportPdf(doc);
      const [d, e] = await PD.try('files.saveBytes', { suggested_name: f.name, mime: f.mime, bytes_b64: f.b64, where: 'default_folder' });
      if (e) { PD.toast(PD.errText(e), 'bad'); return; } savedPath = d.handle || d.saved_to; if (PD.isMock) PD.ui.download(f.name, f.mime, f.b64); if (!quiet) PD.toast(PD.t('doc.saved', { p: d.saved_to || d.name }), 'ok');
    }
    async function render() {
      $('[data-g=size]', m.el).querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === size)); $('[data-g=lang]', m.el).querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === lang));
      doc = await o.build(size, lang); const host = $('#dv', m.el); if (!doc) { host.innerHTML = ''; return; }
      try { await (document.fonts && document.fonts.ready); } catch (e) { /* ignore */ }
      const cs = draw(doc); host.innerHTML = ''; cs.forEach((c) => { c.className = 'docpage'; host.appendChild(c); }); savedPath = null;
    }
    m.el.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => { if (b.parentNode.dataset.g === 'size') size = b.dataset.v; else lang = b.dataset.v; render(); }));
    render(); return m;
  };
  PD.openInvoice = async (saleId, o) => {
    o = o || {}; const pref = (PD.S.prefs && PD.S.prefs.invoice_size) || '80'; const pl = (PD.S.prefs && PD.S.prefs.invoice_language) || 'bn';
    let first = true;
    return PD.showDoc({ title: PD.t('doc.invoice'), size: pref, lang: pl, build: async (size, lang) => { const [d, e] = await PD.try('invoice.data', { sale_id: saleId, size, language: lang, mark_printed: first && !!o.markPrinted }); if (e) { PD.toast(PD.errText(e), 'bad'); return null; } first = false; return invoiceDoc(d, lang); } });
  };
  PD.openReceipt = async (paymentId, o) => {
    o = o || {}; const pref = (PD.S.prefs && PD.S.prefs.invoice_size) || '80'; const pl = (PD.S.prefs && PD.S.prefs.invoice_language) || 'bn';
    return PD.showDoc({ title: PD.t('doc.receipt'), size: pref === 'a4' ? 'a4' : pref, lang: pl, build: async (size, lang) => { const [d, e] = await PD.try('payments.receipt', { payment_id: paymentId, size, language: lang }); if (e) { PD.toast(PD.errText(e), 'bad'); return null; } return receiptDoc(d, lang); } });
  };
  PD.openStatement = async (customerId, from, to) => {
    to = to || PD.ui.today(); from = from || PD.ui.addDays(to, -90);
    const pl = (PD.S.prefs && PD.S.prefs.invoice_language) || 'bn';
    return PD.showDoc({ title: PD.t('doc.statement'), sizes: ['a4'], size: 'a4', lang: pl, build: async (size, lang) => { const [d, e] = await PD.try('customers.statement', { customer_id: customerId, from, to, language: lang }); if (e) { PD.toast(PD.errText(e), 'bad'); return null; } d.from = from; d.to = to; return statementDoc(d, lang); } });
  };
})(typeof window !== 'undefined' ? window : globalThis);

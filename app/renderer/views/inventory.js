/* Products & stock: Excel-like grid (keyboard, selection, copy/paste, fill-down), owner edit mode with staged changes + dry-run review + undo,
   product detail, add/edit product, stock count, CSV/XLSX import wizard, change log. Manager: read-only, no cost columns. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { $, $$, esc, ic } = PD; const U = PD.ui;
  PD.i18n.pairs({
    'inv.title': ['Products & stock', 'পণ্য ও স্টক'], 'inv.search': ['Search name, SKU or company', 'নাম, SKU বা কোম্পানি খুঁজুন'], 'inv.allCo': ['All companies', 'সব কোম্পানি'], 'inv.allSt': ['All status', 'সব অবস্থা'],
    'st.ok': ['OK', 'ঠিক আছে'], 'st.low': ['Low', 'কম'], 'st.out': ['Out', 'শেষ'], 'st.near_expiry': ['Near expiry', 'মেয়াদ কাছে'],
    'inv.editMode': ['Edit mode', 'এডিট মোড'], 'inv.editOn': ['Edit mode is ON', 'এডিট মোড চালু'], 'inv.editHelp': ['Click a cell and type. Changes stay highlighted until you save them.', 'ঘরে ক্লিক করে লিখুন। সেভ না করা পর্যন্ত পরিবর্তন হাইলাইট থাকবে।'], 'inv.editIdle': ['Turns off after {m} idle minutes', '{m} মিনিট কিছু না করলে বন্ধ হবে'],
    'inv.pinTitle': ['Turn on edit mode', 'এডিট মোড চালু করুন'], 'inv.pinText': ['Enter the owner PIN to edit prices, limits and stock.', 'দাম, সীমা ও স্টক বদলাতে মালিকের PIN দিন।'], 'inv.pin': ['Owner PIN', 'মালিকের PIN'], 'inv.pinBad': ['Wrong PIN', 'PIN ভুল'],
    'qa.btn': ['Quick add names', 'নাম দিয়ে দ্রুত যোগ'], 'qa.title': ['Quick add products', 'দ্রুত পণ্য যোগ'], 'qa.help': ['One product per line. Optional: name, pieces per carton, sell price per carton (comma or tab separated). Edit stock and details later in the grid.', 'প্রতি লাইনে একটি পণ্য। চাইলে: নাম, কার্টনে পিস, কার্টন প্রতি বিক্রি দাম (কমা বা ট্যাব দিয়ে)। স্টক ও বাকি তথ্য পরে গ্রিডে এডিট করুন।'], 'qa.kg': ['Sold by kg (name, price per kg)', 'কেজি হিসাবে বিক্রি (নাম, কেজি প্রতি দাম)'], 'qa.go': ['Save all', 'সব সেভ করুন'], 'qa.empty': ['Type at least one product name.', 'কমপক্ষে একটি পণ্যের নাম লিখুন।'], 'qa.progress': ['Saved {a} of {b}', '{b} টির মধ্যে {a} টি সেভ হয়েছে'], 'qa.done': ['Added {a} products, skipped {b} that already exist.', '{a} টি পণ্য যোগ হয়েছে, {b} টি আগে থেকেই আছে।'],
    'si.btn': ['Add stock', 'স্টক যোগ'], 'si.title': ['Add stock', 'স্টক যোগ করুন'], 'si.qty': ['Quantity', 'পরিমাণ'], 'si.next': ['Save and add another', 'সেভ করে পরেরটি'], 'si.reason': ['Stock in', 'স্টক যোগ'], 'si.needCost': ['Enter the buy rate (cost).', 'কেনা রেট (খরচ) লিখুন।'], 'si.pick': ['Pick a product first.', 'আগে একটি পণ্য বাছুন।'], 'si.needQty': ['Enter a quantity.', 'পরিমাণ লিখুন।'], 'si.done': ['Stock added: {n}', 'স্টক যোগ হয়েছে: {n}'], 'inv.gridEdit': ['Grid edit', 'গ্রিড এডিট'], 'inv.archiveWhy': ['The product will be hidden from sales and lists. History is kept. You can restore it later.', 'পণ্যটি বিক্রি ও তালিকা থেকে লুকানো হবে। ইতিহাস থাকবে। পরে ফিরিয়ে আনা যাবে।'], 'inv.archived': ['Product archived.', 'পণ্য আর্কাইভ হয়েছে।'],
    'inv.add': ['Add product', 'নতুন পণ্য'], 'inv.import': ['Import', 'ইমপোর্ট'], 'inv.export': ['Export', 'এক্সপোর্ট'], 'inv.count': ['Stock count', 'স্টক গণনা'], 'inv.log': ['Change log', 'পরিবর্তনের লগ'],
    'inv.c.sku': ['SKU', 'SKU'], 'inv.c.name': ['Product', 'পণ্য'], 'inv.c.company': ['Company', 'কোম্পানি'], 'inv.c.stock': ['Stock', 'স্টক'], 'inv.c.min': ['Min stock', 'ন্যূনতম স্টক'], 'inv.c.price': ['Price', 'দাম'], 'inv.c.cost': ['Cost', 'কেনা দাম'], 'inv.c.margin': ['Margin', 'মার্জিন'], 'inv.c.maxd': ['Max disc.', 'সর্বোচ্চ ছাড়'], 'inv.c.mins': ['Min sell', 'সর্বনিম্ন দাম'], 'inv.c.ppc': ['Pcs/ctn', 'পিস/কার্টন'], 'inv.c.status': ['Status', 'অবস্থা'], 'inv.c.trend': ['30 days', '৩০ দিন'], 'inv.c.exp': ['Next expiry', 'পরের মেয়াদ'],
    'inv.profit': ['Profit', 'লাভ'], 'inv.assumed': ['Assumed value, please confirm', 'অনুমান করা মান, নিশ্চিত করুন'],
    'inv.changes': ['{n} unsaved changes', '{n}টি অসংরক্ষিত পরিবর্তন'], 'inv.review': ['Review & save', 'দেখে সেভ করুন'], 'inv.discard': ['Discard', 'বাতিল করুন'], 'inv.undoSave': ['Undo last save', 'শেষ সেভ ফিরিয়ে নিন'],
    'inv.reviewTitle': ['Review changes', 'পরিবর্তন দেখুন'], 'inv.reason': ['Reason for these changes', 'এই পরিবর্তনের কারণ'], 'inv.col.field': ['Field', 'ঘর'], 'inv.col.old': ['Before', 'আগে'], 'inv.col.new': ['After', 'পরে'], 'inv.col.res': ['Check', 'যাচাই'], 'inv.apply': ['Apply changes', 'পরিবর্তন প্রয়োগ'],
    'inv.applied': ['{n} changes saved', '{n}টি পরিবর্তন সেভ হয়েছে'], 'inv.undone': ['Last save undone', 'শেষ সেভ ফিরিয়ে নেওয়া হয়েছে'], 'inv.errorsFix': ['Some changes are not valid. Fix them first.', 'কিছু পরিবর্তন সঠিক নয়। আগে ঠিক করুন।'], 'inv.editOff': ['Edit mode ended. Turn it on again to continue.', 'এডিট মোড শেষ। আবার চালু করুন।'],
    'inv.badValue': ['Not a valid value for this cell', 'এই ঘরে মানটি সঠিক নয়'], 'inv.sel': ['{n} cells', '{n}টি ঘর'], 'inv.sum': ['Sum', 'যোগফল'], 'inv.rows': ['{n} products', '{n}টি পণ্য'], 'inv.stockValue': ['Stock value', 'স্টকের মূল্য'], 'inv.ctns': ['{n} cartons', '{n} কার্টন'],
    'inv.detail': ['Product details', 'পণ্যের বিবরণ'], 'inv.lots': ['Lots', 'লট'], 'inv.byMonth': ['By month received', 'আসার মাস অনুযায়ী'], 'inv.sold30': ['Sold, last 30 days', 'গত ৩০ দিনের বিক্রি'], 'inv.edit': ['Edit details', 'বিবরণ বদলান'], 'inv.archive': ['Archive', 'আর্কাইভ'], 'inv.restore': ['Restore', 'ফিরিয়ে আনুন'],
    'inv.f.sku': ['SKU', 'SKU'], 'inv.f.retail': ['Retail price ৳ (optional)', 'খুচরা দাম ৳ (ঐচ্ছিক)'], 'inv.f.name': ['Product name', 'পণ্যের নাম'], 'inv.f.mode': ['Sold by', 'বিক্রি হয়'], 'inv.f.cartonPcs': ['Carton / pieces', 'কার্টন / পিস'], 'inv.f.byKg': ['By kg (tea)', 'কেজিতে (চা)'], 'inv.f.ppc': ['Pieces per carton', 'প্রতি কার্টনে পিস'], 'inv.f.dozen': ['Pieces per dozen', 'প্রতি ডজনে পিস'], 'inv.f.gpc': ['Grams per carton', 'প্রতি কার্টনে গ্রাম'], 'inv.f.price': ['List price ৳ (per carton / kg)', 'দাম ৳ (প্রতি কার্টন / কেজি)'], 'inv.f.cost': ['Cost ৳ (per carton / kg)', 'কেনা দাম ৳ (প্রতি কার্টন / কেজি)'], 'inv.f.maxd': ['Max discount ৳ per carton / kg', 'সর্বোচ্চ ছাড় ৳ প্রতি কার্টন / কেজি'], 'inv.f.maxp': ['Max discount % (optional)', 'সর্বোচ্চ ছাড় % (ঐচ্ছিক)'], 'inv.f.mins': ['Minimum selling price ৳ (optional)', 'সর্বনিম্ন বিক্রয়মূল্য ৳ (ঐচ্ছিক)'], 'inv.f.minStock': ['Minimum stock', 'ন্যূনতম স্টক'], 'inv.saved': ['Product saved', 'পণ্য সেভ হয়েছে'], 'inv.noCo': ['No company', 'কোম্পানি নেই'],
    'cnt.title': ['Stock count', 'স্টক গণনা'], 'cnt.help': ['Enter what you counted. Only filled rows are saved.', 'যা গুনেছেন লিখুন। শুধু পূরণ করা সারি সেভ হবে।'], 'cnt.expected': ['System', 'সিস্টেমে'], 'cnt.counted': ['Counted', 'গোনা'], 'cnt.saved': ['Count saved', 'গণনা সেভ হয়েছে'], 'cnt.history': ['Past counts', 'আগের গণনা'], 'cnt.diff': ['Difference', 'পার্থক্য'],
    'imp.bulk': ['Set all rows to:', 'সব সারির জন্য:'], 'imp.bulkHelp': ['"Import as is" adds the product and marks missing price, carton size or company for later setup.', '"যেমন আছে" দিলে পণ্য যোগ হবে, না-থাকা দাম/কার্টন সাইজ/কোম্পানি পরে ঠিক করার জন্য চিহ্নিত থাকবে।'],
    'imp.title': ['Import products', 'পণ্য ইমপোর্ট'], 'imp.pick': ['Choose file (.csv or .xlsx)', 'ফাইল বেছে নিন (.csv বা .xlsx)'], 'imp.map': ['Match columns', 'কলাম মেলান'], 'imp.valid': ['{n} rows are ready', '{n}টি সারি তৈরি'], 'imp.issues': ['Rows that need a decision', 'যে সারিতে সিদ্ধান্ত লাগবে'], 'imp.mode': ['If the SKU already exists', 'SKU আগে থাকলে'], 'imp.m.insert': ['Skip it (add new only)', 'বাদ দিন (শুধু নতুন যোগ)'], 'imp.m.upsert': ['Update it', 'আপডেট করুন'],
    'imp.act.skip': ['Skip', 'বাদ'], 'imp.act.asis': ['Import as is', 'যেমন আছে তেমন'], 'imp.row': ['Row {n}', 'সারি {n}'], 'imp.commit': ['Import', 'ইমপোর্ট করুন'], 'imp.done': ['Added {i}, updated {u}, skipped {s}', 'যোগ {i}, আপডেট {u}, বাদ {s}'], 'imp.f.sku': ['SKU', 'SKU'], 'imp.f.name': ['Name', 'নাম'], 'imp.f.company': ['Company', 'কোম্পানি'], 'imp.f.list_price': ['Sell price (per carton/kg)', 'বিক্রি দাম (কার্টন/কেজি)'], 'imp.f.cost_price': ['Buy price (per carton/kg)', 'কেনা দাম (কার্টন/কেজি)'], 'imp.f.pcs_per_carton': ['Pcs per carton', 'কার্টনে পিস'], 'imp.f.grams_per_carton': ['Carton weight (g)', 'কার্টনের ওজন (গ্রাম)'], 'imp.f.original_name': ['Original name', 'মূল নাম'], 'imp.f.none': ['(ignore)', '(বাদ)'], 'imp.err': ['Error', 'ভুল'], 'imp.warn': ['Warning', 'সতর্কতা'], 'imp.sample': ['Sample rows', 'নমুনা সারি'],
    'log.title': ['Change log', 'পরিবর্তনের লগ'], 'log.who': ['Who', 'কে'], 'log.when': ['When', 'কখন'], 'log.what': ['What', 'কী']
  });

  const TYPES = { sku: 'text', name: 'text', stock: 'qty', min_stock: 'qty', list_price: 'money', cost_price: 'money', max_discount_per_unit: 'money', min_sell_price: 'money', pcs_per_carton: 'int' };
  const FIELD_LABEL = { sku: 'inv.c.sku', name: 'inv.c.name', stock: 'inv.c.stock', min_stock: 'inv.c.min', list_price: 'inv.c.price', cost_price: 'inv.c.cost', max_discount_per_unit: 'inv.c.maxd', min_sell_price: 'inv.c.mins', pcs_per_carton: 'inv.c.ppc' };
  const colLetter = (i) => String.fromCharCode(65 + i);

  /* "3" = 3 cartons, "3+4" = 3 cartons 4 pcs, "20p" = 20 pcs; tea: kg decimal */
  function parseQty(p, s) {
    s = String(s || '').trim().replace(/[\s,]/g, ''); if (!s) return null;
    if (p.sell_mode === 'by_kg') return /^\d+(\.\d{1,3})?$/.test(s) ? { kg: s } : null;
    let m = /^(\d+)(?:\+(\d+))?$/.exec(s); if (m) return { cartons: +m[1], pcs: +(m[2] || 0) }; m = /^(\d+)p$/i.exec(s); return m ? { cartons: 0, pcs: +m[1] } : null;
  }
  const qtyShow = (p, q) => (p.sell_mode === 'by_kg' ? PD.digits(q.kg) + ' ' + PD.t('unit.kg') : PD.digits((q.cartons || 0) + (q.pcs ? '+' + q.pcs : '')) + ' ' + PD.t('unit.ctn'));

  PD.views.inventory = {
    async render(el) {
      const owner = PD.power(); const idle = 10;
      const S = { rows: [], q: '', company: '', status: '', sort: { key: 'name', dir: 'asc' }, edit: false, cur: { r: 0, c: 0 }, sel: null, staged: new Map(), undo: [], inverse: null, editing: null, totals: null, idleT: null };
      el.classList.add('flush');
      el.innerHTML = `<div class="gridbar" id="g-bar"></div><div id="g-banner"></div><div class="gwrap"><div class="gscroll" id="g-scroll" tabindex="0"></div></div><div class="gstat" id="g-stat"></div>`;
      const [cs] = await PD.try('companies.list', {}); const companies = cs ? cs.rows : [];
      const cols = [
        { k: 'sku', l: 'inv.c.sku', f1: 1, edit: 1, get: (p) => p.sku, show: (p) => esc(p.sku) }, { k: 'name', l: 'inv.c.name', f2: 1, edit: 1, get: (p) => p.name, show: (p) => esc(p.name) },
        { k: 'company', l: 'inv.c.company', get: (p) => p.company_name || '', show: (p) => esc(p.company_name || '') },
        { k: 'stock', l: 'inv.c.stock', r: 1, edit: 1, get: (p) => U.qty(p.stock), show: (p) => esc(U.qty(p.stock)) }, { k: 'min_stock', l: 'inv.c.min', r: 1, edit: 1, get: (p) => U.qty(p.min_stock), show: (p) => esc(U.qty(p.min_stock)) },
        { k: 'list_price', l: 'inv.c.price', r: 1, edit: 1, get: (p) => p.list_price, show: (p) => PD.money(p.list_price) }
      ].concat(owner ? [{ k: 'cost_price', l: 'inv.c.cost', r: 1, edit: 1, get: (p) => p.cost_price, show: (p) => PD.money(p.cost_price), assumed: (p) => p.assumed && p.assumed.cost_price }, { k: 'margin', l: 'inv.c.margin', r: 1, get: (p) => p.margin_bp, show: (p) => PD.digits((p.margin_bp / 100).toFixed(1)) + '%' }] : []).concat([
        { k: 'max_discount_per_unit', l: 'inv.c.maxd', r: 1, edit: 1, get: (p) => p.max_discount.per_unit, show: (p) => PD.money(p.max_discount.per_unit) }]).concat(owner ? [{ k: 'min_sell_price', l: 'inv.c.mins', r: 1, edit: 1, get: (p) => p.min_sell_price, show: (p) => (p.min_sell_price ? PD.money(p.min_sell_price) : '') }] : []).concat([
        { k: 'pcs_per_carton', l: 'inv.c.ppc', r: 1, edit: 1, get: (p) => p.pcs_per_carton || '', show: (p) => (p.pcs_per_carton ? PD.digits(p.pcs_per_carton) : ''), assumed: (p) => p.assumed && p.assumed.pcs_per_carton, only: (p) => p.sell_mode === 'carton_pcs' },
        { k: 'status', l: 'inv.c.status', get: (p) => p.status, show: (p) => U.pill(p.status === 'ok' ? 'ok' : p.status === 'low' ? 'low' : p.status === 'out' ? 'out' : 'info', PD.t('st.' + p.status)) },
        { k: 'trend', l: 'inv.c.trend', get: () => '', show: (p) => spark(p.trend30) }, { k: 'exp', l: 'inv.c.exp', get: (p) => p.next_expiry || '', show: (p) => (p.next_expiry ? esc(PD.date(p.next_expiry)) : '') }]);
      const editable = (c, p) => owner && S.edit && c.edit && (!c.only || c.only(p));
      function spark(a) { if (!a || !a.length) return ''; const m = Math.max(1, ...a); return `<svg class="spark" width="84" height="20" viewBox="0 0 84 20">${a.map((v, i) => `<rect x="${i * 2.8}" y="${20 - (v / m) * 18}" width="2" height="${(v / m) * 18 + 0.5}" fill="var(--teal)" opacity=".75"/>`).join('')}</svg>`; }

      /* ---------- toolbar ---------- */
      function bar() {
        $('#g-bar').innerHTML = `<input class="in" id="g-q" style="width:230px" placeholder="${esc(PD.t('inv.search'))}" value="${esc(S.q)}"><select class="in" id="g-co"><option value="">${esc(PD.t('inv.allCo'))}</option>${companies.map((c) => `<option value="${c.id}" ${String(c.id) === String(S.company) ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select><select class="in" id="g-st">${U.opts([['', PD.t('inv.allSt')], ['ok', PD.t('st.ok')], ['low', PD.t('st.low')], ['out', PD.t('st.out')], ['near_expiry', PD.t('st.near_expiry')]], S.status)}</select><span class="sp"></span>
          <button class="btn" id="g-count">${ic('check')} ${esc(PD.t('inv.count'))}</button>${owner ? `<button class="btn" id="g-log">${ic('shield')} ${esc(PD.t('inv.log'))}</button><button class="btn" id="g-imp">${ic('upload')} ${esc(PD.t('inv.import'))}</button><button class="btn" id="g-exp">${ic('download')} ${esc(PD.t('inv.export'))}</button><button class="btn p" id="g-simple">${ic('box')} ${esc(PD.t('sv.switch'))}</button><button class="btn" id="g-si">${ic('plus')} ${esc(PD.t('si.btn'))}</button><button class="btn" id="g-qa">${ic('plus')} ${esc(PD.t('qa.btn'))}</button><button class="btn" id="g-add">${ic('plus')} ${esc(PD.t('inv.add'))}</button><button class="btn mode ${S.edit ? 'on' : ''}" id="g-edit">${ic(S.edit ? 'unlock' : 'lock')} ${esc(PD.t('inv.editMode'))}</button>` : ''}`;
        $('#g-q').addEventListener('input', U.debounce((e) => { S.q = e.target.value.trim(); load(); })); $('#g-co').addEventListener('change', (e) => { S.company = e.target.value; load(); }); $('#g-st').addEventListener('change', (e) => { S.status = e.target.value; load(); });
        $('#g-count').addEventListener('click', countDialog);
        if (owner) { $('#g-log').addEventListener('click', changeLog); $('#g-imp').addEventListener('click', importWizard); $('#g-exp').addEventListener('click', () => U.exportTable('products', 'csv')); $('#g-add').addEventListener('click', () => productForm(null, load)); $('#g-qa').addEventListener('click', () => quickAdd(load)); $('#g-si').addEventListener('click', () => stockIn(null, load)); $('#g-simple').addEventListener('click', () => { PD.S.invMode = 'simple'; PD.refreshApp(); }); $('#g-edit').addEventListener('click', toggleEdit); }
      }
      function banner() {
        const b = $('#g-banner'); if (!S.edit) { b.innerHTML = ''; return; } const n = S.staged.size;
        b.innerHTML = `<div class="note" style="border-radius:0;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><b>${ic('unlock', 15)} ${esc(PD.t('inv.editOn'))}</b><span>${esc(PD.t('inv.editHelp'))}</span><span class="muted">${esc(PD.t('inv.editIdle', { m: PD.digits(idle) }))}</span><span class="sp"></span>${S.inverse ? `<button class="btn sm" id="g-undosave">${ic('undo', 14)} ${esc(PD.t('inv.undoSave'))}</button>` : ''}${n ? `<b>${esc(PD.t('inv.changes', { n: PD.digits(n) }))}</b><button class="btn sm" id="g-disc">${esc(PD.t('inv.discard'))}</button><button class="btn sm p" id="g-rev">${esc(PD.t('inv.review'))} <kbd class="kbd" style="position:static">Ctrl+S</kbd></button>` : ''}</div>`;
        const d = $('#g-disc'); if (d) d.addEventListener('click', () => { S.staged.clear(); S.undo = []; paint(); banner(); }); const r = $('#g-rev'); if (r) r.addEventListener('click', review); const u = $('#g-undosave'); if (u) u.addEventListener('click', undoSave);
      }

      /* ---------- load + paint ---------- */
      async function load() {
        S.staged.clear(); S.undo = []; let rows = []; let cur = null; let tot = null;
        for (let i = 0; i < 20; i++) { const [d, e] = await PD.try('products.list', { limit: 500, cursor: cur || undefined, q: S.q || undefined, company_id: S.company ? +S.company : undefined, status: S.status || undefined, sort: S.sort }); if (e) { U.err(e); break; } rows = rows.concat(d.rows); tot = d.totals; cur = d.page.next_cursor; if (!cur) break; }
        S.rows = rows; S.totals = tot; S.cur.r = Math.min(S.cur.r, Math.max(0, rows.length - 1)); S.sel = null; paint(); banner(); stat();
      }
      const visCols = () => cols;
      function cellVal(p, c) { const st = S.staged.get(p.id + '|' + c.k); return st ? { html: esc(st.text), staged: true } : { html: c.show(p), staged: false }; }
      function paint() {
        const sc = $('#g-scroll'); const top = sc.scrollTop, left = sc.scrollLeft;
        const head = `<thead><tr class="lt"><th class="rn"></th>${cols.map((c, i) => `<th class="${c.f1 ? 'f1' : ''} ${c.f2 ? 'f2' : ''}">${colLetter(i)}</th>`).join('')}</tr><tr class="hd"><th class="rn">#</th>${cols.map((c) => `<th class="${c.r ? 'r' : ''} ${c.f1 ? 'f1' : ''} ${c.f2 ? 'f2' : ''} ${S.sort.key === c.k ? 'sortd' : ''}" data-sort="${c.k}">${esc(PD.t(c.l))}${S.sort.key === c.k ? (S.sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>`;
        const body = S.rows.map((p, r) => `<tr class="${p.stock.base === 0 ? 'zero' : ''}"><td class="rn"><span>${PD.digits(r + 1)}</span><button data-open="${r}" title="${esc(PD.t('inv.detail'))}">${ic('search', 13)}</button>${owner ? `<button data-si="${r}" title="${esc(PD.t('si.title'))}">${ic('plus', 13)}</button><button data-ed="${r}" title="${esc(PD.t('inv.edit'))}">${ic('edit', 13)}</button><button class="dz" data-ar="${r}" title="${esc(PD.t('inv.archive'))}">${ic('x', 13)}</button>` : ''}</td>${cols.map((c, ci) => { const v = cellVal(p, c); const as = c.assumed && c.assumed(p); return `<td data-r="${r}" data-c="${ci}" class="${c.r ? 'r' : ''} ${c.f1 ? 'f1' : ''} ${c.f2 ? 'f2' : ''} ${editable(c, p) ? 'ed' : 'ro'} ${v.staged ? 'chg' : ''} ${as ? 'bad' : ''}" ${as ? `title="${esc(PD.t('inv.assumed'))}"` : ''}>${v.html}${as ? ' ~' : ''}</td>`; }).join('')}</tr>`).join('');
        const foot = owner && S.totals ? `<tfoot><tr><td class="rn"></td>${cols.map((c) => `<td class="${c.r ? 'r' : ''}">${c.k === 'name' ? esc(PD.t('inv.rows', { n: PD.digits(S.totals.count) })) : c.k === 'stock' ? esc(PD.t('inv.ctns', { n: PD.digits(S.totals.stock_cartons) })) : c.k === 'cost_price' ? PD.money(S.totals.stock_value) : ''}</td>`).join('')}</tr></tfoot>` : '';
        sc.innerHTML = `<table class="g">${head}<tbody>${body}</tbody>${foot}</table>`; sc.scrollTop = top; sc.scrollLeft = left; mark();
        $$('[data-sort]', sc).forEach((h) => h.addEventListener('click', () => { const k = h.dataset.sort; if (['company', 'trend', 'exp', 'margin'].includes(k) && k !== 'margin') return; S.sort = { key: k, dir: S.sort.key === k && S.sort.dir === 'asc' ? 'desc' : 'asc' }; if (k === 'min_stock' || k === 'max_discount_per_unit' || k === 'pcs_per_carton') S.sort = { key: 'name', dir: 'asc' }; load(); }));
        $$('[data-si]', sc).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); stockIn(S.rows[+b.dataset.si], load); }));
        $$('[data-ed]', sc).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); productForm(S.rows[+b.dataset.ed], load); }));
        $$('[data-ar]', sc).forEach((b) => b.addEventListener('click', async (e) => { e.stopPropagation(); const p = S.rows[+b.dataset.ar]; if (!(await PD.confirm(PD.t('inv.archive') + ': ' + p.name, PD.t('inv.archiveWhy')))) return; const [, er] = await U.withEdit(() => PD.try('products.archive', { id: p.id, archived: true })); if (er) { if (er.code !== 'CANCELLED') U.err(er); return; } PD.toast(PD.t('inv.archived'), 'ok'); load(); }));
        $$('[data-open]', sc).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); detail(S.rows[+b.dataset.open]); }));
      }
      function td(r, c) { return $('td[data-r="' + r + '"][data-c="' + c + '"]', $('#g-scroll')); }
      function mark() {
        $$('td.cur,td.sel', $('#g-scroll')).forEach((n) => n.classList.remove('cur', 'sel')); const s = S.sel;
        if (s) for (let r = Math.min(s.r1, s.r2); r <= Math.max(s.r1, s.r2); r++) for (let c = Math.min(s.c1, s.c2); c <= Math.max(s.c1, s.c2); c++) { const n = td(r, c); if (n) n.classList.add('sel'); }
        const n = td(S.cur.r, S.cur.c); if (n) { n.classList.add('cur'); const sc = $('#g-scroll'); const nb = n.getBoundingClientRect(), sb = sc.getBoundingClientRect(); if (nb.bottom > sb.bottom - 36) sc.scrollTop += nb.bottom - sb.bottom + 40; else if (nb.top < sb.top + 50) sc.scrollTop -= sb.top - nb.top + 52; if (nb.right > sb.right) sc.scrollLeft += nb.right - sb.right + 20; else if (nb.left < sb.left + 260) sc.scrollLeft -= sb.left + 260 - nb.left; }
        stat();
      }
      function stat() {
        const s = S.sel; let n = 1, sum = null; const c0 = cols[S.cur.c];
        if (s) { n = (Math.abs(s.r2 - s.r1) + 1) * (Math.abs(s.c2 - s.c1) + 1); if (s.c1 === s.c2 && cols[s.c1] && ['list_price', 'cost_price', 'max_discount_per_unit', 'min_sell_price'].includes(cols[s.c1].k)) { sum = 0; for (let r = Math.min(s.r1, s.r2); r <= Math.max(s.r1, s.r2); r++) sum += S.rows[r] ? Number(cols[s.c1].get(S.rows[r])) || 0 : 0; } }
        const p = S.rows[S.cur.r]; $('#g-stat').innerHTML = `<span>${esc(PD.t('inv.rows', { n: PD.digits(S.rows.length) }))}</span>${p ? `<span><b>${esc(p.name)}</b> · ${esc(PD.t(c0.l))}</span>` : ''}${n > 1 ? `<span>${esc(PD.t('inv.sel', { n: PD.digits(n) }))}${sum != null ? ` · ${esc(PD.t('inv.sum'))} <b>${PD.money(sum)}</b>` : ''}</span>` : ''}`;
      }

      /* ---------- staging ---------- */
      function parseCell(p, c, text) {
        const s = String(text).trim(); const t = TYPES[c.k];
        if (t === 'text') return s ? { value: s, text: s } : null;
        if (t === 'money') { if (c.k === 'min_sell_price' && s === '') return { value: null, text: '' }; const v = U.takaToPaisa(s); return v == null ? null : { value: v, text: PD.money(v) }; }
        if (t === 'int') { if (!/^\d+$/.test(s)) return null; return { value: +s, text: PD.digits(s) }; }
        if (t === 'qty') { const q = parseQty(p, s); return q ? { value: q, text: qtyShow(p, q) } : null; }
        return null;
      }
      function raw(p, c) { const t = TYPES[c.k]; const v = c.get(p); if (t === 'money') return v == null ? '' : U.paisaToTaka(v); if (t === 'qty') return ''; return v == null ? '' : String(v); }
      function stage(r, ci, text, group) {
        const p = S.rows[r], c = cols[ci]; if (!p || !editable(c, p)) return false; const pr = parseCell(p, c, text); if (!pr) { PD.toast(PD.t('inv.badValue'), 'warn'); return false; }
        const key = p.id + '|' + c.k; const prev = S.staged.get(key); if (group) group.push({ key, prev });
        const same = (TYPES[c.k] === 'text' && pr.value === c.get(p)) || (TYPES[c.k] === 'money' && pr.value === (c.get(p) == null ? null : c.get(p))) || (TYPES[c.k] === 'int' && pr.value === c.get(p));
        if (same) S.staged.delete(key); else S.staged.set(key, { pid: p.id, field: c.k, value: pr.value, text: pr.text, old: c.get(p), name: p.name }); idleReset(); return true;
      }
      function pushUndo(g) { if (g.length) S.undo.push(g); }
      function undoLast() { const g = S.undo.pop(); if (!g) return; g.slice().reverse().forEach((x) => { if (x.prev) S.staged.set(x.key, x.prev); else S.staged.delete(x.key); }); paint(); banner(); }

      /* ---------- cell editing ---------- */
      function beginEdit(initial) {
        const p = S.rows[S.cur.r], c = cols[S.cur.c]; if (!p || !editable(c, p)) return; const n = td(S.cur.r, S.cur.c); if (!n) return;
        const st = S.staged.get(p.id + '|' + c.k); const start = initial != null ? initial : st ? st.text.replace(/[^\d.+pP]/g, '') : raw(p, c); const hold = n.innerHTML;
        n.innerHTML = `<input class="ce" value="${esc(start)}" inputmode="${TYPES[c.k] === 'text' ? 'text' : 'decimal'}" ${TYPES[c.k] === 'qty' ? `placeholder="${p.sell_mode === 'by_kg' ? 'kg' : '3 · 3+4 · 20p'}"` : ''}>`; const inp = n.firstChild; S.editing = { r: S.cur.r, c: S.cur.c, hold }; inp.focus(); if (initial == null) inp.select(); else inp.setSelectionRange(inp.value.length, inp.value.length);
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); endEdit(true); move(1, 0); } else if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); endEdit(true); move(0, e.shiftKey ? -1 : 1); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endEdit(false); } else e.stopPropagation();
        }); inp.addEventListener('blur', () => { if (S.editing) endEdit(true); });
      }
      function endEdit(commit) {
        const ed = S.editing; if (!ed) return; S.editing = null; const n = td(ed.r, ed.c); const inp = n && n.querySelector('input'); const val = inp ? inp.value : '';
        if (commit && val.trim() !== '') { const g = []; if (stage(ed.r, ed.c, val, g)) pushUndo(g); }
        paint(); banner(); $('#g-scroll').focus();
      }
      function move(dr, dc, extend) {
        const nr = Math.max(0, Math.min(S.rows.length - 1, S.cur.r + dr)), nc = Math.max(0, Math.min(cols.length - 1, S.cur.c + dc));
        if (extend) { S.sel = S.sel || { r1: S.cur.r, c1: S.cur.c, r2: S.cur.r, c2: S.cur.c }; S.sel.r2 = nr; S.sel.c2 = nc; S.cur = { r: nr, c: nc }; } else { S.sel = null; S.cur = { r: nr, c: nc }; }
        mark(); idleReset();
      }
      const bounds = () => { const s = S.sel || { r1: S.cur.r, c1: S.cur.c, r2: S.cur.r, c2: S.cur.c }; return { r1: Math.min(s.r1, s.r2), r2: Math.max(s.r1, s.r2), c1: Math.min(s.c1, s.c2), c2: Math.max(s.c1, s.c2) }; };
      function copy() { const b = bounds(); const lines = []; for (let r = b.r1; r <= b.r2; r++) { const row = []; for (let c = b.c1; c <= b.c2; c++) { const n = td(r, c); row.push(n ? n.textContent.replace(/\s~$/, '') : ''); } lines.push(row.join('\t')); } try { navigator.clipboard.writeText(lines.join('\n')); } catch (e) { /* no clipboard */ } PD.toast(PD.t('calc.copied'), 'ok'); }
      async function paste() {
        let text = ''; try { text = await navigator.clipboard.readText(); } catch (e) { return; } if (!text) return; const g = []; let bad = 0;
        text.replace(/\r/g, '').split('\n').filter((l, i, a) => l !== '' || i < a.length - 1).forEach((line, i) => line.split('\t').forEach((v, j) => { const r = S.cur.r + i, c = S.cur.c + j; if (r < S.rows.length && c < cols.length) { const cell = cols[c]; const clean = TYPES[cell.k] === 'money' ? v.replace(/[^\d.]/g, '') : v; if (editable(cell, S.rows[r])) { if (!stage(r, c, clean, g)) bad++; } } })); pushUndo(g); paint(); banner();
      }
      function fillDown() { const b = bounds(); if (b.r1 === b.r2) { b.r1 = Math.max(0, b.r1 - 1); } const g = []; for (let c = b.c1; c <= b.c2; c++) { const src = S.staged.get(S.rows[b.r1].id + '|' + cols[c].k); const txt = src ? (TYPES[cols[c].k] === 'money' ? U.paisaToTaka(src.value) : TYPES[cols[c].k] === 'qty' ? src.text.replace(/[^\d.+pP]/g, '') : String(src.value)) : raw(S.rows[b.r1], cols[c]); if (txt === '') continue; for (let r = b.r1 + 1; r <= b.r2; r++) stage(r, c, txt, g); } pushUndo(g); paint(); banner(); }
      $('#g-scroll').addEventListener('mousedown', (e) => { const n = e.target.closest('td[data-r]'); if (!n) return; if (S.editing) endEdit(true); const r = +n.dataset.r, c = +n.dataset.c; if (e.shiftKey) { S.sel = S.sel || { r1: S.cur.r, c1: S.cur.c, r2: S.cur.r, c2: S.cur.c }; S.sel.r2 = r; S.sel.c2 = c; } else { S.sel = null; S.cur = { r, c }; } mark(); idleReset(); });
      $('#g-scroll').addEventListener('dblclick', (e) => { if (e.target.closest('td.ed')) beginEdit(); });
      $('#g-scroll').addEventListener('keydown', (e) => {
        if (S.editing) return; const k = e.key; const ctrl = e.ctrlKey || e.metaKey;
        if (k === 'ArrowDown') { e.preventDefault(); move(1, 0, e.shiftKey); } else if (k === 'ArrowUp') { e.preventDefault(); move(-1, 0, e.shiftKey); } else if (k === 'ArrowRight') { e.preventDefault(); move(0, 1, e.shiftKey); } else if (k === 'ArrowLeft') { e.preventDefault(); move(0, -1, e.shiftKey); }
        else if (k === 'Tab') { e.preventDefault(); move(0, e.shiftKey ? -1 : 1); } else if (k === 'Enter' || k === 'F2') { e.preventDefault(); beginEdit(); } else if (k === 'Escape') { S.sel = null; mark(); }
        else if (ctrl && k.toLowerCase() === 'c') { e.preventDefault(); copy(); } else if (ctrl && k.toLowerCase() === 'v') { e.preventDefault(); paste(); } else if (ctrl && k.toLowerCase() === 'd') { e.preventDefault(); fillDown(); } else if (ctrl && k.toLowerCase() === 'z') { e.preventDefault(); undoLast(); } else if (ctrl && k.toLowerCase() === 's') { e.preventDefault(); if (S.staged.size) review(); }
        else if (k === 'Home') { e.preventDefault(); S.cur.c = 0; mark(); } else if (k === 'End') { e.preventDefault(); S.cur.c = cols.length - 1; mark(); } else if (k === 'PageDown') { e.preventDefault(); move(10, 0); } else if (k === 'PageUp') { e.preventDefault(); move(-10, 0); }
        else if ((k === 'Delete' || k === 'Backspace') && cols[S.cur.c].k === 'min_sell_price') { e.preventDefault(); const g = []; stage(S.cur.r, S.cur.c, '', g); pushUndo(g); paint(); banner(); }
        else if (k.length === 1 && !ctrl && !e.altKey) { const p = S.rows[S.cur.r]; if (p && editable(cols[S.cur.c], p)) { e.preventDefault(); beginEdit(k); } }
      });

      /* ---------- edit mode ---------- */
      function idleReset() { clearTimeout(S.idleT); if (!S.edit) return; S.idleT = setTimeout(() => { if (S.edit) setEdit(false, true); }, idle * 60000); }
      async function setEdit(on, auto) {
        if (!on) { if (PD.editPin()) await PD.try('editmode.disable', {}); S.edit = false; clearTimeout(S.idleT); if (auto) PD.toast(PD.t('inv.editOff'), 'warn'); } else S.edit = true;
        bar(); paint(); banner(); $('#g-scroll').focus(); idleReset();
      }
      function toggleEdit() {
        if (S.edit) { if (S.staged.size && !confirmLeave()) return; setEdit(false); return; }
        if (!PD.editPin()) { setEdit(true); return; }
        let done = false;
        const m = PD.modal({ title: ic('key') + ' ' + esc(PD.t('inv.pinTitle')), titleText: PD.t('inv.pinTitle'), body: `<p class="muted" style="margin:0 0 10px">${esc(PD.t('inv.pinText'))}</p><label class="l" for="em-pin">${esc(PD.t('inv.pin'))}</label><input class="in" id="em-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" style="width:100%;text-align:center;letter-spacing:.4em"><div class="bad-t small" id="em-err" style="min-height:18px;margin-top:6px"></div>`,
          buttons: [{ label: PD.t('common.cancel') }, { label: PD.t('approve.go'), cls: 'p', main: true, onClick: async (mm) => { const [, e] = await PD.try('editmode.enable', { owner_pin: $('#em-pin', mm.el).value }); if (e) { $('#em-err', mm.el).textContent = e.details && e.details.code === 'BAD_PIN' ? PD.t('inv.pinBad') : PD.errText(e); $('#em-pin', mm.el).value = ''; return false; } done = true; setEdit(true); } }] });
        void m; void done;
      }
      const confirmLeave = () => true;

      /* ---------- review / apply / undo ---------- */
      async function review() {
        if (!S.staged.size) return; const edits = Array.from(S.staged.values()).map((s) => ({ product_id: s.pid, field: s.field, value: s.value })); const needReason = edits.some((e) => e.field === 'stock' || e.field === 'cost_price' || e.field === 'list_price');
        const [dry, e] = await PD.try('grid.applyBatch', { edits: edits.map((x) => Object.assign({}, x, { reason: 'review' })), dry_run: true }); if (e) { if (e.code === 'LOCKED') { setEdit(false, true); return; } U.err(e); return; }
        const staged = Array.from(S.staged.values()); const bad = dry.results.some((r) => !r.ok);
        const rowsH = staged.map((s, i) => { const r = dry.results[i]; const old = r && r.old != null ? (typeof r.old === 'object' ? (r.old.kg ? PD.digits(r.old.kg) + ' ' + PD.t('unit.kg') : PD.digits((r.old.cartons || 0) + (r.old.pcs ? '+' + r.old.pcs : '')) + ' ' + PD.t('unit.ctn')) : TYPES[s.field] === 'money' ? PD.money(r.old) : PD.digits(r.old)) : '–'; return `<tr class="${r && !r.ok ? 'flag' : ''}"><td>${esc(s.name)}</td><td>${esc(PD.t(FIELD_LABEL[s.field]))}</td><td class="r">${esc(old)}</td><td class="r"><b>${esc(s.text)}</b></td><td>${r && r.ok ? U.pill('ok', 'OK') : `<span class="bad-t small">${esc(r ? r.message || r.code : '')}</span>`}</td></tr>`; }).join('');
        PD.modal({ title: esc(PD.t('inv.reviewTitle')), titleText: PD.t('inv.reviewTitle'), size: 'wide', body: `<div class="tw" style="max-height:44vh"><table class="t"><thead><tr><th>${esc(PD.t('inv.c.name'))}</th><th>${esc(PD.t('inv.col.field'))}</th><th class="r">${esc(PD.t('inv.col.old'))}</th><th class="r">${esc(PD.t('inv.col.new'))}</th><th>${esc(PD.t('inv.col.res'))}</th></tr></thead><tbody>${rowsH}</tbody></table></div>${bad ? `<p class="note bad" style="margin-top:10px">${esc(PD.t('inv.errorsFix'))}</p>` : ''}<div style="margin-top:12px"><label class="l" for="rv-why">${esc(PD.t('inv.reason'))}${needReason ? ' *' : ''}</label><input class="in" id="rv-why" style="width:100%"></div>`,
          buttons: [{ label: PD.t('common.cancel') }].concat(bad ? [] : [{ label: ic('check') + ' ' + esc(PD.t('inv.apply')), cls: 'p', main: true, onClick: async (m) => {
            const why = $('#rv-why', m.el).value.trim(); if (needReason && !why) { PD.toast(PD.t('common.required') + ': ' + PD.t('inv.reason'), 'warn'); return false; }
            const [d, er] = await PD.try('grid.applyBatch', { edits: edits.map((x) => Object.assign({}, x, { reason: why || PD.t('inv.gridEdit') })) }); if (er) { if (er.code === 'LOCKED') { setEdit(false, true); return; } U.err(er); return false; }
            S.inverse = d.inverse && d.inverse.length ? d.inverse.map((x) => Object.assign({}, x, { reason: 'undo: ' + (why || '') })) : null; PD.toast(PD.t('inv.applied', { n: PD.digits(d.applied) }), 'ok'); PD.renderStatus(); await load(); } }]) });
      }
      async function undoSave() {
        if (!S.inverse) return; const [, e] = await PD.try('grid.applyBatch', { edits: S.inverse }); if (e) { if (e.code === 'LOCKED') { setEdit(false, true); return; } U.err(e); return; } S.inverse = null; PD.toast(PD.t('inv.undone'), 'ok'); await load();
      }

      /* ---------- detail / form / count / log / import ---------- */
      async function detail(p) {
        const [d, e] = await PD.try('products.get', { id: p.id }); if (e) { U.err(e); return; } const pr = d.product;
        const m = PD.modal({ title: esc(pr.name), titleText: pr.name, size: 'wide', body: `<div class="row wrap" style="gap:8px;margin-bottom:10px"><span class="chip">${esc(pr.sku)}</span><span class="chip">${esc(pr.company_name || PD.t('inv.noCo'))}</span><span class="chip">${esc(PD.t('inv.c.price'))}: ${PD.money(pr.list_price)}</span><span class="chip">${esc(PD.t('inv.c.stock'))}: <b>${esc(U.qty(pr.stock))}</b></span>${U.pill(pr.status === 'ok' ? 'ok' : pr.status === 'low' ? 'low' : 'out', PD.t('st.' + pr.status))}</div>
          <h4 style="margin:4px 0">${esc(PD.t('inv.sold30'))}</h4>${U.chart(d.sold30.map((x) => ({ label: PD.digits(x.date.slice(5).replace('-', '/')), value: x.qty_base })), { type: 'bar', h: 120, fmt: (v) => PD.digits(v) })}
          <h4 style="margin:12px 0 4px">${esc(PD.t('inv.lots'))}</h4>${U.table([{ label: PD.t('lots.c.received'), f: (l) => PD.date(l.received_date) }, { label: PD.t('lots.c.expiry'), f: (l) => (l.expiry_date ? PD.date(l.expiry_date) : '') }, { label: PD.t('lots.c.remaining'), r: 1, f: (l) => U.qty(l.remaining) }].concat(owner ? [{ label: PD.t('inv.c.cost'), r: 1, f: (l) => PD.money(l.unit_cost) }] : []), d.lots.filter((l) => l.remaining.base > 0))}
          <h4 style="margin:12px 0 4px">${esc(PD.t('inv.byMonth'))}</h4>${U.table([{ label: PD.t('lots.c.month'), f: (x) => x.month }, { label: PD.t('lots.c.received'), r: 1, f: (x) => U.qty(x.received) }, { label: PD.t('lots.c.remaining'), r: 1, f: (x) => U.qty(x.remaining) }], d.by_month)}`,
          buttons: [{ label: PD.t('common.close') }].concat(owner ? [{ label: esc(PD.t(pr.active === false ? 'inv.restore' : 'inv.archive')), onClick: async () => { const [, er] = await PD.try('products.archive', { id: pr.id, archived: pr.active !== false }); if (er) { U.err(er); return false; } load(); } }, { label: ic('edit') + ' ' + esc(PD.t('inv.edit')), cls: 'p', onClick: () => { setTimeout(() => productForm(pr, load), 0); } }] : []) });
        void m;
      }
      load(); bar(); $('#g-scroll').focus();
      el._cleanup = () => { clearTimeout(S.idleT); };
    }
  };

    function stockIn(p0, done) {
      let cur = p0 || null;
      const m = PD.modal({ title: ic('plus') + ' ' + esc(PD.t('si.title')), titleText: PD.t('si.title'), size: 'wide',
        body: `<div id="si-pk" style="max-width:420px;margin-bottom:10px"></div><div id="si-f"></div>`,
        buttons: [{ label: PD.t('common.close') }, { label: ic('check') + ' ' + esc(PD.t('si.next')), main: false, onClick: (mm) => { save(mm, true); return false; } }, { label: ic('check') + ' ' + esc(PD.t('common.save')), cls: 'p', main: true, onClick: (mm) => save(mm, false) }] });
      const box = m.el;
      function form() {
        const f = $('#si-f', box); if (!cur) { f.innerHTML = ''; return; }
        f.innerHTML = `<div class="row wrap" style="gap:8px;margin-bottom:8px"><span class="chip"><b>${esc(cur.name)}</b></span><span class="chip">${esc(PD.t('inv.c.stock'))}: ${esc(U.qty(cur.stock))}</span></div><div class="fgrid">${U.field('si-q', PD.t('si.qty'), U.qtyHtml('si-q', cur, {}))}${cur.sell_mode !== 'by_kg' && !cur.pcs_per_carton ? U.field('si-ppc', PD.t('pur.c.ppc'), '<input class="in r" id="si-ppc" inputmode="numeric">') : ''}${U.field('si-c', PD.t('pur.c.cost'), U.moneyIn('si-c', cur.cost_price))}${U.field('si-p', PD.t('pur.c.sell'), U.moneyIn('si-p', cur.list_price > 0 ? cur.list_price : null))}${U.field('si-d', PD.t('lots.c.received'), `<input type="date" class="in" id="si-d" value="${U.today()}" max="${U.today()}">`)}${U.field('si-x', PD.t('lots.c.expiry'), '<input type="date" class="in" id="si-x">')}${U.field('si-r', PD.t('inv.reason'), `<input class="in" id="si-r" value="${esc(PD.t('si.reason'))}">`)}</div><div class="bad-t small" id="si-e"></div>`;
      }
      const pk = U.prodPicker($('#si-pk', box), { placeholder: PD.t('prod.search'), onPick: (it) => { cur = it.raw; form(); } }); void pk;
      if (cur) { $('#si-pk', box).style.display = 'none'; form(); }
      async function save(mm, again) {
        if (!cur) { $('#si-e', box) && ($('#si-e', box).textContent = ''); PD.toast(PD.t('si.pick'), 'warn'); return false; }
        const q = U.qtyRead(box, 'si-q', cur); if (U.qtyEmpty(q)) { $('#si-e', box).textContent = PD.t('si.needQty'); return false; }
        const patch = {}; const ppc = $('#si-ppc', box);
        if (ppc) { const v = parseInt(ppc.value, 10); if (!(v > 0)) { $('#si-e', box).textContent = PD.t('pur.ppcNeed'); return false; } patch.pcs_per_carton = v; }
        const cost = U.moneyRead(box, 'si-c'); if (!cost || cost <= 0) { $('#si-e', box).textContent = PD.t('si.needCost'); return false; } if (cost !== cur.cost_price) patch.cost_price = cost;
        const sell = U.moneyRead(box, 'si-p'); if (sell && sell !== cur.list_price) patch.list_price = sell;
        if (Object.keys(patch).length) { const [np, pe] = await U.patchProduct(cur, patch); if (pe) { if (pe.code !== 'CANCELLED') $('#si-e', box).textContent = PD.errText(pe); return false; } cur = np.product || np || Object.assign({}, cur, patch); }
        const b = { product_id: cur.id, delta: q, sign: 'plus', reason: $('#si-r', box).value.trim() || PD.t('si.reason') }; const rd = $('#si-d', box).value; const ex = $('#si-x', box).value; if (rd) b.received_date = rd; if (ex) b.expiry_date = ex;
        const [, e] = await U.withEdit(() => PD.try('stock.adjust', b)); if (e) { if (e.code !== 'CANCELLED') $('#si-e', box).textContent = PD.errText(e); return false; }
        PD.toast(PD.t('si.done', { n: cur.name }), 'ok'); done();
        if (again) { cur = null; $('#si-pk', box).style.display = ''; const i = $('#si-pk input', box); if (i) { i.value = ''; i.focus(); } form(); return false; }
      }
    }
    async function quickAdd(done) {
      const [cs] = await PD.try('companies.list', {}); const co = cs ? cs.rows : [];
      PD.modal({ title: ic('plus') + ' ' + esc(PD.t('qa.title')), titleText: PD.t('qa.title'), size: 'wide',
        body: `<p class="muted" style="margin:0 0 8px">${esc(PD.t('qa.help'))}</p><div class="row wrap" style="gap:12px;margin-bottom:8px">${U.field('qa-co', PD.t('pur.company'), `<select class="in" id="qa-co"><option value="">–</option>${co.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>`)}<label class="row small" style="gap:6px"><input type="checkbox" id="qa-kg"> ${esc(PD.t('qa.kg'))}</label></div><textarea class="in" id="qa-t" rows="12" style="width:100%;font-family:inherit"></textarea><div class="small muted" id="qa-n" style="margin-top:6px"></div><div class="bad-t small" id="qa-e"></div>`,
        buttons: [{ label: PD.t('common.cancel') }, { label: ic('check') + ' ' + esc(PD.t('qa.go')), cls: 'p', main: true, onClick: async (m) => {
          const kg = $('#qa-kg', m.el).checked; const cid = $('#qa-co', m.el).value;
          const items = []; const seen = new Set();
          $('#qa-t', m.el).value.split(/\r?\n/).forEach((ln) => { const c = ln.split(/[\t,]/).map((x) => x.trim()); const name = c[0]; if (!name || seen.has(name.toLowerCase())) return; seen.add(name.toLowerCase()); const it = { name }; if (kg) { if (c[1]) it.price = U.takaToPaisa(c[1]); } else { if (c[1] && parseInt(c[1], 10) > 0) it.ppc = parseInt(c[1], 10); if (c[2]) it.price = U.takaToPaisa(c[2]); } items.push(it); });
          if (!items.length) { $('#qa-e', m.el).textContent = PD.t('qa.empty'); return false; }
          const have = new Set(); let cur; for (let i = 0; i < 40; i++) { const [d] = await PD.try('products.list', { limit: 500, cursor: cur || undefined, include_archived: true }); if (!d) break; d.rows.forEach((r) => have.add(String(r.name).toLowerCase())); cur = d.page && d.page.next_cursor; if (!cur) break; }
          let n = have.size; let ok = 0, skipped = 0;
          for (const it of items) {
            if (have.has(it.name.toLowerCase())) { skipped++; continue; }
            const body = { name: it.name, sell_mode: kg ? 'by_kg' : 'carton_pcs', list_price: it.price || 0, max_discount: { per_unit: 0 } }; if (cid) body.company_id = +cid; if (it.ppc) body.pcs_per_carton = it.ppc;
            let saved = false, err = null;
            for (let t = 0; t < 8 && !saved; t++) { body.sku = 'P' + String(++n).padStart(4, '0'); const [, e] = await U.withEdit(() => PD.try('products.save', body)); if (!e) saved = true; else if (e.code !== 'DUPLICATE') { err = e; break; } }
            if (err) { $('#qa-e', m.el).textContent = err.code === 'CANCELLED' ? '' : PD.errText(err); if (err.code === 'CANCELLED') return false; break; }
            if (saved) { ok++; $('#qa-n', m.el).textContent = PD.t('qa.progress', { a: PD.digits(ok), b: PD.digits(items.length - skipped) }); }
          }
          PD.toast(PD.t('qa.done', { a: PD.digits(ok), b: PD.digits(skipped) }), ok ? 'ok' : 'warn'); done(); } }] });
    }

  /* add/edit product (owner) */
  function productForm(p, onSaved) {
    const v = p || { sell_mode: 'carton_pcs', max_discount: {} }; let mode = v.sell_mode;
    PD.try('companies.list', {}).then(([cs]) => {
      const co = cs ? cs.rows : [];
      const m = PD.modal({ title: esc(PD.t(p ? 'inv.edit' : 'inv.add')), titleText: PD.t('inv.add'), size: 'wide', body: `<div class="fgrid">${U.field('pf-sku', PD.t('inv.f.sku'), `<input class="in" id="pf-sku" value="${esc(v.sku)}">`)}${U.field('pf-name', PD.t('inv.f.name'), `<input class="in" id="pf-name" value="${esc(v.name)}">`)}${U.field('pf-co', PD.t('inv.c.company'), `<select class="in" id="pf-co"><option value="">${esc(PD.t('inv.noCo'))}</option>${co.map((c) => `<option value="${c.id}" ${c.id === v.company_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`)}${U.field('pf-mode', PD.t('inv.f.mode'), `<select class="in" id="pf-mode" ${p ? 'disabled' : ''}>${U.opts([['carton_pcs', PD.t('inv.f.cartonPcs')], ['by_kg', PD.t('inv.f.byKg')]], mode)}</select>`)}
        <div id="pf-ppc-w">${U.field('pf-ppc', PD.t('inv.f.ppc'), `<input class="in r" id="pf-ppc" inputmode="numeric" value="${esc(v.pcs_per_carton || '')}">`)}</div><div id="pf-doz-w">${U.field('pf-doz', PD.t('inv.f.dozen'), `<input class="in r" id="pf-doz" inputmode="numeric" value="${esc(v.pcs_per_dozen || '')}">`)}</div>${U.field('pf-gpc', PD.t('inv.f.gpc'), `<input class="in r" id="pf-gpc" inputmode="numeric" value="${esc(v.grams_per_carton || '')}">`)}
        ${U.field('pf-pr', PD.t('inv.f.price'), U.moneyIn('pf-pr', v.list_price))}${U.field('pf-rt', PD.t('inv.f.retail'), U.moneyIn('pf-rt', v.retail_price))}${U.field('pf-cost', PD.t('inv.f.cost'), U.moneyIn('pf-cost', v.cost_price))}${U.field('pf-md', PD.t('inv.f.maxd'), U.moneyIn('pf-md', v.max_discount.per_unit))}${U.field('pf-mp', PD.t('inv.f.maxp'), `<input class="in r" id="pf-mp" inputmode="decimal" value="${v.max_discount.percent_bp ? (v.max_discount.percent_bp / 100) : ''}">`)}${U.field('pf-ms', PD.t('inv.f.mins'), U.moneyIn('pf-ms', v.min_sell_price))}<div id="pf-minq">${U.field('pf-minqf', PD.t('inv.f.minStock'), '<div id="pf-minqi"></div>')}</div></div>`,
        buttons: [{ label: PD.t('common.cancel') }, { label: PD.t('common.save'), cls: 'p', main: true, onClick: async (mm) => {
          const g = (id) => $('#' + id, mm.el).value.trim(); const money = (id) => U.moneyRead(mm.el, id); const int = (id) => (g(id) ? parseInt(g(id).replace(/\D/g, ''), 10) : undefined);
          const b = { sku: g('pf-sku'), name: g('pf-name'), sell_mode: mode, list_price: money('pf-pr'), max_discount: { per_unit: money('pf-md') || 0 } }; if (money('pf-rt')) b.retail_price = money('pf-rt'); if (g('pf-co')) b.company_id = +g('pf-co'); if (p) b.id = p.id;
          if (b.list_price == null) { PD.toast(PD.t('common.required') + ': ' + PD.t('inv.c.price'), 'warn'); return false; } if (mode === 'carton_pcs') { b.pcs_per_carton = int('pf-ppc'); const dz = int('pf-doz'); if (dz) b.pcs_per_dozen = dz; } const gp = int('pf-gpc'); if (gp) b.grams_per_carton = gp;
          const c = money('pf-cost'); if (c != null) b.cost_price = c; if (g('pf-mp')) b.max_discount.percent_bp = Math.round(parseFloat(g('pf-mp')) * 100); const ms = money('pf-ms'); if (ms) b.min_sell_price = ms; const mq = U.qtyRead(mm.el, 'pf-mq', { sell_mode: mode }); if (!U.qtyEmpty(mq)) b.min_stock = mq;
          const [d, e] = await PD.try('products.save', b); if (e) { if (e.code === 'DUPLICATE') PD.toast(PD.t('inv.f.sku') + ': ' + PD.t('err.DUPLICATE'), 'bad'); else U.err(e); return false; } PD.toast(PD.t('inv.saved'), 'ok'); if (onSaved) onSaved(d); } }] });
      const sync = () => { $('#pf-ppc-w', m.el).style.display = $('#pf-doz-w', m.el).style.display = mode === 'carton_pcs' ? '' : 'none'; $('#pf-minqi', m.el).innerHTML = U.qtyHtml('pf-mq', { sell_mode: mode }, {}); };
      $('#pf-mode', m.el).addEventListener('change', (e) => { mode = e.target.value; sync(); }); sync();
    });
  }
  PD.productForm = productForm;

  /* stock count (both roles) */
  async function countDialog() {
    const [pl] = await PD.try('products.list', { limit: 500 }); if (!pl) return; const rows = pl.rows; let q = '';
    const m = PD.modal({ title: ic('check') + ' ' + esc(PD.t('cnt.title')), titleText: PD.t('cnt.title'), size: 'wide', body: `<p class="muted" style="margin:0 0 8px">${esc(PD.t('cnt.help'))}</p><input class="in" id="cn-q" style="width:260px;margin-bottom:8px" placeholder="${esc(PD.t('common.search'))}"><div id="cn-t" style="max-height:46vh;overflow:auto"></div>`,
      buttons: [{ label: PD.t('common.cancel') }, { label: PD.t('common.save'), cls: 'p', main: true, onClick: async (mm) => {
        const lines = []; rows.forEach((p) => { const inp = $('[data-cn="' + p.id + '"]', mm.el); const val = inp ? inp.value : (mm._vals && mm._vals[p.id]); if (val) { const qv = parseQty(p, val); if (qv) lines.push({ product_id: p.id, counted: qv }); } });
        const vals = mm._vals || {}; Object.keys(vals).forEach((id) => { if (!lines.some((l) => l.product_id === +id)) { const p = rows.find((r) => r.id === +id); const qv = parseQty(p, vals[id]); if (qv) lines.push({ product_id: +id, counted: qv }); } });
        if (!lines.length) { PD.toast(PD.t('cnt.help'), 'warn'); return false; } const [, e] = await PD.try('stock.count.submit', { date: U.today(), lines }); if (e) { U.err(e); return false; } PD.toast(PD.t('cnt.saved'), 'ok'); PD.renderStatus(); } }] });
    m._vals = {};
    const draw = () => { const f = rows.filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 80); $('#cn-t', m.el).innerHTML = U.table([{ label: PD.t('inv.c.name'), f: (p) => p.name }, { label: PD.t('cnt.expected'), r: 1, f: (p) => U.qty(p.stock) }, { label: PD.t('cnt.counted'), r: 1, raw: 1, f: (p) => `<input class="in sm r" style="width:120px" data-cn="${p.id}" value="${esc(m._vals[p.id] || '')}" placeholder="${p.sell_mode === 'by_kg' ? 'kg' : '3 · 3+4 · 20p'}">` }], f); $$('[data-cn]', m.el).forEach((n) => n.addEventListener('input', () => { m._vals[n.dataset.cn] = n.value; })); };
    $('#cn-q', m.el).addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); draw(); }); draw();
  }
  PD.countDialog = countDialog;

  async function changeLog() {
    const [d, e] = await PD.try('audit.list', { limit: 300 }); if (e) { U.err(e); return; } const keep = ['grid.edit', 'stock.adjust', 'product.create', 'product.update', 'product.archive', 'product.restore', 'import.commit', 'stock.count'];
    const rows = d.rows.filter((r) => keep.includes(r.action));
    PD.modal({ title: ic('shield') + ' ' + esc(PD.t('log.title')), titleText: PD.t('log.title'), size: 'wide', body: `<div style="max-height:56vh;overflow:auto">${U.table([{ label: PD.t('log.when'), f: (r) => U.dt(r.ts) }, { label: PD.t('log.who'), f: (r) => r.user }, { label: PD.t('log.what'), f: (r) => r.action + ' · ' + (r.entity_id || '') }, { label: PD.t('inv.col.old'), f: (r) => r.old || '' }, { label: PD.t('inv.col.new'), f: (r) => r.new || '' }, { label: PD.t('common.reason'), f: (r) => r.reason || '' }], rows)}</div>`, buttons: [{ label: PD.t('common.close') }] });
  }

  PD.invTools = { get quickAdd() { return quickAdd; }, get stockIn() { return stockIn; }, get productForm() { return productForm; }, get importWizard() { return importWizard; } };
  async function importWizard() {
    const [f, e] = await PD.try('import.pickFile', { kind: 'products_csv' }); if (e) { U.err(e); return; } let mapping = null; let pv = null; const res = {}; let mode = 'insert_only';
    const m = PD.modal({ title: ic('upload') + ' ' + esc(PD.t('imp.title')), titleText: PD.t('imp.title'), size: 'wide', body: '<div id="im-b"></div>', buttons: [{ label: PD.t('common.cancel') }, { label: PD.t('imp.commit'), cls: 'p', main: true, onClick: async () => {
      const resolutions = Object.keys(res).map((r) => ({ row: +r, action: res[r] })); const [d, er] = await PD.try('import.commit', { handle: f.handle, mapping: mapping || pv.suggested_mapping, resolutions, mode }); if (er) { U.err(er); return false; } PD.toast(PD.t('imp.done', { i: PD.digits(d.inserted), u: PD.digits(d.updated), s: PD.digits(d.skipped) }), 'ok'); PD.refreshApp(); } }] });
    async function prev() {
      const [d, er] = await PD.try('import.preview', { handle: f.handle, mapping: mapping || undefined }); if (er) { U.err(er); return; } pv = d; mapping = mapping || d.suggested_mapping; const fields = ['sku', 'name', 'company', 'list_price', 'cost_price', 'pcs_per_carton', 'grams_per_carton', 'original_name'];
      const iss = d.issues.filter((i) => i.severity === 'error' || i.kind !== 'missing_pcs_per_carton'); const byRow = {}; iss.forEach((i) => { (byRow[i.row] = byRow[i.row] || []).push(i); }); Object.keys(byRow).forEach((r) => { if (res[r] === undefined) res[r] = byRow[r].some((x) => x.severity === 'error') ? 'skip' : 'import_as_is'; });
      $('#im-b', m.el).innerHTML = `<p class="muted small" style="margin:0 0 8px">${esc(f.name)}</p><h4 style="margin:4px 0">${esc(PD.t('imp.map'))}</h4><div class="fgrid">${d.columns.map((c) => U.field('mp-' + c, c, `<select class="in" data-map="${esc(c)}">${U.opts([['', PD.t('imp.f.none')]].concat(fields.map((k) => [k, PD.t('imp.f.' + k)])), mapping[c] || '')}</select>`)).join('')}</div>
        <p class="note info" style="margin:10px 0">${esc(PD.t('imp.valid', { n: PD.digits(d.valid) }))}</p>
        <div class="fgrid" style="margin-bottom:10px">${U.field('im-mode', PD.t('imp.mode'), `<select class="in" id="im-mode">${U.opts([['insert_only', PD.t('imp.m.insert')], ['upsert_by_sku', PD.t('imp.m.upsert')]], mode)}</select>`)}</div>
        ${Object.keys(byRow).length ? `<h4 style="margin:4px 0">${esc(PD.t('imp.issues'))}</h4><div class="row wrap" style="gap:8px;margin-bottom:8px"><span class="small muted">${esc(PD.t('imp.bulk'))}</span><select class="in sm" id="im-bulk">${U.opts([['', '—'], ['import_as_is', PD.t('imp.act.asis')], ['skip', PD.t('imp.act.skip')]], '')}</select><span class="small muted">${esc(PD.t('imp.bulkHelp'))}</span></div><div class="lst" style="max-height:230px;overflow:auto">${Object.keys(byRow).map((r) => `<div class="it"><b>${esc(PD.t('imp.row', { n: PD.digits(r) }))}</b><span>${esc(byRow[r][0].sku || '')}</span><span class="small ${byRow[r].some((x) => x.severity === 'error') ? 'bad-t' : 'warn-t'}">${byRow[r].map((x) => esc(x.message)).join('; ')}</span><span class="sp"></span><select class="in sm" data-res="${r}">${U.opts([['', '—'], ['skip', PD.t('imp.act.skip')], ['import_as_is', PD.t('imp.act.asis')]], res[r] || '')}</select></div>`).join('')}</div>` : ''}
        <h4 style="margin:10px 0 4px">${esc(PD.t('imp.sample'))}</h4>${U.table([{ label: 'SKU', f: (x) => x.sku }, { label: PD.t('inv.c.name'), f: (x) => x.name }, { label: PD.t('inv.c.company'), f: (x) => x.company }, { label: PD.t('inv.c.price'), r: 1, f: (x) => x.list_price }, { label: PD.t('imp.f.grams_per_carton'), r: 1, f: (x) => x.grams_per_carton }], d.sample)}`;
      $$('[data-map]', m.el).forEach((s) => s.addEventListener('change', () => { mapping = Object.assign({}, mapping); if (s.value) mapping[s.dataset.map] = s.value; else delete mapping[s.dataset.map]; prev(); }));
      const bk = $('#im-bulk', m.el); if (bk) bk.addEventListener('change', () => { if (!bk.value) return; $$('[data-res]', m.el).forEach((x) => { x.value = bk.value; res[x.dataset.res] = bk.value; }); });
      $$('[data-res]', m.el).forEach((s) => s.addEventListener('change', () => { if (s.value) res[s.dataset.res] = s.value; else delete res[s.dataset.res]; })); $('#im-mode', m.el).addEventListener('change', (ev) => { mode = ev.target.value; });
    }
    prev();
  }
})(typeof window !== 'undefined' ? window : globalThis);

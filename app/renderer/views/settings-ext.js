/* Settings, stage 2: business details, business rules, users, backup + Google Drive, license, about. Appended below the stage-1 cards. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { $, $$, esc, ic } = PD; const U = PD.ui;
  PD.i18n.pairs({
    'set2.biz': ['Business on invoices', 'ইনভয়েসে ব্যবসার তথ্য'], 'set2.addr': ['Address', 'ঠিকানা'], 'set2.phone': ['Phone', 'ফোন'], 'set2.footer': ['Invoice footer text', 'ইনভয়েসের নিচের লেখা'], 'set2.size': ['Default invoice size', 'ডিফল্ট ইনভয়েস সাইজ'],
    'set2.mgrFull': ['Manager can edit products, stock, purchases and customers (no PIN)', 'ম্যানেজার পণ্য, স্টক, ক্রয় ও গ্রাহক বদলাতে পারবে (PIN ছাড়া)'], 'set2.editPin': ['Ask owner PIN before editing products/stock (edit mode)', 'পণ্য/স্টক বদলানোর আগে মালিকের PIN চাইবে (এডিট মোড)'], 'set2.rules': ['Business rules', 'ব্যবসার নিয়ম'], 'set2.pinOver': ['Manager needs owner PIN for discounts above the limit', 'সীমার বেশি ছাড়ে ম্যানেজারের জন্য মালিকের PIN লাগবে'], 'set2.retAppr': ['Manager returns wait for owner approval', 'ম্যানেজারের ফেরত মালিকের অনুমোদনের অপেক্ষায় থাকবে'], 'set2.canAppr': ['Manager cancelling an invoice needs owner PIN', 'ম্যানেজার ইনভয়েস বাতিল করলে মালিকের PIN লাগবে'],
    'set2.credit': ['When a customer passes the credit limit', 'গ্রাহক বাকির সীমা ছাড়ালে'], 'set2.c.warn': ['Warn only', 'শুধু সতর্ক করুন'], 'set2.c.block': ['Block (owner PIN to override)', 'আটকান (মালিকের PIN লাগবে)'], 'set2.expiry': ['Warn before expiry (days)', 'মেয়াদের কত দিন আগে সতর্ক'], 'set2.lowDays': ['Low stock = fewer than (days of sales)', 'কম স্টক = যত দিনের বিক্রির কম'], 'set2.editIdle': ['Edit mode idle limit (minutes)', 'এডিট মোডে নিষ্ক্রিয় সীমা (মিনিট)'], 'set2.comm': ['Show company commission', 'কোম্পানির কমিশন দেখান'],
    'set2.users': ['Users', 'ব্যবহারকারী'], 'set2.user.name': ['Name', 'নাম'], 'set2.user.active': ['Can log in', 'লগইন করতে পারবে'], 'set2.user.pin': ['New PIN', 'নতুন PIN'], 'set2.user.setPin': ['Set PIN', 'PIN বদলান'], 'set2.user.saved': ['Saved', 'সেভ হয়েছে'],
    'set2.backup': ['Backups', 'ব্যাকআপ'], 'set2.bk.now': ['Back up now', 'এখনই ব্যাকআপ'], 'set2.bk.done': ['Backup created', 'ব্যাকআপ তৈরি হয়েছে'], 'set2.bk.c.time': ['Time', 'সময়'], 'set2.bk.c.size': ['Size', 'সাইজ'], 'set2.bk.c.data': ['Contents', 'ভেতরে'], 'set2.bk.c.drive': ['Drive', 'ড্রাইভ'], 'set2.bk.restore': ['Restore', 'ফিরিয়ে আনুন'], 'set2.bk.verified': ['Verified', 'যাচাই করা'], 'set2.bk.data': ['{p} products · {i} invoices', '{p} পণ্য · {i} ইনভয়েস'],
    'set2.bk.restoreWhy': ['Restoring replaces today\'s data with this backup. A safety backup is made first.', 'ফিরিয়ে আনলে আজকের তথ্য এই ব্যাকআপ দিয়ে বদলে যাবে। আগে একটি নিরাপত্তা ব্যাকআপ হবে।'], 'set2.bk.restored': ['Backup restored', 'ব্যাকআপ ফিরিয়ে আনা হয়েছে'], 'set2.d.none': ['Not uploaded', 'আপলোড হয়নি'], 'set2.d.queued': ['Waiting', 'অপেক্ষায়'], 'set2.d.uploaded': ['Uploaded', 'আপলোড হয়েছে'], 'set2.d.failed': ['Failed', 'ব্যর্থ'],
    'set2.drive': ['Google Drive copy', 'গুগল ড্রাইভে কপি'], 'set2.dr.off': ['Not connected. Backups stay on this computer only.', 'যুক্ত নেই। ব্যাকআপ শুধু এই কম্পিউটারে থাকে।'], 'set2.dr.on': ['Connected as {a}', '{a} হিসেবে যুক্ত'], 'set2.dr.connect': ['Connect Google Drive', 'গুগল ড্রাইভ যুক্ত করুন'], 'set2.dr.disconnect': ['Disconnect', 'বিচ্ছিন্ন করুন'], 'set2.dr.upload': ['Upload waiting backups ({n})', 'অপেক্ষমাণ ব্যাকআপ আপলোড ({n})'], 'set2.dr.uploaded': ['Uploaded {n}', '{n}টি আপলোড হয়েছে'],
    'set2.license': ['License', 'লাইসেন্স'], 'set2.lic.code': ['License code', 'লাইসেন্স কোড'], 'set2.lic.reveal': ['Show full code', 'পুরো কোড দেখান'], 'set2.lic.why': ['Showing the license code needs your PIN.', 'লাইসেন্স কোড দেখাতে আপনার PIN লাগবে।'],
    'set2.about': ['About', 'পরিচিতি'], 'set2.ab.app': ['App version', 'অ্যাপের ভার্সন'], 'set2.ab.contract': ['Backend contract', 'ব্যাকএন্ড চুক্তি'], 'set2.ab.dir': ['Data folder', 'ডেটা ফোল্ডার'], 'set2.ab.clock': ['Clock check', 'ঘড়ি যাচাই'], 'set2.ab.clockOk': ['Clock looks right', 'ঘড়ি ঠিক আছে'], 'set2.ab.clockBad': ['The computer clock went backwards. Fix the date and time.', 'কম্পিউটারের ঘড়ি পিছিয়ে গেছে। তারিখ ও সময় ঠিক করুন।'],
    'set2.tab.gen': ['General', 'সাধারণ'], 'set2.tab.biz': ['Business', 'ব্যবসা'], 'set2.tab.usr': ['Users', 'ব্যবহারকারী'], 'set2.tab.data': ['Backup & data', 'ব্যাকআপ ও ডেটা'],
    'set2.reset': ['Start over', 'নতুন করে শুরু'], 'set2.reset.desc': ['Clear the old accounts and begin fresh. A backup is made first. Users, PINs, settings and license stay.', 'পুরনো হিসাব মুছে নতুন করে শুরু করুন। আগে একটি ব্যাকআপ হবে। ব্যবহারকারী, PIN, সেটিং ও লাইসেন্স থাকবে।'],
    'set2.reset.btn': ['Start over…', 'নতুন করে শুরু…'], 'set2.reset.m1': ['Clear sales, payments, purchases, stock, expenses and van sheets. Keep products, companies, customers and staff (old dues set to 0).', 'বিক্রি, পেমেন্ট, ক্রয়, স্টক, খরচ ও গাড়ির তালিকা মুছবে। পণ্য, কোম্পানি, কাস্টমার ও কর্মচারী থাকবে (পুরনো বাকি ০ হবে)।'],
    'set2.reset.m2': ['Clear everything, including products, companies and customers.', 'সবকিছু মুছবে — পণ্য, কোম্পানি ও কাস্টমারসহ।'],
    'set2.reset.why': ['Reason', 'কারণ'], 'set2.reset.type': ['Type RESET to confirm', 'নিশ্চিত করতে RESET লিখুন'], 'set2.reset.go': ['Clear and start over', 'মুছে নতুন করে শুরু'],
    'set2.reset.warn': ['This cannot be undone from inside the app.', 'অ্যাপের ভেতর থেকে এটি ফেরানো যাবে না।'], 'set2.reset.done': ['Done. Starting fresh.', 'হয়েছে। নতুন করে শুরু।'],
    'set2.save': ['Save', 'সেভ'], 'set2.saved': ['Saved', 'সেভ হয়েছে']
  });
  const sw = (key, on, label) => `<div class="setrow"><span>${esc(label)}</span><button class="sw" role="switch" data-sw2="${key}" aria-checked="${on}" aria-label="${esc(label)}"></button></div>`;
  const orig = PD.views.settings.render;
  PD.views.settings.render = function (el) {
    orig(el); if (PD.S.role !== 'owner') return;
    const host = document.createElement('div'); host.className = 'setgrid'; host.style.marginTop = '14px'; el.appendChild(host);
    PD.try('settings.get', {}).then(([st]) => { st = st || PD.S.settings || {}; paint(host, st); tabify(el, host); });
  };
  function paint(host, st) {
    const num = (k, d) => (st[k] == null ? d : st[k]);
    host.innerHTML = `
      <section class="card"><h3>${ic('receipt', 16)} ${esc(PD.t('set2.biz'))}</h3><div class="fgrid">${U.field('b-addr', PD.t('set2.addr'), `<input class="in" id="b-addr" value="${esc(st['business.address'])}">`)}${U.field('b-ph', PD.t('set2.phone'), `<input class="in" id="b-ph" value="${esc(st['business.phone'])}">`)}${U.field('b-ft', PD.t('set2.footer'), `<input class="in" id="b-ft" value="${esc(st['invoice.footer'])}">`, 'full')}${U.field('b-sz', PD.t('set2.size'), `<select class="in" id="b-sz">${U.opts([['58', '58 mm'], ['80', '80 mm'], ['a4', 'A4']], num('invoice.default_size', '80'))}</select>`)}</div><div class="row" style="margin-top:10px"><span class="sp"></span><button class="btn p" id="b-save">${esc(PD.t('set2.save'))}</button></div></section>
      <section class="card"><h3>${ic('shield', 16)} ${esc(PD.t('set2.rules'))}</h3>${sw('manager.full_access', st['manager.full_access'] !== false, PD.t('set2.mgrFull'))}${sw('editmode.required', !!st['editmode.required'], PD.t('set2.editPin'))}${sw('discount.require_pin_over_cap', st['discount.require_pin_over_cap'] !== false, PD.t('set2.pinOver'))}${sw('returns.manager_needs_approval', st['returns.manager_needs_approval'] !== false, PD.t('set2.retAppr'))}${sw('cancel.manager_needs_approval', st['cancel.manager_needs_approval'] !== false, PD.t('set2.canAppr'))}${sw('commission.enabled', st['commission.enabled'] !== false, PD.t('set2.comm'))}
        <div class="setrow"><span>${esc(PD.t('set2.credit'))}</span><span class="seg" data-credit>${[['warn', PD.t('set2.c.warn')], ['block', PD.t('set2.c.block')]].map(([v, l]) => `<button data-v="${v}" class="${num('credit.mode', 'warn') === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</span></div>
        <div class="setrow"><span>${esc(PD.t('set2.expiry'))}</span><input class="in r" style="width:80px" data-n2="expiry.warn_days" inputmode="numeric" value="${num('expiry.warn_days', 30)}"></div><div class="setrow"><span>${esc(PD.t('set2.lowDays'))}</span><input class="in r" style="width:80px" data-n2="stock.low_default_days" inputmode="numeric" value="${num('stock.low_default_days', 3)}"></div><div class="setrow"><span>${esc(PD.t('set2.editIdle'))}</span><input class="in r" style="width:80px" data-n2="editmode.idle_minutes" inputmode="numeric" value="${num('editmode.idle_minutes', 10)}"></div></section>
      <section class="card" id="s-users"><h3>${ic('users', 16)} ${esc(PD.t('set2.users'))}</h3></section>
      <section class="card" id="s-backup"><h3>${ic('cloud', 16)} ${esc(PD.t('set2.backup'))}</h3></section>
      <section class="card" id="s-drive"><h3>${ic('cloud', 16)} ${esc(PD.t('set2.drive'))}</h3></section>
      <section class="card" id="s-lic"><h3>${ic('key', 16)} ${esc(PD.t('set2.license'))}</h3></section>
      <section class="card" id="s-reset" style="border-color:var(--bad)"><h3 style="color:var(--bad)">${ic('x', 16)} ${esc(PD.t('set2.reset'))}</h3><p class="muted">${esc(PD.t('set2.reset.desc'))}</p><button class="btn bad" id="rs-open">${esc(PD.t('set2.reset.btn'))}</button></section>
      <section class="card" id="s-about"><h3>${ic('info', 16)} ${esc(PD.t('set2.about'))}</h3></section>`;
    const save = async (patch) => { const [d, e] = await PD.try('settings.set', { patch }); if (e) { U.err(e); return false; } PD.S.settings = Object.assign({}, PD.S.settings, d); PD.toast(PD.t('set2.saved'), 'ok'); return true; };
    $('#b-save', host).addEventListener('click', () => save({ 'business.address': $('#b-addr', host).value.trim(), 'business.phone': $('#b-ph', host).value.trim(), 'invoice.footer': $('#b-ft', host).value.trim(), 'invoice.default_size': $('#b-sz', host).value }));
    $$('[data-sw2]', host).forEach((b) => b.addEventListener('click', async () => { const on = b.getAttribute('aria-checked') !== 'true'; if (await save({ [b.dataset.sw2]: on })) b.setAttribute('aria-checked', String(on)); }));
    $$('[data-credit] button', host).forEach((b) => b.addEventListener('click', async () => { if (await save({ 'credit.mode': b.dataset.v })) $$('[data-credit] button', host).forEach((x) => x.classList.toggle('on', x === b)); }));
    $$('[data-n2]', host).forEach((n) => n.addEventListener('change', () => { const v = Math.max(1, Math.min(365, parseInt(n.value.replace(/\D/g, ''), 10) || 1)); n.value = v; save({ [n.dataset.n2]: v }); }));
    resetUi($('#s-reset', host)); users($('#s-users', host)); backups($('#s-backup', host)); drive($('#s-drive', host)); license($('#s-lic', host)); about($('#s-about', host));
  }
  /* Group the cards into four tabs (owner only). */
  function tabify(el, host) {
    const g1 = el.querySelector('.setgrid'); if (!g1 || g1 === host) return;
    const a = Array.from(g1.children); const b = Array.from(host.children); const by = (id) => host.querySelector('#' + id);
    const groups = [['gen', a.slice(0, 3)], ['biz', [b[0], b[1]]], ['usr', [by('s-users')]], ['data', [by('s-backup'), by('s-drive'), by('s-lic'), by('s-about'), by('s-reset')]]];
    const wrap = document.createElement('div'); wrap.className = 'setwrap';
    const bar = document.createElement('div'); bar.className = 'tabs'; wrap.appendChild(bar);
    const icons = { gen: 'gear', biz: 'receipt', usr: 'users', data: 'cloud' }; let cur = PD.S.setTab || 'gen'; if (!groups.some((x) => x[0] === cur)) cur = 'gen';
    groups.forEach(([k, cards]) => { const btn = document.createElement('button'); btn.className = 'tab' + (k === cur ? ' on' : ''); btn.dataset.stab = k; btn.innerHTML = ic(icons[k]) + ' ' + esc(PD.t('set2.tab.' + k)); bar.appendChild(btn);
      const pane = document.createElement('div'); pane.className = 'setgrid setpane'; pane.dataset.pane = k; pane.hidden = k !== cur; cards.filter(Boolean).forEach((c) => pane.appendChild(c)); wrap.appendChild(pane); });
    bar.addEventListener('click', (ev) => { const t = ev.target.closest('[data-stab]'); if (!t) return; PD.S.setTab = t.dataset.stab; bar.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === t)); wrap.querySelectorAll('.setpane').forEach((p) => { p.hidden = p.dataset.pane !== t.dataset.stab; }); });
    g1.remove(); host.remove(); el.appendChild(wrap);
  }
  function resetUi(h) {
    $('#rs-open', h).addEventListener('click', () => {
      PD.modal({ title: ic('x') + ' ' + esc(PD.t('set2.reset')), titleText: PD.t('set2.reset'),
        body: `<p class="note warn">${esc(PD.t('set2.reset.warn'))}</p><label class="rs-opt"><input type="radio" name="rs-m" value="keep_catalog" checked> <span>${esc(PD.t('set2.reset.m1'))}</span></label><label class="rs-opt"><input type="radio" name="rs-m" value="all"> <span>${esc(PD.t('set2.reset.m2'))}</span></label><label class="l" for="rs-why" style="margin-top:10px">${esc(PD.t('set2.reset.why'))}</label><input class="in" id="rs-why" style="width:100%"><label class="l" for="rs-t" style="margin-top:10px">${esc(PD.t('set2.reset.type'))}</label><input class="in" id="rs-t" style="width:100%" autocomplete="off">`,
        buttons: [{ label: PD.t('common.cancel') }, { label: PD.t('set2.reset.go'), cls: 'bad', onClick: async (m) => {
          const mode = m.el.querySelector('input[name=rs-m]:checked').value; const reason = m.el.querySelector('#rs-why').value.trim();
          if (!reason) { PD.toast(PD.t('common.required'), 'warn'); return false; }
          if (m.el.querySelector('#rs-t').value.trim().toUpperCase() !== 'RESET') { PD.toast(PD.t('set2.reset.type'), 'warn'); return false; }
          const ap = await PD.approve('data.reset', PD.t('set2.reset.desc'), { method: 'data.reset', args: { mode, reason } }); if (!ap) return false;
          const [, e] = await PD.try('data.reset', { mode, reason, approval: ap }); if (e) { U.err(e); return false; }
          PD.toast(PD.t('set2.reset.done'), 'ok'); PD.S.view = 'dashboard'; PD.renderStatus(); PD.refreshApp(); } }] });
    });
  }
  async function users(h) {
    const [d] = await PD.try('users.list', {}); if (!d) return; const mgr = d.rows.find((r) => r.role === 'manager'); if (!mgr) return;
    h.insertAdjacentHTML('beforeend', `<div class="fgrid">${U.field('u-n', PD.t('set2.user.name'), `<input class="in" id="u-n" value="${esc(mgr.name)}">`)}${U.field('u-p', PD.t('set2.user.pin'), '<input class="in" id="u-p" type="password" inputmode="numeric" maxlength="8" autocomplete="off">')}</div>${sw('u-active', mgr.active, PD.t('set2.user.active'))}<div class="row" style="margin-top:10px"><button class="btn" id="u-pin">${esc(PD.t('set2.user.setPin'))}</button><span class="sp"></span><button class="btn p" id="u-save">${esc(PD.t('set2.save'))}</button></div>`);
    $('#u-save', h).addEventListener('click', async () => { const [, e] = await PD.try('users.update', { user_id: mgr.id, name: $('#u-n', h).value.trim() || undefined }); if (e) U.err(e); else PD.toast(PD.t('set2.user.saved'), 'ok'); });
    $('[data-sw2=u-active]', h).addEventListener('click', async (ev) => { const b = ev.currentTarget; const on = b.getAttribute('aria-checked') !== 'true'; const [, e] = await PD.try('users.update', { user_id: mgr.id, active: on }); if (e) U.err(e); else b.setAttribute('aria-checked', String(on)); });
    $('#u-pin', h).addEventListener('click', async () => { const pin = $('#u-p', h).value.replace(/\D/g, ''); if (pin.length < 4) { PD.toast(PD.t('err.VALIDATION'), 'warn'); return; } const [, e] = await PD.try('users.setPin', { user_id: mgr.id, new_pin: pin }); if (e) { PD.toast(e.code === 'VALIDATION' ? PD.t('setup.samePin') : PD.errText(e), 'bad'); return; } $('#u-p', h).value = ''; PD.toast(PD.t('set2.user.saved'), 'ok'); });
  }
  async function backups(h) {
    async function go() {
      const [d, e] = await PD.try('backup.list', {}); if (e) { U.err(e); return; }
      h.innerHTML = `<h3>${ic('cloud', 16)} ${esc(PD.t('set2.backup'))}<span class="sp"></span><button class="btn p sm" id="bk-now">${esc(PD.t('set2.bk.now'))}</button></h3><div style="max-height:260px;overflow:auto">${U.table([{ label: PD.t('set2.bk.c.time'), f: (r) => U.dt(r.ts) }, { label: PD.t('set2.bk.c.size'), r: 1, f: (r) => PD.digits(Math.round(r.bytes / 1024)) + ' KB' }, { label: PD.t('set2.bk.c.data'), f: (r) => PD.t('set2.bk.data', { p: PD.digits(r.products), i: PD.digits(r.invoices) }) }, { label: PD.t('set2.bk.c.drive'), f: (r) => PD.t('set2.d.' + r.drive) }, { label: '', raw: 1, r: 1, f: (r) => `<button class="btn sm" data-rs="${r.id}">${esc(PD.t('set2.bk.restore'))}</button>` }], d.rows)}</div>`;
      $('#bk-now', h).addEventListener('click', async () => { const [, er] = await PD.try('backup.create', {}); if (er) U.err(er); else { PD.toast(PD.t('set2.bk.done'), 'ok'); PD.renderStatus(); go(); } });
      $$('[data-rs]', h).forEach((b) => b.addEventListener('click', async () => { if (!(await PD.confirm(PD.t('set2.bk.restore'), PD.t('set2.bk.restoreWhy')))) return; const [, er] = await U.withApproval('restore_backup', PD.t('set2.bk.restoreWhy'), (ap) => PD.try('backup.restore', ap ? { id: b.dataset.rs, approval: ap } : { id: b.dataset.rs })); if (er) { if (er.code !== 'CANCELLED') U.err(er); return; } PD.toast(PD.t('set2.bk.restored'), 'ok'); PD.refreshApp(); }));
    }
    go();
  }
  async function drive(h) {
    async function go() {
      const [d, e] = await PD.try('drive.status', {}); if (e) return;
      h.innerHTML = `<h3>${ic('cloud', 16)} ${esc(PD.t('set2.drive'))}</h3><p class="muted">${esc(d.connected ? PD.t('set2.dr.on', { a: d.account }) : PD.t('set2.dr.off'))}</p><div class="row wrap">${d.connected ? `<button class="btn" id="dr-up">${esc(PD.t('set2.dr.upload', { n: PD.digits(d.queued) }))}</button><button class="btn bad" id="dr-off">${esc(PD.t('set2.dr.disconnect'))}</button>` : `<button class="btn p" id="dr-on">${esc(PD.t('set2.dr.connect'))}</button>`}</div>`;
      const on = $('#dr-on', h); if (on) on.addEventListener('click', async () => { const [, er] = await PD.try('drive.connect', {}); if (er) U.err(er); else { PD.renderStatus(); go(); } });
      const off = $('#dr-off', h); if (off) off.addEventListener('click', async () => { const [, er] = await PD.try('drive.disconnect', {}); if (er) U.err(er); else { PD.renderStatus(); go(); } });
      const up = $('#dr-up', h); if (up) up.addEventListener('click', async () => { const [r, er] = await PD.try('drive.uploadNow', {}); if (er) U.err(er); else { PD.toast(PD.t('set2.dr.uploaded', { n: PD.digits(r.uploaded) }), 'ok'); PD.renderStatus(); go(); } });
    }
    go();
  }
  async function license(h) {
    const [d] = await PD.try('license.status', {}); if (!d) return;
    h.insertAdjacentHTML('beforeend', `<div class="setrow"><span>${esc(PD.t('set2.lic.code'))}</span><b class="mono" id="lc-v">${esc(d.code_masked || '')}</b></div><div class="row" style="margin-top:10px"><button class="btn" id="lc-show">${ic('key', 14)} ${esc(PD.t('set2.lic.reveal'))}</button></div>`);
    $('#lc-show', h).addEventListener('click', async () => { const [r, e] = await U.withApproval('license_reveal', PD.t('set2.lic.why'), (ap) => PD.try('license.reveal', ap ? { approval: ap } : {})); if (e) { if (e.code !== 'CANCELLED') U.err(e); return; } $('#lc-v', h).textContent = r.code; });
  }
  async function about(h) {
    const [i] = await PD.try('system.info', {}); const [c] = await PD.try('system.clockCheck', {}); if (!i) return;
    h.insertAdjacentHTML('beforeend', `<div class="setrow"><span>${esc(PD.t('set2.ab.app'))}</span><b>${esc(i.app_version)}</b></div><div class="setrow"><span>${esc(PD.t('set2.ab.contract'))}</span><b>${esc(i.contract_version)}</b></div>${i.data_dir ? `<div class="setrow"><span>${esc(PD.t('set2.ab.dir'))}</span><span class="mono small">${esc(i.data_dir)}</span></div>` : ''}${c ? `<div class="setrow"><span>${esc(PD.t('set2.ab.clock'))}</span>${c.ok ? U.pill('ok', PD.t('set2.ab.clockOk')) : U.pill('bad', PD.t('set2.ab.clockBad'))}</div>` : ''}`);
  }
})(typeof window !== 'undefined' ? window : globalThis);

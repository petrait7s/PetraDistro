/* Owner screens: company tea commission (rules, current period, accruals) and the audit log with hash-chain check. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { $, $$, esc, ic } = PD; const U = PD.ui;
  PD.i18n.pairs({
    'com.title': ['Company commission', 'কোম্পানির কমিশন'], 'com.tab.now': ['This period', 'এই সময়'], 'com.tab.rules': ['Rules', 'নিয়ম'], 'com.tab.acc': ['Closed periods', 'শেষ হওয়া সময়'],
    'com.netKg': ['Net tea sold', 'নিট চা বিক্রি'], 'com.estimate': ['Estimated commission', 'আনুমানিক কমিশন'], 'com.toNext': ['{kg} kg more to reach the next rate', 'পরের রেটে যেতে আরও {kg} কেজি'], 'com.top': ['Top rate reached', 'সর্বোচ্চ রেটে পৌঁছেছে'], 'com.period': ['Period: {a} – {b}', 'সময়: {a} – {b}'], 'com.noRule': ['No active rule. Add one under Rules.', 'চালু কোনো নিয়ম নেই। “নিয়ম” থেকে যোগ করুন।'], 'com.sampleNote': ['Slab rates here are sample data. Set your real rates in Rules.', 'এখানকার স্ল্যাবের রেট নমুনা। আসল রেট “নিয়ম”-এ দিন।'],
    'com.band': ['Band', 'স্তর'], 'com.rate': ['Rate / kg', 'রেট / কেজি'], 'com.kgIn': ['Kg in band', 'এই স্তরে কেজি'], 'com.amount': ['Amount', 'টাকা'], 'com.byProd': ['By product', 'পণ্য অনুযায়ী'], 'com.pick': ['Rule', 'নিয়ম'], 'com.month': ['Period start', 'সময় শুরু'],
    'com.r.name': ['Rule name', 'নিয়মের নাম'], 'com.r.period': ['Period', 'সময়কাল'], 'com.r.month': ['Month', 'মাস'], 'com.r.quarter': ['Quarter', 'ত্রৈমাসিক'], 'com.r.year': ['Year', 'বছর'], 'com.r.scope': ['Applies to', 'যার ওপর'], 'com.r.allTea': ['All tea', 'সব চা'], 'com.r.type': ['Type', 'ধরন'], 'com.r.perKg': ['Flat per kg', 'কেজি প্রতি নির্দিষ্ট'], 'com.r.slab': ['Slabs', 'স্ল্যাব'], 'com.r.rate': ['Rate ৳ per kg', 'রেট ৳ প্রতি কেজি'], 'com.r.from': ['From kg', 'শুরু কেজি'], 'com.r.to': ['To kg (blank = no limit)', 'শেষ কেজি (ফাঁকা = সীমাহীন)'], 'com.r.addSlab': ['Add band', 'স্তর যোগ'], 'com.r.active': ['Active', 'চালু'], 'com.r.add': ['Add rule', 'নিয়ম যোগ'], 'com.r.saved': ['Rule saved', 'নিয়ম সেভ হয়েছে'], 'com.r.contig': ['Each band must start where the previous one ends.', 'প্রতিটি স্তর আগেরটির শেষ থেকে শুরু হতে হবে।'],
    'com.a.period': ['Period', 'সময়'], 'com.a.kg': ['Net kg', 'নিট কেজি'], 'com.a.amount': ['Commission', 'কমিশন'], 'com.a.status': ['Status', 'অবস্থা'], 'com.a.accruing': ['Accruing', 'জমছে'], 'com.a.due': ['Due from company', 'কোম্পানি দেবে'], 'com.a.received': ['Received', 'পাওয়া গেছে'], 'com.a.mark': ['Mark received', 'পাওয়া গেছে'], 'com.a.how': ['How was it settled?', 'কীভাবে মেটানো হলো?'], 'com.a.cash': ['Cash received', 'নগদ পেয়েছি'], 'com.a.against': ['Set off against what we owe the company', 'কোম্পানির পাওনা থেকে কাটা হলো'], 'com.a.done': ['Marked as received', 'পাওয়া গেছে লেখা হয়েছে'],
    'aud.title': ['Audit log', 'অডিট লগ'], 'aud.verify': ['Check integrity', 'সততা যাচাই'], 'aud.ok': ['Log is intact. {n} entries checked.', 'লগ অক্ষত। {n}টি এন্ট্রি যাচাই হয়েছে।'], 'aud.broken': ['Log was changed! First broken entry: #{id}', 'লগ বদলানো হয়েছে! প্রথম ভাঙা এন্ট্রি: #{id}'], 'aud.flagOnly': ['Red flags only', 'শুধু সন্দেহজনক'], 'aud.q': ['Search action, reason, user', 'অ্যাকশন, কারণ, ব্যবহারকারী খুঁজুন'],
    'aud.c.time': ['Time', 'সময়'], 'aud.c.user': ['User', 'ব্যবহারকারী'], 'aud.c.action': ['Action', 'অ্যাকশন'], 'aud.c.entity': ['Item', 'বিষয়'], 'aud.c.reason': ['Reason', 'কারণ'], 'aud.detail': ['Entry #{id}', 'এন্ট্রি #{id}'], 'aud.old': ['Before', 'আগে'], 'aud.new': ['After', 'পরে'], 'aud.hash': ['Hash', 'হ্যাশ'], 'aud.export': ['Export', 'এক্সপোর্ট']
  });

  /* ---------------- commission ---------------- */
  PD.views.commission = {
    render(el) {
      const tab = PD.S.comTab || 'now'; el.innerHTML = `<div class="tabs">${['now', 'rules', 'acc'].map((k) => `<button class="tab ${tab === k ? 'on' : ''}" data-tab="${k}">${esc(PD.t('com.tab.' + k))}</button>`).join('')}</div><div id="cm-b"></div>`;
      $$('[data-tab]', el).forEach((b) => b.addEventListener('click', () => { PD.S.comTab = b.dataset.tab; PD.refreshApp(); }));
      ({ now: nowTab, rules: rulesTab, acc: accTab })[tab]($('#cm-b'));
    }
  };
  async function nowTab(h) {
    const [rl] = await PD.try('commission.rules.list', {}); const rules = rl ? rl.rows.filter((r) => r.active) : []; let rid = rules[0] && rules[0].id; let start = '';
    h.innerHTML = rules.length ? `<div class="row wrap" style="margin-bottom:12px;gap:10px"><label class="small muted">${esc(PD.t('com.pick'))}</label><select class="in" id="cm-r">${rules.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select><label class="small muted">${esc(PD.t('com.month'))}</label><input type="month" class="in" id="cm-m"></div><div id="cm-s"></div>` : `<p class="note">${esc(PD.t('com.noRule'))}</p>`;
    if (!rules.length) return;
    async function go() {
      const b = { rule_id: rid }; if (start) b.period_start = start + '-01'; const [d, e] = await PD.try('commission.status', b); if (e) { U.err(e); return; }
      const maxKg = Math.max(1, ...d.bands.map((x) => parseFloat(x.kg_in_band)));
      $('#cm-s').innerHTML = `<div class="kpis"><div class="kpi n"><span class="k">${esc(PD.t('com.netKg'))}</span><span class="v">${PD.digits(d.net_kg)} ${esc(PD.t('unit.kg'))}</span><span class="s">${esc(PD.t('com.period', { a: PD.date(d.period_start), b: PD.date(d.period_end) }))}</span></div><div class="kpi"><span class="k">${esc(PD.t('com.estimate'))}</span><span class="v">${PD.money(d.estimate)}</span><span class="s">${d.to_next_kg ? esc(PD.t('com.toNext', { kg: PD.digits(d.to_next_kg) })) : esc(PD.t('com.top'))}</span></div></div><p class="note info" style="margin-bottom:12px">${esc(PD.t('com.sampleNote'))}</p>
        <div class="cols c2"><div class="card"><h3>${ic('percent')} ${esc(PD.t('com.band'))}</h3>${U.table([{ label: PD.t('com.band'), f: (x) => PD.digits(x.from_kg) + ' – ' + (x.to_kg == null ? '∞' : PD.digits(x.to_kg)) + ' ' + PD.t('unit.kg') }, { label: PD.t('com.rate'), r: 1, f: (x) => PD.money(x.rate_per_kg) }, { label: PD.t('com.kgIn'), r: 1, raw: 1, f: (x) => `<div style="display:flex;align-items:center;gap:8px;justify-content:flex-end"><i style="display:block;height:7px;width:${Math.round((parseFloat(x.kg_in_band) / maxKg) * 70)}px;background:var(--teal);border-radius:4px"></i>${PD.digits(x.kg_in_band)}</div>` }, { label: PD.t('com.amount'), r: 1, f: (x) => PD.money(x.amount) }], d.bands)}</div><div class="card"><h3>${ic('box')} ${esc(PD.t('com.byProd'))}</h3>${U.table([{ label: PD.t('inv.c.name'), f: (x) => x.name }, { label: PD.t('unit.kg'), r: 1, f: (x) => PD.digits(x.kg) }], d.by_product)}</div></div>`;
    }
    $('#cm-r').addEventListener('change', (e) => { rid = +e.target.value; go(); }); $('#cm-m').addEventListener('change', (e) => { start = e.target.value; go(); }); go();
  }
  async function rulesTab(h) {
    async function go() {
      const [d, e] = await PD.try('commission.rules.list', {}); if (e) { U.err(e); return; }
      h.innerHTML = `<div class="row" style="margin-bottom:12px"><span class="sp"></span><button class="btn p" id="rl-add">${ic('plus')} ${esc(PD.t('com.r.add'))}</button></div><div class="cardlist">${d.rows.map((r) => `<div class="card"><h3>${esc(r.name)}<span class="sp"></span>${U.pill(r.active ? 'ok' : 'gray', r.active ? PD.t('com.r.active') : PD.t('common.off'))}</h3><div class="small muted">${esc(PD.t('com.r.' + r.period))} · ${esc(r.type === 'slab' ? PD.t('com.r.slab') : PD.t('com.r.perKg'))}</div>${r.type === 'slab' ? `<div class="lst" style="margin-top:8px">${r.slabs.map((s) => `<div class="it"><span>${PD.digits(s.from_kg)} – ${s.to_kg == null ? '∞' : PD.digits(s.to_kg)} ${esc(PD.t('unit.kg'))}</span><span class="sp"></span><b>${PD.money(s.rate_per_kg)}</b></div>`).join('')}</div>` : `<p><b>${PD.money(r.per_kg)}</b> / ${esc(PD.t('unit.kg'))}</p>`}<div style="margin-top:10px"><button class="btn sm" data-ed="${r.id}">${ic('edit', 14)} ${esc(PD.t('cust.edit'))}</button></div></div>`).join('')}</div>`;
      $('#rl-add').addEventListener('click', () => form(null)); $$('[data-ed]', h).forEach((b) => b.addEventListener('click', () => form(d.rows.find((r) => r.id === +b.dataset.ed))));
    }
    function form(r) {
      const st = { type: r ? r.type : 'slab', slabs: r && r.slabs.length ? r.slabs.map((s) => ({ from: s.from_kg, to: s.to_kg == null ? '' : s.to_kg, rate: U.paisaToTaka(s.rate_per_kg) })) : [{ from: 0, to: '', rate: '' }] };
      const m = PD.modal({ title: esc(PD.t('com.r.add')), titleText: PD.t('com.r.add'), size: 'wide', body: `<div class="fgrid">${U.field('rf-n', PD.t('com.r.name'), `<input class="in" id="rf-n" value="${esc(r && r.name)}">`)}${U.field('rf-p', PD.t('com.r.period'), `<select class="in" id="rf-p">${U.opts(['month', 'quarter', 'year'].map((k) => [k, PD.t('com.r.' + k)]), r ? r.period : 'month')}</select>`)}${U.field('rf-t', PD.t('com.r.type'), `<select class="in" id="rf-t">${U.opts([['slab', PD.t('com.r.slab')], ['per_kg', PD.t('com.r.perKg')]], st.type)}</select>`)}</div><div id="rf-x" style="margin-top:12px"></div>`,
        buttons: [{ label: PD.t('common.cancel') }, { label: PD.t('common.save'), cls: 'p', main: true, onClick: async (mm) => {
          const b = { name: $('#rf-n', mm.el).value.trim(), period: $('#rf-p', mm.el).value, scope: 'all_tea', type: st.type }; if (!b.name) { PD.toast(PD.t('common.required'), 'warn'); return false; } if (r) { b.id = r.id; b.active = r.active; }
          if (st.type === 'per_kg') { const v = U.moneyRead(mm.el, 'rf-rate'); if (v == null) { PD.toast(PD.t('common.required'), 'warn'); return false; } b.per_kg = v; } else { b.slabs = []; for (const s of st.slabs) { const rate = U.takaToPaisa(s.rate); if (rate == null) { PD.toast(PD.t('common.required') + ': ' + PD.t('com.r.rate'), 'warn'); return false; } b.slabs.push({ from_kg: parseInt(s.from, 10) || 0, to_kg: String(s.to).trim() === '' ? null : parseInt(s.to, 10), rate_per_kg: rate }); } }
          const [, e] = await PD.try('commission.rules.save', b); if (e) { if (e.code === 'VALIDATION') PD.toast(PD.t('com.r.contig'), 'bad'); else U.err(e); return false; } PD.toast(PD.t('com.r.saved'), 'ok'); go(); } }] });
      function x() {
        const w = $('#rf-x', m.el); if (st.type === 'per_kg') { w.innerHTML = U.field('rf-rate', PD.t('com.r.rate'), U.moneyIn('rf-rate', r && r.per_kg)); return; }
        w.innerHTML = `<div class="tw"><table class="t"><thead><tr><th>${esc(PD.t('com.r.from'))}</th><th>${esc(PD.t('com.r.to'))}</th><th>${esc(PD.t('com.r.rate'))}</th><th></th></tr></thead><tbody>${st.slabs.map((s, i) => `<tr><td><input class="in sm r" style="width:90px" data-f="${i}" value="${esc(s.from)}"></td><td><input class="in sm r" style="width:90px" data-t="${i}" value="${esc(s.to)}"></td><td><input class="in sm r" style="width:100px" data-r="${i}" value="${esc(s.rate)}"></td><td><button class="btn sm" data-x="${i}">${ic('x', 14)}</button></td></tr>`).join('')}</tbody></table></div><button class="btn sm" id="rf-ad" style="margin-top:8px">${ic('plus', 14)} ${esc(PD.t('com.r.addSlab'))}</button>`;
        $$('[data-f]', w).forEach((n) => n.addEventListener('input', () => { st.slabs[+n.dataset.f].from = n.value; })); $$('[data-t]', w).forEach((n) => n.addEventListener('input', () => { st.slabs[+n.dataset.t].to = n.value; })); $$('[data-r]', w).forEach((n) => n.addEventListener('input', () => { st.slabs[+n.dataset.r].rate = n.value; })); $$('[data-x]', w).forEach((n) => n.addEventListener('click', () => { if (st.slabs.length > 1) { st.slabs.splice(+n.dataset.x, 1); x(); } }));
        $('#rf-ad', w).addEventListener('click', () => { const last = st.slabs[st.slabs.length - 1]; st.slabs.push({ from: last && last.to !== '' ? last.to : '', to: '', rate: '' }); x(); });
      }
      $('#rf-t', m.el).addEventListener('change', (e) => { st.type = e.target.value; x(); }); x();
    }
    go();
  }
  async function accTab(h) {
    async function go() {
      const [d, e] = await PD.try('commission.accruals.list', {}); if (e) { U.err(e); return; }
      h.innerHTML = U.table([{ label: PD.t('com.a.period'), f: (r) => r.period }, { label: PD.t('com.a.kg'), r: 1, f: (r) => PD.digits(r.net_kg) }, { label: PD.t('com.a.amount'), r: 1, f: (r) => PD.money(r.amount) }, { label: PD.t('com.a.status'), raw: 1, f: (r) => U.pill(r.status === 'received' ? 'ok' : r.status === 'due' ? 'low' : 'info', PD.t('com.a.' + r.status)) + (r.received_date ? ` <span class="muted small">${esc(PD.date(r.received_date))}</span>` : '') }, { label: '', raw: 1, r: 1, f: (r) => (r.status !== 'received' ? `<button class="btn sm p" data-mk="${r.id}">${esc(PD.t('com.a.mark'))}</button>` : '') }], d.rows);
      $$('[data-mk]', h).forEach((b) => b.addEventListener('click', () => {
        const m = PD.modal({ title: esc(PD.t('com.a.mark')), titleText: PD.t('com.a.mark'), body: `<p style="margin:0 0 10px">${esc(PD.t('com.a.how'))}</p><div class="lst"><label class="it"><input type="radio" name="st" value="cash" checked> ${esc(PD.t('com.a.cash'))}</label><label class="it"><input type="radio" name="st" value="against_company_due"> ${esc(PD.t('com.a.against'))}</label></div>`, buttons: [{ label: PD.t('common.cancel') }, { label: PD.t('common.save'), cls: 'p', main: true, onClick: async (mm) => { const settle = $('input[name=st]:checked', mm.el).value; const [, er] = await PD.try('commission.accruals.markReceived', { id: +b.dataset.mk, settle }); if (er) { U.err(er); return false; } PD.toast(PD.t('com.a.done'), 'ok'); go(); } }] }); void m;
      }));
    }
    go();
  }

  /* ---------------- audit ---------------- */
  PD.views.audit = {
    render(el) {
      const t = U.today(); const f = { from: U.addDays(t, -7), to: t, q: '', flag: false };
      el.innerHTML = `${U.h(PD.t('aud.title'), `<button class="btn" id="au-v">${ic('shield')} ${esc(PD.t('aud.verify'))}</button><button class="btn" id="au-x">${ic('download')} ${esc(PD.t('aud.export'))}</button>`)}<div id="au-ok"></div><div class="row wrap" style="margin-bottom:12px;gap:10px"><span id="au-r"></span><input class="in" id="au-q" style="width:250px" placeholder="${esc(PD.t('aud.q'))}"><label class="row small" style="gap:6px"><input type="checkbox" id="au-f"> ${esc(PD.t('aud.flagOnly'))}</label></div><div id="au-b"></div>`;
      const go = () => U.pager($('#au-b'), (cur) => PD.try('audit.list', { from: f.from, to: f.to, q: f.q || undefined, flag: f.flag || undefined, limit: 60, cursor: cur || undefined }), (rows) => {
        const b = $('#au-b'); const keep = $('[data-more]', b);
        b.innerHTML = U.table([{ label: '#', f: (r) => PD.digits(r.id) }, { label: PD.t('aud.c.time'), f: (r) => U.dt(r.ts) }, { label: PD.t('aud.c.user'), f: (r) => r.user }, { label: PD.t('aud.c.action'), f: (r) => r.action }, { label: PD.t('aud.c.entity'), f: (r) => r.entity + (r.entity_id ? ' · ' + r.entity_id : '') }, { label: PD.t('aud.c.reason'), f: (r) => r.reason || '' }, { label: '', raw: 1, f: (r) => (r.flag ? U.pill('bad', r.flag_kind || '!') : '') }], rows, { rowCls: (r) => (r.flag ? 'flag' : '') });
        U.onRow(b, rows, (r) => PD.modal({ title: esc(PD.t('aud.detail', { id: r.id })), titleText: r.action, size: 'wide', body: `<div class="row wrap" style="gap:8px;margin-bottom:10px"><span class="chip">${esc(r.user)} (${esc(r.role)})</span><span class="chip">${esc(U.dt(r.ts))}</span><span class="chip"><b>${esc(r.action)}</b></span>${r.flag ? U.pill('bad', r.flag_kind || '!') : ''}</div>${r.reason ? `<p><b>${esc(PD.t('aud.c.reason'))}:</b> ${esc(r.reason)}</p>` : ''}<div class="cols c2"><div><div class="small muted">${esc(PD.t('aud.old'))}</div><pre class="pre">${esc(r.old || '–')}</pre></div><div><div class="small muted">${esc(PD.t('aud.new'))}</div><pre class="pre">${esc(r.new || '–')}</pre></div></div><div class="small muted mono" style="word-break:break-all">${esc(PD.t('aud.hash'))}: ${esc(r.hash)}</div>`, buttons: [{ label: PD.t('common.close') }] })); if (keep) b.appendChild(keep);
      });
      U.range($('#au-r'), { from: f.from, to: f.to, onChange: (r) => { f.from = r.from; f.to = r.to; go(); } }); $('#au-q').addEventListener('input', U.debounce((e) => { f.q = e.target.value.trim(); go(); })); $('#au-f').addEventListener('change', (e) => { f.flag = e.target.checked; go(); });
      $('#au-v').addEventListener('click', async () => { const [d, e] = await PD.try('audit.verify', {}); if (e) { U.err(e); return; } $('#au-ok').innerHTML = d.ok ? `<p class="note info" style="margin-bottom:10px">${esc(PD.t('aud.ok', { n: PD.digits(d.checked) }))}</p>` : `<p class="note bad" style="margin-bottom:10px">${esc(PD.t('aud.broken', { id: PD.digits(d.broken_at) }))}</p>`; });
      $('#au-x').addEventListener('click', () => U.exportTable('audit', 'csv')); go();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

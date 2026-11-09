/* Shell: frame (stage + status bar), first-run screens (license, setup, login, reset), main layout (rail, top bar, view), shortcuts. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { $, $$, esc, ic } = PD;
  let current = null; let cdTimer = null;

  const NAV = [
    { g: 'nav.g.daily', items: [['dashboard', 'dash'], ['sales', 'cart'], ['payments', 'cash'], ['returns', 'undo'], ['loadsheet', 'truck'], ['cash', 'receipt']] },
    { g: 'nav.g.stock', items: [['inventory', 'box'], ['lots', 'layers'], ['purchases', 'download', 'power']] },
    { g: 'nav.g.accounts', items: [['customers', 'users'], ['expenses', 'route'], ['commission', 'percent', 'owner'], ['audit', 'shield', 'owner'], ['settings', 'gear']] }
  ];
  PD.NAV = NAV;
  const navFor = (role) => NAV.map((g) => ({ g: g.g, items: g.items.filter((i) => !i[2] || i[2] === role || (i[2] === 'power' && PD.power())) })).filter((g) => g.items.length);

  PD.show = (fn) => { current = fn; clearInterval(cdTimer); PD.closeAllModals(); fn(); PD.i18n.apply($('#win')); };
  PD.rerender = () => { if (current) { const v = PD.S.view; current(); PD.S.view = v; PD.i18n.apply($('#win')); } };

  function mountFrame() {
    const W = root.api && root.api.win;
    $('#app').innerHTML = `<div id="win">${W ? `<div class="tbar" id="tbar"><div class="lights"><button class="tl close" id="tb-x" aria-label="Close"><svg viewBox="0 0 10 10"><path d="M2.5 2.5l5 5M7.5 2.5l-5 5"/></svg></button><button class="tl min" id="tb-min" aria-label="Minimize"><svg viewBox="0 0 10 10"><path d="M2 5h6"/></svg></button><button class="tl max" id="tb-max" aria-label="Maximize"><svg viewBox="0 0 10 10"><path d="M3 7V3h4M7 3v4H3" class="a"/></svg></button></div><div class="ttl"><img src="assets/petra-icon.png" alt=""><span id="tb-t">PetraDMS</span></div><div class="lights ghost" aria-hidden="true"></div></div>` : ''}<div id="stage"></div><div class="statusbar" id="statusbar"></div><div id="toast"></div></div>`;
    if (W) {
      document.documentElement.classList.add('framed');
      const setMax = (st) => { const w = $('#win'); if (w && st) w.classList.toggle('maxed', !!(st.maximized || st.full)); };
      $('#tb-x').addEventListener('click', () => W.close()); $('#tb-min').addEventListener('click', () => W.minimize());
      $('#tb-max').addEventListener('click', () => W.toggleMaximize().then(setMax));
      $('#tbar').addEventListener('dblclick', (e) => { if (!e.target.closest('.tl')) W.toggleMaximize().then(setMax); });
      try { W.onState(setMax); W.state().then(setMax); } catch (e) { /* ignore */ }
    }
    renderStatus();
  }
  async function renderStatus() {
    const sb = $('#statusbar'); if (!sb) return; const owner = PD.S.role === 'owner'; let bk = '', dr = '';
    if (owner) {
      const [b] = await PD.try('backup.list', {}); const [d] = await PD.try('drive.status', {});
      bk = b && b.rows && b.rows[0] ? PD.t('status.backup', { t: PD.date(b.rows[0].ts) + ' ' + PD.time(b.rows[0].ts) }) : PD.t('status.noBackup');
      dr = d ? (d.connected ? (d.queued ? PD.t('status.drive.queue', { n: PD.digits(d.queued) }) : PD.t('status.drive.on')) : PD.t('status.drive.off')) : '';
    }
    sb.innerHTML = `<span class="sb"><span class="dot"></span>${esc(PD.t('status.saved'))}</span>${bk ? `<span class="sb">${esc(bk)}</span>` : ''}${dr ? `<span class="sb">${ic('cloud', 13)} ${esc(dr)}</span>` : ''}<span class="sp"></span>${PD.isMock ? `<span class="sb">${esc(PD.t('status.mock'))}</span>` : ''}<span class="sb">${esc(PD.t('status.version', { v: PD.VERSION }))}</span>`;
  }
  PD.renderStatus = renderStatus;

  /* ---------- language + theme controls (auth screens and top bar share these) ---------- */
  const THEMES = ['light', 'dark', 'system'];
  const themeIcon = (th) => (th === 'dark' ? 'moon' : th === 'system' ? 'monitor' : 'sun');
  function langTheme() {
    const l = PD.lang(); const th = (PD.S.prefs && PD.S.prefs.theme) || 'light';
    return `<span class="seg langseg" role="group" aria-label="${esc(PD.t('top.lang'))}"><button data-lang="bn" class="${l === 'bn' ? 'on' : ''}" aria-pressed="${l === 'bn'}">${esc(PD.t('top.langBn'))}</button><button data-lang="en" class="${l === 'en' ? 'on' : ''}" aria-pressed="${l === 'en'}">EN</button></span><button class="tbtn" data-theme-cycle title="${esc(PD.t('top.themeNow', { name: PD.t('theme.' + th) }))}" aria-label="${esc(PD.t('top.themeNow', { name: PD.t('theme.' + th) }))}">${ic(themeIcon(th), 17)}</button>`;
  }
  function wireLangTheme(rootEl) {
    $$('[data-lang]', rootEl).forEach((b) => b.addEventListener('click', async () => { if (b.dataset.lang === PD.lang()) return; await PD.setPref({ language: b.dataset.lang }); PD.rerender(); }));
    const t = $('[data-theme-cycle]', rootEl); if (t) t.addEventListener('click', async () => { const cur = (PD.S.prefs && PD.S.prefs.theme) || 'light'; await PD.setPref({ theme: THEMES[(THEMES.indexOf(cur) + 1) % 3] }); PD.rerender(); });
  }
  const authTools = () => `<div class="auth-tools">${langTheme()}</div>`;

  const bizLogo = () => { const st = PD.S.settings || {}; const v = PD.S.role && st['business.logo'] != null ? st['business.logo'] : PD.S.bizLogo; return /^data:image\/(png|jpeg);base64,/.test(v || '') ? v : ''; };
  PD.bizLogo = bizLogo;
  const side = (title, text, items) => `<div class="side"><div class="pbrand"><img src="assets/petra-mark.png" alt="Petra"><div><b>PETRA</b><span>${esc(PD.t('brand.motto'))}</span></div></div>
    <div class="client">${bizLogo() ? `<div class="clogo"><img src="${bizLogo()}" alt=""></div>` : `<div class="clogo empty">${ic('box', 34)}<span>${esc(PD.t('brand.yourLogo'))}</span></div>`}${PD.S.bizName ? `<div class="cname">${esc(PD.S.bizName)}</div>` : ''}</div>
    <div class="sidetext"><h2>${esc(title)}</h2><p>${esc(text)}</p>${items ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}</div></div>`;
  const steps = (n) => `<div class="steps" aria-label="${esc(PD.t('auth.step', { n: PD.digits(n), m: PD.digits(3) }))}">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;
  const pinFilter = (inp) => inp.addEventListener('input', () => { const v = inp.value.replace(/\D/g, ''); if (v !== inp.value) inp.value = v; });

  /* ---------- license ---------- */
  const normLic = (v) => String(v).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^PETRA/, '').replace(/^([A-Z0-9]{4})([A-Z0-9]{4})([A-Z0-9]{4})$/, 'PETRA-$1-$2-$3');
  function screenLicense() {
    $('#stage').innerHTML = `<div class="auth">${authTools()}${side(PD.t('lic.side.title'), PD.t('lic.side.text'), [PD.t('lic.side.1'), PD.t('lic.side.2'), PD.t('lic.side.3')])}<div class="form">${steps(1)}<h2>${esc(PD.t('lic.title'))}</h2><p class="muted" style="margin:0">${esc(PD.t('lic.sub'))}</p><div><label class="l" for="lic">${esc(PD.t('lic.code'))}</label><input class="in lic" id="lic" placeholder="PETRA-…" autocomplete="off" spellcheck="false" style="width:100%"></div><p class="err" id="lic-err" role="alert"></p><div class="row wrap"><button class="btn p" id="lic-go">${esc(PD.t('lic.go'))}</button><span class="small muted">${esc(PD.t('lic.hint'))}</span></div></div></div>`;
    wireLangTheme($('.auth'));
    const inp = $('#lic'); inp.addEventListener('input', () => { const n = normLic(inp.value); if (/^PETRA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(n)) inp.value = n; });
    const go = async () => { const [, e] = await PD.try('license.activate', { code: inp.value }); if (e) { $('#lic-err').textContent = e.code === 'LICENSE' ? PD.t('lic.bad') : PD.errText(e); return; } await PD.route(); };
    $('#lic-go').addEventListener('click', go); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }); inp.focus();
  }

  /* ---------- setup ---------- */
  function screenSetup() {
    const f = (id, label, o) => `<div class="${o && o.full ? 'full' : ''}"><label class="l" for="${id}">${esc(PD.t(label))}</label><input class="in" id="${id}" style="width:100%" ${o && o.pin ? 'type="password" inputmode="numeric" maxlength="8" autocomplete="off"' : 'autocomplete="off"'}></div>`;
    $('#stage').innerHTML = `<div class="auth">${authTools()}${side(PD.t('setup.side.title'), PD.t('setup.side.text'))}<div class="form">${steps(2)}<h2>${esc(PD.t('setup.title'))}</h2><p class="muted" style="margin:0">${esc(PD.t('setup.sub'))}</p><div class="fg">${f('su-biz', 'setup.biz', { full: 1 })}${f('su-addr', 'setup.addr', { full: 1 })}${f('su-phone', 'setup.phone')}<div class="form-row"><label class="l">${esc(PD.t('brand.logo'))}</label><div class="row" style="gap:8px"><button class="btn" type="button" id="su-logo">${ic('download', 15)} ${esc(PD.t('brand.pick'))}</button><img id="su-logo-p" alt="" style="height:36px;max-width:120px;object-fit:contain;display:none"></div></div>${f('su-on', 'setup.owner')}${f('su-op', 'setup.ownerPin', { pin: 1 })}${f('su-mn', 'setup.manager')}${f('su-mp', 'setup.managerPin', { pin: 1 })}</div><p class="err" id="su-err" role="alert"></p><div class="row"><button class="btn p" id="su-go">${esc(PD.t('setup.go'))}</button></div></div></div>`;
    wireLangTheme($('.auth')); pinFilter($('#su-op')); pinFilter($('#su-mp')); $('#su-biz').focus();
    const lp = $('#su-logo-p'); if (PD.S.setupLogo) { lp.src = PD.S.setupLogo; lp.style.display = ''; }
    $('#su-logo').addEventListener('click', async () => { const u = await PD.ui.pickLogo(); if (!u) return; PD.S.setupLogo = u; PD.S.bizLogo = u; lp.src = u; lp.style.display = ''; const cl = $('.auth .client .clogo'); if (cl) { cl.className = 'clogo'; cl.innerHTML = '<img alt="">'; cl.firstChild.src = u; } });
    $('#su-go').addEventListener('click', async () => {
      const v = (id) => $(id).value.trim(); const err = $('#su-err'); err.textContent = '';
      $$('.in', $('.form')).forEach((i) => i.removeAttribute('aria-invalid'));
      if (!v('#su-biz')) { err.textContent = PD.t('common.required') + ': ' + PD.t('setup.biz'); $('#su-biz').setAttribute('aria-invalid', 'true'); return; }
      if (v('#su-op').length < 4 || v('#su-mp').length < 4) { err.textContent = PD.t('err.VALIDATION'); return; }
      if (v('#su-op') === v('#su-mp')) { err.textContent = PD.t('setup.samePin'); return; }
      const [, e] = await PD.try('setup.complete', { business: { name: v('#su-biz'), address: v('#su-addr'), phone: v('#su-phone'), logo: PD.S.setupLogo || undefined }, owner: { name: v('#su-on') || PD.t('role.owner'), pin: v('#su-op') }, manager: { name: v('#su-mn') || PD.t('role.manager'), pin: v('#su-mp') }, language: PD.lang(), theme: (PD.S.prefs && PD.S.prefs.theme) || 'light' });
      if (e) { err.textContent = PD.errText(e); return; } await PD.route();
    });
  }

  /* ---------- login ---------- */
  function screenLogin(pick) {
    let role = pick || 'owner';
    $('#stage').innerHTML = `<div class="auth">${authTools()}${side(PD.t('login.side.title'), PD.t('login.side.text'))}<div class="form">${steps(3)}<h2>${esc(PD.t('login.title'))}</h2><div><label class="l">${esc(PD.t('login.who'))}</label><div class="users"><button class="ucard ${role === 'owner' ? 'on' : ''}" data-role="owner" aria-pressed="${role === 'owner'}">${ic('key', 16)}<b>${esc(PD.t('role.owner'))}</b></button><button class="ucard ${role === 'manager' ? 'on' : ''}" data-role="manager" aria-pressed="${role === 'manager'}">${ic('users', 16)}<b>${esc(PD.t('role.manager'))}</b></button></div></div><div><label class="l" for="lg-pin">${esc(PD.t('login.pin'))}</label><div class="pinrow"><input class="in" id="lg-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off"></div></div><p class="err" id="lg-err" role="alert"></p><div class="row wrap"><button class="btn p" id="lg-go">${esc(PD.t('login.go'))}</button>${role === 'owner' ? `<button class="btn" id="lg-forgot" type="button">${esc(PD.t('login.forgot'))}</button>` : ''}</div></div></div>`;
    wireLangTheme($('.auth')); pinFilter($('#lg-pin')); $('#lg-pin').focus();
    $$('[data-role]').forEach((b) => b.addEventListener('click', () => { role = b.dataset.role; PD.show(() => screenLogin(role)); }));
    const fg = $('#lg-forgot'); if (fg) fg.addEventListener('click', () => PD.show(screenReset));
    const err = $('#lg-err'); const go = $('#lg-go');
    function wait(s) { clearInterval(cdTimer); go.disabled = true; let n = s; const tick = () => { err.textContent = PD.t('login.wait', { s: PD.digits(n) }); if (n-- <= 0) { clearInterval(cdTimer); go.disabled = false; err.textContent = ''; } }; tick(); cdTimer = setInterval(tick, 1000); }
    async function submit() {
      if (go.disabled) return; err.textContent = '';
      const env = await PD.api.raw('auth.login', { role, pin: $('#lg-pin').value });
      if (!env.ok) {
        const d = env.details || {}; $('#lg-pin').value = '';
        if (d.wait_s > 0) wait(d.wait_s); else if (d.code === 'BAD_PIN') err.textContent = PD.t('login.wrong', { left: PD.digits(d.left == null ? 0 : d.left) }); else err.textContent = PD.errText(env);
        $('#lg-pin').focus(); return;
      }
      await PD.session.start(env.data); PD.show(screenApp);
    }
    go.addEventListener('click', submit); $('#lg-pin').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  }
  function screenReset() {
    $('#stage').innerHTML = `<div class="auth">${authTools()}${side(PD.t('login.side.title'), PD.t('login.side.text'))}<div class="form"><h2>${esc(PD.t('reset.title'))}</h2><p class="muted" style="margin:0">${esc(PD.t('reset.sub'))}</p><div><label class="l" for="rs-lic">${esc(PD.t('lic.code'))}</label><input class="in lic" id="rs-lic" style="width:100%" autocomplete="off" spellcheck="false" placeholder="PETRA-XXXX-XXXX-XXXX"></div><div><label class="l" for="rs-pin">${esc(PD.t('reset.newPin'))}</label><input class="in" id="rs-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" style="width:100%"></div><p class="err" id="rs-err" role="alert"></p><div class="row"><button class="btn" id="rs-back">${esc(PD.t('common.back'))}</button><button class="btn p" id="rs-go">${esc(PD.t('reset.go'))}</button></div></div></div>`;
    wireLangTheme($('.auth')); pinFilter($('#rs-pin')); $('#rs-lic').focus();
    $('#rs-back').addEventListener('click', () => PD.show(() => screenLogin('owner')));
    $('#rs-go').addEventListener('click', async () => { const [, e] = await PD.try('auth.resetPin', { license_code: $('#rs-lic').value, new_pin: $('#rs-pin').value }); if (e) { $('#rs-err').textContent = e.code === 'LICENSE' ? PD.t('lic.bad') : PD.errText(e); return; } PD.show(() => screenLogin('owner')); PD.toast(PD.t('reset.done')); });
  }

  /* ---------- main ---------- */
  function topTools() {
    const calc = PD.canCalc() ? `<button class="tbtn ${PD.calc.isOpen() ? 'on' : ''}" id="t-calc" title="${esc(PD.t('top.calc'))} (F8)" aria-label="${esc(PD.t('top.calc'))}" aria-pressed="${PD.calc.isOpen()}">${ic('calc', 17)}<kbd>F8</kbd></button>` : '';
    const games = PD.canGames() ? `<button class="tbtn ${PD.games.isOpen() ? 'on' : ''}" id="t-games" title="${esc(PD.t('top.games'))} (F9)" aria-label="${esc(PD.t('top.games'))}" aria-pressed="${PD.games.isOpen()}">${ic('game', 17)}<kbd>F9</kbd></button>` : '';
    return calc + games + langTheme();
  }
  function screenApp() {
    const S = PD.S; const nav = navFor(S.role); if (!nav.some((g) => g.items.some((i) => i[0] === S.view))) S.view = 'dashboard';
    $('#stage').innerHTML = `<nav class="rail" aria-label="${esc(PD.t('top.menu'))}"><div class="brand">${PD.bizLogo() ? `<img class="cl" src="${PD.bizLogo()}" alt="">` : `<img class="pm" src="assets/petra-mark.png" alt="">`}<div class="bn"><b>${esc((PD.S.settings || {})['business.name'] || PD.S.bizName || 'PetraDMS')}</b><span>PetraDMS</span></div></div><div class="navlist">${nav.map((g) => `<div class="grp">${esc(PD.t(g.g))}</div>${g.items.map((i) => `<button class="ni ${S.view === i[0] ? 'on' : ''}" data-nav="${i[0]}" ${S.view === i[0] ? 'aria-current="page"' : ''}>${ic(i[1])}<span>${esc(PD.t('nav.' + i[0]))}</span></button>`).join('')}`).join('')}</div><div class="who"><div class="wn"><b>${esc(S.user.name)}</b><span>${esc(PD.t('role.' + S.role))}</span></div><div class="row"><button id="b-lock">${ic('lock', 14)} ${esc(PD.t('top.lock'))}</button><button id="b-out">${ic('back', 14)} ${esc(PD.t('top.logout'))}</button></div></div></nav><div class="work"><div class="top"><h1>${esc(PD.t('nav.' + S.view))}</h1><span class="sp"></span><div class="tools">${topTools()}</div></div><main class="view" id="view"></main></div>`;
    $$('[data-nav]').forEach((b) => b.addEventListener('click', () => { S.view = b.dataset.nav; screenApp(); PD.i18n.apply($('#win')); }));
    $('#b-lock').addEventListener('click', () => PD.session.lock()); $('#b-out').addEventListener('click', () => PD.session.logout());
    wireLangTheme($('.top'));
    const bc = $('#t-calc'); if (bc) bc.addEventListener('click', () => PD.calc.toggle()); const bg = $('#t-games'); if (bg) bg.addEventListener('click', () => PD.games.toggle());
    if (PD._leave) { const lv = PD._leave; PD._leave = null; try { lv(); } catch (x) { /* ignore */ } }
    const v = PD.views[S.view]; const el = $('#view');
    if (v && v.render) v.render(el); else el.innerHTML = `<div class="soon card">${ic('gear')}<h2>${esc(PD.t('soon.title'))}</h2><p class="muted">${esc(PD.t('soon.body'))}</p></div>`;
    renderStatus();
    if (S.prefs && S.prefs.calc && S.prefs.calc.open && PD.canCalc() && !PD.calc.isOpen() && !PD._calcRestored) { PD._calcRestored = true; PD.calc.open(); }
  }
  PD.refreshTools = () => { const t = $('.top .tools'); if (t) { t.innerHTML = topTools(); wireLangTheme(t); const bc = $('#t-calc'); if (bc) bc.addEventListener('click', () => PD.calc.toggle()); const bg = $('#t-games'); if (bg) bg.addEventListener('click', () => PD.games.toggle()); } };
  PD.on('calc', () => PD.refreshTools()); PD.on('games', () => PD.refreshTools());
  PD.on('loggedout', () => { PD._calcRestored = false; PD.route(); });

  document.addEventListener('keydown', (e) => {
    if (!PD.S.role || PD.session.isLocked()) return;
    if (e.key === 'F8') { e.preventDefault(); if (PD.canCalc()) PD.calc.toggle(); } else if (e.key === 'F9') { e.preventDefault(); if (PD.canGames()) PD.games.toggle(); }
  });

  /* ---------- boot / routing ---------- */
  PD.route = async () => {
    const [ls, e] = await PD.try('license.status', {});
    if (e) { $('#stage').innerHTML = `<div class="empty">${esc(PD.errText(e))}</div>`; return; }
    PD.S.bizLogo = ls.business_logo || ''; PD.S.bizName = ls.business_name || '';
    if (ls.state !== 'active') return PD.show(screenLicense);
    if (!ls.setup_done) return PD.show(screenSetup);
    if (PD.S.role) return PD.show(screenApp);
    PD.show(() => screenLogin('owner'));
  };
  PD.boot = async (opts) => { PD.initPrefs(); PD.initApi(opts); mountFrame(); await PD.route(); };
  PD.refreshApp = () => { if (PD.S.role) { screenApp(); PD.i18n.apply($('#win')); } };
})(typeof window !== 'undefined' ? window : globalThis);

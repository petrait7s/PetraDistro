/* Mock handlers: license, setup, auth, users, prefs, settings, system. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  PD.installCoreHandlers = function (m) {
    const { ok, err, clone, DEFAULT_PREFS, PUBLIC_SETTINGS } = PD.mockHelpers; const C = m.ctx; const reg = m.register;
    const LICENSE_RE = /^PETRA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    const normLic = (c) => String(c || '').toUpperCase().replace(/\s+/g, '');
    const masked = (c) => c.replace(/-[A-Z0-9]{4}-[A-Z0-9]{4}$/, '-••••-••••');
    const userOut = (u) => ({ id: u.id, name: u.name, role: u.role });
    const prefsFor = (role) => { const S = C.S; if (!S.prefs[role]) S.prefs[role] = DEFAULT_PREFS(); return S.prefs[role]; };
    const settingsPublic = () => { const S = C.S; return { business_name: S.settings['business.name'], language: (prefsFor('owner') || {}).language || 'bn', theme: (prefsFor('owner') || {}).theme || 'light', games_enabled: !!S.settings['games.enabled'], features: { games: !!S.settings['games.enabled'] } }; };

    reg('license.status', async () => { const S = C.S; return ok({ state: S.license.state, business_name: S.business && S.business.name || null, code_masked: S.license.code ? masked(S.license.code) : null, setup_done: S.setup_done }); });
    reg('license.activate', async ({ code }) => {
      const c = normLic(code);
      if (!LICENSE_RE.test(c)) return err('LICENSE', 'invalid code', { state: 'invalid' });
      C.S.license = { state: 'active', code: c }; C.persist(); return ok({ state: 'active' });
    });
    reg('setup.complete', async (a) => {
      const S = C.S; if (S.license.state !== 'active') return err('LICENSE', 'no license', { state: 'none' }); if (S.setup_done) return err('STATE', 'already set up');
      const f = [];
      if (!a.business || !String(a.business.name || '').trim()) f.push({ path: 'business.name', rule: 'required' });
      if (!a.owner || String(a.owner.pin || '').length < 4) f.push({ path: 'owner.pin', rule: 'min4' });
      if (!a.manager || String(a.manager.pin || '').length < 4) f.push({ path: 'manager.pin', rule: 'min4' });
      if (a.owner && a.manager && a.owner.pin === a.manager.pin) f.push({ path: 'manager.pin', rule: 'differs_from_owner' });
      if (f.length) return err('VALIDATION', 'bad setup', { fields: f });
      S.business = a.business; S.users = { owner: { id: 1, role: 'owner', name: a.owner.name || 'Owner', pin: a.owner.pin }, manager: { id: 2, role: 'manager', name: a.manager.name || 'Manager', pin: a.manager.pin, active: true } };
      S.settings['business.name'] = a.business.name; S.settings['business.address'] = a.business.address || ''; S.settings['business.phone'] = a.business.phone || '';
      const p = prefsFor('owner'); const q = prefsFor('manager'); if (a.language) { p.language = q.language = a.language; } if (a.theme) { p.theme = q.theme = a.theme; }
      S.setup_done = true; if (PD.seedDemo) PD.seedDemo(S, C.now()); C.persist(); return ok({ done: true });
    });
    reg('auth.login', async ({ role, pin }) => {
      const S = C.S; if (S.license.state !== 'active' || !S.setup_done) return err('LICENSE', 'not ready', { state: S.license.state });
      const u = S.users[role]; if (!u || u.active === false) return err('FORBIDDEN');
      const t = (S.tries[role] = S.tries[role] || { n: 0, until: 0 }); const nowMs = C.now().getTime();
      if (t.until > nowMs) return err('FORBIDDEN', 'throttled', { code: 'THROTTLE', wait_s: Math.ceil((t.until - nowMs) / 1000), params: { s: Math.ceil((t.until - nowMs) / 1000) } });
      if (String(pin) !== u.pin) { t.n += 1; if (t.n >= 5) { t.until = nowMs + 30000; t.n = 0; } C.persist(); return err('FORBIDDEN', 'wrong pin', { code: 'BAD_PIN', left: Math.max(0, 5 - t.n), wait_s: t.until > nowMs ? 30 : 0 }); }
      t.n = 0; t.until = 0; C.sess.role = role; C.sess.user = userOut(u); C.sess.locked = false; C.sess.edit = false; C.persist();
      return ok({ user: userOut(u), session: { lock_after_sec: (S.settings['lock.idle_minutes'] || 10) * 60 }, prefs: clone(prefsFor(role)), settings_public: settingsPublic() });
    });
    reg('auth.logout', async () => { C.sess.role = C.sess.user = null; C.sess.locked = false; C.sess.edit = false; return ok(null); });
    reg('auth.lock', async () => { C.sess.locked = true; C.sess.edit = false; C.emit('session.locked', { reason: 'manual' }); return ok(null); });
    reg('auth.unlock', async ({ pin }) => { const u = C.S.users[C.sess.role]; if (String(pin) !== u.pin) return err('FORBIDDEN', 'wrong pin', { code: 'BAD_PIN' }); C.sess.locked = false; return ok(null); });
    reg('auth.resetPin', async ({ license_code, new_pin }) => {
      const S = C.S; if (!S.setup_done) return err('STATE');
      if (normLic(license_code) !== S.license.code) return err('LICENSE', 'wrong code', { state: 'invalid' });
      if (String(new_pin || '').length < 4 || new_pin === S.users.manager.pin) return err('VALIDATION', 'bad pin', { fields: [{ path: 'new_pin', rule: 'min4_differs' }] });
      S.users.owner.pin = new_pin; S.tries.owner = { n: 0, until: 0 }; C.persist(); return ok(null);
    });
    reg('auth.changePin', async ({ old_pin, new_pin }) => {
      const u = C.S.users[C.sess.role]; if (String(old_pin) !== u.pin) return err('FORBIDDEN', 'wrong pin', { code: 'BAD_PIN' });
      const other = C.S.users[C.sess.role === 'owner' ? 'manager' : 'owner'];
      if (String(new_pin || '').length < 4 || new_pin === other.pin) return err('VALIDATION', 'bad pin', { fields: [{ path: 'new_pin', rule: 'min4_differs' }] });
      u.pin = new_pin; C.persist(); return ok(null);
    });
    reg('auth.requestApproval', async ({ owner_pin, scope }) => {
      if (String(owner_pin) !== C.S.users.owner.pin) return err('FORBIDDEN', 'wrong owner pin', { code: 'BAD_PIN' });
      const token = 'ap_' + Math.random().toString(36).slice(2, 12); const exp = C.now().getTime() + 120000;
      C.approvals[token] = { scope, exp, used: false }; return ok({ token, expires_at: new Date(exp).toISOString(), scope });
    });
    reg('users.list', async () => ok({ rows: Object.values(C.S.users).map((u) => ({ id: u.id, name: u.name, role: u.role, last_login: null, active: u.active !== false })) }));
    reg('users.setPin', async ({ user_id, new_pin }) => { const u = Object.values(C.S.users).find((x) => x.id === user_id); if (!u) return err('NOT_FOUND'); if (String(new_pin || '').length < 4) return err('VALIDATION', 'min4', { fields: [{ path: 'new_pin', rule: 'min4' }] }); u.pin = new_pin; C.persist(); return ok(null); });
    reg('users.update', async ({ user_id, name, active }) => { const u = Object.values(C.S.users).find((x) => x.id === user_id); if (!u) return err('NOT_FOUND'); if (name) u.name = name; if (active != null && u.role === 'manager') u.active = !!active; C.persist(); return ok(userOut(u)); });

    reg('prefs.get', async () => ok(clone(prefsFor(C.sess.role))));
    reg('prefs.set', async ({ patch }) => {
      const p = prefsFor(C.sess.role); const f = []; patch = patch || {};
      const enums = { language: ['bn', 'en'], theme: ['light', 'dark', 'system'], numerals: ['latin', 'bengali'], invoice_size: ['58', '80', 'a4'], invoice_language: ['bn', 'en', 'both'] };
      for (const k of Object.keys(patch)) {
        if (enums[k]) { if (!enums[k].includes(patch[k])) f.push({ path: k, rule: 'enum' }); else p[k] = patch[k]; }
        else if (k === 'calc') { const c = patch.calc || {}; for (const ck of Object.keys(c)) { if (!['x', 'y', 'open', 'history', 'memory'].includes(ck)) f.push({ path: 'calc.' + ck, rule: 'unknown_key' }); else p.calc[ck] = ck === 'history' ? (c.history || []).slice(-20) : c[ck]; } }
        else if (k === 'games') { const g = patch.games || {}; for (const gk of Object.keys(g)) { if (gk === 'scores') { for (const s of Object.keys(g.scores)) { if (!(s in p.games.scores)) f.push({ path: 'games.scores.' + s, rule: 'unknown_key' }); else p.games.scores[s] = Math.max(p.games.scores[s], Math.floor(Number(g.scores[s]) || 0)); } } else f.push({ path: 'games.' + gk, rule: 'unknown_key' }); } }
        else f.push({ path: k, rule: 'unknown_key' });
      }
      if (f.length) return err('VALIDATION', 'bad prefs', { fields: f });
      C.persist(); return ok(clone(p));
    });
    reg('settings.get', async ({ keys }) => {
      const S = C.S; const all = S.settings; const allowed = C.sess.role === 'owner' ? Object.keys(all) : PUBLIC_SETTINGS; const want = keys && keys.length ? keys : allowed; const out = {};
      want.forEach((k) => { if (allowed.includes(k) && k in all) out[k] = all[k]; else if (!allowed.includes(k) && k in all) { /* hidden for manager: omit, never null */ } });
      return ok(out);
    });
    reg('settings.set', async ({ patch }) => {
      const S = C.S; const f = [];
      Object.keys(patch || {}).forEach((k) => { if (!(k in S.settings)) f.push({ path: k, rule: 'unknown_key' }); });
      if (f.length) return err('VALIDATION', 'bad settings', { fields: f });
      Object.assign(S.settings, patch); C.persist(); return ok(clone(S.settings));
    });
    reg('system.info', async () => ok({ app_version: '0.1.0-mock', contract_version: PD.CONTRACT.version, db_version: 1, data_dir: C.sess.role === 'owner' ? '%APPDATA%\\PetraDMS\\data' : undefined, now: C.now().toISOString() }));
    reg('system.clockCheck', async () => ok({ ok: true, last_seen: C.now().toISOString(), now: C.now().toISOString() }));
  };
})(typeof window !== 'undefined' ? window : globalThis);

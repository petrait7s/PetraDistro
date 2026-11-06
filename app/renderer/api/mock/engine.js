/* Mock backend engine. Same envelope, roles and error codes as contract/CONTRACT.md. Handlers are registered per family (h-*.js).
   Lets the whole UI run and be tested with no backend. Money/qty math in handlers mimics the contract, but the REAL numbers come from the backend. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const ok = (data) => ({ ok: true, data: data === undefined ? null : data });
  const err = (code, message, details) => ({ ok: false, code, message: message || code, details });
  const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

  const PUBLIC_SETTINGS = ['business.name', 'business.address', 'business.phone', 'invoice.default_size', 'invoice.footer', 'games.enabled', 'games.manager_enabled', 'calc.enabled', 'numerals.default', 'lock.idle_minutes'];
  const DEFAULT_SETTINGS = { 'business.name': '', 'business.address': '', 'business.phone': '', 'invoice.footer': '', 'invoice.default_size': '80', 'discount.require_pin_over_cap': true, 'returns.manager_needs_approval': true, 'cancel.manager_needs_approval': true, 'credit.mode': 'warn', 'expiry.warn_days': 30, 'stock.low_default_days': 3, 'lock.idle_minutes': 10, 'games.enabled': true, 'games.manager_enabled': true, 'calc.enabled': true, 'commission.enabled': true, 'numerals.default': 'latin', 'editmode.idle_minutes': 10 };
  const DEFAULT_PREFS = () => ({ language: 'bn', theme: 'light', numerals: 'latin', invoice_size: '80', invoice_language: 'bn', calc: { x: null, y: null, open: false, history: [], memory: null }, games: { enabled: true, scores: { '2048': 0, snake: 0, memory: 0, blocks: 0 } } });

  PD.createMock = function createMock(opts) {
    opts = opts || {};
    const now = opts.now || (() => new Date());
    const store = opts.storage || null; const KEY = 'pd-mock-v1';
    let S = null;
    const fresh = () => ({ license: { state: 'none', code: null }, setup_done: false, business: null, users: {}, settings: clone(DEFAULT_SETTINGS), prefs: {}, tries: {}, seq: 1, d: null });
    try { if (store) { const raw = store.getItem(KEY); if (raw) S = JSON.parse(raw); } } catch (e) { S = null; }
    if (!S) S = fresh();
    let pt = null; const persist = () => { if (!store) return; clearTimeout(pt); pt = setTimeout(() => { try { store.setItem(KEY, JSON.stringify(S)); } catch (e) { /* quota: ignore */ } }, 300); };
    const sess = { role: null, user: null, locked: false, edit: false };
    const approvals = {}; const listeners = {};
    const emit = (e, p) => (listeners[e] || []).slice().forEach((f) => f(clone(p)));
    const handlers = {};
    const ctxBase = { ok, err, clone, now, persist, emit, get S() { return S; }, sess, approvals, DEFAULT_PREFS, PUBLIC_SETTINGS, handlers };

    function consumeApproval(a, scope) {
      if (sess.role === 'owner' && !['cancel_invoice', 'reverse_payment', 'restore_backup', 'edit_mode', 'license_reveal'].includes(scope)) return { ok: true, by: sess.user };
      if (!a || !a.token || !a.reason) return { ok: false };
      const r = approvals[a.token]; if (!r || r.used || r.scope !== scope || r.exp < now().getTime()) return { ok: false };
      r.used = true; return { ok: true, by: S.users.owner.name, reason: a.reason };
    }
    ctxBase.consumeApproval = consumeApproval;

    async function call(method, args) {
      args = args == null ? {} : args;
      const spec = PD.CONTRACT && PD.CONTRACT.methods[method];
      if (!spec) return err('VALIDATION', 'unknown method ' + method, { fields: [{ path: 'method', rule: 'known', message: method }] });
      const bad = Object.keys(args).filter((k) => !spec.input.includes(k));
      if (bad.length) return err('VALIDATION', 'unknown keys', { fields: bad.map((k) => ({ path: k, rule: 'unknown_key', message: k })) });
      if (spec.who !== 'public') {
        if (!sess.role) return err('UNAUTHENTICATED');
        if (sess.locked && method !== 'auth.unlock' && method !== 'auth.logout') return err('LOCKED');
        if (spec.who === 'owner' && sess.role !== 'owner') return err('FORBIDDEN');
      }
      const h = handlers[method];
      if (!h) return err('UNSUPPORTED', 'mock: ' + method + ' is not built yet');
      try { const r = await h(clone(args), ctxBase); if (S && S.d) persist(); if (opts.latency) await new Promise((res) => setTimeout(res, opts.latency)); return r === undefined ? ok(null) : r; } catch (e) { if (PD.Fail && e instanceof PD.Fail) return err(e.code, e.message, e.details); return err('DB', String(e && e.message || e), { recoverable: true }); }
    }
    function on(name, cb) { (listeners[name] = listeners[name] || []).push(cb); return () => { listeners[name] = (listeners[name] || []).filter((f) => f !== cb); }; }
    function register(name, fn) { handlers[name] = fn; }
    function reset() { S = fresh(); sess.role = sess.user = null; sess.locked = false; sess.edit = false; persist(); }
    return { call, on, register, reset, ctx: ctxBase, _state: () => S, _sess: sess };
  };
  PD.mockHelpers = { ok, err, clone, DEFAULT_PREFS, DEFAULT_SETTINGS, PUBLIC_SETTINGS };
})(typeof window !== 'undefined' ? window : globalThis);

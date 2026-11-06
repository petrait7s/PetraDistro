/* PD.api: the ONLY place the UI talks to a backend. In Electron, preload exposes window.api; in a browser or tests the mock is used.
   PD.rpc(method,args) returns data or throws PD.ApiError{code,message,details}. PD.api.raw returns the envelope. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  class ApiError extends Error { constructor(env) { super(env.message || env.code); this.code = env.code; this.details = env.details; } }
  PD.ApiError = ApiError;
  let backend = null;
  PD.useBackend = (b) => { backend = b; };
  PD.initApi = (opts) => {
    opts = opts || {};
    if (root.api && typeof root.api.call === 'function' && !opts.forceMock) { backend = root.api; PD.isMock = false; return backend; }
    const store = (() => { try { return opts.noStorage ? null : root.localStorage; } catch (e) { return null; } })();
    const m = PD.createMock({ storage: store, now: opts.now, latency: opts.latency }); PD.installCoreHandlers(m);
    (PD.mockInstallers || []).forEach((f) => f(m));
    backend = m; PD.isMock = true; PD.mock = m; return backend;
  };
  PD.api = {
    raw: (method, args) => backend.call(method, args),
    on: (name, cb) => (backend.on ? backend.on(name, cb) : () => {})
  };
  PD.rpc = async (method, args) => { const env = await backend.call(method, args); if (env && env.ok) return env.data; throw new ApiError(env || { code: 'DB', message: 'no response' }); };
  /* run an action, toast the translated error if it fails; returns [data, error] */
  PD.try = async (method, args) => { PD.lastTry = { method, args }; try { return [await PD.rpc(method, args), null]; } catch (e) { return [null, e]; } };
})(typeof window !== 'undefined' ? window : globalThis);

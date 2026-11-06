/* i18n: PD.t(key, params). Dictionaries are added by bn.js / en.js. Falls back to English, then to the key itself (a visible bug). */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const dict = { bn: {}, en: {} };
  PD.i18n = { dict, add(lang, obj) { Object.assign(dict[lang], obj); }, missing: [], pairs(o) { Object.keys(o).forEach((k) => { dict.en[k] = o[k][0]; dict.bn[k] = o[k][1]; }); } };
  PD.t = (key, params) => {
    const l = PD.lang ? PD.lang() : 'bn';
    let s = dict[l][key];
    if (s == null) { s = dict.en[key]; if (s == null) { PD.i18n.missing.push(key); return key; } }
    if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] == null ? m : String(params[k])));
    return s;
  };
  /* translate error envelope: err.<CODE>, with optional details params */
  PD.errText = (e) => { const k = 'err.' + (e && e.code); const has = dict.en[k] != null; return has ? PD.t(k, e.details && e.details.params) : PD.t('err.UNKNOWN'); };
  /* apply to static markup: elements with data-i18n="key" (text), data-i18n-ph (placeholder), data-i18n-title (title/aria-label) */
  PD.i18n.apply = (rootEl) => {
    const r = rootEl || document;
    r.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = PD.t(el.getAttribute('data-i18n')); });
    r.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.setAttribute('placeholder', PD.t(el.getAttribute('data-i18n-ph'))); });
    r.querySelectorAll('[data-i18n-title]').forEach((el) => { const v = PD.t(el.getAttribute('data-i18n-title')); el.setAttribute('title', v); el.setAttribute('aria-label', v); });
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* Theme + language application. Device-local pre-login choice lives in localStorage (try/catch); after login prefs from the backend win. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const KEY = 'pd.pre';
  const store = () => { try { return root.localStorage; } catch (e) { return null; } };
  PD.pre = {
    get() { try { const s = store(); return (s && JSON.parse(s.getItem(KEY))) || {}; } catch (e) { return {}; } },
    set(patch) { try { const s = store(); if (s) s.setItem(KEY, JSON.stringify(Object.assign(PD.pre.get(), patch))); } catch (e) { /* ignore */ } }
  };
  PD.applyTheme = () => {
    const th = (PD.S.prefs && PD.S.prefs.theme) || 'light'; const el = document.documentElement;
    if (th === 'system') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', th);
    PD.emit('theme');
  };
  PD.applyLang = () => {
    document.documentElement.setAttribute('lang', PD.lang());
    document.title = PD.t('app.name') + ' — ' + PD.t('app.tagline'); const tt = document.getElementById('tb-t'); if (tt) tt.textContent = document.title;
    PD.emit('lang');
  };
  /* ensure PD.S.prefs exists before login, from device-local choice */
  PD.initPrefs = () => { const p = PD.pre.get(); PD.S.prefs = Object.assign({ language: 'bn', theme: 'light', numerals: 'latin' }, p); PD.applyTheme(); PD.applyLang(); };
  /* change one of language/theme/numerals; saves to backend when logged in, else device-local */
  PD.setPref = async (patch) => {
    PD.S.prefs = Object.assign(PD.S.prefs || {}, patch);
    if (PD.S.role) { const [d, e] = await PD.try('prefs.set', { patch }); if (e) { PD.toast(PD.errText(e), 'bad'); } else if (d) PD.S.prefs = d; }
    else PD.pre.set(patch);
    if ('theme' in patch) PD.applyTheme();
    if ('language' in patch || 'numerals' in patch) { PD.applyLang(); }
    PD.emit('prefs', patch);
  };
})(typeof window !== 'undefined' ? window : globalThis);

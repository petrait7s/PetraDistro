/* PetraDMS renderer core: namespace, DOM helpers, icons, number/date formatting that follows language + numerals setting.
   No business arithmetic here. Classic script (works from file:// in Electron and in jsdom tests). */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  PD.views = {}; PD.widgets = {}; PD.S = { role: null, user: null, prefs: null, settings: {}, view: 'dashboard' };
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  PD.$ = $; PD.$$ = $$; PD.esc = esc; PD.VERSION = '1.7.6';

  const IC = {
    dash: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="14" width="8" height="7" rx="1.5"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    cart: '<path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/>',
    truck: '<path d="M2 6h11v10H2zM13 9h4l4 3v4h-8z"/><circle cx="6.5" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M16 5.5a3 3 0 010 5.6M18 14.5c1.8.8 3 2.6 3 5.5"/>',
    undo: '<path d="M9 6L4 11l5 5M4 11h9a6 6 0 010 12h-3"/>',
    route: '<circle cx="5" cy="17" r="2"/><circle cx="19" cy="7" r="2"/><path d="M7 17h6a3 3 0 000-6h-2a3 3 0 010-6h6"/>',
    cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6"/>',
    percent: '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.3"/><circle cx="17" cy="17" r="2.3"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 017.5-2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
    moon: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
    edit: '<path d="M4 20l1-4L16.5 4.5a2 2 0 013 3L8 19l-4 1z"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    share: '<circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    warn: '<path d="M12 4l9.5 16.5h-19L12 4z"/><path d="M12 10v4.5M12 17.5v.1"/>',
    print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><rect x="7" y="14" width="10" height="7"/>',
    min: '<path d="M5 12h14"/>', max: '<rect x="5" y="5" width="14" height="14" rx="1"/>',
    cloud: '<path d="M7 18a4.5 4.5 0 01-.5-9A6 6 0 0118 10a4 4 0 010 8H7z"/>',
    key: '<circle cx="8" cy="15" r="3.5"/><path d="M10.5 12.5L20 3M16 7l3 3"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><rect x="8" y="6" width="8" height="3.5" rx=".8"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"/>',
    game: '<path d="M7 8h10a4 4 0 014 4v2a3 3 0 01-5.2 2l-1.3-1.5h-5L8.2 16A3 3 0 013 14v-2a4 4 0 014-4z"/><path d="M8 10.5v3M6.5 12h3"/><path d="M15.5 11.2h.01M17.5 13h.01"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
    pause: '<path d="M9 6v12M15 6v12"/>',
    play: '<path d="M8 5.5v13l10-6.5z"/>',
    refresh: '<path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6"/>',
    chevl: '<path d="M14.5 6l-6 6 6 6"/>',
    copy: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M5 15V6a2 2 0 012-2h8"/>',
    bksp: '<path d="M21 6H9l-6 6 6 6h12z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'
  };
  PD.ic = (n, s) => `<svg class="ic" viewBox="0 0 24 24" ${s ? `style="width:${s}px;height:${s}px"` : ''} aria-hidden="true">${IC[n] || ''}</svg>`;
  PD.icons = IC;

  /* ---------- formatting (display only; values arrive from the backend as integers) ---------- */
  const BN_DIG = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  PD.digits = (str) => (PD.numerals() === 'bengali' ? String(str).replace(/[0-9]/g, (d) => BN_DIG[+d]) : String(str));
  PD.numerals = () => (PD.S.prefs && PD.S.prefs.numerals) || 'latin';
  const grp = (n) => { const s = String(Math.abs(n)); if (s.length <= 3) return s; const last = s.slice(-3); const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ','); return rest + ',' + last; };
  PD.grp = grp;
  /* money(paisa): whole-taka display, lakh/crore grouping. Rounding of display only. */
  PD.money = (paisa, plain) => { const neg = paisa < 0; const i = Math.round(Math.abs(paisa) / 100); return PD.digits((neg && i ? '\u2212' : '') + (plain ? '' : '\u09f3 ') + grp(i)); };
  PD.num = (n, d) => { const v = Number(n) || 0; const t = d != null ? v.toFixed(d) : String(Number.isInteger(v) ? v : Math.round(v * 100) / 100); const p = t.split('.'); return PD.digits((v < 0 ? '\u2212' : '') + grp(Math.abs(Number(p[0]))) + (p[1] ? '.' + p[1] : '')); };
  const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MON_BN = ['\u099c\u09be\u09a8\u09c1', '\u09ab\u09c7\u09ac\u09cd\u09b0\u09c1', '\u09ae\u09be\u09b0\u09cd\u099a', '\u098f\u09aa\u09cd\u09b0\u09bf\u09b2', '\u09ae\u09c7', '\u099c\u09c1\u09a8', '\u099c\u09c1\u09b2\u09be\u0987', '\u0986\u0997\u09b8\u09cd\u099f', '\u09b8\u09c7\u09aa\u09cd\u099f\u09c7', '\u0985\u0995\u09cd\u099f\u09cb', '\u09a8\u09ad\u09c7', '\u09a1\u09bf\u09b8\u09c7'];
  const p2 = (n) => String(n).padStart(2, '0');
  PD.month = (m) => ((PD.lang() === 'bn' ? MON_BN : MON_EN)[m]);
  PD.date = (d) => { const x = d instanceof Date ? d : new Date(d); return PD.digits(p2(x.getDate()) + ' ' + PD.month(x.getMonth()) + ' ' + x.getFullYear()); };
  PD.time = (d) => { const x = d instanceof Date ? d : new Date(d); return PD.digits(p2(x.getHours()) + ':' + p2(x.getMinutes())); };
  PD.lang = () => (PD.S.prefs && PD.S.prefs.language) || 'bn';

  /* ---------- tiny event bus ---------- */
  const L = {};
  PD.on = (e, f) => { (L[e] = L[e] || []).push(f); return () => { L[e] = (L[e] || []).filter((x) => x !== f); }; };
  PD.emit = (e, p) => (L[e] || []).slice().forEach((f) => { try { f(p); } catch (err) { console.error(err); } });
})(typeof window !== 'undefined' ? window : globalThis);

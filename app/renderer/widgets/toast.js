(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  PD.toast = (msg, kind) => {
    const box = document.getElementById('toast'); if (!box) return;
    const el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.setAttribute('role', kind === 'bad' ? 'alert' : 'status'); el.textContent = msg; box.appendChild(el);
    setTimeout(() => el.remove(), kind === 'bad' ? 5200 : 3200);
  };
})(typeof window !== 'undefined' ? window : globalThis);

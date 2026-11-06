/* Entry point. */
(function (root) {
  'use strict';
  const PD = root.PD;
  PD.on('lang', () => { if (PD.calc && PD.calc.isOpen()) PD.calc.rerender(); });
  const start = () => PD.boot();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);

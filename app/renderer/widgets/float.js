/* Floating, draggable, non-modal tool windows. Position is kept in-bounds and reported via onMove. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const open = {};
  let z = 40;
  PD.float = {
    get: (id) => open[id] || null,
    list: () => Object.keys(open),
    create(o) {
      if (open[o.id]) { open[o.id].focus(); return open[o.id]; }
      const host = document.getElementById('win'); const el = document.createElement('div');
      el.className = 'fw ' + (o.cls || ''); el.id = 'fw-' + o.id; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', o.titleText || '');
      el.innerHTML = `<header><span class="ti">${o.title || ''}</span><span class="sp"></span>${(o.headBtns || '')}<button data-close aria-label="${PD.esc(PD.t('common.close'))}">${PD.ic('x', 15)}</button></header><div class="fb"></div>`;
      host.appendChild(el);
      const ref = { id: o.id, el, body: el.querySelector('.fb'), head: el.querySelector('header'),
        focus() { el.style.zIndex = String(++z > 49 ? (z = 41) : z); },
        place(x, y) { const W = host.clientWidth || 1000, H = host.clientHeight || 700, w = el.offsetWidth || 300, h = el.offsetHeight || 400; x = Math.max(0, Math.min(x, W - Math.min(w, W))); y = Math.max(0, Math.min(y, H - Math.min(h, H))); el.style.left = x + 'px'; el.style.top = y + 'px'; return { x, y }; },
        close() { if (!open[o.id]) return; delete open[o.id]; el.remove(); if (o.onClose) o.onClose(ref); PD.emit('float', o.id); } };
      open[o.id] = ref;
      const W = host.clientWidth || 1000; ref.place(o.x != null ? o.x : W - 340, o.y != null ? o.y : 70);
      el.addEventListener('mousedown', () => ref.focus());
      el.querySelector('[data-close]').addEventListener('click', () => ref.close());
      let drag = null;
      ref.head.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; drag = { dx: e.clientX - el.offsetLeft, dy: e.clientY - el.offsetTop }; try { ref.head.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } });
      ref.head.addEventListener('pointermove', (e) => { if (drag) ref.place(e.clientX - drag.dx, e.clientY - drag.dy); });
      const end = () => { if (drag) { drag = null; if (o.onMove) o.onMove({ x: el.offsetLeft, y: el.offsetTop }); } };
      ref.head.addEventListener('pointerup', end); ref.head.addEventListener('pointercancel', end);
      ref.focus(); PD.emit('float', o.id);
      return ref;
    },
    closeAll() { Object.keys(open).forEach((k) => open[k].close()); }
  };
})(typeof window !== 'undefined' ? window : globalThis);

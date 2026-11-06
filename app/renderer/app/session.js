/* Session: login state, idle lock, lock overlay. The backend (not the renderer) owns the real session; this only mirrors it. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const { $, esc } = PD;
  let lastAct = Date.now(); let idleSec = 600; let idleTimer = null; let lockEl = null; let unsub = null;
  const touch = () => { lastAct = Date.now(); };
  ['pointerdown', 'keydown', 'mousemove', 'wheel'].forEach((ev) => document.addEventListener(ev, touch, { passive: true, capture: true }));

  PD.session = {
    async start(loginData) {
      const S = PD.S; S.role = loginData.user.role; S.user = loginData.user; S.prefs = Object.assign({ language: 'bn', theme: 'light', numerals: 'latin' }, loginData.prefs);
      const [st] = await PD.try('settings.get', {}); S.settings = st || {};
      idleSec = (loginData.session && loginData.session.lock_after_sec) || 600; touch();
      PD.applyTheme(); PD.applyLang();
      clearInterval(idleTimer); idleTimer = setInterval(() => { if (PD.S.role && !lockEl && Date.now() - lastAct > idleSec * 1000) PD.session.lock('idle'); }, 5000);
      if (unsub) unsub(); unsub = PD.api.on('session.locked', () => PD.session.showLock());
    },
    end() {
      const S = PD.S; clearInterval(idleTimer); idleTimer = null; if (unsub) { unsub(); unsub = null; }
      PD.float.closeAll(); PD.closeAllModals(); if (PD.calc) PD.calc.reset(); if (lockEl) { lockEl.remove(); lockEl = null; }
      S.role = null; S.user = null; S.settings = {}; const pre = PD.pre.get(); S.prefs = Object.assign({ language: 'bn', theme: 'light', numerals: 'latin' }, pre); PD.applyTheme(); PD.applyLang();
    },
    async logout() { await PD.try('auth.logout', {}); PD.session.end(); PD.emit('loggedout'); },
    async lock() { await PD.try('auth.lock', {}); PD.session.showLock(); },
    isLocked: () => !!lockEl,
    showLock() {
      if (lockEl) return; PD.emit('locked'); PD.float.closeAll(); PD.closeAllModals();
      const el = document.createElement('div'); el.className = 'lockov'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
      el.innerHTML = `<div class="md"><header><span>${PD.ic('lock')} ${esc(PD.t('lock.title'))}</span></header><div class="bd"><p class="muted" style="margin:0 0 10px">${esc(PD.t('lock.sub'))}</p><div class="pinrow"><input class="in" id="lk-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" aria-label="${esc(PD.t('login.pin'))}"></div><p class="small" id="lk-err" style="color:var(--bad);margin:8px 0 0;min-height:18px"></p></div><footer><button class="btn" id="lk-out">${esc(PD.t('lock.logout'))}</button><button class="btn p" id="lk-go">${esc(PD.t('lock.go'))}</button></footer></div>`;
      $('#win').appendChild(el); lockEl = el; const inp = $('#lk-pin', el); setTimeout(() => inp.focus(), 20);
      const go = async () => { const [, e] = await PD.try('auth.unlock', { pin: inp.value }); if (e) { $('#lk-err', el).textContent = e.details && e.details.code === 'BAD_PIN' ? PD.t('login.wrongShort') : PD.errText(e); inp.value = ''; inp.focus(); return; } el.remove(); lockEl = null; touch(); PD.emit('unlocked'); };
      $('#lk-go', el).addEventListener('click', go); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      $('#lk-out', el).addEventListener('click', async () => { el.remove(); lockEl = null; await PD.session.logout(); });
    }
  };
  PD.canGames = () => { const s = PD.S.settings || {}; return !!(PD.S.role && s['games.enabled'] !== false && (PD.S.role === 'owner' || s['games.manager_enabled'] !== false)); };
  PD.canCalc = () => !!(PD.S.role && (PD.S.settings || {})['calc.enabled'] !== false);
})(typeof window !== 'undefined' ? window : globalThis);

/* Games window (F9): 2048, Snake, Memory match, Block puzzle. One active game, one timer. Zero CPU while paused or closed.
   Auto-pauses on: window blur, hidden page, any modal open, session lock, switching games, closing the window. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {}); const L = PD.GameLogic; const rng = () => Math.random();
  const KINDS = ['2048', 'snake', 'memory', 'blocks'];
  let win = null; let cur = null; let timer = null; let paused = false; let auto = false; let flags = { wrap: false };
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#028d8f';
  const best = (k) => (((PD.S.prefs || {}).games || {}).scores || {})[k] || 0;
  function saveBest(k, sc) {
    if (!PD.S.role || sc <= best(k)) return; const g = PD.S.prefs.games = PD.S.prefs.games || { scores: {} }; g.scores = g.scores || {}; g.scores[k] = sc;
    PD.try('prefs.set', { patch: { games: { scores: { [k]: sc } } } });
  }
  const stat = (l, v) => `<div class="stat">${PD.esc(l)}<b>${PD.esc(PD.digits(v))}</b></div>`;
  const SH = {
    0: '<circle cx="12" cy="12" r="8" fill="#e5484d"/>', 1: '<path d="M12 4l9 16H3z" fill="#3b82f6"/>', 2: '<rect x="4" y="4" width="16" height="16" rx="2" fill="#16a34a"/>', 3: '<path d="M12 3l9 9-9 9-9-9z" fill="#f2b24d"/>',
    4: '<path d="M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 17l-5.6 3 1.3-6.2L3 9.5l6.3-.7z" fill="#a855f7"/>', 5: '<path d="M12 20s-8-5-8-10.5A4.5 4.5 0 0112 7a4.5 4.5 0 018 2.5C20 15 12 20 12 20z" fill="#ec4899"/>',
    6: '<path d="M7 3h10l5 9-5 9H7l-5-9z" fill="#14b8a6"/>', 7: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="#f97316"/>'
  };

  /* ---- each game returns {el, stats(), key(e), tick (ms fn or null), step(), over(), score(), start(), onResume(), onPause(), destroy()} ---- */
  function build2048(area) {
    let s = L.g2048.newGame(rng); const grid = document.createElement('div'); grid.className = 'g2048'; grid.setAttribute('role', 'grid'); area.appendChild(grid);
    const draw = () => { grid.innerHTML = s.board.map((r) => r.map((v) => `<div class="tl ${v ? (v > 2048 ? 'big' : 'v' + v) : ''}" role="gridcell">${v ? PD.digits(v) : ''}</div>`).join('')).join(''); };
    const dirOf = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };
    const mv = (d) => { s = L.g2048.step(s, d, rng); draw(); };
    let sx = 0, sy = 0; grid.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
    grid.addEventListener('pointerup', (e) => { if (paused) return; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; mv(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); end(); });
    draw();
    function end() { if (s.over || s.won) hub.finish(); }
    return { stats: () => stat(PD.t('games.score'), s.score) + stat(PD.t('games.moves'), s.moves) + stat(PD.t('games.best'), Math.max(best('2048'), s.score)), key(e) { const d = dirOf[e.key]; if (d) { e.preventDefault(); mv(d); end(); } }, tick: null, over: () => s.over, won: () => s.won, score: () => s.score, key2: '2048', destroy() {} };
  }
  function buildSnake(area) {
    let s = L.snake.newGame({ wrap: flags.wrap }, rng); const cell = 18; const cv = document.createElement('canvas'); cv.className = 'gcanvas'; cv.width = cv.height = s.w * cell; area.appendChild(cv);
    const ctx = cv.getContext && cv.getContext('2d');
    const draw = () => { if (!ctx) return; ctx.fillStyle = css('--win'); ctx.fillRect(0, 0, cv.width, cv.height); ctx.fillStyle = '#e5484d'; if (s.food) { ctx.beginPath(); ctx.arc(s.food.x * cell + cell / 2, s.food.y * cell + cell / 2, cell / 2 - 2, 0, 7); ctx.fill(); } s.body.forEach((p, i) => { ctx.fillStyle = i ? css('--teal') : css('--ink'); ctx.fillRect(p.x * cell + 1, p.y * cell + 1, cell - 2, cell - 2); }); };
    const dirOf = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };
    draw();
    return { stats: () => stat(PD.t('games.score'), s.score) + stat(PD.t('games.best'), Math.max(best('snake'), s.score)) + stat(PD.t('games.wrap'), PD.t(flags.wrap ? 'games.wrap.on' : 'games.wrap.off')), key(e) { const d = dirOf[e.key]; if (d) { e.preventDefault(); L.snake.turn(s, d); } }, tick: () => L.snake.interval(s.score), step() { L.snake.step(s, rng); draw(); }, over: () => !s.alive, won: () => s.won, score: () => s.score, key2: 'snake', destroy() {} };
  }
  function buildMemory(area) {
    const pairs = 8; let s = L.memory.newGame(pairs, rng); const g = document.createElement('div'); g.className = 'gmem'; g.style.gridTemplateColumns = 'repeat(4, 70px)'; area.appendChild(g); let rt = null;
    const draw = () => { g.innerHTML = s.cards.map((c, i) => `<button class="cd ${c.up ? 'up' : ''} ${c.done ? 'done' : ''}" data-i="${i}" aria-label="${c.up || c.done ? 'card ' + (c.id + 1) : 'hidden card'}">${c.up || c.done ? `<svg viewBox="0 0 24 24">${SH[c.id]}</svg>` : ''}</button>`).join(''); };
    const sched = () => { clearTimeout(rt); if (s.busy) rt = setTimeout(() => { L.memory.resolve(s); draw(); }, 800); };
    g.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b || paused) return; L.memory.flip(s, +b.dataset.i); draw(); sched(); if (s.won) hub.finish(); });
    draw();
    return { stats: () => stat(PD.t('games.moves'), s.moves) + stat(PD.t('games.score'), L.memory.points(s)) + stat(PD.t('games.best'), Math.max(best('memory'), L.memory.points(s))), key() {}, tick: null, over: () => false, won: () => s.won, score: () => L.memory.points(s), key2: 'memory', onPause() { clearTimeout(rt); }, onResume() { sched(); }, destroy() { clearTimeout(rt); } };
  }
  function buildBlocks(area) {
    let s = L.blocks.newGame(rng); const cell = 20; const wrapEl = document.createElement('div'); wrapEl.style.cssText = 'display:flex;gap:12px;align-items:flex-start'; const cv = document.createElement('canvas'); cv.className = 'gcanvas'; cv.width = 10 * cell; cv.height = 20 * cell; const nx = document.createElement('canvas'); nx.className = 'gcanvas'; nx.width = nx.height = 4 * 16 + 8; wrapEl.appendChild(cv); wrapEl.appendChild(nx); area.appendChild(wrapEl);
    const ctx = cv.getContext && cv.getContext('2d'); const nctx = nx.getContext && nx.getContext('2d');
    const COL = { I: '#14b8a6', O: '#f2b24d', T: '#a855f7', S: '#16a34a', Z: '#e5484d', J: '#3b82f6', L: '#f97316' };
    const draw = () => {
      if (ctx) { ctx.fillStyle = css('--win'); ctx.fillRect(0, 0, cv.width, cv.height); s.board.forEach((r, y) => r.forEach((v, x) => { if (v) { ctx.fillStyle = COL[v]; ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2); } })); if (s.cur && !s.over) { ctx.fillStyle = COL[s.cur.t]; L.blocks.cells(s.cur).forEach(([x, y]) => { if (y >= 0) ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2); }); } }
      if (nctx) { nctx.fillStyle = css('--win'); nctx.fillRect(0, 0, nx.width, nx.height); nctx.fillStyle = COL[s.next]; L.blocks.cells({ t: s.next, r: 0, x: 0, y: 0 }).forEach(([x, y]) => nctx.fillRect(4 + x * 16, 8 + y * 16, 14, 14)); }
    };
    draw();
    return { stats: () => stat(PD.t('games.score'), s.score) + stat(PD.t('games.level'), s.level) + stat(PD.t('games.lines'), s.lines) + stat(PD.t('games.best'), Math.max(best('blocks'), s.score)),
      key(e) { const k = e.key; let used = true; if (k === 'ArrowLeft') L.blocks.tryMove(s, -1, 0); else if (k === 'ArrowRight') L.blocks.tryMove(s, 1, 0); else if (k === 'ArrowDown') { L.blocks.tick(s); } else if (k === 'ArrowUp') L.blocks.rotate(s); else if (k === ' ') { L.blocks.hardDrop(s); } else used = false; if (used) { e.preventDefault(); draw(); if (s.over) hub.finish(); else hub.refreshStats(); } },
      tick: () => L.blocks.interval(s.level), step() { L.blocks.tick(s); draw(); }, over: () => s.over, won: () => false, score: () => s.score, key2: 'blocks', destroy() {} };
  }
  const BUILD = { '2048': build2048, snake: buildSnake, memory: buildMemory, blocks: buildBlocks };

  const hub = {
    refreshStats() { const st = win && win.body.querySelector('#g-stats'); if (st && cur) st.innerHTML = cur.stats(); },
    finish() { if (!cur) return; clearTimeout(timer); timer = null; saveBest(cur.key2, cur.score()); hub.refreshStats(); showOverlay(cur.won() ? PD.t('games.win') : PD.t('games.over'), PD.t('games.new')); },
  };
  function showOverlay(title, btn, resume) {
    const area = win && win.body.querySelector('.area'); if (!area) return; let o = area.querySelector('.over'); if (o) o.remove();
    o = document.createElement('div'); o.className = 'over'; o.innerHTML = `<b style="font-size:18px">${PD.esc(title)}</b><div><button class="btn p" data-ov>${PD.esc(btn)}</button></div>`; area.appendChild(o);
    o.querySelector('[data-ov]').addEventListener('click', () => { if (resume) hub.resume(); else hub.start(cur ? cur.key2 : '2048'); });
    try { o.querySelector('[data-ov]').focus(); } catch (e) { /* ignore */ }
  }
  function loop() {
    clearTimeout(timer); timer = null; if (!cur || paused || !cur.tick) return;
    timer = setTimeout(() => { if (paused || !cur) return; cur.step(); hub.refreshStats(); if (cur.over()) hub.finish(); else loop(); }, cur.tick());
  }
  hub.pause = (isAuto) => { if (!cur || paused) return; if (cur.over() || cur.won()) return; paused = true; auto = !!isAuto; clearTimeout(timer); timer = null; if (cur.onPause) cur.onPause(); showOverlay(isAuto ? PD.t('games.autoPaused') : PD.t('games.paused'), PD.t('games.resume'), true); };
  hub.resume = () => { if (!cur || !paused) return; paused = false; auto = false; const o = win && win.body.querySelector('.over'); if (o) o.remove(); if (cur.onResume) cur.onResume(); loop(); try { win.el.focus(); } catch (e) { /* ignore */ } };
  hub.start = (kind) => {
    if (!win) return; hub.stop(); const b = win.body;
    b.innerHTML = `<div class="gm"><div class="gtop"><button class="btn sm" data-back>${PD.ic('chevl', 14)} ${PD.t('games.title')}</button><span class="sp"></span><button class="btn sm" data-new>${PD.ic('refresh', 14)} ${PD.t('games.new')}</button><button class="btn sm" data-pause>${PD.ic('pause', 14)}</button></div><div class="gtop" id="g-stats"></div><div class="area"></div><p class="how">${PD.esc(PD.t('games.' + kind + '.how'))}</p>${kind === 'snake' ? `<div class="ctl"><span class="seg"><button data-wrap="0" class="${flags.wrap ? '' : 'on'}">${PD.t('games.wrap.off')}</button><button data-wrap="1" class="${flags.wrap ? 'on' : ''}">${PD.t('games.wrap.on')}</button></span></div>` : ''}</div>`;
    cur = BUILD[kind](b.querySelector('.area')); paused = false; auto = false; hub.refreshStats(); loop();
    b.querySelector('[data-back]').addEventListener('click', () => hub.pick());
    b.querySelector('[data-new]').addEventListener('click', () => hub.start(kind));
    b.querySelector('[data-pause]').addEventListener('click', () => { if (paused) hub.resume(); else hub.pause(false); });
    b.querySelectorAll('[data-wrap]').forEach((x) => x.addEventListener('click', () => { flags.wrap = x.dataset.wrap === '1'; hub.start('snake'); }));
    try { win.el.focus(); } catch (e) { /* ignore */ }
  };
  hub.stop = () => { clearTimeout(timer); timer = null; if (cur) { saveBest(cur.key2, cur.score()); if (cur.destroy) cur.destroy(); } cur = null; paused = false; auto = false; };
  hub.pick = () => {
    if (!win) return; hub.stop();
    win.body.innerHTML = `<div class="gm pick"><p class="muted" style="margin:0 0 10px;text-align:center">${PD.t('games.pick')}</p><div class="gcards">${KINDS.map((k) => `<button class="gcard" data-g="${k}"><span style="color:var(--teal)">${PD.ic('game', 26)}</span><b>${PD.esc(PD.t('games.' + k))}</b><small>${PD.t('games.best')}: ${PD.digits(best(k))}</small></button>`).join('')}</div></div>`;
    win.body.querySelectorAll('[data-g]').forEach((x) => x.addEventListener('click', () => hub.start(x.dataset.g)));
  };
  hub.open = () => {
    if (win) { win.focus(); return win; }
    const c = (PD.S.prefs && PD.S.prefs.games) || {};
    win = PD.float.create({ id: 'games', title: PD.ic('game', 15) + ' ' + PD.esc(PD.t('games.title')), titleText: PD.t('games.title'), x: c.x, y: c.y, onClose: () => { hub.stop(); win = null; PD.emit('games', false); } });
    win.el.tabIndex = -1; win.el.addEventListener('keydown', (e) => {
      if (!cur) return; if (e.key === 'p' || e.key === 'P' || (e.key === ' ' && cur.key2 !== 'blocks')) { e.preventDefault(); if (paused) hub.resume(); else hub.pause(false); return; }
      if (!paused) cur.key(e);
    });
    hub.pick(); const host = win.el.parentNode; const cw = PD.float.get('calc'); win.place(c.x != null ? c.x : host.clientWidth - win.el.offsetWidth - 16 - (cw ? cw.el.offsetWidth + 12 : 0), c.y != null ? c.y : 70); PD.emit('games', true); return win;
  };
  hub.close = () => { if (win) win.close(); };
  hub.toggle = () => { if (win) win.close(); else hub.open(); };
  hub.isOpen = () => !!win; hub.isPaused = () => paused; hub.hasTimer = () => timer !== null; hub.current = () => cur;
  /* auto-pause hooks */
  root.addEventListener('blur', () => hub.pause(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) hub.pause(true); });
  PD.on('modal', (n) => { if (n > 0) hub.pause(true); });
  PD.on('locked', () => { hub.pause(true); });
  PD.games = hub;
})(typeof window !== 'undefined' ? window : globalThis);

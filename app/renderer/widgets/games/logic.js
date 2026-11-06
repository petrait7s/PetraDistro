/* Pure game logic for the four games. No DOM, no timers: the UI drives these. All randomness comes from an injected rng() in [0,1). */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else { const PD = (root.PD = root.PD || {}); PD.GameLogic = factory(); } })(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const pick = (arr, rng) => arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];

  /* ---------------- 2048 ---------------- */
  const g2048 = {
    empty: () => [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    spawn(b, rng) { const free = []; b.forEach((r, y) => r.forEach((v, x) => { if (!v) free.push([x, y]); })); if (!free.length) return false; const [x, y] = pick(free, rng); b[y][x] = rng() < 0.9 ? 2 : 4; return true; },
    newGame(rng) { const b = g2048.empty(); g2048.spawn(b, rng); g2048.spawn(b, rng); return { board: b, score: 0, won: false, over: false, moves: 0 }; },
    slide(line) { const t = line.filter(Boolean); const out = []; let gained = 0; for (let i = 0; i < t.length; i++) { if (t[i] === t[i + 1]) { out.push(t[i] * 2); gained += t[i] * 2; i++; } else out.push(t[i]); } while (out.length < 4) out.push(0); return { line: out, gained }; },
    /* dir: 'left'|'right'|'up'|'down' */
    move(b, dir) {
      const nb = g2048.empty(); let gained = 0; let moved = false;
      for (let i = 0; i < 4; i++) {
        let line = [];
        for (let j = 0; j < 4; j++) { line.push(dir === 'left' ? b[i][j] : dir === 'right' ? b[i][3 - j] : dir === 'up' ? b[j][i] : b[3 - j][i]); }
        const r = g2048.slide(line); gained += r.gained;
        for (let j = 0; j < 4; j++) { const v = r.line[j]; if (dir === 'left') nb[i][j] = v; else if (dir === 'right') nb[i][3 - j] = v; else if (dir === 'up') nb[j][i] = v; else nb[3 - j][i] = v; }
      }
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (nb[y][x] !== b[y][x]) moved = true;
      return { board: nb, gained, moved };
    },
    canMove(b) { return ['left', 'right', 'up', 'down'].some((d) => g2048.move(b, d).moved); },
    step(s, dir, rng) {
      if (s.over) return s; const r = g2048.move(s.board, dir); if (!r.moved) return s;
      g2048.spawn(r.board, rng); const won = s.won || r.board.some((row) => row.some((v) => v >= 2048));
      return { board: r.board, score: s.score + r.gained, won, over: !g2048.canMove(r.board), moves: s.moves + 1 };
    }
  };

  /* ---------------- Snake ---------------- */
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const snake = {
    newGame(o, rng) {
      const w = (o && o.w) || 20, h = (o && o.h) || 20, wrap = !!(o && o.wrap); const cy = Math.floor(h / 2), cx = Math.floor(w / 2);
      const s = { w, h, wrap, body: [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }], dir: 'right', queued: null, food: null, score: 0, alive: true, won: false };
      s.food = snake.placeFood(s, rng); return s;
    },
    placeFood(s, rng) { const taken = new Set(s.body.map((p) => p.x + ',' + p.y)); const free = []; for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (!taken.has(x + ',' + y)) free.push({ x, y }); return free.length ? pick(free, rng) : null; },
    turn(s, d) { const cur = s.queued || s.dir; if (!DIRS[d]) return; const a = DIRS[cur], b = DIRS[d]; if (a[0] + b[0] === 0 && a[1] + b[1] === 0) return; s.queued = d; },
    step(s, rng) {
      if (!s.alive) return s; if (s.queued) { s.dir = s.queued; s.queued = null; }
      const [dx, dy] = DIRS[s.dir]; let nx = s.body[0].x + dx, ny = s.body[0].y + dy;
      if (s.wrap) { nx = (nx + s.w) % s.w; ny = (ny + s.h) % s.h; } else if (nx < 0 || ny < 0 || nx >= s.w || ny >= s.h) { s.alive = false; return s; }
      const eat = s.food && nx === s.food.x && ny === s.food.y; const bodyCheck = eat ? s.body : s.body.slice(0, -1);
      if (bodyCheck.some((p) => p.x === nx && p.y === ny)) { s.alive = false; return s; }
      s.body.unshift({ x: nx, y: ny }); if (!eat) s.body.pop(); else { s.score += 1; s.food = snake.placeFood(s, rng); if (!s.food) { s.won = true; s.alive = false; } }
      return s;
    },
    interval: (score) => Math.max(65, 150 - score * 3)
  };

  /* ---------------- Memory match ---------------- */
  const memory = {
    newGame(pairs, rng) { const ids = []; for (let i = 0; i < pairs; i++) ids.push(i, i); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; } return { cards: ids.map((id) => ({ id, up: false, done: false })), open: [], moves: 0, matched: 0, pairs, won: false, busy: false }; },
    /* returns the new state; if two cards are face up and differ, busy=true and the UI must call resolve() after a short delay */
    flip(s, i) {
      const c = s.cards[i]; if (!c || c.up || c.done || s.busy) return s;
      c.up = true; s.open.push(i);
      if (s.open.length === 2) {
        s.moves += 1; const [a, b] = s.open;
        if (s.cards[a].id === s.cards[b].id) { s.cards[a].done = s.cards[b].done = true; s.matched += 1; s.open = []; if (s.matched === s.pairs) s.won = true; } else s.busy = true;
      }
      return s;
    },
    resolve(s) { if (!s.busy) return s; s.open.forEach((i) => { s.cards[i].up = false; }); s.open = []; s.busy = false; return s; },
    /* score: higher is better. fewer moves => more points */
    points: (s) => (s.won ? Math.max(10, s.pairs * 100 - (s.moves - s.pairs) * 10) : 0)
  };

  /* ---------------- Block puzzle ---------------- */
  const SHAPES = {
    I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]]
  };
  const NAMES = Object.keys(SHAPES);
  const blocks = {
    W: 10, H: 20, NAMES,
    cells(p) { let c = SHAPES[p.t].map((q) => q.slice()); const n = p.t === 'I' ? 4 : p.t === 'O' ? 4 : 3; for (let r = 0; r < p.r; r++) c = c.map(([x, y]) => (p.t === 'O' ? [x, y] : [n - 1 - y, x])); return c.map(([x, y]) => [x + p.x, y + p.y]); },
    fits(b, p) { return blocks.cells(p).every(([x, y]) => x >= 0 && x < blocks.W && y < blocks.H && (y < 0 || !b[y][x])); },
    bag(rng) { const a = NAMES.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    newGame(rng) { const s = { board: Array.from({ length: 20 }, () => Array(10).fill(0)), bagq: [], cur: null, next: null, score: 0, lines: 0, level: 1, over: false, rng }; s.next = blocks.draw(s); blocks.spawn(s); return s; },
    draw(s) { if (!s.bagq.length) s.bagq = blocks.bag(s.rng); return s.bagq.pop(); },
    spawn(s) { s.cur = { t: s.next, r: 0, x: 3, y: -1 }; s.next = blocks.draw(s); if (!blocks.fits(s.board, s.cur)) { s.over = true; } },
    tryMove(s, dx, dy) { if (s.over) return false; const p = Object.assign({}, s.cur, { x: s.cur.x + dx, y: s.cur.y + dy }); if (blocks.fits(s.board, p)) { s.cur = p; return true; } return false; },
    rotate(s) { if (s.over) return false; for (const k of [0, -1, 1, -2, 2]) { const p = Object.assign({}, s.cur, { r: (s.cur.r + 1) % 4, x: s.cur.x + k }); if (blocks.fits(s.board, p)) { s.cur = p; return true; } } return false; },
    lock(s) {
      blocks.cells(s.cur).forEach(([x, y]) => { if (y >= 0) s.board[y][x] = s.cur.t; else s.over = true; });
      let n = 0; for (let y = blocks.H - 1; y >= 0; y--) { if (s.board[y].every(Boolean)) { s.board.splice(y, 1); s.board.unshift(Array(10).fill(0)); n++; y++; } }
      if (n) { s.score += [0, 100, 300, 500, 800][n] * s.level; s.lines += n; s.level = 1 + Math.floor(s.lines / 10); }
      if (!s.over) blocks.spawn(s); return n;
    },
    /* one gravity tick: move down, or lock if blocked. returns lines cleared */
    tick(s) { if (s.over) return 0; if (blocks.tryMove(s, 0, 1)) return 0; return blocks.lock(s); },
    hardDrop(s) { if (s.over) return 0; let d = 0; while (blocks.tryMove(s, 0, 1)) d++; s.score += d * 2; return blocks.lock(s); },
    interval: (level) => Math.max(90, 800 - (level - 1) * 70)
  };
  return { g2048, snake, memory, blocks, DIRS };
});

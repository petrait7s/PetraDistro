/* Calculator engine: exact decimal arithmetic with BigInt (0.1+0.2 = 0.3). Pure logic, no DOM, testable in Node.
   Limits: 12 digits entered, results rounded to 8 decimals (half up), integer part max 12 digits, divide by zero => error state. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else { const PD = (root.PD = root.PD || {}); PD.CalcEngine = factory(); } })(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const MAXD = 12, MAXF = 8, HIST = 20;
  const P10 = (k) => 10n ** BigInt(k);
  const abs = (x) => (x < 0n ? -x : x);
  function parse(str) {
    let s = String(str).trim(); let neg = false; if (s[0] === '-') { neg = true; s = s.slice(1); }
    const [i, f = ''] = s.split('.'); let n = BigInt((i || '0') + f); if (neg) n = -n; return norm({ n, s: f.length });
  }
  function norm(d) { let { n, s } = d; while (s > 0 && n % 10n === 0n) { n /= 10n; s--; } return { n, s }; }
  function roundTo(d, to) { if (d.s <= to) return norm(d); const div = P10(d.s - to); const a = abs(d.n); let q = a / div; if ((a % div) * 2n >= div) q += 1n; return norm({ n: d.n < 0n ? -q : q, s: to }); }
  function align(a, b) { const s = Math.max(a.s, b.s); return [a.n * P10(s - a.s), b.n * P10(s - b.s), s]; }
  const add = (a, b) => { const [x, y, s] = align(a, b); return norm({ n: x + y, s }); };
  const sub = (a, b) => { const [x, y, s] = align(a, b); return norm({ n: x - y, s }); };
  const mul = (a, b) => roundTo({ n: a.n * b.n, s: a.s + b.s }, MAXF);
  function div(a, b) {
    if (b.n === 0n) throw new Error('DIV0');
    const num = a.n * P10(b.s) * P10(MAXF + 2); const den = b.n * P10(a.s); const neg = (num < 0n) !== (den < 0n);
    const an = abs(num), ad = abs(den); let q = an / ad; if ((an % ad) * 2n >= ad) q += 1n;
    return roundTo({ n: neg ? -q : q, s: MAXF + 2 }, MAXF);
  }
  function fmt(d) {
    const neg = d.n < 0n; let digits = abs(d.n).toString(); if (d.s > 0) { digits = digits.padStart(d.s + 1, '0'); digits = digits.slice(0, -d.s) + '.' + digits.slice(-d.s); }
    return (neg ? '-' : '') + digits;
  }
  const intDigits = (d) => abs(d.n).toString().length - d.s;
  const OPS = { '+': add, '-': sub, '*': mul, '/': div };
  const SYM = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  /* evalOp on strings: exported for helper rows */
  function evalOp(a, op, b) { const r = OPS[op](parse(a), parse(b)); if (intDigits(r) > MAXD) throw new Error('OVERFLOW'); return fmt(r); }

  function create(init) {
    init = init || {};
    const st = { entry: '0', fresh: true, acc: null, op: null, last: null, expr: '', err: false, memory: init.memory != null ? String(init.memory) : null, history: (init.history || []).slice(-HIST) };
    const showVal = () => (st.err ? '—' : st.entry);
    function setErr() { st.err = true; st.entry = '0'; st.acc = null; st.op = null; st.last = null; st.expr = ''; st.fresh = true; }
    function commit(res, exprText) { st.entry = res; st.fresh = true; st.expr = exprText; }
    function pushHist(expr, result) { st.history.push({ expr, result }); if (st.history.length > HIST) st.history.shift(); }
    function compute(a, op, b) { try { return evalOp(a, op, b); } catch (e) { return null; } }
    function pressDigit(k) {
      if (st.err) { st.err = false; st.entry = '0'; st.fresh = true; }
      if (st.fresh) { st.entry = k === '.' ? '0.' : k; st.fresh = false; if (st.op === null && st.expr && st.last === null) st.expr = ''; return; }
      if (k === '.') { if (!st.entry.includes('.')) st.entry += '.'; return; }
      const dg = st.entry.replace('-', '').replace('.', '').length; if (dg >= MAXD) return;
      st.entry = st.entry === '0' ? k : st.entry === '-0' ? '-' + k : st.entry + k;
    }
    function pressOp(op) {
      if (st.err) return;
      if (st.op !== null && !st.fresh) { const r = compute(st.acc, st.op, st.entry); if (r === null) { setErr(); return; } st.acc = r; st.entry = r; } else if (st.op === null) st.acc = st.entry;
      st.op = op; st.fresh = true; st.last = null; st.expr = st.acc + ' ' + SYM[op];
    }
    function pressEq() {
      if (st.err) return;
      if (st.op !== null) {
        const b = st.entry; const r = compute(st.acc, st.op, b);
        if (r === null) { setErr(); return; }
        const ex = st.acc + ' ' + SYM[st.op] + ' ' + b; pushHist(ex, r); st.last = { op: st.op, b }; st.acc = null; st.op = null; commit(r, ex + ' =');
      } else if (st.last) {
        const r = compute(st.entry, st.last.op, st.last.b); if (r === null) { setErr(); return; }
        const ex = st.entry + ' ' + SYM[st.last.op] + ' ' + st.last.b; pushHist(ex, r); commit(r, ex + ' =');
      }
    }
    /* percent: with + or -: b = acc * b / 100 (percent of the left number); with * or /: b = b / 100; alone: x / 100 */
    function pressPct() {
      if (st.err) return;
      let r;
      if (st.op === '+' || st.op === '-') r = compute(compute(st.acc, '*', st.entry) || '0', '/', '100');
      else r = compute(st.entry, '/', '100');
      if (r === null) { setErr(); return; } st.entry = r; st.fresh = false;
    }
    function press(k) {
      if (/^[0-9.]$/.test(k)) return pressDigit(k);
      if (k === '+' || k === '-' || k === '*' || k === '/') return pressOp(k);
      if (k === '=' || k === 'Enter') return pressEq();
      if (k === '%') return pressPct();
      if (k === 'neg') { if (st.err) return; if (st.fresh && st.op !== null) { st.entry = '-0'; st.fresh = false; return; } st.entry = st.entry.startsWith('-') ? st.entry.slice(1) : st.entry === '0' ? '0' : '-' + st.entry; if (st.fresh) { st.fresh = true; } return; }
      if (k === 'back') { if (st.err) { st.err = false; return; } if (st.fresh) return; st.entry = st.entry.length > 1 ? st.entry.slice(0, -1) : '0'; if (st.entry === '-') st.entry = '0'; return; }
      if (k === 'CE') { st.err = false; st.entry = '0'; st.fresh = st.op !== null; return; }
      if (k === 'C') { st.err = false; st.entry = '0'; st.fresh = true; st.acc = null; st.op = null; st.last = null; st.expr = ''; return; }
      if (k === 'MC') { st.memory = null; return; }
      if (k === 'MR') { if (st.memory != null) { st.entry = st.memory; st.fresh = false; st.err = false; } return; }
      if (k === 'M+' || k === 'M-') { if (st.err) return; const r = compute(st.memory == null ? '0' : st.memory, k === 'M+' ? '+' : '-', st.entry); if (r !== null) { st.memory = r; st.fresh = true; } return; }
    }
    return {
      press, state: st, display: showVal, expr: () => st.expr, isErr: () => st.err, memory: () => st.memory, history: () => st.history.slice(),
      setEntry(v) { st.err = false; st.entry = String(v); st.fresh = false; }, clearHistory() { st.history = []; },
      snapshot: () => ({ history: st.history.slice(), memory: st.memory })
    };
  }
  return { create, evalOp, parse, fmt, MAXD, MAXF, HIST };
});

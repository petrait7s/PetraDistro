const E = require('../widgets/calc-engine.js');
module.exports = async (t) => {
  const run = (ks) => { const c = E.create(); ks.split(' ').forEach((k) => c.press(k)); return c.display(); };
  t.eq(run('0 . 1 + 0 . 2 ='), '0.3', '0.1+0.2');
  t.eq(run('1 / 3 ='), '0.33333333'); t.eq(run('2 / 3 ='), '0.66666667');
  t.eq(run('1 0 / 4 ='), '2.5'); t.eq(run('1 2 3 4 5 6 * 1 0 0 0 0 0 ='), '12345600000');
  t.eq(run('5 / 0 ='), '—', 'divide by zero'); t.eq(run('9 9 9 9 9 9 9 9 9 9 9 9 * 9 ='), '—', 'overflow is an error');
  t.eq(run('2 0 0 + 1 0 % ='), '220', '+ percent of left'); t.eq(run('2 0 0 - 1 0 % ='), '180'); t.eq(run('2 0 0 * 1 0 % ='), '20', '* percent is /100'); t.eq(run('2 0 0 / 5 0 % ='), '400');
  t.eq(run('5 0 %'), '0.5'); t.eq(run('7 - 2 = = ='), '1', 'repeat equals'); t.eq(run('1 2 + 3 neg ='), '9');
  t.eq(run('1 + 2 + 3 ='), '6', 'chaining'); t.eq(run('1 0 - 3 * 2 ='), '14', 'left to right like a desk calculator');
  t.eq(run('0 . 0 0 0 0 0 0 0 1 * 0 . 1 ='), '0', 'rounds to 8 decimals');
  t.eq(run('1 2 3 back back'), '1'); t.eq(run('1 2 3 C'), '0'); t.eq(run('5 + 3 CE 4 ='), '9');
  let c = E.create(); '1 2 M+ C 5 M+ C MR'.split(' ').forEach((k) => c.press(k)); t.eq(c.display(), '17', 'memory add'); c.press('MC'); c.press('C'); c.press('MR'); t.eq(c.display(), '0', 'MC clears');
  c = E.create(); '5 / 0 = 7'.split(' ').forEach((k) => c.press(k)); t.eq(c.display(), '7', 'digit after error clears it');
  c = E.create(); for (let i = 0; i < 25; i++) c.press('1'); t.eq(c.display().length, 12, '12 digit limit');
  c = E.create(); for (let i = 0; i < 25; i++) { c.press('1'); c.press('+'); c.press('2'); c.press('='); } t.ok(c.history().length === 20, 'history capped at 20');
  t.eq(E.evalOp('1.10', '+', '2.20'), '3.3'); t.eq(E.evalOp('100', '*', '12.5'), '1250'); t.eq(E.evalOp('3', '-', '5'), '-2');
  c = E.create(); '. 5 + . 5 ='.split(' ').forEach((k) => c.press(k)); t.eq(c.display(), '1', 'leading dot'); c = E.create(); '2 . . 5'.split(' ').forEach((k) => c.press(k)); t.eq(c.display(), '2.5', 'double dot ignored');
};

const fs = require('fs'); const path = require('path'); const vm = require('vm');
module.exports = async (t) => {
  const PD = { lang: () => 'en' }; const ctx = { window: undefined, globalThis: null }; ctx.globalThis = ctx;
  vm.createContext(ctx); ctx.PD = PD;
  const load = (f) => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx);
  ctx.PD = undefined; vm.runInContext('var PD = {lang: () => "en"};', ctx);
  load('i18n/i18n.js'); load('i18n/en.js'); load('i18n/bn.js');
  const d = vm.runInContext('PD.i18n.dict', ctx); const en = Object.keys(d.en), bn = Object.keys(d.bn);
  t.eq(en.filter((k) => !(k in d.bn)), [], 'keys missing in bn'); t.eq(bn.filter((k) => !(k in d.en)), [], 'keys missing in en');
  t.ok(en.length > 200, 'key count ' + en.length);
  t.eq(en.filter((k) => !String(d.en[k]).trim() || !String(d.bn[k] || '').trim()), [], 'empty strings');
  const ph = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(',');
  t.eq(en.filter((k) => ph(d.en[k]) !== ph(d.bn[k])), [], 'placeholder mismatch');
  // every key used in source exists
  const src = []; const walk = (p) => fs.readdirSync(p, { withFileTypes: true }).forEach((e) => { const f = path.join(p, e.name); if (e.isDirectory()) { if (!['tests', 'fonts', 'i18n', 'assets'].includes(e.name)) walk(f); } else if (e.name.endsWith('.js')) src.push(fs.readFileSync(f, 'utf8')); });
  walk(path.join(__dirname, '..')); const all = src.join('\n'); const used = new Set();
  for (const m of all.matchAll(/PD\.t\(\s*'([\w.]+)'/g)) used.add(m[1]);
  for (const m of all.matchAll(/PD\.t\(\s*'((?:games|nav|theme|role|err)\.)'\s*\+/g)) used.add(m[1] + '*');
  // keys registered at runtime via PD.i18n.pairs({...}) in views/widgets
  const defined = new Set(Object.keys(d.en));
  for (const m of all.matchAll(/PD\.i18n\.pairs\(\{/g)) {
    let i = m.index + m[0].length, depth = 1, q = null;
    for (; i < all.length && depth > 0; i++) { const c = all[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; } else if (c === "'" || c === '"' || c === '`') q = c; else if (c === '{') depth++; else if (c === '}') depth--; }
    for (const km of all.slice(m.index, i).matchAll(/'([\w.]+)'\s*:\s*\[/g)) defined.add(km[1]);
  }
  t.eq([...used].filter((k) => !k.endsWith('*') && !k.endsWith('.') && !defined.has(k)), [], 'keys used but undefined');
  for (const k of ['games.2048', 'games.snake', 'games.memory', 'games.blocks', 'games.2048.how', 'games.snake.how', 'games.memory.how', 'games.blocks.how']) t.ok(k in d.en, k);
  t.eq(Object.keys(d.en).filter((k) => /^nav\.[a-z]+$/.test(k)).length >= 13, true, 'nav keys');
};

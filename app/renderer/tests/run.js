/* Tiny test runner: runs every *.test.js in this folder, each exports async function(t). */
const fs = require('fs'); const path = require('path');
let pass = 0, fail = 0; const failures = [];
const t = {
  eq(a, b, msg) { const x = JSON.stringify(a), y = JSON.stringify(b); if (x === y) pass++; else { fail++; failures.push((msg || 'eq') + ': got ' + x + ' expected ' + y); } },
  ok(v, msg) { if (v) pass++; else { fail++; failures.push('not ok: ' + (msg || '')); } },
  group(n) { process.stdout.write('\n' + n + '\n'); }
};
(async () => {
  const only = process.argv[2];
  for (const f of fs.readdirSync(__dirname).filter((x) => x.endsWith('.test.js')).sort()) {
    if (only && !f.includes(only)) continue;
    t.group(f);
    try { await require(path.join(__dirname, f))(t); } catch (e) { fail++; failures.push(f + ' threw: ' + (e && e.stack || e)); }
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed'); failures.forEach((x) => console.log(' - ' + x)); process.exit(fail ? 1 : 0);
})();

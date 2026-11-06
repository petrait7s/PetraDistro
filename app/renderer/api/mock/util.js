/* Mock helpers: exact integer math, qty objects, hashing, seeded random, dates. Mirrors contract section 4. No floats for money. */
(function (root) {
  'use strict';
  const PD = (root.PD = root.PD || {});
  const B = BigInt;
  /* round_half_up(a*b/d) for non-negative or negative a, positive d */
  const mulDiv = (a, b, d) => { const n = B(a) * B(b); const dd = B(d); const neg = n < 0n; const an = neg ? -n : n; let q = an / dd; if ((an % dd) * 2n >= dd) q += 1n; return Number(neg ? -q : q); };
  const rdiv = (n, d) => mulDiv(n, 1, d);
  /* decimal string kg (max 3 decimals) -> integer grams, never via float */
  function kgToGrams(s) { const m = /^(\d+)(?:\.(\d{1,3}))?$/.exec(String(s).trim()); if (!m) return null; return Number(m[1]) * 1000 + Number(((m[2] || '') + '000').slice(0, 3)); }
  function gramsToKg(g) { const neg = g < 0; g = Math.abs(g); return (neg ? '-' : '') + Math.floor(g / 1000) + '.' + String(g % 1000).padStart(3, '0'); }
  const isInt = (x) => typeof x === 'number' && Number.isInteger(x);

  /* product -> base qty from QtyIn; returns null when invalid */
  function toBase(p, q) {
    q = q || {};
    if (p.sell_mode === 'by_kg') { if (q.cartons || q.pcs) return null; if (q.kg == null) return 0; if (typeof q.kg !== 'string') return null; return kgToGrams(q.kg); }
    if (q.kg != null) return null; const c = q.cartons || 0, pc = q.pcs || 0; if (!isInt(c) || !isInt(pc) || c < 0 || pc < 0) return null;
    return c * (p.pcs_per_carton || 1) + pc;
  }
  const unitBase = (p) => (p.sell_mode === 'by_kg' ? 1000 : (p.pcs_per_carton || 1));
  function qtyObj(p, base) {
    const neg = base < 0; const b = Math.abs(base);
    if (p.sell_mode === 'by_kg') { const kg = gramsToKg(b); const t = (neg ? '-' : '') + kg.replace(/\.?0+$/, (m) => (m.includes('.') ? '' : m)) ; const clean = (neg ? '-' : '') + (kg.replace(/0+$/, '').replace(/\.$/, '') || '0'); return { base, unit: 'g', cartons: 0, pcs: 0, kg: (neg ? '-' : '') + kg, text: { bn: clean + ' কেজি', en: clean + ' kg' } };
    }
    const ppc = p.pcs_per_carton || 1; const c = Math.floor(b / ppc), r = b % ppc; const sg = neg ? '-' : '';
    let kg = null; if (p.grams_per_carton) kg = gramsToKg(mulDiv(b, p.grams_per_carton, ppc) * (neg ? -1 : 1));
    const bn = [c ? sg + c + ' কার্টন' : '', r ? (c ? '' : sg) + r + ' পিস' : ''].filter(Boolean).join(' ') || '0 কার্টন';
    const en = [c ? sg + c + ' ctn' : '', r ? (c ? '' : sg) + r + ' pcs' : ''].filter(Boolean).join(' ') || '0 ctn';
    return { base, unit: 'pcs', cartons: neg ? -c : c, pcs: neg ? -r : r, kg, text: { bn, en } };
  }
  /* seeded random */
  function prng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  /* dates */
  const p2 = (n) => String(n).padStart(2, '0');
  const dateOf = (d) => { d = d instanceof Date ? d : new Date(d); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return dateOf(new Date(y, m - 1, d + n)); };
  const daysBetween = (a, b) => { const f = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((f(b) - f(a)) / 86400000); };
  const monthOf = (iso) => iso.slice(0, 7);
  /* sha256 (compact) for the audit hash chain */
  const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  function sha256(str) {
    const enc = new TextEncoder().encode(str); const l = enc.length; const total = (((l + 9 + 63) >> 6) << 6); const buf = new Uint8Array(total); buf.set(enc); buf[l] = 0x80;
    const dv = new DataView(buf.buffer); dv.setUint32(total - 4, (l * 8) >>> 0); dv.setUint32(total - 8, Math.floor((l * 8) / 4294967296));
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]); const w = new Uint32Array(64);
    const rr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < total; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) { const s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3); const s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0; }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) { const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25); const ch = (e & f) ^ (~e & g); const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0; const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22); const mj = (a & b) ^ (a & c) ^ (b & c); const t2 = (S0 + mj) >>> 0; h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0; }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    return Array.from(H).map((x) => x.toString(16).padStart(8, '0')).join('');
  }
  PD.mockUtil = { mulDiv, rdiv, kgToGrams, gramsToKg, toBase, unitBase, qtyObj, prng, dateOf, addDays, daysBetween, monthOf, sha256, isInt };
})(typeof window !== 'undefined' ? window : globalThis);

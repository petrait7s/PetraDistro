'use strict';
/* Built-in MM Traders catalogue. Loaded once, on first setup, when the product table is empty.
   CSV columns: SKU, Name, Company, Value (wholesale price per carton, or per kg for loose tea), Size (carton weight in kg), Original Name. */
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '..', '..', 'seed', 'mm-traders-products.csv');

function packGrams(name) {
  const m = /(\d+(?:\.\d+)?)\s*(kg|g|l|ml)\b/i.exec(name); if (!m) return null;
  const n = parseFloat(m[1]), u = m[2].toLowerCase();
  return u === 'kg' || u === 'l' ? n * 1000 : n;
}
function rows() {
  if (!fs.existsSync(FILE)) return [];
  const lines = fs.readFileSync(FILE, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const head = lines.shift().split(',').map((x) => x.trim());
  return lines.map((l) => { const c = l.split(','); return Object.fromEntries(head.map((h, i) => [h, (c[i] || '').trim()])); });
}
/* -> [{sku,name,original_name,company,sell_mode,list_price,grams_per_carton,pcs_per_carton,is_tea}] */
function catalogue() {
  return rows().filter((r) => r.SKU && r.Name).map((r) => {
    const value = parseFloat(r.Value), size = parseFloat(r.Size);
    const price = value > 0 ? Math.round(value * 100) : null;
    const loose = size === 1 && value > 0 && value < 3000; // loose tea: price is per kg
    const o = { sku: r.SKU, name: r.Name, original_name: r['Original Name'] || null, company: r.Company || null, list_price: price, is_tea: loose };
    if (loose) { o.sell_mode = 'by_kg'; o.grams_per_carton = null; o.pcs_per_carton = null; return o; }
    o.sell_mode = 'carton_pcs'; o.grams_per_carton = size > 0 ? Math.round(size * 1000) : null;
    const g = packGrams(r.Name); const ppc = g && o.grams_per_carton ? o.grams_per_carton / g : null;
    o.pcs_per_carton = ppc && Math.abs(ppc - Math.round(ppc)) < 0.01 && Math.round(ppc) >= 1 ? Math.round(ppc) : null;
    return o;
  });
}
module.exports = { catalogue, FILE };

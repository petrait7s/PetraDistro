'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{Engine}=require('../app/src/services/engine'),{issue}=require('../app/src/core/license'),{ok,boot,product,stocked}=require('./helpers');

test('first setup preinstalls the MM Traders catalogue once',async()=>{
  const e=await Engine.open(null,{licenseSecret:'s',debug:true});
  await ok(e,'license.activate',{code:issue('MMTR','s')});
  await ok(e,'setup.complete',{business:{name:'MM',address:'S',phone:'01'},owner:{name:'O',pin:'1234'},manager:{name:'M',pin:'5678'}});
  await ok(e,'auth.login',{role:'owner',pin:'1234'});
  const l=await ok(e,'products.list',{limit:200});
  assert.equal(l.rows.length,75);
  const m=l.rows.find(r=>r.sku==='MARK-MP-2KG');assert.equal(m.pcs_per_carton,6);assert.equal(m.list_price,1044000);
  const t=l.rows.find(r=>r.sku==='S-BOP-500G');assert.equal(t.sell_mode,'by_kg');
  assert.ok((await ok(e,'companies.list',{})).rows.some(c=>c.name==='Mark Milk'));
  assert.equal(e.seedCatalog(),0);
});

test('purchase sets pcs per carton, wholesale and retail price without edit mode',async()=>{
  const e=await boot();const p=await product(e,{pcs_per_carton:null,list_price:0,cost_price:null});
  await ok(e,'editmode.disable',{});
  const r=await e.call('purchases.create',{company_id:p.company_id,date:'2026-11-06',lines:[{product_id:p.id,qty:{cartons:3},unit_cost:120000}]});
  assert.equal(r.ok,false);assert.equal(r.code,'STATE');
  await ok(e,'purchases.create',{company_id:p.company_id,date:'2026-11-06',lines:[{product_id:p.id,qty:{cartons:3,pcs:2},unit_cost:120000,pcs_per_carton:12,sell_price:130000,retail_price:140000}]});
  const g=(await ok(e,'products.get',{id:p.id})).product;
  assert.equal(g.pcs_per_carton,12);assert.equal(g.list_price,130000);assert.equal(g.retail_price,140000);assert.equal(g.cost_price,120000);assert.equal(g.stock.base,38);
  const x=await e.call('purchases.create',{company_id:p.company_id,date:'2026-11-06',lines:[{product_id:p.id,qty:{cartons:1},unit_cost:120000,pcs_per_carton:24}]});
  assert.equal(x.code,'STATE');
});

test('retail price type and van invoices',async()=>{
  const e=await boot();const p=await stocked(e,{retail_price:1100000});const q=await stocked(e);
  const c=await ok(e,'customers.save',{name:'Rahim',area:'A'});const cid=c.customer?c.customer.id:c.id;
  const s=await ok(e,'sales.create',{customer_id:cid,van_id:1,price_type:'retail',lines:[{product_id:p.id,qty:{cartons:1},discount:{type:'none',value:0}}]});
  assert.equal(s.sale.totals.subtotal,1100000);
  const bad=await e.call('sales.create',{customer_id:cid,price_type:'retail',lines:[{product_id:q.id,qty:{cartons:1},discount:{type:'none',value:0}}]});
  assert.equal(bad.code,'STATE');
  await ok(e,'sales.create',{customer_id:cid,lines:[{product_id:q.id,qty:{cartons:1},discount:{type:'none',value:0}}]});
  assert.equal((await ok(e,'sales.list',{van:true})).rows.length,1);
  assert.equal((await ok(e,'sales.list',{van:false})).rows.length,1);
  await ok(e,'loadsheet.setLoaded',{date:'2026-11-06',van_id:1,lines:[{product_id:p.id,loaded:{cartons:5}}]});
  const ls=await ok(e,'loadsheet.get',{date:'2026-11-06',van_id:1});
  assert.equal(ls.lines[0].sold.cartons,1);assert.equal(ls.lines[0].expected.cartons,4);
  assert.equal((await ok(e,'loadsheet.list',{})).rows[0].sales_count,1);
});

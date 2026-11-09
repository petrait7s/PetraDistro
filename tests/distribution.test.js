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
  await ok(e,'loadsheet.setLoaded',{date:'2026-11-06',van_id:1,lines:[{product_id:p.id,loaded:{cartons:2}}]});
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

test('fixed owner license code: only the hash is needed, dashes and case ignored',async()=>{
  const {codeHash}=require('../app/src/core/license');
  const e=await Engine.open(null,{licenseSecret:null,licenseCodeHash:codeHash('PETRA-SOFT-SHU7S-TAN'),debug:true});
  assert.equal((await e.call('license.activate',{code:'PETRA-SOFT-SHU7S-TAX'})).code,'LICENSE');
  assert.equal((await e.call('license.activate',{code:issue('MMTR','x')})).code,'LICENSE');
  await ok(e,'license.activate',{code:'petra soft shu7s tan'});
  await ok(e,'setup.complete',{seed_products:false,business:{name:'MM',address:'S',phone:'01'},owner:{name:'O',pin:'1234'},manager:{name:'M',pin:'5678'}});
  await ok(e,'auth.resetPin',{license_code:'PETRA-SOFT-SHU7S-TAN',new_pin:'9999'});
  await ok(e,'auth.login',{role:'owner',pin:'9999'});
});

test('manager full access (default): products, stock, purchases without PIN; owner-only admin stays owner-only',async()=>{
  const e=await boot(null,{managerFull:true});const p=await product(e,{pcs_per_carton:12,cost_price:100000});
  await ok(e,'editmode.disable',{});await ok(e,'auth.logout',{});await ok(e,'auth.login',{role:'manager',pin:'5678'});
  const g=(await ok(e,'products.get',{id:p.id})).product;assert.equal(g.cost_price,100000);
  await ok(e,'products.save',{id:p.id,sku:g.sku,name:g.name+' X',sell_mode:g.sell_mode,pcs_per_carton:12,list_price:150000,cost_price:100000,max_discount:{per_unit:0}});
  await ok(e,'stock.adjust',{product_id:p.id,delta:{cartons:2},sign:'plus',reason:'count',received_date:'2026-11-01'});
  await ok(e,'purchases.create',{company_id:p.company_id,date:'2026-11-05',lines:[{product_id:p.id,qty:{cartons:1},unit_cost:100000}]});
  assert.equal((await ok(e,'products.get',{id:p.id})).product.stock.base,36);
  for(const [m,a] of [['settings.set',{patch:{'business.name':'X'}}],['users.setPin',{user_id:1,new_pin:'0000'}],['backup.create',{}]]){const r=await e.call(m,a);assert.equal(r.code,'FORBIDDEN',m);}
});

test('van stock is separate: load moves stock off the godown, van sales need a load, count writes off shortage, cash tally',async()=>{
  const e=await boot();const p=await stocked(e,{retail_price:1100000});
  const c=await ok(e,'customers.save',{name:'Karim',area:'B'});const cid=c.customer?c.customer.id:c.id;
  const D='2026-11-06',line=n=>({product_id:p.id,qty:{cartons:n},discount:{type:'none',value:0}});
  const total=(await ok(e,'products.get',{id:p.id})).product.stock.cartons;
  assert.ok(total>=5);
  assert.equal((await e.call('sales.create',{customer_id:cid,van_id:1,lines:[line(1)]})).code,'STOCK');
  assert.equal((await e.call('loadsheet.setLoaded',{date:D,van_id:1,lines:[{product_id:p.id,loaded:{cartons:total+1}}]})).code,'STOCK');
  await ok(e,'loadsheet.setLoaded',{date:D,van_id:1,lines:[{product_id:p.id,loaded:{cartons:total-1}}]});
  assert.equal((await ok(e,'products.get',{id:p.id})).product.van_stock.cartons,total-1);
  assert.equal((await e.call('sales.create',{customer_id:cid,lines:[line(2)]})).code,'STOCK');
  await ok(e,'sales.create',{customer_id:cid,lines:[line(1)]});
  await ok(e,'sales.create',{customer_id:cid,van_id:1,lines:[line(total-1)],payment:{amount:1000000,method:'cash'}});
  assert.equal((await e.call('sales.create',{customer_id:cid,van_id:1,lines:[line(1)]})).code,'STOCK');
  const g=await ok(e,'loadsheet.get',{date:D,van_id:1});
  assert.equal(g.lines[0].expected.cartons,0);assert.equal(g.cash.collected,1000000);assert.equal(g.cash.invoices,1);
  const r=await ok(e,'loadsheet.submit',{date:D,van_id:1,counted:[{product_id:p.id,counted:{cartons:0}}],cash_handed:900000});
  assert.equal(r.cash.diff,-100000);assert.equal(r.flagged,true);
  const done=await ok(e,'loadsheet.get',{date:D,van_id:1});assert.equal(done.submitted,true);assert.equal(done.cash.handed,900000);assert.equal(done.cash.diff,-100000);
  const old=e.db.get('SELECT * FROM load_sheets WHERE date=?',[D]);const sn=JSON.parse(old.snapshot);delete sn.cash;delete sn.wo;e.db.run('UPDATE load_sheets SET snapshot=? WHERE id=?',[JSON.stringify(sn),old.id]);
  const legacy=await ok(e,'loadsheet.get',{date:D,van_id:1});assert.equal(legacy.cash.handed,null);
  assert.equal((await ok(e,'loadsheet.list',{})).rows.length,1);
});

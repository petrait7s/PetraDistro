const path=require('path'),{JSDOM,VirtualConsole}=require(require.resolve('jsdom',{paths:[require('path').join(__dirname,'..','app')]}));
const B=path.join(__dirname,'..')+'/';
const {Engine}=require(B+'app/src/services/engine'),{issue}=require(B+'app/src/core/license'),{legacyAdapter}=require(B+'app/src/transport/compat');
const wait=(ms)=>new Promise(r=>setTimeout(r,ms||20));
(async()=>{
 const e=await Engine.open(null,{licenseSecret:'s3',debug:true}); const call=legacyAdapter(e);
 const D=async(m,a)=>{const r=await call(m,a);if(!r.ok)throw new Error(m+' '+r.code+' '+r.message+JSON.stringify(r.details||'').slice(0,300));return r.data;};
 await D('license.activate',{code:issue('MMTR','s3')});
 await D('setup.complete',{business:{name:'MM Traders',address:'Sylhet',phone:'017'},owner:{name:'Vir',pin:'1234'},manager:{name:'Rafi',pin:'5678'}});
 await D('auth.login',{role:'owner',pin:'1234'});
 await D('editmode.enable',{owner_pin:'1234'});const co=await D('companies.save',{name:'Acme'});
 const p=await D('products.save',{sku:'S1',name:'Biscuit',company_id:co.id,sell_mode:'carton_pcs',pcs_per_carton:24,list_price:1058400,cost_price:994896,max_discount:{per_unit:12000}});
 await D('stock.adjust',{product_id:p.id,delta:{cartons:100},sign:'plus',reason:'Opening'});
 const cu=await D('customers.save',{name:'Karim Store',phone:'017',address:'Sylhet',credit_limit:5000000});global.CID=cu.id;
 await D('auth.logout',{});await D('auth.login',{role:'owner',pin:'1234'});
 const ap=await D('auth.requestApproval',{owner_pin:'1234',scope:'x',operation:'sales.create',payload:{customer_id:cu.id,lines:[{product_id:p.id,qty:{cartons:2}}]}});const sl=await D('sales.create',{customer_id:cu.id,lines:[{product_id:p.id,qty:{cartons:2}}],payment:{amount:300000,method:'cash'}});await D('auth.logout',{});global.SID=sl.sale.id;global.CID=cu.id;
 const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',x=>errors.push(String(x&&x.message||x)));
 const dom=await JSDOM.fromFile(path.join(B,'app/renderer/index.html'),{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.api={call:async(m,a)=>{const r=await call(m,a||{});if(!r.ok&&!['NEEDS_OWNER_PIN','UNAUTHENTICATED'].includes(r.code))console.log('  FAIL',m,r.code,r.message.slice(0,90),JSON.stringify(a||{}).slice(0,120));return r;},on:()=>()=>{}};const g=new Proxy({}, {get:(t,k)=>k==='measureText'?(s)=>({width:String(s).length*7}):()=>{},set:()=>true});w.HTMLCanvasElement.prototype.getContext=()=>g;}});
 await new Promise(r=>dom.window.addEventListener('load',r));await wait(150);
 const w=dom.window,PD=w.PD;console.log('isMock',PD.isMock);
 const views=['dashboard','sales','payments','returns','loadsheet','cash','inventory','lots','purchases','customers','expenses','commission','audit','settings'];
 for(const role of ['owner','manager']){
  await call('auth.logout',{});const env=await call('auth.login',{role,pin:role==='owner'?'1234':'5678'});console.log('login',role,env.ok,env.code||'');
  if(env.ok)await PD.session.start(env.data);
  for(const v of views){if(role==='manager'&&['commission','audit','purchases'].includes(v))continue;PD.S.view=v;try{PD.refreshApp();}catch(x){console.log('ERR',v,x.message)}await wait(250);
   const el=w.document.querySelector('#view');const txt=(el&&el.textContent||'').trim();const bad=w.document.querySelector('#view .err, #view .bad');
   console.log(role,v,txt.length,bad?('BAD:'+bad.textContent.slice(0,120)):'');}
 }
 
 await call('auth.logout',{});const env=await call('auth.login',{role:'owner',pin:'1234'});await PD.session.start(env.data);
 const tryit=async(n,f)=>{try{await f();await wait(300);console.log('ok',n,(w.document.querySelector('.modal,.md')||{textContent:''}).textContent.slice(0,60).replace(/\s+/g,' '));}catch(x){console.log('ERR',n,x.message)}; w.document.querySelectorAll('.modal-x,.md .close,[data-close]').forEach(b=>b.click());};
 await tryit('saleDetail',()=>PD.saleDetail(global.SID));
 await tryit('customerForm',()=>PD.customerForm&&PD.customerForm());
 await tryit('receive',()=>PD.receiveFor&&PD.receiveFor({id:global.CID,name:'Karim Store'}));
 await tryit('statement',()=>PD.openStatement&&PD.openStatement(global.CID));
 console.log('missing i18n',[...new Set(PD.i18n.missing)].join(','));console.log('errors',errors.slice(0,5));
 process.exit(0);
})().catch(x=>{console.log('FATAL',x.stack);process.exit(1)});

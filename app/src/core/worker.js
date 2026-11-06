'use strict';
const {parentPort,workerData}=require('node:worker_threads');
const {Engine}=require('../services/engine'),{legacyAdapter}=require('../transport/compat');
let engine,call,queue=Promise.resolve();
const fs=require('node:fs'),path=require('node:path');
function safeName(n){return String(n||'file').replace(/[^\w.\- ]+/g,'_').slice(0,80)||'file';}
function uniquePath(dir,name){fs.mkdirSync(dir,{recursive:true});const ext=path.extname(name),base=path.basename(name,ext);let p=path.join(dir,base+ext);for(let i=1;fs.existsSync(p);i++)p=path.join(dir,base+'-'+i+ext);return p;}
function saveFile(a){return uniquePath(workerData.filesDir,safeName(a.suggested_name));}
const flat=(v)=>v==null?'':typeof v==='object'?(v.text?(v.text.en||''):JSON.stringify(v)):v;
async function exportTable(a){
 const lists={products:'products.list',customers:'customers.list',sales:'sales.list',payments:'payments.list',audit:'audit.list',lots:'lots.list'};
 const method=lists[a.table];if(!method)return {ok:false,code:'VALIDATION',message:'Unknown table'};
 const rows=[];let cursor;
 for(let i=0;i<500;i++){const r=await call(method,{limit:500,...(cursor?{cursor}:{}),...((a.filters&&typeof a.filters==='object')?a.filters:{})});if(!r.ok)return r;rows.push(...(r.data.rows||[]));cursor=r.data.page&&r.data.page.next_cursor;if(!cursor)break;}
 const cols=[];rows.forEach(r=>Object.keys(r).forEach(k=>{if(!cols.includes(k))cols.push(k);}));
 const name=a.table+'-'+new Date().toISOString().slice(0,10)+'.'+a.format,file=uniquePath(workerData.filesDir,name);
 if(a.format==='csv'){const q=(v)=>{v=String(flat(v));if(/^[=+\-@\t\r]/.test(v))v="'"+v;return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  fs.writeFileSync(file,'\ufeff'+[cols.map(q).join(',')].concat(rows.map(r=>cols.map(c=>q(r[c])).join(','))).join('\r\n'),{mode:0o600});}
 else{const ExcelJS=require('exceljs'),wb=new ExcelJS.Workbook(),ws=wb.addWorksheet(a.table);ws.addRow(cols);rows.forEach(r=>ws.addRow(cols.map(c=>{const v=flat(r[c]);return typeof v==='string'&&/^[=+\-@]/.test(v)?"'"+v:v;})));await wb.xlsx.writeFile(file);}
 return {ok:true,data:{saved_to:file}};
}
const ready=Engine.open(workerData.file,{licenseSecret:workerData.licenseSecret,backupDir:workerData.backupDir,saveFile}).then(e=>{engine=e;call=legacyAdapter(e);});
parentPort.on('message',m=>{queue=queue.then(async()=>{await ready;let result;if(m.control==='close'){try{engine.backup('quit');}catch{}engine.close();result={ok:true,data:null};}else if(m.control==='handle'){if(!engine.owner()||engine.session.locked)result={ok:false,code:'FORBIDDEN',message:'Owner required'};else{const handle=require('node:crypto').randomUUID();engine.handles.set(handle,{path:m.path,kind:m.kind,user:engine.user().id});result={ok:true,data:{handle,name:require('node:path').basename(m.path),bytes:require('node:fs').statSync(m.path).size}};}}else if(m.control==='resolve'){const h=engine.handles.get(String(m.handle));result=h&&h.kind==='saved'&&engine.user()&&h.user===engine.user().id?{ok:true,data:{path:h.path}}:{ok:false,code:'NOT_FOUND',message:'File not found'};}else if(m.method==='export.table')result=await exportTable(m.args||{});else result=await call(m.method,m.args);parentPort.postMessage({id:m.id,result});}).catch(()=>parentPort.postMessage({id:m.id,result:{ok:false,code:'DB',message:'Worker operation failed'}}));});

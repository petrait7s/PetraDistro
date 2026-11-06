'use strict';
// Legacy request compatibility. No renderer-supplied roles, paths, or session tokens.
const Ajv=require('ajv'),formats=require('ajv-formats'),crypto=require('node:crypto'),path=require('node:path'),fs=require('node:fs');
const root=fs.existsSync(path.resolve(__dirname,'../../contract'))?path.resolve(__dirname,'../../contract'):path.resolve(__dirname,'../../../contract');
const spec=require(path.join(root,'methods.json'));const ajv=new Ajv({strict:false});formats(ajv);
const validators=new Map(spec.methods.map(m=>[m.name,ajv.compile({...m.input_schema,$defs:spec.$defs})]));
function legacyAdapter(engine){return async function call(method,args={}){
 args=JSON.parse(JSON.stringify(args??{}));
 if(method==='auth.requestApproval'&&args&&typeof args.operation==='string'&&args.payload&&typeof args.payload==='object'&&typeof args.owner_pin==='string')return engine.call(method,{owner_pin:args.owner_pin,operation:args.operation,payload:args.payload});
 const validate=validators.get(method);if(!validate||!validate(args))return {ok:false,code:'VALIDATION',message:'Invalid method or input'};
 let a=structuredClone(args);
 if(method==='auth.requestApproval')return {ok:false,code:'UNSUPPORTED',message:'Legacy scope-only approvals cannot safely bind a payload; frontend migration required'};
 if(method==='editmode.enable'){
  const approval=await engine.call('auth.requestApproval',{owner_pin:a.owner_pin,operation:method,payload:{}});if(!approval.ok)return approval;
  a={approval:{token:approval.data.token,reason:'Owner enabled edit mode'}};
 }
 if(method.startsWith('loadsheet.')&&a.van!=null){if(!['van1','1'].includes(a.van))return {ok:false,code:'UNSUPPORTED',message:'Only van1 supported'};delete a.van;a.van_id=1;}
 if(/^sales\.(preview|create)$/.test(method)&&a.van!=null){if(!['van1','1'].includes(a.van))return {ok:false,code:'UNSUPPORTED',message:'Only van1 supported'};delete a.van;a.van_id=1;}
 if(method==='files.share')return {ok:false,code:'UNSUPPORTED',message:'Legacy raw-path sharing disabled; handle-based migration required'};
 if(method==='companies.save'&&a.opening_due!=null)return {ok:false,code:'UNSUPPORTED',message:'Use opening.import for immutable opening ledger'};
 const result=await engine.call(method,a);if(result.code==='RATE_LIMIT')result.code='FORBIDDEN';if(result.code==='IDEMPOTENCY_CONFLICT')result.code='STATE';return result;
};}
module.exports={legacyAdapter};

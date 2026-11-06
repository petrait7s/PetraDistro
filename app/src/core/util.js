'use strict';
const crypto=require('node:crypto');
function canonical(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';}
const hash=v=>crypto.createHash('sha256').update(typeof v==='string'?v:canonical(v)).digest('hex');
function fail(code,message,details){throw Object.assign(new Error(message),{code,details});}
const date=ts=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ts));
const pinHash=pin=>{const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(pin,salt,32,{N:32768,maxmem:64*1024*1024}).toString('hex');};
function pinVerify(pin,stored){const [salt,h]=stored.split(':');const b=crypto.scryptSync(pin,salt,32,{N:32768,maxmem:64*1024*1024});return crypto.timingSafeEqual(b,Buffer.from(h,'hex'));}
const payload=a=>Object.fromEntries(Object.entries(a).filter(([k])=>!['approval','request_id'].includes(k)));
module.exports={canonical,hash,fail,date,pinHash,pinVerify,payload};

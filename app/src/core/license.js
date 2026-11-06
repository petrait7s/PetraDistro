'use strict';
/* Two license schemes:
   1. Fixed owner code (release builds): the build stores only a scrypt hash of the code (PETRA_LICENSE_CODE at build time).
      Any spacing/dashes/case are ignored when comparing.
   2. Signed codes PETRA-TAG-RAND-SIGN (development / multi-client): HMAC with PETRA_LICENSE_SECRET. */
const crypto=require('node:crypto');const ABC='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const norm=code=>String(code==null?'':code).toUpperCase().replace(/[^A-Z0-9]/g,'');
const codeHash=code=>crypto.scryptSync(norm(code),'petradms-license-v1',32).toString('hex');
function suffix(tag,r,secret){const b=crypto.createHmac('sha256',secret).update(tag+'-'+r).digest();let n=(b[0]<<12)|(b[1]<<4)|(b[2]>>4);return [15,10,5,0].map(s=>ABC[(n>>s)&31]).join('');}
function issue(tag,secret){if(!/^[0-9A-HJKMNP-TV-Z]{4}$/.test(tag)||!secret)throw Error('Crockford tag and secret required');const r=[...crypto.randomBytes(4)].map(x=>ABC[x&31]).join('');return 'PETRA-'+tag+'-'+r+'-'+suffix(tag,r,secret);}
function signedValid(code,secret){const p=String(code).toUpperCase().split('-');return !!secret&&p.length===4&&p[0]==='PETRA'&&p.slice(1).every(x=>/^[0-9A-HJKMNP-TV-Z]{4}$/.test(x))&&p[3]===suffix(p[1],p[2],secret);}
function fixedValid(code,hash){if(!hash||norm(code).length<8)return false;const a=Buffer.from(codeHash(code),'hex'),b=Buffer.from(String(hash),'hex');return a.length===b.length&&crypto.timingSafeEqual(a,b);}
function valid(code,secret,fixedHash){return fixedValid(code,fixedHash)||signedValid(code,secret);}
module.exports={issue,valid,norm,codeHash};

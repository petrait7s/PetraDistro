'use strict';
const crypto=require('node:crypto');const ABC='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function suffix(tag,r,secret){const b=crypto.createHmac('sha256',secret).update(tag+'-'+r).digest();let n=(b[0]<<12)|(b[1]<<4)|(b[2]>>4);return [15,10,5,0].map(s=>ABC[(n>>s)&31]).join('');}
function issue(tag,secret){if(!/^[0-9A-HJKMNP-TV-Z]{4}$/.test(tag)||!secret)throw Error('Crockford tag and secret required');const r=[...crypto.randomBytes(4)].map(x=>ABC[x&31]).join('');return 'PETRA-'+tag+'-'+r+'-'+suffix(tag,r,secret);}
function valid(code,secret){const p=code.toUpperCase().split('-');return !!secret&&p.length===4&&p[0]==='PETRA'&&p.slice(1).every(x=>/^[0-9A-HJKMNP-TV-Z]{4}$/.test(x))&&p[3]===suffix(p[1],p[2],secret);}
module.exports={issue,valid};

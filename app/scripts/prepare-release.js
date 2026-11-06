'use strict';
// Writes src/build-config.js for a release build. Only a scrypt hash of the fixed license code is stored, never the code itself.
const fs=require('node:fs'),path=require('node:path'),{codeHash,norm}=require('../src/core/license');
const code=process.env.PETRA_LICENSE_CODE,secret=process.env.PETRA_LICENSE_SECRET||null;
if(code&&norm(code).length<8)throw Error('PETRA_LICENSE_CODE must have at least 8 letters/digits');
if(!code&&(!secret||secret.length<32))throw Error('Set PETRA_LICENSE_CODE (fixed owner code) or PETRA_LICENSE_SECRET (32+ characters)');
const root=path.resolve(__dirname,'..');
fs.writeFileSync(path.join(root,'src/build-config.js'),"'use strict';\nmodule.exports="+JSON.stringify({release:true,licenseSecret:code?null:secret,licenseCodeHash:code?codeHash(code):null})+';\n');
fs.cpSync(path.join(root,'../contract'),path.join(root,'contract'),{recursive:true});
console.log(code?'Release: fixed license code (hash only)':'Release: signed license codes');

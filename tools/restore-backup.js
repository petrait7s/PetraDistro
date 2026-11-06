'use strict';
// Manual restore while the app is CLOSED:  node tools/restore-backup.js <backup.pdbak> <data.db>
// Verifies the checksum, keeps a copy of the current database as <data.db>.before-restore, then replaces it.
const fs=require('node:fs'),crypto=require('node:crypto');
const [src,dst]=process.argv.slice(2);if(!src||!dst){console.error('usage: node tools/restore-backup.js <backup.pdbak> <data.db>');process.exit(2);}
const buf=fs.readFileSync(src),nl=buf.indexOf(10);if(nl<0)throw Error('Not a PetraDMS backup');
const header=JSON.parse(buf.subarray(0,nl).toString()),bytes=buf.subarray(nl+1);
if(header.format!=='PetraDMS')throw Error('Not a PetraDMS backup');
const sum=crypto.createHash('sha256').update(bytes.toString('base64')).digest('hex');
if(sum!==header.sha256)throw Error('Checksum mismatch: backup is damaged');
if(fs.existsSync(dst))fs.copyFileSync(dst,dst+'.before-restore');
fs.writeFileSync(dst+'.tmp',bytes,{mode:0o600});fs.renameSync(dst+'.tmp',dst);
console.log('Restored '+header.products+' products, '+header.invoices+' invoices from '+src);

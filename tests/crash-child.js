'use strict';
const {Engine}=require('../app/src/services/engine');
(async()=>{const e=await Engine.open(process.argv[2],{clock:()=>Date.parse('2026-11-06T06:00:00Z'),licenseSecret:'fixture-secret'});await e.call('auth.login',{role:'owner',pin:'1234'});e.db.opts.hook=stage=>{if(stage===process.argv[3])process.kill(process.pid,'SIGKILL');};await e.call('sales.create',{customer_id:7,lines:[{product_id:5,qty:{pcs:1}}]});})().catch(()=>process.exit(2));

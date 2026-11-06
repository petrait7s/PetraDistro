'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const events=new Set(['session.locked','net.status','drive.queue','backup.completed','clock.warning','license.changed','stock.alert']);
const win=Object.freeze({minimize:()=>ipcRenderer.invoke('petra:win','min'),toggleMaximize:()=>ipcRenderer.invoke('petra:win','max'),close:()=>ipcRenderer.invoke('petra:win','close'),state:()=>ipcRenderer.invoke('petra:win','state'),onState:cb=>{if(typeof cb!=='function')throw Error('Invalid callback');const fn=(_e,p)=>cb(p);ipcRenderer.on('petra:win:state',fn);return ()=>ipcRenderer.removeListener('petra:win:state',fn);}});
contextBridge.exposeInMainWorld('api',Object.freeze({win,call:(method,args={})=>ipcRenderer.invoke('petra:call',method,args),on:(name,cb)=>{if(!events.has(name)||typeof cb!=='function')throw Error('Invalid event');const fn=(_e,p)=>cb(p);ipcRenderer.on('petra:event:'+name,fn);return ()=>ipcRenderer.removeListener('petra:event:'+name,fn);}}));

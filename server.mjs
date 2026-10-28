import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import audit from './api/audit.js';
const files = {'/aging.js':['aging.js','text/javascript'], '/':['index.html','text/html'], '/app.js':['app.js','text/javascript'], '/styles.css':['styles.css','text/css']};
createServer(async (req,res)=>{
  const path = new URL(req.url,'http://localhost').pathname;
  if(path === '/api/audit') return audit(req,res);
  const file = files[path];
  if(!file){res.statusCode=404;return res.end('Not found');}
  try {res.setHeader('Content-Type',file[1]+'; charset=utf-8');res.end(await readFile(new URL('./public/'+file[0],import.meta.url)));}
  catch {res.statusCode=500;res.end('Could not load page');}
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));


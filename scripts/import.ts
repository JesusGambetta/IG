import {readFile} from 'node:fs/promises';
import {parse} from 'csv-parse/sync';
import {appendMeasurement} from '../src/core.js';
import {readStore,saveStore} from './store.js';
const file=process.argv[2];
if(!file) throw new Error('Uso: npm run import:csv -- archivo.csv');
const rows=parse(await readFile(file,'utf8'),{columns:true,skip_empty_lines:true,bom:true,trim:true}) as Record<string,string>[];
if(!rows.length) throw new Error('CSV vacío');
const store=await readStore();
for(const r of rows) {
  if(!/^\d+$/.test(r.followers||'') || !['true','false'].includes(r.approximate)) throw new Error('followers debe ser entero y approximate true/false');
  const m={account:r.account.replace(/^@/,''),at:r.observed_at,value:Number(r.followers),approximate:r.approximate==='true',source:'manual' as const,evidence:r.evidence};
  appendMeasurement(store,m);
  store.attempts.push({account:m.account,at:new Date().toISOString(),status:'ok',message:`Carga manual: observación ${m.at}`});
}
await saveStore(store); console.log(`${rows.length} filas validadas. Historial conservado; rankings cerrados inmutables.`);

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ACCOUNTS,DAY,appendMeasurement,closeWeek,finalize,growth,localDate,nextReveal,period,validMeasurement,type Store,type Measurement} from '../src/core.js';
import {normalize,extractCount} from '../scripts/normalize.js';
const s=():Store=>({version:1,initializedAt:'2026-10-19T03:00:00Z',measurements:[],attempts:[],weeks:[]});
const m=(account:string,value:number,at='2026-10-19T02:00:00Z',approximate=false):Measurement=>({account,value,at,approximate,source:'manual',evidence:'TEST FIXTURE — NOT REAL DATA'});
const p=period('2026-10-21T12:00:00Z'),closed=Date.parse(p.close);
test('normaliza enteros, separadores y abreviaturas',()=>{
  for(const [input,value,approximate] of [['12,345',12345,false],['12.345',12345,false],['1.234.567',1234567,false],['12 345',12345,false],['12\u202f345',12345,false],['12.3K',12300,true],['12,3 mil',12300,true],['1.2M',1200000,true],['1,2 millones',1200000,true],['0',0,false],['123 seguidores',123,false]] as const) assert.deepEqual(normalize(input),{value,approximate},input);
});
test('rechaza cifras ambiguas y corruptas',()=>{for(const x of ['1,23','-3','NaN','1e5','123 following','12,34,56','3.000.000.000','2M junk','1,234.567'])assert.equal(normalize(x),null,x);});
test('extrae descripción pública sin confundir seguidos o publicaciones',()=>{
  assert.equal(extractCount('12.3K Followers, 120 Following, 500 Posts')?.value,12300);
  assert.equal(extractCount('12.345 seguidores, 500 seguidos')?.value,12345);
  assert.equal(extractCount('Log in to Instagram'),null);
  assert.equal(extractCount('12.3K followers\n12,345 followers')?.value,12345);
  assert.throws(()=>extractCount('12,345 followers\n12,346 followers'));
});
test('lunes y domingo en Argentina; no depende de TZ del host',()=>{
  assert.equal(localDate('2026-10-19T02:59:59Z'),'2026-10-18');
  assert.equal(p.start,'2026-10-19T03:00:00.000Z');assert.equal(p.close,'2026-10-26T00:00:00.000Z');
  assert.equal(period('2026-10-26T02:59:59Z').id,'2026-10-19');
  assert.equal(period('2026-10-26T03:00:00Z').id,'2026-10-26');
  assert.equal(nextReveal(closed-1),closed);assert.equal(nextReveal(closed),closed+7*DAY);
});
test('no hay revelación antes de las 21; se permite exactamente a las 21',()=>{
  assert.throws(()=>closeWeek(s(),p,closed-1));assert.equal(closeWeek(s(),p,closed).entries.length,0);
  const store=s();finalize(store,closed-1);assert.equal(store.weeks.length,0);finalize(store,closed);assert.equal(store.weeks.length,1);
});
test('crecimiento neto, ranking descendente, empates y crecimiento negativo',()=>{
  const store=s();ACCOUNTS.forEach((a,i)=>store.measurements.push(m(a.id,1000),m(a.id,1000+[100,100,50,0,-10][i],'2026-10-25T23:45:00Z')));
  const w=closeWeek(store,p,closed);assert.deepEqual(w.entries.map(e=>e.growth),[100,100,50,0,-10]);assert.deepEqual(w.entries.map(e=>e.rank),[1,1,3,4,5]);
});
test('faltantes, datos antiguos y aproximaciones no inventan resultados',()=>{
  const store=s();store.measurements.push(m('juanofabiani',100),m('juanofabiani',130,'2026-10-25T23:45:00Z',true));
  assert.equal(closeWeek(store,p,closed).excluded.length,5);
  assert.ok(growth([m('juanofabiani',100,'2026-10-16T00:00:00Z'),m('juanofabiani',130,'2026-10-25T23:45:00Z')],'juanofabiani',Date.parse(p.start),closed).reason);
});
test('cierre demorado excluye mediciones posteriores y congela el resultado',()=>{
  const store=s();store.measurements.push(m('juanofabiani',100),m('juanofabiani',130,'2026-10-25T23:45:00Z'),m('juanofabiani',999,'2026-10-26T00:01:00Z'));
  finalize(store,closed+3600000);assert.equal(store.weeks[0].entries[0].growth,30);
  store.measurements.push(m('juanofabiani',140,'2026-10-25T23:59:00Z'));finalize(store,closed+7200000);assert.equal(store.weeks.length,1);assert.equal(store.weeks[0].entries[0].growth,30);
});
test('recupera varias semanas y marca las que no tienen datos',()=>{const store=s();finalize(store,closed+14*DAY);assert.equal(store.weeks.length,3);assert.ok(store.weeks.every(w=>w.excluded.length===5));});
test('validación, idempotencia y protección del historial',()=>{
  const store=s(),sample=m('juanofabiani',123);
  assert.equal(appendMeasurement(store,sample,closed),true);assert.equal(appendMeasurement(store,sample,closed),false);
  assert.throws(()=>appendMeasurement(store,{...sample,value:456},closed));assert.equal(store.measurements[0].value,123);
  assert.equal(validMeasurement({...sample,value:-1},closed),false);assert.equal(validMeasurement({...sample,at:'2026-10-27T00:00:00Z'},closed),false);
  assert.equal(validMeasurement({...sample,account:'otro'},closed),false);assert.equal(validMeasurement({...sample,at:'2026-10-20T00:00:00'},closed),false);
});

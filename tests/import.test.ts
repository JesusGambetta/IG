import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('CSV transaccional: carga, repetición, conflicto y rollback completo',async()=>{
  await mkdir('test-results',{recursive:true});
  const dir=await mkdtemp(join(process.cwd(),'test-results','stream-ranking-'));
  try{
    const path=join(dir,'store.json'),csv=join(dir,'input.csv');
    await writeFile(path,JSON.stringify({version:1,initializedAt:'2026-10-19T03:00:00Z',measurements:[],attempts:[],weeks:[]}));
    const header='account,observed_at,followers,approximate,evidence\n';
    const row='paulaeichel,2026-10-20T20:45:00-03:00,100,false,TEST ONLY\n';
    const run=()=>spawnSync(process.execPath,['--import','tsx','scripts/import.ts',csv],{env:{...process.env,STORE_PATH:path},encoding:'utf8'});
    await writeFile(csv,header+row);const first=run();assert.equal(first.status,0,first.stderr);const second=run();assert.equal(second.status,0,second.stderr);
    assert.equal(JSON.parse(await readFile(path,'utf8')).measurements.length,1);
    const saved=await readFile(path,'utf8');await writeFile(csv,header+row.replace(',100,',',101,'));assert.notEqual(run().status,0);assert.equal(await readFile(path,'utf8'),saved);
    await writeFile(csv,header+row.replace('2026-10-20','2026-10-21')+'otro,2026-10-22T20:45:00-03:00,100,false,TEST ONLY\n');assert.notEqual(run().status,0);assert.equal(await readFile(path,'utf8'),saved);
  }finally{await rm(dir,{recursive:true,force:true});}
});

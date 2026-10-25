import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {type Store,validMeasurement} from '../src/core.js';
export const path=process.env.STORE_PATH || 'data/store.json';
export async function readStore():Promise<Store> {
  const s=JSON.parse(await readFile(path,'utf8')) as Store;
  if(s.version!==1 || !Number.isFinite(Date.parse(s.initializedAt)) || !Array.isArray(s.measurements) || !Array.isArray(s.attempts) || !Array.isArray(s.weeks) || s.measurements.some(m=>!validMeasurement(m))) throw new Error('Store inválido');
  return s;
}
export async function writeJSON(file:string,data:unknown) {
  await mkdir(dirname(file),{recursive:true});
  await writeFile(`${file}.tmp`,JSON.stringify(data,null,2)+'\n'); await rename(`${file}.tmp`,file);
}
export async function saveStore(s:Store) {await writeJSON(path,s);}

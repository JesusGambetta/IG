import {finalize} from '../src/core.js';
import {readStore,saveStore} from './store.js';
const s=await readStore(); finalize(s); await saveStore(s); console.log(`Semanas publicadas: ${s.weeks.length}`);

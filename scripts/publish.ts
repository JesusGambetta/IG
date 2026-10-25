import {readStore,writeJSON} from './store.js';
const store=await readStore();
// No current ranking is generated or shipped. Only finalized weeks are public.
await writeJSON('public/data/dashboard.json',{generatedAt:new Date().toISOString(),...store});

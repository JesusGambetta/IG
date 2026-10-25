import {chromium} from 'playwright';
import {mkdir,appendFile} from 'node:fs/promises';
import {ACCOUNTS,appendMeasurement,type Attempt} from '../src/core.js';
import {readStore,saveStore} from './store.js';
import {extractCount} from './normalize.js';
const store=await readStore();
await mkdir('logs',{recursive:true});
const logFile=`logs/extract-${new Date().toISOString().replace(/[:.]/g,'-')}.jsonl`;
const browser=await chromium.launch({headless:true});
try {
  for(const account of ACCOUNTS) {
    const context=await browser.newContext({locale:'en-US'});
    const page=await context.newPage();
    let attempt:Attempt;
    try {
      const response=await page.goto(`https://www.instagram.com/${account.id}/`,{waitUntil:'domcontentloaded',timeout:45000});
      if(!response || response.status()>=400) throw new Error(`HTTP ${response?.status() ?? 'sin respuesta'}`);
      if(/accounts\/login|challenge|checkpoint/.test(page.url())) throw new Error('Acceso restringido o inicio de sesión requerido');
      await page.locator('body').waitFor();
      const body=await page.locator('body').innerText({timeout:15000});
      if(/captcha|confirm you.re human|automated behavior|confirma que eres|challenge required/i.test(body)) throw new Error('Restricción o CAPTCHA: no se intenta eludir');
      const metadata=await page.locator('meta[property="og:description"],meta[name="description"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('content')||'').join('\n'));
      // Only publicly rendered profile header and public description, never private endpoints or embedded API state.
      const header=await page.locator('header').allInnerTexts();
      const titles=await page.locator('header a[href$="/followers/"] [title]').evaluateAll(nodes=>nodes.map(n=>`${n.getAttribute('title')} followers`).join('\n'));
      // Instagram's SEO description can lag behind its visible profile header.
      // Prefer the live header, and use public metadata only when no header count exists.
      const visible=extractCount([...header,titles].join('\n'));
      const result=visible || extractCount(metadata);
      if(!result) throw new Error('No hay cifra pública de seguidores legible');
      const at=new Date().toISOString();
      appendMeasurement(store,{account:account.id,at,value:result.value,approximate:result.approximate,source:'public',evidence:`${visible?'visible header':'public description'}: ${result.raw}`});
      attempt={account:account.id,at,status:'ok',message:`${result.value}${result.approximate?' (aproximado; no clasificable)':''}`};
    } catch(error) {
      attempt={account:account.id,at:new Date().toISOString(),status:'error',message:String(error)};
    } finally {await context.close();}
    store.attempts.push(attempt!); await saveStore(store);
    const line=JSON.stringify(attempt!); console.log(line); await appendFile(logFile,line+'\n');
  }
} finally {await browser.close();}
// Individual failures are recorded, not turned into fabricated zero measurements.
if(store.attempts.slice(-5).every(a=>a.status==='error')) console.warn('Todas las consultas fallaron. Se conserva el historial; usar carga manual.');

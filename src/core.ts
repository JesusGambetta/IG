export const ZONE = 'America/Argentina/Buenos_Aires';
export const ACCOUNTS = [
  {id:'juanofabiani',name:'Juan Fabiani',color:'#b4f568'},
  {id:'mariano.cascallares',name:'Mariano Cascallares',color:'#9b8afb'},
  {id:'paulaeichel',name:'Paula Eichel',color:'#ffb86b'},
  {id:'nicolas.jawtuschenko',name:'Nicolás Jawtuschenko',color:'#63dce7'},
  {id:'leperejose',name:'José Lepere',color:'#f78cb7'}
];
export type Measurement = { account:string; at:string; value:number; approximate:boolean; source:'public'|'manual'; evidence:string };
export type Attempt = {account:string; at:string; status:'ok'|'error'; message:string};
export type Entry = {account:string; growth:number; baseline:Measurement; final:Measurement; rank:number};
export type Week = {id:string; start:string; close:string; publishedAt:string; entries:Entry[]; excluded:{account:string; reason:string}[]};
export type Store = {version:1; initializedAt:string; measurements:Measurement[]; attempts:Attempt[]; weeks:Week[]};
export const DAY = 86400000;
export function localDate(at:string|number|Date):string {
  return new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
}
export function period(at:string|number|Date) {
  const date = localDate(at);
  const midnight = Date.parse(`${date}T00:00:00-03:00`);
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const start = midnight - ((day+6)%7)*DAY;
  return {id:localDate(start),start:new Date(start).toISOString(),close:new Date(start+6*DAY+21*3600000).toISOString()};
}
export function nextReveal(now:number) { const p=period(now); return Date.parse(p.close)>now?Date.parse(p.close):Date.parse(p.close)+7*DAY; }
export function validMeasurement(m:Measurement, now=Date.now()) {
  return ACCOUNTS.some(a=>a.id===m.account) && Number.isSafeInteger(m.value) && m.value>=0 && m.value<=2_000_000_000 &&
    Number.isFinite(Date.parse(m.at)) && /(?:Z|[+-]\d{2}:\d{2})$/.test(m.at) && Date.parse(m.at)<=now &&
    typeof m.approximate==='boolean' && ['public','manual'].includes(m.source) && typeof m.evidence==='string' && m.evidence.length>0;
}
export function appendMeasurement(store:Store,m:Measurement,now=Date.now()) {
  if(!validMeasurement(m,now)) throw new Error('Medición inválida o futura');
  const prior=store.measurements.find(x=>x.account===m.account && Date.parse(x.at)===Date.parse(m.at));
  if(prior) { if(prior.value!==m.value || prior.approximate!==m.approximate) throw new Error('Conflicto: no se sobrescriben mediciones históricas'); return false; }
  store.measurements.push({...m,at:new Date(m.at).toISOString()});
  store.measurements.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)); return true;
}
export function latest(ms:Measurement[],account:string,before=Infinity,exact=false) {
  return ms.filter(m=>m.account===account && Date.parse(m.at)<=before && (!exact || !m.approximate)).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0];
}
export function growth(ms:Measurement[],account:string,start:number,end:number) {
  const baseline=latest(ms,account,start,true), final=latest(ms,account,end,true);
  if(!baseline || start-Date.parse(baseline.at)>36*3600000) return {reason:'Sin base exacta dentro de las 36 h previas al inicio'};
  if(!final || Date.parse(final.at)<=start || end-Date.parse(final.at)>36*3600000) return {reason:'Sin cierre exacto y reciente (máximo 36 h)'};
  return {baseline,final,value:final.value-baseline.value};
}
export function closeWeek(store:Store,p:ReturnType<typeof period>,now:number):Week {
  if(now<Date.parse(p.close)) throw new Error('La semana todavía no cerró');
  const entries:Entry[]=[],excluded:Week['excluded']=[];
  for(const a of ACCOUNTS) {
    const g=growth(store.measurements,a.id,Date.parse(p.start),Date.parse(p.close));
    if(g.value===undefined) excluded.push({account:a.id,reason:g.reason!});
    else entries.push({account:a.id,growth:g.value,baseline:g.baseline!,final:g.final!,rank:0});
  }
  entries.sort((a,b)=>b.growth-a.growth || a.account.localeCompare(b.account));
  entries.forEach((e,i)=>e.rank=i>0 && entries[i-1].growth===e.growth?entries[i-1].rank:i+1);
  return {...p,publishedAt:new Date(now).toISOString(),entries,excluded};
}
export function finalize(store:Store,now=Date.now()) {
  let p=period(store.initializedAt);
  while(Date.parse(p.close)<=now) {
    if(!store.weeks.some(w=>w.id===p.id)) store.weeks.push(closeWeek(store,p,now));
    p=period(Date.parse(p.start)+7*DAY);
  }
  store.weeks.sort((a,b)=>a.start.localeCompare(b.start));
}

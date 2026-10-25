import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ResponsiveContainer,LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid} from 'recharts';
import {ACCOUNTS,DAY,ZONE,growth,latest,localDate,nextReveal,period,type Store,type Week} from './core';
import './style.css';
type Dashboard=Store & {generatedAt:string};
const fmt=new Intl.NumberFormat('es-AR');
const number=(n:number|undefined)=>n===undefined?'—':fmt.format(n);
const delta=(n:number|undefined)=>n===undefined?'—':`${n>0?'+':''}${number(n)}`;
const date=(at:string)=>new Intl.DateTimeFormat('es-AR',{timeZone:ZONE,dateStyle:'short',timeStyle:'short'}).format(new Date(at));
const overlay=/\/overlay\/?$/.test(location.pathname);
const compact=new URLSearchParams(location.search).get('compact')==='1';
if(overlay) document.body.classList.add('overlay-body');
function Ranking({week}:{week:Week|undefined}) {
  const [visible,setVisible]=useState(0),[run,setRun]=useState(0);
  const ranks=[...new Set(week?.entries.map(e=>e.rank)||[])].sort((a,b)=>b-a);
  useEffect(()=>{
    setVisible(0);
    const timers=ranks.map((_,i)=>setTimeout(()=>setVisible(i+1),600+i*1500));
    return ()=>timers.forEach(clearTimeout);
  },[week?.id,run]);
  const revealed=ranks.slice(0,visible);
  const finished=visible===ranks.length && !!ranks.length;
  return <section className={`panel ranking ${finished?'celebrate':''}`} aria-label="Ranking publicado">
    <div className="section-top"><div><span className="eyebrow">LA REVELACIÓN</span><h2>Ranking semanal <span className="live-dot"/></h2></div>{week && <button onClick={()=>setRun(x=>x+1)} aria-label="Repetir revelación">↻ Repetir</button>}</div>
    {week?<>
      <p className="muted">Semana del {localDate(week.start)} · cerrado {date(week.close)} ART</p>
      {!week.entries.length && <div className="empty"><span>◎</span><h3>Sin clasificación válida</h3><p>Esta semana no hubo mediciones exactas comparables.</p></div>}
      <div className="rank-list" aria-live="polite">{week.entries.map(e=>{
        const a=ACCOUNTS.find(a=>a.id===e.account)!;
        return <div key={e.account} className={`rank-row medal-${e.rank} ${revealed.includes(e.rank)?'shown':'hidden-row'}`}>
          <strong className="rank-position">{revealed.includes(e.rank)?String(e.rank).padStart(2,'0'):'••'}</strong>
          <div className="rank-person"><b>{revealed.includes(e.rank)?a.name:'Revelando posición…'}</b><small>{revealed.includes(e.rank)?`@${a.id}`:'STREAM RANKING'}</small></div>
          <strong className="rank-growth">{revealed.includes(e.rank)?delta(e.growth):'—'}<small>seguidores netos</small></strong>
          {finished && e.rank===1 && <span className="winner">★ GANADOR{week.entries.filter(x=>x.rank===1).length>1?' · EMPATE':''}</span>}
        </div>;
      })}</div>
      {week.excluded.length>0 && <details className="excluded"><summary>{week.excluded.length} cuentas sin clasificación</summary>{week.excluded.map(e=><p key={e.account}>@{e.account}: {e.reason}</p>)}</details>}
      <p className="footnote">Publicado {date(week.publishedAt)} ART · Los empates comparten puesto.</p>
    </>:<div className="empty"><span>◈</span><h3>El podio todavía está reservado</h3><p>El primer resultado aparecerá después del cierre dominical.<br/>Sin datos comparables, no se asignan puestos.</p></div>}
  </section>;
}
function App(){
  const [data,setData]=useState<Dashboard>(),[error,setError]=useState(''),[now,setNow]=useState(Date.now()),[range,setRange]=useState(30),[mode,setMode]=useState('followers'),[selected,setSelected]=useState(ACCOUNTS.map(a=>a.id)),[weekId,setWeekId]=useState('');
  useEffect(()=>{let active=true;const controller=new AbortController();const load=async()=>{try{const r=await fetch(`${import.meta.env.BASE_URL}data/dashboard.json?t=${Date.now()}`,{cache:'no-store',signal:controller.signal});if(!r.ok)throw new Error(`HTTP ${r.status}`);const d=await r.json();if(d.version!==1||!Array.isArray(d.measurements)||!Array.isArray(d.weeks))throw new Error('Datos inválidos');if(active){setData(d);setError('');}}catch(e){if(active)setError(`No se pudo actualizar: ${String(e)}`);}};void load();const t=setInterval(load,60000),clock=setInterval(()=>setNow(Date.now()),1000);return()=>{active=false;controller.abort();clearInterval(t);clearInterval(clock);};},[]);
  const weeks=data?.weeks.filter(w=>Date.parse(w.close)<=now&&Date.parse(w.publishedAt)<=now)||[];
  const published=weeks.at(-1),week=weeks.find(w=>w.id===weekId)||published;
  const p=period(now),remaining=Math.max(0,nextReveal(now)-now);
  const expected=Date.parse(p.close)<=now?p:period(now-7*DAY);
  const pending=!!data && Date.parse(expected.close)>=Date.parse(data.initializedAt) && !weeks.some(w=>w.id===expected.id);
  const countdown=[Math.floor(remaining/DAY),Math.floor(remaining/3600000)%24,Math.floor(remaining/60000)%60,Math.floor(remaining/1000)%60];
  const ms=data?.measurements||[];
  const observedDays=[...new Set(ms.filter(m=>Date.parse(m.at)>=now-range*DAY).map(m=>localDate(m.at)))].sort();
  const days:string[]=[];
  if(observedDays.length) for(let d=Date.parse(`${observedDays[0]}T12:00:00Z`);d<=Date.parse(`${observedDays.at(-1)}T12:00:00Z`);d+=DAY)days.push(localDate(d));
  const chart=days.map(day=>{
    const row:Record<string,string|number|null>={day};
    for(const a of ACCOUNTS){const m=latest(ms.filter(m=>localDate(m.at)===day),a.id);const first=latest(ms.filter(m=>localDate(m.at)===days[0]),a.id);row[a.id]=m?(mode==='followers'?m.value:first?m.value-first.value:null):null;}return row;
  });
  if(overlay)return <main className={`overlay ${compact?'compact':''}`}><div className="overlay-label">● STREAM RANKING <span>INSTAGRAM</span></div><Ranking week={published}/>{error&&<p className="overlay-error">Actualización pendiente · conservando resultado disponible</p>}</main>;
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href={import.meta.env.BASE_URL}><span className="brand-icon">▥</span> STREAM<span>RANKING</span></a><div className="top-actions"><span className="pill"><i/> DATOS PÚBLICOS</span><a className="button" href={`${import.meta.env.BASE_URL}overlay/`} target="_blank" rel="noreferrer">Overlay OBS ↗</a></div></header>
    <main>
      <section className="hero"><div><div className="eyebrow">INSTAGRAM / SEGUIMIENTO DIARIO</div><h1>Cada seguidor cuenta.<br/><span>El domingo se define.</span></h1><p>Cinco cuentas. Una semana. Un ranking por crecimiento neto.<br/>La clasificación oficial se revela los domingos a las 21:00 ART.</p></div><div className="countdown panel"><span className="eyebrow">{pending?'CIERRE ALCANZADO':'PRÓXIMA REVELACIÓN'}</span>{pending?<div className="awaiting">Esperando publicación</div>:<div className="timer">{countdown.map((n,i)=><div key={i}><b>{String(n).padStart(2,'0')}</b><small>{['DÍAS','HORAS','MIN','SEG'][i]}</small></div>)}</div>}<span className="muted">{pending?'El proceso puede demorarse. No anticipamos resultados.':'DOMINGO · 21:00 · ARGENTINA'}</span></div></section>
      {error&&<div role="alert" className="alert">{error}. {data?'Se conserva la última versión disponible.':'Ejecutá la publicación de datos e intentá nuevamente.'}</div>}
      <div className="section-top"><h2>En seguimiento <span className="count">05</span></h2><span className="muted">Medición programada · 20:45 ART</span></div>
      <section className="account-grid">{ACCOUNTS.map(a=>{
        const m=latest(ms,a.id),lastAttempt=data?.attempts.filter(x=>x.account===a.id).at(-1);
        const previous=m?latest(ms.filter(x=>localDate(x.at)===localDate(Date.parse(m.at)-DAY)),a.id):undefined;
        const daily=m&&previous&&!m.approximate&&!previous.approximate?m.value-previous.value:undefined;
        const weekly=growth(ms,a.id,Date.parse(p.start),Math.min(now,Date.parse(p.close)));
        const stale=!!m&&now-Date.parse(m.at)>36*3600000;
        const status=lastAttempt?.status==='error'?'Consulta fallida':stale?'Dato desactualizado':m?m.approximate?'Aproximado':'Actualizado':'Sin mediciones';
        return <article className="account-card" key={a.id} style={{'--accent':a.color} as React.CSSProperties}><div className="account-heading"><span className="avatar">{a.name.split(' ').map(s=>s[0]).slice(0,2).join('')}</span><span className={`status-dot ${status==='Actualizado'?'ok':''}`} title={status}/></div><h3>{a.name}</h3><a href={`https://www.instagram.com/${a.id}/`} target="_blank" rel="noreferrer">@{a.id} ↗</a><div className="followers">{m?.approximate?'≈ ':''}{number(m?.value)}</div><span className="caption">SEGUIDORES</span><div className="metrics"><div><small>Variación diaria</small><b>{delta(daily)}</b></div><div><small>Esta semana</small><b>{delta(weekly.value)}</b></div></div><div className="account-footer"><span>{status}</span><time>{m?`${date(m.at)} ART`:'Esperando primera lectura'}</time>{m&&<small>Fuente: {m.source==='manual'?'carga manual':'perfil público'}</small>}</div></article>;
      })}</section>
      <section className="panel evolution"><div className="section-top"><div><span className="eyebrow">LOS NÚMEROS, EN PERSPECTIVA</span><h2>Evolución de seguidores</h2></div><div className="controls"><label><span className="sr-only">Métrica</span><select aria-label="Métrica" value={mode} onChange={e=>setMode(e.target.value)}><option value="followers">Seguidores</option><option value="growth">Cambio desde inicio visible</option></select></label><label><span className="sr-only">Período</span><select aria-label="Período" value={range} onChange={e=>setRange(Number(e.target.value))}><option value={7}>7 días</option><option value={30}>30 días</option><option value={90}>90 días</option><option value={36500}>Todo el historial</option></select></label></div></div>
        <div className="legend">{ACCOUNTS.map(a=><button key={a.id} aria-pressed={selected.includes(a.id)} onClick={()=>setSelected(s=>s.includes(a.id)?s.filter(x=>x!==a.id):[...s,a.id])}><i style={{background:a.color}}/>{a.name}</button>)}</div>
        {chart.length?<div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart} margin={{top:15,right:20,bottom:10,left:15}}><CartesianGrid stroke="#252b37" strokeDasharray="3 5"/><XAxis dataKey="day" stroke="#858c9c" tickFormatter={d=>d.slice(5)}/><YAxis stroke="#858c9c" width={75} domain={['auto','auto']} tickFormatter={v=>fmt.format(v)}/><Tooltip contentStyle={{background:'#161b27',border:'1px solid #343c4f',borderRadius:12}} labelFormatter={v=>`Fecha argentina: ${v}`} formatter={(v)=>number(Number(v))}/>{ACCOUNTS.filter(a=>selected.includes(a.id)).map(a=><Line key={a.id} type="linear" dataKey={(row)=>row[a.id]} name={a.name} stroke={a.color} strokeWidth={2.5} dot={{r:3}} connectNulls={false} isAnimationActive={false}/>)}</LineChart></ResponsiveContainer></div>:<div className="empty chart-empty"><span>⌁</span><h3>El historial comienza con la primera medición</h3><p>Las consultas fallidas no se convierten en ceros ni en puntos inventados.</p></div>}
        <p className="footnote">Última observación por día argentino. Puede incluir cifras aproximadas. Los huecos indican falta de datos.</p>
      </section>
      <div className="bottom-grid"><Ranking week={week}/><aside className="panel rules"><span className="eyebrow">CÓMO SE DEFINE</span><h2>Una semana.<br/>Las mismas reglas.</h2><ol><li><b>Lunes · 00:00</b><span>Comienza el período competitivo.</span></li><li><b>Todos los días · 20:45</b><span>Intentamos medir los perfiles públicos.</span></li><li><b>Domingo · 21:00</b><span>Se cierra y publica el crecimiento neto.</span></li></ol><p className="muted">Base y cierre exactos con antigüedad máxima de 36 horas. Las cuentas sin datos comparables quedan fuera de clasificación. El resultado anterior permanece visible hasta el siguiente.</p><label className="archive-label">Archivo semanal<select value={weekId} onChange={e=>setWeekId(e.target.value)}><option value="">Último resultado</option>{weeks.slice().reverse().map(w=><option value={w.id} key={w.id}>Semana del {w.id}</option>)}</select></label><a href={`${import.meta.env.BASE_URL}data/dashboard.json`} download>Descargar historial JSON ↓</a></aside></div>
      <footer><span>STREAM RANKING <span className="muted">/ Instagram</span></span><span>Actualización del sitio: {data?date(data.generatedAt):'cargando…'} ART</span><p>Proyecto independiente, sin afiliación a Instagram. La clasificación oficial se oculta hasta el cierre; el crecimiento público permite inferir posiciones.</p></footer>
    </main></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

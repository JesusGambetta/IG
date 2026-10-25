/** Strict parsing: ambiguous decimals without suffix are rejected, never guessed. */
export function normalize(raw:string):{value:number;approximate:boolean} | null {
  let s=raw.toLowerCase().replace(/[\u00a0\u202f]/g,' ').trim();
  s=s.replace(/\s*(followers?|seguidores?)\s*$/,'').trim();
  const match=s.match(/^([\d., ]+)\s*(k|m|mil|millón|millones)?$/u);
  if(!match) return null;
  let n=match[1].trim(); const suffix=match[2];
  if(suffix) {
    if(!/^\d+(?:[.,]\d{1,3})?$/.test(n)) return null;
    const value=Math.round(Number(n.replace(',','.'))*(suffix==='k'||suffix==='mil'?1000:1000000));
    return Number.isSafeInteger(value)&&value<=2e9?{value,approximate:true}:null;
  }
  if(!/^\d+$/.test(n) && !/^\d{1,3}([., ])\d{3}(?:\1\d{3})*$/.test(n)) return null;
  n=n.replace(/[., ]/g,''); const value=Number(n);
  return Number.isSafeInteger(value)&&value<=2e9?{value,approximate:false}:null;
}
export function extractCount(text:string) {
  const found=[...text.matchAll(/(?:^|[^\d.,])([\d][\d.,\u00a0\u202f ]*\s*(?:millones|millón|mil|[kKmM])?)\s+(?:followers?|seguidores?)\b/giu)]
    .map(m=>({parsed:normalize(m[1]),raw:m[0].trim()})).filter(x=>x.parsed);
  if(!found.length) return null;
  const exact=found.filter(x=>!x.parsed!.approximate), candidates=exact.length?exact:found;
  if(new Set(candidates.map(x=>x.parsed!.value)).size!==1) throw new Error(`Cifras públicas contradictorias: ${candidates.map(x=>x.raw).join(' | ')}`);
  return {...candidates[0].parsed!,raw:candidates[0].raw};
}

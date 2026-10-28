import {monthCutoff} from './aging.js';
const $ = (id) => document.getElementById(id);
const format = new Intl.NumberFormat('th-TH', {style:'currency',currency:'THB',maximumFractionDigits:0});
let data = null, filtered = [], currentPage = 1;
const pageSize = 12;
const money = n => n === null || n === undefined || n === '' ? '—' : format.format(Number(n));
const decoded = text => String(text ?? '').replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => {const v = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1),16) : Number(n);return v <= 0x10ffff ? String.fromCodePoint(v) : '';}).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
function element(tag, text, className) {const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function renderSummary() {
  const s=data.summary;
  $('published').textContent=s.published.toLocaleString();$('inStock').textContent=s.inStock.toLocaleString();$('aged').textContent=s.agedInStock.toLocaleString();$('missing').textContent=s.lotsMissing.toLocaleString();
  $('stockNote').textContent=`${s.soldOut.toLocaleString()} sold-out listings`;
  $('auditDate').textContent=`Audit date · ${data.auditDate}`;
  $('cutoff').textContent=`6-month cutoff: ${data.cutoffDate}`;
  $('navCount').textContent=s.agedInStock;
  const previous=$('category').value;
  $('category').replaceChildren(new Option('All categories',''), ...[...new Set(data.reviewProducts.map(p=>p.primaryCategory))].sort().map(c=>new Option(c,c)));
  if([...$('category').options].some(o=>o.value===previous))$('category').value=previous;
  const categories = data.categorySummary.filter(c=>c.aged>0).sort((a,b)=>b.aged-a.aged);
  const max=Math.max(1,...categories.map(c=>c.aged));
  $('bars').replaceChildren(...categories.map(c=>{
    const button=element('button',undefined,'barrow');button.setAttribute('aria-label',`Filter ${c.category}, ${c.aged} aged listings`);
    const track=element('div',undefined,'bartrack'), fill=element('div',undefined,'barfill');fill.style.width=`${c.aged/max*100}%`;track.append(fill);
    button.append(element('span',c.category),track,element('b',c.aged));
    button.onclick=()=>{$('category').value=c.category;$('age').value='6';if(c.category==='Repairs')$('services').checked=true;currentPage=1;render();$('queue').scrollIntoView({behavior:'smooth'});};return button;
  }));
}
function render() {
  if(!data)return;
  const query=$('search').value.trim().toLocaleLowerCase();
  const months=Number($('age').value), cutoff=monthCutoff(data.auditDate,months);
  $('cutoff').textContent=`Review: ${months}+ months · Listed on or before ${cutoff}`;
  filtered=data.reviewProducts.filter(p=>
    (!$('category').value || p.primaryCategory===$('category').value) &&
    (p.postedDate <= cutoff) &&
    (!$('lot').value || ($('lot').value==='missing' ? !p.lot : !!p.lot)) &&
    ($('services').checked || p.primaryCategory!=='Repairs') &&
    (!query || [p.product,p.lot,p.allCategories,p.brands,p.sku].some(v=>decoded(v).toLocaleLowerCase().includes(query)))
  );
  const sort=$('sort').value;
  filtered.sort((a,b)=>sort==='name'?decoded(a.product).localeCompare(decoded(b.product)):sort==='price-high'?Number(b.currentPrice)-Number(a.currentPrice):sort==='price-low'?Number(a.currentPrice)-Number(b.currentPrice):sort==='newest'?a.ageDays-b.ageDays:b.ageDays-a.ageDays);
  $('value').textContent=money(filtered.reduce((sum,p)=>sum+Number(p.currentPrice||0),0));
  $('overYear').textContent=filtered.filter(p=>p.ageDays>365).length;
  $('reviewMissing').textContent=filtered.filter(p=>!p.lot).length;
  $('queueBadge').textContent=filtered.length;
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));currentPage=Math.min(currentPage,pages);
  const start=(currentPage-1)*pageSize;
  $('rows').replaceChildren(...filtered.slice(start,start+pageSize).map(p=>{
    const tr=element('tr'),product=element('td');product.append(element('div',decoded(p.product),'productname'),element('div',p.primaryCategory,'productcat'));
    const lot=element('td');lot.append(element('span',p.lot||'Missing lot',p.lot?'lot':'missing'));
    const age=element('td');age.append(element('span',`${p.ageDays} days`,p.ageDays>365?'agepill old':'agepill'));
    const linkCell=element('td');
    try {const url=new URL(p.productUrl);if(url.protocol==='https:' && url.hostname==='dnsgolfoutlet.com'){const a=element('a','↗','productlink');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',`Open ${decoded(p.product)}`);linkCell.append(a);}}catch{}
    tr.append(product,lot,element('td',p.postedDate),age,element('td',money(p.currentPrice),'price right'),linkCell);return tr;
  }));
  $('empty').hidden=filtered.length>0;$('empty').textContent='No products match these filters. Try a different search or reset filters.';
  $('count').textContent=filtered.length?`Showing ${start+1}–${Math.min(start+pageSize,filtered.length)} of ${filtered.length} matching listings`:'0 matching listings';
  $('page').textContent=`${currentPage} / ${pages}`;$('prev').disabled=currentPage===1;$('next').disabled=currentPage===pages;$('export').disabled=!filtered.length;
}
async function load(refresh=false){
  $('run').disabled=true;$('run').querySelector('span').textContent=refresh?'Reading live catalog…':'Loading audit…';
  $('status').textContent=refresh?'Reading the live catalog. This can take a few minutes; the previous results remain available.':'Loading the latest available audit…';
  $('statusDot').style.background='#c89b3e';
  try{
    const response=await fetch('/api/audit'+(refresh?'?refresh=1':''),{signal:AbortSignal.timeout(190000)});
    const result=await response.json();if(!response.ok)throw Error(result.error||'The audit failed. Please retry.');
    if(!Array.isArray(result.reviewProducts)||!result.summary)throw Error('The complete catalog is unavailable. Please retry.');
    data=result;currentPage=1;renderSummary();render();
    $('status').textContent=`Audit ready · Updated ${new Date(data.generatedAt).toLocaleString()} · Repair services excluded from review by default.`;
    $('statusDot').style.background='#3a8d64';
  }catch(e){$('status').textContent=`${e.name==='TimeoutError'?'The audit timed out. Please retry.':e.message}${data?' Previous results are still shown.':''}`;$('statusDot').style.background='#b65d43';if(!data){$('empty').textContent='Could not load inventory. Use “Run live audit” to retry.';}}
  finally{$('run').disabled=false;$('run').querySelector('span').textContent='Run live audit';}
}
for(const id of ['search','category','age','lot','services','sort'])$(id).addEventListener(id==='search'?'input':'change',()=>{currentPage=1;render();});
$('clear').onclick=()=>{$('search').value='';$('category').value='';$('age').value='6';$('lot').value='';$('sort').value='oldest';$('services').checked=false;currentPage=1;render();};
$('prev').onclick=()=>{currentPage--;render();};$('next').onclick=()=>{currentPage++;render();};$('run').onclick=()=>load(true);
$('export').onclick=()=>{
  const safe=value=>{let s=decoded(value);if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  const rows=[['Lot','Product','Category','Posted date','Age days','Price THB','Product URL','Audit date'],...filtered.map(p=>[p.lot,p.product,p.primaryCategory,p.postedDate,p.ageDays,p.currentPrice,p.productUrl,data.auditDate])];
  const blob=new Blob(['\ufeff'+rows.map(row=>row.map(safe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob), a=element('a');a.href=url;a.download=`dns-golf-review-${$('age').value}months-${data.auditDate}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
load();

(function(g){
'use strict';
const fail=m=>{throw Error(m)};
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const cents=n=>Math.round(n*100);
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
const digits=s=>String(s??'').replace(/\D/g,'');
const br=s=>{s=String(s).trim();if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(s))fail('Número brasileiro inválido: '+s);return Number(s.replace(/\./g,'').replace(',','.'))};
const num=s=>{if(!/^\d+(?:\.\d+)?$/.test(String(s)))fail('Número XML inválido');const n=Number(s);if(!Number.isFinite(n))fail('Número inválido');return n};
function validKey(k){if(!/^\d{44}$/.test(k)||k.slice(20,22)!=='55')return false;let s=0,w=2;for(let i=42;i>=0;i--){s+=Number(k[i])*w;w=w===9?2:w+1}let d=11-s%11;return Number(k[43])===(d>=10?0:d)}
function findKey(text){const ks=[...(text.match(/(?<!\d)\d{44}(?!\d)/g)||[]),...(text.match(/(?<!\d)(?:\d{4}\s+){10}\d{4}(?!\d)/g)||[])].map(digits).filter(validKey);const unique=[...new Set(ks)];if(unique.length!==1)fail('Chave NF-e ausente, inválida ou múltipla; confira o arquivo.');return unique[0]}
function group(items){const a=items.filter(i=>typeof i.text==='string'&&i.text.trim()&&Number.isFinite(i.x)&&Number.isFinite(i.y)).map(i=>({x:i.x,y:i.y,text:i.text.trim()})).sort((a,b)=>a.y-b.y||a.x-b.x);const rows=[];for(const i of a){let r=rows[rows.length-1];if(!r||Math.abs(r.y-i.y)>1.7){r={y:i.y,items:[]};rows.push(r)}r.items.push(i)}return rows.map(r=>({...r,items:r.items.sort((a,b)=>a.x-b.x),text:r.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ')}))}
const moneyRe=/^\d[\d.]*,\d{2}$/;
function headerValue(rows,pattern){for(let k=0;k<rows.length;k++){const r=rows[k];for(const i of r.items){if(!pattern.test(norm(i.text)))continue;const candidates=rows.slice(k+1,k+6).filter(a=>a.y-r.y>3&&a.y-r.y<19).flatMap(a=>a.items.filter(v=>v.x>=i.x-3&&v.x<i.x+155&&moneyRe.test(v.text)));if(candidates.length){candidates.sort((a,b)=>b.x-a.x);return br(candidates[0].text)}}}return null}
const rowRe=/^([A-Za-z0-9][A-Za-z0-9./_-]{0,49})\s+(.*?)\s*((?:\d{8}|\d{4}\.\d{2}\.\d{2}))\s+(?:\d{1,4}(?:\s*\/\s*\d{1,3})?)\s+(\d{4})\s+([A-Z]{1,6})\s+(\d[\d.,]*)\s+(\d[\d.,]*)\s+(.+)$/i;
const cfopOK=/^[56](?:101|102|103|104|105|106|401|403|405|501|502|551|552|653|654|655|656|657)$/;
function pdf(pages){
if(!Array.isArray(pages)||!pages.length||pages.length>50)fail('Limite de páginas excedido.');
let all=pages.map(group);let text=all.flat().map(r=>r.text).join('\n');const key=findKey(text);let first=all[0];
let prodTotal=headerValue(first,/^VALOR TOTAL (?:DOS )?PRODUTOS$/), nfTotal=headerValue(first,/^(?:VALOR TOTAL DA (?:NOTA|NF(?:-E)?)|VLR TOTAL DA NOTA)$/);
if(prodTotal===null||nfTotal===null)fail('Não consegui localizar os totais impressos. Use o XML desta nota.');
const supplierCandidates=first.flatMap(r=>r.items).map(i=>i.text).filter(s=>/\b(?:LTDA|S\.?A\.?|EIRELI)\b/i.test(s)&&!/(RECEBEMOS|TRANSPORT|RECEBIDO|REDESPACHO)/i.test(s)&&s.length<150);
let supplier=supplierCandidates[0]||'';
if(/^MOTOPECAS LTDA$/i.test(norm(supplier))){const previous=first.findIndex(r=>r.items.some(i=>i.text===supplier));const above=first[previous-1]?.items.find(i=>/AFTERMARKET/i.test(i.text));if(above)supplier=above.text+' '+supplier;}
const recipientSection=norm(first.map(r=>r.text).join('\n')).split(/DESTINATARIO\s*\/?\s*REMETENTE/)[1]||'';
const cnpjs=[...(recipientSection.slice(0,900).match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g)||[])].map(digits).filter(x=>x!==key.slice(6,20));
const recipient=cnpjs[0]||'';
let dateMatch=text.match(/\b(\d{2})[/.](\d{2})[/.](20\d{2})\b/);
const date=dateMatch?dateMatch[3]+'-'+dateMatch[2]+'-'+dateMatch[1]:'';
const lines=[];
for(let page=0;page<all.length;page++){
 const rows=all[page];const head=norm(rows.map(r=>r.text).join(' '));const west=/V TRIB/.test(head)&&/\bDESC\b/.test(head);
 const hasDiscount=west||/DESCONTO\s+BASE/.test(head)||/DESCONTO\s+BASE\s+VALOR/.test(head);
 let anchors=[];
 for(let j=0;j<rows.length;j++){
  const r=rows[j], m=r.text.match(rowRe);if(!m)continue;
  const tail=m[8].trim().split(/\s+/).filter(t=>/^\d[\d.,]*$/.test(t));if(tail.length<5)continue;
  const unit=m[5].toUpperCase();if(!/^(PC|UN|PR|CX|PÇ|PAR|KIT|PCT|JG|L|KG|MT|M|CJ)$/.test(unit))fail('Unidade não reconhecida: '+unit);
  const qty=br(m[6]),unitCost=br(m[7]),total=br(tail[west?1:0]),ipi=br(tail[tail.length-3]),discount=west?br(tail[0]):(hasDiscount||tail.length===7)?br(tail[1]):0;
  if(!(qty>0&&unitCost>=0&&total>=0&&ipi>=0&&discount>=0))fail('Item inválido.');
  if(Math.abs(qty*unitCost-total)>Math.max(.02,qty*.005+.011))fail('Quantidade × valor unitário diverge no item '+m[1]);
  const ncmIndex=r.items.findIndex(i=>i.text.includes(m[3]));const descX=r.items[1]?.x??0;const ncmX=ncmIndex>=0?r.items[ncmIndex].x:0;
  anchors.push({j,descX,ncmX,code:m[1],name:m[2].trim(),ncm:digits(m[3]),cfop:m[4],unit,qty,unitCost,total,ipi,discount,page:page+1});
 }
 if(!anchors.length)continue;
 for(let a=0;a<anchors.length;a++){
  const v=anchors[a];const prev=anchors[a-1];const next=anchors[a+1];
  if(west){
   const before=rows.slice(prev?prev.j+1:Math.max(0,v.j-12),v.j);
   const names=before.flatMap(r=>r.items).filter(i=>i.x>35&&i.x<v.ncmX-3&&/[A-Za-z]/.test(i.text)&&!/(NFCI|FCI:|FONTE:|TRIBUTO|C[ÓO]DIGO|DESCRI|PRODUTO|ICMS|IPI)/i.test(i.text));
   v.name=names[names.length-1]?.text||v.name;
  }else{
   if(!v.name)fail('Descrição ausente: '+v.code);
   for(let k=v.j+1;k<(next?next.j:Math.min(rows.length,v.j+8));k++){
    const rr=rows[k];if(rr.items.every(i=>Math.abs(i.x-v.descX)<4&&i.x<v.ncmX-3)&&rr.y-rows[k-1].y<14){v.name+=' '+rr.text}else break;
   }
   if(a===0&&page>0&&lines.length){
    const prior=lines[lines.length-1];for(let k=v.j-1;k>=0&&k>=v.j-4;k--){const rr=rows[k];if(rr.items.every(i=>Math.abs(i.x-v.descX)<4&&i.x<v.ncmX-3)&&rows[k+1].y-rr.y<14){prior.name=prior.name+' '+rr.text}else break}
   }
  }
  if(!v.name||v.name.length>500)fail('Descrição incompleta: '+v.code);
  const {j,descX,ncmX,...item}=v;lines.push(item);
 }
}
return validate({key,supplier,recipient,date,prodTotal,nfTotal,lines,source:'PDF',authorized:false,externalFreightHint:/FRETE POR CONTA DO DESTINAT[AÁ]RIO/i.test(text)});
}
function xml(text){
if(/<!DOCTYPE|<!ENTITY/i.test(text))fail('XML com entidades externas não é permitido.');
const d=new DOMParser().parseFromString(text,'application/xml');if(d.getElementsByTagName('parsererror').length)fail('XML inválido.');
const els=(n,t)=>Array.from(n.getElementsByTagNameNS('*',t));
const one=(n,t)=>els(n,t)[0];const val=(n,t,required=true)=>{const v=one(n,t)?.textContent?.trim();if(required&&!v)fail('Campo XML ausente: '+t);return v||''};
const infs=els(d,'infNFe');if(infs.length!==1)fail('Envie uma NF-e por arquivo XML.');
const inf=infs[0],key=inf.getAttribute('Id')?.replace(/^NFe/,'')||'',ide=one(inf,'ide'),emit=one(inf,'emit'),dest=one(inf,'dest'),tot=one(inf,'ICMSTot');
if(!ide||!emit||!dest||!tot||val(ide,'tpNF')!=='1'||val(ide,'finNFe')!=='1')fail('XML não representa venda normal do fornecedor.');
if(digits(val(emit,'CNPJ'))!==key.slice(6,20))fail('Emitente não corresponde à chave da NF-e.');
const prot=one(d,'infProt');const authorized=!!prot&&['100','150'].includes(val(prot,'cStat'))&&val(prot,'chNFe')===key;
if(prot&&!authorized)fail('Protocolo de autorização incompatível.');
const lines=els(inf,'det').map(det=>{const p=one(det,'prod');return {code:val(p,'cProd'),name:val(p,'xProd'),ncm:val(p,'NCM'),cfop:val(p,'CFOP'),unit:val(p,'uCom').toUpperCase(),qty:num(val(p,'qCom')),unitCost:num(val(p,'vUnCom')),total:num(val(p,'vProd')),ipi:num(val(det,'vIPI',false)||'0'),discount:num(val(p,'vDesc',false)||'0'),ean:val(p,'cEAN',false),page:1}});
return validate({key,supplier:val(emit,'xNome'),recipient:val(dest,'CNPJ',false),date:val(ide,'dhEmi',false).slice(0,10)||val(ide,'dEmi',false),prodTotal:num(val(tot,'vProd')),nfTotal:num(val(tot,'vNF')),lines,source:'XML',authorized,externalFreightHint:false});
}
function validate(n){
if(!validKey(n.key)||!Array.isArray(n.lines)||!n.lines.length||n.lines.length>1500)fail('Nota sem itens válidos ou acima do limite.');
if(!Number.isFinite(n.prodTotal)||!Number.isFinite(n.nfTotal)||n.nfTotal<=0||n.prodTotal<=0)fail('Totais inválidos.');
let total=0;for(const i of n.lines){
 if(!i.code||!i.name||i.code.length>80||i.name.length>500||!cfopOK.test(i.cfop)||!Number.isFinite(i.qty)||i.qty<=0||i.qty>100000||![i.total,i.ipi,i.discount,i.unitCost].every(x=>Number.isFinite(x)&&x>=0))fail('Item não suportado ou inválido: '+i.code+' (CFOP '+i.cfop+').');
 total+=cents(i.total);
}
if(total!==cents(n.prodTotal))fail('Total dos itens não confere: '+(total/100).toFixed(2)+' × '+n.prodTotal.toFixed(2)+'. Use o XML.');
return n;
}
function multiplier(i){if(i.unit==='CX'||i.unit==='PCT'){const m=i.name.match(/\b(\d{1,4})\s*[X×]\s*\d+(?:[.,]\d+)?\s*(?:ML|L|G|KG|UN)\b/i);return m?Number(m[1]):null}return 1}
function costs(n,extra=0){if(!Number.isFinite(extra)||extra<0)fail('Frete adicional inválido.');const base=n.lines.map(i=>cents(i.total)-cents(i.discount)+cents(i.ipi));const sum=base.reduce((a,b)=>a+b,0), target=cents(n.nfTotal)+cents(extra);if(sum<=0)fail('Custo inválido.');let allocated=0;return base.map((v,i)=>{let a=i===base.length-1?target-allocated:Math.round(target*v/sum);allocated+=a;if(a<0)fail('Custo negativo.');return a/100})}
function suggested(cost,margin){return Number.isFinite(cost)&&cost>0&&Number.isFinite(margin)&&margin>=0&&margin<1?Math.ceil((cost/(1-margin)-1e-9)*100)/100:null}
g.MotoTudoNF=Object.freeze({pdf,xml,validate,validKey,findKey,group,br,norm,digits,round,cents,multiplier,costs,suggested});
})(typeof window==='undefined'?globalThis:window);
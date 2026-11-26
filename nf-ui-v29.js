(function(){
'use strict';
const N=MotoTudoNF,D=MotoTudoData, K={p:'mt_products',m:'mt_movements',s:'mt_suppliers',o:'mt_orders',cfg:'mt_settings',n:'mt_invoices',h:'mt_price_history',r:'mt_price_reviews'};
const keys=Object.values(K);
function assertCurrent(){const raw=D.rawSnapshot([K.p,K.m,K.s,K.cfg]);for(const [k,v] of [[K.p,products],[K.m,movements],[K.s,suppliers],[K.cfg,settings]]){if(raw[k]!==null&&JSON.stringify(D.read(k,Array.isArray(v)?[]:{}))!==JSON.stringify(v))throw Error('Dados atualizados em outra aba. Recarregue a página antes de continuar.');}}
const copy=x=>JSON.parse(JSON.stringify(x));
function matchInvoiceItem(ps,cnpj,supplier,item){
 const exact=ps.filter(p=>(Array.isArray(p.nfCodes)&&p.nfCodes.some(x=>x.cnpj===cnpj&&String(x.code)===String(item.code)))||(supplier&&Number(p.supplierId)===Number(supplier.id)&&String(p.code)===String(item.code)));
 if(exact.length===1)return {target:String(exact[0].id),product:exact[0],ambiguous:false};
 const possible=ps.filter(p=>String(p.code)===String(item.code)||N.norm(p.name)===N.norm(item.name)||(item.ean&&/^\d{8,14}$/.test(item.ean)&&String(p.ean||p.barcode||'')===item.ean));
 return {target:exact.length||possible.length?'':'NOVO',product:null,ambiguous:!!(exact.length||possible.length)};
}
function resolveProduct(ps,ref){const t=String(ref??'').trim();if(!t||t==='NOVO')return null;const exact=ps.filter(p=>String(p.id)===t);if(exact.length===1)return exact[0];const hits=ps.filter(p=>String(p.code)===t||N.norm(p.name)===N.norm(t));return hits.length===1?hits[0]:null}
const get=k=>D.read(k,[]);
const $=id=>document.getElementById(id);
const h=esc;
const btn=(id,text,primary=false)=>'<button type="button" id="'+id+'" class="'+(primary?'btn-gold':'btn-dark-soft')+'">'+text+'</button>';
const panel=(title,body,actions='')=>'<section class="panel page-panel nf-panel"><div class="panel-header"><div><span class="section-kicker">ENTRADAS FISCAIS</span><h2>'+title+'</h2></div>'+actions+'</div>'+body+'</section>';
const table=(head,body)=>'<div class="nf-scroll"><table class="nf-table"><thead><tr>'+head.map(t=>'<th>'+t+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table></div>';
const cell=v=>'<td>'+v+'</td>';
const row=v=>'<tr>'+v.map(cell).join('')+'</tr>';
const amount=v=>money(Number(v)||0);
const percent=v=>Number.isFinite(v)?(v*100).toFixed(1).replace('.',',')+'%':'—';
const date=v=>{try{return new Date(v).toLocaleString('pt-BR')}catch{return ''}};
const pending=()=>get(K.r).filter(r=>r.status==='pending');
const statusLabel=s=>({reversed:'Estornado',pending:'Pendente',accepted:'Aplicado',declined:'Mantido',superseded:'Substituído',created:'Cadastro inicial'})[s]||s;
const id=()=>crypto.randomUUID();
let draft=null, queue=[], busy=false, error='';

function priceComparison(oldCost,newCost,oldPrice,suggested){
 const number=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
 const metric=(cost,price)=>({cost,price,profit:cost!==null&&price!==null?N.round(price-cost):null,margin:cost!==null&&price!==null&&price>0?1-cost/price:null});
 const a=metric(number(oldCost),number(oldPrice)),b=metric(number(newCost),number(oldPrice)),s=metric(number(newCost),number(suggested));
 const change=(x,y)=>x!==null&&x>0&&y!==null?(y-x)/x:null;
 return {before:a,keep:b,suggest:s,costChange:change(a.cost,b.cost),priceChange:change(a.price,s.price)};
}
const compareMoney=v=>v===null?'—':amount(v);
const comparePercent=v=>v===null?'—':percent(v);
const signedPercent=v=>v===null?'—':(v>0?'+':'')+percent(v);
const deltaColor=v=>v===null||Math.abs(v)<1e-9?'nf-neutral':v>0?'nf-up':'nf-down';
function comparisonHtml(oldCost,newCost,oldPrice,suggested,target,compact=false){
 const v=priceComparison(oldCost,newCost,oldPrice,suggested),a=v.before,b=v.keep,s=v.suggest;
 const existing=a.cost!==null&&a.price!==null;
 const direction=v.priceChange===null?'Definir preço':v.priceChange>1e-9?'Sugestão: aumentar':v.priceChange< -1e-9?'Sugestão: reduzir':'Sugestão: manter';
 const costDir=v.costChange===null?'Novo custo':v.costChange>1e-9?'Custo aumentou':v.costChange< -1e-9?'Custo reduziu':'Custo sem alteração';
 const pp=m=>{if(a.margin===null||m===null)return '';const d=Math.round((m-a.margin)*1000)/10;return (d>0?'+':'')+d.toFixed(1).replace('.',',')+' p.p.'};
 const column=(title,m,kind)=>'<div class="nf-compare-column '+kind+'"><strong class="nf-compare-title">'+title+'</strong><div><small>Custo unitário</small><b>'+compareMoney(m.cost)+'</b></div><div><small>Preço de venda</small><b>'+compareMoney(m.price)+'</b></div><div><small>Margem bruta</small><b>'+comparePercent(m.margin)+'</b>'+(kind!=='before'&&existing?'<small>'+pp(m.margin)+'</small>':'')+'</div><div><small>Lucro bruto / un.</small><b class="'+(m.profit!==null&&m.profit<0?'nf-up':'')+'">'+compareMoney(m.profit)+'</b></div></div>';
 return '<div class="nf-comparison '+(compact?'nf-comparison-compact':'')+'"><div class="nf-compare-top"><span class="'+deltaColor(v.costChange)+'">'+costDir+(v.costChange===null?'':' • '+signedPercent(v.costChange))+'</span><span class="'+deltaColor(v.priceChange)+'">'+(existing?direction:'Venda inicial')+(v.priceChange===null?'':' • '+signedPercent(v.priceChange))+'</span></div><div class="nf-compare-grid '+(!existing?'nf-compare-new':'')+'">'+(existing?column('Antes da nota',a,'before')+column('Sem reajuste',b,'keep'):'')+column(existing?'Com reajuste':'Novo produto',s,'suggest')+'</div><small class="nf-compare-note">'+(Number.isFinite(target)?'Margem-alvo: '+percent(target)+' • ':'')+'Base: último custo de compra. Lucro bruto por unidade, antes de outras despesas.</small></div>';
}

function categoryFor(name){
 const s=N.norm(name);
 if(/CAPACETE|^CAP |RETROVISOR|MANOPLA/.test(s))return 'Capacetes e acessórios';
 if(/OLEO|MOBIL|LUBRIFICANTE|FLUIDO/.test(s))return 'Óleos e fluidos';
 if(/FREIO|PASTILHA|LONA/.test(s))return 'Freios';
 if(/RELACAO|CORRENTE|COROA|PINHAO|EMBREAGEM/.test(s))return 'Transmissão';
 if(/FAROL|BATERIA|PISCA|VELA|RELE/.test(s))return 'Elétrica';
 if(/PISTAO|CILINDRO|VALVULA|JUNTA/.test(s))return 'Motor';
 return 'Outras peças';
}
function issue(m){error=String(m.message||m);if(state.view==='nf-import')showImport();else toast('Operação não concluída',error,'danger')}
function readPdf(file){return new Promise(async(resolve,reject)=>{
 let frame,timeout,listener;
 function end(err,pages){clearTimeout(timeout);window.removeEventListener('message',listener);frame?.remove();err?reject(Error(err)):resolve(pages)}
 try{
  const bytes=await file.arrayBuffer(), token=id();
  frame=document.createElement('iframe');frame.hidden=true;frame.setAttribute('sandbox','allow-scripts');frame.title='Leitor fiscal isolado';
  listener=e=>{
   if(e.source!==frame.contentWindow||e.origin!=='null')return;
   if(e.data?.kind==='mt-pdf-ready'){frame.contentWindow.postMessage({kind:'mt-read-pdf',id:token,bytes},'*',[bytes]);}
   if(e.data?.kind==='mt-pdf-result'&&e.data.id===token){if(e.data.error)end(e.data.error);else end(null,e.data.pages)}
  };
  window.addEventListener('message',listener);timeout=setTimeout(()=>end('Leitura excedeu o tempo limite. Tente o XML.'),60000);
  frame.src='nf-reader-v29.html?v=29';document.body.append(frame);
 }catch(e){end(e.message)}
})}
async function nextFile(){
 if(busy||!queue.length)return;
 const f=queue.shift();busy=true;draft=null;error='';if(state.view==='nf-import')showImport();
 try{
  assertCurrent();if(f.size>15000000||f.size<=0)throw Error('Arquivo vazio ou acima de 15 MB.');
  let n;if(/\.xml$/i.test(f.name))n=N.xml(await f.text());else if(/\.pdf$/i.test(f.name)){const sig=await f.slice(0,5).text();if(sig!=='%PDF-')throw Error('Arquivo PDF inválido.');n=N.pdf(await readPdf(f));}else throw Error('Envie XML ou PDF.');
  if(get(K.n).some(x=>x.key===n.key))throw Error('Esta chave NF-e já consta no histórico. Não é possível importar novamente.');
  const cnpj=n.key.slice(6,20);
  const sup=suppliers.find(s=>N.digits(s.cnpj)===cnpj);
  const rows=n.lines.map(i=>{
   const m=matchInvoiceItem(products,cnpj,sup,i);
   const link=m.product?.nfCodes?.find(c=>c.cnpj===cnpj&&String(c.code)===i.code);
   return {item:i,target:m.target,factor:link?.factor??N.multiplier(i),category:categoryFor(i.name),name:i.name,margin:'',ambiguous:m.ambiguous};
  });
  draft={n,cnpj,supplierId:sup?String(sup.id):'new',supplierName:sup?.name||n.supplier,recipient:settings.nfRecipient||n.recipient||'',extra:0,margin:String(settings.nfDefaultMargin??''),categoryMargins:copy(settings.nfCategoryMargins||{}),verified:false,rows,expected:D.rawSnapshot(keys)};
 }catch(e){error=e.message}
 finally{busy=false;if(state.view==='nf-import')showImport()}
}
function showImport(){
 setHeader('Importar nota fiscal','Conferência de mercadorias e custos antes da entrada.');
 let body='<div class="nf-info">Os arquivos são lidos no navegador. Nenhuma quantidade ou preço muda até a confirmação. Prefira o XML quando disponível.</div>';
 if(error)body+='<div class="nf-error" role="alert">'+h(error)+'</div>';
 if(busy){appView.innerHTML=panel('Leitura de documento',body+'<div class="nf-loading">Lendo e conferindo a nota…</div>');return}
 if(!draft){
  body+='<div class="nf-upload"><i class="bi bi-cloud-arrow-up"></i><strong>Selecione notas fiscais</strong><input class="form-control-dark" id="nfFiles" type="file" accept=".pdf,.xml" multiple><small>PDF com texto ou XML NF-e • até 15 MB por arquivo • 50 páginas</small>'+btn('nfRead','Ler notas',true)+'</div>';
  if(queue.length)body+='<p>'+queue.length+' arquivo(s) na fila. '+btn('nfNext','Ler próxima nota')+'</p>';
  appView.innerHTML=panel('Importação segura',body);$('nfRead').onclick=()=>{const files=Array.from($('nfFiles').files||[]);if(!files.length)return issue('Selecione ao menos um arquivo.');queue=files;nextFile()};if($('nfNext'))$('nfNext').onclick=nextFile;return;
 }
 const d=draft,n=d.n;
 const supopts='<option value="new">Cadastrar fornecedor</option>'+suppliers.map(s=>'<option value="'+h(s.id)+'" '+(String(s.id)===d.supplierId?'selected':'')+'>'+h(s.name)+'</option>').join('');
 const defaultMarginFor=r=>{const raw=r.margin!==''?r.margin:(d.categoryMargins[r.category]!==undefined&&d.categoryMargins[r.category]!==''?d.categoryMargins[r.category]:d.margin);const x=Number(raw);return raw!==''&&Number.isFinite(x)&&x>=0&&x<100?x/100:null};
 const productOpts=products.map(p=>'<option value="'+h(p.id)+'">'+h(p.code+' • '+p.name)+'</option>').join('');
 const hasNew=d.rows.some(r=>r.target==='NOVO');
 const categoriesOpts=c=>categories.map(x=>'<option '+(x.name===c?'selected':'')+'>'+h(x.name)+'</option>').join('');
 body+='<div class="nf-kpis"><div><small>NF-e</small><strong>'+h(n.key.slice(25,34))+'</strong></div><div><small>Itens</small><strong>'+n.lines.length+'</strong></div><div><small>Mercadorias</small><strong>'+amount(n.prodTotal)+'</strong></div><div><small>Total da NF</small><strong>'+amount(n.nfTotal)+'</strong></div></div>';
 body+='<div class="nf-key">'+h(n.key)+' • '+h(n.date?n.date.split('-').reverse().join('/'):'Data de emissão não identificada')+' • '+h(n.source)+'</div>';
 body+='<div class="nf-simple-guide"><strong>Produtos novos já ficam prontos para cadastro.</strong><small>Revise apenas os vínculos duvidosos, as embalagens e a margem de venda dos novos produtos.</small></div><div class="nf-fields"><label>Fornecedor<select id="nfSupplier" class="form-select-dark">'+supopts+'</select></label><label>Nome do fornecedor<input class="form-control-dark" id="nfSupplierName" value="'+h(d.supplierName)+'" maxlength="150" '+(d.supplierId!=='new'?'disabled':'')+'></label><label>CNPJ da loja (destinatário)<input class="form-control-dark" id="nfRecipient" value="'+h(d.recipient)+'" placeholder="14 dígitos" '+(settings.nfRecipient?'readonly':'')+'></label><label>Frete adicional pago (R$)<input class="form-control-dark" id="nfExtra" type="number" min="0" step=".01" value="'+d.extra+'"></label><label>Margem de lucro dos novos produtos (%)<input class="form-control-dark" id="nfMargin" type="number" min="0" max="99" step=".1" value="'+h(d.margin)+'" placeholder="Ex.: 30" '+(hasNew?'required':'')+'></label></div>';
 if(hasNew)body+='<div class="nf-info nf-margin-help">Informe uma única margem para todos os novos produtos. Ex.: custo R$ 70,00 com margem de 30% = venda R$ 100,00. Produtos existentes conservam sua margem.</div>';
 body+='<details class="nf-margin-details"><summary>Margens padrão por categoria (opcional)</summary><div class="nf-fields">'+categories.map((cat,i)=>'<label>'+h(cat.name)+' (%)<input type="number" min="0" max="99.9" step=".1" class="form-control-dark" data-nf-cat-margin="'+i+'" value="'+h(d.categoryMargins[cat.name]??'')+'" placeholder="Usar margem geral"></label>').join('')+'</div></details>';
 if(n.externalFreightHint)body+='<div class="nf-warn">A nota menciona frete por conta do destinatário. Informe somente o valor efetivamente pago, se não estiver incluído no total.</div>';
 body+='<div class="nf-info">Destinatário lido: '+h(n.recipient||'não identificado')+'. Custo bruto de aquisição calculado pelo total da nota, com ajustes rateados; confira tributos recuperáveis com o contador. Pares e kits são mantidos como unidade de venda; caixas precisam de conversão confirmada.</div>';
 body+='<datalist id="nfProducts">'+productOpts+'</datalist><div class="nf-toolbar nf-import-tools">'+btn('nfAllNew','Cadastrar novos não ambíguos')+btn('nfClear','Ver itens a conferir')+btn('nfConfirmTop','Conferir e confirmar',true)+'<span id="nfSummary"></span></div>';
 let costs;try{costs=N.costs(n,Number(d.extra)||0)}catch{costs=n.lines.map(()=>0)}
 body+='<div class="nf-filterbar"><input class="form-control-dark" id="nfSearchItems" placeholder="Buscar produto ou código"><select class="form-select-dark" id="nfItemFilter"><option value="all">Todos os produtos</option><option value="attention">Atenção necessária</option><option value="new">Novos produtos</option><option value="linked">Já cadastrados</option><option value="up">Custo aumentou</option><option value="down">Custo reduziu</option></select></div><div class="nf-item-list">';
 body+=d.rows.map((r,i)=>{
  const p=resolveProduct(products,r.target),fact=r.factor??'',needs=(!p&&r.target!=='NOVO')||!fact;
  const details='<div class="nf-item-fields"><label>Descrição<input class="form-control-dark nf-name" data-i="'+i+'" data-f="name" value="'+h(r.name)+'"></label><label>Destino<select class="form-select-dark" data-i="'+i+'" data-nf-mode><option value="NOVO" '+(r.target==='NOVO'?'selected':'')+'>Cadastrar novo produto</option><option value="link" '+(r.target&&r.target!=='NOVO'?'selected':'')+'>Vincular a produto existente</option><option value="" '+(!r.target?'selected':'')+'>Revisar vínculo</option></select></label><label data-nf-linkbox="'+i+'" '+(r.target==='NOVO'?'hidden':'')+'>Produto existente<input class="form-control-dark nf-target" data-i="'+i+'" data-f="target" list="nfProducts" value="'+h(r.target==='NOVO'?'':r.target)+'" placeholder="Digite código ou nome do produto"></label><label>Unidades por embalagem<input class="form-control-dark nf-factor" data-i="'+i+'" data-f="factor" type="number" min="1" max="10000" step="1" value="'+h(fact)+'"></label><label>Categoria<select class="form-select-dark nf-category" data-i="'+i+'" data-f="category">'+categoriesOpts(r.category)+'</select></label><label>Margem individual (opcional)<input class="form-control-dark" data-i="'+i+'" data-f="margin" type="number" min="0" max="99.9" step=".1" value="'+h(r.margin)+'" placeholder="Usar padrão" '+(p?'disabled':'')+'></label></div>';
  return '<details class="nf-item" data-nf-card="'+i+'" '+(needs?'open':'')+'><summary><div class="nf-item-heading"><small>'+h(r.item.code)+' • '+h(r.item.unit)+' × '+r.item.qty+'</small><strong>'+h(r.name)+'</strong><span data-nf-match="'+i+'" class="nf-item-status"></span></div><div class="nf-item-values"><small data-nf-qty="'+i+'"></small><strong data-nf-cost="'+i+'">'+(fact?amount(costs[i]/(r.item.qty*fact)):'—')+'</strong><small data-nf-stock="'+i+'"></small><small data-nf-sale="'+i+'"></small></div><i class="bi bi-chevron-down nf-item-arrow"></i><div class="nf-item-comparison" data-nf-compare="'+i+'"></div></summary>'+details+'</details>';
 }).join('')+'</div>';
 body+='<input type="checkbox" id="nfVerified" hidden>';
 body+='<div class="nf-toolbar">'+btn('nfCancel','Descartar prévia')+btn('nfConfirm','Confirmar entrada',true)+(queue.length?'<small>'+queue.length+' arquivo(s) aguardando</small>':'')+'</div>';
 appView.innerHTML=panel('Conferência de entrada',body);
 $('nfSupplier').value=d.supplierId;$('nfSupplier').onchange=e=>{d.supplierId=e.target.value;const s=suppliers.find(x=>String(x.id)===d.supplierId);if(s){d.supplierName=s.name;d.rows.forEach(r=>{const m=matchInvoiceItem(products,d.cnpj,s,r.item);if(m.product||!r.target||r.target==='NOVO'){r.target=m.target;r.ambiguous=m.ambiguous}})}d.verified=false;showImport()};
 $('nfSupplierName').oninput=e=>{d.supplierName=e.target.value;d.verified=false;$('nfVerified').checked=false};
 $('nfRecipient').oninput=e=>{d.recipient=e.target.value;d.verified=false;$('nfVerified').checked=false};
 $('nfMargin').oninput=e=>{d.margin=e.target.value;d.verified=false;$('nfVerified').checked=false;refresh()};
 appView.querySelectorAll('[data-nf-cat-margin]').forEach(el=>el.oninput=e=>{d.categoryMargins[categories[Number(e.target.dataset.nfCatMargin)].name]=e.target.value;d.verified=false;$('nfVerified').checked=false;refresh()});
 $('nfExtra').oninput=e=>{d.extra=e.target.value;d.verified=false;$('nfVerified').checked=false;refresh()};
 $('nfVerified').onchange=e=>d.verified=e.target.checked;
 appView.querySelectorAll('[data-f]').forEach(el=>el.oninput=e=>{const t=e.target,r=d.rows[Number(t.dataset.i)];r[t.dataset.f]=t.value;d.verified=false;$('nfVerified').checked=false;refresh()});
 appView.querySelectorAll('[data-nf-mode]').forEach(el=>el.onchange=e=>{const i=Number(e.target.dataset.i),r=d.rows[i],v=e.target.value;r.target=v==='NOVO'?'NOVO':'';const input=appView.querySelector('[data-i="'+i+'"][data-f="target"]');input.value='';appView.querySelector('[data-nf-linkbox="'+i+'"]').hidden=v==='NOVO';d.verified=false;$('nfVerified').checked=false;refresh();if(v==='link')input.focus()});
 $('nfSearchItems').oninput=refresh;$('nfItemFilter').onchange=refresh;
 $('nfAllNew').onclick=()=>{d.rows.forEach(r=>{if(!r.target&&!r.ambiguous)r.target='NOVO'});d.verified=false;showImport()};
 $('nfClear').onclick=()=>{$('nfItemFilter').value='attention';$('nfSearchItems').value='';refresh()};
 $('nfCancel').onclick=()=>{draft=null;error='';showImport()};
 function showEntryError(e){
  error=e.message;const banner=document.createElement('div');banner.className='nf-error';banner.setAttribute('role','alert');banner.textContent=error;const old=appView.querySelector('.nf-error');if(old)old.remove();appView.querySelector('.nf-panel .panel-header').after(banner);
  const missingMargin=d.rows.some(r=>r.target==='NOVO'&&defaultMarginFor(r)===null);
  if(missingMargin){$('nfMargin').scrollIntoView({block:'center',behavior:'smooth'});$('nfMargin').focus()}
  else{const row=appView.querySelector('.nf-item[data-needs="true"]');if(row){row.hidden=false;row.open=true;row.scrollIntoView({block:'center',behavior:'smooth'})}else banner.scrollIntoView({block:'center',behavior:'smooth'})}
  toast('Confira a entrada',error,'danger');
 }
 function requestConfirm(){
  try{
   if(d.rows.some(r=>r.target==='NOVO'&&defaultMarginFor(r)===null))throw Error('Informe a margem de lucro padrão dos novos produtos, uma única vez.');
   if(d.rows.some(r=>!resolveProduct(products,r.target)&&r.target!=='NOVO'))throw Error('Existem produtos com possível duplicidade. Selecione o produto existente ou confirme o novo cadastro.');
   if(d.rows.some(r=>!Number.isInteger(Number(r.factor))||Number(r.factor)<1||!Number.isSafeInteger(r.item.qty*Number(r.factor))))throw Error('Confira as unidades por embalagem dos itens destacados.');
   if(!n.recipient||N.digits(d.recipient)!==N.digits(n.recipient))throw Error('O CNPJ do destinatário não confere. Confira os dados da nota.');
   if(d.supplierId==='new'&&!d.supplierName.trim())throw Error('Informe o nome do fornecedor.');
   if(!Number.isFinite(Number(d.extra))||Number(d.extra)<0)throw Error('Frete adicional inválido.');
   const newCount=d.rows.filter(r=>r.target==='NOVO').length;
   const selectedSupplier=suppliers.find(s=>String(s.id)===d.supplierId);
   openModal('Confirmar entrada da NF-e','<div class="nf-kpis"><div><small>Novos cadastros</small><strong>'+newCount+'</strong></div><div><small>Produtos existentes</small><strong>'+(d.rows.length-newCount)+'</strong></div><div><small>Valor da nota</small><strong>'+amount(n.nfTotal)+'</strong></div></div><p>'+h(selectedSupplier?.name||d.supplierName)+' • '+h(n.key.slice(25,34))+'</p><div class="nf-info">Estoque e custos serão atualizados. Preços de venda existentes só mudam se você aprovar os reajustes.</div><label class="nf-check"><input type="checkbox" id="nfFinalVerified"> Conferi o destinatário, recebimento, embalagens, produtos, custos e a autorização fiscal. Esta nota ainda não foi lançada.</label>',btn('nfBack','Voltar')+btn('nfSaveEntry','Registrar entrada',true));
   $('nfBack').onclick=closeModal;$('nfSaveEntry').onclick=()=>{
    if(!$('nfFinalVerified').checked){toast('Confirme a conferência','Marque a confirmação para registrar.','danger');return;}
    d.verified=true;closeModal();try{confirmEntry()}catch(e){d.verified=false;showEntryError(e)}
   };
  }catch(e){showEntryError(e)}
 }
 $('nfConfirm').onclick=requestConfirm;$('nfConfirmTop').onclick=requestConfirm;
 refresh();
 function refresh(){
  let costs;try{costs=N.costs(n,Number(d.extra)||0)}catch{costs=n.lines.map(()=>0)}
  let unresolved=0,newCount=0,linked=0;const q=N.norm($('nfSearchItems').value),filter=$('nfItemFilter').value;d.rows.forEach((r,i)=>{
   const p=resolveProduct(products,r.target),fact=Number(r.factor),qty=r.item.qty*fact;
   const qtyEl=appView.querySelector('[data-nf-qty="'+i+'"]'),match=appView.querySelector('[data-nf-match="'+i+'"]'),cost=appView.querySelector('[data-nf-cost="'+i+'"]');
   qtyEl.textContent=fact>0?qty+' no estoque':'Conferir';match.textContent=p?'Já cadastrado: '+p.name:r.target==='NOVO'?'Novo produto':'Vínculo a conferir';match.dataset.state=p?'linked':r.target==='NOVO'?'new':'attention';cost.textContent=fact>0?amount(costs[i]/qty):'—';
   const stockEl=appView.querySelector('[data-nf-stock="'+i+'"]'),saleEl=appView.querySelector('[data-nf-sale="'+i+'"]');const marginInput=appView.querySelector('[data-i="'+i+'"][data-f="margin"]');if(marginInput)marginInput.disabled=!!p;
   const prev=Number(p?.lastPurchaseCost??p?.cost),price=Number(p?.price),m=p?(Number.isFinite(p.targetMargin)&&p.targetMargin>=0&&p.targetMargin<1?p.targetMargin:(prev>0&&price>=prev?1-prev/price:null)):defaultMarginFor(r);const suggest=fact>0?N.suggested(N.round(costs[i]/qty),m):null;
   if(stockEl)stockEl.textContent=p?'Estoque: '+p.stock+' → '+(Number(p.stock)+qty):r.target==='NOVO'?'Estoque inicial: '+qty:'Vínculo pendente';if(saleEl)saleEl.textContent=suggest===null?'Margem a definir':(p?'Venda sugerida: ':'Venda inicial: ')+amount(suggest)+' ('+percent(m)+')'+(!p&&newCostForDisplay()!==null?' • Lucro '+amount(N.round(suggest-newCostForDisplay())):'');function newCostForDisplay(){return fact>0&&Number.isFinite(qty)&&qty>0?N.round(costs[i]/qty):null}
   const newCost=fact>0&&Number.isFinite(qty)&&qty>0?N.round(costs[i]/qty):null;
   const comparison=priceComparison(p?prev:null,newCost,p?price:null,suggest);
   const compareEl=appView.querySelector('[data-nf-compare="'+i+'"]');
   if(compareEl){compareEl.hidden=!p;compareEl.innerHTML=p?comparisonHtml(prev,newCost,price,suggest,m):'';}
   if(p&&newCost!==null&&comparison.costChange!==null&&comparison.costChange!==0)cost.textContent=amount(prev)+' → '+amount(newCost)+' ('+signedPercent(comparison.costChange)+')';
   const need=(!p&&r.target!=='NOVO')||!(fact>=1&&Number.isInteger(fact)&&Number.isSafeInteger(qty))||(r.target==='NOVO'&&m===null);if(need)unresolved++;if(p)linked++;if(r.target==='NOVO')newCount++;const card=appView.querySelector('[data-nf-card="'+i+'"]');card.dataset.needs=String(need);card.hidden=!N.norm(r.name+' '+r.item.code).includes(q)||(filter==='attention'&&!need)||(filter==='new'&&r.target!=='NOVO')||(filter==='linked'&&!p)||(filter==='up'&&(!p||!(comparison.costChange>0)))||(filter==='down'&&(!p||!(comparison.costChange<0)));
  });$('nfSummary').textContent=newCount+' novos • '+linked+' vinculados • '+unresolved+' a conferir';
 }
}
function snapshotOrderCosts(os,ps){
 for(const o of os)if(o.type==='out'&&o.status!=='pending')for(const i of o.items||[])if(i.unitCostSnapshot==null){const p=ps.find(p=>String(p.id)===String(i.productId));if(p){i.unitCostSnapshot=Number(p.cost)||0;i.costSnapshotEstimated=true}}
}
function confirmEntry(){
 assertCurrent();const d=draft,n=N.validate(d.n);if(n.key.slice(6,20)!==d.cnpj)throw Error('Emitente divergente da chave da nota.');if(!d.verified)throw Error('Confirme a conferência física e fiscal.');
 if(!/^\d{14}$/.test(N.digits(d.recipient))||!n.recipient||N.digits(d.recipient)!==N.digits(n.recipient))throw Error('O CNPJ do destinatário não confere. Use XML se não foi identificado.');
 if(settings.nfRecipient&&N.digits(settings.nfRecipient)!==N.digits(d.recipient))throw Error('O CNPJ não corresponde à loja já configurada.');
 const extra=Number(d.extra);if(!Number.isFinite(extra)||extra<0)throw Error('Frete inválido.');
 if(get(K.n).some(x=>x.key===n.key))throw Error('Nota já importada.');
 const ps=copy(products),ss=copy(suppliers),ms=copy(movements),os=copy(D.read(K.o,orders)),hist=get(K.h),reviews=get(K.r),notes=get(K.n),cfg=copy(settings);
 const seen=new Set(),newCodes=new Set(),now=new Date().toISOString(),batchId=id();
 let supplier=ss.find(s=>String(s.id)===d.supplierId);
 if(supplier){if(supplier.cnpj&&N.digits(supplier.cnpj)!==d.cnpj)throw Error('Fornecedor selecionado tem CNPJ diferente.');supplier.cnpj=d.cnpj}
 else if(d.supplierId==='new'){if(!d.supplierName.trim())throw Error('Informe o nome do fornecedor.');if(ss.some(s=>N.digits(s.cnpj)===d.cnpj))throw Error('Fornecedor já cadastrado. Selecione-o.');supplier={id:Math.max(0,...ss.map(s=>Number(s.id)||0))+1,name:d.supplierName.trim(),cnpj:d.cnpj,contact:'',city:'',categories:''};ss.push(supplier)}
 else throw Error('Fornecedor inválido.');
 if(ss.filter(s=>N.digits(s.cnpj)===d.cnpj).length!==1)throw Error('CNPJ de fornecedor duplicado.');
 snapshotOrderCosts(os,ps);
 let nextId=Math.max(Date.now(),...ps.map(p=>Number(p.id)||0))+1, moveId=Math.max(nextId,...ms.map(m=>Number(m.id)||0))+1, orderId=Math.max(moveId,...os.map(o=>Number(o.id)||0))+1;
 const costs=N.costs(n,extra),items=[],records=[];let changes=0;
 for(let k=0;k<d.rows.length;k++){
  const r=d.rows[k],i=r.item,factor=Number(r.factor),qty=i.qty*factor;
  if(!Number.isInteger(factor)||factor<1||factor>10000||!Number.isSafeInteger(qty)||qty<=0||qty>1000000)throw Error('Quantidade/conversão inválida: '+i.code);
  if(!r.name.trim())throw Error('Nome ausente: '+i.code);
  if(newCodes.has(i.code))throw Error('Código repetido na nota: '+i.code+'. Revise no XML antes de importar.');newCodes.add(i.code);
  const purchase=N.round(costs[k]/qty);if(purchase<=0)throw Error('Custo unitário zerado: '+i.code);
  let p=resolveProduct(ps,r.target),isNew=r.target==='NOVO',before;
  if(isNew){
   if(ps.some(p=>p.nfCodes?.some(x=>x.cnpj===d.cnpj&&x.code===i.code)||Number(p.supplierId)===Number(supplier.id)&&String(p.code)===i.code))throw Error('Produto já cadastrado com esse código: '+i.code);
   const rawMargin=r.margin!==''?r.margin:(d.categoryMargins[r.category]!==undefined&&d.categoryMargins[r.category]!==''?d.categoryMargins[r.category]:d.margin);const margin=Number(rawMargin)/100;if(rawMargin===''||!Number.isFinite(margin)||margin<0||margin>=1)throw Error('Informe a margem inicial de '+r.name+'.');
   const internalCode=d.cnpj+'-'+i.code;
   if(ps.some(x=>x.code===internalCode))throw Error('Código interno já existente: '+internalCode);
   p={id:nextId++,name:r.name.trim(),code:internalCode,brand:'',application:'',location:'',category:r.category,supplierId:supplier.id,stock:0,min:0,cost:purchase,price:N.suggested(purchase,margin),active:true,targetMargin:margin,nfCodes:[],stockUnit:factor>1?'UN':i.unit};ps.push(p);before=null;
  }else{
   if(!p)throw Error('Vincule ou cadastre: '+i.code);
   before=copy(p);
   if(p.nfCodes?.some(x=>x.cnpj===d.cnpj&&x.code!==i.code))throw Error('Produto já associado a outro código do fornecedor: '+p.name);
   if(p.stockUnit&&p.stockUnit!==(factor>1?'UN':i.unit)&&!( ['PC','UN'].includes(p.stockUnit)&&['PC','UN'].includes(i.unit)))throw Error('Unidade de estoque incompatível: '+p.name);
  }
  if(seen.has(p.id))throw Error('Duas linhas vinculadas ao mesmo produto. Confira os códigos.');seen.add(p.id);
  const oldStock=Number(p.stock),oldCost=Number(p.cost),oldPurchase=Number(p.lastPurchaseCost??p.cost),oldPrice=Number(p.price);
  if(![oldStock,oldCost,oldPurchase,oldPrice].every(v=>Number.isFinite(v)&&v>=0))throw Error('Cadastro existente inválido: '+p.name);
  const margin=Number.isFinite(p.targetMargin)&&p.targetMargin>=0&&p.targetMargin<1?p.targetMargin:oldPrice>0&&oldPurchase>0&&oldPrice>=oldPurchase?1-oldPurchase/oldPrice:null;
  p.cost=N.round((oldStock*oldCost+costs[k])/(oldStock+qty));p.lastPurchaseCost=purchase;p.stock=oldStock+qty;
  if(margin!==null)p.targetMargin=margin;
  if(!p.stockUnit)p.stockUnit=factor>1?'UN':i.unit;
  p.nfCodes=Array.isArray(p.nfCodes)?p.nfCodes:[];
  if(!p.nfCodes.some(x=>x.cnpj===d.cnpj&&x.code===i.code))p.nfCodes.push({cnpj:d.cnpj,code:i.code,factor,unit:i.unit});
  else {const link=p.nfCodes.find(x=>x.cnpj===d.cnpj&&x.code===i.code);if(link.factor!==factor||link.unit!==i.unit)throw Error('Conversão diferente da última entrada: '+p.name);}
  const suggested=N.suggested(purchase,margin);
  if(!isNew&&Math.abs(oldPurchase-purchase)>.00001)for(const rev of reviews)if(rev.productId===p.id&&rev.status==='pending'){rev.status='superseded';rev.decidedAt=now}
  if(!isNew&&Math.abs(oldPurchase-purchase)>.00001){changes++;reviews.unshift({id:id(),batchId,productId:p.id,name:p.name,oldCost:oldPurchase,newCost:purchase,oldPrice,suggested,margin,status:'pending',date:now})}
  hist.unshift({id:id(),batchId,productId:p.id,name:p.name,date:now,source:'NF-e',oldCost:isNew?null:oldPurchase,newCost:purchase,oldPrice:isNew?null:oldPrice,newPrice:p.price,oldAverage:isNew?null:oldCost,newAverage:p.cost,kind:isNew?'created':'purchase'});
  const movement={id:moveId++,type:'in',productId:p.id,product:p.name,qty,unit:purchase,location:p.location||'',date:now,note:'Entrada NF-e '+n.key.slice(25,34),orderId,orderCode:'NF-'+n.key.slice(6,20)+'-'+n.key.slice(25,34),invoiceId:batchId};
  ms.unshift(movement);items.push({productId:p.id,product:p.name,qty,unit:purchase,unitCostSnapshot:purchase,location:p.location||'',invoiceLineTotal:costs[k]});
  records.push({code:i.code,name:i.name,qtyFiscal:i.qty,unit:i.unit,factor,qty,productId:p.id,total:i.total,cost:purchase,allocated:costs[k],stockBefore:oldStock,stockAfter:p.stock,before,after:copy(p)});
 }
 cfg.nfRecipient=N.digits(d.recipient);
 cfg.nfCategoryMargins={};for(const cat of categories){const raw=d.categoryMargins[cat.name];if(raw===undefined||raw==='')continue;const x=Number(raw);if(!Number.isFinite(x)||x<0||x>=100)throw Error('Margem da categoria inválida: '+cat.name);cfg.nfCategoryMargins[cat.name]=x;}if(d.margin!==''){const x=Number(d.margin);if(!Number.isFinite(x)||x<0||x>=100)throw Error('Margem geral inválida.');cfg.nfDefaultMargin=x;}else delete cfg.nfDefaultMargin;
 const orderCode='NF-'+n.key.slice(6,20)+'-'+n.key.slice(25,34);
 os.unshift({id:orderId,code:orderCode,type:'in',date:now,name:supplier.name,note:'Entrada por NF-e',payment:'',labor:0,status:'completed',items,invoiceId:batchId});
 notes.unshift({id:batchId,key:n.key,date:n.date,receivedAt:now,supplier:supplier.name,cnpj:d.cnpj,source:n.source,total:n.nfTotal,productTotal:n.prodTotal,extra,lines:records,orderId,status:'imported',costChanges:changes});
 D.atomicWrite({[K.p]:ps,[K.s]:ss,[K.m]:ms,[K.o]:os,[K.cfg]:cfg,[K.n]:notes,[K.h]:hist,[K.r]:reviews},d.expected);
 products=ps;suppliers=ss;movements=ms;orders=os;settings=cfg;draft=null;error='';render();
 toast('Nota importada',records.length+' linhas registradas com segurança local.','success');
 if(changes)showChanges(changes,batchId);
}
function showChanges(count,batchId){
 const r=pending().filter(x=>!batchId||x.batchId===batchId),up=r.filter(x=>x.newCost>x.oldCost).length,down=r.filter(x=>x.newCost<x.oldCost).length;
 openModal('Alterações de custo detectadas','<div class="nf-kpis"><div><small>Custos maiores</small><strong class="nf-up">'+up+'</strong></div><div><small>Custos menores</small><strong class="nf-down">'+down+'</strong></div></div><p>'+r.length+' produto(s) com novo custo. Compare as margens e o lucro antes de decidir. Nenhum preço de venda foi alterado.</p><div class="nf-popup-comparisons">'+r.slice(0,5).map(x=>'<article class="nf-review-card"><h4>'+h(x.name)+'</h4>'+comparisonHtml(x.oldCost,x.newCost,x.oldPrice,x.suggested,x.margin,true)+'</article>').join('')+'</div>'+(r.length>5?'<p class="nf-info">Mais '+(r.length-5)+' produtos na central de reajustes.</p>':''),'<button class="btn-dark-soft" id="nfStockAlerts">Alertas de estoque</button><button class="btn-dark-soft" id="nfLater">Decidir depois</button><button class="btn-gold" id="nfReviewNow">Ver todos e decidir</button>');
 $('nfStockAlerts').onclick=()=>{closeModal();oldAlerts()};$('nfLater').onclick=closeModal;$('nfReviewNow').onclick=()=>{closeModal();navigate('nf-reviews')};
}
function showReviews(){
 setHeader('Reajustes de preços','Aumentos e reduções aguardando aprovação.');
 const all=get(K.r),r=all.filter(x=>x.status==='pending'),up=r.filter(x=>x.newCost>x.oldCost).length;
 let body='<div class="nf-kpis"><div><small>Pendentes</small><strong>'+r.length+'</strong></div><div><small>Aumentos</small><strong class="nf-up">'+up+'</strong></div><div><small>Reduções</small><strong class="nf-down">'+(r.length-up)+'</strong></div></div>';
 body+='<div class="nf-info">O custo médio e a entrada já foram registrados. A sugestão de venda usa o último custo de aquisição e a margem-alvo anterior.</div>';
 if(r.length)body+='<div class="nf-filterbar"><input class="form-control-dark" id="nfReviewSearch" placeholder="Buscar produto"><select class="form-select-dark" id="nfReviewFilter"><option value="all">Todos os reajustes</option><option value="up">Aumentos de custo</option><option value="down">Reduções de custo</option></select></div><div class="nf-toolbar">'+btn('nfSelectAll','Selecionar visíveis')+btn('nfUnselect','Limpar seleção')+btn('nfApply','Aplicar selecionados',true)+btn('nfKeep','Manter selecionados')+'<span id="nfReviewSelected">0 selecionados</span></div><div class="nf-review-list">'+r.map(x=>'<article class="nf-review-card" data-nf-review-card="'+h(x.id)+'"><label class="nf-review-title"><input type="checkbox" data-nf-review="'+h(x.id)+'"><strong>'+h(x.name)+'</strong></label><div data-nf-review-compare="'+h(x.id)+'">'+comparisonHtml(x.oldCost,x.newCost,x.oldPrice,x.suggested,x.margin)+'</div>'+(x.suggested===null?'<label class="nf-manual-price">Definir novo preço<input type="number" min="0.01" step=".01" class="form-control-dark" data-nf-manual="'+h(x.id)+'" placeholder="Novo preço"></label>':'')+'</article>').join('')+'</div>';

 else body+='<div class="empty-state"><strong>Nenhum reajuste pendente</strong></div>';
 appView.innerHTML=panel('Aprovação de preços',body);
 if(!r.length)return;
 function selectionCount(){$('nfReviewSelected').textContent=appView.querySelectorAll('[data-nf-review]:checked').length+' selecionados'}
 function filterReviews(){const q=N.norm($('nfReviewSearch').value),f=$('nfReviewFilter').value;appView.querySelectorAll('[data-nf-review-card]').forEach(card=>{const x=r.find(v=>v.id===card.dataset.nfReviewCard);card.hidden=!N.norm(x.name).includes(q)||(f==='up'&&x.newCost<=x.oldCost)||(f==='down'&&x.newCost>=x.oldCost);if(card.hidden)card.querySelector('[data-nf-review]').checked=false});selectionCount()}
 $('nfReviewSearch').oninput=filterReviews;$('nfReviewFilter').onchange=filterReviews;
 $('nfSelectAll').onclick=()=>{appView.querySelectorAll('[data-nf-review-card]:not([hidden]) [data-nf-review]').forEach(e=>e.checked=true);selectionCount()};
 $('nfUnselect').onclick=()=>{appView.querySelectorAll('[data-nf-review]').forEach(e=>e.checked=false);selectionCount()};
 appView.querySelectorAll('[data-nf-review]').forEach(e=>e.onchange=selectionCount);
 appView.querySelectorAll('[data-nf-manual]').forEach(e=>e.oninput=()=>{const x=r.find(v=>v.id===e.dataset.nfManual),p=e.value!==''&&Number.isFinite(Number(e.value))&&Number(e.value)>0?Number(e.value):null;const target=appView.querySelector('[data-nf-review-compare="'+x.id+'"]');target.innerHTML=comparisonHtml(x.oldCost,x.newCost,x.oldPrice,p,x.margin)});
 const expected=D.rawSnapshot([K.p,K.r,K.h]);
 function decide(apply){
  try{
   assertCurrent();const selected=Array.from(appView.querySelectorAll('[data-nf-review]:checked')).map(e=>e.dataset.nfReview);if(!selected.length)throw Error('Selecione os reajustes.');
   const ps=copy(products),rev=get(K.r),hist=get(K.h),now=new Date().toISOString();
   for(const rid of selected){
    const x=rev.find(z=>z.id===rid&&z.status==='pending');if(!x)throw Error('Reajuste desatualizado.');
    const p=ps.find(p=>p.id===x.productId);if(!p||Number(p.price)!==x.oldPrice||Number(p.lastPurchaseCost)!==x.newCost)throw Error('Produto alterado desde a sugestão: '+x.name+'. Revise antes de aplicar.');
    if(apply){
     const price=x.suggested===null?Number(appView.querySelector('[data-nf-manual="'+rid+'"]')?.value):x.suggested;
     if(!Number.isFinite(price)||price<=0||price<x.newCost)throw Error('Preço inválido ou abaixo do custo: '+x.name);
     hist.unshift({id:id(),batchId:x.batchId,productId:p.id,name:p.name,date:now,source:'Reajuste NF-e',kind:'sale-price',oldCost:x.newCost,newCost:x.newCost,oldPrice:p.price,newPrice:price});
     p.price=price;if(x.margin===null)p.targetMargin=1-x.newCost/price;x.status='accepted';x.appliedPrice=price;
    }else{x.status='declined';hist.unshift({id:id(),batchId:x.batchId,productId:p.id,name:p.name,date:now,source:'Preço mantido',kind:'declined',oldCost:x.newCost,newCost:x.newCost,oldPrice:p.price,newPrice:p.price})}
    x.decidedAt=now;
   }
   D.atomicWrite({[K.p]:ps,[K.r]:rev,[K.h]:hist},expected);products=ps;render();toast('Reajustes registrados',selected.length+' decisão(ões) salva(s).','success');
  }catch(e){toast('Reajustes não salvos',e.message,'danger')}
 }
 $('nfApply').onclick=()=>decide(true);$('nfKeep').onclick=()=>decide(false);
}
function showNotes(){
 setHeader('Notas importadas','Histórico de entradas e prevenção de duplicidade.');
 const notes=get(K.n);
 appView.innerHTML=panel('Notas fiscais',notes.length?table(['Nota / fornecedor','Entrada','Itens','Total','Situação','Detalhes'],notes.map(n=>row(['<strong>'+h(n.key.slice(25,34))+'</strong><small>'+h(n.supplier)+'</small>',h(date(n.receivedAt)),n.lines.length,amount(n.total),n.status==='reversed'?'Estornada':'Importada','<button class="btn-dark-soft" data-nf-note="'+h(n.id)+'">Ver nota</button>'])).join('')):'<div class="empty-state"><strong>Nenhuma nota importada</strong></div>','<div class="nf-toolbar">'+btn('nfBackup','Exportar backup')+btn('nfGo','Nova importação',true)+'</div>');
 $('nfBackup').onclick=backup;
 $('nfGo').onclick=()=>navigate('nf-import');
 appView.querySelectorAll('[data-nf-note]').forEach(b=>b.onclick=()=>{const n=notes.find(x=>x.id===b.dataset.nfNote);if(!n)return;openModal('Nota '+n.key.slice(25,34),'<div class="nf-key">'+h(n.key)+'</div><p>'+h(n.supplier)+' • '+amount(n.total)+' • Frete extra '+amount(n.extra)+'</p>'+table(['Código','Produto','Quantidade fiscal','Entrada','Custo unitário'],n.lines.map(i=>row([h(i.code),h(i.name),i.qtyFiscal+' '+h(i.unit),i.qty,amount(i.cost)])).join('')),(n.status==='imported'&&n.lines.every(i=>i.after)?btn('nfReverse','Estornar entrada'):'')+btn('nfCloseNote','Fechar'));$('nfCloseNote').onclick=closeModal;if($('nfReverse'))$('nfReverse').onclick=()=>{closeModal();askReverse(n)}});
}

function backup(){
 const snapshot=D.snapshot();
 const file=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download='moto-tudo-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function askReverse(n){
 const expected=D.rawSnapshot(keys);
 openModal('Estornar entrada fiscal','<div class="nf-warn">O estorno só é permitido se todos os produtos continuarem exatamente como ficaram após esta nota, sem movimentações posteriores, alterações de preço ou novas vendas. O histórico e a chave da nota serão preservados.</div><label class="nf-check"><input type="checkbox" id="nfReverseOk"> Confirmo que esta entrada precisa ser desfeita.</label>',btn('nfReverseCancel','Cancelar')+btn('nfReverseConfirm','Estornar',true));
 $('nfReverseCancel').onclick=closeModal;$('nfReverseConfirm').onclick=()=>{
  try{
   assertCurrent();if(!$('nfReverseOk').checked)throw Error('Confirme o estorno.');
   const ps=copy(products),ms=copy(movements),os=copy(D.read(K.o,orders)),notes=get(K.n),hist=get(K.h),rev=get(K.r),now=new Date().toISOString();
   const note=notes.find(x=>x.id===n.id&&x.status==='imported');if(!note)throw Error('Entrada não disponível.');
   const originMoves=ms.filter(m=>m.invoiceId===n.id);if(originMoves.length!==note.lines.length||!os.some(o=>o.id===note.orderId&&o.invoiceId===n.id))throw Error('Movimentos originais foram alterados.');
   const started=Date.parse(note.receivedAt);
   for(const i of note.lines){
    const p=ps.find(x=>x.id===i.productId);
    if(!p||JSON.stringify(p)!==JSON.stringify(i.after))throw Error('Produto mudou após a entrada: '+i.name);
    const om=originMoves.find(m=>m.productId===i.productId);
    if(!om||ms.some(m=>m.productId===i.productId&&m.invoiceId!==n.id&&(Date.parse(m.date)>=started||Number(m.id)>=Number(om.id))))throw Error('Movimentação posterior: '+i.name);
    if(os.some(o=>o.id!==note.orderId&&(o.items||[]).some(it=>it.productId===i.productId)&&(!i.before||o.status==='pending'||Date.parse(o.updatedAt||o.completedAt||o.date)>=started)))throw Error('Pedido relacionado impede o estorno: '+i.name);
    if(rev.some(r=>r.productId===p.id&&r.batchId!==n.id&&r.status==='superseded'&&Date.parse(r.decidedAt)>=started))throw Error('Há reajustes de outra entrada vinculados: '+i.name);
    if(rev.some(r=>r.batchId===n.id&&r.productId===p.id&&r.status==='accepted'))throw Error('Reajuste já aprovado: '+i.name);
   }
   for(const i of note.lines){
    const j=ps.findIndex(p=>p.id===i.productId);const p=ps[j];
    hist.unshift({id:id(),batchId:n.id,productId:p.id,name:p.name,date:now,source:'Estorno NF-e',kind:'reversal',oldCost:p.lastPurchaseCost,newCost:i.before?.lastPurchaseCost??i.before?.cost??null,oldPrice:p.price,newPrice:i.before?.price??null});
    if(i.before)ps[j]=copy(i.before);else ps.splice(j,1);
   }
   for(const r of rev)if(r.batchId===n.id){r.status='reversed';r.decidedAt=now}
   note.status='reversed';note.reversedAt=now;
   const newMoves=ms.filter(m=>m.invoiceId!==n.id),newOrders=os.filter(o=>o.id!==note.orderId);
   D.atomicWrite({[K.p]:ps,[K.m]:newMoves,[K.o]:newOrders,[K.n]:notes,[K.h]:hist,[K.r]:rev},expected);
   products=ps;movements=newMoves;orders=newOrders;closeModal();render();toast('Entrada estornada','A nota permanece no histórico e não pode ser duplicada.','success');
  }catch(e){toast('Estorno bloqueado',e.message,'danger')}
 };
}
window.MotoTudoNFPriceEdit=function(before,item){
 assertCurrent();const expected=D.rawSnapshot([K.p,K.o,K.h,K.r]),ps=copy(products),os=copy(D.read(K.o,orders)),hist=get(K.h),rev=get(K.r),now=new Date().toISOString();
 const i=ps.findIndex(p=>p.id===before.id);
 if(i<0||!Number.isFinite(item.cost)||!Number.isFinite(item.price)||item.cost<0||item.price<0)throw Error('Cadastro ou valores inválidos.');
 snapshotOrderCosts(os,ps);
 if(Number(before.price)!==Number(item.price)){
  const base=Number(item.lastPurchaseCost??item.cost);
  if(base>0&&item.price>=base)item.targetMargin=1-base/item.price;else delete item.targetMargin;
 }
 if(item.lastPurchaseCost==null&&Number(before.cost)!==Number(item.cost))item.lastPurchaseCost=item.cost;
 hist.unshift({id:id(),productId:item.id,name:item.name,date:now,source:'Edição manual',kind:'manual',oldCost:before.cost,newCost:item.cost,oldPrice:before.price,newPrice:item.price});
 for(const r of rev)if(r.productId===item.id&&r.status==='pending'){r.status='superseded';r.decidedAt=now}
 ps[i]=copy(item);D.atomicWrite({[K.p]:ps,[K.o]:os,[K.h]:hist,[K.r]:rev},expected);products=ps;orders=os;
};

function showHistory(){
 setHeader('Histórico de preços','Evolução de custos, preços e decisões.');
 const all=get(K.h),notes=get(K.n),names=[...new Map(all.map(x=>[String(x.productId),x.name])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));
 const supplierNames=[...new Set(notes.map(n=>n.supplier))].sort();
 appView.innerHTML=panel('Histórico de alterações','<div class="nf-fields"><label>Pesquisar<input class="form-control-dark" id="nfSearchHist" placeholder="Produto ou origem"></label><label>Produto<select class="form-select-dark" id="nfHistProduct"><option value="">Todos</option>'+names.map(([id,name])=>'<option value="'+h(id)+'">'+h(name)+'</option>').join('')+'</select></label><label>Alteração<select class="form-select-dark" id="nfHistDirection"><option value="">Todas</option><option value="up">Aumentos</option><option value="down">Reduções</option><option value="manual">Edições manuais</option></select></label><label>Fornecedor<select class="form-select-dark" id="nfHistSupplier"><option value="">Todos</option>'+supplierNames.map(n=>'<option>'+h(n)+'</option>').join('')+'</select></label><label>De<input class="form-control-dark" id="nfHistStart" type="date"></label><label>Até<input class="form-control-dark" id="nfHistEnd" type="date"></label></div><div id="nfHistChart"></div><div id="nfHistResults"></div>');
 const draw=()=>{
  const q=N.norm($('nfSearchHist').value),product=$('nfHistProduct').value,direction=$('nfHistDirection').value,supplier=$('nfHistSupplier').value,start=$('nfHistStart').value,end=$('nfHistEnd').value;
  const rows=all.filter(x=>{
   const d=new Date(x.date),ymd=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
   const up=(x.oldCost!=null&&x.newCost!=null&&x.newCost>x.oldCost)||(x.oldPrice!=null&&x.newPrice!=null&&x.newPrice>x.oldPrice);
   const down=(x.oldCost!=null&&x.newCost!=null&&x.newCost<x.oldCost)||(x.oldPrice!=null&&x.newPrice!=null&&x.newPrice<x.oldPrice);
   return N.norm(x.name+' '+x.source).includes(q)&&(!product||String(x.productId)===product)&&(!supplier||notes.some(n=>n.id===x.batchId&&n.supplier===supplier))&&(!start||ymd>=start)&&(!end||ymd<=end)&&(!direction||(direction==='up'?up:direction==='down'?down:x.kind==='manual'));
  });
  const numv=x=>x==null?'—':amount(x);
  $('nfHistResults').innerHTML=rows.length?'<p class="nf-info">'+rows.length+' registro(s) • exibindo até 500</p>'+table(['Data','Produto','Origem','Custo antes → depois','Venda antes → depois'],rows.slice(0,500).map(x=>row([h(date(x.date)),h(x.name),h(x.source),numv(x.oldCost)+' → '+numv(x.newCost),numv(x.oldPrice)+' → '+numv(x.newPrice)])).join('')):'<div class="empty-state"><strong>Nenhuma alteração encontrada</strong></div>';
  const series=rows.filter(x=>x.newCost!=null&&x.newPrice!=null).slice(0,60).reverse();
  if(!product||series.length<2){$('nfHistChart').innerHTML='';return}
  const max=Math.max(1,...series.flatMap(x=>[Number(x.newCost),Number(x.newPrice)]));const coords=key=>series.map((x,i)=>[20+520*i/(series.length-1),135-115*Number(x[key])/max].map(v=>v.toFixed(2)).join(',')).join(' ');
  $('nfHistChart').innerHTML='<div class="nf-chart"><strong>Evolução dos preços</strong><svg viewBox="0 0 560 150" width="100%" role="img" aria-label="Evolução do custo e venda"><path d="M20 20V135H540" fill="none" stroke="#555"/><polyline points="'+coords('newCost')+'" fill="none" stroke="#aab2c6" stroke-width="3"/><polyline points="'+coords('newPrice')+'" fill="none" stroke="#f6c542" stroke-width="3"/></svg><small>Cinza: custo • amarelo: venda • '+h(amount(max))+' no topo</small></div>';
 };
 for(const id of ['nfSearchHist','nfHistProduct','nfHistDirection','nfHistSupplier','nfHistStart','nfHistEnd'])$(id).oninput=draw;draw();
}
const oldRender=window.render;
window.render=function(){syncChrome();if(state.view==='nf-import')return showImport();if(state.view==='nf-notes')return showNotes();if(state.view==='nf-history')return showHistory();if(state.view==='nf-reviews')return showReviews();return oldRender()};
const oldSync=window.syncChrome;
window.syncChrome=function(){oldSync();const n=pending().length;if(n){$('notificationDot')?.classList.remove('hidden');const b=$('nfPendingCount');if(b)b.textContent=n}else{const b=$('nfPendingCount');if(b)b.textContent='0'}};
const oldAlerts=window.openAlertsModal;
window.openAlertsModal=function(){if(pending().length)showChanges(pending().length);else oldAlerts()};
syncChrome();
})();
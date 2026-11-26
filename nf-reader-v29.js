(function(){
'use strict';
const root='https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/build/';
let working=false;
addEventListener('message',async e=>{
 if(e.source!==parent||working||e.data?.kind!=='mt-read-pdf'||!(e.data.bytes instanceof ArrayBuffer)||e.data.bytes.byteLength>15000000)return;
 working=true;const id=e.data.id;let task;
 try{
  const lib=await import(root+'pdf.min.mjs');
  lib.GlobalWorkerOptions.workerSrc=root+'pdf.worker.min.mjs';
  task=lib.getDocument({data:new Uint8Array(e.data.bytes),isEvalSupported:false,useWasm:false,disableFontFace:true,useSystemFonts:false,stopAtErrors:true});
  const doc=await task.promise;if(doc.numPages>50)throw Error('Limite de 50 páginas.');
  const pages=[];let count=0;
  for(let p=1;p<=doc.numPages;p++){const page=await doc.getPage(p),data=await page.getTextContent();const rows=data.items.filter(i=>typeof i.str==='string'&&i.transform).map(i=>({text:i.str,x:i.transform[4],y:-i.transform[5]}));count+=rows.length;if(count>120000)throw Error('PDF muito extenso.');pages.push(rows);page.cleanup()}
  parent.postMessage({kind:'mt-pdf-result',id,pages},'*');
 }catch(e){parent.postMessage({kind:'mt-pdf-result',id,error:String(e.message||e).slice(0,500)},'*')}
 finally{try{await task?.destroy()}catch(_){}working=false}
});
parent.postMessage({kind:'mt-pdf-ready'},'*');
})();
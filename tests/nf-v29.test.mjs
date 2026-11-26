import fs from 'node:fs';

function run(core,data){
const assert=(condition,message)=>{if(!condition)throw Error(message)};
const expectError=(f,message)=>{let ok=false;try{f()}catch(e){ok=true}assert(ok,message)};
const win={};new Function('window',core)(win);const N=win.MotoTudoNF;
let k='3526101234567800019955001000000001100000000';
let sum=0,w=2;for(let i=k.length-1;i>=0;i--){sum+=Number(k[i])*w;w=w===9?2:w+1}let dv=11-sum%11;k+=dv>=10?'0':String(dv);
assert(N.validKey(k),'Chave válida');assert(!N.validKey(k.slice(0,-1)+String((Number(k.at(-1))+1)%10)),'Chave adulterada');
const pages=[];
function fixture({name,unit='PC',qty='2,000',unitPrice='10,00',total='20,00',tax='0,00',nf='20,00',desc='',west=false,guara=false,code='A123',ncm='87141000',cfop='5102',cst='000'}){
 const arr=[];const add=(y,x,text)=>arr.push({y,x,text});
 add(10,10,'FORNECEDOR FICTICIO LTDA');add(20,200,k.match(/.{4}/g).join(' '));add(30,10,'DESTINATARIO / REMETENTE');add(40,100,'99.999.999/0001-99');
 add(50,450,'VALOR TOTAL DOS PRODUTOS');add(60,550,total);add(70,450,'VALOR TOTAL DA NOTA');add(80,550,nf);
 if(west){add(95,350,'DESC');add(95,440,'V TRIB');add(110,65,name);add(117,65,'NFCI: IDENTIFICADOR');}
 if(guara){add(95,400,'DESCONTO');add(95,430,'BASE');}
 add(125,15,code);if(!west)add(125,65,name);add(125,250,ncm);add(125,280,cst);add(125,300,cfop);add(125,320,unit);add(125,345,qty);add(125,380,unitPrice);
 const tail=west?['0,00',total,'0,00','0,00','0,00',tax,'0,00','0,00']:guara?[total,'0,00',total,'0,00',tax,'18,00','0,00']:[total,total,'0,00',tax,'18,00','0,00'];
 tail.forEach((s,i)=>add(125,410+i*22,s));if(desc)add(133,65,desc);
 return arr;
}
const a=N.pdf([fixture({name:'CABO FICTICIO',desc:'MODELO 2020',tax:'1,80',nf:'21,80',code:'90.12345678'})]);
assert(a.lines.length===1&&a.lines[0].name.includes('MODELO 2020'),'Descrição em duas linhas');assert(N.costs(a)[0]===21.8,'Custo IPI');
const b=N.pdf([fixture({name:'RETROVISOR FICTICIO',unit:'PR',qty:'3,0000',unitPrice:'8,6420',total:'25,93',nf:'25,93',cst:'0101',cfop:'5101'})]);assert(b.lines[0].qty===3&&N.multiplier(b.lines[0])===1,'Pares');
const c=N.pdf([fixture({name:'CAP MODELO PRETO 60',unit:'UN',qty:'1',unitPrice:'89,350000',total:'89,35',nf:'89,35',ncm:'6506.10.90',cfop:'6101'})]);assert(c.lines[0].name.endsWith('60'),'Variação capacete');
const d=N.pdf([fixture({name:'KIT RELACAO FICTICIO',guara:true,qty:'3,000',unitPrice:'37,900',total:'113,70',nf:'113,70'})]);assert(d.prodTotal===113.7,'Desconto em coluna adicional');
const e=N.pdf([fixture({name:'OLEO TESTE 24X1L',west:true,unit:'CX',qty:'2,0000',unitPrice:'587,04000',total:'1.174,08',nf:'1.174,08',cst:'5 / 60',cfop:'5655',ncm:'27101932'})]);
assert(e.lines[0].name==='OLEO TESTE 24X1L'&&N.multiplier(e.lines[0])===24,'Caixas');assert(N.round(N.costs(e)[0]/(e.lines[0].qty*24))===24.46,'Custo por frasco');
expectError(()=>N.validate({...e,prodTotal:999}),'Bloqueio de divergência');
assert(N.suggested(60,.5)===120&&N.suggested(40,.5)===80,'Reajuste bidirecional');
assert(N.costs(a,10)[0]===31.8,'Frete extra');
const state=new Map(),store={getItem:k=>state.has(k)?state.get(k):null,setItem:(k,v)=>{state.set(k,String(v))},removeItem:k=>state.delete(k)};
const dwin={};new Function('window','localStorage','Blob',data)(dwin,store,class{constructor(parts){this.size=parts.join('').length}});
const D=dwin.MotoTudoData;D.write('mt_products',[{id:1,stock:5}]);const expected=D.rawSnapshot(['mt_products','mt_invoices']);
D.atomicWrite({mt_products:[{id:1,stock:7}],mt_invoices:[{key:'teste'}]},expected);
assert(D.read('mt_products',[])[0].stock===7,'Gravação atômica');
expectError(()=>D.atomicWrite({mt_products:[{id:1,stock:9}]},expected),'Bloqueio de versão antiga');
const backup=D.rawSnapshot(['mt_products','mt_invoices']);const orig=store.setItem;let hit=false;store.setItem=(k,v)=>{if(k==='mt_invoices'&&!hit){hit=true;throw Error('quota simulada')}orig(k,v)};
expectError(()=>D.atomicWrite({mt_products:[{id:1,stock:99}],mt_invoices:[]},backup),'Falha de gravação');
assert(D.read('mt_products',[])[0].stock===7&&D.read('mt_invoices',[]).length===1,'Rollback íntegro');
return {layouts:5,checks:15};
}

console.log(run(fs.readFileSync('nf-core-v29.js','utf8'),fs.readFileSync('data-v28.js','utf8')));

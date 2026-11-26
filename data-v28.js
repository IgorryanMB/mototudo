(function(){
  'use strict';

  const SCHEMA_VERSION=29;
  const MAX_BYTES=4*1024*1024;
  const KEYS=Object.freeze({
    products:'mt_products',
    movements:'mt_movements',
    suppliers:'mt_suppliers',
    orders:'mt_orders',
    settings:'mt_settings',
    creditCustomers:'mt_credit_customers',
    financeDemoV12:'mt_finance_demo_v12',
    financeDemoV13:'mt_finance_demo_v13',
    meta:'mt_data_meta_v28',
    invoices:'mt_invoices',
    priceHistory:'mt_price_history',
    priceReviews:'mt_price_reviews'
  });
  const ALLOWED=new Set(Object.values(KEYS));
  const ARRAY_LIMITS={
    mt_products:5000,
    mt_movements:50000,
    mt_suppliers:5000,
    mt_orders:50000,
    mt_credit_customers:10000,
    mt_invoices:10000,
    mt_price_history:50000,
    mt_price_reviews:50000
  };
  const BLOCKED_KEYS=new Set(['__proto__','prototype','constructor']);

  function clone(value){
    if(value===undefined)return undefined;
    if(typeof structuredClone==='function'){
      try{return structuredClone(value)}catch(_){}
    }
    return JSON.parse(JSON.stringify(value));
  }

  function clean(value,depth=0){
    if(depth>14)throw new Error('Estrutura de dados profunda demais.');
    if(value===null||typeof value==='boolean')return value;
    if(typeof value==='number')return Number.isFinite(value)?value:0;
    if(typeof value==='string')return value.slice(0,4000);
    if(Array.isArray(value))return value.slice(0,50000).map(v=>clean(v,depth+1));
    if(typeof value==='object'){
      const out=Object.create(null);
      Object.keys(value).forEach(k=>{
        if(BLOCKED_KEYS.has(k))return;
        out[k]=clean(value[k],depth+1);
      });
      return out;
    }
    return null;
  }

  function assertAllowed(key){
    if(!ALLOWED.has(key))throw new Error('Chave de dados não autorizada: '+key);
  }

  function validateShape(key,value,fallback){
    const expectedArray=Array.isArray(fallback);
    if(expectedArray&&!Array.isArray(value))return clone(fallback);
    if(!expectedArray&&fallback&&typeof fallback==='object'&&!Array.isArray(fallback)){
      if(!value||typeof value!=='object'||Array.isArray(value))return clone(fallback);
    }
    if(Array.isArray(value)){
      const limit=ARRAY_LIMITS[key]||50000;
      if(value.length>limit)throw new Error('Limite de registros excedido para '+key);
    }
    return value;
  }

  function read(key,fallback){
    assertAllowed(key);
    try{
      const raw=localStorage.getItem(key);
      if(raw===null)return clone(fallback);
      const parsed=JSON.parse(raw);
      return clean(validateShape(key,parsed,fallback));
    }catch(err){
      console.warn('[MotoTudoData] leitura protegida falhou:',key,err);
      return clone(fallback);
    }
  }

  function write(key,value){
    assertAllowed(key);
    const safe=clean(value);
    if(Array.isArray(safe)){
      const limit=ARRAY_LIMITS[key]||50000;
      if(safe.length>limit)throw new Error('Limite de registros excedido para '+key);
    }
    const payload=JSON.stringify(safe);
    const bytes=new Blob([payload]).size;
    if(bytes>MAX_BYTES)throw new Error('Armazenamento local atingiu o limite seguro.');
    localStorage.setItem(key,payload);
    touchMeta();
    return safe;
  }

  function flagGet(key){
    assertAllowed(key);
    return localStorage.getItem(key);
  }

  function flagSet(key,value='1'){
    assertAllowed(key);
    localStorage.setItem(key,String(value).slice(0,100));
    touchMeta();
  }

  function remove(key){
    assertAllowed(key);
    localStorage.removeItem(key);
    touchMeta();
  }

  function touchMeta(){
    try{
      const meta={
        schemaVersion:SCHEMA_VERSION,
        updatedAt:new Date().toISOString(),
        storage:'local-cache',
        dbReady:true
      };
      localStorage.setItem(KEYS.meta,JSON.stringify(meta));
    }catch(_){}
  }

  function snapshot(){
    return {
      schemaVersion:SCHEMA_VERSION,
      exportedAt:new Date().toISOString(),
      products:read(KEYS.products,[]),
      movements:read(KEYS.movements,[]),
      suppliers:read(KEYS.suppliers,[]),
      orders:read(KEYS.orders,[]),
      settings:read(KEYS.settings,{}),
      creditCustomers:read(KEYS.creditCustomers,[]),
      invoices:read(KEYS.invoices,[]),priceHistory:read(KEYS.priceHistory,[]),priceReviews:read(KEYS.priceReviews,[])
    };
  }

  const DB_CONTRACT=Object.freeze({
    products:{table:'products',primaryKey:'id'},
    movements:{table:'movements',primaryKey:'id'},
    suppliers:{table:'suppliers',primaryKey:'id'},
    orders:{table:'orders',primaryKey:'id'},
    settings:{table:'store_settings',primaryKey:'store_id'},
    creditCustomers:{table:'credit_customers',primaryKey:'id'}
  });


  // Write-ahead backup: either all changes are written, or the previous values are restored.
  const JOURNAL='mt_nf_journal_v29';
  function restoreJournal(){
    const raw=localStorage.getItem(JOURNAL);if(!raw)return;
    const j=JSON.parse(raw);
    if(!j||typeof j!=='object'||Array.isArray(j))throw Error('Backup de transação inválido.');
    for(const [k,v] of Object.entries(j)){assertAllowed(k);if(v===null)localStorage.removeItem(k);else if(typeof v==='string')localStorage.setItem(k,v);else throw Error('Backup inválido.')}
    localStorage.removeItem(JOURNAL);
  }
  function atomicWrite(changes,expected={}){
    if(localStorage.getItem(JOURNAL)!==null)throw Error('Existe uma recuperação pendente. Reabra o sistema.');
    const prior=Object.create(null), next=Object.create(null);
    for(const [key,value] of Object.entries(changes)){
      assertAllowed(key);
      const raw=localStorage.getItem(key);
      if(Object.prototype.hasOwnProperty.call(expected,key)&&raw!==expected[key])throw Error('Os dados mudaram em outra aba. Atualize a página e revise novamente.');
      if(Array.isArray(value)&&value.length>(ARRAY_LIMITS[key]||50000))throw Error('Limite de registros excedido.');
      const payload=JSON.stringify(clean(value));
      if(new Blob([payload]).size>MAX_BYTES)throw Error('Limite de armazenamento atingido.');
      prior[key]=raw;next[key]=payload;
    }
    localStorage.setItem(JOURNAL,JSON.stringify(prior));
    try{for(const [k,v] of Object.entries(next))localStorage.setItem(k,v);localStorage.removeItem(JOURNAL)}
    catch(e){restoreJournal();throw Error('Não foi possível gravar a importação. Nenhuma alteração foi mantida. '+e.message)}
    touchMeta();
  }
  function rawSnapshot(keys){const out=Object.create(null);for(const k of keys){assertAllowed(k);out[k]=localStorage.getItem(k)}return out}
  restoreJournal();

  touchMeta();
  window.MotoTudoData=Object.freeze({
    SCHEMA_VERSION,KEYS,DB_CONTRACT,read,write,flagGet,flagSet,remove,snapshot,atomicWrite,rawSnapshot,
    backend:'local-cache'
  });
})();
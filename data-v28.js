(function(){
  'use strict';

  const SCHEMA_VERSION=28;
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
    meta:'mt_data_meta_v28'
  });
  const ALLOWED=new Set(Object.values(KEYS));
  const ARRAY_LIMITS={
    mt_products:5000,
    mt_movements:50000,
    mt_suppliers:5000,
    mt_orders:50000,
    mt_credit_customers:10000
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
      creditCustomers:read(KEYS.creditCustomers,[])
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

  touchMeta();
  window.MotoTudoData=Object.freeze({
    SCHEMA_VERSION,KEYS,DB_CONTRACT,read,write,flagGet,flagSet,remove,snapshot,
    backend:'local-cache'
  });
})();
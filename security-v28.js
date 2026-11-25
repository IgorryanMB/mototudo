(function(){
  'use strict';

  const TEXT_LIMIT=250;
  const LONG_TEXT_LIMIT=1000;

  function limitFor(el){
    if(el.tagName==='TEXTAREA')return LONG_TEXT_LIMIT;
    const id=(el.id||'')+' '+(el.name||'');
    if(/note|observ|descr|refer/i.test(id))return 500;
    if(/phone|telefone|placa|code|codigo/i.test(id))return 80;
    return TEXT_LIMIT;
  }

  function hardenField(el){
    if(!el||!(el instanceof HTMLElement))return;
    if(el.matches('input[type="text"],input:not([type]),textarea')){
      if(!el.hasAttribute('maxlength'))el.maxLength=limitFor(el);
      el.autocomplete=el.autocomplete||'off';
      el.spellcheck=false;
    }
    if(el.matches('input[type="number"]')){
      if(!el.hasAttribute('min'))el.min='0';
      if(!el.hasAttribute('step'))el.step='any';
      el.inputMode='decimal';
    }
  }

  function hardenTree(root=document){
    root.querySelectorAll?.('input,textarea,a[target="_blank"]').forEach(el=>{
      hardenField(el);
      if(el.matches('a[target="_blank"]'))el.rel='noopener noreferrer';
    });
  }

  function clampTextInput(e){
    const el=e.target;
    if(!el||!el.matches?.('input[type="text"],input:not([type]),textarea'))return;
    const max=Number(el.maxLength)>0?Number(el.maxLength):limitFor(el);
    if(el.value.length>max)el.value=el.value.slice(0,max);
  }

  try{
    if(window.top!==window.self){
      document.documentElement.style.display='none';
      window.top.location=window.self.location.href;
    }
  }catch(_){
    document.documentElement.style.display='none';
  }

  window.name='';
  document.addEventListener('input',clampTextInput,true);
  document.addEventListener('DOMContentLoaded',()=>hardenTree(document),{once:true});

  const observer=new MutationObserver(list=>{
    list.forEach(m=>m.addedNodes.forEach(n=>{
      if(n.nodeType!==1)return;
      hardenField(n);
      hardenTree(n);
    }));
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});

  window.MotoTudoSecurity=Object.freeze({
    version:28,
    hardenTree
  });
})();
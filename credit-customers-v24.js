
(function(){
  const KEY='mt_credit_customers';

  function getCustomersV24(){
    return MotoTudoData.read(KEY,[])
  }
  function saveCustomersV24(v){MotoTudoData.write(KEY,v)}
  function ordersV24(){
    return MotoTudoData.read('mt_orders',[])
  }
  function normV24(s){
    return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  }

  function migrateCustomersV24(){
    const customers=getCustomersV24();
    let changed=false;
    ordersV24().filter(o=>o.payment==='fiado'&&String(o.creditName||'').trim()).forEach(o=>{
      const name=String(o.creditName).trim();
      if(!customers.some(c=>normV24(c.name)===normV24(name))){
        customers.push({id:Date.now()+customers.length,name,phone:'',note:'Migrado do histórico de fiados',active:true,createdAt:new Date().toISOString()});
        changed=true;
      }
    });
    if(changed)saveCustomersV24(customers);
    return customers;
  }

  function customerOptionsV24(selected=''){
    const customers=migrateCustomersV24().filter(c=>c.active!==false).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    return '<option value="">Selecione o cliente cadastrado</option>'+
      customers.map(c=>'<option value="'+esc(c.name)+'" '+(normV24(c.name)===normV24(selected)?'selected':'')+'>'+esc(c.name)+(c.phone?' • '+esc(c.phone):'')+'</option>').join('');
  }

  function replaceCreditInputV24(inputId,wrapId,selected=''){
    const old=document.getElementById(inputId);
    const wrap=document.getElementById(wrapId);
    if(!old||!wrap)return;
    const select=document.createElement('select');
    select.className='form-select-dark';
    select.id=inputId;
    select.innerHTML=customerOptionsV24(selected||old.value);
    old.replaceWith(select);
    const label=wrap.querySelector('label');
    if(label)label.textContent='Cliente cadastrado no fiado';

    let hint=wrap.querySelector('.credit-registry-hint-v24');
    if(!hint){
      hint=document.createElement('small');
      hint.className='credit-registry-hint-v24';
      hint.innerHTML='<i class="bi bi-lock-fill"></i> Somente clientes cadastrados podem comprar fiado.';
      wrap.appendChild(hint);
    }
  }

  const baseOpenMovementV24=window.openMovementModal;
  if(baseOpenMovementV24){
    window.openMovementModal=function(type,productId=null){
      baseOpenMovementV24(type,productId);
      if(type!=='out')return;
      replaceCreditInputV24('batchCreditNameV22','batchCreditNameWrapV22','');
      const payment=document.getElementById('batchPaymentV19');
      const wrap=document.getElementById('batchCreditNameWrapV22');
      if(payment&&wrap){
        const old=payment.onchange;
        payment.onchange=e=>{
          if(old)old.call(payment,e);
          if(payment.value==='fiado' && !migrateCustomersV24().some(c=>c.active!==false)){
            toast('Nenhum cliente cadastrado','Cadastre o cliente primeiro na área Fiados.','danger');
          }
        };
      }
    };
  }

  function enhanceFinishModalV24(){
    const wrap=document.getElementById('finishCreditWrapV22');
    const input=document.getElementById('finishCreditNameV22');
    if(!wrap||!input||input.tagName==='SELECT')return;
    replaceCreditInputV24('finishCreditNameV22','finishCreditWrapV22',input.value);
  }

  function enhanceEditModalV24(){
    const wrap=document.getElementById('editCreditWrapV22');
    const input=document.getElementById('editCreditNameV22');
    if(!wrap||!input||input.tagName==='SELECT')return;
    replaceCreditInputV24('editCreditNameV22','editCreditWrapV22',input.value);
  }

  const baseRenderMovementsV24=window.renderMovements;
  if(baseRenderMovementsV24){
    window.renderMovements=function(){
      baseRenderMovementsV24();
      document.querySelectorAll('[data-finish-v15]').forEach(btn=>{
        btn.addEventListener('click',()=>setTimeout(enhanceFinishModalV24,0),true);
      });
      document.querySelectorAll('[data-edit-v10]').forEach(btn=>{
        btn.addEventListener('click',()=>setTimeout(enhanceEditModalV24,0),true);
      });
    };
  }

  const baseRenderFiadosV24=window.renderFiadosV22;
  if(baseRenderFiadosV24){
    window.renderFiadosV22=function(){
      migrateCustomersV24();
      baseRenderFiadosV24();

      const panel=document.querySelector('.credit-toolbar-v22')?.closest('.panel');
      const header=panel?.querySelector('.panel-header');
      if(header&&!document.getElementById('newCreditCustomerV24')){
        const btn=document.createElement('button');
        btn.id='newCreditCustomerV24';
        btn.className='outline-button';
        btn.innerHTML='<i class="bi bi-person-plus-fill"></i> Cadastrar cliente';
        header.appendChild(btn);
        btn.onclick=openCustomerModalV24;
      }

      const toolbar=document.querySelector('.credit-toolbar-v22');
      if(toolbar&&!document.getElementById('creditRegistryV24')){
        const box=document.createElement('div');
        box.id='creditRegistryV24';
        box.className='credit-registry-summary-v24';
        const customers=getCustomersV24().filter(c=>c.active!==false);
        box.innerHTML='<i class="bi bi-people-fill"></i><div><strong>'+customers.length+' cliente(s) cadastrado(s)</strong><small>Somente estes nomes aparecem ao selecionar Fiado em uma venda.</small></div><button id="manageCreditCustomersV24">Ver cadastros</button>';
        toolbar.insertAdjacentElement('beforebegin',box);
        document.getElementById('manageCreditCustomersV24').onclick=openCustomerListV24;
      }
    };
  }

  function openCustomerModalV24(customer=null){
    const c=customer||{name:'',phone:'',note:''};
    openModal(customer?'Editar cliente fiado':'Cadastrar cliente fiado',
      '<form id="creditCustomerFormV24"><div class="form-grid">'+
      '<div class="form-field full"><label>Nome</label><input class="form-control-dark" name="name" required value="'+esc(c.name||'')+'" placeholder="Ex.: Diego Martins"></div>'+
      '<div class="form-field"><label>Telefone</label><input class="form-control-dark" name="phone" value="'+esc(c.phone||'')+'" placeholder="Ex.: (18) 99999-9999"></div>'+
      '<div class="form-field"><label>Observação</label><input class="form-control-dark" name="note" value="'+esc(c.note||'')+'" placeholder="Ex.: cliente antigo"></div>'+
      '</div></form>',
      '<button class="btn-dark-soft" data-close-action>Cancelar</button><button class="btn-gold" id="saveCreditCustomerV24">'+(customer?'Salvar':'Cadastrar')+'</button>',true);
    document.querySelector('[data-close-action]').onclick=closeModal;
    document.getElementById('saveCreditCustomerV24').onclick=()=>{
      const f=document.getElementById('creditCustomerFormV24');
      if(!f.reportValidity())return;
      const d=Object.fromEntries(new FormData(f));
      const name=d.name.trim();
      const all=getCustomersV24();
      const duplicate=all.find(x=>normV24(x.name)===normV24(name)&&(!customer||Number(x.id)!==Number(customer.id)));
      if(duplicate){toast('Cliente já cadastrado',name+' já existe no cadastro de fiados.','danger');return;}
      if(customer){
        const found=all.find(x=>Number(x.id)===Number(customer.id));
        if(found){found.name=name;found.phone=d.phone.trim();found.note=d.note.trim();found.updatedAt=new Date().toISOString();}
      }else{
        all.push({id:Date.now(),name,phone:d.phone.trim(),note:d.note.trim(),active:true,createdAt:new Date().toISOString()});
      }
      saveCustomersV24(all);closeModal();
      toast(customer?'Cadastro atualizado':'Cliente cadastrado',name+' já pode comprar fiado.','success');
      window.renderFiadosV22();
    };
  }

  function openCustomerListV24(){
    const all=getCustomersV24().sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    openModal('Clientes cadastrados no fiado',
      '<div class="credit-customer-registry-list-v24">'+
      (all.length?all.map(c=>'<div class="credit-customer-registry-row-v24"><div><strong>'+esc(c.name)+'</strong><small>'+(c.phone?esc(c.phone):'Sem telefone')+(c.note?' • '+esc(c.note):'')+'</small></div><span class="'+(c.active===false?'off':'')+'">'+(c.active===false?'Inativo':'Ativo')+'</span></div>').join(''):'<div class="empty-state"><strong>Nenhum cliente cadastrado</strong></div>')+
      '</div>',
      '<button class="btn-dark-soft" data-close-action>Fechar</button><button class="btn-gold" id="newFromListV24">Cadastrar novo</button>',false);
    document.querySelector('[data-close-action]').onclick=closeModal;
    document.getElementById('newFromListV24').onclick=()=>{closeModal();openCustomerModalV24();};
  }

  migrateCustomersV24();
})();
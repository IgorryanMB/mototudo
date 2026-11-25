
(function(){
  function ordersV19(){
    try{return JSON.parse(localStorage.getItem('mt_orders')||'[]')}catch{return []}
  }
  function saveOrdersV19(v){
    localStorage.setItem('mt_orders',JSON.stringify(v));
    try{orders=v}catch(e){}
  }
  function normV19(s){
    return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  }
  function payLabelV19(v){
    return ({pix:'Pix',dinheiro:'Dinheiro',debito:'Cartão de débito',credito:'Cartão de crédito',fiado:'Fiado',outro:'Outro'})[v]||'Não informado';
  }
  function dateKeyV19(v){
    try{return new Date(v).toISOString().slice(0,10)}catch{return ''}
  }

  const baseRenderMovementsV19=window.renderMovements;
  window.renderMovements=function(){
    baseRenderMovementsV19();

    const panel=document.querySelector('#orderListV11')?.closest('.panel');
    const orderList=document.getElementById('orderListV11');
    if(!panel||!orderList)return;

    const oldFilter=panel.querySelector('.order-filter-v16');
    if(oldFilter && !panel.querySelector('.movement-filters-v19')){
      oldFilter.insertAdjacentHTML('beforebegin',`
        <div class="movement-filters-v19">
          <div class="movement-status-tabs-v19">
            <button class="active" data-status-v19="all">Todos</button>
            <button data-status-v19="open"><i class="bi bi-clock-history"></i> Em aberto</button>
            <button data-status-v19="completed"><i class="bi bi-check2-circle"></i> Finalizados</button>
          </div>
          <div class="movement-date-v19">
            <i class="bi bi-calendar3"></i>
            <input type="date" class="form-control-dark" id="movementDateV19">
            <button type="button" id="clearMovementDateV19">Limpar data</button>
          </div>
        </div>`);
    }

    const all=ordersV19();
    document.querySelectorAll('#orderListV11 .order-card-v9').forEach(card=>{
      const id=Number(card.querySelector('[data-view-v10]')?.dataset.viewV10||card.querySelector('[data-edit-v10]')?.dataset.editV10);
      const o=all.find(x=>Number(x.id)===id);
      if(!o)return;
      card.dataset.statusV19=o.status==='pending'?'open':'completed';
      card.dataset.dateV19=dateKeyV19(o.date);
      card.dataset.paymentV19=o.payment||'';
      const small=card.querySelector('.order-card-v9-info small');
      if(small && o.type==='out' && !small.querySelector('.payment-chip-v19')){
        small.insertAdjacentHTML('beforeend',` <span class="payment-chip-v19"><i class="bi bi-credit-card"></i> ${payLabelV19(o.payment)}</span>`);
      }
    });

    const sortedRows=[...movements].sort((a,b)=>new Date(b.date)-new Date(a.date));
    document.querySelectorAll('.movement-history-table tbody tr').forEach((row,i)=>{
      row.dataset.dateV19=dateKeyV19(sortedRows[i]?.date);
    });

    let status='all';
    const search=document.getElementById('orderSearchV11');
    const date=document.getElementById('movementDateV19');

    function apply(){
      const q=normV19(search?.value||'');
      const filterMode=document.querySelector('[data-order-filter-mode].active')?.dataset.orderFilterMode||'name';
      const d=date?.value||'';

      document.querySelectorAll('#orderListV11 .order-card-v9').forEach(card=>{
        const text=filterMode==='plate'?normV19(card.dataset.orderPlate||''):normV19(card.dataset.orderName||'');
        const okText=!q||text.includes(q);
        const okStatus=status==='all'||card.dataset.statusV19===status;
        const okDate=!d||card.dataset.dateV19===d;
        card.style.display=okText&&okStatus&&okDate?'':'none';
      });

      document.querySelectorAll('.movement-history-table tbody tr').forEach(row=>{
        row.style.display=!d||row.dataset.dateV19===d?'':'none';
      });
    }

    document.querySelectorAll('[data-status-v19]').forEach(btn=>btn.onclick=()=>{
      status=btn.dataset.statusV19;
      document.querySelectorAll('[data-status-v19]').forEach(x=>x.classList.toggle('active',x===btn));
      apply();
    });
    if(date) date.onchange=apply;
    const clear=document.getElementById('clearMovementDateV19');
    if(clear) clear.onclick=()=>{date.value='';apply();};

    // Existing name/plate filters keep working, then we re-apply status/date.
    document.querySelectorAll('[data-order-filter-mode]').forEach(btn=>{
      const prev=btn.onclick;
      btn.onclick=e=>{if(prev)prev.call(btn,e);setTimeout(apply,0);};
    });
    if(search){
      const prev=search.oninput;
      search.oninput=e=>{if(prev)prev.call(search,e);apply();};
    }

    // Inject payment into View/Edit modals and persist edits.
    orderList.addEventListener('click',e=>{
      const view=e.target.closest('[data-view-v10]');
      const edit=e.target.closest('[data-edit-v10]');
      const target=view||edit;
      if(!target)return;
      const id=Number(view?view.dataset.viewV10:edit.dataset.editV10);
      setTimeout(()=>enhanceModalV19(id,!!edit),0);
    },true);
  };

  function enhanceModalV19(id,isEdit){
    const all=ordersV19();
    const o=all.find(x=>Number(x.id)===id);
    if(!o||o.type!=='out')return;
    const body=document.querySelector('#modalRoot .modal-body');
    if(!body)return;

    if(isEdit){
      const meta=body.querySelector('.movement-meta');
      if(meta && !document.getElementById('editPaymentV19')){
        meta.insertAdjacentHTML('beforeend',`
          <div class="form-field">
            <label>Forma de pagamento</label>
            <select class="form-select-dark" id="editPaymentV19">
              <option value="pix">Pix</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="debito">Cartão de débito</option>
              <option value="credito">Cartão de crédito</option>
              <option value="fiado">Fiado</option>
              <option value="outro">Outro</option>
            </select>
          </div>`);
        document.getElementById('editPaymentV19').value=o.payment||'pix';

        const save=document.getElementById('saveEditV10');
        if(save){
          save.addEventListener('click',()=>{
            const latest=ordersV19();
            const current=latest.find(x=>Number(x.id)===id);
            if(current){
              current.payment=document.getElementById('editPaymentV19')?.value||'pix';
              saveOrdersV19(latest);
            }
          },true);
        }
      }
    }else{
      const meta=body.querySelector('.order-detail-meta-v9');
      if(meta && !meta.querySelector('.detail-payment-v19')){
        meta.insertAdjacentHTML('beforeend',`
          <div class="detail-payment-v19"><span>Pagamento</span><strong>${payLabelV19(o.payment)}</strong></div>`);
      }
    }
  }

  // Financeiro: payment label in cards/details.
  const baseRenderFinanceV19=window.renderFinance;
  if(baseRenderFinanceV19){
    window.renderFinance=function(){
      baseRenderFinanceV19();
      const all=ordersV19();
      document.querySelectorAll('[data-fin-order]').forEach(card=>{
        const o=all.find(x=>Number(x.id)===Number(card.dataset.finOrder));
        if(!o)return;
        const meta=card.querySelector('.finance-order-meta-v13');
        if(meta && !meta.querySelector('.finance-payment-v19')){
          meta.insertAdjacentHTML('beforeend',`<span class="finance-payment-v19"><i class="bi bi-credit-card"></i> ${payLabelV19(o.payment)}</span>`);
        }
        card.addEventListener('click',()=>setTimeout(()=>{
          const d=document.querySelector('#modalRoot .order-detail-meta-v9');
          if(d&&!d.querySelector('.detail-payment-v19')){
            d.insertAdjacentHTML('beforeend',`<div class="detail-payment-v19"><span>Pagamento</span><strong>${payLabelV19(o.payment)}</strong></div>`);
          }
        },0),true);
      });
    };
  }

  try{
    if(typeof state!=='undefined'&&state.view==='movements')window.renderMovements();
    else if(typeof state!=='undefined'&&state.view==='finance'&&window.renderFinance)window.renderFinance();
  }catch(e){console.error('Moto Tudo v19',e);}
})();
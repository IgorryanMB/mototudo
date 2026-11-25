
(function(){
  function getOrdersV22(){
    try{return JSON.parse(localStorage.getItem('mt_orders')||'[]')}catch{return []}
  }
  function saveOrdersV22(v){
    localStorage.setItem('mt_orders',JSON.stringify(v));
    try{orders=v}catch(e){}
  }
  function totalV22(o){
    return (o.items||[]).reduce((s,i)=>s+Number(i.qty||0)*Number(i.unit||0),0)+Number(o.labor||0);
  }
  function normV22(s){
    return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  }
  function dateV22(v){
    return new Date(v).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
  }
  function paymentsV23(o){
    if(Array.isArray(o.creditPayments))return o.creditPayments;
    if(o.creditStatus==='paid')return [{id:'legacy-'+o.id,amount:totalV22(o),date:o.creditPaidAt||o.updatedAt||o.date,note:'Pagamento total'}];
    return [];
  }
  function paidV23(o){return paymentsV23(o).reduce((s,p)=>s+Number(p.amount||0),0)}
  function dueV23(o){return Math.max(0,totalV22(o)-paidV23(o))}
  function creditStateV23(o){
    const due=dueV23(o),paid=paidV23(o);
    if(due<=0.009)return 'paid';
    if(paid>0)return 'partial';
    return 'open';
  }

  function seedCreditDemoV22(){
    const all=getOrdersV22();
    let changed=false;
    const demo=[
      {code:'PED-261124-104',creditName:'Paula Ferreira'},
      {code:'PED-261125-107',creditName:'Diego Martins'}
    ];
    demo.forEach(d=>{
      const o=all.find(x=>x.code===d.code);
      if(o && !o.payment){
        o.payment='fiado';o.creditName=d.creditName;o.creditStatus='open';changed=true;
      }
    });
    if(changed)saveOrdersV22(all);
  }

  window.renderFiadosV22=function(){
    seedCreditDemoV22();
    setHeader('Fiados','Controle quem comprou fiado, valores em aberto e pagamentos recebidos.');

    const all=getOrdersV22().filter(o=>o.type==='out'&&o.payment==='fiado');
    const open=all.filter(o=>creditStateV23(o)!=='paid');
    const paid=all.filter(o=>creditStateV23(o)==='paid');
    const openTotal=all.reduce((s,o)=>s+dueV23(o),0);
    const paidTotal=all.reduce((s,o)=>s+paidV23(o),0);
    const names=[...new Set(all.map(o=>(o.creditName||'Sem nome').trim()))];

    appView.innerHTML=`
      <section class="page-stack">
        <div class="kpi-row">
          <div class="metric-card"><span>A receber</span><strong class="credit-open-money-v22">${money(openTotal)}</strong><small>${open.length} pedido(s) com saldo</small></div>
          <div class="metric-card"><span>Clientes fiado</span><strong>${names.length}</strong><small>Pessoas cadastradas</small></div>
          <div class="metric-card"><span>Já recebido</span><strong class="money-positive">${money(paidTotal)}</strong><small>Somatório dos pagamentos</small></div>
          <div class="metric-card"><span>Total histórico</span><strong>${money(openTotal+paidTotal)}</strong><small>Vendas feitas no fiado</small></div>
        </div>

        <article class="panel page-panel">
          <div class="panel-header">
            <div><span class="section-kicker">CONTROLE DE FIADOS</span><h2>Clientes e pedidos</h2></div>
          </div>

          <div class="credit-toolbar-v22">
            <div class="finance-search-v17 credit-search-v22">
              <i class="bi bi-search"></i>
              <input id="creditSearchV22" placeholder="Pesquisar nome, pedido, moto ou placa...">
            </div>
            <div class="credit-tabs-v22">
              <button class="active" data-credit-filter-v22="open">Em aberto</button>
              <button data-credit-filter-v22="partial">Parciais</button>
              <button data-credit-filter-v22="paid">Pagos</button>
              <button data-credit-filter-v22="all">Todos</button>
            </div>
          </div>

          <div class="credit-list-v22" id="creditListV22"></div>
        </article>
      </section>`;

    let status='open';
    const search=document.getElementById('creditSearchV22');

    function renderList(){
      const q=normV22(search.value);
      let list=[...all].sort((a,b)=>new Date(b.date)-new Date(a.date));
      if(status==='open')list=list.filter(o=>creditStateV23(o)!=='paid');
      else if(status!=='all')list=list.filter(o=>creditStateV23(o)===status);
      if(q)list=list.filter(o=>normV22([o.creditName,o.name,o.code,o.bike,o.plate,o.note].join(' ')).includes(q));

      const grouped={};
      list.forEach(o=>{
        const key=(o.creditName||'Sem nome').trim()||'Sem nome';
        (grouped[key]??=[]).push(o);
      });

      const root=document.getElementById('creditListV22');
      const entries=Object.entries(grouped);
      root.innerHTML=entries.length?entries.map(([name,orders])=>{
        const total=orders.reduce((s,o)=>s+totalV22(o),0);
        const paidNow=orders.reduce((s,o)=>s+paidV23(o),0);
        const due=orders.reduce((s,o)=>s+dueV23(o),0);
        const openCount=orders.filter(o=>creditStateV23(o)!=='paid').length;
        return `
          <article class="credit-customer-v22">
            <div class="credit-customer-head-v22">
              <div class="credit-avatar-v22"><i class="bi bi-person-fill"></i></div>
              <div class="grow"><strong>${esc(name)}</strong><small>${orders.length} pedido(s) • ${openCount} em aberto</small></div>
              <div class="credit-customer-total-v22"><span>Total</span><b>${money(total)}</b><small>Pago ${money(paidNow)} • Deve ${money(due)}</small></div>
              ${due>0?`<button class="credit-client-pay-v23" data-credit-client-v23="${esc(name)}"><i class="bi bi-cash-stack"></i> Registrar pagamento</button>`:''}
            </div>
            <div class="credit-orders-v22">
              ${orders.map(o=>`
                <div class="credit-order-v22 ${(o.creditStatus||'open')==='paid'?'paid':''}">
                  <div class="credit-order-main-v22">
                    <strong>${esc(o.name||o.code)}</strong>
                    <small><span class="code">${esc(o.code||'')}</span>${o.bike?' • '+esc(o.bike):''}${o.plate?' • '+esc(o.plate):''} • ${dateV22(o.date)}</small>
                  </div>
                  <div class="credit-order-value-v22">
                    <span>Total</span><b>${money(totalV22(o))}</b>
                    <small>Pago ${money(paidV23(o))} • Falta ${money(dueV23(o))}</small>
                  </div>
                  <div class="credit-order-actions-v22">
                    <button class="secondary" data-credit-view-v23="${o.id}"><i class="bi bi-eye"></i> Ver pedido</button>
                    ${dueV23(o)>0
                      ?`<button data-credit-pay-v23="${o.id}"><i class="bi bi-cash-coin"></i> Registrar pagamento</button>`
                      :`<span class="credit-paid-badge-v23"><i class="bi bi-check2-circle"></i> Quitado</span>`}
                  </div>
                </div>`).join('')}
            </div>
          </article>`;
      }).join(''):'<div class="empty-state"><i class="bi bi-journal-check"></i><strong>Nenhum fiado encontrado</strong><span>Os pedidos pagos como Fiado aparecerão aqui.</span></div>';

      root.querySelectorAll('[data-credit-pay-v23]').forEach(btn=>btn.onclick=()=>openPaymentV23(Number(btn.dataset.creditPayV23)));
      root.querySelectorAll('[data-credit-view-v23]').forEach(btn=>btn.onclick=()=>openCreditDetailV23(Number(btn.dataset.creditViewV23)));
      root.querySelectorAll('[data-credit-client-v23]').forEach(btn=>btn.onclick=()=>openClientPaymentV23(btn.dataset.creditClientV23));
    }

    function openClientPaymentV23(clientName){
      const saleOrders=getOrdersV22().filter(o=>o.payment==='fiado'&&(o.creditName||'Sem nome')===clientName&&dueV23(o)>0);
      if(!saleOrders.length){toast('Sem saldo em aberto',clientName+' não possui pedidos pendentes.','success');return;}
      const options=saleOrders.map(o=>'<option value="'+o.id+'">'+esc(o.code)+' • '+esc(o.name||'Pedido')+' • Falta '+money(dueV23(o))+'</option>').join('');
      openModal('Registrar pagamento • '+clientName,
        '<div class="credit-select-sale-v23"><div class="form-field"><label>Selecione a venda que será abatida</label><select class="form-select-dark" id="creditOrderSelectV23">'+options+'</select></div><div class="credit-selected-sale-v23" id="creditSelectedSaleV23"></div></div>',
        '<button class="btn-dark-soft" data-close-action>Cancelar</button><button class="btn-gold" id="continueCreditPaymentV23">Continuar</button>',true);
      document.querySelector('[data-close-action]').onclick=closeModal;
      const select=document.getElementById('creditOrderSelectV23');
      const info=document.getElementById('creditSelectedSaleV23');
      function sync(){
        const o=saleOrders.find(x=>Number(x.id)===Number(select.value));
        if(!o)return;
        info.innerHTML='<div><span>Total da venda</span><b>'+money(totalV22(o))+'</b></div><div><span>Já pago</span><b class="money-positive">'+money(paidV23(o))+'</b></div><div><span>Saldo desta venda</span><b>'+money(dueV23(o))+'</b></div>';
      }
      select.onchange=sync;sync();
      document.getElementById('continueCreditPaymentV23').onclick=()=>{const id=Number(select.value);closeModal();openPaymentV23(id);};
    }
    function openPaymentV23(id){
      const orders=getOrdersV22();
      const o=orders.find(x=>Number(x.id)===Number(id));
      if(!o)return;
      const due=dueV23(o);
      openModal('Registrar pagamento',
        '<div class="form-field"><label>Cliente</label><input class="form-control-dark" value="'+esc(o.creditName||'Sem nome')+'" disabled></div>'+
        '<div class="form-field"><label>Valor total do pedido</label><input class="form-control-dark" value="'+money(totalV22(o))+'" disabled></div>'+
        '<div class="form-field"><label>Já pagou</label><input class="form-control-dark" value="'+money(paidV23(o))+'" disabled></div>'+
        '<div class="credit-pay-mode-v23"><button type="button" class="active" data-pay-mode-v23="full">Quitar saldo</button><button type="button" data-pay-mode-v23="partial">Pagamento parcial</button></div>'+ 
        '<div class="form-field"><label>Valor pago agora</label><input class="form-control-dark" id="partialPaymentV23" type="number" min="0.01" max="'+due.toFixed(2)+'" step="0.01" value="'+due.toFixed(2)+'"></div>'+
        '<div class="form-field"><label>Observação</label><input class="form-control-dark" id="partialPaymentNoteV23" placeholder="Ex.: Pix, dinheiro, parcela..."></div>',
        '<button class="btn-dark-soft" data-close-action>Cancelar</button><button class="btn-gold" id="confirmPartialPaymentV23">Confirmar pagamento</button>',true);
      document.querySelector('[data-close-action]').onclick=closeModal;
      const amountInput=document.getElementById('partialPaymentV23');
      amountInput.readOnly=true;
      document.querySelectorAll('[data-pay-mode-v23]').forEach(btn=>btn.onclick=()=>{
        document.querySelectorAll('[data-pay-mode-v23]').forEach(x=>x.classList.toggle('active',x===btn));
        if(btn.dataset.payModeV23==='full'){amountInput.value=due.toFixed(2);amountInput.readOnly=true;}else{amountInput.readOnly=false;amountInput.value='';amountInput.focus();}
      });
      document.getElementById('confirmPartialPaymentV23').onclick=()=>{
        const amount=Number(document.getElementById('partialPaymentV23').value||0);
        const note=(document.getElementById('partialPaymentNoteV23').value||'').trim();
        if(amount<=0){toast('Valor inválido','Digite um valor maior que zero.','danger');return;}
        if(amount>due+0.009){toast('Valor maior que a dívida','O máximo é '+money(due)+'.','danger');return;}
        const all=getOrdersV22();
        const current=all.find(x=>Number(x.id)===Number(id));
        current.creditPayments=paymentsV23(current).concat([{id:Date.now(),amount,date:new Date().toISOString(),note}]);
        current.creditStatus=creditStateV23(current);
        current.creditPaidAt=current.creditStatus==='paid'?new Date().toISOString():null;
        saveOrdersV22(all);closeModal();
        toast(current.creditStatus==='paid'?'Fiado quitado':'Pagamento parcial registrado',money(amount)+' recebido.','success');
        renderFiadosV22();
      };
    }

    function openCreditDetailV23(id){
      const o=getOrdersV22().find(x=>Number(x.id)===Number(id));
      if(!o)return;
      const pays=paymentsV23(o);
      const items=(o.items||[]).map((i,k)=>
        '<div class="credit-sale-item-v25"><span class="credit-sale-number-v25">'+(k+1)+'</span><div><strong>'+esc(i.product||'Produto')+'</strong><small>'+Number(i.qty||0)+' un. × '+money(i.unit||0)+'</small></div><b>'+money(Number(i.qty||0)*Number(i.unit||0))+'</b></div>'
      ).join('');
      openModal('Venda • '+(o.code||''),
        '<div class="credit-detail-v23">'+
        '<div class="credit-sale-head-v25"><div><span>Cliente</span><strong>'+esc(o.creditName||'Sem nome')+'</strong></div><div><span>Moto</span><strong>'+esc(o.bike||'Não informada')+'</strong></div><div><span>Placa</span><strong>'+esc(o.plate||'Não informada')+'</strong></div><div><span>Data</span><strong>'+dateV22(o.date)+'</strong></div></div>'+
        '<div class="credit-detail-summary-v23"><div><span>Total da venda</span><b>'+money(totalV22(o))+'</b></div><div><span>Já pagou</span><b class="money-positive">'+money(paidV23(o))+'</b></div><div><span>Falta pagar</span><b>'+money(dueV23(o))+'</b></div></div>'+
        '<div class="credit-history-title-v23">Itens da venda</div>'+
        '<div class="credit-sale-items-v25">'+items+(Number(o.labor||0)>0?'<div class="credit-sale-item-v25 labor"><span class="credit-sale-number-v25"><i class="bi bi-wrench-adjustable"></i></span><div><strong>Mão de obra</strong><small>Serviço</small></div><b>'+money(Number(o.labor||0))+'</b></div>':'')+'</div>'+
        '<div class="credit-history-title-v23">Histórico de pagamentos</div>'+
        (pays.length?pays.map(p=>'<div class="credit-payment-row-v23"><span>'+dateV22(p.date)+(p.note?' • '+esc(p.note):'')+'</span><b>'+money(p.amount)+'</b></div>').join(''):'<div class="empty-state"><strong>Nenhum pagamento registrado</strong></div>')+
        '</div>',
        (dueV23(o)>0?'<button class="btn-gold" id="payFromCreditDetailV25">Registrar pagamento</button>':'')+'<button class="btn-dark-soft" data-close-action>Fechar</button>',false);
      document.querySelector('[data-close-action]').onclick=closeModal;
      const pay=document.getElementById('payFromCreditDetailV25');
      if(pay)pay.onclick=()=>{closeModal();openPaymentV23(o.id);};
    }

    document.querySelectorAll('[data-credit-filter-v22]').forEach(btn=>btn.onclick=()=>{
      status=btn.dataset.creditFilterV22;
      document.querySelectorAll('[data-credit-filter-v22]').forEach(x=>x.classList.toggle('active',x===btn));
      renderList();
    });
    search.oninput=renderList;
    renderList();
  };

  // Add debtor name to sales/finance cards when the payment is Fiado.
  const previousMovementsV22=window.renderMovements;
  if(previousMovementsV22){
    window.renderMovements=function(){
      previousMovementsV22();
      const all=getOrdersV22();
      document.querySelectorAll('#orderListV11 .order-card-v9').forEach(card=>{
        const id=Number(card.querySelector('[data-view-v10]')?.dataset.viewV10||0);
        const o=all.find(x=>Number(x.id)===id);
        if(!o||o.payment!=='fiado')return;
        const info=card.querySelector('.order-card-v9-info small');
        if(info&&!info.querySelector('.credit-person-chip-v22')){
          info.insertAdjacentHTML('beforeend',` <span class="credit-person-chip-v22"><i class="bi bi-person"></i> ${esc(o.creditName||'Sem nome')}</span>`);
        }
      });
    };
  }

  const previousFinanceV22=window.renderFinance;
  if(previousFinanceV22){
    window.renderFinance=function(){
      previousFinanceV22();
      const all=getOrdersV22();
      document.querySelectorAll('[data-fin-order]').forEach(card=>{
        const o=all.find(x=>Number(x.id)===Number(card.dataset.finOrder));
        if(!o||o.payment!=='fiado')return;
        const meta=card.querySelector('.finance-order-meta-v13');
        if(meta&&!meta.querySelector('.credit-person-chip-v22')){
          meta.insertAdjacentHTML('beforeend',`<span class="credit-person-chip-v22"><i class="bi bi-person"></i> ${esc(o.creditName||'Sem nome')}</span>`);
        }
      });
    };
  }

  seedCreditDemoV22();
})();
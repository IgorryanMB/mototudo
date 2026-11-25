
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
    const open=all.filter(o=>(o.creditStatus||'open')==='open');
    const paid=all.filter(o=>o.creditStatus==='paid');
    const openTotal=open.reduce((s,o)=>s+totalV22(o),0);
    const paidTotal=paid.reduce((s,o)=>s+totalV22(o),0);
    const names=[...new Set(all.map(o=>(o.creditName||'Sem nome').trim()))];

    appView.innerHTML=`
      <section class="page-stack">
        <div class="kpi-row">
          <div class="metric-card"><span>Total em aberto</span><strong class="credit-open-money-v22">${money(openTotal)}</strong><small>${open.length} pedido(s) para receber</small></div>
          <div class="metric-card"><span>Clientes fiado</span><strong>${names.length}</strong><small>Pessoas cadastradas</small></div>
          <div class="metric-card"><span>Já recebido</span><strong class="money-positive">${money(paidTotal)}</strong><small>${paid.length} pedido(s) quitado(s)</small></div>
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
      if(status!=='all')list=list.filter(o=>(o.creditStatus||'open')===status);
      if(q)list=list.filter(o=>normV22([o.creditName,o.name,o.code,o.bike,o.plate,o.note].join(' ')).includes(q));

      const grouped={};
      list.forEach(o=>{
        const key=(o.creditName||'Sem nome').trim()||'Sem nome';
        (grouped[key]??=[]).push(o);
      });

      const root=document.getElementById('creditListV22');
      const entries=Object.entries(grouped);
      root.innerHTML=entries.length?entries.map(([name,orders])=>{
        const due=orders.reduce((s,o)=>s+totalV22(o),0);
        const openCount=orders.filter(o=>(o.creditStatus||'open')==='open').length;
        return `
          <article class="credit-customer-v22">
            <div class="credit-customer-head-v22">
              <div class="credit-avatar-v22"><i class="bi bi-person-fill"></i></div>
              <div class="grow"><strong>${esc(name)}</strong><small>${orders.length} pedido(s) • ${openCount} em aberto</small></div>
              <div class="credit-customer-total-v22"><span>Total exibido</span><b>${money(due)}</b></div>
            </div>
            <div class="credit-orders-v22">
              ${orders.map(o=>`
                <div class="credit-order-v22 ${(o.creditStatus||'open')==='paid'?'paid':''}">
                  <div class="credit-order-main-v22">
                    <strong>${esc(o.name||o.code)}</strong>
                    <small><span class="code">${esc(o.code||'')}</span>${o.bike?' • '+esc(o.bike):''}${o.plate?' • '+esc(o.plate):''} • ${dateV22(o.date)}</small>
                  </div>
                  <div class="credit-order-value-v22">
                    <span>${(o.creditStatus||'open')==='paid'?'Pago':'Em aberto'}</span>
                    <b>${money(totalV22(o))}</b>
                  </div>
                  <div class="credit-order-actions-v22">
                    ${(o.creditStatus||'open')==='open'
                      ?`<button data-credit-pay-v22="${o.id}"><i class="bi bi-check2-circle"></i> Marcar como pago</button>`
                      :`<button class="secondary" data-credit-reopen-v22="${o.id}"><i class="bi bi-arrow-counterclockwise"></i> Reabrir</button>`}
                  </div>
                </div>`).join('')}
            </div>
          </article>`;
      }).join(''):'<div class="empty-state"><i class="bi bi-journal-check"></i><strong>Nenhum fiado encontrado</strong><span>Os pedidos pagos como Fiado aparecerão aqui.</span></div>';

      root.querySelectorAll('[data-credit-pay-v22]').forEach(btn=>btn.onclick=()=>markPaidV22(Number(btn.dataset.creditPayV22),true));
      root.querySelectorAll('[data-credit-reopen-v22]').forEach(btn=>btn.onclick=()=>markPaidV22(Number(btn.dataset.creditReopenV22),false));
    }

    function markPaidV22(id,paidState){
      const orders=getOrdersV22();
      const o=orders.find(x=>Number(x.id)===Number(id));
      if(!o)return;
      o.creditStatus=paidState?'paid':'open';
      o.creditPaidAt=paidState?new Date().toISOString():null;
      saveOrdersV22(orders);
      toast(paidState?'Fiado quitado':'Fiado reaberto',esc(o.creditName||o.name||o.code),paidState?'success':'danger');
      renderFiadosV22();
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
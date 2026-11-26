
(function(){
  function getOrdersV13(){
    return MotoTudoData.read('mt_orders',[])
  }
  function ymdV13(date){
    const d=new Date(date);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function orderRevenueV13(o){
    return (o.items||[]).reduce((s,i)=>s+Number(i.qty||0)*Number(i.unit||0),0)+Number(o.labor||0);
  }
  function orderCostV13(o){
    return (o.items||[]).reduce((s,i)=>{
      const p=products.find(x=>Number(x.id)===Number(i.productId));
      return s+Number(i.qty||0)*Number(i.unitCostSnapshot??p?.cost??0);
    },0);
  }
  function orderUnitsV13(o){
    return (o.items||[]).reduce((s,i)=>s+Number(i.qty||0),0);
  }

  function ensureFinanceOrdersV13(){
    if(window.MOTO_TUDO_ENABLE_DEMO!==true)return;
    let os=getOrdersV13();
    const demo=[
      {
        id:131301,code:'PED-261121-101',type:'out',date:'2026-11-21T10:22:00',
        name:'Revisão CG do Marcos',bike:'CG 160 2022',note:'Marcos',
        items:[
          {productId:1,product:'Kit Relação 428H',qty:1,unit:169.90,location:'A1 • P3'},
          {productId:7,product:'Vela Iridium CPR8EAIX',qty:1,unit:69.90,location:'A3 • P2'}
        ]
      },
      {
        id:131302,code:'PED-261122-102',type:'out',date:'2026-11-22T15:40:00',
        name:'Troca de óleo Fan',bike:'Fan 160 2021',note:'Renato',
        items:[
          {productId:4,product:'Óleo 10W30 Semissintético',qty:2,unit:46.90,location:'D1 • P4'},
          {productId:5,product:'Filtro de Óleo',qty:1,unit:42.00,location:'D2 • P2'}
        ]
      },
      {
        id:131303,code:'PED-261123-103',type:'out',date:'2026-11-23T09:18:00',
        name:'Freio CB 300',bike:'CB 300 2014',note:'André',
        items:[
          {productId:2,product:'Pastilha de Freio Dianteira',qty:1,unit:54.90,location:'B2 • P1'},
          {productId:16,product:'Fluido de Freio DOT 4',qty:1,unit:32.90,location:'D3 • P2'}
        ]
      },
      {
        id:131304,code:'PED-261124-104',type:'out',date:'2026-11-24T11:33:00',
        name:'Bateria Biz da Paula',bike:'Biz 125 2020',note:'Paula',
        items:[
          {productId:3,product:'Bateria 6Ah AGM',qty:1,unit:189.00,location:'C1 • P2'}
        ]
      },
      {
        id:131305,code:'PED-261124-105',type:'out',date:'2026-11-24T16:12:00',
        name:'Acessórios CG',bike:'CG 160 2023',note:'Lucas',
        items:[
          {productId:10,product:'Manete Esportivo Par',qty:1,unit:79.90,location:'E1 • P1'},
          {productId:18,product:'Retrovisor Esportivo Par',qty:1,unit:69.90,location:'E1 • P3'}
        ]
      },
      {
        id:131306,code:'PED-261125-106',type:'out',date:'2026-11-25T09:45:00',
        name:'Óleo CG 150',bike:'CG 150 2013',note:'Balcão',
        items:[
          {productId:17,product:'Óleo 20W50 Mineral',qty:2,unit:36.90,location:'D1 • P3'}
        ]
      },
      {
        id:131307,code:'PED-261125-107',type:'out',date:'2026-11-25T13:20:00',
        name:'Revisão Bros do Diego',bike:'Bros 160 2024',note:'Diego',
        items:[
          {productId:7,product:'Vela Iridium CPR8EAIX',qty:1,unit:69.90,location:'A3 • P2'},
          {productId:15,product:'Relé de Partida 12V',qty:1,unit:49.90,location:'C3 • P1'},
          {productId:16,product:'Fluido de Freio DOT 4',qty:1,unit:32.90,location:'D3 • P2'}
        ]
      }
    ];

    const codes=new Set(os.map(o=>o.code));
    demo.forEach(o=>{if(!codes.has(o.code))os.push(o)});
    MotoTudoData.write('mt_orders',os);
    try{orders=os}catch(e){}
  }

  function orderCardV13(o){
    return `
      <article class="finance-order-card-v13" data-fin-order="${o.id}">
        <div class="finance-order-icon-v13"><i class="bi bi-receipt-cutoff"></i></div>
        <div class="finance-order-main-v13">
          <div class="finance-order-title-v13">
            <strong>${esc(o.name||o.code||'Pedido')}</strong>
            <span class="code">${esc(o.code||'')}</span>
          </div>
          <small>${fmtDate(o.date)}${o.bike?' • '+esc(o.bike):''}${o.note?' • '+esc(o.note):''}</small>
          <div class="finance-order-meta-v13">
            <span><i class="bi bi-box-seam"></i> ${(o.items||[]).length} produto(s)</span>
            <span><i class="bi bi-bag"></i> ${orderUnitsV13(o)} un.</span>
          </div>
        </div>
        <div class="finance-order-total-v13">
          <span>Total</span>
          <strong>${money(orderRevenueV13(o))}</strong>
          <button type="button">Ver pedido <i class="bi bi-chevron-right"></i></button>
        </div>
      </article>`;
  }

  function openFinanceOrderV13(id){
    const o=getOrdersV13().find(x=>Number(x.id)===Number(id));
    if(!o)return;
    openModal(
      o.name||o.code||'Pedido',
      `<div class="finance-order-detail-v13">
        <div class="order-detail-meta-v9">
          <div><span>Pedido</span><strong>${esc(o.code||'—')}</strong></div>
          <div><span>Moto</span><strong>${esc(o.bike||'Não informada')}</strong></div>
          <div><span>Mão de obra</span><strong>${money(Number(o.labor||0))}</strong></div>
          <div><span>Total</span><strong class="order-detail-total-v9">${money(orderRevenueV13(o))}</strong></div>
        </div>
        <div class="finance-order-products-v13">
          ${(o.items||[]).map(i=>`
            <div>
              <div><strong>${esc(i.product)}</strong><small>${i.qty} un. × ${money(i.unit)}</small></div>
              <b>${money(Number(i.qty||0)*Number(i.unit||0))}</b>
            </div>`).join('')}
          ${Number(o.labor||0)>0?`<div class="finance-labor-row-v14"><div><strong><i class="bi bi-wrench-adjustable"></i> Mão de obra</strong><small>Serviço</small></div><b>${money(Number(o.labor||0))}</b></div>`:''}
        </div>
      </div>`,
      '<button class="btn-gold" data-close-action>Fechar</button>',
      false
    );
    document.querySelector('[data-close-action]').onclick=closeModal;
  }

  window.renderFinance=function(){
    ensureFinanceOrdersV13();

    setHeader('Financeiro','Veja os pedidos vendidos por dia e o total faturado em cada venda.');

    const allOrders=getOrdersV13()
      .filter(o=>o.type==='out'&&o.status!=='pending')
      .sort((a,b)=>new Date(b.date)-new Date(a.date));

    const today=ymdV13(new Date());
    const dates=[...new Set(allOrders.map(o=>ymdV13(o.date)))].sort().reverse();

    appView.innerHTML=`
      <section class="page-stack">
        <article class="panel page-panel finance-filter-panel-v12">
          <div class="finance-filter-head-v12">
            <div><span class="section-kicker">PERÍODO</span><h2>Pedidos vendidos por dia</h2></div>
            <div class="finance-filter-controls-v12">
              <button class="finance-quick-v12 active" data-finance-mode-v13="all">Todos</button>
              <button class="finance-quick-v12" data-finance-mode-v13="today">Hoje</button>
              <input type="date" class="form-control-dark finance-date-v12" id="financeDateV13">
            </div>
          </div>
          <div class="finance-date-chips-v12">
            ${dates.slice(0,8).map(d=>`<button data-finance-date-v13="${d}">${new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</button>`).join('')}
          </div>
        </article>

        <div class="kpi-row" id="financeKpisV13"></div>

        <article class="panel page-panel">
          <div class="panel-header compact">
            <div><span class="section-kicker">PEDIDOS</span><h2 id="financeTitleV13">Todos os pedidos vendidos</h2></div>
          </div>
          <div class="finance-search-v17">
            <i class="bi bi-search"></i>
            <input id="financeSearchV17" placeholder="Pesquisar por nome, número, moto, placa ou cliente...">
          </div>
          <div class="finance-order-list-v13" id="financeOrdersV13"></div>
        </article>
      </section>`;

    const input=document.getElementById('financeDateV13');
    const searchInput=document.getElementById('financeSearchV17');
    let currentMode='all';
    let currentValue='';

    function normalizeFinanceV17(s){
      return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    }

    function apply(mode,value=''){
      currentMode=mode;
      currentValue=value;
      document.querySelectorAll('[data-finance-mode-v13]').forEach(b=>b.classList.toggle('active',b.dataset.financeModeV13===mode));
      document.querySelectorAll('[data-finance-date-v13]').forEach(b=>b.classList.toggle('active',b.dataset.financeDateV13===value));

      let list=allOrders;
      let title='Todos os pedidos vendidos';

      if(mode==='today'){
        list=allOrders.filter(o=>ymdV13(o.date)===today);
        title='Pedidos vendidos hoje';
        input.value=today;
      }else if(mode==='date'&&value){
        list=allOrders.filter(o=>ymdV13(o.date)===value);
        title='Pedidos de '+new Date(value+'T12:00:00').toLocaleDateString('pt-BR');
        input.value=value;
      }else{
        input.value='';
      }

      const q=normalizeFinanceV17(searchInput?.value||'');
      if(q){
        list=list.filter(o=>normalizeFinanceV17([
          o.name,o.code,o.bike,o.plate,o.note,
          ...(o.items||[]).map(i=>i.product)
        ].join(' ')).includes(q));
      }

      const revenue=list.reduce((s,o)=>s+orderRevenueV13(o),0);
      const cost=list.reduce((s,o)=>s+orderCostV13(o),0);
      const profit=revenue-cost;
      const units=list.reduce((s,o)=>s+orderUnitsV13(o),0);

      document.getElementById('financeKpisV13').innerHTML=`
        <div class="metric-card"><span>Faturamento</span><strong class="money-positive">${money(revenue)}</strong><small>${list.length} pedido(s) vendido(s)</small></div>
        <div class="metric-card"><span>Custo estimado</span><strong>${money(cost)}</strong><small>Custo dos pedidos</small></div>
        <div class="metric-card"><span>Lucro estimado</span><strong class="money-positive">${money(profit)}</strong><small>Venda menos custo</small></div>
        <div class="metric-card"><span>Itens vendidos</span><strong>${units}</strong><small>Unidades nos pedidos</small></div>`;

      document.getElementById('financeTitleV13').textContent=title;
      document.getElementById('financeOrdersV13').innerHTML=list.length
        ?list.map(orderCardV13).join('')
        :'<div class="empty-state"><i class="bi bi-calendar-x"></i><strong>Nenhum pedido vendido nesta data</strong><span>Escolha outro dia.</span></div>';

      document.querySelectorAll('[data-fin-order]').forEach(card=>card.onclick=()=>openFinanceOrderV13(Number(card.dataset.finOrder)));
    }

    document.querySelectorAll('[data-finance-mode-v13]').forEach(b=>b.onclick=()=>apply(b.dataset.financeModeV13));
    document.querySelectorAll('[data-finance-date-v13]').forEach(b=>b.onclick=()=>apply('date',b.dataset.financeDateV13));
    input.onchange=()=>input.value?apply('date',input.value):apply('all');
    if(searchInput) searchInput.oninput=()=>apply(currentMode,currentValue);
    apply('all');
  };

  try{
    ensureFinanceOrdersV13();
    if(typeof state!=='undefined'&&state.view==='finance')renderFinance();
  }catch(e){console.error('Moto Tudo Finance v13',e);}
})();
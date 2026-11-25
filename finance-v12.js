
(function(){
  const DEMO_KEY='mt_finance_demo_v12';

  function seedFinanceDemoV12(){
    if(window.MOTO_TUDO_ENABLE_DEMO!==true) return;
    if(MotoTudoData.flagGet(DEMO_KEY)) return;

    const demoSales=[
      {id:120001,orderCode:'PED-261121-001',productId:1,product:'Kit Relação 428H',qty:1,unit:169.90,date:'2026-11-21T10:22:00',note:'Venda balcão • CG 160'},
      {id:120002,orderCode:'PED-261121-001',productId:7,product:'Vela Iridium CPR8EAIX',qty:1,unit:69.90,date:'2026-11-21T10:22:00',note:'Venda balcão • CG 160'},
      {id:120003,orderCode:'PED-261122-001',productId:4,product:'Óleo 10W30 Semissintético',qty:2,unit:46.90,date:'2026-11-22T15:40:00',note:'Troca de óleo • Fan 160'},
      {id:120004,orderCode:'PED-261122-001',productId:5,product:'Filtro de Óleo',qty:1,unit:42.00,date:'2026-11-22T15:40:00',note:'Troca de óleo • Fan 160'},
      {id:120005,orderCode:'PED-261123-001',productId:2,product:'Pastilha de Freio Dianteira',qty:1,unit:54.90,date:'2026-11-23T09:18:00',note:'Venda balcão • CB 300'},
      {id:120006,orderCode:'PED-261123-002',productId:16,product:'Fluido de Freio DOT 4',qty:1,unit:32.90,date:'2026-11-23T17:05:00',note:'Venda balcão • Bros'},
      {id:120007,orderCode:'PED-261124-001',productId:3,product:'Bateria 6Ah AGM',qty:1,unit:189.00,date:'2026-11-24T11:33:00',note:'Venda balcão • Biz'},
      {id:120008,orderCode:'PED-261124-002',productId:10,product:'Manete Esportivo Par',qty:1,unit:79.90,date:'2026-11-24T16:12:00',note:'Venda balcão • CG 160'},
      {id:120009,orderCode:'PED-261125-TESTE',productId:17,product:'Óleo 20W50 Mineral',qty:2,unit:36.90,date:'2026-11-25T09:45:00',note:'Venda teste • CG 150'}
    ];

    const existingIds=new Set(movements.map(m=>Number(m.id)));
    demoSales.forEach(m=>{if(!existingIds.has(m.id)) movements.push({...m,type:'out',location:products.find(p=>p.id===m.productId)?.location||''});});

    let os=[];
    os=MotoTudoData.read('mt_orders',[])
    const existingCodes=new Set(os.map(o=>o.code));
    const grouped={};
    demoSales.forEach(m=>{(grouped[m.orderCode]??=[]).push(m)});
    Object.entries(grouped).forEach(([code,items])=>{
      if(existingCodes.has(code))return;
      const first=items[0];
      const bike=(first.note.split('•')[1]||'').trim();
      os.push({
        id:130000+Object.keys(grouped).indexOf(code),
        code,
        type:'out',
        date:first.date,
        name:'Venda teste '+code.slice(-3),
        bike,
        note:first.note.split('•')[0].trim(),
        items:items.map(m=>({productId:m.productId,product:m.product,qty:m.qty,unit:m.unit,location:products.find(p=>p.id===m.productId)?.location||''}))
      });
    });

    MotoTudoData.write('mt_orders',os);
    MotoTudoData.write('mt_movements',movements);
    try{orders=os}catch(e){}
    MotoTudoData.flagSet(DEMO_KEY,'1');
  }

  function ymdV12(date){
    const d=new Date(date);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  function costForMovementV12(m){
    const p=products.find(x=>x.id===Number(m.productId));
    return Number(m.qty||0)*Number(p?.cost||0);
  }

  function renderFinanceRowsV12(list){
    if(!list.length)return '<div class="empty-state"><i class="bi bi-calendar-x"></i><strong>Sem vendas nesta data</strong><span>Escolha outro dia ou veja todas as vendas.</span></div>';
    return list.map(m=>`
      <div class="finance-sale-v12">
        <span class="mini-icon"><i class="bi bi-cash-coin"></i></span>
        <div class="grow">
          <strong>${esc(m.product)}</strong>
          <small>${fmtDate(m.date)} • ${m.qty} un. • <span class="code">${esc(m.orderCode||'—')}</span></small>
        </div>
        <div class="finance-sale-value-v12"><span>Venda</span><b>${money(Number(m.qty)*Number(m.unit))}</b></div>
      </div>`).join('');
  }

  window.renderFinance=function(){
    seedFinanceDemoV12();

    setHeader('Financeiro','Filtre as vendas por dia e acompanhe faturamento, custo e lucro estimado.');

    const allSales=movements
      .filter(m=>m.type==='out')
      .sort((a,b)=>new Date(b.date)-new Date(a.date));

    const today=ymdV12(new Date());
    const availableDates=[...new Set(allSales.map(m=>ymdV12(m.date)))].sort().reverse();

    appView.innerHTML=`
      <section class="page-stack">
        <article class="panel page-panel finance-filter-panel-v12">
          <div class="finance-filter-head-v12">
            <div>
              <span class="section-kicker">PERÍODO</span>
              <h2>Filtrar vendas por dia</h2>
            </div>
            <div class="finance-filter-controls-v12">
              <button class="finance-quick-v12 active" data-finance-mode="all">Todas</button>
              <button class="finance-quick-v12" data-finance-mode="today">Hoje</button>
              <input type="date" class="form-control-dark finance-date-v12" id="financeDateV12" value="">
            </div>
          </div>
          <div class="finance-date-chips-v12">
            ${availableDates.slice(0,7).map(d=>`<button data-finance-date="${d}">${new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</button>`).join('')}
          </div>
        </article>

        <div class="kpi-row" id="financeKpisV12"></div>

        <div class="two-col">
          <article class="panel page-panel">
            <div class="panel-header compact">
              <div><span class="section-kicker">VENDAS</span><h2 id="financeSalesTitleV12">Todas as vendas</h2></div>
            </div>
            <div id="financeSalesListV12"></div>
          </article>

          <article class="panel page-panel">
            <div class="panel-header compact">
              <div><span class="section-kicker">ESTOQUE</span><h2>Valor por categoria</h2></div>
            </div>
            ${categories.map(c=>{
              const ps=products.filter(p=>p.category===c.name);
              const cost=ps.reduce((s,p)=>s+p.stock*p.cost,0);
              const sale=ps.reduce((s,p)=>s+p.stock*p.price,0);
              return `<div class="list-card"><span class="product-icon"><i class="bi ${c.icon}"></i></span><div class="grow"><strong>${esc(c.name)}</strong><small>Custo ${money(cost)} • Venda ${money(sale)}</small></div><b>${money(sale-cost)}</b></div>`;
            }).join('')}
          </article>
        </div>
      </section>`;

    const dateInput=document.getElementById('financeDateV12');

    function applyFilter(mode,value=''){
      document.querySelectorAll('[data-finance-mode]').forEach(b=>b.classList.toggle('active',b.dataset.financeMode===mode));
      document.querySelectorAll('[data-finance-date]').forEach(b=>b.classList.toggle('active',b.dataset.financeDate===value));

      let list=allSales;
      let title='Todas as vendas';

      if(mode==='today'){
        list=allSales.filter(m=>ymdV12(m.date)===today);
        title='Vendas de hoje';
        dateInput.value=today;
      } else if(mode==='date'&&value){
        list=allSales.filter(m=>ymdV12(m.date)===value);
        title='Vendas de '+new Date(value+'T12:00:00').toLocaleDateString('pt-BR');
        dateInput.value=value;
      } else {
        dateInput.value='';
      }

      const revenue=list.reduce((s,m)=>s+Number(m.qty||0)*Number(m.unit||0),0);
      const cost=list.reduce((s,m)=>s+costForMovementV12(m),0);
      const profit=revenue-cost;
      const units=list.reduce((s,m)=>s+Number(m.qty||0),0);

      document.getElementById('financeKpisV12').innerHTML=`
        <div class="metric-card"><span>Faturamento</span><strong class="money-positive">${money(revenue)}</strong><small>${list.length} movimentação(ões)</small></div>
        <div class="metric-card"><span>Custo estimado</span><strong>${money(cost)}</strong><small>Custo dos itens vendidos</small></div>
        <div class="metric-card"><span>Lucro estimado</span><strong class="money-positive">${money(profit)}</strong><small>Venda menos custo</small></div>
        <div class="metric-card"><span>Itens vendidos</span><strong>${units}</strong><small>Unidades no período</small></div>`;

      document.getElementById('financeSalesTitleV12').textContent=title;
      document.getElementById('financeSalesListV12').innerHTML=renderFinanceRowsV12(list);
    }

    document.querySelectorAll('[data-finance-mode]').forEach(b=>b.onclick=()=>applyFilter(b.dataset.financeMode));
    document.querySelectorAll('[data-finance-date]').forEach(b=>b.onclick=()=>applyFilter('date',b.dataset.financeDate));
    dateInput.onchange=()=>dateInput.value?applyFilter('date',dateInput.value):applyFilter('all');
    applyFilter('all');
  };

  try{
    seedFinanceDemoV12();
    if(typeof state!=='undefined'&&state.view==='finance')renderFinance();
  }catch(e){console.error('Moto Tudo Finance v12',e);}
})();
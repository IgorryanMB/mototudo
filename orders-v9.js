
(function(){
  function batchesV9(){
    return MotoTudoData.read('mt_orders',[])
  }
  function saveBatchesV9(v){
    MotoTudoData.write('mt_orders',v);
    try{orders=v}catch(e){}
  }
  function orderTotalV9(o){return (o.items||[]).reduce((s,i)=>s+Number(i.qty||0)*Number(i.unit||0),0)}
  function orderUnitsV9(o){return (o.items||[]).reduce((s,i)=>s+Number(i.qty||0),0)}

  window.renderMovements = function(){
    setHeader('Movimentações','Veja pedidos vendidos, entradas, reposições e continue pedidos já finalizados.');
    const rows=[...movements].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const batches=batchesV9().sort((a,b)=>new Date(b.updatedAt||b.date)-new Date(a.updatedAt||a.date));

    appView.innerHTML=`
      <section class="page-stack">
        <div class="kpi-row">
          <div class="metric-card"><span>Pedidos vendidos</span><strong>${batches.filter(o=>o.type==='out').length}</strong><small>${batches.filter(o=>o.type==='out').reduce((s,o)=>s+orderUnitsV9(o),0)} unidades vendidas</small></div>
          <div class="metric-card"><span>Entradas / reposições</span><strong>${batches.filter(o=>o.type==='in').length}</strong><small>${batches.filter(o=>o.type==='in').reduce((s,o)=>s+orderUnitsV9(o),0)} unidades recebidas</small></div>
          <div class="metric-card"><span>Ajustes</span><strong>${movements.filter(m=>m.type==='adjust').length}</strong><small>Conferências de inventário</small></div>
          <div class="metric-card"><span>Faturamento simulado</span><strong>${money(salesRevenue())}</strong><small>Somatório das saídas registradas</small></div>
        </div>

        <article class="panel page-panel">
          <div class="panel-header">
            <div><span class="section-kicker">PEDIDOS E ENTRADAS</span><h2>Histórico agrupado</h2></div>
            <div class="toolbar">
              <button class="outline-button" id="mvIn"><i class="bi bi-plus-circle"></i>Nova reposição</button>
              <button class="outline-button" id="mvOut"><i class="bi bi-receipt"></i>Novo pedido</button>
              <button class="outline-button" id="mvInv"><i class="bi bi-clipboard-check"></i>Inventário</button>
            </div>
          </div>

          <div class="order-list-v9">
            ${batches.length?batches.map(o=>`
              <article class="order-card-v9">
                <div class="order-card-v9-main">
                  <span class="order-icon ${o.type==='out'?'out':'in'}"><i class="bi ${o.type==='out'?'bi-receipt-cutoff':'bi-box-arrow-in-down'}"></i></span>
                  <div class="order-card-v9-info">
                    <div class="order-title"><strong>${esc(o.code||'Sem código')}</strong><span class="badge-soft ${o.type==='out'?'red':'green'}">${o.type==='out'?'Venda / Saída':'Entrada / Reposição'}</span></div>
                    <small>${fmtDate(o.date)} • ${(o.items||[]).length} item(ns) • ${orderUnitsV9(o)} un.${o.note?' • '+esc(o.note):''}</small>
                    ${o.updatedAt&&o.updatedAt!==o.date?`<em>Atualizado em ${fmtDate(o.updatedAt)}</em>`:''}
                  </div>
                  <div class="order-card-v9-total"><span>Total</span><strong>${money(orderTotalV9(o))}</strong></div>
                </div>
                <div class="order-card-v9-actions">
                  <button data-view-order-v9="${o.id}"><i class="bi bi-eye"></i> Ver detalhes</button>
                  <button class="primary" data-add-order-v9="${o.id}"><i class="bi bi-plus-lg"></i> Adicionar itens</button>
                </div>
              </article>
            `).join(''):'<div class="empty-state"><i class="bi bi-receipt"></i><strong>Nenhum pedido ou entrada registrado</strong><span>Crie um novo pedido ou uma reposição.</span></div>'}
          </div>
        </article>

        <article class="panel page-panel">
          <div class="panel-header compact"><div><span class="section-kicker">HISTÓRICO TÉCNICO</span><h2>Itens movimentados</h2></div></div>
          <div class="table-responsive">
            <table class="table inventory-table movement-history-table">
              <thead><tr><th>Data</th><th>Pedido / lote</th><th>Tipo</th><th>Produto</th><th>Qtd.</th><th>Localização</th><th>Valor unit.</th></tr></thead>
              <tbody>${rows.map(m=>`<tr>
                <td>${fmtDate(m.date)}</td>
                <td><span class="code">${esc(m.orderCode||'—')}</span></td>
                <td><span class="badge-soft ${m.type==='in'?'green':m.type==='out'?'red':'gold'}">${m.type==='in'?'Entrada':m.type==='out'?'Saída':'Ajuste'}</span></td>
                <td>${esc(m.product)}</td><td>${m.qty}</td><td>${esc(m.location||'—')}</td><td>${money(m.unit||0)}</td>
              </tr>`).join('')}</tbody>
            </table>
          </div>
        </article>
      </section>`;

    document.getElementById('mvIn').onclick=()=>openMovementModal('in');
    document.getElementById('mvOut').onclick=()=>openMovementModal('out');
    document.getElementById('mvInv').onclick=()=>openInventoryModal();

    document.querySelectorAll('[data-view-order-v9]').forEach(b=>b.onclick=()=>openOrderDetailV9(Number(b.dataset.viewOrderV9)));
    document.querySelectorAll('[data-add-order-v9]').forEach(b=>b.onclick=()=>addToExistingOrderV9(Number(b.dataset.addOrderV9)));
  };

  window.openOrderDetailV9 = function(id){
    const o=batchesV9().find(x=>Number(x.id)===Number(id));
    if(!o)return;
    const total=orderTotalV9(o);
    openModal(
      (o.type==='out'?'Pedido ':'Entrada ')+(o.code||''),
      `<div class="order-detail-v9">
        <div class="order-detail-meta-v9">
          <div><span>Tipo</span><strong>${o.type==='out'?'Venda / Saída':'Entrada / Reposição'}</strong></div>
          <div><span>Data</span><strong>${fmtDate(o.date)}</strong></div>
          <div><span>Referência</span><strong>${esc(o.note||'Sem referência')}</strong></div>
          <div><span>Total</span><strong class="order-detail-total-v9">${money(total)}</strong></div>
        </div>
        <div class="order-detail-items-v9">
          ${(o.items||[]).map((i,idx)=>`
            <article>
              <span class="order-detail-number-v9">${idx+1}</span>
              <div class="order-detail-product-v9">
                <strong>${esc(i.product)}</strong>
                <small>${esc(i.location||'Sem localização')}</small>
              </div>
              <div><span>Qtd.</span><b>${i.qty}</b></div>
              <div><span>Unit.</span><b>${money(i.unit)}</b></div>
              <div><span>Subtotal</span><b>${money(Number(i.qty)*Number(i.unit))}</b></div>
            </article>
          `).join('')}
        </div>
      </div>`,
      `<button class="btn-dark-soft" data-close-action>Fechar</button><button class="btn-gold" id="addMoreFromDetailV9"><i class="bi bi-plus-lg"></i> Adicionar mais itens</button>`,
      false
    );
    document.querySelector('[data-close-action]').onclick=closeModal;
    document.getElementById('addMoreFromDetailV9').onclick=()=>{closeModal();addToExistingOrderV9(o.id);};
  };

  window.addToExistingOrderV9 = function(id){
    const all=batchesV9();
    const o=all.find(x=>Number(x.id)===Number(id));
    if(!o)return;
    const isOut=o.type==='out';
    const selected=[];

    openModal(
      'Adicionar itens • '+o.code,
      `<div class="movement-v8">
        <div class="existing-order-banner-v9">
          <span class="order-icon ${isOut?'out':'in'}"><i class="bi ${isOut?'bi-receipt-cutoff':'bi-box-arrow-in-down'}"></i></span>
          <div><strong>${esc(o.code)}</strong><small>${isOut?'Pedido já finalizado':'Entrada já registrada'} • atual: ${money(orderTotalV9(o))}</small></div>
        </div>

        <div class="product-picker-v8">
          <label>Adicionar novo produto</label>
          <div class="picker-search-wrap">
            <i class="bi bi-search"></i>
            <input id="existingSearchV9" placeholder="Digite nome, código, marca ou aplicação..." autocomplete="off">
          </div>
          <div id="existingResultsV9" class="picker-results-v8"></div>
        </div>

        <div class="selected-head-v8"><span>Novos itens</span><b id="existingCountV9">0</b></div>
        <div id="existingSelectedV9" class="selected-products-v8"></div>
        <div class="order-summary"><span>Valor adicional</span><strong id="existingTotalV9">R$ 0,00</strong></div>
      </div>`,
      `<button class="btn-dark-soft" data-close-action>Cancelar</button><button class="btn-gold" id="saveExistingV9">Adicionar ao ${isOut?'pedido':'lote'}</button>`,
      false
    );

    const search=document.getElementById('existingSearchV9');
    const results=document.getElementById('existingResultsV9');
    const list=document.getElementById('existingSelectedV9');
    const count=document.getElementById('existingCountV9');

    function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
    function renderResults(q=''){
      q=norm(q);
      const arr=products.filter(p=>{
        if(selected.some(i=>i.productId===p.id))return false;
        if(!q)return true;
        return norm([p.name,p.code,p.brand,p.application].join(' ')).includes(q);
      }).slice(0,8);
      results.innerHTML=arr.length?arr.map(p=>`
        <button type="button" class="picker-result-card" data-existing-pick="${p.id}">
          <span class="picker-result-icon"><i class="bi ${catIcon(p.category)}"></i></span>
          <span class="picker-result-main"><strong>${esc(p.name)}</strong><small>${esc(p.code)} • ${esc(p.brand)} • ${esc(p.application)}</small></span>
          <span class="picker-result-stock"><b>${p.stock} un.</b><small>${esc(p.location||'Sem local')}</small></span>
          <i class="bi bi-plus-circle-fill"></i>
        </button>`).join(''):'<div class="picker-empty">Nenhum produto encontrado.</div>';
      results.querySelectorAll('[data-existing-pick]').forEach(b=>b.onclick=()=>add(Number(b.dataset.existingPick)));
    }

    function add(pid){
      const p=products.find(x=>x.id===pid);
      if(!p||selected.some(i=>i.productId===pid))return;
      selected.push({productId:p.id,qty:1,unit:isOut?p.price:p.cost,location:p.location||''});
      search.value='';renderSelected();renderResults('');search.focus();
    }

    function total(){
      document.getElementById('existingTotalV9').textContent=money(selected.reduce((s,i)=>s+Number(i.qty||0)*Number(i.unit||0),0));
    }

    function renderSelected(){
      count.textContent=selected.length;
      if(!selected.length){
        list.innerHTML='<div class="selected-empty-v8"><i class="bi bi-bag-plus"></i><strong>Nenhum item novo</strong><span>Pesquise e adicione produtos acima.</span></div>';
        total();return;
      }
      list.innerHTML=selected.map((i,idx)=>{
        const p=products.find(x=>x.id===i.productId);
        return `<article class="selected-product-card-v8">
          <div class="selected-product-top">
            <span class="picker-result-icon"><i class="bi ${catIcon(p.category)}"></i></span>
            <div><strong>${esc(p.name)}</strong><small>${esc(p.code)} • estoque atual: ${p.stock} un.</small></div>
            <button type="button" class="remove-selected-v8" data-v9-remove="${idx}"><i class="bi bi-trash3"></i></button>
          </div>
          <div class="selected-product-fields-v8">
            <div class="form-field"><label>Quantidade</label><input class="form-control-dark" data-v9-qty="${idx}" type="number" min="1" value="${i.qty}"></div>
            <div class="form-field"><label>${isOut?'Preço unit.':'Custo unit.'}</label><input class="form-control-dark" data-v9-unit="${idx}" type="number" min="0" step="0.01" value="${i.unit}"></div>
            ${isOut?'':`<div class="form-field location-v8"><label>Onde foi guardado?</label><input class="form-control-dark" data-v9-location="${idx}" value="${esc(i.location)}"></div>`}
          </div>
        </article>`;
      }).join('');

      list.querySelectorAll('[data-v9-remove]').forEach(b=>b.onclick=()=>{selected.splice(Number(b.dataset.v9Remove),1);renderSelected();renderResults(search.value);});
      list.querySelectorAll('[data-v9-qty]').forEach(inp=>inp.oninput=()=>{selected[Number(inp.dataset.v9Qty)].qty=Number(inp.value);total();});
      list.querySelectorAll('[data-v9-unit]').forEach(inp=>inp.oninput=()=>{selected[Number(inp.dataset.v9Unit)].unit=Number(inp.value);total();});
      list.querySelectorAll('[data-v9-location]').forEach(inp=>inp.oninput=()=>{selected[Number(inp.dataset.v9Location)].location=inp.value;});
      total();
    }

    search.oninput=()=>renderResults(search.value);
    search.onfocus=()=>renderResults(search.value);
    document.querySelector('[data-close-action]').onclick=closeModal;
    renderResults('');renderSelected();

    document.getElementById('saveExistingV9').onclick=()=>{
      if(!selected.length){toast('Adicione produtos','Escolha pelo menos um novo item.','danger');return;}
      if(selected.some(i=>!i.qty||i.qty<1||Number.isNaN(i.unit))){toast('Confira os itens','Quantidade e valor precisam ser válidos.','danger');return;}
      if(!isOut&&selected.some(i=>!String(i.location||'').trim())){toast('Informe a localização','Diga onde cada peça foi guardada.','danger');return;}
      if(isOut){
        const lack=selected.find(i=>i.qty>(products.find(p=>p.id===i.productId)?.stock||0));
        if(lack){const p=products.find(x=>x.id===lack.productId);toast('Estoque insuficiente',p.name+': só há '+p.stock+' un.','danger');return;}
      }

      const now=new Date().toISOString();
      selected.forEach((i,k)=>{
        const p=products.find(x=>x.id===i.productId);
        p.stock+=isOut?-Number(i.qty):Number(i.qty);
        if(!isOut)p.location=String(i.location).trim();
        const loc=isOut?(p.location||''):String(i.location).trim();
        const newItem={productId:p.id,product:p.name,qty:Number(i.qty),unit:Number(i.unit),location:loc,addedAt:now};
        o.items=o.items||[];
        o.items.push(newItem);
        movements.unshift({
          id:Date.now()+k,orderId:o.id,orderCode:o.code,type:o.type,
          productId:p.id,product:p.name,qty:Number(i.qty),unit:Number(i.unit),
          location:loc,date:now,note:(isOut?'Item adicionado ao pedido':'Item adicionado à entrada')+' '+o.code
        });
      });

      o.updatedAt=now;
      saveBatchesV9(all);
      persist();closeModal();render();
      toast('Pedido atualizado',o.code+' recebeu '+selected.length+' novo(s) item(ns).','success');
    };
  };

  try{ if(state&&state.view==='movements') renderMovements(); }catch(e){console.error('Moto Tudo v9',e);}
})();
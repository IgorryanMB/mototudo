
(function(){
  function getOrdersV10(){
    try{return JSON.parse(localStorage.getItem('mt_orders')||'[]')}catch{return []}
  }
  function setOrdersV10(v){
    localStorage.setItem('mt_orders',JSON.stringify(v));
    try{orders=v}catch(e){}
  }
  function totalV10(o){return (o.items||[]).reduce((s,i)=>s+Number(i.qty||0)*Number(i.unit||0),0)+Number(o.labor||0)}
  function unitsV10(o){return (o.items||[]).reduce((s,i)=>s+Number(i.qty||0),0)}
  function normV10(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}

  window.renderMovements=function(){
    setHeader('Movimentações','Veja e edite pedidos vendidos, entradas e reposições.');
    const rows=[...movements].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const batches=getOrdersV10().sort((a,b)=>new Date(b.updatedAt||b.date)-new Date(a.updatedAt||a.date));

    appView.innerHTML=`
      <section class="page-stack">
        <div class="kpi-row">
          <div class="metric-card"><span>Pedidos vendidos</span><strong>${batches.filter(o=>o.type==='out').length}</strong><small>${batches.filter(o=>o.type==='out').reduce((s,o)=>s+unitsV10(o),0)} unidades vendidas</small></div>
          <div class="metric-card"><span>Entradas / reposições</span><strong>${batches.filter(o=>o.type==='in').length}</strong><small>${batches.filter(o=>o.type==='in').reduce((s,o)=>s+unitsV10(o),0)} unidades recebidas</small></div>
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

          <div class="order-search-v11">
            <i class="bi bi-search"></i>
            <input id="orderSearchV11" placeholder="Pesquisar por nome, número, cliente, referência ou produto...">
          </div>

          <div class="order-list-v9" id="orderListV11">
            ${batches.length?batches.map(o=>`
              <article class="order-card-v9" data-order-search="${esc([o.name||o.code,o.code,o.bike,o.note,...(o.items||[]).map(i=>i.product)].join(' ').toLowerCase())}">
                <div class="order-card-v9-main">
                  <span class="order-icon ${o.type==='out'?'out':'in'}"><i class="bi ${o.type==='out'?'bi-receipt-cutoff':'bi-box-arrow-in-down'}"></i></span>
                  <div class="order-card-v9-info">
                    <div class="order-title"><strong>${esc(o.name||o.code||'Sem nome')}</strong><span class="badge-soft ${o.type==='out'?'red':'green'}">${o.type==='out'?'Venda / Saída':'Entrada / Reposição'}</span></div>
                    <small><span class="code">${esc(o.code||'Sem código')}</span>${o.bike?' • '+esc(o.bike):''} • ${fmtDate(o.date)} • ${(o.items||[]).length} item(ns) • ${unitsV10(o)} un.${o.note?' • '+esc(o.note):''}</small>
                    ${o.updatedAt?`<em>Última alteração: ${fmtDate(o.updatedAt)}</em>`:''}
                  </div>
                  <div class="order-card-v9-total"><span>Total</span><strong>${money(totalV10(o))}</strong></div>
                </div>
                <div class="order-card-v9-actions">
                  <button data-view-v10="${o.id}"><i class="bi bi-eye"></i> Ver</button>
                  <button class="primary" data-edit-v10="${o.id}"><i class="bi bi-pencil-square"></i> Editar pedido</button>
                </div>
              </article>
            `).join(''):'<div class="empty-state"><i class="bi bi-receipt"></i><strong>Nenhum pedido ou entrada registrado</strong></div>'}
          </div>
        </article>

        <article class="panel page-panel">
          <div class="panel-header compact"><div><span class="section-kicker">HISTÓRICO TÉCNICO</span><h2>Itens movimentados</h2></div></div>
          <div class="table-responsive"><table class="table inventory-table movement-history-table">
            <thead><tr><th>Data</th><th>Pedido / lote</th><th>Tipo</th><th>Produto</th><th>Qtd.</th><th>Localização</th><th>Valor unit.</th></tr></thead>
            <tbody>${rows.map(m=>`<tr>
              <td>${fmtDate(m.date)}</td><td><span class="code">${esc(m.orderCode||'—')}</span></td>
              <td><span class="badge-soft ${m.type==='in'?'green':m.type==='out'?'red':'gold'}">${m.type==='in'?'Entrada':m.type==='out'?'Saída':'Ajuste'}</span></td>
              <td>${esc(m.product)}</td><td>${m.qty}</td><td>${esc(m.location||'—')}</td><td>${money(m.unit||0)}</td>
            </tr>`).join('')}</tbody>
          </table></div>
        </article>
      </section>`;

    document.getElementById('mvIn').onclick=()=>openMovementModal('in');
    document.getElementById('mvOut').onclick=()=>openMovementModal('out');
    document.getElementById('mvInv').onclick=()=>openInventoryModal();
    document.querySelectorAll('[data-view-v10]').forEach(b=>b.onclick=()=>openViewV10(Number(b.dataset.viewV10)));
    document.querySelectorAll('[data-edit-v10]').forEach(b=>b.onclick=()=>openEditV10(Number(b.dataset.editV10)));
    const orderSearch=document.getElementById('orderSearchV11');
    if(orderSearch){
      orderSearch.oninput=()=>{
        const q=normV10(orderSearch.value);
        document.querySelectorAll('#orderListV11 .order-card-v9').forEach(card=>{
          card.style.display=!q||normV10(card.dataset.orderSearch).includes(q)?'':'none';
        });
      };
    }
  };

  function openViewV10(id){
    const o=getOrdersV10().find(x=>Number(x.id)===Number(id));
    if(!o)return;
    openModal(
      (o.type==='out'?'Pedido ':'Entrada ')+(o.code||''),
      `<div class="order-detail-v9">
        <div class="order-detail-meta-v9">
          <div><span>Nome</span><strong>${esc(o.name||o.code||'Sem nome')}</strong></div>
          <div><span>Moto</span><strong>${esc(o.bike||'Não informada')}</strong></div>
          <div><span>Mão de obra</span><strong>${money(Number(o.labor||0))}</strong></div>
          <div><span>Total</span><strong class="order-detail-total-v9">${money(totalV10(o))}</strong></div>
        </div>
        <div class="order-detail-items-v9">${(o.items||[]).map((i,k)=>`
          <article>
            <span class="order-detail-number-v9">${k+1}</span>
            <div class="order-detail-product-v9"><strong>${esc(i.product)}</strong><small>${esc(i.location||'Sem localização')}</small></div>
            <div><span>Qtd.</span><b>${i.qty}</b></div>
            <div><span>Unit.</span><b>${money(i.unit)}</b></div>
            <div><span>Subtotal</span><b>${money(Number(i.qty)*Number(i.unit))}</b></div>
          </article>`).join('')}</div>
      </div>`,
      `<button class="btn-dark-soft" data-close-action>Fechar</button><button class="btn-gold" id="editFromViewV10"><i class="bi bi-pencil"></i> Editar pedido</button>`,
      false
    );
    document.querySelector('[data-close-action]').onclick=closeModal;
    document.getElementById('editFromViewV10').onclick=()=>{closeModal();openEditV10(o.id);};
  }

  function openEditV10(id){
    const all=getOrdersV10();
    const o=all.find(x=>Number(x.id)===Number(id));
    if(!o)return;
    const isOut=o.type==='out';

    // snapshot original for stock delta calculation
    const original=(o.items||[]).map(i=>({...i,qty:Number(i.qty),unit:Number(i.unit)}));
    let draft=original.map(i=>({...i}));

    openModal(
      'Editar • '+o.code,
      `<div class="movement-v8">
        <div class="existing-order-banner-v9">
          <span class="order-icon ${isOut?'out':'in'}"><i class="bi ${isOut?'bi-receipt-cutoff':'bi-box-arrow-in-down'}"></i></span>
          <div><strong>${esc(o.code)}</strong><small>Você pode alterar quantidades, remover itens ou adicionar novos.</small></div>
        </div>

        <div class="movement-meta">
          <div class="form-field"><label>Nome / apelido do pedido</label><input class="form-control-dark" id="editOrderNameV11" value="${esc(o.name||o.code||'')}"></div>
          <div class="form-field"><label>Moto</label><input class="form-control-dark" id="editOrderBikeV11" value="${esc(o.bike||'')}" placeholder="Ex.: CG 160 2023"></div>
          <div class="form-field full"><label>Cliente / referência</label><input class="form-control-dark" id="editOrderNoteV10" value="${esc(o.note||'')}"></div>
        </div>
        ${isOut?`<div class="labor-box-v14">
          <div class="labor-icon-v14"><i class="bi bi-wrench-adjustable-circle"></i></div>
          <div class="labor-copy-v14"><strong>Mão de obra</strong><small>Valor do serviço realizado</small></div>
          <div class="labor-input-v14"><span>R$</span><input id="editLaborV14" type="number" min="0" step="0.01" value="${Number(o.labor||0)}"></div>
        </div>`:''}

        <div class="product-picker-v8">
          <label>Adicionar outro produto</label>
          <div class="picker-search-wrap"><i class="bi bi-search"></i><input id="editSearchV10" placeholder="Digite nome, código, marca ou aplicação..." autocomplete="off"></div>
          <div id="editResultsV10" class="picker-results-v8"></div>
        </div>

        <div class="selected-head-v8"><span>Itens do ${isOut?'pedido':'lote'}</span><b id="editCountV10">0</b></div>
        <div id="editItemsV10" class="selected-products-v8"></div>
        <div class="order-summary"><span>Novo total</span><strong id="editTotalV10">R$ 0,00</strong></div>
      </div>`,
      `<button class="btn-dark-soft" data-close-action>Cancelar</button><button class="btn-gold" id="saveEditV10">Salvar alterações</button>`,
      false
    );

    const search=document.getElementById('editSearchV10');
    const results=document.getElementById('editResultsV10');
    const list=document.getElementById('editItemsV10');
    const count=document.getElementById('editCountV10');

    function renderResults(q=''){
      q=normV10(q);
      const arr=products.filter(p=>{
        if(draft.some(i=>Number(i.productId)===Number(p.id)))return false;
        if(!q)return true;
        return normV10([p.name,p.code,p.brand,p.application].join(' ')).includes(q);
      }).slice(0,8);
      results.innerHTML=arr.length?arr.map(p=>`
        <button type="button" class="picker-result-card" data-pick-v10="${p.id}">
          <span class="picker-result-icon"><i class="bi ${catIcon(p.category)}"></i></span>
          <span class="picker-result-main"><strong>${esc(p.name)}</strong><small>${esc(p.code)} • ${esc(p.brand)} • ${esc(p.application)}</small></span>
          <span class="picker-result-stock"><b>${p.stock} un.</b><small>${esc(p.location||'Sem local')}</small></span>
          <i class="bi bi-plus-circle-fill"></i>
        </button>`).join(''):'<div class="picker-empty">Nenhum produto encontrado.</div>';
      results.querySelectorAll('[data-pick-v10]').forEach(b=>b.onclick=()=>addItem(Number(b.dataset.pickV10)));
    }

    function addItem(pid){
      const p=products.find(x=>x.id===pid);
      if(!p)return;
      draft.push({productId:p.id,product:p.name,qty:1,unit:isOut?p.price:p.cost,location:p.location||'',addedAt:new Date().toISOString()});
      search.value='';renderDraft();renderResults('');search.focus();
    }

    function calc(){const items=draft.reduce((s,i)=>s+Number(i.qty||0)*Number(i.unit||0),0);const labor=isOut?Number(document.getElementById('editLaborV14')?.value||0):0;document.getElementById('editTotalV10').textContent=money(items+labor)}

    function renderDraft(){
      count.textContent=draft.length;
      list.innerHTML=draft.length?draft.map((i,k)=>{
        const p=products.find(x=>x.id===Number(i.productId));
        return `<article class="selected-product-card-v8">
          <div class="selected-product-top">
            <span class="picker-result-icon"><i class="bi ${catIcon(p?.category||'')}"></i></span>
            <div><strong>${esc(i.product||p?.name||'Produto')}</strong><small>${esc(p?.code||'')} • estoque atual: ${p?.stock??0} un.</small></div>
            <button type="button" class="remove-selected-v8" data-remove-v10="${k}"><i class="bi bi-trash3"></i></button>
          </div>
          <div class="selected-product-fields-v8">
            <div class="form-field"><label>Quantidade</label><input class="form-control-dark" data-qty-v10="${k}" type="number" min="1" value="${i.qty}"></div>
            <div class="form-field"><label>${isOut?'Preço unit.':'Custo unit.'}</label><input class="form-control-dark" data-unit-v10="${k}" type="number" min="0" step="0.01" value="${i.unit}"></div>
            ${isOut?'':`<div class="form-field location-v8"><label>Onde foi guardado?</label><input class="form-control-dark" data-loc-v10="${k}" value="${esc(i.location||'')}"></div>`}
          </div>
        </article>`;
      }).join(''):'<div class="selected-empty-v8"><strong>Nenhum item</strong><span>Adicione pelo menos um produto.</span></div>';

      list.querySelectorAll('[data-remove-v10]').forEach(b=>b.onclick=()=>{draft.splice(Number(b.dataset.removeV10),1);renderDraft();renderResults(search.value);});
      list.querySelectorAll('[data-qty-v10]').forEach(inp=>inp.oninput=()=>{draft[Number(inp.dataset.qtyV10)].qty=Number(inp.value);calc();});
      list.querySelectorAll('[data-unit-v10]').forEach(inp=>inp.oninput=()=>{draft[Number(inp.dataset.unitV10)].unit=Number(inp.value);calc();});
      list.querySelectorAll('[data-loc-v10]').forEach(inp=>inp.oninput=()=>{draft[Number(inp.dataset.locV10)].location=inp.value;});
      calc();
    }

    search.oninput=()=>renderResults(search.value);
    search.onfocus=()=>renderResults(search.value);
    document.querySelector('[data-close-action]').onclick=closeModal;
    renderResults('');renderDraft();
    if(isOut&&document.getElementById('editLaborV14')) document.getElementById('editLaborV14').oninput=calc;

    document.getElementById('saveEditV10').onclick=()=>{
      if(!draft.length){toast('Pedido vazio','Mantenha pelo menos um item.','danger');return;}
      if(draft.some(i=>!i.qty||i.qty<1||Number.isNaN(Number(i.unit)))){toast('Confira os itens','Quantidade e valor precisam ser válidos.','danger');return;}
      if(!isOut&&draft.some(i=>!String(i.location||'').trim())){toast('Informe a localização','Todas as peças precisam ter localização.','danger');return;}

      // Build qty maps by product for original and draft
      const oldMap=new Map(original.map(i=>[Number(i.productId),Number(i.qty)]));
      const newMap=new Map(draft.map(i=>[Number(i.productId),Number(i.qty)]));
      const ids=new Set([...oldMap.keys(),...newMap.keys()]);

      // Validate stock before applying deltas
      for(const pid of ids){
        const p=products.find(x=>x.id===pid);
        if(!p)continue;
        const oldQty=oldMap.get(pid)||0;
        const newQty=newMap.get(pid)||0;
        const delta=newQty-oldQty;

        if(isOut && delta>0 && delta>p.stock){
          toast('Estoque insuficiente',p.name+': faltam '+(delta-p.stock)+' un. para salvar essa alteração.','danger');
          return;
        }
        if(!isOut && delta<0 && Math.abs(delta)>p.stock){
          toast('Não é possível reduzir a entrada',p.name+': parte desse estoque já pode ter sido utilizada.','danger');
          return;
        }
      }

      const now=new Date().toISOString();

      // Apply stock differences
      for(const pid of ids){
        const p=products.find(x=>x.id===pid);
        if(!p)continue;
        const oldQty=oldMap.get(pid)||0;
        const newQty=newMap.get(pid)||0;
        const delta=newQty-oldQty;

        if(isOut){
          p.stock-=delta; // increase sale => reduce stock, decrease sale => restore
        }else{
          p.stock+=delta; // increase entry => add stock, decrease entry => remove
        }

        const dItem=draft.find(i=>Number(i.productId)===pid);
        if(!isOut && dItem) p.location=String(dItem.location||'').trim();

        if(delta!==0){
          movements.unshift({
            id:Date.now()+pid,
            orderId:o.id,orderCode:o.code,type:o.type,
            productId:p.id,product:p.name,qty:delta,
            unit:Number(dItem?.unit||p.price||0),
            location:p.location||'',date:now,
            note:(delta>0?'Acréscimo em pedido editado':'Redução em pedido editado')+' '+o.code
          });
        }
      }

      o.items=draft.map(i=>({
        productId:Number(i.productId),
        product:i.product||products.find(p=>p.id===Number(i.productId))?.name||'Produto',
        qty:Number(i.qty),
        unit:Number(i.unit),
        location:isOut?(products.find(p=>p.id===Number(i.productId))?.location||''):String(i.location||'').trim(),
        addedAt:i.addedAt||now
      }));
      o.name=(document.getElementById('editOrderNameV11')?.value||'').trim()||o.code;
      o.bike=(document.getElementById('editOrderBikeV11')?.value||'').trim();
      o.note=document.getElementById('editOrderNoteV10').value.trim();
      o.labor=isOut?Number(document.getElementById('editLaborV14')?.value||0):0;
      o.updatedAt=now;

      setOrdersV10(all);
      persist();closeModal();render();
      toast('Pedido atualizado',o.code+' foi alterado com sucesso.','success');
    };
  }

  try{if(state&&state.view==='movements')renderMovements();}catch(e){console.error('Moto Tudo v10',e);}
})();
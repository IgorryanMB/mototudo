
(function(){
  function getBatches(){
    try{return JSON.parse(localStorage.getItem('mt_orders')||'[]')}catch{return []}
  }
  function saveBatches(v){
    localStorage.setItem('mt_orders',JSON.stringify(v));
    try{ if(typeof orders!=='undefined') orders=v; }catch(e){}
  }
  function batchCode(type){
    const d=new Date();
    const stamp=String(d.getFullYear()).slice(-2)+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
    const prefix=type==='out'?'PED':'ENT';
    const n=getBatches().filter(o=>String(o.code||'').startsWith(prefix+'-'+stamp+'-')).length+1;
    return prefix+'-'+stamp+'-'+String(n).padStart(3,'0');
  }

  window.productTable = function(list){
    if(!list.length)return '<div class="empty-state"><i class="bi bi-search"></i><strong>Nenhum produto encontrado</strong><span>Tente alterar a busca ou os filtros.</span></div>';
    return `<table class="table inventory-table align-middle"><thead><tr><th>Produto</th><th>Código</th><th>Aplicação</th><th>Local</th><th>Estoque</th><th>Venda</th><th>Status</th><th>Mov.</th></tr></thead><tbody>${list.map(p=>{
      const [cls,label]=getStatus(p);
      return `<tr>
        <td><div class="product-cell"><span class="product-icon"><i class="bi ${catIcon(p.category)}"></i></span><div><strong>${esc(p.name)}</strong><small>${esc(p.brand)}</small></div></div></td>
        <td><span class="code">${esc(p.code)}</span></td>
        <td>${esc(p.application)}</td>
        <td>${esc(p.location||'—')}</td>
        <td><strong>${p.stock} un.</strong><small class="stock-min">mín. ${p.min}</small></td>
        <td>${money(p.price)}</td>
        <td><span class="status ${cls}">${label}</span></td>
        <td><div class="stock-actions">
          <button class="stock-action plus" data-stock-in="${p.id}" title="Dar entrada / repor"><i class="bi bi-plus-lg"></i></button>
          <button class="stock-action minus" data-stock-out="${p.id}" title="Dar saída / vender"><i class="bi bi-dash-lg"></i></button>
        </div></td>
      </tr>`;
    }).join('')}</tbody></table>`;
  };

  window.bindRowMenus = function(){
    document.querySelectorAll('[data-stock-in]').forEach(btn=>{
      btn.onclick=e=>{e.stopPropagation();openMovementModal('in',Number(btn.dataset.stockIn));};
    });
    document.querySelectorAll('[data-stock-out]').forEach(btn=>{
      btn.onclick=e=>{e.stopPropagation();openMovementModal('out',Number(btn.dataset.stockOut));};
    });
  };

  window.renderMovements = function(){
    setHeader('Movimentações','Pedidos, entradas, reposições e ajustes do estoque.');
    const rows=[...movements].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const batches=getBatches().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,20);

    appView.innerHTML=`
      <section class="page-stack">
        <div class="kpi-row">
          <div class="metric-card"><span>Pedidos / saídas</span><strong>${batches.filter(o=>o.type==='out').length}</strong><small>${monthMovements('out')} unidades no mês</small></div>
          <div class="metric-card"><span>Reposições</span><strong>${batches.filter(o=>o.type==='in').length}</strong><small>${monthMovements('in')} unidades no mês</small></div>
          <div class="metric-card"><span>Ajustes</span><strong>${movements.filter(m=>m.type==='adjust').length}</strong><small>Conferências de inventário</small></div>
          <div class="metric-card"><span>Faturamento simulado</span><strong>${money(salesRevenue())}</strong><small>Baseado nas saídas registradas</small></div>
        </div>

        <article class="panel page-panel">
          <div class="panel-header">
            <div><span class="section-kicker">PEDIDOS E LOTES</span><h2>Movimentações agrupadas</h2></div>
            <div class="toolbar">
              <button class="outline-button" id="mvIn"><i class="bi bi-plus-circle"></i>Nova reposição</button>
              <button class="outline-button" id="mvOut"><i class="bi bi-receipt"></i>Novo pedido</button>
              <button class="outline-button" id="mvInv"><i class="bi bi-clipboard-check"></i>Inventário</button>
            </div>
          </div>

          <div class="order-list">
            ${batches.length?batches.map(o=>{
              const total=(o.items||[]).reduce((s,i)=>s+Number(i.qty||0)*Number(i.unit||0),0);
              return `<div class="order-card">
                <div class="order-main">
                  <span class="order-icon ${o.type==='out'?'out':'in'}"><i class="bi ${o.type==='out'?'bi-receipt-cutoff':'bi-box-arrow-in-down'}"></i></span>
                  <div class="grow">
                    <div class="order-title"><strong>${esc(o.code)}</strong><span class="badge-soft ${o.type==='out'?'red':'green'}">${o.type==='out'?'Pedido / Saída':'Entrada / Reposição'}</span></div>
                    <small>${fmtDate(o.date)} • ${(o.items||[]).length} item(ns)${o.note?' • '+esc(o.note):''}</small>
                  </div>
                  <div class="order-total"><span>${o.type==='out'?'Total':'Custo'}</span><strong>${money(total)}</strong></div>
                </div>
                <div class="order-items">
                  ${(o.items||[]).map(i=>`<div><span>${esc(i.product)}</span><b>${i.qty} un.</b><small><i class="bi bi-geo-alt"></i> ${esc(i.location||'Sem local')}</small></div>`).join('')}
                </div>
              </div>`;
            }).join(''):'<div class="empty-state"><i class="bi bi-receipt"></i><strong>Nenhum pedido ou reposição registrado</strong><span>Use “Novo pedido” ou “Nova reposição”.</span></div>'}
          </div>
        </article>

        <article class="panel page-panel">
          <div class="panel-header compact"><div><span class="section-kicker">HISTÓRICO DETALHADO</span><h2>Itens movimentados</h2></div></div>
          <div class="table-responsive"><table class="table inventory-table">
            <thead><tr><th>Data</th><th>Pedido / lote</th><th>Tipo</th><th>Produto</th><th>Qtd.</th><th>Localização</th><th>Valor unit.</th></tr></thead>
            <tbody>${rows.map(m=>`<tr>
              <td>${fmtDate(m.date)}</td>
              <td><span class="code">${esc(m.orderCode||'—')}</span></td>
              <td><span class="badge-soft ${m.type==='in'?'green':m.type==='out'?'red':'gold'}">${m.type==='in'?'Entrada':m.type==='out'?'Saída':'Ajuste'}</span></td>
              <td>${esc(m.product)}</td><td>${m.qty}</td><td>${esc(m.location||'—')}</td><td>${money(m.unit||0)}</td>
            </tr>`).join('')}</tbody>
          </table></div>
        </article>
      </section>`;

    document.getElementById('mvIn').onclick=()=>openMovementModal('in');
    document.getElementById('mvOut').onclick=()=>openMovementModal('out');
    document.getElementById('mvInv').onclick=()=>openInventoryModal();
  };

  window.openMovementModal = function(type,productId=null){
    const isOut=type==='out';
    const code=batchCode(type);

    openModal(
      isOut?'Novo pedido / saída':'Nova entrada / reposição',
      `<form id="movementForm"><div class="form-grid">
        <div class="form-field"><label>${isOut?'Número do pedido':'Número da entrada'}</label><input class="form-control-dark" id="batchCode" value="${code}" readonly></div>
        <div class="form-field"><label>${isOut?'Cliente / referência':'Fornecedor / referência'}</label><input class="form-control-dark" id="batchNote" placeholder="${isOut?'Ex.: balcão, João, oficina...':'Ex.: fornecedor ou NF...'}"></div>
        <div class="form-field full"><label>Itens</label><div id="movementItems" class="movement-items"></div>
          <button type="button" class="add-item-btn" id="addMovementItem"><i class="bi bi-plus-lg"></i>Adicionar outro produto</button>
        </div>
        <div class="form-field full"><div class="order-summary"><span>${isOut?'Total do pedido':'Total da entrada'}</span><strong id="movementTotal">R$ 0,00</strong></div></div>
      </div></form>`,
      `<button class="btn-dark-soft" data-close-action>Cancelar</button><button class="btn-gold" id="saveMovement">${isOut?'Finalizar pedido e dar baixa':'Registrar reposição'}</button>`,
      true
    );

    const wrap=document.getElementById('movementItems');
    let seq=0;

    function total(){
      let v=0;
      wrap.querySelectorAll('.movement-item-row').forEach(r=>v+=(Number(r.querySelector('[data-qty]').value)||0)*(Number(r.querySelector('[data-unit]').value)||0));
      document.getElementById('movementTotal').textContent=money(v);
    }

    function addRow(selectedId=null){
      const row=document.createElement('div');
      row.className='movement-item-row';
      row.innerHTML=`
        <div class="movement-item-head"><strong>Item ${++seq}</strong><button type="button" class="remove-item" title="Remover"><i class="bi bi-x-lg"></i></button></div>
        <div class="movement-item-grid ${isOut?'sale-grid':'entry-grid'}">
          <div class="form-field product-pick"><label>Produto</label><select class="form-select-dark" data-product>${optionsProducts(selectedId||'')}</select></div>
          <div class="form-field qty-pick"><label>Qtd.</label><input class="form-control-dark" data-qty type="number" min="1" value="1"></div>
          <div class="form-field unit-pick"><label>${isOut?'Preço unit.':'Custo unit.'}</label><input class="form-control-dark" data-unit type="number" min="0" step="0.01"></div>
          ${isOut?'':`<div class="form-field location-pick"><label>Onde foi guardado?</label><input class="form-control-dark" data-location placeholder="Ex.: Prateleira A • Caixa 2"></div>`}
        </div>`;
      wrap.appendChild(row);

      const sel=row.querySelector('[data-product]');
      const unit=row.querySelector('[data-unit]');
      const loc=row.querySelector('[data-location]');
      function sync(){
        const p=products.find(x=>x.id===Number(sel.value));
        unit.value=isOut?(p?.price||0):(p?.cost||0);
        if(loc)loc.value=p?.location||'';
        total();
      }
      sel.onchange=sync;
      row.querySelector('[data-qty]').oninput=total;
      unit.oninput=total;
      row.querySelector('.remove-item').onclick=()=>{
        if(wrap.children.length===1){toast('Mantenha um item','O pedido precisa ter pelo menos um produto.','danger');return;}
        row.remove();total();
      };
      sync();
    }

    addRow(productId);
    document.getElementById('addMovementItem').onclick=()=>addRow();
    document.querySelector('[data-close-action]').onclick=closeModal;

    document.getElementById('saveMovement').onclick=()=>{
      const rows=[...wrap.querySelectorAll('.movement-item-row')];
      const items=rows.map(r=>{
        const p=products.find(x=>x.id===Number(r.querySelector('[data-product]').value));
        return {productId:p?.id,product:p?.name||'',qty:Number(r.querySelector('[data-qty]').value),unit:Number(r.querySelector('[data-unit]').value),location:r.querySelector('[data-location]')?.value.trim()||''};
      });

      if(items.some(i=>!i.productId||!i.qty||i.qty<1||Number.isNaN(i.unit))){toast('Confira os itens','Preencha produto, quantidade e valor.','danger');return;}
      if(!isOut&&items.some(i=>!i.location)){toast('Informe a localização','Diga onde cada peça foi guardada.','danger');return;}
      if(new Set(items.map(i=>i.productId)).size!==items.length){toast('Produto repetido','Use cada produto uma vez e ajuste a quantidade.','danger');return;}

      if(isOut){
        const lack=items.find(i=>i.qty>(products.find(p=>p.id===i.productId)?.stock||0));
        if(lack){const p=products.find(x=>x.id===lack.productId);toast('Estoque insuficiente',p.name+': só há '+p.stock+' un.','danger');return;}
      }

      const note=document.getElementById('batchNote').value.trim();
      const date=new Date().toISOString();
      const batch={id:Date.now(),code,type,date,note,items:[]};

      items.forEach((i,k)=>{
        const p=products.find(x=>x.id===i.productId);
        p.stock+=isOut?-i.qty:i.qty;
        if(!isOut)p.location=i.location;
        const finalLoc=isOut?(p.location||''):i.location;
        batch.items.push({...i,product:p.name,location:finalLoc});
        movements.unshift({id:Date.now()+k,orderId:batch.id,orderCode:code,type,productId:p.id,product:p.name,qty:i.qty,unit:i.unit,location:finalLoc,date,note:note||(isOut?'Venda / pedido':'Reposição')});
      });

      const batches=getBatches();
      batches.unshift(batch);
      saveBatches(batches);
      localStorage.setItem('mt_products',JSON.stringify(products));
      localStorage.setItem('mt_movements',JSON.stringify(movements));
      try{persist();}catch(e){}
      closeModal();
      render();
      toast(isOut?'Pedido finalizado':'Reposição registrada',code+' salvo com '+items.length+' produto(s).','success');
    };
  };

  try{render();}catch(e){console.error('Moto Tudo patch v3:',e);}
})();

(function(){
  function getBatchesV8(){
    try{return JSON.parse(localStorage.getItem('mt_orders')||'[]')}catch{return []}
  }
  function saveBatchesV8(v){
    MotoTudoData.write('mt_orders',v);
    try{orders=v}catch(e){}
  }
  function batchCodeV8(type){
    const d=new Date();
    const stamp=String(d.getFullYear()).slice(-2)+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
    const prefix=type==='out'?'PED':'ENT';
    const n=getBatchesV8().filter(o=>String(o.code||'').startsWith(prefix+'-'+stamp+'-')).length+1;
    return prefix+'-'+stamp+'-'+String(n).padStart(3,'0');
  }

  // Produto clicável + ações rápidas
  window.productTable = function(list){
    if(!list.length)return '<div class="empty-state"><i class="bi bi-search"></i><strong>Nenhum produto encontrado</strong><span>Tente alterar a busca ou os filtros.</span></div>';
    return `<table class="table inventory-table product-stock-table align-middle"><thead><tr><th>Produto</th><th>Código</th><th>Aplicação</th><th>Local</th><th>Estoque</th><th>Venda</th><th>Status</th><th>Mov.</th></tr></thead><tbody>${list.map(p=>{
      const [cls,label]=getStatus(p);
      return `<tr data-product-row="${p.id}">
        <td class="product-edit-cell" data-edit-product="${p.id}" title="Clique para editar">
          <div class="product-cell">
            <span class="product-icon"><i class="bi ${catIcon(p.category)}"></i></span>
            <div><strong>${esc(p.name)}</strong><small>${esc(p.brand)}</small><em class="edit-hint"><i class="bi bi-pencil"></i> editar</em></div>
          </div>
        </td>
        <td data-edit-product="${p.id}"><span class="code">${esc(p.code)}</span></td>
        <td data-edit-product="${p.id}">${esc(p.application)}</td>
        <td data-edit-product="${p.id}">${esc(p.location||'—')}</td>
        <td data-edit-product="${p.id}"><strong>${p.stock} un.</strong><small class="stock-min">mín. ${p.min}</small></td>
        <td data-edit-product="${p.id}">${money(p.price)}</td>
        <td data-edit-product="${p.id}"><span class="status ${cls}">${label}</span></td>
        <td><div class="stock-actions">
          <button class="stock-action plus" data-stock-in="${p.id}" title="Dar entrada / repor"><i class="bi bi-plus-lg"></i></button>
          <button class="stock-action minus" data-stock-out="${p.id}" title="Dar saída / vender"><i class="bi bi-dash-lg"></i></button>
        </div></td>
      </tr>`;
    }).join('')}</tbody></table>`;
  };

  window.bindRowMenus = function(){
    document.querySelectorAll('[data-edit-product]').forEach(el=>{
      el.onclick=e=>{
        if(e.target.closest('.stock-actions'))return;
        const p=products.find(x=>x.id===Number(el.dataset.editProduct));
        if(p)openProductEditV8(p);
      };
    });
    document.querySelectorAll('[data-stock-in]').forEach(btn=>{
      btn.onclick=e=>{e.stopPropagation();openMovementModal('in',Number(btn.dataset.stockIn));};
    });
    document.querySelectorAll('[data-stock-out]').forEach(btn=>{
      btn.onclick=e=>{e.stopPropagation();openMovementModal('out',Number(btn.dataset.stockOut));};
    });
  };

  function openProductEditV8(p){
    openModal('Editar produto',`
      <form id="productEditV8" class="product-edit-form">
        <div class="form-grid">
          <div class="form-field full"><label>Nome do produto</label><input class="form-control-dark" name="name" required value="${esc(p.name)}"></div>
          <div class="form-field"><label>Código</label><input class="form-control-dark" name="code" required value="${esc(p.code)}"></div>
          <div class="form-field"><label>Marca / referência</label><input class="form-control-dark" name="brand" value="${esc(p.brand)}"></div>
          <div class="form-field"><label>Aplicação</label><input class="form-control-dark" name="application" value="${esc(p.application)}"></div>
          <div class="form-field"><label>Localização</label><input class="form-control-dark" name="location" value="${esc(p.location||'')}"></div>
          <div class="form-field"><label>Categoria</label><select class="form-select-dark" name="category">${optionsCategories(p.category)}</select></div>
          <div class="form-field"><label>Estoque atual</label><input class="form-control-dark" type="number" min="0" name="stock" value="${p.stock}"></div>
          <div class="form-field"><label>Estoque mínimo</label><input class="form-control-dark" type="number" min="0" name="min" value="${p.min}"></div>
          <div class="form-field"><label>Custo</label><input class="form-control-dark" type="number" min="0" step="0.01" name="cost" value="${p.cost}"></div>
          <div class="form-field"><label>Preço de venda</label><input class="form-control-dark" type="number" min="0" step="0.01" name="price" value="${p.price}"></div>
        </div>
      </form>`,
      `<button class="btn-danger-soft" id="deleteProductV8"><i class="bi bi-trash"></i> Excluir</button>
       <button class="btn-dark-soft" data-close-action>Cancelar</button>
       <button class="btn-gold" id="saveProductV8">Salvar alterações</button>`,
      false
    );

    document.querySelector('[data-close-action]').onclick=closeModal;
    document.getElementById('deleteProductV8').onclick=()=>confirmDeleteV8(p);
    document.getElementById('saveProductV8').onclick=()=>{
      const f=document.getElementById('productEditV8');
      if(!f.reportValidity())return;
      const d=Object.fromEntries(new FormData(f));
      const item={...p,
        name:d.name.trim(),code:d.code.trim(),brand:d.brand.trim(),
        application:d.application.trim(),location:d.location.trim(),
        category:d.category,stock:Number(d.stock),min:Number(d.min),
        cost:Number(d.cost),price:Number(d.price),active:true
      };
      products=products.map(x=>x.id===p.id?item:x);
      persist();closeModal();render();
      toast('Produto atualizado',item.name+' foi salvo.','success');
    };
  }

  function confirmDeleteV8(p){
    openModal('Excluir produto',`
      <div class="delete-warning">
        <span><i class="bi bi-exclamation-triangle-fill"></i></span>
        <div><strong>Excluir ${esc(p.name)}?</strong><p>O produto será removido do estoque. O histórico de movimentações continuará salvo.</p></div>
      </div>`,
      `<button class="btn-dark-soft" data-close-action>Cancelar</button><button class="btn-danger-soft" id="confirmDeleteV8">Excluir produto</button>`,
      true
    );
    document.querySelector('[data-close-action]').onclick=closeModal;
    document.getElementById('confirmDeleteV8').onclick=()=>{
      products=products.filter(x=>x.id!==p.id);
      persist();closeModal();render();
      toast('Produto excluído',p.name,'danger');
    };
  }

  // Entrada/Saída com busca + cards
  window.openMovementModal = function(type,productId=null){
    const isOut=type==='out';
    const code=batchCodeV8(type);
    const selected=[];

    openModal(
      isOut?'Novo pedido / saída':'Nova entrada / reposição',
      `<div class="movement-v8">
        <div class="movement-meta">
          <div class="form-field"><label>${isOut?'Número do pedido':'Número da entrada'}</label><input class="form-control-dark" value="${code}" readonly></div>
          <div class="form-field"><label>Nome / apelido</label><input class="form-control-dark" id="batchNameV8" placeholder="${isOut?'Ex.: Revisão CG do João':'Ex.: Reposição Motul 25/11'}"></div>
          <div class="form-field"><label>Moto</label><input class="form-control-dark" id="batchBikeV8" placeholder="Ex.: CG 160 2023"></div>
          <div class="form-field"><label>Placa</label><input class="form-control-dark plate-input-v16" id="batchPlateV16" maxlength="8" placeholder="Ex.: ABC1D23"></div>
          <div class="form-field"><label>${isOut?'Cliente / referência':'Fornecedor / referência'}</label><input class="form-control-dark" id="batchNoteV8" placeholder="${isOut?'Ex.: João, oficina...':'Ex.: fornecedor ou NF...'}"></div>
          ${isOut?`<div class="form-field"><label>Forma de pagamento</label><select class="form-select-dark" id="batchPaymentV19">
            <option value="pix">Pix</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="debito">Cartão de débito</option>
            <option value="credito">Cartão de crédito</option>
            <option value="fiado">Fiado</option>
            <option value="outro">Outro</option>
          </select></div>
          <div class="form-field full credit-name-wrap-v22" id="batchCreditNameWrapV22" style="display:none"><label>Nome de quem comprou fiado</label><input class="form-control-dark" id="batchCreditNameV22" placeholder="Ex.: João da Silva"></div>`:''}
        </div>

        <div class="product-picker-v8">
          <label>${isOut?'Adicionar produto ao pedido':'Adicionar produto à reposição'}</label>
          <div class="picker-search-wrap">
            <i class="bi bi-search"></i>
            <input id="productSearchV8" placeholder="Digite nome, código, marca ou aplicação..." autocomplete="off">
          </div>
          <div id="productSearchResultsV8" class="picker-results-v8"></div>
        </div>

        <div class="selected-head-v8"><span>Itens adicionados</span><b id="selectedCountV8">0</b></div>
        <div id="selectedProductsV8" class="selected-products-v8"></div>

        ${isOut?`<div class="labor-box-v14">
          <div class="labor-icon-v14"><i class="bi bi-wrench-adjustable-circle"></i></div>
          <div class="labor-copy-v14"><strong>Mão de obra</strong><small>Valor do serviço realizado</small></div>
          <div class="labor-input-v14"><span>R$</span><input id="laborValueV14" type="number" min="0" step="0.01" value="0"></div>
        </div>`:''}
        <div class="order-summary"><span>${isOut?'Total do pedido':'Total da entrada'}</span><strong id="movementTotalV8">R$ 0,00</strong></div>
      </div>`,
      `<button class="btn-dark-soft" data-close-action>Cancelar</button>${isOut?'<button class="btn-pending-v15" id="savePendingV15"><i class="bi bi-clock-history"></i> Salvar pendente</button>':''}<button class="btn-gold" id="saveMovementV8">${isOut?'Finalizar pedido e dar baixa':'Registrar reposição'}</button>`,
      false
    );

    const search=document.getElementById('productSearchV8');
    const results=document.getElementById('productSearchResultsV8');
    const list=document.getElementById('selectedProductsV8');
    const count=document.getElementById('selectedCountV8');

    function normalize(s){
      return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    }
    function availableProducts(q){
      q=normalize(q);
      return products.filter(p=>{
        if(selected.some(i=>i.productId===p.id))return false;
        if(!q)return true;
        return normalize([p.name,p.code,p.brand,p.application].join(' ')).includes(q);
      }).slice(0,8);
    }
    function renderResults(q=''){
      const arr=availableProducts(q);
      results.innerHTML=arr.length?arr.map(p=>`
        <button type="button" class="picker-result-card" data-pick-id="${p.id}">
          <span class="picker-result-icon"><i class="bi ${catIcon(p.category)}"></i></span>
          <span class="picker-result-main"><strong>${esc(p.name)}</strong><small>${esc(p.code)} • ${esc(p.brand)} • ${esc(p.application)}</small></span>
          <span class="picker-result-stock"><b>${p.stock} un.</b><small>${esc(p.location||'Sem local')}</small></span>
          <i class="bi bi-plus-circle-fill"></i>
        </button>`).join(''):'<div class="picker-empty">Nenhum produto encontrado.</div>';
      results.querySelectorAll('[data-pick-id]').forEach(b=>b.onclick=()=>addProduct(Number(b.dataset.pickId)));
    }
    function addProduct(id){
      const p=products.find(x=>x.id===id);
      if(!p||selected.some(i=>i.productId===id))return;
      selected.push({productId:p.id,qty:1,unit:isOut?p.price:p.cost,location:p.location||''});
      search.value='';
      renderSelected();
      renderResults('');
      search.focus();
    }
    function updateTotal(){
      const itemsTotal=selected.reduce((s,i)=>s+Number(i.qty||0)*Number(i.unit||0),0);
      const labor=isOut?Number(document.getElementById('laborValueV14')?.value||0):0;
      document.getElementById('movementTotalV8').textContent=money(itemsTotal+labor);
    }
    function renderSelected(){
      count.textContent=selected.length;
      if(!selected.length){
        list.innerHTML='<div class="selected-empty-v8"><i class="bi bi-bag-plus"></i><strong>Nenhum produto adicionado</strong><span>Pesquise acima e clique em um produto.</span></div>';
        updateTotal();return;
      }
      list.innerHTML=selected.map((i,idx)=>{
        const p=products.find(x=>x.id===i.productId);
        return `<article class="selected-product-card-v8" data-selected-index="${idx}">
          <div class="selected-product-top">
            <span class="picker-result-icon"><i class="bi ${catIcon(p.category)}"></i></span>
            <div><strong>${esc(p.name)}</strong><small>${esc(p.code)} • estoque atual: ${p.stock} un.</small></div>
            <button type="button" class="remove-selected-v8" data-remove-index="${idx}"><i class="bi bi-trash3"></i></button>
          </div>
          <div class="selected-product-fields-v8">
            <div class="form-field"><label>Quantidade</label><input class="form-control-dark" data-v8-qty="${idx}" type="number" min="1" value="${i.qty}"></div>
            <div class="form-field"><label>${isOut?'Preço unit.':'Custo unit.'}</label><input class="form-control-dark" data-v8-unit="${idx}" type="number" min="0" step="0.01" value="${i.unit}"></div>
            ${isOut?'':`<div class="form-field location-v8"><label>Onde foi guardado?</label><input class="form-control-dark" data-v8-location="${idx}" value="${esc(i.location)}" placeholder="Ex.: Prateleira A • Caixa 2"></div>`}
          </div>
        </article>`;
      }).join('');

      list.querySelectorAll('[data-remove-index]').forEach(b=>b.onclick=()=>{
        selected.splice(Number(b.dataset.removeIndex),1);renderSelected();renderResults(search.value);
      });
      list.querySelectorAll('[data-v8-qty]').forEach(inp=>inp.oninput=()=>{selected[Number(inp.dataset.v8Qty)].qty=Number(inp.value);updateTotal();});
      list.querySelectorAll('[data-v8-unit]').forEach(inp=>inp.oninput=()=>{selected[Number(inp.dataset.v8Unit)].unit=Number(inp.value);updateTotal();});
      list.querySelectorAll('[data-v8-location]').forEach(inp=>inp.oninput=()=>{selected[Number(inp.dataset.v8Location)].location=inp.value;});
      updateTotal();
    }

    search.oninput=()=>renderResults(search.value);
    search.onfocus=()=>renderResults(search.value);
    const plateInputV16=document.getElementById('batchPlateV16');
    if(plateInputV16) plateInputV16.oninput=()=>{plateInputV16.value=plateInputV16.value.toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,8);};
    if(isOut&&document.getElementById('laborValueV14')) document.getElementById('laborValueV14').oninput=updateTotal;
    if(isOut&&document.getElementById('batchPaymentV19')){
      const paymentSel=document.getElementById('batchPaymentV19');
      const creditWrap=document.getElementById('batchCreditNameWrapV22');
      const syncCredit=()=>{if(creditWrap)creditWrap.style.display=paymentSel.value==='fiado'?'':'none';};
      paymentSel.onchange=syncCredit;syncCredit();
    }
    document.querySelector('[data-close-action]').onclick=closeModal;
    renderSelected();
    renderResults('');

    if(productId)addProduct(productId);

    function saveMovementV15(asPending=false){
      if(!selected.length){toast('Adicione produtos','Escolha pelo menos um produto.','danger');return;}
      if(selected.some(i=>!i.qty||i.qty<1||Number.isNaN(i.unit))){toast('Confira os itens','Quantidade e valor precisam ser válidos.','danger');return;}
      if(!isOut&&selected.some(i=>!String(i.location||'').trim())){toast('Informe a localização','Diga onde cada peça foi guardada.','danger');return;}

      if(isOut&&!asPending){
        const lack=selected.find(i=>i.qty>(products.find(p=>p.id===i.productId)?.stock||0));
        if(lack){const p=products.find(x=>x.id===lack.productId);toast('Estoque insuficiente',p.name+': só há '+p.stock+' un.','danger');return;}
      }

      const name=(document.getElementById('batchNameV8')?.value||'').trim();
      const bike=(document.getElementById('batchBikeV8')?.value||'').trim();
      const plate=(document.getElementById('batchPlateV16')?.value||'').trim().toUpperCase();
      const note=document.getElementById('batchNoteV8').value.trim();
      const payment=isOut?(document.getElementById('batchPaymentV19')?.value||'pix'):'';
      const creditName=isOut?(document.getElementById('batchCreditNameV22')?.value||'').trim():'';
      if(isOut&&payment==='fiado'&&!creditName){toast('Informe o nome','Digite o nome de quem comprou fiado.','danger');return;}
      const labor=isOut?Number(document.getElementById('laborValueV14')?.value||0):0;
      const date=new Date().toISOString();
      const batch={
        id:Date.now(),code,type,date,name:name||code,bike,plate,note,payment,creditName,creditStatus:payment==='fiado'?'open':'',labor,
        status:isOut?(asPending?'pending':'completed'):'completed',
        items:[]
      };

      selected.forEach((i,k)=>{
        const p=products.find(x=>x.id===i.productId);
        const finalLoc=isOut?(p.location||''):String(i.location).trim();
        batch.items.push({productId:p.id,product:p.name,qty:Number(i.qty),unit:Number(i.unit),location:finalLoc});

        if(!asPending){
          p.stock+=isOut?-Number(i.qty):Number(i.qty);
          if(!isOut)p.location=String(i.location).trim();

          movements.unshift({
            id:Date.now()+k,orderId:batch.id,orderCode:code,type,
            productId:p.id,product:p.name,qty:Number(i.qty),unit:Number(i.unit),
            location:finalLoc,date,note:note||(isOut?'Venda / pedido':'Reposição')
          });
        }
      });

      const batches=getBatchesV8();batches.unshift(batch);saveBatchesV8(batches);
      persist();closeModal();render();

      if(asPending){
        toast('Pedido salvo como pendente',code+' ficou aguardando finalização.','success');
      }else{
        toast(isOut?'Pedido finalizado':'Reposição registrada',code+' salvo com '+selected.length+' produto(s).','success');
      }
    }

    document.getElementById('saveMovementV8').onclick=()=>saveMovementV15(false);
    if(isOut&&document.getElementById('savePendingV15')) document.getElementById('savePendingV15').onclick=()=>saveMovementV15(true);
  };

  try{render();}catch(e){console.error('Moto Tudo v8:',e);}
})();
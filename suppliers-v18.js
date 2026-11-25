
(function(){
  const supplierForCategoryV18={
    'Motor':1,'Transmissão':1,
    'Freios':2,'Elétrica':2,
    'Capacetes e acessórios':3,
    'Óleos e fluidos':4,
    'Outras peças':5
  };

  function ensureSuppliersV18(){
    // Add a few demo suppliers so every current product can be linked.
    const extras=[
      {id:4,name:'Lubri Moto Distribuidora',contact:'Juliana • (18) 99841-2300',city:'Presidente Prudente/SP',categories:'Óleos e fluidos'},
      {id:5,name:'Central Moto Peças',contact:'Mateus • (14) 99731-8820',city:'Marília/SP',categories:'Outras peças, Acessórios'}
    ];
    extras.forEach(s=>{if(!suppliers.some(x=>Number(x.id)===s.id))suppliers.push(s)});

    let changed=false;
    products.forEach(p=>{
      if(!p.supplierId){
        p.supplierId=supplierForCategoryV18[p.category]||1;
        changed=true;
      }
    });
    if(changed || extras.some(s=>!MotoTudoData.read('mt_suppliers',[]).some(x=>Number(x.id)===s.id))){
      try{persist()}catch(e){
        MotoTudoData.write('mt_products',products);
        MotoTudoData.write('mt_suppliers',suppliers);
      }
    }
  }

  function supplierNameV18(p){
    return suppliers.find(s=>Number(s.id)===Number(p.supplierId))?.name||'Sem fornecedor';
  }

  window.filteredProducts=function(forceCategory){
    let list=[...products];
    const q=(state.search||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(forceCategory) list=list.filter(p=>p.category===forceCategory);
    if(state.categoryFilter!=='all')list=list.filter(p=>p.category===state.categoryFilter);
    if(state.status!=='all')list=list.filter(p=>getStatus(p)[0]===state.status);
    if(q) list=list.filter(p=>{
      const supplier=supplierNameV18(p);
      return [p.name,p.code,p.brand,p.application,p.location,supplier]
        .join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .includes(q);
    });
    return list;
  };

  window.productTable=function(list){
    if(!list.length)return '<div class="empty-state"><i class="bi bi-search"></i><strong>Nenhum produto encontrado</strong><span>Tente buscar pela peça, código ou fornecedor.</span></div>';
    return `<table class="table inventory-table product-stock-table align-middle"><thead><tr><th>Produto</th><th>Código</th><th>Fornecedor</th><th>Aplicação</th><th>Local</th><th>Estoque</th><th>Venda</th><th>Status</th><th>Mov.</th></tr></thead><tbody>${list.map(p=>{
      const [cls,label]=getStatus(p);
      const supplier=supplierNameV18(p);
      return `<tr data-product-row="${p.id}">
        <td class="product-edit-cell" data-edit-product="${p.id}" title="Clique para editar">
          <div class="product-cell"><span class="product-icon"><i class="bi ${catIcon(p.category)}"></i></span><div><strong>${esc(p.name)}</strong><small>${esc(p.brand)}</small><em class="edit-hint"><i class="bi bi-pencil"></i> editar</em></div></div>
        </td>
        <td data-edit-product="${p.id}"><span class="code">${esc(p.code)}</span></td>
        <td data-edit-product="${p.id}"><span class="supplier-pill-v18"><i class="bi bi-truck"></i>${esc(supplier)}</span></td>
        <td data-edit-product="${p.id}">${esc(p.application)}</td>
        <td data-edit-product="${p.id}">${esc(p.location||'—')}</td>
        <td data-edit-product="${p.id}"><strong>${p.stock} un.</strong><small class="stock-min">mín. ${p.min}</small></td>
        <td data-edit-product="${p.id}">${money(p.price)}</td>
        <td data-edit-product="${p.id}"><span class="status ${cls}">${label}</span></td>
        <td><div class="stock-actions"><button class="stock-action plus" data-stock-in="${p.id}" title="Dar entrada / repor"><i class="bi bi-plus-lg"></i></button><button class="stock-action minus" data-stock-out="${p.id}" title="Dar saída / vender"><i class="bi bi-dash-lg"></i></button></div></td>
      </tr>`;
    }).join('')}</tbody></table>`;
  };

  window.openProductModal=function(product=null){
    const p=product||{name:'',code:'',brand:'',application:'',location:'',category:'Motor',supplierId:suppliers[0]?.id||'',stock:0,min:3,cost:0,price:0};
    openModal(product?'Editar produto':'Novo produto',
      `<form id="productForm"><div class="form-grid">
        <div class="form-field full"><label>Nome do produto</label><input class="form-control-dark" name="name" required value="${esc(p.name)}"></div>
        <div class="form-field"><label>Código</label><input class="form-control-dark" name="code" required value="${esc(p.code)}"></div>
        <div class="form-field"><label>Marca / referência</label><input class="form-control-dark" name="brand" value="${esc(p.brand)}"></div>
        <div class="form-field"><label>Aplicação</label><input class="form-control-dark" name="application" value="${esc(p.application)}"></div>
        <div class="form-field"><label>Localização</label><input class="form-control-dark" name="location" value="${esc(p.location||'')}"></div>
        <div class="form-field"><label>Categoria</label><select class="form-select-dark" name="category">${optionsCategories(p.category)}</select></div>
        <div class="form-field full"><label>Fornecedor</label><select class="form-select-dark" name="supplierId" required>
          <option value="">Selecione o fornecedor</option>
          ${suppliers.map(s=>`<option value="${s.id}" ${Number(p.supplierId)===Number(s.id)?'selected':''}>${esc(s.name)} • ${esc(s.city||'')}</option>`).join('')}
        </select></div>
        <div class="form-field"><label>Estoque atual</label><input class="form-control-dark" type="number" min="0" name="stock" value="${p.stock}"></div>
        <div class="form-field"><label>Estoque mínimo</label><input class="form-control-dark" type="number" min="0" name="min" value="${p.min}"></div>
        <div class="form-field"><label>Custo</label><input class="form-control-dark" type="number" min="0" step="0.01" name="cost" value="${p.cost}"></div>
        <div class="form-field"><label>Preço de venda</label><input class="form-control-dark" type="number" min="0" step="0.01" name="price" value="${p.price}"></div>
      </div></form>`,
      `<button class="btn-dark-soft" data-close-action>Cancelar</button><button class="btn-gold" id="saveProduct">${product?'Salvar':'Cadastrar produto'}</button>`
    );
    document.querySelector('[data-close-action]').onclick=closeModal;
    document.getElementById('saveProduct').onclick=()=>{
      const f=document.getElementById('productForm');
      if(!f.reportValidity())return;
      const d=Object.fromEntries(new FormData(f));
      const item={...p,
        id:product?product.id:Math.max(0,...products.map(x=>x.id))+1,
        name:d.name.trim(),code:d.code.trim(),brand:d.brand.trim(),
        application:d.application.trim(),location:d.location.trim(),
        category:d.category,supplierId:Number(d.supplierId),
        stock:Number(d.stock),min:Number(d.min),cost:Number(d.cost),price:Number(d.price),active:true
      };
      if(product) products=products.map(x=>x.id===product.id?item:x); else products.push(item);
      persist();closeModal();render();
      toast(product?'Produto atualizado':'Produto cadastrado',item.name+' foi salvo com fornecedor vinculado.','success');
    };
  };

  window.bindRowMenus=function(){
    document.querySelectorAll('[data-edit-product]').forEach(el=>{
      el.onclick=e=>{
        if(e.target.closest('.stock-actions'))return;
        const p=products.find(x=>x.id===Number(el.dataset.editProduct));
        if(p)openProductModal(p);
      };
    });
    document.querySelectorAll('[data-stock-in]').forEach(btn=>{
      btn.onclick=e=>{e.stopPropagation();openMovementModal('in',Number(btn.dataset.stockIn));};
    });
    document.querySelectorAll('[data-stock-out]').forEach(btn=>{
      btn.onclick=e=>{e.stopPropagation();openMovementModal('out',Number(btn.dataset.stockOut));};
    });
  };

  ensureSuppliersV18();
  try{render();}catch(e){console.error('Moto Tudo suppliers v18',e);}
})();
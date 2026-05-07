const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxO6lQRM2SHhfzLu_Hgak6KDI8vT4GBVqS7zQuXYtLC-NGNFv4cNvUiO0_FUDglWKwZ/exec';


// ---------- CONFIGURAÇÕES DE ADICIONAIS ----------
const ADICIONAIS_CONFIG = {
  lanche: [
    { id: 'carne_extra', nome: 'Carne extra', preco: 8.00 },
    { id: 'queijo_extra', nome: 'Queijo extra', preco: 3.00 },
    { id: 'bacon', nome: 'Bacon', preco: 4.00 },
    { id: 'ovo', nome: 'Ovo', preco: 2.00 },
  ],
  churrasco: [
    { id: 'farofa', nome: 'Farofa extra', preco: 3.00 },
    { id: 'vinagrete', nome: 'Vinagrete extra', preco: 2.00 },
  ],
  porcao: [
    { id: 'porcao_extra', nome: 'Porção extra', preco: 10.00 },
  ],
  bebida: []
};


// ---------- ESTADO ----------
let items = [];
let nextId = 1;
let activeFilter = 'todos';
let searchQuery = '';
let editingId = null;
let cart = [];
let isAdmin = false;
let adminToken = null;
let adminTimestamp = null;


// ---------- UTILITÁRIOS ----------
function catBadgeClass(c) {
  return { lanche: 'badge-lanche', churrasco: 'badge-churrasco', bebida: 'badge-bebida', porcao: 'badge-porcao' }[c] || '';
}
function catLabel(c) {
  return { lanche: 'Lanche', churrasco: 'Churrasco', bebida: 'Bebida', porcao: 'Porção' }[c] || c;
}
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
function normalizarCartItem(ci) {
  return {
    ...ci,
    adicionais: Array.isArray(ci.adicionais) ? ci.adicionais : [],
    obs: ci.obs || ''
  };
}
function formatarTelefone(telefone) {
  return String(telefone || '').replace(/\D/g, '');
}
function abrirWhatsApp(numero, mensagem) {
  const numeroLimpo = formatarTelefone(numero);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const urlApp = `whatsapp://send?phone=${numeroLimpo}&text=${encodeURIComponent(mensagem)}`;
  const urlWeb = `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
  if (isMobile) {
    window.location.href = urlApp;
    setTimeout(() => {
      window.location.href = urlWeb;
    }, 1200);
  } else {
    window.location.href = urlWeb;
  }
}


// ---------- PERSISTÊNCIA LOCAL ----------
function saveLocalData() {
  localStorage.setItem('gringo_items', JSON.stringify(items));
  localStorage.setItem('gringo_nextId', nextId);
  localStorage.setItem('gringo_cart', JSON.stringify(cart));
}
function loadLocalData() {
  const savedItems = localStorage.getItem('gringo_items');
  if (savedItems) {
    try { items = JSON.parse(savedItems); } catch(e) { items = []; }
  }
  if (!savedItems || items.length === 0) {
    items = [
      { id:1, nome:'X-Carne', cat:'lanche', imagem:'1.jpg', preco:28, desc:'Carne, alface, tomate, milho, maionese temperada e queijo.', disponivel:true },
      { id:2, nome:'X-Frango', cat:'lanche', imagem:'2.jpg', preco:24, desc:'Frango, alface, tomate, milho, maionese temperada e queijo.', disponivel:true },
      { id:3, nome:'Vazio', cat:'churrasco', imagem:'3.jpg', preco:55, desc:'', disponivel:true },
      { id:4, nome:'Salsichao', cat:'churrasco', imagem:'4.jpg', preco:32, desc:'', disponivel:true },
      { id:5, nome:'Costela Assada', cat:'churrasco', imagem:'5.jpg', preco:65, desc:'Costela de boi assada.', disponivel:true },
      { id:6, nome:'Batata frita', cat:'porcao', imagem:'6.jpg', preco:18, desc:'Batata frita crocante.', disponivel:true },
      { id:7, nome:'Iscas de Frango', cat:'porcao', imagem:'7.jpg', preco:22, desc:'Iscas de frango empanadas.', disponivel:true },
      { id:8, nome:'Mandioca Frita', cat:'porcao', imagem:'8.jpg', preco:16, desc:'Mandioca frita por inteiro.', disponivel:true },
      { id:9, nome:'Heineken', cat:'bebida', imagem:'heineken.jpg', preco:9, desc:'Long neck 355ml gelada.', disponivel:true },
      { id:10, nome:'Brahma', cat:'bebida', imagem:'brahma.jpg', preco:7, desc:'Long neck 355ml gelada.', disponivel:true },
      { id:11, nome:'Skol', cat:'bebida', imagem:'skol.jpg', preco:7, desc:'Long neck 355ml gelada.', disponivel:true },
      { id:12, nome:'Coca-Cola', cat:'bebida', imagem:'coca.jpg', preco:6, desc:'Lata 350ml gelada.', disponivel:true },
      { id:13, nome:'Guaraná Antarctica', cat:'bebida', imagem:'guarana.jpg', preco:6, desc:'Lata 350ml gelada.', disponivel:true },
      { id:14, nome:'Pepsi', cat:'bebida', imagem:'pepsi.jpg', preco:6, desc:'Lata 350ml gelada.', disponivel:true },
      { id:15, nome:'Fanta Laranja', cat:'bebida', imagem:'fanta.jpg', preco:6, desc:'Lata 350ml gelada.', disponivel:true },
      { id:16, nome:'Sprite', cat:'bebida', imagem:'sprite.jpg', preco:6, desc:'Lata 350ml gelada.', disponivel:true },
      { id:17, nome:'Água Mineral', cat:'bebida', imagem:'agua.jpg', preco:4, desc:'500ml sem gás ou com gás.', disponivel:true },
    ];
  }
  const savedNextId = localStorage.getItem('gringo_nextId');
  if (savedNextId) nextId = +savedNextId;
  else nextId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
  const savedCart = localStorage.getItem('gringo_cart');
  if (savedCart) {
    try {
      const parsed = JSON.parse(savedCart);
      cart = parsed.map(normalizarCartItem);
    } catch(e) { cart = []; }
  }
}


// ---------- RENDERIZAÇÃO DO CARDÁPIO ----------
function renderGrid() {
  const grid = document.getElementById('items-grid');
  const filtered = items.filter(i => {
    const matchCat = activeFilter === 'todos' || i.cat === activeFilter;
    const matchSearch = !searchQuery || i.nome.toLowerCase().includes(searchQuery) || i.desc.toLowerCase().includes(searchQuery);
    return matchCat && matchSearch;
  });
  document.getElementById('results-count').textContent = filtered.length + ' item' + (filtered.length !== 1 ? 's' : '');
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state"><h3>Nenhum item encontrado</h3><p>Tente outra busca ou aguarde novos itens.</p></div>`;
    return;
  }
  grid.innerHTML = filtered.map(item => {
    const nomeEscapado = escapeHTML(item.nome);
    const descEscapado = escapeHTML(item.desc);
    const precoFormatado = item.preco.toFixed(2).replace('.', ',');
    const imgSrc = item.imagem ? `imagens/${item.imagem}` : '';
    const imgTag = imgSrc
      ? `<img src="${imgSrc}" alt="${nomeEscapado}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'item-img-placeholder\\'>Sem foto</div>'">`
      : `<div class="item-img-placeholder">Sem foto</div>`;
    const adminButtons = isAdmin ? `
      <button class="btn-edit" data-id="${item.id}" aria-label="Editar ${nomeEscapado}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="btn-delete" data-id="${item.id}" aria-label="Excluir ${nomeEscapado}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button>
    ` : '';
    return `
      <article class="item-card ${item.disponivel ? '' : 'unavailable'}" role="listitem" data-id="${item.id}">
        <div class="item-img-wrap" aria-hidden="true">
          ${imgTag}
          <span class="item-category-badge ${catBadgeClass(item.cat)}">${catLabel(item.cat)}</span>
          <span class="item-avail-badge ${item.disponivel ? 'badge-disponivel' : 'badge-indisponivel'}">${item.disponivel ? 'Disponível' : 'Esgotado'}</span>
        </div>
        <div class="item-body">
          <h3 class="item-name">${nomeEscapado}</h3>
          <p class="item-desc">${descEscapado}</p>
          <div class="item-footer">
            <span class="item-price">R$ ${precoFormatado}</span>
            <div class="item-actions">
              <button class="btn-add-cart" data-id="${item.id}" ${!item.disponivel ? 'disabled' : ''}>Adicionar</button>
              ${adminButtons}
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
  grid.querySelectorAll('.btn-add-cart').forEach(b => b.addEventListener('click', () => handleAddToCart(+b.dataset.id)));
  if (isAdmin) {
    grid.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', () => openEdit(+b.dataset.id)));
    grid.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', () => deleteItem(+b.dataset.id)));
  }
}


// ---------- HANDLER DO BOTÃO ADICIONAR ----------
function handleAddToCart(id) {
  const item = items.find(i => i.id === id);
  if (!item || !item.disponivel) return;
  if (item.cat === 'bebida') {
    addToCart(id, [], '');
  } else {
    openCustomizeModal(item);
  }
}


// ---------- MODAL DE CUSTOMIZAÇÃO ----------
function openCustomizeModal(item) {
  const modal = document.getElementById('modal-customize');
  const content = document.getElementById('customize-content');
  const title = document.getElementById('modal-customize-title');
  title.textContent = item.nome;
  let selectedAdicionais = {};
  function getAdicionalByKey(cat, key) {
    const adicionais = ADICIONAIS_CONFIG[cat] || [];
    return adicionais.find(a => a.id === key);
  }
  function updateTotal() {
    let total = item.preco;
    for (let key in selectedAdicionais) {
      const adicional = getAdicionalByKey(item.cat, key);
      if (adicional) total += adicional.preco * selectedAdicionais[key];
    }
    const el = document.getElementById('customize-total');
    if (el) el.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
  }
  let html = `
    <div style="text-align:center;margin-bottom:var(--space-4);">
      ${item.imagem ? `<img src="imagens/${item.imagem}" alt="${escapeHTML(item.nome)}" style="max-width:100%;border-radius:var(--radius-md);max-height:200px;object-fit:cover;">` : ''}
    </div>
    <div class="adicionais-section">
      <h3 style="margin-bottom:var(--space-2);">Adicionais</h3>
  `;
  const adicionais = ADICIONAIS_CONFIG[item.cat] || [];
  if (adicionais.length === 0) {
    html += `<p style="color:var(--color-text-muted);margin-bottom:var(--space-2);">Nenhum adicional disponível.</p>`;
  } else {
    adicionais.forEach(ad => {
      selectedAdicionais[ad.id] = 0;
      html += `
        <div class="adicional-row">
          <div class="adicional-info">
            <span class="adicional-nome">${escapeHTML(ad.nome)}</span>
            <span class="adicional-preco">+ R$ ${ad.preco.toFixed(2).replace('.', ',')}</span>
          </div>
          <div class="adicional-qty">
            <button type="button" class="adicional-btn" data-action="minus" data-id="${ad.id}">-</button>
            <span class="adicional-count" id="count-${ad.id}">0</span>
            <button type="button" class="adicional-btn" data-action="plus" data-id="${ad.id}">+</button>
          </div>
        </div>
      `;
    });
  }
  html += `
    </div>
    <div class="form-group" style="margin-top:var(--space-4);">
      <label class="form-label" for="customize-obs">Observações</label>
      <textarea class="form-textarea" id="customize-obs" placeholder="Ex: sem cebola, ponto bem passado..."></textarea>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-4);padding-top:var(--space-4);border-top:1px solid var(--color-divider);">
      <strong id="customize-total">R$ ${item.preco.toFixed(2).replace('.', ',')}</strong>
      <button type="button" class="btn-primary" id="btn-customize-add">Adicionar ao carrinho</button>
    </div>
  `;
  content.innerHTML = html;
  content.querySelectorAll('.adicional-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const adId = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === 'plus') selectedAdicionais[adId] = (selectedAdicionais[adId] || 0) + 1;
      else selectedAdicionais[adId] = Math.max(0, (selectedAdicionais[adId] || 0) - 1);
      document.getElementById(`count-${adId}`).textContent = selectedAdicionais[adId];
      updateTotal();
    });
  });
  document.getElementById('btn-customize-add').addEventListener('click', () => {
    const obs = document.getElementById('customize-obs').value.trim();
    const adicionaisSelecionados = [];
    for (let key in selectedAdicionais) {
      if (selectedAdicionais[key] > 0) {
        const adicional = getAdicionalByKey(item.cat, key);
        if (adicional) {
          adicionaisSelecionados.push({ id: adicional.id, nome: adicional.nome, preco: adicional.preco, qty: selectedAdicionais[key] });
        }
      }
    }
    addToCart(item.id, adicionaisSelecionados, obs);
    closeModal(modal);
  });
  document.getElementById('btn-customize-close').addEventListener('click', () => closeModal(modal));
  openModal(modal);
}


// ---------- CARRINHO ----------
function calcTotalItem(ci) {
  const base = ci.preco * ci.qty;
  const extras = ci.adicionais.reduce((s, a) => s + a.preco * a.qty, 0) * ci.qty;
  return base + extras;
}
function addToCart(id, adicionais = [], obs = '') {
  const item = items.find(i => i.id === id);
  if (!item || !item.disponivel) return;
  const existing = cart.find(ci => ci.id === id && ci.obs === obs && arraysIguais(ci.adicionais, adicionais));
  if (existing) existing.qty++;
  else cart.push({ id: item.id, nome: item.nome, preco: item.preco, qty: 1, adicionais, obs });
  saveLocalData();
  updateCartBadge();
  toast(`${item.nome} adicionado ao carrinho`);
}
function arraysIguais(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].qty !== b[i].qty) return false;
  }
  return true;
}
function removeFromCart(index) {
  cart.splice(index, 1);
  saveLocalData();
  updateCartBadge();
  renderCartModal();
}
function updateCartBadge() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById('cart-badge');
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}
function renderCartModal() {
  const list = document.getElementById('cart-items-list');
  const emptyMsg = document.getElementById('cart-empty');
  const footer = document.getElementById('cart-footer');
  if (cart.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    footer.style.display = 'none';
  } else {
    emptyMsg.style.display = 'none';
    footer.style.display = 'flex';
    list.innerHTML = cart.map((ci, idx) => {
      const extras = ci.adicionais.length > 0 ? ci.adicionais.map(a => `${escapeHTML(a.nome)} x${a.qty}`).join(', ') : '';
      const totalItem = calcTotalItem(ci);
      return `
        <div style="padding:var(--space-2) 0; border-bottom:1px solid var(--color-divider);">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:var(--space-2);">
            <span>${escapeHTML(ci.nome)} (${ci.qty}x)</span>
            <span style="white-space:nowrap;">R$ ${totalItem.toFixed(2).replace('.', ',')}</span>
            <button class="btn-icon" style="width:28px;height:28px;flex-shrink:0;" aria-label="Remover" data-remove="${idx}">🗑️</button>
          </div>
          ${extras ? `<div style="font-size:var(--text-xs);color:var(--color-text-muted);">Extras: ${extras}</div>` : ''}
          ${ci.obs ? `<div style="font-size:var(--text-xs);color:var(--color-text-muted);">Obs: ${escapeHTML(ci.obs)}</div>` : ''}
        </div>
      `;
    }).join('');
    list.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => removeFromCart(+b.dataset.remove)));
  }
  const total = cart.reduce((s, i) => s + calcTotalItem(i), 0);
  document.getElementById('cart-total').textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
}


// ---------- CHECKOUT ----------
function openCheckout() {
  if (cart.length === 0) { toast('Carrinho vazio!'); return; }
  document.getElementById('order-number').value = 'Gerando...';
  document.getElementById('order-form').reset();
  document.getElementById('change-group').style.display = 'none';
  document.getElementById('checkout-whatsapp').value = '';
  openModal(document.getElementById('modal-order'));
}
document.getElementById('order-payment').addEventListener('change', function () {
  document.getElementById('change-group').style.display = this.value === 'dinheiro' ? 'block' : 'none';
});
document.getElementById('order-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const btn = this.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Enviando...';
  const nomeCliente = document.getElementById('order-name').value.trim();
  const endereco = document.getElementById('order-address').value.trim();
  const whatsapp = formatarTelefone(document.getElementById('checkout-whatsapp').value.trim());
  const pagamento = document.getElementById('order-payment').value;
  const troco = pagamento === 'dinheiro' ? document.getElementById('order-change').value : '';
  if (!nomeCliente || !endereco || !whatsapp || !pagamento) {
    toast('Preencha todos os campos obrigatórios');
    btn.disabled = false;
    btn.textContent = 'Enviar Pedido';
    return;
  }
  const totalGeral = cart.reduce((s, i) => s + calcTotalItem(i), 0).toFixed(2);
  const payload = {
    action: 'create',
    nome: nomeCliente,
    endereco,
    pagamento,
    troco,
    itens: JSON.stringify(cart),
    total: totalGeral,
    whatsapp,
    origin: window.location.origin
  };
  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload)
    });
    const data = await resp.json();
    if (data.success) {
      const numeroPedido = data.numero;
      const whatsappNumero = data.whatsapp;
      document.getElementById('order-number').value = '#' + numeroPedido;
      const itensMsg = cart.map(ci => {
        const linhas = [`• ${ci.nome} (${ci.qty}x) — R$ ${calcTotalItem(ci).toFixed(2).replace('.', ',')}`];
        if (ci.adicionais.length > 0) {
          linhas.push(`  Extras: ${ci.adicionais.map(a => `${a.nome} x${a.qty}`).join(', ')}`);
        }
        if (ci.obs) {
          linhas.push(`  Obs: ${ci.obs}`);
        }
        return linhas.join('\n');
      }).join('\n\n');
      const msg = [
        `*Pedido #${numeroPedido} - Bar do Gringo*`,
        ``,
        `*Cliente:* ${nomeCliente}`,
        `*WhatsApp:* ${whatsapp}`,
        `*Endereço:* ${endereco}`,
        `*Pagamento:* ${pagamento.toUpperCase()}${troco ? ` (Troco para R$ ${troco})` : ''}`,
        ``,
        `*Itens:*`,
        itensMsg,
        ``,
        `*Total: R$ ${parseFloat(totalGeral).toFixed(2).replace('.', ',')}*`
      ].join('\n');
      cart = [];
      saveLocalData();
      updateCartBadge();
      closeModal(document.getElementById('modal-order'));
      toast('Pedido enviado! Abrindo WhatsApp...');
      abrirWhatsApp(whatsappNumero, msg);
    } else {
      toast('Erro ao enviar pedido: ' + (data.erros ? data.erros.join(', ') : data.erro || 'Tente novamente.'));
    }
  } catch (err) {
    toast('Erro de conexão. Verifique sua internet.');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar Pedido';
  }
});


// ---------- TRACKING ----------
function showTrackingSearch() {
  const panel = document.getElementById('tracking-panel');
  panel.style.display = 'block';
  panel.innerHTML = `
    <h3 style="font-family:var(--font-display); margin-bottom:var(--space-4);">Acompanhar Pedido</h3>
    <div class="form-group">
      <label class="form-label" for="tracking-number">Número do pedido</label>
      <input class="form-input" type="number" id="tracking-number" placeholder="Ex: 100">
    </div>
    <button class="btn-primary" id="btn-track">Próximo</button>
  `;
  document.getElementById('btn-track').addEventListener('click', () => {
    const num = document.getElementById('tracking-number').value;
    if (num) renderTracking(num);
  });
}
async function renderTracking(orderNumber) {
  const panel = document.getElementById('tracking-panel');
  panel.style.display = 'block';
  panel.innerHTML = `
    <h3 style="font-family:var(--font-display); margin-bottom:var(--space-4);">Acompanhar Pedido #${orderNumber}</h3>
    <div class="form-group">
      <label class="form-label" for="tracking-name">Nome usado no pedido</label>
      <input class="form-input" type="text" id="tracking-name" placeholder="Seu nome completo">
    </div>
    <button class="btn-primary" id="btn-track-consult">Consultar</button>
  `;
  document.getElementById('btn-track-consult').addEventListener('click', async () => {
    const nome = document.getElementById('tracking-name').value.trim();
    if (!nome) { toast('Informe o nome usado no pedido.'); return; }
    try {
      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: 'track', numero: orderNumber, nome, origin: window.location.origin })
      });
      const data = await resp.json();
      if (data && data.status) {
        const steps = [
          { key: 'pending', icon: '⏳', label: 'Aguardando confirmação' },
          { key: 'accepted', icon: '✅', label: 'Pedido aceito' },
          { key: 'out_for_delivery', icon: '🛵', label: 'Saiu pra entrega' },
          { key: 'delivered', icon: '✔️', label: 'Entregue' }
        ];
        const currentIdx = steps.findIndex(s => s.key === data.status);
        panel.innerHTML = `
          <h3 style="font-family:var(--font-display); margin-bottom:var(--space-4);">Pedido #${orderNumber}</h3>
          <div class="tracking-steps">
            ${steps.map((s, idx) => {
              let cls = idx < currentIdx ? 'completed' : idx === currentIdx ? 'active' : '';
              return `<div class="tracking-step"><div class="step-icon ${cls}">${s.icon}</div><span class="step-label ${cls}">${s.label}</span></div>`;
            }).join('')}
          </div>
        `;
      } else {
        panel.innerHTML = '<p style="text-align:center;color:var(--color-text-muted)">Pedido não encontrado ou nome não confere.</p>';
      }
    } catch (err) {
      panel.innerHTML = '<p style="text-align:center;color:var(--color-primary)">Erro ao consultar.</p>';
    }
  });
}


// ---------- ADMIN ----------
async function loginAdmin(senha) {
  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'login', senha, origin: window.location.origin })
    });
    const data = await resp.json();
    if (data.success) {
      adminToken = data.token;
      adminTimestamp = data.timestamp;
      sessionStorage.setItem('adminToken', adminToken);
      sessionStorage.setItem('adminTimestamp', adminTimestamp);
      isAdmin = true;
      showAdminPanel();
    } else {
      toast('Senha incorreta.');
    }
  } catch (err) {
    toast('Erro de conexão.');
  }
}
async function logoutAdmin() {
  if (adminToken) {
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: 'logout', token: adminToken, timestamp: adminTimestamp, origin: window.location.origin })
      });
    } catch (e) {}
  }
  adminToken = null;
  adminTimestamp = null;
  sessionStorage.removeItem('adminToken');
  sessionStorage.removeItem('adminTimestamp');
  isAdmin = false;
  hideAdminPanel();
}
async function verifyToken() {
  const token = sessionStorage.getItem('adminToken');
  const ts = sessionStorage.getItem('adminTimestamp');
  if (!token || !ts) return false;
  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'verifyToken', token, timestamp: ts, origin: window.location.origin })
    });
    const data = await resp.json();
    return data.success === true;
  } catch (e) { return false; }
}
function showAdminPanel() {
  document.getElementById('main').style.display = 'none';
  document.querySelector('.hero').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';
  renderAdmin();
}
function hideAdminPanel() {
  document.getElementById('main').style.display = '';
  document.querySelector('.hero').style.display = '';
  document.getElementById('admin-panel').style.display = 'none';
  renderGrid();
}
async function renderAdmin() {
  const container = document.getElementById('admin-panel');
  const headerHtml = `<div class="admin-header"><h2 style="font-family:var(--font-display);">Painel do Dono</h2><button class="btn-secondary" id="btn-logout">Sair</button><button class="btn-primary" id="btn-new-item">Novo Item</button></div>`;
  container.innerHTML = headerHtml + `<p>Carregando pedidos...</p>`;
  document.getElementById('btn-logout').addEventListener('click', logoutAdmin);
  document.getElementById('btn-new-item').addEventListener('click', openNew);
  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'list', token: adminToken, timestamp: adminTimestamp, origin: window.location.origin })
    });
    const pedidos = await resp.json();
    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      container.innerHTML = headerHtml + `<p>Nenhum pedido ainda.</p>`;
      document.getElementById('btn-logout').addEventListener('click', logoutAdmin);
      document.getElementById('btn-new-item').addEventListener('click', openNew);
      return;
    }
    let html = headerHtml;
    pedidos.forEach(o => {
      const statusMap = { pending: 'Aguardando', accepted: 'Aceito', out_for_delivery: 'Saiu pra entrega', delivered: 'Entregue' };
      let itens = [];
      try { itens = JSON.parse(o.itens); } catch(e) {}
      html += `
        <div class="order-card">
          <div class="order-card-header">
            <span class="order-id">#${o.numero} — ${escapeHTML(o.nome)}</span>
            <span class="order-status badge-disponivel">${statusMap[o.status] || o.status}</span>
          </div>
          <div><strong>Endereço:</strong> ${escapeHTML(o.endereco)}</div>
          <div><strong>Pagamento:</strong> ${escapeHTML(o.pagamento)}${o.troco ? ' (Troco: R$ ' + escapeHTML(o.troco) + ')' : ''}</div>
          <ul class="order-items-list">
            ${itens.map(i => {
              const adicionais = Array.isArray(i.adicionais) ? i.adicionais : [];
              const totalItem = (i.preco * i.qty) + adicionais.reduce((s,a) => s + a.preco * a.qty, 0) * i.qty;
              const extras = adicionais.length > 0 ? ` [${adicionais.map(a => `${a.nome} x${a.qty}`).join(', ')}]` : '';
              const obs = i.obs ? ` (${i.obs})` : '';
              return `<li>${escapeHTML(i.nome)} x${i.qty}${extras}${obs} — R$ ${totalItem.toFixed(2).replace('.', ',')}</li>`;
            }).join('')}
          </ul>
          <div><strong>Total:</strong> R$ ${parseFloat(o.total).toFixed(2).replace('.', ',')}</div>
          <div class="order-actions">
            ${o.status === 'pending' ? `<button class="btn-primary btn-accept" data-num="${o.numero}">Aceitar</button>` : ''}
            ${o.status === 'accepted' ? `<button class="btn-primary btn-out" data-num="${o.numero}">Saiu pra entrega</button>` : ''}
            ${o.status === 'out_for_delivery' ? `<button class="btn-primary btn-deliver" data-num="${o.numero}">Entregue</button>` : ''}
          </div>
        </div>`;
    });
    container.innerHTML = html;
    document.getElementById('btn-logout').addEventListener('click', logoutAdmin);
    document.getElementById('btn-new-item').addEventListener('click', openNew);
    document.querySelectorAll('.btn-accept').forEach(b => b.addEventListener('click', () => updateAdminStatus(b.dataset.num, 'accepted')));
    document.querySelectorAll('.btn-out').forEach(b => b.addEventListener('click', () => updateAdminStatus(b.dataset.num, 'out_for_delivery')));
    document.querySelectorAll('.btn-deliver').forEach(b => b.addEventListener('click', () => updateAdminStatus(b.dataset.num, 'delivered')));
  } catch (err) {
    container.innerHTML = '<p style="color:var(--color-primary)">Erro ao carregar pedidos.</p>';
    console.error(err);
  }
}
async function updateAdminStatus(numero, novoStatus) {
  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'updateStatus', number: numero, novoStatus, token: adminToken, timestamp: adminTimestamp, origin: window.location.origin })
    });
    const data = await resp.json();
    if (data.success) { renderAdmin(); toast('Status atualizado'); }
    else toast('Erro: ' + (data.erro || ''));
  } catch (err) { toast('Erro de conexão.'); }
}


// ---------- CRUD DE ITENS ----------
function openItemModal(title) {
  document.getElementById('modal-item-title').textContent = title;
  openModal(document.getElementById('modal-item'));
  document.getElementById('form-nome').focus();
}
function openNew() {
  editingId = null;
  document.getElementById('item-form').reset();
  openItemModal('Novo Item');
}
function openEdit(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  editingId = id;
  document.getElementById('form-nome').value = item.nome;
  document.getElementById('form-categoria').value = item.cat;
  document.getElementById('form-preco').value = item.preco;
  document.getElementById('form-desc').value = item.desc;
  document.getElementById('form-imagem').value = item.imagem || '';
  document.getElementById('form-disponivel').value = item.disponivel ? '1' : '0';
  openItemModal('Editar Item');
}
document.getElementById('item-form').addEventListener('submit', e => {
  e.preventDefault();
  const nome = document.getElementById('form-nome').value.trim();
  const cat = document.getElementById('form-categoria').value;
  const preco = parseFloat(document.getElementById('form-preco').value);
  const desc = document.getElementById('form-desc').value.trim();
  const imagem = document.getElementById('form-imagem').value.trim();
  const disponivel = document.getElementById('form-disponivel').value === '1';
  if (!nome || !cat || isNaN(preco)) { toast('Preencha os campos obrigatórios.'); return; }
  const base = { nome, cat, imagem, preco, desc, disponivel };
  if (editingId) {
    const idx = items.findIndex(i => i.id === editingId);
    items[idx] = { ...items[idx], ...base };
    toast('Item atualizado!');
  } else {
    items.push({ id: nextId++, ...base });
    toast('Item adicionado!');
  }
  closeModal(document.getElementById('modal-item'));
  saveLocalData();
  renderGrid();
});
function deleteItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  if (!confirm(`Excluir "${item.nome}" do cardápio?`)) return;
  items = items.filter(i => i.id !== id);
  saveLocalData();
  toast(`"${item.nome}" removido.`);
  renderGrid();
}


// ---------- MODAIS ----------
function openModal(overlay) { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }


// ---------- TOAST ----------
function toast(msg) {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    t.style.transition = '0.3s';
    setTimeout(() => t.remove(), 300);
  }, 2800);
}


// ---------- TEMA ----------
(() => {
  const toggle = document.querySelector('[data-theme-toggle]');
  const html = document.documentElement;
  let theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  html.setAttribute('data-theme', theme);
  const moon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const sun = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  function update() {
    toggle.innerHTML = theme === 'dark' ? sun : moon;
    toggle.setAttribute('aria-label', theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro');
  }
  update();
  toggle.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', theme);
    update();
  });
})();


// ---------- EVENTOS ----------
document.getElementById('btn-cart').addEventListener('click', () => { renderCartModal(); openModal(document.getElementById('modal-cart')); });
document.getElementById('btn-cart-close').addEventListener('click', () => closeModal(document.getElementById('modal-cart')));
document.getElementById('btn-checkout').addEventListener('click', () => { closeModal(document.getElementById('modal-cart')); openCheckout(); });
document.getElementById('btn-order-close').addEventListener('click', () => closeModal(document.getElementById('modal-order')));
document.getElementById('btn-cancel-order').addEventListener('click', () => closeModal(document.getElementById('modal-order')));
document.getElementById('btn-item-close').addEventListener('click', () => closeModal(document.getElementById('modal-item')));
document.getElementById('btn-cancel-item').addEventListener('click', () => closeModal(document.getElementById('modal-item')));
document.getElementById('btn-tracking').addEventListener('click', showTrackingSearch);
document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) closeModal(o); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(o => closeModal(o)); });
document.querySelectorAll('.filter-chip').forEach(chip => chip.addEventListener('click', () => {
  activeFilter = chip.dataset.filter;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  renderGrid();
}));
document.getElementById('search-input').addEventListener('input', e => {
  searchQuery = e.target.value.trim().toLowerCase();
  renderGrid();
});


// ---------- INICIALIZAÇÃO ----------
loadLocalData();
updateCartBadge();
renderGrid();

(async () => {
  if (window.location.search.includes('admin')) {
    const tokenOk = await verifyToken();
    if (tokenOk) {
      adminToken = sessionStorage.getItem('adminToken');
      adminTimestamp = sessionStorage.getItem('adminTimestamp');
      isAdmin = true;
      showAdminPanel();
    } else {
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminTimestamp');
      const senha = prompt('Senha do painel admin:');
      if (senha) await loginAdmin(senha);
      else window.location.search = '';
    }
  }
})();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
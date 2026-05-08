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
  return { ...ci, adicionais: Array.isArray(ci.adicionais) ? ci.adicionais : [], obs: ci.obs || '' };
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
    setTimeout(() => { window.location.href = urlWeb; }, 1200);
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
      { id:1,  nome:'X-Carne',           cat:'lanche',    imagem:'1.jpg',        preco:28, desc:'Carne, alface, tomate, milho, maionese temperada e queijo.', disponivel:true },
      { id:2,  nome:'X-Frango',           cat:'lanche',    imagem:'2.jpg',        preco:24, desc:'Frango, alface, tomate, milho, maionese temperada e queijo.', disponivel:true },
      { id:3,  nome:'Vazio',              cat:'churrasco', imagem:'3.jpg',        preco:55, desc:'', disponivel:true },
      { id:4,  nome:'Salsichao',          cat:'churrasco', imagem:'4.jpg',        preco:32, desc:'', disponivel:true },
      { id:5,  nome:'Costela Assada',     cat:'churrasco', imagem:'5.jpg',        preco:65, desc:'Costela de boi assada.', disponivel:true },
      { id:6,  nome:'Batata frita',       cat:'porcao',    imagem:'6.jpg',        preco:18, desc:'Batata frita crocante.', disponivel:true },
      { id:7,  nome:'Iscas de Frango',    cat:'porcao',    imagem:'7.jpg',        preco:22, desc:'Iscas de frango empanadas.', disponivel:true },
      { id:8,  nome:'Mandioca Frita',     cat:'porcao',    imagem:'8.jpg',        preco:16, desc:'Mandioca frita por inteiro.', disponivel:true },
      { id:9,  nome:'Heineken',           cat:'bebida',    imagem:'heineken.jpg', preco:9,  desc:'Long neck 355ml gelada.', disponivel:true },
      { id:10, nome:'Brahma',             cat:'bebida',    imagem:'brahma.jpg',   preco:7,  desc:'Long neck 355ml gelada.', disponivel:true },
      { id:11, nome:'Skol',               cat:'bebida',    imagem:'skol.jpg',     preco:7,  desc:'Long neck 355ml gelada.', disponivel:true },
      { id:12, nome:'Coca-Cola',          cat:'bebida',    imagem:'coca.jpg',     preco:6,  desc:'Lata 350ml gelada.', disponivel:true },
      { id:13, nome:'Guaraná Antarctica', cat:'bebida',    imagem:'guarana.jpg',  preco:6,  desc:'Lata 350ml gelada.', disponivel:true },
      { id:14, nome:'Pepsi',              cat:'bebida',    imagem:'pepsi.jpg',    preco:6,  desc:'Lata 350ml gelada.', disponivel:true },
      { id:15, nome:'Fanta Laranja',      cat:'bebida',    imagem:'fanta.jpg',    preco:6,  desc:'Lata 350ml gelada.', disponivel:true },
      { id:16, nome:'Sprite',             cat:'bebida',    imagem:'sprite.jpg',   preco:6,  desc:'Lata 350ml gelada.', disponivel:true },
      { id:17, nome:'Água Mineral',       cat:'bebida',    imagem:'agua.jpg',     preco:4,  desc:'500ml sem gás ou com gás.', disponivel:true },
    ];
  }
  const savedNextId = localStorage.getItem('gringo_nextId');
  if (savedNextId) nextId = +savedNextId;
  else nextId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
  const savedCart = localStorage.getItem('gringo_cart');
  if (savedCart) {
    try { const parsed = JSON.parse(savedCart); cart = parsed.map(normalizarCartItem); } catch(e) { cart = []; }
  }
}

// ---------- RENDERIZAÇÃO DO CARDÁPIO ----------
function buildCardHTML(item) {
  const nomeEscapado = escapeHTML(item.nome);
  const descEscapado = escapeHTML(item.desc);
  const imgSrc = item.imagem ? `imagens/${escapeHTML(item.imagem)}` : '';
  const imgTag = imgSrc
    ? `<img src="${imgSrc}" alt="${nomeEscapado}" loading="lazy" onerror="this.style.display='none'">`
    : `<span class="item-img-placeholder">Sem foto</span>`;
  const adminBtns = isAdmin
    ? `<button class="btn-edit" onclick="openEdit(${item.id})" aria-label="Editar ${nomeEscapado}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
       </button>
       <button class="btn-delete" onclick="deleteItem(${item.id})" aria-label="Excluir ${nomeEscapado}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
       </button>`
    : '';
  const addBtn = item.disponivel
    ? `<button class="btn-add-cart" onclick="openCustomize(${item.id})">Adicionar</button>`
    : `<button class="btn-add-cart" disabled>Indisponível</button>`;

  return `<article class="item-card${item.disponivel ? '' : ' unavailable'}" role="listitem" data-id="${item.id}"><div class="item-img-wrap">${imgTag}<span class="item-category-badge ${catBadgeClass(item.cat)}">${catLabel(item.cat)}</span><span class="item-avail-badge ${item.disponivel ? 'badge-disponivel' : 'badge-indisponivel'}">${item.disponivel ? 'Disponível' : 'Indisponível'}</span></div><div class="item-body"><h3 class="item-name">${nomeEscapado}</h3>${descEscapado ? `<p class="item-desc">${descEscapado}</p>` : ''}<div class="item-footer"><span class="item-price">R$&nbsp;${item.preco.toFixed(2).replace('.', ',')}</span><div class="item-actions">${addBtn}${adminBtns}</div></div></div></article>`;
}

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
  grid.innerHTML = filtered.map(item => buildCardHTML(item)).join('');
}

// ---------- CARRINHO ----------
function updateCartBadge() {
  const total = cart.reduce((s, ci) => s + ci.qty, 0);
  const badge = document.getElementById('cart-badge');
  badge.textContent = total;
  badge.style.display = total > 0 ? 'flex' : 'none';
}

function renderCartModal() {
  const body = document.getElementById('cart-body');
  const totalEl = document.getElementById('cart-total-val');
  if (cart.length === 0) {
    body.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:var(--space-8)">Seu carrinho está vazio 🛒</p>';
    totalEl.textContent = 'R$ 0,00';
    return;
  }
  let total = 0;
  body.innerHTML = cart.map((ci, idx) => {
    const item = items.find(i => i.id === ci.itemId);
    if (!item) return '';
    let subtotal = item.preco * ci.qty;
    let adicionaisHtml = '';
    if (ci.adicionais && ci.adicionais.length > 0) {
      ci.adicionais.forEach(ad => {
        const cfg = (ADICIONAIS_CONFIG[item.cat] || []).find(a => a.id === ad.id);
        if (cfg && ad.qty > 0) {
          subtotal += cfg.preco * ad.qty;
          adicionaisHtml += `<small style="display:block;color:var(--color-text-muted)">+ ${ad.qty}x ${escapeHTML(cfg.nome)}</small>`;
        }
      });
    }
    if (ci.obs) adicionaisHtml += `<small style="display:block;color:var(--color-text-muted)">Obs: ${escapeHTML(ci.obs)}</small>`;
    total += subtotal;
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) 0;border-bottom:1px solid var(--color-divider);gap:var(--space-3)">
      <div style="flex:1;min-width:0">
        <strong style="display:block">${escapeHTML(item.nome)}</strong>
        ${adicionaisHtml}
      </div>
      <div style="display:flex;align-items:center;gap:var(--space-2);flex-shrink:0">
        <button class="adicional-btn" onclick="changeCartQty(${idx},-1)">−</button>
        <span style="min-width:20px;text-align:center;font-weight:700">${ci.qty}</span>
        <button class="adicional-btn" onclick="changeCartQty(${idx},1)">+</button>
        <span style="min-width:70px;text-align:right;font-weight:700;color:var(--color-primary)">R$&nbsp;${subtotal.toFixed(2).replace('.', ',')}</span>
        <button class="btn-delete" onclick="removeCartItem(${idx})" aria-label="Remover">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>`;
  }).join('');
  totalEl.textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
}

function changeCartQty(idx, delta) {
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveLocalData();
  updateCartBadge();
  renderCartModal();
}

function removeCartItem(idx) {
  cart.splice(idx, 1);
  saveLocalData();
  updateCartBadge();
  renderCartModal();
}

// ---------- CUSTOMIZAR / ADICIONAR AO CARRINHO ----------
let currentCustomizeId = null;
let selectedAdicionais = {};

function openCustomize(itemId) {
  const item = items.find(i => i.id === itemId);
  if (!item) return;
  currentCustomizeId = itemId;
  selectedAdicionais = {};
  const adicionais = ADICIONAIS_CONFIG[item.cat] || [];
  document.getElementById('customize-title').textContent = escapeHTML(item.nome);
  const body = document.getElementById('customize-body');
  let html = '';
  if (adicionais.length > 0) {
    html += `<div class="adicionais-section"><h3>Adicionais</h3>`;
    adicionais.forEach(ad => {
      selectedAdicionais[ad.id] = 0;
      html += `<div class="adicional-row">
        <div class="adicional-info">
          <span class="adicional-nome">${escapeHTML(ad.nome)}</span>
          <span class="adicional-preco">+ R$ ${ad.preco.toFixed(2).replace('.', ',')}</span>
        </div>
        <div class="adicional-qty">
          <button class="adicional-btn" onclick="changeAdicional('${ad.id}',-1)">−</button>
          <span class="adicional-count" id="ad-count-${ad.id}">0</span>
          <button class="adicional-btn" onclick="changeAdicional('${ad.id}',1)">+</button>
        </div>
      </div>`;
    });
    html += `</div>`;
  }
  html += `<div class="form-group">
    <label class="form-label" for="obs-input">Observações</label>
    <textarea class="form-textarea" id="obs-input" placeholder="Ex: sem cebola, ponto da carne..."></textarea>
  </div>`;
  body.innerHTML = html;
  updateCustomizeTotal(item);
  openModal(document.getElementById('modal-customize'));
}

function changeAdicional(id, delta) {
  selectedAdicionais[id] = Math.max(0, (selectedAdicionais[id] || 0) + delta);
  document.getElementById(`ad-count-${id}`).textContent = selectedAdicionais[id];
  const item = items.find(i => i.id === currentCustomizeId);
  if (item) updateCustomizeTotal(item);
}

function updateCustomizeTotal(item) {
  const adicionais = ADICIONAIS_CONFIG[item.cat] || [];
  let total = item.preco;
  adicionais.forEach(ad => { total += (selectedAdicionais[ad.id] || 0) * ad.preco; });
  const el = document.getElementById('customize-total');
  if (el) el.textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
}

function confirmCustomize() {
  const item = items.find(i => i.id === currentCustomizeId);
  if (!item) return;
  const obs = (document.getElementById('obs-input') || {}).value || '';
  const adicionaisList = Object.entries(selectedAdicionais)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ id, qty }));
  const existing = cart.find(ci =>
    ci.itemId === item.id &&
    JSON.stringify(ci.adicionais) === JSON.stringify(adicionaisList) &&
    ci.obs === obs
  );
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ itemId: item.id, qty: 1, adicionais: adicionaisList, obs });
  }
  saveLocalData();
  updateCartBadge();
  closeModal(document.getElementById('modal-customize'));
  toast(`"${item.nome}" adicionado ao carrinho!`);
}

// ---------- CHECKOUT ----------
function openCheckout() {
  if (cart.length === 0) { toast('Carrinho vazio!'); return; }
  const total = cart.reduce((s, ci) => {
    const item = items.find(i => i.id === ci.itemId);
    if (!item) return s;
    let sub = item.preco * ci.qty;
    (ci.adicionais || []).forEach(ad => {
      const cfg = (ADICIONAIS_CONFIG[item.cat] || []).find(a => a.id === ad.id);
      if (cfg) sub += cfg.preco * ad.qty;
    });
    return s + sub;
  }, 0);
  document.getElementById('order-total-val').textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
  const num = Math.floor(Math.random() * 9000) + 1000;
  document.getElementById('order-number-display').textContent = '#' + num;
  openModal(document.getElementById('modal-order'));
}

document.getElementById('order-form').addEventListener('submit', async e => {
  e.preventDefault();
  const nome = document.getElementById('order-nome').value.trim();
  const endereco = document.getElementById('order-endereco').value.trim();
  const whatsapp = document.getElementById('order-whatsapp').value.trim();
  const pagamento = document.getElementById('order-pagamento').value;
  const troco = document.getElementById('order-troco').value.trim();
  if (!nome || !endereco || !whatsapp || !pagamento) { toast('Preencha todos os campos.'); return; }
  const numero = document.getElementById('order-number-display').textContent;
  let linhasItens = '';
  let totalPedido = 0;
  cart.forEach(ci => {
    const item = items.find(i => i.id === ci.itemId);
    if (!item) return;
    let sub = item.preco * ci.qty;
    let adStr = '';
    (ci.adicionais || []).forEach(ad => {
      const cfg = (ADICIONAIS_CONFIG[item.cat] || []).find(a => a.id === ad.id);
      if (cfg && ad.qty > 0) { sub += cfg.preco * ad.qty; adStr += ` (+${ad.qty}x ${cfg.nome})`; }
    });
    const obsStr = ci.obs ? ` [${ci.obs}]` : '';
    linhasItens += `${ci.qty}x ${item.nome}${adStr}${obsStr} - R$ ${sub.toFixed(2).replace('.', ',')}\n`;
    totalPedido += sub;
  });
  const mensagem = `*Pedido ${numero}*\n\n*Itens:*\n${linhasItens}\n*Total: R$ ${totalPedido.toFixed(2).replace('.', ',')}*\n\n*Nome:* ${nome}\n*Endereço:* ${endereco}\n*WhatsApp:* ${whatsapp}\n*Pagamento:* ${pagamento}${troco ? `\n*Troco para:* R$ ${troco}` : ''}`;
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        action: 'newOrder',
        number: numero.replace('#', ''),
        nome, endereco, whatsapp, pagamento, troco,
        itens: JSON.stringify(cart.map(ci => { const it = items.find(i => i.id === ci.itemId); return it ? { nome: it.nome, qty: ci.qty } : null; }).filter(Boolean)),
        total: totalPedido.toFixed(2),
        origin: window.location.origin
      })
    });
  } catch(err) { console.warn('Falha ao registrar pedido no servidor', err); }
  cart = [];
  saveLocalData();
  updateCartBadge();
  closeModal(document.getElementById('modal-order'));
  abrirWhatsApp('5551999999999', mensagem);
  toast('Pedido enviado! Redirecionando para o WhatsApp...');
});

// ---------- TRACKING ----------
function showTrackingSearch() {
  let panel = document.getElementById('tracking-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'tracking-panel';
    panel.className = 'tracking-panel';
    panel.style.display = 'none';
    panel.innerHTML = `<h3 style="font-family:var(--font-display);margin-bottom:var(--space-4)">Rastrear Pedido</h3>
      <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
        <input class="form-input" id="track-number" placeholder="Número do pedido (ex: 1234)" style="flex:1;min-width:140px">
        <input class="form-input" id="track-nome" placeholder="Seu nome" style="flex:1;min-width:140px">
        <button class="btn-primary" onclick="buscarPedido()">Buscar</button>
      </div>
      <div id="track-result" style="margin-top:var(--space-4)"></div>`;
    document.getElementById('main').appendChild(panel);
  }
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

async function buscarPedido() {
  const numero = (document.getElementById('track-number').value || '').trim();
  const nome = (document.getElementById('track-nome').value || '').trim();
  const result = document.getElementById('track-result');
  if (!numero || !nome) { result.innerHTML = '<p style="color:var(--color-primary)">Preencha o número e seu nome.</p>'; return; }
  result.innerHTML = '<p>Buscando...</p>';
  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'track', number: numero, nome, origin: window.location.origin })
    });
    const data = await resp.json();
    if (!data || data.error) {
      result.innerHTML = '<p style="color:var(--color-primary)">Pedido não encontrado ou nome não confere.</p>';
      return;
    }
    const statusMap = { pending: 'Aguardando', accepted: 'Aceito', out_for_delivery: 'Saiu pra entrega', delivered: 'Entregue' };
    const steps = ['pending', 'accepted', 'out_for_delivery', 'delivered'];
    const curIdx = steps.indexOf(data.status);
    const icons = ['🕐', '✅', '🛵', '🎉'];
    const stepsHtml = steps.map((s, i) => {
      const cls = i < curIdx ? 'completed' : i === curIdx ? 'active' : '';
      return `<div class="tracking-step"><div class="step-icon ${cls}">${icons[i]}</div><span class="step-label ${cls}">${statusMap[s]}</span></div>`;
    }).join('');
    result.innerHTML = `<div class="tracking-steps">${stepsHtml}</div>`;
  } catch (err) {
    result.innerHTML = '<p style="color:var(--color-primary)">Erro ao consultar. Tente novamente.</p>';
  }
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
    } else { toast('Senha incorreta.'); }
  } catch (err) { toast('Erro de conexão.'); }
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
  const headerHtml = `<div class="admin-header">
    <h2 style="font-family:var(--font-display);font-size:var(--text-lg)">Painel Admin</h2>
    <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
      <button id="btn-new-item" class="btn-primary">+ Novo Item</button>
      <button id="btn-logout" class="btn-secondary">Sair</button>
    </div>
  </div>`;
  container.innerHTML = headerHtml + `<p style="color:var(--color-text-muted)">Carregando pedidos...</p>`;
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
      container.innerHTML = headerHtml + `<p style="color:var(--color-text-muted)">Nenhum pedido ainda.</p>`;
      document.getElementById('btn-logout').addEventListener('click', logoutAdmin);
      document.getElementById('btn-new-item').addEventListener('click', openNew);
      return;
    }
    const statusMap = { pending: 'Aguardando', accepted: 'Aceito', out_for_delivery: 'Saiu pra entrega', delivered: 'Entregue' };
    let html = headerHtml;
    pedidos.forEach(o => {
      let itens = [];
      try { itens = JSON.parse(o.itens); } catch(e) {}
      html += `<div class="order-card">
        <div class="order-card-header">
          <span class="order-id">#${escapeHTML(String(o.number))}</span>
          <span class="order-status" style="background:var(--color-accent-highlight);color:var(--color-accent-hover)">${statusMap[o.status] || o.status}</span>
        </div>
        <p><strong>${escapeHTML(o.nome)}</strong> — ${escapeHTML(o.endereco)}</p>
        <p style="font-size:var(--text-sm);color:var(--color-text-muted)">${escapeHTML(o.whatsapp)} | ${escapeHTML(o.pagamento)}</p>
        <ul class="order-items-list">${itens.map(i => `<li>${i.qty}x ${escapeHTML(i.nome)}</li>`).join('')}</ul>
        <p><strong>Total: R$ ${escapeHTML(String(o.total))}</strong></p>
        <div class="order-actions">
          ${['accepted', 'out_for_delivery', 'delivered'].map(s =>
            `<button class="btn-secondary" onclick="updateAdminStatus('${o.number}','${s}')">${statusMap[s]}</button>`
          ).join('')}
        </div>
      </div>`;
    });
    container.innerHTML = html;
    document.getElementById('btn-logout').addEventListener('click', logoutAdmin);
    document.getElementById('btn-new-item').addEventListener('click', openNew);
  } catch (err) {
    container.innerHTML = headerHtml + `<p style="color:var(--color-primary)">Erro ao carregar pedidos.</p>`;
    console.error(err);
    document.getElementById('btn-logout').addEventListener('click', logoutAdmin);
    document.getElementById('btn-new-item').addEventListener('click', openNew);
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
function openModal(overlay) {
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(overlay) {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

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
  const sun = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
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
document.getElementById('btn-cart').addEventListener('click', () => {
  renderCartModal();
  openModal(document.getElementById('modal-cart'));
});
document.getElementById('btn-cart-close').addEventListener('click', () => closeModal(document.getElementById('modal-cart')));
document.getElementById('btn-checkout').addEventListener('click', () => {
  closeModal(document.getElementById('modal-cart'));
  openCheckout();
});
document.getElementById('btn-order-close').addEventListener('click', () => closeModal(document.getElementById('modal-order')));
document.getElementById('btn-cancel-order').addEventListener('click', () => closeModal(document.getElementById('modal-order')));
document.getElementById('btn-item-close').addEventListener('click', () => closeModal(document.getElementById('modal-item')));
document.getElementById('btn-cancel-item').addEventListener('click', () => closeModal(document.getElementById('modal-item')));
document.getElementById('btn-customize-close').addEventListener('click', () => closeModal(document.getElementById('modal-customize')));
document.getElementById('btn-confirm-customize').addEventListener('click', confirmCustomize);
document.getElementById('btn-tracking').addEventListener('click', showTrackingSearch);

document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => {
  if (e.target === o) closeModal(o);
}));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(o => closeModal(o));
});
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
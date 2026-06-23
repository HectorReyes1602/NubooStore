const SHIPPING_COST = 99;
const FREE_SHIPPING_THRESHOLD = 500;

const CATEGORY_IMAGES = {
  frenos: 'assets/images/products/01-pastillas.jpg',
  motor: 'assets/images/products/04-filtro-aceite.jpg',
  suspension: 'assets/images/products/13-amortiguador.jpg',
  electrico: 'assets/images/products/11-bateria-24f.jpg',
  aceites: 'assets/images/products/08-aceite-5w30.jpg',
  llantas: 'assets/images/products/22-llanta-r15.jpg'
};

const CATEGORY_LABELS = {
  frenos: 'Frenos', motor: 'Motor', suspension: 'Suspensión',
  electrico: 'Eléctrico', aceites: 'Aceites', llantas: 'Llantas', todos: 'Todos'
};

let allProducts = [];
let allCategories = [];
let cartSnapshot = null;

function mapApiProduct(product) {
  return {
    id: product.id,
    sku: product.sku,
    nombre: product.name,
    marca: product.brand,
    categoria: product.category.slug,
    precio: product.price,
    stock: product.stock,
    imagen: product.imageUrl,
    descripcion: product.description,
    compatibilidad: product.compatibilities || []
  };
}

async function loadProducts() {
  try {
    const data = await apiRequest('/products?limit=100', { auth: false });
    allProducts = data.products.map(mapApiProduct);
  } catch (error) {
    console.error('Error cargando productos:', error);
    allProducts = [];
    showToast(error.message, 'error');
  }
  return allProducts;
}

async function loadCategories() {
  try {
    const data = await apiRequest('/categories', { auth: false });
    allCategories = data.categories;
  } catch (error) {
    console.error('Error cargando categorías:', error);
    allCategories = [];
  }
  return allCategories;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function getProductImage(product) {
  const image = String(product.imagen || '');
  if (/^assets\/images\/[a-zA-Z0-9_./-]+$/.test(image) || /^https:\/\//i.test(image)) return image;
  return CATEGORY_IMAGES[product.categoria] || 'assets/images/products/01-pastillas.jpg';
}

function renderProductImage(product, className = 'product-img') {
  const src = escapeHtml(getProductImage(product));
  const alt = escapeHtml(product.nombre || 'Producto NUBO');
  const fallback = CATEGORY_IMAGES[product.categoria] || 'assets/images/products/01-pastillas.jpg';
  return `<img src="${src}" alt="${alt}" class="${escapeHtml(className)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fallback}'">`;
}

function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] || allCategories.find(item => item.slug === category)?.name || category;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

function showToast(message, type = 'default') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function isValidEmail(email) {
  return /^[a-z0-9._%+-]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(email);
}

function isValidFullName(name) {
  const normalized = name.trim();
  const letters = normalized.match(/\p{L}/gu) || [];
  return normalized.length >= 3 && normalized.length <= 100 &&
    letters.length >= 2 && /^[\p{L}\p{M} .'-]+$/u.test(normalized);
}

function renderShopProgress(currentStep) {
  const container = document.getElementById('shop-progress');
  if (!container) return;
  const steps = ['Carrito', 'Envío y pago', 'Confirmación'];
  container.innerHTML = steps.map((label, index) => {
    const number = index + 1;
    const completed = number < currentStep;
    return `
      <div class="step ${number === currentStep ? 'active' : ''} ${completed ? 'completed' : ''}">
        <div class="step-circle">${completed ? '✓' : number}</div>
        <span class="step-label">${label}</span>
      </div>
      ${index < steps.length - 1 ? `<div class="step-connector ${completed ? 'completed' : ''}"></div>` : ''}
    `;
  }).join('');
}

function renderHeader(activePage = '') {
  const session = getSession();
  const count = cartSnapshot?.items?.reduce((total, item) => total + (item.quantity ?? item.cantidad ?? 0), 0) || 0;
  const authHtml = session
    ? `<button class="account-menu-trigger" id="open-account-menu" type="button" aria-label="Abrir menú de mi cuenta" aria-expanded="false">
         <span class="account-avatar">${escapeHtml((session.fullName || 'U').charAt(0).toUpperCase())}</span>
         <span class="user-greeting visible">Hola, ${escapeHtml((session.fullName || '').split(' ')[0])}</span>
         <i class="fa-solid fa-bars" aria-hidden="true"></i>
       </button>`
    : '<a href="login.html" class="btn btn-ghost btn-sm">Acceder</a>';
  const cartHref = session ? 'carrito.html' : 'login.html?redirect=carrito.html';

  const sidebar = session ? renderUserSidebar(session) : '';
  return `
    <header class="site-header"><div class="container header-inner">
      <a href="index.html" class="logo"><img src="assets/images/logo-nubo.svg" alt="NUBO" class="logo-img"></a>
      ${activePage === 'home' ? '<div class="search-bar"><span class="search-icon"><i class="fa-solid fa-magnifying-glass"></i></span><input type="text" id="search-input" placeholder="Buscar refacciones, marcas..."></div>' : ''}
      <div class="header-actions">${authHtml}<a href="${cartHref}" class="btn-icon" title="Carrito"><i class="fa-solid fa-cart-shopping"></i><span class="cart-badge ${count ? '' : 'hidden'}" id="cart-badge">${count}</span></a></div>
    </div></header>${sidebar}`;
}

function renderUserSidebar(session) {
  return `
    <div class="user-sidebar-backdrop" id="user-sidebar-backdrop"></div>
    <aside class="user-sidebar" id="user-sidebar" aria-hidden="true">
      <div class="user-sidebar-header">
        <div class="user-sidebar-identity">
          <span class="account-avatar account-avatar-lg">${escapeHtml((session.fullName || 'U').charAt(0).toUpperCase())}</span>
          <div><strong>${escapeHtml(session.fullName)}</strong><small>${escapeHtml(session.email)}</small></div>
        </div>
        <button type="button" class="user-sidebar-close" id="close-account-menu" aria-label="Cerrar menú"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <nav class="user-sidebar-nav" aria-label="Menú de mi cuenta">
        <a href="index.html" class="user-sidebar-link"><i class="fa-solid fa-house"></i><span>Inicio y catálogo</span></a>
        <a href="cuenta.html" class="user-sidebar-link"><i class="fa-solid fa-gauge-high"></i><span>Resumen</span></a>
        <a href="cuenta.html?section=compras" class="user-sidebar-link"><i class="fa-solid fa-bag-shopping"></i><span>Mis compras</span></a>
        <a href="cuenta.html?section=direcciones" class="user-sidebar-link"><i class="fa-solid fa-location-dot"></i><span>Mis direcciones</span></a>
        <a href="cuenta.html?section=facturacion" class="user-sidebar-link"><i class="fa-solid fa-credit-card"></i><span>Métodos de pago</span></a>
        <a href="cuenta.html?section=perfil" class="user-sidebar-link"><i class="fa-solid fa-user-gear"></i><span>Información de cuenta</span></a>
      </nav>
      <div class="user-sidebar-footer"><button type="button" class="user-sidebar-logout" id="btn-logout"><i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión</button></div>
    </aside>`;
}

function renderFooter() {
  return `<footer class="site-footer"><div class="container"><div class="footer-grid">
    <div><h4>NUBO</h4><p>Tu tienda de confianza para refacciones automotrices. Calidad y precio en un solo lugar.</p></div>
    <div><h4>Categorías</h4><ul><li>Frenos</li><li>Motor</li><li>Suspensión</li><li>Eléctrico</li><li>Aceites</li><li>Llantas</li></ul></div>
    <div><h4>Contacto</h4><p>📞 (55) 1234-5678</p><p>✉️ contacto@nubo.com</p><p>📍 Ciudad de México, México</p></div>
  </div><div class="footer-bottom"><p>&copy; 2026 NUBO. Todos los derechos reservados.</p></div></div></footer>`;
}

function initHeader() {
  const sidebar = document.getElementById('user-sidebar');
  const backdrop = document.getElementById('user-sidebar-backdrop');
  const trigger = document.getElementById('open-account-menu');
  const setSidebarOpen = open => {
    sidebar?.classList.toggle('open', open);
    backdrop?.classList.toggle('open', open);
    sidebar?.setAttribute('aria-hidden', String(!open));
    trigger?.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('sidebar-open', open);
  };
  trigger?.addEventListener('click', () => setSidebarOpen(true));
  document.getElementById('close-account-menu')?.addEventListener('click', () => setSidebarOpen(false));
  backdrop?.addEventListener('click', () => setSidebarOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setSidebarOpen(false);
  });
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await apiLogout();
    window.location.href = 'index.html';
  });
}

async function updateCartBadge(cart = null) {
  const badge = document.getElementById('cart-badge');
  if (!badge || !getSession()) {
    badge?.classList.add('hidden');
    return;
  }
  try {
    if (!cart) cart = (await apiRequest('/cart')).cart;
    cartSnapshot = cart;
    const count = cart.items.reduce((total, item) => total + item.quantity, 0);
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  } catch (error) {
    if (error.status === 401) clearApiSession();
    badge.classList.add('hidden');
  }
}

function requireAuth(redirectUrl) {
  const session = getSession();
  if (!session) {
    const target = redirectUrl || window.location.pathname.split('/').pop();
    window.location.href = `login.html?redirect=${encodeURIComponent(target)}`;
    return null;
  }
  return session;
}

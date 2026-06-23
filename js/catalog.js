let filteredProducts = [];
let activeCategory = 'todos';
let searchQuery = '';
let priceMin = 0;
let priceMax = Infinity;

function renderCategories() {
  const container = document.getElementById('categories-list');
  if (!container) return;

  const categories = ['todos', ...allCategories.map(category => category.slug)];

  container.innerHTML = categories.map(cat => `
    <button class="category-chip ${cat === activeCategory ? 'active' : ''}" data-category="${cat}">
      ${escapeHtml(getCategoryLabel(cat))}
    </button>
  `).join('');

  container.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      activeCategory = chip.dataset.category;
      container.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applyFilters();
    });
  });
}

function applyFilters() {
  filteredProducts = allProducts.filter(product => {
    const matchCategory = activeCategory === 'todos' || product.categoria === activeCategory;
    const matchSearch = !searchQuery ||
      product.nombre.toLowerCase().includes(searchQuery) ||
      product.marca.toLowerCase().includes(searchQuery) ||
      product.descripcion.toLowerCase().includes(searchQuery) ||
      (product.compatibilidad && product.compatibilidad.some(c => c.toLowerCase().includes(searchQuery)));
    const matchPrice = product.precio >= priceMin && product.precio <= priceMax;
    return matchCategory && matchSearch && matchPrice;
  });

  renderProducts();
  updateProductsCount();
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1">
        <div class="empty-state-icon">🔍</div>
        <h3>No se encontraron productos</h3>
        <p>Intenta con otra búsqueda o categoría diferente.</p>
        <button class="btn btn-outline" id="btn-clear-filters">Limpiar filtros</button>
      </div>
    `;
    document.getElementById('btn-clear-filters')?.addEventListener('click', clearFilters);
    return;
  }

  grid.innerHTML = filteredProducts.map(product => `
    <article class="product-card" data-id="${product.id}">
      <div class="product-card-image">
        <span class="category-label">${escapeHtml(getCategoryLabel(product.categoria))}</span>
        ${renderProductImage(product)}
      </div>
      <div class="product-card-body">
        <span class="product-card-brand">${escapeHtml(product.marca)}</span>
        <h3 class="product-card-title" data-id="${product.id}">${escapeHtml(product.nombre)}</h3>
        <p class="product-card-stock ${product.stock > 0 ? 'in-stock' : 'out-stock'}">
          ${product.stock > 0 ? `${product.stock} en stock` : 'Agotado'}
        </p>
        <div class="product-card-price">${formatCurrency(product.precio)}</div>
        <div class="product-card-actions">
          <button class="btn btn-outline btn-sm btn-detail" data-id="${product.id}">Ver más</button>
          <button class="btn btn-primary btn-sm btn-add-cart" data-id="${product.id}" ${product.stock === 0 ? 'disabled' : ''}>Agregar al carrito</button>
        </div>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.btn-detail, .product-card-title').forEach(el => {
    el.addEventListener('click', () => openProductModal(parseInt(el.dataset.id)));
  });

  grid.querySelectorAll('.btn-add-cart').forEach(btn => {
    btn.addEventListener('click', () => addToCartFromCatalog(parseInt(btn.dataset.id)));
  });
}

function updateProductsCount() {
  const counter = document.getElementById('products-count');
  if (counter) {
    counter.textContent = `${filteredProducts.length} producto${filteredProducts.length !== 1 ? 's' : ''}`;
  }
}

function clearFilters() {
  activeCategory = 'todos';
  searchQuery = '';
  priceMin = 0;
  priceMax = Infinity;

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  const priceMinInput = document.getElementById('price-min');
  const priceMaxInput = document.getElementById('price-max');
  if (priceMinInput) priceMinInput.value = '';
  if (priceMaxInput) priceMaxInput.value = '';

  document.querySelectorAll('.category-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.category === 'todos');
  });

  applyFilters();
}

function openProductModal(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('product-modal');
  if (!modal) return;

  const compatHtml = product.compatibilidad && product.compatibilidad.length
    ? `<p class="modal-product-compat"><strong>Compatibilidad:</strong> ${product.compatibilidad.map(escapeHtml).join(', ')}</p>`
    : '';

  document.getElementById('modal-title').textContent = product.nombre;
  document.getElementById('modal-image').innerHTML = renderProductImage(product, 'modal-product-img');
  document.getElementById('modal-brand').textContent = product.marca;
  document.getElementById('modal-price').textContent = formatCurrency(product.precio);
  document.getElementById('modal-desc').textContent = product.descripcion;

  const compatEl = document.getElementById('modal-compat');
  if (compatEl) compatEl.innerHTML = compatHtml;

  document.getElementById('modal-stock').textContent = product.stock > 0
    ? `✓ En stock (${product.stock} disponibles)`
    : '✗ Agotado';
  document.getElementById('modal-stock').className = `modal-product-stock ${product.stock > 0 ? 'in-stock' : ''}`;

  const addBtn = document.getElementById('modal-add-cart');
  addBtn.dataset.id = product.id;
  addBtn.disabled = product.stock === 0;

  modal.classList.add('open');
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.classList.remove('open');
}

async function addToCartFromCatalog(productId) {
  if (!getSession()) {
    showToast('Inicia sesión para agregar productos', 'error');
    setTimeout(() => {
      window.location.href = 'login.html?redirect=index.html';
    }, 1000);
    return;
  }

  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  if (product.stock === 0) {
    showToast('Producto agotado', 'error');
    return;
  }

  if (await addToCart(productId, 1)) {
    showToast(`${product.nombre} agregado al carrito`, 'success');
    closeProductModal();
  }
}

async function initCatalogPage() {
  await Promise.all([loadProducts(), loadCategories()]);
  filteredProducts = [...allProducts];
  renderCategories();
  renderProducts();
  updateProductsCount();

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        searchQuery = e.target.value.toLowerCase().trim();
        applyFilters();
      }, 300);
    });
  }

  const priceMinInput = document.getElementById('price-min');
  const priceMaxInput = document.getElementById('price-max');

  if (priceMinInput) {
    priceMinInput.addEventListener('change', (e) => {
      priceMin = parseFloat(e.target.value) || 0;
      applyFilters();
    });
  }

  if (priceMaxInput) {
    priceMaxInput.addEventListener('change', (e) => {
      priceMax = parseFloat(e.target.value) || Infinity;
      applyFilters();
    });
  }

  document.getElementById('modal-close')?.addEventListener('click', closeProductModal);
  document.getElementById('product-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'product-modal') closeProductModal();
  });
  document.getElementById('modal-add-cart')?.addEventListener('click', (e) => {
    addToCartFromCatalog(parseInt(e.target.dataset.id));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('products-grid')) {
    initCatalogPage();
  }
});

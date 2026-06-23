function mapCartItem(item) {
  return {
    id: item.productId,
    nombre: item.name,
    marca: item.brand,
    precio: item.price,
    stock: item.stock,
    imagen: item.imageUrl,
    cantidad: item.quantity,
    lineTotal: item.lineTotal
  };
}

function getCart() {
  return (cartSnapshot?.items || []).map(mapCartItem);
}

function getCartTotals() {
  return {
    subtotal: cartSnapshot?.subtotal || 0,
    shipping: cartSnapshot?.shipping || 0,
    total: cartSnapshot?.total || 0,
    itemCount: getCart().reduce((total, item) => total + item.cantidad, 0)
  };
}

async function loadCart() {
  const data = await apiRequest('/cart');
  cartSnapshot = data.cart;
  await updateCartBadge(cartSnapshot);
  return getCart();
}

async function addToCart(productId, quantity = 1) {
  try {
    const data = await apiRequest('/cart/items', {
      method: 'POST', body: { productId, quantity }
    });
    cartSnapshot = data.cart;
    await updateCartBadge(cartSnapshot);
    return true;
  } catch (error) {
    showToast(error.message, 'error');
    return false;
  }
}

async function updateQty(productId, quantity) {
  if (quantity <= 0) return removeCartItem(productId);
  try {
    const data = await apiRequest(`/cart/items/${productId}`, {
      method: 'PATCH', body: { quantity }
    });
    cartSnapshot = data.cart;
    renderCart();
    await updateCartBadge(cartSnapshot);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function updateCartItemQuantity(productId, delta) {
  const item = getCart().find(product => product.id === productId);
  if (item) updateQty(productId, item.cantidad + delta);
}

async function removeCartItem(productId) {
  try {
    const data = await apiRequest(`/cart/items/${productId}`, { method: 'DELETE' });
    cartSnapshot = data.cart;
    renderCart();
    await updateCartBadge(cartSnapshot);
    showToast('Producto eliminado del carrito');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const summaryContainer = document.getElementById('cart-summary');
  if (!container) return;
  const cart = getCart();

  if (cart.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🛒</div><h3>Tu carrito está vacío</h3><p>Explora nuestro catálogo y encuentra las refacciones que necesitas.</p><a href="index.html" class="btn btn-primary">Ver productos</a></div>';
    if (summaryContainer) summaryContainer.style.display = 'none';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-image">${renderProductImage(item, 'cart-item-img')}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(item.nombre)}</div>
        <div class="cart-item-brand">${escapeHtml(item.marca)}</div>
        <div class="cart-item-price">${formatCurrency(item.precio)}</div>
      </div>
      <div class="cart-item-actions">
        <div class="qty-control">
          <button class="qty-btn btn-qty-minus" data-id="${item.id}" aria-label="Disminuir cantidad">−</button>
          <span class="qty-value">${item.cantidad}</span>
          <button class="qty-btn btn-qty-plus" data-id="${item.id}" aria-label="Aumentar cantidad">+</button>
        </div>
        <button class="btn-remove" data-id="${item.id}">Eliminar</button>
      </div>
    </div>`).join('');

  container.querySelectorAll('.btn-qty-minus').forEach(button => {
    button.addEventListener('click', () => updateCartItemQuantity(Number(button.dataset.id), -1));
  });
  container.querySelectorAll('.btn-qty-plus').forEach(button => {
    button.addEventListener('click', () => updateCartItemQuantity(Number(button.dataset.id), 1));
  });
  container.querySelectorAll('.btn-remove').forEach(button => {
    button.addEventListener('click', () => removeCartItem(Number(button.dataset.id)));
  });

  const { subtotal, shipping, total } = getCartTotals();
  const shippingLabel = shipping === 0 ? 'Gratis' : formatCurrency(shipping);
  const shippingNote = subtotal < FREE_SHIPPING_THRESHOLD
    ? `<p class="shipping-note">Envío gratis en compras mayores a ${formatCurrency(FREE_SHIPPING_THRESHOLD)}</p>`
    : '';
  summaryContainer.style.display = 'block';
  summaryContainer.innerHTML = `
    <h3>Resumen</h3>
    <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
    <div class="summary-row"><span class="label-muted">Envío</span><span>${shippingLabel}</span></div>
    ${shippingNote}
    <div class="summary-row total"><span>Total</span><span>${formatCurrency(total)}</span></div>
    <button class="btn btn-primary btn-block btn-lg" id="btn-checkout" style="margin-top:1.25rem">Continuar compra</button>`;
  document.getElementById('btn-checkout').addEventListener('click', () => { window.location.href = 'checkout.html'; });
}

async function initCartPage() {
  if (!requireAuth('carrito.html')) return;
  renderShopProgress(1);
  try {
    await loadCart();
    renderCart();
  } catch (error) {
    document.getElementById('cart-items').innerHTML = `<div class="empty-state"><h3>No fue posible cargar el carrito</h3><p>${escapeHtml(error.message)}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cart-items')) initCartPage();
});

let checkoutData = {
  shipping: {}, paymentMethod: 'card', cardLastFour: null,
  addresses: [], paymentMethods: [], selectedAddressId: null, selectedPaymentMethodId: null,
  newCardData: null
};

function setFieldError(input, errorElement, message = '') {
  input?.classList.toggle('error', Boolean(message));
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.toggle('visible', Boolean(message));
  }
}

function validateShippingForm() {
  const form = document.getElementById('checkout-form');
  const fields = {
    recipientName: form.querySelector('#ship-name').value.trim(),
    phone: form.querySelector('#ship-phone').value.trim(),
    street: form.querySelector('#ship-street').value.trim(),
    exteriorNumber: form.querySelector('#ship-ext').value.trim(),
    interiorNumber: form.querySelector('#ship-int').value.trim() || null,
    neighborhood: form.querySelector('#ship-colonia').value.trim(),
    municipality: form.querySelector('#ship-city').value.trim(),
    state: form.querySelector('#ship-state').value.trim(),
    postalCode: form.querySelector('#ship-zip').value.trim()
  };
  const required = [
    ['recipientName', '#ship-name', '#error-nombre'], ['phone', '#ship-phone', '#error-telefono'],
    ['street', '#ship-street', '#error-calle'], ['exteriorNumber', '#ship-ext', '#error-numExt'],
    ['neighborhood', '#ship-colonia', '#error-colonia'], ['municipality', '#ship-city', '#error-municipio'],
    ['state', '#ship-state', '#error-estado'], ['postalCode', '#ship-zip', '#error-cp']
  ];
  let valid = true;
  required.forEach(([key, inputSelector, errorSelector]) => {
    const message = fields[key] ? '' : 'Este campo es obligatorio';
    if (message) valid = false;
    setFieldError(form.querySelector(inputSelector), form.querySelector(errorSelector), message);
  });
  if (fields.phone && !/^[0-9 +()-]{10,20}$/.test(fields.phone)) {
    valid = false;
    setFieldError(form.querySelector('#ship-phone'), form.querySelector('#error-telefono'), 'Ingresa un teléfono válido');
  }
  if (fields.postalCode && !/^\d{5}$/.test(fields.postalCode)) {
    valid = false;
    setFieldError(form.querySelector('#ship-zip'), form.querySelector('#error-cp'), 'El código postal debe tener 5 dígitos');
  }
  if (valid) checkoutData.shipping = fields;
  if (valid && checkoutData.selectedAddressId === 'new' && document.getElementById('save-new-address')?.checked &&
      !document.getElementById('new-address-label').value.trim()) {
    showToast('Escribe un nombre para guardar la dirección', 'error');
    return false;
  }
  return valid;
}

function validatePaymentForm() {
  const form = document.getElementById('checkout-form');
  const selected = document.querySelector('input[name="payment"]:checked')?.value;
  const methods = { tarjeta: 'card', transferencia: 'bank_transfer', efectivo: 'cash_on_delivery' };
  checkoutData.paymentMethod = methods[selected] || 'card';
  checkoutData.cardLastFour = null;
  checkoutData.newCardData = null;
  if (selected !== 'tarjeta') return true;

  const savedMethod = checkoutData.paymentMethods.find(method => method.id === checkoutData.selectedPaymentMethodId);
  if (savedMethod) {
    checkoutData.cardLastFour = savedMethod.lastFour;
    return true;
  }

  const holder = form.querySelector('#card-holder').value.trim();
  const cardNumber = form.querySelector('#card-number').value.replace(/\s/g, '');
  const expiration = form.querySelector('#card-exp').value.trim();
  const cvv = form.querySelector('#card-cvv').value.trim();
  let valid = true;
  const checks = [
    [holder !== '', '#card-holder', '#error-titular', 'Este campo es obligatorio'],
    [/^\d{15,16}$/.test(cardNumber), '#card-number', '#error-tarjeta', 'Ingresa un número de tarjeta válido'],
    [/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiration), '#card-exp', '#error-vencimiento', 'Usa el formato MM/AA'],
    [/^\d{3,4}$/.test(cvv), '#card-cvv', '#error-cvv', 'CVV inválido']
  ];
  checks.forEach(([passes, input, error, message]) => {
    if (!passes) valid = false;
    setFieldError(form.querySelector(input), form.querySelector(error), passes ? '' : message);
  });
  if (valid && document.getElementById('save-new-payment')?.checked &&
      !document.getElementById('new-payment-label').value.trim()) {
    showToast('Escribe un nombre para guardar la tarjeta', 'error');
    return false;
  }
  if (valid) {
    checkoutData.cardLastFour = cardNumber.slice(-4);
    const [month, shortYear] = expiration.split('/');
    checkoutData.newCardData = {
      cardholderName: holder,
      brand: detectCheckoutCardBrand(cardNumber),
      lastFour: cardNumber.slice(-4),
      expiryMonth: Number(month),
      expiryYear: 2000 + Number(shortYear)
    };
  }
  return valid;
}

function detectCheckoutCardBrand(cardNumber) {
  if (/^4/.test(cardNumber)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(cardNumber)) return 'mastercard';
  if (/^3[47]/.test(cardNumber)) return 'amex';
  return 'other';
}

function toggleCardSection() {
  const selected = document.querySelector('input[name="payment"]:checked')?.value;
  const section = document.getElementById('card-section');
  if (section) section.style.display = selected === 'tarjeta' ? 'block' : 'none';
}

function fillShippingFields(address = null) {
  const values = address ? {
    'ship-name': address.recipientName, 'ship-phone': address.phone, 'ship-street': address.street,
    'ship-ext': address.exteriorNumber, 'ship-int': address.interiorNumber || '',
    'ship-colonia': address.neighborhood, 'ship-city': address.municipality,
    'ship-state': address.state, 'ship-zip': address.postalCode
  } : {
    'ship-name': getSession()?.fullName || '', 'ship-phone': '', 'ship-street': '', 'ship-ext': '',
    'ship-int': '', 'ship-colonia': '', 'ship-city': '', 'ship-state': '', 'ship-zip': ''
  };
  Object.entries(values).forEach(([id, value]) => { document.getElementById(id).value = value; });
}

function selectCheckoutAddress(value) {
  checkoutData.selectedAddressId = value === 'new' ? 'new' : Number(value);
  document.querySelectorAll('[data-checkout-address]').forEach(option => {
    option.classList.toggle('selected', String(option.dataset.checkoutAddress) === String(value));
  });
  const address = checkoutData.addresses.find(item => item.id === checkoutData.selectedAddressId);
  const formSection = document.getElementById('shipping-form-section');
  if (address) {
    fillShippingFields(address);
    formSection.classList.add('hidden');
  } else {
    fillShippingFields();
    document.getElementById('shipping-form-title').textContent = 'Agregar otra dirección';
    formSection.classList.remove('hidden');
  }
}

function renderCheckoutAddresses() {
  const section = document.getElementById('checkout-address-options');
  const container = document.getElementById('saved-address-options');
  if (!checkoutData.addresses.length) {
    checkoutData.selectedAddressId = 'new';
    section.classList.add('hidden');
    document.getElementById('shipping-form-section').classList.remove('hidden');
    return;
  }
  section.classList.remove('hidden');
  container.innerHTML = checkoutData.addresses.map(address => `
    <button type="button" class="checkout-choice" data-checkout-address="${address.id}">
      <i class="fa-solid fa-location-dot"></i><span><strong>${escapeHtml(address.label)}</strong><small>${escapeHtml(address.street)} ${escapeHtml(address.exteriorNumber)}, ${escapeHtml(address.neighborhood)}</small></span>${address.isDefault ? '<em>Principal</em>' : ''}
    </button>`).join('') + `
    <button type="button" class="checkout-choice checkout-choice-new" data-checkout-address="new"><i class="fa-solid fa-plus"></i><span><strong>Otra dirección</strong><small>Capturar y guardar una nueva</small></span></button>`;
  container.querySelectorAll('[data-checkout-address]').forEach(option => {
    option.addEventListener('click', () => selectCheckoutAddress(option.dataset.checkoutAddress));
  });
  const preferred = checkoutData.addresses.find(address => address.isDefault) || checkoutData.addresses[0];
  selectCheckoutAddress(preferred.id);
}

function selectCheckoutPaymentMethod(value) {
  checkoutData.selectedPaymentMethodId = value === 'new' ? 'new' : Number(value);
  document.querySelectorAll('[data-checkout-payment]').forEach(option => {
    option.classList.toggle('selected', String(option.dataset.checkoutPayment) === String(value));
  });
  document.getElementById('new-card-fields').classList.toggle('hidden', value !== 'new');
}

function renderCheckoutPaymentMethods() {
  const container = document.getElementById('saved-payment-options');
  if (!checkoutData.paymentMethods.length) {
    container.innerHTML = '';
    checkoutData.selectedPaymentMethodId = 'new';
    document.getElementById('new-card-fields').classList.remove('hidden');
    return;
  }
  container.innerHTML = checkoutData.paymentMethods.map(method => `
    <button type="button" class="checkout-choice" data-checkout-payment="${method.id}">
      <i class="fa-regular fa-credit-card"></i><span><strong>${escapeHtml(method.label)} ·•••• ${escapeHtml(method.lastFour)}</strong><small>${escapeHtml(paymentBrandLabelForCheckout(method.brand))} · Vence ${String(method.expiryMonth).padStart(2, '0')}/${String(method.expiryYear).slice(-2)}</small></span>${method.isDefault ? '<em>Principal</em>' : ''}
    </button>`).join('') + `
    <button type="button" class="checkout-choice checkout-choice-new" data-checkout-payment="new"><i class="fa-solid fa-plus"></i><span><strong>Nueva tarjeta</strong><small>Capturar otra tarjeta</small></span></button>`;
  container.querySelectorAll('[data-checkout-payment]').forEach(option => {
    option.addEventListener('click', () => selectCheckoutPaymentMethod(option.dataset.checkoutPayment));
  });
  const preferred = checkoutData.paymentMethods.find(method => method.isDefault) || checkoutData.paymentMethods[0];
  selectCheckoutPaymentMethod(preferred.id);
}

function paymentBrandLabelForCheckout(brand) {
  return ({ visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', other: 'Tarjeta' })[brand] || 'Tarjeta';
}

function initPaymentOptions() {
  document.querySelectorAll('.payment-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.payment-option').forEach(item => item.classList.remove('selected'));
      option.classList.add('selected');
      option.querySelector('input').checked = true;
      toggleCardSection();
    });
  });
  const number = document.getElementById('card-number');
  number?.addEventListener('input', () => {
    const digits = number.value.replace(/\D/g, '').slice(0, 16);
    number.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  });
  const expiration = document.getElementById('card-exp');
  expiration?.addEventListener('input', () => {
    const digits = expiration.value.replace(/\D/g, '').slice(0, 4);
    expiration.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  });
}

function renderCheckoutSummary() {
  const container = document.getElementById('checkout-summary');
  if (!container) return;
  const cart = getCart();
  const { subtotal, shipping, total } = getCartTotals();
  container.innerHTML = `
    <h3>Tu compra</h3>
    ${cart.map(item => `<div class="summary-row"><span class="label-muted">${escapeHtml(item.nombre)} x${item.cantidad}</span><span>${formatCurrency(item.lineTotal)}</span></div>`).join('')}
    <div class="summary-row" style="margin-top:1rem"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
    <div class="summary-row"><span class="label-muted">Envío</span><span>${shipping === 0 ? 'Gratis' : formatCurrency(shipping)}</span></div>
    <div class="summary-row total"><span>Total</span><span>${formatCurrency(total)}</span></div>`;
}

async function confirmOrder() {
  if (!validateShippingForm() || !validatePaymentForm()) return;
  const button = document.getElementById('btn-confirm-order');
  button.disabled = true;
  const originalLabel = button.textContent;
  button.textContent = 'Registrando pedido...';
  try {
    const body = {
      shipping: checkoutData.shipping,
      paymentMethod: checkoutData.paymentMethod
    };
    if (checkoutData.cardLastFour) body.cardLastFour = checkoutData.cardLastFour;
    const data = await apiRequest('/orders', { method: 'POST', body });
    await saveNewCheckoutData();
    cartSnapshot = { items: [], subtotal: 0, shipping: 0, total: 0 };
    window.location.href = `confirmacion.html?order=${encodeURIComponent(data.order.id)}`;
  } catch (error) {
    showToast(error.message, 'error');
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

async function saveNewCheckoutData() {
  const tasks = [];
  if (checkoutData.selectedAddressId === 'new' && document.getElementById('save-new-address')?.checked) {
    tasks.push(apiRequest('/account/addresses', {
      method: 'POST',
      body: {
        ...checkoutData.shipping,
        label: document.getElementById('new-address-label').value.trim(),
        isDefault: checkoutData.addresses.length === 0
      }
    }));
  }
  if (checkoutData.paymentMethod === 'card' && checkoutData.selectedPaymentMethodId === 'new' &&
      document.getElementById('save-new-payment')?.checked && checkoutData.newCardData) {
    tasks.push(apiRequest('/account/payment-methods', {
      method: 'POST',
      body: {
        ...checkoutData.newCardData,
        label: document.getElementById('new-payment-label').value.trim(),
        isDefault: checkoutData.paymentMethods.length === 0
      }
    }));
  }
  if (!tasks.length) return;
  try {
    await Promise.all(tasks);
  } catch (error) {
    console.warn('El pedido se registró, pero no fue posible guardar todos los datos nuevos.', error);
  }
}

async function initCheckoutPage() {
  const session = requireAuth('checkout.html');
  if (!session) return;
  renderShopProgress(2);
  try {
    await loadCart();
    if (!getCart().length) {
      window.location.href = 'carrito.html';
      return;
    }
    renderCheckoutSummary();
  } catch (error) {
    showToast(error.message, 'error');
    return;
  }
  initPaymentOptions();
  toggleCardSection();
  document.getElementById('ship-name').value = session.fullName || '';
  try {
    const [addressData, paymentData] = await Promise.all([
      apiRequest('/account/addresses'),
      apiRequest('/account/payment-methods')
    ]);
    checkoutData.addresses = addressData.addresses;
    checkoutData.paymentMethods = paymentData.paymentMethods;
    renderCheckoutAddresses();
    renderCheckoutPaymentMethods();
  } catch (error) {
    console.warn('No fue posible cargar los datos guardados para checkout.', error);
    checkoutData.selectedAddressId = 'new';
    checkoutData.selectedPaymentMethodId = 'new';
  }
  document.getElementById('btn-confirm-order').addEventListener('click', confirmOrder);
}

async function initOrderConfirmation() {
  if (!requireAuth(`confirmacion.html?order=${encodeURIComponent(getQueryParam('order') || '')}`)) return;
  renderShopProgress(3);
  const container = document.getElementById('order-confirmation');
  const orderId = getQueryParam('order');
  if (!/^\d+$/.test(orderId || '')) {
    container.innerHTML = '<div class="empty-state"><h3>Pedido no encontrado</h3><a href="index.html" class="btn btn-primary">Ir al inicio</a></div>';
    return;
  }
  try {
    const { order } = await apiRequest(`/orders/${orderId}`);
    const paymentLabels = {
      card: 'Tarjeta de crédito/débito', bank_transfer: 'Transferencia bancaria',
      cash_on_delivery: 'Efectivo contra entrega'
    };
    const address = `${escapeHtml(order.shipping.street)} No. ${escapeHtml(order.shipping.exteriorNumber)}${order.shipping.interiorNumber ? ` Int. ${escapeHtml(order.shipping.interiorNumber)}` : ''}`;
    const payment = order.paymentMethod === 'card' && order.cardLastFour
      ? `${paymentLabels.card} terminación ${escapeHtml(order.cardLastFour)}`
      : paymentLabels[order.paymentMethod];
    container.innerHTML = `
      <div class="confirmation-icon">✓</div><h1>¡Pedido confirmado!</h1>
      <p>Gracias por tu compra, ${escapeHtml(order.shipping.recipientName)}. Tu pedido fue registrado.</p>
      <div class="order-number">${escapeHtml(order.orderNumber)}</div>
      <div class="confirmation-details"><h4 style="margin-bottom:1rem">Detalle del pedido</h4>
        ${order.items.map(item => `<div class="order-review-item"><span>${escapeHtml(item.name)} x${item.quantity}</span><span>${formatCurrency(item.lineTotal)}</span></div>`).join('')}
        <div class="summary-row" style="margin-top:1rem"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div>
        <div class="summary-row"><span>Envío</span><span>${order.shippingCost === 0 ? 'Gratis' : formatCurrency(order.shippingCost)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${formatCurrency(order.total)}</span></div>
        <div style="margin-top:1.25rem;font-size:.9rem;color:var(--color-text-muted)">
          <p><strong>Envío a:</strong> ${address}</p>
          <p>${escapeHtml(order.shipping.neighborhood)}, ${escapeHtml(order.shipping.municipality)}, ${escapeHtml(order.shipping.state)} CP ${escapeHtml(order.shipping.postalCode)}</p>
          <p><strong>Tel:</strong> ${escapeHtml(order.shipping.phone)}</p><p><strong>Pago:</strong> ${escapeHtml(payment)}</p>
        </div>
      </div><a href="index.html" class="btn btn-primary btn-lg">Seguir comprando</a>`;
    await updateCartBadge({ items: [], subtotal: 0, shipping: 0, total: 0 });
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><h3>No fue posible consultar el pedido</h3><p>${escapeHtml(error.message)}</p><a href="index.html" class="btn btn-primary">Ir al inicio</a></div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('checkout-form')) initCheckoutPage();
  if (document.getElementById('order-confirmation')) initOrderConfirmation();
});

const ACCOUNT_SECTIONS = {
  resumen: ['Resumen de mi cuenta', 'Consulta rápidamente tus compras y datos guardados.'],
  compras: ['Mis compras', 'Revisa el estado y detalle de tus pedidos.'],
  direcciones: ['Mis direcciones', 'Administra los domicilios que utilizas para tus envíos.'],
  facturacion: ['Métodos de pago', 'Administra las tarjetas disponibles para tus compras.'],
  perfil: ['Información de cuenta', 'Actualiza tu nombre y correo electrónico.']
};

let accountState = { user: null, orders: [], addresses: [], billingProfiles: [], paymentMethods: [] };

function currentAccountSection() {
  const section = getQueryParam('section') || 'resumen';
  return Object.hasOwn(ACCOUNT_SECTIONS, section) ? section : 'resumen';
}

function formatAccountDate(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(date);
}

function orderStatus(status) {
  return ({
    pending: ['Pendiente', 'warning'], confirmed: ['Confirmado', 'info'], paid: ['Pagado', 'success'],
    shipped: ['En camino', 'info'], completed: ['Entregado', 'success'], cancelled: ['Cancelado', 'danger']
  })[status] || [status, 'info'];
}

function renderOrderCard(order) {
  const [statusLabel, statusClass] = orderStatus(order.status);
  const productNames = order.items.slice(0, 2).map(item => escapeHtml(item.name)).join(', ');
  const extra = order.items.length > 2 ? ` y ${order.items.length - 2} más` : '';
  return `
    <article class="account-order-card">
      <div class="account-order-main">
        <div class="account-order-icon"><i class="fa-solid fa-box"></i></div>
        <div>
          <div class="account-order-heading"><strong>${escapeHtml(order.orderNumber)}</strong><span class="account-status ${statusClass}">${escapeHtml(statusLabel)}</span></div>
          <p>${productNames}${extra}</p>
          <small>${formatAccountDate(order.createdAt)} · ${order.items.reduce((total, item) => total + item.quantity, 0)} artículo(s)</small>
        </div>
      </div>
      <div class="account-order-total"><strong>${formatCurrency(order.total)}</strong><a href="confirmacion.html?order=${order.id}">Ver detalle</a></div>
    </article>`;
}

async function loadAccountData(keys) {
  const tasks = [];
  if (keys.includes('user')) tasks.push(apiRequest('/account').then(data => { accountState.user = data.user; }));
  if (keys.includes('orders')) tasks.push(apiRequest('/orders').then(data => { accountState.orders = data.orders; }));
  if (keys.includes('addresses')) tasks.push(apiRequest('/account/addresses').then(data => { accountState.addresses = data.addresses; }));
  if (keys.includes('billing')) tasks.push(apiRequest('/account/billing').then(data => { accountState.billingProfiles = data.billingProfiles; }));
  if (keys.includes('payments')) tasks.push(apiRequest('/account/payment-methods').then(data => { accountState.paymentMethods = data.paymentMethods; }));
  await Promise.all(tasks);
}

async function renderSummary() {
  await loadAccountData(['user', 'orders', 'addresses', 'payments']);
  const pending = accountState.orders.filter(order => !['completed', 'cancelled'].includes(order.status)).length;
  const recent = accountState.orders.slice(0, 3);
  return `
    <div class="account-welcome"><div><span>Hola,</span><h2>${escapeHtml(accountState.user.fullName)}</h2><p>Desde aquí puedes administrar toda la información relacionada con tus compras.</p></div><i class="fa-solid fa-bag-shopping"></i></div>
    <div class="account-metrics">
      <a href="cuenta.html?section=compras" class="account-metric"><i class="fa-solid fa-receipt"></i><div><strong>${accountState.orders.length}</strong><span>Compras realizadas</span></div></a>
      <a href="cuenta.html?section=compras" class="account-metric"><i class="fa-solid fa-truck-fast"></i><div><strong>${pending}</strong><span>Pedidos activos</span></div></a>
      <a href="cuenta.html?section=direcciones" class="account-metric"><i class="fa-solid fa-location-dot"></i><div><strong>${accountState.addresses.length}</strong><span>Direcciones guardadas</span></div></a>
      <a href="cuenta.html?section=facturacion" class="account-metric"><i class="fa-solid fa-credit-card"></i><div><strong>${accountState.paymentMethods.length}</strong><span>Métodos de pago</span></div></a>
    </div>
    <div class="account-section-heading"><div><h2>Compras recientes</h2><p>Tus últimos pedidos en NUBO.</p></div><a href="cuenta.html?section=compras" class="btn btn-outline btn-sm">Ver todas</a></div>
    <div class="account-order-list">${recent.length ? recent.map(renderOrderCard).join('') : '<div class="account-empty"><i class="fa-solid fa-basket-shopping"></i><h3>Aún no tienes compras</h3><p>Cuando realices un pedido aparecerá aquí.</p><a href="index.html" class="btn btn-primary">Explorar catálogo</a></div>'}</div>`;
}

async function renderPurchases() {
  await loadAccountData(['orders']);
  return `<div class="account-section-heading"><div><h2>Historial de compras</h2><p>${accountState.orders.length} pedido(s) registrado(s).</p></div><a href="index.html" class="btn btn-primary btn-sm">Seguir comprando</a></div>
    <div class="account-order-list">${accountState.orders.length ? accountState.orders.map(renderOrderCard).join('') : '<div class="account-empty"><i class="fa-solid fa-basket-shopping"></i><h3>Aún no tienes compras</h3><p>Explora el catálogo y encuentra las refacciones que necesitas.</p><a href="index.html" class="btn btn-primary">Ver productos</a></div>'}</div>`;
}

function renderAddressCard(address) {
  return `<article class="account-data-card">
    <div class="account-data-card-header"><div><i class="fa-solid fa-location-dot"></i><strong>${escapeHtml(address.label)}</strong>${address.isDefault ? '<span class="default-badge">Principal</span>' : ''}</div><div class="account-card-actions"><button data-edit-address="${address.id}" title="Editar"><i class="fa-solid fa-pen"></i></button><button data-delete-address="${address.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button></div></div>
    <p><strong>${escapeHtml(address.recipientName)}</strong></p>
    <p>${escapeHtml(address.street)} No. ${escapeHtml(address.exteriorNumber)}${address.interiorNumber ? `, Int. ${escapeHtml(address.interiorNumber)}` : ''}</p>
    <p>${escapeHtml(address.neighborhood)}, ${escapeHtml(address.municipality)}, ${escapeHtml(address.state)} CP ${escapeHtml(address.postalCode)}</p>
    <p class="account-data-muted"><i class="fa-solid fa-phone"></i> ${escapeHtml(address.phone)}</p>
    ${!address.isDefault ? `<button class="account-inline-action" data-default-address="${address.id}">Usar como principal</button>` : ''}
  </article>`;
}

function addressForm(address = {}) {
  return `<form id="address-form" class="account-editor hidden" data-record-id="${address.id || ''}">
    <div class="account-editor-heading"><div><h3>${address.id ? 'Editar dirección' : 'Agregar dirección'}</h3><p>Los campos marcados son obligatorios.</p></div><button type="button" class="account-editor-close" data-close-editor><i class="fa-solid fa-xmark"></i></button></div>
    <div class="account-form-grid">
      <div class="form-group"><label>Nombre de la dirección</label><input name="label" maxlength="50" placeholder="Casa, Oficina..." value="${escapeHtml(address.label || '')}" required></div>
      <div class="form-group"><label>Nombre de quien recibe</label><input name="recipientName" minlength="3" maxlength="100" value="${escapeHtml(address.recipientName || getSession()?.fullName || '')}" required></div>
      <div class="form-group"><label>Teléfono</label><input name="phone" inputmode="tel" maxlength="20" value="${escapeHtml(address.phone || '')}" required></div>
      <div class="form-group"><label>Calle</label><input name="street" maxlength="150" value="${escapeHtml(address.street || '')}" required></div>
      <div class="form-group"><label>Número exterior</label><input name="exteriorNumber" maxlength="20" value="${escapeHtml(address.exteriorNumber || '')}" required></div>
      <div class="form-group"><label>Número interior <span class="label-hint">(opcional)</span></label><input name="interiorNumber" maxlength="20" value="${escapeHtml(address.interiorNumber || '')}"></div>
      <div class="form-group"><label>Colonia</label><input name="neighborhood" maxlength="120" value="${escapeHtml(address.neighborhood || '')}" required></div>
      <div class="form-group"><label>Municipio / ciudad</label><input name="municipality" maxlength="120" value="${escapeHtml(address.municipality || '')}" required></div>
      <div class="form-group"><label>Estado</label><input name="state" maxlength="100" value="${escapeHtml(address.state || '')}" required></div>
      <div class="form-group"><label>Código postal</label><input name="postalCode" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" value="${escapeHtml(address.postalCode || '')}" required></div>
    </div>
    <label class="account-check"><input type="checkbox" name="isDefault" ${address.isDefault ? 'checked' : ''}> Usar como dirección principal</label>
    <div class="account-editor-actions"><button type="button" class="btn btn-outline" data-close-editor>Cancelar</button><button type="submit" class="btn btn-primary">Guardar dirección</button></div>
  </form>`;
}

async function renderAddresses() {
  await loadAccountData(['addresses']);
  return `<div class="account-section-heading"><div><h2>Direcciones guardadas</h2><p>Selecciona rápidamente dónde recibir tus pedidos.</p></div><button class="btn btn-primary btn-sm" id="add-address"><i class="fa-solid fa-plus"></i> Agregar</button></div>
    <div class="account-data-grid" id="address-list">${accountState.addresses.length ? accountState.addresses.map(renderAddressCard).join('') : '<div class="account-empty compact"><i class="fa-solid fa-map-location-dot"></i><h3>No tienes direcciones guardadas</h3><p>Agrega una para agilizar tus próximas compras.</p></div>'}</div>
    <div id="address-editor">${addressForm()}</div>`;
}

function renderBillingCard(profile) {
  return `<article class="account-data-card">
    <div class="account-data-card-header"><div><i class="fa-solid fa-file-invoice-dollar"></i><strong>${escapeHtml(profile.label)}</strong>${profile.isDefault ? '<span class="default-badge">Principal</span>' : ''}</div><div class="account-card-actions"><button data-edit-billing="${profile.id}" title="Editar"><i class="fa-solid fa-pen"></i></button><button data-delete-billing="${profile.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button></div></div>
    <p><strong>${escapeHtml(profile.legalName)}</strong></p><p>RFC: ${escapeHtml(profile.rfc)}</p><p>${escapeHtml(profile.taxRegime)}</p><p>Uso CFDI: ${escapeHtml(profile.cfdiUse)}</p><p>CP ${escapeHtml(profile.postalCode)}</p><p class="account-data-muted">${escapeHtml(profile.email)}</p>
    ${!profile.isDefault ? `<button class="account-inline-action" data-default-billing="${profile.id}">Usar como principal</button>` : ''}
  </article>`;
}

function billingForm(profile = {}) {
  return `<form id="billing-form" class="account-editor hidden" data-record-id="${profile.id || ''}">
    <div class="account-editor-heading"><div><h3>${profile.id ? 'Editar datos fiscales' : 'Agregar datos fiscales'}</h3><p>Captura la información tal como aparece en tu constancia fiscal.</p></div><button type="button" class="account-editor-close" data-close-editor><i class="fa-solid fa-xmark"></i></button></div>
    <div class="account-form-grid">
      <div class="form-group"><label>Nombre del perfil</label><input name="label" maxlength="50" placeholder="Personal, Empresa..." value="${escapeHtml(profile.label || '')}" required></div>
      <div class="form-group"><label>Razón social</label><input name="legalName" maxlength="180" value="${escapeHtml(profile.legalName || '')}" required></div>
      <div class="form-group"><label>RFC</label><input name="rfc" minlength="12" maxlength="13" value="${escapeHtml(profile.rfc || '')}" required></div>
      <div class="form-group"><label>Régimen fiscal</label><input name="taxRegime" maxlength="120" value="${escapeHtml(profile.taxRegime || '')}" required></div>
      <div class="form-group"><label>Uso de CFDI</label><input name="cfdiUse" maxlength="100" placeholder="G03 - Gastos en general" value="${escapeHtml(profile.cfdiUse || '')}" required></div>
      <div class="form-group"><label>Código postal fiscal</label><input name="postalCode" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" value="${escapeHtml(profile.postalCode || '')}" required></div>
      <div class="form-group account-form-wide"><label>Correo de facturación</label><input type="email" name="email" maxlength="254" value="${escapeHtml(profile.email || getSession()?.email || '')}" required></div>
    </div>
    <label class="account-check"><input type="checkbox" name="isDefault" ${profile.isDefault ? 'checked' : ''}> Usar como perfil fiscal principal</label>
    <div class="account-editor-actions"><button type="button" class="btn btn-outline" data-close-editor>Cancelar</button><button type="submit" class="btn btn-primary">Guardar datos</button></div>
  </form>`;
}

async function renderBilling() {
  await loadAccountData(['billing']);
  return `<div class="account-section-heading"><div><h2>Perfiles fiscales</h2><p>Estos datos se utilizarán cuando solicites factura.</p></div><button class="btn btn-primary btn-sm" id="add-billing"><i class="fa-solid fa-plus"></i> Agregar</button></div>
    <div class="account-data-grid" id="billing-list">${accountState.billingProfiles.length ? accountState.billingProfiles.map(renderBillingCard).join('') : '<div class="account-empty compact"><i class="fa-solid fa-file-circle-plus"></i><h3>No tienes datos fiscales</h3><p>Agrega un perfil para solicitar facturas.</p></div>'}</div>
    <div id="billing-editor">${billingForm()}</div>`;
}

function paymentBrandLabel(brand) {
  return ({ visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', other: 'Tarjeta' })[brand] || 'Tarjeta';
}

function detectPaymentBrand(cardNumber) {
  if (/^4/.test(cardNumber)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(cardNumber)) return 'mastercard';
  if (/^3[47]/.test(cardNumber)) return 'amex';
  return 'other';
}

function renderPaymentMethodCard(method) {
  return `<article class="account-data-card payment-method-card">
    <div class="account-data-card-header"><div><i class="fa-regular fa-credit-card"></i><strong>${escapeHtml(method.label)}</strong>${method.isDefault ? '<span class="default-badge">Principal</span>' : ''}</div><div class="account-card-actions"><button data-edit-payment="${method.id}" title="Editar"><i class="fa-solid fa-pen"></i></button><button data-delete-payment="${method.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button></div></div>
    <div class="payment-card-brand">${escapeHtml(paymentBrandLabel(method.brand))}</div>
    <div class="payment-card-number">•••• •••• •••• ${escapeHtml(method.lastFour)}</div>
    <div class="payment-card-meta"><span>${escapeHtml(method.cardholderName)}</span><span>Vence ${String(method.expiryMonth).padStart(2, '0')}/${String(method.expiryYear).slice(-2)}</span></div>
    ${!method.isDefault ? `<button class="account-inline-action" data-default-payment="${method.id}">Usar como principal</button>` : ''}
  </article>`;
}

function paymentMethodForm(method = {}) {
  const expiration = method.id ? `${String(method.expiryMonth).padStart(2, '0')}/${String(method.expiryYear).slice(-2)}` : '';
  const cardField = method.id
    ? `<div class="form-group"><label>Tarjeta</label><input value="${escapeHtml(paymentBrandLabel(method.brand))} •••• ${escapeHtml(method.lastFour)}" disabled></div>`
    : '<div class="form-group"><label>Número de tarjeta</label><input name="cardNumber" inputmode="numeric" autocomplete="cc-number" maxlength="19" placeholder="0000 0000 0000 0000" required></div>';
  return `<form id="payment-method-form" class="account-editor hidden" data-record-id="${method.id || ''}" data-brand="${method.brand || ''}" data-last-four="${method.lastFour || ''}">
    <div class="account-editor-heading"><div><h3>${method.id ? 'Editar método de pago' : 'Agregar método de pago'}</h3><p>Por seguridad sólo se guardan la marca y los últimos cuatro dígitos.</p></div><button type="button" class="account-editor-close" data-close-editor><i class="fa-solid fa-xmark"></i></button></div>
    <div class="account-form-grid">
      <div class="form-group"><label>Nombre del método</label><input name="label" maxlength="50" placeholder="Tarjeta personal..." value="${escapeHtml(method.label || '')}" required></div>
      <div class="form-group"><label>Nombre del titular</label><input name="cardholderName" maxlength="100" autocomplete="cc-name" value="${escapeHtml(method.cardholderName || getSession()?.fullName || '')}" required></div>
      ${cardField}
      <div class="form-group"><label>Vencimiento</label><input name="expiration" inputmode="numeric" autocomplete="cc-exp" maxlength="5" placeholder="MM/AA" value="${expiration}" required></div>
    </div>
    <label class="account-check"><input type="checkbox" name="isDefault" ${method.isDefault ? 'checked' : ''}> Usar como método de pago principal</label>
    <div class="account-editor-actions"><button type="button" class="btn btn-outline" data-close-editor>Cancelar</button><button type="submit" class="btn btn-primary">Guardar método</button></div>
  </form>`;
}

async function renderPaymentMethods() {
  await loadAccountData(['payments']);
  return `<div class="account-section-heading"><div><h2>Tarjetas guardadas</h2><p>El número completo y el CVV nunca se almacenan.</p></div><button class="btn btn-primary btn-sm" id="add-payment-method"><i class="fa-solid fa-plus"></i> Agregar</button></div>
    <div class="account-data-grid" id="payment-method-list">${accountState.paymentMethods.length ? accountState.paymentMethods.map(renderPaymentMethodCard).join('') : '<div class="account-empty compact"><i class="fa-solid fa-credit-card"></i><h3>No tienes métodos de pago</h3><p>Agrega una tarjeta para seleccionarla rápidamente al comprar.</p></div>'}</div>
    <div id="payment-method-editor">${paymentMethodForm()}</div>`;
}

async function renderProfile() {
  await loadAccountData(['user']);
  return `<div class="account-section-heading"><div><h2>Datos personales</h2><p>Esta información identifica tu cuenta en NUBO.</p></div></div>
    <div class="account-profile-layout"><div class="account-profile-avatar">${escapeHtml(accountState.user.fullName.charAt(0).toUpperCase())}</div>
      <form id="profile-form" class="account-profile-form">
        <div class="form-group"><label>Nombre completo</label><input name="fullName" minlength="3" maxlength="100" value="${escapeHtml(accountState.user.fullName)}" required></div>
        <div class="form-group"><label>Correo electrónico</label><input type="email" name="email" maxlength="254" value="${escapeHtml(accountState.user.email)}" required></div>
        <div class="account-profile-meta"><span><i class="fa-solid fa-user-tag"></i> Tipo de cuenta: ${accountState.user.role === 'admin' ? 'Administrador' : 'Cliente'}</span><span><i class="fa-regular fa-calendar"></i> Miembro desde ${formatAccountDate(accountState.user.createdAt)}</span></div>
        <button type="submit" class="btn btn-primary">Guardar cambios</button>
      </form>
    </div>`;
}

function formPayload(form) {
  const values = Object.fromEntries(new FormData(form));
  values.isDefault = form.elements.isDefault?.checked || false;
  return values;
}

function setAccountSubmitting(form, submitting) {
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;
  if (submitting) button.dataset.originalLabel = button.innerHTML;
  button.disabled = submitting;
  button.innerHTML = submitting ? '<i class="fa-solid fa-circle-notch fa-spin"></i> Guardando...' : button.dataset.originalLabel;
}

async function refreshAccountSection() {
  await loadAccountSection(currentAccountSection());
}

function bindAddressEvents() {
  const showEditor = address => {
    document.getElementById('address-editor').innerHTML = addressForm(address);
    const form = document.getElementById('address-form');
    form.classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    bindAddressForm(form);
  };
  document.getElementById('add-address')?.addEventListener('click', () => showEditor({}));
  document.querySelectorAll('[data-edit-address]').forEach(button => button.addEventListener('click', () => showEditor(accountState.addresses.find(item => item.id === Number(button.dataset.editAddress)))));
  document.querySelectorAll('[data-delete-address]').forEach(button => button.addEventListener('click', async () => {
    if (!confirm('¿Eliminar esta dirección?')) return;
    await apiRequest(`/account/addresses/${button.dataset.deleteAddress}`, { method: 'DELETE' });
    showToast('Dirección eliminada', 'success');
    await refreshAccountSection();
  }));
  document.querySelectorAll('[data-default-address]').forEach(button => button.addEventListener('click', async () => {
    const address = accountState.addresses.find(item => item.id === Number(button.dataset.defaultAddress));
    await apiRequest(`/account/addresses/${address.id}`, { method: 'PUT', body: { ...address, isDefault: true } });
    await refreshAccountSection();
  }));
}

function bindAddressForm(form) {
  form.querySelectorAll('[data-close-editor]').forEach(button => button.addEventListener('click', () => form.classList.add('hidden')));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    setAccountSubmitting(form, true);
    try {
      const id = form.dataset.recordId;
      await apiRequest(id ? `/account/addresses/${id}` : '/account/addresses', { method: id ? 'PUT' : 'POST', body: formPayload(form) });
      showToast('Dirección guardada', 'success');
      await refreshAccountSection();
    } catch (error) {
      showToast(error.message, 'error');
      setAccountSubmitting(form, false);
    }
  });
}

function bindBillingEvents() {
  const showEditor = profile => {
    document.getElementById('billing-editor').innerHTML = billingForm(profile);
    const form = document.getElementById('billing-form');
    form.classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    bindBillingForm(form);
  };
  document.getElementById('add-billing')?.addEventListener('click', () => showEditor({}));
  document.querySelectorAll('[data-edit-billing]').forEach(button => button.addEventListener('click', () => showEditor(accountState.billingProfiles.find(item => item.id === Number(button.dataset.editBilling)))));
  document.querySelectorAll('[data-delete-billing]').forEach(button => button.addEventListener('click', async () => {
    if (!confirm('¿Eliminar estos datos fiscales?')) return;
    await apiRequest(`/account/billing/${button.dataset.deleteBilling}`, { method: 'DELETE' });
    showToast('Datos fiscales eliminados', 'success');
    await refreshAccountSection();
  }));
  document.querySelectorAll('[data-default-billing]').forEach(button => button.addEventListener('click', async () => {
    const profile = accountState.billingProfiles.find(item => item.id === Number(button.dataset.defaultBilling));
    await apiRequest(`/account/billing/${profile.id}`, { method: 'PUT', body: { ...profile, isDefault: true } });
    await refreshAccountSection();
  }));
}

function bindBillingForm(form) {
  form.querySelectorAll('[data-close-editor]').forEach(button => button.addEventListener('click', () => form.classList.add('hidden')));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    setAccountSubmitting(form, true);
    try {
      const id = form.dataset.recordId;
      await apiRequest(id ? `/account/billing/${id}` : '/account/billing', { method: id ? 'PUT' : 'POST', body: formPayload(form) });
      showToast('Datos fiscales guardados', 'success');
      await refreshAccountSection();
    } catch (error) {
      showToast(error.message, 'error');
      setAccountSubmitting(form, false);
    }
  });
}

function bindPaymentMethodEvents() {
  const showEditor = method => {
    document.getElementById('payment-method-editor').innerHTML = paymentMethodForm(method);
    const form = document.getElementById('payment-method-form');
    form.classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    bindPaymentMethodForm(form);
  };
  document.getElementById('add-payment-method')?.addEventListener('click', () => showEditor({}));
  document.querySelectorAll('[data-edit-payment]').forEach(button => button.addEventListener('click', () => {
    showEditor(accountState.paymentMethods.find(item => item.id === Number(button.dataset.editPayment)));
  }));
  document.querySelectorAll('[data-delete-payment]').forEach(button => button.addEventListener('click', async () => {
    if (!confirm('¿Eliminar este método de pago?')) return;
    try {
      await apiRequest(`/account/payment-methods/${button.dataset.deletePayment}`, { method: 'DELETE' });
      showToast('Método de pago eliminado', 'success');
      await refreshAccountSection();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }));
  document.querySelectorAll('[data-default-payment]').forEach(button => button.addEventListener('click', async () => {
    const method = accountState.paymentMethods.find(item => item.id === Number(button.dataset.defaultPayment));
    try {
      await apiRequest(`/account/payment-methods/${method.id}`, { method: 'PUT', body: { ...method, isDefault: true } });
      await refreshAccountSection();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }));
}

function bindPaymentMethodForm(form) {
  form.querySelectorAll('[data-close-editor]').forEach(button => button.addEventListener('click', () => form.classList.add('hidden')));
  const cardNumberInput = form.elements.cardNumber;
  cardNumberInput?.addEventListener('input', () => {
    const digits = cardNumberInput.value.replace(/\D/g, '').slice(0, 16);
    cardNumberInput.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  });
  form.elements.expiration?.addEventListener('input', event => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
    event.target.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const expirationMatch = String(values.expiration || '').match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    if (!expirationMatch) {
      showToast('Ingresa un vencimiento válido en formato MM/AA', 'error');
      return;
    }
    const cardNumber = String(values.cardNumber || '').replace(/\D/g, '');
    if (!form.dataset.recordId && !/^\d{15,16}$/.test(cardNumber)) {
      showToast('Ingresa un número de tarjeta válido', 'error');
      return;
    }
    const body = {
      label: values.label,
      cardholderName: values.cardholderName,
      brand: form.dataset.recordId ? form.dataset.brand : detectPaymentBrand(cardNumber),
      lastFour: form.dataset.recordId ? form.dataset.lastFour : cardNumber.slice(-4),
      expiryMonth: Number(expirationMatch[1]),
      expiryYear: 2000 + Number(expirationMatch[2]),
      isDefault: form.elements.isDefault.checked
    };
    setAccountSubmitting(form, true);
    try {
      const id = form.dataset.recordId;
      await apiRequest(id ? `/account/payment-methods/${id}` : '/account/payment-methods', { method: id ? 'PUT' : 'POST', body });
      showToast('Método de pago guardado', 'success');
      await refreshAccountSection();
    } catch (error) {
      showToast(error.message, 'error');
      setAccountSubmitting(form, false);
    }
  });
}

function bindProfileEvents() {
  document.getElementById('profile-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    if (!isValidFullName(body.fullName) || !isValidEmail(body.email)) {
      showToast('Revisa el nombre y correo electrónico', 'error');
      return;
    }
    setAccountSubmitting(form, true);
    try {
      const data = await apiRequest('/account', { method: 'PATCH', body });
      accountState.user = data.user;
      saveApiSession({ user: data.user });
      showToast('Información actualizada', 'success');
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      showToast(error.message, 'error');
      setAccountSubmitting(form, false);
    }
  });
}

async function loadAccountSection(section) {
  const content = document.getElementById('account-content');
  const [title, subtitle] = ACCOUNT_SECTIONS[section];
  document.getElementById('account-page-title').textContent = title;
  document.getElementById('account-page-subtitle').textContent = subtitle;
  document.querySelectorAll('[data-account-section]').forEach(link => link.classList.toggle('active', link.dataset.accountSection === section));
  content.innerHTML = '<div class="account-loading"><i class="fa-solid fa-circle-notch fa-spin"></i><span>Cargando tu información...</span></div>';
  try {
    const renderers = { resumen: renderSummary, compras: renderPurchases, direcciones: renderAddresses, facturacion: renderPaymentMethods, perfil: renderProfile };
    content.innerHTML = await renderers[section]();
    if (section === 'direcciones') bindAddressEvents();
    if (section === 'facturacion') bindPaymentMethodEvents();
    if (section === 'perfil') bindProfileEvents();
  } catch (error) {
    content.innerHTML = `<div class="account-empty"><i class="fa-solid fa-triangle-exclamation"></i><h3>No fue posible cargar esta sección</h3><p>${escapeHtml(error.message)}</p><button class="btn btn-primary" id="retry-account">Reintentar</button></div>`;
    document.getElementById('retry-account')?.addEventListener('click', () => loadAccountSection(section));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('account-content')) return;
  if (!requireAuth(`cuenta.html${window.location.search}`)) return;
  loadAccountSection(currentAccountSection());
});

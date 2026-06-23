import { chromium } from 'playwright';

const FRONTEND_URL = process.env.FRONTEND_TEST_URL || 'http://127.0.0.1:8899/index.html';
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const product = {
  id: 1,
  sku: 'NUBO-0001',
  name: 'Pastillas de freno delanteras',
  brand: 'Bosch',
  description: 'Pastillas cerámicas de alto rendimiento.',
  price: 459,
  stock: 25,
  imageUrl: 'assets/images/products/01-pastillas.jpg',
  category: { id: 1, name: 'Frenos', slug: 'frenos' },
  compatibilities: ['Nissan Sentra']
};

const cart = {
  items: [{
    productId: 1, name: product.name, brand: product.brand, price: 459,
    stock: 25, imageUrl: product.imageUrl, quantity: 1, lineTotal: 459
  }],
  subtotal: 459,
  shipping: 99,
  total: 558
};

const order = {
  id: 101,
  orderNumber: 'NUB-20260622-ABC12345',
  userId: 5,
  status: 'confirmed',
  paymentMethod: 'bank_transfer',
  paymentStatus: 'approved',
  cardLastFour: null,
  shipping: {
    recipientName: 'Cliente Prueba', phone: '5512345678', street: 'Reforma',
    exteriorNumber: '100', interiorNumber: null, neighborhood: 'Centro',
    municipality: 'Cuauhtémoc', state: 'CDMX', postalCode: '06000'
  },
  subtotal: 459,
  shippingCost: 99,
  total: 558,
  createdAt: '2026-06-22 12:00:00',
  items: [{ productId: 1, name: product.name, brand: product.brand, unitPrice: 459, quantity: 1, lineTotal: 459 }]
};

const savedAddress = {
  id: 8, label: 'Casa', recipientName: 'Cliente Prueba', phone: '5512345678', street: 'Reforma',
  exteriorNumber: '100', interiorNumber: null, neighborhood: 'Centro', municipality: 'Cuauhtémoc',
  state: 'CDMX', postalCode: '06000', isDefault: true
};

const accountUser = {
  id: 5, fullName: 'Cliente Prueba', email: 'cliente@example.com', role: 'customer', createdAt: '2026-01-15 10:00:00'
};

const savedPaymentMethod = {
  id: 12, label: 'Personal', cardholderName: 'Cliente Prueba', brand: 'visa', lastFour: '4242',
  expiryMonth: 12, expiryYear: 2030, isDefault: true
};

const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const page = await browser.newPage();

function json(route, data, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': new URL(FRONTEND_URL).origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
    },
    body: JSON.stringify({ success: status < 400, ...(status < 400 ? { data } : { error: data }) })
  });
}

await page.route('https://morfosdigital.com/Nuboback/**', async route => {
  const request = route.request();
  const path = new URL(request.url()).pathname.replace('/Nuboback', '');
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
  if (path === '/categories') return json(route, { categories: [{ id: 1, name: 'Frenos', slug: 'frenos' }] });
  if (path === '/products') return json(route, { products: [product], pagination: { page: 1, limit: 100, total: 1, pages: 1 } });
  if (path === '/auth/forgot-password') return json(route, { message: 'Si el correo está registrado, recibirás un código de recuperación' });
  if (path === '/auth/reset-password') return json(route, { message: 'La contraseña se actualizó correctamente' });
  if (path === '/auth/login') return json(route, {
    user: { id: 5, fullName: 'Cliente Prueba', email: 'cliente@example.com', role: 'customer' },
    accessToken: 'access-token', refreshToken: 'refresh-token', tokenType: 'Bearer', expiresIn: 900
  });
  if (path === '/auth/logout') return json(route, { message: 'Sesión cerrada correctamente' });
  if (path === '/account' && request.method() === 'GET') return json(route, { user: accountUser });
  if (path === '/account' && request.method() === 'PATCH') return json(route, { user: accountUser });
  if (path === '/account/addresses' && request.method() === 'GET') return json(route, { addresses: [savedAddress] });
  if (path === '/account/addresses' && request.method() === 'POST') return json(route, { address: savedAddress }, 201);
  if (path === '/account/billing' && request.method() === 'GET') return json(route, { billingProfiles: [] });
  if (path === '/account/payment-methods' && request.method() === 'GET') return json(route, { paymentMethods: [savedPaymentMethod] });
  if (path === '/account/payment-methods' && request.method() === 'POST') return json(route, { paymentMethod: savedPaymentMethod }, 201);
  if (path === '/account/payment-methods/12' && request.method() === 'PUT') return json(route, { paymentMethod: savedPaymentMethod });
  if (path === '/account/payment-methods/12' && request.method() === 'DELETE') return json(route, { message: 'Método eliminado' });
  if (path === '/cart' && request.method() === 'GET') return json(route, { cart });
  if (path === '/orders' && request.method() === 'GET') return json(route, { orders: [order] });
  if (path === '/cart/items' && request.method() === 'POST') return json(route, { cart });
  if (path === '/orders' && request.method() === 'POST') {
    const payload = request.postDataJSON();
    if (payload.paymentMethod !== 'bank_transfer' || payload.shipping.postalCode !== '06000') {
      throw new Error('El checkout no envió el contrato esperado');
    }
    return json(route, { order });
  }
  if (path === '/orders/101') return json(route, { order });
  return json(route, { message: `Mock no configurado: ${request.method()} ${path}` }, 404);
});

try {
  await page.goto(FRONTEND_URL.replace('index.html', 'login.html'));
  await page.click('.auth-tab[data-tab="register"]');
  await page.fill('#reg-name', 'A');
  if (await page.$eval('#reg-name', input => input.checkValidity())) throw new Error('El nombre de una letra fue aceptado');
  await page.fill('#reg-name', 'Ana Pérez');
  await page.fill('#reg-email', 'ana@dominio');
  if (await page.$eval('#reg-email', input => input.checkValidity())) throw new Error('El correo sin extensión fue aceptado');
  await page.fill('#reg-pass', 'Clave1234');
  await page.click('[data-password-toggle="reg-pass"]');
  if (await page.getAttribute('#reg-pass', 'type') !== 'text') throw new Error('No se mostró la contraseña');
  await page.click('[data-password-toggle="reg-pass"]');
  await page.click('.auth-tab[data-tab="login"]');
  await page.click('#show-recovery');
  await page.fill('#recovery-email', 'cliente@example.com');
  await page.click('#forgot-form button[type="submit"]');
  await page.waitForSelector('#reset-form:not(.hidden)');
  await page.fill('#recovery-code', '123456');
  await page.fill('#recovery-password', 'NuevaClave123');
  await page.fill('#recovery-confirm', 'NuevaClave123');
  await page.click('#reset-form button[type="submit"]');
  await page.waitForSelector('#panel-login.active');

  await page.fill('#login-email', 'cliente@example.com');
  await page.fill('#login-pass', 'Clave1234');
  await page.click('#login-form button[type="submit"]');
  await page.waitForURL('**/index.html');
  await page.waitForSelector('.product-card');
  await page.click('.btn-add-cart');
  await page.waitForSelector('.toast.success');

  await page.click('#open-account-menu');
  await page.waitForSelector('#user-sidebar.open');
  await page.click('#user-sidebar a[href="cuenta.html"]');
  await page.waitForURL('**/cuenta.html');
  await page.waitForSelector('.account-welcome');
  if (!(await page.textContent('.account-welcome')).includes('Cliente Prueba')) throw new Error('El dashboard no mostró al usuario');
  await page.goto(FRONTEND_URL.replace('index.html', 'cuenta.html?section=facturacion'));
  await page.waitForSelector('.payment-method-card');
  await page.click('[data-edit-payment="12"]');
  await page.waitForSelector('#payment-method-form:not(.hidden)');
  if (process.env.ACCOUNT_SCREENSHOT) {
    await page.screenshot({ path: process.env.ACCOUNT_SCREENSHOT, fullPage: true });
  }

  await page.goto(FRONTEND_URL.replace('index.html', 'carrito.html'));
  await page.waitForSelector('.cart-item');
  await page.click('#btn-checkout');
  await page.waitForURL('**/checkout.html');
  await page.waitForSelector('[data-checkout-address="8"].selected');
  await page.waitForSelector('[data-checkout-payment="12"].selected');
  if (process.env.CHECKOUT_SCREENSHOT) {
    await page.screenshot({ path: process.env.CHECKOUT_SCREENSHOT, fullPage: true });
  }
  await page.click('input[value="transferencia"]');
  await page.click('#btn-confirm-order');
  await page.waitForURL('**/confirmacion.html?order=101');
  await page.waitForSelector('.order-number');
  if ((await page.textContent('.order-number')) !== order.orderNumber) throw new Error('Confirmación incorrecta');
  console.log('Flujo frontend → API simulado: OK');
} finally {
  await browser.close();
}

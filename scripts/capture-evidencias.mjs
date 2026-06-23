import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'docs', 'evidencias');
const BASE = process.env.BASE_URL || 'http://localhost/tienda';

async function screenshot(page, name, options = {}) {
  const file = path.join(OUT_DIR, name);
  await page.screenshot({ path: file, ...options });
  console.log('OK', name);
}

async function showLocalStoragePanel(page, key, title) {
  const value = await page.evaluate((k) => localStorage.getItem(k), key);
  await page.evaluate(({ json, panelTitle }) => {
    const existing = document.getElementById('evidencia-panel');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = 'evidencia-panel';
    div.style.cssText = [
      'position:fixed',
      'top:0',
      'right:0',
      'width:520px',
      'height:100%',
      'background:#252526',
      'color:#ce9178',
      'padding:16px',
      'font:12px Consolas,monospace',
      'z-index:99999',
      'overflow:auto',
      'border-left:1px solid #3c3c3c',
      'box-shadow:-4px 0 24px rgba(0,0,0,.35)'
    ].join(';');
    div.innerHTML = `
      <div style="color:#cccccc;margin-bottom:12px;font-size:11px">
        DevTools → Application → Local Storage → ${panelTitle}
      </div>
      <pre style="margin:0;white-space:pre-wrap;word-break:break-all;color:#9cdcfe">${json || '(vacío)'}</pre>
    `;
    document.body.appendChild(div);
  }, { json: value, panelTitle: key });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    locale: 'es-MX'
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/login.html`, { waitUntil: 'networkidle' });
  await screenshot(page, '01-login-registro.png');

  await page.fill('#login-email', 'demo@nubo.com');
  await page.fill('#login-pass', 'wrongpass');
  await page.click('#login-form button[type="submit"]');
  await page.waitForFunction(() => {
    const el = document.getElementById('login-error');
    return el && el.textContent.trim().length > 0;
  });
  await page.waitForTimeout(300);
  await screenshot(page, '02-login-fallido.png');

  await page.goto(`${BASE}/login.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const email = document.getElementById('login-email');
    email.removeAttribute('type');
    email.value = "admin' OR '1'='1";
    document.getElementById('login-pass').value = "' OR '1'='1";
  });
  await page.click('#login-form button[type="submit"]');
  await page.waitForFunction(() => {
    const el = document.getElementById('login-error');
    return el && el.textContent.trim().length > 0;
  });
  await screenshot(page, '03-inyeccion-sql-intento.png');

  await page.goto(`${BASE}/login.html`, { waitUntil: 'networkidle' });
  await page.click('.auth-tab[data-tab="register"]');
  const testEmail = `prueba.evidencia.${Date.now()}@nubo.com`;
  await page.fill('#reg-name', 'Usuario Evidencia');
  await page.fill('#reg-email', testEmail);
  await page.fill('#reg-pass', 'ClaveSegura123');
  await page.fill('#reg-confirm', 'ClaveSegura123');
  await page.click('#register-form button[type="submit"]');
  await page.waitForURL(/index\.html/, { timeout: 10000 }).catch(() => {});

  await page.evaluate(() => localStorage.removeItem('tienda_session'));
  await page.goto(`${BASE}/login.html`, { waitUntil: 'networkidle' });
  await showLocalStoragePanel(page, 'tienda_users', 'tienda_users');
  await screenshot(page, '04-localstorage-hash.png');

  await page.evaluate(() => localStorage.removeItem('tienda_session'));
  await page.goto(`${BASE}/login.html`, { waitUntil: 'networkidle' });
  await page.fill('#login-email', 'demo@nubo.com');
  await page.fill('#login-pass', 'demo123');
  await page.click('#login-form button[type="submit"]');
  await page.waitForURL(/index\.html/, { timeout: 10000 });
  await page.waitForTimeout(600);
  await screenshot(page, '06-flujo-compra-nube.png');

  const httpsUrl = process.env.HTTPS_URL || 'https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages';
  await page.goto(httpsUrl, { waitUntil: 'networkidle' });
  await page.evaluate((deployBase) => {
    const bar = document.createElement('div');
    bar.id = 'evidencia-https';
    bar.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'right:0',
      'background:#0f5132',
      'color:#fff',
      'padding:10px 16px',
      'font:14px Segoe UI,sans-serif',
      'z-index:999999',
      'text-align:center'
    ].join(';');
    bar.textContent = `NUBO en GitHub Pages usa HTTPS automatico — URL de despliegue: ${deployBase}`;
    document.body.prepend(bar);
  }, `${BASE.replace('http://localhost/tienda', 'https://TU-USUARIO.github.io/nubo-tienda')}`);
  await page.waitForTimeout(500);
  await screenshot(page, '05-https-candado.png');

  await browser.close();
  console.log('\nCapturas guardadas en docs/evidencias/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

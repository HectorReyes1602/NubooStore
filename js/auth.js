function setAuthError(elementId, message = '') {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('visible', Boolean(message));
}

function setSubmitting(form, submitting) {
  const button = form?.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = submitting;
  if (submitting) {
    button.dataset.label = button.textContent;
    button.textContent = 'Procesando...';
  } else if (button.dataset.label) {
    button.textContent = button.dataset.label;
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.querySelector('#login-email').value.trim();
  const password = form.querySelector('#login-pass').value;
  setAuthError('login-error');

  if (!isValidEmail(email) || !password) {
    setAuthError('login-error', 'Ingresa un correo y contraseña válidos');
    return;
  }

  setSubmitting(form, true);
  try {
    const data = await apiRequest('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    saveApiSession(data);
    showToast(`¡Bienvenido, ${data.user.fullName}!`, 'success');
    setTimeout(() => { window.location.href = safeRedirect(); }, 400);
  } catch (error) {
    setAuthError('login-error', error.message);
  } finally {
    setSubmitting(form, false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const fullName = form.querySelector('#reg-name').value.trim();
  const email = form.querySelector('#reg-email').value.trim();
  const password = form.querySelector('#reg-pass').value;
  const confirmPassword = form.querySelector('#reg-confirm').value;
  setAuthError('register-error');

  if (!isValidFullName(fullName)) {
    setAuthError('register-error', 'El nombre debe tener al menos 3 caracteres y contener únicamente letras, espacios, puntos, apóstrofes o guiones');
    return;
  }
  if (!isValidEmail(email)) {
    setAuthError('register-error', 'Ingresa un correo completo con dominio y extensión, por ejemplo: nombre@dominio.com');
    return;
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    setAuthError('register-error', 'La contraseña requiere al menos 8 caracteres, una letra y un número');
    return;
  }
  if (password !== confirmPassword) {
    setAuthError('register-error', 'Las contraseñas no coinciden');
    return;
  }

  setSubmitting(form, true);
  try {
    const data = await apiRequest('/auth/register', {
      method: 'POST', body: { fullName, email, password }, auth: false
    });
    saveApiSession(data);
    showToast('Cuenta creada correctamente', 'success');
    setTimeout(() => { window.location.href = safeRedirect(); }, 400);
  } catch (error) {
    setAuthError('register-error', error.message);
  } finally {
    setSubmitting(form, false);
  }
}

async function handleForgotPassword(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = document.getElementById('recovery-email').value.trim();
  setAuthError('recovery-error');
  if (!isValidEmail(email)) {
    setAuthError('recovery-error', 'Ingresa un correo electrónico válido');
    return;
  }

  setSubmitting(form, true);
  try {
    const data = await apiRequest('/auth/forgot-password', {
      method: 'POST', body: { email }, auth: false
    });
    showToast(data.message, 'success');
    document.getElementById('reset-form').classList.remove('hidden');
    document.getElementById('recovery-code').focus();
  } catch (error) {
    setAuthError('recovery-error', error.message);
  } finally {
    setSubmitting(form, false);
  }
}

async function handleResetPassword(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = document.getElementById('recovery-email').value.trim();
  const code = document.getElementById('recovery-code').value.trim();
  const newPassword = document.getElementById('recovery-password').value;
  const confirmation = document.getElementById('recovery-confirm').value;
  setAuthError('recovery-error');

  if (!/^\d{6}$/.test(code)) {
    setAuthError('recovery-error', 'El código debe contener seis números');
    return;
  }
  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    setAuthError('recovery-error', 'La contraseña requiere al menos 8 caracteres, una letra y un número');
    return;
  }
  if (newPassword !== confirmation) {
    setAuthError('recovery-error', 'Las contraseñas no coinciden');
    return;
  }

  setSubmitting(form, true);
  try {
    const data = await apiRequest('/auth/reset-password', {
      method: 'POST', body: { email, code, newPassword }, auth: false
    });
    showToast(data.message, 'success');
    showAuthPanel('login');
    document.getElementById('login-email').value = email;
  } catch (error) {
    setAuthError('recovery-error', error.message);
  } finally {
    setSubmitting(form, false);
  }
}

function showAuthPanel(name) {
  document.querySelectorAll('.auth-panel').forEach(panel => panel.classList.remove('active'));
  document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === name));
  document.getElementById(`panel-${name}`)?.classList.add('active');
}

function initPasswordToggles() {
  document.querySelectorAll('[data-password-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      button.setAttribute('aria-pressed', String(!visible));
      button.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
      const icon = button.querySelector('i');
      icon?.classList.toggle('fa-eye', visible);
      icon?.classList.toggle('fa-eye-slash', !visible);
    });
  });
}

function initAuthPage() {
  if (!document.getElementById('login-form')) return;
  if (getSession()) {
    window.location.href = safeRedirect();
    return;
  }
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => showAuthPanel(tab.dataset.tab));
  });
  document.getElementById('show-recovery')?.addEventListener('click', () => {
    const loginEmail = document.getElementById('login-email').value.trim();
    if (loginEmail) document.getElementById('recovery-email').value = loginEmail;
    showAuthPanel('recovery');
  });
  document.getElementById('back-to-login')?.addEventListener('click', () => showAuthPanel('login'));
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('register-form')?.addEventListener('submit', handleRegister);
  document.getElementById('forgot-form')?.addEventListener('submit', handleForgotPassword);
  document.getElementById('reset-form')?.addEventListener('submit', handleResetPassword);
  initPasswordToggles();
}

document.addEventListener('DOMContentLoaded', initAuthPage);

const API_BASE_URL = 'https://morfosdigital.com/Nuboback';

const API_STORAGE_KEYS = {
  ACCESS_TOKEN: 'nuboo_access_token',
  REFRESH_TOKEN: 'nuboo_refresh_token',
  USER: 'nuboo_user'
};

['tienda_session', 'tienda_users', 'tienda_cart', 'tienda_orders', 'tienda_pending_order']
  .forEach(key => localStorage.removeItem(key));

class ApiError extends Error {
  constructor(message, status = 0, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

let refreshPromise = null;

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(API_STORAGE_KEYS.USER) || 'null');
  } catch {
    clearApiSession();
    return null;
  }
}

function saveApiSession(payload) {
  if (payload.accessToken) sessionStorage.setItem(API_STORAGE_KEYS.ACCESS_TOKEN, payload.accessToken);
  if (payload.refreshToken) localStorage.setItem(API_STORAGE_KEYS.REFRESH_TOKEN, payload.refreshToken);
  if (payload.user) localStorage.setItem(API_STORAGE_KEYS.USER, JSON.stringify(payload.user));
}

function clearApiSession() {
  sessionStorage.removeItem(API_STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(API_STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(API_STORAGE_KEYS.USER);
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(API_STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) throw new ApiError('La sesión ha vencido', 401);

  if (!refreshPromise) {
    refreshPromise = apiRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
      retry: false
    }).then(data => {
      saveApiSession(data);
      return data.accessToken;
    }).catch(error => {
      clearApiSession();
      throw error;
    }).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    auth = true,
    retry = true,
    headers: customHeaders = {}
  } = options;

  const headers = { Accept: 'application/json', ...customHeaders };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const accessToken = sessionStorage.getItem(API_STORAGE_KEYS.ACCESS_TOKEN);
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      mode: 'cors',
      cache: 'no-store'
    });
  } catch {
    throw new ApiError('No fue posible conectar con el servidor. Intenta nuevamente.', 0);
  }

  if (response.status === 401 && auth && retry) {
    await refreshAccessToken();
    return apiRequest(path, { ...options, retry: false });
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok || !payload?.success) {
    const message = payload?.error?.message || `El servidor respondió con estado ${response.status}`;
    throw new ApiError(message, response.status, payload?.error?.details || []);
  }

  return payload.data;
}

async function apiLogout() {
  const refreshToken = localStorage.getItem(API_STORAGE_KEYS.REFRESH_TOKEN);
  try {
    if (refreshToken) {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        auth: false,
        retry: false
      });
    }
  } catch (error) {
    console.warn('La sesión local se cerró, pero el servidor no respondió al logout.', error);
  } finally {
    clearApiSession();
  }
}

function safeRedirect(defaultPage = 'index.html') {
  const requested = new URLSearchParams(window.location.search).get('redirect');
  return requested && /^[a-zA-Z0-9_-]+\.html(?:\?[^#]*)?$/.test(requested)
    ? requested
    : defaultPage;
}

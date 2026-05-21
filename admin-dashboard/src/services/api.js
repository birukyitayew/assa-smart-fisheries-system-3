import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('assa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const regionStored = sessionStorage.getItem('assa_region_id');
  if (regionStored && regionStored !== 'all') {
    const regionId = Number(regionStored);
    if (Number.isFinite(regionId) && regionId > 0) {
      config.headers['X-Region-Id'] = String(regionId);
    }
  }
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }
    const refreshToken = sessionStorage.getItem('assa_refresh_token');
    if (!refreshToken) {
      localStorage.removeItem('assa_token');
      localStorage.removeItem('assa_user');
      window.location.href = `${import.meta.env.BASE_URL}login`.replace(/\/+/g, '/');
      return Promise.reject(err);
    }
    original._retry = true;
    if (!refreshPromise) {
      refreshPromise = axios
        .post('/api/auth/refresh', { refreshToken })
        .then((r) => {
          const token = r.data.accessToken || r.data.token;
          localStorage.setItem('assa_token', token);
          if (r.data.refreshToken) {
            sessionStorage.setItem('assa_refresh_token', r.data.refreshToken);
          }
          return token;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }
    try {
      const token = await refreshPromise;
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch {
      localStorage.removeItem('assa_token');
      localStorage.removeItem('assa_user');
      sessionStorage.removeItem('assa_refresh_token');
      window.location.href = `${import.meta.env.BASE_URL}login`.replace(/\/+/g, '/');
      return Promise.reject(err);
    }
  },
);

export default api;

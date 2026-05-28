import axios from 'axios';

const TOKEN_KEY = 'assa_fisher_token';
const USER_KEY = 'assa_fisher_user';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('assa_fisher_profile');
      window.location.href = `${import.meta.env.BASE_URL}login`.replace(/\/+/g, '/');
      return Promise.reject(err);
    }
    original._retry = true;
    if (!refreshPromise) {
      refreshPromise = axios
        .post('/api/auth/refresh', { refreshToken })
        .then((r) => {
          const token = r.data.accessToken || r.data.token;
          localStorage.setItem(TOKEN_KEY, token);
          if (r.data.refreshToken)
            sessionStorage.setItem('assa_refresh_token', r.data.refreshToken);
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
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('assa_fisher_profile');
      sessionStorage.removeItem('assa_refresh_token');
      window.location.href = `${import.meta.env.BASE_URL}login`.replace(/\/+/g, '/');
      return Promise.reject(err);
    }
  },
);

export default api;

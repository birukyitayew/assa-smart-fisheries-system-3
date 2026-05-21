import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const s = localStorage.getItem('assa_user');
    return s ? JSON.parse(s) : null;
  });

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    const { token, accessToken, refreshToken, user: u } = res.data;
    const access = accessToken || token;
    if (u.role !== 'buyer') throw new Error('This app is for buyers only.');
    localStorage.setItem('assa_token', access);
    localStorage.setItem('assa_user', JSON.stringify(u));
    if (refreshToken) sessionStorage.setItem('assa_refresh_token', refreshToken);
    setUser(u);
    return u;
  }

  async function logout() {
    const refreshToken = sessionStorage.getItem('assa_refresh_token');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      /* ignore */
    }
    localStorage.removeItem('assa_token');
    localStorage.removeItem('assa_user');
    sessionStorage.removeItem('assa_refresh_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }

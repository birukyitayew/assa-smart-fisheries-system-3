import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const s = localStorage.getItem('assa_fisher_user');
    return s ? JSON.parse(s) : null;
  });
  const [profile, setProfile] = useState(() => {
    const s = localStorage.getItem('assa_fisher_profile');
    return s ? JSON.parse(s) : null;
  });

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    const { token, accessToken, refreshToken, user: u, profile: p } = res.data;
    const access = accessToken || token;
    if (u.role !== 'fisher') throw new Error('This app is for fishers only.');
    localStorage.setItem('assa_fisher_token', access);
    localStorage.setItem('assa_fisher_user', JSON.stringify(u));
    localStorage.setItem('assa_fisher_profile', JSON.stringify(p));
    if (refreshToken) sessionStorage.setItem('assa_refresh_token', refreshToken);
    setUser(u);
    setProfile(p);
    return u;
  }

  async function logout() {
    const refreshToken = sessionStorage.getItem('assa_refresh_token');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      /* ignore */
    }
    localStorage.removeItem('assa_fisher_token');
    localStorage.removeItem('assa_fisher_user');
    localStorage.removeItem('assa_fisher_profile');
    sessionStorage.removeItem('assa_refresh_token');
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

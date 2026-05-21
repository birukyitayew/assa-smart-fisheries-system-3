import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const s = localStorage.getItem('assa_buyer_user');
    return s ? JSON.parse(s) : null;
  });

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: u } = res.data;
    if (u.role !== 'buyer') throw new Error('This app is for buyers only.');
    localStorage.setItem('assa_buyer_token', token);
    localStorage.setItem('assa_buyer_user', JSON.stringify(u));
    setUser(u);
    return u;
  }

  function logout() {
    localStorage.removeItem('assa_buyer_token');
    localStorage.removeItem('assa_buyer_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }

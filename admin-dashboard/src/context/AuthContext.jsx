import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('assa_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading] = useState(false);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: u } = res.data;
    if (!['admin', 'superadmin', 'inspector'].includes(u.role)) {
      throw new Error('Access denied. Government credentials required.');
    }
    localStorage.setItem('assa_token', token);
    localStorage.setItem('assa_user', JSON.stringify(u));
    setUser(u);
    return u;
  }

  function logout() {
    localStorage.removeItem('assa_token');
    localStorage.removeItem('assa_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

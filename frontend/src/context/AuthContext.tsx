import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('payflow_token');
    const savedUser = localStorage.getItem('payflow_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUserState(JSON.parse(savedUser));
      } catch { localStorage.clear(); }
    }
  }, []);

  const login = (newToken: string, newUser: User, refreshToken?: string) => {
    setToken(newToken);
    setUserState(newUser);
    localStorage.setItem('payflow_token', newToken);
    localStorage.setItem('payflow_user', JSON.stringify(newUser));
    if (refreshToken) localStorage.setItem('payflow_refresh', refreshToken);
  };

  const logout = async () => {
    try {
      const rt = localStorage.getItem('payflow_refresh');
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ refreshToken: rt }),
      });
    } catch { /* ignora errores */ }
    setToken(null);
    setUserState(null);
    localStorage.removeItem('payflow_token');
    localStorage.removeItem('payflow_user');
    localStorage.removeItem('payflow_refresh');
  };

  const setUser = (u: User) => {
    setUserState(u);
    localStorage.setItem('payflow_user', JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{
      user, token, login, logout, setUser,
      isAuthenticated: !!token,
      isAdmin: user?.role === 'ADMIN',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

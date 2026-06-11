import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { api } from '../services/api';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.auth.getCurrentUser()
      .then(currentUser => {
        setUser(currentUser);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const login = async (username: string, password_raw: string) => {
    setLoading(true);
    try {
      const loggedUser = await api.auth.login(username, password_raw);
      setUser(loggedUser);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.auth.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

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

  const login = async (email: string, password_raw: string) => {
    setLoading(true);
    try {
      const loggedUser = await api.auth.login(email, password_raw);
      setUser(loggedUser);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password_raw: string, firstname: string, lastname: string) => {
    setLoading(true);
    try {
      await api.auth.register(email, password_raw, firstname, lastname);
      const loggedUser = await api.auth.login(email, password_raw);
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

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

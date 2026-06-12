import { createContext, useContext } from 'react';
import type { User } from '../types';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password_raw: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth doit être utilisé au sein d'un composant AuthProvider");
  }
  return context;
}

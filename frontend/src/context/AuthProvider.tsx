import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { api } from '../services/api';
import { AuthContext } from './AuthContext';

/**
 * Composant Provider qui englobe l'application pour fournir le contexte d'authentification.
 * Il gère l'état global de l'utilisateur (connecté/déconnecté) et communique avec l'API backend.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // L'utilisateur connecté. S'il est null, l'utilisateur est considéré comme visiteur.
  const [user, setUser] = useState<User | null>(null);
  // Indique si on est en train de faire une requête d'authentification
  const [loading, setLoading] = useState<boolean>(true);

  // Au premier montage de l'application, on vérifie silencieusement si l'utilisateur
  // possède déjà une session active (via le cookie de session HTTP-Only renvoyé par Django).
  useEffect(() => {
    api.auth.getCurrentUser()
      .then(currentUser => {
        setUser(currentUser);
        setLoading(false);
      })
      .catch(() => {
        // En cas d'erreur (non authentifié), on enlève juste le statut de chargement.
        setLoading(false);
      });
  }, []);

  // Fonction de connexion : appelle l'API puis met à jour le state local
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

  // Fonction de déconnexion : détruit la session côté serveur et efface l'utilisateur local
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

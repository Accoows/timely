import { createContext, useContext } from 'react';
import type { User } from '../types';

/**
 * Interface décrivant la structure du contexte d'authentification.
 * Expose l'état actuel de l'utilisateur et les méthodes d'action liées à son compte.
 */
export interface AuthContextType {
  /** L'utilisateur actuellement connecté, ou null si déconnecté */
  user: User | null;
  /** Vrai si l'application est en train de vérifier l'état de session au chargement initial */
  loading: boolean;
  /** Fonction pour authentifier un utilisateur existant */
  login: (email: string, password_raw: string) => Promise<void>;
  /** Fonction pour créer un nouveau compte client */
  register: (email: string, password_raw: string, firstname: string, lastname: string) => Promise<void>;
  /** Fonction pour fermer la session actuelle */
  logout: () => Promise<void>;
  /** Fonction utilitaire pour mettre à jour l'objet utilisateur localement*/
  updateUser: (updatedUser: User) => void;
}

/**
 * Création du contexte React (par défaut `undefined` avant d'être enveloppé par le Provider).
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hook personnalisé pour consommer le contexte d'authentification de manière simple et sécurisée.
 * @throws {Error} Si le hook est appelé en dehors de l'arborescence du `AuthProvider`.
 * @returns {AuthContextType} L'objet contenant l'état utilisateur et les fonctions d'authentification.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth doit être utilisé au sein d'un composant AuthProvider");
  }
  return context;
}

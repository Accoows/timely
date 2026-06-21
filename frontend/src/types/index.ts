/** 
 * Rôles possibles pour un utilisateur de l'application. 
 * Détermine les permissions d'accès et les vues disponibles (Dashboard vs Admin vs Client).
 */
export type UserRole = 'client' | 'gerant' | 'professionnel' | 'admin';

export interface UserEstablishment {
  id: number;
  nom: string;
}

/**
 * Structure de base d'un utilisateur connecté (Session en cours).
 * Contient les informations essentielles nécessaires dans toute l'application (Header, Réservations).
 */
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  establishment_id?: number | null;
  establishments?: UserEstablishment[];
  telephone?: string | null;
}

/**
 * Représente un secteur d'activité (ex: Coiffure, Restauration).
 * Utilisé pour filtrer les établissements et afficher les bonnes catégories.
 */
export interface Secteur {
  id: number;
  nom: string;
}

/**
 * Informations géographiques rattachées à un établissement.
 */
export interface Lieu {
  id: number;
  adresse: string;
  ville: string;
  code_postal?: string | null;
}

/**
 * Un service proposé par un établissement (ex: Coupe homme, Massage 30min).
 */
export interface Prestation {
  id: number;
  nom: string;
  cout: number;
  description?: string;
  collaborateurs?: number[];
}

/**
 * Membre du personnel (Professionnel) travaillant dans un établissement.
 * C'est avec lui qu'un client prend rendez-vous.
 */
export interface Collaborateur {
  id: number;
  nom: string;
  prenom: string;
  poste: string;
  description?: string;
}

export interface EtablissementGerant {
  id: number;
  prenom: string;
  nom: string;
  email: string;
}

/**
 * L'entité centrale de l'application : l'établissement commercial.
 * Regroupe toutes les informations publiques, les collaborateurs, et les prestations.
 * Certaines propriétés (name, category, badge...) sont optionnelles car elles sont calculées 
 * dynamiquement par le Frontend (voir mapBackendEtablissement dans api.ts).
 */
export interface Etablissement {
  id: number;
  nom?: string;
  secteur?: Secteur | null;
  lieu?: Lieu | null;
  gerant?: EtablissementGerant | null;
  description?: string;
  telephone?: string;
  mail?: string;
  site_web?: string;
  prestations?: Prestation[];
  collaborateurs?: Collaborateur[];
  photos?: string[];
  note_globale?: number;
  note_accueil?: number;
  note_proprete?: number;
  note_cadre?: number;
  note_prestation?: number;
  nombre_avis?: number;
  horaires?: Record<string, string> | null;
  // Propriétés mappées pour la compatibilité avec l'affichage de l'interface
  name?: string;
  category?: string;
  address?: string;
  rating?: string;
  image?: string;
  badge?: string;
}

/**
 * Représente un rendez-vous (réservation) tel qu'affiché côté Frontend.
 * Contient toutes les informations croisées : l'établissement, le client, le pro et la prestation.
 */
export interface Booking {
  id: number;
  establishment_name: string;
  booking_date: string;
  status: 'pending' | 'success' | 'cancelled' | 'confirme';
  payment_method?: 'on_site' | 'stripe';
  payment_status?: 'pending' | 'paid' | 'unpaid' | 'refunded';
  raw_date_heure?: string;
  professionnel?: {
    id: number;
    nom: string;
    prenom: string;
    poste: string;
  };
  prestation?: {
    id: number;
    nom: string;
    cout: number;
    description?: string;
  };
  client?: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string | null;
  };
}

/**
 * Format de données envoyé au Backend pour créer une nouvelle réservation.
 */
export interface BookingInput {
  professionnel_id: number;
  prestation_id: number;
  date_heure: string;
  duree?: number;
  status?: string;
  payment_method?: 'on_site' | 'stripe';
}

export interface MessageSender {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Un message unitaire au sein d'une discussion.
 */
export interface Message {
  id: number;
  content: string;
  created_at: string;
  sender: MessageSender;
}

/**
 * Une conversation entre un client et un établissement.
 * Regroupe les messages et permet d'afficher la liste des chats récents.
 */
export interface Discussion {
  id: number;
  etablissement: {
    id: number;
    nom: string;
  };
  client: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  last_message?: {
    id: number;
    content: string;
    created_at: string;
    sender_id: number;
    sender_username: string;
  } | null;
  date_creation: string;
}

/**
 * Un avis laissé par un client suite à une prestation.
 * Inclut une note sur 5 et un message textuel.
 */
export interface Review {
  id: number;
  etablissement?: {
    id: number;
    nom: string;
  };
  client?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  message: string;
  note?: number;
  date_envoie: string;
}

/**
 * Facture simplifiée générée pour l'historique client ou le dashboard pro.
 */
export interface Invoice {
  id: number;
  reference: string;
  establishment_name: string;
  date: string;
  amount: string;
  status: 'success' | 'pending' | 'refunded';
}

/**
 * Vue détaillée d'un utilisateur, spécifique au panneau d'administration (SuperAdmin).
 * Contient des détails privés comme l'état d'activation, ou les détails métier (pro/gerant).
 */
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_superuser: boolean;
  is_staff: boolean;
  date_joined: string | null;
  role: UserRole;
  pro_details?: {
    etablissement_id: number;
    etablissement_nom: string;
    poste: string;
    description: string;
  } | null;
  gerant_details?: {
    establishments: { id: number; nom: string }[];
  } | null;
  client_details?: {
    telephone: string;
    date_inscription: string | null;
  } | null;
  reset_code?: string | null;
}

/**
 * Événement formaté spécifiquement pour le composant Calendrier (FullCalendar).
 */
export interface CalendarEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  status: string;
  prestation: string;
  professionnel: {
    id: number;
    nom_complet: string;
  };
  client: {
    id: number;
    nom_complet: string;
    email: string;
    telephone?: string | null;
  };
}

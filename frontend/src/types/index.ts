export type UserRole = 'client' | 'gerant' | 'professionnel' | 'admin';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

export interface Secteur {
  id: number;
  nom: string;
}

export interface Lieu {
  id: number;
  adresse: string;
  ville: string;
  code_postal?: string | null;
  region?: string | null;
}

export interface Prestation {
  id: number;
  nom: string;
  cout: number;
  description?: string;
}

export interface Collaborateur {
  id: number;
  nom: string;
  prenom: string;
  poste: string;
  description?: string;
}

export interface Etablissement {
  id: number;
  nom?: string;
  secteur?: Secteur | null;
  lieu?: Lieu | null;
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

export interface Booking {
  id: number;
  establishment_name: string;
  booking_date: string;
  status: 'pending' | 'success' | 'cancelled';
}

export interface BookingInput {
  professionnel_id: number;
  prestation_id: number;
  date_heure: string;
  duree?: number;
  status?: string;
}

export interface MessageSender {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

export interface Message {
  id: number;
  content: string;
  created_at: string;
  sender: MessageSender;
}

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

export interface Invoice {
  id: number;
  reference: string;
  establishment_name: string;
  date: string;
  amount: string;
  status: 'success' | 'pending';
}

import type { Etablissement, Booking, BookingInput, User, Secteur, UserRole, Lieu, Discussion, Message, Review, Invoice, AdminUser, CalendarEvent, Prestation } from '../types';

import defaultImg from '../../public/images/default.jpg';
import coiffureImg from '../../public/images/coiffure.jpg';
import barbierImg from '../../public/images/barbier.jpg';
import massageImg from '../../public/images/massage.jpg';
import beauteImg from '../../public/images/beaute.jpg';
import restaurationImg from '../../public/images/restauration.jpg';
import hebergementImg from '../../public/images/hebergement.jpg';
import voyagesImg from '../../public/images/voyages.jpg';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Extrait la valeur d'un cookie par son nom.
 * Utilisé principalement pour récupérer le jeton de sécurité 'csrftoken' fourni par Django.
 */
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

/**
 * Fonction générique (Wrapper) pour effectuer des requêtes HTTP (fetch) vers l'API.
 * Gère automatiquement :
 * - L'ajout des headers JSON standards.
 * - L'injection du jeton CSRF pour les requêtes de modification (POST, PUT, DELETE).
 * - Le parsing standardisé des erreurs renvoyées par Django REST Framework.
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type') && !(options?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const csrfToken = getCookie('csrftoken');
  if (csrfToken) {
    headers.set('X-CSRFToken', csrfToken);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMsg = `Erreur API: ${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson) {
        if (errorJson.error) {
          errMsg = errorJson.error;
        } else if (errorJson.message) {
          errMsg = errorJson.message;
        }
      }
    } catch {
      // Ignore if response is not valid JSON
    }
    throw new ApiError(response.status, errMsg);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Fonction utilitaire qui renvoie une image par défaut appropriée selon le secteur d'activité.
 * Va chercher les images locales dans le dossier public.
 * @param sectorName Le nom du secteur (ex: 'Coiffure', 'Restauration')
 */
const getEstablishmentImage = (sectorName?: string) => {
  if (sectorName === 'Coiffure') return coiffureImg;
  if (sectorName === 'Barbier') return barbierImg;
  if (sectorName === 'Massage & Bien-être') return  massageImg;
  if (sectorName === 'Beauté & Soins') return beauteImg;
  if (sectorName === 'Restauration') return restaurationImg;
  if (sectorName === 'Hébergement') return hebergementImg;
  if (sectorName === 'Voyages & Transports') return voyagesImg;
  return defaultImg;
};

/**
 * Formate un établissement tel qu'il vient du backend Django vers le format standard exigé par le composant React.
 * - Extrait le nom du secteur pour en faire une "category" ou un "badge".
 * - Calcule l'adresse complète lisible.
 * @param est L'objet brut renvoyé par l'API
 */
function mapBackendEtablissement(est: Etablissement): Etablissement {
  const sectorName = est.secteur?.nom || '';
  const firstPhoto = est.photos && est.photos.length > 0 ? est.photos[0] : null;
  return {
    ...est,
    name: est.nom,
    category: sectorName,
    badge: sectorName,
    address: est.lieu ? `${est.lieu.adresse}, ${est.lieu.ville}` : '',
    rating: est.note_globale !== undefined ? est.note_globale.toFixed(1) : '0.0',
    image: firstPhoto || getEstablishmentImage(sectorName)
  };
}

/**
 * Interface représentant la structure de données d'une réservation telle que renvoyée par le backend Django.
 * Gestion des status stripe et paiement sur site .
 */
interface BackendBooking {
  id: number;
  date_heure: string;
  duree: number;
  status: string;
  establishment_name: string;
  payment_method?: 'on_site' | 'stripe';
  payment_status?: 'pending' | 'paid' | 'unpaid';
  prestation: {
    id: number;
    nom: string;
    cout: string;
    description: string;
  };
  professionnel: {
    id: number;
    nom: string;
    prenom: string;
    poste: string;
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
 * Formate une réservation du format Backend vers le format allégé et prêt à l'emploi du Frontend.
 * - Formate la date au standard français (JJ/MM/AAAA à HH:mm).
 * - Standardise les statuts (pending, success, cancelled) pour qu'ils soient reconnus par les badges DaisyUI.
 * - Aplatit certaines propriétés pour simplifier le typage.
 * @param b La réservation au format Backend
 */
function mapBackendBooking(b: BackendBooking): Booking {
  const dateObj = new Date(b.date_heure);
  const formattedDate = !isNaN(dateObj.getTime())
    ? `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} à ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`
    : b.date_heure;
  return {
    id: b.id,
    establishment_name: b.establishment_name,
    booking_date: formattedDate,
    status: (b.status === 'confirme' || b.status === 'success') ? 'success' : b.status === 'pending' ? 'pending' : 'cancelled',
    payment_method: b.payment_method,
    payment_status: b.payment_status,
    raw_date_heure: b.date_heure,
    professionnel: b.professionnel ? {
      id: b.professionnel.id,
      nom: b.professionnel.nom,
      prenom: b.professionnel.prenom,
      poste: b.professionnel.poste
    } : undefined,
    prestation: b.prestation ? {
      id: b.prestation.id,
      nom: b.prestation.nom,
      cout: parseFloat(b.prestation.cout),
      description: b.prestation.description
    } : undefined,
    client: b.client ? {
      id: b.client.id,
      nom: b.client.nom,
      prenom: b.client.prenom,
      email: b.client.email,
      telephone: b.client.telephone
    } : undefined
  };
}

export const api = {
  /**
   * Gestion du catalogue des établissements.
   * Permet la recherche, la consultation, et l'administration des lieux.
   */
  establishments: {
    /** 
     * Récupère les établissements populaires pour la page d'accueil.
     * @param category Filtre optionnel par secteur (ex: "restaurant", "hotel").
     */
    getPopular: async (category: string = 'all'): Promise<Etablissement[]> => {
      const data = await request<Etablissement[]>(`/api/popular-filter/?category=${category}`);
      return data.map(est => {
        const img = est.image || '';
        return {
          ...est,
          image: img.startsWith('http') ? img : img ? `/static/${img}` : undefined
        };
      });
    },
    /** 
     * Récupère les détails complets d'un établissement spécifique (dont ses horaires et photos).
     * @param id L'identifiant unique de l'établissement.
     */
    getById: async (id: number): Promise<Etablissement> => {
      const response = await request<{ status: string; establishment: Etablissement }>(`/api/establishments/${id}/`);
      return mapBackendEtablissement(response.establishment);
    },
    /**
     * Moteur de recherche principal. 
     * Combine recherche textuelle (quoi), géographique (où) et filtrage par secteur/notes.
     */
    explore: async (filters: {
      query?: string;
      location?: string;
      sector?: string | number;
      sort?: string;
      min_rating?: number | null;
      sub_category?: string | null;
    } = {}): Promise<Etablissement[]> => {
      const params = new URLSearchParams();
      if (filters.query) params.append('query', filters.query);
      if (filters.location) params.append('location', filters.location);
      if (filters.sector) params.append('sector', String(filters.sector));
      if (filters.sort && filters.sort !== 'default') params.append('sort', filters.sort);
      if (filters.min_rating) params.append('min_rating', String(filters.min_rating));
      if (filters.sub_category) params.append('sub_category', filters.sub_category);

      const queryString = params.toString();
      const url = `/api/establishments/explore/${queryString ? `?${queryString}` : ''}`;
      const response = await request<{ status: string; establishments: Etablissement[] }>(url);
      return response.establishments.map(mapBackendEtablissement);
    },
    /**
     * Inscrit un nouvel établissement sur la plateforme (action réservée aux pros/gérants).
     */
    register: async (data: {
      nom: string;
      siret: string;
      adresse: string;
      ville: string;
      code_postal: string;
      telephone: string;
      mail: string;
      description: string;
      category: string;
    }): Promise<{ status: string; message: string; establishment: { id: number; nom: string } }> => {
      return await request<{ status: string; message: string; establishment: { id: number; nom: string } }>('/api/establishments/register/', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    /**
     * Met à jour les informations d'un établissement existant (description, horaires, etc.).
     */
    update: async (id: number, data: Partial<Etablissement> & { photos?: string[], secteur_id?: number, gerant_id?: number }): Promise<{ status: string; message: string }> => {
      return await request<{ status: string; message: string }>(`/api/establishments/${id}/`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    /**
     * Téléverse une nouvelle photo dans la galerie de l'établissement (utilise un FormData pour l'envoi de fichier).
     */
    uploadPhoto: async (id: number, file: File): Promise<{ status: string; message: string; photos: string[] }> => {
      const formData = new FormData();
      formData.append('image', file);
      return request<{ status: string; message: string; photos: string[] }>(`/api/establishments/${id}/upload-photo/`, {
        method: 'POST',
        body: formData
      });
    },
    deletePhoto: async (id: number, photoUrl: string): Promise<{ status: string; message: string; photos: string[] }> => {
      return request<{ status: string; message: string; photos: string[] }>(`/api/establishments/${id}/upload-photo/`, {
        method: 'DELETE',
        body: JSON.stringify({ url: photoUrl })
      });
    },
    delete: async (id: number): Promise<{ status: string; message: string }> => {
      return await request<{ status: string; message: string }>(`/api/establishments/${id}/`, {
        method: 'DELETE'
      });
    }
  },

  /**
   * Catégories/Secteurs d'activité de la plateforme.
   */
  sectors: {
    list: async (): Promise<Secteur[]> => {
      const response = await request<{ status: string; sectors: Secteur[] }>('/api/establishments/sectors/');
      return response.sectors;
    }
  },

  locations: {
    list: async (filters: { sector_id?: string | number } = {}): Promise<Lieu[]> => {
      const params = new URLSearchParams();
      if (filters.sector_id) params.append('sector_id', String(filters.sector_id));
      const queryString = params.toString();
      const url = `/api/establishments/locations/${queryString ? `?${queryString}` : ''}`;
      const response = await request<{ status: string; locations: Lieu[] }>(url);
      return response.locations;
    }
  },

  /**
   * Gestion du catalogue des prestations/services proposés par un établissement.
   */
  prestations: {
    /** Liste toutes les prestations d'un établissement donné */
    list: async (establishmentId: number): Promise<Prestation[]> => {
      const response = await request<{ status: string; services: Prestation[] }>(`/api/establishments/${establishmentId}/services/`);
      return response.services;
    },
    /** Crée une nouvelle prestation (nom, coût, description) et l'associe potentiellement à des collaborateurs */
     create: async (establishmentId: number, data: { nom: string; cout: number; description?: string; collaborateurs?: number[] }): Promise<Prestation> => {
      const response = await request<{ status: string; message: string; service: Prestation }>(`/api/establishments/${establishmentId}/services/`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response.service;
    },
    update: async (serviceId: number, data: { nom?: string; cout?: number; description?: string; collaborateurs?: number[] }): Promise<Prestation> => {
      const response = await request<{ status: string; message: string; service: Prestation }>(`/api/establishments/services/${serviceId}/`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return response.service;
    },
    delete: async (serviceId: number): Promise<{ status: string; message: string }> => {
      return await request<{ status: string; message: string }>(`/api/establishments/services/${serviceId}/`, {
        method: 'DELETE'
      });
    }
  },

  /**
   * Gestion complète du cycle de vie des réservations (prise de RDV, annulation, facturation).
   */
  bookings: {
    /** Récupère l'historique complet des réservations pour l'utilisateur connecté (qu'il soit client ou pro) */
    list: async (): Promise<Booking[]> => {
      const rawBookings = await request<BackendBooking[]>('/api/bookings/');
      return rawBookings.map(mapBackendBooking);
    },
    /** 
     * Soumet une nouvelle demande de réservation.
     * Si le mode de paiement est "stripe", le backend peut renvoyer une `payment_url` pour rediriger l'utilisateur.
     */
    create: async (bookingData: BookingInput): Promise<{ booking: Booking; payment_url?: string }> => {
      const response = await request<{ status: string; booking: BackendBooking; payment_url?: string }>('/api/bookings/', {
        method: 'POST',
        body: JSON.stringify(bookingData)
      });
      return {
        booking: mapBackendBooking(response.booking),
        payment_url: response.payment_url
      };
    },
    /** 
     * Interroge le backend pour obtenir les créneaux horaires disponibles d'un professionnel à une date précise.
     * Tient compte des horaires d'ouverture et des autres rendez-vous déjà confirmés.
     */
    getAvailableSlots: async (professionnelId: number, date: string, excludeBookingId?: number): Promise<{ time: string; available: boolean }[]> => {
      const url = `/api/bookings/available-slots/?professionnel_id=${professionnelId}&date=${date}${excludeBookingId ? `&exclude_booking_id=${excludeBookingId}` : ''}`;
      const response = await request<{ status: string; slots: { time: string; available: boolean }[] }>(url);
      return response.slots;
    },
    /**
     * Génère dynamiquement la liste des factures associées aux réservations payées de l'utilisateur.
     */
    getInvoices: async (): Promise<Invoice[]> => {
      // Pour l'instant on retourne n'importe quoi tant que le backend n'a qu'un placeholder
      // Si le backend repond 200, on recupere le JSON, sinon vide
      try {
        const response = await request<{ invoices?: Invoice[] }>('/api/bookings/dashboard/invoices/');
        return response.invoices || [];
      } catch {
        return [];
      }
    },
    getCheckoutUrl: async (bookingId: number): Promise<string> => {
      const response = await request<{ status: string; payment_url: string }>(`/api/bookings/checkout/${bookingId}/`);
      return response.payment_url;
    },
    cancel: async (bookingId: number): Promise<{ status: string; message: string }> => {
      return await request<{ status: string; message: string }>(`/api/bookings/${bookingId}/`, {
        method: 'DELETE'
      });
    },
    update: async (bookingId: number, data: { date_heure: string }): Promise<{ status: string; message: string }> => {
      return await request<{ status: string; message: string }>(`/api/bookings/${bookingId}/`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    }
  },

  /**
   * Interactions de type "Favoris". Permet aux clients de sauvegarder leurs établissements préférés.
   */
  favorites: {
    list: async (): Promise<Etablissement[]> => {
      const response = await request<{ status: string; favorites: Etablissement[] }>('/api/interactions/favorites/');
      return response.favorites.map(mapBackendEtablissement);
    },
    add: async (establishmentId: number): Promise<void> => {
      await request('/api/interactions/favorites/', {
        method: 'POST',
        body: JSON.stringify({ etablissement_id: establishmentId })
      });
    },
    remove: async (establishmentId: number): Promise<void> => {
      await request('/api/interactions/favorites/', {
        method: 'DELETE',
        body: JSON.stringify({ etablissement_id: establishmentId })
      });
    }
  },

  /**
   * Système d'avis et de notation.
   * Un client ne peut laisser un avis que s'il a déjà eu un rendez-vous (vérifié côté backend).
   */
  reviews: {
    listForClient: async (): Promise<Review[]> => {
      const response = await request<{ status: string; reviews: Review[] }>('/api/interactions/review/');
      return response.reviews;
    },
    listForEstablishment: async (establishmentId: number): Promise<Review[]> => {
      const response = await request<{ status: string; reviews: Review[] }>(`/api/interactions/review/?etablissement_id=${establishmentId}`);
      return response.reviews;
    },
    add: async (establishmentId: number, message: string, note: number = 5): Promise<Review> => {
      const response = await request<{ status: string; message: string; review: Review }>('/api/interactions/review/', {
        method: 'POST',
        body: JSON.stringify({ etablissement_id: establishmentId, message, note })
      });
      return response.review;
    },
    delete: async (reviewId: number): Promise<{ status: string; message: string }> => {
      return await request<{ status: string; message: string }>('/api/interactions/review/', {
        method: 'DELETE',
        body: JSON.stringify({ review_id: reviewId })
      });
    }
  },

  /**
   * Identité et gestion de compte utilisateur.
   * Gère les inscriptions, connexions, mots de passe perdus et rôles complexes.
   */
  auth: {
    getCurrentUser: async (): Promise<User | null> => {
      try {
        return await request<User>('/api/auth/user/');
      } catch {
        return null;
      }
    },
    /**
     * Tente de connecter l'utilisateur avec ses identifiants.
     * Le backend (Django) créera une session et renverra un cookie HTTP-Only.
     */
    login: async (email: string, password_raw: string): Promise<User> => {
      const response = await request<{ status: string; message: string; user: { id: number; firstname: string; lastname: string; role: UserRole; establishment_id?: number | null; establishments?: { id: number; nom: string }[] } }>('/api/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password: password_raw })
      });
      return {
        id: response.user.id,
        username: email,
        email: email,
        first_name: response.user.firstname,
        last_name: response.user.lastname,
        role: response.user.role,
        establishment_id: response.user.establishment_id,
        establishments: response.user.establishments
      };
    },
    forgotPassword: async (email: string): Promise<{ status: string; message: string }> => {
      return await request<{ status: string; message: string }>('/api/auth/forgot-password/', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
    },
    resetPassword: async (email: string, code: string, new_password: string): Promise<{ status: string; message: string }> => {
      return await request<{ status: string; message: string }>('/api/auth/reset-password/', {
        method: 'POST',
        body: JSON.stringify({ email, code, new_password })
      });
    },
    register: async (email: string, password_raw: string, firstname: string, lastname: string): Promise<{ status: string; message: string }> => {
      return await request<{ status: string; message: string }>('/api/auth/register/', {
        method: 'POST',
        body: JSON.stringify({ email, password: password_raw, firstname, lastname })
      });
    },
    /**
     * Inscription dédiée aux professionnels (collaborateurs).
     * Créé un utilisateur rattaché à un établissement précis avec un poste spécifique.
     */
    registerPro: async (data: {
      email: string;
      password_raw: string;
      firstname: string;
      lastname: string;
      poste: string;
      description: string;
      date_embauche: string;
      etablissement_id: number;
    }): Promise<{ status: string; message: string }> => {
      return await request<{ status: string; message: string }>('/api/auth/register-pro/', {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          password: data.password_raw,
          firstname: data.firstname,
          lastname: data.lastname,
          poste: data.poste,
          description: data.description,
          date_embauche: data.date_embauche,
          etablissement_id: data.etablissement_id
        })
      });
    },
    removePro: async (userId: number): Promise<{ status: string; message: string }> => {
      return await request<{ status: string; message: string }>(`/api/auth/remove-pro/${userId}/`, {
        method: 'DELETE'
      });
    },
    logout: async (): Promise<void> => {
      await request<void>('/api/auth/logout/', { method: 'POST' });
    },
    updateCurrentUser: async (profileData: {
      first_name?: string;
      last_name?: string;
      email?: string;
      telephone?: string | null;
      old_password?: string;
      new_password?: string;
    }): Promise<User> => {
      return await request<User>('/api/auth/user/', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
    }
  },
  /**
   * Module de messagerie interne en temps réel (ou quasi-réel via polling/sockets).
   * Permet aux clients de discuter avec les professionnels d'un établissement.
   */
  messaging: {
    listDiscussions: async (): Promise<{ status: string; discussions: Discussion[] }> => {
      return await request<{ status: string; discussions: Discussion[] }>('/api/messaging/discussions/');
    },
    startDiscussion: async (etablissementId: number, nomDiscussion: string = ''): Promise<{ status: string; message: string; discussion: Discussion }> => {
      return await request<{ status: string; message: string; discussion: Discussion }>('/api/messaging/discussions/', {
        method: 'POST',
        body: JSON.stringify({ etablissement_id: etablissementId, nom_discussion: nomDiscussion })
      });
    },
    listMessages: async (discId: number): Promise<{ status: string; messages: Message[] }> => {
      return await request<{ status: string; messages: Message[] }>(`/api/messaging/discussions/${discId}/messages/`);
    },
    sendMessage: async (discId: number, content: string): Promise<{ status: string; message: string; data: { id: number; content: string; created_at: string; sender_id: number } }> => {
      return await request<{ status: string; message: string; data: { id: number; content: string; created_at: string; sender_id: number } }>(`/api/messaging/discussions/${discId}/messages/`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
    }
  },
  /**
   * Console d'administration (réservée au rôle Admin global).
   * Donne accès au tableau de bord de supervision de tous les utilisateurs.
   */
  admin: {
    users: {
      list: async (): Promise<AdminUser[]> => {
        const response = await request<{ status: string; users: AdminUser[] }>('/api/auth/admin/users/');
        return response.users;
      },
      update: async (userId: number, data: {
        first_name?: string;
        last_name?: string;
        email?: string;
        is_active?: boolean;
        role?: string;
        etablissement_id?: number;
        poste?: string;
        description?: string;
      }): Promise<{ status: string; message: string }> => {
        return await request<{ status: string; message: string }>(`/api/auth/admin/users/${userId}/`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      },
      delete: async (userId: number): Promise<{ status: string; message: string }> => {
        return await request<{ status: string; message: string }>(`/api/auth/admin/users/${userId}/`, {
          method: 'DELETE'
        });
      }
    },
    reviews: {
      list: async (): Promise<Review[]> => {
        const response = await request<{ status: string; reviews: Review[] }>('/api/interactions/admin/moderation/');
        return response.reviews;
      },
      delete: async (reviewId: number): Promise<{ status: string; message: string }> => {
        return await request<{ status: string; message: string }>(`/api/interactions/admin/moderation/`, {
          method: 'DELETE',
          body: JSON.stringify({ review_id: reviewId })
        });
      }
    },
    calendar: {
      list: async (): Promise<CalendarEvent[]> => {
        const response = await request<{ status: string; events: CalendarEvent[] }>('/api/bookings/dashboard/calendar/');
        return response.events;
      }
    }
  }
};

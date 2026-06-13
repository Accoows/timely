import type { Etablissement, Booking, User, Secteur, Lieu } from '../types';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Helper générique pour les requêtes HTTP
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) {
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
    throw new ApiError(response.status, `Erreur API: ${response.status} ${response.statusText}`);
  }

  // Si pas de contenu (ex: 204 No Content), renvoyer vide
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// MOCKS / DONNÉES TEMPORAIRES (si le backend est éteint)
const MOCK_ESTABLISHMENTS: Etablissement[] = [
  {
    id: 1,
    name: 'Le Bistrot Gourmet',
    category: 'restaurant',
    address: '8 Rue des Dames, Lyon',
    rating: '4.9',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
    badge: 'Restaurant'
  },
  {
    id: 2,
    name: "Hôtel & Spa L'Horizon",
    category: 'hotel',
    address: 'Promenade des Anglais, Nice',
    rating: '4.7',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
    badge: 'Hôtel'
  },
  {
    id: 3,
    name: "L'Atelier Coiffure & Barbe",
    category: 'beauty',
    address: '21 Boulevard Saint-Germain, Paris',
    rating: '4.9',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80',
    badge: 'Beauté'
  }
];

const MOCK_BOOKINGS: Booking[] = [
  {
    id: 1,
    establishment_name: 'Le Bistrot Gourmet',
    booking_date: '12/06/2026 à 20:00',
    status: 'success'
  },
  {
    id: 2,
    establishment_name: "L'Atelier Coiffure & Barbe",
    booking_date: '15/06/2026 à 14:30',
    status: 'pending'
  }
];

const getEstablishmentImage = (sectorName?: string) => {
  if (sectorName === 'Coiffure') return 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80';
  if (sectorName === 'Barbier') return 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80';
  if (sectorName === 'Massage & Bien-être') return 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80';
  if (sectorName === 'Beauté & Soins') return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80';
  if (sectorName === 'Restauration') return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80';
  if (sectorName === 'Hébergement') return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';
  if (sectorName === 'Voyages & Transports') return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80';
  return 'https://images.unsplash.com/photo-1521791136368-1a8b27526d5f?auto=format&fit=crop&w=600&q=80';
};

function mapBackendEtablissement(est: any): Etablissement {
  const sectorName = est.secteur?.nom || '';
  return {
    ...est,
    name: est.nom,
    category: sectorName,
    badge: sectorName,
    address: est.lieu ? `${est.lieu.adresse}, ${est.lieu.ville}` : '',
    rating: (4.5 + (est.id % 5) / 10).toFixed(1),
    image: getEstablishmentImage(sectorName)
  };
}

// SERVICES MÉTIERS EXPORTÉS
export const api = {
  establishments: {
    getPopular: async (category: string = 'all'): Promise<Etablissement[]> => {
      try {
        const data = await request<Etablissement[]>(`/api/popular-filter/?category=${category}`);
        // Corriger les chemins d'images relatifs en absolus/statiques si besoin
        return data.map(est => ({
          ...est,
          image: est.image.startsWith('http') ? est.image : `/static/${est.image}`
        }));
      } catch (error) {
        console.warn('API populaire indisponible, chargement des fausses données.', error);
        return category === 'all' 
          ? MOCK_ESTABLISHMENTS 
          : MOCK_ESTABLISHMENTS.filter(e => e.category === category);
      }
    },
    explore: async (filters: { query?: string; location?: string; sector?: string | number } = {}): Promise<Etablissement[]> => {
      try {
        const params = new URLSearchParams();
        if (filters.query) params.append('query', filters.query);
        if (filters.location) params.append('location', filters.location);
        if (filters.sector) params.append('sector', String(filters.sector));
        
        const queryString = params.toString();
        const url = `/api/establishments/explore/${queryString ? `?${queryString}` : ''}`;
        const response = await request<{ status: string; establishments: any[] }>(url);
        return response.establishments.map(mapBackendEtablissement);
      } catch (error) {
        console.warn('API explore indisponible, repli sur explore local.', error);
        let results = MOCK_ESTABLISHMENTS;
        if (filters.sector) {
          results = results.filter(e => e.category === filters.sector || e.badge === filters.sector);
        }
        if (filters.query) {
          results = results.filter(e => e.name.toLowerCase().includes(filters.query!.toLowerCase()));
        }
        if (filters.location) {
          results = results.filter(e => e.address.toLowerCase().includes(filters.location!.toLowerCase()));
        }
        return results;
      }
    }
  },

  sectors: {
    list: async (): Promise<Secteur[]> => {
      try {
        const response = await request<{ status: string; sectors: Secteur[] }>('/api/establishments/sectors/');
        return response.sectors;
      } catch (error) {
        console.warn('API sectors indisponible, chargement des faux secteurs.', error);
        return [
          { id: 1, nom: 'Coiffure' },
          { id: 2, nom: 'Beauté & Soins' },
          { id: 3, nom: 'Massage & Bien-être' },
          { id: 4, nom: 'Barbier' }
        ];
      }
    }
  },

  bookings: {
    list: async (): Promise<Booking[]> => {
      try {
        return await request<Booking[]>('/api/bookings/');
      } catch (error) {
        console.warn('API réservations indisponible, chargement des fausses données.', error);
        return MOCK_BOOKINGS;
      }
    },
    create: async (bookingData: Omit<Booking, 'id'>): Promise<Booking> => {
      try {
        return await request<Booking>('/api/bookings/', {
          method: 'POST',
          body: JSON.stringify(bookingData)
        });
      } catch (error) {
        console.warn('Création API impossible, simulation locale.', error);
        const newBooking: Booking = {
          id: Math.floor(Math.random() * 1000),
          ...bookingData
        };
        return newBooking;
      }
    }
  },

  auth: {
    getCurrentUser: async (): Promise<User | null> => {
      try {
        return await request<User>('/api/auth/user/');
      } catch {
        // En développement local sans backend connecté, on simule aucun utilisateur connecté par défaut
        return null;
      }
    },
    login: async (email: string, password_raw: string): Promise<User> => {
      // Simulation ou requête réelle
      try {
        return await request<User>('/api/auth/login/', {
          method: 'POST',
          body: JSON.stringify({ email, password: password_raw })
        });
      } catch (error) {
        // Si c'est une erreur HTTP explicite du backend (400 ou 401),
        // on la propage pour que le formulaire de connexion affiche l'erreur.
        if (error instanceof ApiError && (error.status === 400 || error.status === 401)) {
          throw error;
        }

        // Mock de connexion si le serveur est coupé
        if (email === 'admin') {
          return {
            id: 1,
            username: 'admin',
            email: 'admin@timely.fr',
            first_name: 'Sarah',
            last_name: 'Gérant',
            role: 'gerant'
          };
        }
        return {
          id: 2,
          username: email || 'client_test',
          email: `${email || 'client'}@example.com`,
          first_name: 'Utilisateur',
          last_name: 'Test',
          role: 'client'
        };
      }
    },
    register: async (email: string, password_raw: string, firstname: string, lastname: string): Promise<{ status: string; message: string }> => {
      return await request<{ status: string; message: string }>('/api/auth/register/', {
        method: 'POST',
        body: JSON.stringify({ email, password: password_raw, firstname, lastname })
      });
    },
    logout: async (): Promise<void> => {
      try {
        await request<void>('/api/auth/logout/', { method: 'POST' });
      } catch {
        console.warn('Déconnexion API impossible, simulation de déconnexion locale.');
      }
    }
  }
};

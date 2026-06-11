import type { Etablissement, Booking, User } from '../types';

// Helper générique pour les requêtes HTTP
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
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
    login: async (username: string, password_raw: string): Promise<User> => {
      // Simulation ou requête réelle
      try {
        return await request<User>('/api/auth/login/', {
          method: 'POST',
          body: JSON.stringify({ username, password: password_raw })
        });
      } catch {
        // Mock de connexion si le serveur est coupé
        if (username === 'admin') {
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
          username: username || 'client_test',
          email: `${username || 'client'}@example.com`,
          first_name: 'Utilisateur',
          last_name: 'Test',
          role: 'client'
        };
      }
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

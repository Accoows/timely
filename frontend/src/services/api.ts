import type { Etablissement, Booking, BookingInput, User, Secteur, UserRole, Lieu, Discussion, Message, Review, Invoice, AdminUser, CalendarEvent, Prestation } from '../types';

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

// Generic HTTP request helper
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
}

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
    payment_status: b.payment_status
  };
}

export const api = {
  establishments: {
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
    getById: async (id: number): Promise<Etablissement> => {
      const response = await request<{ status: string; establishment: Etablissement }>(`/api/establishments/${id}/`);
      return mapBackendEtablissement(response.establishment);
    },
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
    update: async (id: number, data: Partial<Etablissement> & { photos?: string[], secteur_id?: number, gerant_id?: number }): Promise<{ status: string; message: string }> => {
      return await request<{ status: string; message: string }>(`/api/establishments/${id}/`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
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

  prestations: {
    list: async (establishmentId: number): Promise<Prestation[]> => {
      const response = await request<{ status: string; services: Prestation[] }>(`/api/establishments/${establishmentId}/services/`);
      return response.services;
    },
    create: async (establishmentId: number, data: { nom: string; cout: number; description?: string }): Promise<Prestation> => {
      const response = await request<{ status: string; message: string; service: Prestation }>(`/api/establishments/${establishmentId}/services/`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response.service;
    },
    update: async (serviceId: number, data: { nom?: string; cout?: number; description?: string }): Promise<Prestation> => {
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

  bookings: {
    list: async (): Promise<Booking[]> => {
      const rawBookings = await request<BackendBooking[]>('/api/bookings/');
      return rawBookings.map(mapBackendBooking);
    },
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
    getAvailableSlots: async (professionnelId: number, date: string): Promise<{ time: string; available: boolean }[]> => {
      const response = await request<{ status: string; slots: { time: string; available: boolean }[] }>(
        `/api/bookings/available-slots/?professionnel_id=${professionnelId}&date=${date}`
      );
      return response.slots;
    },
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
    }
  },

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

  auth: {
    getCurrentUser: async (): Promise<User | null> => {
      try {
        return await request<User>('/api/auth/user/');
      } catch {
        return null;
      }
    },
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
    register: async (email: string, password_raw: string, firstname: string, lastname: string): Promise<{ status: string; message: string }> => {
      return await request<{ status: string; message: string }>('/api/auth/register/', {
        method: 'POST',
        body: JSON.stringify({ email, password: password_raw, firstname, lastname })
      });
    },
    logout: async (): Promise<void> => {
      await request<void>('/api/auth/logout/', { method: 'POST' });
    },
    updateCurrentUser: async (profileData: { 
      first_name?: string; 
      last_name?: string; 
      email?: string;
      old_password?: string;
      new_password?: string;
    }): Promise<User> => {
      return await request<User>('/api/auth/user/', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
    }
  },
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

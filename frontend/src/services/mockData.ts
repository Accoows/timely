import type { Etablissement, Booking, Secteur, Lieu, User } from '../types';

// Remplacer ENABLE_MOCKS par false pour désactiver tous les mocks du front
export const ENABLE_MOCKS = true;

export const MOCK_ESTABLISHMENTS: Etablissement[] = [
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

export const MOCK_BOOKINGS: Booking[] = [
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

export const MOCK_SECTORS: Secteur[] = [
  { id: 1, nom: 'Coiffure' },
  { id: 2, nom: 'Beauté & Soins' },
  { id: 3, nom: 'Massage & Bien-être' },
  { id: 4, nom: 'Barbier' }
];

export const MOCK_LOCATIONS: Lieu[] = [
  { id: 1, adresse: '8 Rue des Dames', ville: 'Lyon', code_postal: '69006', region: 'Auvergne-Rhône-Alpes' },
  { id: 2, adresse: '12 Rue de la Paix', ville: 'Paris', code_postal: '75002', region: 'Île-de-France' },
  { id: 3, adresse: '21 Boulevard Saint-Germain', ville: 'Paris', code_postal: '75005', region: 'Île-de-France' },
  { id: 4, adresse: '101 Rue Saint-Ferréol', ville: 'Marseille', code_postal: '13006', region: "Provence-Alpes-Côte d'Azur" },
  { id: 5, adresse: 'Promenade des Anglais', ville: 'Nice', code_postal: '06000', region: "Provence-Alpes-Côte d'Azur" }
];

export const MOCK_ADMIN_USER: User = {
  id: 1,
  username: 'admin',
  email: 'admin@timely.fr',
  first_name: 'Sarah',
  last_name: 'Gérant',
  role: 'gerant'
};

export const getMockClientUser = (email: string): User => ({
  id: 2,
  username: email || 'client_test',
  email: `${email || 'client'}@example.com`,
  first_name: 'Utilisateur',
  last_name: 'Test',
  role: 'client'
});

export const PROFILE_SEED_ENABLED = false; // Changez à false pour masquer le seed et tester les états vides !

export interface FavoriteSeed {
  id: number;
  name: string;
  badge: string;
  address: string;
  rating: string;
  image: string;
}

export interface BookingSeed {
  id: number;
  establishment_name: string;
  booking_date: string;
  status: 'success' | 'pending';
}

export interface InvoiceSeed {
  id: number;
  reference: string;
  establishment_name: string;
  date: string;
  amount: string;
  status: 'success' | 'pending';
}

export const FAVORITES_SEED: FavoriteSeed[] = [
  {
    id: 1,
    name: 'Le Bistrot Gourmet',
    badge: 'Restauration',
    address: '8 Rue des Dames, Lyon',
    rating: '4.9',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 3,
    name: "L'Atelier Coiffure & Barbe",
    badge: 'Coiffure',
    address: '21 Boulevard Saint-Germain, Paris',
    rating: '4.9',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80'
  }
];

export const BOOKINGS_SEED: BookingSeed[] = [
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

export const INVOICES_SEED: InvoiceSeed[] = [
  {
    id: 1,
    reference: '#FAC-2026-001',
    establishment_name: 'Le Bistrot Gourmet',
    date: '12/06/2026',
    amount: '45,00 €',
    status: 'success'
  },
  {
    id: 2,
    reference: '#FAC-2026-002',
    establishment_name: "L'Atelier Coiffure & Barbe",
    date: '15/06/2026',
    amount: '28,00 €',
    status: 'pending'
  }
];

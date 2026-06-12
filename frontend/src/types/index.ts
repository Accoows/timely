export type UserRole = 'client' | 'gerant' | 'professionnel' | 'admin';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

export interface Etablissement {
  id: number;
  name: string;
  category: string;
  address: string;
  rating: string;
  image: string;
  badge: string;
}

export interface Booking {
  id: number;
  establishment_name: string;
  booking_date: string;
  status: 'pending' | 'success' | 'cancelled';
}

export interface Discussion {
  id: number;
  last_message_at: string;
  unread_count: number;
}

export interface Message {
  id: number;
  discussion_id: number;
  sender_id: number;
  content: string;
  created_at: string;
}

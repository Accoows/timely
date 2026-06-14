import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import Button from '../../components/Button';
import ProfileTab from './components/ProfileTab';
import BookingsTab from './components/BookingsTab';
import FavoritesTab from './components/FavoritesTab';
import InvoicesTab from './components/InvoicesTab';
import Alert from '../../components/Alert';
import {
  PROFILE_SEED_ENABLED,
  FAVORITES_SEED,
  BOOKINGS_SEED,
  INVOICES_SEED,
  type FavoriteSeed,
  type BookingSeed,
  type InvoiceSeed
} from './seedData';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

export default function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'bookings' | 'favorites' | 'invoices'>('profile');
  
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<BookingSeed[]>(PROFILE_SEED_ENABLED ? BOOKINGS_SEED : []);
  const [favorites, setFavorites] = useState<FavoriteSeed[]>(PROFILE_SEED_ENABLED ? FAVORITES_SEED : []);
  const [invoices] = useState<InvoiceSeed[]>(PROFILE_SEED_ENABLED ? INVOICES_SEED : []);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      onNavigate('login');
    }
  }, [user, onNavigate]);

  // Load real API bookings and favorites
  useEffect(() => {
    if (!user) return;

    if (activeTab === 'bookings') {
      api.bookings.list()
        .then(data => {
          setBookings(data as BookingSeed[]);
        })
        .catch(err => {
          console.error("Error fetching bookings:", err);
          setError("Impossible de charger vos rendez-vous.");
        });
    } else if (activeTab === 'favorites') {
      api.favorites.list()
        .then(data => {
          setFavorites(data as FavoriteSeed[]);
        })
        .catch(err => {
          console.error("Error fetching favorites:", err);
          setError("Impossible de charger vos favoris.");
        });
    }
  }, [user, activeTab]);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
      onNavigate('home');
    } catch {
      setError('Impossible de se déconnecter. Veuillez réessayer.');
    }
  };

  const handleRemoveFavorite = async (id: number) => {
    try {
      await api.favorites.remove(id);
      setFavorites(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error("Error removing favorite:", err);
      setError("Impossible de retirer cet établissement de vos favoris.");
    }
  };

  const menuItems: { id: 'profile' | 'bookings' | 'favorites' | 'invoices'; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Mon compte', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    )},
    { id: 'bookings', label: 'Mes Rendez-vous', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
      </svg>
    )},
    { id: 'favorites', label: 'Mes favoris', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    )},
    { id: 'invoices', label: 'Mes factures', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    )}
  ];

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto py-12 px-4">
      {/* Title */}
      <div className="mb-10 text-left">
        <h1 className="text-4xl font-black text-neutral-900 tracking-tight uppercase">Espace Client</h1>
        <p className="text-neutral-500 text-sm mt-2">
          Gérez votre profil, vos rendez-vous ainsi que vos factures depuis cet espace dédié.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar (Menu) */}
        <aside className="w-full lg:w-1/4 flex flex-col gap-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setError('');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left font-bold text-sm border-2 rounded-xl transition-all select-none cursor-pointer focus:outline-none ${
                activeTab === item.id
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]'
                  : 'border-neutral-900 bg-white text-neutral-800 hover:bg-neutral-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-left font-bold text-sm border-2 rounded-xl border-red-600 bg-white text-red-600 hover:bg-red-50 transition-all select-none cursor-pointer focus:outline-none shadow-[3px_3px_0px_0px_rgba(220,38,38,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(220,38,38,1)]"
          >
            <span className="shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
            </span>
            <span>Déconnexion</span>
          </button>
          
          <div className="h-[2px] bg-neutral-200 my-4"></div>

          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigate('home')}
            size="md"
            fullWidth
          >
            Retour à l'accueil
          </Button>
        </aside>

        {/* Content Box */}
        <main className="w-full lg:w-3/4 bg-white border-2 border-neutral-900 p-6 sm:p-8 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          {error && <Alert type="error" message={error} className="mb-6" />}

          {activeTab === 'profile' && <ProfileTab user={user} updateUser={updateUser} />}
          {activeTab === 'bookings' && <BookingsTab bookings={bookings} onNavigate={onNavigate} />}
          {activeTab === 'favorites' && <FavoritesTab favorites={favorites} onRemoveFavorite={handleRemoveFavorite} onNavigate={onNavigate} />}
          {activeTab === 'invoices' && <InvoicesTab invoices={invoices} onNavigate={onNavigate} />}
        </main>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import Button from '../../components/Button';
import ProfileTab from './components/ProfileTab';
import BookingsTab from './components/BookingsTab';
import FavoritesTab from './components/FavoritesTab';
import MessagesTab from './components/MessagesTab';
import InvoicesTab from './components/InvoicesTab';
import ReviewsTab from './components/ReviewsTab';
import Alert from '../../components/Alert';
import EstablishmentTab from './components/EstablishmentTab';
import NewProAccountTab from './components/NewProAccountTab';
import type { Booking, Etablissement, Invoice } from '../../types';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

export default function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, updateUser, logout } = useAuth();
  // --- GESTION DES ONGLETS (TABS) ---
  // Initialisation paresseuse (lazy initialization) qui lit l'URL au premier rendu
  // pour voir si on doit ouvrir un onglet spécifique (ex: retour de Stripe -> ?tab=bookings)
  const [activeTab, setActiveTab] = useState<'profile' | 'bookings' | 'favorites' | 'messages' | 'invoices' | 'reviews' | 'establishment' | 'new-pro-account'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'bookings' || tabParam === 'invoices') {
      return tabParam;
    }
    return 'profile';
  });
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [favorites, setFavorites] = useState<Etablissement[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payLoadingId, setPayLoadingId] = useState<number | null>(null);

  /**
   * Initialise le processus de paiement Stripe.
   * L'API génère une URL de "Checkout Session" temporaire et on redirige 
   * directement le navigateur de l'utilisateur vers cette URL sécurisée.
   */
  const handlePay = async (bookingId: number) => {
    try {
      setPayLoadingId(bookingId);
      const url = await api.bookings.getCheckoutUrl(bookingId);
      window.location.assign(url);
    } catch (err) {
      console.error(err);
      setError("Impossible de démarrer le paiement.");
    } finally {
      setPayLoadingId(null);
    }
  };

  // --- SÉCURITÉ ---
  // Si le composant est monté (ex: retour direct via URL) mais que l'utilisateur 
  // n'est pas/plus authentifié, on force la redirection vers la page de connexion.
  useEffect(() => {
    if (!user) {
      onNavigate('login');
    }
  }, [user, onNavigate]);

  // --- VÉRIFICATION GLOBALE DES PAIEMENTS EN ATTENTE ---
  // S'exécute toujours, peu importe l'onglet, pour pouvoir afficher
  // le bandeau jaune d'alerte si un RDV Stripe récent n'est pas encore payé.
  useEffect(() => {
    if (!user) return;
    api.bookings.list()
      .then(data => {
        setBookings(data);
      })
      .catch(err => {
        console.error("Error fetching bookings:", err);
      });
  }, [user]);

  // --- CHARGEMENT PARESSEUX DES DONNÉES (LAZY LOADING) ---
  // On ne fait des requêtes réseau que si l'utilisateur visite effectivement l'onglet concerné.
  useEffect(() => {
    if (!user) return;

    if (activeTab === 'bookings') {
      api.bookings.list()
        .then(data => {
          setBookings(data);
        })
        .catch(err => {
          console.error("Error fetching bookings:", err);
          setError("Impossible de charger vos rendez-vous.");
        });
    } else if (activeTab === 'favorites') {
      api.favorites.list()
        .then(data => {
          setFavorites(data);
        })
        .catch(err => {
          console.error("Error fetching favorites:", err);
          setError("Impossible de charger vos favoris.");
        });
    } else if (activeTab === 'invoices') {
      api.bookings.getInvoices()
        .then(data => {
          setInvoices(data);
        })
        .catch(err => {
          console.error("Error fetching invoices:", err);
        });
    }
  }, [user, activeTab]);

  // Redirect from establishment tab if user is no longer a gerant
  useEffect(() => {
    if (activeTab === 'establishment' && user?.role !== 'gerant') {
      Promise.resolve().then(() => {
        setActiveTab('profile');
      });
    }
  }, [user?.role, activeTab]);

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

  const handleRefreshBookings = () => {
    if (!user) return;
    api.bookings.list()
      .then(data => {
        setBookings(data);
      })
      .catch(err => {
        console.error("Error fetching bookings:", err);
        setError("Impossible de charger vos rendez-vous.");
      });
  };

  const menuItems: { id: 'profile' | 'bookings' | 'favorites' | 'messages' | 'invoices' | 'reviews' | 'establishment' | 'new-pro-account'; label: string; icon: React.ReactNode }[] = [
    {
      id: 'profile', label: 'Mon compte', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      )
    },
    {
      id: 'bookings', label: 'Mes Rendez-vous', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      )
    },
    {
      id: 'favorites', label: 'Mes favoris', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      )
    },
    {
      id: 'messages', label: 'Mes messages', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.007-.018.01-.037.01-.057V5.25A2.25 2.25 0 0 0 18 3H6A2.25 2.25 0 0 0 3.75 5.25v11.25A2.25 2.25 0 0 0 6 18.75h3.03l4.58 3.61a.75.75 0 0 0 1.22-.58v-3.03h3.19a2.25 2.25 0 0 0 2.24-2.09l.02-8.12a.748.748 0 0 0-.02-.12Z" />
        </svg>
      )
    },
    {
      id: 'invoices', label: 'Mes factures', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      )
    },
    {
      id: 'reviews', label: 'Mes avis', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.173-.439.81-.439.98 0l1.83 4.538a.5.5 0 0 0 .378.337l4.885.509c.477.05.667.664.294.975l-3.71 3.07a.5.5 0 0 0-.144.493l1.1 4.792c.11.482-.428.902-.823.593L12 18.006l-4.225 2.516c-.395.309-.933-.11-.823-.593l1.1-4.792a.5.5 0 0 0-.144-.493l-3.71-3.07a.5.5 0 0 1 .294-.975l4.885-.509a.5.5 0 0 0 .378-.337l1.83-4.538Z" />
        </svg>
      )
    }
  ];

  if (user.role === 'gerant') {
    menuItems.push({
      id: 'establishment',
      label: 'Mon Établissement',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A11.952 11.952 0 0 1 12 15c-2.998 0-5.74-1.1-7.843-2.918m0 0A8.959 8.959 0 0 1 3 12c0-.778.099-1.533.284-2.253" />
        </svg>
      )
    });
    menuItems.push({
      id: 'new-pro-account',
      label: 'Nouveau compte pro',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0zM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
        </svg>
      )
    });
  }

  const pendingPaymentBooking = bookings.find(b => b.payment_method === 'stripe' && b.payment_status !== 'paid');

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
              className={`w-full flex items-center gap-3 px-4 py-3 text-left font-bold text-sm border-2 rounded-xl transition-all select-none cursor-pointer focus:outline-none ${activeTab === item.id
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

          {pendingPaymentBooking && (
            <div className="mb-6 p-4 border-2 border-neutral-900 bg-amber-50 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-amber-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-amber-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  Paiement en attente
                </h4>
                <p className="text-xs text-neutral-700 mt-1 font-semibold">
                  Votre rendez-vous chez <strong className="text-neutral-950 font-black">{pendingPaymentBooking.establishment_name}</strong> le {pendingPaymentBooking.booking_date} n'est pas encore réglé.
                </p>
              </div>
              <button
                onClick={() => handlePay(pendingPaymentBooking.id)}
                disabled={payLoadingId === pendingPaymentBooking.id}
                className="shrink-0 px-4 py-2 border-2 border-neutral-900 bg-amber-100 hover:bg-amber-200 text-neutral-900 font-black rounded-lg text-xs uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-0 active:translate-x-0 cursor-pointer disabled:opacity-50"
              >
                {payLoadingId === pendingPaymentBooking.id ? "Redirection..." : "Payer maintenant"}
              </button>
            </div>
          )}

          {activeTab === 'profile' && <ProfileTab user={user} updateUser={updateUser} onNavigate={onNavigate} />}
          {activeTab === 'bookings' && <BookingsTab bookings={bookings} onNavigate={onNavigate} onRefreshBookings={handleRefreshBookings} />}
          {activeTab === 'favorites' && <FavoritesTab favorites={favorites} onRemoveFavorite={handleRemoveFavorite} onNavigate={onNavigate} />}
          {activeTab === 'messages' && <MessagesTab onNavigate={onNavigate} />}
          {activeTab === 'invoices' && <InvoicesTab invoices={invoices} onNavigate={onNavigate} />}
          {activeTab === 'reviews' && <ReviewsTab onNavigate={onNavigate} />}
          {activeTab === 'establishment' && <EstablishmentTab user={user} updateUser={updateUser} onNavigate={onNavigate} />}
          {activeTab === 'new-pro-account' && <NewProAccountTab user={user} />}
        </main>
      </div>
    </div>
  );
}

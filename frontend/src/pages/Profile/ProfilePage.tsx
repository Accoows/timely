import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
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
  
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // States initialized from seedData based on configurations
  const [bookings] = useState<BookingSeed[]>(PROFILE_SEED_ENABLED ? BOOKINGS_SEED : []);
  const [favorites, setFavorites] = useState<FavoriteSeed[]>(PROFILE_SEED_ENABLED ? FAVORITES_SEED : []);
  const [invoices] = useState<InvoiceSeed[]>(PROFILE_SEED_ENABLED ? INVOICES_SEED : []);

  // Password fields state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      onNavigate('login');
    }
  }, [user, onNavigate]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updated = await api.auth.updateCurrentUser({
        first_name: firstName,
        last_name: lastName,
        email: email
      });
      updateUser(updated);
      setSuccess('Profil mis à jour avec succès !');
    } catch {
      setError('Une erreur est survenue lors de la mise à jour (l\'adresse e-mail est peut-être déjà utilisée).');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onNavigate('home');
    } catch {
      setError('Impossible de se déconnecter. Veuillez réessayer.');
    }
  };

  const handleRemoveFavorite = (id: number) => {
    // Allows interaction with favorites list in real time
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit faire au moins 6 caractères.');
      return;
    }

    setPasswordLoading(true);

    try {
      await api.auth.updateCurrentUser({
        old_password: oldPassword,
        new_password: newPassword
      });
      setPasswordSuccess('Votre mot de passe a été modifié avec succès !');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '';
      if (errorMsg.includes('incorrect')) {
        setPasswordError("L'ancien mot de passe est incorrect.");
      } else {
        setPasswordError("Une erreur est survenue lors de la modification du mot de passe (vérifiez votre ancien mot de passe).");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'gerant':
        return "Gérant d'établissement";
      case 'professionnel':
        return 'Professionnel';
      case 'admin':
        return 'Administrateur';
      default:
        return 'Client';
    }
  };

  const renderEmptyState = (title: string, description: string, icon: React.ReactNode) => (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed border-neutral-300 rounded-2xl bg-neutral-50/50">
      <div className="p-4 bg-white border-2 border-neutral-900 rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-neutral-900 mb-5">
        {icon}
      </div>
      <h3 className="text-lg font-black text-neutral-900 uppercase tracking-tight mb-2">{title}</h3>
      <p className="text-neutral-500 text-xs max-w-sm mb-6 font-semibold leading-relaxed">{description}</p>
      <Button variant="outline" onClick={() => onNavigate('home')} size="sm">
        Découvrir les établissements
      </Button>
    </div>
  );

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
                setSuccess('');
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
          
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-2xl font-black text-neutral-900 uppercase mb-6 pb-2 border-b-2 border-neutral-100">Mon Compte</h2>
              
              {error && (
                <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-900 text-rose-950 text-sm font-semibold rounded-xl flex items-start gap-2 animate-shake">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-900 text-emerald-950 text-sm font-semibold rounded-xl flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Prénom"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Arthur"
                  />
                  <InputField
                    label="Nom"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Gonzales"
                  />
                </div>

                <InputField
                  label="Adresse e-mail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="arthur.gonzales@example.com"
                />

                <div>
                  <label className="block text-sm font-bold text-neutral-900 mb-2">
                    Type de compte / Rôle
                  </label>
                  <div className="px-4 py-3 bg-neutral-50 border-2 border-neutral-900 text-neutral-700 text-sm rounded-xl font-bold select-none">
                    {getRoleLabel(user.role)}
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    loading={loading}
                    size="md"
                  >
                    Enregistrer les modifications
                  </Button>
                </div>
              </form>

              {/* Password change section */}
              <h3 className="text-xl font-black text-neutral-900 uppercase mt-12 mb-6 pb-2 border-b-2 border-neutral-100">
                Sécurité / Modifier le mot de passe
              </h3>

              {passwordError && (
                <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-900 text-rose-950 text-sm font-semibold rounded-xl flex items-start gap-2 animate-shake">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-900 text-emerald-950 text-sm font-semibold rounded-xl flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <InputField
                  label="Ancien mot de passe"
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Nouveau mot de passe"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <InputField
                    label="Confirmer le nouveau mot de passe"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    loading={passwordLoading}
                    size="md"
                  >
                    Enregistrer le nouveau mot de passe
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: BOOKINGS */}
          {activeTab === 'bookings' && (
            <div>
              <h2 className="text-2xl font-black text-neutral-900 uppercase mb-6 pb-2 border-b-2 border-neutral-100">Mes Rendez-vous</h2>
              
              {bookings.length === 0 ? (
                renderEmptyState(
                  "Aucun rendez-vous planifié",
                  "Vous n'avez aucun rendez-vous à venir. Explorez les professionnels à proximité pour bloquer votre premier créneau.",
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
                  </svg>
                )
              ) : (
                <div className="space-y-4">
                  {bookings.map(booking => (
                    <div 
                      key={booking.id} 
                      className="border-2 border-neutral-900 rounded-xl p-4 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="font-extrabold text-neutral-900 text-lg">{booking.establishment_name}</h4>
                        <p className="text-sm text-neutral-500 mt-1 flex items-center gap-1.5 font-semibold">
                          <svg className="w-4 h-4 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                          </svg>
                          {booking.booking_date}
                        </p>
                      </div>
                      <div>
                        <span className={`inline-block px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-neutral-900 rounded-md ${
                          booking.status === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {booking.status === 'success' ? 'Confirmé' : 'En attente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FAVORITES */}
          {activeTab === 'favorites' && (
            <div>
              <h2 className="text-2xl font-black text-neutral-900 uppercase mb-6 pb-2 border-b-2 border-neutral-100">Mes Favoris</h2>
              
              {favorites.length === 0 ? (
                renderEmptyState(
                  "Aucun favori enregistré",
                  "Ajoutez des établissements à vos coups de cœur pour les retrouver facilement et planifier vos visites plus rapidement.",
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                  </svg>
                )
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {favorites.map(est => (
                    <div 
                      key={est.id} 
                      className="border-2 border-neutral-900 rounded-xl overflow-hidden bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col hover:translate-y-[-2px] transition-transform"
                    >
                      <div className="h-40 bg-neutral-100 relative border-b-2 border-neutral-900">
                        <img src={est.image} alt={est.name} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => handleRemoveFavorite(est.id)}
                          className="absolute top-2 right-2 p-1.5 bg-white border-2 border-neutral-900 rounded-full text-red-600 hover:scale-110 transition-transform cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                        </button>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider bg-neutral-900 text-white px-2 py-0.5 rounded border border-neutral-900">
                            {est.badge}
                          </span>
                          <h4 className="font-extrabold text-neutral-900 mt-2 text-base line-clamp-1">{est.name}</h4>
                          <p className="text-xs text-neutral-500 font-semibold mt-1 line-clamp-1">{est.address}</p>
                        </div>
                        <div className="mt-4 pt-3 border-t-2 border-neutral-100 flex items-center justify-between text-xs font-black">
                          <span className="flex items-center gap-1">⭐ {est.rating}</span>
                          <button 
                            onClick={() => onNavigate('home')} 
                            className="text-neutral-950 hover:underline bg-transparent border-none p-0 cursor-pointer font-black"
                          >
                            Réserver
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INVOICES */}
          {activeTab === 'invoices' && (
            <div>
              <h2 className="text-2xl font-black text-neutral-900 uppercase mb-6 pb-2 border-b-2 border-neutral-100">Mes Factures</h2>
              
              {invoices.length === 0 ? (
                renderEmptyState(
                  "Aucune facture émise",
                  "Toutes vos factures de prestations et d'achats apparaîtront ici dès que vos premiers règlements auront été validés.",
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                )
              ) : (
                <div className="overflow-x-auto border-2 border-neutral-900 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <table className="w-full text-left border-collapse bg-white">
                    <thead>
                      <tr className="bg-neutral-950 text-white text-xs font-black uppercase tracking-wider border-b-2 border-neutral-900">
                        <th className="p-4">Référence</th>
                        <th className="p-4">Établissement</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Montant</th>
                        <th className="p-4">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-neutral-900 text-sm font-bold text-neutral-700">
                      {invoices.map(invoice => (
                        <tr key={invoice.id} className="hover:bg-neutral-50">
                          <td className="p-4 font-black text-neutral-900">{invoice.reference}</td>
                          <td className="p-4">{invoice.establishment_name}</td>
                          <td className="p-4 font-semibold text-neutral-500">{invoice.date}</td>
                          <td className="p-4 font-black text-neutral-900">{invoice.amount}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase border-2 border-neutral-900 rounded ${
                              invoice.status === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                            }`}>
                              {invoice.status === 'success' ? 'Payé' : 'En attente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

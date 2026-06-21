import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import type { AdminUser, Etablissement, Secteur, Review, CalendarEvent, Prestation } from '../../types';
import Alert from '../../components/Alert';

function getErrorMessage(err: unknown, defaultMsg: string): string {
  if (err instanceof Error) return err.message;
  return defaultMsg;
}

type TabType = 'users' | 'establishments' | 'reviews' | 'calendar';

interface AdminDashboardProps {
  onNavigate?: (page: string) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  // État gérant l'onglet actuellement affiché (Utilisateurs, Établissements, Avis, Calendrier)
  const [activeTab, setActiveTab] = useState<TabType>('users');
  
  // -- Données principales chargées depuis l'API --
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [establishments, setEstablishments] = useState<Etablissement[]>([]);
  const [sectors, setSectors] = useState<Secteur[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  
  // -- État global de chargement et d'erreurs --
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter States
  const [userSearch, setUserSearch] = useState('');
  const [reviewSearch, setReviewSearch] = useState('');
  const [calendarSearch, setCalendarSearch] = useState('');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('all');
  
  // Modals & Edit States
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editingEstablishment, setEditingEstablishment] = useState<Etablissement | null>(null);
  
  // Inner Establishment Prestations State
  const [establishmentPrestations, setEstablishmentPrestations] = useState<Prestation[]>([]);
  const [newPrestationNom, setNewPrestationNom] = useState('');
  const [newPrestationCout, setNewPrestationCout] = useState('');
  const [newPrestationDesc, setNewPrestationDesc] = useState('');
  const [editingPrestationId, setEditingPrestationId] = useState<number | null>(null);

  // On utilise useCallback pour éviter que cette fonction ne soit recréée à chaque rendu,
  // ce qui créerait des boucles infinies dans le useEffect.
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // On ne charge QUE les données nécessaires à l'onglet actif pour optimiser le réseau.
      if (activeTab === 'users') {
        const uList = await api.admin.users.list();
        setUsers(uList);
        const eList = await api.establishments.explore();
        setEstablishments(eList);
      } else if (activeTab === 'establishments') {
        const eList = await api.establishments.explore();
        setEstablishments(eList);
        const sList = await api.sectors.list();
        setSectors(sList);
        // On a besoin de la liste des utilisateurs pour potentiellement lier un gérant à un établissement
        const uList = await api.admin.users.list();
        setUsers(uList);
      } else if (activeTab === 'reviews') {
        const rList = await api.admin.reviews.list();
        setReviews(rList);
      } else if (activeTab === 'calendar') {
        const cList = await api.admin.calendar.list();
        setCalendarEvents(cList);
        const eList = await api.establishments.explore();
        setEstablishments(eList);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Une erreur est survenue lors du chargement des données.'));
    } finally {
      setLoading(false); // Quoi qu'il arrive (succès ou erreur), on arrête le loader
    }
  }, [activeTab]);

  // Déclencheur automatique : à chaque fois que `fetchData` change 
  // (donc quand `activeTab` change, vu les dépendances de useCallback), on recharge.
  useEffect(() => {
    let active = true; // Empêche la mise à jour de l'état si le composant est démonté avant la fin de la requête
    const load = async () => {
      await Promise.resolve(); // Laisse le cycle de rendu React se terminer avant de lancer le fetch
      if (active) {
        fetchData();
      }
    };
    load();
    return () => {
      active = false; // Cleanup component unmount
    };
  }, [fetchData]);

  // --- ACTIONS SUR LES UTILISATEURS ---
  
  /**
   * Bloque ou débloque un utilisateur.
   * L'interface se met à jour localement immédiatement via `setUsers` pour être réactive (optimistic UI),
   * sans attendre de recharger toute la liste via l'API.
   */
  const handleToggleUserStatus = async (user: AdminUser) => {
    try {
      await api.admin.users.update(user.id, { is_active: !user.is_active });
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Impossible de mettre à jour le statut.'));
    }
  };

  /**
   * Promeut ou rétrograde un utilisateur (ex: de client à gérant).
   * Si c'est un rôle pro, on transmet aussi l'ID de l'établissement rattaché.
   */
  const handleUpdateUserRole = async (userId: number, role: string, establishmentId?: number, poste?: string, description?: string) => {
    try {
      await api.admin.users.update(userId, { 
        role, 
        etablissement_id: establishmentId,
        poste,
        description 
      });
      alert('Rôle mis à jour avec succès.');
      setEditingUser(null);
      fetchData(); // On recharge les données depuis le serveur pour être sûr de l'état
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Impossible de modifier le rôle.'));
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?')) return;
    try {
      await api.admin.users.delete(userId);
      setUsers(users.filter(u => u.id !== userId));
      alert('Utilisateur supprimé.');
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Impossible de supprimer l\'utilisateur.'));
    }
  };

  // --- ACTIONS SUR LES ÉTABLISSEMENTS ---
  
  /**
   * Ouvre la modale d'édition d'un établissement.
   * Déclenche immédiatement un fetch annexe pour récupérer les prestations liées 
   * à cet établissement spécifique afin de pouvoir les gérer dans la même modale.
   */
  const handleOpenEditEstablishment = async (etab: Etablissement) => {
    setEditingEstablishment(etab);
    setLoading(true);
    try {
      const services = await api.prestations.list(etab.id);
      setEstablishmentPrestations(services);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Soumission du formulaire de mise à jour d'un établissement.
   * On reconstruit un objet "data" propre pour s'assurer que le backend reçoive
   * exactement les champs attendus, et on recharge la liste complète (`fetchData()`) en cas de succès.
   */
  const handleUpdateEstablishment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEstablishment) return;
    
    try {
      const data = {
        nom: editingEstablishment.nom,
        description: editingEstablishment.description,
        telephone: editingEstablishment.telephone,
        mail: editingEstablishment.mail,
        site_web: editingEstablishment.site_web,
        secteur_id: editingEstablishment.secteur?.id,
        gerant_id: editingEstablishment.gerant?.id,
        lieu: editingEstablishment.lieu,
        horaires: editingEstablishment.horaires
      };
      await api.establishments.update(editingEstablishment.id, data);
      alert('Établissement mis à jour avec succès.');
      setEditingEstablishment(null);
      fetchData();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Impossible de modifier l\'établissement.'));
    }
  };

  /**
   * Suppression définitive d'un établissement (et CASCADE potentielle côté backend).
   * Mise à jour optimiste via `filter` pour ne pas recharger toute la liste.
   */
  const handleDeleteEstablishment = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet établissement et toutes ses données rattachées ?')) return;
    try {
      await api.establishments.delete(id);
      setEstablishments(establishments.filter(e => e.id !== id));
      alert('Établissement supprimé.');
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Impossible de supprimer.'));
    }
  };

  // --- ACTIONS SUR LES PRESTATIONS (DEPUIS LA MODALE D'EDITION D'ETABLISSEMENT) ---
  
  /**
   * Ajoute une prestation à la volée. 
   * Au lieu de re-fetch, on ajoute la réponse du backend au state local `establishmentPrestations`
   * et on vide les champs du formulaire.
   */
  const handleAddPrestation = async () => {
    if (!editingEstablishment || !newPrestationNom || !newPrestationCout) return;
    try {
      const newService = await api.prestations.create(editingEstablishment.id, {
        nom: newPrestationNom,
        cout: parseFloat(newPrestationCout),
        description: newPrestationDesc
      });
      setEstablishmentPrestations([...establishmentPrestations, newService]);
      setNewPrestationNom('');
      setNewPrestationCout('');
      setNewPrestationDesc('');
      alert('Prestation ajoutée.');
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Erreur lors de l\'ajout de la prestation.'));
    }
  };

  /**
   * Met à jour une prestation et remplace l'ancienne dans le tableau local via `.map()`.
   */
  const handleUpdatePrestation = async (serviceId: number, nom: string, cout: number, description: string) => {
    try {
      const updated = await api.prestations.update(serviceId, { nom, cout, description });
      setEstablishmentPrestations(establishmentPrestations.map(p => p.id === serviceId ? updated : p));
      setEditingPrestationId(null);
      alert('Prestation modifiée.');
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Erreur lors de la modification.'));
    }
  };

  /**
   * Supprime une prestation du tableau local via `.filter()`.
   */
  const handleDeletePrestation = async (serviceId: number) => {
    if (!confirm('Supprimer cette prestation ?')) return;
    try {
      await api.prestations.delete(serviceId);
      setEstablishmentPrestations(establishmentPrestations.filter(p => p.id !== serviceId));
      alert('Prestation supprimée.');
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Erreur lors de la suppression.'));
    }
  };

  // --- ACTIONS SUR LES AVIS (MODÉRATION) ---
  
  /**
   * Modération d'un avis frauduleux ou injurieux.
   */
  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Supprimer définitivement cet avis ?')) return;
    try {
      await api.admin.reviews.delete(reviewId);
      setReviews(reviews.filter(r => r.id !== reviewId));
      alert('Avis supprimé.');
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Erreur de suppression.'));
    }
  };

  // --- CALENDAR ACTIONS ---
  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Annuler définitivement ce rendez-vous ?')) return;
    try {
      await api.bookings.cancel(bookingId);
      setCalendarEvents(calendarEvents.filter(e => e.id !== bookingId));
      alert('Rendez-vous annulé.');
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Impossible d\'annuler le rendez-vous.'));
    }
  };

  // Helper filters
  const filteredUsers = users.filter(u => {
    const term = userSearch.toLowerCase();
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    return u.username.toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || fullName.includes(term);
  });

  const filteredReviews = reviews.filter(r => {
    const term = reviewSearch.toLowerCase();
    const clientName = r.client ? `${r.client.first_name} ${r.client.last_name}`.toLowerCase() : '';
    const etabName = r.etablissement?.nom.toLowerCase() || '';
    return r.message.toLowerCase().includes(term) || clientName.includes(term) || etabName.includes(term);
  });

  const filteredCalendar = calendarEvents.filter(e => {
    const term = calendarSearch.toLowerCase();
    const clientName = e.client ? e.client.nom_complet.toLowerCase() : '';
    const proName = e.professionnel ? e.professionnel.nom_complet.toLowerCase() : '';
    const title = e.title.toLowerCase();
    return title.includes(term) || clientName.includes(term) || proName.includes(term);
  });

  // Group Establishments by Sector
  const groupedEstablishments: Record<string, Etablissement[]> = {};
  establishments.forEach(e => {
    const sectorName = e.secteur?.nom || 'Sans secteur';
    if (selectedSectorFilter !== 'all' && sectorName !== selectedSectorFilter) {
      return;
    }
    if (!groupedEstablishments[sectorName]) {
      groupedEstablishments[sectorName] = [];
    }
    groupedEstablishments[sectorName].push(e);
  });

  return (
    <div className="flex-1 w-full max-w-none mx-auto py-12 px-6 lg:px-12">
      {/* Title */}
      <div className="mb-10 text-left">
        <h1 className="text-4xl font-black text-neutral-900 tracking-tight uppercase">Console Administrateur</h1>
        <p className="text-neutral-500 text-sm mt-2">
          Gérez les utilisateurs, les établissements, modérez les avis et visualisez le calendrier global de Timely.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-[250px] shrink-0 flex flex-col gap-2">
          <button
            onClick={() => { setActiveTab('users'); setError(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left font-bold text-sm border-2 rounded-xl transition-all select-none cursor-pointer focus:outline-none ${
              activeTab === 'users'
                ? 'border-neutral-900 bg-neutral-900 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]'
                : 'border-neutral-900 bg-white text-neutral-800 hover:bg-neutral-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Utilisateurs</span>
          </button>
          
          <button
            onClick={() => { setActiveTab('establishments'); setError(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left font-bold text-sm border-2 rounded-xl transition-all select-none cursor-pointer focus:outline-none ${
              activeTab === 'establishments'
                ? 'border-neutral-900 bg-neutral-900 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]'
                : 'border-neutral-900 bg-white text-neutral-800 hover:bg-neutral-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Etablissements</span>
          </button>

          <button
            onClick={() => { setActiveTab('reviews'); setError(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left font-bold text-sm border-2 rounded-xl transition-all select-none cursor-pointer focus:outline-none ${
              activeTab === 'reviews'
                ? 'border-neutral-900 bg-neutral-900 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]'
                : 'border-neutral-900 bg-white text-neutral-800 hover:bg-neutral-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Modération Avis</span>
          </button>

          <button
            onClick={() => { setActiveTab('calendar'); setError(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left font-bold text-sm border-2 rounded-xl transition-all select-none cursor-pointer focus:outline-none ${
              activeTab === 'calendar'
                ? 'border-neutral-900 bg-neutral-900 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]'
                : 'border-neutral-900 bg-white text-neutral-800 hover:bg-neutral-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Calendrier Global</span>
          </button>

          <div className="h-[2px] bg-neutral-200 my-4"></div>

          {onNavigate && (
            <button
              onClick={() => onNavigate('home')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left font-bold text-sm border-2 rounded-xl border-neutral-900 bg-white text-neutral-800 hover:bg-neutral-50 transition-all select-none cursor-pointer focus:outline-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              <span>Retour à l'accueil</span>
            </button>
          )}
        </aside>

        {/* Content Box */}
        <main className="flex-1 w-full bg-white border-2 border-neutral-900 p-6 sm:p-8 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] min-h-[500px]">
          {error && <Alert type="error" message={error} className="mb-6" />}
          {loading && !editingEstablishment ? (
            <div className="flex items-center justify-center h-64">
              <span className="loading loading-spinner loading-lg text-neutral-950"></span>
            </div>
          ) : (
            <div>
              {/* TAB: USERS */}
              {activeTab === 'users' && (
                <section className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">Utilisateurs</h2>
                      <p className="text-sm text-neutral-500">Gérez les comptes, modifiez les rôles et activez ou bloquez les profils.</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        placeholder="Rechercher un utilisateur..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full bg-white border-2 border-neutral-900 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-0 text-neutral-900 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                      />
                    </div>
                  </div>

                  <div className="border-2 border-neutral-900 rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="overflow-x-auto">
                      <table className="table w-full text-left border-collapse bg-white">
                        <thead>
                          <tr className="bg-neutral-950 text-white text-xs font-black uppercase tracking-wider border-b-2 border-neutral-900">
                            <th className="py-4 px-6">Nom / Email</th>
                            <th className="py-4 px-6">Inscription</th>
                            <th className="py-4 px-6">Rôle</th>
                            <th className="py-4 px-6">Statut</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-neutral-900 text-sm font-semibold text-neutral-750">
                          {filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-neutral-50 transition-colors bg-white">
                              <td className="py-4 px-6">
                                <div className="font-extrabold text-neutral-900 text-sm">{u.first_name} {u.last_name}</div>
                                <div className="text-xs text-neutral-500">{u.email}</div>
                                {u.role === 'professionnel' && u.pro_details && (
                                  <div className="text-xs text-blue-600 mt-1 font-bold">
                                    Établissement : {u.pro_details.etablissement_nom}
                                  </div>
                                )}
                                {u.role === 'gerant' && u.gerant_details?.establishments && u.gerant_details.establishments.length > 0 && (
                                  <div className="text-xs text-purple-600 mt-1 font-bold">
                                    Établissements : {u.gerant_details.establishments.map(e => e.nom).join(', ')}
                                  </div>
                                )}
                                {u.reset_code && (
                                  <div className="text-xs text-red-600 mt-1 font-bold">
                                    Code de réinitialisation: {u.reset_code}
                                  </div>
                                )}
                              </td>
                              <td className="py-4 px-6 text-sm text-neutral-700 font-semibold">
                                {u.date_joined ? new Date(u.date_joined).toLocaleDateString('fr-FR') : 'Date inconnue'}
                              </td>
                              <td className="py-4 px-6 text-sm">
                                <span className={`px-2.5 py-1 rounded-xl text-xs font-black border-2 border-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                                  u.role === 'admin' ? 'bg-red-200 text-red-900' :
                                  u.role === 'gerant' ? 'bg-purple-200 text-purple-900' :
                                  u.role === 'professionnel' ? 'bg-blue-200 text-blue-900' :
                                  'bg-neutral-100 text-neutral-800'
                                }`}>
                                  {u.role === 'admin' ? 'Administrateur' :
                                   u.role === 'gerant' ? 'Gérant' :
                                   u.role === 'professionnel' ? 'Collaborateur' :
                                   'Client'}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-sm">
                                <button
                                  onClick={() => handleToggleUserStatus(u)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase cursor-pointer border-2 border-neutral-900 transition-all select-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                                    u.is_active 
                                      ? 'bg-green-200 text-neutral-900' 
                                      : 'bg-orange-200 text-neutral-900'
                                  }`}
                                >
                                  {u.is_active ? 'Actif' : 'Bloqué'}
                                </button>
                              </td>
                              <td className="py-4 px-6 text-right space-x-2">
                                <button
                                  onClick={() => setEditingUser(u)}
                                  className="border-2 border-neutral-900 bg-amber-100 hover:bg-amber-200 text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all font-black rounded-xl px-3 py-1.5 cursor-pointer text-xs"
                                >
                                  Rôle
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="border-2 border-red-900 bg-rose-100 hover:bg-rose-200 text-red-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all font-black rounded-xl px-3 py-1.5 cursor-pointer text-xs"
                                >
                                  Supprimer
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {/* TAB: ESTABLISHMENTS */}
              {activeTab === 'establishments' && (
                <section className="space-y-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">Établissements</h2>
                      <p className="text-sm text-neutral-500">Modifiez les informations d'un établissement, ses horaires, et gérez ses prestations de services.</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <select
                        value={selectedSectorFilter}
                        onChange={(e) => setSelectedSectorFilter(e.target.value)}
                        className="select w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none focus:ring-0 text-sm text-neutral-900 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                      >
                        <option value="all">Tous les secteurs</option>
                        {sectors.map(s => (
                          <option key={s.id} value={s.nom}>{s.nom}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {Object.keys(groupedEstablishments).map(sector => (
                    <div key={sector} className="space-y-4">
                      <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider border-b-2 border-neutral-900 pb-2">{sector}</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {groupedEstablishments[sector].map(etab => (
                          <div key={etab.id} className="bg-white border-2 border-neutral-900 rounded-2xl p-5 flex flex-col justify-between hover:translate-y-[-4px] hover:translate-x-[-4px] transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <div>
                              <div className="flex justify-between items-start">
                                <h4 className="font-extrabold text-neutral-900 text-base">{etab.nom}</h4>
                              </div>
                              <p className="text-xs text-neutral-500 mt-2 line-clamp-2">{etab.description || 'Aucune description fournie.'}</p>
                              
                              <div className="text-xs text-neutral-800 mt-4 space-y-1.5 bg-violet-50/50 p-3.5 rounded-xl border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                                  <div><strong>Adresse :</strong> {etab.lieu ? `${etab.lieu.adresse}, ${etab.lieu.ville}` : 'Non spécifiée'}</div>
                                  <div><strong>Email :</strong> {etab.mail || 'Non spécifié'}</div>
                                  <div><strong>Gérant :</strong> {etab.gerant ? `${etab.gerant.prenom} ${etab.gerant.nom}` : 'Aucun gérant'}</div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-neutral-200">
                              <button
                                onClick={() => handleOpenEditEstablishment(etab)}
                                className="border-2 border-neutral-900 bg-amber-100 hover:bg-amber-200 text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all font-black rounded-xl px-3 py-1.5 cursor-pointer text-xs"
                              >
                                Modifier / Prestations
                              </button>
                              <button
                                onClick={() => handleDeleteEstablishment(etab.id)}
                                className="border-2 border-red-900 bg-rose-100 hover:bg-rose-200 text-red-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all font-black rounded-xl px-3 py-1.5 cursor-pointer text-xs"
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* TAB: REVIEWS */}
              {activeTab === 'reviews' && (
                <section className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">Modération des Avis</h2>
                      <p className="text-sm text-neutral-500">Modérez et supprimez les commentaires rédigés par les clients sur les différents établissements.</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        placeholder="Rechercher par avis ou salon..."
                        value={reviewSearch}
                        onChange={(e) => setReviewSearch(e.target.value)}
                        className="w-full bg-white border-2 border-neutral-900 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-0 text-neutral-900 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredReviews.map(r => (
                      <div key={r.id} className="bg-white border-2 border-neutral-900 rounded-2xl p-5 flex flex-col justify-between hover:translate-y-[-4px] hover:translate-x-[-4px] transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-black text-neutral-500 uppercase">Établissement : {r.etablissement?.nom}</span>
                              <div className="text-sm font-extrabold text-neutral-900 mt-1">Par {r.client?.first_name} {r.client?.last_name}</div>
                            </div>
                            <div className="flex items-center gap-1 bg-amber-100 border-2 border-neutral-900 px-2 py-0.5 rounded-xl shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] font-black">
                              <span className="text-xs font-black text-neutral-900">{r.note}</span>
                              <svg className="w-3.5 h-3.5 text-amber-500 fill-amber-500" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-neutral-850 font-medium leading-relaxed bg-violet-50/40 border-2 border-neutral-900 rounded-xl p-3.5">
                            "{r.message}"
                          </div>
                        </div>

                        <div className="flex justify-between items-center mt-5 pt-3 border-t border-neutral-150">
                          <span className="text-xs text-neutral-400 font-bold">Envoyé le {r.date_envoie ? new Date(r.date_envoie).toLocaleDateString('fr-FR') : 'Date inconnue'}</span>
                          <button
                            onClick={() => handleDeleteReview(r.id)}
                            className="border-2 border-red-900 bg-rose-100 hover:bg-rose-200 text-red-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all font-black rounded-xl px-3 py-1.5 cursor-pointer text-xs"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* TAB: CALENDAR */}
              {activeTab === 'calendar' && (
                <section className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">Calendrier Global</h2>
                      <p className="text-sm text-neutral-500">Consultez et gérez l'ensemble des réservations enregistrées sur la plateforme.</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        placeholder="Rechercher par client ou pro..."
                        value={calendarSearch}
                        onChange={(e) => setCalendarSearch(e.target.value)}
                        className="w-full bg-white border-2 border-neutral-900 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-0 text-neutral-900 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                      />
                    </div>
                  </div>

                  <div className="border-2 border-neutral-900 rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="overflow-x-auto">
                      <table className="table w-full text-left border-collapse bg-white">
                        <thead>
                          <tr className="bg-neutral-950 text-white text-xs font-black uppercase tracking-wider border-b-2 border-neutral-900">
                            <th className="py-4 px-6">Détails du RDV</th>
                            <th className="py-4 px-6">Client</th>
                            <th className="py-4 px-6">Collaborateur</th>
                            <th className="py-4 px-6">Statut</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-neutral-900 text-sm font-semibold text-neutral-750">
                          {filteredCalendar.map(event => (
                            <tr key={event.id} className="hover:bg-neutral-50 transition-colors bg-white">
                              <td className="py-4 px-6">
                                <div className="font-extrabold text-neutral-900 text-sm">{event.prestation}</div>
                                <div className="text-xs text-neutral-500">
                                  {new Date(event.start).toLocaleString('fr-FR', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="text-sm font-bold text-neutral-900">{event.client?.nom_complet || 'Inconnu'}</div>
                                <div className="text-xs text-neutral-500">{event.client?.email}</div>
                                {event.client?.telephone && <div className="text-xs text-neutral-400">{event.client.telephone}</div>}
                              </td>
                              <td className="py-4 px-6 text-sm text-neutral-850">
                                <div className="font-extrabold">{event.professionnel?.nom_complet}</div>
                              </td>
                              <td className="py-4 px-6 text-sm">
                                <span className={`px-2.5 py-1 rounded-xl text-xs font-black border-2 border-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${event.status === 'confirme' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'}`}>
                                  {event.status === 'confirme' ? 'Confirmé' : 'Annulé'}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-right">
                                {event.status === 'confirme' && (
                                  <button
                                    onClick={() => handleCancelBooking(event.id)}
                                    className="border-2 border-red-900 bg-rose-100 hover:bg-rose-200 text-red-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all font-black rounded-xl px-3 py-1.5 cursor-pointer text-xs"
                                  >
                                    Annuler RDV
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>

       {/* MODAL: EDIT USER ROLE */}
      {editingUser && (
        <div className="modal modal-open bg-neutral-900/60 backdrop-blur-sm">
          <div className="modal-box bg-white border-2 border-neutral-900 text-neutral-900 max-w-md rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
            <h3 className="font-black text-xl uppercase tracking-tight text-neutral-900 mb-4">Modifier le rôle</h3>
            <p className="text-sm text-neutral-500 mb-6">Changer le rôle de l'utilisateur : <strong className="text-neutral-900">{editingUser.first_name} {editingUser.last_name}</strong></p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const r = formData.get('role') as string;
              const etabIdStr = formData.get('etablissement_id') as string;
              const proPoste = formData.get('poste') as string;
              const proDesc = formData.get('description') as string;
              
              handleUpdateUserRole(
                editingUser.id, 
                r, 
                etabIdStr ? parseInt(etabIdStr, 10) : undefined,
                proPoste,
                proDesc
              );
            }} className="space-y-4">
              <div className="form-control">
                <label className="label text-xs font-bold text-neutral-500 uppercase">Sélectionner un rôle</label>
                <select name="role" defaultValue={editingUser.role} className="select w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <option value="client">Client</option>
                  <option value="gerant">Gérant</option>
                  <option value="professionnel">Collaborateur (Professionnel)</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              {/* Specific fields for Professionnel */}
              <div className="pt-4 mt-2 space-y-4 bg-violet-50/30 p-4 rounded-xl border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                <p className="text-xs text-neutral-500 font-extrabold uppercase">Détails Collaborateur</p>
                
                <div className="form-control">
                  <label className="label text-xs font-bold text-neutral-500 uppercase">Établissement lié</label>
                  <select name="etablissement_id" defaultValue={editingUser.pro_details?.etablissement_id || ''} className="select w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <option value="">Sélectionner un établissement...</option>
                    {establishments.map(est => (
                      <option key={est.id} value={est.id}>{est.nom}</option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label text-xs font-bold text-neutral-500 uppercase">Poste / Fonction</label>
                  <input type="text" name="poste" defaultValue={editingUser.pro_details?.poste || 'Coiffeur / Esthéticienne'} className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                </div>

                <div className="form-control">
                  <label className="label text-xs font-bold text-neutral-500 uppercase">Description / Bio</label>
                  <textarea name="description" defaultValue={editingUser.pro_details?.description || ''} className="textarea w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] h-20" />
                </div>
              </div>

              <div className="modal-action flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="border-2 border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all font-black rounded-xl px-4 py-2 cursor-pointer text-xs">Annuler</button>
                <button type="submit" className="border-2 border-neutral-900 bg-neutral-900 hover:bg-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.15)] transition-all font-black rounded-xl px-4 py-2 cursor-pointer text-xs">Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ESTABLISHMENT DATA & PRESTATIONS */}
      {editingEstablishment && (
        <div className="modal modal-open bg-neutral-900/60 backdrop-blur-sm">
          <div className="modal-box bg-white border-2 border-neutral-900 text-neutral-900 max-w-5xl rounded-2xl max-h-[90vh] overflow-y-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8">
            <h3 className="font-black text-xl uppercase tracking-tight text-neutral-900 mb-6 border-b-2 border-neutral-900 pb-3">Modifier l'Établissement</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Col */}
              <form onSubmit={handleUpdateEstablishment} className="lg:col-span-7 space-y-6">
                <h4 className="font-bold text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-250 pb-1">Données générales</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control col-span-2">
                    <label className="label text-xs font-bold text-neutral-500 uppercase">Nom</label>
                    <input
                      type="text"
                      value={editingEstablishment.nom || ''}
                      onChange={(e) => setEditingEstablishment({ ...editingEstablishment, nom: e.target.value })}
                      className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label text-xs font-bold text-neutral-500 uppercase">Secteur</label>
                    <select
                      value={editingEstablishment.secteur?.id || ''}
                      onChange={(e) => {
                        const secId = parseInt(e.target.value, 10);
                        const selectedSec = sectors.find(s => s.id === secId) || null;
                        setEditingEstablishment({ ...editingEstablishment, secteur: selectedSec });
                      }}
                      className="select w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                      <option value="">Sélectionner un secteur...</option>
                      {sectors.map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.nom}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label text-xs font-bold text-neutral-500 uppercase">Gérant</label>
                    <select
                      value={editingEstablishment.gerant?.id || ''}
                      onChange={(e) => {
                        const uId = parseInt(e.target.value, 10);
                        const u = users.find(x => x.id === uId);
                        const ger = u ? { id: u.id, prenom: u.first_name, nom: u.last_name, email: u.email } : null;
                        setEditingEstablishment({ ...editingEstablishment, gerant: ger });
                      }}
                      className="select w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                      <option value="">Sélectionner un gérant...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label text-xs font-bold text-neutral-500 uppercase">Description</label>
                  <textarea
                    value={editingEstablishment.description || ''}
                    onChange={(e) => setEditingEstablishment({ ...editingEstablishment, description: e.target.value })}
                    className="textarea w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all h-24"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label text-xs font-bold text-neutral-500 uppercase">Téléphone</label>
                    <input
                      type="text"
                      value={editingEstablishment.telephone || ''}
                      onChange={(e) => setEditingEstablishment({ ...editingEstablishment, telephone: e.target.value })}
                      className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label text-xs font-bold text-neutral-500 uppercase">Mail</label>
                    <input
                      type="email"
                      value={editingEstablishment.mail || ''}
                      onChange={(e) => setEditingEstablishment({ ...editingEstablishment, mail: e.target.value })}
                      className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label text-xs font-bold text-neutral-500 uppercase">Site Web</label>
                  <input
                    type="url"
                    value={editingEstablishment.site_web || ''}
                    onChange={(e) => setEditingEstablishment({ ...editingEstablishment, site_web: e.target.value })}
                    className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                  />
                </div>

                <h4 className="font-bold text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-250 pb-1 mt-6">Adresse / Lieu</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="form-control col-span-3">
                    <label className="label text-xs font-bold text-neutral-500 uppercase">Adresse</label>
                    <input
                      type="text"
                      value={editingEstablishment.lieu?.adresse || ''}
                      onChange={(e) => setEditingEstablishment({
                        ...editingEstablishment,
                        lieu: editingEstablishment.lieu ? { ...editingEstablishment.lieu, adresse: e.target.value } : { id: 0, adresse: e.target.value, ville: '' }
                      })}
                      className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                      required
                    />
                  </div>

                  <div className="form-control col-span-2">
                    <label className="label text-xs font-bold text-neutral-500 uppercase">Ville</label>
                    <input
                      type="text"
                      value={editingEstablishment.lieu?.ville || ''}
                      onChange={(e) => setEditingEstablishment({
                        ...editingEstablishment,
                        lieu: editingEstablishment.lieu ? { ...editingEstablishment.lieu, ville: e.target.value } : { id: 0, adresse: '', ville: e.target.value }
                      })}
                      className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label text-xs font-bold text-neutral-500 uppercase">Code Postal</label>
                    <input
                      type="text"
                      value={editingEstablishment.lieu?.code_postal || ''}
                      onChange={(e) => setEditingEstablishment({
                        ...editingEstablishment,
                        lieu: editingEstablishment.lieu ? { ...editingEstablishment.lieu, code_postal: e.target.value } : { id: 0, adresse: '', ville: '', code_postal: e.target.value }
                      })}
                      className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                    />
                  </div>
                </div>

                <h4 className="font-bold text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-250 pb-1 mt-6">Horaires d'ouverture</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(day => (
                    <div key={day} className="form-control">
                      <label className="label text-xs font-bold text-neutral-500 uppercase">{day}</label>
                      <input
                        type="text"
                        value={editingEstablishment.horaires ? (editingEstablishment.horaires[day] || '') : ''}
                        onChange={(e) => {
                          const updatedHoraires = { ...editingEstablishment.horaires } as Record<string, string>;
                          updatedHoraires[day] = e.target.value;
                          setEditingEstablishment({ ...editingEstablishment, horaires: updatedHoraires });
                        }}
                        placeholder="ex: 09:00 - 19:00 ou Fermé"
                        className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-xs text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 justify-end pt-6 border-t-2 border-neutral-900">
                  <button type="button" onClick={() => setEditingEstablishment(null)} className="border-2 border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all font-black rounded-xl px-4 py-2 cursor-pointer text-xs">Annuler</button>
                  <button type="submit" className="border-2 border-neutral-900 bg-neutral-900 hover:bg-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.15)] transition-all font-black rounded-xl px-4 py-2 cursor-pointer text-xs">Enregistrer</button>
                </div>
              </form>
              <div className="lg:col-span-5 border-t-2 lg:border-t-0 lg:border-l-2 border-neutral-900 pt-6 lg:pt-0 lg:pl-8 space-y-6">
                <h4 className="font-bold text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-100 pb-1">Gestion des Prestations</h4>
                
                {/* Add Prestation form */}
                <div className="bg-violet-50/50 border-2 border-neutral-900 p-4 rounded-xl space-y-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-neutral-900">Ajouter un service</h5>
                  <div className="form-control">
                    <input
                      type="text"
                      placeholder="Nom de la prestation"
                      value={newPrestationNom}
                      onChange={(e) => setNewPrestationNom(e.target.value)}
                      className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-xs text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                    />
                  </div>
                  <div className="form-control">
                    <input
                      type="number"
                      placeholder="Coût (€)"
                      value={newPrestationCout}
                      onChange={(e) => setNewPrestationCout(e.target.value)}
                      className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-xs text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                    />
                  </div>
                  <div className="form-control">
                    <input
                      type="text"
                      placeholder="Description facultative"
                      value={newPrestationDesc}
                      onChange={(e) => setNewPrestationDesc(e.target.value)}
                      className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-xs text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPrestation}
                    className="border-2 border-neutral-900 bg-neutral-900 hover:bg-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.15)] transition-all font-black rounded-xl px-4 py-2 cursor-pointer w-full text-xs uppercase"
                  >
                    Ajouter
                  </button>
                </div>

                {/* Prestations List */}
                <div className="space-y-3">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-neutral-450">Prestations existantes ({establishmentPrestations.length})</h5>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {establishmentPrestations.map(p => (
                      <div key={p.id} className="bg-white border-2 border-neutral-900 p-3 rounded-xl flex flex-col justify-between gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all duration-200">
                        {editingPrestationId === p.id ? (
                          <div className="space-y-2 w-full">
                            <input
                              type="text"
                              defaultValue={p.nom}
                              id={`edit-nom-${p.id}`}
                              className="input input-sm border-2 border-neutral-900 w-full bg-white text-xs font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                            />
                            <input
                              type="number"
                              defaultValue={p.cout}
                              id={`edit-cout-${p.id}`}
                              className="input input-sm border-2 border-neutral-900 w-full bg-white text-xs font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                            />
                            <input
                              type="text"
                              defaultValue={p.description || ''}
                              id={`edit-desc-${p.id}`}
                              placeholder="Description"
                              className="input input-sm border-2 border-neutral-900 w-full bg-white text-xs font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                            />
                            <div className="flex gap-1 justify-end pt-1">
                              <button
                                onClick={() => setEditingPrestationId(null)}
                                className="border-2 border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-800 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-none font-bold rounded-lg px-2 py-1 cursor-pointer text-[10px] transition-all"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={() => {
                                  const nameVal = (document.getElementById(`edit-nom-${p.id}`) as HTMLInputElement).value;
                                  const costVal = parseFloat((document.getElementById(`edit-cout-${p.id}`) as HTMLInputElement).value);
                                  const descVal = (document.getElementById(`edit-desc-${p.id}`) as HTMLInputElement).value;
                                  handleUpdatePrestation(p.id, nameVal, costVal, descVal);
                                }}
                                className="border-2 border-neutral-900 bg-neutral-900 hover:bg-neutral-800 text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,0.15)] hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-none font-bold rounded-lg px-2 py-1 cursor-pointer text-[10px] transition-all"
                              >
                                Valider
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="font-extrabold text-neutral-900 text-sm">{p.nom}</span>
                                {p.description && <p className="text-neutral-500 mt-1 text-[11px] leading-relaxed">{p.description}</p>}
                              </div>
                              <span className="font-bold text-neutral-900 bg-neutral-100 border-2 border-neutral-900 px-2 py-0.5 rounded-lg shrink-0 text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">{p.cout} €</span>
                            </div>
                            <div className="flex gap-1 justify-end pt-2 border-t border-neutral-100">
                              <button
                                onClick={() => setEditingPrestationId(p.id)}
                                className="border-2 border-neutral-900 bg-amber-100 hover:bg-amber-200 text-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-none font-black rounded-lg px-2 py-1 cursor-pointer text-[10px] transition-all"
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => handleDeletePrestation(p.id)}
                                className="border-2 border-red-900 bg-rose-100 hover:bg-rose-200 text-red-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-none font-black rounded-lg px-2 py-1 cursor-pointer text-[10px] transition-all"
                              >
                                Supprimer
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

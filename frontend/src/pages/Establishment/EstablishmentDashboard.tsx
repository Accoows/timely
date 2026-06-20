import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Etablissement, Review, CalendarEvent, Discussion, Message } from '../../types';
import Alert from '../../components/Alert';
import Button from '../../components/Button';

function getErrorMessage(err: unknown, defaultMsg: string): string {
  if (err instanceof Error) return err.message;
  return defaultMsg;
}

type TabType = 'team' | 'calendar' | 'reviews' | 'messages';

interface EstablishmentDashboardProps {
  onNavigate?: (page: string) => void;
}

export default function EstablishmentDashboard({ onNavigate }: EstablishmentDashboardProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('team');

  // Core details state
  const [establishment, setEstablishment] = useState<Etablissement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedProId, setSelectedProId] = useState<number | null>(null);
  const [calendarSearch, setCalendarSearch] = useState('');

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);

  // Messages state
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const establishmentId = user?.establishment_id || user?.establishments?.[0]?.id;

  // Fetch core establishment details
  useEffect(() => {
    if (!establishmentId) {
      Promise.resolve().then(() => {
        setError("Aucun établissement n'est associé à votre compte.");
        setLoading(false);
      });
      return;
    }

    async function loadEstablishment() {
      try {
        const etab = await api.establishments.getById(establishmentId!);
        setEstablishment(etab);
      } catch (err) {
        setError(getErrorMessage(err, "Impossible de charger les détails de l'établissement."));
      } finally {
        setLoading(false);
      }
    }

    loadEstablishment();
  }, [establishmentId]);

  // Fetch specific tab data
  const fetchTabData = async () => {
    if (!establishmentId) return;

    try {
      if (activeTab === 'calendar') {
        // Fetch all calendar events for this establishment
        // Under the hood, api.admin.calendar.list calls /api/bookings/dashboard/calendar/
        const eventsList = await api.admin.calendar.list();
        setCalendarEvents(eventsList);
      } else if (activeTab === 'reviews' && user?.role === 'gerant') {
        const reviewList = await api.reviews.listForEstablishment(establishmentId);
        setReviews(reviewList);
      } else if (activeTab === 'messages' && user?.role === 'gerant') {
        const res = await api.messaging.listDiscussions();
        setDiscussions(res.discussions || []);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des données de l'onglet :", err);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchTabData();
    });
  }, [activeTab, establishmentId]);

  // Scroll to bottom of chat messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat messages when a discussion is selected
  useEffect(() => {
    if (!selectedDiscussion) {
      Promise.resolve().then(() => {
        setMessages([]);
      });
      return;
    }

    async function loadMessages() {
      setMessagesLoading(true);
      try {
        const res = await api.messaging.listMessages(selectedDiscussion!.id);
        setMessages(res.messages || []);
      } catch (err) {
        console.error("Erreur lors du chargement des messages :", err);
      } finally {
        setMessagesLoading(false);
      }
    }

    loadMessages();

    // Auto-poll messages every 6 seconds for live chat feeling
    const interval = setInterval(loadMessages, 6000);
    return () => clearInterval(interval);
  }, [selectedDiscussion]);

  // Actions
  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement ce rendez-vous ? Un message d\'explication automatique sera envoyé au client.')) return;
    try {
      await api.bookings.cancel(bookingId);
      setCalendarEvents(calendarEvents.filter(e => e.id !== bookingId));
      alert('Rendez-vous annulé et client notifié avec succès.');
    } catch (err) {
      alert(getErrorMessage(err, "Erreur lors de l'annulation du rendez-vous."));
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cet avis ?')) return;
    try {
      await api.reviews.delete(reviewId);
      setReviews(reviews.filter(r => r.id !== reviewId));
      alert('Avis supprimé.');
    } catch (err) {
      alert(getErrorMessage(err, "Erreur lors de la suppression de l'avis."));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiscussion || !newMessageText.trim()) return;

    const text = newMessageText.trim();
    setNewMessageText('');

    try {
      const res = await api.messaging.sendMessage(selectedDiscussion.id, text);
      const sentMsg: Message = {
        id: res.data.id,
        content: res.data.content,
        created_at: res.data.created_at,
        sender: {
          id: user!.id,
          username: user!.username,
          first_name: user!.first_name,
          last_name: user!.last_name
        }
      };
      setMessages(prev => [...prev, sentMsg]);
    } catch (err) {
      alert(getErrorMessage(err, "Erreur lors de l'envoi du message."));
    }
  };

  // Filters
  const filteredEvents = calendarEvents.filter(e => {
    // Filter by selected professional
    if (selectedProId !== null && e.professionnel.id !== selectedProId) {
      return false;
    }
    // Filter by query search
    const term = calendarSearch.toLowerCase();
    const clientName = e.client ? e.client.nom_complet.toLowerCase() : '';
    const proName = e.professionnel ? e.professionnel.nom_complet.toLowerCase() : '';
    const title = e.title.toLowerCase();
    return title.includes(term) || clientName.includes(term) || proName.includes(term);
  });

  const filteredReviews = reviews;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <span className="loading loading-spinner loading-lg text-neutral-950"></span>
      </div>
    );
  }

  if (error || !establishment) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6">
        <Alert type="error" message={error || "Impossible de charger les données."} />
        {onNavigate && (
          <Button onClick={() => onNavigate('profile')} variant="outline" className="mt-4">
            Retour au profil
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-none mx-auto py-12 px-6 lg:px-12">
      {/* Header Panel */}
      <div className="mb-10 text-left bg-gradient-to-r from-violet-100 to-indigo-50 border-2 border-neutral-900 p-6 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="inline-block bg-neutral-900 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mb-2">
            Dashboard Établissement
          </span>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight uppercase">
            {establishment.nom}
          </h1>
          <p className="text-neutral-600 text-xs mt-1.5 font-semibold">
            {establishment.lieu?.adresse}, {establishment.lieu?.ville} • {establishment.secteur?.nom}
          </p>
        </div>
        <div className="flex gap-2">
          {onNavigate && (
            <Button
              onClick={() => onNavigate('profile')}
              variant="outline"
              size="sm"
            >
              Mon Profil
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Navigation Sidebar */}
        <aside className="w-full lg:w-[250px] shrink-0 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('team')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left font-bold text-sm border-2 rounded-xl transition-all select-none cursor-pointer focus:outline-none ${activeTab === 'team'
              ? 'border-neutral-900 bg-neutral-900 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]'
              : 'border-neutral-900 bg-white text-neutral-800 hover:bg-neutral-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20M3.12 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M3.12 19.128v-.003c0-1.113.285-2.16.786-3.07M3.12 19.128v.109A11.386 11.386 0 008.91 20.1M10.089 20c-1.127 0-2.203-.231-3.18-.646m3.18.646c.493.003.987-.015 1.478-.053m4.333-2.625a4.498 4.498 0 01-4.333-2.625m0 0a4.5 4.5 0 01-1.333-3.125M12 3a3 3 0 100 6 3 3 0 000-6z" />
            </svg>
            <span>Équipe & Profils</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left font-bold text-sm border-2 rounded-xl transition-all select-none cursor-pointer focus:outline-none ${activeTab === 'calendar'
              ? 'border-neutral-900 bg-neutral-900 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]'
              : 'border-neutral-900 bg-white text-neutral-800 hover:bg-neutral-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span>Planning & RDV</span>
          </button>

          {user?.role === 'gerant' && (
            <>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left font-bold text-sm border-2 rounded-xl transition-all select-none cursor-pointer focus:outline-none ${activeTab === 'reviews'
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]'
                  : 'border-neutral-900 bg-white text-neutral-800 hover:bg-neutral-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.173-.439.817-.439.99 0l1.974 5.006c.07.177.24.298.43.303l5.358.14c.475.013.666.602.316.924l-3.957 3.633a.473.473 0 00-.148.455l1.047 5.256c.093.468-.413.834-.827.587l-4.723-2.823a.473.473 0 00-.498 0l-4.723 2.823c-.414.247-.92-.12-.827-.587l1.047-5.256a.473.473 0 00-.148-.455L2.91 10.87c-.35-.322-.16-.911.316-.924l5.358-.14c.19-.005.36-.126.43-.303l1.974-5.006z" />
                </svg>
                <span>Avis & Modération</span>
              </button>

              <button
                onClick={() => setActiveTab('messages')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left font-bold text-sm border-2 rounded-xl transition-all select-none cursor-pointer focus:outline-none ${activeTab === 'messages'
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]'
                  : 'border-neutral-900 bg-white text-neutral-800 hover:bg-neutral-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379L9 21h1.5l1.5-2.61a47.469 47.469 0 007.293-.38 3.25 3.25 0 002.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v5.018z" />
                </svg>
                <span>Messagerie Clients</span>
              </button>
            </>
          )}
        </aside>

        {/* Content Box */}
        <main className="flex-1 w-full bg-white border-2 border-neutral-900 p-6 sm:p-8 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] min-h-[500px]">

          {/* TAB 1: TEAM */}
          {activeTab === 'team' && (
            <section className="space-y-8 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">L'Équipe de l'Établissement</h2>
                <p className="text-sm text-neutral-500">Coordonnées du gérant et profil des professionnels actifs.</p>
              </div>

              {/* Manager Card */}
              {establishment.gerant && (
                <div className="bg-violet-50/50 border-2 border-neutral-900 rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-purple-200 border-2 border-neutral-900 flex items-center justify-center font-black text-purple-900 text-lg uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {establishment.gerant.prenom[0]}{establishment.gerant.nom[0]}
                    </div>
                    <div>
                      <span className="inline-block bg-purple-900 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded mb-1">
                        Gérant / Propriétaire
                      </span>
                      <h3 className="font-extrabold text-neutral-900 text-lg leading-tight">
                        {establishment.gerant.prenom} {establishment.gerant.nom}
                      </h3>
                      <p className="text-neutral-500 text-xs">{establishment.gerant.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Collaborateurs/Professionnels list */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider border-b-2 border-neutral-900 pb-2">
                  Professionnels ({establishment.collaborateurs?.length || 0})
                </h3>

                {(!establishment.collaborateurs || establishment.collaborateurs.length === 0) ? (
                  <p className="text-sm text-neutral-500 italic">Aucun collaborateur n'est enregistré pour le moment.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {establishment.collaborateurs.map(col => (
                      <div key={col.id} className="bg-white border-2 border-neutral-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between hover:translate-y-[-2px] transition-all">
                        <div>
                          <div className="flex items-center gap-3.5 mb-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-neutral-900 flex items-center justify-center font-black text-blue-900 text-sm uppercase">
                              {col.prenom[0]}{col.nom[0]}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-neutral-900 text-base leading-tight">
                                {col.prenom} {col.nom}
                              </h4>
                              <span className="text-[10px] font-bold text-neutral-500 uppercase">{col.poste}</span>
                            </div>
                          </div>
                          {col.description && (
                            <p className="text-xs text-neutral-600 bg-neutral-50 border border-neutral-300 rounded-xl p-3 mt-2 font-medium italic">
                              "{col.description}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* TAB 2: CALENDAR */}
          {activeTab === 'calendar' && (
            <section className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">Planning de Réservations</h2>
                  <p className="text-sm text-neutral-500">Visualisez les réservations par professionnel de votre établissement.</p>
                </div>

                {/* Pro Filter Selector */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-black uppercase text-neutral-500 tracking-wider">Filtrer par Pro :</span>
                  <select
                    value={selectedProId || ''}
                    onChange={(e) => setSelectedProId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="select w-full sm:w-56 bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-xs text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <option value="">Tous les professionnels</option>
                    {establishment.collaborateurs?.map(col => (
                      <option key={col.id} value={col.id}>{col.prenom} {col.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Bar for appointments */}
              <div className="relative w-full">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Rechercher par client, prestation ou professionnel..."
                  value={calendarSearch}
                  onChange={(e) => setCalendarSearch(e.target.value)}
                  className="w-full bg-white border-2 border-neutral-900 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                />
              </div>

              {/* Booking List Table */}
              <div className="border-2 border-neutral-900 rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="overflow-x-auto">
                  <table className="table w-full text-left border-collapse bg-white">
                    <thead>
                      <tr className="bg-neutral-950 text-white text-xs font-black uppercase tracking-wider border-b-2 border-neutral-900">
                        <th className="py-3.5 px-6">Détails RDV</th>
                        <th className="py-3.5 px-6">Client</th>
                        <th className="py-3.5 px-6">Professionnel</th>
                        <th className="py-3.5 px-6">Statut</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-neutral-900 text-xs font-semibold text-neutral-800">
                      {filteredEvents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-neutral-500 italic bg-neutral-50">
                            Aucun rendez-vous enregistré.
                          </td>
                        </tr>
                      ) : (
                        filteredEvents.map(event => (
                          <tr key={event.id} className="hover:bg-neutral-50 transition-colors bg-white">
                            <td className="py-4 px-6">
                              <div className="font-extrabold text-neutral-900 text-sm">{event.prestation}</div>
                              <div className="text-xs text-neutral-500 mt-0.5">
                                {new Date(event.start).toLocaleString('fr-FR', {
                                  day: '2-digit', month: '2-digit', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-bold text-neutral-900">{event.client?.nom_complet}</div>
                              <div className="text-neutral-500 text-[11px]">{event.client?.email}</div>
                              {event.client?.telephone && (
                                <div className="text-neutral-400 text-[10px] mt-0.5">{event.client.telephone}</div>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-extrabold text-neutral-900">{event.professionnel?.nom_complet}</div>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border border-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${event.status === 'confirme' ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'
                                }`}>
                                {event.status === 'confirme' ? 'Confirmé' : 'Annulé'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              {event.status === 'confirme' && (
                                <button
                                  onClick={() => handleCancelBooking(event.id)}
                                  className="border-2 border-red-950 bg-rose-100 hover:bg-rose-200 text-red-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all font-black rounded-lg px-2.5 py-1.5 cursor-pointer text-[10px] uppercase"
                                >
                                  Annuler RDV
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* TAB 3: REVIEWS (MANAGER ONLY) */}
          {activeTab === 'reviews' && user?.role === 'gerant' && (
            <section className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">Modération des Avis</h2>
                  <p className="text-sm text-neutral-500">Gérez les commentaires publiés par vos clients.</p>
                </div>
              </div>

              {filteredReviews.length === 0 ? (
                <div className="text-center py-12 bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-2xl italic text-neutral-500">
                  Aucun avis ne correspond à vos critères.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredReviews.map(r => (
                    <div key={r.id} className="bg-white border-2 border-neutral-900 rounded-2xl p-5 flex flex-col justify-between hover:translate-y-[-2px] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-extrabold text-neutral-900">
                              {r.client?.first_name} {r.client?.last_name}
                            </div>
                            <span className="text-[10px] text-neutral-400 font-bold">
                              {r.client?.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 bg-amber-100 border border-neutral-900 px-2 py-0.5 rounded-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] font-black text-xs">
                            <span className="text-neutral-900">{r.note}</span>
                            <svg className="w-3 h-3 text-amber-500 fill-amber-500" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-neutral-700 bg-neutral-50 border border-neutral-300 rounded-xl p-3 leading-relaxed italic">
                          "{r.message}"
                        </p>
                      </div>

                      <div className="flex justify-between items-center mt-5 pt-3 border-t border-neutral-100">
                        <span className="text-[10px] text-neutral-400 font-semibold">
                          Le {r.date_envoie ? new Date(r.date_envoie).toLocaleDateString('fr-FR') : 'Date inconnue'}
                        </span>
                        <button
                          onClick={() => handleDeleteReview(r.id)}
                          className="border border-red-950 bg-rose-100 hover:bg-rose-200 text-red-900 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all font-black rounded-lg px-2.5 py-1 cursor-pointer text-[10px] uppercase"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TAB 4: MESSAGING (MANAGER ONLY) */}
          {activeTab === 'messages' && user?.role === 'gerant' && (
            <section className="space-y-6 animate-fadeIn h-[600px] flex flex-col">
              <div>
                <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">Messagerie Clients</h2>
                <p className="text-sm text-neutral-500">Communiquez en direct avec vos clients.</p>
              </div>

              <div className="flex-1 flex gap-4 min-h-0 border-2 border-neutral-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">

                {/* Discussion Sidebar */}
                <div className="w-1/3 border-r-2 border-neutral-900 flex flex-col bg-neutral-50 overflow-y-auto">
                  <div className="p-3 bg-neutral-950 text-white text-[10px] font-black uppercase tracking-wider">
                    Conversations ({discussions.length})
                  </div>
                  <div className="divide-y divide-neutral-200">
                    {discussions.length === 0 ? (
                      <p className="p-4 text-xs text-neutral-400 italic text-center">Aucune conversation en cours.</p>
                    ) : (
                      discussions.map(disc => {
                        const active = selectedDiscussion?.id === disc.id;
                        return (
                          <button
                            key={disc.id}
                            onClick={() => setSelectedDiscussion(disc)}
                            className={`w-full p-4 text-left flex flex-col gap-1 transition-colors select-none focus:outline-none cursor-pointer hover:bg-neutral-100 ${active ? 'bg-violet-100/70 hover:bg-violet-100' : 'bg-white'
                              }`}
                          >
                            <span className="text-xs font-black text-neutral-900">
                              {disc.client.first_name} {disc.client.last_name}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-bold truncate">
                              {disc.client.email}
                            </span>
                            {disc.last_message && (
                              <p className="text-[10.5px] text-neutral-600 truncate mt-1.5 font-medium leading-tight">
                                {disc.last_message.content}
                              </p>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Message Thread Panel */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden">
                  {selectedDiscussion ? (
                    <>
                      {/* Active Chat Header */}
                      <div className="p-4 border-b-2 border-neutral-900 flex items-center bg-neutral-950 text-white justify-between">
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider leading-none">
                            {selectedDiscussion.client.first_name} {selectedDiscussion.client.last_name}
                          </h4>
                          <span className="text-[9px] text-neutral-400 font-bold mt-1 inline-block">
                            {selectedDiscussion.client.email}
                          </span>
                        </div>
                      </div>

                      {/* Chat Messages viewport */}
                      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#f8f6f2] flex flex-col">
                        {messagesLoading && messages.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center">
                            <span className="loading loading-spinner text-neutral-950"></span>
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center text-xs text-neutral-400 italic">
                            Aucun message dans cette discussion.
                          </div>
                        ) : (
                          messages.map(msg => {
                            const isMe = msg.sender.id === user?.id;
                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col max-w-[75%] ${isMe ? 'self-end items-end' : 'self-start items-start'
                                  }`}
                              >
                                <div
                                  className={`p-3.5 rounded-2xl border-2 border-neutral-900 text-xs font-semibold leading-relaxed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isMe
                                    ? 'bg-neutral-950 text-white rounded-br-none'
                                    : 'bg-white text-neutral-900 rounded-bl-none'
                                    }`}
                                >
                                  {msg.content}
                                </div>
                                <span className="text-[8.5px] text-neutral-400 font-bold mt-1 px-1.5 uppercase">
                                  {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            );
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Input send bar */}
                      <form onSubmit={handleSendMessage} className="p-3 border-t-2 border-neutral-900 bg-neutral-50 flex gap-2">
                        <input
                          type="text"
                          value={newMessageText}
                          onChange={(e) => setNewMessageText(e.target.value)}
                          placeholder="Écrivez votre réponse ici..."
                          className="flex-1 bg-white border-2 border-neutral-900 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none text-neutral-900"
                        />
                        <button
                          type="submit"
                          className="border-2 border-neutral-900 bg-neutral-900 hover:bg-neutral-800 text-white font-black px-4 py-2 rounded-xl text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] hover:translate-y-[-1px] transition-all cursor-pointer"
                        >
                          Envoyer
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-400 bg-neutral-50 italic text-xs">
                      <svg className="w-10 h-10 text-neutral-300 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 18.661a1 1 0 01-.22-.321 6.244 6.244 0 003.255-3.018A7.94 7.94 0 013 12c0-4.556 4.03-8.25 9-8.25s9 3.582 9 8.25z" />
                      </svg>
                      Sélectionnez une discussion pour commencer à communiquer.
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

        </main>
      </div>
    </div>
  );
}

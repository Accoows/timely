import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import type { Etablissement, Prestation, Collaborateur, Discussion, Message, Review } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import Alert from '../../components/Alert';

interface EstablishmentDetailPageProps {
  establishmentId: number;
  onNavigate: (page: string) => void;
}

export default function EstablishmentDetailPage({ establishmentId, onNavigate }: EstablishmentDetailPageProps) {
  const { user } = useAuth();
  
  const [establishment, setEstablishment] = useState<Etablissement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for booking
  const [selectedPrestation, setSelectedPrestation] = useState<Prestation | null>(null);
  const [selectedCollaborateur, setSelectedCollaborateur] = useState<Collaborateur | null>(null);
  
  // Weekly slots calendar states
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklySlots, setWeeklySlots] = useState<{ [date: string]: { time: string; available: boolean }[] }>({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Selected date/time slot for validation
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Booking action states
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'on_site' | 'stripe'>('on_site');

  // Detail tabs state (prestations, infos, messages)
  const [activeTab, setActiveTab] = useState<'prestations' | 'infos' | 'messages'>('prestations');

  // Lightbox Modal state
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Favorite status state
  const [isFavorite, setIsFavorite] = useState(false);

  // Chat/Messaging states
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Reviews states
  const [establishmentReviews, setEstablishmentReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewFormMessage, setReviewFormMessage] = useState("");
  const [reviewFormNote, setReviewFormNote] = useState<number>(5);
  const [reviewSubmitLoading, setReviewSubmitLoading] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState("");
  const [reviewErrorMsg, setReviewErrorMsg] = useState("");
  const [activeReviewsTab, setActiveReviewsTab] = useState<'notes' | 'reviews'>('notes');

  // Generate 7 days based on weekOffset
  const getWeeklyDays = () => {
    const days = [];
    const locale = 'fr-FR';
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + (weekOffset * 7) + i);
      
      const dayName = d.toLocaleDateString(locale, { weekday: 'long' });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString(locale, { month: 'long' });

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const fullDate = `${yyyy}-${mm}-${dd}`;
      
      days.push({ dayName, dayNum, monthName, fullDate });
    }
    return days;
  };

  const weeklyDays = getWeeklyDays();

  // Load establishment details on mount / ID change
  useEffect(() => {
    let active = true;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.establishments.getById(establishmentId);
        if (active) {
          setEstablishment(data);
          // Auto-select first professional if available
          if (data.collaborateurs && data.collaborateurs.length > 0) {
            setSelectedCollaborateur(data.collaborateurs[0]);
          }
        }
      } catch (err) {
        if (active) {
          setError("Impossible de charger les détails de l'établissement.");
          console.error(err);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchDetails();
    return () => {
      active = false;
    };
  }, [establishmentId]);

  // Check if establishment is in user's favorites
  useEffect(() => {
    let active = true;
    const checkFavorite = async () => {
      if (!user) {
        setIsFavorite(false);
        return;
      }
      try {
        const favList = await api.favorites.list();
        const isFav = favList.some((fav: Etablissement) => fav.id === establishmentId);
        if (active) {
          setIsFavorite(isFav);
        }
      } catch (err) {
        console.error("Erreur lors de la vérification du statut favori :", err);
      }
    };
    checkFavorite();
    return () => {
      active = false;
    };
  }, [establishmentId, user]);

  // Load 7 days of slots in parallel
  useEffect(() => {
    if (!selectedCollaborateur || !selectedPrestation) {
      return;
    }

    let active = true;
    const fetchWeeklySlots = async () => {
      try {
        setLoadingSlots(true);
        
        const results = await Promise.all(
          weeklyDays.map(async (day) => {
            if (day.dayName.toLowerCase() === 'dimanche') {
              return { dateStr: day.fullDate, slots: [] };
            }
            try {
              const slots = await api.bookings.getAvailableSlots(selectedCollaborateur.id, day.fullDate);
              return { dateStr: day.fullDate, slots };
            } catch {
              return { dateStr: day.fullDate, slots: [] };
            }
          })
        );

        if (active) {
          const slotsMap: { [date: string]: { time: string; available: boolean }[] } = {};
          results.forEach((res) => {
            slotsMap[res.dateStr] = res.slots;
          });
          setWeeklySlots(slotsMap);
        }
      } catch (err) {
        console.error("Erreur récupération créneaux de la semaine :", err);
      } finally {
        if (active) setLoadingSlots(false);
      }
    };

    fetchWeeklySlots();
    return () => {
      active = false;
    };
  }, [selectedCollaborateur, selectedPrestation, weekOffset]);

  // Load messaging chat if the messages tab is active
  const loadChat = async () => {
    if (!user) return;
    try {
      setChatLoading(true);
      const resDiscList = await api.messaging.listDiscussions();
      const existing = resDiscList.discussions.find(
        (d: Discussion) => d.etablissement.id === establishmentId
      );
      if (existing) {
        setDiscussion(existing);
        const resMsgs = await api.messaging.listMessages(existing.id);
        setChatMessages(resMsgs.messages);
      } else {
        setDiscussion(null);
        setChatMessages([]);
      }
    } catch (err) {
      console.error("Erreur de chargement messagerie :", err);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'messages' && user) {
      const timer = setTimeout(() => {
        loadChat();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeTab, establishmentId, user]);

  // Handle message sending
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user) return;
    try {
      setSendingMessage(true);
      let discId = discussion?.id;
      if (!discId) {
        const startRes = await api.messaging.startDiscussion(
          establishmentId,
          `Discussion avec ${establishment?.nom || 'établissement'}`
        );
        discId = startRes.discussion.id;
        setDiscussion(startRes.discussion);
      }

      await api.messaging.sendMessage(discId, chatInput.trim());
      setChatInput("");
      
      const resMsgs = await api.messaging.listMessages(discId);
      setChatMessages(resMsgs.messages);
    } catch (err) {
      console.error("Erreur lors de l'envoi du message :", err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Load reviews for the establishment
  const loadReviews = useCallback(async () => {
    try {
      setReviewsLoading(true);
      const data = await api.reviews.listForEstablishment(establishmentId);
      setEstablishmentReviews(data);
    } catch (err) {
      console.error("Erreur de chargement des avis :", err);
    } finally {
      setReviewsLoading(false);
    }
  }, [establishmentId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReviews();
    }, 0);
    return () => clearTimeout(timer);
  }, [establishmentId, loadReviews]);

  // Handle review submit
  const handleSendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewFormMessage.trim() || !user) return;
    try {
      setReviewSubmitLoading(true);
      setReviewSuccessMsg("");
      setReviewErrorMsg("");
      await api.reviews.add(establishmentId, reviewFormMessage.trim(), reviewFormNote);
      setReviewFormMessage("");
      setReviewFormNote(5);
      setReviewSuccessMsg("Votre avis a bien été publié !");
      loadReviews();
    } catch (err) {
      console.error("Erreur lors de la publication de l'avis :", err);
      const msg = err instanceof Error ? err.message : "Impossible de publier votre avis.";
      setReviewErrorMsg(msg);
    } finally {
      setReviewSubmitLoading(false);
    }
  };

  // Handle review deletion
  const handleDeleteReview = async (reviewId: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet avis ?")) return;
    try {
      setReviewsLoading(true);
      setReviewErrorMsg("");
      setReviewSuccessMsg("");
      await api.reviews.delete(reviewId);
      setReviewSuccessMsg("L'avis a bien été supprimé !");
      loadReviews();
    } catch (err: unknown) {
      console.error("Erreur lors de la suppression de l'avis :", err);
      const msg = err instanceof Error ? err.message : "Impossible de supprimer cet avis.";
      setReviewErrorMsg(msg);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Handle booking creation
  const handleBookSlot = async () => {
    if (!user) {
      onNavigate('login');
      return;
    }
    if (!selectedPrestation || !selectedCollaborateur || !selectedDate || !selectedTime) {
      setBookingError("Veuillez sélectionner un service, un professionnel et un créneau.");
      return;
    }

    try {
      setBookingLoading(true);
      setBookingError(null);
      
      const dateHeureISO = `${selectedDate}T${selectedTime}:00`;
      
      const res = await api.bookings.create({
        professionnel_id: selectedCollaborateur.id,
        prestation_id: selectedPrestation.id,
        date_heure: dateHeureISO,
        duree: 30,
        payment_method: paymentMethod
      });

      if (res.payment_url) {
        window.location.assign(res.payment_url);
      } else {
        setBookingSuccess(true);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Une erreur est survenue lors de la réservation.";
      setBookingError(errorMsg);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      onNavigate('login');
      return;
    }
    try {
      if (isFavorite) {
        await api.favorites.remove(establishmentId);
        setIsFavorite(false);
      } else {
        await api.favorites.add(establishmentId);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour du favori :", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-12 h-12 border-2 border-neutral-800 border-t-transparent animate-spin rounded-full"></div>
      </div>
    );
  }

  if (error || !establishment) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Alert type="error" message={error || "Établissement introuvable."} />
        <div className="mt-6 text-center">
          <Button onClick={() => onNavigate('home')} variant="primary">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  const rating = establishment.note_globale !== undefined
    ? establishment.note_globale.toFixed(1)
    : (establishment.rating || (4.5 + (establishment.id % 5) / 10).toFixed(1));
  const ratingAccueil = establishment.note_accueil !== undefined ? establishment.note_accueil.toFixed(1) : rating;
  const ratingProprete = establishment.note_proprete !== undefined ? establishment.note_proprete.toFixed(1) : rating;
  const ratingCadre = establishment.note_cadre !== undefined ? establishment.note_cadre.toFixed(1) : rating;
  const ratingPrestation = establishment.note_prestation !== undefined ? establishment.note_prestation.toFixed(1) : rating;
  const nombreAvis = establishment.nombre_avis !== undefined ? establishment.nombre_avis : 56;

  const defaultHoraires: Record<string, string> = {
    "Lundi": "09:00 - 19:00",
    "Mardi": "09:00 - 19:00",
    "Mercredi": "09:00 - 19:00",
    "Jeudi": "09:00 - 20:00",
    "Vendredi": "09:00 - 20:00",
    "Samedi": "09:00 - 18:00",
    "Dimanche": "Fermé"
  };
  const horaires = establishment.horaires || defaultHoraires;
  const daysOrder = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const displayedSlots = (!selectedCollaborateur || !selectedPrestation) ? {} : weeklySlots;

  const categoryLabel = establishment.secteur?.nom || establishment.category || "Établissement";
  const mainImage = establishment.image || (establishment.photos && establishment.photos.length > 0
    ? establishment.photos[0]
    : "https://images.unsplash.com/photo-1521791136368-1a8b27526d5f?auto=format&fit=crop&w=600&q=80");

  const photos = establishment.photos && establishment.photos.length > 0
    ? establishment.photos
    : [
        mainImage,
        "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1620331311520-246422fd82f9?auto=format&fit=crop&w=600&q=80"
      ];

  const handleOpenGallery = (index: number) => {
    setActivePhotoIndex(index);
    setShowGalleryModal(true);
  };

  const handleSelectSlot = (dateStr: string, timeStr: string) => {
    setSelectedDate(dateStr);
    setSelectedTime(timeStr);
    setBookingError(null);
  };

  return (
    <div className="w-full bg-[#FAF9F6] min-h-screen text-neutral-900 pb-16">
      
      {/* Header section (pure white background, clean details) */}
      <div className="w-full bg-white border-b border-neutral-200/60 py-6">
        <div className="max-w-6xl mx-auto px-6">
          {/* Breadcrumb Back Button */}
          <button 
            onClick={() => onNavigate('search')}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            ← Retour aux résultats
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-955 mb-2">
                {establishment.nom || establishment.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-500 font-semibold">
                <a 
                  href={`https://maps.google.com/?q=${encodeURIComponent(establishment.lieu ? `${establishment.lieu.adresse}, ${establishment.lieu.ville}` : establishment.address || '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-neutral-900"
                >
                  {establishment.lieu ? `${establishment.lieu.adresse}, ${establishment.lieu.ville}` : establishment.address || 'Adresse non spécifiée'}
                </a>
                
                <span className="text-neutral-300">|</span>
                
                <span className="flex items-center gap-1">
                  <span className="text-amber-500">★</span> {rating} ({nombreAvis} avis)
                </span>

                <span className="text-neutral-300">|</span>

                <span className="text-neutral-400 font-bold uppercase tracking-wider">
                  {categoryLabel}
                </span>
              </div>
            </div>

            {/* Actions on the right */}
            <div className="flex items-center gap-3">
              <button 
                onClick={handleToggleFavorite}
                title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                className={`w-10 h-10 border rounded-xl bg-white flex items-center justify-center transition-colors shadow-sm cursor-pointer ${
                  isFavorite 
                    ? 'border-red-200 text-red-500 hover:bg-red-50/50' 
                    : 'border-neutral-200 text-neutral-500 hover:text-red-500 hover:border-red-200 hover:bg-neutral-50'
                }`}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill={isFavorite ? "currentColor" : "none"} 
                  viewBox="0 0 24 24" 
                  strokeWidth={1.5} 
                  stroke="currentColor" 
                  className="w-5.5 h-5.5"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" 
                  />
                </svg>
              </button>
              <a 
                href="#booking-tunnel-section"
                className="px-6 py-2.5 bg-neutral-950 hover:bg-neutral-850 text-white font-bold text-sm rounded-xl shadow-sm transition-colors text-center inline-block cursor-pointer"
              >
                Prendre RDV
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Photo Grid Section (Exactly matching Planity layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          {/* Main Photo (left) */}
          <div 
            onClick={() => handleOpenGallery(0)}
            className="md:col-span-2 rounded-2xl overflow-hidden h-[250px] md:h-[360px] bg-neutral-100 relative group cursor-pointer"
          >
            <img 
              src={photos[0]} 
              alt="Main" 
              className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
            />
          </div>
          
          {/* Sub Photos Stack (right) */}
          <div className="grid grid-rows-2 gap-3 h-[250px] md:h-[360px]">
            <div 
              onClick={() => handleOpenGallery(1)}
              className="rounded-2xl overflow-hidden h-full bg-neutral-100 group cursor-pointer"
            >
              <img 
                src={photos[1] || photos[0]} 
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                alt="Sub 1"
              />
            </div>
            <div 
              onClick={() => handleOpenGallery(2)}
              className="relative rounded-2xl overflow-hidden h-full bg-neutral-100 group cursor-pointer"
            >
              <img 
                src={photos[2] || photos[0]} 
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                alt="Sub 2"
              />
              <div className="absolute inset-0 bg-black/45 hover:bg-black/40 transition-colors backdrop-blur-[1.5px] flex items-center justify-center text-white font-bold text-xs md:text-sm">
                Voir les {photos.length} photos
              </div>
            </div>
          </div>
        </div>

        {/* Subtitle & Immediate confirmation */}
        <div className="mb-8 border-b border-neutral-200 pb-5">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-neutral-955">
            Réserver en ligne pour un RDV chez {establishment.nom || establishment.name}
          </h2>
          <p className="text-xs text-neutral-400 font-semibold mt-1">
            24h/24 - Confirmation immédiate
          </p>
        </div>

        {/* Main Grid: Left col = Prestations & Booking tunnel, Right col = Sidebar Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Column Left: Prestations List / Reservation Tunnel */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Tabs for Navigation */}
            <div className="flex border-b border-neutral-200 overflow-x-auto no-scrollbar whitespace-nowrap gap-6 text-sm font-semibold mb-6">
              <button
                onClick={() => setActiveTab('prestations')}
                className={`pb-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'prestations' 
                    ? 'border-neutral-950 text-neutral-950 font-bold' 
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                Prestations & Tarifs
              </button>
              <button
                onClick={() => setActiveTab('infos')}
                className={`pb-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'infos' 
                    ? 'border-neutral-950 text-neutral-950 font-bold' 
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                Informations
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`pb-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'messages' 
                    ? 'border-neutral-950 text-neutral-950 font-bold' 
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                Contacter le gérant
              </button>
            </div>

            {/* TAB CONTENT: PRESTATIONS & BOOKING TUNNEL */}
            {activeTab === 'prestations' && (
              <div className="space-y-8 animate-fadeIn" id="booking-tunnel-section">
                
                {/* 1. Selected Prestation Display or Prestations Chooser */}
                {selectedPrestation ? (
                  <div className="space-y-6">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                      <span className="w-5 h-5 bg-neutral-900 text-white rounded-full flex items-center justify-center text-[10px] font-black">1</span>
                      Prestation sélectionnée
                    </h3>

                    {/* Prestation selection card */}
                    <div className="bg-white border border-neutral-200/60 p-5 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-sm">
                      <div className="flex-1">
                        <h4 className="font-extrabold text-sm text-neutral-900">
                          {selectedPrestation.nom}
                        </h4>
                        <p className="text-xs text-neutral-450 font-semibold mt-1">
                          30min • à partir de {selectedPrestation.cout} €
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        {/* Selector Dropdown: "Choisir avec qui ?" */}
                        {establishment.collaborateurs && establishment.collaborateurs.length > 0 && (
                          <div className="relative">
                            <select
                              value={selectedCollaborateur?.id || ""}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                const found = establishment.collaborateurs?.find(c => c.id === val);
                                if (found) setSelectedCollaborateur(found);
                              }}
                              className="bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-800 focus:outline-none focus:border-neutral-900 select-none shadow-sm pr-8 cursor-pointer appearance-none"
                            >
                              {establishment.collaborateurs.map((col) => (
                                <option key={col.id} value={col.id}>
                                  Avec {col.prenom} ({col.poste})
                                </option>
                              ))}
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 text-[10px]">▼</span>
                          </div>
                        )}

                        {/* Supprimer button */}
                        <button
                          onClick={() => {
                            setSelectedPrestation(null);
                            setSelectedDate(null);
                            setSelectedTime(null);
                          }}
                          className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline transition-all cursor-pointer"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>

                    {/* Button to add another (just visually matching the mockup for complete experience) */}
                    <button 
                      onClick={() => {
                        setSelectedPrestation(null);
                        setSelectedDate(null);
                        setSelectedTime(null);
                      }}
                      className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-850 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      + Changer de prestation
                    </button>

                    {/* 2. Choose Date & Time Calendar Grid */}
                    <div className="pt-4 space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                          <span className="w-5 h-5 bg-neutral-900 text-white rounded-full flex items-center justify-center text-[10px] font-black">2</span>
                          Choix de la date & heure
                        </h3>
                        
                        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                          <button
                            disabled={weekOffset === 0}
                            onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                            className="w-7 h-7 border border-neutral-200 rounded-lg bg-white flex items-center justify-center hover:bg-neutral-50 disabled:opacity-50 cursor-pointer text-xs"
                          >
                            &lt;
                          </button>
                          <span>Semaine {weekOffset + 1}</span>
                          <button
                            onClick={() => setWeekOffset(prev => prev + 1)}
                            className="w-7 h-7 border border-neutral-200 rounded-lg bg-white flex items-center justify-center hover:bg-neutral-50 cursor-pointer text-xs"
                          >
                            &gt;
                          </button>
                        </div>
                      </div>

                      {/* 7 Columns Slots Calendar Grid */}
                      <div className="bg-white border border-neutral-200/60 rounded-2xl p-6 shadow-sm overflow-x-auto no-scrollbar relative min-h-[200px]">
                        {loadingSlots ? (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex justify-center items-center z-10">
                            <div className="w-8 h-8 border-2 border-neutral-850 border-t-transparent animate-spin rounded-full"></div>
                          </div>
                        ) : null}

                        <div className="grid grid-cols-7 gap-3 min-w-[700px] text-center select-none">
                          {weeklyDays.map((day) => {
                            const daySlots = displayedSlots[day.fullDate] || [];
                            const isSunday = day.dayName.toLowerCase() === 'dimanche';
                            
                            return (
                              <div key={day.fullDate} className="space-y-4">
                                {/* Column day header */}
                                <div className="border-b border-neutral-100 pb-3">
                                  <span className="text-[11px] font-bold text-neutral-400 block capitalize">{day.dayName.split(' ')[0]}</span>
                                  <span className="text-xs font-black text-neutral-800 block mt-0.5">{day.dayNum} {day.monthName.split(' ')[0]}</span>
                                </div>

                                {/* Vertical Slots List */}
                                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-0.5 scrollbar-thin">
                                  {isSunday ? (
                                    <span className="text-[10px] font-bold text-red-400 block py-4">Fermé</span>
                                  ) : daySlots.length > 0 ? (
                                    daySlots.map((slot) => {
                                      const isCurrent = selectedDate === day.fullDate && selectedTime === slot.time;
                                      return (
                                        <button
                                          key={slot.time}
                                          type="button"
                                          disabled={!slot.available}
                                          onClick={() => handleSelectSlot(day.fullDate, slot.time)}
                                          className={`w-full py-2 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${
                                            !slot.available 
                                              ? 'bg-neutral-50/50 text-neutral-200 border-neutral-100 cursor-not-allowed line-through' 
                                              : isCurrent 
                                                ? 'bg-neutral-900 text-white border-neutral-900 shadow-md scale-[1.02]' 
                                                : 'bg-white text-neutral-750 border-neutral-200 hover:bg-neutral-50'
                                          }`}
                                        >
                                          {slot.time}
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <span className="text-[9px] font-bold text-neutral-350 block py-4">Aucun créneau</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Validation Card showing once date & time are selected */}
                      {selectedDate && selectedTime && (
                        <div className="bg-white border border-neutral-200/60 p-5 rounded-2xl shadow-sm animate-fadeIn space-y-4">
                          <h4 className="font-extrabold text-sm text-neutral-900">Confirmez votre horaire</h4>
                          <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
                            Vous avez choisi le <span className="font-bold text-neutral-800">{selectedDate.split('-').reverse().join('/')}</span> à <span className="font-bold text-neutral-800">{selectedTime}</span> avec <span className="font-bold text-neutral-800">{selectedCollaborateur?.prenom}</span>.
                          </p>

                          {bookingError && <Alert type="error" message={bookingError} className="text-xs" />}

                          {bookingSuccess ? (
                            <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl p-4 text-xs font-bold space-y-2">
                              <p>✓ Votre réservation a été confirmée avec succès !</p>
                              <button 
                                onClick={() => onNavigate('profile')}
                                className="underline hover:text-emerald-950"
                              >
                                Accéder à mes rendez-vous →
                              </button>
                            </div>
                          ) : user ? (
                            <div className="space-y-4">
                              <div className="space-y-2 pt-2 border-t border-neutral-100">
                                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">
                                  Mode de paiement
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setPaymentMethod('on_site')}
                                    className={`flex flex-col items-start p-3 border-2 rounded-xl text-left transition-all cursor-pointer ${
                                      paymentMethod === 'on_site'
                                        ? 'border-neutral-900 bg-neutral-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                        : 'border-neutral-200 hover:border-neutral-400 bg-white'
                                    }`}
                                  >
                                    <span className="font-extrabold text-xs text-neutral-900">Sur place</span>
                                    <span className="text-[9px] text-neutral-500 mt-0.5 font-semibold">Payer à l'établissement</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPaymentMethod('stripe')}
                                    className={`flex flex-col items-start p-3 border-2 rounded-xl text-left transition-all cursor-pointer ${
                                      paymentMethod === 'stripe'
                                        ? 'border-neutral-900 bg-neutral-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                        : 'border-neutral-200 hover:border-neutral-400 bg-white'
                                    }`}
                                  >
                                    <span className="font-extrabold text-xs text-neutral-900">Carte bancaire</span>
                                    <span className="text-[9px] text-neutral-500 mt-0.5 font-semibold">Payer via Stripe Test</span>
                                  </button>
                                </div>
                              </div>

                              <div className="flex gap-3">
                                <Button
                                  onClick={handleBookSlot}
                                  variant="primary"
                                  loading={bookingLoading}
                                  disabled={bookingLoading}
                                >
                                  {bookingLoading ? "Réservation en cours..." : "Valider mon rendez-vous"}
                                </Button>
                                <button
                                  onClick={() => {
                                    setSelectedDate(null);
                                    setSelectedTime(null);
                                  }}
                                  className="px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="border border-neutral-200 bg-[#FBFAF8] rounded-xl p-4 text-center">
                              <p className="font-semibold text-xs text-neutral-500 mb-3">Veuillez vous connecter pour finaliser la réservation.</p>
                              <Button onClick={() => onNavigate('login')} variant="primary">Se connecter</Button>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-black uppercase text-xs tracking-wider text-neutral-400 mb-4">
                      {categoryLabel.toUpperCase()}
                    </h3>

                    {establishment.prestations && establishment.prestations.length > 0 ? (
                      <div className="bg-white border border-neutral-200/60 rounded-2xl divide-y divide-neutral-100 overflow-hidden shadow-sm">
                        {establishment.prestations.map((prest) => (
                          <div 
                            key={prest.id}
                            className="p-5 flex justify-between items-center transition-all bg-white hover:bg-neutral-50/30"
                          >
                            <div className="flex-1 pr-6">
                              <h4 className="font-bold text-sm text-neutral-850">
                                {prest.nom}
                              </h4>
                              <p className="text-xs text-neutral-450 mt-1 leading-relaxed max-w-lg">
                                {prest.description || "Aucune description de service."}
                              </p>
                            </div>
                            <div className="flex items-center gap-6 shrink-0">
                              <div className="text-right">
                                <span className="text-[11px] text-neutral-400 font-semibold block">30min</span>
                                <span className="font-black text-sm text-neutral-800">à partir de {prest.cout} €</span>
                              </div>
                              <button
                                onClick={() => setSelectedPrestation(prest)}
                                className="px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200"
                              >
                                Choisir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-neutral-400 font-medium text-sm">Aucune prestation disponible pour cet établissement.</p>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* TAB CONTENT: INFOS */}
            {activeTab === 'infos' && (
              <div className="bg-white border border-neutral-200/60 rounded-2xl p-6 shadow-sm animate-fadeIn space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 tracking-tight mb-2">Présentation</h2>
                  <p className="text-neutral-500 text-sm leading-relaxed">
                    {establishment.description || "Bienvenue dans notre établissement. Nous mettons tout en oeuvre pour vous proposer un service irréprochable et un moment inoubliable."}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-neutral-100 pt-5">
                  <div>
                    <h3 className="font-bold uppercase text-[10px] tracking-wider mb-2 text-neutral-450">Adresse</h3>
                    <p className="font-semibold text-neutral-800 text-sm">
                      {establishment.lieu ? `${establishment.lieu.adresse}, ${establishment.lieu.ville} (${establishment.lieu.code_postal || ''})` : establishment.address || 'Adresse non spécifiée'}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold uppercase text-[10px] tracking-wider mb-2 text-neutral-455">Contact</h3>
                    <div className="space-y-1 font-semibold text-neutral-800 text-sm">
                      {establishment.telephone && <p>Téléphone : {establishment.telephone}</p>}
                      {establishment.mail && <p>E-mail : {establishment.mail}</p>}
                      {establishment.site_web && (
                        <p>
                          Site : <a href={establishment.site_web} target="_blank" rel="noreferrer" className="text-neutral-600 underline hover:text-neutral-900">{establishment.site_web}</a>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: MESSAGING */}
            {activeTab === 'messages' && (
              <div className="bg-white border border-neutral-200/60 rounded-2xl p-6 shadow-sm animate-fadeIn">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Discussion directe</h2>
                  <p className="text-neutral-400 text-xs mt-0.5">Posez une question directement au gérant de l'établissement.</p>
                </div>

                {!user ? (
                  <div className="text-center py-6 bg-[#FBFAF7] rounded-xl border border-neutral-100 p-4">
                    <p className="text-neutral-500 font-semibold text-xs mb-3">Vous devez vous connecter pour discuter avec l'établissement.</p>
                    <Button onClick={() => onNavigate('login')} variant="primary">Se connecter</Button>
                  </div>
                ) : chatLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="w-6 h-6 border-2 border-neutral-800 border-t-transparent animate-spin rounded-full"></div>
                  </div>
                ) : (
                  <div className="flex flex-col h-[320px] border border-neutral-200/80 rounded-xl overflow-hidden bg-neutral-50/50">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {chatMessages.length > 0 ? (
                        chatMessages.map((msg) => {
                          const isMe = msg.sender.id === user.id;
                          return (
                            <div 
                              key={msg.id} 
                              className={`flex flex-col max-w-[75%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                            >
                              <div className={`p-2.5 rounded-xl text-xs font-semibold leading-relaxed ${
                                isMe 
                                  ? 'bg-neutral-900 text-white rounded-tr-none' 
                                  : 'bg-white text-neutral-800 border border-neutral-100 rounded-tl-none'
                              }`}>
                                {msg.content}
                              </div>
                              <span className="text-[9px] text-neutral-400 mt-1">
                                {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400 text-xs">
                          <p className="font-semibold">Aucun message pour l'instant.</p>
                          <p className="text-neutral-400 mt-0.5">Envoyez un message pour commencer.</p>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSendMessage} className="bg-white border-t border-neutral-200 p-2 flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Écrivez votre message..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-semibold text-neutral-850 focus:outline-none"
                        disabled={sendingMessage}
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim() || sendingMessage}
                        className="px-3 py-2 bg-neutral-900 hover:bg-neutral-850 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                      >
                        Envoyer
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Column Right: Sidebar Rating & Hours */}
          <div className="space-y-6">
            
            {/* Note globale & Avis Tab Card */}
            <div className="bg-white border border-neutral-200/60 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex border-b border-neutral-100 text-xs font-bold text-center">
                <button
                  type="button"
                  onClick={() => setActiveReviewsTab('notes')}
                  className={`flex-1 py-3 border-r border-neutral-100 transition-colors cursor-pointer ${
                    activeReviewsTab === 'notes'
                      ? 'bg-neutral-50/35 text-neutral-850 font-extrabold'
                      : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  Note globale
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReviewsTab('reviews')}
                  className={`flex-1 py-3 transition-colors cursor-pointer ${
                    activeReviewsTab === 'reviews'
                      ? 'bg-neutral-50/35 text-neutral-850 font-extrabold'
                      : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  Avis ({establishmentReviews.length})
                </button>
              </div>

              {activeReviewsTab === 'notes' ? (
                <>
                  <div className="p-5 flex gap-4 items-center">
                    <div className="w-16 h-16 bg-neutral-900 text-white rounded-xl flex items-center justify-center flex-col shrink-0 shadow-inner">
                      <span className="text-2xl font-black">{rating}</span>
                    </div>
                    <div className="flex-1 text-[11px] font-bold text-neutral-555 space-y-1">
                      <div className="flex justify-between">
                        <span>Accueil</span>
                        <span className="text-neutral-800">{ratingAccueil} ★</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Propreté</span>
                        <span className="text-neutral-800">{ratingProprete} ★</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cadre & Ambiance</span>
                        <span className="text-neutral-800">{ratingCadre} ★</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Prestation</span>
                        <span className="text-neutral-800">{ratingPrestation} ★</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-50/60 p-3 text-center border-t border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    {nombreAvis} clients ont donné leur avis
                  </div>
                </>
              ) : (
                <div>
                  {reviewsLoading ? (
                    <div className="p-8 flex justify-center items-center">
                      <div className="w-5 h-5 border-2 border-neutral-900 border-t-transparent animate-spin rounded-full"></div>
                    </div>
                  ) : establishmentReviews.length > 0 ? (
                    <div className="p-4 space-y-3 max-h-[200px] overflow-y-auto border-b border-neutral-100 text-left">
                      {establishmentReviews.map((rev) => {
                        const canDelete = user && (
                          user.role === 'admin' ||
                          user.email === rev.client?.email ||
                          (user.role === 'gerant' && (user.establishment_id === establishmentId || user.establishments?.some(e => e.id === establishmentId)))
                        );
                        return (
                          <div key={rev.id} className="border-b border-neutral-50 pb-2 last:border-b-0">
                            <div className="flex justify-between items-center text-[10px] font-bold text-neutral-800">
                              <span>{rev.client?.first_name || "Client"}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-neutral-400">{new Date(rev.date_envoie).toLocaleDateString('fr-FR')}</span>
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteReview(rev.id)}
                                    className="text-red-500 hover:text-red-700 font-extrabold cursor-pointer transition-colors"
                                    title="Supprimer l'avis"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="text-[10px] text-amber-500 tracking-widest mt-0.5">
                              {"★".repeat(rev.note || 5)}{"☆".repeat(5 - (rev.note || 5))}
                            </div>
                            <p className="text-[11px] text-neutral-600 mt-1 font-medium italic">"{rev.message}"</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-neutral-450 border-b border-neutral-100 font-medium">
                      Aucun avis publié pour le moment.
                    </div>
                  )}

                  {/* Add review form */}
                  {user ? (
                    <form onSubmit={handleSendReview} className="p-4 space-y-2 text-left bg-neutral-50">
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Publier un avis</label>
                      {reviewSuccessMsg && <div className="text-[10px] font-bold text-emerald-600">{reviewSuccessMsg}</div>}
                      {reviewErrorMsg && <div className="text-[10px] font-bold text-red-600">{reviewErrorMsg}</div>}
                      
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewFormNote(star)}
                            className={`text-lg transition-colors cursor-pointer ${star <= reviewFormNote ? 'text-amber-500' : 'text-neutral-300'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>

                      <textarea
                        rows={2}
                        value={reviewFormMessage}
                        onChange={(e) => setReviewFormMessage(e.target.value)}
                        placeholder="Écrivez votre avis..."
                        className="w-full text-xs p-2 border border-neutral-250 rounded-lg focus:outline-none focus:border-neutral-900 bg-white"
                      />
                      <button
                        type="submit"
                        disabled={!reviewFormMessage.trim() || reviewSubmitLoading}
                        className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-850 text-white text-[10px] font-extrabold rounded-lg disabled:opacity-50 uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        {reviewSubmitLoading ? "Envoi..." : "Envoyer"}
                      </button>
                    </form>
                  ) : (
                    <div className="p-4 bg-neutral-50 text-[10px] font-bold text-neutral-400 text-center">
                      Connectez-vous pour laisser un avis.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Opening hours widget */}
            <div className="bg-white border border-neutral-200/60 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm text-neutral-850 pb-2 border-b border-neutral-100">
                Horaires d'ouverture
              </h3>
              <div className="space-y-1.5 text-xs text-neutral-500 font-medium">
                {daysOrder.map(day => {
                  const val = horaires[day] || "Fermé";
                  const isClosed = val.toLowerCase().includes("fermé");
                  return (
                    <div key={day} className="flex justify-between">
                      <span>{day} :</span>
                      <span className={isClosed ? "font-bold text-red-500" : "text-neutral-700"}>{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Lightbox / Gallery Modal */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col justify-between p-6">
          {/* Top bar */}
          <div className="flex justify-between items-center text-white select-none">
            <span className="font-bold text-sm">
              {activePhotoIndex + 1} / {photos.length}
            </span>
            <button 
              onClick={() => setShowGalleryModal(false)}
              className="text-white hover:text-neutral-300 font-extrabold text-xl p-2 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Center Area: Image & Nav buttons */}
          <div className="flex-1 flex items-center justify-center relative">
            <button 
              onClick={() => setActivePhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))}
              className="absolute left-4 bg-white/10 hover:bg-white/20 text-white font-bold p-4 rounded-full transition-all select-none cursor-pointer"
            >
              ←
            </button>

            <img 
              src={photos[activePhotoIndex]} 
              alt={`Galerie ${activePhotoIndex + 1}`} 
              className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl transition-all duration-300"
            />

            <button 
              onClick={() => setActivePhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))}
              className="absolute right-4 bg-white/10 hover:bg-white/20 text-white font-bold p-4 rounded-full transition-all select-none cursor-pointer"
            >
              →
            </button>
          </div>

          {/* Thumbnails strip at the bottom */}
          <div className="flex justify-center gap-2 overflow-x-auto py-4 select-none">
            {photos.map((url, idx) => (
              <button
                key={idx}
                onClick={() => setActivePhotoIndex(idx)}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                  activePhotoIndex === idx ? 'border-white scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={url} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

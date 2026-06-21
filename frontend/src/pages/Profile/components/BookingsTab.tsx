import { useState, useRef, useEffect } from 'react';
import type { Booking } from '../../../types';
import EmptyState from '../../../components/EmptyState';
import { api } from '../../../services/api';

interface BookingsTabProps {
  bookings: Booking[];
  onNavigate: (page: string) => void;
  onRefreshBookings?: () => void;
}

export default function BookingsTab({ bookings, onNavigate, onRefreshBookings }: BookingsTabProps) {
  const [payLoadingId, setPayLoadingId] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const isCancellingRef = useRef(false);
  const [selectedBookingForReschedule, setSelectedBookingForReschedule] = useState<Booking | null>(null);

  const handlePay = async (bookingId: number) => {
    try {
      setPayLoadingId(bookingId);
      const url = await api.bookings.getCheckoutUrl(bookingId);
      window.location.assign(url);
    } catch (err) {
      console.error(err);
      alert("Impossible de démarrer le paiement.");
    } finally {
      setPayLoadingId(null);
    }
  };

  const handleCancel = async (id: number) => {
    if (isCancellingRef.current) return;

    isCancellingRef.current = true;
    setIsCancelling(true);

    if (!confirm("Voulez-vous vraiment annuler ce rendez-vous ?")) {
      isCancellingRef.current = false;
      setIsCancelling(false);
      return;
    }

    try {
      await api.bookings.cancel(id);
      onRefreshBookings?.();
      alert("Le rendez-vous a bien été annulé.");
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue : " + (err instanceof Error ? err.message : String(err)));
    } finally {
      isCancellingRef.current = false;
      setIsCancelling(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-black text-neutral-900 uppercase mb-6 pb-2 border-b-2 border-neutral-100">Mes Rendez-vous</h2>

      {bookings.length === 0 ? (
        <EmptyState
          title="Aucun rendez-vous planifié"
          description="Vous n'avez aucun rendez-vous à venir. Explorez les professionnels à proximité pour bloquer votre premier créneau."
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
            </svg>
          }
          actionLabel="Découvrir les établissements"
          onAction={() => onNavigate('home')}
        />
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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  {booking.booking_date}
                </p>
              </div>
              <div className="flex flex-col sm:items-end gap-2">
                {booking.status === 'cancelled' ? (
                  <div className="flex flex-col sm:items-end gap-1.5">
                    <span className="inline-block px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-neutral-900 rounded-md bg-rose-100 text-rose-900">
                      Annulé
                    </span>
                    {booking.payment_status === 'refunded' && (
                      <span className="inline-block px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-neutral-900 rounded-md bg-blue-100 text-blue-900">
                        Remboursé
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:items-end gap-2">
                    {booking.status === 'pending' ? (
                      <span className="inline-block px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-neutral-900 rounded-md bg-amber-100 text-amber-900">
                        En attente de paiement
                      </span>
                    ) : (
                      <>
                        {booking.payment_method === 'on_site' ? (
                          <span className="inline-block px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-neutral-900 rounded-md bg-emerald-100 text-emerald-950">
                            Paiement sur place
                          </span>
                        ) : booking.payment_method === 'stripe' ? (
                          <span className="inline-block px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-neutral-900 rounded-md bg-emerald-100 text-emerald-950">
                            Payé par carte (Stripe)
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-neutral-900 rounded-md bg-emerald-100 text-emerald-900">
                            Confirmé
                          </span>
                        )}
                      </>
                    )}

                    <div className="flex gap-2">
                      {booking.status === 'pending' && booking.payment_method === 'stripe' && booking.payment_status !== 'paid' && (
                        <button
                          onClick={() => handlePay(booking.id)}
                          disabled={payLoadingId === booking.id}
                          className="px-2.5 py-1.5 border-2 border-neutral-900 bg-amber-100 hover:bg-amber-200 text-neutral-900 font-black rounded-xl text-xs uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-0 active:translate-x-0 cursor-pointer disabled:opacity-50"
                        >
                          {payLoadingId === booking.id ? "Redirection..." : "Payer maintenant"}
                        </button>
                      )}
                      
                      <button
                        disabled={isCancelling}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBookingForReschedule(booking);
                        }}
                        className="border-2 border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-black rounded-xl px-3 py-1.5 text-xs cursor-pointer select-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-0 active:translate-x-0"
                      >
                        Modifier
                      </button>

                      <button
                        disabled={isCancelling}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(booking.id);
                        }}
                        className="border-2 border-red-600 bg-white hover:bg-red-50 text-red-600 shadow-[2px_2px_0px_0px_rgba(220,38,38,1)] transition-all font-black rounded-xl px-3 py-1.5 text-xs cursor-pointer select-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-0 active:translate-x-0"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBookingForReschedule && (
        <RescheduleModal
          booking={selectedBookingForReschedule}
          onClose={() => setSelectedBookingForReschedule(null)}
          onSuccess={() => {
            setSelectedBookingForReschedule(null);
            onRefreshBookings?.();
          }}
        />
      )}
    </div>
  );
}

interface RescheduleModalProps {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}

function RescheduleModal({ booking, onClose, onSuccess }: RescheduleModalProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [weeklySlots, setWeeklySlots] = useState<{ [date: string]: { time: string; available: boolean }[] }>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getWeeklyDays = (offset: number) => {
    const days = [];
    const locale = 'fr-FR';
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + (offset * 7) + i);
      
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

  const weeklyDays = getWeeklyDays(weekOffset);

  useEffect(() => {
    if (!booking.professionnel?.id) return;
    
    let active = true;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      setError(null);
      try {
        const results = await Promise.all(
          weeklyDays.map(async (day) => {
            if (day.dayName.toLowerCase() === 'dimanche') {
              return { dateStr: day.fullDate, slots: [] };
            }
            try {
              const slots = await api.bookings.getAvailableSlots(
                booking.professionnel!.id,
                day.fullDate,
                booking.id
              );
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
        console.error(err);
        if (active) setError("Erreur de chargement des créneaux de la semaine.");
      } finally {
        if (active) setLoadingSlots(false);
      }
    };

    fetchSlots();
    return () => {
      active = false;
    };
  }, [booking.professionnel?.id, weekOffset, booking.id]);

  // Early return if professional information is missing
  if (!booking.professionnel?.id) {
    return (
      <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white border-4 border-neutral-900 rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md flex flex-col gap-6">
          <div className="flex justify-between items-center border-b-2 border-neutral-100 pb-4">
            <h2 className="text-xl font-black text-neutral-900 uppercase">Erreur</h2>
            <button 
              onClick={onClose}
              className="w-8 h-8 border-2 border-neutral-900 hover:bg-neutral-50 rounded-xl flex items-center justify-center font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="bg-red-50 text-red-800 border-2 border-red-600 p-4 rounded-xl font-bold text-xs">
            Les informations du professionnel ne sont pas disponibles pour ce rendez-vous.
          </div>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!selectedDate || !selectedTime) return;
    setSaving(true);
    setError(null);
    try {
      const dateHeureISO = `${selectedDate}T${selectedTime}:00`;
      await api.bookings.update(booking.id, { date_heure: dateHeureISO });
      onSuccess();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue lors de la replanification.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white border-4 border-neutral-900 rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b-2 border-neutral-100 pb-4">
          <h2 className="text-xl font-black text-neutral-900 uppercase">Replanifier le rendez-vous</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 border-2 border-neutral-900 hover:bg-neutral-50 rounded-xl flex items-center justify-center font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Current booking info */}
        <div className="bg-neutral-50 border-2 border-neutral-900 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="font-extrabold text-neutral-900 text-sm">{booking.establishment_name}</h4>
            <p className="text-xs text-neutral-500 font-semibold mt-1">
              Service : <span className="text-neutral-800">{booking.prestation?.nom || "Non spécifié"}</span>
            </p>
            <p className="text-xs text-neutral-500 font-semibold mt-0.5">
              Professionnel : <span className="text-neutral-800">{booking.professionnel ? `Avec ${booking.professionnel.prenom} (${booking.professionnel.poste})` : "Non spécifié"}</span>
            </p>
          </div>
          <div className="text-left md:text-right shrink-0">
            <span className="text-xs font-bold text-neutral-400 block">Date actuelle</span>
            <span className="text-xs font-black text-neutral-900">{booking.booking_date}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-800 border-2 border-red-600 p-4 rounded-xl font-bold text-xs">
            ⚠️ {error}
          </div>
        )}

        {booking.professionnel?.id && (
          <>
            {/* Week navigation */}
            <div className="flex justify-between items-center mt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">
                Choix de la nouvelle date & heure
              </h3>
              
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                <button
                  disabled={weekOffset === 0}
                  onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                  className="w-7 h-7 border-2 border-neutral-900 rounded-lg bg-white flex items-center justify-center hover:bg-neutral-50 disabled:opacity-50 cursor-pointer text-xs"
                >
                  &lt;
                </button>
                <span className="min-w-[140px] text-center">{weeklyDays[0].dayNum} {weeklyDays[0].monthName} - {weeklyDays[6].dayNum} {weeklyDays[6].monthName}</span>
                <button
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  className="w-7 h-7 border-2 border-neutral-900 rounded-lg bg-white flex items-center justify-center hover:bg-neutral-50 cursor-pointer text-xs"
                >
                  &gt;
                </button>
              </div>
            </div>

            {/* Slots Grid */}
            <div className="bg-white border-2 border-neutral-900 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-x-auto relative min-h-[150px]">
              {loadingSlots && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex justify-center items-center z-10">
                  <div className="w-8 h-8 border-2 border-neutral-850 border-t-transparent animate-spin rounded-full"></div>
                </div>
              )}

              <div className="grid grid-cols-7 gap-2 min-w-[650px] text-center select-none">
                {weeklyDays.map((day) => {
                  const daySlots = weeklySlots[day.fullDate] || [];
                  const isSunday = day.dayName.toLowerCase() === 'dimanche';
                  
                  return (
                    <div key={day.fullDate} className="space-y-3">
                      <div className="border-b-2 border-neutral-100 pb-2">
                        <span className="text-[10px] font-bold text-neutral-400 block capitalize">{day.dayName.split(' ')[0]}</span>
                        <span className="text-[11px] font-black text-neutral-800 block mt-0.5">{day.dayNum} {day.monthName.split(' ')[0]}</span>
                      </div>

                      <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-0.5">
                        {isSunday ? (
                          <span className="text-[10px] font-bold text-red-400 block py-3">Fermé</span>
                        ) : daySlots.length > 0 ? (
                          daySlots.map((slot) => {
                            const isCurrent = selectedDate === day.fullDate && selectedTime === slot.time;
                            return (
                              <button
                                key={slot.time}
                                type="button"
                                disabled={!slot.available}
                                onClick={() => {
                                  setSelectedDate(day.fullDate);
                                  setSelectedTime(slot.time);
                                  setError(null);
                                }}
                                className={`w-full py-1.5 text-[10px] font-black rounded-lg border-2 transition-all cursor-pointer ${
                                  !slot.available 
                                    ? 'bg-neutral-50/50 text-neutral-200 border-neutral-100 cursor-not-allowed line-through' 
                                    : isCurrent 
                                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm' 
                                      : 'bg-white text-neutral-850 border-neutral-350 hover:bg-neutral-50'
                                }`}
                              >
                                {slot.time}
                              </button>
                            );
                          })
                        ) : (
                          <span className="text-[9px] font-bold text-neutral-350 block py-3">Aucun</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Validation / Confirmation bar */}
            {selectedDate && selectedTime && (
              <div className="bg-neutral-50 border-2 border-neutral-900 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                <div className="text-left">
                  <span className="text-xs font-bold text-neutral-450 block">Nouvel horaire sélectionné</span>
                  <p className="text-xs text-neutral-800 font-extrabold">
                    Le {selectedDate.split('-').reverse().join('/')} à {selectedTime}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={saving}
                    onClick={onClose}
                    className="border-2 border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-900 font-black rounded-xl px-4 py-2 text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    disabled={saving}
                    onClick={handleSave}
                    className="border-2 border-neutral-900 bg-neutral-900 hover:bg-neutral-850 text-white font-black rounded-xl px-4 py-2 text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? "Replanification..." : "Confirmer"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

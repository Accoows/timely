import { useState, useRef } from 'react';
import type { Booking } from '../../../types';
import EmptyState from '../../../components/EmptyState';
import { api } from '../../../services/api';

interface BookingsTabProps {
  bookings: Booking[];
  onNavigate: (page: string) => void;
  onRefreshBookings?: () => void;
}

export default function BookingsTab({ bookings, onNavigate, onRefreshBookings }: BookingsTabProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const isCancellingRef = useRef(false);

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
              <div className="flex items-center gap-2">
                <button
                  disabled={isCancelling}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel(booking.id);
                  }}
                  className="border-2 border-red-600 bg-white hover:bg-red-50 text-red-600 shadow-[2px_2px_0px_0px_rgba(220,38,38,1)] transition-all font-black rounded-xl px-3 py-1.5 text-xs cursor-pointer select-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annuler
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';

interface Booking {
  id: number;
  establishment_name: string;
  booking_date: string;
  status: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In dev mode, we'll try fetching from backend, with local fallbacks if offline.
    fetch('http://localhost:8000/api/bookings/')
      .then(res => {
        if (!res.ok) throw new Error('API server offline');
        return res.json();
      })
      .then((data: Booking[]) => {
        setBookings(data);
        setLoading(false);
      })
      .catch(err => {
        console.warn('Backend bookings API offline, using fallback mock data.', err);
        // Fallback simulated list of bookings
        setBookings([
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
        ]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center py-20">
        <span className="loading loading-spinner loading-lg text-neutral-900"></span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-neutral-900">Mes Réservations</h1>
        <p className="text-neutral-500 text-sm mt-1">Retrouvez et suivez l'état de tous vos rendez-vous.</p>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 border border-neutral-200 border-dashed rounded-3xl">
          <p className="text-neutral-500 text-sm">Vous n'avez pas encore de réservations planifiées.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookings.map(b => (
            <div key={b.id} className="bg-white border border-neutral-200 p-6 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md transition-shadow duration-200">
              <div>
                <h3 className="font-bold text-lg text-neutral-900">{b.establishment_name}</h3>
                <p className="text-sm text-neutral-500 mt-1">🗓️ Prévu le {b.booking_date}</p>
              </div>
              <span className={`badge px-4 py-3 rounded-full text-xs font-semibold ${
                b.status === 'success' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' 
                  : 'bg-amber-50 text-amber-700 border-amber-200/60'
              }`}>
                {b.status === 'success' ? 'Confirmé' : 'En attente'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

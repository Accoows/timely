import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Booking } from '../../types';
import Alert from '../../components/Alert';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Exécute le montage du composant pour récupérer la liste des réservations via le service API officiel.
   * On utilise la variable `active` pour éviter de mettre à jour le composant s'il a été démonté (memory leak).
   * En cas d'échec (ex: backend injoignable), on intercepte l'erreur dans le bloc `catch` 
   * et on affiche proprement l'Alert à l'utilisateur au lieu de bloquer l'interface.
   */
  useEffect(() => {
    let active = true;
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.bookings.list();
        if (active) {
          setBookings(data);
        }
      } catch (err) {
        if (active) {
          console.error('Erreur lors du chargement des réservations:', err);
          setError('Impossible de charger vos réservations. Veuillez réessayer plus tard.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchBookings();

    return () => {
      active = false;
    };
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

      {error && <Alert type="error" message={error} className="mb-8" />}

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

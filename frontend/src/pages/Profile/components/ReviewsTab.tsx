import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import Alert from '../../../components/Alert';
import type { Review } from '../../../types';

interface ReviewsTabProps {
  onNavigate: (page: string) => void;
}

export default function ReviewsTab({ onNavigate }: ReviewsTabProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.reviews.listForClient();
      setReviews(data);
    } catch (err) {
      console.error("Erreur de récupération des avis :", err);
      setError("Impossible de charger vos avis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReviews();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleDeleteReview = async (reviewId: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet avis ?")) return;
    try {
      setError(null);
      await api.reviews.delete(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (err) {
      console.error("Erreur de suppression de l'avis :", err);
      setError("Impossible de supprimer cet avis.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-10 h-10 border-2 border-neutral-800 border-t-transparent animate-spin rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-xl font-black text-neutral-900 uppercase">Mes Avis</h2>
        <p className="text-neutral-500 text-xs mt-1">
          Consultez tous les avis et retours d'expérience que vous avez publiés sur les établissements.
        </p>
      </div>

      {error && <Alert type="error" message={error} />}

      {reviews.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border-2 border-neutral-900 rounded-2xl p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:translate-x-[-1px] transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3
                    onClick={() => rev.etablissement && onNavigate(`establishment/${rev.etablissement.id}`)}
                    className="font-extrabold text-sm text-neutral-900 hover:text-neutral-600 hover:underline cursor-pointer transition-colors"
                  >
                    {rev.etablissement?.nom || "Établissement inconnu"}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-neutral-400 font-semibold block">
                      Publié le {new Date(rev.date_envoie).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <span className="text-[10px] font-black text-amber-500 tracking-widest">
                      {"★".repeat(rev.note || 5)}{"☆".repeat(5 - (rev.note || 5))}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteReview(rev.id)}
                  className="px-2.5 py-1 text-[10px] font-black uppercase text-red-600 border-2 border-red-600 bg-white hover:bg-red-50 rounded-lg shadow-[2px_2px_0px_0px_rgba(220,38,38,0.2)] hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-0 active:translate-x-0 cursor-pointer transition-all"
                >
                  Supprimer
                </button>
              </div>
              
              <div className="mt-3 text-xs text-neutral-700 font-medium leading-relaxed bg-neutral-50 border border-neutral-100 rounded-xl p-3.5">
                "{rev.message}"
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-neutral-50/40 rounded-2xl border-2 border-dashed border-neutral-200 p-8">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4 text-neutral-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379L12 21l3.62-3.136c1.153-.086 2.294-.213 3.423-.379 1.583-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.124-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
          </div>
          <h3 className="font-extrabold text-sm text-neutral-800">Aucun avis publié</h3>
          <p className="text-xs text-neutral-450 mt-1 max-w-sm mx-auto">
            Vous n'avez pas encore laissé de commentaires ou d'avis sur les établissements que vous avez réservés.
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="mt-6 text-xs font-bold px-4 py-2 border-2 border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-900 rounded-xl transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
          >
            Découvrir des établissements
          </button>
        </div>
      )}
    </div>
  );
}

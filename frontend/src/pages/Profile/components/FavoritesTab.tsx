import React from 'react';
import type { FavoriteSeed } from '../seedData';
import EmptyState from '../../../components/EmptyState';

interface FavoritesTabProps {
  favorites: FavoriteSeed[];
  onRemoveFavorite: (id: number) => void;
  onNavigate: (page: string) => void;
}

export default function FavoritesTab({ favorites, onRemoveFavorite, onNavigate }: FavoritesTabProps) {
  return (
    <div>
      <h2 className="text-2xl font-black text-neutral-900 uppercase mb-6 pb-2 border-b-2 border-neutral-100">Mes Favoris</h2>
      
      {favorites.length === 0 ? (
        <EmptyState
          title="Aucun favori enregistré"
          description="Ajoutez des établissements à vos coups de cœur pour les retrouver facilement et planifier vos visites plus rapidement."
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          }
          actionLabel="Découvrir les établissements"
          onAction={() => onNavigate('home')}
        />
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
                  onClick={() => onRemoveFavorite(est.id)}
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
  );
}

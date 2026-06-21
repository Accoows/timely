import React, { useState } from 'react';
import Button from './Button';

/**
 * Propriétés du composant SearchBar.
 */
interface SearchBarProps {
  initialQuery?: string;
  initialLocation?: string;
  placeholderQuery?: string;
  placeholderLocation?: string;
  onSearch: (query: string, location: string) => void;
  onClear?: () => void;
  showClearButton?: boolean;
  variant?: 'hero' | 'brutalist';
  className?: string;
  invertInputs?: boolean;
}

/**
 * Composant de barre de recherche double (quoi / où).
 * Utilisé sur la page d'accueil (Hero) et dans l'en-tête (Header) pour rechercher des établissements.
 */
export default function SearchBar({
  initialQuery = '',
  initialLocation = '',
  placeholderQuery = 'Prestation, établissement...',
  placeholderLocation = 'Ville, code postal...',
  onSearch,
  onClear,
  showClearButton = false,
  variant = 'hero',
  className = '',
  invertInputs = false
}: SearchBarProps) {
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);

  // Synchronisation de l'état local avec la prop "initialQuery".
  // Si la valeur initiale venant du parent change, on force la mise à jour de la valeur locale.
  if (initialQuery !== prevInitialQuery) {
    setPrevInitialQuery(initialQuery);
    setQuery(initialQuery);
  }

  const [prevInitialLocation, setPrevInitialLocation] = useState(initialLocation);
  const [location, setLocation] = useState(initialLocation);

  // Synchronisation similaire pour la localisation.
  // Remplace useEffect() pour réagir immédiatement aux changements de props.
  if (initialLocation !== prevInitialLocation) {
    setPrevInitialLocation(initialLocation);
    setLocation(initialLocation);
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSearch(query, location);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleClear = () => {
    setQuery('');
    setLocation('');
    if (onClear) onClear();
  };

  // Helper : Génère le champ "Quoi" (recherche par nom ou prestation)
  // Gère deux designs : "hero" (page d'accueil) ou "brutalist" (entête/résultats)
  const renderQueryInput = (isHero: boolean, hasBorder: boolean) => {
    if (isHero) {
      return (
        <div className={`search-input-group flex-[1.4] ${hasBorder ? 'search-input-group-border' : ''}`} key="query">
          <svg xmlns="http://www.w3.org/2000/svg" className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder={placeholderQuery} 
            className="search-input" 
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      );
    }

    return (
      <div className="flex-[1.3] w-full flex items-center gap-3 px-4 py-3 border-2 border-neutral-900 rounded-xl bg-neutral-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-neutral-900 transition-all" key="query">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder={placeholderQuery}
          className="w-full bg-transparent border-none text-sm font-semibold text-neutral-950 placeholder-neutral-400 focus:outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
    );
  };

  // Helper : Génère le champ "Où" (recherche par ville ou code postal)
  const renderLocationInput = (isHero: boolean, hasBorder: boolean) => {
    if (isHero) {
      return (
        <div className={`search-input-group flex-1 ${hasBorder ? 'search-input-group-border' : ''}`} key="location">
          <svg xmlns="http://www.w3.org/2000/svg" className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <input 
            type="text" 
            placeholder={placeholderLocation} 
            className="search-input" 
            value={location}
            onChange={e => setLocation(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      );
    }

    return (
      <div className="flex-1 w-full flex items-center gap-3 px-4 py-3 border-2 border-neutral-900 rounded-xl bg-neutral-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-neutral-900 transition-all" key="location">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <input
          type="text"
          placeholder={placeholderLocation}
          className="w-full bg-transparent border-none text-sm font-semibold text-neutral-950 placeholder-neutral-400 focus:outline-none"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
    );
  };

  if (variant === 'brutalist') {
    return (
      <form 
        onSubmit={handleSubmit} 
        className={`p-5 bg-white border-2 border-neutral-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row gap-4 items-center ${className}`}
      >
        {invertInputs 
          ? [renderLocationInput(false, false), renderQueryInput(false, false)]
          : [renderQueryInput(false, false), renderLocationInput(false, false)]
        }

        <div className="w-full md:w-auto flex gap-2 shrink-0">
          <Button type="submit" variant="primary" size="md" className="w-full md:w-auto">
            Rechercher
          </Button>
          {(showClearButton || query || location) && (
            <Button type="button" variant="outline" size="md" onClick={handleClear}>
              Effacer
            </Button>
          )}
        </div>
      </form>
    );
  }

  // Default 'hero' style (matching HomePage)
  return (
    <div className={`search-bar ${className}`}>
      {invertInputs
        ? [renderLocationInput(true, true), renderQueryInput(true, false)]
        : [renderQueryInput(true, true), renderLocationInput(true, false)]
      }
      <button 
        type="button" 
        onClick={() => onSearch(query, location)} 
        className="search-btn cursor-pointer"
      >
        Rechercher
      </button>
    </div>
  );
}

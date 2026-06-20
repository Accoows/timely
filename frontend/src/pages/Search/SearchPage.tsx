import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Secteur, Lieu, Etablissement } from '../../types';
import Button from '../../components/Button';
import EstablishmentCard from '../../components/EstablishmentCard';
import SearchBar from '../../components/SearchBar';
import Alert from '../../components/Alert';
import EmptyState from '../../components/EmptyState';

import { SECTOR_IMAGES, DEFAULT_IMAGE } from './seedData';

interface SearchPageProps {
  onNavigate: (page: string) => void;
  initialCategory?: string;
  initialQuery?: string;
  initialLocation?: string;
}

export default function SearchPage({ onNavigate, initialCategory, initialQuery, initialLocation }: SearchPageProps) {
  const [sectors, setSectors] = useState<Secteur[]>([]);
  const [locations, setLocations] = useState<Lieu[]>([]);
  const [establishments, setEstablishments] = useState<Etablissement[]>([]);

  const [selectedSector, setSelectedSector] = useState<Secteur | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Lieu | null>(null);

  // Direct Search Bar state
  const [barQuery, setBarQuery] = useState(initialQuery || '');
  const [barLocation, setBarLocation] = useState(initialLocation || '');
  const [isDirectSearch, setIsDirectSearch] = useState(!!(initialQuery || initialLocation));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter and Sort states
  const [minRating, setMinRating] = useState<number | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

  // We use establishments directly as they are now pre-filtered and pre-sorted by the backend
  const displayedEstablishments = establishments;

  // State for categories available in results (faceted search)
  const [availableSubCategories, setAvailableSubCategories] = useState<string[]>([]);

  // Step 1: Load sectors on mount
  useEffect(() => {
    async function loadSectors() {
      setLoading(true);
      setError('');
      try {
        const sectorList = await api.sectors.list();
        setSectors(sectorList);

        // Preselect sector if provided via props
        if (initialCategory) {
          // Attempt exact match or lowercase match
          const matchedSector = sectorList.find(s => 
            s.nom === initialCategory || s.nom.toLowerCase() === initialCategory.toLowerCase()
          );
          if (matchedSector) {
            setSelectedSector(matchedSector);
          }
        }
      } catch (err) {
        setError('Impossible de charger les secteurs d\'activité.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSectors();
  }, []);

  // Step 2: Load locations when a sector is selected (and direct search is not active)
  useEffect(() => {
    if (!selectedSector || isDirectSearch) {
      return;
    }

    const sectorId = selectedSector.id;

    async function loadLocations() {
      setLoading(true);
      setError('');
      try {
        const locationList = await api.locations.list({ sector_id: sectorId });
        setLocations(locationList);
      } catch (err) {
        setError('Impossible de charger les zones géographiques.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLocations();
  }, [selectedSector, isDirectSearch]);

  // Unified effect to load establishments when any query or filter parameter changes
  useEffect(() => {
    const hasFunnelParams = selectedSector && selectedLocation && !isDirectSearch;
    const hasDirectParams = isDirectSearch;

    if (!hasFunnelParams && !hasDirectParams) {
      Promise.resolve().then(() => {
        setEstablishments(prev => prev.length > 0 ? [] : prev);
        setAvailableSubCategories(prev => prev.length > 0 ? [] : prev);
      });
      return;
    }

    const sectorId = selectedSector?.id;
    const locationId = selectedLocation?.id;

    async function loadEstablishments() {
      setLoading(true);
      setError('');
      try {
        const params = {
          min_rating: minRating,
          sub_category: selectedSubCategory,
          query: isDirectSearch && barQuery ? barQuery : undefined,
          location: isDirectSearch 
            ? (barLocation || undefined)
            : (locationId ? String(locationId) : undefined),
          sector: !isDirectSearch && sectorId ? sectorId : undefined
        };

        const estList = await api.establishments.explore(params);
        setEstablishments(estList);

        // Calculate available categories/facets only when rating and subcategory filters are not applied
        if (minRating === null && selectedSubCategory === null) {
          const badges = new Set<string>();
          estList.forEach(est => {
            const badge = est.badge || est.secteur?.nom;
            if (badge) {
              badges.add(badge);
            }
          });
          setAvailableSubCategories(Array.from(badges));
        }
      } catch (err) {
        setError('Impossible de charger les établissements.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadEstablishments();
  }, [
    selectedSector,
    selectedLocation,
    isDirectSearch,
    barQuery,
    barLocation,
    minRating,
    selectedSubCategory
  ]);

  // Trigger search from global search bar
  const handleBarSearch = (query: string, location: string) => {
    if (!query.trim() && !location.trim()) {
      handleClearDirectSearch();
      return;
    }

    setIsDirectSearch(true);
    setBarQuery(query);
    setBarLocation(location);

    // Reset other inputs and filters to avoid conflicts
    setSelectedSector(null);
    setSelectedLocation(null);
    setLocations([]);
    setMinRating(null);
    setSelectedSubCategory(null);
  };

  const handleClearDirectSearch = () => {
    setBarQuery('');
    setBarLocation('');
    setIsDirectSearch(false);
    setSelectedSector(null);
    setSelectedLocation(null);
    setLocations([]);
    setEstablishments([]);
    setError('');
    setMinRating(null);
    setSelectedSubCategory(null);
  };

  const getSectorImage = (name: string) => {
    return SECTOR_IMAGES[name] || DEFAULT_IMAGE;
  };

  const renderFilterBar = () => {
    if (establishments.length === 0) return null;

    return (
      <div className="mb-8 p-4 bg-white border-2 border-neutral-900 rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row gap-6 items-start md:items-center justify-between animate-fadeIn">
        {/* Left: Rating filters */}
        <div className="flex flex-wrap items-center gap-6">
          {/* Rating */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-neutral-500 tracking-wider">Note min :</span>
            <div className="flex border-2 border-neutral-900 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setMinRating(null)}
                className={`px-3 py-1 text-xs font-black uppercase transition-colors ${
                  minRating === null
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                Tout
              </button>
              <button
                type="button"
                onClick={() => setMinRating(4.5)}
                className={`px-3 py-1 text-xs font-black uppercase transition-colors border-l-2 border-neutral-900 ${
                  minRating === 4.5
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                ★ 4.5+
              </button>
              <button
                type="button"
                onClick={() => setMinRating(4.8)}
                className={`px-3 py-1 text-xs font-black uppercase transition-colors border-l-2 border-neutral-900 ${
                  minRating === 4.8
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                ★ 4.8+
              </button>
            </div>
          </div>
        </div>

        {/* Right: Subcategory pills (only if there is more than 1 category in the search results) */}
        {availableSubCategories.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase text-neutral-500 tracking-wider">Catégorie :</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedSubCategory(null)}
                className={`px-3 py-1 rounded-full border-2 border-neutral-900 text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-[1px] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] ${
                  selectedSubCategory === null
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                Tout
              </button>
              {availableSubCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedSubCategory(cat)}
                  className={`px-3 py-1 rounded-full border-2 border-neutral-900 text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-[1px] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] ${
                    selectedSubCategory === cat
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white text-neutral-800 hover:bg-neutral-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleResetFunnel = () => {
    setSelectedSector(null);
    setSelectedLocation(null);
    setLocations([]);
    setEstablishments([]);
    setError('');
    setMinRating(null);
    setSelectedSubCategory(null);
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto py-12 px-6">
      {/* Title */}
      <div className="mb-10 text-left">
        <h1 className="text-4xl font-black text-neutral-900 tracking-tight uppercase">Recherche d'Établissements</h1>
        <p className="text-neutral-500 text-sm mt-2 font-semibold">
          Recherchez directement ou suivez notre entonnoir de découverte interactif.
        </p>
      </div>

      {/* Global Search Bar */}
      <SearchBar
        variant="brutalist"
        className="mb-6"
        initialQuery={barQuery}
        initialLocation={barLocation}
        placeholderQuery="Recherche spécifique (ex: Salon de coiffure, massage...)"
        placeholderLocation="Lieu (Ville, code postal...)"
        onSearch={handleBarSearch}
        onClear={handleClearDirectSearch}
        showClearButton={isDirectSearch || !!barQuery || !!barLocation}
        invertInputs={true}
      />

      {/* Funnel Progress Indicators - Hidden when Direct Search is Active */}
      {!isDirectSearch && (
        <div className="flex w-fit flex-wrap items-center gap-2 mb-6 text-xs font-black uppercase tracking-wider border-2 border-neutral-900 bg-[#f4f2ee] py-2 px-3 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] select-none animate-fadeIn">
          <button
            onClick={() => {
              setSelectedSector(null);
              setSelectedLocation(null);
              setLocations([]);
              setEstablishments([]);
            }}
            className={`px-3 py-1.5 rounded border transition-colors ${
              !selectedSector
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.15)]'
                : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            1. Secteurs
          </button>
          <span className="text-neutral-400 font-black px-1">➜</span>
          <button
            disabled={!selectedSector}
            onClick={() => {
              setSelectedLocation(null);
              setEstablishments([]);
            }}
            className={`px-3 py-1.5 rounded border transition-colors disabled:opacity-50 disabled:pointer-events-none ${
              selectedSector && !selectedLocation
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.15)]'
                : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            2. Lieux {selectedSector && `(${selectedSector.nom})`}
          </button>
          <span className="text-neutral-400 font-black px-1">➜</span>
          <button
            disabled={!selectedLocation}
            className={`px-3 py-1.5 rounded border transition-colors disabled:opacity-50 ${
              selectedLocation
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.15)]'
                : 'bg-white text-neutral-800 border-neutral-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            3. Établissements {selectedLocation && `(${selectedLocation.ville})`}
          </button>
        </div>
      )}

      {error && <Alert type="error" message={error} className="mb-8" />}

      {loading ? (
        <div className="flex flex-col justify-center items-center h-72">
          <span className="loading loading-spinner loading-lg text-neutral-900 mb-4"></span>
          <p className="text-neutral-500 text-xs font-black uppercase tracking-wider">Recherche en cours...</p>
        </div>
      ) : (
        <div>
          {/* DIRECT SEARCH RESULTS VIEW */}
          {isDirectSearch && (
            <div className="animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">
                    Résultats de votre recherche
                  </h2>
                  <p className="text-xs text-neutral-500 font-bold mt-1 uppercase tracking-wider">
                    Mots-clés : "{barQuery || 'Tous'}" {barLocation && `| Lieu : "${barLocation}"`}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleClearDirectSearch}>
                  Retour à la recherche par étapes
                </Button>
              </div>

              {establishments.length === 0 ? (
                <EmptyState
                  title="Aucun résultat trouvé"
                  description="Nous n'avons trouvé aucun établissement correspondant à vos critères de recherche spécifiques."
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-16.5 0V3.75c0-.414.336-.75.75-.75h9.375c.414 0 .75.336.75.75V21m-9.75 0h9.75" />
                    </svg>
                  }
                  actionLabel="Essayer la recherche par étapes"
                  onAction={handleClearDirectSearch}
                  actionVariant="primary"
                />
              ) : (
                <>
                  {renderFilterBar()}
                  {displayedEstablishments.length === 0 ? (
                    <EmptyState
                      title="Aucun résultat pour ces filtres"
                      description="Essayez d'élargir votre recherche en retirant certains filtres de note ou de catégorie."
                      icon={
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
                        </svg>
                      }
                      actionLabel="Réinitialiser les filtres"
                      onAction={() => {
                        setMinRating(null);
                        setSelectedSubCategory(null);
                      }}
                      actionVariant="primary"
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {displayedEstablishments.map(est => (
                        <div
                          key={est.id}
                          className="flex flex-col border-2 border-neutral-900 rounded-2xl overflow-hidden bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-3px] hover:translate-x-[-3px] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all p-4 gap-4"
                        >
                          <EstablishmentCard
                            name={est.name || est.nom || ''}
                            image={est.image || DEFAULT_IMAGE}
                            badge={est.badge || est.secteur?.nom || 'Établissement'}
                            address={est.address || (est.lieu ? `${est.lieu.adresse}, ${est.lieu.ville}` : '')}
                            rating={est.rating || '4.8'}
                          />
                          <Button
                            type="button"
                            variant="primary"
                            fullWidth
                            size="sm"
                            className="mt-auto"
                            onClick={() => onNavigate(`establishment/${est.id}`)}
                          >
                            Réserver un créneau
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP-BY-STEP FUNNEL VIEW (Rendered only when direct search is NOT active) */}
          {!isDirectSearch && (
            <div>
              {/* STEP 1: SELECT SECTOR */}
              {!selectedSector && (
                <div className="animate-fadeIn">
                  <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tight mb-8">
                    Sélectionnez un Secteur d'activité
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {sectors.map(sec => (
                      <button
                        key={sec.id}
                        onClick={() => {
                          setSelectedSector(sec);
                          setSelectedLocation(null);
                          setEstablishments([]);
                        }}
                        className="relative group h-64 w-full rounded-2xl overflow-hidden border-2 border-neutral-900 text-left select-none cursor-pointer focus:outline-none shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] hover:translate-x-[-4px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                      >
                        <img
                          src={getSectorImage(sec.nom)}
                          alt={sec.nom}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/40 to-transparent"></div>
                        <div className="absolute bottom-6 left-6 right-6">
                          <span className="inline-block bg-white text-neutral-950 border border-neutral-900 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded mb-2">
                            Prestation
                          </span>
                          <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight">
                            {sec.nom}
                          </h3>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: SELECT LOCATION */}
              {selectedSector && !selectedLocation && (
                <div className="animate-fadeIn">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">
                      Zones disponibles pour "{selectedSector.nom}"
                    </h2>
                    <Button variant="outline" size="sm" onClick={() => {
                      setSelectedSector(null);
                      setSelectedLocation(null);
                      setLocations([]);
                      setEstablishments([]);
                    }}>
                      Retour aux secteurs
                    </Button>
                  </div>

                  {locations.length === 0 ? (
                    <EmptyState
                      title="Aucun lieu disponible"
                      description={`Il n'y a pas encore d'établissements enregistrés sous le secteur "${selectedSector.nom}".`}
                      icon={
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                      }
                      actionLabel="Choisir un autre secteur"
                      onAction={() => {
                        setSelectedSector(null);
                        setSelectedLocation(null);
                        setLocations([]);
                        setEstablishments([]);
                      }}
                      actionVariant="primary"
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {locations.map(loc => (
                        <button
                          key={loc.id}
                          onClick={() => setSelectedLocation(loc)}
                          className="p-6 bg-white border-2 border-neutral-900 rounded-2xl text-left select-none cursor-pointer focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-3px] hover:translate-x-[-3px] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                          <div className="w-10 h-10 rounded-xl bg-neutral-100 border-2 border-neutral-900 text-neutral-900 flex items-center justify-center mb-4">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-black text-neutral-900 uppercase tracking-tight mb-1">
                            {loc.ville}
                          </h3>
                          <p className="text-xs font-semibold text-neutral-500 mb-3">{loc.region || 'France'}</p>
                          <span className="text-[10px] font-black uppercase tracking-wider bg-neutral-900 text-white px-2.5 py-1 rounded border border-neutral-900">
                            {loc.code_postal || 'Adresse'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: LIST ESTABLISHMENTS */}
              {selectedSector && selectedLocation && (
                <div className="animate-fadeIn">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                    <div>
                      <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">
                        Établissements trouvés
                      </h2>
                      <p className="text-xs text-neutral-500 font-bold mt-1 uppercase tracking-wider">
                        Secteur : {selectedSector.nom} | Localisation : {selectedLocation.ville}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setSelectedLocation(null);
                        setEstablishments([]);
                      }}>
                        Changer de lieu
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleResetFunnel}>
                        Nouvelle recherche
                      </Button>
                    </div>
                  </div>

                  {establishments.length === 0 ? (
                    <EmptyState
                      title="Aucun prestataire trouvé"
                      description="Il n'y a aucun établissement correspondant à ce secteur dans cette zone actuellement."
                      icon={
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-16.5 0V3.75c0-.414.336-.75.75-.75h9.375c.414 0 .75.336.75.75V21m-9.75 0h9.75" />
                        </svg>
                      }
                      actionLabel="Choisir une autre ville"
                      onAction={() => {
                        setSelectedLocation(null);
                        setEstablishments([]);
                      }}
                      actionVariant="primary"
                    />
                  ) : (
                    <>
                      {renderFilterBar()}
                      {displayedEstablishments.length === 0 ? (
                        <EmptyState
                          title="Aucun résultat pour ces filtres"
                          description="Essayez d'élargir votre recherche en retirant certains filtres de note ou de catégorie."
                          icon={
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
                            </svg>
                          }
                          actionLabel="Réinitialiser les filtres"
                          onAction={() => {
                            setMinRating(null);
                            setSelectedSubCategory(null);
                          }}
                          actionVariant="primary"
                        />
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                          {displayedEstablishments.map(est => (
                            <div
                              key={est.id}
                              className="flex flex-col border-2 border-neutral-900 rounded-2xl overflow-hidden bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-3px] hover:translate-x-[-3px] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all p-4 gap-4"
                            >
                              <EstablishmentCard
                                name={est.name || est.nom || ''}
                                image={est.image || DEFAULT_IMAGE}
                                badge={est.badge || selectedSector.nom}
                                address={est.address || `${selectedLocation.adresse}, ${selectedLocation.ville}`}
                                rating={est.rating || '4.8'}
                              />
                              <Button
                                type="button"
                                variant="primary"
                                fullWidth
                                size="sm"
                                className="mt-auto"
                                onClick={() => onNavigate(`establishment/${est.id}`)}
                              >
                                Réserver un créneau
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
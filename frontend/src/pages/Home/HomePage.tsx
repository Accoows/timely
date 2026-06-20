import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import type { Etablissement } from '../../types';
import CategoryCard from '../../components/CategoryCard';
import EstablishmentCard from '../../components/EstablishmentCard';
import SearchBar from '../../components/SearchBar';

const CATEGORIES = [
  { id: 'all', label: 'Tous', filterVal: '' },
  { id: 'beauty', label: 'Beauté', filterVal: 'beauty' },
  { id: 'restaurant', label: 'Restauration', filterVal: 'restaurant' },
  { id: 'hotel', label: 'Hôtels', filterVal: 'hotel' },
  { id: 'travel', label: 'Voyages', filterVal: 'travel' }
];

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [establishments, setEstablishments] = useState<Etablissement[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab indicator calculations
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 4, width: 68 });
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const activeIndex = CATEGORIES.findIndex(cat => cat.id === activeCategory);
    const activeBtn = tabsRef.current[activeIndex];
    if (activeBtn) {
      setIndicatorStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth
      });
    }
  }, [activeCategory]);

  const fetchEstablishments = (sectorNom?: string, queryVal?: string, locationVal?: string) => {
    Promise.resolve().then(() => setLoading(true));
    api.establishments.explore({
      sector: sectorNom || undefined,
      query: queryVal || undefined,
      location: locationVal || undefined,
      sort: 'rating'
    })
      .then(data => {
        setEstablishments(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    const categoryObj = CATEGORIES.find(cat => cat.id === activeCategory);
    fetchEstablishments(categoryObj?.filterVal, '', '');
  }, [activeCategory]);

  const handleSearch = (query: string, location: string) => {
    const url = 'search?';
    const params = [];
    if (query) params.push(`query=${encodeURIComponent(query)}`);
    if (location) params.push(`location=${encodeURIComponent(location)}`);
    onNavigate(url + params.join('&'));
  };

  const handleCategoryClick = (categoryName: string) => {
    onNavigate(`search?category=${encodeURIComponent(categoryName)}`);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Tous vos rendez-vous, au même endroit.
          </h1>
          <p className="hero-desc">
            Trouvez et réservez instantanément une table, un soin, une chambre d'hôtel ou un rendez-vous administratif en quelques clics.
          </p>

          {/* Search Bar */}
          <SearchBar
            initialQuery=""
            initialLocation=""
            onSearch={handleSearch}
            invertInputs={true}
          />
        </div>

        <div className="hero-image-wrapper">
          <div className="hero-image-decor">
            <div className="hero-image-bg"></div>
            <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80" 
                 alt="Expériences de réservation" 
                 className="hero-image" />
          </div>
        </div>
      </section>

      {/* Secteurs d'activité */}
      <section className="categories-section">
        <div className="categories-container">
          <h2 className="categories-title">Découvrez nos secteurs d'activité</h2>
          
          <div className="categories-grid">
            <CategoryCard 
              name="Coiffure" 
              image="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80" 
              onClick={() => handleCategoryClick('Coiffure')}
            />
            <CategoryCard 
              name="Beauté & Soins" 
              image="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80" 
              onClick={() => handleCategoryClick('Beauté & Soins')}
            />
            <CategoryCard 
              name="Massage & Bien-être" 
              image="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80" 
              onClick={() => handleCategoryClick('Massage & Bien-être')}
            />
            <CategoryCard 
              name="Barbier" 
              image="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80" 
              onClick={() => handleCategoryClick('Barbier')}
            />
            <CategoryCard 
              name="Restauration" 
              image="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80" 
              onClick={() => handleCategoryClick('Restauration')}
            />
            <CategoryCard 
              name="Hébergement" 
              image="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80" 
              onClick={() => handleCategoryClick('Hébergement')}
            />
            <CategoryCard 
              name="Voyages & Transports" 
              image="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80" 
              onClick={() => handleCategoryClick('Voyages & Transports')}
            />
          </div>
        </div>
      </section>

      {/* Établissements à la une */}
      <section id="popular-section" className="popular-section relative py-12">
        <div className="popular-header">
          <div>
            <h2 className="popular-title">Populaires sur Timely</h2>
            <p className="text-neutral-500 text-sm mt-1">Découvrez les adresses préférées de la communauté.</p>
          </div>
          <a href="#" className="popular-link-all">Tout afficher</a>
        </div>

        {/* Sliding Tabs */}
        <div className="flex justify-start sm:justify-center overflow-x-auto no-scrollbar pb-2 mb-6 w-full">
          <div className="tabs-slider-container" style={{
            '--active-tab-left': `${indicatorStyle.left}px`,
            '--active-tab-width': `${indicatorStyle.width}px`
          } as React.CSSProperties}>
            <div className="tab-active-indicator"></div>
            
            {CATEGORIES.map((cat, idx) => (
              <button
                key={cat.id}
                ref={el => { tabsRef.current[idx] = el; }}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setLoading(true);
                }}
                className={`tab-btn ${activeCategory === cat.id ? 'text-neutral-900 font-bold' : 'text-neutral-500'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="popular-grid min-h-[300px]">
          {loading ? (
            <div className="col-span-full flex justify-center items-center h-48">
              <span className="loading loading-spinner loading-lg text-neutral-900"></span>
            </div>
          ) : (
            establishments.slice(0, 6).map(est => (
              <EstablishmentCard
                key={est.id}
                name={est.name || ''}
                image={est.image || ''}
                badge={est.badge || ''}
                address={est.address || ''}
                rating={est.rating || '4.8'}
                onClick={() => onNavigate(`establishment/${est.id}`)}
              />
            ))
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section py-12 bg-neutral-50 border-t border-neutral-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-neutral-900 mb-2">La vision de Timely</h2>
            <p className="text-neutral-500 max-w-xl mx-auto">Une approche axée sur le respect de votre temps et le soutien aux acteurs locaux.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow duration-300">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-800 mb-2">Centralisation des services</h3>
              <p className="text-neutral-500 text-xs leading-relaxed">
                Un espace unique pour planifier vos rendez-vous dans différents secteurs (beauté, restauration et hébergement).
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow duration-300">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-800 mb-2">Respect de votre temps</h3>
              <p className="text-neutral-500 text-xs leading-relaxed">
                Accédez directement aux plannings réels sans intermédiaires pour bloquer le créneau qui vous convient en quelques secondes.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow duration-300">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-800 mb-2">Relation de proximité</h3>
              <p className="text-neutral-500 text-xs leading-relaxed">
                Mise en relation directe avec les artisans et commerçants locaux pour encourager l'activité de proximité.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow duration-300">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-800 mb-2">Sobriété & Légèreté</h3>
              <p className="text-neutral-500 text-xs leading-relaxed">
                Une interface rapide et épurée, sans outils de traçage abusifs ni publicités, focalisée exclusivement sur vos besoins.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Banner CTA */}
      <section className="pro-cta-section py-12 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-3xl bg-[#f4f2ee] border border-neutral-200/50 shadow-sm p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-lg text-center md:text-left">
              <span className="text-neutral-500 text-xs font-semibold uppercase tracking-wider">Espace Professionnels</span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 mt-2 mb-4 leading-tight">
                Vous gérez un établissement ?
              </h2>
              <p className="text-neutral-600 text-sm leading-relaxed">
                Rejoignez Timely pour digitaliser vos plannings, réduire vos rendez-vous manqués et attirer de nouveaux clients dès aujourd'hui.
              </p>
            </div>
            <div className="flex-shrink-0">
              <a 
                href="/register-establishment" 
                onClick={(e) => { e.preventDefault(); onNavigate('register-establishment'); }} 
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors duration-200 shadow-md"
              >
                Inscrire mon établissement
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

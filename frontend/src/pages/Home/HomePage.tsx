import { useState, useEffect, useRef } from 'react';

interface Establishment {
  id: number;
  name: string;
  category: string;
  address: string;
  rating: string;
  image: string;
  badge: string;
}

const CATEGORIES = [
  { id: 'all', label: 'Tous' },
  { id: 'beauty', label: 'Beauté' },
  { id: 'restaurant', label: 'Restauration' },
  { id: 'hotel', label: 'Hôtels' }
];

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
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

  useEffect(() => {
    fetch(`/api/popular-filter/?category=${activeCategory}`)
      .then(res => {
        if (!res.ok) throw new Error('API server not responding');
        return res.json();
      })
      .then((data: Establishment[]) => {
        const formatted = data.map(est => ({
          ...est,
          image: est.image.startsWith('http') 
            ? est.image 
            : `/static/${est.image}`
        }));
        setEstablishments(formatted);
        setLoading(false);
      })
      .catch(err => {
        console.warn('Backend offline, using fallback mock data.', err);
        const mockData: Establishment[] = [
          {
            id: 1,
            name: 'Le Bistrot Gourmet',
            category: 'restaurant',
            address: '8 Rue des Dames, Lyon',
            rating: '4.9',
            image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
            badge: 'Restaurant'
          },
          {
            id: 2,
            name: "Hôtel & Spa L'Horizon",
            category: 'hotel',
            address: 'Promenade des Anglais, Nice',
            rating: '4.7',
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
            badge: 'Hôtel'
          },
          {
            id: 3,
            name: "L'Atelier Coiffure & Barbe",
            category: 'beauty',
            address: '21 Boulevard Saint-Germain, Paris',
            rating: '4.9',
            image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80',
            badge: 'Beauté'
          }
        ];
        
        const filtered = activeCategory === 'all' 
          ? mockData 
          : mockData.filter(est => est.category === activeCategory);
          
        setEstablishments(filtered);
        setLoading(false);
      });
  }, [activeCategory]);

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
          <div className="search-bar">
            <div className="search-input-group search-input-group-border">
              <svg xmlns="http://www.w3.org/2000/svg" className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Service, établissement, prestation..." className="search-input" />
            </div>
            <div className="search-input-group">
              <svg xmlns="http://www.w3.org/2000/svg" className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input type="text" placeholder="Ville, code postal..." className="search-input" />
            </div>
            <button className="search-btn">
              Rechercher
            </button>
          </div>
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
            <a href="#" className="category-card group">
              <div className="category-image-wrapper">
                <img src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80" alt="Beauté" className="category-image" />
              </div>
              <span className="category-name">Beauté & Soins</span>
            </a>
            <a href="#" className="category-card group">
              <div className="category-image-wrapper">
                <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80" alt="Restauration" className="category-image" />
              </div>
              <span className="category-name">Tables de Restaurant</span>
            </a>
            <a href="#" className="category-card group">
              <div className="category-image-wrapper">
                <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80" alt="Hôtellerie" className="category-image" />
              </div>
              <span className="category-name">Hôtels & Hébergements</span>
            </a>
            <a href="#" className="category-card group">
              <div className="category-image-wrapper">
                <img src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80" alt="Voyages" className="category-image" />
              </div>
              <span className="category-name">Voyages & Transports</span>
            </a>
            <a href="#" className="category-card group col-span-2 lg:col-span-1">
              <div className="category-image-wrapper">
                <img src="https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80" alt="Administration" className="category-image" />
              </div>
              <span className="category-name">Démarches Administratives</span>
            </a>
          </div>
        </div>
      </section>

      {/* Établissements à la une */}
      <section className="popular-section relative py-12">
        <div className="popular-header">
          <div>
            <h2 className="popular-title">Populaires sur Timely</h2>
            <p className="text-neutral-500 text-sm mt-1">Découvrez les adresses préférées de la communauté.</p>
          </div>
          <a href="#" className="popular-link-all">Tout afficher</a>
        </div>

        {/* Sliding Tabs */}
        <div className="flex justify-center mb-8">
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
            establishments.map(est => (
              <div key={est.id} className="popular-card group">
                <div className="popular-card-image-wrapper">
                  <img src={est.image} alt={est.name} className="popular-card-image" />
                  <span className="popular-card-badge">{est.badge}</span>
                </div>
                <div className="popular-card-info">
                  <div>
                    <h3 className="popular-card-name">{est.name}</h3>
                    <p className="popular-card-address">{est.address}</p>
                  </div>
                  <div className="popular-card-rating">
                    <span className="popular-card-rating-text">{est.rating}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="popular-card-rating-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                </div>
              </div>
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
                Un espace unique pour planifier vos rendez-vous dans différents secteurs (beauté, restauration, hébergement et démarches).
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
              <a href="#" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors duration-200 shadow-md">
                Inscrire mon établissement
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

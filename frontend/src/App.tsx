import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/Home/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import RegisterEstablishmentPage from './pages/Establishment/RegisterEstablishmentPage';
import EstablishmentDetailPage from './pages/Establishment/EstablishmentDetailPage';
import NotFoundPage from './pages/NotFound/NotFoundPage';
import ProfilePage from './pages/Profile/ProfilePage';
import SearchPage from './pages/Search/SearchPage';
import AdminDashboard from './pages/Admin/AdminDashboard';
import EstablishmentDashboard from './pages/Establishment/EstablishmentDashboard';
import PaymentConfirmationPage from './pages/Payment/PaymentConfirmationPage';



/**
 * Composant racine de l'application.
 * Timely utilise un "Custom Router" (Routeur sur-mesure) basé sur l'état local (React State)
 * plutôt que d'utiliser une librairie externe comme react-router-dom.
 */
export default function App() {
  const { user } = useAuth();
  
  // État stockant l'ID de l'établissement en cours de consultation (pour la page de détail)
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<number | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/establishment/')) {
      const parts = path.split('/');
      const id = parseInt(parts[parts.length - 1], 10);
      return isNaN(id) ? null : id;
    }
    return null;
  });

  // État gérant la "route" actuelle. On l'initialise en lisant l'URL courante au 1er chargement.
  const [currentPage, setCurrentPage] = useState<string>(() => {
    const path = window.location.pathname;
    if (path === '/' || path === '') return 'home';
    if (path === '/login') return 'login';
    if (path === '/register') return 'register';
    if (path === '/forgot-password') return 'forgot-password';
    if (path === '/register-establishment') return 'register-establishment';
    if (path === '/profile') return 'profile';
    if (path === '/payment-confirmation') return 'payment-confirmation';
    if (path === '/admin') return 'admin';
    if (path === '/establishment-dashboard') return 'establishment-dashboard';
    if (path === '/search') {
      const search = window.location.search;
      return search ? `search${search}` : 'search';
    }
    if (path.startsWith('/establishment/')) {
      const parts = path.split('/');
      const id = parseInt(parts[parts.length - 1], 10);
      return isNaN(id) ? '404' : 'establishment-detail';
    }
    return '404';
  });

  /**
   * Fonction principale de navigation. Elle est passée en prop à tous les enfants (via `onNavigate`).
   * Elle met à jour l'état React pour forcer un re-rendu, et utilise `window.history.pushState`
   * pour changer l'URL dans la barre du navigateur sans recharger la page.
   */
  const handleNavigate = (page: string) => {
    if (page.startsWith('establishment/')) {
      const parts = page.split('/');
      const id = parseInt(parts[1], 10);
      setSelectedEstablishmentId(id);
      setCurrentPage('establishment-detail');
      window.history.pushState(null, '', `/${page}`);
    } else {
      const pathOnly = page.split('?')[0];
      setCurrentPage(page);
      const path = pathOnly === 'home' ? '/' : `/${page}`;
      window.history.pushState(null, '', path);
    }
  };

  // Effet pour forcer le scroll en haut de page à chaque changement de route.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, 50);
    return () => clearTimeout(timer);
  }, [currentPage, selectedEstablishmentId]);

  // Écouteur de l'événement "popstate".
  // Déclenché par le navigateur quand l'utilisateur clique sur "Précédent" ou "Suivant".
  // Permet de synchroniser l'état React (currentPage) avec l'URL réellement présente dans la barre.
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/' || path === '') {
        setCurrentPage('home');
      } else if (path === '/login') {
        setCurrentPage('login');
      } else if (path === '/register') {
        setCurrentPage('register');
      } else if (path === '/forgot-password') {
        setCurrentPage('forgot-password');
      } else if (path === '/register-establishment') {
        setCurrentPage('register-establishment');
      } else if (path === '/profile') {
        setCurrentPage('profile');
      } else if (path === '/payment-confirmation') {
        setCurrentPage('payment-confirmation');
      } else if (path === '/admin') {
        setCurrentPage('admin');
      } else if (path === '/establishment-dashboard') {
        setCurrentPage('establishment-dashboard');
      } else if (path === '/search') {
        const search = window.location.search;
        setCurrentPage(search ? `search${search}` : 'search');
      } else if (path.startsWith('/establishment/')) {
        const parts = path.split('/');
        const id = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(id)) {
          setSelectedEstablishmentId(id);
          setCurrentPage('establishment-detail');
        } else {
          setCurrentPage('404');
        }
      } else {
        setCurrentPage('404');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  /**
   * Fonction de rendu agissant comme un "Switch/Router".
   * Retourne le bon composant de page en fonction de la route (`currentPage`) et vérifie
   * les permissions (ex: redirige vers LoginPage si accès à '/profile' sans être connecté).
   */
  const renderPage = () => {
    const pageType = currentPage.split('?')[0];
    switch (pageType) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />;
      case 'login':
        return <LoginPage onNavigate={handleNavigate} />;
      case 'register':
        return <RegisterPage onNavigate={handleNavigate} />;
      case 'forgot-password':
        return <ForgotPasswordPage onNavigate={handleNavigate} />;
      case 'register-establishment':
        return <RegisterEstablishmentPage onNavigate={handleNavigate} />;
      case 'establishment-detail':
        return selectedEstablishmentId ? (
          <EstablishmentDetailPage
            establishmentId={selectedEstablishmentId}
            onNavigate={handleNavigate}
          />
        ) : (
          <NotFoundPage onNavigateHome={() => handleNavigate('home')} />
        );
      case 'profile':
        return user ? <ProfilePage onNavigate={handleNavigate} /> : <LoginPage onNavigate={handleNavigate} />;
      case 'payment-confirmation':
        return <PaymentConfirmationPage onNavigate={handleNavigate} />;
      case 'admin':
        return user && user.role === 'admin' ? <AdminDashboard onNavigate={handleNavigate} /> : <NotFoundPage onNavigateHome={() => handleNavigate('home')} />;
      case 'establishment-dashboard':
        return user && (user.role === 'gerant' || user.role === 'professionnel') ? (
          <EstablishmentDashboard onNavigate={handleNavigate} />
        ) : (
          <NotFoundPage onNavigateHome={() => handleNavigate('home')} />
        );
      case 'search': {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category') || undefined;
    const query = params.get('query') || undefined;
    const location = params.get('location') || undefined;
    return (
      <SearchPage
        key={currentPage}
        onNavigate={handleNavigate}
        initialCategory={category}
        initialQuery={query}
        initialLocation={location}
      />
    );
  }
      default:
  return <NotFoundPage onNavigateHome={() => handleNavigate('home')} />;
}
  };

return (
  <Layout onNavigate={handleNavigate}>
    {renderPage()}
  </Layout>
);
}
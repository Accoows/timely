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



export default function App() {
  const { user } = useAuth();
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<number | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/establishment/')) {
      const parts = path.split('/');
      const id = parseInt(parts[parts.length - 1], 10);
      return isNaN(id) ? null : id;
    }
    return null;
  });

  // Initialiser la page en fonction de l'URL actuelle du navigateur
  const [currentPage, setCurrentPage] = useState<string>(() => {
    const path = window.location.pathname;
    if (path === '/' || path === '') return 'home';
    if (path === '/login') return 'login';
    if (path === '/register') return 'register';
    if (path === '/forgot-password') return 'forgot-password';
    if (path === '/register-establishment') return 'register-establishment';
    if (path === '/profile') return 'profile';
    if (path === '/admin') return 'admin';
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

  // Gérer la navigation et mettre à jour la barre d'adresse du navigateur
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

  // Remonter en haut de la page lors d'un changement de route
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // setTimeout fallback for when the new DOM takes a split second to stretch the page
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, 50);
    return () => clearTimeout(timer);
  }, [currentPage, selectedEstablishmentId]);

  // Écouter les boutons "Précédent" / "Suivant" du navigateur
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
      } else if (path === '/admin') {
        setCurrentPage('admin');
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
      case 'admin':
        return user && user.role === 'admin' ? <AdminDashboard onNavigate={handleNavigate} /> : <NotFoundPage onNavigateHome={() => handleNavigate('home')} />;
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
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
    if (path === '/search') return 'search';
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
      setCurrentPage(page);
      const path = page === 'home' ? '/' : `/${page}`;
      window.history.pushState(null, '', path);
    }
  };

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
      } else if (path === '/search') {
        setCurrentPage('search');
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
    switch (currentPage) {
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
        return <ProfilePage key={user?.id || 'profile'} onNavigate={handleNavigate} />;
      case 'search':
        return <SearchPage onNavigate={handleNavigate} />;
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

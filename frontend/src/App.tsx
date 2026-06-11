import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import HomePage from './pages/Home/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import RegisterEstablishmentPage from './pages/Establishment/RegisterEstablishmentPage';
import NotFoundPage from './pages/NotFound/NotFoundPage';

export default function App() {
  // Initialiser la page en fonction de l'URL actuelle du navigateur
  const [currentPage, setCurrentPage] = useState<string>(() => {
    const path = window.location.pathname;
    if (path === '/' || path === '') return 'home';
    if (path === '/login') return 'login';
    if (path === '/register') return 'register';
    if (path === '/forgot-password') return 'forgot-password';
    if (path === '/register-establishment') return 'register-establishment';
    return '404';
  });

  // Gérer la navigation et mettre à jour la barre d'adresse du navigateur
  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    const path = page === 'home' ? '/' : `/${page}`;
    window.history.pushState(null, '', path);
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
        return <HomePage />;
      case 'login':
        return <LoginPage onNavigate={handleNavigate} />;
      case 'register':
        return <RegisterPage onNavigate={handleNavigate} />;
      case 'forgot-password':
        return <ForgotPasswordPage onNavigate={handleNavigate} />;
      case 'register-establishment':
        return <RegisterEstablishmentPage onNavigate={handleNavigate} />;
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

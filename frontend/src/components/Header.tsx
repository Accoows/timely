import { useAuth } from '../context/AuthContext';
import Button from './Button';

interface HeaderProps {
  onNavigate?: (page: string) => void;
}

export default function Header({ onNavigate }: HeaderProps) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    onNavigate?.('home');
  };

  return (
    <header className="navbar-global">
      <div className="navbar-container">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onNavigate?.('home')} 
            className="navbar-logo bg-transparent border-none cursor-pointer p-0 focus:outline-none"
          >
            timely.
          </button>
        </div>
        <nav className="navbar-nav items-center">
          <button 
            onClick={() => onNavigate?.('register-establishment')} 
            className="navbar-link bg-transparent border-none cursor-pointer p-0 focus:outline-none"
          >
            Inscrire mon établissement
          </button>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-neutral-600 text-sm">
                Bonjour, <strong className="text-neutral-900">{user.first_name || user.username}</strong>
              </span>
              <Button 
                onClick={handleLogout} 
                variant="outline"
                className="px-4 py-2 text-sm"
              >
                Déconnexion
              </Button>
            </div>
          ) : (
            <>
              <Button 
                onClick={() => onNavigate?.('login')} 
                variant="ghost"
              >
                Se connecter
              </Button>
              <Button 
                onClick={() => onNavigate?.('register')} 
                variant="primary"
                className="px-5 py-2.5 text-sm"
              >
                S'inscrire
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from './Button';

interface HeaderProps {
  onNavigate?: (page: string) => void;
}

export default function Header({ onNavigate }: HeaderProps) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    onNavigate?.('home');
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
            onClick={() => onNavigate?.('search')} 
            className="navbar-link bg-transparent border-none cursor-pointer p-0 focus:outline-none"
          >
            Rechercher
          </button>

          <button 
            onClick={() => onNavigate?.('register-establishment')} 
            className="navbar-link bg-transparent border-none cursor-pointer p-0 focus:outline-none"
          >
            Inscrire mon établissement
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 border-2 border-neutral-900 rounded-lg font-bold text-sm bg-white hover:bg-neutral-50 transition-colors cursor-pointer select-none focus:outline-none"
            >
              {user ? (
                <div className="relative flex items-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-neutral-900">
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                  </svg>
                  <span className="absolute -top-1 -right-1 block h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white"></span>
                </div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-neutral-500 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              )}
              <span>Mon compte</span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-neutral-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg py-1.5 z-50">
                {user ? (
                  <>
                    <div className="px-4 py-2.5 border-b-2 border-neutral-900 bg-neutral-50 text-left">
                      <p className="text-sm font-bold text-neutral-900 truncate">
                        {user.first_name || user.last_name 
                          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                          : user.username
                        }
                      </p>
                      <p className="text-xs text-neutral-500 truncate mt-0.5">
                        {user.email || 'Pas d\'adresse email'}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onNavigate?.('profile');
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors border-none bg-transparent cursor-pointer"
                    >
                      Mon Profil
                    </button>

                    <div className="border-t-2 border-neutral-900 my-1"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors border-none bg-transparent cursor-pointer"
                    >
                      Déconnexion
                    </button>
                  </>
                ) : (
                  <div className="p-3 flex flex-col gap-2">
                    <div className="px-1 pb-1.5 text-left">
                      <p className="text-xs font-black text-neutral-900 uppercase tracking-wider">Espace Client</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Accédez à vos rendez-vous et réservations.</p>
                    </div>
                    <Button
                      onClick={() => {
                        setDropdownOpen(false);
                        onNavigate?.('login');
                      }}
                      variant="outline"
                      size="md"
                      fullWidth
                    >
                      Se connecter
                    </Button>
                    <Button
                      onClick={() => {
                        setDropdownOpen(false);
                        onNavigate?.('register');
                      }}
                      variant="primary"
                      size="md"
                      fullWidth
                    >
                      S'inscrire
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

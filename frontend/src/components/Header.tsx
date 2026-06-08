interface HeaderProps {
  onNavigate?: (page: string) => void;
  currentPage?: string;
}

export default function Header({ onNavigate, currentPage }: HeaderProps) {
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
        <nav className="navbar-nav">
          <a href="#" className="navbar-link">Inscrire mon établissement</a>
          <button 
            onClick={() => onNavigate?.('bookings')}
            className={`navbar-link bg-transparent border-none cursor-pointer focus:outline-none ${currentPage === 'bookings' ? 'text-neutral-900 font-bold' : ''}`}
          >
            Mes Réservations
          </button>
          <a href="#" className="navbar-btn-ghost">Se connecter</a>
          <a href="#" className="navbar-btn-primary">S'inscrire</a>
        </nav>
      </div>
    </header>
  );
}

export default function Footer() {
  return (
    <footer className="footer-global">
      <div className="footer-top-container">
        <div className="footer-brand-col">
          <span className="footer-brand-logo">timely.</span>
          <p className="footer-brand-desc">
            La plateforme moderne de planification en temps réel. Organisez vos rendez-vous du quotidien en quelques clics, sans fioritures.
          </p>
        </div>
        
        <div className="footer-links-col">
          <span className="footer-col-title">Secteurs</span>
          <a href="#" className="footer-link">Beauté & Bien-être</a>
          <a href="#" className="footer-link">Restauration</a>
          <a href="#" className="footer-link">Hôtels & Hébergements</a>
          <a href="#" className="footer-link">Administration</a>
        </div>

        <div className="footer-links-col">
          <span className="footer-col-title">Professionnels</span>
          <a href="#" className="footer-link">Espace Partenaire</a>
          <a href="#" className="footer-link">Inscrire un établissement</a>
          <a href="#" className="footer-link">Solutions Pro</a>
        </div>

        <div className="footer-links-col">
          <span className="footer-col-title">Légal</span>
          <a href="#" className="footer-link">Mentions légales</a>
          <a href="#" className="footer-link">Conditions d'utilisation (CGU)</a>
          <a href="#" className="footer-link">Confidentialité</a>
          <a href="#" className="footer-link">Contact & Support</a>
        </div>
      </div>
      
      <div className="footer-bottom-container">
        <span>Copyright © 2026 Timely.</span>
        <span>France (Français)</span>
      </div>
    </footer>
  );
}

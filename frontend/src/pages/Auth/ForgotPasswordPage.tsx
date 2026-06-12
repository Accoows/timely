import { useState } from 'react';
import InputField from '../../components/InputField';
import Button from '../../components/Button';

interface ForgotPasswordPageProps {
  onNavigate: (page: string) => void;
}

export default function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulation d'envoi d'e-mail de récupération
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 bg-neutral-50">
      <div className="w-full max-w-md bg-white border border-neutral-200/80 p-8 rounded-2xl shadow-sm">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-neutral-900 tracking-tight">Mot de passe oublié</h2>
          <p className="text-neutral-500 text-sm mt-2">
            Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.
          </p>
        </div>

        {submitted ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5" />
              </svg>
            </div>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Un e-mail de récupération a été envoyé à l'adresse <strong>{email}</strong>. Pensez à vérifier vos spams si vous ne le recevez pas dans quelques minutes.
            </p>
            <Button
              onClick={() => onNavigate('login')}
              fullWidth
              variant="secondary"
            >
              Retour à la connexion
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <InputField
              label="Adresse e-mail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: arthur.martin@example.com"
            />

            <Button
              type="submit"
              loading={loading}
              fullWidth
              className="py-4"
            >
              Envoyer le lien de récupération
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-neutral-500 font-semibold hover:text-neutral-900 text-sm bg-transparent border-none cursor-pointer focus:outline-none p-0"
              >
                Retour à la connexion
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

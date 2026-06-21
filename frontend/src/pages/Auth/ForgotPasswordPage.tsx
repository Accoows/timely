import { useState } from 'react';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import { api } from '../../services/api';

interface ForgotPasswordPageProps {
  onNavigate: (page: string) => void;
}

export default function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  /**
   * L'utilisateur soumet son email. L'API vérifie si le compte existe,
   * génère un code sécurisé en base de données, et simule l'envoi d'un mail (code dans le Dashboard Admin).
   * On passe ensuite `submitted` à true pour afficher la seconde étape du formulaire.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');

    try {
      await api.auth.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * L'utilisateur soumet le code reçu (via l'Admin) avec son nouveau mot de passe.
   * L'API vérifie la validité du code et met à jour le compte.
   * Si succès, on alerte l'utilisateur et on le redirige vers la page de connexion.
   */
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code || !newPassword) return;
    setLoading(true);
    setError('');

    try {
      await api.auth.resetPassword(email, code, newPassword);
      alert('Votre mot de passe a été réinitialisé avec succès !');
      onNavigate('login');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
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
          <form onSubmit={handleResetSubmit} className="space-y-6">
            <div className="text-center space-y-4 mb-6">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5" />
                </svg>
              </div>
              <p className="text-neutral-600 text-sm leading-relaxed">
                Un code de réinitialisation a été généré pour <strong>{email}</strong>. Veuillez contacter un administrateur pour l'obtenir.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border-2 border-red-200 text-sm font-semibold">
                {error}
              </div>
            )}

            <InputField
              label="Code de réinitialisation (6 chiffres)"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex: 123456"
              maxLength={6}
            />

            <InputField
              label="Nouveau mot de passe"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />

            <Button
              type="submit"
              loading={loading}
              fullWidth
            >
              Réinitialiser mon mot de passe
            </Button>
            
            <div className="text-center pt-2">
              <Button
                onClick={() => onNavigate('login')}
                fullWidth
                variant="secondary"
                type="button"
              >
                Retour à la connexion
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border-2 border-red-200 text-sm font-semibold">
                {error}
              </div>
            )}
            
            <InputField
              label="Adresse e-mail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: timely.pro@example.com"
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
              <a
                href="/login"
                onClick={(e) => { e.preventDefault(); onNavigate('login'); }}
                className="text-neutral-900 font-bold hover:underline bg-transparent border-none cursor-pointer focus:outline-none p-0"
              >
                Retour à la connexion
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

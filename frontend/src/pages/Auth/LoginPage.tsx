import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import Alert from '../../components/Alert';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export default function LoginPage({ onNavigate }: LoginPageProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Gestion de la soumission du formulaire de connexion.
   * Intercepte l'événement de base (e.preventDefault) pour éviter le rechargement de page.
   * Fait appel à la fonction `login` du AuthContext qui gère le fetch API + l'enregistrement du token.
   * En cas de succès, redirige l'utilisateur vers l'accueil (`onNavigate('home')`).
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      onNavigate('home');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Identifiants incorrects. Veuillez réessayer.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 bg-neutral-50">
      <div className="w-full max-w-md bg-white border border-neutral-200/80 p-8 rounded-2xl shadow-sm">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-neutral-900 tracking-tight">Connexion</h2>
          <p className="text-neutral-500 text-sm mt-2">
            Ravis de vous revoir ! Connectez-vous à votre compte.
          </p>
        </div>

        {error && <Alert type="error" message={error} className="mb-6" />}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <InputField
            label="Adresse e-mail"
            type="email"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="timely.pro@example.com"
          />

          <InputField
            label="Mot de passe"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <div className="flex justify-end -mt-3">
            <a
              href="/forgot-password"
              onClick={(e) => { e.preventDefault(); onNavigate('forgot-password'); }}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors bg-transparent border-none cursor-pointer focus:outline-none p-0"
            >
              Mot de passe oublié ?
            </a>
          </div>

          <Button
            type="submit"
            loading={loading}
            fullWidth
            className="py-4"
          >
            Se connecter
          </Button>
        </form>

        {/* Switch Link */}
        <div className="text-center mt-6 pt-6 border-t border-neutral-100">
          <p className="text-sm text-neutral-500">
            Nouveau sur Timely ?{' '}
            <a
              href="/register"
              onClick={(e) => { e.preventDefault(); onNavigate('register'); }}
              className="text-neutral-900 font-bold hover:underline bg-transparent border-none cursor-pointer focus:outline-none p-0"
            >
              Créer un compte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/InputField';
import Button from '../../components/Button';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export default function LoginPage({ onNavigate }: LoginPageProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      onNavigate('home');
    } catch {
      setError('Identifiants incorrects. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 bg-neutral-50">
      <div className="w-full max-w-md bg-white border border-neutral-200/60 p-8 rounded-3xl shadow-lg transition-all duration-300 hover:shadow-xl">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-neutral-900 tracking-tight">Connexion</h2>
          <p className="text-neutral-500 text-sm mt-2">
            Ravis de vous revoir ! Connectez-vous à votre compte.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-start gap-2 animate-shake">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <InputField
            label="Nom d'utilisateur"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ex: sarah_dev"
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
            <button
              type="button"
              onClick={() => onNavigate('forgot-password')}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors bg-transparent border-none cursor-pointer focus:outline-none p-0"
            >
              Mot de passe oublié ?
            </button>
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
            <button
              onClick={() => onNavigate('register')}
              className="text-neutral-900 font-bold hover:underline bg-transparent border-none cursor-pointer focus:outline-none p-0"
            >
              Créer un compte
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

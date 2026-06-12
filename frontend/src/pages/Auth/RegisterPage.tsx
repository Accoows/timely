import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/InputField';
import Button from '../../components/Button';

interface RegisterPageProps {
  onNavigate: (page: string) => void;
}

export default function RegisterPage({ onNavigate }: RegisterPageProps) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(email, password, firstName, lastName);
      onNavigate('home');
    } catch {
      setError("Une erreur est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 bg-neutral-50">
      <div className="w-full max-w-xl bg-white border border-neutral-200/60 p-8 rounded-3xl shadow-lg transition-all duration-300 hover:shadow-xl">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-neutral-900 tracking-tight">Inscription</h2>
          <p className="text-neutral-500 text-sm mt-2">
            Rejoignez Timely dès aujourd'hui pour planifier vos rendez-vous.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Prénom"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Arthur"
            />
            <InputField
              label="Nom"
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Martin"
            />
          </div>

          <InputField
            label="Adresse e-mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="arthur.martin@example.com"
          />

          <InputField
            label="Mot de passe"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="•••••••• (8 caractères min.)"
            minLength={8}
          />

          <Button
            type="submit"
            loading={loading}
            fullWidth
            className="mt-4 py-4"
          >
            S'inscrire
          </Button>
        </form>

        {/* Switch Link */}
        <div className="text-center mt-6 pt-6 border-t border-neutral-100">
          <p className="text-sm text-neutral-500">
            Déjà inscrit ?{' '}
            <button
              onClick={() => onNavigate('login')}
              className="text-neutral-900 font-bold hover:underline bg-transparent border-none cursor-pointer focus:outline-none p-0"
            >
              Se connecter
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

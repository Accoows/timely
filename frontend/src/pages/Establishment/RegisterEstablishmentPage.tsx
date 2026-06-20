import { useState, useEffect } from 'react';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface RegisterEstablishmentPageProps {
  onNavigate: (page: string) => void;
}

type CategoryType = 'beauty' | 'restaurant' | 'hotel' | 'travel';

export default function RegisterEstablishmentPage({ onNavigate }: RegisterEstablishmentPageProps) {
  const { user, updateUser } = useAuth();

  useEffect(() => {
    if (!user) {
      onNavigate('login');
    }
  }, [user, onNavigate]);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [siret, setSiret] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryType | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.establishments.register({
        nom: name,
        adresse: address,
        ville: city,
        code_postal: zipCode,
        telephone: phone,
        mail: email,
        siret,
        description,
        category
      });
      if (user && res.establishment) {
        const newEstab = { id: res.establishment.id, nom: res.establishment.nom };
        const updatedEstabs = user.establishments 
          ? [...user.establishments, newEstab] 
          : [newEstab];
        updateUser({
          ...user,
          establishment_id: res.establishment.id,
          establishments: updatedEstabs
        });
      }
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    {
      id: 'beauty' as CategoryType,
      name: 'Beauté & Soins',
      desc: 'Salons de coiffure, instituts de beauté, spas et bien-être.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'restaurant' as CategoryType,
      name: 'Tables de Restaurant',
      desc: 'Gastronomie, bistrots, cafés et services de restauration.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {/* Fork */}
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v6a3 3 0 003 3h0a3 3 0 003-3V3M8 12v9M7 3v5M9 3v5" />
          {/* Knife */}
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 3v18M17 3a3 3 0 013 3v6a3 3 0 01-3 3" />
        </svg>
      )
    },
    {
      id: 'hotel' as CategoryType,
      name: 'Hôtels & Hébergements',
      desc: 'Hôtels, maisons d\'hôtes, gîtes et résidences de vacances.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'travel' as CategoryType,
      name: 'Voyages & Transports',
      desc: 'Agences de voyage, guides locaux et services de transports privés.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      )
    }
  ];

  return (
    <div className="flex-1 bg-neutral-50 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {submitted ? (
          <div className="bg-white border border-neutral-200/80 p-12 rounded-2xl shadow-sm text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-neutral-900 tracking-tight">Demande reçue !</h2>
            <p className="text-neutral-600 text-base max-w-xl mx-auto leading-relaxed">
              Merci d'avoir inscrit votre établissement <strong>{name}</strong> sur Timely. Nos équipes vont valider vos informations (notamment votre numéro SIRET <strong>{siret}</strong>) sous 24h ouvrées. Vous recevrez un e-mail de confirmation dès la mise en ligne.
            </p>
            <div className="pt-4 max-w-xs mx-auto">
              <Button onClick={() => onNavigate('home')} fullWidth>
                Retour à l'accueil
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-neutral-200/80 p-8 md:p-12 rounded-2xl shadow-sm">
            {/* Header */}
            <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-900 tracking-tight">
                Inscrire mon établissement
              </h2>
              <p className="text-neutral-500 text-sm mt-2">
                Rejoignez la plateforme et ouvrez vos réservations en quelques clics.
              </p>
            </div>


            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border-2 border-red-200 text-sm font-semibold">
                  {error}
                </div>
              )}
              {/* Category Chooser */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-4">
                  1. Choisissez la catégorie de votre établissement *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-5 text-left border rounded-xl flex gap-4 transition-all duration-200 cursor-pointer ${
                        category === cat.id
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-none'
                          : 'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50'
                      }`}
                    >
                      <div className={`p-3 rounded-lg shrink-0 ${
                        category === cat.id ? 'bg-white/10 text-white' : 'bg-neutral-50 text-neutral-600'
                      }`}>
                        {cat.icon}
                      </div>
                      <div>
                        <strong className="block font-bold text-base">{cat.name}</strong>
                        <span className={`text-xs mt-1 block leading-normal ${
                          category === cat.id ? 'text-neutral-200' : 'text-neutral-500'
                        }`}>
                          {cat.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                {!category && (
                  <p className="mt-2 text-xs text-neutral-400 font-medium">
                    Veuillez sélectionner une catégorie pour continuer.
                  </p>
                )}
              </div>

              <hr className="border-neutral-100" />

              {/* General Info */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-4">
                  2. Informations de l'établissement
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputField
                    label="Nom de l'établissement *"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Le Bistrot Gourmet"
                  />
                  <InputField
                    label="Numéro SIRET (14 chiffres) *"
                    type="text"
                    required
                    value={siret}
                    onChange={(e) => setSiret(e.target.value)}
                    placeholder="Ex: 12345678901234"
                    maxLength={14}
                    pattern="[0-9]{14}"
                  />
                  <InputField
                    label="Adresse (Rue and number) *"
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: 12 Rue de la Paix"
                  />
                  <InputField
                    label="Code Postal *"
                    type="text"
                    required
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="Ex: 75002"
                  />
                  <InputField
                    label="Ville *"
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Paris"
                  />
                  <InputField
                    label="Téléphone professionnel *"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: 01 23 45 67 89"
                  />
                  <InputField
                    label="E-mail de contact *"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: contact@etablissement.com"
                  />
                </div>

                <div className="mt-5">
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Description de l'établissement
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 border border-neutral-200 focus:border-neutral-900 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none transition-colors text-sm"
                    placeholder="Décrivez votre établissement, vos services et spécialités..."
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  loading={loading}
                  disabled={!category}
                  fullWidth
                  className="py-4"
                >
                  Soumettre ma demande d'inscription
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import type { User } from '../../../types';
import { api } from '../../../services/api';
import InputField from '../../../components/InputField';
import Button from '../../../components/Button';
import Alert from '../../../components/Alert';

interface NewProAccountTabProps {
  user: User;
}

export default function NewProAccountTab({ user }: NewProAccountTabProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Professional fields (poste is fixed/disabled, date_embauche is automatic on backend)
  const [poste] = useState('Coiffeur / Esthéticienne');
  const [description, setDescription] = useState('');
  const [etablissementId] = useState<number>(() => {
    if (user.establishments && user.establishments.length > 0) {
      return user.establishments[0].id;
    }
    return user.establishment_id || 0;
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (!etablissementId) {
      setError("Veuillez sélectionner un établissement.");
      return;
    }

    setLoading(true);

    try {
      await api.auth.registerPro({
        email,
        password_raw: password,
        firstname: firstName,
        lastname: lastName,
        poste,
        description,
        date_embauche: '', // Treated automatically on backend
        etablissement_id: etablissementId
      });
      setSuccess('Le compte professionnel a été créé avec succès !');
      // Reset fields
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDescription('');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue lors de la création du compte.");
    } finally {
      setLoading(false);
    }
  };

  const establishments = user.establishments || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 pb-2 border-b-2 border-neutral-100">
        <h2 className="text-2xl font-black text-neutral-900 uppercase">Nouveau compte pro</h2>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}
      {success && <Alert type="success" message={success} className="mb-6" />}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Identité */}
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

        {/* Email */}
        <InputField
          label="Adresse e-mail (Login)"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="collaborateur@example.com"
        />

        {/* Mots de passe */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Mot de passe"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
          />
          <InputField
            label="Confirmer le mot de passe"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
          />
        </div>

        {/* Info Professionnelles */}
        <div className="h-[2px] bg-neutral-200 my-6"></div>
        <h3 className="text-lg font-black text-neutral-900 uppercase">Informations Professionnelles</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-neutral-450 uppercase tracking-wider mb-2">
              Établissement affecté *
            </label>
            {establishments.length > 0 ? (
              <select
                disabled
                required
                value={etablissementId}
                className="w-full bg-neutral-100 border-2 border-neutral-200 rounded-xl px-4 py-3 text-sm font-bold text-neutral-400 select-none shadow-none cursor-not-allowed"
              >
                {establishments.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.nom}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-4 py-3 bg-neutral-100 border-2 border-neutral-200 text-neutral-400 text-sm rounded-xl font-bold select-none cursor-not-allowed">
                Aucun établissement disponible
              </div>
            )}
          </div>

          <InputField
            label="Poste / Rôle"
            type="text"
            required
            disabled
            value={poste}
            placeholder="Coiffeur / Esthéticienne"
            className="bg-neutral-100 border-2 border-neutral-200 text-neutral-400 shadow-none cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
            Description / Bio
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description courte du profil professionnel..."
            rows={3}
            className="w-full bg-white border-2 border-neutral-900 rounded-xl px-4 py-3 text-sm font-bold text-neutral-850 focus:outline-none focus:ring-0 focus:border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] resize-none"
          />
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            loading={loading}
            size="md"
          >
            Créer le compte professionnel
          </Button>
        </div>
      </form>
    </div>
  );
}

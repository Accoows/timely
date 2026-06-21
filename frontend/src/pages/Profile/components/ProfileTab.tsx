import React, { useState } from 'react';
import type { User } from '../../../types';
import { api } from '../../../services/api';
import InputField from '../../../components/InputField';
import Button from '../../../components/Button';
import Alert from '../../../components/Alert';

interface ProfileTabProps {
  user: User;
  updateUser: (user: User) => void;
  onNavigate: (page: string) => void;
}

export default function ProfileTab({ user, updateUser, onNavigate }: ProfileTabProps) {
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Password fields state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updated = await api.auth.updateCurrentUser({
        first_name: firstName,
        last_name: lastName,
        email: email
      });
      updateUser(updated);
      setSuccess('Profil mis à jour avec succès !');
    } catch {
      setError('Une erreur est survenue lors de la mise à jour (l\'adresse e-mail est peut-être déjà utilisée).');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit faire au moins 6 caractères.');
      return;
    }

    setPasswordLoading(true);

    try {
      await api.auth.updateCurrentUser({
        old_password: oldPassword,
        new_password: newPassword
      });
      setPasswordSuccess('Votre mot de passe a été modifié avec succès !');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '';
      if (errorMsg.includes('incorrect')) {
        setPasswordError("L'ancien mot de passe est incorrect.");
      } else {
        setPasswordError("Une erreur est survenue lors de la modification du mot de passe (vérifiez votre ancien mot de passe).");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'gerant':
        return "Gérant d'établissement";
      case 'professionnel':
        return 'Professionnel';
      case 'admin':
        return 'Administrateur';
      default:
        return 'Client';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 pb-2 border-b-2 border-neutral-100">
        <h2 className="text-2xl font-black text-neutral-900 uppercase">Mon Compte</h2>
        {user.role === 'admin' && (
          <Button 
            onClick={() => onNavigate('admin')}
            variant="primary"
            size="sm"
            className="shadow-sm"
          >
            Accéder au Dashboard Admin
          </Button>
        )}
      </div>
      
      {error && <Alert type="error" message={error} className="mb-6" />}
      {success && <Alert type="success" message={success} className="mb-6" />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Prénom"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Albert"
          />
          <InputField
            label="Nom"
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Einstein"
          />
        </div>

        <InputField
          label="Adresse e-mail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="timely.pro@example.com"
        />

        <div>
          <label className="block text-sm font-bold text-neutral-900 mb-2">
            Type de compte / Rôle
          </label>
          <div className="px-4 py-3 bg-neutral-50 border-2 border-neutral-900 text-neutral-700 text-sm rounded-xl font-bold select-none">
            {getRoleLabel(user.role)}
          </div>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            loading={loading}
            size="md"
          >
            Enregistrer les modifications
          </Button>
        </div>
      </form>

      {/* Password change section */}
      <h3 className="text-xl font-black text-neutral-900 uppercase mt-12 mb-6 pb-2 border-b-2 border-neutral-100">
        Sécurité / Modifier le mot de passe
      </h3>

      {passwordError && <Alert type="error" message={passwordError} className="mb-6" />}
      {passwordSuccess && <Alert type="success" message={passwordSuccess} className="mb-6" />}

      <form onSubmit={handlePasswordSubmit} className="space-y-5">
        <InputField
          label="Ancien mot de passe"
          type="password"
          required
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          placeholder="••••••••"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Nouveau mot de passe"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
          <InputField
            label="Confirmer le nouveau mot de passe"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            loading={passwordLoading}
            size="md"
          >
            Enregistrer le nouveau mot de passe
          </Button>
        </div>
      </form>
    </div>
  );
}

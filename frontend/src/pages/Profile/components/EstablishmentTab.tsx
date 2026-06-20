import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import type { Etablissement, Secteur, User } from '../../../types';
import Button from '../../../components/Button';
import Alert from '../../../components/Alert';

interface EstablishmentTabProps {
  user: User;
  updateUser: (user: User) => void;
  onNavigate: (page: string) => void;
}

export default function EstablishmentTab({ user, updateUser, onNavigate }: EstablishmentTabProps) {
  const [establishment, setEstablishment] = useState<Etablissement | null>(null);
  const [sectors, setSectors] = useState<Secteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Compute resolvedId during render to avoid useEffect state cascading
  const resolvedId = selectedId !== null && user.establishments?.some(e => e.id === selectedId)
    ? selectedId
    : (user.establishments?.find(e => e.id === user.establishment_id)?.id || user.establishments?.[0]?.id || null);

  // Modal / Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editNom, setEditNom] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editMail, setEditMail] = useState('');
  const [editSiteWeb, setEditSiteWeb] = useState('');
  const [editSecteurId, setEditSecteurId] = useState<number | string>('');
  const [editAdresse, setEditAdresse] = useState('');
  const [editVille, setEditVille] = useState('');
  const [editCodePostal, setEditCodePostal] = useState('');
  const [editHoraires, setEditHoraires] = useState<Record<string, string>>({});

  const fetchEstablishmentDetails = useCallback(async () => {
    if (!resolvedId) {
      setLoading(false);
      setEstablishment(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await api.establishments.getById(resolvedId);
      setEstablishment(data);
      
      // Load sectors
      const sectorList = await api.sectors.list();
      setSectors(sectorList);

      // Initialize form fields
      setEditNom(data.nom || '');
      setEditDescription(data.description || '');
      setEditPhone(data.telephone || '');
      setEditMail(data.mail || '');
      setEditSiteWeb(data.site_web || '');
      setEditSecteurId(data.secteur?.id || '');
      setEditAdresse(data.lieu?.adresse || '');
      setEditVille(data.lieu?.ville || '');
      setEditCodePostal(data.lieu?.code_postal || '');
      setEditHoraires(data.horaires || {});

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Impossible de charger les données de votre établissement.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [resolvedId]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchEstablishmentDetails();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchEstablishmentDetails]);

  const handleUpdateEstablishment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedId || !establishment) return;

    try {
      setError(null);
      const selectedSector = sectors.find(s => s.id === Number(editSecteurId)) || null;

      await api.establishments.update(resolvedId, {
        nom: editNom,
        description: editDescription,
        telephone: editPhone,
        mail: editMail,
        site_web: editSiteWeb,
        secteur: selectedSector || undefined,
        lieu: {
          id: establishment.lieu?.id || 0,
          adresse: editAdresse,
          ville: editVille,
          code_postal: editCodePostal
        },
        horaires: editHoraires
      });

      // Synchronize name in user context establishments list
      if (user.establishments) {
        const updatedEstabs = user.establishments.map(est =>
          est.id === resolvedId ? { ...est, nom: editNom } : est
        );
        updateUser({ ...user, establishments: updatedEstabs });
      }

      // Reload
      await fetchEstablishmentDetails();
      setIsEditing(false);
      alert('Établissement mis à jour avec succès.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Impossible de modifier l\'établissement.';
      setError(msg);
    }
  };

  const handleDeleteEstablishment = async () => {
    if (!resolvedId) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer définitivement votre établissement ? Cette action est irréversible et supprimera également toutes ses réservations.")) {
      return;
    }
    try {
      setLoading(true);
      await api.establishments.delete(resolvedId);
      if (user.establishments) {
        const updatedEstabs = user.establishments.filter(e => e.id !== resolvedId);
        const nextId = updatedEstabs[0]?.id || null;
        const newRole = updatedEstabs.length > 0 ? user.role : 'client';
        updateUser({
          ...user,
          role: newRole,
          establishment_id: nextId,
          establishments: updatedEstabs
        });
        setSelectedId(nextId);
      } else {
        updateUser({ ...user, role: 'client', establishment_id: null, establishments: [] });
        setSelectedId(null);
      }
      alert("Votre établissement a été supprimé.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Impossible de supprimer l'établissement.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-neutral-950"></span>
      </div>
    );
  }

  if (!resolvedId || !establishment) {
    return (
      <div className="space-y-6 text-center py-12">
        <div className="w-16 h-16 bg-violet-50 text-neutral-900 rounded-full flex items-center justify-center mx-auto border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-2xl font-black text-neutral-900 uppercase">Aucun Établissement enregistré</h3>
        <p className="text-neutral-500 text-sm max-w-md mx-auto">
          Vous n'avez pas encore inscrit d'établissement pour votre compte de gérant. Lancez l'inscription en cliquant sur le bouton ci-dessous.
        </p>
        <div className="pt-2">
          <Button
            onClick={() => onNavigate('register-establishment')}
            variant="primary"
            size="md"
          >
            Inscrire mon établissement
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} className="mb-6" />}

      {/* Sélecteur d'établissement multiple */}
      {user.establishments && user.establishments.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-violet-50/50 p-4 border-2 border-neutral-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
          <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
            <label className="text-sm font-black uppercase text-neutral-900 whitespace-nowrap">Gérer l'établissement :</label>
            <select
              value={selectedId || ''}
              onChange={(e) => {
                const newId = Number(e.target.value);
                setSelectedId(newId);
                updateUser({ ...user, establishment_id: newId });
              }}
              className="select bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              {user.establishments.map(est => (
                <option key={est.id} value={est.id}>{est.nom}</option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => onNavigate('register-establishment')}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            + Ajouter un autre établissement
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b-2 border-neutral-100">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 uppercase">{establishment.nom}</h2>
          <p className="text-sm text-neutral-500 mt-1">Gérer votre salon et modifier ses informations.</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-white border-2 border-neutral-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="space-y-4">
          <h3 className="font-extrabold text-neutral-900 text-lg border-b border-neutral-100 pb-2">Informations générales</h3>
          
          <p className="text-xs text-neutral-600 font-medium">{establishment.description || 'Aucune description fournie.'}</p>
          
          <div className="text-xs text-neutral-800 space-y-2 bg-violet-50/50 p-4 rounded-xl border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
            <div><strong>Adresse :</strong> {establishment.lieu ? `${establishment.lieu.adresse}, ${establishment.lieu.ville} ${establishment.lieu.code_postal || ''}` : 'Non spécifiée'}</div>
            <div><strong>Email :</strong> {establishment.mail || 'Non spécifié'}</div>
            <div><strong>Téléphone :</strong> {establishment.telephone || 'Non spécifié'}</div>
            {establishment.site_web && <div><strong>Site Web :</strong> <a href={establishment.site_web} target="_blank" rel="noreferrer" className="underline hover:text-neutral-900">{establishment.site_web}</a></div>}
            <div><strong>Catégorie / Secteur :</strong> {establishment.secteur?.nom || 'Non catégorisé'}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-neutral-100">
          <Button
            onClick={() => onNavigate(`establishment/${establishment.id}`)}
            variant="primary"
            size="sm"
          >
            Page établissement
          </Button>
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
          >
            Éditer la page
          </Button>
          <Button
            onClick={handleDeleteEstablishment}
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-50"
            size="sm"
          >
            Supprimer l'établissement
          </Button>
        </div>
      </div>

      {/* MODAL: EDIT ESTABLISHMENT DATA */}
      {isEditing && (
        <div className="modal modal-open bg-neutral-900/60 backdrop-blur-sm">
          <div className="modal-box bg-white border-2 border-neutral-900 text-neutral-900 max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8">
            <h3 className="font-black text-xl uppercase tracking-tight text-neutral-900 mb-6 border-b-2 border-neutral-900 pb-3">Modifier l'Établissement</h3>
            
            <form onSubmit={handleUpdateEstablishment} className="space-y-6">
              <h4 className="font-bold text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-250 pb-1">Données générales</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control col-span-2">
                  <label className="label text-xs font-bold text-neutral-500 uppercase">Nom</label>
                  <input
                    type="text"
                    value={editNom}
                    onChange={(e) => setEditNom(e.target.value)}
                    className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    required
                  />
                </div>

                <div className="form-control col-span-2">
                  <label className="label text-xs font-bold text-neutral-500 uppercase">Secteur</label>
                  <select
                    value={editSecteurId}
                    onChange={(e) => setEditSecteurId(e.target.value)}
                    className="select w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <option value="">Sélectionner un secteur...</option>
                    {sectors.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-control">
                <label className="label text-xs font-bold text-neutral-500 uppercase">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="textarea w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label text-xs font-bold text-neutral-500 uppercase">Téléphone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  />
                </div>

                <div className="form-control">
                  <label className="label text-xs font-bold text-neutral-500 uppercase">Mail</label>
                  <input
                    type="email"
                    value={editMail}
                    onChange={(e) => setEditMail(e.target.value)}
                    className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label text-xs font-bold text-neutral-500 uppercase">Site Web</label>
                <input
                  type="url"
                  value={editSiteWeb}
                  onChange={(e) => setEditSiteWeb(e.target.value)}
                  className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                />
              </div>

              <h4 className="font-bold text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-250 pb-1 mt-6">Adresse / Lieu</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="form-control col-span-3">
                  <label className="label text-xs font-bold text-neutral-500 uppercase">Adresse</label>
                  <input
                    type="text"
                    value={editAdresse}
                    onChange={(e) => setEditAdresse(e.target.value)}
                    className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    required
                  />
                </div>

                <div className="form-control col-span-2">
                  <label className="label text-xs font-bold text-neutral-500 uppercase">Ville</label>
                  <input
                    type="text"
                    value={editVille}
                    onChange={(e) => setEditVille(e.target.value)}
                    className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label text-xs font-bold text-neutral-500 uppercase">Code Postal</label>
                  <input
                    type="text"
                    value={editCodePostal}
                    onChange={(e) => setEditCodePostal(e.target.value)}
                    className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-sm text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    required
                  />
                </div>
              </div>

              <h4 className="font-bold text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-250 pb-1 mt-6">Horaires d'ouverture</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(day => (
                  <div key={day} className="form-control">
                    <label className="label text-xs font-bold text-neutral-500 uppercase">{day}</label>
                    <input
                      type="text"
                      value={editHoraires[day] || ''}
                      onChange={(e) => {
                        const updated = { ...editHoraires };
                        updated[day] = e.target.value;
                        setEditHoraires(updated);
                      }}
                      placeholder="ex: 09:00 - 19:00 ou Fermé"
                      className="input w-full bg-white border-2 border-neutral-900 rounded-xl focus:outline-none text-xs text-neutral-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end pt-6 border-t-2 border-neutral-900">
                <button type="button" onClick={() => setIsEditing(false)} className="border-2 border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-black rounded-xl px-4 py-2 cursor-pointer text-xs">Annuler</button>
                <button type="submit" className="border-2 border-neutral-900 bg-neutral-900 hover:bg-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] transition-all font-black rounded-xl px-4 py-2 cursor-pointer text-xs">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

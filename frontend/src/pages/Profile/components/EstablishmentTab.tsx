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
  const [isManagingPhotos, setIsManagingPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Prestation states
  const [newPrestationNom, setNewPrestationNom] = useState('');
  const [newPrestationCout, setNewPrestationCout] = useState('');
  const [newPrestationDesc, setNewPrestationDesc] = useState('');
  const [selectedNewPrestationPros, setSelectedNewPrestationPros] = useState<number[]>([]);

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

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setPhotoError(null);
    try {
      let finalPhotos = establishment?.photos || [];
      for (let i = 0; i < files.length; i++) {
        const res = await api.establishments.uploadPhoto(resolvedId!, files[i]);
        finalPhotos = res.photos;
      }
      if (establishment) {
        setEstablishment({
          ...establishment,
          photos: finalPhotos
        });
      }
      alert(`${files.length} photo(s) ajoutée(s) avec succès.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'upload d'une ou plusieurs photos.";
      setPhotoError(msg);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette photo ?")) return;
    setPhotoError(null);
    try {
      const res = await api.establishments.deletePhoto(resolvedId!, photoUrl);
      if (establishment) {
        setEstablishment({
          ...establishment,
          photos: res.photos
        });
      }
      alert("Photo supprimée.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la suppression de la photo.";
      setPhotoError(msg);
    }
  };

  const handleAddPrestation = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!resolvedId || !newPrestationNom || !newPrestationCout) {
      alert("Veuillez remplir au moins le nom et le tarif.");
      return;
    }
    try {
      setError(null);
      const newPrest = await api.prestations.create(resolvedId, {
        nom: newPrestationNom,
        cout: parseFloat(newPrestationCout),
        description: newPrestationDesc,
        collaborateurs: selectedNewPrestationPros
      });
      if (establishment) {
        setEstablishment({
          ...establishment,
          prestations: [...(establishment.prestations || []), newPrest]
        });
      }
      setNewPrestationNom('');
      setNewPrestationCout('');
      setNewPrestationDesc('');
      setSelectedNewPrestationPros([]);
      alert("Prestation ajoutée avec succès !");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'ajout de la prestation.";
      setError(msg);
      alert(msg);
    }
  };

  const handleDeletePrestation = async (prestId: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cette prestation ?")) return;
    try {
      setError(null);
      await api.prestations.delete(prestId);
      if (establishment) {
        setEstablishment({
          ...establishment,
          prestations: (establishment.prestations || []).filter(p => p.id !== prestId)
        });
      }
      alert("Prestation supprimée.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la suppression de la prestation.";
      setError(msg);
      alert(msg);
    }
  };

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
            onClick={() => onNavigate('establishment-dashboard')}
            variant="outline"
            size="sm"
          >
            Dashboard
          </Button>
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
          >
            Éditer la page
          </Button>
          <Button
            onClick={() => setIsManagingPhotos(true)}
            variant="outline"
            size="sm"
          >
            Gérer les photos
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

              <h4 className="font-bold text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-250 pb-1 mt-6">Prestations / Services</h4>
              
              {/* List of existing prestations */}
              <div className="space-y-2 max-h-48 overflow-y-auto border-2 border-neutral-900 rounded-xl p-3 bg-neutral-50">
                {(!establishment?.prestations || establishment.prestations.length === 0) ? (
                  <p className="text-xs text-neutral-500 italic text-center py-2">Aucune prestation pour le moment.</p>
                ) : (
                  establishment.prestations.map(prest => (
                    <div key={prest.id} className="flex justify-between items-center bg-white p-2 border border-neutral-200 rounded-lg shadow-sm">
                      <div className="text-left">
                        <span className="text-xs font-bold text-neutral-900">{prest.nom}</span>
                        <span className="text-xs text-neutral-500 ml-2">({prest.cout} €)</span>
                        {prest.description && <p className="text-[10px] text-neutral-400 mt-0.5">{prest.description}</p>}
                        {prest.collaborateurs && prest.collaborateurs.length > 0 && (
                          <p className="text-[9px] text-violet-750 font-bold mt-1">
                            Professionnels compatibles : {prest.collaborateurs.map(pid => {
                              const colObj = establishment.collaborateurs?.find(c => c.id === pid);
                              return colObj ? `${colObj.prenom}` : null;
                            }).filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePrestation(prest.id)}
                        className="text-red-600 hover:text-red-800 font-bold text-xs px-2 py-1 cursor-pointer focus:outline-none"
                      >
                        Supprimer
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Form to add a new prestation */}
              <div className="border-2 border-dashed border-neutral-900 rounded-xl p-4 bg-violet-50/20 space-y-3 text-left">
                <p className="text-xs font-black uppercase text-neutral-900">Ajouter une prestation</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label text-[10px] font-bold text-neutral-500 uppercase py-0.5">Nom</label>
                    <input
                      type="text"
                      placeholder="ex: Coupe Homme"
                      value={newPrestationNom}
                      onChange={(e) => setNewPrestationNom(e.target.value)}
                      className="input w-full bg-white border border-neutral-900 rounded-lg focus:outline-none text-xs text-neutral-900 font-bold p-2"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label text-[10px] font-bold text-neutral-500 uppercase py-0.5">Tarif (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="ex: 25.00"
                      value={newPrestationCout}
                      onChange={(e) => setNewPrestationCout(e.target.value)}
                      className="input w-full bg-white border border-neutral-900 rounded-lg focus:outline-none text-xs text-neutral-900 font-bold p-2"
                    />
                  </div>
                </div>
                <div className="form-control">
                  <label className="label text-[10px] font-bold text-neutral-500 uppercase py-0.5">Description (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Description courte"
                    value={newPrestationDesc}
                    onChange={(e) => setNewPrestationDesc(e.target.value)}
                    className="input w-full bg-white border border-neutral-900 rounded-lg focus:outline-none text-xs text-neutral-900 font-bold p-2"
                  />
                </div>

                {/* Checklist of professionals */}
                {establishment.collaborateurs && establishment.collaborateurs.length > 0 && (
                  <div className="form-control">
                    <label className="label text-[10px] font-bold text-neutral-500 uppercase py-0.5">Professionnels affectés</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {establishment.collaborateurs.map(col => {
                        const isChecked = selectedNewPrestationPros.includes(col.id);
                        return (
                          <label key={col.id} className="flex items-center gap-1.5 bg-white border border-neutral-300 rounded-lg px-2.5 py-1 text-xs font-bold text-neutral-800 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedNewPrestationPros(prev => prev.filter(id => id !== col.id));
                                } else {
                                  setSelectedNewPrestationPros(prev => [...prev, col.id]);
                                }
                              }}
                              className="checkbox checkbox-xs rounded-full border-2 border-neutral-900 checked:bg-neutral-900 checked:text-white"
                              style={{ '--chkbg': '#171717', '--chkfg': '#ffffff' } as React.CSSProperties}
                            />
                            <span>{col.prenom}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddPrestation}
                  className="w-full border-2 border-neutral-900 bg-neutral-900 hover:bg-neutral-800 text-white font-black rounded-lg py-2 cursor-pointer text-xs"
                >
                  Ajouter la prestation
                </button>
              </div>

              <div className="flex gap-2 justify-end pt-6 border-t-2 border-neutral-900">
                <button type="button" onClick={() => setIsEditing(false)} className="border-2 border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-black rounded-xl px-4 py-2 cursor-pointer text-xs">Annuler</button>
                <button type="submit" className="border-2 border-neutral-900 bg-neutral-900 hover:bg-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] transition-all font-black rounded-xl px-4 py-2 cursor-pointer text-xs">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Management Modal */}
      {isManagingPhotos && (
        <div className="modal modal-open bg-neutral-900/60 backdrop-blur-sm">
          <div className="modal-box bg-white border-2 border-neutral-900 text-neutral-900 max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8">
            <div className="flex justify-between items-center mb-6 border-b-2 border-neutral-900 pb-3">
              <h3 className="font-black text-xl uppercase tracking-tight text-neutral-900">Gérer les Photos</h3>
              <button 
                type="button"
                onClick={() => { setIsManagingPhotos(false); setPhotoError(null); }}
                className="text-neutral-500 hover:text-neutral-900 font-bold text-sm focus:outline-none"
              >
                ✕
              </button>
            </div>

            {photoError && <Alert type="error" message={photoError} className="mb-6" />}

            {/* Photos List Grid */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {(!establishment.photos || establishment.photos.length === 0) ? (
                  <p className="col-span-full text-center text-sm text-neutral-500 italic py-8">
                    Aucune photo pour le moment.
                  </p>
                ) : (
                  establishment.photos.map((pUrl, idx) => (
                    <div key={idx} className="relative group border-2 border-neutral-900 rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] h-32 bg-neutral-50">
                      <img 
                        src={pUrl} 
                        alt={`Aperçu ${idx + 1}`} 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(pUrl)}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow border border-neutral-900 cursor-pointer focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Supprimer cette photo"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Upload Zone */}
              <div className="border-2 border-dashed border-neutral-900 rounded-2xl p-6 bg-neutral-50/50 flex flex-col items-center justify-center text-center">
                <svg className="w-10 h-10 text-neutral-400 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                </svg>
                <div className="text-xs font-bold text-neutral-700 mb-3">
                  {uploading ? "Upload en cours..." : "Sélectionnez une nouvelle image à ajouter"}
                </div>
                <label className={`border-2 border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-[0px] active:translate-x-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all font-black rounded-xl px-4 py-2 cursor-pointer text-xs ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <span>Parcourir</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleUploadPhoto}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                <p className="text-[10px] text-neutral-400 mt-2">Formats acceptés : PNG, JPG, JPEG, GIF, WEBP (Max. 5 Mo)</p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-6 border-t-2 border-neutral-900 mt-6">
              <button 
                type="button" 
                onClick={() => { setIsManagingPhotos(false); setPhotoError(null); }} 
                className="border-2 border-neutral-900 bg-neutral-900 hover:bg-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] transition-all font-black rounded-xl px-4 py-2 cursor-pointer text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

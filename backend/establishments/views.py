import os
from django.views import View
from django.http import JsonResponse
from django.db.models import Q
import json
from django.core.files.storage import FileSystemStorage
from django.conf import settings
from .models import Etablissement, Secteur, Lieu, Photo, Prestation
from authentication.models import Gerant, Client, Professionnel

class SectorListView(View):
    """
    Vue Django pour lister l'ensemble des secteurs d'activité enregistrés sur la plateforme.
    """

    def get(self, request):
        """
        Récupère tous les secteurs d'activité (Beauté, Restauration, etc.).

        Retourne :
        - JsonResponse contenant le tableau de secteurs (id, nom).
        """
        sectors = Secteur.objects.all()
        data = [{"id": s.id, "nom": s.nom} for s in sectors]
        return JsonResponse({"status": "success", "sectors": data}, status=200)


class LocationListView(View):
    """
    Vue Django pour lister les localités (villes et codes postaux) disponibles.
    
    Permet de lister les villes contenant des établissements, éventuellement filtrées par secteur.
    """

    def get(self, request):
        """
        Récupère les villes et codes postaux uniques associés à des établissements actifs.

        Paramètres de requête (GET) :
        - sector_id (ou secteur) : ID du secteur pour filtrer les localités correspondantes.

        Retourne :
        - JsonResponse contenant le tableau des localités distinctes triées par ville.
        """
        sector_id = request.GET.get('sector_id') or request.GET.get('secteur')
        
        queryset = Lieu.objects.all()
        if sector_id:
            # Filtrer les lieux qui possèdent au moins un établissement dans le secteur spécifié
            queryset = queryset.filter(etablissements__secteur_id=sector_id)
            
        # Groupement par ville et code postal pour renvoyer des zones de recherche uniques
        unique_locations = queryset.values('ville', 'code_postal').distinct().order_by('ville')
        
        data = []
        for loc in unique_locations:
            ville = loc['ville']
            code_postal = loc['code_postal']
            if not ville:
                continue
                
            # Détermination de l'identifiant pour la recherche (code postal si valide à 5 chiffres, sinon nom de la ville)
            loc_id = code_postal if (code_postal and len(code_postal) == 5) else ville
            
            data.append({
                "id": loc_id,
                "adresse": "",
                "ville": ville,
                "code_postal": code_postal
            })
        return JsonResponse({"status": "success", "locations": data}, status=200)


class ExploreListView(View):
    """
    Vue Django principale de recherche et d'exploration multicritère pour les établissements.
    """

    def get(self, request):
        """
        Recherche des établissements en appliquant des filtres optionnels.

        Paramètres de requête (GET) :
        - query (ou q) : Texte libre pour recherche sur le nom de l'établissement.
        - location (ou lieu) : Code postal, ville ou identifiant de lieu pour filtrer géographiquement.
        - sector (ou secteur) : ID du secteur ou identifiant textuel de catégorie ('beauty', 'restaurant', etc.).
        - min_rating : Note minimale requise (float).

        Retourne :
        - JsonResponse contenant le tableau d'établissements triés par note globale puis par nom.
        """
        query = request.GET.get('query') or request.GET.get('q')
        location = request.GET.get('location') or request.GET.get('lieu')
        sector_id = request.GET.get('sector') or request.GET.get('secteur')
        min_rating = request.GET.get('min_rating')

        queryset = Etablissement.objects.all()

        # Filtrage par secteur d'activité
        if sector_id:
            if sector_id.isdigit():
                queryset = queryset.filter(secteur_id=sector_id)
            else:
                # Mapping pour les recherches textuelles
                sector_lower = sector_id.lower()
                if sector_lower in ['beauty', 'beauté']:
                    queryset = queryset.filter(secteur__nom__in=["Coiffure", "Beauté & Soins", "Massage & Bien-être", "Barbier"])
                elif sector_lower in ['restaurant', 'restauration']:
                    queryset = queryset.filter(secteur__nom__icontains="restaurant")
                elif sector_lower in ['hotel', 'hôtel', 'hôtels', 'hébergements']:
                    queryset = queryset.filter(Q(secteur__nom__icontains="hotel") | Q(secteur__nom__icontains="hébergement"))
                elif sector_lower in ['travel', 'voyage', 'voyages', 'transport', 'transports']:
                    queryset = queryset.filter(Q(secteur__nom__icontains="voyage") | Q(secteur__nom__icontains="transport"))
                else:
                    queryset = queryset.filter(secteur__nom__icontains=sector_id)

        # Filtrage par mot-clé sur le nom
        if query:
            queryset = queryset.filter(nom__icontains=query)

        # Filtrage géographique
        if location:
            if location.isdigit():
                if len(location) == 5:
                    queryset = queryset.filter(lieu__code_postal__icontains=location)
                else:
                    if Lieu.objects.filter(id=int(location)).exists():
                        queryset = queryset.filter(lieu_id=location)
                    else:
                        queryset = queryset.filter(
                            Q(lieu__ville__icontains=location) |
                            Q(lieu__adresse__icontains=location) |
                            Q(lieu__code_postal__icontains=location)
                        )
            else:
                queryset = queryset.filter(
                    Q(lieu__ville__icontains=location) |
                    Q(lieu__adresse__icontains=location) |
                    Q(lieu__code_postal__icontains=location)
                )

        # Filtrage par note minimale
        if min_rating:
            try:
                queryset = queryset.filter(note_globale__gte=float(min_rating))
            except (ValueError, TypeError):
                pass

        # Ordonner par meilleure note, puis par ordre alphabétique
        queryset = queryset.order_by('-note_globale', 'nom')

        data = []
        for etablissement in queryset:
            data.append({
                "id": etablissement.id,
                "nom": etablissement.nom,
                "mail": etablissement.mail or "",
                "description": etablissement.description or "",
                "lieu": {
                    "id": etablissement.lieu.id,
                    "adresse": etablissement.lieu.adresse,
                    "ville": etablissement.lieu.ville,
                    "code_postal": etablissement.lieu.code_postal
                } if etablissement.lieu else None,
                "secteur": {
                    "id": etablissement.secteur.id,
                    "nom": etablissement.secteur.nom
                } if etablissement.secteur else None,
                "gerant": {
                    "id": etablissement.gerant.id,
                    "prenom": etablissement.gerant.utilisateur.first_name,
                    "nom": etablissement.gerant.utilisateur.last_name,
                    "email": etablissement.gerant.utilisateur.email
                } if etablissement.gerant else None,
                "note_globale": float(etablissement.note_globale),
                "photos": [p.url_photo for p in etablissement.photos.all()]
            })

        return JsonResponse({"status": "success", "establishments": data}, status=200)


class EstablishmentDetailView(View):
    """
    Vue Django pour gérer le détail, la mise à jour et la suppression d'un établissement spécifique.
    """

    def get(self, request, id):
        """
        Récupère les détails complets d'un établissement (prestations, collaborateurs, horaires, avis).

        Paramètres :
        - id : Identifiant numérique de l'établissement (dans l'URL).
        """
        try:
            etablissement = Etablissement.objects.get(id=id)
            
            # Préparation du tableau des prestations et de leurs collaborateurs éligibles
            prestations = []
            for prest in etablissement.prestations.all():
                prestations.append({
                    "id": prest.id,
                    "nom": prest.nom,
                    "cout": float(prest.cout),
                    "description": prest.description or "",
                    "collaborateurs": [c.id for c in prest.collaborateurs.all()]
                })

            # Préparation du tableau de l'équipe (professionnels)
            collaborateurs = []
            for col in etablissement.collaborateurs.all():
                collaborateurs.append({
                    "id": col.id,
                    "nom": col.utilisateur.last_name,
                    "prenom": col.utilisateur.first_name,
                    "poste": col.poste,
                    "description": col.description or ""
                })

            photos = [p.url_photo for p in etablissement.photos.all()]

            data = {
                "id": etablissement.id,
                "nom": etablissement.nom,
                "description": etablissement.description or "",
                "telephone": etablissement.telephone or "",
                "mail": etablissement.mail or "",
                "site_web": etablissement.site_web or "",
                "note_globale": float(etablissement.note_globale),
                "note_accueil": float(etablissement.note_accueil),
                "note_proprete": float(etablissement.note_proprete),
                "note_cadre": float(etablissement.note_cadre),
                "note_prestation": float(etablissement.note_prestation),
                "nombre_avis": etablissement.nombre_avis,
                "horaires": etablissement.horaires,
                "lieu": {
                    "id": etablissement.lieu.id,
                    "adresse": etablissement.lieu.adresse,
                    "ville": etablissement.lieu.ville,
                    "code_postal": etablissement.lieu.code_postal
                } if etablissement.lieu else None,
                "secteur": {
                    "id": etablissement.secteur.id,
                    "nom": etablissement.secteur.nom
                } if etablissement.secteur else None,
                "gerant": {
                    "id": etablissement.gerant.id,
                    "prenom": etablissement.gerant.utilisateur.first_name,
                    "nom": etablissement.gerant.utilisateur.last_name,
                    "email": etablissement.gerant.utilisateur.email
                } if etablissement.gerant else None,
                "prestations": prestations,
                "collaborateurs": collaborateurs,
                "photos": photos
            }
            return JsonResponse({"status": "success", "establishment": data}, status=200)
        except Etablissement.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Établissement non trouvé"}, status=404)

    def put(self, request, id):
        """
        Met à jour les informations d'un établissement.

        Requiert :
        - Authentification de l'utilisateur.
        - Rôle Gérant propriétaire de l'établissement OU rôle Administrateur.

        Données JSON attendues :
        - nom, description, telephone, mail, site_web, secteur_id, horaires, photos (liste d'URLs), lieu (dict).
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            etablissement = Etablissement.objects.get(id=id)
        except Etablissement.DoesNotExist:
            return JsonResponse({"error": "Établissement non trouvé"}, status=404)
            
        # Contrôle des droits d'accès
        is_admin = request.user.is_superuser or request.user.is_staff
        is_owner = hasattr(request.user, 'profil_gerant') and etablissement.gerant == request.user.profil_gerant
        
        if not (is_admin or is_owner):
            return JsonResponse({"error": "Accès interdit à cet établissement"}, status=403)
            
        try:
            data = json.loads(request.body)
            nom = data.get('nom')
            description = data.get('description')
            telephone = data.get('telephone')
            mail = data.get('mail')
            site_web = data.get('site_web')
            secteur_id = data.get('secteur_id')
            gerant_id = data.get('gerant_id')
            lieu_data = data.get('lieu')
            horaires = data.get('horaires')
            photos = data.get('photos')
            
            if nom is not None:
                etablissement.nom = nom
            if description is not None:
                etablissement.description = description
            if telephone is not None:
                etablissement.telephone = telephone
            if mail is not None:
                etablissement.mail = mail
            if site_web is not None:
                etablissement.site_web = site_web
                
            if secteur_id is not None:
                try:
                    etablissement.secteur_id = int(secteur_id)
                except (ValueError, TypeError):
                    pass
                    
            if is_admin and gerant_id is not None:
                try:
                    etablissement.gerant_id = int(gerant_id)
                except (ValueError, TypeError):
                    pass
                    
            if lieu_data is not None:
                adresse = lieu_data.get('adresse')
                ville = lieu_data.get('ville')
                code_postal = lieu_data.get('code_postal')
                
                # Mise à jour ou instanciation d'un nouveau modèle Lieu
                if etablissement.lieu:
                    lieu = etablissement.lieu
                else:
                    lieu = Lieu()
                    
                if adresse is not None:
                    lieu.adresse = adresse
                if ville is not None:
                    lieu.ville = ville
                if code_postal is not None:
                    lieu.code_postal = code_postal
                lieu.save()
                etablissement.lieu = lieu
                
            if horaires is not None:
                etablissement.horaires = horaires
                
            etablissement.save()
            
            # Mise à jour de la liste d'URLs des photos de l'établissement
            if photos is not None:
                etablissement.photos.all().delete()
                for p_url in photos:
                    if p_url:
                        Photo.objects.create(etablissement=etablissement, url_photo=p_url)
                        
            return JsonResponse({"status": "success", "message": "Établissement mis à jour avec succès"}, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    def delete(self, request, id):
        """
        Supprime définitivement un établissement.

        Requiert :
        - Authentification.
        - Droits d'administrateur ou d'être le gérant propriétaire.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            etablissement = Etablissement.objects.get(id=id)
        except Etablissement.DoesNotExist:
            return JsonResponse({"error": "Établissement non trouvé"}, status=404)
            
        is_admin = request.user.is_superuser or request.user.is_staff
        is_owner = hasattr(request.user, 'profil_gerant') and etablissement.gerant == request.user.profil_gerant
        
        if not (is_admin or is_owner):
            return JsonResponse({"error": "Accès interdit à cet établissement"}, status=403)
            
        try:
            gerant = etablissement.gerant
            etablissement.delete()
            
            # Si le gérant n'a plus aucun établissement rattaché, on supprime son profil gérant et le bascule en simple client
            if gerant and not gerant.etablissements.exists():
                Client.objects.get_or_create(utilisateur=gerant.utilisateur)
                gerant.delete()
                
            return JsonResponse({"status": "success", "message": "Établissement supprimé avec succès"}, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


class ServiceListView(View):
    """
    Vue Django pour lister et ajouter des prestations au sein d'un établissement.
    """

    def get(self, request, id):
        """
        Renvoie l'ensemble des prestations (services) proposées par l'établissement.
        """
        try:
            etablissement = Etablissement.objects.get(id=id)
        except Etablissement.DoesNotExist:
            return JsonResponse({"error": "Établissement non trouvé"}, status=404)
            
        prestations = etablissement.prestations.all()
        data = []
        for p in prestations:
            data.append({
                "id": p.id,
                "nom": p.nom,
                "cout": float(p.cout),
                "description": p.description or "",
                "collaborateurs": [c.id for c in p.collaborateurs.all()]
            })
        return JsonResponse({"status": "success", "services": data}, status=200)

    def post(self, request, id):
        """
        Ajoute une nouvelle prestation au catalogue de l'établissement.

        Requiert :
        - Être Administrateur ou Gérant propriétaire de l'établissement.

        Données JSON attendues :
        - nom : Nom du service.
        - cout : Tarif décimal.
        - description : Descriptif.
        - collaborateurs : Liste d'identifiants de professionnels habilités.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            etablissement = Etablissement.objects.get(id=id)
        except Etablissement.DoesNotExist:
            return JsonResponse({"error": "Établissement non trouvé"}, status=404)
            
        is_admin = request.user.is_superuser or request.user.is_staff
        is_owner = hasattr(request.user, 'profil_gerant') and etablissement.gerant == request.user.profil_gerant
        
        if not (is_admin or is_owner):
            return JsonResponse({"error": "Accès interdit à cet établissement"}, status=403)
            
        try:
            data = json.loads(request.body)
            nom = data.get('nom')
            cout = data.get('cout')
            description = data.get('description', '')
            collaborateur_ids = data.get('collaborateurs', [])
            
            if not nom or cout is None:
                return JsonResponse({"error": "Champs nom et cout requis"}, status=400)
                
            prestation = Prestation.objects.create(
                nom=nom,
                cout=float(cout),
                description=description,
                etablissement=etablissement
            )
            if collaborateur_ids:
                prestation.collaborateurs.set(collaborateur_ids)
                
            return JsonResponse({
                "status": "success",
                "message": "Prestation créée avec succès",
                "service": {
                    "id": prestation.id,
                    "nom": prestation.nom,
                    "cout": float(prestation.cout),
                    "description": prestation.description,
                    "collaborateurs": [c.id for c in prestation.collaborateurs.all()]
                }
            }, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


class RegisterEstablishmentView(View):
    """
    Vue Django permettant à un professionnel de déclarer un nouvel établissement et d'obtenir le rôle Gérant.
    """

    def post(self, request):
        """
        Inscrit un établissement et associe le créateur comme Gérant.

        Requiert :
        - Utilisateur connecté.

        Données JSON attendues :
        - nom, siret, adresse, ville, code_postal, telephone, mail, description, category.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            data = json.loads(request.body)
            nom = data.get('nom')
            siret = data.get('siret')
            adresse = data.get('adresse')
            ville = data.get('ville')
            code_postal = data.get('code_postal')
            telephone = data.get('telephone')
            mail = data.get('mail')
            description = data.get('description', '')
            category = data.get('category')
            
            if not nom or not siret or not adresse or not ville or not code_postal or not category:
                return JsonResponse({"error": "Champs nom, siret, adresse, ville, code_postal et category requis"}, status=400)
                
            # Dictionnaire de correspondance catégorie frontend -> Secteur d'activité en DB
            secteur_mapping = {
                'beauty': 'Beauté & Soins',
                'restaurant': 'Restauration',
                'hotel': 'Hébergement',
                'travel': 'Voyages & Transports',
                'hair': 'Coiffure',
                'barber': 'Barbier',
                'massage': 'Massage & Bien-être'
            }
            secteur_nom = secteur_mapping.get(category)
            if not secteur_nom:
                return JsonResponse({"error": "Catégorie inconnue"}, status=400)
                
            secteur, _ = Secteur.objects.get_or_create(nom=secteur_nom)
            
            # get_or_create pour le Lieu pour éviter les doublons géographiques
            lieu, _ = Lieu.objects.get_or_create(
                adresse=adresse,
                ville=ville,
                code_postal=code_postal
            )
            
            # Mutation / Attribution du rôle de Gérant à l'utilisateur
            gerant, _ = Gerant.objects.get_or_create(utilisateur=request.user)
            
            etablissement = Etablissement.objects.create(
                nom=nom,
                secteur=secteur,
                lieu=lieu,
                gerant=gerant,
                description=description,
                telephone=telephone,
                mail=mail
            )
            
            # Par défaut, le gérant est aussi créé comme premier collaborateur (Professionnel) de l'établissement
            if not hasattr(request.user, 'profil_pro'):
                Professionnel.objects.get_or_create(
                    utilisateur=request.user,
                    etablissement=etablissement,
                    defaults={"poste": "Gérant / Collaborateur"}
                )
            
            return JsonResponse({
                "status": "success",
                "message": "Établissement enregistré avec succès et profil gérant activé !",
                "establishment": {
                    "id": etablissement.id,
                    "nom": etablissement.nom,
                    "siret": siret
                }
            }, status=201)
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


class ServiceDetailView(View):
    """
    Vue Django de détail pour modifier ou supprimer une prestation existante.
    """

    def put(self, request, service_id):
        """
        Modifie une prestation.

        Requiert :
        - Rôle Gérant propriétaire de l'établissement de la prestation OU Administrateur.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            prestation = Prestation.objects.get(id=service_id)
        except Prestation.DoesNotExist:
            return JsonResponse({"error": "Prestation non trouvée"}, status=404)
            
        etablissement = prestation.etablissement
        is_admin = request.user.is_superuser or request.user.is_staff
        is_owner = hasattr(request.user, 'profil_gerant') and etablissement.gerant == request.user.profil_gerant
        
        if not (is_admin or is_owner):
            return JsonResponse({"error": "Accès interdit à cette prestation"}, status=403)
            
        try:
            data = json.loads(request.body)
            nom = data.get('nom')
            cout = data.get('cout')
            description = data.get('description')
            collaborateur_ids = data.get('collaborateurs')
            
            if nom is not None:
                prestation.nom = nom
            if cout is not None:
                prestation.cout = float(cout)
            if description is not None:
                prestation.description = description
            if collaborateur_ids is not None:
                # Association des identifiants d'employés affectés
                prestation.collaborateurs.set(collaborateur_ids)
                
            prestation.save()
            return JsonResponse({
                "status": "success",
                "message": "Prestation mise à jour avec succès",
                "service": {
                    "id": prestation.id,
                    "nom": prestation.nom,
                    "cout": float(prestation.cout),
                    "description": prestation.description,
                    "collaborateurs": [c.id for c in prestation.collaborateurs.all()]
                }
            }, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    def delete(self, request, service_id):
        """
        Supprime définitivement une prestation.

        Requiert :
        - Droits d'administrateur ou de gérant de l'établissement.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            prestation = Prestation.objects.get(id=service_id)
        except Prestation.DoesNotExist:
            return JsonResponse({"error": "Prestation non trouvée"}, status=404)
            
        etablissement = prestation.etablissement
        is_admin = request.user.is_superuser or request.user.is_staff
        is_owner = hasattr(request.user, 'profil_gerant') and etablissement.gerant == request.user.profil_gerant
        
        if not (is_admin or is_owner):
            return JsonResponse({"error": "Accès interdit à cette prestation"}, status=403)
            
        try:
            prestation.delete()
            return JsonResponse({"status": "success", "message": "Prestation supprimée avec succès"}, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


class EstablishmentPhotoUploadView(View):
    """
    Vue Django pour gérer le téléversement (upload) et la suppression de fichiers photos pour un établissement.
    """

    def post(self, request, id):
        """
        Téléverse et enregistre un fichier image pour l'établissement.

        Requiert :
        - Fichier transmis dans les données multipart (FILES) sous la clé 'image' ou 'file'.
        - Extensions autorisées : png, jpg, jpeg, gif, webp.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            etablissement = Etablissement.objects.get(id=id)
        except Etablissement.DoesNotExist:
            return JsonResponse({"error": "Établissement non trouvé"}, status=404)
            
        is_admin = request.user.is_superuser or request.user.is_staff
        is_owner = hasattr(request.user, 'profil_gerant') and etablissement.gerant == request.user.profil_gerant
        if not (is_admin or is_owner):
            return JsonResponse({"error": "Accès interdit à cet établissement"}, status=403)
            
        uploaded_file = request.FILES.get('image') or request.FILES.get('file')
        if not uploaded_file:
            return JsonResponse({"error": "Aucun fichier fourni"}, status=400)
            
        allowed_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
        ext = os.path.splitext(uploaded_file.name)[1].lower()
        if ext not in allowed_extensions:
            return JsonResponse({"error": f"Extension non autorisée. Extensions valides : {', '.join(allowed_extensions)}"}, status=400)
            
        try:
            # Création du dossier de stockage dans MEDIA_ROOT
            os.makedirs(os.path.join(settings.MEDIA_ROOT, 'establishments'), exist_ok=True)
            fs = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, 'establishments'))
            clean_name = f"estab_{id}_{uploaded_file.name}"
            filename = fs.save(clean_name, uploaded_file)
            
            media_url = settings.MEDIA_URL
            if not media_url.startswith('/'):
                media_url = '/' + media_url
            if not media_url.endswith('/'):
                media_url = media_url + '/'
            
            url_photo = f"{media_url}establishments/{filename}"
            
            # Enregistrement du modèle photo lié en base de données
            Photo.objects.create(etablissement=etablissement, url_photo=url_photo)
            
            photos = [p.url_photo for p in etablissement.photos.all()]
            return JsonResponse({
                "status": "success",
                "message": "Image uploadée avec succès",
                "photos": photos
            }, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    def delete(self, request, id):
        """
        Supprime une photo de l'établissement (en base et sur le disque).

        Données JSON attendues :
        - url : L'URL de la photo à supprimer.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            etablissement = Etablissement.objects.get(id=id)
        except Etablissement.DoesNotExist:
            return JsonResponse({"error": "Établissement non trouvé"}, status=404)
            
        is_admin = request.user.is_superuser or request.user.is_staff
        is_owner = hasattr(request.user, 'profil_gerant') and etablissement.gerant == request.user.profil_gerant
        if not (is_admin or is_owner):
            return JsonResponse({"error": "Accès interdit à cet établissement"}, status=403)
            
        try:
            data = json.loads(request.body)
            url_photo = data.get('url')
            if not url_photo:
                return JsonResponse({"error": "URL de la photo manquante"}, status=400)
                
            photo_obj = Photo.objects.filter(etablissement=etablissement, url_photo=url_photo).first()
            if not photo_obj:
                return JsonResponse({"error": "Photo non trouvée pour cet établissement"}, status=404)
                
            # Nettoyage physique du fichier sur le disque s'il se trouve dans notre répertoire MEDIA_ROOT
            media_url = settings.MEDIA_URL
            if not media_url.startswith('/'):
                media_url = '/' + media_url
            
            if url_photo.startswith(media_url):
                relative_path = url_photo[len(media_url):]
                file_path = os.path.join(settings.MEDIA_ROOT, relative_path)
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except Exception as err:
                        print("Error deleting media file:", err)
                        
            photo_obj.delete()
            
            photos = [p.url_photo for p in etablissement.photos.all()]
            return JsonResponse({
                "status": "success",
                "message": "Photo supprimée avec succès",
                "photos": photos
            }, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

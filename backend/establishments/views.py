from django.views import View
from django.http import JsonResponse
from django.db.models import Q
import json
from .models import Etablissement, Secteur, Lieu, Photo, Prestation
from authentication.models import Gerant, Client

class SectorListView(View):
    def get(self, request):
        sectors = Secteur.objects.all()
        data = [{"id": s.id, "nom": s.nom} for s in sectors]
        return JsonResponse({"status": "success", "sectors": data}, status=200)

class LocationListView(View):
    def get(self, request):
        sector_id = request.GET.get('sector_id') or request.GET.get('secteur')
        
        queryset = Lieu.objects.all()
        if sector_id:
            queryset = queryset.filter(etablissements__secteur_id=sector_id).distinct()
            
        data = []
        for loc in queryset:
            data.append({
                "id": loc.id,
                "adresse": loc.adresse,
                "ville": loc.ville,
                "code_postal": loc.code_postal
            })
        return JsonResponse({"status": "success", "locations": data}, status=200)

class ExploreListView(View):
    def get(self, request):
        query = request.GET.get('query') or request.GET.get('q')
        location = request.GET.get('location') or request.GET.get('lieu')
        sector_id = request.GET.get('sector') or request.GET.get('secteur')
        min_rating = request.GET.get('min_rating')

        queryset = Etablissement.objects.all()

        if sector_id:
            if sector_id.isdigit():
                queryset = queryset.filter(secteur_id=sector_id)
            else:
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

        if query:
            queryset = queryset.filter(nom__icontains=query)

        if location:
            # If location query parameter is a numeric ID, search by ID. Else search by city/address/zip code text.
            if location.isdigit():
                if len(location) == 5:
                    queryset = queryset.filter(lieu__code_postal__icontains=location)
                else:
                    # Si l'ID de Lieu existe en base, on filtre par ID, sinon on traite comme un code postal/ville
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
        if min_rating:
            try:
                queryset = queryset.filter(note_globale__gte=float(min_rating))
            except (ValueError, TypeError):
                pass

        queryset = queryset.order_by('-note_globale', 'nom')

        data = []
        for etablissement in queryset:
            data.append({
                "id": etablissement.id,
                "nom": etablissement.nom,
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
                "note_globale": float(etablissement.note_globale),
                "photos": [p.url_photo for p in etablissement.photos.all()]
            })

        return JsonResponse({"status": "success", "establishments": data}, status=200)

class EstablishmentDetailView(View):
    def get(self, request, id):
        try:
            etablissement = Etablissement.objects.get(id=id)
            
            prestations = []
            for prest in etablissement.prestations.all():
                prestations.append({
                    "id": prest.id,
                    "nom": prest.nom,
                    "cout": float(prest.cout),
                    "description": prest.description or ""
                })

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
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            etablissement = Etablissement.objects.get(id=id)
        except Etablissement.DoesNotExist:
            return JsonResponse({"error": "Établissement non trouvé"}, status=404)
            
        # Permission check: admin or owner (gérant)
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
            status = data.get('status')
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
            if status is not None:
                etablissement.status = status
                
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
            
            # Photos update
            if photos is not None:
                etablissement.photos.all().delete()
                for p_url in photos:
                    if p_url:
                        Photo.objects.create(etablissement=etablissement, url_photo=p_url)
                        
            return JsonResponse({"status": "success", "message": "Établissement mis à jour avec succès"}, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    def delete(self, request, id):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            etablissement = Etablissement.objects.get(id=id)
        except Etablissement.DoesNotExist:
            return JsonResponse({"error": "Établissement non trouvé"}, status=404)
            
        # Permission check: admin or owner (gérant)
        is_admin = request.user.is_superuser or request.user.is_staff
        is_owner = hasattr(request.user, 'profil_gerant') and etablissement.gerant == request.user.profil_gerant
        
        if not (is_admin or is_owner):
            return JsonResponse({"error": "Accès interdit à cet établissement"}, status=403)
            
        try:
            gerant = etablissement.gerant
            etablissement.delete()
            
            # Reconvert gerant to client if they have no establishments left
            if gerant and not gerant.etablissements.exists():
                Client.objects.get_or_create(utilisateur=gerant.utilisateur)
                gerant.delete()
                
            return JsonResponse({"status": "success", "message": "Établissement supprimé avec succès"}, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


class ServiceListView(View):
    def get(self, request, id):
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
                "description": p.description or ""
            })
        return JsonResponse({"status": "success", "services": data}, status=200)

    def post(self, request, id):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            etablissement = Etablissement.objects.get(id=id)
        except Etablissement.DoesNotExist:
            return JsonResponse({"error": "Établissement non trouvé"}, status=404)
            
        # Permission check: admin or owner (gérant)
        is_admin = request.user.is_superuser or request.user.is_staff
        is_owner = hasattr(request.user, 'profil_gerant') and etablissement.gerant == request.user.profil_gerant
        
        if not (is_admin or is_owner):
            return JsonResponse({"error": "Accès interdit à cet établissement"}, status=403)
            
        try:
            data = json.loads(request.body)
            nom = data.get('nom')
            cout = data.get('cout')
            description = data.get('description', '')
            
            if not nom or cout is None:
                return JsonResponse({"error": "Champs nom et cout requis"}, status=400)
                
            prestation = Prestation.objects.create(
                nom=nom,
                cout=float(cout),
                description=description,
                etablissement=etablissement
            )
            return JsonResponse({
                "status": "success",
                "message": "Prestation créée avec succès",
                "service": {
                    "id": prestation.id,
                    "nom": prestation.nom,
                    "cout": float(prestation.cout),
                    "description": prestation.description
                }
            }, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


class RegisterEstablishmentView(View):
    def post(self, request):
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
            category = data.get('category')  # 'beauty', 'restaurant', 'hotel', 'travel'
            
            if not nom or not siret or not adresse or not ville or not code_postal or not category:
                return JsonResponse({"error": "Champs nom, siret, adresse, ville, code_postal et category requis"}, status=400)
                
            # Mappage de la catégorie en Secteur
            secteur_mapping = {
                'beauty': 'Beauté & Soins',
                'restaurant': 'Restauration',
                'hotel': 'Hébergement',
                'travel': 'Voyages & Transports'
            }
            secteur_nom = secteur_mapping.get(category)
            if not secteur_nom:
                return JsonResponse({"error": "Catégorie inconnue"}, status=400)
                
            # Récupérer ou créer le secteur
            secteur, _ = Secteur.objects.get_or_create(nom=secteur_nom)
            
            # Créer le lieu
            lieu = Lieu.objects.create(
                adresse=adresse,
                ville=ville,
                code_postal=code_postal
            )
            
            # Récupérer ou créer le profil Gérant pour l'utilisateur connecté
            gerant, _ = Gerant.objects.get_or_create(utilisateur=request.user)
            
            # Créer l'établissement en statut actif pour les tests
            etablissement = Etablissement.objects.create(
                nom=nom,
                secteur=secteur,
                lieu=lieu,
                gerant=gerant,
                description=description,
                telephone=telephone,
                mail=mail,
                status="actif"
            )
            
            return JsonResponse({
                "status": "success",
                "message": "Établissement enregistré avec succès et profil gérant activé !",
                "establishment": {
                    "id": etablissement.id,
                    "nom": etablissement.nom,
                    "siret": siret,
                    "status": etablissement.status
                }
            }, status=201)
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


class ServiceDetailView(View):
    def put(self, request, service_id):
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
            
            if nom is not None:
                prestation.nom = nom
            if cout is not None:
                prestation.cout = float(cout)
            if description is not None:
                prestation.description = description
                
            prestation.save()
            return JsonResponse({
                "status": "success",
                "message": "Prestation mise à jour avec succès",
                "service": {
                    "id": prestation.id,
                    "nom": prestation.nom,
                    "cout": float(prestation.cout),
                    "description": prestation.description
                }
            }, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    def delete(self, request, service_id):
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




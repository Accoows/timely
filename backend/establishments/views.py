from django.views import View
from django.http import JsonResponse
from django.db.models import Q
import json
from .models import Etablissement, Secteur, Lieu
from authentication.models import Gerant

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
                "code_postal": loc.code_postal,
                "region": loc.region
            })
        return JsonResponse({"status": "success", "locations": data}, status=200)

class ExploreListView(View):
    def get(self, request):
        query = request.GET.get('query') or request.GET.get('q')
        location = request.GET.get('location') or request.GET.get('lieu')
        sector_id = request.GET.get('sector') or request.GET.get('secteur')

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
            # If location query parameter is a numeric ID, search by ID. Else search by city/address text.
            if location.isdigit():
                queryset = queryset.filter(lieu_id=location)
            else:
                queryset = queryset.filter(Q(lieu__ville__icontains=location) | Q(lieu__adresse__icontains=location))

        data = []
        for etablissement in queryset:
            data.append({
                "id": etablissement.id,
                "nom": etablissement.nom,
                "lieu": {
                    "id": etablissement.lieu.id,
                    "adresse": etablissement.lieu.adresse,
                    "ville": etablissement.lieu.ville,
                    "code_postal": etablissement.lieu.code_postal,
                    "region": etablissement.lieu.region
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
                    "code_postal": etablissement.lieu.code_postal,
                    "region": etablissement.lieu.region
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

class ServiceListView(View):
    def get(self, request, id):
        return JsonResponse({"message": f"Service list placeholder for establishment id {id}"}, status=200)


class RegisterEstablishmentView(View):
    def post(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            data = json.loads(request.body)
            nom = data.get('nom')
            siret = data.get('siret')
            adresse = data.get('adresse')
            telephone = data.get('telephone')
            mail = data.get('mail')
            description = data.get('description', '')
            category = data.get('category')  # 'beauty', 'restaurant', 'hotel', 'travel'
            
            if not nom or not siret or not adresse or not category:
                return JsonResponse({"error": "Champs nom, siret, adresse et category requis"}, status=400)
                
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
            ville = "Paris"
            code_postal = ""
            adresse_propre = adresse
            
            if ',' in adresse:
                parts = [p.strip() for p in adresse.split(',')]
                adresse_propre = parts[0]
                rest = parts[1] if len(parts) > 1 else ""
                # Extraire le code postal (5 chiffres consécutifs) et la ville
                import re
                cp_match = re.search(r'\b\d{5}\b', rest)
                if cp_match:
                    code_postal = cp_match.group(0)
                    ville = rest.replace(code_postal, '').strip()
                else:
                    ville = rest.strip()
            
            lieu = Lieu.objects.create(
                adresse=adresse_propre,
                ville=ville or "Paris",
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




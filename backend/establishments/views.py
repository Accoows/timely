from django.views import View
from django.http import JsonResponse
from django.db.models import Q
from .models import Etablissement, Secteur, Lieu

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
                } if etablissement.secteur else None
            })

        return JsonResponse({"status": "success", "establishments": data}, status=200)

class EstablishmentDetailView(View):
    def get(self, request, id):
        try:
            etablissement = Etablissement.objects.get(id=id)
            data = {
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
                "gerant": {
                    "id": etablissement.gerant.id,
                    "prenom": etablissement.gerant.utilisateur.first_name,
                    "nom": etablissement.gerant.utilisateur.last_name,
                    "email": etablissement.gerant.utilisateur.email
                } if etablissement.gerant else None
            }
            return JsonResponse({"status": "success", "establishment": data}, status=200)
        except Etablissement.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Établissement non trouvé"}, status=404)

class ServiceListView(View):
    def get(self, request, id):
        return JsonResponse({"message": f"Service list placeholder for establishment id {id}"}, status=200)



import json
from django.views import View
from django.http import JsonResponse
from django.utils import timezone
from .models import Favoris, Avis
from establishments.models import Etablissement
from bookings.models import Reservation

class FavoritesView(View):
    def get(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
        
        client = getattr(request.user, 'profil_client', None)
        if not client:
            return JsonResponse({"error": "Seuls les clients ont des favoris"}, status=403)
            
        favorites = Favoris.objects.filter(client=client).select_related('etablissement', 'etablissement__secteur', 'etablissement__lieu')
        data = []
        for f in favorites:
            est = f.etablissement
            data.append({
                "id": est.id,
                "nom": est.nom,
                "secteur": {
                    "id": est.secteur.id,
                    "nom": est.secteur.nom
                } if est.secteur else None,
                "lieu": {
                    "id": est.lieu.id,
                    "adresse": est.lieu.adresse,
                    "ville": est.lieu.ville,
                    "code_postal": est.lieu.code_postal
                } if est.lieu else None,
                # Propriétés mappées pour l'affichage de l'interface
                "name": est.nom,
                "category": est.secteur.nom if est.secteur else "",
                "badge": est.secteur.nom if est.secteur else "",
                "address": f"{est.lieu.adresse}, {est.lieu.ville}" if est.lieu else "",
                "rating": "4.8",
                "note_globale": float(est.note_globale),
                "date_ajout": f.date_ajout.isoformat()
            })
        return JsonResponse({"status": "success", "favorites": data}, status=200)

    def post(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
        
        client = getattr(request.user, 'profil_client', None)
        if not client:
            return JsonResponse({"error": "Seuls les clients peuvent ajouter des favoris"}, status=403)
            
        try:
            data = json.loads(request.body)
            etablissement_id = data.get('etablissement_id')
            if not etablissement_id:
                return JsonResponse({"error": "Paramètre etablissement_id manquant"}, status=400)
                
            try:
                etablissement = Etablissement.objects.get(id=etablissement_id)
            except Etablissement.DoesNotExist:
                return JsonResponse({"error": "Établissement non trouvé"}, status=404)
                
            favori, created = Favoris.objects.get_or_create(client=client, etablissement=etablissement)
            if created:
                return JsonResponse({"status": "success", "message": "Ajouté aux favoris"}, status=201)
            else:
                return JsonResponse({"status": "success", "message": "Déjà dans les favoris"}, status=200)
                
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    def delete(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        client = getattr(request.user, 'profil_client', None)
        if not client:
            return JsonResponse({"error": "Seuls les clients peuvent gérer les favoris"}, status=403)
            
        # Check query params or body
        etablissement_id = request.GET.get('etablissement_id')
        if not etablissement_id:
            try:
                data = json.loads(request.body)
                etablissement_id = data.get('etablissement_id')
            except Exception:
                pass
                
        if not etablissement_id:
            return JsonResponse({"error": "Paramètre etablissement_id manquant"}, status=400)
            
        deleted, _ = Favoris.objects.filter(client=client, etablissement_id=etablissement_id).delete()
        if deleted:
            return JsonResponse({"status": "success", "message": "Retiré des favoris"}, status=200)
        else:
            return JsonResponse({"error": "Favori non trouvé"}, status=404)


class LeaveReviewView(View):
    def get(self, request):
        etablissement_id = request.GET.get('etablissement_id')
        if not etablissement_id:
            if request.user.is_authenticated:
                client = getattr(request.user, 'profil_client', None)
                if client:
                    reviews = Avis.objects.filter(client=client).select_related('etablissement')
                    data = []
                    for r in reviews:
                        data.append({
                            "id": r.id,
                            "etablissement": {
                                "id": r.etablissement.id,
                                "nom": r.etablissement.nom
                            },
                            "message": r.message,
                            "note": r.note,
                            "date_envoie": r.date_envoie.isoformat()
                        })
                    return JsonResponse({"status": "success", "reviews": data}, status=200)
            return JsonResponse({"error": "Paramètre etablissement_id manquant"}, status=400)
            
        reviews = Avis.objects.filter(etablissement_id=etablissement_id).select_related('client', 'client__utilisateur')
        data = []
        for r in reviews:
            data.append({
                "id": r.id,
                "client": {
                    "id": r.client.id,
                    "first_name": r.client.utilisateur.first_name,
                    "last_name": r.client.utilisateur.last_name,
                    "email": r.client.utilisateur.email
                },
                "message": r.message,
                "note": r.note,
                "date_envoie": r.date_envoie.isoformat()
            })
        return JsonResponse({"status": "success", "reviews": data}, status=200)

    def post(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        client = getattr(request.user, 'profil_client', None)
        if not client:
            return JsonResponse({"error": "Seuls les clients peuvent laisser des avis"}, status=403)
            
        try:
            data = json.loads(request.body)
            etablissement_id = data.get('etablissement_id')
            message = data.get('message')
            note = data.get('note', 5)
            
            if not etablissement_id or not message:
                return JsonResponse({"error": "Champs etablissement_id et message requis"}, status=400)
                
            try:
                etablissement = Etablissement.objects.get(id=etablissement_id)
            except Etablissement.DoesNotExist:
                return JsonResponse({"error": "Établissement non trouvé"}, status=404)
                
            # Vérifier si le client a une réservation confirmée et passée dans cet établissement
            has_visited = Reservation.objects.filter(
                client=client,
                professionnel__etablissement=etablissement,
                status="confirme",
                date_heure__lte=timezone.now()
            ).exists()
            
            if not has_visited:
                return JsonResponse({
                    "error": "Vous devez avoir effectué et honoré une réservation dans cet établissement pour laisser un avis."
                }, status=403)
                
            avis = Avis.objects.create(
                client=client,
                etablissement=etablissement,
                message=message,
                note=int(note)
            )
            
            return JsonResponse({
                "status": "success",
                "message": "Avis publié avec succès !",
                "review": {
                    "id": avis.id,
                    "message": avis.message,
                    "note": avis.note,
                    "date_envoie": avis.date_envoie.isoformat()
                }
            }, status=201)
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    def delete(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        review_id = request.GET.get('review_id')
        if not review_id:
            try:
                data = json.loads(request.body)
                review_id = data.get('review_id')
            except Exception:
                pass
                
        if not review_id:
            return JsonResponse({"error": "Paramètre review_id manquant"}, status=400)
            
        try:
            avis = Avis.objects.get(id=review_id)
        except Avis.DoesNotExist:
            return JsonResponse({"error": "Avis non trouvé"}, status=404)
            
        # Check permissions: is the user an admin, or the gérant of the establishment of the review?
        is_admin = request.user.is_superuser or request.user.is_staff
        is_owner = hasattr(request.user, 'profil_gerant') and avis.etablissement.gerant == request.user.profil_gerant
        
        if not (is_admin or is_owner):
            return JsonResponse({"error": "Accès interdit : vous devez être le gérant de cet établissement pour supprimer cet avis."}, status=403)
            
        avis.delete()
        return JsonResponse({"status": "success", "message": "Avis supprimé avec succès"}, status=200)


class AdminReviewModerationView(View):
    def get(self, request):
        # Restriction aux superutilisateurs ou staff
        if not request.user.is_authenticated or not request.user.is_staff:
            return JsonResponse({"error": "Accès interdit"}, status=403)
            
        reviews = Avis.objects.all().select_related('client', 'client__utilisateur', 'etablissement')
        data = []
        for r in reviews:
            data.append({
                "id": r.id,
                "etablissement": {
                    "id": r.etablissement.id,
                    "nom": r.etablissement.nom
                },
                "client": {
                    "id": r.client.id,
                    "first_name": r.client.utilisateur.first_name,
                    "last_name": r.client.utilisateur.last_name,
                    "email": r.client.utilisateur.email
                },
                "message": r.message,
                "note": r.note,
                "date_envoie": r.date_envoie.isoformat()
            })
        return JsonResponse({"status": "success", "reviews": data}, status=200)

    def delete(self, request):
        if not request.user.is_authenticated or not request.user.is_staff:
            return JsonResponse({"error": "Accès interdit"}, status=403)
            
        review_id = request.GET.get('review_id')
        if not review_id:
            try:
                data = json.loads(request.body)
                review_id = data.get('review_id')
            except Exception:
                pass
                
        if not review_id:
            return JsonResponse({"error": "Paramètre review_id manquant"}, status=400)
            
        try:
            avis = Avis.objects.get(id=review_id)
            avis.delete()
            return JsonResponse({"status": "success", "message": "Avis supprimé par le modérateur"}, status=200)
        except Avis.DoesNotExist:
            return JsonResponse({"error": "Avis non trouvé"}, status=404)


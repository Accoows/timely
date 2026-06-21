import json
from django.views import View
from django.http import JsonResponse
from django.utils import timezone
from .models import Favoris, Avis
from establishments.models import Etablissement
from bookings.models import Reservation

class FavoritesView(View):
    """
    Vue Django pour la gestion des établissements favoris des clients.

    Cette vue permet aux utilisateurs authentifiés avec le rôle 'Client' de :
    - Consulter leur liste de favoris (GET)
    - Ajouter un établissement à leurs favoris (POST)
    - Retirer un établissement de leurs favoris (DELETE)
    """

    def get(self, request):
        """
        Récupère la liste des établissements favoris du client connecté.

        Requiert :
        - Authentification active de l'utilisateur.
        - Profil Client rattaché à l'utilisateur.

        Retourne :
        - JsonResponse contenant la liste des favoris avec les détails de chaque établissement.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
        
        # Vérification du profil client de l'utilisateur connecté
        client = getattr(request.user, 'profil_client', None)
        if not client:
            return JsonResponse({"error": "Seuls les clients ont des favoris"}, status=403)
            
        # Récupération des favoris avec préchargement (select_related) des relations pour optimiser les requêtes SQL
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
                # Propriétés supplémentaires mappées pour faciliter l'affichage dans le frontend React
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
        """
        Ajoute un établissement à la liste des favoris du client connecté.

        Attends dans le corps de la requête (JSON) :
        - etablissement_id : Identifiant de l'établissement à ajouter.

        Retourne :
        - JsonResponse confirmant l'ajout ou signalant que l'élément est déjà présent.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
        
        # Vérification du rôle client
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
                
            # Création du favori s'il n'existe pas déjà (get_or_create)
            favori, created = Favoris.objects.get_or_create(client=client, etablissement=etablissement)
            if created:
                return JsonResponse({"status": "success", "message": "Ajouté aux favoris"}, status=201)
            else:
                return JsonResponse({"status": "success", "message": "Déjà dans les favoris"}, status=200)
                
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    def delete(self, request):
        """
        Retire un établissement de la liste des favoris du client connecté.

        Le paramètre 'etablissement_id' peut être transmis via :
        - Les paramètres d'URL (query parameters / GET)
        - Le corps de la requête (JSON)

        Retourne :
        - JsonResponse confirmant le retrait ou signalant l'absence du favori.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        # Seuls les clients gèrent les favoris
        client = getattr(request.user, 'profil_client', None)
        if not client:
            return JsonResponse({"error": "Seuls les clients peuvent gérer les favoris"}, status=403)
            
        # Extraction de l'ID de l'établissement (depuis GET ou body JSON)
        etablissement_id = request.GET.get('etablissement_id')
        if not etablissement_id:
            try:
                data = json.loads(request.body)
                etablissement_id = data.get('etablissement_id')
            except Exception:
                pass
                
        if not etablissement_id:
            return JsonResponse({"error": "Paramètre etablissement_id manquant"}, status=400)
            
        # Suppression de l'entrée correspondante en base de données
        deleted, _ = Favoris.objects.filter(client=client, etablissement_id=etablissement_id).delete()
        if deleted:
            return JsonResponse({"status": "success", "message": "Retiré des favoris"}, status=200)
        else:
            return JsonResponse({"error": "Favori non trouvé"}, status=404)


class LeaveReviewView(View):
    """
    Vue Django permettant de consulter, de publier ou de supprimer des avis clients sur les établissements.
    """

    def get(self, request):
        """
        Récupère les avis pour un établissement donné OU les avis laissés par l'utilisateur connecté.

        Paramètres de requête (Query params) :
        - etablissement_id : Identifiant de l'établissement pour lister ses avis.
        Si manquant et que l'utilisateur est un client connecté, liste ses propres avis.

        Retourne :
        - JsonResponse contenant la liste des avis.
        """
        etablissement_id = request.GET.get('etablissement_id')
        if not etablissement_id:
            # Si aucun établissement spécifié, renvoyer les avis rédigés par l'utilisateur connecté (si client)
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
            
        # Récupération des avis associés à un établissement spécifique
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
        """
        Publie un nouvel avis sur un établissement.

        Requiert :
        - Profil Client pour l'utilisateur connecté.
        - Avoir effectué au moins une réservation (active ou passée) dans l'établissement concerné.

        Données JSON attendues :
        - etablissement_id : ID de l'établissement évalué.
        - message : Commentaire rédigé.
        - note : Note entière entre 1 et 5 (défaut: 5).

        Retourne :
        - JsonResponse contenant l'avis créé avec statut 201.
        """
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
                
            # Vérifier si le client a une réservation (ancienne version requérant visite passée commentée pour la démo)
            # has_visited = Reservation.objects.filter(
            #     client=client,
            #     professionnel__etablissement=etablissement,
            #     status="confirme",
            #     date_heure__lte=timezone.now()
            # ).exists()
            # 
            # if not has_visited:
            #     return JsonResponse({
            #         "error": "Vous devez avoir effectué et honoré une réservation dans cet établissement pour laisser un avis."
            #     }, status=403)

            # Version démo : Autoriser à partir du moment où une réservation existe (même future)
            has_reservation = Reservation.objects.filter(
                client=client,
                professionnel__etablissement=etablissement
            ).exists()

            if not has_reservation:
                return JsonResponse({
                    "error": "Vous devez avoir réservé une prestation dans cet établissement pour laisser un avis."
                }, status=403)
            # Version démo
                
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
        """
        Supprime un avis existant.

        Requiert l'une des conditions suivantes (contrôle d'autorisation) :
        - Être Administrateur ou membre du staff Django.
        - Être l'auteur de l'avis (le Client associé).
        - Être le Gérant de l'établissement sur lequel l'avis a été rédigé.

        Le paramètre d'identification est 'review_id' passé en GET ou JSON body.
        """
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
            
        # Évaluation des autorisations
        is_admin = request.user.is_superuser or request.user.is_staff
        is_author = hasattr(request.user, 'profil_client') and avis.client == request.user.profil_client
        is_owner = hasattr(request.user, 'profil_gerant') and avis.etablissement.gerant == request.user.profil_gerant
        
        if not (is_admin or is_author or is_owner):
            return JsonResponse({"error": "Accès interdit : vous devez être l'auteur de cet avis, le gérant ou un administrateur pour le supprimer."}, status=403)
            
        avis.delete()
        return JsonResponse({"status": "success", "message": "Avis supprimé avec succès"}, status=200)


class AdminReviewModerationView(View):
    """
    Vue réservée aux administrateurs pour la modération des avis de la plateforme.
    """

    def get(self, request):
        """
        Récupère l'intégralité des avis publiés sur la plateforme.

        Requiert :
        - Utilisateur membre du staff (`is_staff` ou superuser).
        """
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
        """
        Supprime de force un avis (action de modération).

        Requiert :
        - Utilisateur membre du staff (`is_staff`).
        """
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

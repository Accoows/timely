import json
from django.views import View
from django.http import JsonResponse
from django.db import IntegrityError
from .models import Discussion, Message
from establishments.models import Etablissement

class DiscussionListView(View):
    """
    Vue Django pour lister les discussions actives et en ouvrir de nouvelles.

    Les clients et les gérants peuvent utiliser cette vue pour suivre
    leurs conversations de support/renseignements.
    """

    def get(self, request):
        """
        Récupère l'ensemble des discussions de l'utilisateur connecté selon son rôle.

        Requiert :
        - Utilisateur connecté.

        Comportement selon le rôle :
        - Client : retourne les discussions initiées par lui.
        - Gérant : retourne les discussions liées aux établissements qu'il administre.
        - Admin/Staff : retourne toutes les discussions de la plateforme.

        Retourne :
        - JsonResponse contenant la liste des discussions et leur dernier message respectif.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
        
        user = request.user
        discussions = Discussion.objects.none()
        
        # Sélection du filtre en fonction du profil utilisateur
        if hasattr(user, 'profil_client'):
            discussions = Discussion.objects.filter(client=user.profil_client)
        elif hasattr(user, 'profil_gerant'):
            discussions = Discussion.objects.filter(etablissement__gerant=user.profil_gerant)
        elif user.is_staff:
            discussions = Discussion.objects.all()
        else:
            return JsonResponse({"error": "Rôle utilisateur non identifié pour la messagerie"}, status=403)
            
        # Préchargement optimisé des clés étrangères pour éviter le problème des requêtes N+1
        discussions = discussions.select_related('client', 'client__utilisateur', 'etablissement').prefetch_related('messages')
        
        data = []
        for d in discussions:
            last_msg = d.messages.all().last()
            data.append({
                "id": d.id,
                "etablissement": {
                    "id": d.etablissement.id,
                    "nom": d.etablissement.nom
                },
                "client": {
                    "id": d.client.id,
                    "first_name": d.client.utilisateur.first_name,
                    "last_name": d.client.utilisateur.last_name,
                    "email": d.client.utilisateur.email
                },
                "last_message": {
                    "id": last_msg.id,
                    "content": last_msg.content,
                    "created_at": last_msg.created_at.isoformat(),
                    "sender_id": last_msg.expediteur.id,
                    "sender_username": last_msg.expediteur.username
                } if last_msg else None,
                "date_creation": d.date_creation.isoformat()
            })
            
        return JsonResponse({"status": "success", "discussions": data}, status=200)

    def post(self, request):
        """
        Ouvre un nouveau fil de discussion (ou récupère un fil existant) avec un établissement.

        Requiert :
        - Profil Client pour l'utilisateur connecté.

        Données JSON attendues :
        - etablissement_id : Identifiant de l'établissement cible.
        - nom_discussion : Nom d'affichage de la discussion.

        Retourne :
        - JsonResponse contenant les détails de la discussion créée ou récupérée.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        client = getattr(request.user, 'profil_client', None)
        if not client:
            return JsonResponse({"error": "Seuls les clients peuvent initier des discussions"}, status=403)
            
        try:
            data = json.loads(request.body)
            etablissement_id = data.get('etablissement_id')
            nom_discussion = data.get('nom_discussion', '')
            
            if not etablissement_id:
                return JsonResponse({"error": "Paramètre etablissement_id requis"}, status=400)
                
            try:
                etablissement = Etablissement.objects.get(id=etablissement_id)
            except Etablissement.DoesNotExist:
                return JsonResponse({"error": "Établissement non trouvé"}, status=404)
                
            # get_or_create garantit l'unicité de la discussion entre un client et un établissement donné
            discussion, created = Discussion.objects.get_or_create(
                client=client,
                etablissement=etablissement,
                defaults={"nom_discussion": nom_discussion}
            )
            
            return JsonResponse({
                "status": "success",
                "message": "Discussion ouverte" if created else "Discussion existante récupérée",
                "discussion": {
                    "id": discussion.id,
                    "etablissement_id": discussion.etablissement.id,
                    "client_id": discussion.client.id,
                    "date_creation": discussion.date_creation.isoformat()
                }
            }, status=201 if created else 200)
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


class MessageCreateView(View):
    """
    Vue Django pour lister les messages d'une discussion et envoyer de nouveaux messages.
    """

    def _is_authorized(self, user, discussion):
        """
        Méthode interne d'autorisation d'accès à la discussion.

        Vérifie si l'utilisateur connecté est :
        - Le Client ayant ouvert la discussion.
        - Le Gérant de l'établissement ciblé par la discussion.
        - Un membre de l'équipe d'administration (Staff/Superuser).
        """
        if hasattr(user, 'profil_client') and discussion.client == user.profil_client:
            return True
        if hasattr(user, 'profil_gerant') and discussion.etablissement.gerant == user.profil_gerant:
            return True
        if user.is_staff:
            return True
        return False

    def get(self, request, disc_id):
        """
        Récupère chronologiquement la liste des messages d'une discussion spécifique.

        Paramètres :
        - disc_id : Identifiant numérique de la discussion.

        Retourne :
        - JsonResponse contenant le tableau de messages ordonnés par date de création.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            discussion = Discussion.objects.get(id=disc_id)
        except Discussion.DoesNotExist:
            return JsonResponse({"error": "Discussion non trouvée"}, status=404)
            
        # Contrôle des droits d'accès
        if not self._is_authorized(request.user, discussion):
            return JsonResponse({"error": "Accès non autorisé à cette discussion"}, status=403)
            
        # Ordonner chronologiquement (created_at) et précharger l'expéditeur
        messages = Message.objects.filter(discussion=discussion).select_related('expediteur').order_by('created_at')
        data = []
        for msg in messages:
            data.append({
                "id": msg.id,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
                "sender": {
                    "id": msg.expediteur.id,
                    "username": msg.expediteur.username,
                    "first_name": msg.expediteur.first_name,
                    "last_name": msg.expediteur.last_name
                }
            })
            
        return JsonResponse({"status": "success", "messages": data}, status=200)

    def post(self, request, disc_id):
        """
        Ajoute un nouveau message dans une discussion.

        Paramètres :
        - disc_id : Identifiant numérique de la discussion.

        Données JSON attendues :
        - content : Le contenu texte du message.

        Retourne :
        - JsonResponse contenant le message enregistré.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            discussion = Discussion.objects.get(id=disc_id)
        except Discussion.DoesNotExist:
            return JsonResponse({"error": "Discussion non trouvée"}, status=404)
            
        # Contrôle des droits d'accès avant envoi
        if not self._is_authorized(request.user, discussion):
            return JsonResponse({"error": "Accès non autorisé à cette discussion"}, status=403)
            
        try:
            data = json.loads(request.body)
            content = data.get('content')
            if not content:
                return JsonResponse({"error": "Le contenu du message ne peut pas être vide"}, status=400)
                
            # Création physique du message rattaché à l'expéditeur (request.user)
            msg = Message.objects.create(
                discussion=discussion,
                expediteur=request.user,
                content=content
            )
            
            return JsonResponse({
                "status": "success",
                "message": "Message envoyé",
                "data": {
                    "id": msg.id,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat(),
                    "sender_id": msg.expediteur.id
                }
            }, status=201)
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

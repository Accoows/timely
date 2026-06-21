import json
from django.views import View
from django.http import JsonResponse
from django.db import IntegrityError
from .models import Discussion, Message
from establishments.models import Etablissement

class DiscussionListView(View):
    def get(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
        
        user = request.user
        discussions = Discussion.objects.none()
        
        # Déterminer les discussions en fonction du rôle
        if hasattr(user, 'profil_client'):
            discussions = Discussion.objects.filter(client=user.profil_client)
        elif hasattr(user, 'profil_gerant'):
            discussions = Discussion.objects.filter(etablissement__gerant=user.profil_gerant)
        elif hasattr(user, 'profil_pro'):
            discussions = Discussion.objects.filter(etablissement=user.profil_pro.etablissement)
        elif user.is_staff:
            discussions = Discussion.objects.all()
        else:
            return JsonResponse({"error": "Rôle utilisateur non identifié pour la messagerie"}, status=403)
            
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
    def _is_authorized(self, user, discussion):
        # Vérifie si l'utilisateur est le client de la discussion, ou le gérant/employé de l'établissement
        if hasattr(user, 'profil_client') and discussion.client == user.profil_client:
            return True
        if hasattr(user, 'profil_gerant') and discussion.etablissement.gerant == user.profil_gerant:
            return True
        if hasattr(user, 'profil_pro') and discussion.etablissement == user.profil_pro.etablissement:
            return True
        if user.is_staff:
            return True
        return False

    def get(self, request, disc_id):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            discussion = Discussion.objects.get(id=disc_id)
        except Discussion.DoesNotExist:
            return JsonResponse({"error": "Discussion non trouvée"}, status=404)
            
        if not self._is_authorized(request.user, discussion):
            return JsonResponse({"error": "Accès non autorisé à cette discussion"}, status=403)
            
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
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            discussion = Discussion.objects.get(id=disc_id)
        except Discussion.DoesNotExist:
            return JsonResponse({"error": "Discussion non trouvée"}, status=404)
            
        if not self._is_authorized(request.user, discussion):
            return JsonResponse({"error": "Accès non autorisé à cette discussion"}, status=403)
            
        try:
            data = json.loads(request.body)
            content = data.get('content')
            if not content:
                return JsonResponse({"error": "Le contenu du message ne peut pas être vide"}, status=400)
                
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


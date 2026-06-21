import json
from django.views import View
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from .models import Professionnel, Gerant, Client, PasswordResetToken
from django.utils import timezone
import random
import string


class LoginView(View):
    """
    Vue Django pour l'authentification unifiée des utilisateurs (Clients, Gérants, Professionnels, Admins).
    """

    def post(self, request):
        """
        Gère la demande de connexion de l'utilisateur.

        Données JSON attendues :
        - email : Adresse e-mail de l'utilisateur.
        - password : Mot de passe associé.

        Comportement :
        - Tente d'authentifier en utilisant l'adresse e-mail comme identifiant.
        - En cas d'échec, tente de rechercher le nom d'utilisateur associé à l'e-mail pour s'authentifier.
        - Vérifie si le compte est actif (non bloqué).
        - Enregistre la session utilisateur (login) et détermine le rôle correspondant.

        Retourne :
        - JsonResponse contenant le statut de succès et les informations de profil de l'utilisateur connecté.
        """
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            user = authenticate(username=email, password=password)
            
            # Système de fallback : si l'authentification directe échoue, on tente de retrouver l'utilisateur par e-mail
            if user is None:
                try:
                    user_obj = User.objects.get(email=email)
                    user = authenticate(username=user_obj.username, password=password)
                except User.DoesNotExist:
                    pass

            if user is not None:
                # Connexion de l'utilisateur (initialisation de la session)
                login(request, user) 
                role = "client"
                establishment_id = None
                establishments = []
                
                # Détermination du rôle en fonction des profils liés
                if user.is_superuser:
                    role = "admin"
                elif hasattr(user, 'profil_gerant'):
                    role = "gerant"
                    etabs = user.profil_gerant.etablissements.all()
                    establishments = [{"id": e.id, "nom": e.nom} for e in etabs]
                    if etabs.exists():
                        establishment_id = etabs.first().id
                elif hasattr(user, 'profil_pro'):
                    role = "professionnel"
                    if user.profil_pro.etablissement:
                        establishment_id = user.profil_pro.etablissement.id
                        establishments = [{"id": user.profil_pro.etablissement.id, "nom": user.profil_pro.etablissement.nom}]

                return JsonResponse({
                    "status": "success",
                    "message": "Authentification réussie",
                    "user": {
                        "id": user.id,
                        "firstname": user.first_name,
                        "lastname": user.last_name,
                        "role": role,
                        "establishment_id": establishment_id,
                        "establishments": establishments
                    }
                })
            else:
                # Si l'authentification a échoué, on vérifie si le compte existe et s'il est bloqué (inactif)
                try:
                    target_user = User.objects.get(email=email)
                except User.DoesNotExist:
                    try:
                        target_user = User.objects.get(username=email)
                    except User.DoesNotExist:
                        target_user = None

                if target_user and not target_user.is_active:
                    if target_user.check_password(password):
                        return JsonResponse({"status": "error", "message": "Votre compte a été bloqué par un administrateur."}, status=403)

                return JsonResponse({"status": "error", "message": "Email ou mot de passe incorrect"}, status=401)
                
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)


class RegisterView(View):
    """
    Vue Django pour l'auto-inscription publique des nouveaux comptes clients.
    """

    def post(self, request):
        """
        Enregistre un nouvel utilisateur et lui associe un profil Client.

        Données JSON attendues :
        - email : Adresse e-mail (sert d'identifiant unique).
        - password : Mot de passe de l'utilisateur.
        - firstname : Prénom.
        - lastname : Nom de famille.
        - phone : (Optionnel) Numéro de téléphone.

        Retourne :
        - JsonResponse confirmant le succès de l'inscription et connecte automatiquement l'utilisateur.
        """
        try:
            data = json.loads(request.body)
            
            # Unicité de l'e-mail
            if User.objects.filter(username=data.get('email')).exists():
                return JsonResponse({"status": "error", "message": "Cet email est déjà utilisé"}, status=400)

            # Création de l'utilisateur Django standard
            nouvel_user = User.objects.create_user(
                username=data.get('email'),
                email=data.get('email'),
                password=data.get('password'),
                first_name=data.get('firstname'),
                last_name=data.get('lastname')
            )

            # Création du profil Client associé
            from .models import Client
            Client.objects.create(utilisateur=nouvel_user, telephone=data.get('phone', ''))

            # Authentification de la session immédiate après inscription
            login(request, nouvel_user)

            return JsonResponse({"status": "success", "message": "Compte créé avec succès !"}, status=201)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
        

class LogoutView(View):
    """
    Vue Django pour la déconnexion et la destruction de la session courante.
    """

    def post(self, request):
        """
        Invalide la session de l'utilisateur connecté.
        """
        try:
            logout(request) 
            return JsonResponse({"status": "success", "message": "Déconnexion réussie"})
        
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)


class StaffListView(View):
    """
    Vue Django permettant de récupérer les employés (professionnels) rattachés à un établissement.
    """

    def get(self, request):
        """
        Renvoie la liste des professionnels d'un établissement.

        Paramètres de requête (GET) :
        - etablissement_id : Identifiant numérique de l'établissement.

        Retourne :
        - JsonResponse contenant le tableau descriptif de l'équipe (id, prenom, nom, poste, email).
        """
        id_etablissement = request.GET.get('etablissement_id')

        if not id_etablissement:
            return JsonResponse({"error": "Paramètre etablissement_id manquant"}, status=400)

        employes = Professionnel.objects.filter(etablissement_id=id_etablissement)

        liste_staff = []
        for emp in employes:
            liste_staff.append({
                "id": emp.id,
                "prenom": emp.utilisateur.first_name,
                "nom": emp.utilisateur.last_name,
                "poste": emp.poste,
                "email": emp.utilisateur.email
            })

        return JsonResponse({"staff": liste_staff}, safe=False)


class ForgotPasswordView(View):
    """
    Vue Django pour générer un code temporaire de réinitialisation de mot de passe.
    """

    def post(self, request):
        """
        Génère un code numérique à 6 chiffres pour un email existant.

        Données JSON attendues :
        - email : L'adresse de l'utilisateur ayant perdu son mot de passe.

        Retourne :
        - JsonResponse confirmant l'action (par sécurité, le message est générique même si l'e-mail n'existe pas).
        """
        try:
            data = json.loads(request.body)
            email = data.get('email')
            if not email:
                return JsonResponse({"error": "L'email est requis"}, status=400)
            
            try:
                user = User.objects.get(email=email)
                # Génération d'un jeton à 6 chiffres aléatoires
                code = ''.join(random.choices(string.digits, k=6))
                
                # Enregistrement ou mise à jour du token en base de données
                PasswordResetToken.objects.update_or_create(
                    user=user,
                    defaults={'code': code}
                )
            except User.DoesNotExist:
                # On ignore silencieusement pour éviter d'exposer l'existence des adresses e-mail
                pass

            return JsonResponse({
                "status": "success", 
                "message": "Si l'adresse email existe, un code de réinitialisation a été généré."
            }, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


class ResetPasswordView(View):
    """
    Vue Django pour modifier le mot de passe suite à la saisie du code temporaire.
    """

    def post(self, request):
        """
        Applique le nouveau mot de passe si l'adresse e-mail et le code à 6 chiffres concordent.

        Données JSON attendues :
        - email : L'adresse de l'utilisateur.
        - code : Le code de vérification à 6 chiffres.
        - new_password : Le nouveau mot de passe choisi (minimum 6 caractères).
        """
        try:
            data = json.loads(request.body)
            email = data.get('email')
            code = data.get('code')
            new_password = data.get('new_password')
            
            if not all([email, code, new_password]):
                return JsonResponse({"error": "Tous les champs sont requis."}, status=400)
                
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return JsonResponse({"error": "Code ou email invalide."}, status=400)
                
            try:
                # Validation de la présence et de la justesse du jeton
                token = PasswordResetToken.objects.get(user=user, code=code)
            except PasswordResetToken.DoesNotExist:
                return JsonResponse({"error": "Code invalide."}, status=400)
                
            if len(new_password) < 6:
                return JsonResponse({"error": "Le nouveau mot de passe doit faire au moins 6 caractères."}, status=400)
                
            # Mise à jour du mot de passe de l'utilisateur
            user.set_password(new_password)
            user.save()
            
            # Destruction du jeton à usage unique
            token.delete()
            
            return JsonResponse({"status": "success", "message": "Votre mot de passe a été réinitialisé avec succès !"}, status=200)
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


@method_decorator(ensure_csrf_cookie, name='dispatch')
class UserView(View):
    """
    Vue Django pour consulter ou modifier les informations personnelles de l'utilisateur connecté.
    
    Elle injecte le cookie CSRF (ensure_csrf_cookie) lors du GET pour sécuriser les soumissions suivantes.
    """

    def get(self, request):
        """
        Renvoie les informations de l'utilisateur connecté actuellement.
        """
        if request.user.is_authenticated:
            role = "client"
            establishment_id = None
            establishments = []
            telephone = None
            if hasattr(request.user, 'profil_client'):
                telephone = request.user.profil_client.telephone

            if request.user.is_superuser:
                role = "admin"
            elif hasattr(request.user, 'profil_gerant'):
                role = "gerant"
                etabs = request.user.profil_gerant.etablissements.all()
                establishments = [{"id": e.id, "nom": e.nom} for e in etabs]
                if etabs.exists():
                    establishment_id = etabs.first().id
            elif hasattr(request.user, 'profil_pro'):
                role = "professionnel"
                if request.user.profil_pro.etablissement:
                    establishment_id = request.user.profil_pro.etablissement.id
                    establishments = [{"id": request.user.profil_pro.etablissement.id, "nom": request.user.profil_pro.etablissement.nom}]

            return JsonResponse({
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "role": role,
                "establishment_id": establishment_id,
                "establishments": establishments,
                "telephone": telephone
            })
        else:
            return JsonResponse({"error": "Non authentifié"}, status=401)

    def put(self, request):
        """
        Modifie les données du profil de l'utilisateur en cours.

        Données JSON autorisées :
        - first_name : Prénom.
        - last_name : Nom.
        - email : Adresse email (modifie également le login).
        - telephone : (Uniquement pour Client) Numéro de téléphone à 10 chiffres.
        - old_password / new_password : Pour modifier de façon sécurisée le mot de passe.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
        try:
            data = json.loads(request.body)
            first_name = data.get('first_name')
            last_name = data.get('last_name')
            email = data.get('email')
            telephone = data.get('telephone')

            user = request.user
            if first_name is not None:
                user.first_name = first_name
            if last_name is not None:
                user.last_name = last_name
            if email is not None:
                # Validation de l'unicité de l'e-mail s'il y a changement
                if email != user.email and User.objects.filter(email=email).exists():
                    return JsonResponse({"error": "Cet email est déjà utilisé"}, status=400)
                user.email = email
                user.username = email
            
            # Validation spécifique du numéro de téléphone client
            if telephone is not None and hasattr(user, 'profil_client'):
                if telephone != '' and (not telephone.isdigit() or len(telephone) != 10):
                    return JsonResponse({"error": "Le numéro de téléphone doit contenir exactement 10 chiffres"}, status=400)
                user.profil_client.telephone = telephone
                user.profil_client.save()

            # Processus de changement de mot de passe sécurisé
            old_password = data.get('old_password')
            new_password = data.get('new_password')
            if new_password:
                if not old_password:
                    return JsonResponse({"error": "L'ancien mot de passe est requis pour modifier le mot de passe"}, status=400)
                if not user.check_password(old_password):
                    return JsonResponse({"error": "L'ancien mot de passe est incorrect"}, status=400)
                if len(new_password) < 6:
                    return JsonResponse({"error": "Le nouveau mot de passe doit faire au moins 6 caractères"}, status=400)
                user.set_password(new_password)
                
            user.save()
            if new_password:
                # Conserver la validité de la session après changement de mot de passe
                update_session_auth_hash(request, user)

            role = "client"
            establishment_id = None
            establishments = []
            if user.is_superuser:
                role = "admin"
            elif hasattr(user, 'profil_gerant'):
                role = "gerant"
                etabs = user.profil_gerant.etablissements.all()
                establishments = [{"id": e.id, "nom": e.nom} for e in etabs]
                if etabs.exists():
                    establishment_id = etabs.first().id
            elif hasattr(user, 'profil_pro'):
                role = "professionnel"
                if user.profil_pro.etablissement:
                    establishment_id = user.profil_pro.etablissement.id
                    establishments = [{"id": user.profil_pro.etablissement.id, "nom": user.profil_pro.etablissement.nom}]

            telephone = None
            if hasattr(user, 'profil_client'):
                telephone = user.profil_client.telephone

            return JsonResponse({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": role,
                "establishment_id": establishment_id,
                "establishments": establishments,
                "telephone": telephone
            })
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


class AdminUserManagementView(View):
    """
    Vue Django d'administration globale pour répertorier l'ensemble des comptes utilisateurs.
    
    Réservée aux administrateurs ou membres du staff.
    """

    def get(self, request):
        """
        Renvoie la liste détaillée de tous les comptes enregistrés sur la plateforme.
        """
        if not request.user.is_authenticated or not (request.user.is_staff or request.user.is_superuser):
            return JsonResponse({"error": "Accès interdit"}, status=403)
            
        users = User.objects.all().order_by('date_joined')
        data = []
        for u in users:
            role = "client"
            if u.is_superuser:
                role = "admin"
            elif hasattr(u, 'profil_gerant'):
                role = "gerant"
            elif hasattr(u, 'profil_pro'):
                role = "professionnel"
                
            pro_details = None
            if role == "professionnel" and hasattr(u, 'profil_pro'):
                pro = u.profil_pro
                pro_details = {
                    "etablissement_id": pro.etablissement.id,
                    "etablissement_nom": pro.etablissement.nom,
                    "poste": pro.poste,
                    "description": pro.description or ""
                }
                
            gerant_details = None
            if role == "gerant" and hasattr(u, 'profil_gerant'):
                ger = u.profil_gerant
                gerant_details = {
                    "establishments": [
                        {"id": e.id, "nom": e.nom} for e in ger.etablissements.all()
                    ]
                }
                
            client_details = None
            if hasattr(u, 'profil_client'):
                client_details = {
                    "telephone": u.profil_client.telephone or "",
                    "date_inscription": u.profil_client.date_inscription.isoformat() if u.profil_client.date_inscription else None
                }

            reset_code = None
            if hasattr(u, 'reset_token'):
                reset_code = u.reset_token.code

            data.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "is_active": u.is_active,
                "is_superuser": u.is_superuser,
                "is_staff": u.is_staff,
                "date_joined": u.date_joined.isoformat() if u.date_joined else None,
                "role": role,
                "pro_details": pro_details,
                "gerant_details": gerant_details,
                "client_details": client_details,
                "reset_code": reset_code
            })
            
        return JsonResponse({"status": "success", "users": data}, status=200)


class AdminUserDetailView(View):
    """
    Vue Django permettant de modifier ou de supprimer un compte utilisateur de manière administrative.
    
    Réservée aux administrateurs ou membres du staff.
    """

    def put(self, request, user_id):
        """
        Modifie les informations et les droits/rôles d'un utilisateur ciblé.
        """
        if not request.user.is_authenticated or not (request.user.is_staff or request.user.is_superuser):
            return JsonResponse({"error": "Accès interdit"}, status=403)
            
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse({"error": "Utilisateur non trouvé"}, status=404)
            
        try:
            data = json.loads(request.body)
            first_name = data.get('first_name')
            last_name = data.get('last_name')
            email = data.get('email')
            is_active = data.get('is_active')
            role = data.get('role')
            
            if first_name is not None:
                user.first_name = first_name
            if last_name is not None:
                user.last_name = last_name
            if email is not None:
                if email != user.email and User.objects.filter(email=email).exists():
                    return JsonResponse({"error": "Cet email est déjà utilisé"}, status=400)
                user.email = email
                user.username = email
            if is_active is not None:
                user.is_active = bool(is_active)
                
            if role is not None:
                # Synchronisation des rôles et des profils un-à-un Django
                if role == 'admin':
                    user.is_superuser = True
                    user.is_staff = True
                else:
                    user.is_superuser = False
                    user.is_staff = False
                    
                if role == 'client':
                    Client.objects.get_or_create(utilisateur=user)
                    if hasattr(user, 'profil_gerant'):
                        user.profil_gerant.delete()
                    if hasattr(user, 'profil_pro'):
                        user.profil_pro.delete()
                elif role == 'gerant':
                    Gerant.objects.get_or_create(utilisateur=user)
                    if hasattr(user, 'profil_pro'):
                        user.profil_pro.delete()
                elif role == 'professionnel':
                    etablissement_id = data.get('etablissement_id')
                    poste = data.get('poste', 'Coiffeur / Esthéticienne')
                    description = data.get('description', '')
                    
                    if not etablissement_id:
                        return JsonResponse({"error": "etablissement_id est requis pour le rôle professionnel"}, status=400)
                        
                    from establishments.models import Etablissement
                    try:
                        etablissement = Etablissement.objects.get(id=etablissement_id)
                    except Etablissement.DoesNotExist:
                        return JsonResponse({"error": "Établissement non trouvé"}, status=404)
                        
                    pro_profile, created = Professionnel.objects.get_or_create(utilisateur=user, defaults={'etablissement': etablissement})
                    if not created:
                        pro_profile.etablissement = etablissement
                    pro_profile.poste = poste
                    pro_profile.description = description
                    pro_profile.save()
                    
                    if hasattr(user, 'profil_gerant'):
                        user.profil_gerant.delete()
                    
            user.save()
            return JsonResponse({"status": "success", "message": "Utilisateur mis à jour avec succès"}, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    def delete(self, request, user_id):
        """
        Supprime un compte utilisateur.
        
        Empêche un administrateur connecté de se supprimer lui-même par erreur.
        """
        if not request.user.is_authenticated or not (request.user.is_staff or request.user.is_superuser):
            return JsonResponse({"error": "Accès interdit"}, status=403)
            
        try:
            user = User.objects.get(id=user_id)
            if user == request.user:
                return JsonResponse({"error": "Vous ne pouvez pas supprimer votre propre compte admin"}, status=400)
            user.delete()
            return JsonResponse({"status": "success", "message": "Utilisateur supprimé avec succès"}, status=200)
        except User.DoesNotExist:
            return JsonResponse({"error": "Utilisateur non trouvé"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


class CreateProAccountView(View):
    """
    Vue Django permettant à un Gérant de créer des comptes Professionnels (collaborateurs).
    """

    def post(self, request):
        """
        Crée un nouvel utilisateur et l'affilie à l'établissement du gérant en tant que Professionnel.

        Requiert :
        - Gérant connecté (`profil_gerant`).

        Données JSON attendues :
        - email : Adresse e-mail du collaborateur.
        - password : Mot de passe initial du collaborateur.
        - firstname : Prénom.
        - lastname : Nom.
        - etablissement_id : ID de l'établissement (doit appartenir au gérant connecté).
        - poste : Intitulé du poste (défaut : 'Coiffeur / Esthéticienne').
        - description : Biographie.
        - date_embauche : (Optionnel) Date d'embauche au format YYYY-MM-DD.

        Retourne :
        - JsonResponse de succès avec statut 201.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        if not hasattr(request.user, 'profil_gerant'):
            return JsonResponse({"error": "Seul un gérant peut créer un compte professionnel"}, status=403)
            
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            firstname = data.get('firstname')
            lastname = data.get('lastname')
            
            poste = data.get('poste', 'Coiffeur / Esthéticienne')
            description = data.get('description', '')
            date_embauche = data.get('date_embauche')
            etablissement_id = data.get('etablissement_id')
            
            if not email or not password or not firstname or not lastname or not etablissement_id:
                return JsonResponse({"error": "Les champs email, password, firstname, lastname et etablissement_id sont requis"}, status=400)
                
            if User.objects.filter(username=email).exists():
                return JsonResponse({"error": "Cet email est déjà utilisé"}, status=400)
                
            # Vérification de sécurité : l'établissement ciblé doit appartenir au gérant connecté
            from establishments.models import Etablissement
            try:
                etablissement = Etablissement.objects.get(id=etablissement_id)
            except Etablissement.DoesNotExist:
                return JsonResponse({"error": "Établissement non trouvé"}, status=404)
                
            if etablissement.gerant != request.user.profil_gerant:
                return JsonResponse({"error": "Cet établissement ne vous appartient pas"}, status=403)
                
            # Création de l'utilisateur
            nouvel_user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=firstname,
                last_name=lastname
            )
            
            # Initialisation de la date d'embauche (défaut : date du jour)
            embauche_date = timezone.now().date()
            if date_embauche:
                try:
                    from datetime import datetime
                    embauche_date = datetime.strptime(date_embauche, '%Y-%m-%d').date()
                except ValueError:
                    pass
                    
            # Création physique du profil professionnel lié
            Professionnel.objects.create(
                utilisateur=nouvel_user,
                etablissement=etablissement,
                poste=poste,
                description=description,
                date_embauche=embauche_date
            )
            
            return JsonResponse({"status": "success", "message": "Compte professionnel créé avec succès !"}, status=201)
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


class RemoveProAccountView(View):
    """
    Vue Django permettant à un Gérant de supprimer la qualification de Professionnel d'un de ses collaborateurs.
    """

    def delete(self, request, user_id):
        """
        Supprime le profil professionnel lié et rétablit le compte ciblé comme simple Client.

        Requiert :
        - Gérant connecté.
        - Le professionnel ciblé doit appartenir à l'un des établissements du gérant.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        if not hasattr(request.user, 'profil_gerant'):
            return JsonResponse({"error": "Seul un gérant peut supprimer un compte professionnel"}, status=403)
            
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse({"error": "Utilisateur introuvable"}, status=404)
            
        if not hasattr(target_user, 'profil_pro'):
            return JsonResponse({"error": "Cet utilisateur n'est pas un professionnel"}, status=400)
            
        # Vérification d'affiliation : le professionnel doit faire partie de l'équipe du gérant
        if target_user.profil_pro.etablissement.gerant != request.user.profil_gerant:
            return JsonResponse({"error": "Ce professionnel n'appartient pas à votre établissement"}, status=403)
            
        try:
            # Suppression du profil professionnel lié (l'utilisateur Django reste en vie)
            target_user.profil_pro.delete()
            
            # Rétablissement d'un profil Client pour le compte afin qu'il puisse réutiliser la plateforme
            Client.objects.get_or_create(utilisateur=target_user)
            
            return JsonResponse({"status": "success", "message": "Le professionnel a été supprimé et basculé en client."}, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
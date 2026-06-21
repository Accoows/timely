import json
from django.views import View
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from .models import Professionnel, Gerant, Client
from django.utils import timezone


class LoginView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            user = authenticate(username=email, password=password)
            
            # Fallback: if username auth fails, try finding the user by email
            if user is None:
                try:
                    user_obj = User.objects.get(email=email)
                    user = authenticate(username=user_obj.username, password=password)
                except User.DoesNotExist:
                    pass

            if user is not None:
                login(request, user) 
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
                # Check if the account exists, is inactive (blocked), and the password is correct
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
    def post(self, request):
        try:
            data = json.loads(request.body)
            
            if User.objects.filter(username=data.get('email')).exists():
                return JsonResponse({"status": "error", "message": "Cet email est déjà utilisé"}, status=400)

            nouvel_user = User.objects.create_user(
                username=data.get('email'),
                email=data.get('email'),
                password=data.get('password'),
                first_name=data.get('firstname'),
                last_name=data.get('lastname')
            )

            from .models import Client
            Client.objects.create(utilisateur=nouvel_user, telephone=data.get('phone', ''))

            login(request, nouvel_user)

            return JsonResponse({"status": "success", "message": "Compte créé avec succès !"}, status=201)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
        

class LogoutView(View):
    def post(self, request):
        try:
            logout(request) 
            return JsonResponse({"status": "success", "message": "Déconnexion réussie"})
        
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)

class StaffListView(View):
    def get(self, request):
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
    def post(self, request):
        return JsonResponse({
            "status": "success", 
            "message": "Si l'adresse email existe, un lien de réinitialisation a été envoyé."
        }, status=200)

@method_decorator(ensure_csrf_cookie, name='dispatch')
class UserView(View):
    def get(self, request):
        if request.user.is_authenticated:
            role = "client"
            establishment_id = None
            establishments = []
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
                "establishments": establishments
            })
        else:
            return JsonResponse({"error": "Non authentifié"}, status=401)

    def put(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
        try:
            data = json.loads(request.body)
            first_name = data.get('first_name')
            last_name = data.get('last_name')
            email = data.get('email')

            user = request.user
            if first_name is not None:
                user.first_name = first_name
            if last_name is not None:
                user.last_name = last_name
            if email is not None:
                # Check uniqueness if email changed
                if email != user.email and User.objects.filter(email=email).exists():
                    return JsonResponse({"error": "Cet email est déjà utilisé"}, status=400)
                user.email = email
                user.username = email

            # Password change logic
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

            return JsonResponse({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": role,
                "establishment_id": establishment_id,
                "establishments": establishments
            })
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


class AdminUserManagementView(View):
    def get(self, request):
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
                "client_details": client_details
            })
            
        return JsonResponse({"status": "success", "users": data}, status=200)


class AdminUserDetailView(View):
    def put(self, request, user_id):
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
                if role == 'admin':
                    user.is_superuser = True
                    user.is_staff = True
                else:
                    user.is_superuser = False
                    # We can keep user.is_staff as False unless they are a pro or manager, but standard django is False
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
    def post(self, request):
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
                
            # Verify the etablissement belongs to the gérant
            from establishments.models import Etablissement
            try:
                etablissement = Etablissement.objects.get(id=etablissement_id)
            except Etablissement.DoesNotExist:
                return JsonResponse({"error": "Établissement non trouvé"}, status=404)
                
            if etablissement.gerant != request.user.profil_gerant:
                return JsonResponse({"error": "Cet établissement ne vous appartient pas"}, status=403)
                
            # Create user
            nouvel_user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=firstname,
                last_name=lastname
            )
            
            # Create pro profile
            embauche_date = timezone.now().date()
            if date_embauche:
                try:
                    from datetime import datetime
                    embauche_date = datetime.strptime(date_embauche, '%Y-%m-%d').date()
                except ValueError:
                    pass
                    
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
    def delete(self, request, user_id):
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
            
        # Verify the pro belongs to one of the manager's establishments
        if target_user.profil_pro.etablissement.gerant != request.user.profil_gerant:
            return JsonResponse({"error": "Ce professionnel n'appartient pas à votre établissement"}, status=403)
            
        try:
            # Delete the pro profile
            target_user.profil_pro.delete()
            
            # Revert to a normal client account if not already a client
            Client.objects.get_or_create(utilisateur=target_user)
            
            return JsonResponse({"status": "success", "message": "Le professionnel a été supprimé et basculé en client."}, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
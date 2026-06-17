import json
from django.views import View
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from .models import Professionnel, Gerant

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
                if user.is_superuser:
                    role = "admin"
                elif hasattr(user, 'profil_gerant'):
                    role = "gerant"
                elif hasattr(user, 'profil_pro'):
                    role = "professionnel"

                return JsonResponse({
                    "status": "success",
                    "message": "Authentification réussie",
                    "user": {
                        "id": user.id,
                        "firstname": user.first_name,
                        "lastname": user.last_name,
                        "role": role
                    }
                })
            else:
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
            if request.user.is_superuser:
                role = "admin"
            elif hasattr(request.user, 'profil_gerant'):
                role = "gerant"
            elif hasattr(request.user, 'profil_pro'):
                role = "professionnel"

            return JsonResponse({
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "role": role
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
            if user.is_superuser:
                role = "admin"
            elif hasattr(user, 'profil_gerant'):
                role = "gerant"
            elif hasattr(user, 'profil_pro'):
                role = "professionnel"

            return JsonResponse({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": role
            })
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
import json
from django.views import View
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from .models import Professionnel, Gerant

class LoginView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            user = authenticate(username=email, password=password)

            if user is not None:
                login(request, user) 
                role = "client"
                if hasattr(user, 'profil_gerant'):
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
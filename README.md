# Timely

Timely est une plateforme moderne et sémantique de réservation multisectorielle (Beauté, Restauration, Hôtellerie, Administration). 
Elle est conçue avec une architecture modulaire pour être simple à faire évoluer et performante au quotidien.

---

## Stack Technique
* **Back-end** : Django 5.2 (Python)
* **Base de données** : PostgreSQL
* **Front-end** : TailwindCSS v4 + DaisyUI 5
* **Environnement** : Docker & Docker Compose
* **Dynamisme** : HTMX (échanges asynchrones légers)

---

## Démarrage Rapide

### 1. Cloner et configurer
```bash
git clone https://github.com/Accoows/timely.git
cd timely
cp .env.example .env
```

### 2. Lancer les conteneurs
Cette commande télécharge les images, installe les dépendances Node/Python et démarre le serveur ainsi que la base de données.
```bash
docker-compose up --build -d
```
*(Le watcher Tailwind CSS se lance automatiquement en arrière-plan dans le conteneur).*

### 3. Appliquer les migrations
Synchronisez votre base de données locale avec les modèles Django :
```bash
docker-compose exec web python manage.py migrate
```

> [!TIP]
> Le site est disponible sur [http://localhost:8000](http://localhost:8000). Ne pas utiliser `0.0.0.0:8000` sur Mac/Windows sous peine d'erreur de connexion.

---

## Commandes Utiles & Dépannage

### Voir les logs du serveur
```bash
docker-compose logs -f web
```

### Réinitialiser la base de données (en cas de conflit ou corruption local)
> [!WARNING]
> Cette commande efface toutes vos données locales de développement.
```bash
docker-compose down -v
docker-compose up -d
docker-compose exec web python manage.py migrate
```

---

## Architecture & Organisation du Code

Voici la structure complète de l'arborescence du projet :

```text
timely/
├── .env                      # Variables d'environnement locales (Ignoré par Git, Mots de passe)
├── docker-compose.yml        # Configuration des services Docker (Web, PostgreSQL)
├── Dockerfile                # Recette de l'image Linux pour le conteneur Python/Node
├── manage.py                 # Outil en ligne de commande de Django
├── README.md                 # Documentation du projet
├── requirements.txt          # Liste des dépendances Python (Django, psycopg2, etc.)
│
├── timely_app/               # Application Principale (Cœur de la configuration)
│   ├── __init__.py
│   ├── asgi.py               # Point d'entrée pour les serveurs asynchrones (ex: WebSockets)
│   ├── settings.py           # Configuration centrale (DB, Tailwind, Middlewares)
│   ├── urls.py               # Routeur principal (Lien vers les autres modules)
│   └── wsgi.py               # Point d'entrée pour les serveurs synchrones (Production)
│
├── theme/                    # Configuration Front-end (TailwindCSS)
│   ├── apps.py
│   ├── static/               # Dossier de destination du CSS compilé (styles.css minifié)
│   ├── static_src/           # Fichiers sources (Node.js package.json, Tailwind config)
│   │   └── src/
│   │       ├── styles.css    # Point d'entrée CSS (Importe les autres fichiers)
│   │       ├── global.css    # Styles sémantiques globaux (Header, Footer, Navbar)
│   │       └── home.css      # Styles sémantiques de la page d'accueil
│   └── templates/            # Fichiers HTML globaux (base.html pour l'héritage)
│   
└── core/                     # Application principale (Gestion de la page d'accueil)
    ├── __init__.py
    ├── apps.py               # Configuration de l'application
    ├── models.py             # Modèles de base de données (Schéma SQL)
    ├── views.py              # Logique applicative (Traitement Python)
    ├── urls.py               # Routes spécifiques au module (ex: /accueil)
    └── templates/
        └── core/
            └── home.html     # Fichiers HTML liés à ce module (avec classes Tailwind)
```

- **`timely_app/` (Configuration globale)** : Contient les variables d'environnement, les configurations de la base de données (`settings.py`), et le routeur principal (`urls.py`). Ce répertoire ne doit contenir aucune logique métier (views/models).
- **`theme/` (Configuration front-end)** : Généré par `django-tailwind`. Contient la configuration Node.js et les fichiers CSS d'entrée. 
  - **Organisation CSS** : Pour éviter de surcharger les fichiers HTML avec des dizaines de classes utilitaires et garder un code sémantique propre, nous utilisons des fichiers CSS découpés dans `theme/static_src/src/` :
    - `styles.css` : Le point d'entrée principal qui importe les autres modules.
    - `global.css` : Contient le design sémantique de la barre de navigation globale et du pied de page.
    - `home.css` : Contient les classes sémantiques spécifiques à la page d'accueil.
    - Tout ajout de style personnalisé se fait dans ces fichiers en utilisant la directive `@apply` de TailwindCSS.
- **`core/` (Application métier d'accueil)** : Module de base gérant l'affichage de la page d'accueil, le routage générique et les fonctions utilitaires globales (ex: filtres HTMX).

---

## Guide Pratique : Comment créer un module (Exemple : `accounts`)

Chaque fonctionnalité majeure du site doit avoir son propre module indépendant. Voici la marche à suivre :

### 1. Générer le squelette
Générez l'application Django depuis votre terminal :
```bash
docker-compose exec web python manage.py startapp accounts
```

### 2. Déclarer le module dans le projet
Ajoutez `'accounts',` dans la liste `INSTALLED_APPS` du fichier `timely_app/settings.py`.

### 3. Définir le modèle (M) dans `models.py`
Créez la structure de la table utilisateur personnalisée avec ses rôles :
```python
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('client', 'Client'),
        ('professional', 'Professionnel'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='client')
```
*Enregistrez le modèle dans `settings.py` via `AUTH_USER_MODEL = 'accounts.User'`, puis générez les migrations :*
```bash
docker-compose exec web python manage.py makemigrations
docker-compose exec web python manage.py migrate
```

### 4. Valider les données (Forms) dans `forms.py`
Gère la validation du formulaire d'inscription et l'unicité de l'email :
```python
from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import User

class RegistrationForm(UserCreationForm):
    email = forms.EmailField(required=True)

    class Meta(UserCreationForm.Meta):
        model = User
        fields = UserCreationForm.Meta.fields + ('email', 'role')

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError("Cet email est déjà enregistré.")
        return email
```

### 5. Traiter la logique métier (V) dans `views.py`
Reçoit la requête, traite le formulaire et connecte l'utilisateur :
```python
from django.shortcuts import render, redirect
from django.contrib.auth import login
from .forms import RegistrationForm

def register_view(request):
    if request.method == 'POST':
        form = RegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('core:home')
    else:
        form = RegistrationForm()
    return render(request, 'accounts/register.html', {'form': form})
```

### 6. Configurer le routage dans `urls.py`
Liez la vue à une URL avec un espace de nommage :
```python
from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('inscription/', views.register_view, name='register'),
]
```
*Puis incluez-le dans le routeur principal du projet ([timely_app/urls.py](file:///Users/agnzls/Documents/Ynov-Campus/Ynov%202025-2026/Fil_Rouge_Dev/Timely/timely_app/urls.py)) : `path('compte/', include('accounts.urls'))`.*

### 7. Afficher le formulaire dans le Template (T)
Créez le fichier HTML de rendu visuel :
```html
{% extends 'base.html' %}

{% block content %}
<div class="max-w-md mx-auto py-12">
    <h2>Créer un compte</h2>
    <form method="POST">
        {% csrf_token %}
        {{ form.as_p }}
        <button type="submit">S'inscrire</button>
    </form>
</div>
{% endblock %}
```
> [!IMPORTANT]
> **Règle du Namespace** : Respectez le double dossier pour vos templates (`templates/nom_du_module/fichier.html`) pour éviter que Django ne confonde les fichiers HTML de différents modules.

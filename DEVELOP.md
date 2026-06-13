# Guide de Développement — Timely

Ce guide est destiné à tous les membres de l'équipe. Il couvre tout ce qu'il faut savoir pour développer sur le projet Timely, de la première installation jusqu'à la création d'une fonctionnalité complète (Backend + Frontend).

---

## Sommaire

1. [Démarrer l'environnement](#1-démarrer-lenvironnement)
2. [Identifiants par défaut](#2-identifiants-par-défaut)
3. [Règles du quotidien](#3-règles-du-quotidien--quand-relancer-docker-)
4. [Base de données : créer une table](#4-base-de-données--créer-une-table)
5. [Exposer une table dans le Back-office Django](#5-exposer-une-table-dans-le-back-office-django)
6. [Créer une route API Backend (Django)](#6-créer-une-route-api-backend-django)
7. [Consommer l'API côté Frontend (React)](#7-consommer-lapi-côté-frontend-react)
8. [Créer une nouvelle application Django (startapp)](#8-créer-une-nouvelle-application-django-startapp)
9. [Workflow Git de l'équipe](#9-workflow-git-de-léquipe)
10. [Commandes Docker utiles (Cheatsheet)](#10-commandes-docker-utiles-cheatsheet)
11. [Variables d'environnement disponibles](#11-variables-denvironnement-disponibles)
12. [Inspecter la base de données directement](#12-inspecter-la-base-de-données-directement)
13. [Résolution des problèmes fréquents](#13-résolution-des-problèmes-fréquents)

---

## 1. Démarrer l'environnement

### Prérequis
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et démarré.
- Git installé.

### Étapes

**1. Cloner le projet et se placer dedans :**
```bash
git clone https://github.com/Accoows/timely.git
cd timely
```

**2. Créer votre fichier de configuration locale :**

Copiez le fichier d'exemple et renommez-le `.env` à la racine du projet :
```bash
cp .env.example .env
```
> Le fichier `.env` n'est pas poussé sur Git (il est dans `.gitignore`). Chaque développeur a le sien en local.

**3. Démarrer tous les services :**
```bash
docker compose up -d --build
```
Cette commande télécharge les images, installe toutes les dépendances, applique les migrations et démarre les 3 services (base de données, backend, frontend).

### Accès locaux

| Service | URL |
|---|---|
| **Site Web (React)** | http://localhost:5173 |
| **API REST (Django)** | http://localhost:8000 |
| **Back-office Admin** | http://localhost:5173/backoffice/ |
| **Base de données (Postgres)** | `localhost:5432` |

---

## 2. Identifiants par défaut

Un compte administrateur est créé **automatiquement** à chaque démarrage des conteneurs.

| Champ | Valeur |
|---|---|
| **URL** | http://localhost:5173/backoffice/ |
| **Nom d'utilisateur** | `admin` |
| **Mot de passe** | `AZEqsd123!` |

> Ces valeurs peuvent être personnalisées via les variables `DJANGO_SUPERUSER_USERNAME` et `DJANGO_SUPERUSER_PASSWORD` dans votre fichier `.env`.

---

## 3. Règles du quotidien : quand relancer Docker ?

### Vous n'avez PAS besoin de relancer Docker si vous modifiez...
- ✅ **Du code Python** (fichier `views.py`, `models.py`, `urls.py`, etc.) → Django détecte le changement et redémarre automatiquement le serveur en arrière-plan (StatReloader).
- ✅ **Du code TypeScript / CSS** (fichiers React, Tailwind) → Vite recharge instantanément la page dans votre navigateur (HMR).

### Vous DEVEZ relancer Docker si vous modifiez...
- ❌ **Le fichier `requirements.txt`** (ajout d'une bibliothèque Python) → Relancez `docker compose up -d --build`
- ❌ **Le fichier `package.json`** (ajout d'une bibliothèque Node.js) → Relancez `docker compose up -d --build`
- ❌ **Le fichier `.env`** ou `docker-compose.yml` ou `start.sh` → Relancez `docker compose up -d`

---

## 4. Base de données : créer une table

Voici les étapes exactes à suivre à chaque fois que vous créez ou modifiez un modèle de base de données.

### Étape 1 — Écrire le modèle Python

Ouvrez le fichier `backend/<votre_app>/models.py` et définissez votre table :

```python
# backend/bookings/models.py
from django.db import models
from django.contrib.auth.models import User

class Booking(models.Model):
    utilisateur = models.ForeignKey(User, on_delete=models.CASCADE)
    nom_etablissement = models.CharField(max_length=150)
    date_rdv = models.DateTimeField()
    statut = models.CharField(max_length=20, default='en_attente')
    cree_le = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.utilisateur.username} - {self.nom_etablissement}"
```

### Étape 2 — Déclarer l'app dans les paramètres (si nouvelle app)

Si l'application est nouvelle, ajoutez-la dans `backend/timely_app/settings.py` :
```python
INSTALLED_APPS = [
    # ...
    'bookings',  # ← Ajoutez votre app ici
]
```

### Étape 3 — Générer le fichier de migration

Cette commande lit votre `models.py` et génère un fichier de "plan" de construction SQL :
```bash
docker compose exec backend python manage.py makemigrations bookings
```
> Django crée un fichier `backend/bookings/migrations/0001_initial.py`. **Ce fichier doit être commité sur Git** pour que vos collègues puissent avoir les mêmes tables.

### Étape 4 — Appliquer la migration à la base de données

```bash
docker compose exec backend python manage.py migrate
```
> Cette commande exécute le "plan" et crée physiquement la table dans PostgreSQL. Elle est aussi lancée **automatiquement** au démarrage des conteneurs, donc vos collègues n'ont pas besoin de la lancer manuellement après un `git pull`.

---

## 5. Exposer une table dans le Back-office Django

Pour qu'une table SQL soit visible et administrable depuis `http://localhost:5173/backoffice/`, vous devez l'enregistrer dans le fichier `admin.py` de votre application.

Ouvrez `backend/bookings/admin.py` et ajoutez :
```python
# backend/bookings/admin.py
from django.contrib import admin
from .models import Booking

admin.site.register(Booking)
```

Après sauvegarde, rechargez le back-office dans votre navigateur. Une nouvelle section **Bookings** apparaîtra, vous permettant de lister, créer, modifier et supprimer des réservations directement depuis l'interface web.

---

## 6. Créer une route API Backend (Django)

Voici le cycle complet pour exposer des données via une URL d'API REST.

### Étape 1 — Créer la Vue (la logique de réponse)

```python
# backend/bookings/views.py
import json
from django.views import View
from django.http import JsonResponse
from .models import Booking

class BookingListView(View):
    def get(self, request):
        reservations = Booking.objects.all().values(
            'id', 'nom_etablissement', 'statut', 'date_rdv'
        )
        return JsonResponse(list(reservations), safe=False)

    def post(self, request):
        data = json.loads(request.body)
        booking = Booking.objects.create(
            utilisateur=request.user,
            nom_etablissement=data['nom_etablissement'],
            date_rdv=data['date_rdv'],
        )
        return JsonResponse({'id': booking.id, 'status': 'created'}, status=201)
```

### Étape 2 — Créer les URLs de l'application

```python
# backend/bookings/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.BookingListView.as_view(), name='booking_list'),
]
```

### Étape 3 — Brancher les URLs dans le projet global

Ouvrez `backend/timely_app/urls.py` et ajoutez votre application :
```python
from django.urls import path, include
from django.contrib import admin

urlpatterns = [
    path('backoffice/', admin.site.urls),
    path('api/bookings/', include('bookings.urls')),  # ← Votre nouvelle route
    path('api/', include('core.urls')),
]
```

L'API est maintenant accessible sur `http://localhost:8000/api/bookings/`.

---

## 7. Consommer l'API côté Frontend (React)

En développement, le proxy Vite (configuré dans `frontend/vite.config.ts`) redirige automatiquement tous les appels `/api/...` vers le backend Django. Vous n'avez donc pas besoin de l'URL complète `http://localhost:8000`.

### Exemple simple avec `useEffect` et `fetch`

```tsx
// frontend/src/pages/Bookings/BookingsPage.tsx
import { useEffect, useState } from 'react';

interface Booking {
  id: number;
  nom_etablissement: string;
  date_rdv: string;
  statut: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // L'URL "/api/bookings/" est redirigée par Vite vers Django automatiquement
    fetch('/api/bookings/')
      .then(res => res.json())
      .then(data => {
        setBookings(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Chargement...</p>;

  return (
    <div>
      <h1>Mes Réservations</h1>
      {bookings.map(b => (
        <div key={b.id}>
          <strong>{b.nom_etablissement}</strong> — {b.statut}
        </div>
      ))}
    </div>
  );
}
```

---

## 8. Créer une nouvelle application Django (startapp)

Quand vous devez créer un nouveau module métier (ex: `reviews`, `notifications`...), ne créez pas le dossier à la main. Utilisez la commande officielle Django :

```bash
docker compose exec backend python manage.py startapp <nom_de_l_app>
```

Exemple pour une app `reviews` :
```bash
docker compose exec backend python manage.py startapp reviews
```

Cela génère automatiquement la structure suivante dans `backend/reviews/` :
```
reviews/
├── __init__.py
├── admin.py       ← Enregistrement des modèles dans le back-office
├── apps.py        ← Config de l'app
├── migrations/    ← Fichiers de migration (à commiter !)
├── models.py      ← Vos tables SQL
├── tests.py
└── views.py       ← Votre logique de réponse API
```

> N'oubliez pas d'ajouter `'reviews'` dans `INSTALLED_APPS` dans `backend/timely_app/settings.py` et de créer un fichier `urls.py` dans le nouveau dossier.

---

## 9. Workflow Git de l'équipe

### Branches
Ne jamais travailler directement sur `main`. Le workflow standard est :

```
main               ← Production uniquement (ne pas toucher directement)
  └── dev          ← Branche de développement commune
        ├── feature/<nom>   ← Votre fonctionnalité
        └── fix/<nom>       ← Un correctif de bug
```

### Étapes pour créer une nouvelle fonctionnalité
```bash
# 1. Se placer sur la branche de dev et récupérer les derniers changements
git checkout dev
git pull

# 2. Créer votre branche de travail
git checkout -b feature/ma-fonctionnalite

# 3. Coder, puis commiter régulièrement
git add .
git commit -m "feat(bookings): add booking list API endpoint"

# 4. Pousser et ouvrir une Pull Request vers dev
git push origin feature/ma-fonctionnalite
```

### Convention de messages de commit (Conventional Commits)
Utilisez ce format standard : `type(scope): description courte en anglais`

| Type | Quand l'utiliser |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction d'un bug |
| `refactor` | Réécriture de code sans changer le comportement |
| `docs` | Modification de documentation uniquement |
| `style` | Correction de style/mise en forme |
| `chore` | Tâche de maintenance (dépendances, config Docker...) |

**Exemples :**
```
feat(authentication): add JWT login endpoint
fix(bookings): resolve 502 proxy error on /backoffice
docs: update DEVELOP.md with admin registration guide
chore(docker): add BACKEND_URL env variable to compose
```

---

## 10. Commandes Docker utiles (Cheatsheet)

```bash
# Démarrer tous les services en arrière-plan
docker compose up -d

# Démarrer et forcer la reconstruction des images (après un changement de dépendances)
docker compose up -d --build

# Arrêter tous les conteneurs
docker compose down

# Arrêter ET supprimer la base de données (attention : toutes vos données locales sont perdues !)
docker compose down -v

# Voir les logs en temps réel d'un service
docker compose logs -f backend
docker compose logs -f frontend

# Voir l'état de tous les conteneurs
docker compose ps

# Lancer une commande Django depuis votre terminal
docker compose exec backend python manage.py <commande>

# Appliquer les migrations de la base de données
docker compose exec backend python manage.py migrate

# Remplir la base de données avec les données de test initiales (seed)
docker compose exec backend python manage.py seed_establishments

# Ouvrir un shell Python interactif dans le conteneur backend (utile pour déboguer)
docker compose exec backend python manage.py shell

# Redémarrer un seul service sans reconstruire l'image
docker compose restart backend
```

---

## 11. Variables d'environnement disponibles

Ces variables sont à définir dans votre fichier `.env` à la racine du projet. Vous pouvez vous baser sur `.env.example` comme modèle.

| Variable | Description | Valeur par défaut |
|---|---|---|
| `DEBUG` | Active le mode debug Django | `True` (local), `False` (prod) |
| `SECRET_KEY` | Clé secrète Django, unique et privée | (voir `.env.example`) |
| `POSTGRES_DB` | Nom de la base de données | `timely_db` |
| `POSTGRES_USER` | Nom d'utilisateur PostgreSQL | `timely_user` |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | `AZEqsd123!` |
| `DB_HOST` | Hôte de la base de données (Docker) | `db` |
| `DB_PORT` | Port de la base de données | `5432` |
| `DJANGO_SUPERUSER_USERNAME` | Identifiant du compte admin auto-créé | `admin` |
| `DJANGO_SUPERUSER_PASSWORD` | Mot de passe du compte admin auto-créé | `AZEqsd123!` |
| `DJANGO_SUPERUSER_EMAIL` | Email du compte admin auto-créé | `admin@example.com` |

---

## 12. Inspecter la base de données directement

Pour inspecter les tables PostgreSQL brutes (voir des données, exécuter des requêtes SQL libres), utilisez un client SQL graphique. Les plus populaires sont :
- **TablePlus** (Mac/Windows, gratuit pour usage limité)
- **DBeaver** (multi-plateforme, gratuit)
- **pgAdmin** (officiel PostgreSQL, gratuit)

### Paramètres de connexion (environnement local)

| Paramètre | Valeur |
|---|---|
| **Hôte** | `localhost` |
| **Port** | `5432` |
| **Base de données** | `timely_db` |
| **Utilisateur** | `timely_user` |
| **Mot de passe** | `AZEqsd123!` |

> Ces valeurs correspondent aux variables définies dans votre `.env` local.

Alternativement, vous pouvez ouvrir un shell SQL directement dans le terminal :
```bash
docker compose exec db psql -U timely_user -d timely_db
```

---

## 13. Résolution des problèmes fréquents

### ❌ Erreur `HTTP ERROR 502` sur `/backoffice` ou `/api/...`

**Cause probable :** Le conteneur backend a planté au démarrage.

**Solution :**
1. Vérifiez si le conteneur tourne : `docker compose ps` — Le conteneur `timely_backend` doit être au statut `running`.
2. Consultez ses logs pour trouver l'erreur : `docker compose logs backend`
3. Si vous avez récupéré du nouveau code : `docker compose down && docker compose up -d --build`

---

### ❌ Erreur `ProgrammingError: relation "xxxx" does not exist`

**Cause probable :** Vous avez créé ou modifié un modèle, mais les migrations n'ont pas été générées ou appliquées.

**Solution :**
```bash
# 1. Générer le fichier de migration manquant
docker compose exec backend python manage.py makemigrations <nom_de_l_app>

# 2. Appliquer les migrations à la base de données
docker compose exec backend python manage.py migrate
```
Ensuite, committez les nouveaux fichiers de migration générés (`git add backend/<app>/migrations/`).

---

### ❌ Erreur `RuntimeError: Model class X doesn't declare an explicit app_label`

**Cause probable :** L'application contenant ce modèle n'est pas déclarée dans `INSTALLED_APPS`.

**Solution :** Ouvrez `backend/timely_app/settings.py` et ajoutez votre application dans la liste `INSTALLED_APPS`.

---

### ❌ Erreur `AttributeError: module 'xxx.views' has no attribute 'YyyView'`

**Cause probable :** Vous avez déclaré une URL dans `urls.py` pointant vers une vue qui n'existe pas (ou est mal nommée) dans `views.py`.

**Solution :** Vérifiez que le nom de la classe dans `urls.py` correspond exactement au nom de la classe dans `views.py`.

---

### ❌ Mon collègue a des migrations différentes des miennes (`MigrationError`)

**Cause probable :** Deux développeurs ont créé des migrations en même temps sans synchronisation, créant un conflit.

**Solution :**
```bash
# 1. Récupérer les migrations de votre collègue
git pull

# 2. Fusionner les migrations conflictuelles
docker compose exec backend python manage.py migrate --merge

# 3. Commiter le fichier de merge généré
git add backend/<app>/migrations/
git commit -m "fix(migrations): merge conflicting migration files"
```

---

### ❌ La base de données locale est dans un état cassé / je veux repartir de zéro

> ⚠️ **Attention** : Cette opération supprime définitivement toutes vos données locales.

```bash
# Supprime les conteneurs ET les volumes (donc la base de données)
docker compose down -v

# Relance tout depuis zéro (migrations incluses)
docker compose up -d --build
```

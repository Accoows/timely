# Timely

Timely est une plateforme de réservation multisectorielle moderne centralisant les secteurs de la beauté, de la restauration, de l'hôtellerie, du voyage et des démarches administratives.

Le projet utilise une architecture **découplée (SPA)** moderne pour faciliter le travail collaboratif en équipe (deux développeurs travaillant de manière indépendante).

---

## La Stack Technique

Le projet est divisé en deux parties autonomes :

### 1. Backend (API REST) — `/backend`

- **Framework** : Django 5 (Python)
- **API Engine** : Django REST Framework (DRF)
- **Base de données** : PostgreSQL
- **CORS Management** : `django-cors-headers` pour sécuriser les appels depuis l'interface React.

### 2. Frontend (Single Page Application) — `/frontend`

- **Framework** : React (avec TypeScript)
- **Build Tool** : Vite
- **Styling** : Tailwind CSS v4 & DaisyUI v5 (Composants prêts à l'emploi et thèmes préconfigurés).
- **Communication** : Fetch API (avec système de fallback local en cas de coupure de l'API).

### 3. Orchestration & Docker

- **Docker & Docker Compose** pour lancer l'environnement complet (Base de données, API Backend et Client Frontend) en une seule commande avec rechargement à chaud (hot-reload).

---

## Choix Techniques et Justifications

- **Django & Django REST Framework (Backend)** :
  - _Rapidité de développement_ : Permet de concevoir rapidement une API REST propre et sécurisée grâce aux vues et routeurs intégrés.
  - _Back-office intégré_ : La console d'administration par défaut de Django (`/backoffice/`) fait gagner un temps précieux pour gérer les données brutes (utilisateurs, établissements, réservations).
  - _Sécurité_ : Gestion native de l'authentification et des jetons CSRF pour sécuriser les requêtes du frontend.
- **React + TypeScript + Vite (Frontend)** :
  - _Typecheck statique_ : TypeScript évite la majorité des erreurs d'incompatibilité de données entre l'API et le client.
  - _Vitesse (Vite)_ : Démarrage instantané et rechargement à chaud (Hot Module Replacement) ultrarapide en développement.
- **Tailwind CSS v4 & DaisyUI v5 (Style)** :
  - _Style sur-mesure_ : Tailwind permet de réaliser l'esthétique néo-brutaliste propre à l'application sans écrire de CSS verbeux.
  - _Composants DaisyUI_ : Accélère le maquettage des formulaires, boutons et menus grâce à des composants accessibles et pré-stylisés.
- **Docker & Docker Compose (Orchestration)** :
  - _Portabilité_ : Garantit que l'application s'exécute exactement de la même manière sur les machines de tous les développeurs (Mac, Windows, Linux) sans conflits de versions de Node.js, Python ou PostgreSQL.

---

## Structure du Workspace

```text
timely/
├── backend/                    # Partie Backend (Django API)
│   ├── timely_app/             # Fichiers de configuration globale Django (settings, urls)
│   ├── authentication/         # App de gestion des profils (Client, Gérant, Professionnel)
│   ├── establishments/         # App de gestion des salons, prestations, photos et personnel
│   ├── bookings/               # App de gestion des RDV, facturation et créneaux horaires
│   ├── interactions/           # App de gestion des avis clients et des favoris
│   ├── messaging/              # App de gestion du chat en direct (messagerie)
│   ├── media/                  # Dossier pour les fichiers uploadés (images, etc)
│   ├── manage.py               # Script utilitaire Django
│   ├── requirements.txt        # Dépendances Python (Django, DRF, psycopg2...)
│   ├── start.sh                # Script de démarrage en mode développement
│   ├── start-prod.sh           # Script de démarrage en mode production
│   └── Dockerfile              # Recette Docker pour l'API
│
├── frontend/                   # Partie Frontend (React Client)
│   ├── src/
│   │   ├── assets/             # Fichiers statiques (images, polices...)
│   │   ├── components/         # Composants réutilisables (InputField, Button, Alert...)
│   │   ├── context/            # Contexte global (AuthContext pour la session utilisateur)
│   │   ├── pages/              # Vues de l'application (Home, Search, Profile, Admin...)
│   │   ├── services/           # Services API client (api.ts pour fetch les routes Django)
│   │   ├── types/              # Déclarations des interfaces TypeScript (index.ts)
│   │   ├── App.tsx             # Composant racine et gestionnaire de routes
│   │   ├── main.tsx            # Point d'entrée de l'application
│   │   └── index.css           # Feuille de style principale (Tailwind)
│   │
│   ├── public/                 # Ressources statiques accessibles au front
│   ├── package.json            # Dépendances Node.js (Vite, React, Tailwind)
│   ├── Dockerfile              # Recette Docker pour le client
│   └── vite.config.ts          # Configuration du bundler Vite (avec proxy API local)
│
└── docker-compose.yml          # Orchestration locale multiconteneur (API, Client, DB)
```

---

## Guide de Démarrage Rapide

### Prérequis

- Docker Desktop ou OrbStack (Mac/Windows)
- Git

### 1. Installation

1. Cloner le projet :
   ```bash
   git clone https://github.com/Accoows/timely.git
   cd timely
   ```
2. Configurer les variables d'environnement locales (Copier `.env.example` vers `.env` à la racine) :
   ```bash
   cp .env.example .env
   ```

### 2. Démarrage de l'Environnement de Dev

Lancez tous les services en arrière-plan via Docker Compose :

```bash
docker compose up --build -d
```

_Cette commande télécharge les images, installe les dépendances Python et Node.js, applique les migrations de base de données PostgreSQL, puis démarre les serveurs._

### 3. Accès aux Liens Locaux

- **Site Web (React Frontend)** : [http://localhost:5173](http://localhost:5173) (avec hot-reload instantané lorsque vous modifiez le code du front).
- **API REST & Console Django Admin** : [http://localhost:8000](http://localhost:8000)

### 4. Accès Administrateur (pour la démo)

##### Interface DB Django

- **Accès Administrateur Django** : [http://localhost:8000/backoffice/](http://localhost:8000/backoffice/)
- **Username** : `admin`
- **Mot de passe** : `AZEqsd123!`

##### Compte Administrateur Web:

- **Email** : `admin@example.com`
- **Mot de passe** : `AZEqsd123!`

##### Compte Utilisateur (Client,Pro,Gérant)

Pour exploiter au maximum le site web, il est recommander de pouvoir se connecter avec les différents types de comptes.
Via la page "Mon compte", en haut à droite "Dashboard Admin", on peut récupérer les informations des différents comptes existants.

Cas d'usage pour la démo :

1. Récupérer un mail d'un gérant et après un pro
2. Se connecter avec le mot de passe par défaut (pour la démo) : `AZEqsd123!`
3. Parcourir toutes les options dispo dans "Mon compte", les établissements, le dashboard établissements.
4. Chaque rôle permet d'afficher et de gérer plus ou moins des options à la dispositions de l'utilisateur.

---

## Workflow de Développement Quotidien

Puisque le code est scindé, chaque développeur peut se focaliser sur sa partie :

### Si vous travaillez sur le Frontend (React)

1. Tout votre code se trouve dans `/frontend`.
2. Pour ajouter des dépendances NPM (ex: un calendrier React) :
   ```bash
   cd frontend
   npm install <package-name>
   ```
3. L'application utilise Tailwind v4 et DaisyUI. Vous pouvez utiliser n'importe quelle classe ou composant DaisyUI directement.

### Si vous travaillez sur le Backend (Django)

1. Tout votre code se trouve dans `/backend`.
2. Pour ajouter des dépendances Python (requirements) :
   - Ajoutez le package dans `backend/requirements.txt`.
   - Redémarrez le container avec `--build` : `docker compose up --build -d`.
3. Pour créer des tables en base de données ou faire des migrations :

   ```bash
   # Créer les fichiers de migration après modification d'un models.py
   docker compose exec backend python manage.py makemigrations

   # Appliquer les migrations
   docker compose exec backend python manage.py migrate
   ```

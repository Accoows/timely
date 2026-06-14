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

## Structure du Workspace

```text
timely/
├── backend/                  # Partie Backend (Django API)
│   ├── core/                 # Application métier de base (Modèles, API)
│   ├── timely_app/           # Fichiers de configuration globale Django
│   ├── manage.py             # Script utilitaire Django
│   ├── requirements.txt      # Dépendances Python
│   ├── Dockerfile            # Recette Docker pour l'API
│   └── start.sh              # Script de démarrage du container API
│
├── frontend/                 # Partie Frontend (React Client)
│   ├── src/                  # Composants, styles, et pages React
│   ├── public/               # Ressources statiques accessibles au front
│   ├── package.json          # Dépendances Node.js (Vite, React, Tailwind)
│   ├── Dockerfile            # Recette Docker pour le client
│   └── vite.config.ts        # Configuration du bundler Vite
│
└── docker-compose.yml        # Orchestration locale
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
docker-compose up --build -d
```

_Cette commande télécharge les images, installe les dépendances Python et Node.js, applique les migrations de base de données PostgreSQL, puis démarre les serveurs._

### 3. Accès aux Liens Locaux

- **Site Web (React Frontend)** : [http://localhost:5173](http://localhost:5173) (avec hot-reload instantané lorsque vous modifiez le code du front).
- **API REST & Console Django Admin** : [http://localhost:8000](http://localhost:8000)

---

## 💻 Workflow de Développement Quotidien

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
   - Redémarrez le container avec `--build` : `docker-compose up --build -d`.
3. Pour créer des tables en base de données ou faire des migrations :

   ```bash
   # Créer les fichiers de migration après modification d'un models.py
   docker-compose exec backend python manage.py makemigrations

   # Appliquer les migrations
   docker-compose exec backend python manage.py migrate
   ```

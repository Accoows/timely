# Guide de Déploiement Production (Debian 13, Docker, Cloudflared)

Ce document décrit la procédure complète pour héberger le projet Timely sur un serveur de production sous Debian 13 et l'exposer de manière sécurisée à l'aide de **Cloudflare Zero Trust (Tunnels)**.

---

## 1. Architecture de Production

L'architecture utilise un reverse proxy intégré pour simplifier la configuration DNS, éliminer les problèmes de CORS, et centraliser les requêtes sur un seul port public :

1. **Cloudflare Tunnel** redirige le trafic HTTPS public (ex: `https://timely.stellarbit.cc`) vers le port **80** du conteneur `frontend` (Nginx).
2. **Nginx** sert directement les fichiers statiques HTML/JS/CSS compilés de l'application React.
3. **Nginx** agit comme un reverse proxy et redirige en interne :
   - Les requêtes API (`/api/`) vers le conteneur `backend` (Django/Gunicorn).
   - Les requêtes de fichiers statiques Django (`/static/`) vers le conteneur `backend` (servis via Whitenoise).
   - Les requêtes de l'espace d'administration sécurisé (`/backoffice/` ou votre chemin personnalisé) vers le conteneur `backend`.
4. La base de données PostgreSQL (`db`) et le serveur d'API (`backend`) restent uniquement accessibles au sein du réseau Docker interne (aucun port exposé vers l'extérieur pour une sécurité maximale).

```
                      +-----------------------------+
                      |        Navigateur Client     |
                      +--------------+--------------+
                                     | HTTPS (port 443)
                                     v
                      +--------------+--------------+
                      | Cloudflare Zero Trust Tunnel |
                      +--------------+--------------+
                                     | HTTP (Port 80)
                                     v
+------------------------------------+------------------------------------+
| Serveur Debian 13 (Docker Network)                                      |
|                                                                         |
|  +---------------------------+       +-------------------------------+  |
|  | Conteneur Frontend (Nginx)| ----> | Conteneur Backend (Gunicorn)  |  |
|  |  Serves React SPA & Proxy | (api) |  Runs Django REST Framework   |  |
|  +---------------------------+       +---------------+---------------+  |
|                                                      |                  |
|                                                      v                  |
|                                      +---------------+---------------+  |
|                                      | Conteneur Database (Postgres) |  |
|                                      +-------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## 2. Préparation du Serveur Debian 13

### A. Installer Docker et Docker Compose
Si Docker n'est pas encore installé sur votre Debian 13, exécutez ces commandes en SSH :
```bash
# Mettre à jour les paquets
sudo apt update && sudo apt upgrade -y

# Installer Docker et ses dépendances
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Ajouter le dépôt officiel Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### B. Cloner le Projet
Récupérez la branche de production (`prod`) depuis GitHub :
```bash
git clone -b prod https://github.com/Accoows/timely.git
cd timely
```

---

## 3. Configuration des Variables d'Environnement

Copiez le modèle de configuration pour créer votre fichier de production `.env` :
```bash
cp .env.example .env
```

Ouvrez le fichier `.env` (avec `nano .env`) et modifiez ou ajoutez les valeurs suivantes :

```ini
# Désactiver le mode débogage en production (VITAL pour la sécurité)
DEBUG=False

# Générer une clé secrète forte et unique
SECRET_KEY=votre_cle_aleatoire_et_tres_longue_ici

# Configuration de la base de données PostgreSQL
POSTGRES_DB=timely_db
POSTGRES_USER=timely_user
POSTGRES_PASSWORD=un_mot_de_passe_sql_tres_robuste
DB_HOST=db
DB_PORT=5432

# Optionnel : Personnaliser l'adresse de l'interface d'administration Django
# Si non définie, elle sera accessible par défaut sur "/backoffice/"
ADMIN_URL=mon_lien_secret_pour_l_admin/
```

---

## 4. Premier Lancement de la Stack Docker

Démarrez la compilation et lancez les conteneurs en tâche de fond :
```bash
docker compose -f docker-compose.prod.yml up --build -d
```
Cette commande va :
- Compiler l'application React et l'intégrer à un serveur Nginx optimisé.
- Télécharger et configurer l'image Django Python allégée (sans Node.js).
- Lancer le serveur d'application Gunicorn en arrière-plan.

---

## 5. Initialisation de la Base de Données & Administrateur

Au premier démarrage, vous devez appliquer les tables SQL et créer votre compte d'accès.

### A. Appliquer les Migrations de Base de Données
Appliquez les schémas de table (les tables de Django et de vos applications) :
```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
```
*Toutes les étapes doivent afficher `OK`.*

### B. Créer le Compte Administrateur (Superuser)
Créez votre compte pour vous connecter au back-office Django :
```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```
Saisissez les informations de votre compte d'accès. Par défaut pour vos tests de production, vous pouvez utiliser :
- **Nom d'utilisateur** : `root`
- **Mot de passe** : `AZEqsd123!`

---

## 6. Configuration de Cloudflare Zero Trust (Tunnels)

Puisque le proxy Nginx sert de point d'entrée unique sur le port `80`, vous n'avez besoin que d'une seule règle simple sur Cloudflare :

1. Allez sur votre tableau de bord **Cloudflare Zero Trust** > **Networks** > **Tunnels**.
2. Créez ou éditez votre tunnel.
3. Installez le connecteur `cloudflared` sur votre Debian 13 en suivant les instructions fournies (en tant que service).
4. Configurez un **Public Hostname** :
   - **Subdomain/Domain** : `timely.stellarbit.cc` (ou votre nom de domaine)
   - **Service Type** : `HTTP`
   - **URL** : `localhost:80` (le port de notre Nginx frontend)

---

## 7. Fonctionnement et Sécurité de l'Administration Django

### Accéder à l'administration
- L'administration par défaut `/admin/` est **désactivée** et renverra une erreur **404 (Introuvable)** pour bloquer les robots malveillants.
- L'administration est désormais accessible à l'adresse que vous avez choisie :
  * Si vous n'avez rien changé dans le `.env` : `https://timely.stellarbit.cc/backoffice/`
  * Si vous avez personnalisé `ADMIN_URL` dans le `.env` : `https://timely.stellarbit.cc/<votre_lien_secret>/`

---

## 8. Routine de Mise à Jour de l'Application

Dès que vous fusionnez du nouveau code sur la branche `prod` sur GitHub, exécutez ces commandes en SSH sur votre serveur pour mettre le site à jour sans interruption :

```bash
# 1. Récupérer le dernier code
git pull origin prod

# 2. Reconstruire et relancer la stack
docker compose -f docker-compose.prod.yml up --build -d
```
*Remarque : Les migrations et la collecte des fichiers statiques se lancent automatiquement au démarrage du conteneur grâce au script `start-prod.sh`.*

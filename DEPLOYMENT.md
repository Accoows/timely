# Guide de Déploiement Production (Debian 13, Docker, Cloudflared)

Ce document décrit la procédure pour héberger le projet Timely sur un serveur de production sous Debian 13 et l'exposer de manière sécurisée à l'aide de **Cloudflare Zero Trust (Tunnels)**.

---

## 1. Architecture de Production

L'architecture utilise un reverse proxy intégré pour simplifier la configuration DNS et éliminer les problèmes de CORS :
1. **Cloudflare Tunnel** redirige le trafic public (ex: `timely.stellarbit.cc`) vers le port **80** du conteneur `frontend` (Nginx).
2. **Nginx** sert directement les fichiers statiques HTML/JS/CSS compilés de l'application React.
3. **Nginx** intercepte et redirige toutes les requêtes d'API (`/api/`), d'administration (`/admin/`), et les fichiers statiques Django (`/static/`) vers le conteneur `backend` (Gunicorn/Django) sur le port `8000`.
4. La base de données PostgreSQL (`db`) reste uniquement accessible au sein du réseau Docker interne (aucun port exposé vers l'extérieur).

```
                      +-----------------------------+
                      |        Navigateur Client     |
                      +--------------+--------------+
                                     | HTTPS
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
|  |  Serves React SPA         | (api) |  Runs Django REST Framework   |  |
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
Si Docker n'est pas encore installé sur votre Debian 13 :
```bash
# Mettre à jour les paquets
sudo apt update && sudo apt upgrade -y

# Installer Docker et les dépendances nécessaires
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Ajouter le dépôt de Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### B. Cloner le Projet
Récupérez la branche de production (`prod`) :
```bash
git clone -b prod https://github.com/Accoows/timely.git
cd timely
```

---

## 3. Configuration des Variables d'Environnement

Copiez le modèle de configuration et configurez-le :
```bash
cp .env.example .env
```

**⚠️ CRITIQUE : Paramètres du fichier `.env` en production**
Modifiez les lignes suivantes :
- `DEBUG=False` (Indispensable pour la sécurité)
- `SECRET_KEY=votre_cle_aleatoire_et_tres_longue`
- `POSTGRES_PASSWORD=un_mot_de_passe_sql_robuste`
- `DB_HOST=db` (Le nom du conteneur de base de données dans docker-compose)
- `ALLOWED_HOSTS=localhost,127.0.0.1,timely.stellarbit.cc` (Ajoutez vos domaines)

---

## 4. Lancement de l'Application

Démarrez les conteneurs avec le fichier compose de production :
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

*Cette commande va :*
1. Compiler l'application React et l'intégrer à un serveur Nginx optimisé.
2. Installer les dépendances Python du backend (sans Node.js).
3. Exécuter automatiquement les migrations de base de données.
4. Rassembler les fichiers statiques de l'administration Django dans `/app/staticfiles` (distribués par Whitenoise).
5. Démarrer le serveur Gunicorn avec 3 workers en production.

---

## 5. Configuration Cloudflare Zero Trust (Tunnel)

Avec cette architecture, un seul point d'entrée HTTP (port 80 de l'hôte) est nécessaire :

1. Rendez-vous sur votre tableau de bord **Cloudflare Zero Trust** > **Networks** > **Tunnels**.
2. Créez un nouveau tunnel (ex: `timely-tunnel`).
3. Installez le connecteur `cloudflared` sur votre machine Debian 13 en suivant la commande fournie par Cloudflare (en tant que service systemd).
4. Configurez un **Public Hostname** pour votre tunnel :
   - **Subdomain/Domain** : `timely.stellarbit.cc` (ou votre propre domaine)
   - **Service Type** : `HTTP`
   - **URL** : `localhost:80` (Le port exposé par le conteneur `frontend` Nginx)

Vous n'avez pas besoin d'ouvrir de ports sur votre box internet ni de configurer d'autres noms de domaine ou tunnels pour l'API.

---

## 6. Routine de Mise à Jour (CI/CD ou Manuel)

Pour appliquer une mise à jour suite à des modifications poussées sur la branche `prod` :

```bash
# 1. Tirer les dernières modifications
git pull origin prod

# 2. Reconstruire et relancer les conteneurs en tâche de fond
docker compose -f docker-compose.prod.yml up --build -d
```
Les migrations de base de données et la collecte des fichiers statiques se feront automatiquement au redémarrage du conteneur backend.

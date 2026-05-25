# Timely

Timely est une plateforme de réservation multisectorielle centralisant les secteurs de la beauté, de la restauration, de l'hôtellerie, du voyage et des démarches administratives.

## Architecture technique
- **Framework MVC** : Django (Python)
- **Base de données** : PostgreSQL
- **Front-end** : TailwindCSS v4 + DaisyUI
- **Environnement** : Docker & Docker Compose

## Prérequis
- Docker Desktop (Windows/Mac) ou OrbStack (Mac)
- Git

## Installation et démarrage du projet (Pour Sara et Arthur)

1. **Cloner le projet**
   ```bash
   git clone https://github.com/Accoows/timely.git
   cd timely
   ```

2. **Configuration de l'environnement**
   Copier le fichier d'exemple pour créer votre configuration locale :
   ```bash
   cp .env.example .env
   ```
   (Vous pouvez modifier les mots de passe locaux dans ce fichier `.env` si besoin, il ne sera pas versionné sur Git).

3. **Lancer les conteneurs Docker**
   Cette commande télécharge les images, installe les dépendances Python et Node.js, et lance le serveur web ainsi que la base de données.
   ```bash
   docker-compose up --build -d
   ```
   *(Le flag `-d` permet de lancer les conteneurs en arrière-plan).*

4. **Appliquer les migrations de la base de données**
   ```bash
   docker-compose exec web python manage.py migrate
   ```

5. **Travailler sur le design (TailwindCSS)**
   **TRÈS IMPORTANT** : Si vos pages s'affichent sans aucun style (texte brut noir et blanc), c'est que le compilateur Tailwind n'est pas lancé ! 
   Pour que vos classes CSS et composants DaisyUI soient pris en compte à chaque modification de vos fichiers HTML, vous devez **toujours** laisser tourner ce "watcher" dans un terminal séparé :
   ```bash
   docker-compose exec web python manage.py tailwind start
   ```
   *Note pour la production* : En environnement de production, le watcher n'est pas utilisé. Lors du déploiement, il suffira de générer le fichier CSS compressé et optimisé une seule fois avec la commande :
   ```bash
   python manage.py tailwind build
   ```

### Accès au site et Dépannage
- Le site est accessible **uniquement** sur : `http://localhost:8000` ou `http://127.0.0.1:8000`. 
- **Attention** : Si les logs affichent `0.0.0.0:8000`, n'utilisez pas cette adresse dans votre navigateur (cela provoque une erreur sur Mac/Windows).
- **En cas de crash du serveur** (par exemple `ERR_CONNECTION_RESET` suite à l'installation d'un package), redémarrez simplement le conteneur web avec :
  ```bash
  docker-compose restart web
  ```
- **Pour voir les logs du serveur** si quelque chose ne marche pas :
  ```bash
  docker-compose logs -f web
  ```

### Gestion de la Base de Données (PostgreSQL)
Si suite à de multiples changements de branches Git, votre schéma de base de données local est corrompu ou désynchronisé (erreurs SQL au démarrage), vous pouvez réinitialiser totalement la base de données locale. 
**ATTENTION : Cette action effacera toutes les données locales de développement.**
```bash
# 1. Arrêter les conteneurs et détruire le volume de la base de données
docker-compose down -v

# 2. Relancer l'environnement (une BDD vierge sera créée)
docker-compose up -d

# 3. Réappliquer les migrations propres depuis zéro
docker-compose exec web python manage.py migrate
```

---

## Workflow Git & Docker (Développement quotidien)

Le projet utilisant un système de branches de développement (feature branches), suivez cette procédure pour garantir la synchronisation de l'environnement lors d'un changement de contexte ou d'une reprise de session :

1. **Synchronisation et sélection de la branche de travail :**
   Mettez à jour les références distantes et positionnez-vous sur la branche adéquate.
   ```bash
   git fetch origin
   git checkout <nom-de-la-branche>
   git pull origin <nom-de-la-branche>
   ```
2. **Démarrage des conteneurs :**
   ```bash
   docker-compose up -d
   ```
   *Note : Ajoutez le flag `--build` si le fichier `requirements.txt` a été modifié sur cette branche.*
3. **Application des migrations :**
   Permet de synchroniser le schéma de base de données local avec les potentiels nouveaux modèles liés à la branche active.
   ```bash
   docker-compose exec web python manage.py migrate
   ```
4. **Initialisation du watcher TailwindCSS :**
   À exécuter dans une session de terminal distincte pour activer la compilation CSS JIT (Just-In-Time).
   ```bash
   docker-compose exec web python manage.py tailwind start
   ```

---

## Architecture et Structure du Projet

Le projet respecte la modularité standard de Django via la création d'applications (modules).

- **`timely_app/` (Configuration globale)** : Contient les variables d'environnement, les configurations de la base de données (`settings.py`), et le routeur principal (`urls.py`). Ce répertoire ne doit contenir aucune logique métier (views/models).
- **`theme/` (Configuration front-end)** : Généré par `django-tailwind`. Contient la configuration Node.js et les fichiers CSS d'entrée. La modification des règles CSS globales s'effectue dans `theme/static_src/styles.css`. Les fichiers Python de ce répertoire ne nécessitent pas de modification.
- **`pages/` (Application Django type)** : Module dédié à la logique métier (ex: pages statiques). Les futures fonctionnalités (ex: `accounts`, `bookings`) suivront cette même architecture :
  - `urls.py` : Routage interne du module.
  - `views.py` : Logique applicative et traitement des requêtes.
  - `templates/` : Fichiers HTML utilisant les classes utilitaires Tailwind.

**Création d'une nouvelle application métier :**
```bash
docker-compose exec web python manage.py startapp accounts
```
*Toute nouvelle application doit être déclarée dans la variable `INSTALLED_APPS` du fichier `settings.py`.*


---

## Prochaines étapes de développement (CRITIQUE)

Avant de commencer a coder la logique métier ou de modifier la base de données, la prochaine étape obligatoire est la creation du système d'authentification.

### 1. Creation d'un Modèle Utilisateur Personnalisé (Custom User Model)
Puisque Timely gère deux types d'utilisateurs distincts (Clients et Professionnels), il est imperatif de configurer un `Custom User Model` dans Django avant toute autre migration.

**Etapes a suivre lors de la prochaine session :**
- Creer une nouvelle application Django nommée `accounts`.
- Creer un modèle `User` héritant de `AbstractUser`.
- Ajouter un champ pour definir le role (par exemple un champ booleen `is_professional` ou un Enum pour les roles).
- Definir `AUTH_USER_MODEL = 'accounts.User'` dans `settings.py`.
- Faire la premiere migration initiale de ce modèle.

### 2. Creation de la configuration dynamique par secteur
- Modelisation des secteurs d'activite (Beauté, Restauration, etc.).
- Mise en place des systemes de tri et de recherche.

### 3. Integration du calendrier
- Mise en place de la bibliotheque FullCalendar.
- Creation des routes API pour communiquer les disponibilites entre le back-end et FullCalendar.

#!/bin/sh

# 0. Attendre que la base de données soit prête
echo "[Django] Attente de la base de données..."
python manage.py shell -c "
import sys
import time
from django.db import connections
from django.db.utils import OperationalError

attempts = 0
while attempts < 30:
    try:
        connections['default'].cursor()
        print('Base de données prête !')
        sys.exit(0)
    except OperationalError:
        attempts += 1
        print(f'Attente de la base de données ({attempts}/30)...')
        time.sleep(1)
print('Erreur : La base de données n\'a pas répondu à temps.')
sys.exit(1)
"

# 1. Apply database migrations
echo "[Django] Appliquer les migrations de base de données..."
python manage.py migrate --noinput

# 2. Collect static files
echo "[Django] Collecte des fichiers statiques (Whitenoise)..."
python manage.py collectstatic --noinput

# 2.5. Créer ou synchroniser le superutilisateur
echo "[Django] Vérification et synchronisation du superutilisateur..."
SUPERUSER_USERNAME=${DJANGO_SUPERUSER_USERNAME:-admin}
SUPERUSER_PASSWORD=${DJANGO_SUPERUSER_PASSWORD:-AZEqsd123!}
SUPERUSER_EMAIL=${DJANGO_SUPERUSER_EMAIL:-admin@example.com}

python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
username = '$SUPERUSER_USERNAME'
email = '$SUPERUSER_EMAIL'
password = '$SUPERUSER_PASSWORD'

user, created = User.objects.get_or_create(username=username, defaults={'email': email})
user.set_password(password)
user.is_superuser = True
user.is_staff = True
user.is_active = True
user.save()
if created:
    print(f'Superutilisateur \"{username}\" cree avec succes.')
else:
    print(f'Le superutilisateur \"{username}\" existait deja, mot de passe synchronise.')
"

# 2.7. Remplissage de la base de données (seeding)
echo "[Django] Remplissage de la base de données avec le seed..."
python manage.py seed_establishments

# 3. Start Gunicorn WSGI server
echo "[Django] Démarrage du serveur Gunicorn en production..."
exec gunicorn timely_app.wsgi:application --bind 0.0.0.0:8000 --workers 3

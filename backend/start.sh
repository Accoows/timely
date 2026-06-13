#!/bin/sh

# 1. Appliquer les migrations de base de données
echo "[Django] Application des migrations..."
python manage.py migrate --noinput

# 1.5. Créer le superutilisateur par défaut si absent
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
    print(f'Superutilisateur \"{username}\" cree avec le mot de passe \"{password}\"')
else:
    print(f'Le superutilisateur \"{username}\" existait deja, mot de passe synchronise.')
"

# 2. Lancer le serveur Django au premier plan
echo "
===================================================================
 TIMELY A DÉMARRÉ AVEC SUCCÈS !
===================================================================
 Interface Web (React Frontend)     : http://localhost:5173
 API REST & Admin (Django Backend) : http://localhost:8000
 Base de données (Adminer)          : http://localhost:8080
===================================================================
"
exec python manage.py runserver 0.0.0.0:8000

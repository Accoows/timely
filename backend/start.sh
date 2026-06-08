#!/bin/sh

# 1. Appliquer les migrations de base de données
echo "[Django] Application des migrations..."
python manage.py migrate --noinput

# 2. Lancer le serveur Django au premier plan
echo "
===================================================================
 TIMELY A DÉMARRÉ AVEC SUCCÈS !
===================================================================
 Interface Web (React Frontend)     : http://localhost:5173
 API REST & Admin (Django Backend) : http://localhost:8000
===================================================================
"
exec python manage.py runserver 0.0.0.0:8000

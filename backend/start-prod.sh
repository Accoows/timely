#!/bin/sh

# 1. Apply database migrations
echo "[Django] Appliquer les migrations de base de données..."
python manage.py migrate --noinput

# 2. Collect static files
echo "[Django] Collecte des fichiers statiques (Whitenoise)..."
python manage.py collectstatic --noinput

# 3. Start Gunicorn WSGI server
echo "[Django] Démarrage du serveur Gunicorn en production..."
exec gunicorn timely_app.wsgi:application --bind 0.0.0.0:8000 --workers 3

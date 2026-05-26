#!/bin/sh

# 1. Installer les dépendances Tailwind si node_modules n'existe pas
if [ ! -d "/app/theme/static_src/node_modules" ]; then
    echo "[Tailwind] Installation des dépendances front-end (première fois)..."
    python manage.py tailwind install
fi

# 2. Lancer le watcher Tailwind en arrière-plan
echo "[Tailwind] Lancement du watcher CSS..."
python manage.py tailwind start &

# 3. Lancer le serveur Django au premier plan
echo "[Django] Lancement du serveur de développement..."
exec python manage.py runserver 0.0.0.0:8000

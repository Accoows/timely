from django.contrib import admin
from .models import Reservation

# Enregistrement du modèle Reservation dans l'interface d'administration Django.
# Permet de superviser, modifier ou supprimer les rendez-vous pris par les clients.

admin.site.register(Reservation)

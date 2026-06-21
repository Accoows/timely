from django.contrib import admin
from .models import Client, Gerant, Professionnel

# Enregistrement des modèles d'authentification et de profils dans l'interface d'administration Django.
# Cela permet aux administrateurs de visualiser, ajouter ou modifier les profils Client, Gérant et Professionnel.

admin.site.register(Client)
admin.site.register(Gerant)
admin.site.register(Professionnel)


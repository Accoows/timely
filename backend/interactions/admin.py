from django.contrib import admin
from .models import Favoris, Avis

# Enregistrement des modèles d'interactions dans l'interface d'administration Django.
# Permet de modérer ou analyser les avis laissés par les clients et de consulter la liste des favoris.

admin.site.register(Favoris)
admin.site.register(Avis)

from django.contrib import admin
from .models import Secteur, Lieu, Etablissement, Prestation, Photo

# Enregistrement des modèles liés aux établissements dans l'interface d'administration Django.
# Permet de gérer la structure des secteurs d'activité, les adresses (lieux), 
# les fiches d'établissement, les fiches de prestations et les photos associées.

admin.site.register(Secteur)
admin.site.register(Lieu)
admin.site.register(Etablissement)
admin.site.register(Prestation)
admin.site.register(Photo)



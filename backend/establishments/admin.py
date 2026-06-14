from django.contrib import admin
from .models import Secteur, Lieu, Etablissement, Prestation, Photo

admin.site.register(Secteur)
admin.site.register(Lieu)
admin.site.register(Etablissement)
admin.site.register(Prestation)
admin.site.register(Photo)



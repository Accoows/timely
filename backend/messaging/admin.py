from django.contrib import admin
from .models import Discussion, Message

# Enregistrement des modèles de messagerie instantanée dans l'administration Django.
# Permet de visualiser les fils de discussion actifs et l'historique des messages échangés.

admin.site.register(Discussion)
admin.site.register(Message)

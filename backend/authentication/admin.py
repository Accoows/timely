from django.contrib import admin

from .models import Client
from .models import Gerant
from .models import Professionnel

admin.site.register(Client)
admin.site.register(Gerant)
admin.site.register(Professionnel)


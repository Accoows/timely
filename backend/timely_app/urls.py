from django.contrib import admin
from django.urls import path, include
from django.conf import settings

admin_url = getattr(settings, 'ADMIN_URL', 'backoffice/')
if not admin_url.endswith('/'):
    admin_url += '/'

urlpatterns = [
    path(admin_url, admin.site.urls),
    path('', include('core.urls')), # Redirige l'URL racine vers l'app "core"
]

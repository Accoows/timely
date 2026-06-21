from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

admin_url = getattr(settings, 'ADMIN_URL', 'backoffice/')
if not admin_url.endswith('/'):
    admin_url += '/'

urlpatterns = [
    path(admin_url, admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/establishments/', include('establishments.urls')),
    path('api/bookings/', include('bookings.urls')),
    path('api/messaging/', include('messaging.urls')),
    path('api/interactions/', include('interactions.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
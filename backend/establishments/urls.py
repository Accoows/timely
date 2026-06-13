from django.urls import path
from . import views

urlpatterns = [
    # URL finale : /api/establishments/explore/
    path('explore/', views.ExploreListView.as_view(), name='establishment_explore'),
    
    # URL finale : /api/establishments/sectors/
    path('sectors/', views.SectorListView.as_view(), name='sector_list'),
    
    # URL finale : /api/establishments/locations/
    path('locations/', views.LocationListView.as_view(), name='location_list'),
    
    # URL finale : /api/establishments/<id>/ (ex: /api/establishments/4/)
    path('<int:id>/', views.EstablishmentDetailView.as_view(), name='establishment_detail'),
    
    # URL finale : /api/establishments/<id>/services/ (gestion des prestations de l'établissement)
    path('<int:id>/services/', views.ServiceListView.as_view(), name='establishment_services'),
]
from django.urls import path
from . import views

urlpatterns = [
    path('explore/', views.ExploreListView.as_view(), name='establishment_explore'),
    path('sectors/', views.SectorListView.as_view(), name='sector_list'),
    path('locations/', views.LocationListView.as_view(), name='location_list'),
    path('register/', views.RegisterEstablishmentView.as_view(), name='establishment_register'),
    path('<int:id>/', views.EstablishmentDetailView.as_view(), name='establishment_detail'),
    path('<int:id>/upload-photo/', views.EstablishmentPhotoUploadView.as_view(), name='establishment_upload_photo'),
    path('<int:id>/services/', views.ServiceListView.as_view(), name='establishment_services'),
    path('services/<int:service_id>/', views.ServiceDetailView.as_view(), name='service_detail'),
]
from django.urls import path
from . import views

urlpatterns = [
    # L'URL racine de cette application renvoie vers la vue home_view
    path('', views.home_view, name='home'),
]

from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('api/popular-filter/', views.api_popular_establishments, name='api_popular_filter'),
]

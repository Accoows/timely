from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('', views.home_view, name='home'),
    path('popular-filter/', views.popular_filter_view, name='popular_filter'),
]

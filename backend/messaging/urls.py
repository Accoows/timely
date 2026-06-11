from django.urls import path
from . import views

urlpatterns = [
    path('discussions/', views.DiscussionListView.as_view(), name='messaging_discussions'),    
    path('discussions/<int:disc_id>/messages/', views.MessageCreateView.as_view(), name='messaging_messages_list'),
]
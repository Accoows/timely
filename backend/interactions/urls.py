from django.urls import path
from . import views

urlpatterns = [
    path('favorites/', views.FavoritesView.as_view(), name='interactions_favorites'),    
    path('review/', views.LeaveReviewView.as_view(), name='interactions_leave_review'),    
    path('admin/moderation/', views.AdminReviewModerationView.as_view(), name='interactions_admin_moderation'),
]
from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.LoginView.as_view(), name='auth_login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('register/', views.RegisterView.as_view(), name='auth_register'),    
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='auth_forgot_password'),    
    path('staff/', views.StaffListView.as_view(), name='auth_staff_list'),
    path('user/', views.UserView.as_view(), name='auth_user'),
    path('admin/users/', views.AdminUserManagementView.as_view(), name='admin_user_list'),
    path('admin/users/<int:user_id>/', views.AdminUserDetailView.as_view(), name='admin_user_detail'),
]
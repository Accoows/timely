from django.urls import path
from . import views

urlpatterns = [
    path('checkout/<int:booking_id>/', views.CheckoutView.as_view(), name='booking_checkout'),    
    path('success/', views.BookingSuccessView.as_view(), name='booking_success'),    
    path('dashboard/calendar/', views.DashboardCalendarView.as_view(), name='booking_dashboard_calendar'),    
    path('dashboard/pos/', views.DashboardPOSView.as_view(), name='booking_dashboard_pos'),    
    path('dashboard/invoices/', views.InvoiceListView.as_view(), name='booking_dashboard_invoices'),
]
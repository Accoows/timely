from django.views import View
from django.http import JsonResponse

class CheckoutView(View):
    def get(self, request, booking_id):
        return JsonResponse({"message": f"Checkout placeholder for booking id {booking_id}"}, status=200)

class BookingSuccessView(View):
    def get(self, request):
        return JsonResponse({"message": "Booking success placeholder"}, status=200)

class DashboardCalendarView(View):
    def get(self, request):
        return JsonResponse({"message": "Dashboard calendar placeholder"}, status=200)

class DashboardPOSView(View):
    def get(self, request):
        return JsonResponse({"message": "Dashboard POS placeholder"}, status=200)

class InvoiceListView(View):
    def get(self, request):
        return JsonResponse({"message": "Invoice list placeholder"}, status=200)

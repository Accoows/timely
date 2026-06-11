from django.views import View
from django.http import JsonResponse

class ExploreListView(View):
    def get(self, request):
        return JsonResponse({"message": "Explore list placeholder"}, status=200)

class EstablishmentDetailView(View):
    def get(self, request, id):
        return JsonResponse({"message": f"Establishment detail placeholder for id {id}"}, status=200)

class ServiceListView(View):
    def get(self, request, id):
        return JsonResponse({"message": f"Service list placeholder for establishment id {id}"}, status=200)

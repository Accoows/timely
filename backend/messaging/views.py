from django.views import View
from django.http import JsonResponse

class DiscussionListView(View):
    def get(self, request):
        return JsonResponse({"message": "Discussion list placeholder"}, status=200)

class MessageCreateView(View):
    def get(self, request, disc_id):
        return JsonResponse({"message": f"Message list placeholder for discussion id {disc_id}"}, status=200)
    def post(self, request, disc_id):
        return JsonResponse({"message": f"Create message placeholder for discussion id {disc_id}"}, status=201)

import json
from datetime import datetime, timedelta
from django.views import View
from django.http import JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from .models import Reservation
from authentication.models import Client, Professionnel
from establishments.models import Prestation

class BookingListView(View):
    def get(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
        
        user = request.user
        queryset = Reservation.objects.none()
        is_staff_view = False

        if hasattr(user, 'profil_client'):
            queryset = Reservation.objects.filter(client=user.profil_client)
        elif hasattr(user, 'profil_gerant'):
            queryset = Reservation.objects.filter(professionnel__etablissement__gerant=user.profil_gerant)
            is_staff_view = True
        elif hasattr(user, 'profil_pro'):
            queryset = Reservation.objects.filter(professionnel=user.profil_pro)
            is_staff_view = True
        elif user.is_staff:
            queryset = Reservation.objects.all()
            is_staff_view = True
            
        queryset = queryset.select_related(
            'client', 'client__utilisateur',
            'professionnel', 'professionnel__utilisateur',
            'prestation', 'professionnel__etablissement'
        ).order_by('date_heure')

        data = []
        for r in queryset:
            item = {
                "id": r.id,
                "date_heure": r.date_heure.isoformat(),
                "duree": r.duree,
                "status": r.status,
                "establishment_name": r.professionnel.etablissement.nom,
                "prestation": {
                    "id": r.prestation.id,
                    "nom": r.prestation.nom,
                    "cout": str(r.prestation.cout),
                    "description": r.prestation.description
                },
                "professionnel": {
                    "id": r.professionnel.id,
                    "nom": r.professionnel.utilisateur.last_name,
                    "prenom": r.professionnel.utilisateur.first_name,
                    "poste": r.professionnel.poste
                }
            }
            
            # Gérant, collaborateurs et admins ont accès aux détails du client
            if is_staff_view:
                item["client"] = {
                    "id": r.client.id,
                    "nom": r.client.utilisateur.last_name,
                    "prenom": r.client.utilisateur.first_name,
                    "email": r.client.utilisateur.email,
                    "telephone": r.client.telephone
                }
            data.append(item)
            
        return JsonResponse(data, safe=False, status=200)

    def post(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        user = request.user
        client = getattr(user, 'profil_client', None)
        is_staff_user = hasattr(user, 'profil_gerant') or hasattr(user, 'profil_pro') or user.is_staff
        
        try:
            data = json.loads(request.body)
            professionnel_id = data.get('professionnel_id')
            prestation_id = data.get('prestation_id')
            date_heure_str = data.get('date_heure')
            duree = data.get('duree')
            status = data.get('status', 'confirme')
            
            # Si c'est un gérant ou un employé, il peut réserver pour un client spécifique
            if is_staff_user:
                client_id = data.get('client_id')
                if client_id:
                    try:
                        client = Client.objects.get(id=client_id)
                    except Client.DoesNotExist:
                        return JsonResponse({"error": "Client spécifié non trouvé"}, status=404)
            
            if not client:
                return JsonResponse({"error": "Profil client requis pour la réservation"}, status=400)
                
            if not professionnel_id or not prestation_id or not date_heure_str:
                return JsonResponse({"error": "Champs professionnel_id, prestation_id et date_heure requis"}, status=400)
                
            try:
                professionnel = Professionnel.objects.get(id=professionnel_id)
            except Professionnel.DoesNotExist:
                return JsonResponse({"error": "Professionnel non trouvé"}, status=404)
                
            try:
                prestation = Prestation.objects.get(id=prestation_id)
            except Prestation.DoesNotExist:
                return JsonResponse({"error": "Prestation non trouvée"}, status=404)
                
            # Analyser la date
            dt = parse_datetime(date_heure_str)
            if not dt:
                return JsonResponse({"error": "Format date_heure invalide (utilisez ISO 8601)"}, status=400)
            if timezone.is_naive(dt):
                dt = timezone.make_aware(dt, timezone.get_default_timezone())
                
            # Déterminer la durée
            if not duree:
                duree = 30 # défaut 30 minutes
            else:
                duree = int(duree)
                
            # Vérification de non-chevauchement
            start_time = dt
            end_time = dt + timedelta(minutes=duree)
            
            # Récupérer les réservations existantes du professionnel le même jour
            date_only = dt.date()
            existing_bookings = Reservation.objects.filter(
                professionnel=professionnel,
                status="confirme",
                date_heure__date=date_only
            )
            
            for eb in existing_bookings:
                eb_start = eb.date_heure
                eb_end = eb_start + timedelta(minutes=eb.duree)
                # Overlap condition: start1 < end2 AND end1 > start2
                if start_time < eb_end and end_time > eb_start:
                    return JsonResponse({"error": "Le créneau demandé chevauche un rendez-vous existant."}, status=400)
                    
            # Créer la réservation
            reservation = Reservation.objects.create(
                client=client,
                professionnel=professionnel,
                prestation=prestation,
                date_heure=dt,
                duree=duree,
                status=status
            )
            
            return JsonResponse({
                "status": "success",
                "message": "Réservation créée avec succès !",
                "booking": {
                    "id": reservation.id,
                    "date_heure": reservation.date_heure.isoformat(),
                    "duree": reservation.duree,
                    "status": reservation.status
                }
            }, status=201)
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


class BookingDetailView(View):
    def delete(self, request, booking_id):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            reservation = Reservation.objects.get(id=booking_id)
        except Reservation.DoesNotExist:
            return JsonResponse({"error": "Réservation non trouvée"}, status=404)
            
        user = request.user
        authorized = False
        
        # Vérifier les permissions
        if hasattr(user, 'profil_client') and reservation.client == user.profil_client:
            authorized = True
        elif hasattr(user, 'profil_gerant') and reservation.professionnel.etablissement.gerant == user.profil_gerant:
            authorized = True
        elif hasattr(user, 'profil_pro') and reservation.professionnel == user.profil_pro:
            authorized = True
        elif user.is_staff:
            authorized = True
            
        if not authorized:
            return JsonResponse({"error": "Accès interdit à cette réservation"}, status=403)
            
        reservation.delete()
        return JsonResponse({"status": "success", "message": "Réservation supprimée avec succès"}, status=200)


class AvailableSlotsView(View):
    def get(self, request):
        professionnel_id = request.GET.get('professionnel_id')
        date_str = request.GET.get('date') # Format YYYY-MM-DD
        
        if not professionnel_id or not date_str:
            return JsonResponse({"error": "Paramètres professionnel_id et date requis"}, status=400)
            
        try:
            professionnel = Professionnel.objects.get(id=professionnel_id)
        except Professionnel.DoesNotExist:
            return JsonResponse({"error": "Professionnel non trouvé"}, status=404)
            
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return JsonResponse({"error": "Format de date invalide (attendu: YYYY-MM-DD)"}, status=400)
            
        # Créneaux d'ouverture standard : 09:00 à 18:00, toutes les 30 minutes
        slots = []
        base_time = datetime.combine(target_date, datetime.min.time())
        
        # Définir les heures de début des créneaux
        start_hour = 9
        end_hour = 18
        current_time = base_time + timedelta(hours=start_hour)
        end_time = base_time + timedelta(hours=end_hour)
        
        # Récupérer les réservations du jour pour ce professionnel
        tz = timezone.get_default_timezone()
        existing_bookings = Reservation.objects.filter(
            professionnel=professionnel,
            status="confirme",
            date_heure__date=target_date
        )
        
        # Convertir les réservations existantes en datetime timezone-aware pour comparaison
        bookings_range = []
        for eb in existing_bookings:
            eb_start = eb.date_heure
            if timezone.is_naive(eb_start):
                eb_start = timezone.make_aware(eb_start, tz)
            eb_end = eb_start + timedelta(minutes=eb.duree)
            bookings_range.append((eb_start, eb_end))
            
        while current_time < end_time:
            # Slot de 30 minutes
            slot_start = timezone.make_aware(current_time, tz)
            slot_end = slot_start + timedelta(minutes=30)
            
            # Vérifier si ce créneau chevauche une réservation
            available = True
            for b_start, b_end in bookings_range:
                if slot_start < b_end and slot_end > b_start:
                    available = False
                    break
                    
            slots.append({
                "time": current_time.strftime('%H:%M'),
                "available": available
            })
            current_time += timedelta(minutes=30)
            
        return JsonResponse({"status": "success", "date": date_str, "slots": slots}, status=200)


class DashboardCalendarView(View):
    def get(self, request):
        # Permet de récupérer les événements du calendrier de l'établissement
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        user = request.user
        queryset = Reservation.objects.none()
        
        if hasattr(user, 'profil_gerant'):
            queryset = Reservation.objects.filter(professionnel__etablissement__gerant=user.profil_gerant)
        elif hasattr(user, 'profil_pro'):
            queryset = Reservation.objects.filter(professionnel__etablissement=user.profil_pro.etablissement)
        elif user.is_staff:
            queryset = Reservation.objects.all()
        else:
            return JsonResponse({"error": "Accès interdit"}, status=403)
            
        queryset = queryset.select_related('client', 'client__utilisateur', 'professionnel', 'professionnel__utilisateur', 'prestation')
        
        events = []
        for r in queryset:
            events.append({
                "id": r.id,
                "title": f"{r.prestation.nom} - {r.client.utilisateur.first_name} {r.client.utilisateur.last_name}",
                "start": r.date_heure.isoformat(),
                "end": (r.date_heure + timedelta(minutes=r.duree)).isoformat(),
                "status": r.status,
                "prestation": r.prestation.nom,
                "professionnel": {
                    "id": r.professionnel.id,
                    "nom_complet": f"{r.professionnel.utilisateur.first_name} {r.professionnel.utilisateur.last_name}"
                },
                "client": {
                    "id": r.client.id,
                    "nom_complet": f"{r.client.utilisateur.first_name} {r.client.utilisateur.last_name}",
                    "email": r.client.utilisateur.email,
                    "telephone": r.client.telephone
                }
            })
            
        return JsonResponse({"status": "success", "events": events}, status=200)


class CheckoutView(View):
    def get(self, request, booking_id):
        return JsonResponse({"message": f"Checkout placeholder for booking id {booking_id}"}, status=200)

class BookingSuccessView(View):
    def get(self, request):
        return JsonResponse({"message": "Booking success placeholder"}, status=200)

class DashboardPOSView(View):
    def get(self, request):
        return JsonResponse({"message": "Dashboard POS placeholder"}, status=200)

class InvoiceListView(View):
    def get(self, request):
        return JsonResponse({"message": "Invoice list placeholder"}, status=200)


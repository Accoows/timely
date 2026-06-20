import json
from datetime import datetime, timedelta
from django.views import View
from django.http import JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.shortcuts import redirect
import stripe
from django.conf import settings
from .models import Reservation, Facture
from authentication.models import Client, Professionnel
from establishments.models import Prestation

stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')

def get_frontend_url(request):
    public_url = getattr(settings, 'PUBLIC_URL', 'https://timely.stellarbit.cc')
    origin = request.headers.get('Origin') or request.META.get('HTTP_ORIGIN')
    if origin:
        if "localhost" not in origin and "127.0.0.1" not in origin:
            return public_url
        return origin
    referer = request.headers.get('Referer') or request.META.get('HTTP_REFERER')
    if referer:
        if "localhost" not in referer and "127.0.0.1" not in referer:
            return public_url
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        return f"{parsed.scheme}://{parsed.netloc}"
    return "http://localhost:5173"

def get_backend_url(request):
    frontend_url = get_frontend_url(request)
    public_url = getattr(settings, 'PUBLIC_URL', 'https://timely.stellarbit.cc')
    
    if public_url in frontend_url:
        return public_url
        
    host = request.get_host()
    if "localhost" not in host and "127.0.0.1" not in host and "backend" not in host:
        return public_url
        
    if "localhost" in frontend_url or "localhost" in host:
        return "http://localhost:8000"
        
    scheme = 'https' if request.headers.get('X-Forwarded-Proto') == 'https' or request.is_secure() else 'http'
    if host.startswith("backend"):
        return "http://localhost:8000"
    return f"{scheme}://{host}"




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
                "payment_method": r.payment_method,
                "payment_status": r.payment_status,
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
            payment_method = data.get('payment_method', 'on_site')
            
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
                    
            # Déterminer les statuts par défaut selon la méthode de paiement
            status_val = "pending" if payment_method == "stripe" else "confirme"
            pay_status_val = "pending" if payment_method == "stripe" else "unpaid"

            # Créer la réservation
            reservation = Reservation.objects.create(
                client=client,
                professionnel=professionnel,
                prestation=prestation,
                date_heure=dt,
                duree=duree,
                status=status_val,
                payment_method=payment_method,
                payment_status=pay_status_val,
                payment_attempts=1 if payment_method == "stripe" else 0
            )
            
            payment_url = None
            if payment_method == "stripe":
                backend_url = get_backend_url(request)
                checkout_session = stripe.checkout.Session.create(
                    payment_method_types=['card'],
                    line_items=[{
                        'price_data': {
                            'currency': 'eur',
                            'product_data': {
                                'name': f"{prestation.nom} avec {professionnel.utilisateur.first_name}",
                            },
                            'unit_amount': int(prestation.cout * 100),
                        },
                        'quantity': 1,
                    }],
                    mode='payment',
                    success_url=f"{backend_url}/api/bookings/success/?session_id={{CHECKOUT_SESSION_ID}}",
                    cancel_url=f"{backend_url}/api/bookings/cancel/?booking_id={reservation.id}",
                    metadata={
                        'booking_id': str(reservation.id)
                    }
                )
                payment_url = checkout_session.url
                reservation.stripe_session_id = checkout_session.id
                reservation.save()

            return JsonResponse({
                "status": "success",
                "message": "Réservation créée avec succès !",
                "payment_url": payment_url,
                "booking": {
                    "id": reservation.id,
                    "date_heure": reservation.date_heure.isoformat(),
                    "duree": reservation.duree,
                    "status": reservation.status,
                    "payment_method": reservation.payment_method,
                    "payment_status": reservation.payment_status
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
            
        # Envoyer un message automatique au client si l'annulation est faite par l'établissement / le staff
        if not (hasattr(user, 'profil_client') and reservation.client == user.profil_client):
            try:
                from messaging.models import Discussion, Message
                discussion, created = Discussion.objects.get_or_create(
                    client=reservation.client,
                    etablissement=reservation.professionnel.etablissement
                )
                
                dt_local = timezone.localtime(reservation.date_heure)
                date_str = dt_local.strftime('%d/%m/%Y à %H:%M')
                msg_content = (
                    f"Bonjour, votre rendez-vous pour la prestation '{reservation.prestation.nom}' "
                    f"prévu le {date_str} a été annulé par l'établissement."
                )
                
                Message.objects.create(
                    discussion=discussion,
                    expediteur=user,
                    content=msg_content
                )
            except Exception as e:
                # Log the error but don't prevent deletion
                print(f"Erreur d'envoi du message d'annulation : {e}")

        # Check if the booking is paid and has a stripe session ID to issue a refund
        refunded = False
        is_paid = reservation.payment_status == "paid"
        
        if reservation.payment_method == "stripe" and is_paid and reservation.stripe_session_id:
            try:
                session = stripe.checkout.Session.retrieve(reservation.stripe_session_id)
                payment_intent_id = getattr(session, 'payment_intent', None) or session.get('payment_intent')
                if payment_intent_id:
                    stripe.Refund.create(
                        payment_intent=payment_intent_id
                    )
                    refunded = True
            except Exception as e:
                print(f"Stripe Refund failed: {e}")
                
        if is_paid:
            ref_year = reservation.created_at.year
            ref_str = f"FAC-{ref_year}-{reservation.id:04d}"
            Facture.objects.create(
                client=reservation.client,
                etablissement=reservation.professionnel.etablissement,
                establishment_name=reservation.professionnel.etablissement.nom,
                prestation_nom=reservation.prestation.nom,
                cout=reservation.prestation.cout,
                date_reservation=reservation.date_heure,
                payment_status="refunded" if refunded else "paid",
                reference=ref_str
            )
            
        reservation.delete()
        
        msg = "Réservation annulée avec succès et remboursée." if refunded else "Réservation annulée avec succès."
        return JsonResponse({"status": "success", "message": msg}, status=200)

    def put(self, request, booking_id):
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
            
        try:
            data = json.loads(request.body)
            date_heure_str = data.get('date_heure')
            if not date_heure_str:
                return JsonResponse({"error": "Le champ date_heure est requis"}, status=400)
                
            # Analyser la date
            dt = parse_datetime(date_heure_str)
            if not dt:
                return JsonResponse({"error": "Format date_heure invalide (utilisez ISO 8601)"}, status=400)
            if timezone.is_naive(dt):
                dt = timezone.make_aware(dt, timezone.get_default_timezone())
                
            # Vérification de non-chevauchement
            start_time = dt
            end_time = dt + timedelta(minutes=reservation.duree)
            
            # Récupérer les réservations existantes du professionnel le même jour, excluant celle-ci
            date_only = dt.date()
            existing_bookings = Reservation.objects.filter(
                professionnel=reservation.professionnel,
                status="confirme",
                date_heure__date=date_only
            ).exclude(id=reservation.id)
            
            for eb in existing_bookings:
                eb_start = eb.date_heure
                eb_end = eb_start + timedelta(minutes=eb.duree)
                # Overlap condition
                if start_time < eb_end and end_time > eb_start:
                    return JsonResponse({"error": "Le créneau demandé chevauche un rendez-vous existant."}, status=400)
                    
            # Mettre à jour la date_heure
            reservation.date_heure = dt
            reservation.save()
            
            return JsonResponse({
                "status": "success",
                "message": "Réservation mise à jour avec succès !",
                "booking": {
                    "id": reservation.id,
                    "date_heure": reservation.date_heure.isoformat(),
                    "duree": reservation.duree,
                    "status": reservation.status
                }
            }, status=200)
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


class AvailableSlotsView(View):
    def get(self, request):
        professionnel_id = request.GET.get('professionnel_id')
        date_str = request.GET.get('date') # Format YYYY-MM-DD
        exclude_booking_id = request.GET.get('exclude_booking_id')
        
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
        if exclude_booking_id:
            try:
                existing_bookings = existing_bookings.exclude(id=int(exclude_booking_id))
            except ValueError:
                pass
        
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
        elif user.is_staff or user.is_superuser:
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
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
        try:
            reservation = Reservation.objects.get(id=booking_id)
            if reservation.status == "cancelled":
                return JsonResponse({"error": "Ce rendez-vous a été annulé suite à trop de tentatives de paiement."}, status=400)
                
            # If they already tried twice (payment_attempts >= 2), cancel the booking
            if reservation.payment_attempts >= 2:
                reservation.status = "cancelled"
                reservation.save()
                return JsonResponse({"error": "Nombre maximal de tentatives de paiement atteint (2). Le rendez-vous est annulé."}, status=400)
                
            # Increment attempts
            reservation.payment_attempts += 1
            reservation.save()

            backend_url = get_backend_url(request)
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'eur',
                        'product_data': {
                            'name': f"{reservation.prestation.nom} avec {reservation.professionnel.utilisateur.first_name}",
                        },
                        'unit_amount': int(reservation.prestation.cout * 100),
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f"{backend_url}/api/bookings/success/?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{backend_url}/api/bookings/cancel/?booking_id={reservation.id}",
                metadata={
                    'booking_id': str(reservation.id)
                }
            )
            reservation.stripe_session_id = checkout_session.id
            reservation.save()
            return JsonResponse({"status": "success", "payment_url": checkout_session.url}, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

class BookingCancelView(View):
    def get(self, request):
        booking_id = request.GET.get('booking_id')
        if booking_id:
            try:
                reservation = Reservation.objects.get(id=booking_id)
                if reservation.payment_attempts >= 2:
                    reservation.status = "cancelled"
                    reservation.save()
            except Exception as e:
                print(f"Error handling booking cancel: {e}")
        
        frontend_url = get_frontend_url(request)
        url = f"{frontend_url}/payment-confirmation?status=cancelled"
        if booking_id:
            url += f"&booking_id={booking_id}"
        return redirect(url)

class BookingSuccessView(View):
    def get(self, request):
        session_id = request.GET.get('session_id')
        booking_id = None
        if session_id:
            try:
                session = stripe.checkout.Session.retrieve(session_id)
                metadata = getattr(session, 'metadata', None) or session.get('metadata', {})
                if isinstance(metadata, dict):
                    booking_id = metadata.get('booking_id')
                else:
                    booking_id = getattr(metadata, 'booking_id', None)
                
                if booking_id:
                    reservation = Reservation.objects.get(id=booking_id)
                    reservation.status = "confirme"
                    reservation.payment_status = "paid"
                    reservation.save()
            except Exception as e:
                print(f"Error confirming payment: {e}")
        
        frontend_url = get_frontend_url(request)
        url = f"{frontend_url}/payment-confirmation?status=success"
        if booking_id:
            url += f"&booking_id={booking_id}"
        return redirect(url)

class DashboardPOSView(View):
    def get(self, request):
        return JsonResponse({"message": "Dashboard POS placeholder"}, status=200)

class InvoiceListView(View):
    def get(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
        
        user = request.user
        invoices = []
        
        if hasattr(user, 'profil_client'):
            reservations = Reservation.objects.filter(client=user.profil_client).select_related(
                'prestation', 'professionnel__etablissement'
            ).order_by('-created_at')
            for r in reservations:
                ref_year = r.created_at.year
                invoices.append({
                    "id": r.id,
                    "reference": f"FAC-{ref_year}-{r.id:04d}",
                    "establishment_name": r.professionnel.etablissement.nom,
                    "date": r.created_at.strftime('%d/%m/%Y'),
                    "amount": f"{r.prestation.cout} €",
                    "status": "success" if r.payment_status == "paid" else "pending"
                })
            
            factures = Facture.objects.filter(client=user.profil_client).order_by('-created_at')
            for f in factures:
                invoices.append({
                    "id": f.id,
                    "reference": f.reference,
                    "establishment_name": f.establishment_name,
                    "date": f.date_reservation.strftime('%d/%m/%Y'),
                    "amount": f"{f.cout} €",
                    "status": "refunded" if f.payment_status == "refunded" else "success" if f.payment_status == "paid" else "pending"
                })
                
        elif hasattr(user, 'profil_gerant'):
            reservations = Reservation.objects.filter(
                professionnel__etablissement__gerant=user.profil_gerant
            ).select_related('prestation', 'professionnel__etablissement').order_by('-created_at')
            for r in reservations:
                ref_year = r.created_at.year
                invoices.append({
                    "id": r.id,
                    "reference": f"FAC-{ref_year}-{r.id:04d}",
                    "establishment_name": r.professionnel.etablissement.nom,
                    "date": r.created_at.strftime('%d/%m/%Y'),
                    "amount": f"{r.prestation.cout} €",
                    "status": "success" if r.payment_status == "paid" else "pending"
                })
            
            factures = Facture.objects.filter(etablissement__gerant=user.profil_gerant).order_by('-created_at')
            for f in factures:
                invoices.append({
                    "id": f.id,
                    "reference": f.reference,
                    "establishment_name": f.establishment_name,
                    "date": f.date_reservation.strftime('%d/%m/%Y'),
                    "amount": f"{f.cout} €",
                    "status": "refunded" if f.payment_status == "refunded" else "success" if f.payment_status == "paid" else "pending"
                })
                
        elif hasattr(user, 'profil_pro'):
            reservations = Reservation.objects.filter(
                professionnel=user.profil_pro
            ).select_related('prestation', 'professionnel__etablissement').order_by('-created_at')
            for r in reservations:
                ref_year = r.created_at.year
                invoices.append({
                    "id": r.id,
                    "reference": f"FAC-{ref_year}-{r.id:04d}",
                    "establishment_name": r.professionnel.etablissement.nom,
                    "date": r.created_at.strftime('%d/%m/%Y'),
                    "amount": f"{r.prestation.cout} €",
                    "status": "success" if r.payment_status == "paid" else "pending"
                })
            
            factures = Facture.objects.filter(etablissement=user.profil_pro.etablissement).order_by('-created_at')
            for f in factures:
                invoices.append({
                    "id": f.id,
                    "reference": f.reference,
                    "establishment_name": f.establishment_name,
                    "date": f.date_reservation.strftime('%d/%m/%Y'),
                    "amount": f"{f.cout} €",
                    "status": "refunded" if f.payment_status == "refunded" else "success" if f.payment_status == "paid" else "pending"
                })
        
        invoices.sort(key=lambda x: x['reference'], reverse=True)
        return JsonResponse({"invoices": invoices}, status=200)


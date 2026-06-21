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
from urllib.parse import urlparse
from messaging.models import Discussion, Message


# Configuration globale de la clé secrète Stripe
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')

def get_frontend_url(request):
    """
    Détermine l'URL de base du client (Frontend React) en fonction de la provenance de la requête.

    Gère le cas local (localhost) et l'URL publique de production.
    """
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
        parsed = urlparse(referer)
        return f"{parsed.scheme}://{parsed.netloc}"
    return "http://localhost:5173"

def get_backend_url(request):
    """
    Détermine l'URL de base du serveur (Backend Django) pour configurer les URLs de retour Stripe.
    """
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
    """
    Vue Django pour lister les réservations d'un utilisateur et en créer de nouvelles.
    """

    def get(self, request):
        """
        Récupère la liste des réservations en filtrant en fonction du rôle de l'utilisateur connecté.

        Comportement de filtrage :
        - Client : uniquement ses propres réservations.
        - Gérant : toutes les réservations des collaborateurs de ses établissements.
        - Professionnel : uniquement ses propres rendez-vous attribués.
        - Admin : l'intégralité des réservations de la plateforme.

        Retourne :
        - JsonResponse contenant le tableau de réservations formaté pour le frontend.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
        
        user = request.user
        queryset = Reservation.objects.none()
        is_staff_view = False

        # Sélection des filtres selon le profil
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
            
        # Chargement optimisé des relations
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
            
            # Droits staff : ajout des détails nominatifs du client
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
        """
        Enregistre une nouvelle réservation (créneau horaire bloqué).

        Données JSON attendues :
        - professionnel_id : ID du collaborateur choisi.
        - prestation_id : ID du service demandé.
        - date_heure : Date et heure ISO 8601 du début du rendez-vous.
        - duree : Durée en minutes (défaut : 30).
        - payment_method : 'on_site' ou 'stripe' (défaut : 'on_site').
        - client_id : (Uniquement pour le staff/gérant) ID du client pour qui réserver.

        Retourne :
        - JsonResponse contenant les détails de la réservation et l'URL de paiement Stripe si requise.
        """
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
            
            # Le staff de l'établissement peut réserver à la place d'un client spécifique
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
                
            # Parsing et validation de la date et heure du rendez-vous
            dt = parse_datetime(date_heure_str)
            if not dt:
                return JsonResponse({"error": "Format date_heure invalide (utilisez ISO 8601)"}, status=400)
            if timezone.is_naive(dt):
                dt = timezone.make_aware(dt, timezone.get_default_timezone())
                
            # Détermination de la durée effective (défaut sur 30 minutes)
            if not duree:
                duree = 30
            else:
                duree = int(duree)
                
            # Algorithme de vérification des chevauchements (double booking)
            start_time = dt
            end_time = dt + timedelta(minutes=duree)
            
            date_only = dt.date()
            existing_bookings = Reservation.objects.filter(
                professionnel=professionnel,
                status="confirme",
                date_heure__date=date_only
            )
            
            for eb in existing_bookings:
                eb_start = eb.date_heure
                eb_end = eb_start + timedelta(minutes=eb.duree)
                if start_time < eb_end and end_time > eb_start:
                    return JsonResponse({"error": "Le créneau demandé chevauche un rendez-vous existant."}, status=400)
                    
            # Si paiement en ligne via Stripe, le rendez-vous est bloqué au statut temporaire 'pending'
            status_val = "pending" if payment_method == "stripe" else "confirme"
            pay_status_val = "pending" if payment_method == "stripe" else "unpaid"

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
                # Création de la session Stripe Checkout
                checkout_session = stripe.checkout.Session.create(
                    payment_method_types=['card'],
                    line_items=[{
                        'price_data': {
                            'currency': 'eur',
                            'product_data': {
                                'name': f"{prestation.nom} avec {professionnel.utilisateur.first_name}",
                            },
                            'unit_amount': int(prestation.cout * 100), # Stripe fonctionne en centimes
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
    """
    Vue Django pour gérer le détail d'une réservation (annulation ou replanification).
    """

    def delete(self, request, booking_id):
        """
        Annule une réservation et gère les remboursements et notifications.

        Comportement :
        - Valide l'autorisation (Auteur du RDV, Gérant de l'établissement ou Administrateur).
        - Si annulé par le staff, envoie un message automatique dans la messagerie client.
        - Si la réservation est payée par Stripe, procède à un remboursement automatique via Stripe.
        - Génère un reçu d'annulation / avoir (Facture) si elle était payée.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        try:
            reservation = Reservation.objects.get(id=booking_id)
        except Reservation.DoesNotExist:
            return JsonResponse({"error": "Réservation non trouvée"}, status=404)
            
        user = request.user
        authorized = False
        
        # Contrôle des permissions d'accès
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
            
        # Notification automatique par chat si annulé par le commerçant ou staff
        if not (hasattr(user, 'profil_client') and reservation.client == user.profil_client):
            try:
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
                print(f"Erreur d'envoi du message d'annulation : {e}")

        # Traitement du remboursement automatique sur Stripe
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
                
        # Génération d'une facture d'avoir ou annulation
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
        """
        Met à jour la date et l'heure (replanification) d'une réservation existante.

        Données JSON attendues :
        - date_heure : La nouvelle date/heure de réservation (ISO 8601).
        """
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
                
            # Parse de la date
            dt = parse_datetime(date_heure_str)
            if not dt:
                return JsonResponse({"error": "Format date_heure invalide (utilisez ISO 8601)"}, status=400)
            if timezone.is_naive(dt):
                dt = timezone.make_aware(dt, timezone.get_default_timezone())
                
            # Vérification d'absence de chevauchement sur le nouveau créneau
            start_time = dt
            end_time = dt + timedelta(minutes=reservation.duree)
            
            # Recherche des autres réservations confirmées de ce professionnel à cette date (excluant celle en cours)
            date_only = dt.date()
            existing_bookings = Reservation.objects.filter(
                professionnel=reservation.professionnel,
                status="confirme",
                date_heure__date=date_only
            ).exclude(id=reservation.id)
            
            for eb in existing_bookings:
                eb_start = eb.date_heure
                eb_end = eb_start + timedelta(minutes=eb.duree)
                if start_time < eb_end and end_time > eb_start:
                    return JsonResponse({"error": "Le créneau demandé chevauche un rendez-vous existant."}, status=400)
                    
            # Enregistrement
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
    """
    Vue Django pour lister les créneaux de 30 minutes libres pour un professionnel et un jour donné.
    """

    def get(self, request):
        """
        Génère dynamiquement les tranches de 30 minutes de la journée en marquant leur disponibilité.

        Paramètres de requête (GET) :
        - professionnel_id : ID du professionnel.
        - date : Date cible (format YYYY-MM-DD).
        - exclude_booking_id : ID de réservation à ignorer pour les calculs de disponibilité (utile en cas de replanification).
        """
        professionnel_id = request.GET.get('professionnel_id')
        date_str = request.GET.get('date')
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
            
        etablissement = professionnel.etablissement
        horaires = etablissement.horaires or {}
        
        # Mapping en français pour l'évaluation des jours
        days_mapping = {
            0: "Lundi",
            1: "Mardi",
            2: "Mercredi",
            3: "Jeudi",
            4: "Vendredi",
            5: "Samedi",
            6: "Dimanche"
        }
        day_name = days_mapping[target_date.weekday()]
        day_schedule = horaires.get(day_name, "Fermé")
        
        # Si l'établissement est fermé ce jour-là
        if "fermé" in day_schedule.lower():
            return JsonResponse({"status": "success", "date": date_str, "slots": []}, status=200)
            
        # Extraction des heures d'ouverture (ex: "09:00 - 18:00") par expression régulière
        import re
        match = re.search(r'(\d{1,2})[:h](\d{2})\s*-\s*(\d{1,2})[:h](\d{2})', day_schedule.lower())
        if not match:
            return JsonResponse({"status": "success", "date": date_str, "slots": []}, status=200)
            
        sh, sm, eh, em = map(int, match.groups())
        base_time = datetime.combine(target_date, datetime.min.time())
        start_time = base_time + timedelta(hours=sh, minutes=sm)
        end_time = base_time + timedelta(hours=eh, minutes=em)
        
        # Récupération des réservations déjà confirmées pour ce professionnel ce jour-là
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
        
        bookings_range = []
        for eb in existing_bookings:
            eb_start = eb.date_heure
            if timezone.is_naive(eb_start):
                eb_start = timezone.make_aware(eb_start, tz)
            eb_end = eb_start + timedelta(minutes=eb.duree)
            bookings_range.append((eb_start, eb_end))
            
        # Génération des créneaux par intervalles de 30 minutes
        slots = []
        current_time = start_time
        while current_time + timedelta(minutes=30) <= end_time:
            slot_start = timezone.make_aware(current_time, tz)
            slot_end = slot_start + timedelta(minutes=30)
            
            # Vérification de disponibilité du créneau
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
    """
    Vue Django fournissant les événements de réservation formatés pour le calendrier d'administration.
    """

    def get(self, request):
        """
        Renvoie la liste des réservations sous forme d'événements de calendrier.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
            
        user = request.user
        queryset = Reservation.objects.none()
        
        # Filtre en fonction du rôle
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
    """
    Vue Django pour initier une session de paiement Stripe pour une réservation en attente.
    """

    def get(self, request, booking_id):
        """
        Crée une session Stripe Checkout pour la réservation.

        Limite le nombre de tentatives de paiement à 2. Annule le rendez-vous si ce quota est dépassé.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
        try:
            reservation = Reservation.objects.get(id=booking_id)
            if reservation.status == "cancelled":
                return JsonResponse({"error": "Ce rendez-vous a été annulé suite à trop de tentatives de paiement."}, status=400)
                
            # Contrôle du nombre maximal de tentatives de paiement (anti-abus / blocage de créneaux)
            if reservation.payment_attempts >= 2:
                reservation.status = "cancelled"
                reservation.save()
                return JsonResponse({"error": "Nombre maximal de tentatives de paiement atteint (2). Le rendez-vous est annulé."}, status=400)
                
            # Incrémenter le nombre d'essais
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
    """
    Redirige l'utilisateur vers l'interface frontend suite à l'annulation d'un paiement Stripe.
    """

    def get(self, request):
        """
        Met à jour le statut du rendez-vous si le nombre maximal de tentatives est atteint, et redirige.
        """
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
    """
    Confirme le paiement et valide la réservation suite au retour de Stripe.
    """

    def get(self, request):
        """
        Valide le paiement auprès de Stripe, passe la réservation en 'confirme' ou 'paid', et redirige.
        """
        session_id = request.GET.get('session_id')
        booking_id = None
        if session_id:
            try:
                # Interroger Stripe pour confirmer la véracité de la session
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
    """
    Vue placeholder pour le Point de Vente (POS / Caisse physique).
    """

    def get(self, request):
        return JsonResponse({"message": "Dashboard POS placeholder"}, status=200)


class InvoiceListView(View):
    """
    Vue Django pour lister l'historique des factures de l'utilisateur (confirmées ou remboursées).
    """

    def get(self, request):
        """
        Récupère l'ensemble des reçus et factures d'un utilisateur.
        
        Unifie les réservations payées et les modèles historiques 'Facture' (avoirs/annulations)
        dans un tableau unique trié par référence.
        """
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Non authentifié"}, status=401)
        
        user = request.user
        invoices = []
        
        if hasattr(user, 'profil_client'):
            # Factures basées sur les réservations payées actives du client
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
            
            # Factures historiques issues du modèle Facture (remboursements, annulations)
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
            # Factures pour le gérant de l'établissement
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
            # Factures associées au professionnel (collaborateur)
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

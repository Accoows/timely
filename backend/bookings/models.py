from django.db import models
from authentication.models import Client, Professionnel
from establishments.models import Etablissement, Prestation

class Reservation(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='reservations')
    professionnel = models.ForeignKey(Professionnel, on_delete=models.CASCADE, related_name='reservations')
    prestation = models.ForeignKey(Prestation, on_delete=models.CASCADE, related_name='reservations')
    date_heure = models.DateTimeField()
    duree = models.PositiveIntegerField(default=30) 
    status = models.CharField(max_length=50, default="confirme")
    payment_method = models.CharField(max_length=50, default="on_site")
    payment_status = models.CharField(max_length=50, default="unpaid")
    payment_attempts = models.PositiveIntegerField(default=0)
    stripe_session_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Réservation"
        verbose_name_plural = "Réservations"
        ordering = ['-date_heure']

    def __str__(self):
        return f"RDV le {self.date_heure} avec {self.professionnel} pour {self.client}"


class Facture(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='factures')
    etablissement = models.ForeignKey(Etablissement, on_delete=models.SET_NULL, null=True, blank=True, related_name='factures')
    establishment_name = models.CharField(max_length=255)
    prestation_nom = models.CharField(max_length=255)
    cout = models.DecimalField(max_digits=10, decimal_places=2)
    date_reservation = models.DateTimeField()
    payment_status = models.CharField(max_length=50, default="paid")  # paid, refunded, pending
    reference = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Facture"
        verbose_name_plural = "Factures"
        ordering = ['-created_at']

    def __str__(self):
        return f"Facture {self.reference} pour {self.client}"

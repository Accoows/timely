from django.db import models
from authentication.models import Client
from establishments.models import Etablissement

class Favoris(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='favoris')
    etablissement = models.ForeignKey(Etablissement, on_delete=models.CASCADE, related_name='favoris_par')
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Favoris"
        verbose_name_plural = "Favoris"
        unique_together = ('client', 'etablissement')

    def __str__(self):
        return f"{self.client.utilisateur.username} -> {self.etablissement.nom}"


class Avis(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='avis')
    etablissement = models.ForeignKey(Etablissement, on_delete=models.CASCADE, related_name='avis_recus')
    message = models.TextField()
    note = models.IntegerField(default=5, choices=[(i, str(i)) for i in range(1, 6)])
    date_envoie = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Avis"
        verbose_name_plural = "Avis"
        ordering = ['-date_envoie']

    def __str__(self):
        return f"{self.client.utilisateur.username} sur {self.etablissement.nom}"

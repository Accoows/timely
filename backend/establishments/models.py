from django.db import models

class Etablissement(models.Model):
    nom = models.CharField(max_length=255)
    adresse = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.nom

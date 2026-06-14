from django.db import models

class Secteur(models.Model):
    nom = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nom

class Lieu(models.Model):
    adresse = models.CharField(max_length=255)
    ville = models.CharField(max_length=100)
    code_postal = models.CharField(max_length=10, blank=True, null=True)
    region = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.adresse}, {self.ville}"

class Etablissement(models.Model):
    nom = models.CharField(max_length=255)
    secteur = models.ForeignKey(Secteur, on_delete=models.SET_NULL, null=True, blank=True, related_name='etablissements')
    lieu = models.ForeignKey(Lieu, on_delete=models.SET_NULL, null=True, blank=True, related_name='etablissements')
    gerant = models.ForeignKey('authentication.Gerant', on_delete=models.SET_NULL, null=True, blank=True, related_name='etablissements')

    def __str__(self):
        return self.nom



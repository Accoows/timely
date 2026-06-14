from django.db import models
from django.contrib.auth.models import User

class Client(models.Model):
    utilisateur = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profil_client')
    telephone = models.CharField(max_length=20, blank=True, null=True)
    date_inscription = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Client : {self.utilisateur.first_name} {self.utilisateur.last_name}"


class Gerant(models.Model):
    utilisateur = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profil_gerant')
    stripe_account_id = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        first_etab = self.etablissements.first()
        return f"Gérant de : {first_etab.nom if first_etab else 'Aucun salon'}"


class Professionnel(models.Model):
    # Un professionnel est un employé créé par le gérant pour s'occuper des RDV
    utilisateur = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profil_pro')
    etablissement = models.ForeignKey('establishments.Etablissement', on_delete=models.CASCADE, related_name='collaborateurs')
    poste = models.CharField(max_length=100, default="Coiffeur / Esthéticienne")
    description = models.TextField(blank=True, null=True)
    date_embauche = models.DateField(blank=True, null=True)

    def __str__(self):
        return f"Pro : {self.utilisateur.first_name} ({self.poste})"
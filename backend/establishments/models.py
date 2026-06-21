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

def default_horaires():
    return {
        "Lundi": "Fermé",
        "Mardi": "Fermé",
        "Mercredi": "Fermé",
        "Jeudi": "Fermé",
        "Vendredi": "Fermé",
        "Samedi": "Fermé",
        "Dimanche": "Fermé"
    }

class Etablissement(models.Model):
    nom = models.CharField(max_length=255)
    secteur = models.ForeignKey(Secteur, on_delete=models.SET_NULL, null=True, blank=True, related_name='etablissements')
    lieu = models.ForeignKey(Lieu, on_delete=models.SET_NULL, null=True, blank=True, related_name='etablissements')
    gerant = models.ForeignKey('authentication.Gerant', on_delete=models.SET_NULL, null=True, blank=True, related_name='etablissements')
    date_creation = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True, null=True)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    mail = models.EmailField(blank=True, null=True)
    status = models.CharField(max_length=50, default="actif")
    site_web = models.URLField(blank=True, null=True)
    note_globale = models.DecimalField(max_digits=2, decimal_places=1, default=0.0)
    note_accueil = models.DecimalField(max_digits=2, decimal_places=1, default=0.0)
    note_proprete = models.DecimalField(max_digits=2, decimal_places=1, default=0.0)
    note_cadre = models.DecimalField(max_digits=2, decimal_places=1, default=0.0)
    note_prestation = models.DecimalField(max_digits=2, decimal_places=1, default=0.0)
    nombre_avis = models.PositiveIntegerField(default=0)
    horaires = models.JSONField(blank=True, null=True, default=default_horaires)

    def __str__(self):
        return self.nom


class Prestation(models.Model):
    nom = models.CharField(max_length=255)
    cout = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    etablissement = models.ForeignKey(Etablissement, on_delete=models.CASCADE, related_name='prestations')

    def __str__(self):
        return f"{self.nom} ({self.cout} €)"


class Photo(models.Model):
    url_photo = models.URLField(max_length=500)
    etablissement = models.ForeignKey(Etablissement, on_delete=models.CASCADE, related_name='photos')

    def __str__(self):
        return f"Photo de {self.etablissement.nom} : {self.url_photo}"




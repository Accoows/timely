from django.db import models
from django.contrib.auth.models import User

class Client(models.Model):
    """
    Modèle représentant un profil Client.
    Lié de manière unique (OneToOne) à un utilisateur Django standard.
    Stocke le numéro de téléphone et la date d'inscription.
    """
    utilisateur = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='profil_client'
    )
    telephone = models.CharField(
        max_length=20, 
        blank=True, 
        null=True
    )
    date_inscription = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        """
        Retourne une représentation textuelle du client (Prénom et Nom).
        """
        return f"Client : {self.utilisateur.first_name} {self.utilisateur.last_name}"


class Gerant(models.Model):
    """
    Modèle représentant un profil Gérant.
    Lié de manière unique à un utilisateur Django standard.
    Gère les établissements et possède un identifiant de compte Stripe Connect.
    """
    utilisateur = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='profil_gerant'
    )
    stripe_account_id = models.CharField(
        max_length=255, 
        blank=True, 
        null=True
    )

    def __str__(self):
        """
        Retourne le premier établissement associé au gérant, ou une mention par défaut.
        """
        first_etab = self.etablissements.first()
        return f"Gérant de : {first_etab.nom if first_etab else 'Aucun salon'}"


class Professionnel(models.Model):
    """
    Modèle représentant un profil Professionnel (Collaborateur).
    Un professionnel est un employé créé et affecté à un établissement par le gérant.
    Il effectue des prestations et gère ses créneaux de rendez-vous.
    """
    utilisateur = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='profil_pro'
    )
    etablissement = models.ForeignKey(
        'establishments.Etablissement', 
        on_delete=models.CASCADE, 
        related_name='collaborateurs'
    )
    poste = models.CharField(
        max_length=100, 
        default="Coiffeur / Esthéticienne"
    )
    description = models.TextField(
        blank=True, 
        null=True
    )
    date_embauche = models.DateField(
        blank=True, 
        null=True
    )

    def __str__(self):
        """
        Retourne le prénom du professionnel ainsi que son poste.
        """
        return f"Pro : {self.utilisateur.first_name} ({self.poste})"


class PasswordResetToken(models.Model):
    """
    Modèle pour stocker les codes temporaires de réinitialisation de mot de passe.
    Chaque code est lié à un utilisateur unique avec une date d'émission.
    """
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='reset_token'
    )
    code = models.CharField(
        max_length=6
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        """
        Retourne le nom de l'utilisateur associé à ce jeton de réinitialisation.
        """
        return f"Reset Token for {self.user.username}"
from django.db import models
from authentication.models import Client
from establishments.models import Etablissement
from django.contrib.auth.models import User

class Discussion(models.Model):
    """
    Modèle représentant un canal de discussion (chat) entre un Client et un Établissement.
    Chaque couple unique (Client, Établissement) a droit à un seul canal de discussion.
    """
    client = models.ForeignKey(
        Client, 
        on_delete=models.CASCADE, 
        related_name='discussions'
    )
    etablissement = models.ForeignKey(
        Etablissement, 
        on_delete=models.CASCADE, 
        related_name='discussions'
    )
    nom_discussion = models.CharField(
        max_length=255, 
        blank=True, 
        null=True
    )
    date_creation = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        verbose_name = "Discussion"
        verbose_name_plural = "Discussions"
        unique_together = ('client', 'etablissement')
        ordering = ['-date_creation']

    def __str__(self):
        """
        Retourne la représentation textuelle de la discussion montrant le client et l'établissement.
        """
        return f"Discussion Client: {self.client.utilisateur.username} <-> Etab: {self.etablissement.nom}"


class Message(models.Model):
    """
    Modèle représentant un message individuel envoyé au sein d'une Discussion.
    """
    discussion = models.ForeignKey(
        Discussion, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    expediteur = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='messages_envoyes'
    )
    content = models.TextField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        ordering = ['created_at']

    def __str__(self):
        """
        Représentation textuelle du message indiquant l'expéditeur, l'identifiant du chat et la date.
        """
        return f"De {self.expediteur.username} dans Discussion {self.discussion.id} à {self.created_at}"

from django.db import models
from authentication.models import Client
from establishments.models import Etablissement
from django.contrib.auth.models import User

class Discussion(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='discussions')
    etablissement = models.ForeignKey(Etablissement, on_delete=models.CASCADE, related_name='discussions')
    nom_discussion = models.CharField(max_length=255, blank=True, null=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Discussion"
        verbose_name_plural = "Discussions"
        unique_together = ('client', 'etablissement')
        ordering = ['-date_creation']

    def __str__(self):
        return f"Discussion Client: {self.client.utilisateur.username} <-> Etab: {self.etablissement.nom}"


class Message(models.Model):
    discussion = models.ForeignKey(Discussion, on_delete=models.CASCADE, related_name='messages')
    expediteur = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages_envoyes')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        ordering = ['created_at']

    def __str__(self):
        return f"De {self.expediteur.username} dans Discussion {self.discussion.id} à {self.created_at}"

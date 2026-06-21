from django.db import models

class Secteur(models.Model):
    """
    Modèle représentant un secteur d'activité ou une catégorie d'établissement.
    Exemples: Coiffure, Beauté & Soins, Restauration, Hébergement.
    """
    nom = models.CharField(
        max_length=100, 
        unique=True
    )

    def __str__(self):
        """
        Retourne le nom du secteur.
        """
        return self.nom


class Lieu(models.Model):
    """
    Modèle représentant l'emplacement ou l'adresse physique d'un établissement.
    """
    adresse = models.CharField(
        max_length=255
    )
    ville = models.CharField(
        max_length=100
    )
    code_postal = models.CharField(
        max_length=10, 
        blank=True, 
        null=True
    )

    def __str__(self):
        """
        Retourne l'adresse complète combinant l'adresse et la ville.
        """
        return f"{self.adresse}, {self.ville}"


def default_horaires():
    """
    Retourne la structure par défaut des horaires d'ouverture sous forme de dictionnaire.
    Initialisé par défaut avec tous les jours de la semaine à 'Fermé'.
    """
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
    """
    Modèle représentant un Établissement (un salon, restaurant, hôtel, etc.).
    Lié à un Secteur d'activité, un Lieu géographique et un Gérant.
    Gère également ses coordonnées, ses horaires d'ouverture et ses statistiques de notation.
    """
    nom = models.CharField(
        max_length=255
    )
    secteur = models.ForeignKey(
        Secteur, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='etablissements'
    )
    lieu = models.ForeignKey(
        Lieu, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='etablissements'
    )
    gerant = models.ForeignKey(
        'authentication.Gerant', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='etablissements'
    )
    date_creation = models.DateTimeField(
        auto_now_add=True
    )
    description = models.TextField(
        blank=True, 
        null=True
    )
    telephone = models.CharField(
        max_length=20, 
        blank=True, 
        null=True
    )
    mail = models.EmailField(
        blank=True, 
        null=True
    )
    site_web = models.URLField(
        blank=True, 
        null=True
    )
    
    # Statistiques de notes (calculées ou agrégées à partir des avis reçus)
    note_globale = models.DecimalField(
        max_digits=2, 
        decimal_places=1, 
        default=0.0
    )
    note_accueil = models.DecimalField(
        max_digits=2, 
        decimal_places=1, 
        default=0.0
    )
    note_proprete = models.DecimalField(
        max_digits=2, 
        decimal_places=1, 
        default=0.0
    )
    note_cadre = models.DecimalField(
        max_digits=2, 
        decimal_places=1, 
        default=0.0
    )
    note_prestation = models.DecimalField(
        max_digits=2, 
        decimal_places=1, 
        default=0.0
    )
    nombre_avis = models.PositiveIntegerField(
        default=0
    )
    horaires = models.JSONField(
        blank=True, 
        null=True, 
        default=default_horaires
    )

    def __str__(self):
        """
        Retourne le nom de l'établissement.
        """
        return self.nom


class Prestation(models.Model):
    """
    Modèle représentant une prestation ou service proposé par un Établissement.
    Spécifie un nom, un coût et associe les collaborateurs habilités à la réaliser.
    """
    nom = models.CharField(
        max_length=255
    )
    cout = models.DecimalField(
        max_digits=10, 
        decimal_places=2
    )
    description = models.TextField(
        blank=True, 
        null=True
    )
    etablissement = models.ForeignKey(
        Etablissement, 
        on_delete=models.CASCADE, 
        related_name='prestations'
    )
    collaborateurs = models.ManyToManyField(
        'authentication.Professionnel', 
        related_name='prestations', 
        blank=True
    )

    def __str__(self):
        """
        Retourne le nom de la prestation accompagné de son coût.
        """
        return f"{self.nom} ({self.cout} €)"


class Photo(models.Model):
    """
    Modèle représentant une photographie liée à un Établissement.
    """
    url_photo = models.URLField(
        max_length=500
    )
    etablissement = models.ForeignKey(
        Etablissement, 
        on_delete=models.CASCADE, 
        related_name='photos'
    )

    class Meta:
        ordering = ['id']

    def __str__(self):
        """
        Retourne une description textuelle de la photo.
        """
        return f"Photo de {self.etablissement.nom} : {self.url_photo}"




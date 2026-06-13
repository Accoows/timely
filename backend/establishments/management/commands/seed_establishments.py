from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
import unicodedata
from establishments.models import Secteur, Lieu, Etablissement
from authentication.models import Gerant

def remove_accents(input_str):
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])

class Command(BaseCommand):
    help = 'Seeds the database with initial sectors, locations, establishments and managers'

    def handle(self, *args, **kwargs):
        # 1. Create Sectors
        sectors_data = ["Coiffure", "Beauté & Soins", "Massage & Bien-être", "Barbier"]
        sectors = {}
        for name in sectors_data:
            secteur, created = Secteur.objects.get_or_create(nom=name)
            sectors[name] = secteur
            if created:
                self.stdout.write(self.style.SUCCESS(f"Secteur '{name}' créé"))
            else:
                self.stdout.write(f"Secteur '{name}' existe déjà")

        # 2. Create Establishments with Locations and Managers
        establishments_data = [
            {
                "nom": "Salon de Coiffure L'Élégance",
                "adresse": "12 Rue de la Paix",
                "ville": "Paris",
                "code_postal": "75002",
                "region": "Île-de-France",
                "secteur": sectors["Coiffure"]
            },
            {
                "nom": "Institut Beauté Divine",
                "adresse": "45 Avenue Jean Jaurès",
                "ville": "Lyon",
                "code_postal": "69007",
                "region": "Auvergne-Rhône-Alpes",
                "secteur": sectors["Beauté & Soins"]
            },
            {
                "nom": "Zen Massage",
                "adresse": "8 Rue du Temple",
                "ville": "Paris",
                "code_postal": "75004",
                "region": "Île-de-France",
                "secteur": sectors["Massage & Bien-être"]
            },
            {
                "nom": "The Barber Corner",
                "adresse": "101 Rue Saint-Ferréol",
                "ville": "Marseille",
                "code_postal": "13006",
                "region": "Provence-Alpes-Côte d'Azur",
                "secteur": sectors["Barbier"]
            },
            {
                "nom": "Spa Relax",
                "adresse": "22 Rue Victor Hugo",
                "ville": "Lyon",
                "code_postal": "69002",
                "region": "Auvergne-Rhône-Alpes",
                "secteur": sectors["Massage & Bien-être"]
            }
        ]

        for data in establishments_data:
            # 1. Create or get Lieu first
            lieu, lieu_created = Lieu.objects.get_or_create(
                adresse=data["adresse"],
                ville=data["ville"],
                defaults={
                    "code_postal": data["code_postal"],
                    "region": data["region"]
                }
            )
            if lieu_created:
                self.stdout.write(self.style.SUCCESS(f"Lieu créé : {lieu}"))

            # 2. Create or get a User for the Manager
            nom_cleaned = remove_accents(data['nom'].lower().replace(' ', '_').replace("'", ""))
            manager_email = f"gerant.{nom_cleaned}@example.com"
            manager_user, user_created = User.objects.get_or_create(
                username=manager_email,
                defaults={
                    "email": manager_email,
                    "first_name": "Gérant",
                    "last_name": data["nom"]
                }
            )
            if user_created:
                manager_user.set_password("AZEqsd123!")
                manager_user.save()

            # 3. Create or get Gerant profile
            gerant, gerant_created = Gerant.objects.get_or_create(
                utilisateur=manager_user
            )
            if gerant_created:
                self.stdout.write(self.style.SUCCESS(f"Profil Gérant créé pour '{manager_email}'"))

            # 4. Create or get Etablissement linked to Lieu, Secteur and Gerant
            etablissement, created = Etablissement.objects.get_or_create(
                nom=data["nom"],
                defaults={
                    "lieu": lieu,
                    "secteur": data["secteur"],
                    "gerant": gerant
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Établissement '{data['nom']}' créé"))
            else:
                etablissement.lieu = lieu
                etablissement.secteur = data["secteur"]
                etablissement.gerant = gerant
                etablissement.save()
                self.stdout.write(f"Établissement '{data['nom']}' mis à jour")

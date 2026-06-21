from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
import unicodedata
from establishments.models import Secteur, Lieu, Etablissement, Prestation, Photo
from authentication.models import Gerant, Professionnel

def remove_accents(input_str):
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])

class Command(BaseCommand):
    help = 'Seeds the database with initial sectors, locations, establishments, services, photos and employees'

    def handle(self, *args, **kwargs):
        # 1. Create Sectors
        sectors_data = [
            "Coiffure", 
            "Beauté & Soins", 
            "Massage & Bien-être", 
            "Barbier",
            "Restauration",
            "Hébergement",
            "Voyages & Transports"
        ]
        sectors = {}
        for name in sectors_data:
            secteur, created = Secteur.objects.get_or_create(nom=name)
            sectors[name] = secteur
            if created:
                self.stdout.write(self.style.SUCCESS(f"Secteur '{name}' créé"))
            else:
                self.stdout.write(f"Secteur '{name}' existe déjà")

        # 2. Complete Seed Data Configuration
        establishments_data = [
            {
                "nom": "Salon de Coiffure L'Élégance",
                "adresse": "12 Rue de la Paix",
                "ville": "Paris",
                "code_postal": "75002",
                "region": "Île-de-France",
                "secteur": sectors["Coiffure"],
                "description": "Votre salon de coiffure haut de gamme au cœur de Paris. Nos coiffeurs visagistes vous conseillent et créent pour vous des coupes sur-mesure adaptées à votre style.",
                "telephone": "01 42 61 54 82",
                "mail": "contact@coiffure-elegance.fr",
                "site_web": "https://www.coiffure-elegance.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1620331311520-246422fd82f9?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Coupe Homme & Coiffage", "cout": 29.00, "description": "Shampooing, soin, coupe et coiffage texturé."},
                    {"nom": "Coupe Femme & Brushing", "cout": 45.00, "description": "Shampooing traitant, massage du cuir chevelu, coupe et coiffage."},
                    {"nom": "Balayage Signature & Soin", "cout": 95.00, "description": "Éclaircissement naturel sur-mesure suivi d'un soin profond réparateur."}
                ],
                "collaborateurs": [
                    {"first_name": "Jean", "last_name": "Dupont", "poste": "Coiffeur Créateur / Visagiste"},
                    {"first_name": "Sophie", "last_name": "Bernard", "poste": "Coloriste Experte"}
                ]
            },
            {
                "nom": "L'Atelier du Cheveu",
                "adresse": "45 Rue Porte Dijeaux",
                "ville": "Bordeaux",
                "code_postal": "33000",
                "region": "Nouvelle-Aquitaine",
                "secteur": sectors["Coiffure"],
                "description": "Un espace moderne et chaleureux à Bordeaux, dédié à la beauté de vos cheveux. Spécialistes du lissage brésilien et des ombrés hair lumineux.",
                "telephone": "05 56 48 12 90",
                "mail": "contact@atelier-cheveu.fr",
                "site_web": "https://www.atelier-cheveu-bordeaux.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Coupe & Lissage Brésilien", "cout": 150.00, "description": "Lissage à la kératine naturelle pour des cheveux brillants et disciplinés pendant 4 mois."},
                    {"nom": "Ombré Hair Lumineux", "cout": 110.00, "description": "Dégradé de couleur naturel avec patine incluse."},
                    {"nom": "Soin Kératine Profond", "cout": 35.00, "description": "Soin restructurant pour cheveux abîmés ou secs."}
                ],
                "collaborateurs": [
                    {"first_name": "Marc", "last_name": "Gomez", "poste": "Maître Coiffeur"},
                    {"first_name": "Elsa", "last_name": "Martin", "poste": "Experte Balayage"}
                ]
            },
            {
                "nom": "Coiffure & Style",
                "adresse": "88 Rue Nationale",
                "ville": "Lille",
                "code_postal": "59000",
                "region": "Hauts-de-France",
                "secteur": sectors["Coiffure"],
                "description": "Situé au centre de Lille, notre salon vous propose des prestations de coupe et coiffure de haute précision pour hommes, femmes et enfants.",
                "telephone": "03 20 45 12 99",
                "mail": "lille@coiffure-style.fr",
                "site_web": "https://www.coiffure-style-lille.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1501719183311-152ee5c42ae2?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Forfait Coupe + Brushing Classique", "cout": 38.00, "description": "Shampooing, coupe, soin démêlant et coiffage."},
                    {"nom": "Taille de Barbe & Rasage", "cout": 18.00, "description": "Rasage classique à l'ancienne."},
                    {"nom": "Coloration Racine & Soin", "cout": 55.00, "description": "Couverture parfaite des cheveux blancs."}
                ],
                "collaborateurs": [
                    {"first_name": "Thomas", "last_name": "Dufour", "poste": "Coiffeur mixte"},
                    {"first_name": "Emma", "last_name": "Leroy", "poste": "Styliste capillaire"}
                ]
            },
            {
                "nom": "Institut Beauté Divine",
                "adresse": "45 Avenue Jean Jaurès",
                "ville": "Lyon",
                "code_postal": "69007",
                "region": "Auvergne-Rhône-Alpes",
                "secteur": sectors["Beauté & Soins"],
                "description": "Un havre de paix dédié à votre beauté et votre bien-être. Profitez de soins du visage innovants, d'épilations douces et de mises en beauté des ongles haut de gamme.",
                "telephone": "04 78 54 96 12",
                "mail": "accueil@beaute-divine-lyon.fr",
                "site_web": "https://www.beaute-divine-lyon.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Soin du Visage Hydratant Éclat", "cout": 65.00, "description": "Nettoyage de peau, gommage, massage et masque hydratant intense."},
                    {"nom": "Manucure & Vernis Semi-Permanent", "cout": 45.00, "description": "Beauté des ongles complète suivie de la pose de vernis semi-permanent longue tenue."},
                    {"nom": "Épilation Maillot & Jambes Complètes", "cout": 38.00, "description": "Épilation à la cire tiède naturelle pour peaux sensibles."}
                ],
                "collaborateurs": [
                    {"first_name": "Clara", "last_name": "Morel", "poste": "Esthéticienne Diplômée"},
                    {"first_name": "Lucie", "last_name": "Petit", "poste": "Prothésiste Ongulaire"}
                ]
            },
            {
                "nom": "Institut de Beauté Orchidée",
                "adresse": "14 Rue d'Alsace-Lorraine",
                "ville": "Toulouse",
                "code_postal": "31000",
                "region": "Occitanie",
                "secteur": sectors["Beauté & Soins"],
                "description": "Plongez dans l'univers de détente de notre institut à Toulouse. Soins du corps relaxants, modelages amincissants et soins du visage anti-âge haut de gamme.",
                "telephone": "05 61 22 89 74",
                "mail": "contact@institut-orchidee.fr",
                "site_web": "https://www.institut-orchidee-toulouse.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1489659639091-8b687bc4386e?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Soin du Visage Anti-Âge Anti-Oxydant", "cout": 75.00, "description": "Massage liftant japonais et masque au collagène repulpant."},
                    {"nom": "Modelage du Corps relaxant (45 min)", "cout": 55.00, "description": "Massage enveloppant aux huiles essentielles de lavande."},
                    {"nom": "Beauté des Pieds & Pose de Vernis", "cout": 40.00, "description": "Soin anti-callosités et polissage avec pose de couleur."}
                ],
                "collaborateurs": [
                    {"first_name": "Sarah", "last_name": "Lopez", "poste": "Esthéticienne Experte"},
                    {"first_name": "Manon", "last_name": "Gimenez", "poste": "Praticienne Soins Corps"}
                ]
            },
            {
                "nom": "L'Onglerie Chic",
                "adresse": "12 Rue des Hallebardes",
                "ville": "Strasbourg",
                "code_postal": "67000",
                "region": "Grand Est",
                "secteur": sectors["Beauté & Soins"],
                "description": "Le temple de la beauté des mains et des pieds à Strasbourg. Stylisme ongulaire, nail art créatif et soins réparateurs d'exception.",
                "telephone": "03 88 34 21 00",
                "mail": "nailchic@strasbourg.fr",
                "site_web": "https://www.onglerie-chic-strasbourg.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1632345031435-8797b2d58045?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Rallongement en Gel & Couleur", "cout": 70.00, "description": "Extension d'ongles en gel avec chablons ou capsules et pose de couleur."},
                    {"nom": "Pose de Vernis Semi-Permanent", "cout": 35.00, "description": "Manucure rapide et pose de couleur longue durée (3 semaines)."},
                    {"nom": "Décoration Nail Art (par ongle)", "cout": 3.00, "description": "Dessin fait main, strass ou effet chrome."}
                ],
                "collaborateurs": [
                    {"first_name": "Julie", "last_name": "Schmitt", "poste": "Nail Artist senior"},
                    {"first_name": "Camille", "last_name": "Meyer", "poste": "Prothésiste ongulaire"}
                ]
            },
            {
                "nom": "Zen Massage",
                "adresse": "8 Rue du Temple",
                "ville": "Paris",
                "code_postal": "75004",
                "region": "Île-de-France",
                "secteur": sectors["Massage & Bien-être"],
                "description": "Détendez-vous et libérez vos tensions dans notre centre de massage calme et épuré. Massages du monde réalisés par des praticiens certifiés.",
                "telephone": "01 45 82 73 91",
                "mail": "zen@massage-paris.fr",
                "site_web": "https://www.zen-massage-paris.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Massage Californien (1h)", "cout": 80.00, "description": "Massage relaxant fluide aux huiles bio essentielles."},
                    {"nom": "Massage Suédois Tonique (1h)", "cout": 85.00, "description": "Massage musculaire profond idéal pour les sportifs ou tensions accumulées."},
                    {"nom": "Massage Dos & Cervicales (30 min)", "cout": 45.00, "description": "Soin ciblé pour soulager rapidement les tensions du haut du corps."}
                ],
                "collaborateurs": [
                    {"first_name": "Thomas", "last_name": "Rousseau", "poste": "Masseur & Praticien Bien-être"},
                    {"first_name": "Amandine", "last_name": "Gauthier", "poste": "Spécialiste Massages Asiatiques"}
                ]
            },
            {
                "nom": "Spa Nordique & Hammam",
                "adresse": "12 Chaussée de la Madeleine",
                "ville": "Nantes",
                "code_postal": "44000",
                "region": "Pays de la Loire",
                "secteur": sectors["Massage & Bien-être"],
                "description": "Un espace unique à Nantes mêlant chaleur du hammam oriental traditionnel et fraîcheur des bains nordiques. Idéal pour une relaxation profonde.",
                "telephone": "02 40 89 22 34",
                "mail": "spa.nordique@nantes-bienetre.fr",
                "site_web": "https://www.spa-nordique-nantes.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1554057009-6798cb3d4a04?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Entrée Hammam & Gommage au Savon Noir", "cout": 49.00, "description": "Accès libre au hammam suivi d'un gommage corporel traditionnel avec gant de Kessa."},
                    {"nom": "Massage aux Pierres Chaudes (1h15)", "cout": 95.00, "description": "Massage enveloppant à l'aide de pierres de basalte volcaniques chauffées."},
                    {"nom": "Rituel Impérial (2h)", "cout": 135.00, "description": "Hammam, gommage, enveloppement au rhassoul et massage relaxant de 45 minutes."}
                ],
                "collaborateurs": [
                    {"first_name": "Karim", "last_name": "Bennani", "poste": "Praticien Gommage & Hammam"},
                    {"first_name": "Laura", "last_name": "Rondet", "poste": "Masseuse Experte Pierres Chaudes"}
                ]
            },
            {
                "nom": "Espace Détente & Sauna",
                "adresse": "4 Place Garibaldi",
                "ville": "Nice",
                "code_postal": "06300",
                "region": "Provence-Alpes-Côte d'Azur",
                "secteur": sectors["Massage & Bien-être"],
                "description": "Venez savourer un moment hors du temps dans notre espace niçois. Sauna finlandais infrarouge, tisanerie bio et massages ciblés sur-mesure.",
                "telephone": "04 93 45 12 77",
                "mail": "nice@detente-sauna.fr",
                "site_web": "https://www.nice-detente-sauna.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Massage Ayurvédique Abhyanga (1h)", "cout": 85.00, "description": "Massage indien traditionnel rééquilibrant à l'huile chaude de sésame."},
                    {"nom": "Séance de Sauna Infrarouge (30 min)", "cout": 25.00, "description": "Séance de sudation douce favorisant la détente musculaire et l'élimination."},
                    {"nom": "Soin Visage & Massage Crânien (1h)", "cout": 79.00, "description": "Massage des points de tension du crâne et hydratation flash du visage."}
                ],
                "collaborateurs": [
                    {"first_name": "Alexandre", "last_name": "Dubois", "poste": "Spécialiste en massages ayurvédiques"},
                    {"first_name": "Inès", "last_name": "Masséna", "poste": "Praticienne bien-être"}
                ]
            },
            {
                "nom": "The Barber Corner",
                "adresse": "101 Rue Saint-Ferréol",
                "ville": "Marseille",
                "code_postal": "13006",
                "region": "Provence-Alpes-Côte d'Azur",
                "secteur": sectors["Barbier"],
                "description": "Le repère marseillais des gentlemen. Coupe de cheveux classique ou moderne, et taille de barbe traditionnelle au coupe-chou avec serviette chaude.",
                "telephone": "04 91 32 45 61",
                "mail": "contact@barber-corner-marseille.fr",
                "site_web": "https://www.barber-corner-marseille.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1517832606589-7a598b389ad7?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Coupe Gentleman", "cout": 25.00, "description": "Shampooing, coupe ciseaux/tondeuse, coiffage et lotion tonique."},
                    {"nom": "Taille de Barbe Traditionnelle", "cout": 20.00, "description": "Dessin de barbe, rasage contours au coupe-chou, serviette chaude et huile hydratante."},
                    {"nom": "La Totale (Coupe & Barbe)", "cout": 40.00, "description": "Le forfait complet pour un soin parfait des cheveux et de la barbe."}
                ],
                "collaborateurs": [
                    {"first_name": "Arthur", "last_name": "Vidal", "poste": "Maître Barbier"},
                    {"first_name": "Mathieu", "last_name": "Guerin", "poste": "Barbier / Hair Stylist"}
                ]
            },
            {
                "nom": "Le Gentlemen Club Barbier",
                "adresse": "24 Rue de la République",
                "ville": "Lyon",
                "code_postal": "69002",
                "region": "Auvergne-Rhône-Alpes",
                "secteur": sectors["Barbier"],
                "description": "Un club exclusif pour hommes au centre de Lyon. Prestations de coupe, rasage traditionnel, soins capillaires et conseils personnalisés par des professionnels passionnés.",
                "telephone": "04 72 45 11 90",
                "mail": "contact@gentlemen-club-lyon.fr",
                "site_web": "https://www.gentlemen-club-lyon.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1593702295094-aea22597af65?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1517832606589-7a598b389ad7?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Coupe Dégradé Américain", "cout": 28.00, "description": "Coupe très courte travaillée avec précision et soin coiffant."},
                    {"nom": "Soin Barbe Premium (Vapeur)", "cout": 25.00, "description": "Taille de barbe avec bain de vapeur chaude, contours au rasoir et massage."},
                    {"nom": "Forfait Club Complet", "cout": 48.00, "description": "Coupe, Barbe, soin du visage express et boisson offerte."}
                ],
                "collaborateurs": [
                    {"first_name": "Hugo", "last_name": "Bernard", "poste": "Styliste barbier"},
                    {"first_name": "Maxime", "last_name": "Roux", "poste": "Coiffeur barbier"}
                ]
            },
            {
                "nom": "L'Homme Moderne Barbier",
                "adresse": "154 Rue de Rivoli",
                "ville": "Paris",
                "code_postal": "75001",
                "region": "Île-de-France",
                "secteur": sectors["Barbier"],
                "description": "Le salon barbier parisien par excellence. Design industriel, ambiance rock et expertise inégalée pour la coupe de cheveux et l'entretien de la barbe.",
                "telephone": "01 40 12 90 33",
                "mail": "rivoli@homme-moderne.fr",
                "site_web": "https://www.homme-moderne-barbier.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1593702295094-aea22597af65?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Coupe ciseaux classique", "cout": 30.00, "description": "Coupe classique aux ciseaux, sans tondeuse, finition cire bio."},
                    {"nom": "Taille de Moustache & Bouc", "cout": 15.00, "description": "Soin précis de la moustache avec cire sculptante."},
                    {"nom": "Rasage Complet du Crâne", "cout": 25.00, "description": "Rasage à la lame avec huile protectrice avant rasage."}
                ],
                "collaborateurs": [
                    {"first_name": "Gabriel", "last_name": "Lefevre", "poste": "Barbier Expert"},
                    {"first_name": "Florent", "last_name": "Valois", "poste": "Styliste capillaire"}
                ]
            },
            {
                "nom": "Le Bistrot Gourmet",
                "adresse": "8 Rue des Dames",
                "ville": "Lyon",
                "code_postal": "69006",
                "region": "Auvergne-Rhône-Alpes",
                "secteur": sectors["Restauration"],
                "description": "Une cuisine bistronomique raffinée mettant en valeur les produits locaux et de saison. Une carte des vins soigneusement sélectionnée par notre sommelier.",
                "telephone": "04 72 81 90 44",
                "mail": "bistrot-gourmet@lyon-resto.fr",
                "site_web": "https://www.bistrot-gourmet-lyon.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Menu Dégustation (Soir)", "cout": 55.00, "description": "Menu en 5 services du chef selon l'inspiration du marché."},
                    {"nom": "Formule Déjeuner (Midi)", "cout": 24.00, "description": "Entrée, plat et dessert du jour (uniquement le midi en semaine)."},
                    {"nom": "Accord Mets & Vins", "cout": 30.00, "description": "Sélection de 3 verres de vin accordés à votre repas par notre sommelier."}
                ],
                "collaborateurs": [
                    {"first_name": "Pierre", "last_name": "Laurent", "poste": "Chef de Cuisine / Maître Restaurateur"},
                    {"first_name": "Jérôme", "last_name": "Sommelier", "poste": "Sommelier / Chef de Salle"}
                ]
            },
            {
                "nom": "Café & Bistrot Parisien",
                "adresse": "42 Boulevard Saint-Germain",
                "ville": "Paris",
                "code_postal": "75005",
                "region": "Île-de-France",
                "secteur": sectors["Restauration"],
                "description": "Le charme typique des anciens cafés littéraires de la Rive Gauche. Plats traditionnels français (blanquette, tartare) préparés maison.",
                "telephone": "01 43 25 11 90",
                "mail": "contact@cafe-stgermain.fr",
                "site_web": "https://www.bistrot-parisien.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Petit-Déjeuner Parisien Complet", "cout": 12.00, "description": "Café/thé, jus d'orange pressé, croissant et tartine de baguette beurre/confiture."},
                    {"nom": "Entrecôte-Frites Maison (400g)", "cout": 26.00, "description": "Viande bovine française de qualité grillée et frites fraîches coupées main."},
                    {"nom": "Planche Mixte Fromage & Charcuterie", "cout": 18.00, "description": "Sélection de terroirs affinés et charcuteries artisanales."},
                ],
                "collaborateurs": [
                    {"first_name": "Gilles", "last_name": "Martin", "poste": "Bistrotier / Chef barman"},
                    {"first_name": "Lucas", "last_name": "Rocher", "poste": "Chef de cuisine"}
                ]
            },
            {
                "nom": "La Table du Terroir",
                "adresse": "5 Place du Capitole",
                "ville": "Toulouse",
                "code_postal": "31000",
                "region": "Occitanie",
                "secteur": sectors["Restauration"],
                "description": "Une adresse incontournable à Toulouse pour savourer le cassoulet traditionnel maison au confit de canard et de fabuleuses viandes du Sud-Ouest grillées au feu de bois.",
                "telephone": "05 61 55 90 22",
                "mail": "tableterroir@toulouse.fr",
                "site_web": "https://www.table-terroir-toulouse.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Véritable Cassoulet de Toulouse", "cout": 25.00, "description": "Haricots lingots du Lauragais mijotés 4h au four, confit de canard et saucisse de Toulouse."},
                    {"nom": "Magret de Canard Entier aux Figues", "cout": 22.00, "description": "Magret de canard grillé rosé, sauce aigre-douce aux figues fraîches."},
                    {"nom": "Tarte Fine aux Pommes & Armagnac", "cout": 8.00, "description": "Tartelette feuilletée tiède flambée à l'Armagnac."}
                ],
                "collaborateurs": [
                    {"first_name": "Christophe", "last_name": "Giscard", "poste": "Chef cuisinier"},
                    {"first_name": "Sylvie", "last_name": "Toulouse", "poste": "Accueil & Service"}
                ]
            },
            {
                "nom": "L'Auberge Céleste",
                "adresse": "2 Place du Concert",
                "ville": "Lille",
                "code_postal": "59800",
                "region": "Hauts-de-France",
                "secteur": sectors["Restauration"],
                "description": "Dans le Vieux-Lille, découvrez une cuisine flamande généreuse et moderne. Carbonnade flamande mijotée à la bière locale et welsh traditionnel fondant.",
                "telephone": "03 20 88 56 12",
                "mail": "aubergeceleste@lille.fr",
                "site_web": "https://www.auberge-celeste-lille.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Carbonnade Flamande & Frites Maison", "cout": 19.50, "description": "Bœuf mijoté 5h à la bière triple locale et au pain d'épices."},
                    {"nom": "Welsh Royal au Maroilles", "cout": 18.00, "description": "Cheddar et Maroilles fondus à la bière sur pain de campagne et jambon, œuf au plat."},
                    {"nom": "Merveilleux du Chef au Chocolat", "cout": 7.50, "description": "Meringue légère enrobée de crème fouettée au chocolat et copeaux de chocolat noir."}
                ],
                "collaborateurs": [
                    {"first_name": "Benoît", "last_name": "Caron", "poste": "Chef de l'auberge"},
                    {"first_name": "Alice", "last_name": "Vermeersch", "poste": "Responsable de salle"}
                ]
            },
            {
                "nom": "Hôtel & Spa L'Horizon",
                "adresse": "Promenade des Anglais",
                "ville": "Nice",
                "code_postal": "06000",
                "region": "Provence-Alpes-Côte d'Azur",
                "secteur": sectors["Hébergement"],
                "description": "Face à la mer Méditerranée, vivez un séjour d'exception. Chambres spacieuses au design contemporain et accès direct à notre spa de 200m².",
                "telephone": "04 93 88 56 12",
                "mail": "booking@hotel-horizon-nice.com",
                "site_web": "https://www.hotel-horizon-nice.com",
                "photos": [
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Nuitée Chambre Standard Double", "cout": 120.00, "description": "Chambre lit double king-size, douche à l'italienne, vue ville."},
                    {"nom": "Nuitée Suite Premium Vue Mer", "cout": 250.00, "description": "Suite spacieuse avec terrasse privative et vue panoramique sur la Baie des Anges."},
                    {"nom": "Accès Spa & Balnéo (1 journée)", "cout": 45.00, "description": "Accès illimité au jacuzzi, hammam, sauna et piscine intérieure chauffée."}
                ],
                "collaborateurs": [
                    {"first_name": "Camille", "last_name": "Faure", "poste": "Responsable d'Accueil / Concierge"},
                    {"first_name": "Nicolas", "last_name": "Roy", "poste": "Manager Spa"}
                ]
            },
            {
                "nom": "Le Clos des Vignes",
                "adresse": "Route des Châteaux",
                "ville": "Bordeaux",
                "code_postal": "33250",
                "region": "Nouvelle-Aquitaine",
                "secteur": sectors["Hébergement"],
                "description": "Chambre d'hôtes de charme au milieu des vignes bordelaises. Calme absolu, piscine extérieure chauffée et dégustations quotidiennes de vins de la propriété.",
                "telephone": "05 56 33 21 00",
                "mail": "closdesvignes@bordeaux.fr",
                "site_web": "https://www.clos-vignes-bordeaux.com",
                "photos": [
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Nuit en Chambre Double + Petit Déjeuner", "cout": 135.00, "description": "Chambre avec terrasse donnant sur les vignes, petit-déjeuner maison inclus."},
                    {"nom": "Visite de Cave & Dégustation (2h)", "cout": 30.00, "description": "Visite guidée des installations viticoles et dégustation de 3 millésimes."},
                    {"nom": "Panier Repas Terroir (pour 2)", "cout": 50.00, "description": "Sélection de charcuteries, fromages, foie gras maison et une bouteille de vin rouge."}
                ],
                "collaborateurs": [
                    {"first_name": "Henri", "last_name": "Delmas", "poste": "Propriétaire / Viticulteur"},
                    {"first_name": "Catherine", "last_name": "Delmas", "poste": "Responsable d'accueil"}
                ]
            },
            {
                "nom": "Grand Hôtel des Alpes",
                "adresse": "15 Rue de la Nuée-Bleue",
                "ville": "Strasbourg",
                "code_postal": "67000",
                "region": "Grand Est",
                "secteur": sectors["Hébergement"],
                "description": "Hôtel prestigieux situé au cœur historique de Strasbourg. Alliez confort moderne et charme d'antan dans un cadre alsacien raffiné.",
                "telephone": "03 88 44 90 22",
                "mail": "reservation@grandhotel-strasbourg.com",
                "site_web": "https://www.grand-hotel-alpes-strasbourg.com",
                "photos": [
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Nuit en Chambre Privilège Alsacienne", "cout": 145.00, "description": "Lit Queen size, décoration poutres apparentes alsaciennes, salle de bain spacieuse."},
                    {"nom": "Nuit Suite Impériale", "cout": 310.00, "description": "Salon séparé, lit King size, vue panoramique sur la cathédrale de Strasbourg."},
                    {"nom": "Petit-Déjeuner Buffet Alsacien", "cout": 18.00, "description": "Kouglof, bretzels frais, charcuteries et confitures locales."}
                ],
                "collaborateurs": [
                    {"first_name": "Antoine", "last_name": "Kerr", "poste": "Directeur d'Hôtel"},
                    {"first_name": "Valérie", "last_name": "Muller", "poste": "Gouvernante générale"}
                ]
            },
            {
                "nom": "Échappée Belle Voyages",
                "adresse": "14 Rue Crébillon",
                "ville": "Nantes",
                "code_postal": "44000",
                "region": "Pays de la Loire",
                "secteur": sectors["Voyages & Transports"],
                "description": "Votre agence de voyage sur-mesure à Nantes. Circuits personnalisés, séjours insolites, croisières et conseils d'experts pour toutes vos destinations.",
                "telephone": "02 40 44 11 00",
                "mail": "nantes@echappee-belle.fr",
                "site_web": "https://www.echappeebelle-voyages.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Consultation Voyage sur-mesure (1h)", "cout": 50.00, "description": "Entretien avec un conseiller expert pour concevoir l'itinéraire de vos rêves (déduit si réservation effectuée)."},
                    {"nom": "Forfait Lune de Miel (Organisation)", "cout": 190.00, "description": "Conception complète de votre voyage de noces avec attentions particulières et surclassements négociés."},
                    {"nom": "Week-end Surprise (Clé en main)", "cout": 280.00, "description": "Transports et 2 nuits d'hôtel mystères inclus pour une destination européenne."}
                ],
                "collaborateurs": [
                    {"first_name": "Stéphanie", "last_name": "Loisel", "poste": "Conseillère Voyages Asie & Afrique"},
                    {"first_name": "Bastien", "last_name": "Roussel", "poste": "Spécialiste Autotours Amériques"}
                ]
            },
            {
                "nom": "Riviera Shuttle & Transports",
                "adresse": "Aéroport Nice Côte d'Azur",
                "ville": "Nice",
                "code_postal": "06200",
                "region": "Provence-Alpes-Côte d'Azur",
                "secteur": sectors["Voyages & Transports"],
                "description": "Service de transport premium sur la Côte d'Azur. Chauffeurs privés (VTC) bilingues pour vos trajets depuis l'aéroport, séminaires ou visites touristiques.",
                "telephone": "04 89 22 45 66",
                "mail": "contact@rivierashuttle.fr",
                "site_web": "https://www.riviera-shuttle-transports.fr",
                "photos": [
                    "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1554672408-730436b60dde?auto=format&fit=crop&w=600&q=80"
                ],
                "prestations": [
                    {"nom": "Transfert Aéroport Nice - Monaco (Aller)", "cout": 90.00, "description": "Prise en charge par un chauffeur privé, véhicule Berline Premium, boissons et wifi inclus (1 à 3 personnes)."},
                    {"nom": "Chauffeur Privé à disposition (4h)", "cout": 240.00, "description": "Mise à disposition d'une berline de luxe avec chauffeur privé pour vos rendez-vous sur la Côte d'Azur (120km max)."},
                    {"nom": "Navette Van Aéroport Nice - Cannes (Aller)", "cout": 110.00, "description": "Idéal pour groupes ou familles, véhicule type Mercedes Classe V (jusqu'à 7 personnes)."}
                ],
                "collaborateurs": [
                    {"first_name": "Julien", "last_name": "Grimaldi", "poste": "Chauffeur VTC bilingue"},
                    {"first_name": "Olivier", "last_name": "Chauveau", "poste": "Chauffeur VTC & Guide touristique"}
                ]
            }
        ]

        for data in establishments_data:
            # 1. Create or get Lieu
            lieu, lieu_created = Lieu.objects.get_or_create(
                adresse=data["adresse"],
                ville=data["ville"],
                defaults={
                    "code_postal": data["code_postal"]
                }
            )
            if lieu_created:
                self.stdout.write(self.style.SUCCESS(f"Lieu créé : {lieu}"))

            # 2. Create or get User for the Manager (Gerant)
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

            # Generate stable realistic ratings and hours dynamically
            is_hotel_or_resto = data["secteur"].nom in ["Hébergement", "Restauration"]
            if is_hotel_or_resto:
                horaires = {
                    "Lundi": "08:00 - 23:00" if data["secteur"].nom == "Hébergement" else "12:00 - 22:30",
                    "Mardi": "08:00 - 23:00" if data["secteur"].nom == "Hébergement" else "12:00 - 22:30",
                    "Mercredi": "08:00 - 23:00" if data["secteur"].nom == "Hébergement" else "12:00 - 22:30",
                    "Jeudi": "08:00 - 23:00" if data["secteur"].nom == "Hébergement" else "12:00 - 23:30",
                    "Vendredi": "08:00 - 23:00" if data["secteur"].nom == "Hébergement" else "12:00 - 23:30",
                    "Samedi": "08:00 - 23:00" if data["secteur"].nom == "Hébergement" else "12:00 - 23:30",
                    "Dimanche": "08:00 - 23:00" if data["secteur"].nom == "Hébergement" else "12:00 - 22:00"
                }
            else:
                horaires = {
                    "Lundi": "09:00 - 19:00",
                    "Mardi": "09:00 - 19:00",
                    "Mercredi": "09:00 - 19:00",
                    "Jeudi": "09:00 - 20:00",
                    "Vendredi": "09:00 - 20:00",
                    "Samedi": "09:00 - 18:00",
                    "Dimanche": "Fermé"
                }

            nom_len = len(data["nom"])
            note_globale = round(4.2 + (nom_len % 8) / 10, 1)
            note_accueil = round(4.1 + ((nom_len + 1) % 9) / 10, 1)
            note_proprete = round(4.0 + ((nom_len + 2) % 10) / 10, 1)
            note_cadre = round(4.2 + ((nom_len + 3) % 8) / 10, 1)
            note_prestation = round(4.3 + ((nom_len + 4) % 7) / 10, 1)
            nombre_avis = 12 + (nom_len * 4) % 90

            # 4. Create or get Etablissement
            etablissement, created = Etablissement.objects.get_or_create(
                nom=data["nom"],
                defaults={
                    "lieu": lieu,
                    "secteur": data["secteur"],
                    "gerant": gerant,
                    "description": data["description"],
                    "telephone": data["telephone"],
                    "mail": data["mail"],
                    "site_web": data["site_web"],
                    "note_globale": note_globale,
                    "note_accueil": note_accueil,
                    "note_proprete": note_proprete,
                    "note_cadre": note_cadre,
                    "note_prestation": note_prestation,
                    "nombre_avis": nombre_avis,
                    "horaires": horaires
                }
            )
            
            # If already existed, update details
            if not created:
                etablissement.lieu = lieu
                etablissement.secteur = data["secteur"]
                etablissement.gerant = gerant
                etablissement.description = data["description"]
                etablissement.telephone = data["telephone"]
                etablissement.mail = data["mail"]
                etablissement.site_web = data["site_web"]
                etablissement.note_globale = note_globale
                etablissement.note_accueil = note_accueil
                etablissement.note_proprete = note_proprete
                etablissement.note_cadre = note_cadre
                etablissement.note_prestation = note_prestation
                etablissement.nombre_avis = nombre_avis
                etablissement.horaires = horaires
                etablissement.save()
                self.stdout.write(f"Établissement '{data['nom']}' mis à jour")
            else:
                self.stdout.write(self.style.SUCCESS(f"Établissement '{data['nom']}' créé"))

            # 5. Populate Prestations (Services)
            # Delete old services first to avoid duplicates
            Prestation.objects.filter(etablissement=etablissement).delete()
            created_prestations = []
            for prest in data["prestations"]:
                p = Prestation.objects.create(
                    nom=prest["nom"],
                    cout=prest["cout"],
                    description=prest["description"],
                    etablissement=etablissement
                )
                created_prestations.append(p)
            self.stdout.write(self.style.SUCCESS(f"  -> {len(data['prestations'])} Prestations enregistrées"))

            # 6. Populate Photos
            Photo.objects.filter(etablissement=etablissement).delete()
            for url in data["photos"]:
                Photo.objects.create(
                    url_photo=url,
                    etablissement=etablissement
                )
            self.stdout.write(self.style.SUCCESS(f"  -> {len(data['photos'])} Photos enregistrées"))

            # 7. Populate Collaborateurs (Professionnels)
            # Keep track of old collaborateurs to avoid user leaks if necessary, but here we just get_or_create user accounts
            created_pros = []
            for employee in data["collaborateurs"]:
                emp_username = f"pro.{remove_accents(employee['first_name'].lower())}.{remove_accents(employee['last_name'].lower())}@example.com"
                emp_user, emp_user_created = User.objects.get_or_create(
                    username=emp_username,
                    defaults={
                        "email": emp_username,
                        "first_name": employee["first_name"],
                        "last_name": employee["last_name"]
                    }
                )
                if emp_user_created:
                    emp_user.set_password("AZEqsd123!")
                    emp_user.save()

                # Get or create Professional profile
                pro_profile, pro_profile_created = Professionnel.objects.get_or_create(
                    utilisateur=emp_user,
                    defaults={
                        "etablissement": etablissement,
                        "poste": employee["poste"]
                    }
                )
                
                # Make sure etablissement relation is updated if it existed
                if not pro_profile_created:
                    pro_profile.etablissement = etablissement
                    pro_profile.poste = employee["poste"]
                    pro_profile.save()
                
                created_pros.append(pro_profile)
                
            # Assign ALL pros to ALL prestations for this establishment
            for p in created_prestations:
                p.collaborateurs.set(created_pros)

            self.stdout.write(self.style.SUCCESS(f"  -> {len(data['collaborateurs'])} Collaborateurs enregistrés (et affectés aux prestations)"))

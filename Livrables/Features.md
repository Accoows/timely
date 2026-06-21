# Spécifications Fonctionnelles & Cahier des Charges Détaillé — Timely

Ce document rassemble l'ensemble des spécifications fonctionnelles de l'application Timely, une plateforme multisectorielle de réservation de prestations en ligne. Il présente les fonctionnalités par module, définit les rôles des utilisateurs, décrit les cas d'utilisation avec des scénarios nominaux et alternatifs, et liste les exigences non fonctionnelles de base.

---

## 1. Description Détaillée des Fonctionnalités par Module

### A. Module "Authentification & Gestion des Comptes"
Ce module s'appuie sur le système d'authentification natif de Django couplé à des modèles profils métiers pour enrichir les informations des utilisateurs.
*   **Inscription Client** : Formulaire accessible publiquement demandant le Prénom, Nom, Email (qui sert d'identifiant unique), Téléphone, Mot de passe et sa confirmation. La création réussie d'un compte utilisateur génère automatiquement un profil [Client](file:///c:/Users/sarah/Documents/B2/fil%20rouge%20dev/timely/backend/authentication/models.py#L4).
*   **Connexion Unifiée** : Un seul formulaire de connexion pour tous les rôles. Le système détermine le rôle de l'utilisateur lors de l'authentification et redirige dynamiquement le client vers l'interface appropriée (redirection vers la page d'accueil ou tableau de bord pro/gérant).
*   **Déconnexion** : Révocation de la session en cours et redirection vers la page d'accueil.
*   **Gestion du Profil** : Possibilité de modifier ses informations personnelles (Nom, Prénom, Téléphone) et de changer son mot de passe de manière sécurisée.
*   **Création de Comptes Collaborateurs (Professionnel)** : Fonctionnalité réservée aux [Gérants](file:///c:/Users/sarah/Documents/B2/fil%20rouge%20dev/timely/backend/authentication/models.py#L13). Elle permet d'enregistrer un nouveau membre du personnel dans leur établissement. Les champs critiques d'affiliation (Établissement et Poste) sont verrouillés par défaut pour assurer la cohérence des données, et la date d'embauche est calculée automatiquement.

### B. Module "Recherche & Découverte d'Établissements"
Permet aux clients de trouver facilement des prestations correspondant à leurs besoins.
*   **Recherche par Mots-clés** : Recherche textuelle indexée sur le nom de l'établissement ou les prestations offertes.
*   **Sélection de Secteur** : Filtrage natif par secteur d'activité basé sur les données réelles de la plateforme :
    *   *Coiffure* (Salons de coiffure, coupe de cheveux, brushings).
    *   *Beauté & Soins* (Soins esthétiques, instituts de beauté, manucure).
    *   *Massage & Bien-être* (Plénitude, massages relaxants, spas).
    *   *Barbier* (Taille de barbe, rasage traditionnel).
    *   *Restauration* (Bistrots gourmets, restaurants, cafés).
    *   *Hébergement* (Hôtels, chambres d'hôtes, gîtes).
    *   *Voyages & Transports* (Navettes, transports touristiques, activités).
*   **Filtrage Géographique** : Liste déroulante dynamique filtrant les établissements par ville.
*   **Fiches Établissements** : Chaque établissement dispose d'une page publique dédiée présentant :
    *   Le nom, la description et les coordonnées de l'établissement.
    *   Une galerie de photos d'illustration.
    *   Les horaires d'ouverture et de fermeture hebdomadaires.
    *   Le catalogue des prestations disponibles classées par type (avec durée estimée et tarif).
    *   L'équipe de professionnels rattachés à l'établissement.
    *   La note globale moyenne et la liste complète des commentaires clients.

### C. Module "Moteur de Réservation (Booking Engine)"
Le cœur interactif du système, gérant l'orchestration du calendrier des rendez-vous.
*   **Sélection de la Prestation et du Collaborateur** : Le client choisit le service qu'il souhaite réserver, puis le professionnel qui effectuera la prestation. S'il n'a pas de préférence, le système peut lui suggérer le premier professionnel disponible.
*   **Calcul Dynamique des Disponibilités** :
    *   Le serveur calcule en temps réel les créneaux libres d'un professionnel pour une journée sélectionnée.
    *   L'algorithme part de la plage horaire d'ouverture de l'établissement (ex: 9h00 - 18h00).
    *   Il soustrait les réservations déjà enregistrées et confirmées de ce professionnel.
    *   Il découpe le temps restant en blocs de rendez-vous basés sur la durée de la prestation choisie.
*   **Replanification Facile** : Un client connecté peut modifier la date et l'heure d'un rendez-vous à venir depuis son tableau de bord. Cette opération est soumise à la disponibilité des créneaux horaires du professionnel et ne nécessite aucun surcoût financier.

### D. Module "Paiement Sécurisé & Facturation"
*   **Intégration Stripe** : Lors de la finalisation d'un rendez-vous payant, le client est redirigé vers une page de paiement hébergée par Stripe assurant le chiffrement 3D Secure.
*   **Webhooks Stripe** : Le backend écoute les événements Stripe (`checkout.session.completed`) pour valider la réservation dès que le débit bancaire est confirmé.
*   **Facturation Automatique** : La validation du paiement déclenche instantanément la création d'un modèle [Facture](file:///c:/Users/sarah/Documents/B2/fil%20rouge%20dev/timely/backend/bookings/models.py#L27) en base de données. Le client peut visualiser et télécharger sa facture directement depuis son profil sous forme de reçu formalisé.

### E. Module "Engagement & Interactions"
*   **Favoris** : Le client peut cliquer sur un bouton d'interaction pour ajouter ou retirer un établissement de sa liste de favoris (accessible instantanément sur son profil).
*   **Avis & Commentaires** : Après la date effective d'un rendez-vous, le client est invité à évaluer sa prestation avec une note sur 5 et un commentaire rédigé. Ces avis sont visibles publiquement sur la fiche de l'établissement et influencent la moyenne globale de ce dernier.

### F. Module "Messagerie Instantanée (Chat)"
*   **Discussions Privées** : Création d'un fil de discussion sécurisé entre un client et un établissement.
*   **Échanges Textuels** : Envoi de messages en temps réel. Le gérant et les professionnels de l'établissement peuvent répondre aux questions des clients depuis leur tableau de bord.

---

## 2. Rôles des Utilisateurs et Interactions avec le Système

### A. Le Client
*   **Objectifs** : Parcourir l'offre locale, réserver des rendez-vous rapidement, payer en ligne de manière sécurisée et suivre son historique.
*   **Interactions principales** :
    *   Recherche et filtre les établissements.
    *   Consulte les fiches et choisit ses prestations.
    *   Réserve et paie via la passerelle Stripe.
    *   Consulte ses réservations, les replanifie ou les annule.
    *   Gère sa liste de favoris.
    *   Évalue les prestations reçues.
    *   Discute en direct avec les commerçants via la messagerie.

### B. Le Professionnel (Collaborateur)
*   **Objectifs** : Consulter son planning de travail de manière autonome et préparer ses rendez-vous clients.
*   **Interactions principales** :
    *   Accède à son tableau de bord professionnel.
    *   Visualise son emploi du temps (vue journalière/hebdomadaire des rendez-vous).
    *   Complète sa biographie pour la fiche publique de l'établissement.
    *   Répond aux messages de chat initiés par les clients affectés à ses créneaux.

### C. Le Gérant
*   **Objectifs** : Administrer son ou ses établissements, gérer l'équipe de collaborateurs et suivre les indicateurs d'activité.
*   **Interactions principales** :
    *   Configure les informations de l'établissement (horaires, adresse, description).
    *   Gère le catalogue de services (ajout, modification, suppression de prestations).
    *   Met en ligne des photos d'illustration.
    *   Inscrit de nouveaux collaborateurs professionnels.
    *   Visualise le planning global des réservations pour tous ses collaborateurs.
    *   Répond aux demandes de renseignements clients sur la messagerie de l'établissement.

### D. L'Administrateur (Super-utilisateur)
*   **Objectifs** : Assurer la modération globale, la maintenance technique et la sécurité des données.
*   **Interactions principales** :
    *   Accède au panneau d'administration central (Django Backoffice).
    *   Gère les tables de base de données (secteurs d'activité, villes, etc.).
    *   Intervient sur les comptes utilisateurs (blocage de comptes frauduleux).
    *   Modère les avis ou commentaires ne respectant pas les conditions générales d'utilisation.

---

## 3. Cas d'Utilisation (Use Cases) Détaillés

### Cas d'Utilisation 1 : Réservation d'une prestation coiffure ou barbe avec paiement en ligne
*   **Acteurs** : Client (principal), Système (secondaire), Stripe (secondaire).
*   **Prérequis** : Le client possède un compte actif et s'est authentifié avec succès sur la plateforme.
*   **Scénario Nominal** :
    1.  Le **Client** effectue une recherche pour le secteur "Barbier" dans la ville de "Paris".
    2.  Le **Système** affiche la liste des salons partenaires correspondants.
    3.  Le **Client** clique sur l'établissement "The Barber Corner".
    4.  Le **Client** sélectionne la prestation "Taille de Barbe Premium" (durée : 30 min, tarif : 20 €) et choisit le professionnel "Jean".
    5.  Le **Système** interroge le calendrier de Jean et présente les créneaux disponibles pour la journée choisie.
    6.  Le **Client** sélectionne le créneau de 14h30 et clique sur "Procéder au paiement".
    7.  Le **Système** initie une session de checkout Stripe et redirige le **Client** vers l'interface de paiement sécurisé.
    8.  Le **Client** saisit son numéro de carte bancaire et valide sa transaction.
    9.  **Stripe** valide la transaction et renvoie un signal (Webhook de succès) au **Système**.
    10. Le **Système** met à jour le statut de la réservation ("Payé"), bloque le créneau horaire dans l'agenda de Jean, génère la facture et affiche une page de confirmation de commande au **Client**.
*   **Scénario Alternatif A (Échec du paiement)** :
    *   À l'étape 8, le paiement est refusé par la banque du client.
    *   Stripe renvoie un signal d'échec de transaction au système.
    *   Le **Système** affiche un message d'erreur sur l'écran du client et l'invite à saisir un autre moyen de paiement ou à réessayer. Le créneau horaire reste disponible pour d'autres utilisateurs.
*   **Scénario Alternatif B (Créneau déjà réservé en parallèle)** :
    *   À l'étape 6, un autre client réserve le même créneau de 14h30 en finalisant son paiement quelques secondes plus tôt.
    *   Le **Système** détecte le conflit lors de la tentative de validation.
    *   Le **Système** bloque la redirection Stripe, avertit le client que le créneau vient d'être réservé, et lui propose de choisir une autre heure.

---

### Cas d'Utilisation 2 : Création de compte pour un collaborateur professionnel par le gérant
*   **Acteurs** : Gérant (principal), Système (secondaire).
*   **Prérequis** : Le gérant est connecté et administre au moins un établissement actif.
*   **Scénario Nominal** :
    1.  Le **Gérant** accède à son tableau de bord et clique sur l'onglet "Nouveau compte pro" du menu latéral.
    2.  Le **Système** affiche le formulaire de création. Les champs "Établissement" (pré-rempli avec l'établissement du gérant) et "Poste" (défini sur "Professionnel") sont grisés et désactivés.
    3.  Le **Gérant** saisit les informations personnelles du nouveau collaborateur : Nom, Prénom, Email, Mot de passe et Biographie.
    4.  Le **Gérant** valide le formulaire.
    5.  Le **Système** vérifie la validité des informations (solidité du mot de passe, unicité de l'adresse email en base de données).
    6.  Le **Système** crée l'utilisateur de base (`User`), lui génère un profil [Professionnel](file:///c:/Users/sarah/Documents/B2/fil%20rouge%20dev/timely/backend/authentication/models.py#L22) lié, associe la date d'embauche automatiquement (date du jour) et renvoie un message de confirmation de succès au gérant.
*   **Scénario Alternatif A (Email déjà utilisé)** :
    *   À l'étape 5, le système détecte que l'adresse e-mail saisie est déjà attribuée à un compte existant.
    *   Le **Système** interrompt la création et affiche un message d'erreur ciblé : *"Cet email est déjà utilisé"*.
*   **Scénario Alternatif B (Mot de passe non conforme)** :
    *   À l'étape 5, le mot de passe ne respecte pas les critères de sécurité de l'application (longueur minimale, caractères requis).
    *   Le **Système** refuse la création et indique au gérant les critères requis pour le mot de passe.

---

### Cas d'Utilisation 3 : Replanification de rendez-vous par un client
*   **Acteurs** : Client (principal), Système (secondaire).
*   **Prérequis** : Le client possède un rendez-vous planifié dans le futur (statut "Confirmé") et est connecté.
*   **Scénario Nominal** :
    1.  Le **Client** accède à l'onglet "Mes Réservations" de son profil.
    2.  Le **Client** clique sur le bouton "Déplacer le rendez-vous" de la réservation concernée.
    3.  Le **Système** ouvre une modale de modification affichant le calendrier des disponibilités du professionnel concerné.
    4.  Le **Client** sélectionne une nouvelle date et choisit une heure disponible parmi celles affichées.
    5.  Le **Client** clique sur "Enregistrer les modifications".
    6.  Le **Système** valide la disponibilité du créneau.
    7.  Le **Système** modifie la date/heure de la réservation en base de données, libère l'ancien créneau du professionnel, réserve le nouveau et affiche un message de succès à l'écran.
*   **Scénario Alternatif A (Délai de replanification dépassé)** :
    *   À l'étape 2, le client tente de replanifier un rendez-vous prévu dans moins de 24 heures.
    *   Le **Système** désactive le bouton de modification ou renvoie une alerte expliquant que la replanification n'est plus autorisée dans un délai si court (politique d'annulation de l'établissement).

---

## 4. Exigences et Contraintes Non Fonctionnelles (Exemples)

Les exigences non fonctionnelles définissent les critères de qualité, de sécurité et d'exploitabilité du système. Voici les principaux exemples applicables au projet Timely :

### A. Performance & Scalabilité
*   **Temps de réponse du serveur** : Le temps d'exécution des endpoints API critiques (recherche d'établissements et calcul dynamique des créneaux libres) doit être inférieur à **300 millisecondes** pour une charge standard de 100 requêtes concurrentes.
*   **Optimisation du chargement client** : L'interface web de la Single Page Application (React) doit utiliser la compilation optimisée de Vite pour générer des fichiers statiques compressés (JS/CSS) ne dépassant pas 500 Ko au chargement initial.
*   **Traitement d'images** : Toutes les photos téléchargées par les gérants pour illustrer leurs fiches d'établissements doivent être automatiquement redimensionnées et converties au format `.webp` côté serveur afin d'économiser de la bande passante.

### B. Sécurité & Protection des Données
*   **Sécurisation des liaisons (HTTPS)** : L'ensemble des échanges de données entre le client et l'API doit transiter obligatoirement via le protocole chiffré TLS/HTTPS.
*   **Protection des Sessions (CSRF/CORS)** :
    *   Les cookies de session Django doivent utiliser les attributs `HttpOnly`, `Secure` et `SameSite=Lax` pour prévenir les attaques de type XSS et le vol de session.
    *   Chaque requête de modification d'état (POST, PUT, DELETE) doit être validée par un jeton CSRF.
    *   Les configurations CORS dans `timely_app/settings.py` doivent restreindre les requêtes uniquement aux domaines de confiance autorisés.
*   **Chiffrement des Mots de Passe** : Les mots de passe stockés en base de données doivent être hachés à l'aide de l'algorithme fort `PBKDF2 SHA256` standard de Django.

### C. Accessibilité (A11y)
*   **Conformité Accessibilité** : L'interface utilisateur construite avec DaisyUI doit cibler le niveau **AA des WCAG 2.1**. Cela implique :
    *   Un ratio de contraste minimal de 4.5:1 pour le texte standard.
    *   La possibilité de naviguer sur l'ensemble de l'interface en utilisant uniquement le clavier (gestion du focus visible).
    *   L'intégration d'attributs ARIA explicites sur les éléments de formulaires et les modales de réservation.

### D. Disponibilité, Résilience & Mode Dégradé
*   **Résilience Réseau** : En cas de perte de connexion internet par le client, le frontend React doit passer en mode dégradé (lecture seule) grâce à un mécanisme de cache local. Le client doit pouvoir consulter ses rendez-vous déjà enregistrés et visualiser ses anciennes factures sans que l'application ne plante (affichage d'une alerte informant de l'état hors-ligne).
*   **Robustesse de la base de données** : Le service de base de données PostgreSQL doit être configuré pour supporter des sauvegardes quotidiennes automatisées à chaud (sans interruption de service).

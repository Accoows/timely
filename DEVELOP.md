# Guide de Développement local : Timely 🚀

Ce document explique comment lancer l'environnement de développement local et comment créer une nouvelle fonctionnalité de A à Z (Backend + Frontend) sur vos branches de développement.

---

## 🛠️ Partie 0 : Lancer l'environnement de développement local

Pour développer localement, nous utilisons Docker Compose en mode développement. Cela active le mode débogage de Django et permet le rechargement à chaud (Hot-Reload) du frontend React.

### 1. Variables d'environnement locales
Assurez-vous que votre fichier `.env` à la racine contient :
```ini
DEBUG=True
SECRET_KEY=django-insecure-local-key
POSTGRES_DB=timely_db
POSTGRES_USER=timely_user
POSTGRES_PASSWORD=AZEqsd123!
DB_HOST=db
DB_PORT=5432
```

### 2. Démarrer la stack de développement
Lancez la commande suivante à la racine du projet :
```bash
docker compose up --build
```

### 3. Accéder aux services en local
* **Frontend (React/Vite)** : [http://localhost:5173](http://localhost:5173)
* **Backend (Django API)** : [http://localhost:8000](http://localhost:8000)
* **Base de données (Postgres)** : Accessible sur le port `5432` de votre machine (localhost).

### 4. Comment fonctionne la communication API ?
En développement, toutes vos requêtes fetch dans le code React utilisent des URLs relatives (ex: `/api/bookings/`). 
Vite utilise le proxy configuré dans `frontend/vite.config.ts` pour intercepter ces appels et les rediriger automatiquement vers le backend à l'adresse `http://localhost:8000/api/bookings/`. Cela évite d'avoir à gérer les domaines CORS en local.

---

## 🛠️ Partie 1 : Créer un nouveau module Backend (Django App)

Pour ce tutoriel, nous allons créer un module de réservation nommé `bookings`.

### 1. Générer la nouvelle App Django
Depuis votre terminal à la racine du projet, exécutez la commande pour générer l'application :
```bash
docker compose exec backend python manage.py startapp bookings
```
Cela crée un dossier `backend/bookings/` contenant les fichiers de base (`models.py`, `views.py`, etc.).

### 2. Déclarer l'App dans les réglages globaux
Ouvrez le fichier `backend/timely_app/settings.py` et ajoutez votre application dans `INSTALLED_APPS` :
```python
INSTALLED_APPS = [
    # ...
    'core',
    'bookings', # Déclaration de votre nouveau module !
]
```

### 3. Créer le modèle de base de données
Ouvrez `backend/bookings/models.py` et définissez la structure de votre table de base de données :
```python
from django.db import models
from django.conf import settings

class Booking(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    establishment_name = models.CharField(max_w_length=150)
    booking_date = models.DateTimeField()
    status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.establishment_name}"
```

### 4. Créer et appliquer la migration SQL
Pour mettre à jour la base de données PostgreSQL :
```bash
# Générer le fichier de migration
docker compose exec backend python manage.py makemigrations bookings

# Appliquer la modification à la base de données
docker compose exec backend python manage.py migrate
```

### 5. Exposer les données via un Serializer (Django REST Framework)
Créez le fichier `backend/bookings/serializers.py` :
```python
from rest_framework import serializers
from .models import Booking

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['id', 'establishment_name', 'booking_date', 'status', 'created_at']
```

### 6. Créer la vue d'API (View)
Ouvrez `backend/bookings/views.py` et créez la logique de réponse :
```python
from rest_framework import viewsets, permissions
from .models import Booking
from .serializers import BookingSerializer

class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Ne renvoie que les réservations de l'utilisateur connecté
        return Booking.objects.filter(user=self.request.user)
```

### 7. Enregistrer les routes de l'API
Créez le fichier `backend/bookings/urls.py` :
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookingViewSet

router = DefaultRouter()
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [
    path('', include(router.urls)),
]
```

Ensuite, enregistrez ce fichier d'URL dans les routes globales du projet `backend/timely_app/urls.py` sous le préfixe `/api/` :
```python
urlpatterns = [
    path('backoffice/', admin.site.urls), # URL admin sécurisée
    path('api/', include('bookings.urls')), # Vos nouvelles routes API !
    path('', include('core.urls')),
]
```

---

## 💻 Partie 2 : Connecter et afficher les données côté Frontend (React)

Maintenant que l'API renvoie des données JSON, connectons le frontend React.

### 1. Créer le service ou appeler l'API avec Fetch
Créez une page `frontend/src/pages/Bookings/BookingsPage.tsx` :
```tsx
import { useEffect, useState } from 'react';

interface Booking {
  id: number;
  establishment_name: string;
  booking_date: string;
  status: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Utilisation du chemin relatif configuré avec le proxy de Vite (/api)
    fetch('/api/bookings/')
      .then(res => {
        if (!res.ok) throw new Error("Erreur de récupération");
        return res.json();
      })
      .then(data => {
        setBookings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erreur API :", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-extrabold mb-6">Mes Réservations</h1>
      
      <div className="grid gap-4">
        {bookings.map(b => (
          <div key={b.id} className="card bg-white border border-neutral-200 p-4 rounded-2xl flex flex-row justify-between items-center shadow-sm">
            <div>
              <h3 className="font-bold text-lg text-neutral-900">{b.establishment_name}</h3>
              <p className="text-sm text-neutral-500">{b.booking_date}</p>
            </div>
            <span className={`badge ${b.status === 'pending' ? 'badge-warning' : 'badge-success'}`}>
              {b.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 2. Afficher la page dans l'application principale
Ouvrez `frontend/src/App.tsx` et importez votre nouvelle page pour l'afficher :
```tsx
import BookingsPage from './pages/Bookings/BookingsPage';
import { useState } from 'react';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'bookings'>('home');

  return (
    <div>
      <nav className="flex gap-4 p-4 bg-white border-b">
        <button onClick={() => setCurrentPage('home')} className="btn btn-sm">Accueil</button>
        <button onClick={() => setCurrentPage('bookings')} className="btn btn-sm">Réservations</button>
      </nav>

      {currentPage === 'home' ? (
        <HomeView />
      ) : (
        <BookingsPage />
      )}
    </div>
  );
}
```

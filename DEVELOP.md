# Guide de Développement : Créer une nouvelle fonctionnalité par Module (App) 🚀

Dans un projet professionnel, on découpe le projet en **modules distincts** (qu'on appelle **Apps** dans Django). Par exemple :
*   Un module `accounts` pour gérer la connexion des utilisateurs.
*   Un module `bookings` pour gérer les rendez-vous.
*   Un module `establishments` pour gérer les fiches de commerçants.

Voici comment créer une nouvelle fonctionnalité de A à Z en utilisant cette approche modulaire.

---

## 🛠️ Partie 1 : Créer un nouveau module Backend (Django App)

Pour ce tutoriel, nous allons créer un module de réservation nommé `bookings`.

### 1. Générer la nouvelle App Django
Depuis votre terminal à la racine du projet, exécutez la commande pour générer l'application :
```bash
docker-compose exec backend python manage.py startapp bookings
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
    establishment_name = models.CharField(max_length=150)
    booking_date = models.DateTimeField()
    status = models.CharField(max_length=50, default='pending')

    def __str__(self):
        return f"{self.establishment_name} - {self.booking_date}"
```

Appliquez les migrations pour créer la table PostgreSQL correspondante :
```bash
docker-compose exec backend python manage.py makemigrations bookings
docker-compose exec backend python manage.py migrate
```

### 4. Créer la vue d'API (JSON)
Ouvrez `backend/bookings/views.py` et écrivez la fonction qui va renvoyer les données en JSON :
```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Booking

@api_view(['GET'])
def api_get_bookings(request):
    bookings = Booking.objects.all()
    
    # Formater les données pour le Frontend
    data = []
    for b in bookings:
        data.append({
            'id': b.id,
            'establishment_name': b.establishment_name,
            'booking_date': b.booking_date.strftime('%d/%m/%Y à %H:%M'),
            'status': b.status
        })
        
    return Response(data)
```

### 5. Configurer la route (URL) de l'API
1. Créez un fichier `backend/bookings/urls.py` :
   ```python
   from django.urls import path
   from . import views

   app_name = 'bookings'

   urlpatterns = [
       path('api/bookings/', views.api_get_bookings, name='api_get_bookings'),
   ]
   ```

2. Reliez cette route au fichier d'URLs principal dans `backend/timely_app/urls.py` :
   ```python
   from django.urls import path, include

   urlpatterns = [
       path('admin/', admin.site.urls),
       path('', include('core.urls')),
       path('', include('bookings.urls')), # On lie notre nouvelle app ici !
   ]
   ```
   *L'API est maintenant accessible à l'adresse : `http://localhost:8000/api/bookings/`*

---

## 💻 Partie 2 : Créer la page correspondante dans le Frontend (React)

Dans le frontend, nous allons organiser notre code par dossier pour chaque page ou fonctionnalité.

### 1. Structurer l'arborescence
Créez un dossier pour votre page dans `frontend/src/pages/` :
*   📂 `frontend/src/pages/Bookings/BookingsPage.tsx`

### 2. Écrire le composant de page React
Ouvrez `frontend/src/pages/Bookings/BookingsPage.tsx` :
```tsx
import { useState, useEffect } from 'react';

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
    fetch('http://localhost:8000/api/bookings/')
      .then(res => res.json())
      .then((data: Booking[]) => {
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

### 3. Afficher la page dans l'application principale
Ouvrez `frontend/src/App.tsx` et importez votre nouvelle page pour l'afficher (par exemple avec un système d'onglets ou de route) :

```tsx
import BookingsPage from './pages/Bookings/BookingsPage';
import { useState } from 'react';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'bookings'>('home');

  return (
    <div>
      {/* Votre barre de navigation avec des boutons pour changer de page */}
      <nav className="flex gap-4 p-4 bg-white border-b">
        <button onClick={() => setCurrentPage('home')} className="btn btn-sm">Accueil</button>
        <button onClick={() => setCurrentPage('bookings')} className="btn btn-sm">Réservations</button>
      </nav>

      {/* Rendu conditionnel de la page active */}
      {currentPage === 'home' ? (
        <HomeView />
      ) : (
        <BookingsPage />
      )}
    </div>
  );
}
```

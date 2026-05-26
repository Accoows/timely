from django.shortcuts import render

# Données fictives pour la démonstration du filtrage dynamique HTMX
POPULAR_ESTABLISHMENTS = [
    {
        'id': 1,
        'name': 'Le Bistrot Gourmet',
        'category': 'restaurant',
        'address': '8 Rue des Dames, Lyon',
        'rating': '4.9',
        'image': 'core/images/pop_restaurant.jpg',
        'badge': 'Restaurant'
    },
    {
        'id': 2,
        'name': "Hôtel & Spa L'Horizon",
        'category': 'hotel',
        'address': 'Promenade des Anglais, Nice',
        'rating': '4.7',
        'image': 'core/images/pop_hotel.jpg',
        'badge': 'Hôtel'
    },
    {
        'id': 3,
        'name': "L'Atelier Coiffure & Barbe",
        'category': 'beauty',
        'address': '21 Boulevard Saint-Germain, Paris',
        'rating': '4.9',
        'image': 'core/images/pop_beauty.jpg',
        'badge': 'Beauté'
    }
]

def home_view(request):
    """Vue pour afficher la page d'accueil"""
    return render(request, 'core/home.html', {'establishments': POPULAR_ESTABLISHMENTS})

def popular_filter_view(request):
    """Vue appelée par HTMX pour filtrer les établissements populaires"""
    category = request.GET.get('category', 'all')
    
    if category == 'all':
        filtered = POPULAR_ESTABLISHMENTS
    else:
        filtered = [est for est in POPULAR_ESTABLISHMENTS if est['category'] == category]
        
    return render(request, 'core/partials/popular_cards.html', {'establishments': filtered})

from rest_framework.decorators import api_view
from rest_framework.response import Response

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

@api_view(['GET'])
def api_popular_establishments(request):
    """API endpoint to get and filter popular establishments"""
    category = request.query_params.get('category', 'all')
    
    if category == 'all':
        filtered = POPULAR_ESTABLISHMENTS
    else:
        filtered = [est for est in POPULAR_ESTABLISHMENTS if est['category'] == category]
        
    return Response(filtered)

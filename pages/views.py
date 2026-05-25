from django.shortcuts import render

def home_view(request):
    """Vue pour afficher la page d'accueil"""
    return render(request, 'pages/home.html')

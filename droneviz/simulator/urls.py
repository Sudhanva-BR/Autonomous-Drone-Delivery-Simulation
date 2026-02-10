"""
URL configuration for simulator app.
"""
from django.urls import path
from .views import run_simulation

urlpatterns = [
    path('run/', run_simulation, name='run_simulation'),
]

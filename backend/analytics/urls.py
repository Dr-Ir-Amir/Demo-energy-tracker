from django.urls import path
from . import views

urlpatterns = [
    path('summary/', views.dashboard_summary, name='dashboard-summary'),
    path('trends/', views.trends, name='trends'),
    path('anomalies/', views.anomalies, name='anomalies'),
    path('export/csv/', views.export_csv, name='export-csv'),
    path('export/pdf/', views.export_pdf, name='export-pdf'),
]

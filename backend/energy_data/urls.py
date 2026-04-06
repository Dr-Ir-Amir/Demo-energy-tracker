from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_csv, name='upload-csv'),
    path('records/', views.get_records, name='get-records'),
    path('uploads/', views.get_uploads, name='get-uploads'),
]

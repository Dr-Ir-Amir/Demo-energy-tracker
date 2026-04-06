from rest_framework import serializers
from .models import EnergyRecord, CSVUpload


class EnergyRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnergyRecord
        fields = '__all__'


class CSVUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = CSVUpload
        fields = ['id', 'file_name', 'uploaded_at', 'row_count']

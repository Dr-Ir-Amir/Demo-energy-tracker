from django.db import models
from django.conf import settings


class CSVUpload(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    file_name = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    row_count = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.file_name} by {self.user.username}"


class EnergyRecord(models.Model):
    upload = models.ForeignKey(CSVUpload, on_delete=models.CASCADE, related_name='records')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    timestamp = models.DateTimeField()
    hour = models.IntegerField()
    day = models.IntegerField()
    month = models.IntegerField()
    occupancy_rate = models.FloatField(null=True, blank=True)
    conference_room = models.FloatField(null=True, blank=True)
    solar_power = models.FloatField(null=True, blank=True)
    rooms_energy_kWh = models.FloatField(null=True, blank=True)
    conference_energy_kWh = models.FloatField(null=True, blank=True)
    laundry_energy_kWh = models.FloatField(null=True, blank=True)
    kitchen_energy_kWh = models.FloatField(null=True, blank=True)
    hvac_energy_kWh = models.FloatField(null=True, blank=True)
    heatpump_energy_kWh = models.FloatField(null=True, blank=True)
    total_energy_kWh = models.FloatField(null=True, blank=True)
    grid_on = models.BooleanField(default=True)
    solar_used_kWh = models.FloatField(null=True, blank=True)
    grid_energy_kWh = models.FloatField(null=True, blank=True)
    generator_kWh = models.FloatField(null=True, blank=True)
    diesel_litres = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Record {self.timestamp}"

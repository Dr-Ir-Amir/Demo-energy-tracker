import io
import csv
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Avg, Max, Min
from energy_data.models import EnergyRecord
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


CO2_FACTOR_GRID = 0.5  # kg CO2 per kWh (grid)
CO2_FACTOR_DIESEL = 2.68  # kg CO2 per litre diesel


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    qs = EnergyRecord.objects.filter(user=request.user)
    month = request.query_params.get('month')
    day = request.query_params.get('day')
    if month:
        qs = qs.filter(month=int(month))
    if day:
        qs = qs.filter(day=int(day))

    agg = qs.aggregate(
        total_energy=Sum('total_energy_kWh'),
        total_solar=Sum('solar_used_kWh'),
        total_grid=Sum('grid_energy_kWh'),
        total_generator=Sum('generator_kWh'),
        total_diesel=Sum('diesel_litres'),
        avg_occupancy=Avg('occupancy_rate'),
        total_hvac=Sum('hvac_energy_kWh'),
        total_kitchen=Sum('kitchen_energy_kWh'),
        total_laundry=Sum('laundry_energy_kWh'),
        total_conference=Sum('conference_energy_kWh'),
        total_rooms=Sum('rooms_energy_kWh'),
        total_heatpump=Sum('heatpump_energy_kWh'),
    )

    grid_co2 = (agg['total_grid'] or 0) * CO2_FACTOR_GRID
    diesel_co2 = (agg['total_diesel'] or 0) * CO2_FACTOR_DIESEL
    total_co2 = grid_co2 + diesel_co2
    renewable_pct = 0
    if agg['total_energy'] and agg['total_energy'] > 0:
        renewable_pct = round(((agg['total_solar'] or 0) / agg['total_energy']) * 100, 2)

    occupancy_efficiency = None
    if agg['avg_occupancy'] and agg['avg_occupancy'] > 0:
        occupancy_efficiency = round((agg['total_energy'] or 0) / agg['avg_occupancy'], 2)

    return Response({
        **{k: round(v, 2) if v else 0 for k, v in agg.items()},
        'co2_grid_kg': round(grid_co2, 2),
        'co2_diesel_kg': round(diesel_co2, 2),
        'co2_total_kg': round(total_co2, 2),
        'renewable_percentage': renewable_pct,
        'occupancy_efficiency': occupancy_efficiency,
        'record_count': qs.count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trends(request):
    """Return time-series data grouped by hour for charts."""
    qs = EnergyRecord.objects.filter(user=request.user)
    month = request.query_params.get('month')
    if month:
        qs = qs.filter(month=int(month))

    records = qs.order_by('timestamp').values(
        'timestamp', 'total_energy_kWh', 'solar_used_kWh', 'grid_energy_kWh',
        'generator_kWh', 'hvac_energy_kWh', 'kitchen_energy_kWh',
        'laundry_energy_kWh', 'rooms_energy_kWh', 'heatpump_energy_kWh',
        'conference_energy_kWh', 'occupancy_rate',
    )[:500]

    return Response(list(records))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def anomalies(request):
    """Detect energy spikes above 2x the average."""
    qs = EnergyRecord.objects.filter(user=request.user)
    avg = qs.aggregate(avg=Avg('total_energy_kWh'))['avg'] or 0
    threshold = avg * 2
    spikes = qs.filter(total_energy_kWh__gt=threshold).values(
        'timestamp', 'total_energy_kWh', 'hour', 'day', 'month'
    )[:100]
    return Response({'average': round(avg, 2), 'threshold': round(threshold, 2), 'spikes': list(spikes)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_csv(request):
    qs = EnergyRecord.objects.filter(user=request.user)
    month = request.query_params.get('month')
    if month:
        qs = qs.filter(month=int(month))

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="energy_export.csv"'
    writer = csv.writer(response)

    fields = [f.name for f in EnergyRecord._meta.get_fields() if f.name not in ('upload', 'user', 'id')]
    writer.writerow(fields)
    for rec in qs.iterator():
        writer.writerow([getattr(rec, f) for f in fields])

    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_pdf(request):
    qs = EnergyRecord.objects.filter(user=request.user)
    agg = qs.aggregate(
        total_energy=Sum('total_energy_kWh'),
        total_solar=Sum('solar_used_kWh'),
        total_grid=Sum('grid_energy_kWh'),
        total_diesel=Sum('diesel_litres'),
    )

    buf = io.BytesIO()
    p = canvas.Canvas(buf, pagesize=A4)
    p.setFont("Helvetica-Bold", 18)
    p.drawString(50, 780, "Energy Monitoring Report")
    p.setFont("Helvetica", 12)
    y = 740
    lines = [
        f"Total Energy: {round(agg['total_energy'] or 0, 2)} kWh",
        f"Solar Used: {round(agg['total_solar'] or 0, 2)} kWh",
        f"Grid Energy: {round(agg['total_grid'] or 0, 2)} kWh",
        f"Diesel Used: {round(agg['total_diesel'] or 0, 2)} litres",
        f"CO2 (Grid): {round((agg['total_grid'] or 0) * CO2_FACTOR_GRID, 2)} kg",
        f"CO2 (Diesel): {round((agg['total_diesel'] or 0) * CO2_FACTOR_DIESEL, 2)} kg",
    ]
    for line in lines:
        p.drawString(50, y, line)
        y -= 25
    p.save()
    buf.seek(0)

    response = HttpResponse(buf, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="energy_report.pdf"'
    return response

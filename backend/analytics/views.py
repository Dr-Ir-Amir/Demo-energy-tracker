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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def export_pdf(request):
    import json
    import base64
    from datetime import datetime
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    selections = request.data
    charts = selections.get('charts', [])
    loads = selections.get('loads', [])
    chart_images = selections.get('chartImages', {})

    qs = EnergyRecord.objects.filter(user=request.user)
    count = qs.count()

    # Aggregate all data
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
        max_energy=Max('total_energy_kWh'),
        min_energy=Min('total_energy_kWh'),
    )

    grid_co2 = (agg['total_grid'] or 0) * CO2_FACTOR_GRID
    diesel_co2 = (agg['total_diesel'] or 0) * CO2_FACTOR_DIESEL
    total_co2 = grid_co2 + diesel_co2
    total_e = agg['total_energy'] or 0
    renewable_pct = round(((agg['total_solar'] or 0) / total_e * 100), 2) if total_e > 0 else 0

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=30*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm)
    styles = getSampleStyleSheet()
    story = []

    # Custom styles
    title_style = ParagraphStyle('Title2', parent=styles['Title'], fontSize=22, textColor=colors.HexColor('#0a2540'), spaceAfter=6)
    subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#64748b'), spaceAfter=20)
    heading_style = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#0ea5e9'), spaceBefore=16, spaceAfter=8)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, textColor=colors.HexColor('#334155'))
    key_style = ParagraphStyle('Key', parent=styles['Normal'], fontSize=10, leading=14, textColor=colors.HexColor('#0f172a'), bulletIndent=10, leftIndent=20)

    # Header
    story.append(Paragraph("SMATICS Energy Report", title_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y at %H:%M')} | Records: {count}", subtitle_style))
    story.append(Spacer(1, 4*mm))

    # Executive Summary
    story.append(Paragraph("Executive Summary", heading_style))
    story.append(Paragraph(
        f"This report covers {count} energy records. Total energy consumption was "
        f"<b>{round(total_e, 1)} kWh</b>, with peak usage of {round(agg['max_energy'] or 0, 1)} kWh "
        f"and minimum of {round(agg['min_energy'] or 0, 1)} kWh per interval. "
        f"Renewable energy contributed <b>{renewable_pct}%</b> of total consumption. "
        f"Total CO\u2082 emissions: <b>{round(total_co2, 1)} kg</b>.", body_style))
    story.append(Spacer(1, 4*mm))

    # KPI Table
    story.append(Paragraph("Key Performance Indicators", heading_style))
    kpi_data = [
        ['Metric', 'Value'],
        ['Total Energy', f"{round(total_e, 2)} kWh"],
        ['Solar Used', f"{round(agg['total_solar'] or 0, 2)} kWh"],
        ['Grid Energy', f"{round(agg['total_grid'] or 0, 2)} kWh"],
        ['Generator', f"{round(agg['total_generator'] or 0, 2)} kWh"],
        ['Diesel Used', f"{round(agg['total_diesel'] or 0, 2)} litres"],
        ['CO\u2082 (Grid)', f"{round(grid_co2, 2)} kg"],
        ['CO\u2082 (Diesel)', f"{round(diesel_co2, 2)} kg"],
        ['Renewable %', f"{renewable_pct}%"],
        ['Avg Occupancy', f"{round(agg['avg_occupancy'] or 0, 3)}"],
    ]
    t = Table(kpi_data, colWidths=[80*mm, 80*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0ea5e9')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f8fafc'), colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 6*mm))

    # Selected loads breakdown
    if loads:
        story.append(Paragraph("Selected Load Breakdown", heading_style))
        load_map = {
            'hvac': ('HVAC', agg['total_hvac']),
            'rooms': ('Rooms', agg['total_rooms']),
            'kitchen': ('Kitchen', agg['total_kitchen']),
            'laundry': ('Laundry', agg['total_laundry']),
            'conference': ('Conference', agg['total_conference']),
            'heatpump': ('Heatpump', agg['total_heatpump']),
        }
        load_data = [['Load', 'Total kWh', '% of Total']]
        for l in loads:
            if l in load_map:
                name, val = load_map[l]
                val = val or 0
                pct = round(val / total_e * 100, 1) if total_e > 0 else 0
                load_data.append([name, f"{round(val, 2)}", f"{pct}%"])

        lt = Table(load_data, colWidths=[55*mm, 55*mm, 50*mm])
        lt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f0f9ff'), colors.white]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(lt)
        story.append(Spacer(1, 6*mm))

    # Chart descriptions with key data markers
    chart_info = {
        'energy_breakdown': {
            'title': 'Energy Breakdown by Source',
            'desc': f"The pie chart shows the distribution of energy consumption across all facility systems. "
                    f"HVAC is the largest consumer at {round(agg['total_hvac'] or 0, 1)} kWh, "
                    f"followed by Rooms ({round(agg['total_rooms'] or 0, 1)} kWh) and "
                    f"Kitchen ({round(agg['total_kitchen'] or 0, 1)} kWh). "
                    f"Conference rooms account for the smallest share at {round(agg['total_conference'] or 0, 1)} kWh.",
        },
        'power_source': {
            'title': 'Power Source Comparison',
            'desc': f"This chart compares the three power sources. Grid energy dominates at "
                    f"{round(agg['total_grid'] or 0, 1)} kWh, while solar contributed "
                    f"{round(agg['total_solar'] or 0, 1)} kWh ({renewable_pct}% renewable). "
                    f"Generator usage was {round(agg['total_generator'] or 0, 1)} kWh, "
                    f"consuming {round(agg['total_diesel'] or 0, 1)} litres of diesel.",
        },
        'energy_trends': {
            'title': 'Energy Consumption Over Time',
            'desc': f"The stacked area chart displays energy consumption trends across all systems over time. "
                    f"Peak consumption reached {round(agg['max_energy'] or 0, 1)} kWh per interval, "
                    f"with a minimum of {round(agg['min_energy'] or 0, 1)} kWh. "
                    f"Average occupancy rate was {round(agg['avg_occupancy'] or 0, 3)}.",
        },
        'occupancy_vs_energy': {
            'title': 'Occupancy vs Energy Consumption',
            'desc': f"This dual-axis chart correlates occupancy rate with total energy consumption. "
                    f"Average occupancy was {round(agg['avg_occupancy'] or 0, 3)}, suggesting "
                    f"{'strong' if (agg['avg_occupancy'] or 0) > 0.7 else 'moderate'} facility utilization. "
                    f"Higher occupancy periods generally correspond to increased energy demand.",
        },
        'renewable_share': {
            'title': 'Renewable Energy Share',
            'desc': f"Solar energy accounted for {renewable_pct}% of total consumption. "
                    f"The facility used {round(agg['total_solar'] or 0, 1)} kWh from solar "
                    f"out of {round(total_e, 1)} kWh total. "
                    f"{'This exceeds typical benchmarks.' if renewable_pct > 20 else 'There is room to increase renewable adoption.'}",
        },
        'co2_breakdown': {
            'title': 'CO\u2082 Emissions Breakdown',
            'desc': f"Total CO\u2082 emissions were {round(total_co2, 1)} kg. "
                    f"Grid electricity contributed {round(grid_co2, 1)} kg "
                    f"and diesel generators added {round(diesel_co2, 1)} kg. "
                    f"{'Diesel is the primary emissions driver.' if diesel_co2 > grid_co2 else 'Grid electricity is the primary emissions source.'}",
        },
        'hourly_pattern': {
            'title': 'Energy by Hour of Day',
            'desc': f"The hourly distribution reveals consumption patterns throughout the day. "
                    f"This helps identify peak demand hours for load-shifting opportunities "
                    f"and potential energy savings during off-peak periods.",
        },
        'energy_balance': {
            'title': 'Energy Balance by System',
            'desc': f"This breakdown shows each system's contribution to total facility energy use. "
                    f"HVAC ({round(agg['total_hvac'] or 0, 1)} kWh) and Rooms ({round(agg['total_rooms'] or 0, 1)} kWh) "
                    f"together account for over 50% of consumption.",
        },
        'solar_vs_grid': {
            'title': 'Solar vs Grid Usage Over Time',
            'desc': f"This comparison tracks solar and grid usage patterns. Solar provided "
                    f"{round(agg['total_solar'] or 0, 1)} kWh while grid supplied "
                    f"{round(agg['total_grid'] or 0, 1)} kWh. "
                    f"The renewable share of {renewable_pct}% indicates "
                    f"{'good' if renewable_pct > 15 else 'limited'} solar utilization.",
        },
    }

    if charts:
        story.append(Paragraph("Selected Chart Analysis", heading_style))
        for chart_id in charts:
            if chart_id in chart_info:
                info = chart_info[chart_id]
                story.append(Paragraph(info['title'], ParagraphStyle('ChartTitle', parent=styles['Heading3'], fontSize=12, textColor=colors.HexColor('#0f172a'), spaceBefore=10, spaceAfter=4)))

                # Embed chart image if available
                if chart_id in chart_images and chart_images[chart_id]:
                    try:
                        img_data = base64.b64decode(chart_images[chart_id])
                        img_buf = io.BytesIO(img_data)
                        img = Image(img_buf, width=160*mm, height=93*mm)
                        story.append(img)
                        story.append(Spacer(1, 2*mm))
                    except Exception:
                        pass

                story.append(Paragraph(info['desc'], body_style))
                story.append(Spacer(1, 3*mm))

    # Footer
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph("— End of Report —", ParagraphStyle('Footer', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#94a3b8'), alignment=1)))
    story.append(Paragraph("Generated by SMATICS Energy Monitoring Dashboard", ParagraphStyle('Footer2', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#cbd5e1'), alignment=1)))

    doc.build(story)
    buf.seek(0)

    response = HttpResponse(buf, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="smatics_energy_report.pdf"'
    return response


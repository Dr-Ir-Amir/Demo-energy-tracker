import pandas as pd
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from .models import EnergyRecord, CSVUpload
from .serializers import EnergyRecordSerializer, CSVUploadSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_csv(request):
    file = request.FILES.get('file')
    if not file or not file.name.endswith('.csv'):
        return Response({'error': 'Please upload a valid CSV file.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        df = pd.read_csv(file)
    except Exception as e:
        return Response({'error': f'Failed to parse CSV: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    upload = CSVUpload.objects.create(user=request.user, file_name=file.name, row_count=len(df))

    records = []
    for _, row in df.iterrows():
        try:
            ts = pd.to_datetime(row.get('timestamp'), dayfirst=False)
        except Exception:
            continue

        record_data = {
            'upload': upload,
            'user': request.user,
            'timestamp': ts,
            'hour': int(row.get('hour', ts.hour)),
            'day': int(row.get('day', ts.day)),
            'month': int(row.get('month', ts.month)),
        }
        # Dynamically pick up all numeric columns beyond the base ones
        skip_cols = {'timestamp', 'hour', 'day', 'month'}
        model_fields = {f.name for f in EnergyRecord._meta.get_fields()}
        for col in df.columns:
            field_name = col.strip()
            if field_name in skip_cols or field_name not in model_fields:
                continue
            val = row.get(col)
            if pd.notna(val):
                if field_name == 'grid_on':
                    record_data[field_name] = bool(int(val))
                else:
                    try:
                        record_data[field_name] = float(val)
                    except (ValueError, TypeError):
                        pass

        records.append(EnergyRecord(**record_data))

    EnergyRecord.objects.bulk_create(records, batch_size=500)

    return Response({
        'message': f'Successfully uploaded {len(records)} records.',
        'upload': CSVUploadSerializer(upload).data,
        'columns_detected': list(df.columns),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_records(request):
    qs = EnergyRecord.objects.filter(user=request.user)

    # Time filters
    period = request.query_params.get('period')  # hourly, daily, weekly
    month = request.query_params.get('month')
    day = request.query_params.get('day')

    if month:
        qs = qs.filter(month=int(month))
    if day:
        qs = qs.filter(day=int(day))

    serializer = EnergyRecordSerializer(qs[:1000], many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_uploads(request):
    uploads = CSVUpload.objects.filter(user=request.user).order_by('-uploaded_at')
    serializer = CSVUploadSerializer(uploads, many=True)
    return Response(serializer.data)

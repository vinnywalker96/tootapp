from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from reportlab.pdfgen import canvas
from io import BytesIO
import logging
import calendar
from django.db.models import Count, Q
from django.utils import timezone
from django.db import connection
from django.conf import settings

from ..models import Trip
from ..serializers import TripSerializer
from ..services import NotificationService

logger = logging.getLogger(__name__)

class IsOwnerOrDriver(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        logger.debug(f"User: {request.user}, Driver: {obj.driver}")
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user or obj.driver == request.user

class TripListCreateView(generics.ListCreateAPIView):
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Optimize queryset by using select_related for foreign keys
        """
        return Trip.objects.select_related(
            'pickup_location', 
            'dropoff_location', 
            'driver', 
            'user'
        ).all()

    def perform_create(self, serializer):
        trip = serializer.save(user=self.request.user)
        
        # Send SMS notification to all drivers
        self.notify_drivers_of_new_trip(trip)
        
    def notify_drivers_of_new_trip(self, trip):
        """
        Send SMS notifications to all drivers about the new trip
        """
        try:
            # Get all active drivers
            from authentication.models import Driver
            drivers = Driver.objects.filter(is_active=True, is_verified=True)
            
            if not drivers:
                logger.warning("No active drivers found to notify")
                return
                
            # Initialize notification service
            notification_service = NotificationService()
            
            # Prepare trip details for notification
            trip_details = {
                'id': trip.id,
                'pickup_location': trip.pickup_location.location if trip.pickup_location else 'N/A',
                'destination': trip.dropoff_location.location if trip.dropoff_location else 'N/A',
                'pickup_date': trip.pickup_time.strftime('%Y-%m-%d') if trip.pickup_time else 'N/A',
                'pickup_time': trip.pickup_time.strftime('%H:%M') if trip.pickup_time else 'N/A',
            }
            
            # Send notifications to all drivers
            for driver in drivers:
                if driver.phone_number:
                    notification_service.send_trip_notification(
                        driver.phone_number,
                        trip_details
                    )
                    logger.info(f"Sent trip notification to driver {driver.id}")
                else:
                    logger.warning(f"Driver {driver.id} has no phone number")
                    
        except Exception as e:
            logger.error(f"Failed to send driver notifications: {str(e)}")

class TripRetrieveUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TripSerializer
    lookup_field = 'pk'

    def get_queryset(self):
        """
        Optimize queryset by using select_related for foreign keys
        """
        return Trip.objects.select_related(
            'pickup_location', 
            'dropoff_location', 
            'driver', 
            'user'
        ).all()

    def perform_update(self, serializer):
        serializer.save(driver=self.request.user.driver)

class TripRetrieveByDriverView(generics.ListAPIView):
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Optimize queryset by using select_related for foreign keys
        """
        driver_id = self.kwargs['driver_id']
        return Trip.objects.select_related(
            'pickup_location', 
            'dropoff_location', 
            'user'
        ).filter(driver_id=driver_id)


class TripListView(generics.ListAPIView):
    """
    TripListView - Gets all trips with counts of in progress and completed trips
    """
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Optimize queryset by using select_related for foreign keys and ordering
        """
        # Get query parameters for filtering
        status_filter = self.request.query_params.get('status', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        # Start with an optimized base queryset
        queryset = Trip.objects.select_related(
            'pickup_location', 
            'dropoff_location', 
            'driver', 
            'user'
        )
        
        # Apply filters if provided
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        if date_from:
            queryset = queryset.filter(pickup_time__gte=date_from)
            
        if date_to:
            queryset = queryset.filter(pickup_time__lte=date_to)
        
        # Return ordered queryset
        return queryset.order_by('-pickup_time')

    def list(self, request, *args, **kwargs):
        # Get the filtered queryset
        queryset = self.get_queryset()
        
        # Use pagination if it's set up
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            response_data = paginated_response.data
        else:
            serializer = self.get_serializer(queryset, many=True)
            response_data = serializer.data
        
        # Efficiently count trips by status using a single query
        status_counts = Trip.objects.values('status').annotate(count=Count('status'))
        
        # Convert to a more usable format
        counts = {item['status']: item['count'] for item in status_counts}
        
        # Get specific counts
        in_progress_count = counts.get('IN_PROGRESS', 0)
        completed_count = counts.get('COMPLETED', 0)
        requested_count = counts.get('REQUESTED', 0)
        accepted_count = counts.get('ACCEPTED', 0)
        cancelled_count = counts.get('CANCELLED', 0)
        
        # If we used pagination, structure the response differently
        if page is not None:
            response_data.update({
                "in_progress_count": in_progress_count,
                "completed_count": completed_count,
                "requested_count": requested_count,
                "accepted_count": accepted_count,
                "cancelled_count": cancelled_count
            })
            return Response(response_data)
        else:
            return Response({
                "trips": response_data,
                "in_progress_count": in_progress_count,
                "completed_count": completed_count,
                "requested_count": requested_count,
                "accepted_count": accepted_count,
                "cancelled_count": cancelled_count
            }, status=status.HTTP_200_OK)


class TripCompletedCountView(generics.GenericAPIView):
    """
    TripCompletedCountView - Gets the count of completed trips for each month
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TripSerializer
    
    def get(self, request, *args, **kwargs):
        # Get the current year
        current_year = timezone.now().year
        
        # Use a more efficient query to get monthly counts in a single database hit
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    EXTRACT(MONTH FROM pickup_time) as month,
                    COUNT(*) as count
                FROM 
                    trips_trip
                WHERE 
                    status = 'COMPLETED'
                    AND EXTRACT(YEAR FROM pickup_time) = %s
                GROUP BY 
                    EXTRACT(MONTH FROM pickup_time)
                ORDER BY 
                    month
            """, [current_year])
            
            # Convert the query results to a dictionary
            monthly_counts = {int(row[0]): int(row[1]) for row in cursor.fetchall()}
        
        # Format the response data
        completed_trips_data = []
        for month in range(1, 13):
            month_name = calendar.month_name[month]
            completed_trips_count = monthly_counts.get(month, 0)
            completed_trips_data.append({
                "month": month_name,
                "completed_trips_count": completed_trips_count
            })

        return Response(completed_trips_data, status=status.HTTP_200_OK)

class TripStatusView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, trip_id, *args, **kwargs):
        try:
            # Use select_related to optimize the query
            trip = Trip.objects.select_related(
                'driver', 
                'user', 
                'pickup_location', 
                'dropoff_location'
            ).get(id=trip_id)

            trip_data = {
                "id": trip.id,
                "status": trip.status,
                "vehicle_type": trip.vehicle_type,
                "driver_name": trip.driver.full_name if trip.driver else None,
                "driver_phone": trip.driver.phone_number if trip.driver else None,  # Include phone number
                "user_name": trip.user.full_name if trip.user else None,
                "pickup_location": trip.pickup_location.location,
                "dropoff_location": trip.dropoff_location.location,
                "pickup_time": trip.pickup_time,
                "load_description": trip.load_description,
                "rating": trip.rating,
                "is_accepted": trip.is_accepted,
            }

            return Response(trip_data, status=status.HTTP_200_OK)
        except Trip.DoesNotExist:
            return Response({"detail": "Trip not found."}, status=status.HTTP_404_NOT_FOUND)


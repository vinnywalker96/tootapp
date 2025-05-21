from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from ..models import Trip, Bid
from ..serializers import BidSerializer
from ..services import NotificationService
import logging

logger = logging.getLogger(__name__)

class BidListCreateView(generics.ListCreateAPIView):
    """
    List all bids for a trip or create a new bid
    """
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Get all bids for a specific trip
        """
        trip_id = self.kwargs.get('trip_id')
        return Bid.objects.select_related('driver', 'trip').filter(trip_id=trip_id)
    
    def perform_create(self, serializer):
        """
        Create a new bid for a trip
        """
        trip_id = self.kwargs.get('trip_id')
        trip = get_object_or_404(Trip, id=trip_id)
        
        # Check if the trip is open for bidding
        if trip.status != 'REQUESTED':
            return Response(
                {"detail": "This trip is not open for bidding."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if the user is a driver
        if not hasattr(self.request.user, 'driver'):
            return Response(
                {"detail": "Only drivers can place bids."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Save the bid
        bid = serializer.save(
            trip=trip,
            driver=self.request.user.driver
        )
        
        # Send notification to trip owner
        try:
            notification_service = NotificationService()
            
            # Prepare bid details for notification
            bid_details = {
                'trip_id': str(trip.id),
                'amount': str(bid.amount),
                'driver_name': self.request.user.driver.full_name if hasattr(self.request.user.driver, 'full_name') else self.request.user.username
            }
            
            # Send SMS notification to trip owner
            if trip.user and trip.user.phone_number:
                notification_service.send_bid_notification(
                    trip.user.phone_number,
                    bid_details
                )
                logger.info(f"Sent bid notification to user {trip.user.id}")
        except Exception as e:
            logger.error(f"Failed to send bid notification: {str(e)}")

class BidRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a bid
    """
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Bid.objects.all()
    
    def get_queryset(self):
        """
        Ensure users can only see bids they placed or received
        """
        user = self.request.user
        
        if hasattr(user, 'driver'):
            # Driver can see their own bids
            return Bid.objects.filter(driver=user.driver)
        else:
            # Trip owner can see bids for their trips
            return Bid.objects.filter(trip__user=user)
    
    def perform_update(self, serializer):
        """
        Update a bid
        """
        # Only allow drivers to update their own bids
        bid = self.get_object()
        if bid.driver.user != self.request.user:
            return Response(
                {"detail": "You can only update your own bids."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Only allow updates if the bid is not accepted
        if bid.is_accepted:
            return Response(
                {"detail": "Cannot update an accepted bid."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer.save()

class AcceptBidView(APIView):
    """
    Accept a bid for a trip
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, bid_id):
        """
        Accept a bid
        """
        bid = get_object_or_404(Bid, id=bid_id)
        trip = bid.trip
        
        # Check if the user is the trip owner
        if trip.user != request.user:
            return Response(
                {"detail": "Only the trip owner can accept bids."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if the trip is still open for bidding
        if trip.status != 'REQUESTED':
            return Response(
                {"detail": "This trip is not open for bidding."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if another bid is already accepted
        if Bid.objects.filter(trip=trip, is_accepted=True).exists():
            return Response(
                {"detail": "Another bid has already been accepted for this trip."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Accept the bid
        bid.is_accepted = True
        bid.save()
        
        # Update the trip
        trip.driver = bid.driver
        trip.status = 'ACCEPTED'
        trip.is_accepted = True
        trip.save()
        
        # Send notification to the driver
        try:
            notification_service = NotificationService()
            
            # Prepare trip details for notification
            trip_details = {
                'id': str(trip.id),
                'pickup_location': trip.pickup_location.location if trip.pickup_location else 'N/A',
                'destination': trip.dropoff_location.location if trip.dropoff_location else 'N/A',
                'pickup_date': trip.pickup_time.strftime('%Y-%m-%d') if trip.pickup_time else 'N/A',
                'pickup_time': trip.pickup_time.strftime('%H:%M') if trip.pickup_time else 'N/A',
            }
            
            # Send SMS notification to driver
            if bid.driver.phone_number:
                notification_service.send_bid_accepted_notification(
                    bid.driver.phone_number,
                    trip_details
                )
                logger.info(f"Sent bid acceptance notification to driver {bid.driver.id}")
        except Exception as e:
            logger.error(f"Failed to send bid acceptance notification: {str(e)}")
        
        return Response(
            {"detail": "Bid accepted successfully."},
            status=status.HTTP_200_OK
        )


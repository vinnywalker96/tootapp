from django.utils import timezone
from .models import Trip, Payment, PickupLocation, DropoffLocation, Bid, ChatMessage
from authentication.serializers import UserSerializer, DriverSerializer
from authentication.utils.notification_service import NotificationService
import logging
import re

from rest_framework import serializers

logger = logging.getLogger(__name__)

class PickupLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PickupLocation
        fields = '__all__'

class DropoffLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DropoffLocation
        fields = '__all__'

class BidSerializer(serializers.ModelSerializer):
    driver_details = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Bid
        fields = ['id', 'trip', 'driver', 'amount', 'created', 'updated', 'is_accepted', 'driver_details']
        read_only_fields = ['id', 'created', 'updated', 'is_accepted']
    
    def get_driver_details(self, obj):
        return {
            'id': obj.driver.id,
            'full_name': obj.driver.full_name,
            'phone_number': obj.driver.phone_number,
            'rating': obj.driver.rating
        }
        
    def validate_amount(self, value):
        trip = self.context.get('trip')
        if trip and trip.min_bid and value < trip.min_bid:
            raise serializers.ValidationError(f"Bid amount must be at least {trip.min_bid}")
        if trip and trip.max_bid and value > trip.max_bid:
            raise serializers.ValidationError(f"Bid amount cannot exceed {trip.max_bid}")
        return value

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = ['id', 'trip', 'sender', 'content', 'timestamp', 'is_read', 'sender_name']
        read_only_fields = ['id', 'timestamp', 'sender_name']
    
    def get_sender_name(self, obj):
        return obj.sender.full_name if hasattr(obj.sender, 'full_name') else obj.sender.username

class TripSerializer(serializers.ModelSerializer):
    pickup_location = PickupLocationSerializer()
    dropoff_location = DropoffLocationSerializer()
    driver = DriverSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    bids = BidSerializer(many=True, read_only=True)
    
    class Meta:
        model = Trip
        fields = '__all__'
        read_only_fields = ['id', 'created', 'updated']
        
    def validate_pickup_time(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("Pickup time cannot be in the past.")
        return value
        
    def validate_bid(self, value):
        if value < 0:
            raise serializers.ValidationError("Bid amount cannot be negative.")
        return value
        
    def validate_min_bid(self, value):
        if value < 0:
            raise serializers.ValidationError("Minimum bid amount cannot be negative.")
        return value
        
    def validate_max_bid(self, value):
        min_bid = self.initial_data.get('min_bid')
        if min_bid and float(value) < float(min_bid):
            raise serializers.ValidationError("Maximum bid cannot be less than minimum bid.")
        return value
        
    def validate_bidding_end_time(self, value):
        if value and value < timezone.now():
            raise serializers.ValidationError("Bidding end time cannot be in the past.")
        return value

    def create(self, validated_data):
        try:
            pickup_location_data = validated_data.pop('pickup_location')
            dropoff_location_data = validated_data.pop('dropoff_location')
            
            pickup_location = PickupLocation.objects.create(**pickup_location_data)
            dropoff_location = DropoffLocation.objects.create(**dropoff_location_data)
            
            trip = Trip.objects.create(
                pickup_location=pickup_location,
                dropoff_location=dropoff_location,
                **validated_data
            )

            # Send notifications to relevant users
            try:
                notification_results = NotificationService.send_trip_notifications(trip)
                if notification_results['sms']:
                    logger.info(f"SMS notification sent for trip {trip.id}")
                if notification_results['email']:
                    logger.info(f"Email notification sent for trip {trip.id}")
            except Exception as notification_error:
                # Log the error but don't fail the trip creation
                logger.error(f"Failed to send notifications for trip {trip.id}: {str(notification_error)}")

            logger.info(f"Trip created successfully with ID: {trip.id}")
            return trip
        except Exception as e:
            logger.error(f"Error while creating trip: {str(e)}")
            raise serializers.ValidationError({"detail": "Error occurred during trip creation."})

    def update(self, instance, validated_data):
        try:
            pickup_location_data = validated_data.pop('pickup_location', None)
            dropoff_location_data = validated_data.pop('dropoff_location', None)
            
            if pickup_location_data:
                pickup_location = instance.pickup_location
                for key, value in pickup_location_data.items():
                    setattr(pickup_location, key, value)
                pickup_location.save()
                
            if dropoff_location_data:
                dropoff_location = instance.dropoff_location
                for key, value in dropoff_location_data.items():
                    setattr(dropoff_location, key, value)
                dropoff_location.save()
                
            for key, value in validated_data.items():
                setattr(instance, key, value)
                
            instance.save()
            return instance
        except Exception as e:
            logger.error(f"Error while updating trip: {str(e)}")
            raise serializers.ValidationError({"detail": "Error occurred during trip update."})

class NestedTripSerializer(TripSerializer):
    """Serializer for nested trip representation with additional details"""
    pickup_location = PickupLocationSerializer()
    dropoff_location = DropoffLocationSerializer()
    driver = DriverSerializer()
    user = UserSerializer()
    bids = BidSerializer(many=True)
    
    class Meta(TripSerializer.Meta):
        depth = 1

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['id', 'payment_date', 'order_number', 'compensation_amount', 'net_amount']

import logging
import africastalking
import os
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)

class NotificationService:
    """
    Service for sending notifications via SMS and email
    """
    
    @staticmethod
    def send_trip_notifications(trip):
        """
        Send notifications when a new trip is created
        
        Args:
            trip: The Trip object
            
        Returns:
            dict: Results of notification attempts
        """
        results = {
            'sms': False,
            'email': False
        }
        
        try:
            # Send SMS to all drivers
            from authentication.models import Driver
            drivers = Driver.objects.filter(is_active=True)
            
            if drivers.exists():
                sms_result = NotificationService.send_sms_to_drivers(trip, drivers)
                results['sms'] = sms_result
                
            # Send email notification to trip creator
            if trip.user and trip.user.email:
                email_result = NotificationService.send_trip_email(trip)
                results['email'] = email_result
                
        except Exception as e:
            logger.error(f"Error sending trip notifications: {str(e)}")
            
        return results
    
    @staticmethod
    def send_sms_to_drivers(trip, drivers):
        """
        Send SMS notifications to drivers about a new trip
        
        Args:
            trip: The Trip object
            drivers: QuerySet of Driver objects
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Initialize Africa's Talking
            username = settings.SMS_USERNAME
            api_key = settings.SMS_API_KEY
            
            if not username or not api_key:
                logger.warning("SMS credentials not configured")
                return False
                
            africastalking.initialize(username, api_key)
            sms = africastalking.SMS
            
            # Prepare the message
            message = (
                f"New trip request: {trip.pickup_location.location} to "
                f"{trip.dropoff_location.location}. Vehicle: {trip.vehicle_type}. "
                f"Login to the app to bid."
            )
            
            # Get phone numbers
            recipients = [driver.phone_number for driver in drivers if driver.phone_number]
            
            if not recipients:
                logger.warning("No driver phone numbers available for SMS")
                return False
                
            # Send the message
            response = sms.send(message, recipients, settings.SMS_SENDER_ID)
            
            logger.info(f"SMS notification sent to {len(recipients)} drivers: {response}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending SMS notifications: {str(e)}")
            return False
    
    @staticmethod
    def send_trip_email(trip):
        """
        Send email notification to user about their trip
        
        Args:
            trip: The Trip object
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            subject = f"Your Trip Request #{trip.id} has been created"
            
            # Prepare context for email template
            context = {
                'user_name': trip.user.full_name,
                'trip_id': trip.id,
                'pickup': trip.pickup_location.location,
                'dropoff': trip.dropoff_location.location,
                'vehicle_type': trip.get_vehicle_type_display(),
                'pickup_time': trip.pickup_time,
                'load_description': trip.load_description
            }
            
            # Render email templates
            html_message = render_to_string('email/trip_created.html', context)
            plain_message = strip_tags(html_message)
            
            # Send email
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[trip.user.email],
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f"Email notification sent to {trip.user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email notification: {str(e)}")
            return False
            
    @staticmethod
    def send_bid_notification(bid):
        """
        Send notification when a new bid is placed
        
        Args:
            bid: The Bid object
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Send email to trip creator
            if bid.trip.user and bid.trip.user.email:
                subject = f"New bid received for your Trip #{bid.trip.id}"
                
                context = {
                    'user_name': bid.trip.user.full_name,
                    'trip_id': bid.trip.id,
                    'driver_name': bid.driver.full_name,
                    'bid_amount': bid.amount,
                    'pickup': bid.trip.pickup_location.location,
                    'dropoff': bid.trip.dropoff_location.location
                }
                
                html_message = render_to_string('email/new_bid.html', context)
                plain_message = strip_tags(html_message)
                
                send_mail(
                    subject=subject,
                    message=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[bid.trip.user.email],
                    html_message=html_message,
                    fail_silently=False
                )
                
                logger.info(f"Bid notification email sent to {bid.trip.user.email}")
                return True
                
        except Exception as e:
            logger.error(f"Error sending bid notification: {str(e)}")
            
        return False
        
    @staticmethod
    def send_bid_accepted_notification(bid):
        """
        Send notification when a bid is accepted
        
        Args:
            bid: The accepted Bid object
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Send SMS to driver
            if bid.driver.phone_number:
                # Initialize Africa's Talking
                username = settings.SMS_USERNAME
                api_key = settings.SMS_API_KEY
                
                if not username or not api_key:
                    logger.warning("SMS credentials not configured")
                    return False
                    
                africastalking.initialize(username, api_key)
                sms = africastalking.SMS
                
                # Prepare the message
                message = (
                    f"Your bid of R{bid.amount} for trip from {bid.trip.pickup_location.location} to "
                    f"{bid.trip.dropoff_location.location} has been accepted. "
                    f"Login to the app for details."
                )
                
                # Send the message
                response = sms.send(message, [bid.driver.phone_number], settings.SMS_SENDER_ID)
                
                logger.info(f"Bid accepted SMS sent to driver: {response}")
                return True
                
        except Exception as e:
            logger.error(f"Error sending bid accepted notification: {str(e)}")
            
        return False


"""
Notification Service for sending notifications to users through various channels
"""
import logging
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from .sms_service import SMSService

logger = logging.getLogger(__name__)

class NotificationService:
    """
    Service for sending notifications to users through various channels
    such as email and SMS.
    """
    
    @staticmethod
    def send_trip_notifications(trip, users_to_notify=None):
        """
        Send notifications about a new trip to relevant users
        
        Args:
            trip: The Trip instance
            users_to_notify: List of User instances to notify (if None, notify trip creator and assigned driver)
            
        Returns:
            dict: Results of notification attempts
        """
        results = {
            'email': False,
            'sms': False
        }
        
        try:
            # If no specific users provided, notify trip creator and driver (if assigned)
            if users_to_notify is None:
                users_to_notify = []
                
                # Add trip creator
                if trip.user:
                    users_to_notify.append(trip.user)
                
                # Add driver if assigned
                if trip.driver:
                    users_to_notify.append(trip.driver)
            
            # Prepare trip details for notifications
            trip_details = {
                'id': str(trip.id),
                'pickup_location': trip.pickup_location.location,
                'dropoff_location': trip.dropoff_location.location,
                'pickup_time': trip.pickup_time,
                'vehicle_type': trip.vehicle_type,
                'load_description': trip.load_description,
                'status': trip.status
            }
            
            # Send notifications to each user
            for user in users_to_notify:
                # Send email notification
                email_sent = NotificationService.send_trip_email(
                    user.email, 
                    user.full_name,
                    trip_details
                )
                
                # Send SMS notification
                sms_sent = NotificationService.send_trip_sms(
                    user.phone_number,
                    trip_details
                )
                
                # Update results
                if email_sent:
                    results['email'] = True
                
                if sms_sent:
                    results['sms'] = True
                    
            return results
            
        except Exception as e:
            logger.error(f"Error sending trip notifications: {str(e)}")
            return results
    
    @staticmethod
    def send_trip_email(email, name, trip_details):
        """
        Send an email notification about a new trip
        
        Args:
            email (str): The recipient's email address
            name (str): The recipient's name
            trip_details (dict): Details about the trip
            
        Returns:
            bool: True if the email was sent successfully, False otherwise
        """
        try:
            subject = "New Trip Created on TootApp"
            
            # Prepare email context
            context = {
                'name': name,
                'trip_id': trip_details.get('id'),
                'pickup_location': trip_details.get('pickup_location'),
                'dropoff_location': trip_details.get('dropoff_location'),
                'pickup_time': trip_details.get('pickup_time'),
                'vehicle_type': trip_details.get('vehicle_type'),
                'load_description': trip_details.get('load_description')
            }
            
            # Render email body from template
            # Note: You'll need to create this template
            email_body = render_to_string('emails/trip_notification.html', context)
            
            # Create and send email
            email_message = EmailMessage(
                subject=subject,
                body=email_body,
                to=[email]
            )
            email_message.content_subtype = 'html'
            email_message.send(fail_silently=False)
            
            logger.info(f"Trip notification email sent to {email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending trip notification email: {str(e)}")
            return False
    
    @staticmethod
    def send_trip_sms(phone_number, trip_details):
        """
        Send an SMS notification about a new trip
        
        Args:
            phone_number (str): The recipient's phone number
            trip_details (dict): Details about the trip
            
        Returns:
            bool: True if the SMS was sent successfully, False otherwise
        """
        return SMSService.send_trip_notification(phone_number, trip_details)


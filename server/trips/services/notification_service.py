import africastalking
import os
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class NotificationService:
    """
    Service for sending SMS notifications using Africa's Talking API
    """
    
    def __init__(self):
        # Initialize Africa's Talking API
        username = os.environ.get('AT_USERNAME', 'sandbox')
        api_key = os.environ.get('AT_API_KEY', 'your_api_key')
        
        try:
            africastalking.initialize(username, api_key)
            self.sms = africastalking.SMS
        except Exception as e:
            logger.error(f"Failed to initialize Africa's Talking API: {str(e)}")
            self.sms = None
    
    def send_trip_notification(self, phone_number, trip_details):
        """
        Send notification when a new trip is added
        
        Args:
            phone_number (str): The recipient's phone number
            trip_details (dict): Details of the trip
        """
        if not self.sms:
            logger.error("SMS service not initialized")
            return False
            
        message = (
            f"New Trip Alert! A new trip has been added:\n"
            f"From: {trip_details.get('pickup_location', 'N/A')}\n"
            f"To: {trip_details.get('destination', 'N/A')}\n"
            f"Date: {trip_details.get('pickup_date', 'N/A')}\n"
            f"Time: {trip_details.get('pickup_time', 'N/A')}\n"
            f"Log in to the app for more details."
        )
        
        return self._send_sms(phone_number, message)
    
    def send_bid_notification(self, phone_number, bid_details):
        """
        Send notification when a new bid is placed on a trip
        
        Args:
            phone_number (str): The recipient's phone number
            bid_details (dict): Details of the bid
        """
        if not self.sms:
            logger.error("SMS service not initialized")
            return False
            
        message = (
            f"New Bid Alert! A driver has placed a bid on your trip:\n"
            f"Trip: {bid_details.get('trip_id', 'N/A')}\n"
            f"Amount: {bid_details.get('amount', 'N/A')}\n"
            f"Driver: {bid_details.get('driver_name', 'N/A')}\n"
            f"Log in to the app to accept or reject this bid."
        )
        
        return self._send_sms(phone_number, message)
    
    def send_bid_accepted_notification(self, phone_number, trip_details):
        """
        Send notification when a bid is accepted
        
        Args:
            phone_number (str): The recipient's phone number
            trip_details (dict): Details of the trip
        """
        if not self.sms:
            logger.error("SMS service not initialized")
            return False
            
        message = (
            f"Bid Accepted! Your bid has been accepted for the trip:\n"
            f"Trip ID: {trip_details.get('id', 'N/A')}\n"
            f"From: {trip_details.get('pickup_location', 'N/A')}\n"
            f"To: {trip_details.get('destination', 'N/A')}\n"
            f"Date: {trip_details.get('pickup_date', 'N/A')}\n"
            f"Time: {trip_details.get('pickup_time', 'N/A')}\n"
            f"Log in to the app for more details."
        )
        
        return self._send_sms(phone_number, message)
    
    def _send_sms(self, phone_number, message):
        """
        Private method to send SMS
        
        Args:
            phone_number (str): The recipient's phone number
            message (str): The message to send
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Format phone number if needed
            if not phone_number.startswith('+'):
                phone_number = f"+{phone_number}"
                
            response = self.sms.send(message, [phone_number])
            logger.info(f"SMS sent: {response}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS: {str(e)}")
            return False


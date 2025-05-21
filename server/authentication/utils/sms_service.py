"""
SMS Service for sending text messages to users
"""
import os
import logging
from django.conf import settings
import requests
from requests.exceptions import RequestException

logger = logging.getLogger(__name__)

class SMSService:
    """
    Service for sending SMS notifications using an external SMS API provider.
    Currently configured to use Africa's Talking SMS API, but can be easily
    adapted to use other providers like Twilio, Nexmo, etc.
    """
    
    @staticmethod
    def send_sms(phone_number, message):
        """
        Send an SMS to the specified phone number
        
        Args:
            phone_number (str): The recipient's phone number (should start with country code)
            message (str): The message content to send
            
        Returns:
            bool: True if the SMS was sent successfully, False otherwise
        """
        # Get API credentials from environment variables
        api_key = os.getenv('SMS_API_KEY')
        username = os.getenv('SMS_USERNAME')
        
        if not api_key or not username:
            logger.error("SMS API credentials not configured")
            return False
            
        # Format phone number if needed (ensure it has country code)
        if phone_number.startswith('0'):
            # Assuming South African numbers, replace leading 0 with +27
            phone_number = '+27' + phone_number[1:]
        
        # Africa's Talking API endpoint
        url = "https://api.africastalking.com/version1/messaging"
        
        # Prepare the payload
        data = {
            'username': username,
            'to': phone_number,
            'message': message,
            'from': os.getenv('SMS_SENDER_ID', 'TootApp')  # Optional sender ID
        }
        
        headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'ApiKey': api_key
        }
        
        try:
            response = requests.post(url, data=data, headers=headers, timeout=10)
            
            if response.status_code == 201 or response.status_code == 200:
                logger.info(f"SMS sent successfully to {phone_number}")
                return True
            else:
                logger.error(f"Failed to send SMS. Status code: {response.status_code}, Response: {response.text}")
                return False
                
        except RequestException as e:
            logger.error(f"Error sending SMS: {str(e)}")
            return False
    
    @staticmethod
    def send_trip_notification(user_phone, trip_details):
        """
        Send a notification about a new trip
        
        Args:
            user_phone (str): The user's phone number
            trip_details (dict): Details about the trip
            
        Returns:
            bool: True if the notification was sent successfully, False otherwise
        """
        try:
            # Create a concise message with essential trip details
            message = (
                f"New trip created! "
                f"From: {trip_details.get('pickup_location', 'N/A')} "
                f"To: {trip_details.get('dropoff_location', 'N/A')} "
                f"On: {trip_details.get('pickup_time', 'N/A').strftime('%d/%m/%Y %H:%M')} "
                f"Vehicle: {trip_details.get('vehicle_type', 'N/A')}. "
                f"Check TootApp for details."
            )
            
            return SMSService.send_sms(user_phone, message)
        except Exception as e:
            logger.error(f"Error creating trip notification SMS: {str(e)}")
            return False


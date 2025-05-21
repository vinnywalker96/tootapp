import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from authentication.models import Driver
from .models import Trip, Bid, ChatMessage

logger = logging.getLogger(__name__)

class TripConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for trip-related real-time updates
    """
    
    async def connect(self):
        """
        Called when the WebSocket is handshaking as part of initial connection
        """
        self.user = self.scope.get('user', None)
        
        if not self.user or self.user.is_anonymous:
            # Reject the connection if user is not authenticated
            logger.warning("Unauthenticated WebSocket connection attempt")
            await self.close()
            return
            
        # Accept the WebSocket connection
        await self.accept()
        
        # Join the user's personal group
        self.user_group = f"user_{self.user.id}"
        await self.channel_layer.group_add(
            self.user_group,
            self.channel_name
        )
        
        # If the user is a driver, join the drivers group
        if hasattr(self.user, 'driver') and self.user.driver:
            self.driver_group = "drivers"
            await self.channel_layer.group_add(
                self.driver_group,
                self.channel_name
            )
            
        logger.info(f"WebSocket connected for user {self.user.id}")
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to TootApp WebSocket server'
        }))

    async def disconnect(self, close_code):
        """
        Called when the WebSocket closes for any reason
        """
        # Leave the user's personal group
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(
                self.user_group,
                self.channel_name
            )
            
        # If the user is a driver, leave the drivers group
        if hasattr(self, 'driver_group'):
            await self.channel_layer.group_discard(
                self.driver_group,
                self.channel_name
            )
            
        logger.info(f"WebSocket disconnected for user {self.user.id if self.user else 'unknown'}")

    async def receive(self, text_data):
        """
        Called when we get a text frame from the client
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type', '')
            
            # Handle different message types
            if message_type == 'chat.message':
                await self.handle_chat_message(data)
            elif message_type == 'bid.create':
                await self.handle_bid_create(data)
            elif message_type == 'bid.accept':
                await self.handle_bid_accept(data)
            elif message_type == 'trip.status_update':
                await self.handle_trip_status_update(data)
            elif message_type == 'echo.message':
                # Echo the message back (for testing)
                await self.send(text_data=json.dumps({
                    'type': 'echo.response',
                    'data': data.get('data', {})
                }))
            else:
                logger.warning(f"Unknown message type: {message_type}")
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f"Unknown message type: {message_type}"
                }))
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"Error processing WebSocket message: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Server error processing message'
            }))

    async def handle_chat_message(self, data):
        """
        Handle incoming chat messages
        """
        message_data = data.get('data', {})
        trip_id = message_data.get('trip_id')
        content = message_data.get('content')
        
        if not trip_id or not content:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Missing required fields: trip_id or content'
            }))
            return
            
        # Save the chat message to the database
        chat_message = await self.save_chat_message(trip_id, content)
        
        if not chat_message:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to save chat message'
            }))
            return
            
        # Get the recipient user ID (either the trip owner or the driver)
        recipient_id = await self.get_chat_recipient(trip_id)
        
        if recipient_id:
            # Send the message to the recipient's group
            recipient_group = f"user_{recipient_id}"
            await self.channel_layer.group_send(
                recipient_group,
                {
                    'type': 'chat_message',
                    'message': {
                        'id': chat_message['id'],
                        'trip_id': trip_id,
                        'sender_id': self.user.id,
                        'sender_name': self.user.full_name if hasattr(self.user, 'full_name') else self.user.username,
                        'content': content,
                        'timestamp': chat_message['timestamp'].isoformat()
                    }
                }
            )
            
        # Send confirmation to the sender
        await self.send(text_data=json.dumps({
            'type': 'chat.message_sent',
            'data': {
                'id': chat_message['id'],
                'trip_id': trip_id,
                'content': content,
                'timestamp': chat_message['timestamp'].isoformat()
            }
        }))

    async def handle_bid_create(self, data):
        """
        Handle creation of a new bid
        """
        bid_data = data.get('data', {})
        trip_id = bid_data.get('trip_id')
        amount = bid_data.get('amount')
        
        if not trip_id or not amount:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Missing required fields: trip_id or amount'
            }))
            return
            
        # Ensure the user is a driver
        if not hasattr(self.user, 'driver') or not self.user.driver:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Only drivers can place bids'
            }))
            return
            
        # Save the bid to the database
        bid = await self.save_bid(trip_id, amount)
        
        if not bid:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to save bid'
            }))
            return
            
        # Get the trip owner's user ID
        trip_owner_id = await self.get_trip_owner(trip_id)
        
        if trip_owner_id:
            # Send the bid notification to the trip owner
            owner_group = f"user_{trip_owner_id}"
            await self.channel_layer.group_send(
                owner_group,
                {
                    'type': 'bid_notification',
                    'bid': {
                        'id': bid['id'],
                        'trip_id': trip_id,
                        'driver_id': self.user.driver.id,
                        'driver_name': self.user.driver.full_name if hasattr(self.user.driver, 'full_name') else self.user.username,
                        'amount': amount,
                        'timestamp': bid['timestamp'].isoformat()
                    }
                }
            )
            
        # Send confirmation to the bidder
        await self.send(text_data=json.dumps({
            'type': 'bid.created',
            'data': {
                'id': bid['id'],
                'trip_id': trip_id,
                'amount': amount,
                'timestamp': bid['timestamp'].isoformat()
            }
        }))

    async def handle_bid_accept(self, data):
        """
        Handle acceptance of a bid
        """
        accept_data = data.get('data', {})
        bid_id = accept_data.get('bid_id')
        
        if not bid_id:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Missing required field: bid_id'
            }))
            return
            
        # Accept the bid and update the trip
        result = await self.accept_bid(bid_id)
        
        if not result:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to accept bid'
            }))
            return
            
        bid_info, trip_info = result
        
        # Send notification to the driver who placed the bid
        driver_id = bid_info['driver_id']
        driver_group = f"user_{driver_id}"
        
        await self.channel_layer.group_send(
            driver_group,
            {
                'type': 'bid_accepted',
                'data': {
                    'bid_id': bid_id,
                    'trip_id': trip_info['id'],
                    'trip_details': {
                        'pickup_location': trip_info['pickup_location'],
                        'destination': trip_info['destination'],
                        'pickup_time': trip_info['pickup_time'].isoformat() if trip_info['pickup_time'] else None
                    }
                }
            }
        )
            
        # Send confirmation to the trip owner
        await self.send(text_data=json.dumps({
            'type': 'bid.accepted',
            'data': {
                'bid_id': bid_id,
                'trip_id': trip_info['id'],
                'driver_id': driver_id,
                'driver_name': bid_info['driver_name']
            }
        }))

    async def handle_trip_status_update(self, data):
        """
        Handle trip status updates
        """
        update_data = data.get('data', {})
        trip_id = update_data.get('trip_id')
        new_status = update_data.get('status')
        
        if not trip_id or not new_status:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Missing required fields: trip_id or status'
            }))
            return
            
        # Update the trip status
        trip = await self.update_trip_status(trip_id, new_status)
        
        if not trip:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to update trip status'
            }))
            return
            
        # Get the other party involved in the trip (driver or owner)
        other_user_id = await self.get_other_trip_party(trip_id)
        
        if other_user_id:
            # Send the status update to the other party
            other_group = f"user_{other_user_id}"
            await self.channel_layer.group_send(
                other_group,
                {
                    'type': 'trip_status_update',
                    'trip': {
                        'id': trip_id,
                        'status': new_status,
                        'updated_at': trip['updated_at'].isoformat() if trip['updated_at'] else None
                    }
                }
            )
            
        # Send confirmation to the updater
        await self.send(text_data=json.dumps({
            'type': 'trip.status_updated',
            'data': {
                'trip_id': trip_id,
                'status': new_status
            }
        }))

    # Channel layer event handlers
    async def chat_message(self, event):
        """
        Handler for chat.message events from the channel layer
        """
        await self.send(text_data=json.dumps({
            'type': 'chat.message',
            'data': event['message']
        }))

    async def bid_notification(self, event):
        """
        Handler for bid_notification events from the channel layer
        """
        await self.send(text_data=json.dumps({
            'type': 'bid.new',
            'data': event['bid']
        }))

    async def bid_accepted(self, event):
        """
        Handler for bid_accepted events from the channel layer
        """
        await self.send(text_data=json.dumps({
            'type': 'bid.accepted',
            'data': event['data']
        }))

    async def trip_status_update(self, event):
        """
        Handler for trip_status_update events from the channel layer
        """
        await self.send(text_data=json.dumps({
            'type': 'trip.status_update',
            'data': event['trip']
        }))

    async def trip_notification(self, event):
        """
        Handler for trip_notification events from the channel layer
        """
        await self.send(text_data=json.dumps({
            'type': 'trip.new',
            'data': event['trip']
        }))

    # Database access methods
    @database_sync_to_async
    def save_chat_message(self, trip_id, content):
        """
        Save a chat message to the database
        """
        try:
            trip = Trip.objects.get(id=trip_id)
            
            # Check if the user is authorized to chat about this trip
            if self.user != trip.user and (not hasattr(self.user, 'driver') or self.user.driver != trip.driver):
                logger.warning(f"Unauthorized chat message attempt for trip {trip_id} by user {self.user.id}")
                return None
                
            chat_message = ChatMessage.objects.create(
                trip=trip,
                sender=self.user,
                content=content
            )
            
            return {
                'id': chat_message.id,
                'timestamp': chat_message.timestamp
            }
        except Trip.DoesNotExist:
            logger.error(f"Trip {trip_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error saving chat message: {str(e)}")
            return None

    @database_sync_to_async
    def get_chat_recipient(self, trip_id):
        """
        Get the ID of the recipient for a chat message
        """
        try:
            trip = Trip.objects.select_related('user', 'driver').get(id=trip_id)
            
            # If the sender is the trip owner, the recipient is the driver
            if self.user == trip.user:
                return trip.driver.user.id if trip.driver else None
                
            # If the sender is the driver, the recipient is the trip owner
            if hasattr(self.user, 'driver') and self.user.driver == trip.driver:
                return trip.user.id
                
            return None
        except Trip.DoesNotExist:
            logger.error(f"Trip {trip_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error getting chat recipient: {str(e)}")
            return None

    @database_sync_to_async
    def save_bid(self, trip_id, amount):
        """
        Save a bid to the database
        """
        try:
            trip = Trip.objects.get(id=trip_id)
            driver = self.user.driver
            
            # Check if the trip is open for bidding
            if trip.status != 'REQUESTED':
                logger.warning(f"Bid attempt for non-biddable trip {trip_id}")
                return None
                
            # Check if the driver has already placed a bid
            existing_bid = Bid.objects.filter(trip=trip, driver=driver).first()
            if existing_bid:
                # Update the existing bid
                existing_bid.amount = amount
                existing_bid.save()
                return {
                    'id': existing_bid.id,
                    'timestamp': existing_bid.timestamp
                }
            
            # Create a new bid
            bid = Bid.objects.create(
                trip=trip,
                driver=driver,
                amount=amount
            )
            
            return {
                'id': bid.id,
                'timestamp': bid.timestamp
            }
        except Trip.DoesNotExist:
            logger.error(f"Trip {trip_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error saving bid: {str(e)}")
            return None

    @database_sync_to_async
    def get_trip_owner(self, trip_id):
        """
        Get the user ID of the trip owner
        """
        try:
            trip = Trip.objects.select_related('user').get(id=trip_id)
            return trip.user.id
        except Trip.DoesNotExist:
            logger.error(f"Trip {trip_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error getting trip owner: {str(e)}")
            return None

    @database_sync_to_async
    def accept_bid(self, bid_id):
        """
        Accept a bid and update the trip
        """
        try:
            bid = Bid.objects.select_related('trip', 'driver').get(id=bid_id)
            trip = bid.trip
            
            # Check if the user is the trip owner
            if self.user != trip.user:
                logger.warning(f"Unauthorized bid acceptance attempt for bid {bid_id} by user {self.user.id}")
                return None
                
            # Check if the trip is still open for bidding
            if trip.status != 'REQUESTED':
                logger.warning(f"Attempt to accept bid for non-biddable trip {trip.id}")
                return None
                
            # Update the trip
            trip.driver = bid.driver
            trip.status = 'ACCEPTED'
            trip.is_accepted = True
            trip.save()
            
            # Mark the bid as accepted
            bid.is_accepted = True
            bid.save()
            
            # Return bid and trip info
            bid_info = {
                'id': bid.id,
                'driver_id': bid.driver.user.id,
                'driver_name': bid.driver.full_name if hasattr(bid.driver, 'full_name') else bid.driver.user.username
            }
            
            trip_info = {
                'id': trip.id,
                'pickup_location': trip.pickup_location.location if trip.pickup_location else None,
                'destination': trip.dropoff_location.location if trip.dropoff_location else None,
                'pickup_time': trip.pickup_time
            }
            
            return (bid_info, trip_info)
        except Bid.DoesNotExist:
            logger.error(f"Bid {bid_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error accepting bid: {str(e)}")
            return None

    @database_sync_to_async
    def update_trip_status(self, trip_id, new_status):
        """
        Update a trip's status
        """
        try:
            trip = Trip.objects.get(id=trip_id)
            
            # Check if the user is authorized to update this trip
            if self.user != trip.user and (not hasattr(self.user, 'driver') or self.user.driver != trip.driver):
                logger.warning(f"Unauthorized trip status update attempt for trip {trip_id} by user {self.user.id}")
                return None
                
            # Validate the status transition
            valid_statuses = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
            if new_status not in valid_statuses:
                logger.warning(f"Invalid trip status: {new_status}")
                return None
                
            # Update the trip status
            trip.status = new_status
            if new_status == 'ACCEPTED':
                trip.is_accepted = True
            trip.save()
            
            return {
                'id': trip.id,
                'status': trip.status,
                'updated_at': trip.updated_at
            }
        except Trip.DoesNotExist:
            logger.error(f"Trip {trip_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error updating trip status: {str(e)}")
            return None

    @database_sync_to_async
    def get_other_trip_party(self, trip_id):
        """
        Get the user ID of the other party involved in the trip
        """
        try:
            trip = Trip.objects.select_related('user', 'driver').get(id=trip_id)
            
            # If the current user is the trip owner, return the driver's user ID
            if self.user == trip.user:
                return trip.driver.user.id if trip.driver else None
                
            # If the current user is the driver, return the trip owner's user ID
            if hasattr(self.user, 'driver') and self.user.driver == trip.driver:
                return trip.user.id
                
            return None
        except Trip.DoesNotExist:
            logger.error(f"Trip {trip_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error getting other trip party: {str(e)}")
            return None


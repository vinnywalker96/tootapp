import json
import logging
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.db.models import Q
from django.utils import timezone

from trips.models import Trip, Bid, ChatMessage
from trips.serializers import TripSerializer, NestedTripSerializer, BidSerializer, ChatMessageSerializer
from authentication.models import User, Driver

logger = logging.getLogger(__name__)

class TootaConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for handling real-time communication in the Toota app.
    Supports trip creation, updates, bidding, and chat functionality.
    """

    @database_sync_to_async
    def _create_trip(self, data):
        serializer = TripSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return serializer.create(serializer.validated_data)

    @database_sync_to_async
    def _get_trip_data(self, trip):
        return NestedTripSerializer(trip).data

    @database_sync_to_async
    def _get_trip_ids(self, user):
        """Get all active trip IDs associated with a user or driver"""
        if hasattr(user, 'driver'):
            # User is a driver
            trip_ids = Trip.objects.filter(
                Q(driver=user.driver) | 
                Q(status=Trip.REQUESTED, allow_bidding=True)
            ).exclude(
                status=Trip.COMPLETED
            ).values_list('id', flat=True)
        else:
            # User is a regular user
            trip_ids = Trip.objects.filter(
                user=user
            ).exclude(
                status=Trip.COMPLETED
            ).values_list('id', flat=True)
        
        return map(str, trip_ids)

    @database_sync_to_async
    def _get_user_type(self, user):
        """Determine if the user is a driver or regular user"""
        if hasattr(user, 'driver'):
            return 'driver'
        return 'user'

    @database_sync_to_async
    def _update_trip(self, data):
        instance = Trip.objects.get(id=data.get('id'))
        serializer = TripSerializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        return serializer.update(instance, serializer.validated_data)

    @database_sync_to_async
    def _create_bid(self, trip_id, driver, amount):
        """Create a new bid for a trip"""
        trip = Trip.objects.get(id=trip_id)
        
        # Check if bidding is allowed for this trip
        if not trip.allow_bidding:
            raise ValueError("Bidding is not allowed for this trip")
            
        # Check if bidding end time has passed
        if trip.bidding_end_time and trip.bidding_end_time < timezone.now():
            raise ValueError("Bidding period has ended for this trip")
            
        # Validate bid amount against min/max constraints
        if trip.min_bid and amount < trip.min_bid:
            raise ValueError(f"Bid amount must be at least {trip.min_bid}")
            
        if trip.max_bid and amount > trip.max_bid:
            raise ValueError(f"Bid amount cannot exceed {trip.max_bid}")
        
        # Create or update bid
        bid, created = Bid.objects.update_or_create(
            trip=trip,
            driver=driver,
            defaults={'amount': amount}
        )
        
        return bid, created

    @database_sync_to_async
    def _accept_bid(self, bid_id):
        """Accept a bid and update the trip"""
        bid = Bid.objects.get(id=bid_id)
        trip = bid.trip
        
        # Update the bid
        bid.is_accepted = True
        bid.save()
        
        # Update the trip
        trip.driver = bid.driver
        trip.bid = bid.amount
        trip.status = Trip.ACCEPTED
        trip.is_accepted = True
        trip.allow_bidding = False
        trip.save()
        
        # Mark other bids as not accepted
        Bid.objects.filter(trip=trip).exclude(id=bid_id).update(is_accepted=False)
        
        return trip

    @database_sync_to_async
    def _create_message(self, trip_id, sender_type, sender_id, message_text):
        """Create a new chat message"""
        trip = Trip.objects.get(id=trip_id)
        
        message = ChatMessage.objects.create(
            trip=trip,
            sender_type=sender_type,
            sender_id=sender_id,
            message=message_text
        )
        
        return message

    @database_sync_to_async
    def _get_messages(self, trip_id, limit=50):
        """Get recent chat messages for a trip"""
        messages = ChatMessage.objects.filter(trip_id=trip_id).order_by('-created')[:limit]
        serializer = ChatMessageSerializer(messages, many=True)
        return serializer.data

    @database_sync_to_async
    def _mark_messages_as_read(self, trip_id, user_type, user_id):
        """Mark messages as read for a specific user"""
        if user_type == 'driver':
            # Mark messages from user as read by driver
            ChatMessage.objects.filter(
                trip_id=trip_id,
                sender_type='USER',
                is_read=False
            ).update(is_read=True)
        else:
            # Mark messages from driver as read by user
            ChatMessage.objects.filter(
                trip_id=trip_id,
                sender_type='DRIVER',
                is_read=False
            ).update(is_read=True)

    async def connect(self):
        """Handle WebSocket connection"""
        user = self.scope['user']
        if user.is_anonymous:
            await self.close()
        else:
            user_type = await self._get_user_type(user)
            
            # Add user to appropriate groups
            if user_type == 'driver':
                await self.channel_layer.group_add(
                    group='drivers',
                    channel=self.channel_name
                )
                
                # Add driver to all active trip groups
                for trip_id in await self._get_trip_ids(user):
                    await self.channel_layer.group_add(
                        group=trip_id,
                        channel=self.channel_name
                    )
            else:
                # Add user to their trip groups
                for trip_id in await self._get_trip_ids(user):
                    await self.channel_layer.group_add(
                        group=trip_id,
                        channel=self.channel_name
                    )

            # Store user type in scope for later use
            self.scope['user_type'] = user_type
            await self.accept()

    async def disconnect(self, code):
        """Handle WebSocket disconnection"""
        user = self.scope['user']
        if user.is_anonymous:
            await self.close()
        else:
            user_type = await self._get_user_type(user)
            
            if user_type == 'driver':
                await self.channel_layer.group_discard(
                    group='drivers',
                    channel=self.channel_name
                )

            for trip_id in await self._get_trip_ids(user):
                await self.channel_layer.group_discard(
                    group=trip_id,
                    channel=self.channel_name
                )

        await super().disconnect(code)

    async def receive_json(self, content, **kwargs):
        """Handle incoming WebSocket messages"""
        message_type = content.get('type')
        
        try:
            if message_type == 'create.trip':
                await self.create_trip(content)
            elif message_type == 'update.trip':
                await self.update_trip(content)
            elif message_type == 'create.bid':
                await self.create_bid(content)
            elif message_type == 'accept.bid':
                await self.accept_bid(content)
            elif message_type == 'chat.message':
                await self.chat_message(content)
            elif message_type == 'fetch.messages':
                await self.fetch_messages(content)
            elif message_type == 'mark.messages.read':
                await self.mark_messages_read(content)
            else:
                await self.send_json({
                    'type': 'error',
                    'data': {'message': f'Unknown message type: {message_type}'}
                })
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            await self.send_json({
                'type': 'error',
                'data': {'message': str(e)}
            })

    async def create_trip(self, message):
        """Handle trip creation"""
        data = message.get('data')
        trip = await self._create_trip(data)
        trip_data = await self._get_trip_data(trip)

        # Send rider requests to all drivers
        await self.channel_layer.group_send(group='drivers', message={
            'type': 'echo.message',
            'data': {
                'type': 'trip.created',
                'data': trip_data
            }
        })

        # Add rider to trip group
        await self.channel_layer.group_add(
            group=f'{trip.id}',
            channel=self.channel_name
        )

        await self.send_json({
            'type': 'echo.message',
            'data': {
                'type': 'trip.created',
                'data': trip_data
            }
        })

    async def update_trip(self, message):
        """Handle trip updates"""
        data = message.get('data')
        trip = await self._update_trip(data)
        trip_id = f'{trip.id}'
        trip_data = await self._get_trip_data(trip)

        # Send update to all members in the trip group
        await self.channel_layer.group_send(
            group=trip_id,
            message={
                'type': 'echo.message',
                'data': {
                    'type': 'trip.updated',
                    'data': trip_data
                }
            }
        )

        await self.send_json({
            'type': 'echo.message',
            'data': {
                'type': 'trip.updated',
                'data': trip_data
            }
        })

    async def create_bid(self, message):
        """Handle bid creation"""
        user = self.scope['user']
        data = message.get('data')
        
        if not hasattr(user, 'driver'):
            await self.send_json({
                'type': 'error',
                'data': {'message': 'Only drivers can create bids'}
            })
            return
            
        try:
            trip_id = data.get('trip_id')
            amount = float(data.get('amount'))
            
            bid, created = await self._create_bid(trip_id, user.driver, amount)
            
            # Serialize the bid
            bid_data = BidSerializer(bid).data
            
            # Send bid notification to the trip group
            await self.channel_layer.group_send(
                group=str(trip_id),
                message={
                    'type': 'echo.message',
                    'data': {
                        'type': 'bid.created',
                        'data': bid_data,
                        'is_new': created
                    }
                }
            )
            
            # Send confirmation to the bidder
            await self.send_json({
                'type': 'echo.message',
                'data': {
                    'type': 'bid.created',
                    'data': bid_data,
                    'is_new': created
                }
            })
            
        except Exception as e:
            logger.error(f"Error creating bid: {str(e)}")
            await self.send_json({
                'type': 'error',
                'data': {'message': str(e)}
            })

    async def accept_bid(self, message):
        """Handle bid acceptance"""
        user = self.scope['user']
        data = message.get('data')
        
        if hasattr(user, 'driver'):
            await self.send_json({
                'type': 'error',
                'data': {'message': 'Only users can accept bids'}
            })
            return
            
        try:
            bid_id = data.get('bid_id')
            trip = await self._accept_bid(bid_id)
            trip_data = await self._get_trip_data(trip)
            
            # Notify all members in the trip group
            await self.channel_layer.group_send(
                group=str(trip.id),
                message={
                    'type': 'echo.message',
                    'data': {
                        'type': 'bid.accepted',
                        'data': trip_data
                    }
                }
            )
            
        except Exception as e:
            logger.error(f"Error accepting bid: {str(e)}")
            await self.send_json({
                'type': 'error',
                'data': {'message': str(e)}
            })

    async def chat_message(self, message):
        """Handle chat messages"""
        user = self.scope['user']
        data = message.get('data')
        
        try:
            trip_id = data.get('trip_id')
            message_text = data.get('message')
            
            # Determine sender type
            sender_type = 'DRIVER' if hasattr(user, 'driver') else 'USER'
            sender_id = str(user.driver.id if hasattr(user, 'driver') else user.id)
            
            # Create the message
            chat_message = await self._create_message(trip_id, sender_type, sender_id, message_text)
            
            # Serialize the message
            message_data = ChatMessageSerializer(chat_message).data
            
            # Send to the trip group
            await self.channel_layer.group_send(
                group=str(trip_id),
                message={
                    'type': 'echo.message',
                    'data': {
                        'type': 'chat.message',
                        'data': message_data
                    }
                }
            )
            
        except Exception as e:
            logger.error(f"Error sending chat message: {str(e)}")
            await self.send_json({
                'type': 'error',
                'data': {'message': str(e)}
            })

    async def fetch_messages(self, message):
        """Fetch chat history for a trip"""
        data = message.get('data')
        
        try:
            trip_id = data.get('trip_id')
            limit = data.get('limit', 50)
            
            messages = await self._get_messages(trip_id, limit)
            
            await self.send_json({
                'type': 'echo.message',
                'data': {
                    'type': 'chat.history',
                    'data': {
                        'trip_id': trip_id,
                        'messages': messages
                    }
                }
            })
            
        except Exception as e:
            logger.error(f"Error fetching messages: {str(e)}")
            await self.send_json({
                'type': 'error',
                'data': {'message': str(e)}
            })

    async def mark_messages_read(self, message):
        """Mark messages as read"""
        user = self.scope['user']
        data = message.get('data')
        
        try:
            trip_id = data.get('trip_id')
            user_type = 'driver' if hasattr(user, 'driver') else 'user'
            user_id = str(user.driver.id if hasattr(user, 'driver') else user.id)
            
            await self._mark_messages_as_read(trip_id, user_type, user_id)
            
            await self.send_json({
                'type': 'echo.message',
                'data': {
                    'type': 'messages.marked.read',
                    'data': {
                        'trip_id': trip_id,
                        'success': True
                    }
                }
            })
            
        except Exception as e:
            logger.error(f"Error marking messages as read: {str(e)}")
            await self.send_json({
                'type': 'error',
                'data': {'message': str(e)}
            })

    async def echo_message(self, message):
        """Echo a message to the client"""
        await self.send_json(message)


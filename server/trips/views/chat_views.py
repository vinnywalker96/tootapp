from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from ..models import Trip, ChatMessage
from ..serializers import ChatMessageSerializer
import logging

logger = logging.getLogger(__name__)

class ChatMessageListCreateView(generics.ListCreateAPIView):
    """
    List all chat messages for a trip or create a new message
    """
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Get all chat messages for a specific trip
        """
        trip_id = self.kwargs.get('trip_id')
        return ChatMessage.objects.select_related('sender', 'trip').filter(trip_id=trip_id)
    
    def perform_create(self, serializer):
        """
        Create a new chat message for a trip
        """
        trip_id = self.kwargs.get('trip_id')
        trip = get_object_or_404(Trip, id=trip_id)
        
        # Check if the user is authorized to send messages for this trip
        if self.request.user != trip.user and (not hasattr(self.request.user, 'driver') or self.request.user.driver != trip.driver):
            return Response(
                {"detail": "You are not authorized to send messages for this trip."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Save the message
        serializer.save(
            trip=trip,
            sender=self.request.user
        )

class ChatMessageRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a chat message
    """
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ChatMessage.objects.all()
    
    def get_queryset(self):
        """
        Ensure users can only see messages for trips they are involved in
        """
        user = self.request.user
        
        if hasattr(user, 'driver'):
            # Driver can see messages for trips they are assigned to
            return ChatMessage.objects.filter(trip__driver=user.driver)
        else:
            # User can see messages for their trips
            return ChatMessage.objects.filter(trip__user=user)
    
    def perform_update(self, serializer):
        """
        Update a chat message
        """
        # Only allow users to update their own messages
        message = self.get_object()
        if message.sender != self.request.user:
            return Response(
                {"detail": "You can only update your own messages."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Delete a chat message
        """
        # Only allow users to delete their own messages
        if instance.sender != self.request.user:
            return Response(
                {"detail": "You can only delete your own messages."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance.delete()


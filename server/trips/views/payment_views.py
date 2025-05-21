from rest_framework import generics, permissions
from ..models import Payment
from ..serializers import PaymentSerializer

class PaymentListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Optimize queryset by using select_related for foreign keys
        """
        return Payment.objects.select_related('trip', 'driver').all()

    def perform_create(self, serializer):
        serializer.save()  # This saves the validated data to create a new Payment instance

class PaymentRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Optimize queryset by using select_related for foreign keys
        """
        return Payment.objects.select_related('trip', 'driver').all()


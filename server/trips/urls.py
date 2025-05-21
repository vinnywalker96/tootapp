# urls.py
from django.urls import path
from . import views

app_name = 'trip'

urlpatterns = [
    path('trips/', views.TripListCreateView.as_view(), name='trip-list-create'),
    path('trips/<uuid:pk>/', views.TripRetrieveUpdateDeleteView.as_view(), name='trip-detail'),
    path('trips/driver/<uuid:driver_id>/', views.TripRetrieveByDriverView.as_view(), name='trip-by-driver'),
    path('trips/all/', views.TripListView.as_view(), name='trip-list'),
    path('trips/completed-count/', views.TripCompletedCountView.as_view(), name='trip-completed-count'),
    path('trips/<uuid:trip_id>/status/', views.TripStatusView.as_view(), name='trip-status'),
    
    # Bid endpoints
    path('trips/<uuid:trip_id>/bids/', views.BidListCreateView.as_view(), name='bid-list-create'),
    path('bids/<uuid:pk>/', views.BidRetrieveUpdateDestroyView.as_view(), name='bid-detail'),
    path('bids/<uuid:bid_id>/accept/', views.AcceptBidView.as_view(), name='accept-bid'),
    
    # Chat endpoints
    path('trips/<uuid:trip_id>/messages/', views.ChatMessageListCreateView.as_view(), name='chat-list-create'),
    path('messages/<uuid:pk>/', views.ChatMessageRetrieveUpdateDestroyView.as_view(), name='chat-detail'),
    
    # Payment endpoints
    path('payments/', views.PaymentListCreateAPIView.as_view(), name='payment-list-create'),
    path('payments/<uuid:pk>/', views.PaymentRetrieveUpdateDestroyAPIView.as_view(), name='payment-detail'),
]

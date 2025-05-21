import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaMapMarkerAlt, FaCalendarAlt, FaClock, FaUser, FaPhone, FaTruck, FaInfoCircle } from 'react-icons/fa';
import webSocketService from '../services/WebSocketService';
import { useAuth } from '../context/AuthContext';
import BiddingPanel from './BiddingPanel';
import ChatWindow from './ChatWindow';

const TripStatus = () => {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Status colors
  const statusColors = {
    'REQUESTED': 'bg-yellow-100 text-yellow-800',
    'ACCEPTED': 'bg-blue-100 text-blue-800',
    'IN_PROGRESS': 'bg-purple-100 text-purple-800',
    'COMPLETED': 'bg-green-100 text-green-800',
    'CANCELLED': 'bg-red-100 text-red-800'
  };
  
  // Status actions
  const getAvailableActions = (status, isDriver) => {
    if (isDriver) {
      switch (status) {
        case 'ACCEPTED':
          return [{ label: 'Start Trip', value: 'IN_PROGRESS' }];
        case 'IN_PROGRESS':
          return [{ label: 'Complete Trip', value: 'COMPLETED' }];
        default:
          return [];
      }
    } else {
      // Trip owner actions
      switch (status) {
        case 'REQUESTED':
          return [{ label: 'Cancel Trip', value: 'CANCELLED' }];
        case 'ACCEPTED':
          return [{ label: 'Cancel Trip', value: 'CANCELLED' }];
        default:
          return [];
      }
    }
  };
  
  useEffect(() => {
    // Connect to WebSocket when component mounts
    const token = localStorage.getItem('token');
    if (token) {
      webSocketService.connect(token).catch(error => {
        console.error('WebSocket connection failed:', error);
      });
    }
    
    // Fetch trip details
    const fetchTripDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/trips/${tripId}/status/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch trip details');
        }
        
        const data = await response.json();
        setTrip(data);
        setError(null);
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTripDetails();
    
    // Register WebSocket handler for trip status updates
    const handleTripStatusUpdate = (data) => {
      if (data.id === parseInt(tripId)) {
        setTrip(prevTrip => ({
          ...prevTrip,
          status: data.status
        }));
        
        toast.info(`Trip status updated to: ${data.status.replace('_', ' ')}`);
      }
    };
    
    webSocketService.registerHandler('trip.status_update', handleTripStatusUpdate);
    
    // Cleanup
    return () => {
      webSocketService.unregisterHandler('trip.status_update', handleTripStatusUpdate);
    };
  }, [tripId]);
  
  const handleStatusChange = (newStatus) => {
    // Update trip status via WebSocket
    const success = webSocketService.updateTripStatus(tripId, newStatus);
    
    if (!success) {
      toast.error('Failed to update trip status. Please try again.');
    }
  };
  
  const handleBidAccepted = (data) => {
    // Refresh trip details to get the updated driver info
    const fetchTripDetails = async () => {
      try {
        const response = await fetch(`/api/trips/${tripId}/status/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch trip details');
        }
        
        const data = await response.json();
        setTrip(data);
      } catch (err) {
        console.error('Error refreshing trip details:', err);
      }
    };
    
    fetchTripDetails();
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded-lg">
        <h3 className="font-bold">Error</h3>
        <p>{error}</p>
        <button 
          onClick={() => navigate(-1)} 
          className="mt-2 bg-red-600 text-white px-4 py-2 rounded"
        >
          Go Back
        </button>
      </div>
    );
  }
  
  if (!trip) {
    return (
      <div className="bg-yellow-100 text-yellow-700 p-4 rounded-lg">
        <h3 className="font-bold">Trip Not Found</h3>
        <p>The requested trip could not be found.</p>
        <button 
          onClick={() => navigate(-1)} 
          className="mt-2 bg-yellow-600 text-white px-4 py-2 rounded"
        >
          Go Back
        </button>
      </div>
    );
  }
  
  // Determine if current user is the driver
  const isDriver = user && user.role === 'driver' && trip.driver_name;
  
  // Get available actions based on trip status and user role
  const availableActions = getAvailableActions(trip.status, isDriver);
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-4">
        <button 
          onClick={() => navigate(-1)} 
          className="text-blue-500 hover:text-blue-700"
        >
          &larr; Back
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold">Trip #{trip.id}</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[trip.status]}`}>
            {trip.status.replace('_', ' ')}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Trip Details</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <FaMapMarkerAlt className="text-red-500 mt-1 mr-2" />
                <div>
                  <span className="text-gray-600 block">Pickup Location:</span>
                  <span className="font-medium">{trip.pickup_location}</span>
                </div>
              </li>
              <li className="flex items-start">
                <FaMapMarkerAlt className="text-green-500 mt-1 mr-2" />
                <div>
                  <span className="text-gray-600 block">Dropoff Location:</span>
                  <span className="font-medium">{trip.dropoff_location}</span>
                </div>
              </li>
              <li className="flex items-start">
                <FaCalendarAlt className="text-blue-500 mt-1 mr-2" />
                <div>
                  <span className="text-gray-600 block">Pickup Date:</span>
                  <span className="font-medium">
                    {new Date(trip.pickup_time).toLocaleDateString()}
                  </span>
                </div>
              </li>
              <li className="flex items-start">
                <FaClock className="text-blue-500 mt-1 mr-2" />
                <div>
                  <span className="text-gray-600 block">Pickup Time:</span>
                  <span className="font-medium">
                    {new Date(trip.pickup_time).toLocaleTimeString()}
                  </span>
                </div>
              </li>
              <li className="flex items-start">
                <FaTruck className="text-gray-500 mt-1 mr-2" />
                <div>
                  <span className="text-gray-600 block">Vehicle Type:</span>
                  <span className="font-medium">{trip.vehicle_type}</span>
                </div>
              </li>
              <li className="flex items-start">
                <FaInfoCircle className="text-gray-500 mt-1 mr-2" />
                <div>
                  <span className="text-gray-600 block">Load Description:</span>
                  <span className="font-medium">{trip.load_description}</span>
                </div>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
            {trip.driver_name ? (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Driver</h4>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <FaUser className="text-gray-500 mr-2" />
                    <span>{trip.driver_name}</span>
                  </li>
                  <li className="flex items-center">
                    <FaPhone className="text-gray-500 mr-2" />
                    <span>{trip.driver_phone}</span>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                <p className="text-yellow-700">
                  No driver assigned yet. Waiting for bids.
                </p>
              </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Customer</h4>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <FaUser className="text-gray-500 mr-2" />
                  <span>{trip.user_name}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Status actions */}
        {availableActions.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Actions</h3>
            <div className="flex flex-wrap gap-2">
              {availableActions.map(action => (
                <button
                  key={action.value}
                  onClick={() => handleStatusChange(action.value)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Bidding panel - only show for requested trips */}
      {trip.status === 'REQUESTED' && (
        <BiddingPanel trip={trip} onBidAccepted={handleBidAccepted} />
      )}
      
      {/* Chat window - only show for accepted or in-progress trips */}
      {['ACCEPTED', 'IN_PROGRESS'].includes(trip.status) && (
        <ChatWindow trip={trip} />
      )}
    </div>
  );
};

export default TripStatus;


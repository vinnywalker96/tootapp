import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaCalendarAlt, FaClock, FaTruck } from 'react-icons/fa';
import webSocketService from '../services/WebSocketService';
import { useAuth } from '../context/AuthContext';

const ActiveTrips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  // Status colors
  const statusColors = {
    'ACCEPTED': 'bg-blue-100 text-blue-800',
    'IN_PROGRESS': 'bg-purple-100 text-purple-800'
  };
  
  useEffect(() => {
    // Connect to WebSocket when component mounts
    const token = localStorage.getItem('token');
    if (token) {
      webSocketService.connect(token).catch(error => {
        console.error('WebSocket connection failed:', error);
      });
    }
    
    // Fetch active trips for the driver
    const fetchActiveTrips = async () => {
      if (!user || !user.id) return;
      
      try {
        setLoading(true);
        
        // For drivers, fetch trips assigned to them with status ACCEPTED or IN_PROGRESS
        const response = await fetch(`/api/trips/?driver_id=${user.id}&status=ACCEPTED,IN_PROGRESS`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch active trips');
        }
        
        const data = await response.json();
        setTrips(data.trips || data); // Handle both response formats
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching active trips:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActiveTrips();
    
    // Register WebSocket handler for trip status updates
    const handleTripStatusUpdate = (data) => {
      setTrips(prevTrips => {
        // Find the trip in the current list
        const tripIndex = prevTrips.findIndex(trip => trip.id === data.id);
        
        if (tripIndex >= 0) {
          // If the status is no longer active, remove it from the list
          if (!['ACCEPTED', 'IN_PROGRESS'].includes(data.status)) {
            return prevTrips.filter(trip => trip.id !== data.id);
          }
          
          // Otherwise, update its status
          const updatedTrips = [...prevTrips];
          updatedTrips[tripIndex] = {
            ...updatedTrips[tripIndex],
            status: data.status
          };
          return updatedTrips;
        }
        
        // If it's a new active trip, add it to the list
        if (['ACCEPTED', 'IN_PROGRESS'].includes(data.status)) {
          // Fetch the full trip details
          fetchTripDetails(data.id);
        }
        
        return prevTrips;
      });
    };
    
    // Fetch full trip details when a new trip becomes active
    const fetchTripDetails = async (tripId) => {
      try {
        const response = await fetch(`/api/trips/${tripId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch trip details');
        }
        
        const tripData = await response.json();
        
        // Add the new trip to the list
        setTrips(prevTrips => [...prevTrips, tripData]);
      } catch (err) {
        console.error('Error fetching trip details:', err);
      }
    };
    
    webSocketService.registerHandler('trip.status_update', handleTripStatusUpdate);
    
    // Cleanup
    return () => {
      webSocketService.unregisterHandler('trip.status_update', handleTripStatusUpdate);
    };
  }, [user]);
  
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
      </div>
    );
  }
  
  if (trips.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Active Trips</h2>
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p className="text-gray-600">You have no active trips at the moment.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Active Trips</h2>
      <div className="space-y-4">
        {trips.map(trip => (
          <Link 
            key={trip.id} 
            to={`/driver/trips/${trip.id}`}
            className="block bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition duration-150"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">Trip #{trip.id}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[trip.status]}`}>
                {trip.status.replace('_', ' ')}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start">
                <FaMapMarkerAlt className="text-red-500 mt-1 mr-2" />
                <div>
                  <span className="text-gray-600 text-sm">From:</span>
                  <span className="block">{trip.pickup_location}</span>
                </div>
              </div>
              
              <div className="flex items-start">
                <FaMapMarkerAlt className="text-green-500 mt-1 mr-2" />
                <div>
                  <span className="text-gray-600 text-sm">To:</span>
                  <span className="block">{trip.dropoff_location}</span>
                </div>
              </div>
              
              <div className="flex items-start">
                <FaCalendarAlt className="text-blue-500 mt-1 mr-2" />
                <div>
                  <span className="text-gray-600 text-sm">Date:</span>
                  <span className="block">
                    {new Date(trip.pickup_time).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-start">
                <FaClock className="text-blue-500 mt-1 mr-2" />
                <div>
                  <span className="text-gray-600 text-sm">Time:</span>
                  <span className="block">
                    {new Date(trip.pickup_time).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-start">
                <FaTruck className="text-gray-500 mt-1 mr-2" />
                <div>
                  <span className="text-gray-600 text-sm">Vehicle:</span>
                  <span className="block">{trip.vehicle_type}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ActiveTrips;


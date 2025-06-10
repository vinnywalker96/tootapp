import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAccessToken } from "../../services/AuthService";
import { jwtDecode } from "jwt-decode";
import { format } from 'date-fns';
import { FaMapMarkerAlt, FaCalendarAlt, FaBoxOpen, FaMoneyBillWave, FaUser, FaPhone, FaCarAlt } from 'react-icons/fa';
import webSocketService from '../../services/WebSocketService';
import BiddingPanel from '../Bidding/BiddingPanel';
import ChatWindow from '../Chat/ChatWindow';

const ActiveTrips = () => {
  const [availableTrips, setAvailableTrips] = useState([]);
  const [myTrips, setMyTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [driverId, setDriverId] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [activeTab, setActiveTab] = useState('available');
  const [viewMode, setViewMode] = useState('list');

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setDriverId(decoded['user_id']);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }

    fetchTrips();

    // Connect to WebSocket
    webSocketService.connect()
      .then(() => {
        console.log('WebSocket connected for active trips');
      })
      .catch(error => {
        console.error('WebSocket connection error:', error);
      });

    // Subscribe to new trip notifications
    const tripCreatedUnsubscribe = webSocketService.subscribe('trip.created', (data) => {
      if (data.status === 'REQUESTED' && data.allow_bidding) {
        setAvailableTrips(prevTrips => {
          // Check if trip already exists
          if (prevTrips.some(trip => trip.id === data.id)) {
            return prevTrips;
          }
          return [data, ...prevTrips];
        });
      }
    });

    // Subscribe to trip updates
    const tripUpdatedUnsubscribe = webSocketService.subscribe('trip.updated', (data) => {
      // Update available trips
      setAvailableTrips(prevTrips => {
        return prevTrips.map(trip => trip.id === data.id ? data : trip)
          .filter(trip => trip.status === 'REQUESTED' && trip.allow_bidding);
      });

      // Update my trips
      setMyTrips(prevTrips => {
        if (data.driver?.id === driverId) {
          if (prevTrips.some(trip => trip.id === data.id)) {
            return prevTrips.map(trip => trip.id === data.id ? data : trip);
          } else {
            return [data, ...prevTrips];
          }
        }
        return prevTrips;
      });

      // Update selected trip if it's the one being viewed
      if (selectedTrip && selectedTrip.id === data.id) {
        setSelectedTrip(data);
      }
    });

    // Subscribe to bid accepted events
    const bidAcceptedUnsubscribe = webSocketService.subscribe('bid.accepted', (data) => {
      // Update available trips (remove if bid was accepted)
      setAvailableTrips(prevTrips => {
        return prevTrips.filter(trip => trip.id !== data.id);
      });

      // Update my trips if I'm the driver
      if (data.driver?.id === driverId) {
        setMyTrips(prevTrips => {
          if (prevTrips.some(trip => trip.id === data.id)) {
            return prevTrips.map(trip => trip.id === data.id ? data : trip);
          } else {
            return [data, ...prevTrips];
          }
        });
      }

      // Update selected trip if it's the one being viewed
      if (selectedTrip && selectedTrip.id === data.id) {
        setSelectedTrip(data);
      }
    });

    return () => {
      tripCreatedUnsubscribe();
      tripUpdatedUnsubscribe();
      bidAcceptedUnsubscribe();
    };
  }, [driverId]);

  const fetchTrips = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const decoded = jwtDecode(token);
      const driver_id = decoded['user_id'];
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Fetch available trips
      const availableResponse = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/trip/available/`,
        config
      );
      
      // Fetch my trips
      const myTripsResponse = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/trip/driver/${driver_id}`,
        config
      );
      
      if (Array.isArray(availableResponse.data)) {
        setAvailableTrips(availableResponse.data.filter(trip => 
          trip.status === 'REQUESTED' && trip.allow_bidding
        ));
      }
      
      if (Array.isArray(myTripsResponse.data)) {
        setMyTrips(myTripsResponse.data.filter(trip => 
          trip.status === 'ACCEPTED' || trip.status === 'IN_PROGRESS'
        ));
      }
    } catch (err) {
      console.error('Error fetching trips:', err);
      setError('Error fetching trips. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return "";
    return format(new Date(dateTime), 'MMMM dd, yyyy hh:mm a');
  };

  const handleTripSelect = (trip) => {
    setSelectedTrip(trip);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedTrip(null);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'REQUESTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-purple-100 text-purple-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Render trip list view
  const renderTripList = () => {
    const trips = activeTab === 'available' ? availableTrips : myTrips;
    
    return (
      <div>
        <div className="flex border-b mb-4">
          <button
            className={`flex-1 py-3 px-4 text-center ${
              activeTab === 'available' 
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500 font-medium' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('available')}
          >
            Available Trips
          </button>
          
          <button
            className={`flex-1 py-3 px-4 text-center ${
              activeTab === 'my-trips' 
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500 font-medium' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('my-trips')}
          >
            My Trips
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-lg text-red-700 text-center">
            <p>{error}</p>
            <button 
              onClick={fetchTrips}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : trips.length > 0 ? (
          <div className="space-y-4">
            {trips.map((trip) => (
              <div 
                key={trip.id} 
                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleTripSelect(trip)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {trip.pickup_location?.location} to {trip.dropoff_location?.location}
                  </h2>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(trip.status)}`}>
                    {trip.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center">
                    <FaCalendarAlt className="text-gray-500 mr-2" />
                    <span className="text-sm text-gray-600">{formatDateTime(trip.pickup_time)}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <FaCarAlt className="text-gray-500 mr-2" />
                    <span className="text-sm text-gray-600">{trip.vehicle_type}</span>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <FaBoxOpen className="text-gray-500 mr-2" />
                  <span className="text-sm text-gray-600 truncate">{trip.load_description}</span>
                </div>
                
                {activeTab === 'available' && trip.min_bid > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center">
                      <FaMoneyBillWave className="text-green-500 mr-2" />
                      <span className="text-sm">
                        Bid Range: <span className="font-semibold">R{trip.min_bid}</span>
                        {trip.max_bid > 0 && <span> - R{trip.max_bid}</span>}
                      </span>
                    </div>
                  </div>
                )}
                
                {activeTab === 'my-trips' && trip.user && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center">
                      <FaUser className="text-blue-500 mr-2" />
                      <span className="text-sm">
                        Customer: <span className="font-semibold">{trip.user.full_name}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <p className="text-gray-500">
              {activeTab === 'available' 
                ? 'No available trips at the moment. Check back later!' 
                : 'You have no active trips.'}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Render trip detail view
  const renderTripDetail = () => {
    if (!selectedTrip) return null;
    
    return (
      <div>
        <button
          onClick={handleBackToList}
          className="mb-4 flex items-center text-blue-500 hover:text-blue-700"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back to trips
        </button>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">
                Trip Details
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(selectedTrip.status)}`}>
                {selectedTrip.status}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="text-blue-500 mr-3 mt-1">
                    <FaMapMarkerAlt size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pickup Location</p>
                    <p className="text-lg font-medium">{selectedTrip.pickup_location?.location || 'N/A'}</p>
                    {selectedTrip.pickup_location?.phone_number && (
                      <p className="text-sm text-gray-500">
                        Phone: {selectedTrip.pickup_location.phone_number}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="text-red-500 mr-3 mt-1">
                    <FaMapMarkerAlt size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Dropoff Location</p>
                    <p className="text-lg font-medium">{selectedTrip.dropoff_location?.location || 'N/A'}</p>
                    {selectedTrip.dropoff_location?.phone_number && (
                      <p className="text-sm text-gray-500">
                        Phone: {selectedTrip.dropoff_location.phone_number}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="text-yellow-500 mr-3 mt-1">
                    <FaCalendarAlt size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pickup Time</p>
                    <p className="text-lg font-medium">{formatDateTime(selectedTrip.pickup_time)}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="text-green-500 mr-3 mt-1">
                    <FaBoxOpen size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Load Description</p>
                    <p className="text-lg font-medium">{selectedTrip.load_description || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="text-purple-500 mr-3 mt-1">
                    <FaCarAlt size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vehicle Type</p>
                    <p className="text-lg font-medium">{selectedTrip.vehicle_type || 'N/A'}</p>
                  </div>
                </div>
                
                {selectedTrip.user && (
                  <div className="flex items-start">
                    <div className="text-indigo-500 mr-3 mt-1">
                      <FaUser size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Customer</p>
                      <p className="text-lg font-medium">{selectedTrip.user.full_name || 'N/A'}</p>
                      {selectedTrip.user.phone_number && (
                        <p className="text-sm text-gray-500 flex items-center">
                          <FaPhone className="mr-1" /> {selectedTrip.user.phone_number}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Bidding Panel */}
            {selectedTrip.status === 'REQUESTED' && selectedTrip.allow_bidding && (
              <div className="mt-6">
                <BiddingPanel trip={selectedTrip} userType="driver" />
              </div>
            )}
            
            {/* Chat Window */}
            {(selectedTrip.status === 'ACCEPTED' || selectedTrip.status === 'IN_PROGRESS') && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-4">Chat with Customer</h3>
                <ChatWindow tripId={selectedTrip.id} userType="driver" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 pt-6">
      <h1 className="text-2xl font-bold text-center mb-6">
        {viewMode === 'list' 
          ? (activeTab === 'available' ? 'Available Trips' : 'My Active Trips')
          : 'Trip Details'
        }
      </h1>
      
      {viewMode === 'list' ? renderTripList() : renderTripDetail()}
    </div>
  );
};

export default ActiveTrips;


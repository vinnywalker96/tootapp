import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { ClipLoader } from 'react-spinners';
import { FaMapMarkerAlt, FaUser, FaPhone, FaCar, FaMoneyBillWave, FaComments } from 'react-icons/fa';
import logo from '../../assets/logo.png';
import { getAccessToken } from '../../services/AuthService';
import webSocketService from '../../services/WebSocketService';
import BiddingPanel from '../Bidding/BiddingPanel';
import ChatWindow from '../Chat/ChatWindow';

const TripStatus = () => {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('status');

  const statusMessages = {
    REQUESTED: "Matching you with the best driver nearby...",
    ACCEPTED: "Driver accepted the trip. They're on their way!",
    IN_PROGRESS: "The driver is on the way to pick you up!",
    COMPLETED: "Trip completed! Thank you for riding with us!",
    CANCELLED: "The trip has been cancelled.",
  };

  const statusColors = {
    REQUESTED: "bg-yellow-100 text-yellow-800",
    ACCEPTED: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-green-100 text-green-800",
    COMPLETED: "bg-purple-100 text-purple-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  useEffect(() => {
    const fetchTripDetails = async () => {
      try {
        setLoading(true);
        const token = getAccessToken();
        if (!token) {
          setError("You are not authorized. Please log in again.");
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/api/trip/trip/${tripId}/status/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setTrip(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching trip details:", err);
        setError("Failed to fetch trip details. Please try again.");
        setLoading(false);
      }
    };

    fetchTripDetails();

    // Connect to WebSocket for real-time updates
    webSocketService.connect()
      .then(() => {
        console.log('WebSocket connected for trip status');
      })
      .catch(error => {
        console.error('WebSocket connection error:', error);
      });

    // Subscribe to trip updates
    const tripUpdateUnsubscribe = webSocketService.subscribe('trip.updated', (data) => {
      if (data.id === tripId) {
        setTrip(data);
      }
    });

    // Subscribe to bid accepted events
    const bidAcceptedUnsubscribe = webSocketService.subscribe('bid.accepted', (data) => {
      if (data.id === tripId) {
        setTrip(data);
      }
    });

    return () => {
      tripUpdateUnsubscribe();
      bidAcceptedUnsubscribe();
    };
  }, [tripId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100">
        <div className="w-full max-w-md bg-red-50 text-red-700 p-4 rounded-lg shadow-md text-center">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading || !trip) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ClipLoader color="#FFD700" size={50} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100">
      <img src={logo} alt="Company Logo" className="w-24 mb-6" />
      
      <div className="w-full max-w-4xl bg-white shadow-md rounded-lg overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 px-4 text-center ${
              activeTab === 'status' 
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500 font-medium' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('status')}
          >
            Trip Status
          </button>
          
          <button
            className={`flex-1 py-3 px-4 text-center ${
              activeTab === 'bidding' 
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500 font-medium' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('bidding')}
          >
            Bidding
          </button>
          
          {(trip.status === 'ACCEPTED' || trip.status === 'IN_PROGRESS') && (
            <button
              className={`flex-1 py-3 px-4 text-center ${
                activeTab === 'chat' 
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500 font-medium' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
          )}
        </div>
        
        <div className="p-6">
          {/* Status Tab */}
          {activeTab === 'status' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Trip Details
                </h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[trip.status]}`}>
                  {trip.status}
                </span>
              </div>
              
              <p className="text-gray-700 mb-6">
                {statusMessages[trip.status] || "Updating trip details..."}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="text-blue-500 mr-3 mt-1">
                      <FaMapMarkerAlt size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pickup Location</p>
                      <p className="text-lg font-medium">{trip.pickup_location?.location || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="text-red-500 mr-3 mt-1">
                      <FaMapMarkerAlt size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Dropoff Location</p>
                      <p className="text-lg font-medium">{trip.dropoff_location?.location || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="text-green-500 mr-3 mt-1">
                      <FaMoneyBillWave size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Trip Cost</p>
                      <p className="text-lg font-medium">R{trip.bid || '0.00'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="text-yellow-500 mr-3 mt-1">
                      <FaCar size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Vehicle Type</p>
                      <p className="text-lg font-medium">{trip.vehicle_type || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {(trip.status === 'ACCEPTED' || trip.status === 'IN_PROGRESS') && trip.driver && (
                    <>
                      <div className="flex items-start">
                        <div className="text-purple-500 mr-3 mt-1">
                          <FaUser size={20} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Driver</p>
                          <p className="text-lg font-medium">{trip.driver.full_name || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="text-indigo-500 mr-3 mt-1">
                          <FaPhone size={20} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Driver Phone</p>
                          <p className="text-lg font-medium">{trip.driver.phone_number || 'N/A'}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {trip.status === 'COMPLETED' && (
                <div className="bg-green-50 p-4 rounded-md text-green-700 text-center mt-6">
                  <p className="font-semibold">Trip completed! Thank you for choosing us.</p>
                </div>
              )}
            </div>
          )}
          
          {/* Bidding Tab */}
          {activeTab === 'bidding' && (
            <BiddingPanel trip={trip} userType="user" />
          )}
          
          {/* Chat Tab */}
          {activeTab === 'chat' && (trip.status === 'ACCEPTED' || trip.status === 'IN_PROGRESS') && (
            <div>
              <div className="flex items-center mb-4">
                <FaComments className="text-blue-500 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Chat with Driver
                </h2>
              </div>
              
              <ChatWindow tripId={tripId} userType="user" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripStatus;


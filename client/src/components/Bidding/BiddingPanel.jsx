import React, { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaCheck, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import webSocketService from '../../services/WebSocketService';

const BiddingPanel = ({ trip, userType }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [bids, setBids] = useState([]);
  
  // Initialize bids from trip data
  useEffect(() => {
    if (trip && trip.bids) {
      setBids(trip.bids);
    }
  }, [trip]);
  
  // Subscribe to bid updates
  useEffect(() => {
    if (!trip || !trip.id) return;
    
    // Connect to WebSocket
    webSocketService.connect().catch(error => {
      console.error('WebSocket connection error:', error);
      setError('Failed to connect to bidding service');
    });
    
    // Subscribe to bid created events
    const bidCreatedUnsubscribe = webSocketService.subscribe('bid.created', (data) => {
      if (data.trip === trip.id) {
        // Update bids list
        setBids(prevBids => {
          // Check if bid already exists
          const existingBidIndex = prevBids.findIndex(bid => bid.id === data.id);
          
          if (existingBidIndex >= 0) {
            // Update existing bid
            const updatedBids = [...prevBids];
            updatedBids[existingBidIndex] = data;
            return updatedBids;
          } else {
            // Add new bid
            return [...prevBids, data];
          }
        });
        
        // Show success message if it's the current user's bid
        if (userType === 'driver' && data.driver === trip.driver?.id) {
          setSuccess('Your bid has been submitted successfully');
          setTimeout(() => setSuccess(null), 3000);
        }
      }
    });
    
    // Subscribe to bid accepted events
    const bidAcceptedUnsubscribe = webSocketService.subscribe('bid.accepted', (data) => {
      if (data.id === trip.id) {
        // Update trip data with accepted bid
        setBids(data.bids);
        
        // Show success message
        if (userType === 'driver' && data.driver?.id === trip.driver?.id) {
          setSuccess('Your bid has been accepted!');
        } else if (userType === 'user') {
          setSuccess('You have accepted a bid');
        }
      }
    });
    
    // Subscribe to error messages
    const errorUnsubscribe = webSocketService.subscribe('error', (data) => {
      setError(data.message || 'An error occurred');
      setLoading(false);
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    });
    
    return () => {
      bidCreatedUnsubscribe();
      bidAcceptedUnsubscribe();
      errorUnsubscribe();
    };
  }, [trip, userType]);
  
  const handleBidSubmit = (e) => {
    e.preventDefault();
    
    if (!bidAmount || isNaN(parseFloat(bidAmount))) {
      setError('Please enter a valid bid amount');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    webSocketService.createBid(trip.id, parseFloat(bidAmount))
      .then(() => {
        setBidAmount('');
        setLoading(false);
      })
      .catch(error => {
        console.error('Error submitting bid:', error);
        setError('Failed to submit bid');
        setLoading(false);
      });
  };
  
  const handleAcceptBid = (bidId) => {
    setLoading(true);
    setError(null);
    
    webSocketService.acceptBid(bidId)
      .then(() => {
        setLoading(false);
      })
      .catch(error => {
        console.error('Error accepting bid:', error);
        setError('Failed to accept bid');
        setLoading(false);
      });
  };
  
  // Check if bidding is allowed
  const isBiddingAllowed = () => {
    if (!trip) return false;
    
    // Check if trip allows bidding
    if (!trip.allow_bidding) return false;
    
    // Check if trip is in the right status
    if (trip.status !== 'REQUESTED') return false;
    
    // Check if bidding end time has passed
    if (trip.bidding_end_time) {
      const endTime = new Date(trip.bidding_end_time);
      if (endTime < new Date()) return false;
    }
    
    return true;
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return `R${parseFloat(amount).toFixed(2)}`;
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-semibold mb-4">
        <FaMoneyBillWave className="inline-block mr-2 text-green-500" />
        Bidding Panel
      </h2>
      
      {/* Bidding Info */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-500">Min Bid:</p>
            <p className="font-semibold">{trip?.min_bid ? formatCurrency(trip.min_bid) : 'Not set'}</p>
          </div>
          <div>
            <p className="text-gray-500">Max Bid:</p>
            <p className="font-semibold">{trip?.max_bid ? formatCurrency(trip.max_bid) : 'Not set'}</p>
          </div>
          {trip?.bidding_end_time && (
            <div className="col-span-2 mt-2">
              <p className="text-gray-500">Bidding Ends:</p>
              <p className="font-semibold">{formatDate(trip.bidding_end_time)}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Error and Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center">
          <FaExclamationTriangle className="mr-2" />
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center">
          <FaCheck className="mr-2" />
          <p>{success}</p>
        </div>
      )}
      
      {/* Bid Form for Drivers */}
      {userType === 'driver' && isBiddingAllowed() && (
        <form onSubmit={handleBidSubmit} className="mb-6">
          <div className="flex">
            <div className="relative flex-1">
              <span className="absolute left-3 top-3 text-gray-500">R</span>
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder="Enter bid amount"
                className="w-full p-2 pl-8 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={trip?.min_bid || 0}
                max={trip?.max_bid || 999999}
                step="0.01"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
              disabled={loading || !bidAmount}
            >
              {loading ? <FaSpinner className="animate-spin" /> : 'Submit Bid'}
            </button>
          </div>
        </form>
      )}
      
      {/* Bids List */}
      <div>
        <h3 className="font-semibold mb-2 text-gray-700">
          {bids.length > 0 ? `Bids (${bids.length})` : 'No bids yet'}
        </h3>
        
        {bids.length > 0 ? (
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {bids.sort((a, b) => a.amount - b.amount).map((bid) => (
              <div 
                key={bid.id} 
                className={`p-3 rounded-md border ${
                  bid.is_accepted 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-lg">{formatCurrency(bid.amount)}</p>
                    <p className="text-sm text-gray-500">
                      by {bid.driver_details?.full_name || 'Unknown Driver'}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(bid.created)}</p>
                  </div>
                  
                  {userType === 'user' && !bid.is_accepted && trip?.status === 'REQUESTED' && (
                    <button
                      onClick={() => handleAcceptBid(bid.id)}
                      className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      disabled={loading}
                    >
                      {loading ? <FaSpinner className="animate-spin" /> : 'Accept'}
                    </button>
                  )}
                  
                  {bid.is_accepted && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                      Accepted
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm italic">
            No bids have been placed yet for this trip.
          </p>
        )}
      </div>
    </div>
  );
};

export default BiddingPanel;


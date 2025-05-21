import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import webSocketService from '../services/WebSocketService';
import { useAuth } from '../context/AuthContext';

const BiddingPanel = ({ trip, onBidAccepted }) => {
  const [bids, setBids] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  // Determine if the current user is the trip owner
  const isTripOwner = user && trip && user.id === trip.user_id;
  
  // Determine if the current user is a driver
  const isDriver = user && user.role === 'driver';
  
  useEffect(() => {
    // Load existing bids for this trip
    const fetchBids = async () => {
      try {
        const response = await fetch(`/api/trips/${trip.id}/bids/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setBids(data);
        } else {
          console.error('Failed to fetch bids');
        }
      } catch (error) {
        console.error('Error fetching bids:', error);
      }
    };
    
    if (trip && trip.id) {
      fetchBids();
    }
    
    // Register WebSocket handlers for bid events
    const handleNewBid = (data) => {
      if (data.trip_id === trip.id) {
        setBids(prevBids => {
          // Check if this bid already exists
          const existingBidIndex = prevBids.findIndex(bid => bid.id === data.id);
          
          if (existingBidIndex >= 0) {
            // Update existing bid
            const updatedBids = [...prevBids];
            updatedBids[existingBidIndex] = {
              ...updatedBids[existingBidIndex],
              amount: data.amount,
              timestamp: data.timestamp
            };
            return updatedBids;
          } else {
            // Add new bid
            return [...prevBids, {
              id: data.id,
              trip_id: data.trip_id,
              driver_id: data.driver_id,
              driver_name: data.driver_name,
              amount: data.amount,
              timestamp: data.timestamp,
              is_accepted: false
            }];
          }
        });
        
        // Show notification for trip owner
        if (isTripOwner) {
          toast.info(`New bid received: ${data.amount} from ${data.driver_name}`);
        }
      }
    };
    
    const handleBidAccepted = (data) => {
      if (data.trip_id === trip.id) {
        // Update the bid status
        setBids(prevBids => 
          prevBids.map(bid => 
            bid.id === data.bid_id 
              ? { ...bid, is_accepted: true } 
              : bid
          )
        );
        
        // Call the parent component's callback
        if (onBidAccepted) {
          onBidAccepted(data);
        }
        
        // Show notification
        toast.success(`Bid accepted for trip #${trip.id}`);
      }
    };
    
    webSocketService.registerHandler('bid.new', handleNewBid);
    webSocketService.registerHandler('bid.accepted', handleBidAccepted);
    
    // Cleanup
    return () => {
      webSocketService.unregisterHandler('bid.new', handleNewBid);
      webSocketService.unregisterHandler('bid.accepted', handleBidAccepted);
    };
  }, [trip, isTripOwner, onBidAccepted]);
  
  const handleSubmitBid = (e) => {
    e.preventDefault();
    
    if (!bidAmount || isNaN(bidAmount) || parseFloat(bidAmount) <= 0) {
      toast.error('Please enter a valid bid amount');
      return;
    }
    
    setLoading(true);
    
    // Send bid via WebSocket
    const success = webSocketService.sendBid(trip.id, parseFloat(bidAmount));
    
    if (success) {
      toast.success('Bid submitted successfully');
      setBidAmount('');
    } else {
      toast.error('Failed to submit bid. Please try again.');
    }
    
    setLoading(false);
  };
  
  const handleAcceptBid = (bidId) => {
    setLoading(true);
    
    // Accept bid via WebSocket
    const success = webSocketService.acceptBid(bidId);
    
    if (!success) {
      toast.error('Failed to accept bid. Please try again.');
    }
    
    setLoading(false);
  };
  
  // If the trip is not in a biddable state, don't show the panel
  if (!trip || trip.status !== 'REQUESTED') {
    return null;
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3">Bidding</h3>
      
      {/* Bid list */}
      <div className="mb-4">
        <h4 className="text-md font-medium mb-2">Current Bids</h4>
        {bids.length === 0 ? (
          <p className="text-gray-500">No bids yet</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {bids.map(bid => (
              <li key={bid.id} className="py-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{bid.driver_name}</span>
                    <span className="text-gray-500 text-sm ml-2">
                      {new Date(bid.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-bold text-green-600">
                      ${parseFloat(bid.amount).toFixed(2)}
                    </span>
                    
                    {isTripOwner && !bid.is_accepted && (
                      <button
                        onClick={() => handleAcceptBid(bid.id)}
                        disabled={loading}
                        className="ml-3 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Accept
                      </button>
                    )}
                    
                    {bid.is_accepted && (
                      <span className="ml-3 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs">
                        Accepted
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Bid form - only show for drivers */}
      {isDriver && !trip.is_accepted && (
        <form onSubmit={handleSubmitBid} className="mt-4">
          <div className="flex">
            <div className="relative flex-grow">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder="Enter your bid amount"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.01"
                min="0"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-md"
            >
              {loading ? 'Submitting...' : 'Submit Bid'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default BiddingPanel;


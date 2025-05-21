import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrip, updateTrip } from '../../services/TripService';
import { FaMapMarkerAlt, FaUser, FaCar, FaCalendarAlt, FaBoxOpen, FaMoneyBillWave, FaPhone, FaStar } from 'react-icons/fa';

const TripDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    status: '',
    bid: '',
    vehicle_type: '',
    load_description: '',
  });

  useEffect(() => {
    const fetchTripDetails = async () => {
      try {
        setIsLoading(true);
        const response = await getTrip(id);
        setTrip(response);
        setFormData({
          status: response.status,
          bid: response.bid,
          vehicle_type: response.vehicle_type,
          load_description: response.load_description,
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching trip details:', error);
        setError('Failed to load trip details. Please try again later.');
        setIsLoading(false);
      }
    };

    fetchTripDetails();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await updateTrip(id, formData);
      // Refresh trip data
      const updatedTrip = await getTrip(id);
      setTrip(updatedTrip);
      setIsEditing(false);
      setIsLoading(false);
    } catch (error) {
      console.error('Error updating trip:', error);
      setError('Failed to update trip. Please try again later.');
      setIsLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get status badge color
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'ACCEPTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'REQUESTED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
        <p className="font-bold">Trip Not Found</p>
        <p>The requested trip could not be found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Trip Details</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => navigate('/dashboard/admin/trips')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Back to Trips
          </button>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Edit Trip
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="REQUESTED">Requested</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bid Amount (R)</label>
              <input
                type="number"
                name="bid"
                value={formData.bid}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
              <select
                name="vehicle_type"
                value={formData.vehicle_type}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bakkie">Bakkie</option>
                <option value="truck_1">1 ton Truck</option>
                <option value="truck_1.5">1.5 ton Truck</option>
                <option value="truck_2">2 ton Truck</option>
                <option value="truck_4">4 ton Truck</option>
                <option value="truck_8">8 ton Truck</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Load Description</label>
              <textarea
                name="load_description"
                value={formData.load_description}
                onChange={handleInputChange}
                rows="3"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <div>
          <div className="mb-6">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(trip.status)}`}>
              {trip.status}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <div className="text-yellow-500 mr-3 mt-1">
                  <FaCalendarAlt size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pickup Time</p>
                  <p className="text-lg font-medium">{formatDate(trip.pickup_time)}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="text-green-500 mr-3 mt-1">
                  <FaBoxOpen size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Load Description</p>
                  <p className="text-lg font-medium">{trip.load_description || 'N/A'}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="text-purple-500 mr-3 mt-1">
                  <FaUser size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="text-lg font-medium">{trip.user?.full_name || 'N/A'}</p>
                  {trip.user?.phone_number && (
                    <p className="text-sm text-gray-500 flex items-center">
                      <FaPhone className="mr-1" /> {trip.user.phone_number}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="text-indigo-500 mr-3 mt-1">
                  <FaCar size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vehicle Type</p>
                  <p className="text-lg font-medium">{trip.vehicle_type || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="text-orange-500 mr-3 mt-1">
                  <FaMoneyBillWave size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bid Amount</p>
                  <p className="text-lg font-medium">R{trip.bid || '0'}</p>
                </div>
              </div>
              
              {trip.rating && (
                <div className="flex items-start">
                  <div className="text-yellow-500 mr-3 mt-1">
                    <FaStar size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Rating</p>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <FaStar 
                          key={i} 
                          className={i < trip.rating ? "text-yellow-500" : "text-gray-300"} 
                        />
                      ))}
                      <span className="ml-2">{trip.rating}/5</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {trip.driver && (
            <div className="mt-8 p-4 border border-gray-200 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Driver Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <div className="text-blue-500 mr-3 mt-1">
                    <FaUser size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Driver Name</p>
                    <p className="text-lg font-medium">{trip.driver.full_name || 'N/A'}</p>
                  </div>
                </div>
                
                {trip.driver.phone_number && (
                  <div className="flex items-start">
                    <div className="text-green-500 mr-3 mt-1">
                      <FaPhone size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="text-lg font-medium">{trip.driver.phone_number}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TripDetails;


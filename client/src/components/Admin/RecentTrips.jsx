import React from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaBoxOpen, FaMoneyBillWave, FaCalendarAlt, FaUser, FaCar } from 'react-icons/fa';

export default function RecentTrips({ trips }) {
  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Recent Trips</h2>
        <Link to="/dashboard/admin/trips" className="text-blue-500 hover:text-blue-700 text-sm">
          View All
        </Link>
      </div>

      {!trips || Object.keys(trips).length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No recent trips found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.keys(trips).slice(0, 5).map((id) => (
            <div key={id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(trips[id].status)}`}>
                    {trips[id].status}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  <div className="flex items-center">
                    <FaCalendarAlt className="mr-1" />
                    {formatDate(trips[id].pickup_time)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="flex items-start">
                  <div className="text-blue-500 mr-2 mt-1">
                    <FaMapMarkerAlt />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Pickup Location</p>
                    <p className="text-sm font-medium">{trips[id].pickup_location.location}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="text-red-500 mr-2 mt-1">
                    <FaMapMarkerAlt />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Dropoff Location</p>
                    <p className="text-sm font-medium">{trips[id].dropoff_location.location}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="text-yellow-500 mr-2 mt-1">
                    <FaBoxOpen />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Load Description</p>
                    <p className="text-sm font-medium">{trips[id].load_description}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="text-green-500 mr-2 mt-1">
                    <FaMoneyBillWave />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cost</p>
                    <p className="text-sm font-medium">R{trips[id].bid}</p>
                  </div>
                </div>

                {trips[id].user && (
                  <div className="flex items-start">
                    <div className="text-purple-500 mr-2 mt-1">
                      <FaUser />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Customer</p>
                      <p className="text-sm font-medium">{trips[id].user.full_name || 'N/A'}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start">
                  <div className="text-indigo-500 mr-2 mt-1">
                    <FaCar />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Vehicle Type</p>
                    <p className="text-sm font-medium">{trips[id].vehicle_type}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-right">
                <Link 
                  to={`/dashboard/admin/trip/${id}`} 
                  className="text-sm text-blue-500 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

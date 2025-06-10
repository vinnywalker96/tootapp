import React, { useState, useEffect } from 'react';
import { getAllTrips } from '../../services/TripService';
import { Link } from 'react-router-dom';
import { FaSearch, FaFilter, FaSort, FaEye, FaEdit, FaTrash } from 'react-icons/fa';

function Trips() {
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const response = await getAllTrips();
        if (response && response.trips) {
          // Convert trips object to array
          const tripsArray = Object.keys(response.trips).map(key => ({
            id: key,
            ...response.trips[key]
          }));
          setTrips(tripsArray);
          setFilteredTrips(tripsArray);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching trips:', error);
        setIsLoading(false);
      }
    };

    fetchTrips();
  }, []);

  useEffect(() => {
    // Filter trips based on search term and status filter
    let result = trips;
    
    if (searchTerm) {
      result = result.filter(trip => 
        trip.pickup_location.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.dropoff_location.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.load_description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter) {
      result = result.filter(trip => trip.status === statusFilter);
    }
    
    // Sort trips
    result = [...result].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredTrips(result);
  }, [searchTerm, statusFilter, sortConfig, trips]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTrips.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Trip Management</h2>
      
      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search trips..."
            className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
        </div>
        
        <div className="relative">
          <select
            className="appearance-none w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="REQUESTED">Requested</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <FaFilter className="absolute left-3 top-3 text-gray-400" />
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Trips Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('id')}>
                    <div className="flex items-center">
                      ID
                      <FaSort className="ml-1" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pickup</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dropoff</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('pickup_time')}>
                    <div className="flex items-center">
                      Pickup Time
                      <FaSort className="ml-1" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Type</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('status')}>
                    <div className="flex items-center">
                      Status
                      <FaSort className="ml-1" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('bid')}>
                    <div className="flex items-center">
                      Bid (R)
                      <FaSort className="ml-1" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentItems.length > 0 ? (
                  currentItems.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="py-4 px-4 text-sm text-gray-500">{trip.id.substring(0, 8)}...</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{trip.pickup_location.location}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{trip.dropoff_location.location}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{formatDate(trip.pickup_time)}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{trip.vehicle_type}</td>
                      <td className="py-4 px-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          trip.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          trip.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          trip.status === 'ACCEPTED' ? 'bg-yellow-100 text-yellow-800' :
                          trip.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {trip.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">R{trip.bid}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button className="text-blue-500 hover:text-blue-700" title="View Details">
                            <FaEye />
                          </button>
                          <button className="text-green-500 hover:text-green-700" title="Edit Trip">
                            <FaEdit />
                          </button>
                          <button className="text-red-500 hover:text-red-700" title="Delete Trip">
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="py-4 px-4 text-center text-gray-500">No trips found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {filteredTrips.length > itemsPerPage && (
            <div className="flex justify-center mt-6">
              <nav className="flex items-center">
                <button
                  onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-l-md border ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-500 hover:bg-blue-50'}`}
                >
                  Previous
                </button>
                
                {[...Array(totalPages).keys()].map(number => (
                  <button
                    key={number + 1}
                    onClick={() => paginate(number + 1)}
                    className={`px-3 py-1 border-t border-b ${currentPage === number + 1 ? 'bg-blue-500 text-white' : 'bg-white text-blue-500 hover:bg-blue-50'}`}
                  >
                    {number + 1}
                  </button>
                ))}
                
                <button
                  onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-r-md border ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-500 hover:bg-blue-50'}`}
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Trips;


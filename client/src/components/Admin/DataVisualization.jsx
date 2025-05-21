import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { getAllCompletedTrips } from '../../services/TripService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const DataVisualization = ({ tripData }) => {
  const [completedTripsData, setCompletedTripsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('monthly');

  useEffect(() => {
    const fetchCompletedTrips = async () => {
      try {
        const data = await getAllCompletedTrips();
        setCompletedTripsData(data || []);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching completed trips:', error);
        setIsLoading(false);
      }
    };

    fetchCompletedTrips();
  }, []);

  // Prepare data for trip status distribution
  const tripStatusData = [
    { name: 'Requested', value: tripData?.requested_count || 0 },
    { name: 'Accepted', value: tripData?.accepted_count || 0 },
    { name: 'In Progress', value: tripData?.in_progress_count || 0 },
    { name: 'Completed', value: tripData?.completed_count || 0 },
    { name: 'Cancelled', value: tripData?.cancelled_count || 0 },
  ];

  // Filter out zero values
  const filteredTripStatusData = tripStatusData.filter(item => item.value > 0);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md w-full">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Trip Analytics</h2>
      
      {/* Tab Navigation */}
      <div className="flex mb-4 border-b">
        <button 
          className={`py-2 px-4 ${activeTab === 'monthly' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('monthly')}
        >
          Monthly Trends
        </button>
        <button 
          className={`py-2 px-4 ${activeTab === 'status' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('status')}
        >
          Status Distribution
        </button>
        <button 
          className={`py-2 px-4 ${activeTab === 'vehicle' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('vehicle')}
        >
          Vehicle Types
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="h-80">
          {activeTab === 'monthly' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={completedTripsData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="completed_trips_count" 
                  name="Completed Trips" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {activeTab === 'status' && (
            <ResponsiveContainer width="100%" height="100%">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-1/2">
                  <PieChart width={300} height={300}>
                    <Pie
                      data={filteredTripStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {filteredTripStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} trips`, 'Count']} />
                  </PieChart>
                </div>
                <div className="w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={tripStatusData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Trip Count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </ResponsiveContainer>
          )}

          {activeTab === 'vehicle' && (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-500">Vehicle type distribution will be available soon.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataVisualization;


import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { getAllCompletedTrips, getAllTrips } from '../../services/TripService';
import { getAllUsers, getAllDrivers } from '../../services/AuthService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Analytics = () => {
  const [completedTripsData, setCompletedTripsData] = useState([]);
  const [tripData, setTripData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trips');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all required data
        const completedTrips = await getAllCompletedTrips();
        const trips = await getAllTrips();
        const users = await getAllUsers();
        const drivers = await getAllDrivers();
        
        setCompletedTripsData(completedTrips || []);
        setTripData(trips);
        setUserData(users);
        setDriverData(drivers);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Prepare data for trip status distribution
  const tripStatusData = tripData ? [
    { name: 'Requested', value: tripData.requested_count || 0 },
    { name: 'Accepted', value: tripData.accepted_count || 0 },
    { name: 'In Progress', value: tripData.in_progress_count || 0 },
    { name: 'Completed', value: tripData.completed_count || 0 },
    { name: 'Cancelled', value: tripData.cancelled_count || 0 },
  ] : [];

  // Filter out zero values
  const filteredTripStatusData = tripStatusData.filter(item => item.value > 0);

  // Prepare data for revenue chart (placeholder data)
  const revenueData = [
    { month: 'Jan', revenue: 5000 },
    { month: 'Feb', revenue: 7000 },
    { month: 'Mar', revenue: 8500 },
    { month: 'Apr', revenue: 9800 },
    { month: 'May', revenue: 8100 },
    { month: 'Jun', revenue: 11000 },
    { month: 'Jul', revenue: 12500 },
    { month: 'Aug', revenue: 14000 },
    { month: 'Sep', revenue: 13200 },
    { month: 'Oct', revenue: 15000 },
    { month: 'Nov', revenue: 16800 },
    { month: 'Dec', revenue: 18000 },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Analytics Dashboard</h1>
      
      {/* Tab Navigation */}
      <div className="flex mb-6 border-b">
        <button 
          className={`py-2 px-4 ${activeTab === 'trips' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('trips')}
        >
          Trip Analytics
        </button>
        <button 
          className={`py-2 px-4 ${activeTab === 'users' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('users')}
        >
          User Analytics
        </button>
        <button 
          className={`py-2 px-4 ${activeTab === 'revenue' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('revenue')}
        >
          Revenue Analytics
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div>
          {activeTab === 'trips' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Completed Trips */}
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Monthly Completed Trips</h2>
                <div className="h-80">
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
                </div>
              </div>

              {/* Trip Status Distribution */}
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Trip Status Distribution</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
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
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Trip Status Bar Chart */}
              <div className="bg-white p-4 rounded-lg shadow-md lg:col-span-2">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Trip Status Comparison</h2>
                <div className="h-80">
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
            </div>
          )}

          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Growth Chart (placeholder) */}
              <div className="bg-white p-4 rounded-lg shadow-md lg:col-span-2">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">User Growth</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { month: 'Jan', users: 50, drivers: 20 },
                        { month: 'Feb', users: 80, drivers: 30 },
                        { month: 'Mar', users: 120, drivers: 45 },
                        { month: 'Apr', users: 170, drivers: 60 },
                        { month: 'May', users: 220, drivers: 80 },
                        { month: 'Jun', users: 300, drivers: 95 },
                      ]}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="users" stackId="1" stroke="#8884d8" fill="#8884d8" />
                      <Area type="monotone" dataKey="drivers" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* User vs Driver Ratio */}
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">User vs Driver Ratio</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Users', value: userData?.count || 0 },
                          { name: 'Drivers', value: driverData?.count || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#0088FE" />
                        <Cell fill="#00C49F" />
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}`, 'Count']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Active Users (placeholder) */}
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Active Users</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { period: 'Daily', active: 120 },
                        { period: 'Weekly', active: 350 },
                        { period: 'Monthly', active: 580 },
                      ]}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="active" name="Active Users" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Revenue */}
              <div className="bg-white p-4 rounded-lg shadow-md lg:col-span-2">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Monthly Revenue</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={revenueData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`R${value}`, 'Revenue']} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Revenue by Vehicle Type (placeholder) */}
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Revenue by Vehicle Type</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Bakkie', value: 15000 },
                          { name: '1 ton Truck', value: 25000 },
                          { name: '1.5 ton Truck', value: 30000 },
                          { name: '2 ton Truck', value: 45000 },
                          { name: '4 ton Truck', value: 60000 },
                          { name: '8 ton Truck', value: 80000 },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`R${value}`, 'Revenue']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Revenue Growth (placeholder) */}
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Revenue Growth</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { quarter: 'Q1', growth: 15 },
                        { quarter: 'Q2', growth: 25 },
                        { quarter: 'Q3', growth: 20 },
                        { quarter: 'Q4', growth: 35 },
                      ]}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="quarter" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}%`, 'Growth']} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="growth" 
                        name="Revenue Growth %" 
                        stroke="#82ca9d" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Analytics;


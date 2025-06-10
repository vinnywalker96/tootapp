import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const DataVisualization = ({ tripData }) => {
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

  // Colors for the pie chart
  const COLORS = ['#FFBB28', '#0088FE', '#00C49F', '#8884d8', '#FF8042'];

  return (
    <div className="bg-white rounded-lg shadow-md p-4 w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Trip Status Distribution</h2>
      </div>

      {!tripData ? (
        <div className="text-center py-8 text-gray-500">
          <p>No data available</p>
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default DataVisualization;


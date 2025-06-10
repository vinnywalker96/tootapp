import React from 'react';
import { FaUsers, FaCarAlt, FaSpinner, FaCheckCircle, FaCalendarCheck } from 'react-icons/fa';
import { MdPendingActions } from 'react-icons/md';

function DashboardStatsGrid({ userCount, driverCount, tripInProgressCount, tripCompletedCount, requestedCount, acceptedCount }) {
  const stats = [
    {
      title: 'Registered Users',
      value: userCount || 0,
      icon: <FaUsers className="text-2xl text-white" />,
      bgColor: 'bg-blue-500',
      textColor: 'text-blue-500',
    },
    {
      title: 'Registered Drivers',
      value: driverCount || 0,
      icon: <FaCarAlt className="text-2xl text-white" />,
      bgColor: 'bg-yellow-500',
      textColor: 'text-yellow-500',
    },
    {
      title: 'Trips In Progress',
      value: tripInProgressCount || 0,
      icon: <FaSpinner className="text-2xl text-white" />,
      bgColor: 'bg-green-500',
      textColor: 'text-green-500',
    },
    {
      title: 'Trips Completed',
      value: tripCompletedCount || 0,
      icon: <FaCheckCircle className="text-2xl text-white" />,
      bgColor: 'bg-purple-500',
      textColor: 'text-purple-500',
    },
    {
      title: 'Trips Requested',
      value: requestedCount || 0,
      icon: <MdPendingActions className="text-2xl text-white" />,
      bgColor: 'bg-orange-500',
      textColor: 'text-orange-500',
    },
    {
      title: 'Trips Accepted',
      value: acceptedCount || 0,
      icon: <FaCalendarCheck className="text-2xl text-white" />,
      bgColor: 'bg-indigo-500',
      textColor: 'text-indigo-500',
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      {stats.map((stat, index) => (
        <BoxWrapper key={index} bgColor={stat.bgColor} textColor={stat.textColor}>
          <div className={`flex justify-center items-center w-12 h-12 ${stat.bgColor} rounded-full`}>
            {stat.icon}
          </div>
          <div className="pl-4">
            <span className="text-sm font-light text-gray-500">{stat.title}</span>
            <div>
              <strong className={`text-xl font-semibold ${stat.textColor}`}>{stat.value}</strong>
            </div>
          </div>
        </BoxWrapper>
      ))}
    </div>
  );
}

export default DashboardStatsGrid;

function BoxWrapper({ children, bgColor, textColor }) {
  return (
    <div className="flex items-center p-4 bg-white rounded-lg shadow-md border border-gray-200 transition-all duration-300 hover:shadow-lg">
      {children}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardStatsGrid from '../components/DashboardStatsGrid';
import RecentTrips from '../components/RecentTrips';
import ActiveTrips from '../components/ActiveTrips';
import webSocketService from '../services/WebSocketService';

const DriverDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalTrips: 0,
    completedTrips: 0,
    inProgressTrips: 0,
    earnings: 0
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Connect to WebSocket when component mounts
    const token = localStorage.getItem('token');
    if (token) {
      webSocketService.connect(token).catch(error => {
        console.error('WebSocket connection failed:', error);
      });
    }
    
    // Fetch driver stats
    const fetchDriverStats = async () => {
      if (!user || !user.id) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/drivers/${user.id}/stats/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch driver stats');
        }
        
        const data = await response.json();
        setStats({
          totalTrips: data.total_trips || 0,
          completedTrips: data.completed_trips || 0,
          inProgressTrips: data.in_progress_trips || 0,
          earnings: data.total_earnings || 0
        });
      } catch (error) {
        console.error('Error fetching driver stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDriverStats();
    
    // Register WebSocket handler for new trip notifications
    const handleNewTrip = (data) => {
      // Show notification for new trip
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Trip Available', {
          body: `From: ${data.pickup_location} To: ${data.destination}`,
          icon: '/logo.png'
        });
      }
    };
    
    webSocketService.registerHandler('trip.new', handleNewTrip);
    
    // Request notification permission
    if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
    
    // Cleanup
    return () => {
      webSocketService.unregisterHandler('trip.new', handleNewTrip);
    };
  }, [user]);
  
  // Prepare stats for the dashboard grid
  const dashboardStats = [
    {
      title: 'Total Trips',
      value: stats.totalTrips,
      icon: 'FaTruck'
    },
    {
      title: 'Completed Trips',
      value: stats.completedTrips,
      icon: 'FaCheckCircle'
    },
    {
      title: 'In Progress',
      value: stats.inProgressTrips,
      icon: 'FaSpinner'
    },
    {
      title: 'Total Earnings',
      value: `$${stats.earnings.toFixed(2)}`,
      icon: 'FaMoneyBillWave'
    }
  ];
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Driver Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="mb-8">
        <DashboardStatsGrid stats={dashboardStats} loading={loading} />
      </div>
      
      {/* Active Trips */}
      <div className="mb-8">
        <ActiveTrips />
      </div>
      
      {/* Recent Trips */}
      <div>
        <RecentTrips limit={5} />
      </div>
    </div>
  );
};

export default DriverDashboard;


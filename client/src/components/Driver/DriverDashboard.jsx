import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BellIcon, UserIcon, CogIcon, ClockIcon, CurrencyDollarIcon, ClipboardCheckIcon, QuestionMarkCircleIcon, HomeIcon, LogoutIcon } from '@heroicons/react/outline';
import { useNavigate } from 'react-router-dom';
import LogoutConfirmationForm from './LogoutConfirmationForm';
import DriverProfileForm from "./DriverProfile";
import ActiveTrips from './ActiveTrips';
import { ToastContainer, toast } from 'react-toastify';
import supabase from '../../services/SupaBaseClient';
import { jwtDecode } from "jwt-decode";
import { getDriver, getAccessToken } from "../../services/AuthService";
import webSocketService from '../../services/WebSocketService';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [verified, setVerified] = useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [activeSection, setActiveSection] = useState('active-trips');
  const [newTripNotification, setNewTripNotification] = useState(false);

  const token = getAccessToken();
  const decodedToken = token ? jwtDecode(token) : null;

  useEffect(() => {
    const fetchVerificationStatus = async () => {
      try {
        if (token) {
          const driver = await getDriver();
          const config = { headers: { Authorization: `Bearer ${token}` } };
          try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/driver/verification-check/${driver.id}/`, config);
            if (response.data.verified === false) {
              navigate('/driver-verification-documents');
            }
          } catch(err) {
            console.error(err);
          }
        }
      } catch (error) {
        console.error('Error fetching verification status:', error);
      }
    };

    fetchVerificationStatus();
  }, [token, navigate]);

  useEffect(() => {
    if (token) {
      try {
        const currentTime = Date.now() / 1000;

        if (decodedToken.exp < currentTime) {
          setIsSessionExpired(true);
          localStorage.removeItem('access_token');
          navigate('/login/driver');
        } else {
          setIsSessionExpired(false);
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        setIsSessionExpired(true);
      }
    } else {
      setIsSessionExpired(true);
    }
  }, [token, decodedToken, navigate]);

  // Connect to WebSocket for real-time notifications
  useEffect(() => {
    // Connect to WebSocket
    webSocketService.connect()
      .then(() => {
        console.log('WebSocket connected for driver dashboard');
      })
      .catch(error => {
        console.error('WebSocket connection error:', error);
      });

    // Subscribe to new trip notifications
    const tripCreatedUnsubscribe = webSocketService.subscribe('trip.created', (data) => {
      if (data.status === 'REQUESTED' && data.allow_bidding) {
        setNewTripNotification(true);
        // Show toast notification
        toast.info('New trip available! Check the Active Trips section.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    });

    return () => {
      tripCreatedUnsubscribe();
    };
  }, []);

  // Function to toggle profile editing mode
  const toggleEditingProfile = () => {
    setEditingProfile(prevEditingProfile => !prevEditingProfile);
    if (editingProfile) {
      setActiveSection('active-trips');
    }
  };

  // Handle section change
  const handleSectionChange = (section) => {
    setActiveSection(section);
    if (section === 'active-trips') {
      setNewTripNotification(false);
    }
    setEditingProfile(false);
  };

  // Render the appropriate section content
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'active-trips':
        return <ActiveTrips />;
      case 'profile':
        return <DriverProfileForm onCancel={toggleEditingProfile} />;
      case 'earnings':
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Earnings and Statistics</h2>
            <p className="text-gray-600">Your earnings information will be displayed here.</p>
          </div>
        );
      case 'history':
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Ride History</h2>
            <p className="text-gray-600">Your ride history will be displayed here.</p>
          </div>
        );
      case 'settings':
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Settings and Support</h2>
            <p className="text-gray-600">Settings and support options will be displayed here.</p>
          </div>
        );
      default:
        return <ActiveTrips />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="container mx-auto px-4 py-6">
        {/* Dashboard Navigation */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Driver Dashboard</h1>
            
            <div className="flex space-x-6">
              <NavItem 
                icon={<HomeIcon className="h-6 w-6" />} 
                text="Active Trips" 
                isActive={activeSection === 'active-trips'}
                notification={newTripNotification}
                handleClick={() => handleSectionChange('active-trips')} 
              />
              <NavItem 
                icon={<UserIcon className="h-6 w-6" />} 
                text="Profile" 
                isActive={activeSection === 'profile'}
                handleClick={() => handleSectionChange('profile')} 
              />
              <NavItem 
                icon={<CurrencyDollarIcon className="h-6 w-6" />} 
                text="Earnings" 
                isActive={activeSection === 'earnings'}
                handleClick={() => handleSectionChange('earnings')} 
              />
              <NavItem 
                icon={<ClockIcon className="h-6 w-6" />} 
                text="History" 
                isActive={activeSection === 'history'}
                handleClick={() => handleSectionChange('history')} 
              />
              <NavItem 
                icon={<CogIcon className="h-6 w-6" />} 
                text="Settings" 
                isActive={activeSection === 'settings'}
                handleClick={() => handleSectionChange('settings')} 
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        {renderSectionContent()}
      </main>

      {/* Render LogoutConfirmationForm if showLogoutConfirmation is true */}
      {showLogoutConfirmation && (
        <LogoutConfirmationForm onConfirm={() => {}} />
      )}
      
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

// Component for navigation items
const NavItem = ({ icon, text, isActive, notification, handleClick }) => {
  return (
    <div 
      className={`flex items-center space-x-2 cursor-pointer p-2 rounded-md ${
        isActive 
          ? 'bg-blue-50 text-blue-600' 
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
      }`} 
      onClick={handleClick}
    >
      <div className="relative">
        {icon}
        {notification && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
        )}
      </div>
      <span className="hidden md:inline">{text}</span>
    </div>
  );
};

export default DriverDashboard;


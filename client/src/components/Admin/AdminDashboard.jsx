import React, {useEffect, useState, Suspense} from 'react'
const DashboardStatsGrid = React.lazy(() => import('./DashboardStatsGrid'));
const RecentTrips = React.lazy(() => import('./RecentTrips'));
const DataVisualization = React.lazy(() => import('./DataVisualization'));
import { getAllUsers, getAllDrivers } from '../../services/AuthService';
import { getAllTrips } from '../../services/TripService';
import { getAccessToken } from '../../services/AuthService';
import { jwtDecode } from "jwt-decode";
import { useNavigate} from 'react-router-dom';

function AdminDashboard() {
  const navigate = useNavigate();
  const token = getAccessToken();
  const [isLoading, setIsLoading] = useState(true);
  const [trips, setTrips] = useState(null);
  const [tripData, setTripData] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [tripInProgressCount, setTripInProgressCount] = useState(0);
  const [tripCompletedCount, setTripCompletedCount] = useState(0);
  const [driverCount, setDriverCount] = useState(0);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

 useEffect(() => {
    const fetchAll = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const currentTime = Date.now() / 1000;
          const decodedToken = jwtDecode(token);

          if (decodedToken.exp < currentTime) {
            setIsSessionExpired(true);
            localStorage.removeItem('access_token'); // Clear expired token
            navigate('/login/admin/'); 
            return; // Exit function if session is expired
          } else {
            setIsSessionExpired(false);
          }

          // If the session is valid, proceed to fetch data
          const users = await getAllUsers();
          const drivers = await getAllDrivers();
          const tripsResponse = await getAllTrips();
          
          setTrips(tripsResponse['trips']);
          setTripData(tripsResponse);
          setUserCount(users['count']);
          setDriverCount(drivers['count']);
          setTripInProgressCount(tripsResponse['in_progress_count']);
          setTripCompletedCount(tripsResponse['completed_count']);
          setIsLoading(false);
        } catch (err) {
          console.error(err);
          setIsLoading(false);
        }
      } else {
        setIsSessionExpired(true); // No token found, assume expired
      }
    };

    fetchAll();
  }, []);
  
  return (
    <div className="flex justify-start items-center flex-col gap-6 w-full px-4">
      {isSessionExpired && (
        <div className="w-full bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p className="font-bold">Session Expired</p>
          <p>Your session has expired. Please log in again.</p>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64 w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <Suspense fallback={<div className="flex items-center justify-center h-64 w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>}>
          <DashboardStatsGrid 
            userCount={userCount} 
            driverCount={driverCount} 
            tripInProgressCount={tripInProgressCount} 
            tripCompletedCount={tripCompletedCount} 
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            <DataVisualization tripData={tripData} />
            <RecentTrips trips={trips} />
          </div>
        </Suspense>
      )}
    </div>
  )
}

export default AdminDashboard

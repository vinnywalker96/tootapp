import React, { useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const CreateTripForm = () => {
  const [formData, setFormData] = useState({
    pickup_location: '',
    dropoff_location: '',
    pickup_time: '',
    dropoff_contact_number: '',
    load_description: '',
    vehicle_type: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/api/trip/', formData);

      // Initialize WebSocket connection
      const socket = io('ws://localhost:8000');
      
      // Emit event to notify other users of the new trip
      socket.emit('new_trip', formData);
      
      // Reset form after successful submission
      setFormData({
        pickup_location: '',
        dropoff_location: '',
        pickup_time: '',
        dropoff_contact_number: '',
        load_description: '',
        vehicle_type: '',
      });
      
      alert('Trip created successfully!');
    } catch (error) {
      console.error('Error creating trip:', error);
      alert('Failed to create trip. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">Pickup Location</label>
        <input
          type="text"
          name="pickup_location"
          value={formData.pickup_location}
          onChange={handleChange}
          placeholder="Enter pickup location"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">Dropoff Location</label>
        <input
          type="text"
          name="dropoff_location"
          value={formData.dropoff_location}
          onChange={handleChange}
          placeholder="Enter dropoff location"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">Pickup Time</label>
        <input
          type="datetime-local"
          name="pickup_time"
          value={formData.pickup_time}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">Dropoff Contact Number</label>
        <input
          type="tel"
          name="dropoff_contact_number"
          value={formData.dropoff_contact_number}
          onChange={handleChange}
          placeholder="Enter dropoff contact number"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">Load Description</label>
        <textarea
          name="load_description"
          value={formData.load_description}
          onChange={handleChange}
          placeholder="Enter load description"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        />
      </div>
      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-bold mb-2">Vehicle Type</label>
        <select
          name="vehicle_type"
          value={formData.vehicle_type}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        >
          <option value="">Select Vehicle Type</option>
          <option value="bike">Bike</option>
          <option value="car">Car</option>
          <option value="van">Van</option>
          <option value="truck_1">1 ton Truck</option>
          <option value="truck_1.5">1.5 ton Truck</option>
          <option value="truck_2">2 ton Truck</option>
          <option value="truck_4">4 ton Truck</option>
        </select>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Create Trip
        </button>
      </div>
    </form>
  );
};

export default CreateTripForm;

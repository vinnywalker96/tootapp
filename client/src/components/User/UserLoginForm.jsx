import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock } from 'react-icons/fa';

const UserLoginForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
    setTimeout(() => {
      setShowPassword(false);
    }, 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://127.0.0.1:8000/api/user/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access) {
          // Store the access token in localStorage
          localStorage.setItem('access_token', data.access);
          setSuccessMessage('Login successful! Redirecting to the dashboard...');
          setTimeout(() => {
            navigate('/dashboard/user');
          }, 2000);
          setFormData({ email: '', password: '' });
          setErrors({});
        } else {
          throw new Error('Token not found in response');
        }
      } else {
        const errorData = await response.json();
        if (response.status === 401) {
          setErrors({
            ...errors,
            invalidCredentials: 'Invalid email or password. Please try again.',
          });
        } else {
          setErrors(errorData);
        }
      }
    } catch (error) {
      console.error('Error during login:', error);
      setErrors({ generic: 'An error occurred. Please try again later.' });
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="bg-white rounded shadow-md p-6 w-full max-w-md mx-auto">
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <h2 className="text-3xl font-bold mb-4 text-center text-gray-900">Login To Toota</h2>

          {/* Email input */}
          <div className="mb-4 flex items-center">
            <FaEnvelope className="text-gray-500 mr-2" />
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded shadow appearance-none"
            />
          </div>
          {errors.email && <p className="text-red-500 text-lg italic ml-7">{errors.email}</p>}

          {/* Password input */}
          <div className="mb-4 relative flex items-center">
            <FaLock className="text-gray-500 mr-2" />
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded shadow appearance-none"
            />
            {/* Toggle password visibility button */}
            <span
              className="absolute right-0 bottom-1.5 mr-3 cursor-pointer"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </span>
          </div>
          {errors.password && <p className="text-red-500 text-lg italic ml-7">{errors.password}</p>}
          {errors.invalidCredentials && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {errors.invalidCredentials}
            </div>
          )}
          {errors.generic && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {errors.generic}
            </div>
          )}

          {/* Login button */}
          <button
            type="submit"
            className="bg-black text-white py-2 px-4 rounded hover:bg-gray-800 focus:outline-none focus:shadow-outline-black w-full"
          >
            Login
          </button>
        </form>

        {/* Forgot password link */}
        <p className="mt-4 text-center text-sm text-gray-500">
          Forgot your password?{' '}
          <Link to="/forgot-password" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Reset it here
          </Link>
        </p>

        {/* Sign up link */}
        <p className="mt-4 text-center text-sm text-gray-500">
          Don't have an account with Toota?{' '}
          <Link to="/signup/user" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default UserLoginForm;


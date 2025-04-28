import React, { useState } from 'react';
import { signIn } from './supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';

const SignIn = () => {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [showVerifyAlert, setShowVerifyAlert] = useState(location.state?.showVerifyAlert || false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // Try email first
    let { data, error } = await signIn(form.identifier, form.password);
    if (error) {
      setError(error.message);
      return;
    }
    // Success: redirect
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left: Form */}
      <div className="flex items-center justify-center bg-gray-50">
        <form onSubmit={handleSubmit} className="p-8 rounded w-full max-w-md flex flex-col items-center">
          {showVerifyAlert && (
            <div className="w-full mb-4 p-3 rounded bg-blue-100 text-blue-800 text-sm text-left border border-blue-200 relative flex items-center">
              <span className="flex-1">Please check your email to verify your account.</span>
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-700 hover:text-blue-900 p-1 rounded-full focus:outline-none border border-blue-200 bg-white"
                aria-label="Close"
                onClick={() => setShowVerifyAlert(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <h2 className="text-2xl font-bold mb-2 text-left w-full text-gray-900">Sign In</h2>
          <p className="mb-6 text-left w-full text-sm text-gray-600">Connect and vibe with international students, in the UK and across the globe—let's make the world your campus!</p>
          <div className="mb-4 w-full rounded-lg">
            <label className="block mb-1 font-medium text-sm">Email</label>
            <input
              type="text"
              name="identifier"
              value={form.identifier}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-primary text-base bg-white"
              required
            />
          </div>
          {error && <div className="text-red-600 text-xs mb-2 w-full text-left">{error}</div>}
          <div className="mb-4 w-full rounded-lg">
            <label className="block mb-1 font-medium text-sm">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-primary text-base bg-white"
              required
            />
          </div>
          <div className="flex justify-between items-center mb-6 w-full">
            <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/80 text-base font-semibold transition-colors duration-200">Sign In</button>
            <a href="/forgot-password" className="text-primary hover:underline text-xs">Forgot Password?</a>
          </div>
          <div className="text-center text-xs w-full">
            Don't have an account? <a href="/signup" className="text-primary hover:underline">Sign Up</a>
          </div>
        </form>
      </div>
      {/* Right: Image with Logo */}
      <div className="hidden md:flex items-center justify-center relative bg-cover bg-center" style={{ backgroundImage: 'url(/bg-1.jpg)' }}>
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        <img src="/uni-logo.svg" alt="University Logo" className="z-10 w-32 h-32 object-contain mx-auto" style={{ position: 'relative' }} />
      </div>
    </div>
  );
};

export default SignIn; 
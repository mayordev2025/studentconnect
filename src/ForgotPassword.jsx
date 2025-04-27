import React, { useState } from 'react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle forgot password logic here
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left: Form */}
      <div className="flex items-center justify-center bg-gray-50">
        <form onSubmit={handleSubmit} className="p-8 rounded w-full max-w-md flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-2 text-left w-full text-gray-900">Forgot Password</h2>
          <p className="mb-6 text-left w-full text-sm text-gray-600">Connect and vibe with international students, in the UK and across the globe—let's make the world your campus!</p>
          {submitted ? (
            <div className="text-center text-sm text-primary mb-4">If an account with that email exists, a password reset link has been sent.</div>
          ) : (
            <>
              <div className="mb-4 w-full rounded-lg">
                <label className="block mb-1 font-medium text-sm">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-primary text-base bg-white"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/80 text-base font-semibold transition-colors duration-200 mb-4">Send Reset Link</button>
            </>
          )}
          <div className="text-center text-xs w-full">
            <a href="/signin" className="text-primary hover:underline">Back to Sign In</a>
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

export default ForgotPassword; 
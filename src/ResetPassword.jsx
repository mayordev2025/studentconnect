import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check if user is in password recovery mode
  useEffect(() => {
    const checkRecovery = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError('Invalid or expired reset link. Please request a new one.');
      }
    };
    checkRecovery();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!password || !confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message || 'Failed to reset password.');
      return;
    }
    setSuccess('Password reset successful! You can now sign in.');
    setTimeout(() => navigate('/signin'), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="p-8 rounded w-full max-w-md flex flex-col items-center bg-white shadow">
        <h2 className="text-2xl font-bold mb-2 text-left w-full text-gray-900">Reset Password</h2>
        <p className="mb-6 text-left w-full text-sm text-gray-600">Enter your new password below.</p>
        {error && <div className="text-red-600 text-xs mb-2 w-full text-left">{error}</div>}
        {success && <div className="text-green-600 text-xs mb-2 w-full text-left">{success}</div>}
        <div className="mb-4 w-full rounded-lg">
          <label className="block mb-1 font-medium text-sm">New Password</label>
          <input
            type="password"
            name="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-primary text-base bg-white"
            required
            disabled={loading}
          />
        </div>
        <div className="mb-4 w-full rounded-lg">
          <label className="block mb-1 font-medium text-sm">Confirm New Password</label>
          <input
            type="password"
            name="confirm"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-primary text-base bg-white"
            required
            disabled={loading}
          />
        </div>
        <button type="submit" className="w-full bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/80 text-base font-semibold transition-colors duration-200 mb-4" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
        <div className="text-center text-xs w-full">
          <a href="/signin" className="text-primary hover:underline">Back to Sign In</a>
        </div>
      </form>
    </div>
  );
};

export default ResetPassword; 
import React, { useState, useEffect } from 'react';
import { signUp, uploadAvatar, supabase, getAvatarUrl } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

const countries = ['UK', 'USA', 'Canada', 'Others'];

const SignUp = () => {
  const [form, setForm] = useState({
    profilePic: null,
    name: '',
    email: '',
    username: '',
    country: '',
    university: '',
    password: '',
    manualCountry: '',
    manualUniversity: '',
  });
  const [preview, setPreview] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Helper to get initials from name
  const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Fetch universities from Supabase when country changes
  useEffect(() => {
    async function fetchUniversities() {
      if (['UK', 'USA', 'Canada'].includes(form.country)) {
        const { data, error } = await supabase
          .from('universities')
          .select('name')
          .eq('country', form.country === 'USA' ? 'USA' : form.country);
        if (!error && data) {
          setUniversities(data.map(u => u.name));
        } else {
          setUniversities([]);
        }
      } else {
        setUniversities([]);
      }
    }
    fetchUniversities();
  }, [form.country]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'profilePic' && files.length > 0) {
      setForm({ ...form, profilePic: files[0] });
      setPreview(URL.createObjectURL(files[0]));
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Compose country/university
    let country = form.country;
    let university = form.university;
    if (form.country === 'Others') {
      country = form.manualCountry.trim();
      university = form.manualUniversity.trim();
    }
    // Validation
    if (!form.name || !form.email || !form.username || !form.password || !country || !university) {
      setError('All fields including country and university are required.');
      setLoading(false);
      return;
    }
    // Sign up
    const { data, error: signUpError } = await signUp(form.email, form.password, form.name, form.username);
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    let avatarUrl = null;
    // Wait for session to be available
    let user = data.user;
    if (!user) {
      const { data: userData } = await supabase.auth.getUser();
      user = userData?.user;
    }
    // Upload avatar if provided and user is authenticated
    if (form.profilePic && user) {
      const uploadRes = await uploadAvatar(form.profilePic);
      if (!uploadRes.error) {
        avatarUrl = getAvatarUrl(user.id);
      } else {
        console.error('Avatar upload error:', uploadRes.error);
      }
    }
    // Insert profile data (if not handled by trigger)
    if (user) {
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert([{
          id: user.id,
          name: form.name,
          username: form.username,
          email: form.email,
          country,
          university,
          avatar_url: avatarUrl
        }]);
      if (upsertError) console.error('Profile upsert error:', upsertError);
    }
    setLoading(false);
    navigate('/signin', { state: { showVerifyAlert: true } });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left: Form */}
      <div className="flex items-center justify-center bg-gray-50">
        <form onSubmit={handleSubmit} className="p-8 rounded w-full max-w-md flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-2 text-left w-full text-gray-900">Sign Up</h2>
          <p className="mb-6 text-left w-full text-sm text-gray-600">Connect and vibe with international students, in the UK and across the globe—let's make the world your campus!</p>
          <div className="mb-4 flex flex-col items-center w-full">
            <div className="relative w-20 h-20 mb-2">
              {preview ? (
                <img src={preview} alt="Avatar Preview" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{getInitials(form.name) || <span className='text-xs text-gray-400'>No Image</span>}</span>
                </div>
              )}
              <label htmlFor="profilePicUpload" className="absolute bottom-1 right-1 bg-white rounded-full p-1 shadow cursor-pointer border border-gray-200 hover:bg-gray-100 transition">
                {/* Upload SVG icon */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0-3.5 3.5M12 8l3.5 3.5M4.75 19.25h14.5A2.25 2.25 0 0021.5 17V7A2.25 2.25 0 0019.25 4.75H4.75A2.25 2.25 0 002.5 7v10a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  id="profilePicUpload"
                  type="file"
                  name="profilePic"
                  accept="image/*"
                  onChange={handleChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  style={{ display: 'block' }}
                />
              </label>
            </div>
          </div>
          <div className="mb-4 w-full rounded-lg">
            <label className="block mb-1 font-medium text-sm">Your Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-primary text-base bg-white"
              required
            />
          </div>
          <div className="mb-4 w-full rounded-lg">
            <label className="block mb-1 font-medium text-sm">Your Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-primary text-base bg-white"
              required
            />
          </div>
          <div className="mb-4 w-full rounded-lg">
            <label className="block mb-1 font-medium text-sm">Username</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-primary text-base bg-white"
              required
            />
          </div>
          <div className="mb-4 w-full rounded-lg">
            <label className="block mb-1 font-medium text-sm">Select Country</label>
            <select
              name="country"
              value={form.country}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-primary text-base bg-white"
              required
            >
              <option value="">Select...</option>
              {countries.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
          {['UK', 'USA', 'Canada'].includes(form.country) && (
            <div className="mb-4 w-full rounded-lg">
              <label className="block mb-1 font-medium text-sm">Select University</label>
              <select
                name="university"
                value={form.university}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-primary text-base bg-white"
                required
              >
                <option value="">Select...</option>
                {universities.map((school) => (
                  <option key={school} value={school}>{school}</option>
                ))}
              </select>
            </div>
          )}
          {form.country === 'Others' && (
            <>
              <div className="mb-4 w-full rounded-lg">
                <label className="block mb-1 font-medium text-sm">Enter Country</label>
                <input
                  type="text"
                  name="manualCountry"
                  value={form.manualCountry}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-primary text-base bg-white"
                  required
                />
              </div>
              <div className="mb-4 w-full rounded-lg">
                <label className="block mb-1 font-medium text-sm">Enter University</label>
                <input
                  type="text"
                  name="manualUniversity"
                  value={form.manualUniversity}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-primary text-base bg-white"
                  required
                />
              </div>
            </>
          )}
          <div className="mb-6 w-full rounded-lg">
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
          {error && <div className="text-red-600 text-xs mb-2 w-full text-left">{error}</div>}
          <button type="submit" className="w-full bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/80 text-base font-semibold transition-colors duration-200" disabled={loading}>{loading ? 'Signing Up...' : 'Sign Up'}</button>
          <div className="text-center text-xs mt-4 w-full">
            Already have an account? <a href="/signin" className="text-primary hover:underline">Sign In</a>
          </div>
        </form>
      </div>
      {/* Right: Image with Logo */}
      <div className="hidden md:flex items-center justify-center relative bg-cover bg-center" style={{ backgroundImage: 'url(/bg-2.jpg)' }}>
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        <img src="/uni-logo.svg" alt="University Logo" className="z-10 w-32 h-32 object-contain mx-auto" style={{ position: 'relative' }} />
      </div>
    </div>
  );
};

export default SignUp; 
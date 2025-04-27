import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, MagnifyingGlassIcon, CalendarDaysIcon, UserIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid, MagnifyingGlassIcon as MagnifyingGlassIconSolid, CalendarDaysIcon as CalendarDaysIconSolid, UserIcon as UserIconSolid, Cog6ToothIcon as Cog6ToothIconSolid, ArrowRightOnRectangleIcon as ArrowRightOnRectangleIconSolid } from '@heroicons/react/24/solid';
import Chat from './Chat';
import { useNavigate } from 'react-router-dom';
import { supabase, sendFriendRequest, acceptFriendRequest, getProfile, updateProfile, uploadAvatar, getAvatarUrl, listAllCountries, listAllUniversities, createEvent, listEvents, getProfileById, getEventAttendees, rsvpEvent, deleteEvent, cancelAttendance, updateLastSeen, signOut } from './supabaseClient';
import { QRCodeSVG } from 'qrcode.react';

const menuItems = [
  { name: 'Chat', icon: ChatBubbleLeftRightIcon, solidIcon: ChatBubbleLeftRightIconSolid, key: 'chat' },
  { name: 'Students', icon: MagnifyingGlassIcon, solidIcon: MagnifyingGlassIconSolid, key: 'students' },
  { name: 'Event', icon: CalendarDaysIcon, solidIcon: CalendarDaysIconSolid, key: 'event' },
  { name: 'Friends', icon: UserIcon, solidIcon: UserIconSolid, key: 'friends' },
];

const bottomItems = [
  { name: 'Settings', icon: Cog6ToothIcon, solidIcon: Cog6ToothIconSolid, key: 'settings' },
  { name: 'Logout', icon: ArrowRightOnRectangleIcon, solidIcon: ArrowRightOnRectangleIconSolid, key: 'logout' },
];

const mockEvents = [
  {
    id: 1,
    title: 'International Student Mixer',
    location: 'Oxford University, UK',
    description: 'Meet and connect with students from around the world. Food and drinks provided!',
    date: '2024-07-10',
    time: '18:00',
    attendees: 42,
    attending: false,
    owner: false,
  },
  {
    id: 2,
    title: 'Tech Career Fair',
    location: 'Harvard University, USA',
    description: 'Explore job opportunities and network with top tech companies.',
    date: '2024-07-15',
    time: '14:00',
    attendees: 120,
    attending: true,
    owner: false,
  },
  {
    id: 3,
    title: 'Toronto Summer BBQ',
    location: 'University of Toronto, Canada',
    description: 'Enjoy a summer BBQ with fellow students. Games and prizes!',
    date: '2024-08-01',
    time: '12:00',
    attendees: 30,
    attending: false,
    owner: true,
  },
  // Add more mock events as needed
];

// Utility to generate a unique pastel background and soft text color from a string (e.g., user id or name)
function getPastelColors(str) {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // HSL for pastel backgrounds
  const hue = Math.abs(hash) % 360;
  const pastelBg = `hsl(${hue}, 70%, 85%)`;
  const pastelText = `hsl(${hue}, 40%, 45%)`;
  return { pastelBg, pastelText };
}

function SettingsPage({ user, setUser }) {
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({
    name: '',
    email: '',
    university: '',
    bio: '',
    username: '',
    profilePic: null,
  });
  // Notification toggles
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    inApp: true,
  });
  // Password management
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [passwordMsg, setPasswordMsg] = useState('');
  // Account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  // Modal for university field
  const [showUniversityModal, setShowUniversityModal] = useState(false);

  // Populate form with user info when user is loaded
  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        name: user.name || '',
        email: user.email || '',
        university: user.university || '',
        bio: user.bio || '',
        username: user.username || '',
      }));
      setAvatarPreview(user.avatar_url || null);
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'profilePic' && files && files[0]) {
      setForm({ ...form, profilePic: files[0] });
      setAvatarPreview(URL.createObjectURL(files[0]));
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm({ ...form, profilePic: file });
    setAvatarPreview(URL.createObjectURL(file));
    // Upload to Supabase
    const uploadRes = await uploadAvatar(file);
    if (!uploadRes.error && user) {
      const url = getAvatarUrl(user.id);
      // Update profile with new avatar_url
      const { error: upsertError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);
      if (!upsertError) {
        setUser(prev => ({ ...prev, avatar_url: url }));
      }
    } else if (uploadRes.error) {
      alert('Error uploading avatar: ' + uploadRes.error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Save settings logic here
    const updates = {
      name: form.name,
      email: form.email,
      university: form.university,
      bio: form.bio,
      username: form.username,
    };
    const { data, error } = await updateProfile(updates);
    if (!error) {
      // Update user state in Dashboard
      setUser(prev => ({ ...prev, ...updates }));
      alert('Settings saved!');
    } else {
      alert('Error saving settings: ' + error.message);
    }
  };

  // Notification toggle handler
  const handleNotifToggle = (key) => {
    setNotifications(n => ({ ...n, [key]: !n[key] }));
  };

  // Password form handler
  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      setPasswordMsg('Please fill in all fields.');
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordMsg('New passwords do not match.');
      return;
    }
    setPasswordMsg('Password updated!');
    setPasswordForm({ current: '', new: '', confirm: '' });
  };

  // Account deletion handler
  const handleDeleteAccount = () => {
    setShowDeleteConfirm(false);
    alert('Account deleted (mock).');
  };

  return (
    <div className="max-w-lg mx-auto w-full p-2">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Settings</h2>
      <div className="flex gap-2 mb-6 border-b border-gray-200 justify-center">
        <button onClick={() => setTab('profile')} className={`px-4 py-2 text-xs font-semibold rounded-t ${tab === 'profile' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'} transition-colors`}>Profile</button>
        <button onClick={() => setTab('notifications')} className={`px-4 py-2 text-xs font-semibold rounded-t ${tab === 'notifications' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'} transition-colors`}>Notifications</button>
        <button onClick={() => setTab('password')} className={`px-4 py-2 text-xs font-semibold rounded-t ${tab === 'password' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'} transition-colors`}>Password</button>
        <button onClick={() => setTab('account')} className={`px-4 py-2 text-xs font-semibold rounded-t ${tab === 'account' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'} transition-colors`}>Account</button>
      </div>
      {tab === 'profile' && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow flex flex-col gap-4 mb-8">
          <div className="flex flex-col items-center mb-4">
            <div className="relative w-20 h-20 mb-2">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar Preview" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                (() => {
                  const initials = (form.name || user?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
                  const { pastelBg, pastelText } = getPastelColors(user?.id || form.name || 'U');
                  return (
                    <div style={{ background: pastelBg }} className="w-20 h-20 rounded-full flex items-center justify-center">
                      <span style={{ color: pastelText }} className="text-2xl font-bold">{initials}</span>
                    </div>
                  );
                })()
              )}
              <label htmlFor="profilePicUploadSettings" className="absolute bottom-1 right-1 bg-white rounded-full p-1 shadow cursor-pointer border border-gray-200 hover:bg-gray-100 transition">
                {/* Upload SVG icon */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0-3.5 3.5M12 8l3.5 3.5M4.75 19.25h14.5A2.25 2.25 0 0021.5 17V7A2.25 2.25 0 0019.25 4.75H4.75A2.25 2.25 0 002.5 7v10a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  id="profilePicUploadSettings"
                  type="file"
                  name="profilePic"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  style={{ display: 'block' }}
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block mb-1 font-medium text-sm">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring focus:border-primary text-base bg-gray-50"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-sm">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring focus:border-primary text-base bg-gray-50"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-sm">University Name</label>
            <input
              type="text"
              name="university"
              value={form.university}
              readOnly
              onClick={() => setShowUniversityModal(true)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring focus:border-primary text-base bg-gray-50 cursor-pointer bg-gray-100"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-sm">Bio</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring focus:border-primary text-base bg-gray-50"
              rows={3}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-sm">Username</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring focus:border-primary text-base bg-gray-50"
              required
            />
          </div>
          <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/80 text-base font-semibold transition-colors duration-200">Save Settings</button>
        </form>
      )}
      {tab === 'notifications' && (
        <div className="bg-white p-8 rounded-lg shadow flex flex-col gap-4 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Notification Settings</h3>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={notifications.email} onChange={() => handleNotifToggle('email')} className="accent-primary" />
              <span className="text-sm text-gray-700">Email Notifications</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={notifications.push} onChange={() => handleNotifToggle('push')} className="accent-primary" />
              <span className="text-sm text-gray-700">Push Notifications</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={notifications.inApp} onChange={() => handleNotifToggle('inApp')} className="accent-primary" />
              <span className="text-sm text-gray-700">In-App Notifications</span>
            </label>
          </div>
        </div>
      )}
      {tab === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="bg-white p-8 rounded-lg shadow flex flex-col gap-4 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Password Management</h3>
          <div>
            <label className="block mb-1 font-medium text-sm">Current Password</label>
            <input
              type="password"
              name="current"
              value={passwordForm.current}
              onChange={handlePasswordChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring focus:border-primary text-base bg-gray-50"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-sm">New Password</label>
            <input
              type="password"
              name="new"
              value={passwordForm.new}
              onChange={handlePasswordChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring focus:border-primary text-base bg-gray-50"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-sm">Confirm New Password</label>
            <input
              type="password"
              name="confirm"
              value={passwordForm.confirm}
              onChange={handlePasswordChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring focus:border-primary text-base bg-gray-50"
              required
            />
          </div>
          {passwordMsg && <div className="text-xs text-primary mt-1">{passwordMsg}</div>}
          <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/80 text-base font-semibold transition-colors duration-200">Update Password</button>
        </form>
      )}
      {tab === 'account' && (
        <div className="bg-white p-8 rounded-lg shadow flex flex-col gap-4 mb-8">
          <h3 className="text-lg font-bold text-red-600 mb-2">Delete Account</h3>
          <p className="text-sm text-gray-500">This action is irreversible. Deleting your account will remove all your data from UniChat.</p>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 text-base font-semibold transition-colors duration-200 w-fit"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete My Account
          </button>
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 relative flex flex-col items-center">
                <h4 className="text-lg font-bold text-red-600 mb-2">Confirm Account Deletion</h4>
                <p className="text-sm text-gray-600 mb-4 text-center">Are you sure you want to delete your account? This cannot be undone.</p>
                <div className="flex gap-3">
                  <button className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700" onClick={handleDeleteAccount}>Yes, Delete</button>
                  <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {showUniversityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 relative flex flex-col items-center">
            <h4 className="text-lg font-bold text-primary mb-2">University Change</h4>
            <p className="text-sm text-gray-600 mb-4 text-center">Contact the administrator at <a href="mailto:admin@unichat.io" className="text-primary underline">admin@unichat.io</a>.</p>
            <button className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary/80 mt-2" onClick={() => setShowUniversityModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentPage({ openChatWithUser, user }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [school, setSchool] = useState('');
  const [friendships, setFriendships] = useState([]);
  const [requesting, setRequesting] = useState('');
  const [allCountries, setAllCountries] = useState([]);
  const [allUniversities, setAllUniversities] = useState([]);

  useEffect(() => {
    async function fetchStudents() {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, university, country, avatar_url');
      if (!error && data) {
        setStudents(data);
      }
      setLoading(false);
    }
    async function fetchFriendships() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);
      if (!error && data) setFriendships(data);
    }
    async function fetchFilters() {
      const [{ data: countries }, { data: universities }] = await Promise.all([
        listAllCountries(),
        listAllUniversities()
      ]);
      setAllCountries(countries || []);
      setAllUniversities(universities || []);
    }
    fetchStudents();
    fetchFriendships();
    fetchFilters();
  }, []);

  // Filter logic
  const filteredStudents = students.filter(student => {
    let matches = true;
    if (search) {
      const s = search.toLowerCase();
      matches =
        (student.username || '').toLowerCase().includes(s) ||
        (student.name || '').toLowerCase().includes(s) ||
        (student.university || '').toLowerCase().includes(s) ||
        (student.country || '').toLowerCase().includes(s);
    }
    if (country && student.country !== country) matches = false;
    if (school && student.university !== school) matches = false;
    return matches;
  });

  function getFriendshipStatus(studentId) {
    if (!user || !user.id) return null;
    if (studentId === user.id) return 'self';
    const f = friendships.find(f =>
      (f.user_id === user.id && f.friend_id === studentId) ||
      (f.user_id === studentId && f.friend_id === user.id)
    );
    if (!f) return null;
    if (f.status === 'accepted') return 'friends';
    if (f.status === 'pending' && f.user_id === user.id) return 'requested';
    if (f.status === 'pending' && f.friend_id === user.id) return 'incoming';
    return null;
  }

  async function handleAddFriend(student) {
    setRequesting(student.id);
    await sendFriendRequest(student.id);
    setRequesting('');
    // Refresh friendships
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);
    setFriendships(data || []);
  }

  return (
    <div className="max-w-5xl mx-auto w-full p-2">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Find Students</h2>
      {/* Search and Filters */}
      <div className="flex flex-row gap-2 mb-6 w-full overflow-x-auto">
        <input
          type="text"
          placeholder="Search by name, username, school, or country"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring focus:border-primary text-base bg-gray-50 flex-1 min-w-[160px]"
        />
        <select
          value={country}
          onChange={e => setCountry(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-base focus:outline-none flex-1 min-w-[140px]"
        >
          <option value="">All Countries</option>
          {allCountries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={school}
          onChange={e => setSchool(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-base focus:outline-none flex-1 min-w-[140px]"
        >
          <option value="">All Schools</option>
          {allUniversities.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {/* Student Grid */}
      {loading ? (
        <div className="text-center text-gray-400">Loading students...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredStudents.length === 0 ? (
            <div className="col-span-full text-center text-gray-400">No students found.</div>
          ) : (
            filteredStudents.map(student => {
              const status = getFriendshipStatus(student.id);
              return (
                <div key={student.id} className="bg-white rounded-xl shadow p-4 flex flex-col items-start text-left border border-gray-100 h-full">
                  {student.avatar_url ? (
                    <img src={student.avatar_url} alt={student.name} className="w-12 h-12 min-w-12 min-h-12 rounded-full object-cover mb-3 bg-primary/10 border border-gray-100" />
                  ) : (
                    (() => {
                      const initials = (student.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
                      const { pastelBg, pastelText } = getPastelColors(student.id || student.name || 'U');
                      return (
                        <div style={{ background: pastelBg }} className="w-12 h-12 min-w-12 min-h-12 rounded-full flex items-center justify-center mb-3 border border-gray-100">
                          <span style={{ color: pastelText }} className="text-base font-bold">{initials}</span>
                        </div>
                      );
                    })()
                  )}
                  <div className="font-semibold text-gray-900">{student.name}</div>
                  <div className="text-xs text-gray-500 mb-1">@{student.username}</div>
                  <div className="text-sm text-gray-600 mb-3">{student.university}</div>
                  <div className="flex-grow" />
                  <div className="flex gap-2 w-full justify-center mt-3">
                    <button className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary/80 transition-colors" onClick={() => openChatWithUser(student)}>Message</button>
                    <button
                      className="text-primary px-4 py-2 rounded-lg text-xs font-semibold border border-primary hover:bg-primary/10 transition-colors disabled:opacity-60"
                      disabled={status === 'self' || status === 'requested' || status === 'friends' || requesting === student.id}
                      onClick={() => handleAddFriend(student)}
                    >
                      {status === 'self' ? 'You' : status === 'friends' ? 'Friends' : status === 'requested' ? 'Requested' : 'Add Friend'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function EventPage({ user }) {
  const [tab, setTab] = useState('upcoming');
  const [events, setEvents] = useState([]);
  const [creators, setCreators] = useState({}); // eventId -> profile
  const [attendees, setAttendees] = useState([]); // attendees for selected event
  const [showCreate, setShowCreate] = useState(false);
  const [showDetails, setShowDetails] = useState(null); // event id or null
  const [form, setForm] = useState({
    title: '',
    location: '',
    description: '',
    date: '', // yyyy-mm-dd
    time: '', // HH:mm
  });
  const [loadingAttend, setLoadingAttend] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchAllEvents();
  }, []);

  async function fetchAllEvents() {
    const { data, error } = await listEvents();
    if (!error && data) {
      // Fetch attendance for current user
      let userId = user?.id;
      let eventsWithAttendance = data.map(ev => ({ ...ev, attending: false }));
      if (userId) {
        // Get all event_attendees for this user
        const { data: myAttending } = await supabase
          .from('event_attendees')
          .select('event_id')
          .eq('user_id', userId);
        const attendingIds = (myAttending || []).map(a => a.event_id);
        eventsWithAttendance = eventsWithAttendance.map(ev => ({ ...ev, attending: attendingIds.includes(ev.id) }));
      }
      setEvents(eventsWithAttendance);
      // Fetch creators for all events
      const uniqueCreatorIds = [...new Set(data.map(ev => ev.created_by).filter(Boolean))];
      const creatorProfiles = {};
      await Promise.all(uniqueCreatorIds.map(async (id) => {
        const { data: profile } = await getProfileById(id);
        if (profile) creatorProfiles[id] = profile;
      }));
      setCreators(creatorProfiles);
    }
  }

  // Filter events by tab
  const filteredEvents = events.filter(event => {
    if (tab === 'upcoming') return true;
    if (tab === 'my') return event.created_by === user?.id;
    if (tab === 'attending') return event.attending; // You may want to implement attendance logic
    return true;
  });

  const handleAttend = async (id) => {
    if (!user) return;
    setLoadingAttend(true);
    const event = events.find(ev => ev.id === id);
    if (event.attending) {
      await cancelAttendance(id);
      setToast('Attendance cancelled.');
    } else {
      await rsvpEvent(id);
      setToast('You are now attending this event!');
    }
    await fetchAllEvents();
    setLoadingAttend(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event? This cannot be undone.')) return;
    setLoadingDelete(true);
    await deleteEvent(id);
    setShowDetails(null);
    await fetchAllEvents();
    setToast('Event deleted.');
    setLoadingDelete(false);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.location || !form.date || !form.time) return;
    // Combine date and time into ISO string for start_time
    const start_time = new Date(`${form.date}T${form.time}:00Z`).toISOString();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await createEvent({
      name: form.title,
      location: form.location,
      description: form.description,
      start_time,
      created_by: user ? user.id : null
    });
    if (!error) {
      await fetchAllEvents();
      setForm({ title: '', location: '', description: '', date: '', time: '' });
      setShowCreate(false);
    } else {
      alert('Error creating event: ' + error.message);
    }
  };

  const selectedEvent = showDetails ? events.find(ev => ev.id === showDetails) : null;

  // Fetch attendees when modal opens
  useEffect(() => {
    async function fetchAttendees() {
      if (showDetails) {
        const { data, error } = await getEventAttendees(showDetails);
        if (!error && data) setAttendees(data.map(a => a.profiles).filter(Boolean));
        else setAttendees([]);
      } else {
        setAttendees([]);
      }
    }
    fetchAttendees();
  }, [showDetails]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="max-w-5xl mx-auto w-full p-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Events</h2>
        <button className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary/80 transition-colors" onClick={() => setShowCreate(true)}>Create Event</button>
      </div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button onClick={() => setTab('upcoming')} className={`px-4 py-2 text-xs font-semibold rounded-t ${tab === 'upcoming' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'} transition-colors`}>Upcoming Events</button>
        <button onClick={() => setTab('my')} className={`px-4 py-2 text-xs font-semibold rounded-t ${tab === 'my' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'} transition-colors`}>My Events</button>
        <button onClick={() => setTab('attending')} className={`px-4 py-2 text-xs font-semibold rounded-t ${tab === 'attending' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'} transition-colors`}>Attending</button>
      </div>
      {/* Event Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredEvents.length === 0 ? (
          <div className="col-span-full text-center text-gray-400">No events found.</div>
        ) : (
          filteredEvents.map(event => (
            <div key={event.id} className="bg-white rounded-xl shadow p-4 flex flex-col items-start text-left border border-gray-100 cursor-pointer hover:shadow-md transition h-full" onClick={() => setShowDetails(event.id)}>
              <h1 className="font-extrabold text-gray-900 text-xl mb-2 leading-tight uppercase">{event.title}</h1>
              <div className="flex items-center justify-center gap-1 text-base text-gray-700 mb-1 font-semibold uppercase">
                <MapPinIcon className="h-4 w-4 text-gray-500" />
                <span>{event.location}</span>
              </div>
              <div className="text-sm text-gray-600 mb-3 line-clamp-2 font-normal capitalize">{event.description}</div>
              <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mb-2 font-medium uppercase">
                <CalendarDaysIcon className="h-4 w-4 text-gray-500" />
                <span>{event.start_time ? `${new Date(event.start_time).toLocaleDateString()} • ${new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
              </div>
              {/* Show creator */}
              {creators[event.created_by] && (
                <div className="flex items-center gap-2 mb-2 font-medium">
                  {creators[event.created_by].avatar_url ? (
                    <img src={creators[event.created_by].avatar_url} alt={creators[event.created_by].name} className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                  ) : (
                    (() => {
                      const initials = (creators[event.created_by].name || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
                      const { pastelBg, pastelText } = getPastelColors(creators[event.created_by].id || creators[event.created_by].name || 'U');
                      return (
                        <div style={{ background: pastelBg }} className="w-6 h-6 rounded-full flex items-center justify-center border border-gray-200 text-xs font-bold">
                          <span style={{ color: pastelText }}>{initials}</span>
                        </div>
                      );
                    })()
                  )}
                  <span className="text-xs text-gray-700">By {creators[event.created_by].name}</span>
                </div>
              )}
              <div className="text-xs text-gray-500 mb-3 font-medium">{event.attendees} Attending</div>
              <div className="flex-grow" />
              <button
                className={`px-4 py-2 rounded-lg text-xs font-semibold w-full transition-colors mt-3 ${event.attending ? 'bg-red-100 text-red-600 border border-red-200 hover:bg-red-200' : 'bg-primary text-white hover:bg-primary/80'}`}
                onClick={e => { e.stopPropagation(); handleAttend(event.id); }}
              >
                {event.attending ? 'Cancel' : 'Attend'}
              </button>
            </div>
          ))
        )}
      </div>
      {/* Create Event Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100" onClick={() => setShowCreate(false)} aria-label="Close">✕</button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create Event</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <input name="title" value={form.title} onChange={handleFormChange} placeholder="Event Title" className="px-3 py-2 rounded border border-gray-200 bg-gray-50" required />
              <input name="location" value={form.location} onChange={handleFormChange} placeholder="Location" className="px-3 py-2 rounded border border-gray-200 bg-gray-50" required />
              <textarea name="description" value={form.description} onChange={handleFormChange} placeholder="Description" className="px-3 py-2 rounded border border-gray-200 bg-gray-50" rows={3} />
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col">
                  <label htmlFor="event-date" className="text-xs text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    id="event-date"
                    name="date"
                    value={form.date}
                    onChange={handleFormChange}
                    className="px-3 py-2 rounded border border-gray-200 bg-gray-50"
                    required
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <label htmlFor="event-time" className="text-xs text-gray-600 mb-1">Time</label>
                  <input
                    type="time"
                    id="event-time"
                    name="time"
                    value={form.time}
                    onChange={handleFormChange}
                    className="px-3 py-2 rounded border border-gray-200 bg-gray-50"
                    required
                    step="60"
                  />
                </div>
              </div>
              <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary/80 transition-colors mt-2">Create</button>
            </form>
          </div>
        </div>
      )}
      {/* Event Details Modal */}
      {showDetails && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100" onClick={() => setShowDetails(null)} aria-label="Close">✕</button>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2 uppercase">{selectedEvent.title}</h1>
            <div className="flex items-center gap-1 text-base text-gray-700 mb-1 font-semibold uppercase">
              <MapPinIcon className="h-4 w-4 text-gray-500" />
              <span>{selectedEvent.location}</span>
            </div>
            <div className="text-sm text-gray-600 mb-2 capitalize">{selectedEvent.description}</div>
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-2 font-medium uppercase">
              <CalendarDaysIcon className="h-4 w-4 text-gray-500" />
              <span>{selectedEvent.start_time ? `${new Date(selectedEvent.start_time).toLocaleDateString()} • ${new Date(selectedEvent.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
            </div>
            {/* Show creator in modal */}
            {creators[selectedEvent.created_by] && (
              <div className="flex items-center gap-2 mb-2">
                {creators[selectedEvent.created_by].avatar_url ? (
                  <img src={creators[selectedEvent.created_by].avatar_url} alt={creators[selectedEvent.created_by].name} className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                ) : (
                  (() => {
                    const initials = (creators[selectedEvent.created_by].name || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
                    const { pastelBg, pastelText } = getPastelColors(creators[selectedEvent.created_by].id || creators[selectedEvent.created_by].name || 'U');
                    return (
                      <div style={{ background: pastelBg }} className="w-6 h-6 rounded-full flex items-center justify-center border border-gray-200 text-xs font-bold">
                        <span style={{ color: pastelText }}>{initials}</span>
                      </div>
                    );
                  })()
                )}
                <span className="text-xs text-gray-700">By {creators[selectedEvent.created_by].name}</span>
              </div>
            )}
            {/* QR Code for event */}
            <div className="flex flex-col items-center my-4">
              <QRCodeSVG
                value={JSON.stringify({
                  id: selectedEvent.id,
                  name: selectedEvent.title,
                  description: selectedEvent.description,
                  location: selectedEvent.location,
                  date: selectedEvent.start_time,
                  url: `${window.location.origin}/event/${selectedEvent.id}`
                })}
                size={128}
                bgColor="#fff"
                fgColor="#111827"
                level="M"
                includeMargin={false}
              />
              <div className="text-xs text-gray-400 mt-2">Scan to view or register for this event</div>
            </div>
            {/* Show attendees */}
            <div className="mt-4">
              <div className="font-semibold text-xs text-gray-700 mb-1">Attendees:</div>
              {attendees.length === 0 ? (
                <div className="text-xs text-gray-400">No attendees yet.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {attendees.map(att => (
                    <div key={att.id} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
                      {att.avatar_url ? (
                        <img src={att.avatar_url} alt={att.name} className="w-5 h-5 rounded-full object-cover border border-gray-200" />
                      ) : (
                        (() => {
                          const initials = (att.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
                          const { pastelBg, pastelText } = getPastelColors(att.id || att.name || 'U');
                          return (
                            <div style={{ background: pastelBg }} className="w-5 h-5 rounded-full flex items-center justify-center border border-gray-200 text-[10px] font-bold">
                              <span style={{ color: pastelText }}>{initials}</span>
                            </div>
                          );
                        })()
                      )}
                      <span className="text-xs text-gray-700">{att.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              className={`px-4 py-2 rounded-lg text-xs font-semibold w-full transition-colors mt-4 ${selectedEvent.attending ? 'bg-red-100 text-red-600 border border-red-200 hover:bg-red-200' : 'bg-primary text-white hover:bg-primary/80'}`}
              onClick={() => handleAttend(selectedEvent.id)}
              disabled={loadingAttend}
            >
              {selectedEvent.attending ? (loadingAttend ? 'Cancelling...' : 'Cancel') : (loadingAttend ? 'Attending...' : 'Attend')}
            </button>
            {/* Delete button for event creator */}
            {user && selectedEvent.created_by === user.id && (
              <button
                className="px-4 py-2 rounded-lg text-xs font-semibold w-full mt-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
                onClick={() => handleDelete(selectedEvent.id)}
                disabled={loadingDelete}
              >
                {loadingDelete ? 'Deleting...' : 'Delete Event'}
              </button>
            )}
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-primary text-white px-6 py-2 rounded shadow-lg z-50 text-sm font-semibold animate-fade-in-out">
          {toast}
        </div>
      )}
    </div>
  );
}

function FriendsPage({ openChatWithUser, user }) {
  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    async function fetchFriendsAndRequests() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      // Friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);
      // Requests
      const { data: incoming } = await supabase
        .from('friendships')
        .select('*')
        .eq('friend_id', currentUser.id)
        .eq('status', 'pending');
      // Get profile info for friends and requests
      let friendIds = (friendships || []).map(f => f.user_id === currentUser.id ? f.friend_id : f.user_id);
      let requestUserIds = (incoming || []).map(r => r.user_id);
      const { data: friendProfiles } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url')
        .in('id', friendIds.length ? friendIds : ['00000000-0000-0000-0000-000000000000']);
      const { data: requestProfiles } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url')
        .in('id', requestUserIds.length ? requestUserIds : ['00000000-0000-0000-0000-000000000000']);
      setFriends(friendProfiles || []);
      setRequests((requestProfiles || []).map((p, i) => ({ ...p, requestId: incoming[i]?.id })));
    }
    fetchFriendsAndRequests();
  }, []);

  async function handleAccept(requestId) {
    await acceptFriendRequest(requestId);
    // Refresh
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
      .eq('status', 'accepted');
    const { data: incoming } = await supabase
      .from('friendships')
      .select('*')
      .eq('friend_id', currentUser.id)
      .eq('status', 'pending');
    let friendIds = (friendships || []).map(f => f.user_id === currentUser.id ? f.friend_id : f.user_id);
    let requestUserIds = (incoming || []).map(r => r.user_id);
    const { data: friendProfiles } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_url')
      .in('id', friendIds.length ? friendIds : ['00000000-0000-0000-0000-000000000000']);
    const { data: requestProfiles } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_url')
      .in('id', requestUserIds.length ? requestUserIds : ['00000000-0000-0000-0000-000000000000']);
    setFriends(friendProfiles || []);
    setRequests((requestProfiles || []).map((p, i) => ({ ...p, requestId: incoming[i]?.id })));
  }

  async function handleDecline(requestId) {
    await supabase.from('friendships').update({ status: 'declined' }).eq('id', requestId);
    // Refresh (same as above)
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
      .eq('status', 'accepted');
    const { data: incoming } = await supabase
      .from('friendships')
      .select('*')
      .eq('friend_id', currentUser.id)
      .eq('status', 'pending');
    let friendIds = (friendships || []).map(f => f.user_id === currentUser.id ? f.friend_id : f.user_id);
    let requestUserIds = (incoming || []).map(r => r.user_id);
    const { data: friendProfiles } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_url')
      .in('id', friendIds.length ? friendIds : ['00000000-0000-0000-0000-000000000000']);
    const { data: requestProfiles } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_url')
      .in('id', requestUserIds.length ? requestUserIds : ['00000000-0000-0000-0000-000000000000']);
    setFriends(friendProfiles || []);
    setRequests((requestProfiles || []).map((p, i) => ({ ...p, requestId: incoming[i]?.id })));
  }

  return (
    <div className="max-w-2xl mx-auto w-full p-2">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Friends</h2>
      <div className="flex gap-2 mb-6 border-b border-gray-200 justify-center">
        <button onClick={() => setTab('friends')} className={`px-4 py-2 text-xs font-semibold rounded-t ${tab === 'friends' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'} transition-colors`}>My Friends</button>
        <button onClick={() => setTab('requests')} className={`px-4 py-2 text-xs font-semibold rounded-t ${tab === 'requests' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'} transition-colors relative`}>
          Requests
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-500 text-white rounded-full text-[10px] px-1.5 py-0.5 font-bold shadow">{requests.length}</span>
          )}
        </button>
      </div>
      {tab === 'friends' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {friends.length === 0 ? (
            <div className="col-span-full text-center text-gray-400">No friends yet.</div>
          ) : (
            friends.map(friend => (
              <div key={friend.id} className="bg-white rounded-xl shadow p-4 flex items-center gap-4 border border-gray-100">
                {friend.avatar_url ? (
                  <img src={friend.avatar_url} alt={friend.name} className="w-12 h-12 min-w-12 min-h-12 rounded-full object-cover bg-primary/10 border border-gray-100" />
                ) : (
                  (() => {
                    const initials = (friend.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
                    const { pastelBg, pastelText } = getPastelColors(friend.id || friend.name || 'U');
                    return (
                      <div style={{ background: pastelBg }} className="w-12 h-12 min-w-12 min-h-12 rounded-full flex items-center justify-center border border-gray-100">
                        <span style={{ color: pastelText }} className="text-base font-bold">{initials}</span>
                      </div>
                    );
                  })()
                )}
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{friend.name}</div>
                  <div className="text-xs text-gray-500">@{friend.username}</div>
                </div>
                <button
                  className="text-primary px-3 py-2 rounded-lg text-xs font-semibold border border-primary hover:bg-primary/10 transition-colors"
                  onClick={() => openChatWithUser(friend)}
                >
                  Send Message
                </button>
              </div>
            ))
          )}
        </div>
      )}
      {tab === 'requests' && (
        <div className="grid grid-cols-1 gap-4">
          {requests.length === 0 ? (
            <div className="col-span-full text-center text-gray-400">No requests.</div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="bg-white rounded-xl shadow p-4 flex items-center gap-4 border border-gray-100">
                {req.avatar_url ? (
                  <img src={req.avatar_url} alt={req.name} className="w-12 h-12 min-w-12 min-h-12 rounded-full object-cover bg-primary/10 border border-gray-100" />
                ) : (
                  (() => {
                    const initials = (req.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
                    const { pastelBg, pastelText } = getPastelColors(req.id || req.name || 'U');
                    return (
                      <div style={{ background: pastelBg }} className="w-12 h-12 min-w-12 min-h-12 rounded-full flex items-center justify-center border border-gray-100">
                        <span style={{ color: pastelText }} className="text-base font-bold">{initials}</span>
                      </div>
                    );
                  })()
                )}
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{req.name}</div>
                </div>
                <button
                  className="bg-primary text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-primary/80 transition-colors"
                  onClick={() => handleAccept(req.requestId)}
                >
                  Accept
                </button>
                <button
                  className="bg-gray-100 text-primary px-3 py-2 rounded-lg text-xs font-semibold border border-primary hover:bg-primary/10 transition-colors"
                  onClick={() => handleDecline(req.requestId)}
                >
                  Decline
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('chat');
  const navigate = useNavigate();
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  // Central user state
  const [user, setUser] = useState(null);

  // Auto sign-out after 15 minutes of inactivity
  useEffect(() => {
    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        await signOut();
        navigate('/signin');
      }, 15 * 60 * 1000); // 15 minutes
    };
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timeout);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [navigate]);

  // Fetch user profile on mount
  useEffect(() => {
    async function fetchUserProfile() {
      const { data, error } = await getProfile();
      if (data) {
        setUser(data);
      }
    }
    fetchUserProfile();
    // Update last_seen on mount and every 60 seconds
    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSidebarClick = (key) => {
    if (key === 'logout') {
      // Simulate sign out and redirect
      // If using Supabase, call supabase.auth.signOut() here
      navigate('/signin');
      return;
    }
    setActiveSection(key);
  };

  // Function to open chat with a specific user
  const openChatWithUser = (userObj) => {
    setSelectedChatUser(userObj);
    setActiveSection('chat');
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-52 bg-gray-50 border-r border-gray-200 flex flex-col justify-between h-screen sticky top-0 left-0 z-30 overflow-hidden">
        <div>
          {/* Logo */}
          <div className="flex items-center justify-center py-6 px-4 gap-2">
            <img src="/u_icon.svg" alt="U Icon" className="w-8 h-8" />
            <span className="text-2xl font-extrabold text-zinc-800 tracking-tight">UniChat</span>
          </div>
          <div className="border-b border-gray-200 mx-4 mb-2" />
          {/* Profile Section */}
          <div className="flex items-center gap-2 py-2 px-4 mb-1">
            {/* User avatar or initials */}
            {user && user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-12 h-12 min-w-12 min-h-12 rounded-full object-cover bg-primary/10 border border-gray-100" />
            ) : user ? (
              (() => {
                const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
                const { pastelBg, pastelText } = getPastelColors(user.id || user.name || 'U');
                return (
                  <div style={{ background: pastelBg }} className="w-12 h-12 min-w-12 min-h-12 rounded-full flex items-center justify-center border border-gray-100">
                    <span style={{ color: pastelText }} className="text-base font-bold">{initials}</span>
                  </div>
                );
              })()
            ) : (
              <div className="w-12 h-12 min-w-12 min-h-12 rounded-full flex items-center justify-center bg-primary/10 animate-pulse" />
            )}
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-500">{user ? user.name : ''}</span>
              <span className="text-xs text-gray-400">{user ? user.university : ''}</span>
            </div>
          </div>
          {/* Menu */}
          <nav className="flex flex-col gap-1 mt-2">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleSidebarClick(item.key)}
                className={`group relative flex items-center gap-3 px-4 py-3 hover:bg-primary/10 transition rounded-lg mx-2 w-full text-left z-10 overflow-hidden ${activeSection === item.key ? 'bg-primary/10' : ''}`}
              >
                {React.createElement(activeSection === item.key ? item.solidIcon : item.icon, {
                  className: `h-6 w-6 transition-colors ${activeSection === item.key ? 'text-primary' : 'text-gray-500'} group-hover:text-primary`
                })}
                <span className={`hidden md:inline text-sm font-medium group-hover:block transition group-hover:text-primary ${activeSection === item.key ? 'text-primary' : 'text-gray-900'}`}>{item.name}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="border-t border-gray-200 mx-4 mt-8 mb-2" />
        {/* Bottom Menu */}
        <div className="flex flex-col gap-1 mb-8">
          {bottomItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleSidebarClick(item.key)}
              className="group relative flex items-center gap-3 px-4 py-3 hover:bg-primary/10 transition rounded-lg mx-2 w-full text-left z-10 overflow-hidden"
            >
              {React.createElement(activeSection === item.key ? item.solidIcon : item.icon, {
                className: `h-6 w-6 transition-colors ${activeSection === item.key ? 'text-primary' : 'text-gray-500'} group-hover:text-primary`
              })}
              <span className={`hidden md:inline text-sm font-medium group-hover:block transition group-hover:text-primary ${activeSection === item.key ? 'text-primary' : 'text-gray-900'}`}>{item.name}</span>
            </button>
          ))}
        </div>
      </aside>
      {/* Main Content */}
      <main className="flex-1">
        {activeSection === 'chat' && <Chat selectedUser={selectedChatUser} user={user} />}
        {activeSection === 'students' && <StudentPage openChatWithUser={openChatWithUser} user={user} />}
        {activeSection === 'event' && <EventPage user={user} />}
        {activeSection === 'settings' && <SettingsPage user={user} setUser={setUser} />}
        {activeSection === 'friends' && <FriendsPage openChatWithUser={openChatWithUser} user={user} />}
        {activeSection !== 'chat' && activeSection !== 'settings' && activeSection !== 'students' && activeSection !== 'event' && activeSection !== 'friends' && (
          <div className="bg-white rounded-lg shadow p-8 min-h-[400px] flex items-center justify-center text-gray-400">
            {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} content goes here
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard; 
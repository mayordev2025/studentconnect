import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function signUp(email, password, name, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, username }
    }
  });
  return { data, error };
}

async function signOut() {
  await supabase.auth.signOut();
}

async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  return { data, error };
}

async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return { data, error };
}

async function updateProfile(updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);
  return { data, error };
}

async function uploadAvatar(file) {
  const { data: { user } } = await supabase.auth.getUser();
  const filePath = `${user.id}/avatar.jpg`;
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });
  return { data, error, filePath };
}

function getAvatarUrl(userId) {
  return supabase.storage
    .from('avatars')
    .getPublicUrl(`${userId}/avatar.jpg`).data.publicUrl;
  // For private buckets, use .createSignedUrl instead
}

async function sendMessage(receiverId, content, type = 'text', fileUrl = null, replyTo = null) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('messages')
    .insert([{
      sender_id: user.id,
      receiver_id: receiverId,
      content,
      type,
      file_url: fileUrl,
      reply_to: replyTo
    }]);
  return { data, error };
}

async function fetchMessages(userId, otherUserId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true });
  return { data, error };
}

async function sendFriendRequest(friendId) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('friendships')
    .insert([{ user_id: user.id, friend_id: friendId, status: 'pending' }]);
  return { data, error };
}

async function acceptFriendRequest(requestId) {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', requestId);
  return { data, error };
}

async function listFriends() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .eq('status', 'accepted');
  return { data, error };
}

async function createEvent(event) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('events')
    .insert([{ ...event, created_by: user.id }]);
  return { data, error };
}

async function rsvpEvent(eventId) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('event_attendees')
    .insert([{ event_id: eventId, user_id: user.id }]);
  return { data, error };
}

async function listEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_time', { ascending: true });
  return { data, error };
}

async function listUniversities(country) {
  const { data, error } = await supabase
    .from('universities')
    .select('*')
    .eq('country', country)
    .order('name', { ascending: true });
  return { data, error };
}

async function signIn(identifier, password) {
  // Try email first
  let { data, error } = await supabase.auth.signInWithPassword({
    email: identifier,
    password
  });
  // If error, try username (Supabase Auth does not support username login by default)
  // You may need to implement a custom solution for username login.
  return { data, error };
}

async function listAllCountries() {
  const { data, error } = await supabase
    .from('universities')
    .select('country')
    .neq('country', '')
    .order('country', { ascending: true });
  if (error) return { data: [], error };
  // Get unique country names
  const unique = Array.from(new Set(data.map(u => u.country).filter(Boolean)));
  return { data: unique, error: null };
}

async function listAllUniversities() {
  const { data, error } = await supabase
    .from('universities')
    .select('name')
    .neq('name', '')
    .order('name', { ascending: true });
  if (error) return { data: [], error };
  // Get unique university names
  const unique = Array.from(new Set(data.map(u => u.name).filter(Boolean)));
  return { data: unique, error: null };
}

async function getProfileById(id) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, username, avatar_url')
    .eq('id', id)
    .single();
  return { data, error };
}

async function getEventAttendees(eventId) {
  const { data, error } = await supabase
    .from('event_attendees')
    .select('user_id, profiles(id, name, username, avatar_url)')
    .eq('event_id', eventId);
  // Returns array of { user_id, profiles: { ...profile } }
  return { data, error };
}

async function deleteEvent(eventId) {
  // Delete event and all its attendees
  // (You may want to use a DB trigger for cascading delete in production)
  const { error: attendeesError } = await supabase
    .from('event_attendees')
    .delete()
    .eq('event_id', eventId);
  const { data, error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);
  return { data, error: error || attendeesError };
}

async function cancelAttendance(eventId) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('event_attendees')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', user.id);
  return { data, error };
}

async function uploadChatFile(file, userId) {
  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${userId}/${timestamp}_${safeFileName}`;
  const { data, error } = await supabase.storage.from('chat-files').upload(filePath, file);
  if (error) return { url: null, error: error.message || error };
  const { publicUrl } = supabase.storage.from('chat-files').getPublicUrl(filePath);
  return { url: publicUrl, error: null };
}

// Update the user's last_seen timestamp
async function updateLastSeen() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', user.id);
  return { data, error };
}

// Block a user
async function blockUser(blockedUserId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { data, error } = await supabase
    .from('blocked_users')
    .insert([{ user_id: user.id, blocked_user_id: blockedUserId }]);
  return { data, error };
}

// Unblock a user
async function unblockUser(blockedUserId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { data, error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('user_id', user.id)
    .eq('blocked_user_id', blockedUserId);
  return { data, error };
}

// Check if a user is blocked
async function isUserBlocked(blockedUserId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase
    .from('blocked_users')
    .select('*')
    .eq('user_id', user.id)
    .eq('blocked_user_id', blockedUserId);
  return data && data.length > 0;
}

// Delete all messages between the current user and another user
async function deleteAllMessagesWithUser(otherUserId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { data, error } = await supabase
    .from('messages')
    .delete()
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`);
  return { data, error };
}

export {
  supabase,
  signUp,
  signIn,
  signOut,
  resetPassword,
  getProfile,
  updateProfile,
  uploadAvatar,
  getAvatarUrl,
  sendMessage,
  fetchMessages,
  sendFriendRequest,
  acceptFriendRequest,
  listFriends,
  createEvent,
  rsvpEvent,
  listEvents,
  listUniversities,
  listAllCountries,
  listAllUniversities,
  getProfileById,
  getEventAttendees,
  deleteEvent,
  cancelAttendance,
  uploadChatFile,
  updateLastSeen,
  blockUser,
  unblockUser,
  isUserBlocked,
  deleteAllMessagesWithUser,
};

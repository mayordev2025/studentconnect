import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon, PaperClipIcon, FaceSmileIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PaperAirplaneIcon as PaperAirplaneIconSolid } from '@heroicons/react/24/solid';
import EmojiPicker from 'emoji-picker-react';
import { supabase, sendMessage, fetchMessages, uploadChatFile, blockUser, unblockUser, isUserBlocked, deleteAllMessagesWithUser } from './supabaseClient';

const Chat = ({ selectedUser, user }) => {
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatUser, setChatUser] = useState(null); // The user you are chatting with
  const [conversations, setConversations] = useState([]); // [{user: {...}, lastMessage: {...}, unread: bool}]
  const [unreadMap, setUnreadMap] = useState({}); // {userId: true/false}
  const messagesEndRef = useRef(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedBy, setIsBlockedBy] = useState(false);

  // Helper to determine if a user is online
  function isUserOnline(lastSeen) {
    if (!lastSeen) return false;
    const last = new Date(lastSeen).getTime();
    const now = Date.now();
    return now - last < 2 * 60 * 1000; // 2 minutes
  }

  // Fetch users from Supabase when searching
  React.useEffect(() => {
    async function fetchUsers() {
      if (!modalOpen) {
        setUserResults([]);
        return;
      }
      if (!userSearch.trim()) {
        // For debugging: show all users except self if search is empty
        const { data: allUsers, error: allError } = await supabase
          .from('profiles')
          .select('id, name, username, email, avatar_url')
          .neq('id', user?.id);
        console.log('All users except self:', allUsers, allError);
        setUserResults(allUsers || []);
        return;
      }
      // Try .or() query first
      let { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, email, avatar_url')
        .or(`username.ilike.%${userSearch}%,name.ilike.%${userSearch}%,email.ilike.%${userSearch}%`)
        .neq('id', user?.id);
      console.log('Search .or() result:', data, error);
      // If no results or error, try separate queries and merge
      if (error || !data || data.length === 0) {
        let allResults = [];
        for (const field of ['username', 'name', 'email']) {
          const { data: d, error: e } = await supabase
            .from('profiles')
            .select('id, name, username, email, avatar_url')
            .ilike(field, `%${userSearch}%`)
            .neq('id', user?.id);
          console.log(`Search .ilike(${field}):`, d, e);
          if (d && d.length > 0) {
            allResults = allResults.concat(d);
          }
        }
        // Remove duplicates by id
        const unique = {};
        allResults.forEach(u => { unique[u.id] = u; });
        setUserResults(Object.values(unique));
      } else {
        setUserResults(data);
      }
    }
    fetchUsers();
  }, [userSearch, modalOpen, user?.id]);

  // When selectedUser changes, set chatUser and fetch messages
  React.useEffect(() => {
    if (selectedUser && selectedUser.id) {
      setChatUser(selectedUser);
      // Mark all messages from selectedUser as read in the database
      if (user && selectedUser.id !== user.id) {
        supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('receiver_id', user.id)
          .eq('sender_id', selectedUser.id)
          .is('read_at', null);
      }
    }
  }, [selectedUser, user]);

  // Fetch messages for the current chat
  React.useEffect(() => {
    let subscription;
    async function loadMessagesAndSubscribe() {
      if (!user?.id || !chatUser?.id) return;
      // Fetch messages
      const { data, error } = await fetchMessages(user.id, chatUser.id);
      if (!error && data) setMessages(data);
      // Subscribe to new messages (INSERT only)
      subscription = supabase
        .channel('messages-chat-window')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
          const msg = payload.new;
          // Only add if it's for this chat
          if (
            (msg.sender_id === user.id && msg.receiver_id === chatUser.id) ||
            (msg.sender_id === chatUser.id && msg.receiver_id === user.id)
          ) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            });
          }
        })
        .subscribe();
    }
    loadMessagesAndSubscribe();
    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [user?.id, chatUser?.id]);

  // Fetch all conversations (users you've messaged or received from) and their latest message
  useEffect(() => {
    if (!user?.id) return;
    let subscription;
    async function fetchConversations() {
      // Get all messages where user is sender or receiver
      const { data: msgs, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (!msgs) return;
      // Group by other user
      const convoMap = {};
      const unread = {};
      for (const msg of msgs) {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!convoMap[otherId]) {
          convoMap[otherId] = msg;
        }
        // Unread: if message is to me, from otherId, and not read
        if (
          msg.receiver_id === user.id &&
          msg.sender_id === otherId &&
          !msg.read_at
        ) {
          unread[otherId] = true;
        }
      }
      // Fetch user profiles for all other users
      const otherIds = Object.keys(convoMap);
      let profiles = [];
      if (otherIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, name, username, avatar_url')
          .in('id', otherIds);
        profiles = profs || [];
      }
      // Build conversation list
      const convos = otherIds.map(id => {
        const userObj = profiles.find(p => p.id === id) || { id };
        return {
          user: userObj,
          lastMessage: convoMap[id],
          unread: !!unread[id],
        };
      });
      // Sort by latest message
      convos.sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at));
      setConversations(convos);
      setUnreadMap(unread);
    }
    fetchConversations();
    // Subscribe to new messages for real-time updates
    subscription = supabase
      .channel('messages-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        fetchConversations();
      })
      .subscribe();
    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [user?.id, chatUser?.id]);

  // When opening a chat, mark as read
  useEffect(() => {
    if (chatUser && unreadMap[chatUser.id]) {
      setUnreadMap(prev => ({ ...prev, [chatUser.id]: false }));
      setConversations(prev => prev.map(c => c.user.id === chatUser.id ? { ...c, unread: false } : c));
    }
  }, [chatUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatUser]);

  // Check if chatUser is blocked or has blocked the current user when drawer opens or chatUser changes
  useEffect(() => {
    async function checkBlocked() {
      if (chatUser && chatUser.id && user && user.id) {
        const blocked = await isUserBlocked(chatUser.id);
        setIsBlocked(blocked);
        // Check if chatUser has blocked me
        const { data, error } = await supabase
          .from('blocked_users')
          .select('*')
          .eq('user_id', chatUser.id)
          .eq('blocked_user_id', user.id);
        setIsBlockedBy(data && data.length > 0);
      }
    }
    checkBlocked();
  }, [drawerOpen, chatUser, user]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() && !file) return;
    if (!user?.id) {
      alert('You must be logged in to send files.');
      return;
    }
    let fileUrl = null;
    let msgType = 'text';
    if (file) {
      // Upload file to Supabase Storage
      const { url, error } = await uploadChatFile(file, user.id);
      if (!error && url) {
        fileUrl = url;
        msgType = 'file';
      } else {
        alert('File upload failed: ' + (error || 'Unknown error'));
        return;
      }
    }
    await sendMessage(chatUser.id, message, msgType, fileUrl, null);
    setMessage('');
    setFile(null);
    setFilePreview(null);
    setShowEmoji(false);
  };

  const handleEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmoji(false);
  };

  const handleAttachClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File is too large. Max 10MB.');
      return;
    }
    setFile(file);
    if (file.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(file));
    } else if (file.type === 'application/pdf') {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
    e.target.value = '';
  };

  return (
    <div className="h-screen flex bg-gray-50 relative">
      {/* Modal for New Chat */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Start a New Chat</h3>
            <input
              type="text"
              placeholder="Search by username, email, or name..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring focus:border-primary text-base bg-gray-50"
              autoFocus
            />
            {/* User search results */}
            <div className="mt-4">
              {userSearch && userResults.length === 0 && (
                <div className="text-gray-400 text-sm text-center">No users found.</div>
              )}
              {userResults.map(u => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-2 py-2 hover:bg-primary/10 rounded cursor-pointer"
                  onClick={() => {
                    setChatUser(u);
                    setModalOpen(false);
                  }}
                >
                  <div className="relative">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.name} className="w-8 h-8 rounded-full object-cover bg-primary/10 border border-gray-100" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 border border-gray-100">
                        <span className="text-xs font-bold text-primary">{(u.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}</span>
                      </div>
                    )}
                    <span className={`absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full border-2 border-white ${isUserOnline(u.last_seen) ? 'bg-green-500' : 'bg-red-500'}`} title={isUserOnline(u.last_seen) ? 'Online' : 'Offline'} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{u.name}</span>
                    <span className="text-xs text-gray-500">@{u.username}</span>
                    <span className="text-xs text-gray-400">{u.email}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Chat List Panel */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Title and Add Button */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Chats</h2>
          <button className="p-2 rounded-full hover:bg-primary/10 transition" onClick={() => setModalOpen(true)}>
            <PlusIcon className="h-6 w-6 text-primary" />
          </button>
        </div>
        {/* Search Input */}
        <div className="px-4 py-2 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring focus:border-primary text-sm bg-gray-50"
          />
        </div>
        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {conversations
            .filter(c => {
              const s = search.toLowerCase();
              return (
                (c.user.name || '').toLowerCase().includes(s) ||
                (c.user.username || '').toLowerCase().includes(s)
              );
            })
            .map(c => (
              <div
                key={c.user.id}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-primary/5 cursor-pointer border-b border-gray-50 ${chatUser && chatUser.id === c.user.id ? 'bg-primary/5' : ''}`}
                onClick={() => setChatUser(c.user)}
              >
                <div className="relative">
                  {c.user.avatar_url ? (
                    <img src={c.user.avatar_url} alt={c.user.name} className="w-10 h-10 rounded-full object-cover bg-primary/10 border border-gray-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 border border-gray-100">
                      <span className="text-sm font-bold text-primary">{(c.user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}</span>
                    </div>
                  )}
                  <span className={`absolute bottom-0 right-0 block w-3 h-3 rounded-full border-2 border-white ${isUserOnline(c.user.last_seen) ? 'bg-green-500' : 'bg-red-500'}`} title={isUserOnline(c.user.last_seen) ? 'Online' : 'Offline'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900 truncate">{c.user.name}</span>
                    <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{new Date(c.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span className="block text-xs text-gray-500 truncate">{c.lastMessage.content}</span>
                </div>
                {c.unread === true && <span className="ml-2 w-2 h-2 rounded-full bg-primary block" title="New message" />}
              </div>
            ))}
        </div>
      </aside>
      {/* Chat Window Panel */}
      <main className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-8 py-4 border-b border-gray-200 bg-white min-h-[72px]">
          <button onClick={() => setDrawerOpen(true)} className="focus:outline-none">
            <div className="relative">
              {chatUser && chatUser.avatar_url ? (
                <img src={chatUser.avatar_url} alt={chatUser.name} className="w-12 h-12 rounded-full object-cover bg-primary/10 border border-gray-100" />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10">
                  <span className="text-base font-bold text-primary">{(chatUser?.name || '?').split(' ').map(n => n[0]).join('').toUpperCase()}</span>
                </div>
              )}
              <span className={`absolute bottom-0 right-0 block w-3 h-3 rounded-full border-2 border-white ${isUserOnline(chatUser?.last_seen) ? 'bg-green-500' : 'bg-red-500'}`} title={isUserOnline(chatUser?.last_seen) ? 'Online' : 'Offline'} />
            </div>
          </button>
          <span className="font-semibold text-gray-900 text-base">{chatUser?.name || 'Select a chat'}</span>
        </div>
        {/* Chat messages area */}
        {(isBlocked || isBlockedBy) ? (
          <div className="flex-1 flex items-center justify-center text-red-500 font-semibold bg-gray-50">
            {isBlockedBy
              ? 'You cannot send or receive messages from this user.'
              : 'You have blocked this user. Unblock to resume messaging.'}
          </div>
        ) : (
          <>
            <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-2 bg-gray-50">
              {messages.length > 0 ? (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg mb-2 ${msg.sender_id === user.id ? 'bg-primary text-white self-end' : 'bg-white text-gray-900 self-start border border-gray-100'}`}
                  >
                    <div className="flex flex-col gap-2">
                      {msg.content && (
                        <span>{msg.content}</span>
                      )}
                      {msg.file_url && (
                        <div className="mt-2">
                          {msg.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img src={msg.file_url} alt="attachment" className="max-w-xs max-h-48 rounded border" />
                          ) : msg.file_url.match(/\.pdf$/i) ? (
                            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">View PDF</a>
                          ) : (
                            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Download Attachment</a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-center my-auto">No messages yet. Start the conversation!</div>
              )}
              <div ref={messagesEndRef} />
            </div>
            {/* Message Input Area */}
            <form className="flex items-center gap-2 p-4 border-t border-gray-200 bg-white relative flex-col" onSubmit={handleSendMessage}>
              <div className="w-full flex items-center gap-2">
                <div className="relative">
                  <button type="button" className="p-2 rounded-full hover:bg-primary/10 transition" onClick={() => setShowEmoji(v => !v)} disabled={isBlocked || isBlockedBy}>
                    <FaceSmileIcon className="h-6 w-6 text-gray-500" />
                  </button>
                  {showEmoji && !isBlocked && !isBlockedBy && (
                    <div className="absolute bottom-12 left-0 z-50">
                      <EmojiPicker onEmojiClick={handleEmojiClick} theme="light" height={350} width={300} />
                    </div>
                  )}
                </div>
                <button type="button" className="p-2 rounded-full hover:bg-primary/10 transition" onClick={handleAttachClick} disabled={isBlocked || isBlockedBy}>
                  <PaperClipIcon className="h-6 w-6 text-gray-500" />
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isBlocked || isBlockedBy}
                  />
                </button>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring focus:border-primary text-base bg-gray-50"
                  disabled={isBlocked || isBlockedBy}
                />
                <button type="submit" className="p-2 rounded-full bg-primary hover:bg-primary/80 transition flex items-center justify-center" disabled={isBlocked || isBlockedBy}>
                  <PaperAirplaneIconSolid className="h-6 w-6 text-white" />
                </button>
              </div>
              {file && !isBlocked && !isBlockedBy && (
                <div className="w-full flex items-center gap-2 mb-2">
                  {file.type.startsWith('image/') ? (
                    <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded border" />
                  ) : file.type === 'application/pdf' ? (
                    <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded border min-h-10 text-xs">
                      <span className="text-gray-700 truncate">PDF: {file.name}</span>
                      <a href={filePreview} target="_blank" rel="noopener noreferrer" className="text-primary underline">Preview</a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded border min-h-10 text-xs">
                      <span className="text-gray-700 truncate">{file.name}</span>
                    </div>
                  )}
                  <button type="button" className="ml-2 p-1 rounded-full bg-gray-200 hover:bg-gray-300" onClick={() => { setFile(null); setFilePreview(null); }}>
                    <XMarkIcon className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              )}
            </form>
          </>
        )}
      </main>
      {/* User Drawer */}
      {drawerOpen && chatUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-xs bg-white h-full shadow-lg flex flex-col p-6 animate-slide-in-right">
            <button className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100" onClick={() => setDrawerOpen(false)} aria-label="Close">✕</button>
            <div className="flex flex-col items-center mt-6 mb-4">
              {chatUser && chatUser.avatar_url ? (
                <img src={chatUser.avatar_url} alt={chatUser.name} className="w-20 h-20 rounded-full object-cover bg-primary/10 border border-gray-100 mb-2" />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-primary/10 mb-2">
                  <span className="text-2xl font-bold text-primary">{(chatUser?.name || '?').split(' ').map(n => n[0]).join('').toUpperCase()}</span>
                </div>
              )}
              <div className="font-semibold text-gray-900 text-lg">{chatUser.name}</div>
              {chatUser.username && <div className="text-xs text-gray-500">@{chatUser.username}</div>}
            </div>
            <div className="flex flex-col gap-3 mt-4">
              {isBlocked ? (
                <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors" onClick={async () => { await unblockUser(chatUser.id); setIsBlocked(false); }}>
                  Unblock User
                </button>
              ) : (
                <button className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-200 transition-colors" onClick={async () => { await blockUser(chatUser.id); setIsBlocked(true); }}>
                  Block User
                </button>
              )}
              <button
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete the entire conversation with this user? This action cannot be undone.')) {
                    await deleteAllMessagesWithUser(chatUser.id);
                    // Refetch messages to ensure UI is in sync
                    if (user && chatUser) {
                      const { data, error } = await fetchMessages(user.id, chatUser.id);
                      setMessages(data || []);
                    } else {
                      setMessages([]);
                    }
                  }
                }}
              >
                Delete All Messages
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat; 
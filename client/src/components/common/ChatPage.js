import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Send, Phone, Video, MoreVertical, X, UserPlus, MessageCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { conversationsAPI } from '../../services/api';

export default function ChatPage() {
  const { user } = useAuth();
  console.log('User from auth:', user);
  const [conversations, setConversations] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessages, setCurrentMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pollInterval, setPollInterval] = useState(null);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      fetchConversations();
      const interval = setInterval(fetchConversations, 3000);
      setPollInterval(interval);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && showAllUsers) {
      if (userSearchTerm) {
        const timer = setTimeout(() => {
          fetchAvailableUsers(userSearchTerm);
        }, 300);
        return () => clearTimeout(timer);
      } else {
        fetchAvailableUsers('');
      }
    }
  }, [userSearchTerm, user?.id, showAllUsers]);

  useEffect(() => {
    if (selectedChat?.id && user?.id) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedChat?.id, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  const fetchConversations = async () => {
    try {
      const data = await conversationsAPI.getByUserId(user?.id);
      setConversations(data);
      if (data.length > 0 && !selectedChat) {
        setSelectedChat(data[0]);
      }
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedChat?.id || !user?.id) return;
    try {
      const data = await conversationsAPI.getMessagesByUserId(user?.id, selectedChat?.id);
      setCurrentMessages(data);
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
    }
  };

  const fetchAvailableUsers = async (searchQuery = '') => {
    const userId = user?.id;
    console.log('fetchAvailableUsers - userId:', userId, 'searchQuery:', searchQuery);

    if (!userId) {
      console.warn('User ID not available');
      setAvailableUsers([]);
      return;
    }

    try {
      const data = await conversationsAPI.getAvailableUsers(userId, searchQuery);
      console.log('Fetched users:', data);
      setAvailableUsers(data);
    } catch (error) {
      console.error('❌ Error fetching available users:', error);
      setAvailableUsers([]);
    }
  };

  const filteredChats = conversations.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = availableUsers.filter(u =>
    u.name.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const handleStartConversation = (user) => {
    setSelectedChat({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      status: user.status || 'Active',
      statusDot: 'bg-green-500'
    });
    setShowAllUsers(false);
    setUserSearchTerm('');
  };

  const currentChat = selectedChat;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat?.id || !user?.id) return;

    try {
      await conversationsAPI.sendMessage({
        sender_id: user?.id,
        receiver_id: selectedChat?.id,
        message_text: messageInput,
      });

      setMessageInput('');
      setIsTyping(false);

      await fetchMessages();
    } catch (error) {
      console.error('❌ Error sending message:', error);
      alert('Failed to send message');
    }
  };

  return (
    <div className="flex w-full h-[calc(100vh-80px)] bg-white">
      {/* LEFT SIDE LIST */}
      <div className="w-1/3 border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl  text-gray-900">Chat</h1>
            <button
              onClick={() => {
                setShowAllUsers(!showAllUsers);
                setUserSearchTerm('');
              }}
              className="p-2 hover:bg-gray-100 rounded  transition-colors text-gray-600 hover:text-red-500"
              title="Start new conversation"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#1F2020]" />
            <input
              type="text"
              placeholder={showAllUsers ? "Search users..." : "Search conversations..."}
              value={showAllUsers ? userSearchTerm : searchTerm}
              onChange={(e) => showAllUsers ? setUserSearchTerm(e.target.value) : setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white text-xs  text-gray-700 placeholder-gray-400 transition-all"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {showAllUsers ? (
            filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleStartConversation(u)}
                  className="border-b p-2 hover:bg-gray-50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs   text-gray-800">{u.name}</h3>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    </div>
                    <MessageCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-2 text-center text-gray-500">
                No users found
              </div>
            )
          ) : filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`border-b p-2 hover:bg-gray-50 cursor-pointer transition-all ${selectedChat?.id === chat.id ? 'bg-red-50' : ''
                  }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar with status */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs   text-gray-800">{chat.name}</h3>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{chat.timestamp}</span>
                    </div>
                    <p className="text-xs  text-gray-500 truncate">{chat.lastMessage}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-2 text-center text-gray-500">
              <p className="mb-3">No conversations yet</p>
              <button
                onClick={() => setShowAllUsers(true)}
                className="text-red  hover:text-red-700 text-xs   flex items-center justify-center gap-2 mx-auto"
              >
                <UserPlus className="w-4 h-4" />
                Start a conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE CHAT WINDOW */}
      <div className="w-2/3 flex flex-col bg-white">
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between bg-whitep-3   border-b border-gray-200">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={currentChat.avatar}
                    alt={currentChat.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${currentChat.statusDot} rounded-full border-2 border-white`} />
                </div>

                {/* User Info */}
                <div>
                  <h2 className="text-xs   text-gray-900">{currentChat.name}</h2>
                  <p className="text-xs text-gray-500 capitalize">{currentChat.status}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button className="p-2  hover:bg-gray-50 rounded  transition-colors text-gray-600 hover:text-red-500">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2  hover:bg-gray-50 rounded  transition-colors text-gray-600 hover:text-red-500">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2  hover:bg-gray-50 rounded  transition-colors text-gray-600 hover:text-red-500">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-autop-3  space-y-4 bg-white">
              {currentMessages.length > 0 ? (
                currentMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender === 'other' ? (
                      <div className="flex items-start gap-3">
                        <img src={currentChat.avatar} className="w-10 h-10 rounded-full" alt="user" />
                        <div className="p-2 bg-gray-100 rounded-2xl max-w-[70%]">
                          <p className="text-gray-700">{msg.text}</p>
                          <span className="text-xs text-[#1F2020] block mt-1">{msg.timestamp}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <div className="p-2 bg-red-500 text-white rounded-2xl max-w-[70%]">
                          <p>{msg.text}</p>
                          <div className="text-xs text-red-100 text-right mt-1">{msg.timestamp}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No messages yet. Start the conversation!</p>
                </div>
              )}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-3">
                    <img src={currentChat?.avatar} className="w-10 h-10 rounded-full" alt="user" />
                    <div className="p-2 bg-gray-100 rounded-2xl">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <div className="border-t p-2 flex items-center gap-2 bg-white">
              <input
                type="text"
                placeholder="Type Your Message"
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  setIsTyping(e.target.value.length > 0);
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 border rounded p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-200 outline-none"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                className={`bg-red-500 p-3 rounded text-white transition-all ${messageInput.trim() ? 'hover:bg-red-600 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-[#1F2020]" />
              </div>
              <h3 className="text-md  text-gray-900 mb-1">No chat selected</h3>
              <p className="text-xs  text-gray-500">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

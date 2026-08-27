import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Search, Send, Phone, Video, MoreHorizontal, X, Plus, Filter,
  Star, Paperclip, Smile, AtSign, Hash, Calendar, FileText,
  ThumbsUp, Download, ChevronRight, Bell, Users, Settings,
  Mic, Image, Link, Check, CheckCheck, Pin, Edit3, LogOut, Trash2, ArrowLeft,
  Reply, CornerUpLeft, Edit2, ShieldAlert, UserPlus, ChevronDown, Copy, MoreVertical
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Swal from 'sweetalert2';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const formatMessageTime = (timeStr) => {
  if (!timeStr) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  const str = String(timeStr).trim();

  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(str)) {
    return str;
  }

  try {
    let isoStr = str;
    if (!isoStr.includes('T') && isoStr.includes(' ')) {
      isoStr = isoStr.replace(' ', 'T') + 'Z';
    } else if (isoStr.includes('T') && !isoStr.endsWith('Z') && !isoStr.includes('+')) {
      isoStr = isoStr + 'Z';
    }

    const dateObj = new Date(isoStr);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  } catch (e) {}

  return str;
};

const WhatsAppTicks = ({ status = 'read', isMine = true }) => {
  if (!isMine) return null;

  if (status === 'sent' || status === 'sending') {
    return <Check size={13} className="text-gray-400 shrink-0 inline-block ml-1" />;
  }

  if (status === 'delivered') {
    return <CheckCheck size={14} className="text-gray-400 shrink-0 inline-block ml-1" />;
  }

  // Double Blue Tick ✓✓ (#34b7f1)
  return <CheckCheck size={14} className="text-[#34b7f1] shrink-0 inline-block ml-1 font-bold" />;
};

export default function ITChatPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.id || 1;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '🔥', '🎉', '❤️', '🤔', '🙌', '😢', '👏', '👀', '💯', '✨'];
  const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('Messages');
  const [showDetails, setShowDetails] = useState(true);
  const messagesEndRef = useRef(null);

  // WhatsApp Reaction & Context Menu States
  const [activeHoverMessageId, setActiveHoverMessageId] = useState(null);
  const [activeReactionPopoverId, setActiveReactionPopoverId] = useState(null);
  const [activeContextMenuId, setActiveContextMenuId] = useState(null);
  const [showTopHeaderMenu, setShowTopHeaderMenu] = useState(false);

  // Messaging States
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Group Creation States
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);

  const [tasksState, setTasksState] = useState({});
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1 && lastAtIndex >= textBeforeCursor.search(/\s[^\s]*$/)) {
      const query = textBeforeCursor.slice(lastAtIndex + 1);
      setMentionSearchTerm(query);
      setShowMentionSuggestions(true);
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) setAttachedFile(file);
      }
    }
  };

  const handleSelectMentionUser = (userName) => {
    const cursorPosition = document.getElementById('chat-input')?.selectionStart || input.length;
    const textBeforeCursor = input.slice(0, cursorPosition);
    const textAfterCursor = input.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const newText = textBeforeCursor.slice(0, lastAtIndex) + `@${userName} ` + textAfterCursor;
      setInput(newText);
    } else {
      setInput(prev => prev + `@${userName} `);
    }

    setShowMentionSuggestions(false);
    document.getElementById('chat-input')?.focus();
  };

  const filteredMentionUsers = availableUsers.filter(u => {
    const name = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return name.toLowerCase().includes(mentionSearchTerm.toLowerCase());
  });

  const getChatTasks = () => {
    if (!selectedChat) return [];
    return tasksState[selectedChat.id] || [
      { id: 1, title: 'Review project requirements document', completed: true, assignee: 'Purvesh' },
      { id: 2, title: 'Setup GitHub repository & branch rules', completed: false, assignee: 'Ashwini' },
      { id: 3, title: 'Verify database migration scripts', completed: false, assignee: 'You' }
    ];
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !selectedChat) return;
    const chatId = selectedChat.id;
    const currentTasks = getChatTasks();
    const newTask = {
      id: Date.now(),
      title: newTaskTitle.trim(),
      completed: false,
      assignee: 'You'
    };
    setTasksState(prev => ({
      ...prev,
      [chatId]: [...currentTasks, newTask]
    }));
    setNewTaskTitle('');
  };

  const handleToggleTask = (taskId) => {
    if (!selectedChat) return;
    const chatId = selectedChat.id;
    const currentTasks = getChatTasks();
    setTasksState(prev => ({
      ...prev,
      [chatId]: currentTasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
    }));
  };

  const handleDeleteTask = (taskId) => {
    if (!selectedChat) return;
    const chatId = selectedChat.id;
    const currentTasks = getChatTasks();
    setTasksState(prev => ({
      ...prev,
      [chatId]: currentTasks.filter(t => t.id !== taskId)
    }));
  };

  const FILTER_TABS = ['All', 'Unread', 'Direct', 'Groups'];
  const TABS = ['Messages', 'Files', 'Links', 'Tasks'];

  const FILE_ICONS = {
    'pdf': <FileText size={22} className="text-red-500" />,
    'zip': <FileText size={22} className="text-blue-500" />,
    'png': <Image size={22} className="text-green-500" />
  };

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/conversations/${currentUserId}`);
      setConversations(res.data);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/available-users/${currentUserId}`);
      setAvailableUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
      fetchAvailableUsers();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const sendHeartbeat = async () => {
      try {
        await axios.post(`${API_BASE_URL}/users/${currentUserId}/heartbeat`);
      } catch (e) {}
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 15000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  const getUserOnlineStatus = (chat) => {
    if (!chat || chat.chat_type === 'group') return null;

    if (!chat.last_seen) {
      return { isOnline: true, text: 'online' };
    }

    try {
      const lastSeenDate = new Date(String(chat.last_seen).includes('T') ? chat.last_seen : String(chat.last_seen).replace(/-/g, '/'));
      const diffSecs = (Date.now() - lastSeenDate.getTime()) / 1000;

      if (diffSecs <= 90) {
        return { isOnline: true, text: 'online' };
      }

      const isToday = lastSeenDate.toDateString() === new Date().toDateString();
      const timeStr = lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

      if (isToday) {
        return { isOnline: false, text: `last seen today at ${timeStr}` };
      }
      return { isOnline: false, text: `last seen ${lastSeenDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}` };
    } catch (e) {
      return { isOnline: true, text: 'online' };
    }
  };

  const fetchMessages = async (chat) => {
    try {
      const isGroup = chat.chat_type === 'group';
      const endpoint = isGroup
        ? `${API_BASE_URL}/messages/${currentUserId}?groupId=${chat.id}`
        : `${API_BASE_URL}/messages/${currentUserId}?conversationWith=${chat.other_user_id}`;
      const res = await axios.get(endpoint);
      setMessages(res.data);

      if (isGroup) {
        const membersRes = await axios.get(`${API_BASE_URL}/chat-groups/${chat.id}/members`);
        setGroupMembers(membersRes.data);
      } else {
        setGroupMembers([]);
      }
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat);
      const interval = setInterval(() => fetchMessages(selectedChat), 4000);
      return () => clearInterval(interval);
    }
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectChat = (chat) => {
    setConversations(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0, unread_count: 0 } : c));
    setSelectedChat({ ...chat, unread: 0, unread_count: 0 });
    setActiveTab('Messages');
    setReplyingToMessage(null);
    setEditingMessageId(null);
    setActiveReactionPopoverId(null);
    setActiveContextMenuId(null);
  };

  const handleIconClick = (action) => {
    if (action === 'smile') setShowEmojiPicker(!showEmojiPicker);
    if (action === 'paperclip') fileInputRef.current?.click();
    if (action === 'image') imageInputRef.current?.click();
    if (action === 'atsign') {
      setInput(prev => prev + '@');
      setShowMentionSuggestions(true);
      setMentionSearchTerm('');
      setTimeout(() => document.getElementById('chat-input')?.focus(), 50);
    }
    if (action === 'hash') { setInput(prev => prev + '#'); document.getElementById('chat-input')?.focus(); }
    if (action === 'calendar') { setInput(prev => prev + '📅 [Schedule a meeting] '); document.getElementById('chat-input')?.focus(); }
    if (action === 'mic') { setInput(prev => prev + '🎤 [Voice note] '); document.getElementById('chat-input')?.focus(); }
    if (action === 'plus') { setInput(prev => prev + '➕ '); document.getElementById('chat-input')?.focus(); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setAttachedFile(file);
    e.target.value = null;
  };

  const handleSend = async () => {
    if (!input.trim() && !attachedFile) return;
    if (!selectedChat) return;

    try {
      const isGroup = selectedChat.chat_type === 'group';
      const rawRecId = selectedChat.other_user_id || selectedChat.receiver_id || (!isGroup ? selectedChat.id : null);
      const targetReceiverId = rawRecId ? String(rawRecId).replace(/\D/g, '') : null;
      const targetGroupId = isGroup ? String(selectedChat.id).replace(/\D/g, '') : null;

      let res;
      if (attachedFile) {
        const formData = new FormData();
        formData.append('sender_id', currentUserId);
        if (targetGroupId) formData.append('group_id', targetGroupId);
        if (targetReceiverId) formData.append('receiver_id', targetReceiverId);
        formData.append('message_text', input.trim());
        formData.append('file', attachedFile);
        if (replyingToMessage) {
          formData.append('reply_to_id', replyingToMessage.id);
          formData.append('reply_to_text', replyingToMessage.text);
          formData.append('reply_to_sender', replyingToMessage.sender === 'user' ? 'You' : `${replyingToMessage.first_name || ''} ${replyingToMessage.last_name || ''}`.trim());
        }

        res = await axios.post(`${API_BASE_URL}/messages`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        const payload = {
          sender_id: currentUserId,
          receiver_id: targetReceiverId ? parseInt(targetReceiverId, 10) : null,
          group_id: targetGroupId ? parseInt(targetGroupId, 10) : null,
          message_text: input.trim(),
          reply_to_id: replyingToMessage ? replyingToMessage.id : null,
          reply_to_text: replyingToMessage ? replyingToMessage.text : null,
          reply_to_sender: replyingToMessage ? (replyingToMessage.sender === 'user' ? 'You' : `${replyingToMessage.first_name || ''} ${replyingToMessage.last_name || ''}`.trim()) : null
        };

        res = await axios.post(`${API_BASE_URL}/messages`, payload);
      }

      const newMsg = {
        id: res.data?.id || res.data?.messageId || Date.now(),
        sender: 'user',
        first_name: user?.first_name || 'You',
        last_name: user?.last_name || '',
        sender_avatar: user?.avatar,
        text: input.trim(),
        timestamp: formatMessageTime(),
        status: 'read',
        is_read: true,
        reply_to_id: replyingToMessage ? replyingToMessage.id : null,
        reply_to_text: replyingToMessage ? replyingToMessage.text : null,
        reply_to_sender: replyingToMessage ? (replyingToMessage.sender === 'user' ? 'You' : `${replyingToMessage.first_name || ''} ${replyingToMessage.last_name || ''}`.trim()) : null,
        file: attachedFile ? {
          name: attachedFile.name,
          size: `${(attachedFile.size / 1024).toFixed(1)} KB`,
          icon: attachedFile.name.split('.').pop().toLowerCase()
        } : null
      };

      setMessages(prev => [...prev, newMsg]);
      setInput('');
      setAttachedFile(null);
      setReplyingToMessage(null);
      setShowEmojiPicker(false);
      setShowMentionSuggestions(false);
      fetchConversations();
    } catch (err) {
      console.error('Failed to send message', err);
      Swal.fire({ icon: 'error', title: 'Send Error', text: err?.response?.data?.error || 'Could not send message' });
    }
  };

  // WhatsApp Reaction Handler
  const handleAddReaction = async (messageId, emoji) => {
    try {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          let reactionsObj = {};
          try {
            reactionsObj = typeof m.reactions === 'string' ? JSON.parse(m.reactions || '{}') : (m.reactions || {});
          } catch (e) { reactionsObj = {}; }
          reactionsObj[emoji] = (reactionsObj[emoji] || 0) + 1;
          return { ...m, reactions: reactionsObj };
        }
        return m;
      }));
      setActiveReactionPopoverId(null);
      await axios.post(`${API_BASE_URL}/messages/${messageId}/reactions`, { emoji, userId: currentUserId });
    } catch (err) {
      console.error('Failed to react', err);
    }
  };

  const handleSaveEdit = async (messageId) => {
    if (!editingText.trim()) return;
    try {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: editingText.trim(), is_edited: 1 } : m));
      setEditingMessageId(null);
      setEditingText('');
      await axios.put(`${API_BASE_URL}/messages/${messageId}`, { message_text: editingText.trim() });
    } catch (err) {
      console.error('Failed to edit message', err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: 1, text: 'This message was deleted' } : m));
      setActiveContextMenuId(null);
      await axios.delete(`${API_BASE_URL}/messages/${messageId}`);
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Group Name Required', text: 'Please enter a name for the group.' });
      return;
    }
    try {
      const res = await axios.post(`${API_BASE_URL}/chat-groups`, {
        name: newTeamName.trim(),
        description: newTeamDesc.trim(),
        created_by: currentUserId,
        members: selectedUserIds
      });
      setIsCreateTeamOpen(false);
      setNewTeamName('');
      setNewTeamDesc('');
      setSelectedUserIds([]);
      await fetchConversations();

      const newGroupObj = {
        id: res.data.id,
        name: res.data.name,
        chat_type: 'group',
        unread_count: 0
      };
      setSelectedChat(newGroupObj);
      Swal.fire({ icon: 'success', title: 'Group Created!', text: `Team Group "${res.data.name}" created successfully!` });
    } catch (err) {
      console.error('Failed to create team', err);
      Swal.fire({ icon: 'error', title: 'Create Group Failed', text: err?.response?.data?.error || 'Could not create group' });
    }
  };

  const handleAddMembers = async () => {
    if (!selectedChat || selectedUserIds.length === 0) return;
    try {
      await axios.post(`${API_BASE_URL}/chat-groups/${selectedChat.id}/members`, {
        members: selectedUserIds
      });
      setIsAddMemberOpen(false);
      setSelectedUserIds([]);
      fetchMessages(selectedChat);
      Swal.fire({ icon: 'success', title: 'Members Added', text: 'Selected members added to group!' });
    } catch (err) {
      console.error('Failed to add members', err);
      Swal.fire({ icon: 'error', title: 'Error', text: err?.response?.data?.error || 'Failed to add members' });
    }
  };

  const isEmployeeSearch = searchTerm.trim().toLowerCase().startsWith('emp-') || searchTerm.trim().toLowerCase().startsWith('employee');

  const filteredChats = conversations.filter(chat => {
    const matchesSearch = (chat.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch && !isEmployeeSearch) return false;

    if (activeFilter === 'Unread') return Number(chat.unread_count || chat.unread || 0) > 0;
    if (activeFilter === 'Direct') return chat.chat_type === 'private';
    if (activeFilter === 'Groups') return chat.chat_type === 'group';
    return true;
  });

  const pinned = filteredChats.filter(c => c.pinned);
  const recent = filteredChats.filter(c => !c.pinned);

  const directoryUsers = searchTerm.trim()
    ? availableUsers.filter(u =>
      (isEmployeeSearch || (u.name || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
      !recent.some(c => c.other_user_id === u.id) &&
      !pinned.some(c => c.other_user_id === u.id)
    ).map(u => ({
      id: `dummy-${u.id}`,
      chat_type: 'private',
      other_user_id: u.id,
      name: u.name || '',
      avatar: u.avatar || '',
      status: u.status || 'Active',
      lastMessage: 'Start a new conversation'
    }))
    : [];

  const groupInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'GR';

  const filteredActiveMessages = messages.filter(m => {
    if (!chatSearchQuery.trim()) return true;
    return (m.text || '').toLowerCase().includes(chatSearchQuery.toLowerCase());
  });

  const renderMessage = (msg, idx) => {
    const isMine = msg.sender === 'user';
    const senderName = isMine ? 'You' : `${msg.first_name || ''} ${msg.last_name || ''}`.trim();
    const avatarUrl = msg.sender_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`;
    const isDeleted = msg.is_deleted === 1 || msg.is_deleted === true;

    let parsedReactions = {};
    try {
      parsedReactions = typeof msg.reactions === 'string' ? JSON.parse(msg.reactions || '{}') : (msg.reactions || {});
    } catch (e) { parsedReactions = {}; }

    const file = msg.file || (msg.file_name ? {
      name: msg.file_name,
      size: msg.file_size ? `${(msg.file_size / 1024).toFixed(1)} KB` : '0 KB',
      icon: (msg.file_type || 'pdf').toLowerCase(),
      path: msg.file_path
    } : null);

    const backendUrl = API_BASE_URL.replace('/api', '');
    const fileUrl = file ? (file.path ? `${backendUrl}${file.path}` : `${backendUrl}/uploads/${file.name}`) : '';

    return (
      <React.Fragment key={msg.id || idx}>
        {msg.date && (
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className={`text-xs px-3 py-1 rounded-full ${msg.date === 'New Messages' ? 'bg-red-50 text-red-500 font-semibold' : 'bg-gray-100 text-gray-500'}`}>{msg.date}</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
        )}
        <div
          onMouseEnter={() => setActiveHoverMessageId(msg.id)}
          onMouseLeave={() => {
            setActiveHoverMessageId(null);
          }}
          className={`flex gap-2.5 px-5 py-1.5 group relative ${isMine ? 'flex-row-reverse' : ''}`}
        >
          {!isMine && <Avatar name={senderName} src={avatarUrl} size={32} />}

          <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col relative`}>
            {!isMine && selectedChat?.chat_type === 'group' && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-semibold text-[#25d366]">{senderName}</span>
                <span className="text-[10px] text-gray-400 font-medium">{formatMessageTime(msg.timestamp || msg.created_at)}</span>
              </div>
            )}

            {/* Quoted Reply Block (WhatsApp Style) */}
            {msg.reply_to_text && !isDeleted && (
              <div className={`mb-1 p-2 rounded-lg border-l-4 text-xs ${isMine ? 'bg-[#c5eabf] border-[#25d366] text-gray-900 self-end' : 'bg-gray-100 border-purple-600 text-gray-900 self-start'} max-w-full shadow-2xs`}>
                <div className="flex items-center gap-1 font-bold text-[11px] text-[#075e54] mb-0.5">
                  <CornerUpLeft size={10} />
                  <span>{msg.reply_to_sender || 'Replied Message'}</span>
                </div>
                <div className="truncate text-[11px] text-gray-700 italic opacity-90">{msg.reply_to_text}</div>
              </div>
            )}

            {/* Message Body / Inline Edit Mode */}
            {editingMessageId === msg.id ? (
              <div className="flex gap-2 items-center bg-white p-2 border border-blue-400 rounded-xl shadow-md w-full">
                <input
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(msg.id)}
                  className="flex-1 text-xs outline-none px-2 py-1 bg-gray-50 border border-gray-200 rounded"
                />
                <button onClick={() => handleSaveEdit(msg.id)} className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 cursor-pointer">
                  Save
                </button>
                <button onClick={() => setEditingMessageId(null)} className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded text-xs cursor-pointer">
                  Cancel
                </button>
              </div>
            ) : (
              msg.text && (
                <div className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap flex flex-col relative
                  ${isDeleted ? 'bg-gray-100 text-gray-400 italic border border-gray-200' : isMine ? 'bg-[#d9fdd3] text-gray-900 border border-[#bceab4] rounded-tr-xs self-end shadow-2xs' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-xs self-start shadow-2xs'}`}>
                  {isDeleted ? (
                    <div className="flex items-center gap-1 text-gray-400">
                      <ShieldAlert size={12} /> <span>This message was deleted</span>
                    </div>
                  ) : (
                    <div>{msg.text}</div>
                  )}

                  <div className="flex items-center gap-1 justify-end mt-1 text-[10px] text-gray-500 font-medium select-none">
                    {msg.is_edited ? <span className="italic mr-1 text-gray-400">(edited)</span> : null}
                    <span>{formatMessageTime(msg.timestamp || msg.created_at)}</span>
                    <WhatsAppTicks status={msg.status || (msg.is_read ? 'read' : 'delivered')} isMine={isMine} />
                  </div>

                  {/* Reaction Badges below message */}
                  {Object.keys(parsedReactions).length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {Object.entries(parsedReactions).map(([emoji, count]) => (
                        <span key={emoji} className="bg-white border border-gray-200 rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-xs flex items-center gap-0.5">
                          <span>{emoji}</span>
                          <span className="text-gray-600">{count}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}

            {file && !isDeleted && (
              <div className="mt-1 flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 bg-white shadow-2xs">
                {FILE_ICONS[file.icon] || <FileText size={22} className="text-gray-400" />}
                <div>
                  <p className="text-[12px] text-gray-800 font-medium">{file.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{file.size}</p>
                </div>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="ml-3 text-gray-400 hover:text-blue-600 transition-colors p-1"
                >
                  <Download size={15} />
                </a>
              </div>
            )}
          </div>

          {/* WhatsApp Hover Actions Bar (Smiley & Dropdown Arrow right beside message bubble) */}
          {activeHoverMessageId === msg.id && !isDeleted && (
            <div className={`flex items-center gap-1 self-center ${isMine ? 'mr-1 flex-row-reverse' : 'ml-1'} relative`}>
              {/* Smiley Icon to trigger WhatsApp Reaction Bar */}
              <button
                onClick={() => {
                  setActiveReactionPopoverId(prev => prev === msg.id ? null : msg.id);
                  setActiveContextMenuId(null);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/90 hover:bg-gray-100 text-gray-600 shadow-md border border-gray-200 transition-transform cursor-pointer hover:scale-110"
                title="React to message"
              >
                <Smile size={15} />
              </button>

              {/* Chevron Dropdown Arrow to trigger Context Menu */}
              <button
                onClick={() => {
                  setActiveContextMenuId(prev => prev === msg.id ? null : msg.id);
                  setActiveReactionPopoverId(null);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/90 hover:bg-gray-100 text-gray-600 shadow-md border border-gray-200 transition-transform cursor-pointer hover:scale-110"
                title="Message options"
              >
                <ChevronDown size={15} />
              </button>

              {/* WhatsApp Floating Reaction Bar (Pill Shape) */}
              {activeReactionPopoverId === msg.id && (
                <div className={`absolute bottom-full mb-2 ${isMine ? 'right-0' : 'left-0'} z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-full shadow-2xl px-3 py-1.5 flex items-center gap-2 animate-scaleIn`}>
                  {QUICK_REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleAddReaction(msg.id, emoji)}
                      className="hover:scale-135 transition-transform text-lg cursor-pointer p-0.5"
                      title={`React ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <div className="w-px h-4 bg-gray-300 dark:bg-slate-700 mx-0.5" />
                  <button
                    onClick={() => {
                      setShowEmojiPicker(true);
                      setActiveReactionPopoverId(null);
                    }}
                    className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs cursor-pointer"
                    title="More emojis"
                  >
                    +
                  </button>
                </div>
              )}

              {/* WhatsApp Context Menu Dropdown */}
              {activeContextMenuId === msg.id && (
                <div className={`absolute top-full mt-1 ${isMine ? 'right-0' : 'left-0'} z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 w-44 text-xs font-medium text-gray-700 divide-y divide-gray-100 animate-fadeIn`}>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setReplyingToMessage(msg);
                        setActiveContextMenuId(null);
                        document.getElementById('chat-input')?.focus();
                      }}
                      className="w-full text-left px-3.5 py-1.5 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Reply size={14} className="text-gray-500" />
                      <span>Reply</span>
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(msg.text || '');
                        setActiveContextMenuId(null);
                        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Copied to clipboard', showConfirmButton: false, timer: 1500 });
                      }}
                      className="w-full text-left px-3.5 py-1.5 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Copy size={14} className="text-gray-500" />
                      <span>Copy Text</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveContextMenuId(null);
                        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Message pinned', showConfirmButton: false, timer: 1500 });
                      }}
                      className="w-full text-left px-3.5 py-1.5 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Pin size={14} className="text-gray-500" />
                      <span>Pin Message</span>
                    </button>
                  </div>

                  {isMine && (
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setEditingMessageId(msg.id);
                          setEditingText(msg.text);
                          setActiveContextMenuId(null);
                        }}
                        className="w-full text-left px-3.5 py-1.5 hover:bg-amber-50 text-amber-700 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Edit2 size={14} />
                        <span>Edit Message</span>
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="w-full text-left px-3.5 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Trash2 size={14} />
                        <span>Delete Message</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </React.Fragment>
    );
  };

  return (
    <div className="flex bg-[#f8fafc] font-sans text-gray-900 overflow-hidden w-full h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Left Panel: Chat List ─────────────────────────────────────────── */}
      <div className="w-[290px] shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
        {/* Header (WhatsApp Desktop Style) */}
        <div className="px-3.5 py-3 border-b border-gray-100 flex items-center justify-between bg-white relative">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/it/it manager/ashwinikhedekar1025/dashboard');
                }
              }}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-700 hover:text-red-600 transition flex items-center gap-1 cursor-pointer font-semibold text-xs bg-gray-50 border border-gray-200 shadow-xs"
              title="Back to Dashboard"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            <h2 className="text-[15px] font-bold text-gray-900">Chats</h2>
          </div>

          <div className="flex items-center gap-0.5">
            {/* Quick Create Group Button */}
            <button
              onClick={() => {
                setSelectedUserIds([]);
                setIsCreateTeamOpen(true);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="Create New Group"
            >
              <Plus size={18} />
            </button>

            {/* Three Dots Menu Button (WhatsApp Style) */}
            <div className="relative">
              <button
                onClick={() => setShowTopHeaderMenu(prev => !prev)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                title="Menu Options"
              >
                <MoreVertical size={18} />
              </button>

              {/* WhatsApp Top Header Dropdown Menu */}
              {showTopHeaderMenu && (
                <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl py-1.5 w-48 text-xs font-medium text-gray-700 divide-y divide-gray-100 animate-fadeIn">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowTopHeaderMenu(false);
                        setSelectedUserIds([]);
                        setIsCreateTeamOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer text-gray-800 font-semibold"
                    >
                      <Users size={15} className="text-blue-600" />
                      <span>New group</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowTopHeaderMenu(false);
                        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Starred messages', showConfirmButton: false, timer: 1500 });
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer text-gray-700"
                    >
                      <Star size={15} className="text-amber-500" />
                      <span>Starred messages</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowTopHeaderMenu(false);
                        setConversations(prev => prev.map(c => ({ ...c, unread: 0, unread_count: 0 })));
                        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'All marked as read', showConfirmButton: false, timer: 1500 });
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer text-gray-700"
                    >
                      <CheckCheck size={15} className="text-emerald-600" />
                      <span>Mark all as read</span>
                    </button>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowTopHeaderMenu(false);
                        if (window.history.length > 1) {
                          navigate(-1);
                        } else {
                          navigate('/it/it manager/ashwinikhedekar1025/dashboard');
                        }
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2.5 cursor-pointer font-medium"
                    >
                      <LogOut size={15} />
                      <span>Back to Dashboard</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-3 pt-3 border-b border-gray-100">
          <div className="flex gap-3">
            {FILTER_TABS.map(f => (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={`p-2 text-xs transition-colors cursor-pointer
                  ${activeFilter === f ? 'text-red-600 border-b-2 border-red-500 font-bold' : 'text-gray-500 hover:text-gray-700'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search chats..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-gray-50 border border-gray-100 rounded text-[12px] focus:outline-none focus:border-blue-300 transition-colors" />
            <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><Filter size={12} /></button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-2">
          {pinned.length > 0 && (
            <>
              <div className="flex items-center justify-between p-2 mb-1">
                <span className="text-xs text-amber-500 tracking-wider flex items-center gap-1 font-semibold"><Pin size={10} /> Pinned</span>
                <button className="text-gray-400 hover:text-gray-600"><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6" /></svg></button>
              </div>
              {pinned.map(chat => <ChatItem key={chat.id} chat={chat} selected={selectedChat?.id === chat.id} onSelect={handleSelectChat} groupInitials={groupInitials} />)}
            </>
          )}
          {recent.length > 0 && (
            <>
              <div className="flex items-center justify-between p-2 mb-1 mt-2">
                <span className="text-xs text-gray-400 tracking-wider font-semibold">Recent</span>
                <button className="text-gray-400 hover:text-gray-600"><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6" /></svg></button>
              </div>
              {recent.map(chat => <ChatItem key={chat.id} chat={chat} selected={selectedChat?.id === chat.id} onSelect={handleSelectChat} groupInitials={groupInitials} />)}
            </>
          )}
          {directoryUsers.length > 0 && (
            <>
              <div className="flex items-center justify-between p-2 mb-1 mt-2 border-t border-gray-100 pt-2">
                <span className="text-xs text-blue-500 tracking-wider flex items-center gap-1 font-semibold"><Users size={10} /> Company Directory</span>
              </div>
              {directoryUsers.map(chat => <ChatItem key={chat.id} chat={chat} selected={selectedChat?.id === chat.id} onSelect={handleSelectChat} groupInitials={groupInitials} />)}
            </>
          )}
        </div>

        {/* Bottom status */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600 font-medium">Online</span>
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <button className="hover:text-gray-600 transition-colors cursor-pointer"><Settings size={14} /></button>
          </div>
        </div>
      </div>

      {/* ── Middle: Messages ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative bg-[#efeae2]/30">
        {selectedChat && (
          <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                {selectedChat.chat_type === 'group'
                  ? <div className={`w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold`}>{groupInitials(selectedChat.name)}</div>
                  : <Avatar name={selectedChat.name} src={selectedChat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.name)}&background=random`} size={40} />
                }
                {selectedChat.chat_type === 'group' && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-bold text-gray-900">{selectedChat.name}</h3>
                  {selectedChat.chat_type === 'group' && <Star size={13} className="text-amber-400 fill-amber-400" />}
                </div>
                {selectedChat.chat_type === 'group' ? (
                  <p className="text-xs text-gray-400 font-medium">{(groupMembers.length || 0)} members • <span className="hover:text-blue-600 cursor-pointer">Add description</span></p>
                ) : (
                  (() => {
                    const statusObj = getUserOnlineStatus(selectedChat);
                    if (!statusObj) return null;
                    return (
                      <p className={`text-xs font-semibold flex items-center gap-1.5 ${statusObj.isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {statusObj.isOnline && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                        <span>{statusObj.text}</span>
                      </p>
                    );
                  })()
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {showInChatSearch ? (
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs">
                  <Search size={13} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search in chat..."
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    className="bg-transparent outline-none text-xs w-36 text-gray-800"
                  />
                  <button onClick={() => { setShowInChatSearch(false); setChatSearchQuery(''); }} className="text-gray-400 hover:text-gray-600 p-0.5">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <ActionBtn icon={<Search size={15} />} onClick={() => setShowInChatSearch(true)} title="Search messages" />
              )}
              <ActionBtn icon={<Phone size={15} />} />
              <ActionBtn icon={<Video size={15} />} />
              <ActionBtn icon={<MoreHorizontal size={15} />} onClick={() => setShowDetails(d => !d)} />
            </div>
          </div>
        )}

        <div className="sticky top-[64px] bg-white border-b border-gray-100 p-2 flex items-center gap-4 z-10">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`text-xs px-3 py-1.5 rounded transition-colors cursor-pointer ${activeTab === tab ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 relative">
          {activeTab === 'Messages' && (
            filteredActiveMessages.length > 0 ? (
              filteredActiveMessages.map((msg, idx) => renderMessage(msg, idx))
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                {chatSearchQuery ? 'No matching messages found.' : 'No messages yet. Send a message to start conversation.'}
              </div>
            )
          )}

          {activeTab === 'Files' && (
            <div className="p-4 space-y-2">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Shared Files</h4>
              {messages.filter(m => m.file || m.file_name).map((m, i) => (
                <div key={i} className="p-3 bg-white border border-gray-200 rounded-lg flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-blue-500" />
                    <span>{m.file_name || m.file?.name}</span>
                  </div>
                  <span className="text-gray-400">{formatMessageTime(m.timestamp || m.created_at)}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Tasks' && (
            <div className="p-4 space-y-3 font-sans">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-gray-800">Team Tasks & To-Dos</h4>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a new task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                  className="flex-1 p-2 border border-gray-300 rounded text-xs outline-none bg-white focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddTask}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                >
                  Add Task
                </button>
              </div>

              <div className="space-y-2 pt-2">
                {getChatTasks().map(task => (
                  <div key={task.id} className="p-2.5 bg-white border border-gray-200 rounded-lg flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleTask(task.id)}
                        className="rounded text-blue-600 cursor-pointer"
                      />
                      <span className={task.completed ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}>{task.title}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{task.assignee}</span>
                      <button onClick={() => handleDeleteTask(task.id)} className="text-gray-400 hover:text-red-500 cursor-pointer">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-gray-100 relative">

          {/* Replying to Message Banner (WhatsApp/Teams style) */}
          {replyingToMessage && (
            <div className="mb-2 p-2 bg-emerald-50 border-l-4 border-emerald-600 rounded flex items-center justify-between text-xs text-gray-800">
              <div className="min-w-0 pr-2">
                <span className="font-bold text-emerald-800 text-[11px] block flex items-center gap-1">
                  <Reply size={11} /> Replying to {replyingToMessage.sender === 'user' ? 'You' : `${replyingToMessage.first_name || ''}`}
                </span>
                <p className="truncate text-gray-600 text-[11px] italic">{replyingToMessage.text}</p>
              </div>
              <button onClick={() => setReplyingToMessage(null)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}

          {showMentionSuggestions && (
            <div className="absolute bottom-full left-4 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto z-50 w-64 p-1 text-xs">
              <div className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase">Mention Team Member</div>
              {filteredMentionUsers.map(u => {
                const uName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
                return (
                  <div
                    key={u.id}
                    onClick={() => handleSelectMentionUser(uName)}
                    className="p-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2 rounded text-gray-800 font-medium"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                      {uName.substring(0, 2).toUpperCase()}
                    </div>
                    <span>{uName}</span>
                  </div>
                );
              })}
            </div>
          )}

          {showEmojiPicker && (
            <div className="absolute bottom-full left-4 bg-white border border-gray-200 rounded-lg shadow-xl p-2 z-50 flex gap-2 flex-wrap max-w-xs mb-2">
              {EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => setInput(prev => prev + emoji)} className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer">
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {attachedFile && (
            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900">
              <span className="truncate flex items-center gap-1"><Paperclip size={13} /> {attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="text-blue-700 hover:text-red-500 p-0.5"><X size={14} /></button>
            </div>
          )}

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-400 focus-within:bg-white transition-all">
            <input
              id="chat-input"
              type="text"
              placeholder="Type a message... (Paste screenshot or use @ to mention)"
              value={input}
              onChange={handleInputChange}
              onPaste={handlePaste}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              className="w-full text-xs outline-none bg-transparent text-gray-800 placeholder-gray-400"
            />
            <div className="flex items-center gap-1.5 text-gray-400">
              <button onClick={() => handleIconClick('smile')} className="hover:text-gray-600 cursor-pointer p-1"><Smile size={16} /></button>
              <button onClick={() => handleIconClick('paperclip')} className="hover:text-gray-600 cursor-pointer p-1"><Paperclip size={16} /></button>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
              <button onClick={handleSend} className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition cursor-pointer shadow-xs ml-1">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Details ─────────────────────────────────────────── */}
      {showDetails && selectedChat && (
        <div className="w-[280px] shrink-0 bg-white border-l border-gray-100 p-4 overflow-y-auto space-y-4 text-xs font-sans">
          <div className="flex justify-between items-center border-b pb-3">
            <span className="font-bold text-gray-800 text-sm">Details</span>
            <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
          </div>

          <div className="text-center space-y-2 py-2">
            <Avatar name={selectedChat.name} src={selectedChat.avatar} size={64} color="bg-blue-500" />
            <h3 className="font-bold text-gray-900 text-sm">{selectedChat.name}</h3>
            {selectedChat.chat_type === 'group' ? (
              <p className="text-gray-400 text-[11px] font-medium">{(groupMembers.length || 0)} Members</p>
            ) : (
              (() => {
                const statusObj = getUserOnlineStatus(selectedChat);
                if (!statusObj) return null;
                return (
                  <p className={`text-[11px] font-semibold flex items-center justify-center gap-1 ${statusObj.isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {statusObj.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                    <span>{statusObj.text}</span>
                  </p>
                );
              })()
            )}

            {selectedChat.chat_type === 'group' && (
              <button
                onClick={() => {
                  setSelectedUserIds([]);
                  setIsAddMemberOpen(true);
                }}
                className="w-full mt-2 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <UserPlus size={14} />
                <span>Add Members</span>
              </button>
            )}
          </div>

          <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg space-y-1">
            <span className="text-gray-500 font-semibold text-[10px] uppercase tracking-wider block">About</span>
            <p className="text-gray-700 leading-relaxed text-xs">No description available</p>
          </div>
        </div>
      )}

      {/* ── Create Team Group Modal ── */}
      {isCreateTeamOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Create New Team Group</h3>
                  <p className="text-[11px] text-gray-400">Start a group channel for team collaboration</p>
                </div>
              </div>
              <button onClick={() => setIsCreateTeamOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Group Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Frontend Development Team"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Group Description</label>
                <textarea
                  placeholder="What is this channel about?"
                  rows={2}
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex justify-between items-center">
                  <span>Select Team Members</span>
                  <span className="text-blue-600 font-normal">{selectedUserIds.length} selected</span>
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
                  {availableUsers.map(u => {
                    const isSelected = selectedUserIds.includes(u.id);
                    const uName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
                    return (
                      <label key={u.id} className="flex items-center justify-between p-2.5 hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={uName} src={u.avatar} size={28} />
                          <div>
                            <span className="font-semibold text-gray-800 block text-xs">{uName}</span>
                            <span className="text-[10px] text-gray-400 block">{u.email || u.status}</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedUserIds(prev =>
                              isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                            );
                          }}
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setIsCreateTeamOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 text-xs font-medium cursor-pointer">
                Cancel
              </button>
              <button onClick={handleCreateTeam} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer">
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Members to Group Modal ── */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Add Members to {selectedChat?.name}</h3>
                  <p className="text-[11px] text-gray-400">Expand team collaboration</p>
                </div>
              </div>
              <button onClick={() => setIsAddMemberOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex justify-between items-center">
                  <span>Select Users to Add</span>
                  <span className="text-emerald-600 font-normal">{selectedUserIds.length} selected</span>
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
                  {availableUsers
                    .filter(u => !groupMembers.some(gm => gm.id === u.id))
                    .map(u => {
                      const isSelected = selectedUserIds.includes(u.id);
                      const uName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
                      return (
                        <label key={u.id} className="flex items-center justify-between p-2.5 hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={uName} src={u.avatar} size={28} />
                            <div>
                              <span className="font-semibold text-gray-800 block text-xs">{uName}</span>
                              <span className="text-[10px] text-gray-400 block">{u.email || u.status}</span>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedUserIds(prev =>
                                isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                              );
                            }}
                            className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                          />
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setIsAddMemberOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 text-xs font-medium cursor-pointer">
                Cancel
              </button>
              <button onClick={handleAddMembers} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer">
                Add Selected Members
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ActionBtn({ icon, onClick, title }) {
  return (
    <button onClick={onClick} title={title} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
      {icon}
    </button>
  );
}

function ChatItem({ chat, selected, onSelect, groupInitials }) {
  const rawTime = chat.timestamp || chat.created_at || '';
  const displayTime = formatMessageTime(rawTime);
  const unreadCount = Number(chat.unread_count || chat.unread || 0);

  return (
    <button
      onClick={() => onSelect(chat)}
      className={`w-full flex items-center gap-3 px-2 py-2.5 rounded transition-all mb-0.5 text-left cursor-pointer
        ${selected ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}`}
    >
      <div className="relative shrink-0">
        {chat.chat_type === 'group'
          ? <div className={`w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-[12px] font-bold`}>{groupInitials(chat.name)}</div>
          : <img src={chat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random`} alt={chat.name} className="w-10 h-10 rounded-full object-cover" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <div className="flex items-center gap-1 min-w-0">
            <h4 className="text-xs font-semibold text-gray-900 truncate pr-1">{chat.name}</h4>
            {chat.department && (
              <span className="text-[9px] bg-blue-50 text-blue-600 px-1 py-0.2 rounded font-normal shrink-0">{chat.department}</span>
            )}
          </div>
          <span className="text-[10px] text-gray-400 whitespace-nowrap">{displayTime}</span>
        </div>
        <p className={`text-xs truncate ${unreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
          {chat.lastMessage || 'New Conversation'}
        </p>
      </div>
      {unreadCount > 0 && (
        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0 shadow-xs">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </button>
  );
}

function Avatar({ name, src, size = 32, color = 'bg-gray-200' }) {
  if (src) {
    return <img src={src} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />;
  }
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U';
  return (
    <div style={{ width: size, height: size }} className={`${color} rounded-full flex items-center justify-center text-white font-medium shrink-0 text-xs`}>
      {initials}
    </div>
  );
}

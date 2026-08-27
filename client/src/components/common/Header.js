import React, { useState, useEffect, useCallback } from 'react';
import { Menu, Search, Bell, Settings, Moon, Grid, Maximize2, HelpCircle, PieChart, MessageSquare, LogOut, User, Bell as BellIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config/environment';

// "5 minutes ago" style stamps for the notification list.
const relativeTime = (value) => {
  if (!value) return '';
  const then = new Date(value);
  if (isNaN(then.getTime())) return '';
  const diff = Math.floor((Date.now() - then.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return then.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

// Builds the signed-in user's own route segment, e.g. "/marketing/graphics-designer/gusingekaran1220".
// Notifications can't store this server-side because each recipient has a different path.
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

const userWorkspacePath = (user) => {
  if (!user) return null;
  const dept = String(user.department || '').toLowerCase();
  const role = String(user.role || '').toLowerCase();

  let prefix = '';
  if (dept.includes('marketing') || role.includes('marketing')) prefix = '/marketing';
  else if (dept.includes('it') || role.includes('it') || role.includes('developer') || role.includes('tester')) prefix = '/it';
  else if (dept.includes('seo') || dept.includes('gmb')) prefix = '/seo-gmb';
  else if (dept.includes('sales') || dept.includes('lead') || dept.includes('deal')) prefix = '/sales';
  if (!prefix) return null;

  const designation = slug(user.role) || 'employee';
  const username = slug(user.username || user.first_name || 'user');
  return `${prefix}/${designation}/${username}`;
};

const AVATAR_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500'];
const colorForName = (name) => {
  const s = String(name || '?');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};
const initialsOf = (name) => String(name || 'N').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

const Header = ({ toggleSidebar }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showQuickAccess, setShowQuickAccess] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [notificationsData, setNotificationsData] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll for new notifications. No websocket layer, so a light interval keeps the
  // bell current without adding infrastructure.
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/notifications?user_id=${user.id}&limit=15`);
      if (!res.ok) return;
      const data = await res.json();
      setNotificationsData((data.notifications || []).map(n => ({
        id: n.id,
        avatar: initialsOf(n.actor_name || n.title),
        avatarColor: colorForName(n.actor_name || n.title),
        name: n.actor_name || 'System',
        message: n.message || n.title,
        title: n.title,
        link: n.link,
        entityType: n.entity_type,
        entityKey: n.entity_key,
        time: relativeTime(n.created_at),
        read: !!n.is_read
      })));
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 30000);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  const markNotificationRead = async (id) => {
    setNotificationsData(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PUT' });
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  // Where a notification should take you. Issue/subtask notifications open the ticket on the
  // recipient's own Kanban board via ?ticketKey=. Anything else falls back to a stored link.
  const notificationTarget = (notif) => {
    if (notif.entityKey && (notif.entityType === 'issue' || notif.entityType === 'subtask')) {
      const base = userWorkspacePath(user);
      if (base) {
        // Subtask keys look like MKT-103-1; the board holds the parent card (MKT-103).
        const parts = String(notif.entityKey).split('-');
        const boardKey = parts.length > 2 ? parts.slice(0, 2).join('-') : notif.entityKey;
        return `${base}/kanban?ticketKey=${encodeURIComponent(boardKey)}`;
      }
    }
    // Ignore legacy links that are just a bare department prefix and route nowhere.
    if (notif.link && notif.link.split('/').filter(Boolean).length > 1) return notif.link;
    return null;
  };

  const markAllNotificationsRead = async () => {
    if (!user?.id) return;
    setNotificationsData(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const [messagesData, setMessagesData] = useState([
    {
      id: 1,
      avatar: 'JD',
      avatarColor: 'bg-blue-500',
      name: 'John Doe',
      message: "Sure, Sarah. What's the new policy?",
      time: '08:00 AM',
      read: false
    },
  ]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error enabling fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleDarkModeToggle = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const closeAllPanels = () => {
    setShowQuickAccess(false);
    setShowHelp(false);
    setShowMessages(false);
    setShowNotifications(false);
    setShowProfile(false);
  };

  /**
   * Header panels are mutually exclusive. They are all absolutely positioned in the same
   * corner, so two open at once overlap and the one behind shows through as a blank area
   * inside the other.
   */
  const togglePanel = (isOpen, setOpen, onOpen) => {
    const opening = !isOpen;
    closeAllPanels();
    setOpen(opening);
    if (opening && onOpen) onOpen();
  };

  const anyPanelOpen = showQuickAccess || showHelp || showMessages || showNotifications || showProfile;

  // Clicking anywhere else closes them, so one can't be left open behind another.
  useEffect(() => {
    if (!anyPanelOpen) return;
    const onDocClick = (e) => {
      if (e.target.closest('.dropdown-menu') || e.target.closest('.header-dropdown-trigger')) return;
      closeAllPanels();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [anyPanelOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenNotifications = () => {
    const opening = !showNotifications;
    closeAllPanels();
    setShowNotifications(opening);
    // Refresh on open. Deliberately does NOT mark everything read — that's an explicit
    // action ("Mark all read") or happens per item when clicked, as in Jira.
    if (opening) loadNotifications();
  };

  const handleOpenMessages = () => {
    const opening = !showMessages;
    closeAllPanels();
    setShowMessages(opening);
    if (!showMessages) {
      setMessagesData(prev => prev.map(m => ({ ...m, read: true })));
    }
  };

  const dept = user?.department?.toLowerCase() || 'it';
  const designation = user?.role ? user.role.toLowerCase().replace(/\s+/g, '-') : 'employee';
  const username = user?.name ? user.name.toLowerCase().replace(/\s+/g, '-') : 'user';
  const basePath = `/${dept}/${designation}/${username}`;

  const quickAccessMenu = [
    { label: 'Contacts', desc: 'View All the Contacts', path: `${basePath}/contacts` },
    { label: 'Pipeline', desc: 'View All the Pipeline', path: `/${dept}/${designation}/${username}/kanban` },
    { label: 'Activities', desc: 'Activities', path: `${basePath}/activities` },
    { label: 'Analytics', desc: 'Analytics', path: `/analytics` },
  ];

  // z-40 keeps the header above page content. The workspace tab strip is also sticky, and
  // at an equal z-index it painted over this header's dropdowns just by coming later in
  // the DOM — which clipped the top of the profile card on those pages.
  return (
    <header className="bg-white border-b border-border-light sticky top-0 z-40 transition-smooth">
      <div className="px-2 sm:px-6 lg:px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Menu Toggle & Search */}
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={toggleSidebar}
              className="icon-btn lg:hidden p-2 hover:bg-gray-100 rounded  text-gray-600"
            >
              <Menu size={20} />
            </button>

            <div className="hidden sm:block flex-1 max-w-xs">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1F2020]" />
                <input
                  type="text"
                  placeholder="Search Keyword"
                  className="w-full pl-10 pr-4 py-2 border border-border-light rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-smooth"
                />
              </div>
            </div>
          </div>

          {/* Right: Icons & Profile */}
          <div className="flex items-center gap-1">
            {/* Header Icons */}
            <button
              onClick={toggleFullscreen}
              className="icon-btn p-2 hover:bg-gray-100 rounded text-gray-600 animate-fade-in"
              title="Fullscreen"
            >
              <Maximize2 size={20} />
            </button>

            <button
              onClick={handleDarkModeToggle}
              className="icon-btn p-2 hover:bg-gray-100 rounded text-gray-600 transition-transform active:scale-95"
              title="Dark Mode"
            >
              <Moon size={20} className={`${darkMode ? 'text-blue-500 fill-blue-500' : ''}`} />
            </button>

            {/* Quick Access Menu */}
            <div className="relative">
              <button
                onClick={() => togglePanel(showQuickAccess, setShowQuickAccess)}
                className="header-dropdown-trigger icon-btn p-2 hover:bg-teal-100 rounded text-teal-600 active:scale-95 transition-all"
                title="Quick Access"
              >
                <Grid size={20} />
              </button>

              {showQuickAccess && (
                <div className="dropdown-menu absolute right-0 mt-2 w-56 bg-white z-50 rounded shadow-xl border border-gray-100 py-1">
                  <div className="p-2 space-y-1">
                    {quickAccessMenu.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          navigate(item.path);
                          setShowQuickAccess(false);
                        }}
                        className="menu-item p-3 hover:bg-teal-50 rounded-md cursor-pointer group transition-all duration-200"
                      >
                        <p className="text-gray-900 text-xs font-semibold group-hover:text-teal-600 transition-colors">{item.label}</p>
                        <p className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Help */}
            <div className="relative">
              <button
                onClick={() => togglePanel(showHelp, setShowHelp)}
                className="header-dropdown-trigger icon-btn p-2 hover:bg-purple-100 rounded text-purple-600 active:scale-95 transition-all"
                title="Help"
              >
                <HelpCircle size={20} />
              </button>
              {showHelp && (
                <div className="dropdown-menu absolute right-0 mt-2 w-64 bg-white z-50 p-4 rounded shadow-xl border border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-900 mb-1">Help & Support</h4>
                  <p className="text-xs text-gray-500 mb-2">Need assistance with your CRM dashboard? Our support team is here to help.</p>
                  <a href="mailto:support@codigix.com" className="text-xs text-blue-600 hover:underline">Email: support@codigix.com</a>
                </div>
              )}
            </div>

            {/* Analytics */}
            <button
              onClick={() => navigate('/analytics')}
              className="icon-btn p-2 hover:bg-yellow-100 rounded text-yellow-600 active:scale-95 transition-all"
              title="Analytics"
            >
              <PieChart size={20} />
            </button>

            {/* Messages */}
            <div className="relative">
              <button
                onClick={handleOpenMessages}
                className="header-dropdown-trigger icon-btn relative p-2 hover:bg-gray-100 rounded text-gray-600 active:scale-95 transition-all"
                title="Messages"
              >
                <MessageSquare size={20} />
                {messagesData.some(m => !m.read) && (
                  <span className="notification-badge absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                )}
              </button>

              {showMessages && (
                <div className="dropdown-menu absolute right-0 mt-2 w-80 bg-white z-50 rounded shadow-xl border border-gray-100 py-1">
                  <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-900">Messages</h3>
                    {messagesData.some(m => !m.read) && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full ">New</span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {messagesData.map((msg, idx) => (
                      <div
                        key={msg.id}
                        onClick={() => {
                          navigate(`/${dept}/${designation}/${username}/chat`);
                          setShowMessages(false);
                        }}
                        className="notification-item p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="flex gap-3">
                          <div className={`w-9 h-9 rounded-full ${msg.avatarColor} flex items-center justify-center text-white text-xs  shrink-0 `}>
                            {msg.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900">{msg.name}</p>
                            <p className="text-xs text-gray-600 truncate mt-0.5">{msg.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{msg.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2.5 border-t border-gray-100 text-center bg-gray-50 rounded-b-lg">
                    <button
                      onClick={() => {
                        navigate(`/${dept}/${designation}/${username}/chat`);
                        setShowMessages(false);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium"
                    >
                      Open Chat Workspace
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={handleOpenNotifications}
                className="header-dropdown-trigger icon-btn relative p-2 hover:bg-gray-100 rounded text-gray-600 active:scale-95 transition-all"
                title="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="notification-badge absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full border border-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="dropdown-menu absolute right-0 mt-2 w-80 bg-white z-50 rounded shadow-xl border border-gray-100 py-1">
                  <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-900">
                      Notifications {unreadCount > 0 && <span className="text-red-500">({unreadCount})</span>}
                    </h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => {
                          navigate('/notifications');
                          setShowNotifications(false);
                        }}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Settings size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationsData.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400">You're all caught up.</div>
                    ) : notificationsData.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (!notif.read) markNotificationRead(notif.id);
                          const target = notificationTarget(notif);
                          if (target) {
                            navigate(target);
                            setShowNotifications(false);
                          }
                        }}
                        className={`notification-item p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read ? 'bg-blue-50/40' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-9 h-9 rounded-full ${notif.avatarColor} flex items-center justify-center text-white text-xs  shrink-0 `}>
                            {notif.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900">{notif.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{notif.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {notif.name !== 'System' ? `${notif.name} · ` : ''}{notif.time}
                            </p>
                          </div>
                          {!notif.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2.5 border-t border-gray-100 text-center bg-gray-50 rounded-b-lg">
                    <button
                      onClick={() => {
                        navigate('/notifications');
                        setShowNotifications(false);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium"
                    >
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => togglePanel(showProfile, setShowProfile)}
                className="header-dropdown-trigger flex items-center p-1 hover:bg-gray-100 rounded transition-smooth active:scale-95"
                title="Profile"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 to-pink-500 flex items-center justify-center text-white text-xs  border-2 border-green-400 hover-lift">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </button>

              {showProfile && (
                <div className="dropdown-menu absolute right-0 mt-2 w-56 bg-white z-50 rounded shadow-xl border border-gray-100 py-1">
                  <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-pink-500 flex items-center justify-center text-white text-xs  shrink-0">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs  text-gray-900 truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-600 truncate">{user?.job_title || user?.role || 'Member'}{user?.department ? ` • ${user.department}` : ''}</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 space-y-0.5">
                    <button
                      onClick={() => {
                        navigate('/profile-settings');
                        setShowProfile(false);
                      }}
                      className="menu-item w-full text-left p-2 text-xs text-gray-700 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-2"
                    >
                      <User size={15} />
                      Profile Settings
                    </button>
                    <button
                      onClick={() => {
                        navigate('/notifications');
                        setShowProfile(false);
                      }}
                      className="menu-item w-full text-left p-2 text-xs text-gray-700 hover:bg-purple-50 rounded-md transition-colors flex items-center gap-2"
                    >
                      <BellIcon size={15} />
                      Notifications
                    </button>
                    <button
                      onClick={() => {
                        setShowHelp(true);
                        setShowProfile(false);
                      }}
                      className="menu-item w-full text-left p-2 text-xs text-gray-700 hover:bg-green-50 rounded-md transition-colors flex items-center gap-2"
                    >
                      <HelpCircle size={15} />
                      Help & Support
                    </button>
                    <button
                      onClick={() => {
                        navigate('/profile-settings');
                        setShowProfile(false);
                      }}
                      className="menu-item w-full text-left p-2 text-xs text-gray-700 hover:bg-orange-50 rounded-md transition-colors flex items-center gap-2"
                    >
                      <Settings size={15} />
                      Settings
                    </button>
                  </div>
                  <div className="border-t border-gray-100 p-2">
                    <button
                      onClick={() => {
                        logout();
                        navigate('/login');
                      }}
                      className="menu-item w-full text-left p-2 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-2"
                    >
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

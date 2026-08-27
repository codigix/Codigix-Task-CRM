import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, Check, CheckCheck, Filter, MoreVertical, X, ExternalLink,
  MessageSquare, CheckSquare, AlertCircle, Upload, AtSign, Users,
  Calendar, Briefcase, ChevronRight, ChevronLeft, Tag
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config/environment';

// ─── Mock Data ──────────────────────────────────────────────────────────────
const AVATARS = {
  'Emma Johnson': 'https://i.pravatar.cc/150?u=emma',
  'Michael Brown': 'https://i.pravatar.cc/150?u=michael',
  'Sophia Davis': 'https://i.pravatar.cc/150?u=sophia',
  'Daniel Martinez': 'https://i.pravatar.cc/150?u=daniel',
  'James Wilson': 'https://i.pravatar.cc/150?u=james',
  'Olivia Taylor': 'https://i.pravatar.cc/150?u=olivia',
  'System': null,
  'CI/CD Pipeline': null,
};

const NOTIF_TYPE_CONFIG = {
  Tasks: { color: 'bg-blue-100 text-blue-600', badge: 'bg-blue-50 text-blue-600 border border-blue-100', icon: <CheckSquare size={15} /> },
  Issues: { color: 'bg-red-100 text-red-600', badge: 'bg-red-50 text-red-600 border border-red-100', icon: <AlertCircle size={15} /> },
  Comments: { color: 'bg-purple-100 text-purple-600', badge: 'bg-purple-50 text-purple-600 border border-purple-100', icon: <MessageSquare size={15} /> },
  Deployments: { color: 'bg-amber-100 text-amber-700', badge: 'bg-amber-50 text-amber-700 border border-amber-100', icon: <Upload size={15} /> },
  Calendar: { color: 'bg-pink-100 text-pink-600', badge: 'bg-pink-50 text-pink-600 border border-pink-100', icon: <Calendar size={15} /> },
  Files: { color: 'bg-teal-100 text-teal-600', badge: 'bg-teal-50 text-teal-600 border border-teal-100', icon: <Briefcase size={15} /> },
  Mentions: { color: 'bg-indigo-100 text-indigo-600', badge: 'bg-indigo-50 text-indigo-600 border border-indigo-100', icon: <AtSign size={15} /> },
  Team: { color: 'bg-green-100 text-green-600', badge: 'bg-green-50 text-green-600 border border-green-100', icon: <Users size={15} /> },
};

const NOTIFICATIONS = [];

const PRIORITY_COLORS = {
  High: 'text-orange-600 bg-orange-50 border border-orange-100',
  Critical: 'text-red-600 bg-red-50 border border-red-100',
  Medium: 'text-blue-600 bg-blue-50 border border-blue-100',
  Low: 'text-green-600 bg-green-50 border border-green-100',
};

const STATUS_COLORS = {
  'To Do': 'text-gray-600 bg-gray-100',
  'In Progress': 'text-blue-600 bg-blue-50',
  'Done': 'text-green-600 bg-green-50',
  'Open': 'text-red-600 bg-red-50',
  'Scheduled': 'text-purple-600 bg-purple-50',
  'Shared': 'text-teal-600 bg-teal-50',
  'Active': 'text-green-600 bg-green-50',
  'In Review': 'text-amber-600 bg-amber-50',
};

function Avatar({ name, size = 32 }) {
  const src = AVATARS[name];
  if (src) return <img src={src} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  const colors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-amber-500', 'bg-teal-500', 'bg-gray-400'];
  const color = colors[name?.length % colors.length] || 'bg-gray-400';
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div className={`${color} rounded-full flex items-center justify-center text-white  shrink-0`} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

// Maps a stored notification type onto the categories this page filters by.
const TYPE_TO_CATEGORY = {
  assignment: 'Tasks', task: 'Tasks', status: 'Tasks',
  comment: 'Comments', mention: 'Mentions',
  issue: 'Issues', bug: 'Issues',
  deployment: 'Deployments', file: 'Files',
  calendar: 'Calendar', announcement: 'Team', handoff: 'Team', general: 'Team'
};

const dateLabel = (value) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Earlier';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - day) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) { setIsLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/notifications?user_id=${user.id}&limit=100`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setNotifications((data.notifications || []).map(n => ({
        id: n.id,
        type: TYPE_TO_CATEGORY[n.type] || 'Team',
        rawType: n.type,
        title: n.title,
        message: n.message || '',
        actor: n.actor_name || 'System',
        link: n.link,
        entityKey: n.entity_key,
        unread: !n.is_read,
        important: n.type === 'assignment' || n.type === 'mention',
        date: dateLabel(n.created_at),
        time: new Date(n.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        createdAt: n.created_at,
        // Side panel reads these; only what we actually know is filled in.
        details: {
          task: n.title,
          taskId: n.entity_key || '',
          assignedBy: n.actor_name || 'System',
          module: n.entity_type || '',
          labels: []
        }
      })));
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const unreadCount = notifications.filter(n => n.unread).length;
  const importantCount = notifications.filter(n => n.important).length;
  const mentionCount = notifications.filter(n => n.type === 'Mentions').length;

  const filtered = notifications.filter(n => {
    if (activeTab === 'Unread') return n.unread;
    if (activeTab === 'Important') return n.important;
    if (activeTab === 'Mentions') return n.type === 'Mentions';
    return true;
  });

  const byDate = filtered.reduce((acc, n) => {
    (acc[n.date] = acc[n.date] || []).push(n);
    return acc;
  }, {});

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    if (!user?.id) return;
    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });
    } catch (err) { console.error('Failed to mark all read:', err); }
  };

  const markRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PUT' });
    } catch (err) { console.error('Failed to mark read:', err); }
  };

  const handleClick = (notif) => {
    setSelectedNotif(notif);
    markRead(notif.id);
  };

  const KPIS = [];

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans text-gray-900 relative" style={{ fontFamily: "'Inter', sans-serif" }} onClick={() => { }}>

      {/* Page Header */}
      <div className="px-6 py-5 bg-white border-b border-gray-100">
        <h1 className="text-[20px]  text-gray-900">Notifications</h1>
        <p className="text-[12px] text-gray-500 mt-0.5">Stay updated with important activities and alerts</p>
      </div>

      <div className="p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {KPIS.map(kpi => (
            <button key={kpi.label} onClick={() => setActiveTab(kpi.tab)}
              className={`bg-white rounded p-4 border text-left transition-all hover:shadow-md
                ${activeTab === kpi.tab ? 'border-blue-300 ring-1 ring-blue-200 ' : 'border-gray-100 '}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-full ${kpi.bg} flex items-center justify-center shrink-0`}>{kpi.icon}</div>
                <div>
                  <p className="text-xs  text-gray-500  tracking-wider">{kpi.label}</p>
                  <p className="text-[22px] font-black text-gray-900 leading-none">{kpi.count}</p>
                </div>
              </div>
              <p className="text-xs  text-blue-600">{kpi.sub}</p>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded border border-gray-100  overflow-hidden">
          {/* Toolbar */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-4">
            <div className="flex gap-1">
              {['All', 'Unread', 'Important', 'Mentions'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-2 text-[12px]  rounded transition-colors
                    ${activeTab === tab ? 'text-red-600 border-b-2 border-red-500 rounded-none' : 'text-gray-500 hover:text-gray-700'}`}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={markAllRead}
                className="flex items-center gap-1.5 p-2 text-[12px]  text-gray-600 hover:bg-gray-50 rounded border border-gray-200 transition-colors">
                <CheckCheck size={14} className="text-green-500" /> Mark all as read
              </button>
              <button className="flex items-center gap-1.5 p-2 text-[12px]  text-gray-600 hover:bg-gray-50 rounded border border-gray-200 transition-colors">
                <Filter size={13} /> Filter
              </button>
            </div>
          </div>

          {/* Notification Groups */}
          <div>
            {Object.entries(byDate).map(([date, items]) => (
              <div key={date}>
                <div className="px-5 py-2 text-xs font-extrabold text-gray-500  tracking-wider bg-gray-50 border-b border-gray-100">{date}</div>
                {items.map(notif => {
                  const cfg = NOTIF_TYPE_CONFIG[notif.type] || NOTIF_TYPE_CONFIG.Tasks;
                  const isSelected = selectedNotif?.id === notif.id;
                  return (
                    <div key={notif.id} onClick={() => handleClick(notif)}
                      className={`flex items-start gap-4 px-5 py-4 border-b border-gray-50 cursor-pointer transition-all hover:bg-blue-50/30
                        ${isSelected ? 'bg-blue-50/40' : ''} ${notif.unread ? 'bg-white' : 'bg-white'}`}>

                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-full ${cfg.color} flex items-center justify-center shrink-0 mt-0.5`}>
                        {cfg.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs  text-gray-900">{notif.title}</span>
                          <span className={`text-xs  px-2 py-0.5 rounded ${cfg.badge}`}>{notif.type}</span>
                        </div>
                        <p className="text-[12px] text-gray-600 font-medium mb-1">{notif.message}</p>
                        <p className="text-xs text-gray-400 font-medium">{notif.time} · by {notif.sender}</p>
                      </div>

                      {/* Right side */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs  text-gray-400">{notif.time}</span>
                          {notif.unread && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                        </div>
                        <button onClick={e => e.stopPropagation()} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                          <MoreVertical size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center bg-gray-50">
            <span className="text-xs  text-gray-500">Showing 1 to 10 of 128 notifications</span>
            <div className="flex items-center gap-1">
              <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200 transition-colors">
                <ChevronLeft size={14} />
              </button>
              {[1, 2, 3, 4, 5].map(p => (
                <button key={p} onClick={() => setCurrentPage(p)}
                  className={`w-7 h-7 flex items-center justify-center rounded text-[12px]  transition-colors
                    ${currentPage === p ? 'bg-red-600 text-white ' : 'text-gray-600 hover:bg-gray-200'}`}>{p}</button>
              ))}
              <span className="text-gray-400 mx-1">...</span>
              <button className="w-8 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded text-[12px] ">13</button>
              <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Overlapping Right Detail Panel ───────────────────────────────── */}
      {selectedNotif && (() => {
        const cfg = NOTIF_TYPE_CONFIG[selectedNotif.type] || NOTIF_TYPE_CONFIG.Tasks;
        const det = selectedNotif.details;
        return (
          <div className="fixed inset-y-0 right-0 z-50 flex">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px]" onClick={() => setSelectedNotif(null)} />

            {/* Panel */}
            <div className="relative ml-auto w-[310px] bg-white shadow-2xl border-l border-gray-200 flex flex-col h-full overflow-hidden">
              {/* Panel Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="text-[14px]  text-gray-900">Notification Details</h3>
                <button onClick={() => setSelectedNotif(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Icon + Title */}
                <div className="flex flex-col items-center py-6 border-b border-gray-100">
                  <div className={`w-16 h-16 rounded-2xl ${cfg.color} flex items-center justify-center mb-3 `}>
                    {React.cloneElement(cfg.icon, { size: 28 })}
                  </div>
                  <h4 className="text-[16px]  text-gray-900 mb-1">{selectedNotif.title}</h4>
                  <span className={`text-xs  px-2.5 py-1 rounded ${cfg.badge}`}>{selectedNotif.type}</span>
                  <p className="text-xs text-gray-500 font-medium mt-3 text-center px-6 leading-relaxed">{selectedNotif.message}</p>
                </div>

                {/* Details */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <h5 className="text-xs font-extrabold text-gray-700  tracking-wider mb-3">Details</h5>
                  <div className="space-y-2.5">
                    <DetailRow label="Project" value={det.project} />
                    <DetailRow label="Task" value={det.task} />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 ">Assigned By</span>
                      <div className="flex items-center gap-1.5">
                        <Avatar name={det.assignedBy.name} size={20} />
                        <div className="text-right">
                          <p className="text-xs  text-gray-800 leading-tight">{det.assignedBy.name}</p>
                          <p className="text-[9px] text-gray-400">{det.assignedBy.role}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 ">Priority</span>
                      <span className={`text-xs  px-2 py-0.5 rounded ${PRIORITY_COLORS[det.priority] || 'bg-gray-100 text-gray-600'}`}>{det.priority}</span>
                    </div>
                    <DetailRow label="Due Date" value={det.dueDate} />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 ">Status</span>
                      <span className={`text-xs  px-2 py-0.5 rounded ${STATUS_COLORS[det.status] || 'bg-gray-100 text-gray-600'}`}>{det.status}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <h5 className="text-xs font-extrabold text-gray-700  tracking-wider mb-3">Additional Information</h5>
                  <div className="space-y-2.5">
                    <DetailRow label="Task ID" value={det.taskId} />
                    <DetailRow label="Module" value={det.module} />
                    <DetailRow label="Estimated Time" value={det.estimatedTime} />
                    <div className="flex items-start justify-between text-xs">
                      <span className="text-gray-500  shrink-0">Labels</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {det.labels.map(l => (
                          <span key={l} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px]  border border-blue-100">{l}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <h5 className="text-xs font-extrabold text-gray-700  tracking-wider mb-3">Actions</h5>
                  <div className="space-y-2">
                    <button className="w-full flex items-center justify-between p-2.5 border border-gray-200 rounded text-[12px]  text-gray-700 hover:bg-gray-50 transition-colors">
                      View Task <ExternalLink size={13} className="text-gray-400" />
                    </button>
                    <button className="w-full flex items-center justify-between p-2.5 border border-gray-200 rounded text-[12px]  text-gray-700 hover:bg-gray-50 transition-colors">
                      Add Comment <MessageSquare size={13} className="text-gray-400" />
                    </button>
                    <button className="w-full flex items-center justify-between p-2.5 border border-gray-200 rounded text-[12px]  text-gray-700 hover:bg-gray-50 transition-colors">
                      Mark as Complete <Check size={13} className="text-green-500" />
                    </button>
                  </div>
                </div>

                {/* Notification Time Footer */}
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 ">Notification Time</span>
                    <span className="text-gray-800 ">20 May 2026, {selectedNotif.time}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between text-xs gap-2">
      <span className="text-gray-500  shrink-0">{label}</span>
      <span className="text-gray-800  text-right">{value}</span>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Mail, Send, MessageCircle, Loader } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const EmailPage = () => {
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const { user } = useAuth();

  const emails = [
    {
      id: 1,
      avatar: 'JL',
      avatarColor: 'bg-red-500',
      name: 'Justin Lapoint',
      subject: 'Client Dashboard',
      preview: 'It seems that recipients are receiving...',
      time: '3:13 PM',
      read: false,
      attachments: 3,
      tags: ['Projects'],
      type: 'email'
    },
    {
      id: 2,
      avatar: 'RJ',
      avatarColor: 'bg-blue-500',
      name: 'Rufana Joe',
      subject: 'UI project',
      preview: 'Regardless, you can usually expect an increase',
      time: '3:13 PM',
      read: false,
      attachments: 0,
      tags: ['Applications'],
      type: 'email'
    },
    {
      id: 3,
      avatar: 'CD',
      avatarColor: 'bg-purple-500',
      name: 'Cameron Drake',
      subject: "You're missing",
      preview: 'Here are a few catchy email subject line examples',
      time: '3:13 PM',
      read: false,
      attachments: 1,
      tags: ['External'],
      type: 'email'
    },
    {
      id: 4,
      avatar: 'SH',
      avatarColor: 'bg-green-500',
      name: 'Sean Hill',
      subject: 'How Have You Progressed',
      preview: 'You can write effective retargeting subject',
      time: '3:13 PM',
      read: false,
      attachments: 1,
      tags: ['Team Events'],
      type: 'email'
    },
    {
      id: 5,
      avatar: 'KA',
      avatarColor: 'bg-indigo-500',
      name: 'Kevin Alley',
      subject: 'Flash. Sale. Alert.',
      preview: 'You can also use casual language,',
      time: '3:13 PM',
      read: false,
      attachments: 1,
      tags: ['External'],
      type: 'email'
    },
  ];

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        await loadActivities();
      };
      loadData();
    }
  }, [user]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const allActivities = [];

      allActivities.push(...await loadTasks());
      allActivities.push(...await loadDeals());
      allActivities.push(...await loadProjects());
      allActivities.push(...await loadCalls());

      allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setActivities(allActivities);
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/tasks`);
      if (response.ok) {
        const tasks = await response.json();
        return (Array.isArray(tasks) ? tasks : []).map(task => ({
          id: `task-${task.id}`,
          originalId: task.id,
          type: 'task',
          icon: '✓',
          iconColor: 'bg-blue-500',
          name: task.title || 'Untitled Task',
          subject: `Task: ${task.title || 'Untitled'}`,
          preview: task.description || 'No description provided',
          timestamp: task.created_at || new Date().toISOString(),
          time: formatTime(task.created_at),
          status: task.status || 'Open',
          priority: task.priority || 'Medium',
          tags: task.tags ? (Array.isArray(task.tags) ? task.tags : []) : [],
          read: false,
          avatarColor: getPriorityColor(task.priority || 'Medium')
        }));
      }
      return [];
    } catch (err) {
      console.error('Error loading tasks:', err);
      return [];
    }
  };

  const loadDeals = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/deals`);
      if (response.ok) {
        const deals = await response.json();
        return (Array.isArray(deals) ? deals : []).map(deal => ({
          id: `deal-${deal.id}`,
          originalId: deal.id,
          type: 'deal',
          icon: '💼',
          iconColor: 'bg-purple-500',
          name: deal.company_name || deal.title || 'Untitled Deal',
          subject: `Deal: ${deal.title || deal.company_name || 'Untitled'}`,
          preview: deal.description || `Amount: ${deal.amount || 'N/A'}`,
          timestamp: deal.updated_at || deal.created_at || new Date().toISOString(),
          time: formatTime(deal.updated_at || deal.created_at),
          status: deal.status || 'Open',
          amount: deal.amount,
          tags: deal.status ? [deal.status] : [],
          read: false,
          avatarColor: getDealColor(deal.status)
        }));
      }
      return [];
    } catch (err) {
      console.error('Error loading deals:', err);
      return [];
    }
  };

  const loadProjects = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/projects`);
      if (response.ok) {
        const projects = await response.json();
        return (Array.isArray(projects) ? projects : []).map(project => ({
          id: `project-${project.id}`,
          originalId: project.id,
          type: 'project',
          icon: '📋',
          iconColor: 'bg-green-500',
          name: project.name || project.title || 'Untitled Project',
          subject: `Project: ${project.name || project.title || 'Untitled'}`,
          preview: project.description || 'No description provided',
          timestamp: project.updated_at || project.created_at || new Date().toISOString(),
          time: formatTime(project.updated_at || project.created_at),
          status: project.status || 'Planning',
          tags: project.status ? [project.status] : [],
          read: false,
          avatarColor: getProjectColor(project.status)
        }));
      }
      return [];
    } catch (err) {
      console.error('Error loading projects:', err);
      return [];
    }
  };

  const loadCalls = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/call-history?limit=50`);
      if (response.ok) {
        const calls = await response.json();
        return (Array.isArray(calls) ? calls : []).map(call => ({
          id: `call-${call.id}`,
          originalId: call.id,
          type: 'call',
          icon: call.call_type === 'Video' ? '🎥' : '📞',
          iconColor: call.call_type === 'Video' ? 'bg-indigo-500' : 'bg-cyan-500',
          name: call.caller_name || 'Unknown',
          subject: `${call.call_type || 'Call'}: ${call.caller_name || 'Unknown'}`,
          preview: `Duration: ${formatDuration(call.duration)} • ${call.call_direction || 'Incoming'}`,
          timestamp: call.created_at || new Date().toISOString(),
          time: formatTime(call.created_at),
          callType: call.call_type || 'Audio',
          direction: call.call_direction || 'Incoming',
          duration: call.duration || 0,
          tags: [call.call_type || 'Audio', call.call_direction || 'Incoming'],
          read: false,
          avatarColor: call.call_type === 'Video' ? 'bg-indigo-500' : 'bg-cyan-500'
        }));
      }
      return [];
    } catch (err) {
      console.error('Error loading calls:', err);
      return [];
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Now';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Critical': 'bg-red-500',
      'High': 'bg-orange-500',
      'Medium': 'bg-yellow-500',
      'Low': 'bg-green-500'
    };
    return colors[priority] || colors.Medium;
  };

  const getDealColor = (status) => {
    const colors = {
      'Won': 'bg-green-500',
      'Lost': 'bg-red-500',
      'In Progress': 'bg-blue-500',
      'Open': 'bg-purple-500'
    };
    return colors[status] || colors.Open;
  };

  const getProjectColor = (status) => {
    const colors = {
      'Completed': 'bg-green-500',
      'In Progress': 'bg-blue-500',
      'Planning': 'bg-gray-500',
      'On Hold': 'bg-red-500'
    };
    return colors[status] || colors.Planning;
  };

  const getFilteredActivities = () => {
    if (activeFilter === 'all') {
      return activities;
    }
    return activities.filter(activity => activity.type === activeFilter);
  };

  const filteredActivities = getFilteredActivities();

  return (
    <div className="p-3 sm:p-3 lg:p-3 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl  text-gray-900">Inbox & Activities</h1>
          <div className="flex items-center gap-2 text-xs  text-gray-600 mt-2">
            <button className="text-gray-600 hover:text-gray-900">Home</button>
            <span>›</span>
            <button className="text-gray-600 hover:text-gray-900">Applications</button>
            <span>›</span>
            <span>Inbox & Activities</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded   p-2 border border-border-light">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white text-xs  ">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className=" text-gray-900 text-xs ">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-600">{user?.email || 'user@example.com'}</p>
                </div>
              </div>
              <button className="w-full p-2  bg-red-600 text-white rounded  hover:bg-red-700 transition-smooth   text-xs  flex items-center justify-center gap-2">
                <Mail size={16} />
                Compose
              </button>
            </div>

            <div className="bg-white rounded   p-2 border border-border-light">
              <h3 className=" text-gray-900 mb-3 text-xs ">Filter by Type</h3>
              <div className="space-y-2">
                {[
                  { label: 'All Activities', value: 'all', count: activities.length },
                  { label: 'Emails', value: 'email', count: emails.length },
                  { label: 'Tasks', value: 'task', count: activities.filter(a => a.type === 'task').length },
                  { label: 'Deals', value: 'deal', count: activities.filter(a => a.type === 'deal').length },
                  { label: 'Projects', value: 'project', count: activities.filter(a => a.type === 'project').length },
                  { label: 'Calls', value: 'call', count: activities.filter(a => a.type === 'call').length },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setActiveFilter(filter.value)}
                    className={`w-full flex items-center justify-between p-2 rounded  text-xs  transition-smooth ${activeFilter === filter.value
                      ? 'bg-red-50 text-red  '
                      : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    <span>{filter.label}</span>
                    <span className={`text-xs  ${activeFilter === filter.value ? 'bg-red-200' : 'bg-gray-200'} p-1  rounded-full`}>
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded   p-2 border border-border-light">
              <h3 className=" text-gray-900 mb-3 text-xs ">Activity Types</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✉️</span>
                  <span className="text-gray-600">Emails</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  <span className="text-gray-600">Tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">💼</span>
                  <span className="text-gray-600">Deals</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <span className="text-gray-600">Projects</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📞</span>
                  <span className="text-gray-600">Calls</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            {selectedEmail ? (
              <div className="bg-white rounded  border border-border-lightp-3 ">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="text-white  hover:text-blue-700 text-xs    mb-4"
                >
                  ← Back to Inbox
                </button>
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h2 className="text-2xl  text-gray-900 mb-4">{selectedEmail.subject}</h2>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${selectedEmail.avatarColor} flex items-center justify-center text-white text-xs  `}>
                      {selectedEmail.type === 'email' ? selectedEmail.avatar : selectedEmail.icon}
                    </div>
                    <div>
                      <p className=" text-gray-900">{selectedEmail.name}</p>
                      <p className="text-xs  text-gray-600">{selectedEmail.time}</p>
                    </div>
                  </div>
                </div>
                <div className="prose max-w-none mb-6">
                  <p className="text-gray-700">{selectedEmail.preview}</p>
                </div>
                {selectedEmail.type === 'email' && (
                  <div className="flex gap-2">
                    <button className="flex items-center gap-2 p-2  text-gray-600 hover:bg-gray-100 rounded  transition-smooth text-xs ">
                      <MessageCircle size={16} />
                      Reply
                    </button>
                    <button className="flex items-center gap-2 p-2  text-gray-600 hover:bg-gray-100 rounded  transition-smooth text-xs ">
                      <MessageCircle size={16} />
                      Reply All
                    </button>
                    <button className="flex items-center gap-2 p-2  text-gray-600 hover:bg-gray-100 rounded  transition-smooth text-xs ">
                      <Send size={16} />
                      Forward
                    </button>
                  </div>
                )}
                {selectedEmail.type !== 'email' && (
                  <div className="bg-blue-50 border border-blue-200 rounded  p-3 text-xs  text-blue-700">
                    <strong>Activity Details:</strong> This is a {selectedEmail.type}. View full details in the {selectedEmail.type}s section for more information.
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded  border border-border-light overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg  text-gray-900 mb-1">
                    {activeFilter === 'all' ? 'All Activities' : activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1) + 's'}
                  </h2>
                  <p className="text-xs  text-gray-600">
                    {loading ? 'Loading activities...' : `${filteredActivities.length} items • ${filteredActivities.filter(a => !a.read).length} Unread`}
                  </p>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-gray-600 flex items-center justify-center gap-2">
                    <Loader size={18} className="animate-spin" />
                    Loading activities...
                  </div>
                ) : filteredActivities.length === 0 ? (
                  <div className="p-8 text-center text-gray-600">
                    <p>No {activeFilter === 'all' ? 'activities' : activeFilter + 's'} found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredActivities.map((activity) => (
                      <div
                        key={activity.id}
                        onClick={() => setSelectedEmail(activity)}
                        className="p-2 hover:bg-gray-50 cursor-pointer transition-smooth border-l-4 border-transparent hover:border-l-4 hover:border-red-500"
                      >
                        <div className="flex items-start gap-4">
                          <input type="checkbox" className="mt-1" />
                          <div className={`w-10 h-10 rounded-full ${activity.avatarColor} flex items-center justify-center text-white text-xs  flex-shrink-0`}>
                            {activity.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={` ${activity.read ? 'text-gray-700' : 'text-gray-900'}`}>
                                {activity.name}
                              </p>
                              <span className="text-xs text-gray-600 flex-shrink-0">{activity.time}</span>
                            </div>
                            <p className={`text-xs  ${activity.read ? 'text-gray-600' : 'text-gray-900  '} truncate`}>
                              {activity.subject}
                            </p>
                            <p className="text-xs text-gray-600 line-clamp-1 mt-1">{activity.preview}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-xs bg-gray-100 text-gray-700 p-1  rounded   capitalize">
                                {activity.type}
                              </span>
                              {activity.status && (
                                <span className="text-xs bg-gray-100 text-gray-700 p-1  rounded">
                                  {activity.status}
                                </span>
                              )}
                              {activity.tags && activity.tags.map((tag, idx) => (
                                <span key={idx} className="text-xs bg-red-50 text-red-700 p-1  rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailPage;

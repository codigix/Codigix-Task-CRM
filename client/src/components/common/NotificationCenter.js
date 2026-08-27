import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Clock, DollarSign, Zap, Bell } from 'lucide-react';

const NotificationCenter = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/automation/alerts');
      const data = await res.json();

      // Convert automation_rules to notifications
      const notifs = data.map(rule => {
        let payload = {};
        try {
          payload = typeof rule.action_payload === 'string'
            ? JSON.parse(rule.action_payload || '{}')
            : (rule.action_payload || {});
        } catch (e) {
          console.error('Error parsing action_payload:', e);
        }
        return {
          id: rule.id,
          title: payload.title || rule.name,
          message: payload.message || '',
          severity: payload.severity || 'Medium',
          type: rule.entity_type?.toLowerCase() || 'alert',
          action: payload.action_required || '',
          created_at: rule.created_at,
          entity_id: payload.entity_id
        };
      });

      setNotifications(notifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissNotification = async (id) => {
    try {
      await fetch(`/api/automation/alerts/${id}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const dismissAll = async () => {
    for (const notif of notifications) {
      await dismissNotification(notif.id);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'High': return 'bg-red-100 border-red-300 text-red-800';
      case 'Medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'Low': return 'bg-green-100 border-green-300 text-green-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'High': return <AlertCircle size={20} className="text-red " />;
      case 'Medium': return <Clock size={20} className="text-yellow-600" />;
      case 'Low': return <CheckCircle size={20} className="text-green-600" />;
      default: return <Bell size={20} className="text-gray-600" />;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'lead': return '👤';
      case 'deal': return '💼';
      case 'invoice': return '💰';
      case 'task': return '✓';
      case 'project': return '📋';
      default: return '🔔';
    }
  };

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => n.severity === filter);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-end z-50">
      <div className="bg-white w-full md:w-96 h-full overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-whitep-2   flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bell size={24} />
            <h2 className="text-xl  ">Notifications</h2>
            {notifications.length > 0 && (
              <span className="bg-red-900 text-white p-1  rounded-full text-sm ">
                {notifications.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-red-600 rounded ">
            <X size={24} />
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 border-b p-3 flex gap-2 overflow-x-auto">
          {['all', 'High', 'Medium', 'Low'].map(sev => (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              className={`px-3 py-1 rounded-full text-sm  whitespace-nowrap transition ${filter === sev
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              {sev === 'all' ? 'All' : `${sev} Severity`}
            </button>
          ))}
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="p-2 bg-gray-100 border-b flex gap-2">
            <button
              onClick={fetchNotifications}
              className="text-sm text-white  hover:text-blue-800 "
            >
              🔄 Refresh
            </button>
            <button
              onClick={dismissAll}
              className="text-sm text-red  hover:text-red-800 "
            >
              ✓ Clear All
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading notifications...</div>
          ) : filteredNotifications.length > 0 ? (
            <div className="space-y-2 p-3">
              {filteredNotifications.map(notif => (
                <div key={notif.id} className={`rounded  border-l-4 p-3 space-y-2 ${getSeverityColor(notif.severity)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex gap-2 flex-1">
                      <div className="flex-shrink-0 mt-0.5">
                        {getSeverityIcon(notif.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className=" text-sm">{notif.title}</p>
                        <p className="text-xs opacity-90 mt-0.5 break-words">{notif.message}</p>
                        {notif.action && (
                          <p className="text-xs  mt-1 opacity-75">
                            📌 {notif.action}
                          </p>
                        )}
                        <p className="text-xs opacity-60 mt-1">
                          {new Date(notif.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => dismissNotification(notif.id)}
                      className="flex-shrink-0 hover:bg-white hover:bg-opacity-30 p-1 rounded transition"
                      title="Dismiss"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full">
              <CheckCircle size={48} className="mb-3 opacity-50" />
              <p className="">All caught up!</p>
              <p className="text-sm">No {filter !== 'all' ? filter.toLowerCase() : ''} notifications</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t p-3 text-xs text-gray-600">
          {notifications.length > 0 ? (
            <>Auto-refreshes every 30 seconds</>
          ) : (
            <>You have no alerts right now</>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;

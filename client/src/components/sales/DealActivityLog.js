import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Send } from 'lucide-react';

const DealActivityLog = ({ dealId }) => {
  const [activities, setActivities] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activityType, setActivityType] = useState('note');

  useEffect(() => {
    loadActivities();
  }, [dealId]);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      const stored = localStorage.getItem(`deal_activities_${dealId}`);
      if (stored) {
        setActivities(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addActivity = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const activity = {
      id: Date.now(),
      type: activityType,
      content: newNote,
      createdAt: new Date().toISOString(),
      author: 'Current User'
    };

    const updated = [activity, ...activities];
    setActivities(updated);
    localStorage.setItem(`deal_activities_${dealId}`, JSON.stringify(updated));
    setNewNote('');
  };

  const deleteActivity = (id) => {
    const updated = activities.filter(a => a.id !== id);
    setActivities(updated);
    localStorage.setItem(`deal_activities_${dealId}`, JSON.stringify(updated));
  };

  const getActivityIcon = (type) => {
    const icons = {
      'note': '📝',
      'call': '📞',
      'email': '📧',
      'meeting': '👥',
      'task': '✓'
    };
    return icons[type] || '📌';
  };

  const getActivityColor = (type) => {
    const colors = {
      'note': 'bg-blue-50 border-blue-200',
      'call': 'bg-yellow-50 border-yellow-200',
      'email': 'bg-purple-50 border-purple-200',
      'meeting': 'bg-green-50 border-green-200',
      'task': 'bg-red-50 border-red-200'
    };
    return colors[type] || 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="space-y-6">
      <div className="border border-gray-200 rounded  p-2 bg-gray-50">
        <label className="block text-xs    text-gray-700 mb-3">Activity Type</label>
        <div className="flex gap-2 mb-4">
          {['note', 'call', 'email', 'meeting', 'task'].map(type => (
            <button
              key={type}
              onClick={() => setActivityType(type)}
              className={`p-2 rounded text-xs    transition ${activityType === type
                  ? 'bg-red-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
            >
              {getActivityIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <form onSubmit={addActivity}>
          <div className="space-y-3">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={`Add a ${activityType}...`}
              className="w-full p-2 border border-gray-300 rounded  text-xs  min-h-20 resize-none focus:outline-none focus:border-red-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newNote.trim()}
                className="p-2  bg-red-600 text-white rounded    text-xs  hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
              >
                <Send size={16} /> Add Activity
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className=" text-gray-900 text-xs ">Activity History</h3>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-xs ">No activities yet. Add one to get started!</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`border rounded  p-2 ${getActivityColor(activity.type)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getActivityIcon(activity.type)}</span>
                  <div>
                    <p className=" text-xs  text-gray-900 capitalize">{activity.type}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(activity.createdAt).toLocaleDateString()} at {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteActivity(activity.id)}
                  className="p-1 hover:bg-red-100 rounded transition text-[#1F2020] hover:text-red "
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-xs  text-gray-700 whitespace-pre-wrap">{activity.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DealActivityLog;

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronDown, MoreVertical, X, Calendar, Star, GripVertical, AlertCircle } from 'lucide-react';
import { taskAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import SetReminderModal from './SetReminderModal';

const TodoPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('All Reminders');
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const tabs = ['All Reminders', "Today's", 'Overdue', 'Upcoming'];

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const allTasks = await taskAPI.getAllGeneral();
      const userTasks = allTasks.filter(task => (task.assigned_to || []).includes(user.id));
      setTodos(userTasks);
      setError(null);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchTasks();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user, fetchTasks]);

  const getStatusBadgeColor = (status, date) => {
    if (status === 'Completed') return 'bg-green-100 text-green-700';
    const isOverdue = date && new Date(date) < new Date();
    if (isOverdue) return 'bg-red-100 text-red-700';
    return 'bg-blue-100 text-blue-700';
  };

  const getStatusText = (status, date) => {
    if (status === 'Completed') return 'Completed';
    const isToday = date && new Date(date).toDateString() === new Date().toDateString();
    if (isToday) return 'Today';
    const isOverdue = date && new Date(date) < new Date();
    if (isOverdue) return 'Overdue';
    return 'Scheduled';
  };

  const filteredTodos = todos.filter(todo => {
    if (activeTab === "Today's") {
      const isToday = todo.due_date && new Date(todo.due_date).toDateString() === new Date().toDateString();
      return isToday;
    }
    if (activeTab === 'Overdue') {
      const isOverdue = todo.due_date && new Date(todo.due_date) < new Date() && todo.status !== 'Completed';
      return isOverdue;
    }
    if (activeTab === 'Upcoming') {
      const isUpcoming = todo.due_date && new Date(todo.due_date) > new Date() && todo.status !== 'Completed';
      return isUpcoming;
    }
    return true;
  });

  if (!isAuthenticated) {
    return (
      <div className="p-2 bg-[#F7F8F9] min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded  shadow-lg p-6 text-center">
          <AlertCircle size={48} className="text-red  mx-auto mb-4" />
          <h2 className="text-xl  mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access reminders</p>
          <a href="/login" className="block w-full py-2 bg-red-600 text-white rounded  hover:bg-red-700 transition">Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 bg-[#F7F8F9] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header & Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl  text-gray-900">Reminders</h1>
            <div className="flex items-center border-b border-gray-200">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`p-2 text-xs   transition-colors relative ${activeTab === tab ? 'text-red ' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-3 border border-gray-200 rounded  mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[300px]">
            <select className="p-2 border border-gray-300 rounded text-xs text-gray-600 outline-none focus:border-red-500 min-w-[140px]">
              <option>Time</option>
            </select>
            <select className="p-2 border border-gray-300 rounded text-xs text-gray-600 outline-none focus:border-red-500 min-w-[140px]">
              <option>Related To</option>
            </select>
            <select className="p-2 border border-gray-300 rounded text-xs text-gray-600 outline-none focus:border-red-500 min-w-[140px]">
              <option>Type</option>
            </select>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Add Reminder
          </button>
        </div>

        {/* Table Content */}
        <div className="bg-white border border-gray-200 rounded  overflow-hidden ">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-3 text-xs   text-gray-600 w-10">
                  <input type="checkbox" className="rounded border-gray-300" />
                </th>
                <th className="p-3 text-xs   text-gray-600">Related To</th>
                <th className="p-3 text-xs   text-gray-600">Type</th>
                <th className="p-3 text-xs   text-gray-600">Related To</th>
                <th className="p-3 text-xs   text-gray-600">Type</th>
                <th className="p-3 text-xs   text-gray-600 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-gray-500 text-xs">Loading reminders...</td>
                </tr>
              ) : filteredTodos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-gray-500 text-xs">No reminders found</td>
                </tr>
              ) : (
                filteredTodos.map(todo => (
                  <tr key={todo.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-3">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </td>
                    <td className="p-3 text-xs text-gray-900 ">
                      {todo.title}
                    </td>
                    <td className="p-3 text-xs text-gray-600">
                      Call
                    </td>
                    <td className="p-3 text-xs text-gray-600">
                      {todo.linked_type}: {todo.linked_id}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs    ${getStatusBadgeColor(todo.status, todo.due_date)}`}>
                        {getStatusText(todo.status, todo.due_date)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button className="text-[#1F2020] hover:text-gray-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <SetReminderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (data) => {
          console.log('New Reminder:', data);
          await fetchTasks();
        }}
      />
    </div>
  );
};

export default TodoPage;

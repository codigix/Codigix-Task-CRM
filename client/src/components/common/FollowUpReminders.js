import React, { useState, useEffect } from 'react';
import { Bell, Calendar, Clock, CheckCircle, AlertCircle, Mail, Phone, MessageSquare, Plus, Edit2, Trash2 } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const FollowUpReminders = () => {
  const [reminders, setReminders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending');

  const [formData, setFormData] = useState({
    entity_type: 'Lead',
    entity_id: '',
    reminder_type: 'email',
    reminder_date: '',
    reminder_time: '09:00',
    message: '',
    frequency: 'once',
    status: 'Pending'
  });

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [remindersRes, leadsRes, dealsRes] = await Promise.all([
        fetch(`/api/reminders?status=${filterStatus}`),
        fetch('/api/leads?skip=0&limit=500'),
        fetch('/api/deals?skip=0&limit=500')
      ]);

      const remindersData = await remindersRes.json();
      const leadsData = await leadsRes.json();
      const dealsData = await dealsRes.json();

      setReminders(Array.isArray(remindersData) ? remindersData : []);
      setLeads(Array.isArray(leadsData) ? leadsData : []);
      setDeals(Array.isArray(dealsData) ? dealsData : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    try {
      const url = editingId
        ? `/api/reminders/${editingId}`
        : '/api/reminders';

      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          reminder_datetime: `${formData.reminder_date}T${formData.reminder_time}`
        })
      });

      if (res.ok) {
        showSuccessToast(editingId ? 'Reminder updated' : 'Reminder created');
        setShowForm(false);
        setEditingId(null);
        resetForm();
        fetchData();
      }
    } catch (error) {
      showErrorToast('Failed to save reminder');
      console.error(error);
    }
  };

  const handleDeleteReminder = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccessToast('Reminder deleted');
        fetchData();
      }
    } catch (error) {
      showErrorToast('Failed to delete reminder');
    }
  };

  const handleCompleteReminder = async (id) => {
    try {
      const res = await fetch(`/api/reminders/${id}/complete`, { method: 'PUT' });
      if (res.ok) {
        showSuccessToast('Reminder marked as completed');
        fetchData();
      }
    } catch (error) {
      showErrorToast('Failed to update reminder');
    }
  };

  const resetForm = () => {
    setFormData({
      entity_type: 'Lead',
      entity_id: '',
      reminder_type: 'email',
      reminder_date: '',
      reminder_time: '09:00',
      message: '',
      frequency: 'once',
      status: 'Pending'
    });
  };

  const handleEditReminder = (reminder) => {
    setFormData({
      entity_type: reminder.entity_type,
      entity_id: reminder.entity_id,
      reminder_type: reminder.reminder_type,
      reminder_date: reminder.reminder_datetime?.split('T')[0] || '',
      reminder_time: reminder.reminder_datetime?.split('T')[1]?.substring(0, 5) || '09:00',
      message: reminder.message,
      frequency: reminder.frequency,
      status: reminder.status
    });
    setEditingId(reminder.id);
    setShowForm(true);
  };

  const getEntityName = () => {
    if (formData.entity_type === 'Lead') {
      const entity = leads.find(l => l.id == formData.entity_id);
      return entity ? entity.lead_name : '';
    } else {
      const entity = deals.find(d => d.id == formData.entity_id);
      return entity ? entity.deal_name : '';
    }
  };

  const getReminderIcon = (type) => {
    switch (type) {
      case 'email': return <Mail size={20} className="text-white " />;
      case 'sms': return <MessageSquare size={20} className="text-green-600" />;
      case 'call': return <Phone size={20} className="text-orange-600" />;
      case 'notification': return <Bell size={20} className="text-purple-600" />;
      default: return <Calendar size={20} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Sent': return 'bg-green-100 text-green-800 border-green-300';
      case 'Completed': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Skipped': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (datetime) => {
    return new Date(datetime) < new Date() && new Date(datetime).toDateString() !== new Date().toDateString();
  };

  if (loading) {
    return <div className="text-center py-10">Loading reminders...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl   text-gray-900">Follow-up Reminders</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            resetForm();
          }}
          className="bg-red-600 text-white p-2 rounded   hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Reminder
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {['pending', 'sent', 'completed'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`p-2 rounded   transition-colors ${filterStatus === status
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded  border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg  text-gray-900">
            {editingId ? 'Edit Reminder' : 'Create New Reminder'}
          </h3>

          <form onSubmit={handleCreateReminder} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm  text-gray-700 mb-1">Entity Type</label>
                <select
                  value={formData.entity_type}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, entity_type: e.target.value, entity_id: '' }));
                  }}
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Lead">Lead</option>
                  <option value="Deal">Deal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm  text-gray-700 mb-1">Select {formData.entity_type}</label>
                <select
                  value={formData.entity_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, entity_id: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select --</option>
                  {formData.entity_type === 'Lead'
                    ? leads.map(l => <option key={l.id} value={l.id}>{l.lead_name}</option>)
                    : deals.map(d => <option key={d.id} value={d.id}>{d.deal_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm  text-gray-700 mb-1">Reminder Type</label>
                <select
                  value={formData.reminder_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, reminder_type: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="call">Phone Call</option>
                  <option value="notification">In-app Notification</option>
                </select>
              </div>

              <div>
                <label className="block text-sm  text-gray-700 mb-1">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="once">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm  text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.reminder_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, reminder_date: e.target.value }))}
                  required
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm  text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={formData.reminder_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, reminder_time: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm  text-gray-700 mb-1">Message</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Enter reminder message"
                className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-red-600  text-white p-2 rounded   hover:bg-blue-700 transition-colors"
              >
                {editingId ? 'Update Reminder' : 'Create Reminder'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="flex-1 bg-gray-300 text-gray-800 p-2 rounded   hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded p-2   border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Reminders</p>
          <p className="text-3xl   text-gray-900">{reminders.length}</p>
        </div>
        <div className="bg-white rounded p-2   border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-3xl   text-yellow-600">
            {reminders.filter(r => r.status === 'Pending').length}
          </p>
        </div>
        <div className="bg-white rounded p-2   border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Overdue</p>
          <p className="text-3xl   text-red ">
            {reminders.filter(r => isOverdue(r.reminder_datetime) && r.status === 'Pending').length}
          </p>
        </div>
        <div className="bg-white rounded p-2   border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Completed</p>
          <p className="text-3xl   text-green-600">
            {reminders.filter(r => r.status === 'Completed').length}
          </p>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-4">
        {reminders.length > 0 ? (
          reminders.map(reminder => (
            <div
              key={reminder.id}
              className={`bg-white rounded  border-l-4 overflow-hidden ${getStatusColor(reminder.status)} ${isOverdue(reminder.reminder_datetime) && reminder.status === 'Pending' ? 'ring-2 ring-red-500' : ''
                }`}
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {getReminderIcon(reminder.reminder_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className=" text-gray-900">
                          {reminder.entity_type}: {reminder.entity_name}
                        </h3>
                        {isOverdue(reminder.reminder_datetime) && reminder.status === 'Pending' && (
                          <span className="bg-red-500 text-white p-1  rounded text-xs ">
                            ⚠️ OVERDUE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{reminder.message}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm  ${reminder.status === 'Pending' ? 'bg-yellow-200 text-yellow-800' :
                      reminder.status === 'Sent' ? 'bg-green-200 text-green-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                      {reminder.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                  <div>
                    <p className="text-gray-600">Type</p>
                    <p className=" capitalize">{reminder.reminder_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Frequency</p>
                    <p className=" capitalize">{reminder.frequency}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Scheduled</p>
                    <p className="">
                      {new Date(reminder.reminder_datetime).toLocaleString()}
                    </p>
                  </div>
                </div>

                {reminder.status === 'Pending' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <button
                      onClick={() => handleCompleteReminder(reminder.id)}
                      className="flex-1 bg-green-600 text-white p-2 rounded  text-sm hover:bg-green-700 flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle size={16} />
                      Mark Complete
                    </button>
                    <button
                      onClick={() => handleEditReminder(reminder)}
                      className="bg-red-600 text-white p-2 rounded  text-sm hover:bg-blue-700 flex items-center gap-2 transition-colors"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="bg-red-600 text-white p-2 rounded  text-sm hover:bg-red-700 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded  p-8 text-center text-gray-500 border border-gray-200">
            <Bell size={48} className="mx-auto mb-3 opacity-50" />
            <p className="">No {filterStatus} reminders</p>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-blue-50 rounded p-2   border border-blue-200">
        <h3 className=" text-blue-900 mb-2">💡 Reminder Best Practices</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Set reminders 1-2 days before follow-up actions</li>
          <li>✓ Use email for detailed follow-ups, SMS for quick check-ins</li>
          <li>✓ Set daily reminders for high-priority deals</li>
          <li>✓ Review overdue reminders to ensure timely follow-ups</li>
        </ul>
      </div>
    </div>
  );
};

export default FollowUpReminders;

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


const AddTimeLogModal = ({ isOpen, onClose, projectId, onAdd }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch(API_BASE_URL + '/users')
        .then(res => res.json())
        .then(data => setUsers(data))
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser || !workDate || !hours) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/timesheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: parseInt(selectedUser),
          work_date: workDate,
          hours_worked: parseFloat(hours),
          description: description,
          created_by: 1
        })
      });
      if (!res.ok) throw new Error('Failed to log time');

      onAdd();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-white rounded shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Log Time</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Team Member</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select a user...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name || ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hours Worked</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                required
                placeholder="e.g. 2.5"
                className="w-full border border-gray-200 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes / Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What did you work on?"
              className="w-full border border-gray-200 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
            ></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="p-2 text-sm text-gray-600 hover:bg-gray-50 rounded border border-gray-200">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="p-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50">
              {isLoading ? 'Saving...' : 'Save Time Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTimeLogModal;

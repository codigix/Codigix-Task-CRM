import React, { useState, useEffect } from 'react';
import { RefreshCw, Calendar, FolderKanban, Target } from 'lucide-react';

const formatToday = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const formatTwoWeeksLater = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
};

const RenewSprintModal = ({ isOpen, sprint, onCancel, onRenew }) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(formatToday());
  const [endDate, setEndDate] = useState(formatTwoWeeksLater());
  const [goal, setGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !sprint) return;
    setName(sprint.name || '');
    setStartDate(formatToday());
    setEndDate(formatTwoWeeksLater());
    setGoal(sprint.goal || '');
    setError('');
  }, [isOpen, sprint]);

  if (!isOpen || !sprint) return null;

  const unfinishedCount = (sprint.issues || []).length;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!startDate || !endDate) {
      return setError('Please provide both Start Date and End Date.');
    }
    if (new Date(endDate) < new Date(startDate)) {
      return setError('End date cannot be earlier than start date.');
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onRenew(sprint, {
        name: name.trim() || sprint.name,
        start_date: startDate,
        end_date: endDate,
        goal: goal.trim()
      });
    } catch (err) {
      setError(err.message || 'Failed to renew sprint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-[560px] max-h-[92vh] overflow-y-auto border border-gray-200">
        
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <RefreshCw size={20} className="animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Renew Sprint</h2>
            <p className="text-xs text-gray-500">
              Assign new dates to restart this sprint with all remaining tasks.
            </p>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2.5">
              {error}
            </div>
          )}

          {/* Preserved Info Banner */}
          <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100 text-xs text-purple-900 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 font-medium">
              <FolderKanban size={14} className="text-purple-600" />
              <span>Project: <strong>{sprint.project_name || 'General Project'}</strong></span>
              <span className="text-gray-300">|</span>
              <span>Dept: <strong>{sprint.department || 'IT'}</strong></span>
            </div>
            <div className="text-gray-600">
              <strong>{unfinishedCount}</strong> unfinished work item{unfinishedCount === 1 ? '' : 's'} will automatically continue in this renewed sprint.
            </div>
          </div>

          {/* Sprint Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Sprint Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              required
            />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Calendar size={13} className="text-gray-400" />
                New Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Calendar size={13} className="text-gray-400" />
                New End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          {/* Sprint Goal */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <Target size={13} className="text-gray-400" />
              Sprint Goal (Optional)
            </label>
            <textarea
              rows={2}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What are we aiming to deliver in this sprint extension?"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-md transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw size={13} className={isSubmitting ? 'animate-spin' : ''} />
              {isSubmitting ? 'Renewing…' : 'Renew & Start Sprint'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default RenewSprintModal;

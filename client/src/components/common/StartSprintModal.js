import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const DURATIONS = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '3 weeks', days: 21 },
  { label: '4 weeks', days: 28 },
  { label: 'Custom', days: null }
];

// Local YYYY-MM-DD (not toISOString, which shifts across the UTC boundary).
const toDateInput = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toTimeInput = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const addDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return toDateInput(d);
};

/**
 * Jira's Start Sprint dialog: name, duration, start date/time, an end date derived
 * from the duration (editable only on Custom), and an optional sprint goal.
 */
const StartSprintModal = ({ isOpen, sprint, itemCount, onCancel, onStart, mode = 'start' }) => {
  const isEdit = mode === 'edit';
  const now = new Date();
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('2 weeks');
  const [startDate, setStartDate] = useState(toDateInput(now));
  const [startTime, setStartTime] = useState(toTimeInput(now));
  const [endDate, setEndDate] = useState('');
  const [goal, setGoal] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !sprint) return;
    const start = new Date();
    setName(sprint.name || '');
    setGoal(sprint.goal || '');
    setError('');

    // Editing keeps the sprint's saved dates; starting proposes today + 2 weeks.
    if (isEdit && (sprint.start_date || sprint.end_date)) {
      const s = sprint.start_date ? toDateInput(new Date(sprint.start_date)) : toDateInput(start);
      const e = sprint.end_date ? toDateInput(new Date(sprint.end_date)) : addDays(s, 14);
      setDuration('Custom');
      setStartDate(s);
      setEndDate(e);
    } else {
      setDuration('2 weeks');
      setStartDate(toDateInput(start));
      setEndDate(addDays(toDateInput(start), 14));
    }
    setStartTime(toTimeInput(start));
  }, [isOpen, sprint, isEdit]);

  // Duration drives the end date, exactly as Jira does.
  useEffect(() => {
    const chosen = DURATIONS.find(d => d.label === duration);
    if (chosen && chosen.days && startDate) {
      setEndDate(addDays(startDate, chosen.days));
    }
  }, [duration, startDate]);

  if (!isOpen || !sprint) return null;

  const isCustom = duration === 'Custom';

  const handleStart = async () => {
    if (!name.trim()) return setError('Sprint name is required.');
    if (!startDate) return setError('Start date is required.');
    if (!endDate) return setError('End date is required.');
    if (new Date(endDate) < new Date(startDate)) return setError('End date must be after the start date.');

    setIsSaving(true);
    setError('');
    try {
      await onStart({ name: name.trim(), start_date: startDate, end_date: endDate, goal: goal.trim() });
    } catch (err) {
      setError(err.message || 'Could not start the sprint.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <h2 className="text-xl font-semibold text-gray-900">{isEdit ? 'Edit Sprint' : 'Start Sprint'}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700 p-1 rounded transition">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-5 space-y-4">
          <p className="text-[13px] text-gray-700">
            <strong>{itemCount}</strong> work item{itemCount === 1 ? '' : 's'} {isEdit ? 'in this sprint.' : 'will be included in this sprint.'}
          </p>
          <p className="text-[12px] text-gray-500">
            Required fields are marked with an asterisk <span className="text-red-500">*</span>
          </p>

          {error && (
            <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
          )}

          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1">
              Sprint name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1">
              Duration <span className="text-red-500">*</span>
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] bg-white outline-none focus:border-blue-500 cursor-pointer"
            >
              {DURATIONS.map(d => <option key={d.label} value={d.label}>{d.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1">
              Start date <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-blue-500"
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-32 border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1">
              End date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={endDate}
              disabled={!isCustom}
              onChange={(e) => setEndDate(e.target.value)}
              className={`w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-blue-500 ${
                !isCustom ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
            />
            {!isCustom && (
              <p className="text-[11px] text-gray-500 mt-1">Set by the duration. Choose "Custom" to edit.</p>
            )}
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1">Sprint goal</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={4}
              placeholder="What should this sprint achieve?"
              className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-[14px] font-medium text-gray-700 hover:bg-gray-200 rounded transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={isSaving}
            className="px-5 py-2 text-[14px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
          >
            {isSaving ? (isEdit ? 'Saving…' : 'Starting…') : (isEdit ? 'Save' : 'Start')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartSprintModal;

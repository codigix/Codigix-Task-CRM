import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Clock } from 'lucide-react';
import { API_BASE_URL } from '../../config/environment';

// "2h 30m", "45m", "1.5h", "1d" (a working day = 9h) or a bare number of hours -> seconds.
const parseDuration = (text) => {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return 0;
  if (/^\d+(\.\d+)?$/.test(t)) return Math.round(parseFloat(t) * 3600);
  let total = 0; let matched = false;
  const re = /(\d+(?:\.\d+)?)\s*(d|h|m)/g;
  let m;
  while ((m = re.exec(t))) {
    matched = true;
    const n = parseFloat(m[1]);
    total += m[2] === 'd' ? n * 9 * 3600 : m[2] === 'h' ? n * 3600 : n * 60;
  }
  const leftover = t.replace(re, '').replace(/[\s,]+/g, '');
  return matched && !leftover ? Math.round(total) : 0;
};

const TimeTrackingModal = ({ isOpen, onClose, onConfirm, taskDetails }) => {
  const [estimatedTime, setEstimatedTime] = useState('');
  const [startTime, setStartTime] = useState('');
  const [error, setError] = useState('');
  const [standard, setStandard] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      setStartTime(local.toISOString().slice(0, 16));
      const existing = taskDetails?.original_estimate || taskDetails?.estimated_time || '';
      // "0h" is the empty default, not a plan.
      setEstimatedTime(parseDuration(existing) ? existing : '');
      setError('');
      setStandard(null);
      const key = taskDetails?.issue_key || taskDetails?.key;
      if (key) {
        fetch(`${API_BASE_URL}/it-kanban/issues/${encodeURIComponent(key)}/standard-size`)
          .then(r => (r.ok ? r.json() : null))
          .then(d => { if (d && d.hours) setStandard(d); })
          .catch(() => {});
      }
    }
  }, [isOpen, taskDetails]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!parseDuration(estimatedTime)) {
      setError('Enter how long this will take, e.g. 2h, 45m or 1h 30m.');
      return;
    }
    onConfirm({
      estimated_time: estimatedTime.trim(),
      start_time: new Date(startTime).toISOString()
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-[100] overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="fixed inset-0 bg-gray-600/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

        <div
          className="inline-block w-full max-w-md transform overflow-hidden rounded bg-white text-left align-middle shadow-2xl transition-all border border-gray-100 relative z-10"
        >
          <div className="relative overflow-hidden bg-red-600 px-6 py-4">
            <div className="absolute inset-0 bg-white/10 mix-blend-overlay"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded backdrop-blur-sm">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <Dialog.Title as="h3" className="text-lg  text-white">
                  Start Time Tracking
                </Dialog.Title>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-white/10 p-1 text-white hover:bg-white/20 transition-colors focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5">
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-4">
                You're moving <span className=" text-gray-800">{taskDetails?.title || 'this task'}</span> to In Progress. Please confirm your start time and estimated effort.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Time <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. 2h, 45m or 1h 30m"
                  value={estimatedTime}
                  onChange={(e) => { setEstimatedTime(e.target.value); setError(''); }}
                  aria-invalid={Boolean(error)}
                  className={`block w-full rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border transition-colors ${error ? 'border-red-400' : 'border-gray-300'}`}
                />
                {error
                  ? <p className="mt-1 text-xs text-red-600">{error}</p>
                  : <p className="mt-1 text-xs text-gray-500">
                      Required. 1d = 9h.
                      {standard && <> Standard for {standard.workType}: <button type="button" onClick={() => setEstimatedTime(`${standard.hours}h`)} className="text-blue-600 hover:underline cursor-pointer">{standard.hours} h</button>{standard.limitHours ? ` (up to ${Math.round(standard.limitHours * 100) / 100} h without approval)` : ''}.</>}
                    </p>}
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-gray-300 bg-white p-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex justify-center rounded border border-transparent bg-red-600 p-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Start Timer
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

export default TimeTrackingModal;

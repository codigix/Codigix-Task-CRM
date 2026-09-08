import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Clock } from 'lucide-react';

const TimeTrackingModal = ({ isOpen, onClose, onConfirm, taskDetails }) => {
  const [estimatedTime, setEstimatedTime] = useState('');
  const [startTime, setStartTime] = useState('');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      setStartTime(local.toISOString().slice(0, 16));
      setEstimatedTime(taskDetails?.original_estimate || taskDetails?.estimated_time || '');
    }
  }, [isOpen, taskDetails]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      estimated_time: estimatedTime,
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
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

        <div
          className="inline-block w-full max-w-md transform overflow-hidden rounded bg-white text-left align-middle shadow-2xl transition-all border border-gray-100 relative z-10"
        >
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="absolute inset-0 bg-white/10 mix-blend-overlay"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <Dialog.Title as="h3" className="text-lg font-semibold text-white">
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
                You're moving <span className="font-semibold text-gray-800">{taskDetails?.title || 'this task'}</span> to In Progress. Please confirm your start time and estimated effort.
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
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Time (e.g., 4h, 2d) - Optional
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2h 30m"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border transition-colors"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 bg-white p-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex justify-center rounded-lg border border-transparent bg-red-600 p-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
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

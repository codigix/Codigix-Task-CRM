import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

const SetReminderModal = ({ isOpen, onClose, onSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    related_to: '',
    task: '',
    due_date: '',
    time: '',
    reminder_before: '15 min',
    notes: ''
  });

  const [openPanels, setOpenPanels] = useState({
    basic: true,
    details: true
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        related_to: '',
        task: '',
        due_date: '',
        time: '',
        reminder_before: '15 min',
        notes: ''
      });
      setError('');
    }
  }, [isOpen]);

  const togglePanel = (name) => {
    setOpenPanels((p) => ({ ...p, [name]: !p[name] }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.related_to || !formData.task || !formData.due_date) {
      setError('Please fill in required fields: Related To, Task, and Due Date');
      return;
    }

    setIsLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to set reminder');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <div
        className="h-full w-full md:w-[450px] bg-white shadow-xl overflow-y-auto border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-3 border-b border-[#EAECF0] sticky top-0 bg-white z-10">
          <h2 className="text-xl text-gray-900">Set Reminder</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-[#1F2020] hover:text-red  transition-colors text-2xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="p-2 m-4 bg-red-50 border border-red-200 rounded">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <form id="set-reminder-form" onSubmit={handleSubmit} className="p-2 space-y-0">

          {/* Reminder Details Panel */}
          <div className="border-b border-[#EAECF0]">
            <button
              type="button"
              onClick={() => togglePanel('basic')}
              className="w-full text-left p-2  flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-red-500 text-white text-base">
                  ⏰
                </div>
                <span className="text-gray-900 text-xs">Reminder Details</span>
              </div>
              <ChevronDown
                size={18}
                className={`text-gray-500 transition ${openPanels.basic ? 'rotate-180' : ''}`}
              />
            </button>

            {openPanels.basic && (
              <div className="px-4 py-5 space-y-5 border-t border-[#EAECF0] bg-white">

                {/* Related To */}
                <div>
                  <label className="block text-xs text-gray-700 mb-2">
                    Related To <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="related_to"
                    value={formData.related_to}
                    onChange={handleInputChange}
                    className="w-full p-2.5 border border-[#E5E7EB] rounded text-xs bg-white focus:outline-none focus:border-red-500 transition"
                  >
                    <option value="">Select Related</option>
                    <option value="MegaCorp Ltd">MegaCorp Ltd</option>
                    <option value="ABC Pvt Ltd">ABC Pvt Ltd</option>
                    <option value="Tech Solutions">Tech Solutions</option>
                  </select>
                </div>

                {/* Task */}
                <div>
                  <label className="block text-xs text-gray-700 mb-2">
                    Task <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="task"
                    value={formData.task}
                    onChange={handleInputChange}
                    className="w-full p-2.5 border border-[#E5E7EB] rounded text-xs bg-white focus:outline-none focus:border-red-500 transition"
                  >
                    <option value="">Select Task</option>
                    <option value="Follow up with MegaCorp Ltd">Follow up with MegaCorp Ltd</option>
                    <option value="Call XYZ Enterprises">Call XYZ Enterprises</option>
                    <option value="Email proposal">Email proposal</option>
                  </select>
                </div>

                {/* Due Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-700 mb-2">
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleInputChange}
                      className="w-full p-2.5 border border-[#E5E7EB] rounded text-xs bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-700 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      className="w-full p-2.5 border border-[#E5E7EB] rounded text-xs bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                </div>

                {/* Reminder Before */}
                <div>
                  <label className="block text-xs text-gray-700 mb-2">
                    Reminder Before
                  </label>
                  <select
                    name="reminder_before"
                    value={formData.reminder_before}
                    onChange={handleInputChange}
                    className="w-full p-2.5 border border-[#E5E7EB] rounded text-xs bg-white focus:outline-none focus:border-red-500 transition"
                  >
                    <option value="15 min">15 min</option>
                    <option value="30 min">30 min</option>
                    <option value="1 hour">1 hour</option>
                    <option value="1 day">1 day</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Additional Info Panel */}
          <div className="border-b border-[#EAECF0]">
            <button
              type="button"
              onClick={() => togglePanel('details')}
              className="w-full text-left p-2  flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-red-500 text-white text-base">
                  📝
                </div>
                <span className="text-gray-900 text-xs">Additional Info</span>
              </div>
              <ChevronDown
                size={18}
                className={`text-gray-500 transition ${openPanels.details ? 'rotate-180' : ''}`}
              />
            </button>

            {openPanels.details && (
              <div className="px-4 py-5 space-y-5 border-t border-[#EAECF0] bg-white">
                <div>
                  <label className="block text-xs text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Enter notes..."
                    className="w-full p-2.5 border border-[#E5E7EB] rounded text-xs bg-white focus:outline-none focus:border-red-500 transition resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-[#EAECF0]">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="p-2 border border-gray-300 rounded text-xs  text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="p-2 bg-red-600 text-white rounded text-xs  hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? 'Setting...' : 'Set Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetReminderModal;

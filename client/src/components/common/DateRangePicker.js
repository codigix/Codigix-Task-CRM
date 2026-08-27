import React, { useState } from 'react';
import { X } from 'lucide-react';

const DateRangePicker = ({ isOpen, onClose, onDateRangeChange }) => {
  const [selectedRange, setSelectedRange] = useState('last30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  const getDateRange = (rangeType) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    switch (rangeType) {
      case 'today':
        return { start: startOfDay, end: endOfDay };
      case 'yesterday': {
        const yesterday = new Date(startOfDay);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59);
        return { start: yesterday, end: yesterdayEnd };
      }
      case 'last7': {
        const start = new Date(startOfDay);
        start.setDate(start.getDate() - 7);
        return { start, end: endOfDay };
      }
      case 'last30': {
        const start = new Date(startOfDay);
        start.setDate(start.getDate() - 30);
        return { start, end: endOfDay };
      }
      case 'thisMonth': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start, end: endOfDay };
      }
      case 'lastMonth': {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
        return { start, end };
      }
      default:
        return { start: startOfDay, end: endOfDay };
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleApply = () => {
    if (showCustomRange && customStartDate && customEndDate) {
      onDateRangeChange({
        start: new Date(customStartDate),
        end: new Date(customEndDate),
        label: `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`
      });
    } else {
      const range = getDateRange(selectedRange);
      onDateRangeChange({
        ...range,
        label: `${formatDate(range.start)} - ${formatDate(range.end)}`
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  const rangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7', label: 'Last 7 Days' },
    { value: 'last30', label: 'Last 30 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'custom', label: 'Custom Range' }
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}></div>

      <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded  shadow-xl z-50 w-80">
        <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
          <h3 className="text-xs   text-gray-900">Select Date Range</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        <div className="p-3">
          <div className="space-y-2">
            {rangeOptions.map(option => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="radio"
                  name="dateRange"
                  value={option.value}
                  checked={selectedRange === option.value && !showCustomRange}
                  onChange={() => {
                    setSelectedRange(option.value);
                    setShowCustomRange(option.value === 'custom');
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-xs  text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>

          {showCustomRange && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
              <div>
                <label className="text-xs   text-gray-700 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full p-1 .5 border border-gray-300 rounded text-xs  focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="text-xs   text-gray-700 block mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full p-1 .5 border border-gray-300 rounded text-xs  focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 border-t border-gray-200 p-3 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 p-2 text-gray-700   text-xs  border border-gray-300 rounded hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 p-2 bg-red-600 text-white   text-xs  rounded hover:bg-red-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
};

export default DateRangePicker;

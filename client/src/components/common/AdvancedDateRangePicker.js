import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

const AdvancedDateRangePicker = ({ range, onChange, initialRange = 'Today' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(initialRange);
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Left calendar
  const [startDate, setStartDate] = useState(range?.start || new Date());
  const [endDate, setEndDate] = useState(range?.end || new Date());
  const dropdownRef = useRef(null);

  // Update internal state if range prop changes
  useEffect(() => {
    if (range?.start) setStartDate(range.start);
    if (range?.end) setEndDate(range.end);
  }, [range]);

  const presets = [
    'Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Custom Range'
  ];

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetClick = (preset) => {
    setSelectedPreset(preset);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start = new Date(today);
    let end = new Date(today);
    end.setHours(23, 59, 59, 999);

    switch (preset) {
      case 'Today':
        break;
      case 'Yesterday':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'Last 7 Days':
        start.setDate(today.getDate() - 6);
        break;
      case 'Last 30 Days':
        start.setDate(today.getDate() - 29);
        break;
      case 'This Month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'Last Month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'Custom Range':
        return;
      default:
        break;
    }
    setStartDate(start);
    setEndDate(end);
    if (preset !== 'Custom Range') {
      onChange({ start, end, label: preset });
      setIsOpen(false);
    }
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const renderCalendar = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty cells for days of previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const isSelected = (startDate && d.toDateString() === startDate.toDateString()) ||
        (endDate && d.toDateString() === endDate.toDateString());
      const isInRange = startDate && endDate && d > startDate && d < endDate;

      days.push(
        <div
          key={day}
          onClick={() => {
            if (!startDate || (startDate && endDate)) {
              setStartDate(d);
              setEndDate(null);
            } else if (d < startDate) {
              setEndDate(startDate);
              setStartDate(d);
            } else {
              setEndDate(d);
            }
            setSelectedPreset('Custom Range');
          }}
          className={`h-8 w-8 flex items-center justify-center text-xs cursor-pointer rounded-full transition-colors
            ${isSelected ? 'bg-red-600 text-white' : isInRange ? 'bg-red-50 text-red ' : 'hover:bg-gray-100 text-gray-700'}
          `}
        >
          {day}
        </div>
      );
    }

    return (
      <div className="w-64">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-xs  text-gray-700">
            {date.toLocaleString('default', { month: 'short' })} {year}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="h-8 w-8 flex items-center justify-center text-xs  text-gray-400">
              {d}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Calendar size={14} className="text-gray-500" />
        <span className="">{formatDate(startDate)} - {formatDate(endDate)}</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 bg-white border border-gray-200 rounded shadow-xl z-[100] flex overflow-hidden">
          {/* Presets */}
          <div className="w-32 border-r border-gray-100 py-2">
            {presets.map(preset => (
              <button
                key={preset}
                onClick={() => handlePresetClick(preset)}
                className={`w-full text-left p-2 text-xs transition-colors
                  ${selectedPreset === preset ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'}
                `}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Calendars */}
          {selectedPreset === 'Custom Range' && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1 hover:bg-gray-100 rounded">
                  <ChevronLeft size={16} className="text-gray-400" />
                </button>
                <div className="flex gap-8">
                  {renderCalendar(currentMonth)}
                  {renderCalendar(nextMonth)}
                </div>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1 hover:bg-gray-100 rounded">
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  {startDate ? formatDate(startDate) : '__/__/__'} - {endDate ? formatDate(endDate) : '__/__/__'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-1.5 text-xs  text-gray-700 hover:bg-gray-50 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (startDate && endDate) {
                        onChange({ start: startDate, end: endDate, label: 'Custom Range' });
                        setIsOpen(false);
                      }
                    }}
                    className="px-4 py-1.5 text-xs  text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedDateRangePicker;

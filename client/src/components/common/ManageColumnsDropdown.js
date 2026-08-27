import React, { useState, useRef, useEffect } from 'react';
import { Layout, GripVertical, ChevronDown, ChevronUp, X } from 'lucide-react';

const ManageColumnsDropdown = ({ columns, visibleColumns, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const toggleColumn = (columnKey) => {
    const nextVisible = visibleColumns.includes(columnKey)
      ? visibleColumns.filter(k => k !== columnKey)
      : [...visibleColumns, columnKey];
    onChange(nextVisible);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 p-2 border rounded text-xs transition-colors
          ${isOpen ? 'bg-red-600 text-white border-red-600 ' : 'bg-white  text-red  border-gray-200 hover:bg-gray-50'}
        `}
      >
        <Layout size={14} className=" " />
        <span className="  ">Manage Columns</span>
        <ChevronDown size={14} className={`ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}  `} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded shadow-xl z-[100] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-2 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layout size={16} className="text-gray-900" />
              <h4 className="text-sm  text-gray-900">Manage Columns</h4>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          {/* List */}
          <div className="p-2 space-y-1 overflow-y-auto max-h-[300px]">
            {columns.map((col) => (
              <div
                key={col.key}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded group transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GripVertical size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                  <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">{col.label}</span>
                </div>
                <button
                  onClick={() => toggleColumn(col.key)}
                  className={`w-8 h-4 rounded-full transition-all relative ${visibleColumns.includes(col.key) ? 'bg-red-600' : 'bg-gray-200'
                    }`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${visibleColumns.includes(col.key) ? 'left-[18px]' : 'left-0.5'
                    }`} />
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
            <button
              onClick={() => onChange(columns.map(c => c.key))}
              className="flex-1 py-1.5 px-2 text-xs  text-red  hover:underline transition-colors"
            >
              Select All
            </button>
            <button
              onClick={() => onChange([])}
              className="flex-1 py-1.5 px-2 text-xs  text-gray-500 hover:underline transition-colors"
            >
              Unselect All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageColumnsDropdown;

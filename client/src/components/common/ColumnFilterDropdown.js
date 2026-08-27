import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const ColumnFilterDropdown = ({ columns, visibleColumns, onColumnsChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleColumn = (columnKey) => {
    const updatedColumns = visibleColumns.includes(columnKey)
      ? visibleColumns.filter(col => col !== columnKey)
      : [...visibleColumns, columnKey];
    onColumnsChange(updatedColumns);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded text-xs transition-colors flex items-center gap-2 border ${
          isOpen
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300'
        }`}
      >
        <span>Columns</span>
        <ChevronDown size={16} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded  shadow-lg z-10">
          <div className="p-2 border-b border-gray-100">
            <h4 className="text-xs  text-gray-700 p-1 ">Show/Hide Columns</h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {columns.map((column) => (
              <label
                key={column.key}
                className="flex items-center p-2  hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(column.key)}
                  onChange={() => toggleColumn(column.key)}
                  className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                />
                <span className="ml-3 text-xs  text-gray-700">{column.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnFilterDropdown;

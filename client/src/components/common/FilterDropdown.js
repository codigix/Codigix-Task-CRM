import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown } from 'lucide-react';

const FilterDropdown = ({ filterOptions, onFilterChange, selectedFilters }) => {
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

  const toggleFilter = (filterKey, value) => {
    const currentFilters = { ...selectedFilters };
    if (currentFilters[filterKey] === value) {
      delete currentFilters[filterKey];
    } else {
      currentFilters[filterKey] = value;
    }
    onFilterChange(currentFilters);
  };

  const activeFilterCount = Object.keys(selectedFilters).filter(key => selectedFilters[key]).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 p-2 border rounded  text-xs    transition-colors ${isOpen
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-blue-50 hover:border-blue-300'
          }`}
      >
        <Filter size={16} />
        Filter
        {activeFilterCount > 0 && (
          <span className="ml-1 p-1  bg-red-600  text-white text-xs rounded-full ">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded  shadow-xl z-50">
          <div className="p-3 border-b border-gray-200 bg-blue-50">
            <h4 className="text-xs  text-blue-900">Filter Options</h4>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {filterOptions.map((option) => (
              <div key={option.category} className="border-b border-gray-100 last:border-b-0">
                <div className="p-2  bg-gray-50">
                  <h5 className="text-xs  text-gray-700">{option.category}</h5>
                </div>
                <div className="p-2 ">
                  {option.items.map((item) => (
                    <label
                      key={item.value}
                      className="flex items-center px-2 py-2 hover:bg-blue-50 transition-colors cursor-pointer rounded mb-1 last:mb-0"
                    >
                      <input
                        type="radio"
                        name={option.category}
                        checked={selectedFilters[option.key] === item.value}
                        onChange={() => toggleFilter(option.key, item.value)}
                        className="w-4 h-4 accent-blue-500 cursor-pointer"
                      />
                      <span className="ml-2 text-xs  text-gray-700">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-gray-200 bg-gray-50 flex gap-2">
            <button
              onClick={() => {
                onFilterChange({});
                setIsOpen(false);
              }}
              className="flex-1 p-2 text-xs   text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 p-2 text-xs   text-white bg-blue-500 rounded hover:bg-red-600 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;

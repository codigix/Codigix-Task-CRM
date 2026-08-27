import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

const SearchableSelect = ({ options, value, onChange, placeholder, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col relative" ref={dropdownRef}>
      {label && <span className="text-gray-400 mb-0.5 text-xs ">{label}</span>}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 border border-gray-200 rounded text-gray-700 bg-white min-w-[140px] justify-between  focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100 relative">
            <Search size={14} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full flex items-center justify-between p-2 text-sm rounded-md transition-colors ${value === option
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <span className="truncate">{option}</span>
                  {value === option && <Check size={14} className="text-blue-600" />}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-center text-gray-500">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;

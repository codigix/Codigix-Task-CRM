import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

const SearchableSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Choose', 
  label,
  required = false,
  disabled = false,
  className = '' 
}) => {
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

  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value !== undefined ? String(opt.value) : (opt.id !== undefined ? String(opt.id) : ''),
        label: opt.label || opt.name || opt.company_name || opt.title || String(opt.value || opt.id || ''),
        sublabel: opt.sublabel || opt.company || opt.email || '',
        avatar: opt.avatar || opt.initials || '',
        raw: opt
      };
    }
    return {
      value: String(opt),
      label: String(opt),
      sublabel: '',
      avatar: '',
      raw: opt
    };
  });

  const filteredOptions = normalizedOptions.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opt.sublabel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = normalizedOptions.find(opt => opt.value === String(value)) ||
    normalizedOptions.find(opt => opt.label === String(value));

  const displayLabel = selectedOption ? selectedOption.label : '';

  return (
    <div className={`flex flex-col relative w-full ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs text-gray-700 mb-2 font-normal">
          {label}{required && <span className="text-red-500">*</span>}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 border border-gray-300 rounded text-xs bg-white text-gray-700 focus:outline-none focus:border-blue-500 transition disabled:opacity-50 text-left"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.avatar && (
            <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-medium shrink-0">
              {selectedOption.avatar}
            </div>
          )}
          <span className={`truncate ${!displayLabel ? 'text-gray-400' : 'text-gray-900'}`}>
            {displayLabel || placeholder}
          </span>
        </div>
        <ChevronDown size={14} className={`text-gray-400 shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100 relative">
            <Search size={14} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = selectedOption && selectedOption.value === opt.value;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const returnVal = opt.raw && typeof opt.raw === 'object'
                        ? (opt.raw.value !== undefined ? opt.raw.value : opt.raw.id)
                        : opt.value;
                      onChange(returnVal, opt.raw);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full flex items-center justify-between p-2 text-xs rounded transition-colors text-left ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {opt.avatar && (
                        <div className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-medium shrink-0">
                          {opt.avatar}
                        </div>
                      )}
                      <div className="truncate">
                        <div className="truncate font-medium">{opt.label}</div>
                        {opt.sublabel && <div className="text-[10px] text-gray-400 truncate">{opt.sublabel}</div>}
                      </div>
                    </div>
                    {isSelected && <Check size={14} className="text-blue-600 shrink-0 ml-2" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-xs text-center text-gray-400">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;

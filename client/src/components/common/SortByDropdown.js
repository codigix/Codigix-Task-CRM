import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, ListFilter, X } from 'lucide-react';

const SortByDropdown = ({ current, onSelect }) => {
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

  const handleSortClick = (sortValue) => {
    onSelect(sortValue);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 border border-gray-200  text-red rounded text-xs transition-colors hover:bg-red-600 hover:text-white"
      >
        <ListFilter size={14} />
        <span className="">Sort By</span>
        <ChevronDown size={14} className={`ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-xl z-[100] flex flex-col overflow-hidden">
          <button
            onClick={() => handleSortClick('newest')}
            className={`w-full text-left p-2 text-xs transition-colors
              ${current === 'newest' ? 'bg-red-50 text-red ' : 'text-gray-600 hover:bg-gray-50'}
            `}
          >
            Newest
          </button>
          <button
            onClick={() => handleSortClick('oldest')}
            className={`w-full text-left p-2 text-xs transition-colors
              ${current === 'oldest' ? 'bg-red-50 text-red ' : 'text-gray-600 hover:bg-gray-50'}
            `}
          >
            Oldest
          </button>
          <button
            onClick={() => handleSortClick('priority')}
            className={`w-full text-left p-2 text-xs transition-colors
              ${current === 'priority' ? 'bg-red-50 text-red ' : 'text-gray-600 hover:bg-gray-50'}
            `}
          >
            Priority
          </button>
        </div>
      )}
    </div>
  );
};

export default SortByDropdown;

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, FileText, FileSpreadsheet, Package } from 'lucide-react';

const ExportDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2  rounded text-xs  hover:bg-red-600 transition-colors hover:text-white "
      >
        <Package size={18} />
        Export
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded shadow-xl z-[110] py-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center gap-3 p-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <FileText size={18} className="text-gray-400" />
            Export as PDF
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center gap-3 p-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <FileSpreadsheet size={18} className="text-gray-400" />
            Export as Excel
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportDropdown;

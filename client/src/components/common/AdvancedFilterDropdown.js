import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown, ChevronUp, Search, X } from 'lucide-react';

const AdvancedFilterDropdown = ({ filterConfigs, onFilterChange, selectedFilters = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState(filterConfigs[0]?.key || null);
  const [searchTerms, setSearchTerms] = useState({});
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

  const handleCheckboxChange = (configKey, itemValue) => {
    const currentValues = selectedFilters[configKey] || [];
    let nextValues;
    if (currentValues.includes(itemValue)) {
      nextValues = currentValues.filter(v => v !== itemValue);
    } else {
      nextValues = [...currentValues, itemValue];
    }
    onFilterChange({ ...selectedFilters, [configKey]: nextValues });
  };

  const clearAll = () => {
    onFilterChange({});
  };

  const activeFilterCount = Object.values(selectedFilters).flat().length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2   border border-gray-200 rounded text-xs transition-colors hover:bg-red-600 hover:text-white  "
      >
        <Filter size={14} />
        <span className="">Filter</span>
        {activeFilterCount > 0 && (
          <span className="flex items-center justify-center w-4 h-4 bg-white text-red  text-xs rounded-full font-[500] ml-1">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown size={14} className={`ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white border border-gray-200 rounded shadow-xl z-[100] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-2 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-900" />
              <h4 className="text-sm  text-gray-900">Filter</h4>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          {/* Accordions */}
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {filterConfigs.map((config) => (
              <div key={config.key} className="border-b border-gray-50 last:border-b-0">
                <button
                  onClick={() => setOpenAccordion(openAccordion === config.key ? null : config.key)}
                  className="w-full flex items-center justify-between p-2   hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm  text-gray-700">{config.label}</span>
                  {openAccordion === config.key ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>

                {openAccordion === config.key && (
                  <div className="p-2 ">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search"
                        value={searchTerms[config.key] || ''}
                        onChange={(e) => setSearchTerms({ ...searchTerms, [config.key]: e.target.value })}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded text-xs focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                      {config.options
                        .filter(opt => !searchTerms[config.key] || opt.label.toLowerCase().includes(searchTerms[config.key].toLowerCase()))
                        .map(option => (
                          <label key={option.value} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={(selectedFilters[config.key] || []).includes(option.value)}
                              onChange={() => handleCheckboxChange(config.key, option.value)}
                              className="w-4 h-4 rounded border-gray-300 text-red  focus:ring-red-500 cursor-pointer"
                            />
                            <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">{option.label}</span>
                          </label>
                        ))}
                      <button className="text-xs text-red   hover:underline mt-2">Load More</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
            <button
              onClick={clearAll}
              className="flex-1 py-2 px-4 border border-gray-200 bg-white text-xs  text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 py-2 px-4 bg-red-600 text-white text-xs  hover:bg-red-700 rounded transition-colors"
            >
              Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilterDropdown;

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

const FilterPanel = ({ isOpen, onClose, users, onFilter, onReset }) => {
  const [expandedSections, setExpandedSections] = useState({
    name: true,
    phone: true,
    email: true,
    status: true,
  });

  const [filters, setFilters] = useState({
    names: [],
    phones: [],
    emails: [],
    statuses: [],
  });

  const [showMoreNames, setShowMoreNames] = useState(false);
  const [showMoreEmails, setShowMoreEmails] = useState(false);
  const [searchName, setSearchName] = useState('');

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleCheckboxChange = (type, value) => {
    setFilters(prev => {
      const currentArray = prev[type];
      if (currentArray.includes(value)) {
        return {
          ...prev,
          [type]: currentArray.filter(item => item !== value)
        };
      } else {
        return {
          ...prev,
          [type]: [...currentArray, value]
        };
      }
    });
  };

  const handleFilter = () => {
    onFilter(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      names: [],
      phones: [],
      emails: [],
      statuses: [],
    });
    setSearchName('');
    onReset();
  };

  const uniqueNames = [...new Set(users.map(u => u.name))].sort();
  const uniquePhones = [...new Set(users.map(u => u.phone).filter(Boolean))].sort();
  const uniqueEmails = [...new Set(users.map(u => u.email).filter(Boolean))].sort();
  const uniqueStatuses = [...new Set(users.map(u => u.status).filter(Boolean))];

  const filteredNames = uniqueNames.filter(name =>
    name.toLowerCase().includes(searchName.toLowerCase())
  );
  const displayedNames = showMoreNames ? filteredNames : filteredNames.slice(0, 10);
  const displayedEmails = showMoreEmails ? uniqueEmails : uniqueEmails.slice(0, 3);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}></div>

      <div className="absolute top-16 left-4 bg-white border border-gray-200 rounded  shadow-xl z-50 w-96 max-h-96 overflow-hidden flex flex-col">
        <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h3 className="text-xs   text-gray-900">Filter</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-3 space-y-3">
          {/* Name Filter */}
          <div className="border-b border-gray-200 pb-3">
            <button
              onClick={() => toggleSection('name')}
              className="flex items-center gap-2 w-full text-gray-900   mb-2 hover:text-gray-700"
            >
              {expandedSections.name ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span className="text-xs ">Name</span>
            </button>
            {expandedSections.name && (
              <div className="space-y-2 ml-6">
                <div className="relative mb-2">
                  <svg className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#1F2020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs w-full focus:outline-none focus:border-red-500"
                  />
                </div>
                {displayedNames.map(name => {
                  const user = users.find(u => u.name === name);
                  return (
                    <label key={name} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filters.names.includes(name)}
                        onChange={() => handleCheckboxChange('names', name)}
                        className="w-3 h-3 cursor-pointer"
                      />
                      {user?.avatar && (
                        <img src={user.avatar} alt={name} className="w-5 h-5 rounded-full" />
                      )}
                      <span className="text-xs text-gray-700 flex-1 truncate">{name}</span>
                    </label>
                  );
                })}
                {filteredNames.length > 10 && (
                  <button
                    onClick={() => setShowMoreNames(!showMoreNames)}
                    className="text-red  text-xs   hover:text-red-700 mt-1"
                  >
                    {showMoreNames ? 'Show Less' : 'Load More'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Phone Filter */}
          <div className="border-b border-gray-200 pb-3">
            <button
              onClick={() => toggleSection('phone')}
              className="flex items-center gap-2 w-full text-gray-900   mb-2 hover:text-gray-700"
            >
              {expandedSections.phone ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span className="text-xs ">Phone</span>
            </button>
            {expandedSections.phone && (
              <div className="space-y-2 ml-6">
                {uniquePhones.map(phone => (
                  <label key={phone} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={filters.phones.includes(phone)}
                      onChange={() => handleCheckboxChange('phones', phone)}
                      className="w-3 h-3 cursor-pointer"
                    />
                    <span className="text-xs text-gray-700">{phone}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Email Filter */}
          <div className="border-b border-gray-200 pb-3">
            <button
              onClick={() => toggleSection('email')}
              className="flex items-center gap-2 w-full text-gray-900   mb-2 hover:text-gray-700"
            >
              {expandedSections.email ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span className="text-xs ">Email</span>
            </button>
            {expandedSections.email && (
              <div className="space-y-2 ml-6">
                {displayedEmails.map(email => (
                  <label key={email} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={filters.emails.includes(email)}
                      onChange={() => handleCheckboxChange('emails', email)}
                      className="w-3 h-3 cursor-pointer"
                    />
                    <span className="text-xs text-gray-700 truncate">{email}</span>
                  </label>
                ))}
                {uniqueEmails.length > 3 && (
                  <button
                    onClick={() => setShowMoreEmails(!showMoreEmails)}
                    className="text-red  text-xs   hover:text-red-700 mt-1"
                  >
                    {showMoreEmails ? 'Show Less' : 'Load More'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <button
              onClick={() => toggleSection('status')}
              className="flex items-center gap-2 w-full text-gray-900   mb-2 hover:text-gray-700"
            >
              {expandedSections.status ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span className="text-xs ">Status</span>
            </button>
            {expandedSections.status && (
              <div className="space-y-2 ml-6">
                {uniqueStatuses.map(status => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={filters.statuses.includes(status)}
                      onChange={() => handleCheckboxChange('statuses', status)}
                      className="w-3 h-3 cursor-pointer"
                    />
                    <span className={`text-xs   ${status === 'Active' ? 'text-green-600' : 'text-red '
                      }`}>
                      {status}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="bg-white border-t border-gray-200 p-3 flex gap-2">
          <button
            onClick={handleReset}
            className="flex-1 p-2 text-gray-700   text-xs  border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleFilter}
            className="flex-1 p-2 bg-red-600 text-white   text-xs  rounded hover:bg-red-700 transition-colors"
          >
            Filter
          </button>
        </div>
      </div>
    </>
  );
};

export default FilterPanel;

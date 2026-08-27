import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

const DeleteRequestFilterPanel = ({ isOpen, onClose, requests, onFilter, onReset }) => {
  const [expandedSections, setExpandedSections] = useState({
    status: true,
    user: true,
  });

  const [filters, setFilters] = useState({
    statuses: [],
    users: [],
  });

  const [searchUser, setSearchUser] = useState('');
  const [showMoreUsers, setShowMoreUsers] = useState(false);

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
      statuses: [],
      users: [],
    });
    setSearchUser('');
    onReset();
  };

  const uniqueStatuses = [...new Set(requests.map(r => r.status).filter(Boolean))];
  const uniqueUsers = [...new Set(requests.map(r => r.first_name).filter(Boolean))].sort();

  const filteredUsers = uniqueUsers.filter(user =>
    user.toLowerCase().includes(searchUser.toLowerCase())
  );
  const displayedUsers = showMoreUsers ? filteredUsers : filteredUsers.slice(0, 10);

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
          {/* Status Filter */}
          <div className="border-b border-gray-200 pb-3">
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
                      className="w-3 h-3 cursor-pointer accent-blue-500"
                    />
                    <span className={`text-xs   ${status === 'Approved' ? 'text-green-600' :
                        status === 'Rejected' ? 'text-red ' :
                          'text-yellow-600'
                      }`}>
                      {status}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* User Filter */}
          <div>
            <button
              onClick={() => toggleSection('user')}
              className="flex items-center gap-2 w-full text-gray-900   mb-2 hover:text-gray-700"
            >
              {expandedSections.user ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span className="text-xs ">User Name</span>
            </button>
            {expandedSections.user && (
              <div className="space-y-2 ml-6">
                <div className="relative mb-2">
                  <svg className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#1F2020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search user"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs w-full focus:outline-none focus:border-blue-500"
                  />
                </div>
                {displayedUsers.map(user => {
                  const userData = requests.find(r => r.first_name === user);
                  return (
                    <label key={user} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filters.users.includes(user)}
                        onChange={() => handleCheckboxChange('users', user)}
                        className="w-3 h-3 cursor-pointer accent-blue-500"
                      />
                      {userData?.avatar && (
                        <img src={userData.avatar || `https://i.pravatar.cc/20?u=${userData.email}`} alt={user} className="w-5 h-5 rounded-full" />
                      )}
                      <span className="text-xs text-gray-700 flex-1 truncate">{user}</span>
                    </label>
                  );
                })}
                {filteredUsers.length > 10 && (
                  <button
                    onClick={() => setShowMoreUsers(!showMoreUsers)}
                    className="text-white  text-xs   hover:text-blue-700 mt-1"
                  >
                    {showMoreUsers ? 'Show Less' : 'Load More'}
                  </button>
                )}
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
            className="flex-1 p-2 bg-red-600  text-white   text-xs  rounded hover:bg-blue-700 transition-colors"
          >
            Filter
          </button>
        </div>
      </div>
    </>
  );
};

export default DeleteRequestFilterPanel;

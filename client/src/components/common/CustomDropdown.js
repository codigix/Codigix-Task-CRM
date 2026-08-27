import React, { useState } from 'react';

const CustomDropdown = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded text-xs  transition-colors flex items-center gap-2 border-1 ${
          isOpen
            ? 'bg-red-500 text-white border-red-500'
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-red-500 hover:text-white hover:border-red-500'
        }`}
      >
        {value}
        
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded  shadow-lg z-10 animate-fadeIn">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`w-full text-left p-2 text-xs hover:bg-gray-100 transition-colors ${
                value === option ? 'text-red-500   bg-red-50' : 'text-gray-700'
              } first:rounded-t-lg last:rounded-b-lg`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;

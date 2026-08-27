import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2, Eye, Download, RotateCcw } from 'lucide-react';

const PaymentActionDropdown = ({ payment, onEdit, onDelete, onView, onDownload, onRefund }) => {
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

  const handleEdit = () => {
    onEdit(payment);
    setIsOpen(false);
  };

  const handleView = () => {
    onView(payment);
    setIsOpen(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete this payment? This action cannot be undone.`)) {
      onDelete(payment.id);
      setIsOpen(false);
    }
  };

  const handleDownload = () => {
    onDownload(payment);
    setIsOpen(false);
  };

  const handleRefund = () => {
    if (window.confirm(`Are you sure you want to refund this payment?`)) {
      onRefund(payment);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="text-[#1F2020] hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded  transition flex-shrink-0 text-lg leading-none"
      >
        ⋮
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-[#E5E7EB] rounded  shadow-lg z-20">
          <button
            onClick={handleView}
            className="w-full flex items-center gap-2 p-2  text-xs  text-gray-700 hover:bg-gray-50 transition border-b border-[#E5E7EB]"
          >
            <Eye size={14} strokeWidth={2} />
            View Details
          </button>
          <button
            onClick={handleEdit}
            className="w-full flex items-center gap-2 p-2  text-xs  text-gray-700 hover:bg-gray-50 transition border-b border-[#E5E7EB]"
          >
            <Edit2 size={14} strokeWidth={2} />
            Edit Payment
          </button>
          <button
            onClick={handleDownload}
            className="w-full flex items-center gap-2 p-2  text-xs  text-gray-700 hover:bg-gray-50 transition border-b border-[#E5E7EB]"
          >
            <Download size={14} strokeWidth={2} />
            Download Receipt
          </button>

          {payment.status !== 'Refunded' && (
            <button
              onClick={handleRefund}
              className="w-full flex items-center gap-2 p-2  text-xs  text-orange-600 hover:bg-orange-50 transition border-b border-[#E5E7EB]"
            >
              <RotateCcw size={14} strokeWidth={2} />
              Mark as Refunded
            </button>
          )}

          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2 p-2  text-xs  text-red  hover:bg-red-50 transition"
          >
            <Trash2 size={14} strokeWidth={2} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentActionDropdown;

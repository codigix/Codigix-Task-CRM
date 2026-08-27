import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2, Eye, CheckCircle, AlertCircle, XCircle, Printer, Send } from 'lucide-react';

const InvoiceActionDropdown = ({ invoice, onEdit, onDelete, onPreview, onStatusChange, onPrint, onSend }) => {
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
    onEdit(invoice);
    setIsOpen(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}?`)) {
      onDelete(invoice.id);
      setIsOpen(false);
    }
  };

  const handlePreview = () => {
    onPreview(invoice);
    setIsOpen(false);
  };

  const handleStatusChange = (status) => {
    onStatusChange(invoice.id, status);
    setIsOpen(false);
  };

  const handlePrint = () => {
    onPrint(invoice);
    setIsOpen(false);
  };

  const handleSend = () => {
    onSend(invoice);
    setIsOpen(false);
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
            onClick={handlePreview}
            className="w-full flex items-center gap-2 p-2  text-xs  text-gray-700 hover:bg-gray-50 transition border-b border-[#E5E7EB]"
          >
            <Eye size={14} strokeWidth={2} />
            View Invoices
          </button>
          <button
            onClick={handleEdit}
            className="w-full flex items-center gap-2 p-2  text-xs  text-gray-700 hover:bg-gray-50 transition border-b border-[#E5E7EB]"
          >
            <Edit2 size={14} strokeWidth={2} />
            Edit
          </button>
          <button
            onClick={handlePrint}
            className="w-full flex items-center gap-2 p-2  text-xs  text-gray-700 hover:bg-gray-50 transition border-b border-[#E5E7EB]"
          >
            <Printer size={14} strokeWidth={2} />
            Print
          </button>

          <div className="border-t border-[#E5E7EB] py-1">
            <div className="px-4 py-1.5 text-xs  text-gray-600">Mark as</div>
            <button
              onClick={() => handleStatusChange('Paid')}
              className="w-full flex items-center gap-2 p-2  text-xs  text-gray-700 hover:bg-green-50 transition"
            >
              <CheckCircle size={14} strokeWidth={2} className="text-green-600" />
              Mark as Paid
            </button>
            <button
              onClick={() => handleStatusChange('Partially Paid')}
              className="w-full flex items-center gap-2 p-2  text-xs  text-gray-700 hover:bg-yellow-50 transition"
            >
              <AlertCircle size={14} strokeWidth={2} className="text-yellow-600" />
              Mark as Partially Paid
            </button>
            <button
              onClick={() => handleStatusChange('Unpaid')}
              className="w-full flex items-center gap-2 p-2  text-xs  text-gray-700 hover:bg-orange-50 transition border-b border-[#E5E7EB]"
            >
              <XCircle size={14} strokeWidth={2} className="text-orange-600" />
              Mark as Unpaid
            </button>
          </div>

          <button
            onClick={handleSend}
            className="w-full flex items-center gap-2 p-2  text-xs  text-gray-700 hover:bg-gray-50 transition border-b border-[#E5E7EB]"
          >
            <Send size={14} strokeWidth={2} />
            Send to
          </button>

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

export default InvoiceActionDropdown;

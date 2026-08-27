import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { invoicesAPI, paymentsAPI } from '../../services/api';

const AddNewPaymentModal = ({ isOpen, onClose, onSubmit, invoices = [], companies = [] }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [invoiceDropdownOpen, setInvoiceDropdownOpen] = useState(false);
  const [searchInvoice, setSearchInvoice] = useState('');

  const [formData, setFormData] = useState({
    invoiceIds: [],
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    amountReceived: '',
    referenceNo: '',
    paymentStatus: 'Completed',
    notes: '',
  });

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch =
      (inv.invoice_number || '').toLowerCase().includes(searchInvoice.toLowerCase()) ||
      (inv.company_name || '').toLowerCase().includes(searchInvoice.toLowerCase());
    const isNotSelected = !formData.invoiceIds.includes(inv.id);
    return matchesSearch && isNotSelected && (inv.status === 'Unpaid' || inv.status === 'Partially Paid' || inv.status === 'Overdue');
  });

  const getSelectedInvoicesData = () => {
    return invoices.filter(inv => formData.invoiceIds.includes(inv.id));
  };

  const calculateTotalAmount = () => {
    return getSelectedInvoicesData().reduce((sum, inv) => {
      const outstanding = inv.total - (inv.paid_amount || 0) || inv.total;
      return sum + outstanding;
    }, 0);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleInvoiceSelection = (invoiceId) => {
    setFormData(prev => ({
      ...prev,
      invoiceIds: prev.invoiceIds.includes(invoiceId)
        ? prev.invoiceIds.filter(id => id !== invoiceId)
        : [...prev.invoiceIds, invoiceId]
    }));
  };

  const removeInvoice = (invoiceId) => {
    setFormData(prev => ({
      ...prev,
      invoiceIds: prev.invoiceIds.filter(id => id !== invoiceId)
    }));
  };

  const formatCurrency = (value, currency = 'INR') => {
    if (!value) return '₹0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(num);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.invoiceIds.length === 0) {
      setError('Please select at least one invoice');
      return;
    }

    if (!formData.amountReceived || parseFloat(formData.amountReceived) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      if (onSubmit) {
        await onSubmit({
          ...formData,
          amountReceived: parseFloat(formData.amountReceived)
        });
      }
      handleCancel();
    } catch (err) {
      setError(err.message || 'Failed to record payment');
      console.error('Form submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      invoiceIds: [],
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      amountReceived: '',
      referenceNo: '',
      paymentStatus: 'Completed',
      notes: '',
    });
    setSearchInvoice('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const selectedInvoicesData = getSelectedInvoicesData();
  const totalOutstanding = calculateTotalAmount();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={handleCancel}>
      <div
        className="h-full w-full md:w-[75%] lg:w-[60%] xl:w-[55%] bg-white shadow-xl overflow-y-auto border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-2 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl  text-gray-900">Record Payment</h2>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="text-[#1F2020] hover:text-red  transition-colors text-2xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="p-2 m-4 bg-red-50 border border-red-200 rounded ">
            <p className="text-xs  text-red-700  ">{error}</p>
          </div>
        )}

        <form id="add-payment-form" onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Select Invoices Section */}
          <div>
            <label className="block text-xs   text-gray-900 mb-3">
              Related Invoice(s) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setInvoiceDropdownOpen(!invoiceDropdownOpen)}
                className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition text-left flex items-center justify-between"
              >
                <span className="text-gray-600">
                  {selectedInvoicesData.length > 0
                    ? `${selectedInvoicesData.length} invoice(s) selected`
                    : 'Select Invoice(s)'}
                </span>
                <span className="text-[#1F2020]">▼</span>
              </button>

              {invoiceDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded  shadow-lg z-10 max-h-64 overflow-y-auto">
                  <div className="p-2 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Search invoices..."
                      value={searchInvoice}
                      onChange={(e) => setSearchInvoice(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded text-xs  focus:outline-none focus:border-red-500"
                    />
                  </div>
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map(inv => (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => toggleInvoiceSelection(inv.id)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={formData.invoiceIds.includes(inv.id)}
                            readOnly
                            className="mt-1 w-4 h-4"
                          />
                          <div className="flex-1">
                            <div className="text-xs    text-gray-900">{inv.invoice_number}</div>
                            <div className="text-xs text-gray-600">{inv.company_name}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              Total: {formatCurrency(inv.total, inv.currency)} | Outstanding: {formatCurrency(inv.total - (inv.paid_amount || 0), inv.currency)}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-xs text-gray-500 text-center">
                      No unpaid invoices found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Selected Invoices Summary */}
          {selectedInvoicesData.length > 0 && (
            <div className="bg-gray-50 rounded  p-2 space-y-3">
              <h4 className="text-xs   text-gray-900">Selected Invoices:</h4>
              {selectedInvoicesData.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                  <div>
                    <p className="text-xs    text-gray-900">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-600">{inv.company_name}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Outstanding: <span className=" text-red ">{formatCurrency(inv.total - (inv.paid_amount || 0), inv.currency)}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeInvoice(inv.id)}
                    className="text-red-500 hover:text-red-700 text-lg"
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs  text-gray-600">Total Outstanding Amount:</p>
                <p className="text-lg  text-red ">{formatCurrency(totalOutstanding)}</p>
              </div>
            </div>
          )}

          {/* Payment Date */}
          <div>
            <label className="block text-xs   text-gray-900 mb-3">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="paymentDate"
              value={formData.paymentDate}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
            />
          </div>

          {/* Payment Method & Amount */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs   text-gray-900 mb-3">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition appearance-none"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                  <option value="Digital Wallet">Digital Wallet</option>
                  <option value="Cryptocurrency">Cryptocurrency</option>
                </select>
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#1F2020] pointer-events-none">▼</span>
              </div>
            </div>
            <div>
              <label className="block text-xs   text-gray-900 mb-3">
                Amount Received <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="amountReceived"
                value={formData.amountReceived}
                onChange={handleInputChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
              />
            </div>
          </div>

          {/* Reference & Status */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs   text-gray-900 mb-3">Reference / Transaction ID</label>
              <input
                type="text"
                name="referenceNo"
                value={formData.referenceNo}
                onChange={handleInputChange}
                placeholder="e.g., TXN-123456, Cheque #789"
                className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs   text-gray-900 mb-3">Payment Status</label>
              <div className="relative">
                <select
                  name="paymentStatus"
                  value={formData.paymentStatus}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition appearance-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Failed">Failed</option>
                </select>
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#1F2020] pointer-events-none">▼</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs   text-gray-900 mb-3">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Enter any additional notes about this payment"
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="p-2  border border-gray-300 rounded  text-xs    text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || selectedInvoicesData.length === 0}
              className="p-2  bg-red-600 hover:bg-red-700 rounded  text-xs   text-white transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Recording Payment...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNewPaymentModal;

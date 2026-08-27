import React, { useState } from 'react';
import { Plus, X, Bold, Italic, Underline, LinkIcon, List, AlignLeft } from 'lucide-react';

const AddNewInvoiceModal = ({ isOpen, onClose, onSubmit, companies = [], projects = [] }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    client: '',
    billTo: '',
    shipTo: '',
    project: '',
    currency: 'INR',
    date: new Date().toISOString().split('T')[0],
    openTill: '',
    paymentMethod: '',
    status: 'Draft',
    notes: '',
    termsConditions: '',
    lineItems: [
      { id: 1, item_name: '', description: '', quantity: 1, rate: 0, discount_percent: 0, tax_percent: 0 }
    ],
    bankDetails: '',
    companyDetails: '',
  });

  const [nextItemId, setNextItemId] = useState(2);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLineItemChange = (itemId, field, value) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item =>
        item.id === itemId ? { ...item, [field]: field === 'quantity' || field === 'rate' || field.includes('percent') ? parseFloat(value) || 0 : value } : item
      )
    }));
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { id: nextItemId, item_name: '', description: '', quantity: 1, rate: 0, discount_percent: 0, tax_percent: 0 }]
    }));
    setNextItemId(nextItemId + 1);
  };

  const removeLineItem = (itemId) => {
    if (formData.lineItems.length > 1) {
      setFormData(prev => ({
        ...prev,
        lineItems: prev.lineItems.filter(item => item.id !== itemId)
      }));
    }
  };

  const calculateLineItemTotal = (item) => {
    const subtotal = item.quantity * item.rate;
    const discountAmount = subtotal * (item.discount_percent / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (item.tax_percent / 100);
    return taxableAmount + taxAmount;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    formData.lineItems.forEach(item => {
      const itemSubtotal = item.quantity * item.rate;
      const itemDiscount = itemSubtotal * (item.discount_percent / 100);
      const itemTaxableAmount = itemSubtotal - itemDiscount;
      const itemTax = itemTaxableAmount * (item.tax_percent / 100);

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;
    });

    const total = subtotal - totalDiscount + totalTax;
    return { subtotal, totalDiscount, totalTax, total };
  };

  const { subtotal, totalDiscount, totalTax, total } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.client || !formData.billTo) {
      setError('Please fill in required fields: Client and Bill To');
      return;
    }

    if (formData.lineItems.filter(item => item.item_name && item.rate > 0).length === 0) {
      setError('Please add at least one line item with a name and rate');
      return;
    }

    setIsLoading(true);
    try {
      if (onSubmit) {
        await onSubmit({
          ...formData,
          amount: total,
          total: total,
          subtotal,
          discount: totalDiscount,
          tax: totalTax,
          items: formData.lineItems
        });
      }
      handleCancel();
    } catch (err) {
      setError(err.message || 'Failed to create invoice');
      console.error('Form submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      client: '',
      billTo: '',
      shipTo: '',
      project: '',
      currency: 'INR',
      date: new Date().toISOString().split('T')[0],
      openTill: '',
      paymentMethod: '',
      status: 'Draft',
      notes: '',
      termsConditions: '',
      lineItems: [
        { id: 1, item_name: '', description: '', quantity: 1, rate: 0, discount_percent: 0, tax_percent: 0 }
      ],
      bankDetails: '',
      companyDetails: '',
    });
    setNextItemId(2);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={handleCancel}>
      <div
        className="h-full w-full md:w-[80%] lg:w-[70%] xl:w-[65%] bg-white shadow-xl overflow-y-auto border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-2 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl  text-gray-900">Add New Invoice</h2>
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

        <form id="add-invoice-form" onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Client Section */}
          <div>
            <label className="block text-xs   text-gray-900 mb-3">Client</label>
            <div className="relative">
              <select
                name="client"
                value={formData.client}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition appearance-none"
              >
                <option value="">Select</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.company_name}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#1F2020] pointer-events-none">▼</span>
            </div>
            <button type="button" className="text-red-500 text-xs    hover:text-red-700 mt-2 flex items-center gap-1">
              <Plus size={16} /> Add New
            </button>
          </div>

          {/* Bill To & Ship To */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs   text-gray-900 mb-3">
                Bill To <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="billTo"
                value={formData.billTo}
                onChange={handleInputChange}
                placeholder="Enter billing address"
                className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs   text-gray-900 mb-3">
                Ship To <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="shipTo"
                value={formData.shipTo}
                onChange={handleInputChange}
                placeholder="Enter shipping address"
                className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
              />
            </div>
          </div>

          {/* Project Section */}
          <div>
            <label className="block text-xs   text-gray-900 mb-3">Project</label>
            <div className="relative">
              <select
                name="project"
                value={formData.project}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition appearance-none"
              >
                <option value="">Select Project</option>
                {projects.length > 0 ? (
                  projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.project_name || project.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No projects available</option>
                )}
              </select>
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#1F2020] pointer-events-none">▼</span>
            </div>
            <button type="button" className="text-red-500 text-xs    hover:text-red-700 mt-2 flex items-center gap-1">
              <Plus size={16} /> Add New
            </button>
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs   text-gray-900 mb-3">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs   text-gray-900 mb-3">
                Currency <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition appearance-none"
                >
                  <option value="">Select</option>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#1F2020] pointer-events-none">▼</span>
              </div>
            </div>
          </div>

          {/* Date & Open Till */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs   text-gray-900 mb-3">Date</label>
              <input
                type="text"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                placeholder="dd/mm/yyyy"
                className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs   text-gray-900 mb-3">
                Open Till <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="openTill"
                value={formData.openTill}
                onChange={handleInputChange}
                placeholder="dd/mm/yyyy"
                className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
              />
            </div>
          </div>

          {/* Payment Method & Status */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs   text-gray-900 mb-3">Payment Method</label>
              <div className="relative">
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition appearance-none"
                >
                  <option value="">Select</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                </select>
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#1F2020] pointer-events-none">▼</span>
              </div>
            </div>
            <div>
              <label className="block text-xs   text-gray-900 mb-3">Status</label>
              <div className="relative">
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition appearance-none"
                >
                  <option value="">Select</option>
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#1F2020] pointer-events-none">▼</span>
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div>
            <label className="block text-xs   text-gray-900 mb-3">
              Line Items <span className="text-red-500">*</span>
            </label>
            <div className="border border-gray-300 rounded  overflow-x-auto">
              <table className="w-full text-xs ">
                <thead className="bg-gray-50 border-b border-gray-300">
                  <tr>
                    <th className="p-2 text-left  text-gray-700">Item/Service</th>
                    <th className="p-2 text-left  text-gray-700">Qty</th>
                    <th className="p-2 text-left  text-gray-700">Rate</th>
                    <th className="p-2 text-left  text-gray-700">Discount %</th>
                    <th className="p-2 text-left  text-gray-700">Tax %</th>
                    <th className="p-2 text-right  text-gray-700">Total</th>
                    <th className="p-2 text-center  text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.lineItems.map((item, idx) => {
                    const itemTotal = calculateLineItemTotal(item);
                    return (
                      <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.item_name}
                            onChange={(e) => handleLineItemChange(item.id, 'item_name', e.target.value)}
                            placeholder="Item/Service name"
                            className="w-full p-1  border border-gray-300 rounded text-xs focus:outline-none focus:border-red-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(item.id, 'quantity', e.target.value)}
                            min="1"
                            className="w-16 p-1  border border-gray-300 rounded text-xs focus:outline-none focus:border-red-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleLineItemChange(item.id, 'rate', e.target.value)}
                            min="0"
                            step="0.01"
                            className="w-20 p-1  border border-gray-300 rounded text-xs focus:outline-none focus:border-red-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.discount_percent}
                            onChange={(e) => handleLineItemChange(item.id, 'discount_percent', e.target.value)}
                            min="0"
                            max="100"
                            className="w-16 p-1  border border-gray-300 rounded text-xs focus:outline-none focus:border-red-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.tax_percent}
                            onChange={(e) => handleLineItemChange(item.id, 'tax_percent', e.target.value)}
                            min="0"
                            max="100"
                            className="w-16 p-1  border border-gray-300 rounded text-xs focus:outline-none focus:border-red-500"
                          />
                        </td>
                        <td className="p-2 text-right  text-gray-900">
                          {itemTotal.toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLineItem(item.id)}
                            disabled={formData.lineItems.length === 1}
                            className="text-red-500 hover:text-red-700 disabled:text-gray-300 text-lg disabled:cursor-not-allowed"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={addLineItem}
              className="mt-3 text-red  hover:text-red-700 text-xs    flex items-center gap-1"
            >
              <Plus size={16} /> Add Line Item
            </button>
          </div>

          {/* Summary Section */}
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-right">
                <p className="text-xs  text-gray-600">Subtotal:</p>
                <p className="text-md  text-gray-900">₹{subtotal.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs  text-gray-600">Discount:</p>
                <p className="text-lg  text-red ">-₹{totalDiscount.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs  text-gray-600">Tax:</p>
                <p className="text-md  text-gray-900">+₹{totalTax.toFixed(2)}</p>
              </div>
              <div className="text-right bg-red-50 p-3 rounded ">
                <p className="text-xs  text-gray-600">Total:</p>
                <p className="text-2xl  text-red ">₹{total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Company Details & Bank Details */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs   text-gray-900 mb-3">Company Details</label>
              <textarea
                name="companyDetails"
                value={formData.companyDetails}
                onChange={handleInputChange}
                placeholder="Your company name, address, etc."
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition resize-none"
              />
            </div>
            <div>
              <label className="block text-xs   text-gray-900 mb-3">Bank/Payment Details</label>
              <textarea
                name="bankDetails"
                value={formData.bankDetails}
                onChange={handleInputChange}
                placeholder="Bank name, account number, SWIFT code, etc."
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition resize-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs   text-gray-900 mb-3">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Enter any additional notes"
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition resize-none"
            />
          </div>

          {/* Terms & Conditions */}
          <div>
            <label className="block text-xs   text-gray-900 mb-3">Terms & Conditions</label>
            <textarea
              name="termsConditions"
              value={formData.termsConditions}
              onChange={handleInputChange}
              placeholder="Enter terms and conditions"
              rows="3"
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
              disabled={isLoading}
              className="p-2  bg-red-600 hover:bg-red-700 rounded  text-xs   text-white transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNewInvoiceModal;

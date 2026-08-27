import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

const AddNewCompanyPlanModal = ({ isOpen, onClose, onSubmit }) => {
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const modules = [
    'Contacts',
    'Companies',
    'Deals',
    'Leads',
    'Pipelines',
    'Projects',
    'Tasks',
    'Campaigns',
    'Contracts',
    'Estimations',
    'Proposals',
    'Invoices',
    'Payments',
    'Activities',
    'Analytics',
    'Reports',
  ];

  const [formData, setFormData] = useState({
    logo: null,
    logoPreview: null,
    planName: '',
    planType: 'Select',
    planPosition: 'Select',
    planCurrency: 'Select',
    planCurrencyFree: 'Select',
    discountType: 'Select',
    discount: '',
    limitationsInvoices: '',
    maxCustomers: '',
    product: '',
    supplier: '',
    planModules: modules.reduce((acc, module) => {
      acc[module] = false;
      return acc;
    }, {}),
    selectAll: false,
    accessTrial: false,
    trialDays: 'Select',
    status: 'Select',
  });

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: e.target.checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleModuleChange = (module) => {
    const updated = {
      ...formData,
      planModules: {
        ...formData.planModules,
        [module]: !formData.planModules[module],
      },
    };

    const allChecked = modules.every((m) => updated.planModules[m]);
    updated.selectAll = allChecked;

    setFormData(updated);
  };

  const handleSelectAll = () => {
    const newSelectAll = !formData.selectAll;
    const updatedModules = modules.reduce((acc, module) => {
      acc[module] = newSelectAll;
      return acc;
    }, {});

    setFormData((prev) => ({
      ...prev,
      selectAll: newSelectAll,
      planModules: updatedModules,
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          logo: file,
          logoPreview: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.planName || formData.planType === 'Select') {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
      handleCancel();
    } catch (err) {
      setError(err.message || 'Failed to create plan');
      console.error('Form submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      logo: null,
      logoPreview: null,
      planName: '',
      planType: 'Select',
      planPosition: 'Select',
      planCurrency: 'Select',
      planCurrencyFree: 'Select',
      discountType: 'Select',
      discount: '',
      limitationsInvoices: '',
      maxCustomers: '',
      product: '',
      supplier: '',
      planModules: modules.reduce((acc, module) => {
        acc[module] = false;
        return acc;
      }, {}),
      selectAll: false,
      accessTrial: false,
      trialDays: 'Select',
      status: 'Select',
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/20"
      onClick={handleCancel}
    >
      <div
        className="h-full w-full md:w-[72%] lg:w-[60%] xl:w-[55%] bg-white shadow-xl overflow-y-auto border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-2 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl  text-gray-900">
            Add New Company
          </h2>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="text-[#1F2020] hover:text-red  transition-colors text-2xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-2 m-4 bg-red-50 border border-red-200 rounded ">
            <p className="text-xs  text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6">
          {/* Logo Upload */}
          <div className="mb-6">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded  border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                {formData.logoPreview ? (
                  <img
                    src={formData.logoPreview}
                    alt="Plan logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg
                    className="w-8 h-8 text-[#1F2020]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="bg-red-500 hover:bg-red-600 text-white p-2  rounded  text-xs    flex items-center gap-2 transition-colors"
                >
                  <Upload size={16} />
                  Upload file
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  JPG, GIF or PNG. Max size of 800K
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Top Row: Plan Name, Plan Type */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
              <label className="block text-xs    text-gray-700 mb-1">
                Plan Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="planName"
                value={formData.planName}
                onChange={handleInputChange}
                placeholder="Enter plan name"
                className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs    text-gray-700 mb-1">
                Plan Type <span className="text-red-500">*</span>
              </label>
              <select
                name="planType"
                value={formData.planType}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-gray-400"
              >
                <option>Select</option>
                <option>Monthly</option>
                <option>Yearly</option>
                <option>Lifetime</option>
              </select>
            </div>
          </div>

          {/* Plan Position, Plan Currency */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
              <label className="block text-xs    text-gray-700 mb-1">
                Plan Position
              </label>
              <select
                name="planPosition"
                value={formData.planPosition}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-gray-400"
              >
                <option>Select</option>
                <option>Premium</option>
                <option>Standard</option>
                <option>Basic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs    text-gray-700 mb-1">
                Plan Currency <span className="text-red-500">*</span>
              </label>
              <select
                name="planCurrency"
                value={formData.planCurrency}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-gray-400"
              >
                <option>Select</option>
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
                <option>INR</option>
              </select>
            </div>
          </div>

          {/* Plan Currency (Free), Discount Type, Discount */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div>
              <label className="block text-xs    text-gray-700 mb-1">
                Plan Currency
              </label>
              <div className="flex gap-2">
                <select
                  name="planCurrencyFree"
                  value={formData.planCurrencyFree}
                  onChange={handleInputChange}
                  className="flex-1 p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-gray-400"
                >
                  <option>Select</option>
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                  <option>INR</option>
                </select>
                <span className="text-xs text-red-500 flex items-center whitespace-nowrap">
                  ● Set 0 for free
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs    text-gray-700 mb-1">
                Discount Type
              </label>
              <select
                name="discountType"
                value={formData.discountType}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-gray-400"
              >
                <option>Select</option>
                <option>Percentage</option>
                <option>Fixed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs    text-gray-700 mb-1">
                Discount
              </label>
              <input
                type="text"
                name="discount"
                value={formData.discount}
                onChange={handleInputChange}
                placeholder="Enter discount"
                className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-gray-400"
              />
            </div>
          </div>

          {/* Limitations Invoices, Max Customers, Product, Supplier */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <div>
              <label className="block text-xs    text-gray-700 mb-1">
                Limitations Invoices
              </label>
              <input
                type="text"
                name="limitationsInvoices"
                value={formData.limitationsInvoices}
                onChange={handleInputChange}
                placeholder="Enter limitation"
                className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs    text-gray-700 mb-1">
                Max Customers
              </label>
              <input
                type="text"
                name="maxCustomers"
                value={formData.maxCustomers}
                onChange={handleInputChange}
                placeholder="Enter max customers"
                className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs    text-gray-700 mb-1">
                Product
              </label>
              <input
                type="text"
                name="product"
                value={formData.product}
                onChange={handleInputChange}
                placeholder="Enter product"
                className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs    text-gray-700 mb-1">
                Supplier
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                placeholder="Enter supplier"
                className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-gray-400"
              />
            </div>
          </div>

          {/* Plan Modules */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className=" text-xs  text-gray-900">
                Plan Modules
              </h3>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs  text-white  hover:text-blue-700"
              >
                Select All
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {modules.map((module) => (
                <label
                  key={module}
                  className="flex items-center gap-2 text-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.planModules[module] || false}
                    onChange={() => handleModuleChange(module)}
                    className="w-4 h-4 cursor-pointer rounded border-gray-300"
                  />
                  <span className="text-xs ">{module}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Access Trial */}
          <div className="mb-6 flex items-center gap-3">
            <input
              type="checkbox"
              name="accessTrial"
              checked={formData.accessTrial}
              onChange={handleInputChange}
              className="w-4 h-4 cursor-pointer rounded border-gray-300"
            />
            <label className="text-xs    text-gray-700">
              Access Trial
            </label>
          </div>

          {/* Trial Days, Status */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <div>
              <label className="block text-xs    text-gray-700 mb-1">
                Trial Days
              </label>
              <select
                name="trialDays"
                value={formData.trialDays}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-gray-400"
              >
                <option>Select</option>
                <option>7</option>
                <option>14</option>
                <option>30</option>
              </select>
            </div>
            <div>
              <label className="block text-xs    text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-gray-400"
              >
                <option>Select</option>
                <option>Active</option>
                <option>Inactive</option>
                <option>Archived</option>
              </select>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="px-5 py-2 border border-gray-300 rounded  text-xs    text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded  bg-red-500 hover:bg-red-600 text-white text-xs    disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? 'Creating...' : 'Create New'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNewCompanyPlanModal;

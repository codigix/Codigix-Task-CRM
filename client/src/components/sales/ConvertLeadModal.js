import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const ConvertLeadModal = ({ isOpen, onClose, onSubmit, convertType, leadData, companies = [] }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCompletable, setIsCompletable] = useState(false);
  const [formData, setFormData] = useState({});

  React.useEffect(() => {
    if (leadData) {
      setFormData({
        first_name: '',
        last_name: '',
        company_name: '',
        deal_name: '',
        deal_value: '',
        currency: 'INR',
        industry: '',
        position: '',
        website: '',
        address: '',
        email: '',
        phone: '',
        description: '',
        status: 'New'
      });
      setError('');
      setIsCompletable(false);
    }
  }, [leadData, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (convertType === 'contact') {
      if (!formData.first_name || !formData.last_name || !formData.company_name) {
        setError('Please fill in required fields: First Name, Last Name, and Company Name');
        return;
      }
    } else if (convertType === 'company' && !formData.company_name) {
      setError('Please fill in required field: Company Name');
      return;
    } else if (convertType === 'deal' && (!formData.deal_name || !formData.deal_value)) {
      setError('Please fill in required fields: Deal Name and Value');
      return;
    }

    setIsLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
      handleCancel();
    } catch (err) {
      setError(err.message || 'Conversion failed');
      console.error('Conversion error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({});
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const getTitle = () => {
    switch (convertType) {
      case 'contact':
        return 'Convert Lead to Contact';
      case 'company':
        return 'Convert Lead to Company';
      case 'deal':
        return 'Convert Lead to Deal';
      default:
        return 'Convert Lead';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="w-full max-w-md bg-white rounded  shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
          <h2 className="text-xl  text-gray-900">{getTitle()}</h2>
          <p className="text-xs  text-gray-600 mt-1">
            Converting: <span className=" ">{leadData?.name || leadData?.lead_name}</span>
          </p>
        </div>

        {error && (
          <div className="p-2 mx-4 mt-4 bg-red-50 border border-red-200 rounded ">
            <p className="text-xs  text-red-700  ">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {convertType === 'contact' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded  p-3 mb-4">
                <p className="text-xs  text-blue-700  ">
                  Convert Lead to Contact & Company
                </p>
                <p className="text-xs text-white  mt-1">
                  This will create both a company (if not exists) and link the contact to it
                </p>
              </div>

              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name || ''}
                  onChange={handleInputChange}
                  placeholder="Company name (will create if not exists)"
                  className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs    text-gray-700 mb-2">
                    Industry
                  </label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., Technology"
                    className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs    text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="text"
                    name="website"
                    value={formData.website || ''}
                    onChange={handleInputChange}
                    placeholder="www.example.com"
                    className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Company Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleInputChange}
                  placeholder="Company address"
                  className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                />
              </div>

              <hr className="my-4" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs    text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name || ''}
                    onChange={handleInputChange}
                    placeholder="First name"
                    className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs    text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name || ''}
                    onChange={handleInputChange}
                    placeholder="Last name"
                    className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Email (Pre-filled)
                </label>
                <input
                  type="email"
                  value={leadData?.email || ''}
                  disabled
                  className="w-full p-2 border border-gray-300 rounded  text-xs  bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., CEO, Manager"
                  className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                />
              </div>
            </>
          )}

          {convertType === 'company' && (
            <>
              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name || ''}
                  onChange={handleInputChange}
                  placeholder="Company name"
                  className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs    text-gray-700 mb-2">
                    Industry
                  </label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., Technology"
                    className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs    text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="text"
                    name="website"
                    value={formData.website || ''}
                    onChange={handleInputChange}
                    placeholder="www.example.com"
                    className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Email (Pre-filled)
                </label>
                <input
                  type="email"
                  value={leadData?.email || ''}
                  disabled
                  className="w-full p-2 border border-gray-300 rounded  text-xs  bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Phone (Pre-filled)
                </label>
                <input
                  type="tel"
                  value={leadData?.phone || ''}
                  disabled
                  className="w-full p-2 border border-gray-300 rounded  text-xs  bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleInputChange}
                  placeholder="Full address"
                  className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                />
              </div>
            </>
          )}

          {convertType === 'deal' && (
            <>
              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Deal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="deal_name"
                  value={formData.deal_name || ''}
                  onChange={handleInputChange}
                  placeholder="Deal name"
                  className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs    text-gray-700 mb-2">
                    Deal Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="deal_value"
                    value={formData.deal_value || ''}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs    text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency || 'INR'}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="INR">INR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Company
                </label>
                <select
                  name="company_id"
                  value={formData.company_id || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                >
                  <option value="">Select or leave empty</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.company_name || c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  placeholder="Deal description"
                  rows="2"
                  className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500 resize-none"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 p-2  border border-gray-300 rounded  text-gray-700   hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 p-2  bg-red-600 text-white   rounded  hover:bg-red-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Converting...' : 'Convert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConvertLeadModal;

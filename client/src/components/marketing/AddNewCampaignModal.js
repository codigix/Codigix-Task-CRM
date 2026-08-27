import React, { useState, useRef } from 'react';
import { Upload, Download } from 'lucide-react';
import { campaignAPI } from '../../services/api';

const AddNewCampaignModal = ({ isOpen, onClose, onSuccess }) => {
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    campaign_type: '',
    deal_value: '',
    currency: 'USD',
    period: '',
    period_value: '',
    target_audience: [],
    description: '',
    attachment_name: '',
    attachment_file: null,
    attachment_size: 0,
  });

  const [newAudience, setNewAudience] = useState('');

  const campaignTypes = [
    'Email Marketing',
    'Social Media',
    'Content Marketing',
    'Brand',
    'Sales',
    'Media',
    'Public Relations',
    'Product Launch'
  ];

  const periods = [
    'Daily',
    'Weekly',
    'Monthly',
    'Quarterly',
    'Yearly'
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddAudience = (e) => {
    e.preventDefault();
    if (newAudience.trim() && !formData.target_audience.includes(newAudience.trim())) {
      setFormData(prev => ({
        ...prev,
        target_audience: [...prev.target_audience, newAudience.trim()]
      }));
      setNewAudience('');
    }
  };

  const handleRemoveAudience = (audience) => {
    setFormData(prev => ({
      ...prev,
      target_audience: prev.target_audience.filter(a => a !== audience)
    }));
  };

  const handleFileSelect = (file) => {
    if (file && file.size <= 50 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          attachment_name: file.name,
          attachment_file: e.target.result,
          attachment_size: file.size
        }));
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError('File size must be less than 50 MB');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Campaign name is required');
      return;
    }

    if (!formData.deal_value) {
      setError('Deal value is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: formData.name,
        campaign_type: formData.campaign_type,
        deal_value: parseFloat(formData.deal_value),
        currency: formData.currency,
        period: formData.period,
        period_value: formData.period_value,
        target_audience: formData.target_audience,
        description: formData.description,
        attachment_name: formData.attachment_name,
        attachment_data: formData.attachment_file ? Array.from(new Uint8Array(formData.attachment_file)).join(',') : null,
        attachment_size: formData.attachment_size,
        status: 'Draft'
      };

      await campaignAPI.create(payload);
      
      if (onSuccess) {
        onSuccess();
      }
      handleCancel();
    } catch (err) {
      setError(err.message || 'Failed to create campaign');
      console.error('Form submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      campaign_type: '',
      deal_value: '',
      currency: 'USD',
      period: '',
      period_value: '',
      target_audience: [],
      description: '',
      attachment_name: '',
      attachment_file: null,
      attachment_size: 0,
    });
    setNewAudience('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={handleCancel}>
      <div
        className="h-full w-full md:w-[72%] lg:w-[60%] xl:w-[55%] bg-white shadow-xl overflow-y-auto border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-centerp-3  border-b border-[#EAECF0] sticky top-0 bg-white">
          <h2 className="text-md  text-gray-900">Add New Campaign</h2>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs   text-gray-900 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter campaign name"
              className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
            />
          </div>

          {/* Campaign Type */}
          <div>
            <label className="block text-xs   text-gray-900 mb-1">
              Campaign Type <span className="text-red-500">*</span>
            </label>
            <select
              name="campaign_type"
              value={formData.campaign_type}
              onChange={handleInputChange}
              className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
            >
              <option value="">Choose</option>
              {campaignTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Deal Value & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs   text-gray-900 mb-1">
                Deal Value <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="deal_value"
                value={formData.deal_value}
                onChange={handleInputChange}
                placeholder="0"
                className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs   text-gray-900 mb-1">
                Currency <span className="text-red-500">*</span>
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
              >
                {currencies.map(curr => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Period & Period Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs   text-gray-900 mb-1">
                Period <span className="text-red-500">*</span>
              </label>
              <select
                name="period"
                value={formData.period}
                onChange={handleInputChange}
                className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
              >
                <option value="">Choose</option>
                {periods.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs   text-gray-900 mb-1">
                Period Value <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="period_value"
                value={formData.period_value}
                onChange={handleInputChange}
                placeholder="Enter value"
                className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
              />
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-xs   text-gray-900 mb-1">
              Target Audience
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newAudience}
                onChange={(e) => setNewAudience(e.target.value)}
                placeholder="Enter audience segment"
                className="flex-1 p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
              />
              <button
                type="button"
                onClick={handleAddAudience}
                className="p-2  bg-red-600 text-white rounded  text-xs    hover:bg-red-700 transition"
              >
                Add
              </button>
            </div>
            {formData.target_audience.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.target_audience.map((audience, idx) => (
                  <span key={idx} className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-900 rounded-full text-xs ">
                    {audience}
                    <button
                      type="button"
                      onClick={() => handleRemoveAudience(audience)}
                      className="text-gray-500 hover:text-red "
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs   text-gray-900 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Description"
              rows="4"
              className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition resize-none"
            />
          </div>

          {/* Attachment */}
          <div>
            <label className="block text-xs   text-gray-900 mb-1">
              Attachment
            </label>
            <div
              className={`border-2 border-dashed rounded p-3  text-center transition ${
                dragActive ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {formData.attachment_name ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Download size={24} className="text-green-600" />
                    <div className="text-left">
                      <p className="text-xs    text-gray-900">{formData.attachment_name}</p>
                      <p className="text-xs text-gray-500">{(formData.attachment_size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        attachment_name: '',
                        attachment_file: null,
                        attachment_size: 0
                      }));
                    }}
                    className="text-[#1F2020] hover:text-red "
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={32} className="mx-auto text-[#1F2020] mb-2" />
                  <p className="text-xs  text-gray-600 mb-1">
                    Drop your files here or{' '}
                    <button
                      type="button"
                      onClick={handleBrowseClick}
                      className="text-red    hover:text-red-700"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-gray-500">Maximum size: 50 MB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="p-2  text-gray-700   border border-gray-300 rounded  hover:bg-gray-50 transition disabled:opacity-50 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="p-2  bg-red-600 text-white   rounded  hover:bg-red-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNewCampaignModal;

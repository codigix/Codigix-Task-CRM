import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const AddNewContractModal = ({ isOpen, onClose, onSubmit, companies = [] }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    start_date: '',
    end_date: '',
    client: '',
    contract_type: '',
    contract_value: '',
    description: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
      setAttachmentFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachmentFile(e.target.files[0]);
    }
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.subject) {
      setError('Please fill in the required field: Subject');
      return;
    }
    if (!formData.start_date) {
      setError('Please fill in the required field: Start Date');
      return;
    }
    if (!formData.end_date) {
      setError('Please fill in the required field: End Date');
      return;
    }
    if (!formData.client) {
      setError('Please select a Client');
      return;
    }
    if (!formData.contract_type) {
      setError('Please select a Contract Type');
      return;
    }
    if (!formData.contract_value) {
      setError('Please fill in the required field: Contract Value');
      return;
    }

    setIsLoading(true);
    try {
      if (onSubmit) {
        await onSubmit({
          ...formData,
          attachment: attachmentFile
        });
      }
      handleCancel();
    } catch (err) {
      setError(err.message || 'Failed to create contract');
      console.error('Form submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      subject: '',
      start_date: '',
      end_date: '',
      client: '',
      contract_type: '',
      contract_value: '',
      description: '',
    });
    setError('');
    setAttachmentFile(null);
    setDragActive(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <div 
        className="h-full w-full md:w-[72%] lg:w-[60%] xl:w-[55%] bg-white shadow-xl overflow-y-auto border-l border-gray-200"
      >
        <div className="flex justify-between items-center p-3  border-b border-[#EAECF0] sticky top-0 bg-white z-10">
          <h2 className="text-md  text-gray-900">Add New Contract</h2>
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

        <form id="add-contract-form" onSubmit={handleSubmit} className="p-3 space-y-5">
          
          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Subject<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="Enter contract subject"
              className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Start Date<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                End Date<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Client<span className="text-red-500">*</span>
            </label>
            <select
              name="client"
              value={formData.client}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
            >
              <option value="">Select</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.company_name || c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Contract Type<span className="text-red-500">*</span>
            </label>
            <select
              name="contract_type"
              value={formData.contract_type}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
            >
              <option value="">Select</option>
              <option value="Contracts under Seal">Contracts under Seal</option>
              <option value="Executory Contracts">Executory Contracts</option>
              <option value="Express Contracts">Express Contracts</option>
              <option value="Implied Contracts">Implied Contracts</option>
              <option value="Unconscionable">Unconscionable</option>
              <option value="Fixed Price Contract">Fixed Price Contract</option>
              <option value="Cost Plus Contract">Cost Plus Contract</option>
              <option value="Service Level Agreement">Service Level Agreement</option>
              <option value="Partnership Contract">Partnership Contract</option>
            </select>
          </div>

          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Contract Value<span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="contract_value"
              value={formData.contract_value}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs    text-gray-700 mb-3">
              Attachment<span className="text-red-500">*</span>
            </label>
            {attachmentFile ? (
              <div className="bg-gray-50 border border-gray-300 rounded  p-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                    <span className="text-red  text-xs ">📄</span>
                  </div>
                  <div>
                    <p className="text-xs    text-gray-900">{attachmentFile.name}</p>
                    <p className="text-xs text-gray-500">{(attachmentFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeAttachment}
                  className="text-[#1F2020] hover:text-red  transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded  p-8 text-center transition-colors ${
                  dragActive ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'
                }`}
              >
                <p className="text-xs  text-gray-600 mb-2">Drop your files here or <button
                  type="button"
                  className="text-red  hover:text-red-700  "
                  onClick={() => document.getElementById('file-input').click()}
                >browse</button></p>
                <p className="text-xs text-gray-500">Maximum size : 50 MB</p>
                <input
                  id="file-input"
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept="*/*"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Description<span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter contract description"
              rows="3"
              className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition resize-none"
            />
          </div>

        </form>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-2  flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="p-2  border border-gray-300 rounded text-xs text-gray-700   hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="p-2  bg-red-600 text-white   rounded text-xs hover:bg-red-700 transition disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddNewContractModal;

import React, { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { projectAPI } from '../../services/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DealConversionModal = ({ isOpen, onClose, deal, onSuccess }) => {
  const [conversionType, setConversionType] = useState(null);
  const [formData, setFormData] = useState({
    name: deal?.deal_name || '',
    description: '',
    budget: deal?.deal_value || '',
    startDate: '',
    dueDate: deal?.expected_close_date || '',
    status: 'Active'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const CONVERSION_OPTIONS = [];

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleConvert = async () => {
    if (!formData.name) {
      setError('Please fill in the required fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (conversionType === 'project') {
        const conversionData = {
          name: formData.name,
          project_type: 'Custom',
          category: 'Development',
          start_date: formData.startDate || null,
          due_date: formData.dueDate || null,
          priority: 'High',
          created_by: 1
        };

        const result = await projectAPI.convertDealToProject(deal.id, conversionData);
        localStorage.setItem('recent_conversion_project', JSON.stringify(result));
      } else {
        const conversionData = {
          sourceId: deal.id,
          type: conversionType,
          ...formData
        };

        const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
        const response = await fetch(`${apiUrl}/deals/${deal.id}/convert-to-${conversionType}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(conversionData)
        });

        if (!response.ok) throw new Error('Conversion failed');

        const result = await response.json();
        localStorage.setItem(`recent_conversion_${conversionType}`, JSON.stringify(result));
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to convert deal');
      console.error('Conversion error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setConversionType(null);
    setFormData({
      name: deal?.deal_name || '',
      description: '',
      budget: deal?.deal_value || '',
      startDate: '',
      dueDate: deal?.expected_close_date || '',
      status: 'Active'
    });
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="bg-white rounded  shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-betweenp-3  border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl  text-gray-900">Convert Deal</h2>
          <button
            onClick={onClose}
            className="text-[#1F2020] hover:text-gray-600 transition text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {!conversionType ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded  p-2 mb-6">
                <p className="text-xs  text-blue-800">
                  Convert <span className="">{deal?.deal_name}</span> to a new {conversionType} in your system.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {CONVERSION_OPTIONS.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => setConversionType(option.type)}
                    className={`p-6 border-2 rounded  text-left transition hover:shadow-md ${option.color} border-current`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <span className="text-3xl">{option.icon}</span>
                        <div>
                          <h3 className=" text-gray-900 text-lg">{option.title}</h3>
                          <p className="text-xs  text-gray-600 mt-1">{option.description}</p>
                        </div>
                      </div>
                      <ArrowRight size={20} className="text-[#1F2020]" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={resetForm}
                  className="text-gray-600 hover:text-gray-900   text-xs "
                >
                  ← Back
                </button>
                <span className="text-[#1F2020]">/</span>
                <span className=" text-gray-900">
                  {CONVERSION_OPTIONS.find(o => o.type === conversionType)?.title}
                </span>
              </div>

              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded ">
                  <p className="text-xs  text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-4 bg-gray-50 p-2 rounded  border border-gray-200">
                <div>
                  <label className="block text-xs    text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter name"
                    className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs    text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter description"
                    rows="3"
                    className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>

                {conversionType !== 'invoice' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs    text-gray-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          name="startDate"
                          value={formData.startDate}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs    text-gray-700 mb-1">
                          Due Date
                        </label>
                        <input
                          type="date"
                          name="dueDate"
                          value={formData.dueDate}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs    text-gray-700 mb-1">
                        Budget
                      </label>
                      <input
                        type="number"
                        name="budget"
                        value={formData.budget}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs    text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                      >
                        <option value="Active">Active</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </>
                )}

                {conversionType === 'invoice' && (
                  <>
                    <div>
                      <label className="block text-xs    text-gray-700 mb-1">
                        Amount
                      </label>
                      <input
                        type="number"
                        name="budget"
                        value={formData.budget}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs    text-gray-700 mb-1">
                        Invoice Date
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs    text-gray-700 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        name="dueDate"
                        value={formData.dueDate}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={resetForm}
                  className="p-2  border border-gray-300 rounded  hover:bg-gray-50 text-xs    text-gray-700 transition bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConvert}
                  disabled={isLoading || !formData.name}
                  className="p-2  bg-red-600 text-white rounded    text-xs  hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isLoading ? 'Converting...' : 'Convert Deal'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealConversionModal;

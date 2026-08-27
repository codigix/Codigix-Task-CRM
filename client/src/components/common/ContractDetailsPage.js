import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Save, X, Send, Download, Trash2 } from 'lucide-react';
import { contractsAPI } from '../../services/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ContractDetailsPage = ({ contract, onBack, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    subject: contract.subject || '',
    start_date: contract.start_date || '',
    end_date: contract.end_date || '',
    client_id: contract.client_id || '',
    contract_type: contract.contract_type || '',
    contract_value: contract.contract_value || '',
    description: contract.description || '',
    status: contract.status || 'Draft',
  });

  const contractStatuses = ['Draft', 'Sent', 'Active', 'Expired', 'Cancelled'];
  const contractTypes = [
    'Contracts under Seal',
    'Executory Contracts',
    'Express Contracts',
    'Implied Contracts',
    'Unconscionable',
    'Fixed Price Contract',
    'Cost Plus Contract',
    'Service Level Agreement',
    'Partnership Contract'
  ];

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/companies`);
      if (response.ok) {
        const data = await response.json();
        setCompanies(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const getCompanyName = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    return company ? (company.company_name || company.name) : 'Unknown';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      await contractsAPI.update(contract.id, formData);
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Error updating contract:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendContract = async () => {
    setIsLoading(true);
    try {
      await contractsAPI.update(contract.id, { 
        status: 'Sent',
        sent_to_email: sendEmail 
      });
      setShowSendModal(false);
      setSendEmail('');
      onUpdate();
    } catch (err) {
      console.error('Error sending contract:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadContract = () => {
    const element = document.createElement('a');
    const file = new Blob([`Contract: ${contract.subject}\n\nDetails:\n${JSON.stringify(formData, null, 2)}`], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `contract-${contract.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDeleteContract = async () => {
    setIsLoading(true);
    try {
      await contractsAPI.delete(contract.id);
      onUpdate();
    } catch (err) {
      console.error('Error deleting contract:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-700',
      'Sent': 'bg-blue-100 text-blue-700',
      'Active': 'bg-green-100 text-green-700',
      'Expired': 'bg-yellow-100 text-yellow-700',
      'Cancelled': 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b p-2  flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded  transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl  text-gray-900">{formData.subject}</h1>
            <p className="text-xs  text-gray-500 mt-1">Contract Details</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {!isEditing && (
            <>
              <button 
                onClick={handleDownloadContract}
                className="flex items-center gap-2 p-2  border border-gray-300 rounded  text-xs    text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download size={16} />
                Download
              </button>
              <button 
                onClick={() => setShowSendModal(true)}
                disabled={formData.status === 'Sent'}
                className="flex items-center gap-2 p-2  border border-gray-300 rounded  text-xs    text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Send size={16} />
                Send
              </button>
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 p-2  border border-gray-300 rounded  text-xs    text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Edit2 size={16} />
                Edit
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 p-2  border border-red-300 rounded  text-xs    text-red-700 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </>
          )}
          
          {isEditing && (
            <>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    subject: contract.subject || '',
                    start_date: contract.start_date || '',
                    end_date: contract.end_date || '',
                    client_id: contract.client_id || '',
                    contract_type: contract.contract_type || '',
                    contract_value: contract.contract_value || '',
                    description: contract.description || '',
                    status: contract.status || 'Draft',
                  });
                }}
                disabled={isLoading}
                className="flex items-center gap-2 p-2  border border-gray-300 rounded  text-xs    text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <X size={16} />
                Cancel
              </button>
              <button 
                onClick={handleSaveChanges}
                disabled={isLoading}
                className="flex items-center gap-2 p-2  bg-red-600 text-white rounded  text-xs    hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded  border border-gray-200p-3 ">
          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-6 pb-6 border-b border-gray-200">
            <span className={`text-xs  px-3 py-1 rounded-full   ${getStatusColor(formData.status)}`}>
              {formData.status}
            </span>
            <span className="text-xs  text-gray-600">
              ID: {contract.id}
            </span>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Subject */}
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Subject
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="w-full p-2  border border-gray-300 rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              ) : (
                <p className="text-gray-900">{formData.subject}</p>
              )}
            </div>

            {/* Grid for date fields */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Start Date
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    className="w-full p-2  border border-gray-300 rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                ) : (
                  <p className="text-gray-900">{new Date(formData.start_date).toLocaleDateString()}</p>
                )}
              </div>
              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  End Date
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    className="w-full p-2  border border-gray-300 rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                ) : (
                  <p className="text-gray-900">{new Date(formData.end_date).toLocaleDateString()}</p>
                )}
              </div>
            </div>

            {/* Client */}
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Client / Company
              </label>
              {isEditing ? (
                <select
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleInputChange}
                  className="w-full p-2  border border-gray-300 rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select Client</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.company_name || c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-900">{getCompanyName(formData.client_id)}</p>
              )}
            </div>

            {/* Contract Type */}
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Contract Type
              </label>
              {isEditing ? (
                <select
                  name="contract_type"
                  value={formData.contract_type}
                  onChange={handleInputChange}
                  className="w-full p-2  border border-gray-300 rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select Type</option>
                  {contractTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-900">{formData.contract_type}</p>
              )}
            </div>

            {/* Grid for value and status */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Contract Value
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    name="contract_value"
                    value={formData.contract_value}
                    onChange={handleInputChange}
                    className="w-full p-2  border border-gray-300 rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                ) : (
                  <p className="text-gray-900">₹{formData.contract_value}</p>
                )}
              </div>
              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Status
                </label>
                {isEditing ? (
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full p-2  border border-gray-300 rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {contractStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900">{formData.status}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Description
              </label>
              {isEditing ? (
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full p-2  border border-gray-300 rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">{formData.description || 'No description'}</p>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-xs   text-gray-900 mb-4">Additional Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-600 mb-1">Created</p>
                <p className="text-xs  text-gray-900">{new Date(contract.created_at || new Date()).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Last Updated</p>
                <p className="text-xs  text-gray-900">{new Date(contract.updated_at || new Date()).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded  shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-betweenp-3  border-b border-gray-200">
              <h3 className="text-md  text-gray-900">Send Contract to Client</h3>
              <button 
                onClick={() => {
                  setShowSendModal(false);
                  setSendEmail('');
                }}
                className="text-[#1F2020] hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-xs    text-gray-700 mb-2">Client Email</label>
              <input
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="Enter client email"
                className="w-full border border-gray-300 p-2  rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-3p-3  border-t border-gray-200">
              <button 
                onClick={() => {
                  setShowSendModal(false);
                  setSendEmail('');
                }}
                disabled={isLoading}
                className="flex-1 p-2  border border-gray-300 rounded  text-xs    text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSendContract}
                disabled={isLoading || !sendEmail}
                className="flex-1 p-2  bg-red-600 text-white rounded  text-xs    hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded  shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-md  text-gray-900 mb-4">Delete Contract?</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to delete this contract? This action cannot be undone.</p>
            </div>
            <div className="flex gap-3p-3  border-t border-gray-200">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
                className="flex-1 p-2  border border-gray-300 rounded  text-xs    text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteContract}
                disabled={isLoading}
                className="flex-1 p-2  bg-red-600 text-white rounded  text-xs    hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractDetailsPage;

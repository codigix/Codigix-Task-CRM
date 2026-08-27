import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Download, Send, CheckCircle, XCircle, Calendar, DollarSign, FileText } from 'lucide-react';
import { proposalsAPI } from '../../services/api';
import ProposalWorkflow from './ProposalWorkflow';
import ProposalApprovalPanel from './ProposalApprovalPanel';
import ProposalVersionHistory from './ProposalVersionHistory';

const ProposalDetailsPage = ({ proposalId, onBack }) => {
  const [proposal, setProposal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    loadProposal();
  }, [proposalId]);

  const loadProposal = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await proposalsAPI.getById(proposalId);
      setProposal(data);
    } catch (err) {
      setError('Failed to load proposal: ' + err.message);
      console.error('Load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!proposal) return;
    try {
      await proposalsAPI.updateStatus(proposal.id, {
        status: newStatus,
        action_by: 1
      });
      await loadProposal();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!proposal) return;
    try {
      const result = await proposalsAPI.convertToInvoice(proposal.id, { total_amount: proposal.total_amount });
      alert('Proposal converted to invoice: ' + result.invoiceNumber);
      await loadProposal();
    } catch (err) {
      alert('Failed to convert proposal: ' + err.message);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Accepted': 'bg-green-100 text-green-700',
      'Draft': 'bg-blue-100 text-blue-700',
      'Submitted': 'bg-purple-100 text-purple-700',
      'Approved': 'bg-emerald-100 text-emerald-700',
      'Sent': 'bg-teal-100 text-teal-700',
      'Declined': 'bg-red-100 text-red-700',
      'Rejected': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading proposal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="flex items-center gap-2 text-white  hover:text-blue-800 mb-4">
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="flex items-center gap-2 text-white  hover:text-blue-800 mb-4">
          <ArrowLeft size={20} />
          Back
        </button>
        <p className="text-gray-500">Proposal not found</p>
      </div>
    );
  }

  const currency = proposal.currency || 'INR';
  const lineItems = proposal.lineItems || [];
  const history = proposal.history || [];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-white  hover:text-blue-800"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <div>
              <h1 className="text-xl  text-gray-900">{proposal.title}</h1>
              <p className="text-xs  text-gray-500 mt-1">{proposal.proposal_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs  px-3 py-1 rounded-full  ${getStatusColor(proposal.status)}`}>
              {proposal.status}
            </span>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 p-2  border border-gray-300 rounded  hover:bg-gray-50"
            >
              <Edit2 size={16} />
              Edit
            </button>
            {proposal.status === 'Accepted' && (
              <button 
                onClick={handleConvertToInvoice}
                className="flex items-center gap-2 p-2  bg-red-600  text-white rounded  hover:bg-blue-700"
              >
                <Download size={16} />
                Convert to Invoice
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t">
          <div className="px-6 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('workflow')}
              className={`py-3 border-b-2   transition-colors whitespace-nowrap ${
                activeTab === 'workflow'
                  ? 'border-red-600  text-white '
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Workflow
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`py-3 border-b-2   transition-colors ${
                activeTab === 'details'
                  ? 'border-red-600  text-white '
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('lineItems')}
              className={`py-3 border-b-2   transition-colors ${
                activeTab === 'lineItems'
                  ? 'border-red-600  text-white '
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Line Items
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={`py-3 border-b-2   transition-colors whitespace-nowrap ${
                activeTab === 'versions'
                  ? 'border-red-600  text-white '
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Version History
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 border-b-2   transition-colors ${
                activeTab === 'history'
                  ? 'border-red-600  text-white '
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Activity Log
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-6xl mx-auto">
        {/* Workflow Tab */}
        {activeTab === 'workflow' && (
          <div className="space-y-6">
            <ProposalWorkflow 
              proposal={proposal}
              onStatusChange={handleStatusChange}
              onApprove={() => handleStatusChange('Approved')}
              onReject={() => handleStatusChange('Rejected')}
              onSend={() => handleStatusChange('Sent')}
              onConvertToInvoice={handleConvertToInvoice}
            />
            <ProposalApprovalPanel 
              proposal={proposal}
              isManager={true}
              onApprove={() => handleStatusChange('Approved')}
              onReject={() => handleStatusChange('Rejected')}
            />
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="md:col-span-2 space-y-6">
              {/* Dates and Validity */}
              <div className="bg-white rounded p-3  border">
                <h2 className="text-md  text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar size={20} />
                  Timeline
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs  text-gray-600">Proposal Date</p>
                    <p className="text-lg   text-gray-900">
                      {proposal.proposal_date ? new Date(proposal.proposal_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs  text-gray-600">Validity Date</p>
                    <p className="text-lg   text-gray-900">
                      {proposal.validity_date ? new Date(proposal.validity_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {proposal.description && (
                <div className="bg-white rounded p-3  border">
                  <h2 className="text-md  text-gray-900 mb-4">Description</h2>
                  <p className="text-gray-600">{proposal.description}</p>
                </div>
              )}

              {/* Terms & Conditions */}
              {proposal.terms_conditions && (
                <div className="bg-white rounded p-3  border">
                  <h2 className="text-md  text-gray-900 mb-4">Terms & Conditions</h2>
                  <p className="text-gray-600 whitespace-pre-wrap">{proposal.terms_conditions}</p>
                </div>
              )}

              {/* Notes */}
              {proposal.notes && (
                <div className="bg-white rounded p-3  border">
                  <h2 className="text-md  text-gray-900 mb-4">Notes</h2>
                  <p className="text-gray-600">{proposal.notes}</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Total Amount */}
              <div className="bg-white rounded p-3  border">
                <h2 className="text-md  text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign size={20} />
                  Amount
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs ">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="  text-gray-900">
                      {currency} {(proposal.total_amount + proposal.discount_amount - proposal.tax_amount).toFixed(2)}
                    </span>
                  </div>
                  {proposal.discount_amount > 0 && (
                    <div className="flex justify-between text-xs  text-orange-600">
                      <span>Discount:</span>
                      <span>-{currency} {proposal.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  {proposal.tax_amount > 0 && (
                    <div className="flex justify-between text-xs  text-green-600">
                      <span>Tax:</span>
                      <span>+{currency} {proposal.tax_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between">
                    <span className=" text-gray-900">Total:</span>
                    <span className="text-xl  text-white ">
                      {currency} {proposal.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Actions */}
              {proposal.status === 'Draft' && (
                <div className="bg-white rounded p-3  border">
                  <h2 className="text-md  text-gray-900 mb-4">Actions</h2>
                  <button
                    onClick={() => handleStatusChange('Submitted')}
                    className="w-full p-2  bg-red-600  text-white rounded  hover:bg-blue-700 transition-colors"
                  >
                    Submit for Approval
                  </button>
                </div>
              )}

              {proposal.status === 'Submitted' && (
                <div className="bg-white rounded p-3  border space-y-2">
                  <h2 className="text-md  text-gray-900 mb-4">Actions</h2>
                  <button
                    onClick={() => handleStatusChange('Approved')}
                    className="w-full p-2  bg-green-600 text-white rounded  hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleStatusChange('Rejected')}
                    className="w-full p-2  bg-red-600 text-white rounded  hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              )}

              {proposal.status === 'Approved' && (
                <div className="bg-white rounded p-3  border">
                  <h2 className="text-md  text-gray-900 mb-4">Actions</h2>
                  <button
                    onClick={() => handleStatusChange('Sent')}
                    className="w-full p-2  bg-red-600  text-white rounded  hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    Send to Client
                  </button>
                </div>
              )}

              {proposal.status === 'Sent' && (
                <div className="bg-white rounded p-3  border">
                  <h2 className="text-md  text-gray-900 mb-4">Actions</h2>
                  <button
                    onClick={() => handleStatusChange('Accepted')}
                    className="w-full p-2  bg-green-600 text-white rounded  hover:bg-green-700 transition-colors mb-2"
                  >
                    Mark as Accepted
                  </button>
                  <button
                    onClick={() => handleStatusChange('Declined')}
                    className="w-full p-2  bg-red-600 text-white rounded  hover:bg-red-700 transition-colors"
                  >
                    Mark as Declined
                  </button>
                </div>
              )}

              {/* Client Info */}
              <div className="bg-white rounded p-3  border">
                <h2 className="text-md  text-gray-900 mb-4">Client</h2>
                <p className="text-gray-600">{proposal.company_name || 'Unknown Company'}</p>
                {proposal.first_name && proposal.last_name && (
                  <p className="text-gray-600">{proposal.first_name} {proposal.last_name}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Line Items Tab */}
        {activeTab === 'lineItems' && (
          <div className="bg-white rounded  border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3  text-gray-900">Item Name</th>
                    <th className="text-left px-4 py-3  text-gray-900">Description</th>
                    <th className="text-right px-4 py-3  text-gray-900">Qty</th>
                    <th className="text-right px-4 py-3  text-gray-900">Rate</th>
                    <th className="text-right px-4 py-3  text-gray-900">Discount</th>
                    <th className="text-right px-4 py-3  text-gray-900">Tax</th>
                    <th className="text-right px-4 py-3  text-gray-900">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-2  text-center text-gray-500">
                        No line items
                      </td>
                    </tr>
                  ) : (
                    lineItems.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3   text-gray-900">{item.item_name}</td>
                        <td className="px-4 py-3 text-gray-600">{item.description}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {currency} {item.rate.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-orange-600">
                          {currency} {item.discount_amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600">
                          {currency} {item.tax_amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right   text-gray-900">
                          {currency} {item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Version History Tab */}
        {activeTab === 'versions' && (
          <ProposalVersionHistory proposal={proposal} versions={[]} />
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="bg-white rounded p-3  border text-center text-gray-500">
                No history records
              </div>
            ) : (
              history.map((record, index) => (
                <div key={index} className="bg-white rounded  p-2 border">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className=" text-gray-900">{record.action}</p>
                      <p className="text-xs  text-gray-600">
                        {record.old_status && `From ${record.old_status}`}
                        {record.old_status && record.new_status && ' → '}
                        {record.new_status && `To ${record.new_status}`}
                      </p>
                      {record.comments && (
                        <p className="text-xs  text-gray-600 mt-2">{record.comments}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs  text-gray-600">
                        {record.first_name && record.last_name
                          ? `${record.first_name} ${record.last_name}`
                          : 'System'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(record.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalDetailsPage;

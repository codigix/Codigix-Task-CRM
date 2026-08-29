import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Download, Send, CheckCircle, XCircle, Calendar, FileText, Paperclip } from 'lucide-react';
import Swal from 'sweetalert2';
import { proposalsAPI } from '../../services/api';
import AddNewProposalModal from './AddNewProposalModal';

const ProposalDetailsPage = ({ proposalId, onBack, companies = [], leads = [] }) => {
  const [proposal, setProposal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

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

  const handleUpdateProposal = async (updatedData) => {
    try {
      console.log('🔄 Updating proposal:', updatedData);
      await proposalsAPI.update(proposal.id, updatedData);
      setIsEditing(false);
      await loadProposal();
      Swal.fire({
        title: 'Success!',
        text: 'Proposal updated successfully!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      alert('Failed to update proposal: ' + (err.message || 'Error'));
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

  const parseServices = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [String(val)];
  };

  const parseAttachments = (val) => {
    if (!val) return [];
    let list = [];
    if (Array.isArray(val)) {
      list = val;
    } else if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) list = parsed;
      } catch (e) {}
    }
    return list.filter(f => f && (typeof f === 'string' || f.name || f.file_path || f.url));
  };

  const getFileUrl = (file) => {
    if (!file) return '#';
    const filePath = file.file_path || file.url || (typeof file === 'string' ? file : null);
    if (!filePath) return '#';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
    return `${baseUrl}${cleanPath}`;
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
        <button onClick={onBack} className="flex items-center gap-2 text-slate-700 hover:text-red-600 mb-4 font-medium">
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
        <button onClick={onBack} className="flex items-center gap-2 text-slate-700 hover:text-red-600 mb-4 font-medium">
          <ArrowLeft size={20} />
          Back
        </button>
        <p className="text-gray-500">Proposal not found</p>
      </div>
    );
  }

  const servicesList = parseServices(proposal?.service_needed);
  const attachmentsList = parseAttachments(proposal?.attachments);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-slate-700 hover:text-red-600 font-medium transition"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {proposal.lead_name ? `${proposal.lead_name} (${proposal.client_name || 'Client'})` : (proposal.client_name || 'Proposal Details')}
              </h1>
              <p className="text-xs text-gray-500 mt-1">{proposal.proposal_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(proposal.status)}`}>
              {proposal.status}
            </span>
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700 font-medium transition shadow-sm"
            >
              <Edit2 size={15} />
              Edit Proposal
            </button>
            {proposal.status === 'Accepted' && (
              <button 
                onClick={handleConvertToInvoice}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 font-medium transition shadow-sm"
              >
                <Download size={15} />
                Convert to Invoice
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Details View */}
      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column (Details, Description, Attachments) */}
          <div className="md:col-span-2 space-y-6">
            {/* Client & Lead Information Card */}
            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  Client & Lead Details
                </h2>
                {proposal.business_type && (
                  <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-semibold">
                    {proposal.business_type}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-gray-100">
                <div>
                  <span className="text-gray-500">Client / Company:</span>{' '}
                  <strong className="text-gray-900 text-sm block mt-0.5">{proposal.client_name || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Related Lead:</span>{' '}
                  <strong className="text-gray-900 text-sm block mt-0.5">{proposal.lead_name || 'N/A'}</strong>
                </div>
                {proposal.project_scope && (
                  <div>
                    <span className="text-gray-500">Project Scope:</span>{' '}
                    <span className="text-gray-800 font-medium block mt-0.5">{proposal.project_scope}</span>
                  </div>
                )}
                {proposal.assigned_to_name && (
                  <div>
                    <span className="text-gray-500">Assigned To:</span>{' '}
                    <span className="text-gray-800 font-semibold block mt-0.5">{proposal.assigned_to_name}</span>
                  </div>
                )}
              </div>

              {/* Services List */}
              {servicesList.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
                    <span>🎯</span> Services Needed ({servicesList.length})
                  </p>
                  <ul className="space-y-2">
                    {servicesList.map((service, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2.5 px-3 py-2 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-xs font-medium text-emerald-900"
                      >
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                          ✓
                        </span>
                        <span>{service}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Timeline Card */}
            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-blue-600" />
                Timeline
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Proposal Date</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {proposal.proposal_date ? new Date(proposal.proposal_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Open Till</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {proposal.validity_date ? new Date(proposal.validity_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Scope & Description Card */}
            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Scope & Description
              </h2>
              {proposal.description ? (
                <div
                  className="text-xs text-gray-800 leading-relaxed bg-gray-50/70 p-4 rounded-lg border border-gray-200/70 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: proposal.description }}
                />
              ) : (
                <p className="text-xs text-gray-400 italic bg-gray-50/50 p-4 rounded-lg border border-gray-100">
                  No detailed description provided for this proposal.
                </p>
              )}
            </div>

            {/* Attachments & Files Card */}
            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Paperclip size={18} className="text-blue-600" />
                Attachments & Files ({attachmentsList.length})
              </h2>
              {attachmentsList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachmentsList.map((file, idx) => {
                    const fileName = typeof file === 'string' ? file.split('/').pop() : (file.name || `Attachment ${idx + 1}`);
                    const fileSize = file.size ? `${(file.size / 1024).toFixed(1)} KB` : null;
                    const fileUrl = getFileUrl(file);
                    const isClickable = fileUrl !== '#';

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs hover:border-blue-300 hover:bg-blue-50/20 transition group"
                      >
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2.5 min-w-0 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                          onClick={(e) => {
                            if (!isClickable) {
                              e.preventDefault();
                              alert('File URL is not available. Please edit this proposal to upload a new copy of the file.');
                            }
                          }}
                        >
                          <div className="w-8 h-8 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                            📄
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition" title={fileName}>
                              {fileName}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {fileSize ? `${fileSize} • ` : ''}
                              {isClickable ? 'Click to open' : 'No link attached'}
                            </p>
                          </div>
                        </a>
                        {isClickable && (
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-white border border-gray-200 text-blue-600 hover:bg-blue-50 rounded text-[11px] font-medium transition"
                              title="Open in new tab"
                            >
                              Open
                            </a>
                            <a
                              href={fileUrl}
                              download={fileName}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100/60 rounded transition"
                              title="Download"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic bg-gray-50/50 p-4 rounded-lg border border-gray-100">
                  No attachments uploaded for this proposal. Click "Edit Proposal" to attach files.
                </p>
              )}
            </div>

            {/* Terms & Conditions (if present) */}
            {proposal.terms_conditions && (
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                <h2 className="text-sm font-bold text-gray-900 mb-3">Terms & Conditions</h2>
                <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{proposal.terms_conditions}</p>
              </div>
            )}

            {/* Notes (if present) */}
            {proposal.notes && (
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                <h2 className="text-sm font-bold text-gray-900 mb-3">Internal Notes</h2>
                <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{proposal.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column (Sidebar Actions & Summary) */}
          <div className="space-y-6">
            {/* Status Actions */}
            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-gray-900">Actions</h2>
              {proposal.status === 'Draft' && (
                <button
                  onClick={() => handleStatusChange('Submitted')}
                  className="w-full p-2.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
                >
                  Submit for Approval
                </button>
              )}

              {proposal.status === 'Submitted' && (
                <div className="space-y-2">
                  <button
                    onClick={() => handleStatusChange('Approved')}
                    className="w-full p-2.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={15} />
                    Approve Proposal
                  </button>
                  <button
                    onClick={() => handleStatusChange('Rejected')}
                    className="w-full p-2.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2"
                  >
                    <XCircle size={15} />
                    Reject
                  </button>
                </div>
              )}

              {proposal.status === 'Approved' && (
                <button
                  onClick={() => handleStatusChange('Sent')}
                  className="w-full p-2.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Send size={15} />
                  Send to Client
                </button>
              )}

              {proposal.status === 'Sent' && (
                <div className="space-y-2">
                  <button
                    onClick={() => handleStatusChange('Accepted')}
                    className="w-full p-2.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition"
                  >
                    Mark as Accepted
                  </button>
                  <button
                    onClick={() => handleStatusChange('Declined')}
                    className="w-full p-2.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
                  >
                    Mark as Declined
                  </button>
                </div>
              )}

              <button
                onClick={() => setIsEditing(true)}
                className="w-full p-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                <Edit2 size={14} />
                Edit Proposal Details
              </button>
            </div>

            {/* Client & Lead Summary Card */}
            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-gray-900">Client & Lead Overview</h2>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-[11px] text-gray-500">Client / Company</p>
                  <p className="font-semibold text-gray-900">{proposal.client_name || 'N/A'}</p>
                </div>
                {proposal.lead_name && (
                  <div>
                    <p className="text-[11px] text-gray-500">Lead Contact Person</p>
                    <p className="font-semibold text-gray-900">{proposal.lead_name}</p>
                  </div>
                )}
                {proposal.assigned_to_name && (
                  <div>
                    <p className="text-[11px] text-gray-500">Assigned Salesperson</p>
                    <p className="font-semibold text-gray-900">{proposal.assigned_to_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] text-gray-500">Created At</p>
                  <p className="text-gray-700">{proposal.created_at ? new Date(proposal.created_at).toLocaleString() : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Proposal Modal */}
      <AddNewProposalModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSubmit={handleUpdateProposal}
        companies={companies}
        leads={leads}
        initialData={proposal}
      />
    </div>
  );
};

export default ProposalDetailsPage;

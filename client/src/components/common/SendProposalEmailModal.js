import React, { useState, useEffect } from 'react';
import { Mail, X, FileText, CheckCircle2, AlertCircle, Loader2, Send } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const SendProposalEmailModal = ({ isOpen, onClose, proposal, onSuccess }) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (proposal) {
      const email = proposal.client_email || proposal.lead_email || proposal.email || '';
      const clientName = proposal.client_name || proposal.lead_name || proposal.related_name || 'Valued Client';
      const propNo = proposal.proposal_number || proposal.id || '';
      const propTitle = proposal.title || 'Project Proposal';

      setRecipientEmail(email);
      setSubject(`Proposal #${propNo} for ${clientName} - Codigix Infotech`);
      setMessage(`Dear ${clientName},\n\nWe are pleased to submit our formal proposal #${propNo} (${propTitle}) for your review. Please feel free to review the details and reach out to us with any questions.`);
    }
  }, [proposal, isOpen]);

  if (!isOpen || !proposal) return null;

  const clientName = proposal.client_name || proposal.lead_name || proposal.related_name || 'Valued Client';
  const propNo = proposal.proposal_number || proposal.id || '';

  let attachmentsList = [];
  if (proposal.attachments) {
    try {
      attachmentsList = typeof proposal.attachments === 'string' ? JSON.parse(proposal.attachments) : proposal.attachments;
      if (!Array.isArray(attachmentsList)) attachmentsList = [];
    } catch {
      attachmentsList = [];
    }
  }

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!recipientEmail || !recipientEmail.trim()) {
      showErrorToast('Please enter a recipient email address');
      return;
    }

    setIsSending(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_BASE_URL}/proposals/${proposal.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recipientEmail.trim(),
          subject: subject.trim(),
          message: message.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send proposal');
      }

      showSuccessToast(data.message || `Proposal sent to ${recipientEmail}! Follow-ups generated.`);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error sending proposal email:', err);
      showErrorToast(err.message || 'Failed to send proposal email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-900 text-white px-5 py-4 flex items-center justify-between shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Send Proposal Email Preview</h3>
              <p className="text-xs text-blue-100">Review all details before sending proposal to client</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-blue-100 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-gray-700 custom-scrollbar">
          {/* Email Meta Fields */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700 w-24 shrink-0">To Email:*</span>
              <input 
                type="email" 
                value={recipientEmail} 
                onChange={(e) => setRecipientEmail(e.target.value)} 
                placeholder="Enter client email address..." 
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded font-medium text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700 w-24 shrink-0">Subject:*</span>
              <input 
                type="text" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                placeholder="Email subject..." 
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded font-medium text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Client & Proposal Info Preview Card */}
          <div className="grid grid-cols-2 gap-3 bg-blue-50/50 border border-blue-100 rounded-lg p-3.5">
            <div>
              <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Client Information</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{clientName}</p>
              {proposal.company_name && <p className="text-gray-600 font-medium">{proposal.company_name}</p>}
              <p className="text-gray-500">{proposal.client_phone || proposal.phone || 'No phone'}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Proposal Information</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">#{propNo}</p>
              <p className="text-gray-600">Date: {proposal.proposal_date || 'Today'}</p>
              <p className="text-gray-500">Valid Till: {proposal.validity_date || 'N/A'}</p>
            </div>
          </div>

          {/* Services Needed */}
          {proposal.service_needed && (
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg">
              <span className="text-[11px] font-bold text-emerald-900 block mb-1.5">Services Needed:</span>
              <div className="flex flex-wrap gap-1.5">
                {proposal.service_needed.split(',').map((s, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-semibold border border-emerald-200">
                    {s.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scope / Description */}
          {proposal.description && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-[11px] font-bold text-gray-800 block mb-1">Proposal Scope / Description:</span>
              <p className="text-gray-600 whitespace-pre-line text-[11px] leading-relaxed max-h-32 overflow-y-auto">
                {proposal.description}
              </p>
            </div>
          )}

          {/* Attachments list */}
          {attachmentsList.length > 0 && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-[11px] font-bold text-gray-800 block mb-1.5">Attached Files ({attachmentsList.length}):</span>
              <div className="space-y-1">
                {attachmentsList.map((att, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[11px] text-gray-700">
                    <FileText size={13} className="text-blue-500 shrink-0" />
                    <span className="font-medium truncate">{att.name || att.file_name || `Attachment #${idx + 1}`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Message to Client */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email Body Message
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded font-normal text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs resize-none"
              placeholder="Add any personal note for the client..."
            />
          </div>

          {/* Automation Notice */}
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-800 flex items-start gap-2">
            <CheckCircle2 size={15} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <strong>Automatic Follow-up:</strong> Sending this email will update the proposal to <strong>Sent</strong> and automatically schedule a follow-up call in 2 days.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded text-xs font-medium transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Sending Proposal...
              </>
            ) : (
              <>
                <Send size={14} /> Send Proposal via Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendProposalEmailModal;

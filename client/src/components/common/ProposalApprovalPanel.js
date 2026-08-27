import React, { useState } from 'react';
import { CheckCircle, XCircle, MessageSquare, AlertCircle, Calendar, User } from 'lucide-react';

const ProposalApprovalPanel = ({ proposal, onApprove, onReject, isManager = false }) => {
  const [reviewComments, setReviewComments] = useState('');
  const [requestedChanges, setRequestedChanges] = useState('');
  const [showApprovalForm, setShowApprovalForm] = useState(false);

  if (proposal.status !== 'Submitted') {
    return null;
  }

  if (!isManager) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded  p-2">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertCircle size={20} />
          <div>
            <h4 className="">Awaiting Manager Approval</h4>
            <p className="text-xs  mt-1">This proposal is pending approval from a manager. You cannot make further changes until approval is complete.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleApprove = async () => {
    if (onApprove) {
      await onApprove({
        status: 'Approved',
        review_comments: reviewComments,
        reviewed_at: new Date().toISOString()
      });
      setReviewComments('');
      setShowApprovalForm(false);
    }
  };

  const handleReject = async () => {
    if (!requestedChanges.trim()) {
      alert('Please specify the requested changes before rejecting');
      return;
    }
    if (onReject) {
      await onReject({
        status: 'Rejected',
        rejection_reason: requestedChanges,
        reviewed_at: new Date().toISOString()
      });
      setRequestedChanges('');
      setShowApprovalForm(false);
    }
  };

  return (
    <div className="bg-white rounded  border border-gray-200p-3 ">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-md  text-gray-900">Proposal Approval</h3>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs   rounded-full">
          Pending Your Review
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="bg-gray-50 p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-gray-500" />
            <span className="text-xs text-gray-600">Submitted</span>
          </div>
          <p className="text-xs   ">
            {new Date(proposal.proposal_date).toLocaleDateString()}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            <User size={16} className="text-gray-500" />
            <span className="text-xs text-gray-600">Submitted By</span>
          </div>
          <p className="text-xs   ">User ID: {proposal.created_by || 'N/A'}</p>
        </div>
      </div>

      <div className="border-t pt-6">
        <h4 className=" text-gray-900 mb-4">Proposal Summary</h4>
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-xs ">
            <span className="text-gray-600">Total Amount:</span>
            <span className=" ">{proposal.currency} {proposal.total_amount || 0}</span>
          </div>
          <div className="flex justify-between text-xs ">
            <span className="text-gray-600">Discount:</span>
            <span className="  text-orange-600">-{proposal.currency} {proposal.discount_amount || 0}</span>
          </div>
          <div className="flex justify-between text-xs ">
            <span className="text-gray-600">Tax:</span>
            <span className="  text-green-600">+{proposal.currency} {proposal.tax_amount || 0}</span>
          </div>
          <div className="flex justify-between text-xs  border-t pt-3">
            <span className=" text-gray-900">Net Total:</span>
            <span className=" text-lg">{proposal.currency} {proposal.total_amount || 0}</span>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <button
          onClick={() => setShowApprovalForm(!showApprovalForm)}
          className="flex items-center gap-2 text-white  hover:text-blue-700   text-xs  mb-4"
        >
          <MessageSquare size={16} />
          {showApprovalForm ? 'Hide Approval Form' : 'Show Approval Form'}
        </button>

        {showApprovalForm && (
          <div className="space-y-4 mb-6 bg-gray-50 p-2 rounded ">
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Review Comments (Optional)
              </label>
              <textarea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Add any feedback or comments about this proposal..."
                rows="3"
                className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Requested Changes (For Rejection)
              </label>
              <textarea
                value={requestedChanges}
                onChange={(e) => setRequestedChanges(e.target.value)}
                placeholder="Specify changes needed if rejecting..."
                rows="3"
                className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6 pt-6 border-t">
        <button
          onClick={handleApprove}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded  hover:bg-green-700 transition-colors  "
        >
          <CheckCircle size={18} />
          Approve Proposal
        </button>
        <button
          onClick={handleReject}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded  hover:bg-red-700 transition-colors  "
        >
          <XCircle size={18} />
          Reject & Request Changes
        </button>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
        <p>
          <strong>Note:</strong> Approving will move this proposal to the next stage where it can be sent to the client.
          Rejecting will allow the creator to make revisions.
        </p>
      </div>
    </div>
  );
};

export default ProposalApprovalPanel;

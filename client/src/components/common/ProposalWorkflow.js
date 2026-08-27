import React, { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, ChevronRight, Download, Send, MessageSquare, Eye } from 'lucide-react';

const ProposalWorkflow = ({ proposal, onStatusChange, onApprove, onReject, onSend, onConvertToInvoice }) => {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');

  const workflowStages = [
    {
      id: 'draft',
      name: 'Draft',
      description: 'Initial proposal creation',
      status: ['Draft'],
      icon: Clock,
      color: 'blue',
      actions: ['Submit for Approval']
    },
    {
      id: 'approval',
      name: 'Approval',
      description: 'Manager review & approval',
      status: ['Submitted', 'Approved'],
      icon: CheckCircle,
      color: 'purple',
      actions: ['Approve', 'Reject']
    },
    {
      id: 'sending',
      name: 'Sending',
      description: 'Send to client',
      status: ['Sent'],
      icon: Send,
      color: 'indigo',
      actions: ['Send to Client']
    },
    {
      id: 'client_review',
      name: 'Client Review',
      description: 'Waiting for client response',
      status: ['Sent'],
      icon: Eye,
      color: 'cyan',
      actions: []
    },
    {
      id: 'negotiation',
      name: 'Negotiation',
      description: 'Client feedback & revisions',
      status: ['Sent', 'Accepted'],
      icon: MessageSquare,
      color: 'amber',
      actions: []
    },
    {
      id: 'acceptance',
      name: 'Acceptance',
      description: 'Proposal accepted by client',
      status: ['Accepted'],
      icon: CheckCircle,
      color: 'green',
      actions: ['Convert to Invoice']
    },
    {
      id: 'rejection',
      name: 'Rejection',
      description: 'Proposal rejected',
      status: ['Declined', 'Rejected'],
      icon: AlertCircle,
      color: 'red',
      actions: []
    }
  ];

  const getCurrentStageIndex = () => {
    const index = workflowStages.findIndex(stage =>
      stage.status.includes(proposal.status)
    );
    return index >= 0 ? index : 0;
  };

  const getCurrentStage = () => workflowStages[getCurrentStageIndex()];

  const getStageColor = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      purple: 'bg-purple-100 text-purple-700 border-purple-300',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
      cyan: 'bg-cyan-100 text-cyan-700 border-cyan-300',
      amber: 'bg-amber-100 text-amber-700 border-amber-300',
      green: 'bg-green-100 text-green-700 border-green-300',
      red: 'bg-red-100 text-red-700 border-red-300'
    };
    return colors[color] || colors.blue;
  };

  const currentStageIndex = getCurrentStageIndex();
  const currentStage = getCurrentStage();

  return (
    <div className="bg-white rounded  border border-gray-200p-3 ">
      <h3 className="text-md  text-gray-900 mb-6">Proposal Workflow</h3>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          {workflowStages.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = index === currentStageIndex;
            const isCompleted = index < currentStageIndex;
            const isUpcoming = index > currentStageIndex;

            return (
              <div key={stage.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center  text-xs  transition-all ${isActive
                        ? getStageColor(stage.color)
                        : isCompleted
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-gray-100 text-[#1F2020]'
                      }`}
                  >
                    <Icon size={20} />
                  </div>
                  <p className="text-xs   text-gray-600 mt-2 text-center">{stage.name}</p>
                </div>

                {index < workflowStages.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-1 ${index < currentStageIndex ? 'bg-green-400' : 'bg-gray-200'
                      }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className={`p-2 rounded  border ${getStageColor(currentStage.color)}`}>
          <div className="flex items-start justify-between">
            <div>
              <h4 className=" text-lg mb-1">{currentStage.name}</h4>
              <p className="text-xs ">{currentStage.description}</p>
            </div>
            <span className="text-xs    px-3 py-1 bg-white rounded border">
              {proposal.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
        <div className="bg-gray-50 p-2 rounded ">
          <h4 className="text-xs   text-gray-700 mb-2">Proposal Details</h4>
          <div className="space-y-2 text-xs ">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className=" ">{proposal.currency} {proposal.total_amount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span className=" ">{new Date(proposal.proposal_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Valid Till:</span>
              <span className=" ">
                {proposal.validity_date ? new Date(proposal.validity_date).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-2 rounded ">
          <h4 className="text-xs   text-gray-700 mb-2">Quick Actions</h4>
          <div className="space-y-2">
            {proposal.status === 'Draft' && (
              <button
                onClick={() => onStatusChange('Submitted')}
                className="w-full p-2 bg-purple-600 text-white text-xs  rounded hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                Submit for Approval
              </button>
            )}
            {proposal.status === 'Submitted' && (
              <>
                <button
                  onClick={() => onApprove && onApprove()}
                  className="w-full p-2 bg-green-600 text-white text-xs  rounded hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => onReject && onReject()}
                  className="w-full p-2 bg-red-600 text-white text-xs  rounded hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
              </>
            )}
            {proposal.status === 'Approved' && (
              <button
                onClick={() => onSend && onSend()}
                className="w-full p-2 bg-indigo-600 text-white text-xs  rounded hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Send size={16} /> Send to Client
              </button>
            )}
            {proposal.status === 'Accepted' && (
              <button
                onClick={() => onConvertToInvoice && onConvertToInvoice()}
                className="w-full p-2 bg-emerald-600 text-white text-xs  rounded hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={16} /> Convert to Invoice
              </button>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowComments(!showComments)}
        className="flex items-center gap-2 text-xs  text-white  hover:text-blue-700  "
      >
        <MessageSquare size={16} />
        {showComments ? 'Hide' : 'Show'} Comments
      </button>

      {showComments && (
        <div className="mt-4 border-t pt-4">
          <div className="space-y-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
            <button
              onClick={() => {
                if (comment.trim()) {
                  console.log('Comment added:', comment);
                  setComment('');
                }
              }}
              className="p-2  bg-red-600  text-white text-xs  rounded hover:bg-blue-700 transition-colors"
            >
              Add Comment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalWorkflow;

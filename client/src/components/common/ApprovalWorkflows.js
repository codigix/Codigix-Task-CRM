import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle, Send, MessageSquare } from 'lucide-react';

const ApprovalWorkflows = () => {
  const [approvals, setApprovals] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [comments, setComments] = useState({});
  const [rejectionReasons, setRejectionReasons] = useState({});

  useEffect(() => {
    fetchApprovals();
  }, [filter]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/approvals?status=${filter}`);
      const data = await res.json();
      setApprovals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId, approvalType, itemId) => {
    try {
      const res = await fetch(`/api/approvals/${approvalId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalType,
          itemId,
          comment: comments[approvalId] || ''
        })
      });

      if (res.ok) {
        fetchApprovals();
        setSelectedApproval(null);
      }
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async (approvalId, approvalType, itemId) => {
    try {
      const res = await fetch(`/api/approvals/${approvalId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalType,
          itemId,
          reason: rejectionReasons[approvalId] || ''
        })
      });

      if (res.ok) {
        fetchApprovals();
        setSelectedApproval(null);
      }
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const getApprovalIcon = (type) => {
    switch (type) {
      case 'Quotation Discount':
        return '💰';
      case 'Change Request':
        return '🔄';
      case 'Project Allocation':
        return '📋';
      case 'Payment Release':
        return '💸';
      default:
        return '📝';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle size={18} className="text-green-600" />;
      case 'Rejected':
        return <XCircle size={18} className="text-red " />;
      case 'Pending':
        return <Clock size={18} className="text-yellow-600" />;
      default:
        return <AlertCircle size={18} className="text-gray-600" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading approval workflows...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl   text-gray-900">Approval Workflows</h2>
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`p-2 rounded   transition-colors ${filter === status
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded p-2   border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Pending Approvals</p>
          <p className="text-3xl   text-yellow-600">
            {approvals.filter(a => a.status === 'Pending').length}
          </p>
        </div>
        <div className="bg-white rounded p-2   border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Approved</p>
          <p className="text-3xl   text-green-600">
            {approvals.filter(a => a.status === 'Approved').length}
          </p>
        </div>
        <div className="bg-white rounded p-2   border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Rejected</p>
          <p className="text-3xl   text-red ">
            {approvals.filter(a => a.status === 'Rejected').length}
          </p>
        </div>
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {approvals.length > 0 ? (
          approvals.map(approval => (
            <div
              key={approval.id}
              className={`bg-white rounded  border-l-4 overflow-hidden ${getStatusColor(approval.status)}`}
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getApprovalIcon(approval.approval_type)}</span>
                    <div>
                      <h3 className=" text-gray-900">{approval.approval_type}</h3>
                      <p className="text-sm text-gray-600">
                        Related to: <span className="">{approval.entity_name}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(approval.status)}
                    <span className={`px-3 py-1 rounded-full text-sm  ${approval.status === 'Approved' ? 'bg-green-200 text-green-800' :
                      approval.status === 'Rejected' ? 'bg-red-200 text-red-800' :
                        'bg-yellow-200 text-yellow-800'
                      }`}>
                      {approval.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                  <div>
                    <p className="text-gray-600">Requested By</p>
                    <p className="">{approval.requested_by_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Priority</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs  ${getPriorityColor(approval.priority)}`}>
                      {approval.priority}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-600">Date</p>
                    <p className="">
                      {new Date(approval.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Approver</p>
                    <p className="">{approval.approver_name || 'Pending'}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded p-3 mb-3">
                  <p className="text-sm  text-gray-700 mb-1">Details:</p>
                  <p className="text-sm text-gray-600">{approval.description}</p>
                </div>

                {approval.approval_type === 'Quotation Discount' && (
                  <div className="bg-blue-50 rounded p-3 mb-3">
                    <p className="text-sm  text-blue-900">Discount Request</p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div>
                        <p className="text-blue-700">Requested:</p>
                        <p className="text-lg   text-blue-900">{approval.discount_percentage || 0}%</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Amount:</p>
                        <p className="text-lg   text-blue-900">₹{approval.discount_amount || 0}</p>
                      </div>
                    </div>
                  </div>
                )}

                {approval.approval_type === 'Change Request' && (
                  <div className="bg-purple-50 rounded p-3 mb-3">
                    <p className="text-sm  text-purple-900">Change Scope</p>
                    <p className="text-sm text-purple-800 mt-1">{approval.change_scope}</p>
                    <p className="text-sm text-purple-700 mt-2">
                      <strong>Impact:</strong> {approval.impact_assessment}
                    </p>
                  </div>
                )}

                {/* Action Section for Pending Approvals */}
                {approval.status === 'Pending' && (
                  <div className="space-y-3 pt-3 border-t">
                    <div>
                      <label className="block text-sm  text-gray-700 mb-2">
                        <MessageSquare size={14} className="inline mr-1" />
                        Comments
                      </label>
                      <textarea
                        value={comments[approval.id] || ''}
                        onChange={(e) => setComments(prev => ({
                          ...prev,
                          [approval.id]: e.target.value
                        }))}
                        placeholder="Add comments..."
                        className="w-full p-2 border border-gray-300 rounded  text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="2"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(approval.id, approval.approval_type, approval.entity_id)}
                        className="flex-1 bg-green-600 text-white p-2 rounded   hover:bg-green-700 flex items-center justify-center gap-2 transition-colors"
                      >
                        <CheckCircle size={18} />
                        Approve
                      </button>
                      <button
                        onClick={() => setSelectedApproval(selectedApproval?.id === approval.id ? null : approval.id)}
                        className="flex-1 bg-red-600 text-white p-2 rounded   hover:bg-red-700 flex items-center justify-center gap-2 transition-colors"
                      >
                        <XCircle size={18} />
                        Reject
                      </button>
                    </div>

                    {/* Rejection Reason */}
                    {selectedApproval?.id === approval.id && (
                      <div>
                        <label className="block text-sm  text-gray-700 mb-2">Reason for Rejection</label>
                        <textarea
                          value={rejectionReasons[approval.id] || ''}
                          onChange={(e) => setRejectionReasons(prev => ({
                            ...prev,
                            [approval.id]: e.target.value
                          }))}
                          placeholder="Explain why this is being rejected..."
                          className="w-full p-2 border border-red-300 rounded  text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          rows="2"
                        />
                        <button
                          onClick={() => handleReject(approval.id, approval.approval_type, approval.entity_id)}
                          className="mt-2 w-full bg-red-600 text-white p-2 rounded   hover:bg-red-700 transition-colors"
                        >
                          Confirm Rejection
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Show decision info for approved/rejected */}
                {approval.status !== 'Pending' && (
                  <div className={`pt-3 border-t ${approval.status === 'Approved' ? 'text-green-700' : 'text-red-700'
                    }`}>
                    <p className="text-sm">
                      <strong>{approval.status} by:</strong> {approval.approved_by_name}
                    </p>
                    {approval.approval_comments && (
                      <p className="text-sm mt-1">
                        <strong>Comment:</strong> {approval.approval_comments}
                      </p>
                    )}
                    <p className="text-sm mt-1">
                      <strong>Date:</strong> {new Date(approval.updated_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded  p-8 text-center text-gray-500 border border-gray-200">
            <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
            <p className="">No {filter} approvals</p>
          </div>
        )}
      </div>

      {/* Approval Types Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded p-2   border border-blue-200">
          <h3 className=" text-blue-900 mb-3">📋 Approval Types</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>💰 <strong>Quotation Discount</strong> - Approval for discount offers to clients</li>
            <li>🔄 <strong>Change Request</strong> - Approval for scope changes in projects</li>
            <li>📋 <strong>Project Allocation</strong> - Approval for department/resource allocation</li>
            <li>💸 <strong>Payment Release</strong> - Approval for payment disbursements</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded p-2   border border-green-200">
          <h3 className=" text-green-900 mb-3">⚙️ Workflow Rules</h3>
          <ul className="space-y-2 text-sm text-green-800">
            <li>✓ All pending approvals require action</li>
            <li>✓ Comments are recorded for audit trail</li>
            <li>✓ Rejection reasons are mandatory</li>
            <li>✓ Approvers must provide justification</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ApprovalWorkflows;

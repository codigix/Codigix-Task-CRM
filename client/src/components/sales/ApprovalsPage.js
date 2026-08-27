import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Info, User, Loader2 } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ApprovalsPage = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/approvals?status=all`);
      if (response.ok) {
        const data = await response.json();
        setApprovals(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching approvals:', err);
      showErrorToast('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action, type, itemId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/approvals/${id}/${action.toLowerCase()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalType: type,
          itemId: itemId,
          comment: action === 'Approve' ? 'Approved through dashboard' : 'Rejected through dashboard'
        })
      });

      if (response.ok) {
        showSuccessToast(`Request ${action.toLowerCase()}ed successfully`);
        fetchApprovals();
      } else {
        showErrorToast(`Failed to ${action.toLowerCase()} request`);
      }
    } catch (err) {
      console.error(`Error ${action.toLowerCase()}ing:`, err);
      showErrorToast(`Error ${action.toLowerCase()}ing request`);
    }
  };

  return (
    <div className="w-full bg-gray-50 min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-xl font-[500] text-gray-900 mb-1">Approvals</h1>
        <div className="flex items-center gap-1 text-xs  text-gray-500">
          <span>Home</span>
          <span>&gt;</span>
          <span>Approvals Center</span>
        </div>
      </div>

      <div className="bg-white rounded border border-gray-200  overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-orange-500" />
            <h2 className="text-[16px]  text-gray-900">Request List</h2>
          </div>
          <span className="text-[12px] bg-orange-50 text-orange-600 p-1  rounded-full ">
            {approvals.filter(a => a.status === 'Pending').length} Pending Requests
          </span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-2 text-gray-500">
              <Loader2 className="animate-spin" size={24} />
              <p className="text-xs">Loading requests...</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-[12px]  text-gray-500 ">Request Type</th>
                  <th className="px-6 py-3 text-[12px]  text-gray-500 ">Requester</th>
                  <th className="px-6 py-3 text-[12px]  text-gray-500 ">Details</th>
                  <th className="px-6 py-3 text-[12px]  text-gray-500 ">Date</th>
                  <th className="px-6 py-3 text-[12px]  text-gray-500 ">Status/Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {approvals.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500 text-xs">No approval requests found</td>
                  </tr>
                ) : (
                  approvals.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="text-xs   text-gray-900">{req.approval_type}</div>
                        <div className="text-xs text-gray-500">{req.entity_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                            <User size={14} className="text-[#1F2020]" />
                          </div>
                          <span className="text-xs  text-gray-600">{req.requested_by_name || 'System'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs   text-gray-900">
                          {req.discount_percentage ? `${req.discount_percentage}% Off` : req.description || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs  text-gray-500">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {req.status === 'Pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAction(req.id, 'Approve', req.approval_type, req.entity_id)}
                              className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded text-[12px] hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                            <button
                              onClick={() => handleAction(req.id, 'Reject', req.approval_type, req.entity_id)}
                              className="flex items-center gap-1 bg-red-50 text-red  px-3 py-1 rounded text-[12px] border border-red-100 hover:bg-red-100 transition-colors"
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className={`text-[12px] p-1  rounded border ${req.status === 'Approved'
                            ? 'text-green-600 bg-green-50 border-green-100'
                            : 'text-red  bg-red-50 border-red-100'
                            }`}>
                            {req.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded  p-3 flex items-start gap-3">
        <Info size={20} className="text-blue-500 mt-0.5" />
        <div>
          <h4 className="text-[14px]  text-blue-900">Approval Workflow</h4>
          <p className="text-xs  text-blue-700 mt-1">
            Requests are automatically routed to the direct manager. High-value discount requests ( {'>'} 20% ) require additional VP approval.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApprovalsPage;

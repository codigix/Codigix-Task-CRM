import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, ShieldCheck, RefreshCw, Calculator, History } from 'lucide-react';
import { API_BASE_URL } from '../../../config/environment';
import Swal from 'sweetalert2';

const ITManagerReviewGate = ({ isOpen, onClose, issue, subtasks, onReviewComplete, department }) => {
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [ledger, setLedger] = useState(null);

  useEffect(() => {
    if (isOpen && issue?.id) {
      fetchRecalculate();
    }
  }, [isOpen, issue?.id]);

  const fetchRecalculate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/performance/recalculate/${issue.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '5' // Assuming manager user ID for testing
        }
      });
      const data = await res.json();
      if (res.ok) {
        setProposal(data.proposedAllocation);
        setLedger(data.ledgerPreview);
      } else {
        Swal.fire('Error', data.error || 'Failed to recalculate', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/performance/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '5'
        },
        body: JSON.stringify({ task_id: issue.id })
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire('Approved', 'Performance points have been stamped to the ledger.', 'success');
        if (onReviewComplete) onReviewComplete();
        onClose();
      } else {
        Swal.fire('Error', data.error || 'Approval failed', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-800">
            <ShieldCheck size={20} className="text-emerald-600" />
            <h2 className="text-lg font-bold">Manager Review Gate</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded text-gray-500 transition">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded flex gap-3 text-sm text-blue-800">
            <Calculator size={18} className="shrink-0 mt-0.5 text-blue-600" />
            <div>
              <p className="font-semibold">Performance Recalculation</p>
              <p className="mt-1 opacity-90">
                The engine has calculated the performance distribution based on the <strong>{issue?.contribution_method || 'WORK_BREAKDOWN'}</strong> method. 
                Task Effort Points: <span className="font-bold">{issue?.effort_points || 0} pts</span>.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-sm font-medium text-gray-600">Calculating ledger...</span>
            </div>
          ) : (
            <>
              {proposal && proposal.length > 0 ? (
                <div className="border border-gray-200 rounded overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                    <CheckCircle size={14} className="text-gray-600" />
                    <span className="text-sm font-semibold text-gray-700">Proposed Point Distribution</span>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                        <th className="px-4 py-2">Assignee</th>
                        <th className="px-4 py-2">Earned Points</th>
                        <th className="px-4 py-2">% Share</th>
                        <th className="px-4 py-2">Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.map((p, idx) => (
                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-gray-800">{p.assignee}</td>
                          <td className="px-4 py-3 font-bold text-emerald-600">{p.points}</td>
                          <td className="px-4 py-3 text-gray-600">{p.percentage}%</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{p.evidenceType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-gray-500 border border-dashed border-gray-300 rounded">
                  No proposed contributions found. Ensure subtasks are marked "Done" or valid Time Logs are approved.
                </div>
              )}

              {/* Warning Log */}
              {issue?.effort_points === 0 && (
                <div className="flex gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <p><strong>Warning:</strong> Effort Points for this task is set to 0. No performance credit will be distributed.</p>
                </div>
              )}
            </>
          )}

          {/* Guidelines */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <h4 className="font-semibold text-gray-700 mb-1 flex items-center gap-1.5"><History size={13} /> Immutable Audit Ledger</h4>
            <p>Approving this distribution will permanently stamp these points to the performance ledger. Assignment itself does not grant points; only validated work is credited.</p>
            {department === 'Marketing' ? (
              <p className="mt-2 pt-2 border-t border-gray-200">
                <strong>Marketing Evidence:</strong> Review is based on subtask delivery, file attachments, linked CRM Campaigns, and approved Time Logs.
              </p>
            ) : (
              <p className="mt-2 pt-2 border-t border-gray-200">
                <strong>IT Evidence:</strong> Review is based on GitHub PRs/Commits, code quality, QA validation, and approved Time Logs.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button 
            onClick={fetchRecalculate}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition"
          >
            <RefreshCw size={14} /> Recalculate
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded transition">
              Cancel
            </button>
            <button 
              onClick={handleApprove}
              disabled={loading || !proposal || proposal.length === 0}
              className="px-6 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow disabled:opacity-50 transition"
            >
              Approve & Lock Points
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ITManagerReviewGate;

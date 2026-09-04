import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertTriangle, ShieldCheck, RefreshCw, Calculator, History } from 'lucide-react';
import { API_BASE_URL } from '../../../config/environment';
import Swal from 'sweetalert2';

const ITManagerReviewGate = ({ isOpen, onClose, issue, subtasks, onReviewComplete, department }) => {
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [ledger, setLedger] = useState(null);

  const isDone = ['done', 'completed', 'closed'].includes(String(issue?.status || '').toLowerCase().trim());

  useEffect(() => {
    if (isOpen && issue?.id) {
      fetchRecalculate();
    }
  }, [isOpen, issue?.id]);

  const fetchRecalculate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/performance-engine/tasks/${issue.id}/contribution/recalculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '5' // Assuming manager user ID for testing
        }
      });
      const data = await res.json();
      if (res.ok) {
        setProposal(data.proposedContributions || []);
        setLedger(null);
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
      const res = await fetch(`${API_BASE_URL}/performance-engine/tasks/${issue.id}/contribution/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '5'
        },
        body: JSON.stringify({ contributions: proposal })
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

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4" style={{ zIndex: 999999 }}>
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
                Task Effort Points: <span className="font-bold">{issue?.effort_points || issue?.story_points || 0} pts</span>.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {proposal && proposal.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 text-xs uppercase border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Team Member</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3 text-right">Points</th>
                        <th className="px-4 py-3 text-right">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.map((p, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{p.user_id}</td>
                          <td className="px-4 py-3">{p.role}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600">+{p.effort_points}</td>
                          <td className="px-4 py-3 text-right text-gray-500">
                            {p.contribution_percentage ? `${p.contribution_percentage}%` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 border border-dashed border-gray-300 rounded">
                  No proposed contributions found. Ensure subtasks are marked "Done" or valid Time Logs are approved.
                </div>
              )}
            </div>
          )}

          {/* Audit Rule */}
          <div className="bg-gray-50 border border-gray-200 rounded p-4 flex gap-3 text-sm text-gray-600 mt-6">
            <History size={16} className="shrink-0 mt-0.5 text-gray-500" />
            <div>
              <p className="font-bold text-gray-700">Immutable Audit Ledger</p>
              <p className="mt-1">
                Approving this distribution will permanently stamp these points to the performance ledger. Assignment itself does not grant points; only validated work is credited.
              </p>
              <p className="mt-2 text-xs italic text-gray-500">
                IT Evidence: Review is based on GitHub PRs/Commits, code quality, QA validation, and approved Time Logs.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchRecalculate}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Recalculate
            </button>
            {!isDone && (
              <span className="text-amber-600 text-xs font-semibold flex items-center gap-1">
                <AlertTriangle size={14} /> Task must be 'Done' to approve points
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={loading || !proposal || proposal.length === 0 || !isDone}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isDone ? "Task must be marked as Done" : "Approve and lock points"}
            >
              <CheckCircle size={16} />
              Approve & Lock Points
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ITManagerReviewGate;

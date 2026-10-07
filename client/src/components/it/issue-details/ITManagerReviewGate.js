import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertTriangle, ShieldCheck, RefreshCw, Calculator, History, Trash2, Info } from 'lucide-react';
import { API_BASE_URL } from '../../../config/environment';
import { ticketDeleteHeaders } from '../../../utils/access';
import Swal from 'sweetalert2';

const METHOD_LABELS = {
  WORK_BREAKDOWN: 'Work Breakdown (Subtasks)',
  TIME_BASED: 'Time Log',
  MANAGER_ALLOCATED: 'Manual Allocation'
};

const isDoneStatus = (s) => ['done', 'completed', 'closed'].includes(String(s || '').toLowerCase().trim());

const ITManagerReviewGate = ({ isOpen, onClose, issue, onReviewComplete }) => {
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rows, setRows] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const issueKey = issue?.issue_key || issue?.key;
  const isDone = isDoneStatus(issue?.status);

  // Board tickets are addressed by key with source=it_kanban: their numeric ids overlap
  // with general tasks, so an id alone could load (and approve) the wrong task.
  const endpoint = (action) =>
    `${API_BASE_URL}/performance-engine/tasks/${encodeURIComponent(issueKey)}/contribution/${action}?source=it_kanban`;

  const recalculate = useCallback(async () => {
    if (!issueKey) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(endpoint('recalculate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...ticketDeleteHeaders() }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to calculate contributions');
      setResult(data);
      setRows((data.proposedContributions || []).map(p => ({ ...p, effort_points: Number(p.effort_points) || 0 })));
    } catch (err) {
      setError(err.message || 'Network error');
      setRows([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueKey]);

  // Recalculate every time the gate opens, so it reflects the ticket as it is now
  // (points, method or subtasks may have changed since it was last opened).
  useEffect(() => {
    if (isOpen) recalculate();
  }, [isOpen, recalculate]);

  const totalPoints = Number(result?.effortPoints ?? issue?.effort_points ?? 0);
  const allocated = rows.reduce((sum, r) => sum + (Number(r.effort_points) || 0), 0);
  const alreadyApproved = (result?.reviewStatus || issue?.contribution_review_status) === 'Approved';

  const updateRowPoints = (idx, value) => {
    const n = value === '' ? '' : Math.max(0, Number(value));
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, effort_points: n } : r));
  };

  const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));

  const blockReason = !isDone
    ? 'Move the ticket to Done before approving points.'
    : rows.length === 0
      ? 'There is nobody to credit yet.'
      : rows.some(r => r.effort_points === '' || Number.isNaN(Number(r.effort_points)))
        ? 'Every person needs a points value.'
        : '';

  const handleApprove = async () => {
    if (blockReason) return;
    if (allocated !== totalPoints) {
      const confirm = await Swal.fire({
        icon: 'question',
        title: 'Points don\'t add up',
        text: `You are approving ${allocated} pts, but the ticket is worth ${totalPoints} pts. Approve anyway?`,
        showCancelButton: true,
        confirmButtonText: 'Approve anyway',
        confirmButtonColor: '#10b981'
      });
      if (!confirm.isConfirmed) return;
    }

    setApproving(true);
    try {
      const res = await fetch(endpoint('approve'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...ticketDeleteHeaders() },
        body: JSON.stringify({
          contributions: rows.map(r => ({ ...r, effort_points: Number(r.effort_points) || 0 }))
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Approval failed');
      Swal.fire({ icon: 'success', title: 'Approved', text: 'Performance points have been recorded.', timer: 1800, showConfirmButton: false });
      if (onReviewComplete) onReviewComplete();
      onClose();
    } catch (err) {
      Swal.fire('Could not approve', err.message || 'Network error', 'error');
    } finally {
      setApproving(false);
    }
  };

  if (!isOpen) return null;

  const method = result?.contributionMethod || issue?.contribution_method || 'WORK_BREAKDOWN';

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 p-4"
      style={{ zIndex: 999999 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !approving) onClose(); }}
    >
      <div className="bg-white rounded shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-800 min-w-0">
            <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
            <h2 className="text-lg  truncate">Manager Review Gate</h2>
            <span className="text-sm text-gray-500 font-medium">{issueKey}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded text-gray-500 transition cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded flex gap-3 text-sm text-blue-800">
            <Calculator size={18} className="shrink-0 mt-0.5 text-blue-600" />
            <div>
              <p className="">Proposed point distribution</p>
              <p className="mt-1 opacity-90">
                Method: <strong>{METHOD_LABELS[method] || method}</strong> · Ticket worth: <strong>{totalPoints} pts</strong>.
                You can adjust each person's points before approving.
              </p>
            </div>
          </div>

          {alreadyApproved && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded flex gap-2 text-sm text-emerald-800">
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
              <span>Points for this ticket were already approved. Approving again replaces the earlier distribution.</span>
            </div>
          )}

          {(result?.notes || []).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm text-amber-800 space-y-1">
              {result.notes.map((n, i) => (
                <div key={i} className="flex gap-2"><Info size={14} className="shrink-0 mt-0.5" /><span>{n}</span></div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : rows.length > 0 ? (
            <div className="border border-gray-200 rounded overflow-hidden">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="bg-gray-50 text-gray-700 text-xs uppercase border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Team member</th>
                    <th className="px-4 py-3">Credited for</th>
                    <th className="px-4 py-3 text-right w-28">Points</th>
                    <th className="px-4 py-3 text-right w-20">Share</th>
                    <th className="px-2 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p, idx) => (
                    <tr key={`${p.user_id}-${p.subtask_id || idx}`} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-800">{p.user_name || p.user_id}</div>
                        <div className="text-xs text-gray-400">{p.role}</div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[220px] truncate" title={p.contribution_source}>
                        {p.contribution_source}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          value={p.effort_points}
                          onChange={(e) => updateRowPoints(idx, e.target.value)}
                          className="w-20 text-right border border-gray-300 rounded px-2 py-1 text-sm text-emerald-700  outline-none focus:border-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500 text-xs">
                        {allocated > 0 ? `${Math.round((Number(p.effort_points) || 0) / allocated * 100)}%` : '–'}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <button
                          onClick={() => removeRow(idx)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Remove from this distribution"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200 text-sm">
                  <tr>
                    <td className="px-4 py-2.5  text-gray-700" colSpan={2}>Total</td>
                    <td className={`px-4 py-2.5 text-right  ${allocated === totalPoints ? 'text-emerald-700' : 'text-amber-600'}`}>
                      {allocated} / {totalPoints}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : !error && (
            <div className="p-8 text-center text-gray-500 border border-dashed border-gray-300 rounded text-sm">
              Nobody to credit yet. Mark subtasks complete with an assignee, log time, or assign the ticket, then recalculate.
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded p-4 flex gap-3 text-sm text-gray-600">
            <History size={16} className="shrink-0 mt-0.5 text-gray-500" />
            <div>
              <p className="text-gray-700 font-medium">Performance ledger</p>
              <p className="mt-1">
                Approving records these points against each person. Assignment alone earns nothing; only completed work is credited.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={recalculate}
              disabled={loading || approving}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Recalculate
            </button>
            {blockReason && !loading && (
              <span className="text-amber-600 text-xs  flex items-center gap-1">
                <AlertTriangle size={14} className="shrink-0" /> {blockReason}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-sm font-medium text-gray-600 hover:text-gray-900 p-2 cursor-pointer">
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={loading || approving || !!blockReason}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-3 py-2 rounded shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title={blockReason || 'Approve and record points'}
            >
              <CheckCircle size={16} />
              {approving ? 'Approving…' : alreadyApproved ? 'Re-approve Points' : 'Approve & Lock Points'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ITManagerReviewGate;

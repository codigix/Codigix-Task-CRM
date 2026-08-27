import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';

const DONE_STATUSES = ['DONE', 'COMPLETED', 'CLOSED'];
const isDone = (status) => DONE_STATUSES.includes(String(status || '').toUpperCase().trim());

/**
 * Jira's Complete Sprint dialog.
 *
 * Because a board can run several sprints at once, the dialog opens with a sprint selector
 * rather than assuming which one you meant. It then explains what counts as completed
 * (anything in the Done column) versus open, and asks where the open work should go.
 */
const CompleteSprintModal = ({ isOpen, sprints, initialSprintId, onCancel, onComplete }) => {
  const active = sprints.filter(s => s.status === 'Active');

  const [sprintId, setSprintId] = useState('');
  const [moveTo, setMoveTo] = useState('new');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const fallback = active[0]?.id;
    setSprintId(String(initialSprintId || fallback || ''));
    setMoveTo('new');
    setError('');
  }, [isOpen, initialSprintId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const sprint = sprints.find(s => String(s.id) === String(sprintId)) || null;
  const issues = sprint?.issues || [];
  const doneCount = issues.filter(i => isDone(i.status)).length;
  const openCount = issues.length - doneCount;

  // Anything still running or planned can receive the leftover work — except this sprint.
  const otherSprints = sprints.filter(
    s => String(s.id) !== String(sprintId) && s.status !== 'Completed'
  );

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  const handleComplete = async () => {
    if (!sprint) return setError('Choose a sprint to complete.');
    setIsSaving(true);
    setError('');
    try {
      await onComplete(sprint, moveTo);
    } catch (err) {
      setError(err.message || 'Could not complete the sprint.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto">
        {/* Jira's celebratory banner */}
        <div className="h-[150px] bg-gradient-to-b from-cyan-400 to-cyan-300 flex items-end justify-center relative">
          <div className="absolute -bottom-1 w-20 h-20 rounded-full bg-white/0 flex items-center justify-center">
            <Trophy size={56} className="text-amber-400 drop-shadow" fill="currentColor" />
          </div>
        </div>

        <div className="px-8 pt-8 pb-5">
          <h2 className="text-xl font-semibold text-gray-900 mb-5">Complete sprint</h2>

          {error && (
            <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <label className="block text-[13px] font-semibold text-gray-700 mb-1">Select a sprint</label>
          <select
            value={sprintId}
            onChange={(e) => setSprintId(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {active.length === 0 && <option value="">No sprint is running</option>}
            {active.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {sprint && (
            <>
              <p className="text-[14px] text-gray-800 mt-5">
                This sprint contains <strong>{plural(doneCount, 'completed work item')}</strong> and{' '}
                <strong>{plural(openCount, 'open work item')}</strong>.
              </p>

              <ul className="mt-3 space-y-2 text-[13px] text-gray-600 list-disc pl-5">
                <li>
                  Completed work items includes everything in the last column on the board, <strong>Done</strong>.
                </li>
                <li>
                  Open work items includes everything from any other column on the board. Move these to a
                  new sprint or the backlog.
                </li>
              </ul>

              {openCount > 0 && (
                <div className="mt-5">
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1">
                    Move open work items to
                  </label>
                  <select
                    value={moveTo}
                    onChange={(e) => setMoveTo(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="new">New sprint</option>
                    <option value="backlog">Backlog</option>
                    {otherSprints.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.status === 'Active' ? ' (active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-8 pb-6">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-[14px] font-medium text-gray-700 hover:bg-gray-100 rounded transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            disabled={isSaving || !sprint}
            className="px-5 py-2 text-[14px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
          >
            {isSaving ? 'Completing…' : 'Complete sprint'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteSprintModal;

import React, { useState } from 'react';
import { MessageSquare, History, Clock, Sparkles, Trash2, Plus } from 'lucide-react';

// "2 hours ago" style stamps, matching how Jira presents activity.
const relativeTime = (value) => {
  if (!value) return '';
  const then = new Date(value);
  if (isNaN(then.getTime())) return String(value);
  const diff = Math.floor((Date.now() - then.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) === 1 ? '' : 's'} ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) === 1 ? '' : 's'} ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) === 1 ? '' : 's'} ago`;
  return then.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const FIELD_LABELS = {
  status: 'Status', priority: 'Priority', assignee: 'Assignee', reporter: 'Reporter',
  title: 'Summary', description: 'Description', type: 'Work type', team: 'Team',
  sprint: 'Sprint', due_date: 'Due date', start_date: 'Start date', progress: 'Progress',
  original_estimate: 'Original estimate', remaining_estimate: 'Remaining estimate', time_spent: 'Time spent'
};

const initialsOf = (name) => String(name || 'U').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

const ITIssueActivityTabs = ({
  activeTab,
  setActiveTab,
  comments,
  newCommentText,
  setNewCommentText,
  isCommenting,
  setIsCommenting,
  handleAddComment,
  deleteComment,
  commentInputRef,
  docsData,
  historyEntries = [],
  worklogData = { worklogs: [], totalSpent: '0h', originalEstimate: '0h', remainingEstimate: '0h' },
  handleLogWork,
  handleDeleteWorklog,
  handleGenerateDocs,
  aiDocsLoading
}) => {
  const [isLoggingWork, setIsLoggingWork] = useState(false);
  const [workForm, setWorkForm] = useState({ timeSpent: '', description: '', startedAt: '', originalEstimate: '' });

  const submitWorkLog = async () => {
    if (!workForm.timeSpent.trim()) return;
    await handleLogWork(workForm);
    setWorkForm({ timeSpent: '', description: '', startedAt: '', originalEstimate: '' });
    setIsLoggingWork(false);
  };
  return (
    <div className="space-y-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-700 tracking-wide">Activity</label>
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded text-[11px] font-medium text-gray-600">
          {['Comments', 'History', 'Work log', 'AI Docs'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                activeTab === tab
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'hover:text-gray-900'
              }`}
            >
              {tab === 'Comments' && <MessageSquare size={11} className="inline mr-1" />}
              {tab === 'History' && <History size={11} className="inline mr-1" />}
              {tab === 'Work log' && <Clock size={11} className="inline mr-1" />}
              {tab === 'AI Docs' && <Sparkles size={11} className="inline mr-1 text-indigo-500" />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* COMMENTS TAB */}
      {activeTab === 'Comments' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
              CI
            </div>
            <div className="flex-1 space-y-2">
              {isCommenting ? (
                <div className="border border-blue-500 ring-1 ring-blue-500 rounded p-2 bg-white space-y-2">
                  <textarea
                    ref={commentInputRef}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full text-xs outline-none resize-none h-16 font-sans leading-relaxed text-gray-800"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleAddComment();
                      }
                    }}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-normal">
                      Pro tip: press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-[9px] font-mono">Ctrl + Enter</kbd> to save
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddComment}
                        disabled={!newCommentText.trim()}
                        className={`px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition cursor-pointer ${!newCommentText.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setNewCommentText(''); setIsCommenting(false); }}
                        className="px-3 py-1 border border-gray-300 hover:bg-gray-100 rounded text-xs font-medium transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setIsCommenting(true);
                    setTimeout(() => commentInputRef.current?.focus(), 50);
                  }}
                  className="border border-gray-200 hover:border-gray-300 rounded p-2 text-xs text-gray-400 cursor-text transition"
                >
                  Add a comment...
                </div>
              )}
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-3 pt-2">
            {comments.map((c, i) => (
              <div key={i} className="flex gap-2 group text-xs">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                  {c.author ? c.author.slice(0, 2).toUpperCase() : 'U'}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{c.author || 'User'}</span>
                    <span className="text-[10px] text-gray-400">{c.time || 'Just now'}</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed bg-gray-50/50 p-2 rounded border border-gray-100">
                    {c.text}
                  </p>
                </div>
                <button
                  onClick={() => deleteComment(i)}
                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 self-start transition cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTORY TAB — audit trail of field changes */}
      {activeTab === 'History' && (
        <div className="space-y-2">
          {historyEntries.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No changes recorded yet. Edits to this issue will appear here.</p>
          ) : (
            historyEntries.map(entry => (
              <div key={entry.id} className="flex gap-2 py-2 border-b border-gray-50 last:border-0">
                <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                  {initialsOf(entry.changed_by)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-800">
                    <span className="font-semibold">{entry.changed_by}</span>
                    <span className="text-gray-500"> updated </span>
                    <span className="font-semibold">{FIELD_LABELS[entry.field] || entry.field}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] line-through max-w-[200px] truncate">
                      {entry.old_value || 'None'}
                    </span>
                    <span className="text-gray-400 text-[10px]">→</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium max-w-[200px] truncate">
                      {entry.new_value || 'None'}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">{relativeTime(entry.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* WORK LOG TAB — time tracking */}
      {activeTab === 'Work log' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Estimated', value: worklogData.originalEstimate || '0h', cls: 'text-gray-700' },
              { label: 'Logged', value: worklogData.totalSpent || '0h', cls: 'text-blue-600' },
              { label: 'Remaining', value: worklogData.remainingEstimate || '0h', cls: 'text-emerald-600' }
            ].map(s => (
              <div key={s.label} className="border border-gray-200 rounded p-2 bg-gray-50/50">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">{s.label}</div>
                <div className={`text-sm font-bold ${s.cls}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {isLoggingWork ? (
            <div className="border border-blue-500 ring-1 ring-blue-500 rounded p-2.5 bg-white space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-1">Time spent *</label>
                  <input
                    autoFocus
                    type="text"
                    value={workForm.timeSpent}
                    onChange={(e) => setWorkForm(p => ({ ...p, timeSpent: e.target.value }))}
                    placeholder="e.g. 3h 30m"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-1">Date started</label>
                  <input
                    type="datetime-local"
                    value={workForm.startedAt}
                    onChange={(e) => setWorkForm(p => ({ ...p, startedAt: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              {(!worklogData.originalEstimate || worklogData.originalEstimate === '0h') && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-1">Original estimate (optional)</label>
                  <input
                    type="text"
                    value={workForm.originalEstimate}
                    onChange={(e) => setWorkForm(p => ({ ...p, originalEstimate: e.target.value }))}
                    placeholder="e.g. 1d"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                  />
                </div>
              )}
              <textarea
                value={workForm.description}
                onChange={(e) => setWorkForm(p => ({ ...p, description: e.target.value }))}
                placeholder="What did you work on?"
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 resize-none h-14"
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">Use w / d / h / m — e.g. 1d 4h. 1d = 8h.</span>
                <div className="flex gap-2">
                  <button
                    onClick={submitWorkLog}
                    disabled={!workForm.timeSpent.trim()}
                    className={`px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition ${!workForm.timeSpent.trim() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setIsLoggingWork(false); setWorkForm({ timeSpent: '', description: '', startedAt: '', originalEstimate: '' }); }}
                    className="px-3 py-1 border border-gray-300 hover:bg-gray-100 rounded text-xs font-medium transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsLoggingWork(true)}
              className="flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:underline cursor-pointer"
            >
              <Plus size={12} /> Log time
            </button>
          )}

          {worklogData.worklogs.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">No time logged yet.</p>
          ) : (
            <div className="space-y-1">
              {worklogData.worklogs.map(w => (
                <div key={w.id} className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0 group">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {initialsOf(w.author)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-800">
                      <span className="font-semibold">{w.author}</span>
                      <span className="text-gray-500"> logged </span>
                      <span className="font-semibold text-blue-600">{w.timeSpent}</span>
                    </div>
                    {w.description && <div className="text-[11px] text-gray-600 mt-0.5">{w.description}</div>}
                    <div className="text-[10px] text-gray-400 mt-0.5">{relativeTime(w.started_at || w.created_at)}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteWorklog(w.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition p-1 cursor-pointer"
                    title="Delete work log"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI DOCS TAB */}
      {activeTab === 'AI Docs' && (
        docsData ? (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-indigo-50/30 border border-indigo-100 rounded-lg space-y-3">
              {[
                ['Implementation Plan', docsData.implementation_plan],
                ['QA Testing Checklist', docsData.qa_checklist],
                ['Deployment Checklist', docsData.deployment_checklist],
                ['Rollback Plan', docsData.rollback_checklist]
              ].filter(([, body]) => body).map(([heading, body]) => (
                <div key={heading}>
                  <h4 className="font-semibold text-indigo-900 mb-1">{heading}</h4>
                  <div className="bg-white border border-gray-200 rounded p-2.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: body }} />
                </div>
              ))}
            </div>
            <button onClick={handleGenerateDocs} disabled={aiDocsLoading}
              className="text-xs text-indigo-600 font-medium hover:underline cursor-pointer disabled:opacity-50">
              {aiDocsLoading ? 'Regenerating…' : 'Regenerate docs'}
            </button>
          </div>
        ) : (
          <div className="text-center py-5 space-y-2">
            <p className="text-xs text-gray-400">No docs generated for this issue yet.</p>
            <button
              onClick={handleGenerateDocs}
              disabled={aiDocsLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={12} />
              {aiDocsLoading ? 'Generating…' : 'Generate docs with AI'}
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default ITIssueActivityTabs;

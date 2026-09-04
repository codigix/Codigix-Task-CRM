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
  aiDocsLoading,
  githubData,
  issueKey,
  department
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
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded text-xs font-medium text-gray-600">
          {['Comments', 'History', 'Work log', ...(department === 'IT' ? ['GitHub'] : []), 'AI Docs'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${activeTab === tab
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'hover:text-gray-900'
                }`}
            >
              {tab === 'Comments' && <MessageSquare size={11} className="inline mr-1" />}
              {tab === 'History' && <History size={11} className="inline mr-1" />}
              {tab === 'Work log' && <Clock size={11} className="inline mr-1" />}
              {tab === 'GitHub' && <svg className="inline mr-1 w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path></svg>}
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
                    {w.description && <div className="text-xs text-gray-600 mt-0.5">{w.description}</div>}
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

      {/* GITHUB EVIDENCE TAB */}
      {activeTab === 'GitHub' && (
        <div className="space-y-4">
          <div className="flex gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path></svg>
            <p>GitHub evidence mapped to <strong>{issueKey}</strong>. Commits and Pull Requests provide traceability but do not automatically grant performance points.</p>
          </div>
          
          {(!githubData?.commits?.length && !githubData?.prs?.length) ? (
            <div className="text-center py-5 text-xs text-gray-400">
              No GitHub activity linked to {issueKey} yet.
            </div>
          ) : (
            <div className="space-y-4">
              {githubData?.prs?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-700 border-b border-gray-100 pb-1">Pull Requests</h4>
                  {githubData.prs.map(pr => (
                    <div key={pr.id} className="text-xs bg-white border border-gray-200 rounded p-2.5 flex items-start gap-3">
                      <div className={`mt-0.5 shrink-0 ${pr.state === 'open' ? 'text-green-600' : 'text-purple-600'}`}>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.25 2.25 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1.5 1.5 0 011.5 1.5v5.628a2.25 2.25 0 101.5 0V5.5A3 3 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"></path></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <a href={pr.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline">{pr.title}</a>
                          <span className="text-[10px] text-gray-400">{relativeTime(pr.created_at)}</span>
                        </div>
                        <div className="text-gray-500 mt-0.5">#{pr.pr_number} • {pr.state}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {githubData?.commits?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-700 border-b border-gray-100 pb-1">Commits</h4>
                  {githubData.commits.map(commit => (
                    <div key={commit.id} className="text-xs bg-white border border-gray-200 rounded p-2.5 flex items-start gap-3">
                      <div className="mt-0.5 text-gray-400 shrink-0">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M10.5 7.75a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm1.43.75a4.002 4.002 0 01-7.86 0H.75a.75.75 0 110-1.5h3.32a4.001 4.001 0 017.86 0h3.32a.75.75 0 110 1.5h-3.32z"></path></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-gray-800 line-clamp-2">{commit.message}</span>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{relativeTime(commit.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1 rounded border border-gray-200">
                            <a href={commit.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">{commit.commit_hash?.substring(0, 7)}</a>
                          </span>
                          <span className="text-gray-500">{commit.author}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

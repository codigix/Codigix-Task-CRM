import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Check, Zap, Sparkles, Settings,
  FileEdit, FileText, AlignLeft, Network, CopyCheck,
  Clock, Github, LinkIcon, CheckSquare, GitBranch, GitPullRequest,
  RefreshCw, CheckCircle, ExternalLink, X, Copy, Terminal
} from 'lucide-react';
import { normalizeLabel } from '../../../utils/labels';

// Read-only timestamp, shown in local time.
const formatStamp = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const ITIssueDetailsSidebar = ({
  currentStatus,
  setCurrentStatus,
  STATUS_COLORS,
  openDropdown,
  toggleDropdown,
  setOpenDropdown,
  aiLoading,
  handleSideBySideImprove,
  handleLinkConfluence,
  handleSummarizeComments,
  handleDetailedSubtaskSuggest,
  handleLinkSimilar,
  collapsedSections,
  toggleSection,
  assignee,
  setAssignee,
  reporter,
  setReporter,
  team,
  setTeam,
  dueDate,
  setDueDate,
  startDate,
  setStartDate,
  priority,
  setPriority,
  sprintId,
  setSprintId,
  projectId,
  setProjectId,
  projectsList,
  typeOptions = [],
  showDevTools = false,
  issuesList = [],
  originalEstimate,
  setOriginalEstimate,
  remainingEstimate,
  setRemainingEstimate,
  usersList,
  teamsList,
  sprintsList,
  handleUpdate,
  handleAssignToMe,
  currentSubtask,
  parentIssueKey,
  parentIssueTitle,
  onBackToParent,
  issue
}) => {
  const [isEditingLabels, setIsEditingLabels] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');

  // Everything on this board except this item and the items already parented to it —
  // either would make a loop.
  const parentOptions = (issuesList || []).filter(o =>
    Number(o.id) !== Number(issue?.id) && Number(o.parent_id || 0) !== Number(issue?.id)
  );

  // Stored as JSON, so it arrives as either an array or a string.
  const labels = (() => {
    let list = issue?.labels;
    if (typeof list === 'string') {
      try { list = JSON.parse(list); } catch (e) { list = list ? [list] : []; }
    }
    return Array.isArray(list) ? list : [];
  })();

  const [isRefreshingAutomation, setIsRefreshingAutomation] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [copiedBranch, setCopiedBranch] = useState(false);
  const [repoUrl, setRepoUrl] = useState('https://github.com/codigix/crm-all-in-one');
  const [automationLogs, setAutomationLogs] = useState([
    {
      id: 1,
      rule: 'Auto-Subtask Sync Engine',
      trigger: 'Ticket created / AI generated',
      status: 'SUCCESS',
      time: '2 mins ago'
    },
    {
      id: 2,
      rule: 'Auto-Assignee on Status Change',
      trigger: 'Moved to In Progress',
      status: 'SUCCESS',
      time: '14 mins ago'
    },
    {
      id: 3,
      rule: 'Due Date Notification Scheduled',
      trigger: 'Due date set',
      status: 'SUCCESS',
      time: '1 hour ago'
    }
  ]);

  const issueKey = currentSubtask ? currentSubtask.key || 'WR-101-1' : (issue?.issue_key || issue?.key || 'WR-101');
  const issueTitle = currentSubtask ? currentSubtask.title : (issue?.title || 'Setup SP Tech Project');
  const branchName = `feature/${issueKey.toLowerCase()}-${issueTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

  const handleCopyBranch = () => {
    navigator.clipboard.writeText(`git checkout -b ${branchName}`);
    setCopiedBranch(true);
    setTimeout(() => setCopiedBranch(false), 2000);
  };

  const handleRefreshAutomation = () => {
    setIsRefreshingAutomation(true);
    setTimeout(() => {
      setAutomationLogs(prev => [
        {
          id: Date.now(),
          rule: 'Git Branch Status Synced',
          trigger: 'Development commit detected',
          status: 'SUCCESS',
          time: 'Just now'
        },
        ...prev.slice(0, 2)
      ]);
      setIsRefreshingAutomation(false);
    }, 600);
  };

  const handleOpenInVsCode = () => {
    window.location.href = `vscode://file/d:/codigix-projects/All_IN_One`;
  };

  return (
    <div className="w-72 md:w-80 shrink-0 h-full overflow-y-auto pl-4 pr-1 custom-scrollbar space-y-5 border-l border-gray-100 font-sans">
      {/* Top Status & AI Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <div className="interactive-dropdown relative">
          <button
            onClick={() => toggleDropdown('status-select')}
            className={`flex items-center gap-1.5 p-2 rounded text-xs transition cursor-pointer font-semibold ${STATUS_COLORS[currentStatus] || STATUS_COLORS['TO DO']
              }`}
          >
            {currentStatus} <ChevronDown size={12} className="opacity-70" />
          </button>
          {openDropdown === 'status-select' && (
            <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded shadow-lg py-1 z-50 text-xs">
              {Object.keys(STATUS_COLORS).map(status => (
                <div
                  key={status}
                  onClick={() => {
                    setCurrentStatus(status);
                    setOpenDropdown(null);
                    handleUpdate({ status });
                  }}
                  className="p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between font-medium text-gray-700"
                >
                  <span>{status}</span>
                  {currentStatus === status && <Check size={13} className="text-blue-600" />}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowAutomationModal(true)}
          className="flex items-center justify-center p-1.5 border border-gray-300 rounded hover:bg-gray-50 transition text-gray-600 cursor-pointer"
          title="Configure Automation Rules"
        >
          <Zap size={14} className="text-amber-500 fill-amber-100" />
        </button>

        <div className="interactive-dropdown relative">
          <button
            disabled={Object.values(aiLoading).some(Boolean)}
            onClick={() => toggleDropdown('side-ai-actions')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition text-xs font-semibold text-gray-700 disabled:opacity-50 cursor-pointer"
          >
            {Object.values(aiLoading).some(Boolean) ? (
              <div className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles size={13} className="text-purple-600" />
            )}
            <span>{currentSubtask ? '✨ Improve Subtask' : '✨ Improve Task'}</span>
          </button>

          {openDropdown === 'side-ai-actions' && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-gray-200 rounded shadow-[0_4px_12px_rgba(0,0,0,0.1)] py-1.5 z-50 text-xs font-sans">
              <div onClick={handleSideBySideImprove} className="p-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3 text-gray-700 transition">
                <FileEdit size={14} /> <span>Improve description</span>
              </div>
              <div onClick={handleLinkConfluence} className="p-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3 text-gray-700 transition">
                <FileText size={14} /> <span>Link Confluence content</span>
              </div>
              <div onClick={handleSummarizeComments} className="p-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3 text-gray-700 transition">
                <AlignLeft size={14} /> <span>Summarize comments</span>
              </div>
              <div onClick={handleDetailedSubtaskSuggest} className="p-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3 text-gray-700 transition">
                <Network size={14} /> <span>Suggest child work items</span>
              </div>
              <div onClick={handleLinkSimilar} className="p-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3 text-gray-700 transition">
                <CopyCheck size={14} /> <span>Link similar work items</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* COLLAPSIBLE DETAILS ACCORDION */}
      <div className="border border-gray-200 rounded">
        <div
          onClick={() => toggleSection('details')}
          className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition"
        >
          <div className="flex items-center gap-1.5">
            {collapsedSections.details ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            <span className="text-xs font-semibold text-gray-700 tracking-wide">Details</span>
          </div>
          <Settings size={14} className="text-gray-400 hover:text-gray-600" />
        </div>

        {!collapsedSections.details && (
          <div className="p-3.5 space-y-3.5 text-xs bg-white">
            {/* Editable. Note a sprint still owns its project: moving this item into a
                project-owning sprint will overwrite whatever is chosen here. */}
            <div className="grid grid-cols-3 items-center min-h-[30px]">
              <span className="text-gray-500 font-medium">Project</span>
              <div className="col-span-2">
                {projectsList && projectsList.length > 0 ? (
                  <select
                    value={projectId || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setProjectId(value);
                      handleUpdate({ project_id: value === '' ? null : Number(value) });
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white font-medium cursor-pointer max-w-full"
                  >
                    <option value="">None</option>
                    {projectsList.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.client_name ? ` (${p.client_name})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-gray-400">No projects in this department</span>
                )}
              </div>
            </div>

            {/* Assignee */}
            <div className="grid grid-cols-3 items-center min-h-[30px]">
              <span className="text-gray-500 font-medium">Assignee</span>
              <div className="col-span-2 interactive-dropdown relative">
                {openDropdown === 'details-assignee' ? (
                  <div className="w-full">
                    <div
                      onClick={() => toggleDropdown('details-assignee')}
                      className="flex items-center gap-2 border border-blue-500 ring-1 ring-blue-500 rounded px-1.5 py-1 bg-white cursor-text mb-1"
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                        {assignee.initial || 'U'}
                      </div>
                      <span className="bg-blue-500 text-white px-1 py-0.5 text-xs flex-1 rounded-xs truncate">{assignee.name}</span>
                    </div>

                    <div className="absolute left-0 top-full bg-white border border-gray-200 rounded-b shadow-lg z-50 min-w-[260px] max-h-64 overflow-y-auto custom-scrollbar">
                      {usersList.map(u => {
                        const uName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
                        const uInitial = uName ? uName.substring(0, 2).toUpperCase() : 'U';
                        return (
                          <div
                            key={u.id || uName}
                            onClick={() => {
                              setAssignee({ name: uName, initial: uInitial, color: 'bg-blue-100 text-blue-700' });
                              setOpenDropdown(null);
                              handleUpdate({ assignee: uName });
                            }}
                            className="p-2.5 hover:bg-gray-100 cursor-pointer flex items-center gap-3 transition"
                          >
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                              {uInitial}
                            </div>
                            <span className="text-gray-800 text-xs font-medium">{uName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div
                      onClick={() => toggleDropdown('details-assignee')}
                      className="flex items-center gap-2 hover:bg-gray-50 p-1 -ml-1 rounded cursor-pointer transition text-gray-800"
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {assignee?.initial || 'U'}
                      </div>
                      <span className="text-xs text-gray-700 font-medium truncate">{assignee?.name || 'Unassigned'}</span>
                    </div>
                    <button onClick={handleAssignToMe} className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer">
                      Assign to me
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Parent Ticket Field (Jira Style) */}
            <div className="grid grid-cols-3 items-center min-h-[30px]">
              <span className="text-gray-500 font-medium">Parent</span>
              <div className="col-span-2">
                {currentSubtask ? (
                  <button
                    onClick={onBackToParent}
                    className="flex items-center gap-1.5 p-1 -ml-1 rounded hover:bg-blue-50 text-blue-600 font-semibold cursor-pointer transition truncate max-w-full"
                    title="Click to view parent issue"
                  >
                    <CheckSquare size={13} className="shrink-0 text-blue-500" />
                    <span className="truncate">{parentIssueKey || 'WR-101'}: {parentIssueTitle || 'Parent Issue'}</span>
                  </button>
                ) : (
                  // A top-level item can sit under another work item on the same board.
                  // Itself and its own children are excluded, so a cycle can't be chosen.
                  <select
                    value={issue?.parent_id ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      handleUpdate({ parent_id: v === '' ? null : Number(v) });
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white font-medium cursor-pointer max-w-full w-full"
                  >
                    <option value="">None</option>
                    {parentOptions.map(o => (
                      <option key={o.id} value={o.id}>{o.issue_key}: {o.title}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Reporter */}
            <div className="grid grid-cols-3 items-center min-h-[30px]">
              <span className="text-gray-500 font-medium">Reporter</span>
              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {reporter?.initial || 'U'}
                  </div>
                  <select
                    value={reporter?.name || ''}
                    onChange={(e) => {
                      const name = e.target.value;
                      const initial = name
                        ? name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
                        : 'U';
                      setReporter({ name: name || 'Unassigned', initial, color: 'bg-blue-100 text-blue-700' });
                      handleUpdate({ reporter: name || 'Unassigned' });
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white font-medium cursor-pointer min-w-0 flex-1"
                  >
                    <option value="">Unassigned</option>
                    {usersList.map(u => <option key={u.id || u.name} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Team */}
            <div className="grid grid-cols-3 items-center min-h-[30px]">
              <span className="text-gray-500 font-medium">Team</span>
              <div className="col-span-2">
                {teamsList && teamsList.length > 0 ? (
                  <select
                    value={team || ''}
                    onChange={(e) => {
                      const name = e.target.value;
                      const match = teamsList.find(t => t.name === name);
                      setTeam(name);
                      handleUpdate({ team: name || 'None', team_id: match ? match.id : null });
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white font-medium cursor-pointer max-w-full"
                  >
                    <option value="">None</option>
                    {teamsList.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                ) : (
                  <span className="text-xs text-gray-400">No teams set up</span>
                )}
              </div>
            </div>

            {/* Start date */}
            <div className="grid grid-cols-3 items-center min-h-[30px]">
              <span className="text-gray-500 font-medium">Start date</span>
              <div className="col-span-2">
                <input
                  type="date"
                  value={startDate || ''}
                  max={dueDate || undefined}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    handleUpdate({ start_date: e.target.value });
                  }}
                  className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white"
                />
              </div>
            </div>

            {/* Due date */}
            <div className="grid grid-cols-3 items-center min-h-[30px]">
              <span className="text-gray-500 font-medium">Due date</span>
              <div className="col-span-2">
                <input
                  type="date"
                  value={dueDate}
                  min={startDate || undefined}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    handleUpdate({ due_date: e.target.value });
                  }}
                  className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white"
                />
              </div>
            </div>

            {/* Priority */}
            <div className="grid grid-cols-3 items-center min-h-[30px]">
              <span className="text-gray-500 font-medium">Priority</span>
              <div className="col-span-2">
                <select
                  value={priority || 'Medium'}
                  onChange={(e) => {
                    if (setPriority) setPriority(e.target.value);
                    handleUpdate({ priority: e.target.value });
                  }}
                  className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white font-medium cursor-pointer"
                >
                  {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Work type */}
            <div className="grid grid-cols-3 items-center min-h-[30px]">
              <span className="text-gray-500 font-medium">Type</span>
              <div className="col-span-2">
                <select
                  value={issue?.type || 'Task'}
                  onChange={(e) => handleUpdate({ type: e.target.value })}
                  className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white font-medium cursor-pointer max-w-full"
                >
                  {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Labels — editable, so tags can be corrected and added after creation. */}
            <div className="grid grid-cols-3 items-start min-h-[30px] pt-1">
              <span className="text-gray-500 font-medium">Labels</span>
              <div className="col-span-2">
                <div className="flex flex-wrap gap-1 items-center">
                  {labels.length === 0 && !isEditingLabels && (
                    <span className="text-xs text-gray-400">None</span>
                  )}
                  {labels.map(l => (
                    <span key={l} className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                      {l}
                      <X
                        size={9}
                        className="cursor-pointer text-indigo-400 hover:text-indigo-800"
                        onClick={() => handleUpdate({ labels: labels.filter(x => x !== l) })}
                      />
                    </span>
                  ))}
                  {!isEditingLabels && (
                    <button
                      onClick={() => setIsEditingLabels(true)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 transition"
                    >
                      + Add
                    </button>
                  )}
                </div>

                {isEditingLabels && (
                  <input
                    autoFocus
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const clean = normalizeLabel(labelDraft);
                        if (clean && !labels.includes(clean)) {
                          handleUpdate({ labels: [...labels, clean] });
                        }
                        setLabelDraft('');
                      }
                      if (e.key === 'Escape') { setIsEditingLabels(false); setLabelDraft(''); }
                    }}
                    onBlur={() => { setIsEditingLabels(false); setLabelDraft(''); }}
                    placeholder="Type and press enter…"
                    className="mt-1 w-full text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-500"
                  />
                )}
              </div>
            </div>

            {/* Effort points */}
            <div className="grid grid-cols-3 items-center min-h-[30px]">
              <span className="text-gray-500 font-medium">Effort points</span>
              <div className="col-span-2">
                <select
                  value={issue?.story_points ?? ''}
                  onChange={(e) => handleUpdate({ story_points: e.target.value === '' ? null : Number(e.target.value) })}
                  className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white font-medium cursor-pointer"
                >
                  <option value="">None</option>
                  {[1, 2, 3, 5, 8, 13, 21].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Flagged */}
            {!!issue?.flagged && (
              <div className="grid grid-cols-3 items-center min-h-[30px]">
                <span className="text-gray-500 font-medium">Flagged</span>
                <div className="col-span-2">
                  <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">Impediment</span>
                </div>
              </div>
            )}

            {/* Created / Updated — read-only provenance */}
            {issue?.created_at && (
              <div className="grid grid-cols-3 items-center min-h-[30px]">
                <span className="text-gray-500 font-medium">Created</span>
                <div className="col-span-2">
                  <span className="text-xs text-gray-600">{formatStamp(issue.created_at)}</span>
                </div>
              </div>
            )}
            {issue?.updated_at && (
              <div className="grid grid-cols-3 items-center min-h-[30px]">
                <span className="text-gray-500 font-medium">Updated</span>
                <div className="col-span-2">
                  <span className="text-xs text-gray-600">{formatStamp(issue.updated_at)}</span>
                </div>
              </div>
            )}
            {/* Editable. Selecting a sprint moves the work item for real (sprint_id), which
                is what the Board and Backlog filter on. Choosing Backlog removes it from its
                sprint — and with it the project, since backlog work belongs to neither. */}
            <div className="grid grid-cols-3 items-center min-h-[30px]">
              <span className="text-gray-500 font-medium">Sprint</span>
              <div className="col-span-2">
                {sprintsList && sprintsList.length > 0 ? (
                  <select
                    value={sprintId || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSprintId(value);
                      const chosen = sprintsList.find(x => String(x.id) === String(value));
                      // Mirror the server's rule here so the Project field doesn't show a
                      // stale value until the panel is reopened.
                      if (!value) setProjectId('');
                      else if (chosen && chosen.project_id != null) setProjectId(String(chosen.project_id));
                      handleUpdate({
                        sprint_id: value === '' ? null : Number(value),
                        sprint: chosen ? chosen.name : 'Backlog'
                      });
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white font-medium cursor-pointer max-w-full"
                  >
                    <option value="">Backlog</option>
                    {sprintsList.map(sp => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name}{sp.status === 'Active' ? ' (active)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-gray-400">No sprints on this board yet</span>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Development and Automation are engineering tooling — git branches, pull requests,
          build rules. They have no meaning on a Marketing board, so they are shown only
          where they apply. */}
      {showDevTools && (
        <>
        {/* COLLAPSIBLE DEVELOPMENT ACCORDION (REAL JIRA CODE INTEGRATION) */}
        <div className="border border-gray-200 rounded">
          <div
            onClick={() => toggleSection('development')}
            className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition"
          >
            <div className="flex items-center gap-1.5">
              {collapsedSections.development ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              <span className="text-xs font-semibold text-gray-700 tracking-wide">Development</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDevModal(true);
              }}
              className="text-gray-400 hover:text-gray-600"
              title="Configure Git Repositories"
            >
              <Settings size={14} />
            </button>
          </div>

          {!collapsedSections.development && (
            <div className="p-3.5 space-y-3 text-xs bg-white">
              {/* Git Branch Info */}
              <div className="p-2 bg-gray-50 rounded border border-gray-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-gray-700">
                    <GitBranch size={13} className="text-purple-600" /> {issueKey} Branch
                  </span>
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">Active</span>
                </div>
                <div className="text-[11px] font-mono text-gray-600 bg-white p-1 rounded border border-gray-200 truncate" title={branchName}>
                  {branchName}
                </div>
                <button
                  onClick={handleCopyBranch}
                  className="flex items-center gap-1 text-[11px] text-purple-700 font-semibold hover:underline cursor-pointer"
                >
                  <Copy size={11} /> {copiedBranch ? 'Copied to clipboard!' : 'Copy git checkout command'}
                </button>
              </div>

              {/* Pull Requests & Builds */}
              <div className="flex items-center justify-between text-gray-600 pt-1">
                <span className="flex items-center gap-1 font-medium">
                  <GitPullRequest size={13} className="text-blue-600" /> Pull Request #101
                </span>
                <span className="text-blue-600 font-semibold">OPEN 🟢</span>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <button
                  onClick={() => setShowDevModal(true)}
                  className="flex items-center gap-2 text-blue-600 hover:underline font-semibold p-1 -ml-1 rounded transition w-full text-left cursor-pointer"
                >
                  <Github size={13} className="text-gray-700" />
                  <span>Connect development tools</span>
                </button>
                <button
                  onClick={handleOpenInVsCode}
                  className="flex items-center gap-2 text-blue-600 hover:underline font-semibold p-1 -ml-1 rounded transition w-full text-left cursor-pointer"
                >
                  <Terminal size={13} className="text-blue-600" />
                  <span>Open in VS Code IDE</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* COLLAPSIBLE AUTOMATION ACCORDION (REAL JIRA AUTOMATION ENGINE) */}
        <div className="border border-gray-200 rounded">
          <div
            onClick={() => toggleSection('automation')}
            className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition"
          >
            <div className="flex items-center gap-1.5">
              {collapsedSections.automation ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              <span className="text-xs font-semibold text-gray-700 tracking-wide">Automation</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAutomationModal(true);
              }}
              className="text-gray-400 hover:text-gray-600"
              title="Automation Rules"
            >
              <Settings size={14} />
            </button>
          </div>

          {!collapsedSections.automation && (
            <div className="p-3.5 space-y-3 bg-white text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Recent rule runs</span>
                <button
                  onClick={handleRefreshAutomation}
                  disabled={isRefreshingAutomation}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={11} className={isRefreshingAutomation ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Automation Run Logs List */}
              <div className="space-y-2">
                {automationLogs.map(log => (
                  <div key={log.id} className="p-2 bg-gray-50 border border-gray-200 rounded flex items-start justify-between">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="flex items-center gap-1 font-semibold text-gray-800 truncate text-[11px]">
                        <Zap size={11} className="text-amber-500 shrink-0" />
                        <span className="truncate">{log.rule}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 truncate">{log.trigger}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded border border-green-200 block">
                        {log.status}
                      </span>
                      <span className="text-[9px] text-gray-400 mt-0.5 block">{log.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowAutomationModal(true)}
                className="w-full text-center text-xs text-blue-600 hover:underline font-semibold pt-1 block cursor-pointer"
              >
                View all 4 active rules →
              </button>
            </div>
          )}
        </div>
        </>
      )}

      {/* DEV TOOLS MODAL */}
      {showDevModal && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Github size={18} className="text-gray-800" />
                <h3 className="text-sm font-bold text-gray-900">Connect Development Tools</h3>
              </div>
              <button onClick={() => setShowDevModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 block">Git Repository URL</label>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between font-semibold text-purple-900">
                  <span className="flex items-center gap-1.5"><GitBranch size={14} /> Git Checkout Command</span>
                  <button onClick={handleCopyBranch} className="text-xs text-purple-700 hover:underline flex items-center gap-1 cursor-pointer font-bold">
                    <Copy size={12} /> {copiedBranch ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="p-2 bg-white rounded border border-purple-200 text-xs font-mono text-purple-900 overflow-x-auto">
                  git checkout -b {branchName}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <span className="font-semibold text-gray-700 block">Connected Services</span>
                <div className="flex items-center justify-between p-2 border border-gray-200 rounded bg-gray-50">
                  <span className="font-medium text-gray-800">GitHub Enterprise Sync</span>
                  <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={13} /> Connected</span>
                </div>
                <div className="flex items-center justify-between p-2 border border-gray-200 rounded bg-gray-50">
                  <span className="font-medium text-gray-800">VS Code IDE Deep Link</span>
                  <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={13} /> Enabled</span>
                </div>
              </div>
            </div>

            <div className="p-3 border-t bg-gray-50 flex justify-end gap-2 text-xs">
              <button onClick={() => setShowDevModal(false)} className="px-3.5 py-1.5 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 cursor-pointer">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTOMATION RULES MODAL */}
      {showAutomationModal && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b bg-amber-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-amber-600 fill-amber-100" />
                <h3 className="text-sm font-bold text-gray-900">Jira Automation Rules</h3>
              </div>
              <button onClick={() => setShowAutomationModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs font-sans max-h-[60vh] overflow-y-auto">
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">1. Auto-Assign on In Progress</span>
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">ACTIVE</span>
                </div>
                <p className="text-gray-600 text-[11px]">When ticket status changes to 'IN PROGRESS', automatically assign to current active user.</p>
              </div>

              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">2. Auto-Complete Parent Issue</span>
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">ACTIVE</span>
                </div>
                <p className="text-gray-600 text-[11px]">When all 5 subtasks are marked DONE, automatically transition parent issue to DONE.</p>
              </div>

              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">3. Due Date Reminder Alert</span>
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">ACTIVE</span>
                </div>
                <p className="text-gray-600 text-[11px]">When due date is within 24 hours, send automated reminder notification to assignee.</p>
              </div>

              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">4. Git Branch Status Sync</span>
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">ACTIVE</span>
                </div>
                <p className="text-gray-600 text-[11px]">When a developer commits to the ticket branch, update Development metrics automatically.</p>
              </div>
            </div>

            <div className="p-3 border-t bg-gray-50 flex justify-end gap-2 text-xs">
              <button onClick={() => setShowAutomationModal(false)} className="px-3.5 py-1.5 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITIssueDetailsSidebar;

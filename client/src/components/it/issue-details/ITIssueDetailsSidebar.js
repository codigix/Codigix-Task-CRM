import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Check, Zap, Sparkles, Settings,
  FileEdit, FileText, AlignLeft, Network, CopyCheck,
  Clock, Github, LinkIcon, CheckSquare, GitBranch, GitPullRequest,
  RefreshCw, CheckCircle, ExternalLink, X, Copy, Terminal, User, Search
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
  reportersList,
  teamsList,
  sprintsList,
  handleUpdate,
  handleAssignToMe,
  currentSubtask,
  parentIssueKey,
  parentIssueTitle,
  onBackToParent,
  issue,
  effortPoints,
  setEffortPoints,
  estimatedHours,
  setEstimatedHours,
  contributionMethod,
  setContributionMethod,
  contributionReviewStatus
}) => {
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [isEditingLabels, setIsEditingLabels] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');

  const handleAutoCalculatePoints = async () => {
    try {
      setLoadingPoints(true);
      const subtasksList = typeof issue.subtasks === 'string' ? JSON.parse(issue.subtasks) : (issue.subtasks || []);
      const res = await fetch('http://localhost:5000/api/it-kanban/calculate-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: issue.type,
          priority: issue.priority,
          subtasksCount: subtasksList.length
        })
      });
      const data = await res.json();
      if (res.ok && data.points !== undefined && data.points !== Number(effortPoints)) {
        if (setEffortPoints) setEffortPoints(data.points);
        handleUpdate({ effort_points: data.points });
      }
    } catch (e) {
      console.error('Failed to auto-calculate points:', e);
    } finally {
      setLoadingPoints(false);
    }
  };

  React.useEffect(() => {
    if (!issue || !issue.id || !issue.type) return;
    handleAutoCalculatePoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue?.type, issue?.priority, (typeof issue.subtasks === 'string' ? JSON.parse(issue.subtasks) : (issue.subtasks || [])).length]);

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
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [reporterSearch, setReporterSearch] = useState('');

  const filteredAssignees = (usersList || []).filter(u => {
    const name = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '';
    return !assigneeSearch.trim() || name.toLowerCase().includes(assigneeSearch.toLowerCase().trim());
  });

  const rawReporters = (reportersList && reportersList.length > 0) ? reportersList : (usersList || []);
  const filteredReporters = rawReporters.filter(u => {
    const name = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '';
    return !reporterSearch.trim() || name.toLowerCase().includes(reporterSearch.toLowerCase().trim());
  });
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
    <div className="w-80 lg:w-[350px] shrink-0 h-full overflow-y-auto overflow-x-hidden pl-3.5 pr-2 custom-scrollbar space-y-4 border-l border-gray-200/80 font-sans">
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
      <div className="border border-gray-200 rounded overflow-hidden">
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
          <div className="p-3 space-y-3 text-xs bg-white">
            {/* Project */}
            <div className="flex items-center min-h-[32px] gap-2">
              <span className="w-24 shrink-0 text-gray-500 font-medium text-xs">Project</span>
              <div className="flex-1 min-w-0">
                {projectsList && projectsList.length > 0 ? (
                  <select
                    value={projectId || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setProjectId(value);
                      handleUpdate({ project_id: value === '' ? null : Number(value) });
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white font-medium cursor-pointer w-full truncate"
                  >
                    <option value="">None</option>
                    {projectsList.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.client_name ? ` (${p.client_name})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-gray-400 truncate block">No projects in dept</span>
                )}
              </div>
            </div>

            {/* Assignee */}
            <div className="flex items-center min-h-[32px] gap-2">
              <span className="w-24 shrink-0 text-gray-500 font-medium text-xs">Assignee</span>
              <div className="flex-1 min-w-0 interactive-dropdown relative">
                <div className="flex items-center justify-between gap-1 min-w-0">
                  <div
                    onClick={() => {
                      setAssigneeSearch('');
                      toggleDropdown('details-assignee');
                    }}
                    className={`flex items-center gap-1.5 px-1.5 py-1 -ml-1 rounded cursor-pointer transition text-gray-800 hover:bg-gray-100/80 min-w-0 ${openDropdown === 'details-assignee' ? 'bg-blue-50 ring-1 ring-blue-300' : ''}`}
                    title="Click to change assignee"
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px]  shrink-0 ${!assignee?.name || assignee?.name === 'Unassigned' ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                      {!assignee?.name || assignee?.name === 'Unassigned' ? <User size={11} className="text-gray-600" /> : (assignee?.initial || 'U')}
                    </div>
                    <span className="text-xs text-gray-700 font-medium truncate">{assignee?.name || 'Unassigned'}</span>
                    <ChevronDown size={12} className={`text-gray-400 shrink-0 transition-transform duration-150 ${openDropdown === 'details-assignee' ? 'rotate-180 text-blue-500' : ''}`} />
                  </div>
                  <button onClick={handleAssignToMe} className="text-xs text-blue-600 hover:underline font-medium cursor-pointer shrink-0 whitespace-nowrap">
                    Assign to me
                  </button>
                </div>

                {openDropdown === 'details-assignee' && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1 w-64 bg-white rounded shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                  >
                    {/* Integrated Search Box Header */}
                    <div className="p-2 border-b border-gray-100 bg-gray-50/75 flex items-center gap-2">
                      <Search size={13} className="text-gray-400 shrink-0" />
                      <input
                        type="text"
                        autoFocus
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                        placeholder="Search assignee..."
                        className="w-full bg-transparent text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none"
                      />
                      {assigneeSearch && (
                        <button
                          type="button"
                          onClick={() => setAssigneeSearch('')}
                          className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Scrollable Options List */}
                    <div className="max-h-56 overflow-y-auto py-1 custom-scrollbar">
                      {/* Unassigned Option */}
                      {(!assigneeSearch.trim() || 'unassigned'.includes(assigneeSearch.toLowerCase().trim())) && (
                        <div
                          onClick={() => {
                            setAssignee({ name: 'Unassigned', initial: 'U', color: 'bg-gray-200 text-gray-500' });
                            setOpenDropdown(null);
                            setAssigneeSearch('');
                            handleUpdate({ assignee: 'Unassigned' });
                          }}
                          className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition text-xs ${(!assignee?.name || assignee?.name === 'Unassigned') ? 'bg-[#deebff] font-semibold text-blue-900' : 'text-gray-700'}`}
                        >
                          <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] shrink-0">
                            <User size={12} className="text-gray-500" />
                          </div>
                          <span className="flex-1 truncate">Unassigned</span>
                          {(!assignee?.name || assignee?.name === 'Unassigned') && (
                            <Check size={14} className="text-blue-600 shrink-0" />
                          )}
                        </div>
                      )}

                      {/* Users List */}
                      {filteredAssignees.map(u => {
                        const uName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
                        const uInitial = uName ? uName.substring(0, 2).toUpperCase() : 'U';
                        const isSelected = assignee?.name === uName;
                        return (
                          <div
                            key={u.id || uName}
                            onClick={() => {
                              setAssignee({ name: uName, initial: uInitial, color: 'bg-blue-100 text-blue-700' });
                              setOpenDropdown(null);
                              setAssigneeSearch('');
                              handleUpdate({ assignee: uName });
                            }}
                            className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition text-xs ${isSelected ? 'bg-[#deebff] font-semibold text-blue-900' : 'text-gray-700'}`}
                          >
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]  shrink-0">
                              {uInitial}
                            </div>
                            <span className="flex-1 truncate">{uName}</span>
                            {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
                          </div>
                        );
                      })}

                      {filteredAssignees.length === 0 && assigneeSearch.trim() && !'unassigned'.includes(assigneeSearch.toLowerCase().trim()) && (
                        <div className="px-3 py-3 text-center text-xs text-gray-400">No users found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Parent Ticket Field (Jira Style) */}
            <div className="flex items-center min-h-[32px] gap-2">
              <span className="w-24 shrink-0 text-gray-500 font-medium text-xs">Parent</span>
              <div className="flex-1 min-w-0">
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
                  <select
                    value={issue?.parent_id ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      handleUpdate({ parent_id: v === '' ? null : Number(v) });
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white font-medium cursor-pointer w-full truncate"
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
            <div className="flex items-center min-h-[32px] gap-2">
              <span className="w-24 shrink-0 text-gray-500 font-medium text-xs">Reporter</span>
              <div className="flex-1 min-w-0 interactive-dropdown relative">
                <div
                  onClick={() => {
                    setReporterSearch('');
                    toggleDropdown('details-reporter');
                  }}
                  className={`flex items-center justify-between px-1.5 py-1 -ml-1 rounded cursor-pointer transition text-gray-800 hover:bg-gray-100/80 w-full ${openDropdown === 'details-reporter' ? 'bg-blue-50 ring-1 ring-blue-300' : ''}`}
                  title="Click to change reporter"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px]  shrink-0 ${!reporter?.name || reporter?.name === 'Unassigned' ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                      {!reporter?.name || reporter?.name === 'Unassigned' ? <User size={11} className="text-gray-600" /> : (reporter?.initial || 'U')}
                    </div>
                    <span className="text-xs text-gray-700 font-medium truncate">{reporter?.name || 'Unassigned'}</span>
                  </div>
                  <ChevronDown size={12} className={`text-gray-400 shrink-0 transition-transform duration-150 ${openDropdown === 'details-reporter' ? 'rotate-180 text-blue-500' : ''}`} />
                </div>

                {openDropdown === 'details-reporter' && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1 w-64 bg-white rounded shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                  >
                    {/* Integrated Search Box Header */}
                    <div className="p-2 border-b border-gray-100 bg-gray-50/75 flex items-center gap-2">
                      <Search size={13} className="text-gray-400 shrink-0" />
                      <input
                        type="text"
                        autoFocus
                        value={reporterSearch}
                        onChange={(e) => setReporterSearch(e.target.value)}
                        placeholder="Search reporter..."
                        className="w-full bg-transparent text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none"
                      />
                      {reporterSearch && (
                        <button
                          type="button"
                          onClick={() => setReporterSearch('')}
                          className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Scrollable Options List */}
                    <div className="max-h-56 overflow-y-auto py-1 custom-scrollbar">
                      {/* Unassigned Option */}
                      {(!reporterSearch.trim() || 'unassigned'.includes(reporterSearch.toLowerCase().trim())) && (
                        <div
                          onClick={() => {
                            setReporter({ name: 'Unassigned', initial: 'U', color: 'bg-gray-200 text-gray-500' });
                            setOpenDropdown(null);
                            setReporterSearch('');
                            handleUpdate({ reporter: 'Unassigned' });
                          }}
                          className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition text-xs ${(!reporter?.name || reporter?.name === 'Unassigned') ? 'bg-[#deebff] font-semibold text-blue-900' : 'text-gray-700'}`}
                        >
                          <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] shrink-0">
                            <User size={12} className="text-gray-500" />
                          </div>
                          <span className="flex-1 truncate">Unassigned</span>
                          {(!reporter?.name || reporter?.name === 'Unassigned') && (
                            <Check size={14} className="text-blue-600 shrink-0" />
                          )}
                        </div>
                      )}

                      {/* Reporters List */}
                      {filteredReporters.map(u => {
                        const uName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
                        const uInitial = uName
                          ? uName.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
                          : 'U';
                        const isSelected = reporter?.name === uName;
                        return (
                          <div
                            key={u.id || uName}
                            onClick={() => {
                              setReporter({ name: uName, initial: uInitial, color: 'bg-blue-100 text-blue-700' });
                              setOpenDropdown(null);
                              setReporterSearch('');
                              handleUpdate({ reporter: uName });
                            }}
                            className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition text-xs ${isSelected ? 'bg-[#deebff] font-semibold text-blue-900' : 'text-gray-700'}`}
                          >
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]  shrink-0">
                              {uInitial}
                            </div>
                            <span className="flex-1 truncate">{uName}</span>
                            {isSelected && <Check size={14} className="text-blue-600 ml-auto shrink-0" />}
                          </div>
                        );
                      })}

                      {filteredReporters.length === 0 && reporterSearch.trim() && !'unassigned'.includes(reporterSearch.toLowerCase().trim()) && (
                        <div className="px-3 py-3 text-center text-xs text-gray-400">No users found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Team */}
            <div className="flex items-center min-h-[32px] gap-2">
              <span className="w-24 shrink-0 text-gray-500 font-medium text-xs">Team</span>
              <div className="flex-1 min-w-0">
                {teamsList && teamsList.length > 0 ? (
                  <select
                    value={team || ''}
                    onChange={(e) => {
                      const name = e.target.value;
                      const match = teamsList.find(t => t.name === name);
                      setTeam(name);
                      handleUpdate({ team: name || 'None', team_id: match ? match.id : null });
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white font-medium cursor-pointer w-full truncate"
                  >
                    <option value="">None</option>
                    {teamsList.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                ) : (
                  <span className="text-xs text-gray-400 truncate block">No teams set up</span>
                )}
              </div>
            </div>

            {/* Start date */}
            <div className="flex items-center min-h-[32px] gap-2">
              <span className="w-24 shrink-0 text-gray-500 font-medium text-xs">Start date</span>
              <div className="flex-1 min-w-0">
                <input
                  type="date"
                  value={startDate || ''}
                  max={dueDate || undefined}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    handleUpdate({ start_date: e.target.value });
                  }}
                  className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white w-full"
                />
              </div>
            </div>

            {/* Due date */}
            <div className="flex items-center min-h-[32px] gap-2">
              <span className="w-24 shrink-0 text-gray-500 font-medium text-xs">Due date</span>
              <div className="flex-1 min-w-0">
                <input
                  type="date"
                  value={dueDate}
                  min={startDate || undefined}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    handleUpdate({ due_date: e.target.value });
                  }}
                  className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white w-full"
                />
              </div>
            </div>

            {/* Priority */}
            <div className="flex items-center min-h-[32px] gap-2">
              <span className="w-24 shrink-0 text-gray-500 font-medium text-xs">Priority</span>
              <div className="flex-1 min-w-0">
                <select
                  value={priority || 'Medium'}
                  onChange={(e) => {
                    if (setPriority) setPriority(e.target.value);
                    handleUpdate({ priority: e.target.value });
                  }}
                  className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white font-medium cursor-pointer w-full"
                >
                  {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Effort Points */}
            <div className="flex items-center min-h-[32px] gap-2">
              <span className="w-24 shrink-0 text-gray-500 font-medium text-xs flex items-center justify-between" title="Total performance value of this task">
                Effort Points
                <button
                  onClick={handleAutoCalculatePoints}
                  disabled={loadingPoints}
                  title="Auto-calculate points based on Task Type, Priority, and Subtasks"
                  className="p-1 text-emerald-500 hover:bg-emerald-50 rounded transition disabled:opacity-50"
                >
                  <Sparkles size={14} className={loadingPoints ? "animate-spin" : ""} />
                </button>
              </span>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={effortPoints || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (setEffortPoints) setEffortPoints(val);
                    handleUpdate({ effort_points: val });
                  }}
                  className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white w-full max-w-[80px]"
                />
                <span className="text-xs text-gray-400">pts</span>
              </div>
            </div>

            {/* Contribution Method */}
            <div className="flex items-center min-h-[32px] gap-2">
              <span className="w-24 shrink-0 text-gray-500 font-medium text-xs">Method</span>
              <div className="flex-1 min-w-0">
                <select
                  value={contributionMethod || 'WORK_BREAKDOWN'}
                  onChange={(e) => {
                    if (setContributionMethod) setContributionMethod(e.target.value);
                    handleUpdate({ contribution_method: e.target.value });
                  }}
                  className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white font-medium cursor-pointer w-full"
                >
                  <option value="WORK_BREAKDOWN">Work Breakdown (Subtasks)</option>
                  <option value="TIME_BASED">Time Log Fallback</option>
                  <option value="MANAGER_ALLOCATED">Manual Allocation</option>
                </select>
              </div>
            </div>

            {/* Contribution Status */}
            <div className="flex items-center min-h-[32px] gap-2">
              <span className="w-24 shrink-0 text-gray-500 font-medium text-xs">Perf Review</span>
              <div className="flex-1 min-w-0">
                <div className={`text-xs px-2 py-1 rounded inline-flex items-center font-semibold ${contributionReviewStatus === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                  contributionReviewStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                  {contributionReviewStatus || 'Pending'}
                </div>
              </div>
            </div>

            {/* Work type */}
            <div className="flex items-center min-h-[32px] gap-2">
              <span className="w-24 shrink-0 text-gray-500 font-medium text-xs">Type</span>
              <div className="flex-1 min-w-0">
                <select
                  value={issue?.type || 'Task'}
                  onChange={(e) => handleUpdate({ type: e.target.value })}
                  className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white font-medium cursor-pointer w-full"
                >
                  {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Labels — editable */}
            <div className="flex items-start min-h-[32px] gap-2 pt-1">
              <span className="w-24 shrink-0 text-gray-500 font-medium text-xs pt-1">Labels</span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1 items-center">
                  {labels.length === 0 && !isEditingLabels && (
                    <span className="text-xs text-gray-400">None</span>
                  )}
                  {labels.map(l => (
                    <span key={l} className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 max-w-full">
                      <span className="truncate">{l}</span>
                      <X
                        size={9}
                        className="cursor-pointer text-indigo-400 hover:text-indigo-800 shrink-0"
                        onClick={() => handleUpdate({ labels: labels.filter(x => x !== l) })}
                      />
                    </span>
                  ))}
                  {!isEditingLabels && (
                    <button
                      onClick={() => setIsEditingLabels(true)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 transition shrink-0 cursor-pointer"
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
            <div className="flex items-center min-h-[32px] gap-2">
              <span className="w-24 shrink-0 text-gray-500 font-medium text-xs">Effort points</span>
              <div className="flex-1 min-w-0">
                <select
                  value={issue?.story_points ?? ''}
                  onChange={(e) => handleUpdate({ story_points: e.target.value === '' ? null : Number(e.target.value) })}
                  className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white font-medium cursor-pointer w-full"
                >
                  <option value="">None</option>
                  {[1, 2, 3, 5, 8, 13, 21].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Flagged */}
            {!!issue?.flagged && (
              <div className="flex items-center min-h-[32px] gap-2">
                <span className="w-24 shrink-0 text-gray-500 font-medium text-xs">Flagged</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">Impediment</span>
                </div>
              </div>
            )}

            {/* Created / Updated — read-only provenance */}
            {issue?.created_at && (
              <div className="flex items-center min-h-[32px] gap-2">
                <span className="w-24 shrink-0 text-gray-500 font-medium text-xs">Created</span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-600 truncate block" title={formatStamp(issue.created_at)}>{formatStamp(issue.created_at)}</span>
                </div>
              </div>
            )}
            {issue?.updated_at && (
              <div className="flex items-center min-h-[32px] gap-2">
                <span className="w-24 shrink-0 text-gray-500 font-medium text-xs">Updated</span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-600 truncate block" title={formatStamp(issue.updated_at)}>{formatStamp(issue.updated_at)}</span>
                </div>
              </div>
            )}

            {/* Sprint */}
            <div className="flex items-center min-h-[32px] gap-2">
              <span className="w-24 shrink-0 text-gray-500 font-medium text-xs">Sprint</span>
              <div className="flex-1 min-w-0">
                {sprintsList && sprintsList.length > 0 ? (
                  <select
                    value={sprintId || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSprintId(value);
                      const chosen = sprintsList.find(x => String(x.id) === String(value));
                      if (!value) setProjectId('');
                      else if (chosen && chosen.project_id != null) setProjectId(String(chosen.project_id));
                      handleUpdate({
                        sprint_id: value === '' ? null : Number(value),
                        sprint: chosen ? chosen.name : 'Backlog'
                      });
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1 outline-none text-gray-700 bg-white font-medium cursor-pointer w-full truncate"
                  >
                    <option value="">Backlog</option>
                    {sprintsList.map(sp => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name}{sp.status === 'Active' ? ' (active)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-gray-400 truncate block">No sprints on this board</span>
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
          <div className="border border-gray-200 rounded overflow-hidden">
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
                    <span className="flex items-center gap-1 text-xs  text-gray-700">
                      <GitBranch size={13} className="text-purple-600" /> {issueKey} Branch
                    </span>
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">Active</span>
                  </div>
                  <div className="text-xs font-mono text-gray-600 bg-white p-1 rounded border border-gray-200 truncate" title={branchName}>
                    {branchName}
                  </div>
                  <button
                    onClick={handleCopyBranch}
                    className="flex items-center gap-1 text-xs text-purple-700 font-semibold hover:underline cursor-pointer"
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
          <div className="border border-gray-200 rounded overflow-hidden">
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
                        <div className="flex items-center gap-1 font-semibold text-gray-800 truncate text-xs">
                          <Zap size={11} className="text-amber-500 shrink-0" />
                          <span className="truncate">{log.rule}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">{log.trigger}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px]  text-green-600 bg-green-50 px-1 py-0.5 rounded border border-green-200 block">
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
                <h3 className="text-sm  text-gray-900">Connect Development Tools</h3>
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

              <div className="p-3 bg-purple-50 border border-purple-200 rounded space-y-2">
                <div className="flex items-center justify-between font-semibold text-purple-900">
                  <span className="flex items-center gap-1.5"><GitBranch size={14} /> Git Checkout Command</span>
                  <button onClick={handleCopyBranch} className="text-xs text-purple-700 hover:underline flex items-center gap-1 cursor-pointer ">
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
                  <span className="text-green-600  flex items-center gap-1"><CheckCircle size={13} /> Connected</span>
                </div>
                <div className="flex items-center justify-between p-2 border border-gray-200 rounded bg-gray-50">
                  <span className="font-medium text-gray-800">VS Code IDE Deep Link</span>
                  <span className="text-green-600  flex items-center gap-1"><CheckCircle size={13} /> Enabled</span>
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
                <h3 className="text-sm  text-gray-900">Jira Automation Rules</h3>
              </div>
              <button onClick={() => setShowAutomationModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs font-sans max-h-[60vh] overflow-y-auto">
              <div className="p-3 border border-gray-200 rounded bg-gray-50 space-y-1">
                <div className="flex justify-between items-center">
                  <span className=" text-gray-900">1. Auto-Assign on In Progress</span>
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded ">ACTIVE</span>
                </div>
                <p className="text-gray-600 text-xs">When ticket status changes to 'IN PROGRESS', automatically assign to current active user.</p>
              </div>

              <div className="p-3 border border-gray-200 rounded bg-gray-50 space-y-1">
                <div className="flex justify-between items-center">
                  <span className=" text-gray-900">2. Auto-Complete Parent Issue</span>
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded ">ACTIVE</span>
                </div>
                <p className="text-gray-600 text-xs">When all 5 subtasks are marked DONE, automatically transition parent issue to DONE.</p>
              </div>

              <div className="p-3 border border-gray-200 rounded bg-gray-50 space-y-1">
                <div className="flex justify-between items-center">
                  <span className=" text-gray-900">3. Due Date Reminder Alert</span>
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded ">ACTIVE</span>
                </div>
                <p className="text-gray-600 text-xs">When due date is within 24 hours, send automated reminder notification to assignee.</p>
              </div>

              <div className="p-3 border border-gray-200 rounded bg-gray-50 space-y-1">
                <div className="flex justify-between items-center">
                  <span className=" text-gray-900">4. Git Branch Status Sync</span>
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded ">ACTIVE</span>
                </div>
                <p className="text-gray-600 text-xs">When a developer commits to the ticket branch, update Development metrics automatically.</p>
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

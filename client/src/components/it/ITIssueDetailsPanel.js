import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import {
  ArrowUp, ArrowDown, CheckSquare, Megaphone, Palette, Video,
  FileText, Globe, Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/environment';
import { DEPARTMENT_KANBAN_CONFIG } from '../../config/departmentKanbanConfig';
import { uploadDescriptionFile, formatFileSize } from '../../utils/descriptionFiles';

import ITIssueHeaderBar from './issue-details/ITIssueHeaderBar';
import ITIssueDescription from './issue-details/ITIssueDescription';
import ITSubtasksTable from './issue-details/ITSubtasksTable';
import ITIssueLinkedItems from './issue-details/ITIssueLinkedItems';
import ITIssueActivityTabs from './issue-details/ITIssueActivityTabs';
import ITIssueDetailsSidebar from './issue-details/ITIssueDetailsSidebar';
import ITSubtaskAiModal from './issue-details/ITSubtaskAiModal';
import ITManagerReviewGate from './issue-details/ITManagerReviewGate';

const PRIORITY_ICONS = {
  Highest: <ArrowUp size={14} className="text-red-600 " />,
  High: <ArrowUp size={14} className="text-red-500" />,
  Medium: <span className="text-orange-500  text-xs leading-none flex items-center justify-center font-sans">=</span >,
  Low: <ArrowDown size={14} className="text-blue-500" />,
  Lowest: <ArrowDown size={14} className="text-blue-400 opacity-75" />,
  'Not Decided': <span className="text-gray-400  text-xs font-mono">-</span>,
  None: <span className="text-gray-400  text-xs font-mono">-</span>
};

const TYPE_ICONS = {
  Task: <CheckSquare size={14} className="text-blue-500 fill-blue-100" />,
  Story: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-green-500 fill-green-100" fill="currentColor"><path d="M5 3v18l7-4.5 7 4.5V3z" /></svg>,
  Bug: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-red-500 fill-red-100" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8" cy="8" r="1.5" /><circle cx="16" cy="8" r="1.5" /><circle cx="8" cy="16" r="1.5" /><circle cx="16" cy="16" r="1.5" /></svg>,
  Test: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-purple-500 fill-purple-100" fill="currentColor"><rect x="9" y="3" width="6" height="3" rx="1" /><path d="M10 6v11a2 2 0 004 0V6" /></svg>,
  Campaign: <Megaphone size={14} className="text-orange-500" />,
  Design: <Palette size={14} className="text-purple-500" />,
  Video: <Video size={14} className="text-red-500" />,
  Content: <FileText size={14} className="text-green-600" />,
  Search: <Globe size={14} className="text-indigo-500" />,
  Social: <Users size={14} className="text-pink-500" />
};

const getInitials = (name) => {
  if (!name || name === 'Unassigned') return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const showSuccessToast = (title) => {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title,
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true
  });
};

const showErrorToast = (title) => {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'error',
    title,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  });
};


// Formats a stored date for <input type="date">, which requires YYYY-MM-DD.
// Uses local date parts on purpose: a DATE column serialises as UTC (e.g.
// 2026-08-13T18:30:00Z for 14 Aug in IST), so toISOString() would show the day before.
const toDateInputValue = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const DEFAULT_USERS = [
  { id: 1, name: 'Purvesh Patil' },
  { id: 2, name: 'Ashwini Khedekar' },
  { id: 3, name: 'Sudarshan Kale' },
  { id: 4, name: 'Olivia Taylor' },
  { id: 5, name: 'Super Admin' }
];

const STATUS_COLORS = {
  'TO DO': 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  'IN PROGRESS': 'bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold',
  'IN REVIEW': 'bg-purple-100 text-purple-800 hover:bg-purple-200 font-semibold',
  'DONE': 'bg-green-100 text-green-800 hover:bg-green-200 font-semibold'
};

const ITIssueDetailsPanel = ({ issue, updateIssue, deleteIssue, onClose, onIssueCreated, department }) => {
  const { user } = useAuth();
  const loggedUser = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : 'Current User';

  // Core issue state
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Task');
  const [currentStatus, setCurrentStatus] = useState('TO DO');
  const [priority, setPriority] = useState('Medium');
  const [assignee, setAssignee] = useState({ name: 'Unassigned', initial: 'U', color: 'bg-gray-200 text-gray-500' });
  const [reporter, setReporter] = useState({ name: loggedUser, initial: getInitials(loggedUser), color: 'bg-blue-100 text-blue-700' });
  const [team, setTeam] = useState('IT Team');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  // Sprint membership is the id; the name is only what the field displays.
  const [sprintId, setSprintId] = useState('');
  const [sprintsList, setSprintsList] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [projectsList, setProjectsList] = useState([]);
  const [issuesList, setIssuesList] = useState([]);
  const [originalEstimate, setOriginalEstimate] = useState('0h');
  const [remainingEstimate, setRemainingEstimate] = useState('0h');

  // Performance Engine States
  const [effortPoints, setEffortPoints] = useState(0);
  const [estimatedHours, setEstimatedHours] = useState(0);
  const [contributionMethod, setContributionMethod] = useState('WORK_BREAKDOWN');
  const [contributionReviewStatus, setContributionReviewStatus] = useState('Pending');

  // Descriptions & Subtasks
  const [description, setDescription] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState(null);

  // AI & Docs States
  const [improvedDescription, setImprovedDescription] = useState('');
  const [isImprovingSideBySide, setIsImprovingSideBySide] = useState(false);
  const [detailedSuggestedSubtasks, setDetailedSuggestedSubtasks] = useState([]);
  const [showSuggestedSubtasksCard, setShowSuggestedSubtasksCard] = useState(false);
  const [selectedSubtaskForAi, setSelectedSubtaskForAi] = useState(null);
  const [subtaskAiDetails, setSubtaskAiDetails] = useState(null);
  const [showSubtaskAiModal, setShowSubtaskAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState({ description: false, subtasks: false });
  const [showReviewGate, setShowReviewGate] = useState(false);
  const [githubData, setGithubData] = useState({ commits: [], prs: [] });

  // Linked items & Comments
  const [linkedIssues, setLinkedIssues] = useState([]);
  const [isLinkingIssue, setIsLinkingIssue] = useState(false);
  const [linkRelation, setLinkRelation] = useState('is blocked by');
  const [linkSearchInput, setLinkSearchInput] = useState('');
  const [comments, setComments] = useState([]);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [worklogData, setWorklogData] = useState({ worklogs: [], totalSpent: '0h', originalEstimate: '0h', remainingEstimate: '0h' });
  const [aiDocsLoading, setAiDocsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  // Layout UI states
  const [currentSubtask, setCurrentSubtask] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isWatching, setIsWatching] = useState(true);
  const [watchCount, setWatchCount] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('Comments');
  const [collapsedSections, setCollapsedSections] = useState({ details: false, development: false, automation: false });
  const [usersList, setUsersList] = useState(DEFAULT_USERS);
  const [allUsersList, setAllUsersList] = useState(DEFAULT_USERS);
  const [teamsList, setTeamsList] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState([]);
  const [docsData, setDocsData] = useState(null);

  const fileInputRef = useRef(null);
  const commentInputRef = useRef(null);

  // Load team users & issue details on mount
  // Baseline assignee list = people in this issue's department. Without this the picker
  // offered every user in the company, so a Marketing ticket could be assigned to IT staff.
  // When the issue also has a team, the effect below narrows this further to that team.
  const issueDepartment = issue?.department || '';

  useEffect(() => {
    fetch(`${API_BASE_URL}/users?limit=300&excludeSystem=true`)
      .then(res => res.json())
      .then(data => {
        const raw = Array.isArray(data?.value) ? data.value : (Array.isArray(data) ? data : []);
        if (raw.length > 0) {
          const formatted = raw.map(u => ({
            id: u.id,
            name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || 'User'
          }));
          setAllUsersList(formatted);
          setUsersList(formatted);
        } else {
          setAllUsersList(DEFAULT_USERS);
          setUsersList(DEFAULT_USERS);
        }
      })
      .catch(err => {
        console.error('Error fetching users:', err);
        setAllUsersList(DEFAULT_USERS);
        setUsersList(DEFAULT_USERS);
      });

    // Fetch all teams across the organization so any team can be selected
    fetch(`${API_BASE_URL}/teams`)
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        setTeamsList(data);
      })
      .catch(console.error);

    // Real sprints for this board, so the Sprint field offers what actually exists rather
    // than a hardcoded "Sprint 1/2/3" list.
    fetch(`${API_BASE_URL}/sprints?department=${encodeURIComponent(issueDepartment || 'IT')}`)
      .then(res => res.json())
      .then(data => setSprintsList(Array.isArray(data?.sprints) ? data.sprints : []))
      .catch(err => console.error('Error fetching sprints:', err));

    // Candidate parents: other work items on the same board.
    fetch(`${API_BASE_URL}/it-kanban/issues?department=${encodeURIComponent(issueDepartment || 'IT')}`)
      .then(res => res.json())
      .then(data => setIssuesList(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching issues for parent picker:', err));

    // Which project this work belongs to — without it the panel gives no clue.
    fetch(`${API_BASE_URL}/projects?department=${encodeURIComponent(issueDepartment || 'IT')}`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        setProjectsList(list);
      })
      .catch(err => console.error('Error fetching projects:', err));
  }, [issueDepartment]);

  useEffect(() => {
    if (!issue) return;
    setCurrentSubtask(null);
    setTitle(issue.title || '');
    setType(issue.type || 'Task');
    setCurrentStatus(issue.status || 'TO DO');
    setPriority(issue.priority || 'Medium');
    setDescription(issue.description || '');

    // Performance Engine Init
    setEffortPoints(issue.effort_points || 0);
    setEstimatedHours(issue.estimated_hours || 0);
    setContributionMethod(issue.contribution_method || 'WORK_BREAKDOWN');
    setContributionReviewStatus(issue.contribution_review_status || 'Pending');

    // Fetch GitHub Evidence
    if (issue.issue_key || issue.key) {
      fetch(`${API_BASE_URL}/tasks/${issue.issue_key || issue.key}/github`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) setGithubData(data);
        })
        .catch(err => console.error('Error fetching GitHub evidence:', err));
    }

    const ass = issue.assignee;
    const isUnass = !ass || ass.toLowerCase() === 'unassigned' || ass.toLowerCase() === 'none';
    setAssignee({
      name: isUnass ? 'Unassigned' : ass,
      initial: isUnass ? 'U' : getInitials(ass),
      color: isUnass ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white'
    });

    const rep = issue.reporter || loggedUser;
    setReporter({ name: rep, initial: getInitials(rep), color: 'bg-blue-100 text-blue-700' });

    let rawSt = issue.subtasks;
    if (typeof rawSt === 'string') {
      try { rawSt = JSON.parse(rawSt); } catch (e) { rawSt = []; }
    }
    const parsedList = Array.isArray(rawSt) ? rawSt : [];
    const parentTitleStr = issue.title || '';
    const sanitizedList = parsedList.map(st => {
      let cleanTitle = st.title || '';
      if (cleanTitle.includes('...')) {
        if (cleanTitle.includes('title:')) {
          cleanTitle = cleanTitle.replace(/title:\s*.*$/, `title: "${parentTitleStr}"`);
        } else if (parentTitleStr) {
          cleanTitle = cleanTitle.replace(/\.\.\./g, ` (${parentTitleStr})`);
        } else {
          cleanTitle = cleanTitle.replace(/\.\.\./g, '');
        }
      }
      return {
        ...st,
        title: cleanTitle.trim(),
        assignee: (!st.assignee || st.assignee === 'Unassigned' || st.assignee.includes('Manager') || st.assignee.includes('Admin')) ? 'Unassigned' : st.assignee
      };
    });
    setSubtasks(sanitizedList);
    setTeam(issue.team || 'IT Team');

    // These were never populated from the issue, so dates and sprint always looked empty
    // even though they were saved. Dates must be read in local time: a DATE column comes
    // back as e.g. 2026-08-13T18:30:00Z, which is 14 Aug in IST — using toISOString()
    // here would show the previous day.
    setDueDate(toDateInputValue(issue.due_date));
    setStartDate(toDateInputValue(issue.start_date));
    setSprintId(issue.sprint_id == null ? '' : String(issue.sprint_id));
    setProjectId(issue.project_id == null ? '' : String(issue.project_id));

    // Load stored comments so they survive closing and reopening the issue.
    let rawComments = issue.comments;
    if (typeof rawComments === 'string') {
      try { rawComments = JSON.parse(rawComments); } catch (e) { rawComments = []; }
    }
    setComments(Array.isArray(rawComments) ? rawComments : []);
  }, [issue]);

  // Work types come from the issue's own department, so a Marketing ticket never offers
  // IT types and the other way round.
  const typeOptions = (DEPARTMENT_KANBAN_CONFIG[issueDepartment]?.issueTypes
    || DEPARTMENT_KANBAN_CONFIG.IT.issueTypes).map(t => t.name);

  // Git branches, pull requests and build automation are being hidden for now
  const showDevTools = false;

  const issueKey = issue?.issue_key || issue?.key;

  // Switching between the issue and one of its subtasks must not carry the previous
  // item's draft text across, so clear the in-progress edit state on every switch.
  useEffect(() => {
    setIsEditingDescription(false);
    setTempDescription('');
  }, [currentSubtask?.id]);

  // History + work log come from their own tables, so refetch whenever the issue changes.
  const loadHistory = React.useCallback(() => {
    if (!issueKey) return;
    fetch(`${API_BASE_URL}/it-kanban/issues/${issueKey}/history`)
      .then(res => res.json())
      .then(data => setHistoryEntries(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to load history:', err));
  }, [issueKey]);

  const loadWorklogs = React.useCallback(() => {
    if (!issueKey) return;
    fetch(`${API_BASE_URL}/it-kanban/issues/${issueKey}/worklogs`)
      .then(res => res.json())
      .then(data => setWorklogData(data && data.worklogs ? data : { worklogs: [], totalSpent: '0h', originalEstimate: '0h', remainingEstimate: '0h' }))
      .catch(err => console.error('Failed to load work logs:', err));
  }, [issueKey]);

  // Load stored attachments for this issue so they persist across page refreshes
  const loadAttachments = React.useCallback(() => {
    if (!issueKey) {
      setAttachments([]);
      return;
    }
    fetch(`${API_BASE_URL}/it-kanban/issues/${issueKey}/attachments?_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAttachments(data.map(a => ({
            id: a.id,
            name: a.file_name,
            size: a.file_size,
            url: a.file_path,
            type: a.file_type
          })));
        } else {
          setAttachments([]);
        }
      })
      .catch(err => {
        console.error('Failed to load attachments:', err);
        setAttachments([]);
      });
  }, [issueKey]);

  useEffect(() => {
    loadHistory();
    loadWorklogs();
    loadAttachments();
  }, [loadHistory, loadWorklogs, loadAttachments]);

  // Prioritize team members at the top of assignee list when a team is chosen, but keep all users selectable
  useEffect(() => {
    if (!team && !issue?.team_id) {
      setUsersList(allUsersList);
      return;
    }
    const targetTeam = teamsList.find(t => t.name === team || t.id === issue?.team_id);
    if (targetTeam && targetTeam.id) {
      fetch(`${API_BASE_URL}/teams/${targetTeam.id}/members`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const teamUsers = data.map(m => ({
              id: m.user_id || m.id,
              name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email || 'Team Member'
            }));
            const teamIds = new Set(teamUsers.map(u => String(u.id)));
            const otherUsers = allUsersList.filter(u => !teamIds.has(String(u.id)));
            setUsersList([...teamUsers, ...otherUsers]);
          } else {
            setUsersList(allUsersList);
          }
        })
        .catch(() => setUsersList(allUsersList));
    } else {
      setUsersList(allUsersList);
    }
  }, [team, teamsList, issue?.team_id, allUsersList]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.interactive-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleUpdate = (updatedFields) => {
    const issueKey = issue?.issue_key || issue?.key;
    if (!issueKey || !updateIssue) return;
    updateIssue(issueKey, updatedFields);
  };

  const toggleDropdown = (name) => {
    setOpenDropdown(prev => prev === name ? null : name);
  };

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleWatchToggle = () => {
    setIsWatching(!isWatching);
    setWatchCount(prev => isWatching ? prev - 1 : prev + 1);
  };

  const handleAssignToMe = () => {
    const me = loggedUser;
    const newAss = { name: me, initial: getInitials(me), color: 'bg-blue-600 text-white' };
    setAssignee(newAss);
    handleUpdate({ assignee: me });
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSubtasks = [...subtasks, {
      id: Date.now(),
      title: newSubtaskTitle.trim(),
      completed: false,
      status: 'To Do',
      priority: 'Medium',
      assignee: 'Unassigned'
    }];
    setSubtasks(newSubtasks);
    setNewSubtaskTitle('');
    setIsAddingSubtask(false);
    handleUpdate({ subtasks: newSubtasks });
  };

  const handleDetailedSubtaskSuggest = async () => {
    setOpenDropdown(null);
    setAiLoading(prev => ({ ...prev, subtasks: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/it-kanban/issues/${issue.issue_key || issue.key}/ai/generate-subtasks-detailed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      });
      if (!res.ok) throw new Error('Failed to generate detailed subtasks');
      const data = await res.json();
      const generatedList = Array.isArray(data.subtasks) ? data.subtasks : [];

      if (generatedList.length > 0) {
        const newEntries = generatedList.map((st, i) => ({
          id: Date.now() + i,
          title: st.title,
          completed: false,
          status: 'To Do',
          priority: st.priority || 'Medium',
          assignee: 'Unassigned'
        }));
        const newSubtasks = [...subtasks, ...newEntries];
        setSubtasks(newSubtasks);
        setIsAddingSubtask(false);
        handleUpdate({ subtasks: newSubtasks });

        Swal.fire({
          icon: 'success',
          title: '✨ AI Subtasks Created!',
          text: `Added ${newEntries.length} technical subtasks to this issue.`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setAiLoading(prev => ({ ...prev, subtasks: false }));
    }
  };

  const deleteSubtask = (id) => {
    const updated = subtasks.filter(st => st.id !== id);
    setSubtasks(updated);
    handleUpdate({ subtasks: updated });
  };

  const handleSubtaskAiImprove = async (subtask, index) => {
    try {
      const subtaskIdx = index !== undefined && index !== null ? index : 0;
      const res = await fetch(`${API_BASE_URL}/it-kanban/issues/${issue.issue_key || issue.key}/ai/subtask/${subtaskIdx}/improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskTitle: subtask.title, parentTitle: title })
      });
      if (!res.ok) throw new Error('Failed to fetch AI specs');
      const data = await res.json();
      setSubtaskAiDetails(data.specs || data.improvement);
      setSelectedSubtaskForAi({ subtask, index });
      setShowSubtaskAiModal(true);
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleImproveDescription = async () => {
    setAiLoading(prev => ({ ...prev, description: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/it-kanban/issues/${issue.issue_key || issue.key}/ai/improve-description`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to improve description');
      const data = await res.json();
      setImprovedDescription(data.improvedDescription);
      setIsImprovingSideBySide(true);
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setAiLoading(prev => ({ ...prev, description: false }));
    }
  };

  // `html` is passed by the editor so we save exactly what's on screen rather than
  // whatever tempDescription happened to hold when this closure was created.
  const handleSaveDescription = (html) => {
    const finalHtml = html !== undefined ? html : tempDescription;
    setDescription(finalHtml);
    setIsEditingDescription(false);
    handleUpdate({ description: finalHtml });
  };

  // Upload attachments to the server and persist in it_kanban_attachments so they survive a reload
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const f of files) {
      try {
        const saved = await uploadDescriptionFile(f, {
          project_id: issue?.project_id || undefined
        });

        if (issueKey) {
          const res = await fetch(`${API_BASE_URL}/it-kanban/issues/${issueKey}/attachments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_name: saved.name,
              file_path: saved.url,
              file_size: formatFileSize(saved.sizeBytes),
              file_type: saved.mimeType || 'document',
              issue_id: issue?.id || null
            })
          });
          if (res.ok) {
            const created = await res.json();
            setAttachments(prev => [{
              id: created.id,
              name: saved.name,
              size: formatFileSize(saved.sizeBytes),
              url: saved.url,
              type: saved.mimeType
            }, ...prev]);
            showSuccessToast('Attachment added');
          }
        }
      } catch (err) {
        showErrorToast(err.message || 'Upload failed');
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleRemoveAttachment = async (idx) => {
    const target = attachments[idx];
    if (target?.id) {
      try {
        await fetch(`${API_BASE_URL}/it-kanban/attachments/${target.id}`, { method: 'DELETE' });
        showSuccessToast('Attachment deleted');
      } catch (err) {
        console.error('Failed to delete attachment:', err);
      }
    }
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateLinkedIssue = () => {
    if (!linkSearchInput.trim()) return;
    setLinkedIssues(prev => [...prev, { relation: linkRelation, key: linkSearchInput, title: `Related task (${linkSearchInput})` }]);
    setLinkSearchInput('');
    setIsLinkingIssue(false);
  };

  const deleteLinkedIssue = (key) => {
    setLinkedIssues(prev => prev.filter(l => l.key !== key));
  };

  // Comments are stored on the issue itself (comments JSON column), so every change
  // is written back to the server rather than living only in component state.
  const persistComments = async (next) => {
    setComments(next);
    if (!issueKey) return;
    try {
      const res = await fetch(`${API_BASE_URL}/it-kanban/issues/${issueKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-name': loggedUser },
        body: JSON.stringify({ comments: next })
      });
      if (!res.ok) throw new Error('Failed to save comment');
    } catch (err) {
      Swal.fire('Error', 'Could not save comment. Please try again.', 'error');
    }
  };

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    const entry = {
      author: loggedUser,
      text: newCommentText.trim(),
      time: new Date().toISOString()
    };
    persistComments([...comments, entry]);
    setNewCommentText('');
    setIsCommenting(false);
  };

  const handleEditComment = (index, updatedText) => {
    if (!updatedText.trim()) return;
    const next = [...comments];
    if (next[index]) {
      next[index] = {
        ...next[index],
        text: updatedText.trim(),
        is_edited: true,
        edited_at: new Date().toISOString()
      };
      persistComments(next);
    }
  };

  const handleLogWork = async ({ timeSpent, description, startedAt, originalEstimate }) => {
    if (!issueKey) return;
    try {
      const res = await fetch(`${API_BASE_URL}/it-kanban/issues/${issueKey}/worklogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeSpent, description, startedAt, originalEstimate, author: loggedUser })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log work');
      loadWorklogs();
    } catch (err) {
      Swal.fire('Could not log work', err.message, 'error');
    }
  };

  const handleDeleteWorklog = async (id) => {
    if (!issueKey) return;
    try {
      await fetch(`${API_BASE_URL}/it-kanban/issues/${issueKey}/worklogs/${id}`, { method: 'DELETE' });
      loadWorklogs();
    } catch (err) {
      Swal.fire('Error', 'Could not delete work log', 'error');
    }
  };

  const handleGenerateDocs = async () => {
    if (!issueKey) return;
    setAiDocsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/it-kanban/issues/${issueKey}/ai/generate-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate docs');
      setDocsData(data.docs || data);
    } catch (err) {
      Swal.fire('Could not generate docs', err.message, 'error');
    } finally {
      setAiDocsLoading(false);
    }
  };

  const deleteComment = (idx) => {
    persistComments(comments.filter((_, i) => i !== idx));
  };

  if (!issue) return null;

  return (
    <>
      {/* Backdrop for Expanded Modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Main Drawer Container */}
      <div
        className={
          isExpanded
            ? "fixed inset-4 md:inset-8 bg-white rounded-xl border border-gray-200 shadow-2xl z-[9999] flex flex-col font-sans text-gray-800 overflow-hidden animate-fade-in"
            : "fixed right-0 top-0 bottom-0 w-[940px] max-w-[94vw] border-l border-gray-200 bg-white flex flex-col shadow-2xl z-[9999] animate-slide-left font-sans text-gray-800"
        }
      >
        {/* HEADER BAR */}
        <ITIssueHeaderBar
          projectName={
            projectsList.find(p => String(p.id) === String(projectId))?.name
            || (projectId ? `Project #${projectId}` : '')
          }
          issue={issue}
          type={currentSubtask ? 'Task' : type}
          TYPE_ICONS={TYPE_ICONS}
          isWatching={isWatching}
          watchCount={watchCount}
          handleWatchToggle={handleWatchToggle}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          onClose={onClose}
          deleteIssue={deleteIssue}
          openDropdown={openDropdown}
          toggleDropdown={toggleDropdown}
          currentSubtask={currentSubtask}
          onBackToParent={() => setCurrentSubtask(null)}
          onOpenReviewGate={() => setShowReviewGate(true)}
        />

        {/* INDEPENDENTLY SCROLLABLE 2-COLUMN JIRA CONTENT */}
        <div className="flex-1 min-h-0 p-5 flex gap-6 overflow-hidden">
          {/* Left Column (Main Content - Independent Scroll) */}
          <div className="flex-1 min-w-0 overflow-y-auto pr-3 custom-scrollbar space-y-6">
            {/* Title (Interactive, Full Wrapping & Inline Editable like Jira) */}
            <div className="group relative">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <textarea
                    autoFocus
                    value={currentSubtask ? currentSubtask.title : title}
                    onChange={(e) => {
                      const newT = e.target.value;
                      if (currentSubtask) {
                        setCurrentSubtask(prev => ({ ...prev, title: newT }));
                        const updatedSubtasks = subtasks.map(item =>
                          item.id === currentSubtask.id ? { ...item, title: newT } : item
                        );
                        setSubtasks(updatedSubtasks);
                        handleUpdate({ subtasks: updatedSubtasks });
                      } else {
                        setTitle(newT);
                      }
                    }}
                    onBlur={() => {
                      setIsEditingTitle(false);
                      if (!currentSubtask) handleUpdate({ title });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setIsEditingTitle(false);
                        if (!currentSubtask) handleUpdate({ title });
                      }
                    }}
                    className="w-full text-xl  text-gray-900 border border-blue-500 rounded p-2 outline-none resize-none leading-snug"
                    rows={2}
                  />
                </div>
              ) : (
                <h2
                  onClick={() => setIsEditingTitle(true)}
                  className="text-xl  text-gray-900 leading-snug hover:bg-gray-100 p-1 -ml-1 rounded cursor-pointer transition break-words"
                  title="Click to edit title"
                >
                  {currentSubtask ? currentSubtask.title : title}
                </h2>
              )}
            </div>

            {/* Description & Attachments.
                Keyed per entity so switching between the issue and a subtask remounts the
                editor with a clean contentEditable — otherwise the previous item's HTML
                lingers in the DOM node and can be saved onto the wrong record. */}
            <ITIssueDescription
              key={currentSubtask ? `subtask-${currentSubtask.id}` : `issue-${issue?.issue_key || issue?.key || 'none'}`}
              issue={currentSubtask ? { ...issue, title: currentSubtask.title } : issue}
              description={currentSubtask ? (currentSubtask.description || '') : description}
              setDescription={(newDesc) => {
                if (currentSubtask) {
                  setCurrentSubtask(prev => ({ ...prev, description: newDesc }));
                  const updatedSubtasks = subtasks.map(item =>
                    item.id === currentSubtask.id ? { ...item, description: newDesc } : item
                  );
                  setSubtasks(updatedSubtasks);
                  handleUpdate({ subtasks: updatedSubtasks });
                } else {
                  setDescription(newDesc);
                }
              }}
              isEditingDescription={isEditingDescription}
              setIsEditingDescription={setIsEditingDescription}
              tempDescription={tempDescription}
              setTempDescription={setTempDescription}
              handleSaveDescription={(html) => {
                const finalHtml = html !== undefined ? html : tempDescription;
                if (currentSubtask) {
                  // Editing a subtask: write to that subtask only, never to the parent issue.
                  const updatedSubtasks = subtasks.map(item =>
                    item.id === currentSubtask.id ? { ...item, description: finalHtml } : item
                  );
                  setSubtasks(updatedSubtasks);
                  setCurrentSubtask(prev => ({ ...prev, description: finalHtml }));
                  setIsEditingDescription(false);
                  handleUpdate({ subtasks: updatedSubtasks });
                } else {
                  handleSaveDescription(finalHtml);
                }
              }}
              handleImproveDescription={handleImproveDescription}
              aiLoading={aiLoading}
              isImprovingSideBySide={isImprovingSideBySide}
              setIsImprovingSideBySide={setIsImprovingSideBySide}
              improvedDescription={improvedDescription}
              setImprovedDescription={setImprovedDescription}
              attachments={attachments}
              handleFileUpload={handleFileUpload}
              handleRemoveAttachment={handleRemoveAttachment}
              selectedPdfUrl={selectedPdfUrl}
              setSelectedPdfUrl={setSelectedPdfUrl}
              fileInputRef={fileInputRef}
              handleUpdate={handleUpdate}
            />

            {/* Jira Subtasks Data Table & Quick Creator (Visible on Parent Issue) */}
            {!currentSubtask && (
              <ITSubtasksTable
                issue={issue}
                subtasks={subtasks}
                setSubtasks={setSubtasks}
                isAddingSubtask={isAddingSubtask}
                setIsAddingSubtask={setIsAddingSubtask}
                newSubtaskTitle={newSubtaskTitle}
                setNewSubtaskTitle={setNewSubtaskTitle}
                handleAddSubtask={handleAddSubtask}
                handleDetailedSubtaskSuggest={handleDetailedSubtaskSuggest}
                handleSubtaskAiImprove={handleSubtaskAiImprove}
                deleteSubtask={deleteSubtask}
                handleUpdate={handleUpdate}
                aiLoading={aiLoading}
                getInitials={getInitials}
                PRIORITY_ICONS={PRIORITY_ICONS}
                usersList={usersList}
                onSelectSubtask={(st, subtaskKey) => setCurrentSubtask({ ...st, subtaskKey })}
              />
            )}

            {/* Linked Work Items */}
            <ITIssueLinkedItems
              linkedIssues={linkedIssues}
              isLinkingIssue={isLinkingIssue}
              setIsLinkingIssue={setIsLinkingIssue}
              linkRelation={linkRelation}
              setLinkRelation={setLinkRelation}
              linkSearchInput={linkSearchInput}
              setLinkSearchInput={setLinkSearchInput}
              handleCreateLinkedIssue={handleCreateLinkedIssue}
              deleteLinkedIssue={deleteLinkedIssue}
            />

            {/* Activity Tabs, Comments & AI Docs */}
            <ITIssueActivityTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              comments={comments}
              newCommentText={newCommentText}
              setNewCommentText={setNewCommentText}
              isCommenting={isCommenting}
              setIsCommenting={setIsCommenting}
              handleAddComment={handleAddComment}
              handleEditComment={handleEditComment}
              deleteComment={deleteComment}
              commentInputRef={commentInputRef}
              docsData={docsData}
              historyEntries={historyEntries}
              worklogData={worklogData}
              handleLogWork={handleLogWork}
              handleDeleteWorklog={handleDeleteWorklog}
              handleGenerateDocs={handleGenerateDocs}
              aiDocsLoading={aiDocsLoading}
              githubData={githubData}
              issueKey={issue?.issue_key || issue?.key}
              loggedUser={loggedUser}
              department={department || 'IT'}
              currentUser={loggedUser}
              usersList={usersList}
            />
          </div>

          {/* Right Column (Jira Details Sidebar) */}
          <ITIssueDetailsSidebar
            currentStatus={currentSubtask ? (currentSubtask.status || 'To Do') : currentStatus}
            setCurrentStatus={(st) => {
              if (currentSubtask) {
                const newStStatus = st;
                setCurrentSubtask(prev => ({ ...prev, status: newStStatus }));
                const updatedSubtasks = subtasks.map(item =>
                  item.id === currentSubtask.id
                    ? { ...item, status: newStStatus, completed: newStStatus === 'Done' }
                    : item
                );
                setSubtasks(updatedSubtasks);
                handleUpdate({ subtasks: updatedSubtasks });
              } else {
                setCurrentStatus(st);
              }
            }}
            STATUS_COLORS={STATUS_COLORS}
            openDropdown={openDropdown}
            toggleDropdown={toggleDropdown}
            setOpenDropdown={setOpenDropdown}
            aiLoading={aiLoading}
            handleSideBySideImprove={handleImproveDescription}
            handleLinkConfluence={() => { }}
            handleSummarizeComments={() => { }}
            handleDetailedSubtaskSuggest={handleDetailedSubtaskSuggest}
            handleLinkSimilar={() => { }}
            collapsedSections={collapsedSections}
            toggleSection={toggleSection}
            assignee={currentSubtask ? { name: currentSubtask.assignee || 'Unassigned', initial: getInitials(currentSubtask.assignee), color: 'bg-blue-100 text-blue-700' } : assignee}
            setAssignee={(newAss) => {
              if (currentSubtask) {
                const assName = typeof newAss === 'string' ? newAss : (newAss.name || 'Unassigned');
                setCurrentSubtask(prev => ({ ...prev, assignee: assName }));
                const updatedSubtasks = subtasks.map(item =>
                  item.id === currentSubtask.id
                    ? { ...item, assignee: assName }
                    : item
                );
                setSubtasks(updatedSubtasks);
                handleUpdate({ subtasks: updatedSubtasks });
              } else {
                setAssignee(newAss);
                const assName = typeof newAss === 'string' ? newAss : (newAss.name || 'Unassigned');
                handleUpdate({ assignee: assName });
              }
            }}
            reporter={reporter}
            setReporter={setReporter}
            team={team}
            setTeam={setTeam}
            dueDate={dueDate}
            setDueDate={setDueDate}
            startDate={startDate}
            setStartDate={setStartDate}
            priority={priority}
            setPriority={setPriority}
            sprintId={sprintId}
            setSprintId={setSprintId}
            projectId={projectId}
            setProjectId={setProjectId}
            projectsList={projectsList}
            typeOptions={typeOptions}
            showDevTools={showDevTools}
            issuesList={issuesList}
            originalEstimate={originalEstimate}
            setOriginalEstimate={setOriginalEstimate}
            remainingEstimate={remainingEstimate}
            setRemainingEstimate={setRemainingEstimate}
            usersList={usersList}
            reportersList={allUsersList}
            teamsList={teamsList}
            sprintsList={sprintsList}
            handleUpdate={handleUpdate}
            handleAssignToMe={handleAssignToMe}
            currentSubtask={currentSubtask}
            parentIssueKey={issue?.issue_key || issue?.key}
            parentIssueTitle={issue?.title}
            onBackToParent={() => setCurrentSubtask(null)}
            issue={issue}
            effortPoints={effortPoints}
            setEffortPoints={setEffortPoints}
            estimatedHours={estimatedHours}
            setEstimatedHours={setEstimatedHours}
            contributionMethod={contributionMethod}
            setContributionMethod={setContributionMethod}
            contributionReviewStatus={contributionReviewStatus}
          />
        </div>

        {/* NESTED SUBTASK AI SPECIFICATIONS MODAL */}
        <ITSubtaskAiModal
          showSubtaskAiModal={showSubtaskAiModal}
          setShowSubtaskAiModal={setShowSubtaskAiModal}
          subtaskAiDetails={subtaskAiDetails}
          selectedSubtaskForAi={selectedSubtaskForAi}
          subtasks={subtasks}
          setSubtasks={setSubtasks}
          handleUpdate={handleUpdate}
          logAiAction={() => { }}
        />

        {/* MANAGER REVIEW GATE */}
        <ITManagerReviewGate
          isOpen={showReviewGate}
          onClose={() => setShowReviewGate(false)}
          issue={{ ...issue, effort_points: effortPoints, contribution_method: contributionMethod }}
          subtasks={subtasks}
          onReviewComplete={() => {
            setContributionReviewStatus('Approved');
            handleUpdate({ contribution_review_status: 'Approved' });
          }}
          department={department || 'IT'}
        />
      </div>

      <style>{`
        .animate-slide-left { animation: slideLeft 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
};

export default ITIssueDetailsPanel;

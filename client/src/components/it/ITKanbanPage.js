import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search, Bell, HelpCircle, Settings, ChevronDown, ChevronRight,
  Share2, Download, MoreHorizontal, LayoutList, Plus, AlertCircle, ArrowUp, ArrowDown, CheckSquare,
  Trash2, User, Check, Megaphone, Palette, Video, FileText, Globe, Users, IterationCw, Calendar,
  Folder, Maximize2, X
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ITCreateIssueDrawer from './ITCreateIssueDrawer';
import ITIssueDetailsPanel from './ITIssueDetailsPanel';
import MarketingCreateIssueDrawer from '../marketing/MarketingCreateIssueDrawer';
import { DEPARTMENT_KANBAN_CONFIG } from '../../config/departmentKanbanConfig';
import BoardTabs from '../common/BoardTabs';
import CompleteSprintModal from '../common/CompleteSprintModal';
import SearchableSelect from '../common/SearchableSelect';
import Swal from 'sweetalert2';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


function BookmarkIcon(props) {
  return <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}><path d="M5 3v18l7-4.5 7 4.5V3z" /></svg>;
}
function TestTubeIcon(props) {
  return <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}><rect x="9" y="3" width="6" height="3" rx="1" /><path d="M10 6v11a2 2 0 004 0V6" /></svg>;
}

const PRIORITY_ICONS = {
  High: <ArrowUp size={14} className="text-red-500" />,
  Medium: <ArrowUp size={14} className="text-orange-500" />,
  Low: <ArrowDown size={14} className="text-blue-500" />
};

const TYPE_ICONS = {
  // IT deliverables
  Task: <CheckSquare size={14} className="text-blue-500 fill-blue-100" />,
  Story: <BookmarkIcon size={14} className="text-green-500 fill-green-100" />,
  Bug: <AlertCircle size={14} className="text-red-500 fill-red-100" />,
  Test: <TestTubeIcon size={14} className="text-purple-500 fill-purple-100" />,
  // Marketing deliverables
  Campaign: <Megaphone size={14} className="text-orange-500" />,
  Design: <Palette size={14} className="text-purple-500" />,
  Video: <Video size={14} className="text-red-500" />,
  Content: <FileText size={14} className="text-green-600" />,
  Search: <Globe size={14} className="text-indigo-500" />,
  Social: <Users size={14} className="text-pink-500" />
};

// Small icon used inside the inline "create issue" type picker (12px variant).
const TYPE_ICONS_SM = {
  Task: <CheckSquare size={12} className="text-blue-500 fill-blue-100" />,
  Story: <BookmarkIcon size={12} className="text-green-500 fill-green-100" />,
  Bug: <AlertCircle size={12} className="text-red-500 fill-red-100" />,
  Test: <TestTubeIcon size={12} className="text-purple-500 fill-purple-100" />,
  Campaign: <Megaphone size={12} className="text-orange-500" />,
  Design: <Palette size={12} className="text-purple-500" />,
  Video: <Video size={12} className="text-red-500" />,
  Content: <FileText size={12} className="text-green-600" />,
  Search: <Globe size={12} className="text-indigo-500" />,
  Social: <Users size={12} className="text-pink-500" />
};

const COLUMN_COLORS = {
  'TO DO': 'bg-gray-100',
  'IN PROGRESS': 'bg-blue-50',
  'IN REVIEW': 'bg-purple-50',
  'TESTING': 'bg-orange-50',
  'DONE': 'bg-green-50',
};

const CheckCircleIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

// A DATE column comes back as e.g. 2026-08-31T18:30:00Z, which is 1 Sep in IST. Comparing
// or printing that as UTC lands a day early, so both helpers work off local date parts.
const localMidnight = (value) => {
  // Guard falsy input explicitly: new Date(null) is the epoch, not an invalid date, so a
  // sprint with no dates would otherwise read "Jan 1, 1970".
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const formatDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const isPastDate = (v) => {
  if (!v) return false;
  const d = new Date(v);
  if (isNaN(d.getTime())) return false;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const now = new Date();
  return day < new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const getIssueDateParts = (dateVal) => {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrowStr = () => {
  const tmrw = new Date();
  tmrw.setDate(tmrw.getDate() + 1);
  const year = tmrw.getFullYear();
  const month = String(tmrw.getMonth() + 1).padStart(2, '0');
  const day = String(tmrw.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getThisWeekRange = () => {
  const now = new Date();
  const currentDay = now.getDay();
  const distToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + distToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const toStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: toStr(monday), end: toStr(sunday) };
};

const getThisMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const toStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: toStr(firstDay), end: toStr(lastDay) };
};

const formatSprintDate = (value) => {
  const d = localMidnight(value);
  if (!d) return 'Not set';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Jira counts whole days between today and the end date: 18 Aug → 1 Sep reads "14 days left".
const sprintTimeLeft = (endDate) => {
  const end = localMidnight(endDate);
  if (!end) return 'No end date set';
  const days = Math.round((end - localMidnight(new Date())) / 86400000);
  if (days > 1) return `${days} days left`;
  if (days === 1) return '1 day left';
  if (days === 0) return 'Ends today';
  return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`;
};

// Matches the server's definition of finished work.
const isDoneStatus = (s) => ['DONE', 'COMPLETED', 'CLOSED'].includes(String(s || '').toUpperCase().trim());

// People are stored as display names ("karan gusinge"). Normalising both sides lets the
// employee board compare identities exactly instead of by substring.
const normalizePerson = (value) => String(value || '').toLowerCase().replace(/s+/g, ' ').trim();

const getInitials = (name) => {
  if (!name || name === 'Unassigned') return 'U';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word[0].toUpperCase())
    .slice(0, 2)
    .join('');
};
const AlertTriangleIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
);

const DEPARTMENT_KANBAN_COLUMNS = {
  'IT': ['TO DO', 'IN PROGRESS', 'IN REVIEW', 'TESTING', 'DONE'],
  'Marketing': ['TO DO', 'IN PROGRESS', 'IN REVIEW', 'TESTING', 'DONE']
};

const ITKanbanPage = ({ department }) => {
  const { user } = useAuth();
  const { designation, username } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const path = window.location.pathname.toLowerCase();
  const currentDept = department || (
    path.includes('/marketing') ? 'Marketing' :
      path.includes('/seo-gmb') ? 'Marketing' :
        'IT'
  );

  // The active sprint, if any. Drives the Scrum behaviour below: with a sprint running the
  // board shows only its work items; with none, the board points you at the Backlog.
  // A board can run several sprints in parallel, so the board shows the union of their work.
  const [activeSprints, setActiveSprints] = useState([]);
  const [allSprints, setAllSprints] = useState([]);
  const [isCompletingSprint, setIsCompletingSprint] = useState(false);
  const [showSprintDetails, setShowSprintDetails] = useState(false);
  const workspaceBase = `/${currentDept.toLowerCase() === 'marketing' ? 'marketing' : 'it'}/${designation}/${username}`;

  // Board vocabulary (issue types, prefix, spaces) comes from the department config so the
  // Marketing board shows Campaign/Design/Video/Content instead of IT's Story/Bug/Test.
  const deptConfig = DEPARTMENT_KANBAN_CONFIG[currentDept] || DEPARTMENT_KANBAN_CONFIG['IT'];
  const deptIssueTypes = deptConfig.issueTypes.map(t => t.name);

  const isManager = Boolean(
    (designation && (
      designation.toLowerCase().includes('manager') ||
      designation.toLowerCase().includes('admin') ||
      designation.toLowerCase().includes('lead') ||
      designation.toLowerCase().includes('management') ||
      designation.toLowerCase().includes('director') ||
      designation.toLowerCase().includes('head')
    )) ||
    (user?.role && (
      user.role.toLowerCase().includes('manager') ||
      user.role.toLowerCase().includes('admin') ||
      user.role.toLowerCase().includes('lead') ||
      user.role.toLowerCase().includes('management') ||
      user.role.toLowerCase().includes('hr') ||
      user.role.toLowerCase().includes('director') ||
      user.role.toLowerCase().includes('head')
    )) ||
    (user?.designation && (
      user.designation.toLowerCase().includes('manager') ||
      user.designation.toLowerCase().includes('admin') ||
      user.designation.toLowerCase().includes('lead') ||
      user.designation.toLowerCase().includes('management') ||
      user.designation.toLowerCase().includes('head')
    ))
  );

  const userSearchTerms = React.useMemo(() => {
    const terms = new Set();
    if (username) {
      terms.add(username.toLowerCase());
      username.toLowerCase().split(/[-_\s]+/).forEach(t => { if (t.length > 2) terms.add(t); });
    }
    if (user) {
      if (user.username) terms.add(user.username.toLowerCase());
      if (user.first_name) terms.add(user.first_name.toLowerCase());
      if (user.last_name) terms.add(user.last_name.toLowerCase());
      if (user.name) user.name.toLowerCase().split(/\s+/).forEach(t => { if (t.length > 2) terms.add(t); });
    }
    return Array.from(terms);
  }, [username, user]);

  // Every spelling that means "this is me", compared exactly by the employee board.
  const myIdentities = React.useMemo(() => {
    const ids = new Set();
    const add = (v) => { const n = normalizePerson(v); if (n) ids.add(n); };
    if (username) add(username);
    if (user) {
      add(user.username);
      add(user.name);
      add(`${user.first_name || ''} ${user.last_name || ''}`);
    }
    return Array.from(ids);
  }, [username, user]);

  const defaultDeptColumns = DEPARTMENT_KANBAN_COLUMNS[currentDept] || DEPARTMENT_KANBAN_COLUMNS['IT'];
  const [boardData, setBoardData] = useState(() => {
    const init = {};
    defaultDeptColumns.forEach(c => { init[c] = []; });
    return init;
  });
  const [columnOrder, setColumnOrder] = useState(() => {
    const saved = localStorage.getItem(`${currentDept}_kanbanColumnOrder`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.includes('TESTING') && defaultDeptColumns.includes('TESTING')) {
            const doneIdx = parsed.indexOf('DONE');
            if (doneIdx !== -1) {
              parsed.splice(doneIdx, 0, 'TESTING');
            } else {
              parsed.push('TESTING');
            }
          }
          return parsed;
        }
      } catch (e) { }
    }
    return defaultDeptColumns;
  });

  useEffect(() => {
    const saved = localStorage.getItem(`${currentDept}_kanbanColumnOrder`);
    let cols = defaultDeptColumns;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.includes('TESTING') && defaultDeptColumns.includes('TESTING')) {
            const doneIdx = parsed.indexOf('DONE');
            if (doneIdx !== -1) {
              parsed.splice(doneIdx, 0, 'TESTING');
            } else {
              parsed.push('TESTING');
            }
          }
          cols = parsed;
        }
      } catch (e) { }
    }
    setColumnOrder(cols);
  }, [currentDept]);

  const [allRawIssues, setAllRawIssues] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [onlyMyIssues, setOnlyMyIssues] = useState(!isManager);
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'TOMORROW' | 'THIS_WEEK' | 'THIS_MONTH' | 'OVERDUE' | 'EXACT' | 'RANGE' | 'NO_DATE'
  const [exactDate, setExactDate] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'TODAY':
        return 'Date: Today';
      case 'TOMORROW':
        return 'Date: Tomorrow';
      case 'THIS_WEEK':
        return 'Date: This Week';
      case 'THIS_MONTH':
        return 'Date: This Month';
      case 'OVERDUE':
        return 'Date: Overdue';
      case 'NO_DATE':
        return 'Date: No Date';
      case 'EXACT':
        return exactDate ? `Date: ${formatDate(exactDate) || exactDate}` : 'Date: Specific';
      case 'RANGE':
        if (rangeStart && rangeEnd) {
          return `Date: ${formatDate(rangeStart)} - ${formatDate(rangeEnd)}`;
        }
        if (rangeStart) return `Date: from ${formatDate(rangeStart)}`;
        if (rangeEnd) return `Date: until ${formatDate(rangeEnd)}`;
        return 'Date: Range';
      default:
        return 'Date: All';
    }
  };

  useEffect(() => {
    setOnlyMyIssues(!isManager);
  }, [isManager]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterDropdown, setActiveFilterDropdown] = useState(null);

  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (!e.target.closest('.relative')) {
        setActiveFilterDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);
  const [openCardAssigneeDropdown, setOpenCardAssigneeDropdown] = useState(null);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const [cardAssigneePos, setCardAssigneePos] = useState({ top: 0, left: 0 });

  const [openSubtasksPopover, setOpenSubtasksPopover] = useState(null);
  const [subtaskPos, setSubtaskPos] = useState({ top: 0, left: 0 });
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [expandedSubtaskCardKeys, setExpandedSubtaskCardKeys] = useState([]);

  const handleOpenSubtasksPopover = (e, cardKey) => {
    e.stopPropagation();
    if (openSubtasksPopover === cardKey) {
      setOpenSubtasksPopover(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const popupWidth = 280;
    const popupHeight = 280;
    let leftPos = rect.right + 10;
    if (leftPos + popupWidth > window.innerWidth) {
      leftPos = Math.max(10, rect.left - popupWidth - 10);
    }
    let topPos = rect.top - 10;
    if (topPos + popupHeight > window.innerHeight) {
      topPos = Math.max(10, window.innerHeight - popupHeight - 10);
    }
    setSubtaskPos({ top: topPos, left: leftPos });
    setOpenSubtasksPopover(cardKey);
    setNewSubtaskTitle('');
  };

  const handleToggleCardSubtask = async (cardKey, subtaskId) => {
    setAllRawIssues(prev => prev.map(issue => {
      if (issue.issue_key === cardKey || issue.key === cardKey) {
        let rawSt = issue.subtasks;
        if (typeof rawSt === 'string') {
          try { rawSt = JSON.parse(rawSt); } catch (e) { rawSt = []; }
        }
        if (!Array.isArray(rawSt)) rawSt = [];
        const updatedSt = rawSt.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
        fetch(`${API_BASE_URL}/it-kanban/issues/${cardKey}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subtasks: JSON.stringify(updatedSt) })
        }).catch(err => console.error('Failed to update subtask:', err));

        return { ...issue, subtasks: updatedSt };
      }
      return issue;
    }));
  };

  const handleAddCardSubtask = async (cardKey) => {
    if (!newSubtaskTitle.trim()) return;
    const newTitle = newSubtaskTitle.trim();
    setNewSubtaskTitle('');

    setAllRawIssues(prev => prev.map(issue => {
      if (issue.issue_key === cardKey || issue.key === cardKey) {
        let rawSt = issue.subtasks;
        if (typeof rawSt === 'string') {
          try { rawSt = JSON.parse(rawSt); } catch (e) { rawSt = []; }
        }
        if (!Array.isArray(rawSt)) rawSt = [];
        const updatedSt = [...rawSt, { id: Date.now(), title: newTitle, completed: false }];
        fetch(`${API_BASE_URL}/it-kanban/issues/${cardKey}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subtasks: JSON.stringify(updatedSt) })
        }).catch(err => console.error('Failed to add subtask:', err));

        return { ...issue, subtasks: updatedSt };
      }
      return issue;
    }));
  };

  const handleOpenCardAssignee = (e, cardKey) => {
    e.stopPropagation();
    if (openCardAssigneeDropdown === cardKey) {
      setOpenCardAssigneeDropdown(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const popupWidth = 260;
    const popupHeight = 320;
    let leftPos = rect.right + 10;
    if (leftPos + popupWidth > window.innerWidth) {
      leftPos = Math.max(10, rect.left - popupWidth - 10);
    }
    let topPos = rect.top - 10;
    if (topPos + popupHeight > window.innerHeight) {
      topPos = Math.max(10, window.innerHeight - popupHeight - 10);
    }
    setCardAssigneePos({ top: topPos, left: leftPos });
    setOpenCardAssigneeDropdown(cardKey);
    setAssigneeSearchQuery('');
  };

  const handleUpdateCardAssignee = async (issueKey, newAssignee) => {
    const normAssignee = (!newAssignee || newAssignee === 'Unassigned' || newAssignee === 'Automatic') ? 'Unassigned' : newAssignee;
    // 1. Optimistically update both allRawIssues and boardData immediately
    setAllRawIssues(prev => prev.map(t => (t.issue_key === issueKey || t.key === issueKey) ? { ...t, assignee: normAssignee } : t));
    setBoardData(prev => {
      const next = { ...prev };
      for (const col of Object.keys(next)) {
        next[col] = next[col].map(c => (c.key === issueKey || c.issue_key === issueKey) ? { ...c, assignee: normAssignee } : c);
      }
      return next;
    });
    setOpenCardAssigneeDropdown(null);

    try {
      const res = await fetch(`${API_BASE_URL}/it-kanban/issues/${issueKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': user ? (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username) : (username || 'System')
        },
        body: JSON.stringify({ assignee: normAssignee })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        fetchKanbanData(); // Revert optimistic change if server rejected
        showErrorToast(data.error || 'Update rejected by the server');
      } else {
        showSuccessToast(normAssignee === 'Unassigned' ? 'Task unassigned successfully' : `Assigned to ${normAssignee}`);
        fetchKanbanData();
      }
    } catch (err) {
      console.error('Failed to update assignee', err);
      fetchKanbanData();
      showErrorToast('Failed to update assignee');
    }
  };

  const fetchKanbanData = () => {
    const bust = Date.now();
    // Which sprints are running determines what the board is allowed to show.
    fetch(`${API_BASE_URL}/sprints?_t=${bust}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const running = data.activeSprints || (data.activeSprint ? [data.activeSprint] : []);
        setActiveSprints(running);
        setAllSprints(data.sprints || []);
      })
      .catch(err => console.error('Error fetching active sprints:', err));

    fetch(`${API_BASE_URL}/it-kanban/issues?_t=${bust}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setAllRawIssues(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error('Error fetching kanban data:', err));
  };

  useEffect(() => {
    fetchKanbanData();

    // Fetch projects list for filter dropdown across all projects
    fetch(`${API_BASE_URL}/projects`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        setProjectsList(list);
      })
      .catch(err => console.error('Error fetching projects for kanban filter:', err));

    // Fetch users list for assignee filter
    fetch(API_BASE_URL + '/users')
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data?.value) ? data.value : (Array.isArray(data) ? data : []);
        setUsersList(list);
      })
      .catch(err => console.error('Error fetching users for kanban filter:', err));
  }, [currentDept]);

  const itUsersList = React.useMemo(() => {
    const SYSTEM_DUMMY_USERNAMES = ['admin', 'leads', 'deals', 'sales', 'marketing', 'it', 'accounting'];
    return usersList.filter(u => {
      const un = (u.username || '').toLowerCase();
      if (SYSTEM_DUMMY_USERNAMES.includes(un)) return false;
      // Removed department-based validation so everyone can assign task to everyone
      /* const dept = (u.department || '').toLowerCase();
      const role = (u.role_name || u.role || '').toLowerCase();
      if (currentDept === 'Marketing') {
        return dept.includes('marketing') || dept.includes('seo') || role.includes('marketing') || role.includes('designer') || role.includes('video') || role.includes('seo') || role.includes('ppc');
      }
      return dept.includes('it') || role.includes('it') || role.includes('developer') || role.includes('tester') || role.includes('devops'); */
      return true;
    });
  }, [usersList, currentDept]);

  // Re-build board data whenever issues or filters change
  useEffect(() => {
    const newBoard = {};
    columnOrder.forEach(col => {
      newBoard[col] = [];
    });

    // Full transparency: show all tasks without department partition
    let filtered = [...allRawIssues];

    // Board shows tasks in running sprints as well as individual standalone tasks (created without a sprint)
    if (activeSprints.length > 0) {
      const runningIds = new Set(activeSprints.map(s => Number(s.id)));
      filtered = filtered.filter(issue =>
        !issue.sprint_id ||
        runningIds.has(Number(issue.sprint_id)) ||
        issue.sprint_status === 'Active'
      );
    }

    if (selectedProjectId !== 'ALL') {
      filtered = filtered.filter(issue => Number(issue.project_id) === Number(selectedProjectId));
    }
    if (selectedType !== 'ALL') {
      filtered = filtered.filter(issue => issue.type === selectedType);
    }
    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(issue => (issue.status || 'TO DO').toUpperCase() === selectedStatus.toUpperCase());
    }
    if (selectedPriority !== 'ALL') {
      filtered = filtered.filter(issue => issue.priority === selectedPriority);
    }
    if (dateFilter !== 'ALL') {
      const todayStr = getTodayStr();
      const tomorrowStr = getTomorrowStr();
      const { start: weekStart, end: weekEnd } = getThisWeekRange();
      const { start: monthStart, end: monthEnd } = getThisMonthRange();

      filtered = filtered.filter(issue => {
        const startStr = getIssueDateParts(issue.start_date);
        const dueStr = getIssueDateParts(issue.due_date);
        const hasAnyDate = Boolean(startStr || dueStr);

        if (dateFilter === 'NO_DATE') {
          return !hasAnyDate;
        }

        if (dateFilter === 'OVERDUE') {
          if (isDoneStatus(issue.status)) return false;
          return issue.due_date && isPastDate(issue.due_date);
        }

        if (!hasAnyDate) return false;

        const minDate = startStr && dueStr ? (startStr <= dueStr ? startStr : dueStr) : (startStr || dueStr);
        const maxDate = startStr && dueStr ? (startStr <= dueStr ? dueStr : startStr) : (dueStr || startStr);

        if (dateFilter === 'TODAY') {
          return minDate <= todayStr && todayStr <= maxDate;
        }
        if (dateFilter === 'TOMORROW') {
          return minDate <= tomorrowStr && tomorrowStr <= maxDate;
        }
        if (dateFilter === 'THIS_WEEK') {
          return minDate <= weekEnd && maxDate >= weekStart;
        }
        if (dateFilter === 'THIS_MONTH') {
          return minDate <= monthEnd && maxDate >= monthStart;
        }
        if (dateFilter === 'EXACT') {
          if (!exactDate) return true;
          return minDate <= exactDate && exactDate <= maxDate;
        }
        if (dateFilter === 'RANGE') {
          if (!rangeStart && !rangeEnd) return true;
          const rStart = rangeStart || '1970-01-01';
          const rEnd = rangeEnd || '2999-12-31';
          return minDate <= rEnd && maxDate >= rStart;
        }

        return true;
      });
    }
    if (selectedAssignees.length > 0) {
      filtered = filtered.filter(issue => {
        const isUnassigned = !issue.assignee || issue.assignee === 'Unassigned' || issue.assignee === 'Automatic';
        if (selectedAssignees.includes('UNASSIGNED') && isUnassigned) return true;

        return selectedAssignees.some(a => {
          if (a === 'UNASSIGNED') return false;
          return issue.assignee && issue.assignee.toLowerCase().includes(a.toLowerCase());
        });
      });
    }
    const isAssignedToMe = (issue) => {
      const assigneeNorm = normalizePerson(issue.assignee);
      if (assigneeNorm && myIdentities.includes(assigneeNorm)) return true;
      const assigneeStr = (issue.assignee || '').toLowerCase();
      return userSearchTerms.some(term => assigneeStr.includes(term));
    };

    const isTaskAssigned = (issue) => {
      if (!issue || !issue.assignee) return false;
      const a = String(issue.assignee).trim().toLowerCase();
      return a !== '' && a !== 'unassigned' && a !== 'automatic' && a !== 'none' && a !== 'null' && a !== 'undefined';
    };

    // Managers see all tasks (both assigned and unassigned), and can narrow with the "Only My Tasks" toggle.
    // Employees / non-managers only see tasks that are assigned to someone (unassigned tasks are hidden).
    if (!isManager) {
      filtered = filtered.filter(issue => isTaskAssigned(issue));
      if (onlyMyIssues) {
        filtered = filtered.filter(issue => isAssignedToMe(issue));
      }
    } else if (onlyMyIssues) {
      filtered = filtered.filter(issue => isAssignedToMe(issue));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(issue =>
        (issue.title && issue.title.toLowerCase().includes(q)) ||
        (issue.issue_key && issue.issue_key.toLowerCase().includes(q)) ||
        (issue.assignee && issue.assignee.toLowerCase().includes(q))
      );
    }

    filtered.forEach(issue => {
      const col = (issue.status || 'TO DO').toUpperCase();
      const targetCol = newBoard[col] ? col : 'TO DO';
      newBoard[targetCol].push({
        ...issue,
        key: issue.issue_key,
        title: issue.title,
        type: issue.type,
        priority: issue.priority,
        status: issue.status,
        assignee: issue.assignee,
        reporter: issue.reporter,
        team: issue.team,
        team_id: issue.team_id,
        sprint: issue.sprint,
        due_date: issue.due_date,
        start_date: issue.start_date,
        description: issue.description,
        subtasks: issue.subtasks,
        linked_issues: issue.linked_issues,
        comments: issue.comments,
        project_id: issue.project_id
      });
    });

    setBoardData(newBoard);
  }, [allRawIssues, activeSprints, columnOrder, selectedProjectId, selectedType, selectedStatus, selectedPriority, selectedAssignees, onlyMyIssues, isManager, userSearchTerms, myIdentities, searchQuery, username, dateFilter, exactDate, rangeStart, rangeEnd]);

  // Opens a ticket straight from a URL like ...&/kanban?ticketKey=MKT-104, which is how
  // notifications deep-link. Depends on location.search so clicking a notification while
  // already on this board still opens the ticket.
  useEffect(() => {
    const params = new URLSearchParams(location.search || window.location.search);
    const ticketKey = params.get('ticketKey');
    if (ticketKey) {
      const allIssues = Object.values(boardData).flat();
      if (allIssues.length > 0) {
        const exists = allIssues.some(t => t.key === ticketKey || t.issue_key === ticketKey);
        if (exists) {
          setSelectedIssue(ticketKey);
        }
      }
    }
  }, [boardData, location.search]);





  useEffect(() => {
    localStorage.setItem(`${currentDept}_kanbanColumnOrder`, JSON.stringify(columnOrder));
  }, [columnOrder, currentDept]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [createDrawerInitialStatus, setCreateDrawerInitialStatus] = useState(null);
  const [createDrawerInitialSummary, setCreateDrawerInitialSummary] = useState('');

  // Inline creation states
  const [activeCreateColumn, setActiveCreateColumn] = useState(null);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueType, setNewIssueType] = useState('Task');
  const [newIssueAssignee, setNewIssueAssignee] = useState('Unassigned');
  const [newIssueDueDate, setNewIssueDueDate] = useState('');
  const [newIssueProjectId, setNewIssueProjectId] = useState('');
  const [inlineAssigneeSearch, setInlineAssigneeSearch] = useState('');
  const [openInlineDropdown, setOpenInlineDropdown] = useState(null);

  const handleOpenInlineCreate = (col) => {
    setActiveCreateColumn(col);
    setNewIssueTitle('');
    setNewIssueType('Task');
    setNewIssueAssignee('Unassigned');
    setNewIssueDueDate('');
    setInlineAssigneeSearch('');
    setOpenInlineDropdown(null);
    if (selectedProjectId !== 'ALL') {
      setNewIssueProjectId(selectedProjectId);
    } else if (projectsList.length > 0) {
      setNewIssueProjectId(projectsList[0].id);
    } else {
      setNewIssueProjectId('');
    }
  };

  const handleExpandToDrawer = (col) => {
    setCreateDrawerInitialStatus(col);
    setCreateDrawerInitialSummary(newIssueTitle);
    setActiveCreateColumn(null);
    setOpenInlineDropdown(null);
    setIsCreateDrawerOpen(true);
  };

  // Close creation widget on clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeCreateColumn && !e.target.closest('.inline-create-box') && !e.target.closest('.create-trigger-btn')) {
        setActiveCreateColumn(null);
        setOpenInlineDropdown(null);
      }
      if (activeFilterDropdown && !e.target.closest('.relative')) {
        setActiveFilterDropdown(null);
      }
      if (openCardAssigneeDropdown && !e.target.closest('.card-assignee-dropdown')) {
        setOpenCardAssigneeDropdown(null);
      }
      if (openSubtasksPopover && !e.target.closest('.card-subtask-popover')) {
        setOpenSubtasksPopover(null);
      }
      if (showSprintDetails && !e.target.closest('.sprint-details-popover')) {
        setShowSprintDetails(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeCreateColumn, activeFilterDropdown, openCardAssigneeDropdown, openSubtasksPopover, showSprintDetails]);


  const handleCreateInlineIssue = async (col) => {
    if (!newIssueTitle.trim()) return;

    const currentUserName = user ? (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username) : (username || 'Unassigned');
    const reporterVal = currentUserName;

    let assigneeVal = newIssueAssignee;
    if (!assigneeVal || assigneeVal === 'Automatic') {
      assigneeVal = currentUserName;
    }

    const targetProjectId = selectedProjectId !== 'ALL'
      ? Number(selectedProjectId)
      : (newIssueProjectId ? Number(newIssueProjectId) : (projectsList[0]?.id ? Number(projectsList[0].id) : null));

    let cleanDueDate = null;
    if (newIssueDueDate && String(newIssueDueDate).trim()) {
      const s = String(newIssueDueDate).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        cleanDueDate = s.slice(0, 10);
      } else {
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          cleanDueDate = `${year}-${month}-${day}`;
        }
      }
    }

    try {
      const prefix = deptConfig.defaultPrefix;
      const res = await fetch(API_BASE_URL + '/it-kanban/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': currentUserName,
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({
          title: newIssueTitle.trim(),
          type: newIssueType,
          status: col,
          assignee: assigneeVal,
          reporter: reporterVal,
          priority: 'Medium',
          department: currentDept,
          keyPrefix: prefix,
          project_id: targetProjectId,
          due_date: cleanDueDate,
          sprint_id: activeSprints.length > 0 ? Number(activeSprints[0].id) : null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showErrorToast(data.error || 'Failed to create task');
        return;
      }

      showSuccessToast(`Task ${data.issue_key || 'created'} added to ${col}`);

      const rawItem = data.issue || {
        id: data.id,
        issue_key: data.issue_key,
        title: newIssueTitle.trim(),
        type: newIssueType,
        status: col,
        assignee: assigneeVal,
        reporter: reporterVal,
        priority: 'Medium',
        department: currentDept,
        project_id: targetProjectId,
        due_date: cleanDueDate,
        labels: [currentDept],
        sprint: activeSprints.length > 0 ? activeSprints[0].name : null,
        sprint_id: activeSprints.length > 0 ? Number(activeSprints[0].id) : null,
        sprint_status: activeSprints.length > 0 ? 'Active' : null,
        subtasks: [],
        linked_issues: [],
        comments: [],
        created_at: new Date().toISOString()
      };

      const newCard = {
        ...rawItem,
        key: rawItem.issue_key || data.issue_key,
        issue_key: rawItem.issue_key || data.issue_key
      };

      // 1. Add to allRawIssues so that filters, drag-and-drop, and useEffect retain this card
      setAllRawIssues(prev => [newCard, ...prev.filter(i => (i.issue_key !== newCard.issue_key && i.key !== newCard.key))]);

      // 2. Optimistically add to boardData column
      setBoardData(prev => ({
        ...prev,
        [col]: [...(prev[col] || []).filter(c => (c.key !== newCard.key && c.issue_key !== newCard.issue_key)), newCard]
      }));

      // 3. Reset form states
      setNewIssueTitle('');
      setNewIssueType('Task');
      setNewIssueAssignee('Unassigned');
      setNewIssueDueDate('');
      setInlineAssigneeSearch('');
      setActiveCreateColumn(null);
      setOpenInlineDropdown(null);

      // 4. Fresh re-sync from database
      fetchKanbanData();

      window.dispatchEvent(new Event('crm-refresh-notifications'));
    } catch (err) {
      console.error('Failed to save inline task', err);
      showErrorToast('Failed to save inline task');
    }
  };


  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  let selectedIssueData = null;
  if (selectedIssue) {
    const rawMatch = allRawIssues.find(i => i.issue_key === selectedIssue || i.key === selectedIssue);
    let cardMatch = null;
    Object.values(boardData).forEach(col => {
      const found = col.find(c => c.key === selectedIssue || c.issue_key === selectedIssue);
      if (found) cardMatch = found;
    });

    if (rawMatch || cardMatch) {
      selectedIssueData = { ...(rawMatch || {}), ...(cardMatch || {}) };
    }
  }


  const updateIssue = async (key, updates) => {
    // Optimistic update locally
    setBoardData(prev => {
      const next = { ...prev };
      let foundCol = null;
      let foundIdx = -1;

      // Find issue
      for (const col of Object.keys(next)) {
        const idx = next[col].findIndex(c => c.key === key || c.issue_key === key);
        if (idx !== -1) {
          foundCol = col;
          foundIdx = idx;
          break;
        }
      }

      if (foundCol && foundIdx !== -1) {
        const issue = next[foundCol][foundIdx];
        const updatedIssue = { ...issue, ...updates };

        // If status changed, move to new column
        if (updates.status && updates.status !== foundCol) {
          next[foundCol].splice(foundIdx, 1);
          if (!next[updates.status]) next[updates.status] = [];
          next[updates.status].push(updatedIssue);
        } else {
          next[foundCol][foundIdx] = updatedIssue;
        }

        // Update selectedIssueData reference if it's currently open
        if (selectedIssue === key) {
          // React will re-render and selectedIssueData will be computed correctly from boardData
        }
      }
      return next;
    });

    // Also keep allRawIssues synchronized with updates
    setAllRawIssues(prev => prev.map(t => (t.issue_key === key || t.key === key) ? { ...t, ...updates } : t));

    try {
      const res = await fetch(`${API_BASE_URL}/it-kanban/issues/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Lets the server attribute this change to a person in the History tab.
          'x-user-name': user ? (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username) : (username || 'System')
        },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        window.dispatchEvent(new Event('crm-refresh-notifications'));
      } else {
        const data = await res.json().catch(() => ({}));
        // The optimistic move already happened, so refetch to put the card back where the
        // server says it belongs rather than leaving the board showing a change that failed.
        fetchKanbanData();

        if (data.code === 'SUBTASKS_INCOMPLETE') {
          Swal.fire({
            icon: 'warning',
            title: 'Finish the subtasks first',
            html: `<div style="text-align:left;font-size:13px">
                     <p style="margin-bottom:8px">${data.error}</p>
                     <ul style="margin:0;padding-left:18px">
                       ${(data.openSubtasks || []).map(t => `<li>${t}</li>`).join('')}
                     </ul>
                   </div>`
          });
        } else {
          Swal.fire('Could not save the change', data.error || 'Update rejected by the server', 'error');
        }
      }
    } catch (err) {
      console.error('Failed to update issue in DB', err);
      fetchKanbanData();
    }
  };

  // Completing from the board reloads the issues too: the finished sprint's work leaves the
  // board and anything rolled into a still-running sprint stays visible.
  const handleCompleteSprint = async (sprint, moveTo) => {
    const res = await fetch(`${API_BASE_URL}/sprints/${sprint.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moveTo })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to complete sprint');

    setIsCompletingSprint(false);
    fetchKanbanData();
    return data;
  };

  const deleteIssue = async (key) => {
    try {
      await fetch(`${API_BASE_URL}/it-kanban/issues/${key}`, { method: 'DELETE' });

      setAllRawIssues(prev => prev.filter(c => c.key !== key && c.issue_key !== key));
      setBoardData(prev => {
        const next = { ...prev };
        for (const col of Object.keys(next)) {
          next[col] = next[col].filter(c => c.key !== key && c.issue_key !== key);
        }
        return next;
      });
      setSelectedIssue(null);
    } catch (err) {
      console.error('Failed to delete issue', err);
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, type } = result;

    if (type === 'column') {
      const newColumnOrder = Array.from(columnOrder);
      const [removed] = newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, removed);
      setColumnOrder(newColumnOrder);
      return;
    }

    if (source.droppableId !== destination.droppableId) {
      const sourceCol = [...(boardData[source.droppableId] || [])];
      const destCol = [...(boardData[destination.droppableId] || [])];
      const [removed] = sourceCol.splice(source.index, 1);
      if (!removed) return;
      // Update the card's status to match the new column
      removed.status = destination.droppableId;
      destCol.splice(destination.index, 0, removed);
      setBoardData({
        ...boardData,
        [source.droppableId]: sourceCol,
        [destination.droppableId]: destCol
      });
      // Persist through updateIssue rather than a bare fetch: it reports a rejected
      // transition (such as the unfinished-subtasks rule) and snaps the card back, instead
      // of leaving it parked in a column the server never accepted. It also attributes the
      // change to a person in the History tab.
      updateIssue(removed.key || removed.issue_key, { status: destination.droppableId });
    } else {
      const col = [...(boardData[source.droppableId] || [])];
      const [removed] = col.splice(source.index, 1);
      if (!removed) return;
      col.splice(destination.index, 0, removed);
      setBoardData({
        ...boardData,
        [source.droppableId]: col
      });
    }
  };

  return (
    <>
      {currentDept === 'Marketing' ? (
        <MarketingCreateIssueDrawer
          isOpen={isCreateDrawerOpen}
          initialStatus={createDrawerInitialStatus}
          initialSummary={createDrawerInitialSummary}
          onIssueCreated={fetchKanbanData}
          onClose={() => {
            setIsCreateDrawerOpen(false);
            setCreateDrawerInitialStatus(null);
            setCreateDrawerInitialSummary('');
          }}
        />
      ) : (
        <ITCreateIssueDrawer
          department={currentDept}
          isOpen={isCreateDrawerOpen}
          initialStatus={createDrawerInitialStatus}
          initialSummary={createDrawerInitialSummary}
          projectId={selectedProjectId !== 'ALL' ? selectedProjectId : null}
          onIssueCreated={fetchKanbanData}
          onClose={() => {
            setIsCreateDrawerOpen(false);
            setCreateDrawerInitialStatus(null);
            setCreateDrawerInitialSummary('');
          }}
        />
      )}
      <div className="flex w-full h-full max-h-full bg-white overflow-hidden font-sans">
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* HEADER */}
          <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="hover:underline cursor-pointer">Projects</span>
              <ChevronRight size={14} />
              <span className="hover:underline cursor-pointer font-medium text-gray-700">
                {selectedProjectId !== 'ALL'
                  ? (projectsList.find(p => Number(p.id) === Number(selectedProjectId))?.name || 'Selected Project')
                  : 'All Projects'}
              </span>
              <ChevronRight size={14} />
              <span className="text-gray-900 font-medium">Kanban Board</span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsCreateDrawerOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <Plus size={14} /> Create
              </button>
            </div>
          </div>

          <BoardTabs department={currentDept} />

          <div className="flex-1 overflow-hidden flex relative">
            <div className="flex-1 flex flex-col p-4 pb-0 min-w-0 bg-white">

              <div className="flex items-end justify-between mb-6">
                <div>
                  {/* No sprint name or status here: Jira's board header carries only the
                      toolbar and the Complete sprint button. Which sprints are running is
                      the Backlog's job to show. */}
                  <div className="flex items-center gap-2 flex-wrap relative">

                    {/* JIRA USER AVATAR BUBBLES */}
                    <div className="flex items-center -space-x-1.5 mx-1">
                      {itUsersList.slice(0, 5).map((u) => {
                        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || 'User';
                        const initials = (u.first_name ? u.first_name[0] : (u.username ? u.username[0] : 'U')) +
                          (u.last_name ? u.last_name[0] : '');
                        const uppercaseInitials = initials.toUpperCase();

                        const isSelected = selectedAssignees.some(a =>
                          a.toLowerCase() === fullName.toLowerCase() ||
                          a.toLowerCase() === (u.username || '').toLowerCase() ||
                          (u.first_name && a.toLowerCase().includes(u.first_name.toLowerCase()))
                        );

                        const colors = [
                          'bg-emerald-600 text-white',
                          'bg-blue-600 text-white',
                          'bg-purple-600 text-white',
                          'bg-amber-600 text-white',
                          'bg-pink-600 text-white',
                          'bg-indigo-600 text-white',
                          'bg-teal-600 text-white'
                        ];
                        const colorClass = colors[Number(u.id || 0) % colors.length];

                        return (
                          <button
                            key={u.id || u.username}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedAssignees(prev => prev.filter(a =>
                                  a.toLowerCase() !== fullName.toLowerCase() &&
                                  a.toLowerCase() !== (u.username || '').toLowerCase() &&
                                  !(u.first_name && a.toLowerCase().includes(u.first_name.toLowerCase()))
                                ));
                              } else {
                                setSelectedAssignees(prev => [...prev, fullName]);
                              }
                            }}
                            title={`Filter issues by ${fullName}`}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px]  transition-all relative border-2 border-white cursor-pointer ${isSelected
                              ? 'ring-2 ring-blue-600 ring-offset-1 z-20 scale-110 shadow-md'
                              : 'hover:z-10 hover:scale-105 opacity-90 hover:opacity-100'
                              } ${colorClass}`}
                          >
                            {uppercaseInitials}
                          </button>
                        );
                      })}
                      {itUsersList.length > 5 && (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px]  bg-gray-100 text-gray-600 border-2 border-white z-0 ml-[-8px]" title={`${itUsersList.length - 5} more members`}>
                          +{itUsersList.length - 5}
                        </div>
                      )}
                    </div>

                    {/* Project Filter (Searchable Select) */}
                    <div className="w-52">
                      <SearchableSelect
                        prefix="Project:"
                        buttonClassName={`p-2 rounded text-xs font-medium border transition-colors ${selectedProjectId !== 'ALL' ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        dropdownClassName="w-64"
                        options={[
                          { value: 'ALL', label: 'All Projects' },
                          ...projectsList.map(p => ({ value: String(p.id), label: p.name }))
                        ]}
                        value={String(selectedProjectId)}
                        onChange={(val) => setSelectedProjectId(val || 'ALL')}
                        placeholder="All Projects"
                      />
                    </div>

                    {/* Status Filter Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'status' ? null : 'status')}
                        className={`flex items-center gap-1.5 p-2 rounded text-xs font-medium border hover:bg-gray-50 transition-colors ${selectedStatus !== 'ALL' ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold' : 'bg-white border-gray-300 text-gray-700'}`}
                      >
                        Status: {selectedStatus !== 'ALL' ? selectedStatus : 'All'} <ChevronDown size={14} />
                      </button>
                      {activeFilterDropdown === 'status' && (
                        <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-xl py-1 z-50 text-xs text-gray-700">
                          {['ALL', ...columnOrder].map(s => (
                            <div
                              key={s}
                              onClick={() => { setSelectedStatus(s); setActiveFilterDropdown(null); }}
                              className={`px-3 py-1.5 hover:bg-gray-100 cursor-pointer ${selectedStatus === s ? 'text-blue-600  bg-blue-50' : ''}`}
                            >
                              {s === 'ALL' ? 'All Statuses' : s}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Priority Filter Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'priority' ? null : 'priority')}
                        className={`flex items-center gap-1.5 p-2 rounded text-xs font-medium border hover:bg-gray-50 transition-colors ${selectedPriority !== 'ALL' ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold' : 'bg-white border-gray-300 text-gray-700'}`}
                      >
                        Priority: {selectedPriority !== 'ALL' ? selectedPriority : 'All'} <ChevronDown size={14} />
                      </button>
                      {activeFilterDropdown === 'priority' && (
                        <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-xl py-1 z-50 text-xs text-gray-700">
                          {['ALL', 'High', 'Medium', 'Low'].map(p => (
                            <div
                              key={p}
                              onClick={() => { setSelectedPriority(p); setActiveFilterDropdown(null); }}
                              className={`px-3 py-1.5 hover:bg-gray-100 cursor-pointer ${selectedPriority === p ? 'text-blue-600  bg-blue-50' : ''}`}
                            >
                              {p === 'ALL' ? 'All Priorities' : p}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Date Filter Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'date' ? null : 'date')}
                        className={`flex items-center gap-1.5 p-2 rounded text-xs font-medium border hover:bg-gray-50 transition-colors ${dateFilter !== 'ALL' ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold' : 'bg-white border-gray-300 text-gray-700'}`}
                        title="Filter issues date wise"
                      >
                        <Calendar size={13} className={dateFilter !== 'ALL' ? 'text-blue-600' : 'text-gray-500'} />
                        <span>{getDateFilterLabel()}</span>
                        <ChevronDown size={14} />
                      </button>
                      {activeFilterDropdown === 'date' && (
                        <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded shadow-xl p-3 z-50 text-xs text-gray-700 font-sans">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                            <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                              <Calendar size={13} className="text-blue-600" /> Filter by Date
                            </span>
                            {dateFilter !== 'ALL' && (
                              <button
                                onClick={() => {
                                  setDateFilter('ALL');
                                  setExactDate('');
                                  setRangeStart('');
                                  setRangeEnd('');
                                }}
                                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Clear
                              </button>
                            )}
                          </div>

                          {/* Quick presets grid */}
                          <div className="grid grid-cols-2 gap-1 mb-2.5">
                            {[
                              { key: 'ALL', label: 'All Dates' },
                              { key: 'TODAY', label: 'Today' },
                              { key: 'TOMORROW', label: 'Tomorrow' },
                              { key: 'THIS_WEEK', label: 'This Week' },
                              { key: 'THIS_MONTH', label: 'This Month' },
                              { key: 'OVERDUE', label: 'Overdue' },
                              { key: 'NO_DATE', label: 'No Date' }
                            ].map(item => (
                              <button
                                key={item.key}
                                onClick={() => {
                                  setDateFilter(item.key);
                                  if (item.key !== 'EXACT' && item.key !== 'RANGE') {
                                    setActiveFilterDropdown(null);
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded text-left transition-colors flex items-center justify-between ${dateFilter === item.key
                                  ? 'bg-blue-50 text-blue-700  border border-blue-200'
                                  : 'hover:bg-gray-100 text-gray-700 border border-transparent'
                                  }`}
                              >
                                <span>{item.label}</span>
                                {dateFilter === item.key && <Check size={12} className="text-blue-600" />}
                              </button>
                            ))}
                          </div>

                          {/* Custom Specific Date Picker */}
                          <div className="border-t border-gray-100 pt-2 space-y-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                Specific Date:
                              </label>
                              <input
                                type="date"
                                value={dateFilter === 'EXACT' ? exactDate : ''}
                                onChange={(e) => {
                                  setExactDate(e.target.value);
                                  setDateFilter('EXACT');
                                }}
                                className={`w-full px-2 py-1 text-xs border rounded focus:outline-none transition-all ${dateFilter === 'EXACT'
                                  ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/40 text-blue-900 font-medium'
                                  : 'border-gray-300 hover:border-gray-400'
                                  }`}
                              />
                            </div>

                            {/* Custom Date Range Picker */}
                            <div>
                              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                Date Range:
                              </label>
                              <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                  <span className="text-[10px] text-gray-400 block mb-0.5">From</span>
                                  <input
                                    type="date"
                                    value={dateFilter === 'RANGE' ? rangeStart : ''}
                                    onChange={(e) => {
                                      setRangeStart(e.target.value);
                                      setDateFilter('RANGE');
                                    }}
                                    className={`w-full px-1.5 py-1 text-[11px] border rounded focus:outline-none ${dateFilter === 'RANGE'
                                      ? 'border-blue-500 bg-blue-50/40'
                                      : 'border-gray-300'
                                      }`}
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] text-gray-400 block mb-0.5">To</span>
                                  <input
                                    type="date"
                                    value={dateFilter === 'RANGE' ? rangeEnd : ''}
                                    onChange={(e) => {
                                      setRangeEnd(e.target.value);
                                      setDateFilter('RANGE');
                                    }}
                                    className={`w-full px-1.5 py-1 text-[11px] border rounded focus:outline-none ${dateFilter === 'RANGE'
                                      ? 'border-blue-500 bg-blue-50/40'
                                      : 'border-gray-300'
                                      }`}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Done / Close button */}
                            <div className="pt-1.5 flex justify-end">
                              <button
                                onClick={() => setActiveFilterDropdown(null)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Assignee Filter (Searchable Select) */}
                    <div className="w-52">
                      <SearchableSelect
                        prefix="Assignee:"
                        multiple={true}
                        buttonClassName={`p-2 rounded text-xs font-medium border transition-colors ${selectedAssignees.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        dropdownClassName="w-64"
                        options={[
                          { value: 'ALL', label: 'All Assignees' },
                          ...(isManager ? [{ value: 'UNASSIGNED', label: 'Unassigned' }] : []),
                          ...usersList.map(u => {
                            const uName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
                            if (!uName) return null;
                            return {
                              value: uName,
                              label: uName,
                              avatar: getInitials(uName)
                            };
                          }).filter(Boolean)
                        ]}
                        value={selectedAssignees}
                        onChange={(val) => setSelectedAssignees(Array.isArray(val) ? val : (val && val !== 'ALL' ? [val] : []))}
                        placeholder="All"
                      />
                    </div>

                    {/* Only My Tasks Quick Filter Pill — Visible to All */}
                    <button
                      onClick={() => setOnlyMyIssues(!onlyMyIssues)}
                      className={`flex items-center gap-1.5 p-2 rounded text-xs font-semibold border transition-all cursor-pointer ${onlyMyIssues
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                        }`}
                      title="Show only tasks assigned to me"
                    >
                      <User size={13} />
                      Only My Tasks
                    </button>

                    {/* Clear Filters reset button */}
                    {(selectedProjectId !== 'ALL' || selectedType !== 'ALL' || selectedStatus !== 'ALL' || selectedPriority !== 'ALL' || selectedAssignees.length > 0 || onlyMyIssues || searchQuery || dateFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSelectedProjectId('ALL');
                          setSelectedType('ALL');
                          setSelectedStatus('ALL');
                          setSelectedPriority('ALL');
                          setSelectedAssignees([]);
                          setOnlyMyIssues(false);
                          setSearchQuery('');
                          setDateFilter('ALL');
                          setExactDate('');
                          setRangeStart('');
                          setRangeEnd('');
                        }}
                        className="text-xs text-red-600 font-medium hover:underline ml-2"
                      >
                        Reset filters
                      </button>
                    )}
                    {/* <button className="flex items-center gap-1 p-2 text-xs text-gray-600 hover:bg-gray-50 rounded">
                      More filters <ChevronDown size={14} />
                    </button> */}
                    {/* <button className="text-xs text-blue-600 font-medium hover:underline ml-2">Save filter</button> */}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Sprint controls are manager-only; employees just work the board. */}
                  {isManager && activeSprints.length > 0 && (
                    <>
                      <button
                        onClick={() => setIsCompletingSprint(true)}
                        className="px-4 py-1.5 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        Complete sprint
                      </button>

                      {/* Jira's sprint details popover: what is running, and how long is left. */}
                      <div className="relative sprint-details-popover">
                        <button
                          onClick={() => setShowSprintDetails(!showSprintDetails)}
                          title="Sprint details"
                          className={`p-1.5 rounded border transition-colors ${showSprintDetails
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                          <IterationCw size={16} />
                        </button>

                        {showSprintDetails && (
                          <div className="absolute right-0 top-full mt-2 w-[350px] bg-white border border-gray-200 rounded shadow-xl z-50 p-5 max-h-[70vh] overflow-y-auto">
                            {activeSprints.map((s, i) => (
                              <div key={s.id} className={i > 0 ? 'mt-5 pt-5 border-t border-gray-200' : ''}>
                                <h4 className="text-[15px] font-semibold text-gray-900">{s.name}</h4>
                                <p className="text-[14px] text-gray-700 mt-1.5">{sprintTimeLeft(s.end_date)}</p>
                                {s.goal && <p className="text-[12px] text-gray-500 mt-1.5 italic">{s.goal}</p>}
                                <div className="grid grid-cols-2 gap-3 mt-3">
                                  <div>
                                    <div className="text-[12px] text-gray-500">Start date</div>
                                    <div className="text-[13px] text-gray-900">{formatSprintDate(s.start_date)}</div>
                                  </div>
                                  <div>
                                    <div className="text-[12px] text-gray-500">End date</div>
                                    <div className="text-[13px] text-gray-900">{formatSprintDate(s.end_date)}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium"><Download size={14} /> Export</button>
                  {/* <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal size={16} /></button> */}
                </div>
              </div>

              {/* METRICS ROW */}

              {/* KANBAN BOARD.
                  With no sprint running the board is intentionally empty — work waits in the
                  Backlog until a sprint is started, which is how a Scrum board behaves. */}
              {activeSprints.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <LayoutList size={24} className="text-gray-400" />
                  </div>
                  {isManager ? (
                    <>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Get started in the backlog</h3>
                      <p className="text-sm text-gray-500 mb-4">Plan and start a sprint to see work items here.</p>
                      <button
                        onClick={() => navigate(`${workspaceBase}/backlog`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Go to Backlog
                      </button>
                    </>
                  ) : (
                    // Employees cannot open the Backlog, so pointing them there would dead-end.
                    <>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">No work items yet</h3>
                      <p className="text-sm text-gray-500">
                        Your manager hasn't started a sprint. Work will appear here once it does.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className=" flex-1 flex flex-col min-h-0">
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="all-columns" direction="horizontal" type="column">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="flex gap-4 overflow-x-auto overflow-y-hidden h-full items-stretch"
                        >
                          {columnOrder.map((col, index) => (
                            <Draggable key={col} draggableId={col} index={index}>
                              {(provided) => {
                                const colBg = COLUMN_COLORS[col] || 'bg-gray-50';
                                return (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`flex-1 min-w-[260px] ${colBg} rounded p-2 flex flex-col`}
                                  >
                                    <div
                                      {...provided.dragHandleProps}
                                      className="flex items-center gap-2 pb-3 pt-1 px-1 shrink-0 cursor-grab active:cursor-grabbing sticky top-0 bg-inherit z-10"
                                    >
                                      <span className="text-xs  text-gray-500 ">{col}</span>
                                      <span className="text-xs text-gray-400 font-medium">{boardData[col] ? boardData[col].length : 0}</span>
                                    </div>

                                    <Droppable droppableId={col} type="task">
                                      {(provided, snapshot) => (
                                        <div
                                          {...provided.droppableProps}
                                          ref={provided.innerRef}
                                          className={`flex-1 overflow-y-auto min-h-0 flex flex-col gap-2 pb-2 transition-colors rounded custom-scrollbar ${snapshot.isDraggingOver ? 'bg-blue-50/50' : ''}`}
                                        >
                                          {(boardData[col] || []).map((card, idx) => (
                                            <Draggable key={card.key} draggableId={card.key} index={idx}>
                                              {(provided, snapshot) => (
                                                <div
                                                  ref={provided.innerRef}
                                                  {...provided.draggableProps}
                                                  {...provided.dragHandleProps}
                                                  onClick={() => setSelectedIssue(card.key)}
                                                  style={{
                                                    ...provided.draggableProps.style,
                                                  }}
                                                  className={`relative group bg-white border rounded p-3  hover:shadow-md transition-all duration-200 ${selectedIssue === card.key ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-200'} ${snapshot.isDragging ? 'shadow-lg rotate-2' : ''}`}
                                                >
                                                  {/* Delete Trash Button */}
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (window.confirm(`Are you sure you want to delete ticket ${card.key}?`)) {
                                                        deleteIssue(card.key);
                                                      }
                                                    }}
                                                    className="absolute top-2.5 right-2.5 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 cursor-pointer"
                                                    title="Delete Ticket"
                                                  >
                                                    <Trash2 size={13} />
                                                  </button>
                                                  {/* Jira strikes through the key of a finished work item. */}
                                                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                                    <span className={`text-blue-600 text-xs hover:underline font-medium cursor-pointer ${isDoneStatus(card.status) ? 'line-through' : ''}`} onClick={(e) => { e.stopPropagation(); setSelectedIssue(card.key); }}>{card.key}</span>
                                                  </div>
                                                  <div className="text-xs text-gray-900 font-medium mb-3 leading-snug cursor-grab active:cursor-grabbing">{card.title}</div>

                                                  {/* JIRA INLINE EXPANDABLE SUBTASKS LIST */}
                                                  {(() => {
                                                    let rawSt = card.subtasks;
                                                    if (typeof rawSt === 'string') {
                                                      try { rawSt = JSON.parse(rawSt); } catch (e) { rawSt = []; }
                                                    }
                                                    if (!Array.isArray(rawSt)) rawSt = [];
                                                    const totalSt = rawSt.length;

                                                    // JIRA RULE: Only visible when that particular ticket actually HAS subtasks (> 0)
                                                    if (totalSt === 0) return null;

                                                    const completedSt = rawSt.filter(s => s.completed || s.status === 'DONE').length;
                                                    const isExpanded = expandedSubtaskCardKeys.includes(card.key);

                                                    return (
                                                      <div className="mb-3">
                                                        {/* Subtasks Accordion Pill Header (Jira Style) */}
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedSubtaskCardKeys(prev =>
                                                              prev.includes(card.key) ? prev.filter(k => k !== card.key) : [...prev, card.key]
                                                            );
                                                          }}
                                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-700 cursor-pointer transition-all hover:border-gray-300 w-full justify-between select-none"
                                                          title="Click to toggle subtasks list"
                                                        >
                                                          <div className="flex items-center gap-1.5 min-w-0">
                                                            {/* Branch / Subtask Icon */}
                                                            <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                              <line x1="6" y1="3" x2="6" y2="15"></line>
                                                              <circle cx="18" cy="6" r="3"></circle>
                                                              <circle cx="6" cy="18" r="3"></circle>
                                                              <path d="M18 9a9 9 0 0 1-9 9"></path>
                                                            </svg>
                                                            <span className="font-semibold text-gray-800">Subtasks {completedSt}/{totalSt}</span>
                                                          </div>
                                                          <ChevronDown size={13} className={`text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                        </button>

                                                        {/* Expanded Subtasks List under Card (Jira Card View) */}
                                                        {isExpanded && (
                                                          <div className="mt-1.5 space-y-1.5 pl-1 pr-1 py-1 bg-gray-50/80 rounded border border-gray-200/80 animate-in fade-in duration-150">
                                                            {rawSt.map((st, idx) => {
                                                              const subtaskKey = `${card.key}-${st.id || idx + 1}`;
                                                              const isDone = st.completed || st.status === 'DONE';
                                                              const statusLabel = isDone ? 'Done' : (st.status || 'To Do');

                                                              return (
                                                                <div
                                                                  key={st.id || idx}
                                                                  onClick={(e) => e.stopPropagation()}
                                                                  className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 hover:border-blue-300 shadow-2xs text-xs font-sans group transition-all"
                                                                >
                                                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                    <input
                                                                      type="checkbox"
                                                                      checked={isDone}
                                                                      onChange={() => handleToggleCardSubtask(card.key, st.id)}
                                                                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                                                                    />
                                                                    <div className="min-w-0 flex-1">
                                                                      <div className="flex items-center gap-1.5">
                                                                        <span className="text-[10px] text-blue-600 font-semibold">{subtaskKey}</span>
                                                                        <span className={`text-xs font-medium truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                                                          {st.title}
                                                                        </span>
                                                                      </div>
                                                                    </div>
                                                                  </div>

                                                                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold tracking-tight ${isDone
                                                                      ? 'bg-emerald-100 text-emerald-700'
                                                                      : 'bg-gray-100 text-gray-600'
                                                                      }`}>
                                                                      {statusLabel}
                                                                    </span>
                                                                  </div>
                                                                </div>
                                                              );
                                                            })}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })()}

                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                      {TYPE_ICONS[card.type] || TYPE_ICONS.Task}
                                                      {PRIORITY_ICONS[card.priority]}
                                                      <span className="text-xs text-gray-600">{card.priority}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                      {/* Due / Start Date Badge */}
                                                      {(() => {
                                                        const value = card.due_date || card.start_date;
                                                        const text = formatDate(value);
                                                        if (!text) return null;
                                                        const isDue = !!card.due_date;
                                                        const overdue = isDue && !isDoneStatus(card.status) && isPastDate(value);
                                                        return (
                                                          <span
                                                            title={`${isDue ? 'Due' : 'Starts'} ${text}${overdue ? ' — overdue' : ''}`}
                                                            className={`shrink-0 inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border ${overdue
                                                              ? 'bg-red-50 text-red-700 border-red-200 font-medium'
                                                              : 'bg-gray-50 text-gray-600 border-gray-200'
                                                              }`}
                                                          >
                                                            <Calendar size={11} className={overdue ? 'text-red-500' : 'text-gray-500'} />
                                                            {text}
                                                          </span>
                                                        );
                                                      })()}

                                                      {col === 'DONE' ? (
                                                        <CheckCircleIcon className="text-green-500" size={16} />
                                                      ) : (
                                                        <div className="relative card-assignee-dropdown">
                                                          <button
                                                            onClick={(e) => handleOpenCardAssignee(e, card.key)}
                                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px]  border border-white shrink-0 cursor-pointer transition-transform hover:scale-110 ${card.assignee === 'Unassigned' || !card.assignee
                                                              ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                              : 'bg-blue-600 text-white shadow-sm'
                                                              }`}
                                                            title={`Assignee: ${card.assignee || 'Unassigned'} (Click to change)`}
                                                          >
                                                            {card.assignee === 'Unassigned' || !card.assignee ? (
                                                              <User size={12} className="text-gray-500" />
                                                            ) : (
                                                              getInitials(card.assignee)
                                                            )}
                                                          </button>

                                                          {/* JIRA CARD ASSIGNEE POPUP MENU (Right Side Floating) */}
                                                          {openCardAssigneeDropdown === card.key && (
                                                            <div
                                                              onClick={(e) => e.stopPropagation()}
                                                              style={{
                                                                position: 'fixed',
                                                                top: `${cardAssigneePos.top}px`,
                                                                left: `${cardAssigneePos.left}px`,
                                                                width: '260px',
                                                                zIndex: 99999
                                                              }}
                                                              className="bg-white border border-gray-200 rounded shadow-2xl py-1.5 text-xs text-gray-700 font-sans border-t-2 border-t-blue-500"
                                                            >
                                                              {/* Jira Top Active / Search Input Box */}
                                                              <div className="p-2 border-b border-gray-100 bg-white">
                                                                <div className="relative">
                                                                  <input
                                                                    type="text"
                                                                    autoFocus
                                                                    value={assigneeSearchQuery}
                                                                    onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                                                                    placeholder="Search users..."
                                                                    className="w-full px-3 py-1.5 text-xs border-2 border-blue-500 rounded-md focus:outline-none bg-white text-gray-900 font-medium placeholder:text-gray-400"
                                                                  />
                                                                </div>
                                                                {card.assignee && card.assignee !== 'Unassigned' && (
                                                                  <div className="mt-1.5 px-0.5 flex items-center justify-between text-[11px] text-gray-500">
                                                                    <span className="truncate">Current: <strong className="text-gray-800 font-semibold">{card.assignee}</strong></span>
                                                                    <button
                                                                      type="button"
                                                                      onClick={() => handleUpdateCardAssignee(card.key, 'Unassigned')}
                                                                      className="text-red-600 hover:text-red-700 hover:underline font-semibold ml-2 shrink-0 cursor-pointer"
                                                                    >
                                                                      Clear / Unassign
                                                                    </button>
                                                                  </div>
                                                                )}
                                                              </div>

                                                              <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                                                                {/* Unassigned Option */}
                                                                {(!assigneeSearchQuery.trim() || 'unassigned'.includes(assigneeSearchQuery.toLowerCase().trim())) && (
                                                                  <div
                                                                    onClick={() => handleUpdateCardAssignee(card.key, 'Unassigned')}
                                                                    className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition-colors ${card.assignee === 'Unassigned' || !card.assignee ? 'bg-[#deebff] font-semibold text-blue-900' : 'text-gray-700'
                                                                      }`}
                                                                  >
                                                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                                                                      <User size={13} className="text-gray-600" />
                                                                    </div>
                                                                    <span className="text-xs font-medium">Unassigned</span>
                                                                    {(card.assignee === 'Unassigned' || !card.assignee) && <Check size={14} className="text-blue-600 ml-auto shrink-0" />}
                                                                  </div>
                                                                )}

                                                                {/* Automatic Option */}
                                                                <div
                                                                  onClick={() => {
                                                                    const myName = user ? (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username) : 'Unassigned';
                                                                    handleUpdateCardAssignee(card.key, myName);
                                                                  }}
                                                                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 text-gray-700 font-medium border-b border-gray-100 transition-colors"
                                                                >
                                                                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                                                                    <User size={13} className="text-gray-600" />
                                                                  </div>
                                                                  <span className="text-xs font-medium">Automatic</span>
                                                                </div>

                                                                {/* Logged in User (Assign to me) Option */}
                                                                {user && (
                                                                  <div
                                                                    onClick={() => {
                                                                      const myName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
                                                                      handleUpdateCardAssignee(card.key, myName);
                                                                    }}
                                                                    className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition-colors ${card.assignee && (card.assignee.toLowerCase().includes((user.first_name || '').toLowerCase()) || card.assignee.toLowerCase() === user.username.toLowerCase())
                                                                      ? 'bg-[#deebff] font-semibold text-blue-900'
                                                                      : 'text-gray-700'
                                                                      }`}
                                                                  >
                                                                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]  shrink-0">
                                                                      {getInitials(user.first_name || user.username)}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                      <div className="truncate text-xs font-medium text-gray-900">
                                                                        {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username} <span className="text-[10px] text-gray-500 font-normal">(assign to me)</span>
                                                                      </div>
                                                                      {user.email && <div className="text-[10px] text-gray-500 truncate leading-none mt-0.5">{user.email}</div>}
                                                                    </div>
                                                                  </div>
                                                                )}

                                                                {/* Team Users List */}
                                                                {itUsersList
                                                                  .filter(u => {
                                                                    if (user && (u.id === user.id || u.username === user.username)) return false;
                                                                    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '';
                                                                    return name.toLowerCase().includes(assigneeSearchQuery.toLowerCase()) || (u.email && u.email.toLowerCase().includes(assigneeSearchQuery.toLowerCase()));
                                                                  })
                                                                  .map((u) => {
                                                                    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || 'User';
                                                                    const initials = getInitials(fullName);
                                                                    const isCurrentAssignee = card.assignee && card.assignee.toLowerCase() === fullName.toLowerCase();

                                                                    const colors = [
                                                                      'bg-blue-600 text-white',
                                                                      'bg-purple-600 text-white',
                                                                      'bg-amber-600 text-white',
                                                                      'bg-pink-600 text-white',
                                                                      'bg-indigo-600 text-white',
                                                                      'bg-teal-600 text-white'
                                                                    ];
                                                                    const colorClass = colors[Number(u.id || 0) % colors.length];

                                                                    return (
                                                                      <div
                                                                        key={u.id || u.username}
                                                                        onClick={() => handleUpdateCardAssignee(card.key, fullName)}
                                                                        className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition-colors ${isCurrentAssignee ? 'bg-[#deebff] text-blue-900 font-semibold' : 'text-gray-700'
                                                                          }`}
                                                                      >
                                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px]  shrink-0 ${colorClass}`}>
                                                                          {initials}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                          <div className="truncate text-xs font-medium text-gray-900">{fullName}</div>
                                                                          {u.email && <div className="text-[10px] text-gray-500 truncate leading-none mt-0.5">{u.email}</div>}
                                                                        </div>
                                                                        {isCurrentAssignee && <Check size={14} className="text-blue-600 shrink-0" />}
                                                                      </div>
                                                                    );
                                                                  })}
                                                              </div>
                                                            </div>
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </Draggable>
                                          ))}
                                          {provided.placeholder}
                                        </div>
                                      )}
                                    </Droppable>

                                    {activeCreateColumn === col ? (
                                       <div className="mt-2 p-3 bg-white border border-blue-500 rounded shadow-md flex flex-col gap-2.5 font-sans text-xs inline-create-box">
                                         {/* Text Area */}
                                         <textarea
                                           autoFocus
                                           placeholder="What needs to be done?"
                                           value={newIssueTitle}
                                           onChange={(e) => setNewIssueTitle(e.target.value)}
                                           className="w-full text-xs text-gray-800 placeholder-gray-400 focus:outline-none resize-none h-14"
                                           onKeyDown={(e) => {
                                             if (e.key === 'Enter' && !e.shiftKey) {
                                               e.preventDefault();
                                               handleCreateInlineIssue(col);
                                             } else if (e.key === 'Escape') {
                                               setActiveCreateColumn(null);
                                               setOpenInlineDropdown(null);
                                             }
                                           }}
                                         />

                                         {/* Bottom Row Controls */}
                                         <div className="flex items-center justify-between mt-1 relative">
                                           <div className="flex items-center gap-1.5 flex-wrap">
                                             {/* Work Type selector dropdown */}
                                             <div className="relative inline-dropdown">
                                               <button
                                                 type="button"
                                                 onClick={() => setOpenInlineDropdown(openInlineDropdown === 'type' ? null : 'type')}
                                                 className="flex items-center gap-1 px-1.5 py-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition"
                                                 title={`Type: ${newIssueType}`}
                                               >
                                                 {TYPE_ICONS[newIssueType] || <CheckSquare size={14} className="text-blue-500 fill-blue-100" />}
                                                 <ChevronDown size={10} />
                                               </button>
                                               {openInlineDropdown === 'type' && (
                                                 <div className="absolute left-0 bottom-full mb-1.5 w-40 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 text-xs text-gray-800 animate-in fade-in zoom-in-95 duration-100">
                                                   <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                     Work Type
                                                   </div>
                                                   {deptIssueTypes.map(type => (
                                                     <div
                                                       key={type}
                                                       onClick={() => {
                                                         setNewIssueType(type);
                                                         setOpenInlineDropdown(null);
                                                       }}
                                                       className={`px-2.5 py-1.5 hover:bg-blue-50 flex items-center gap-2 cursor-pointer font-medium ${
                                                         newIssueType === type ? 'bg-[#deebff] text-blue-900 font-semibold' : 'text-gray-700'
                                                       }`}
                                                     >
                                                       {TYPE_ICONS_SM[type] || <CheckSquare size={12} className="text-blue-500 fill-blue-100" />}
                                                       <span>{type}</span>
                                                       {newIssueType === type && <Check size={12} className="text-blue-600 ml-auto" />}
                                                     </div>
                                                   ))}
                                                 </div>
                                               )}
                                             </div>

                                             {/* Due date picker popover */}
                                             <div className="relative inline-dropdown">
                                               <button
                                                 type="button"
                                                 onClick={() => setOpenInlineDropdown(openInlineDropdown === 'date' ? null : 'date')}
                                                 className={`px-1.5 py-1 rounded flex items-center gap-1 transition ${
                                                   newIssueDueDate
                                                     ? 'bg-blue-50 text-blue-600 font-medium'
                                                     : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                                 }`}
                                                 title={newIssueDueDate ? `Due: ${newIssueDueDate}` : "Set due date"}
                                               >
                                                 <Calendar size={13} />
                                                 {newIssueDueDate ? (
                                                   <span className="text-[11px] font-semibold">
                                                     {(() => {
                                                       const parts = newIssueDueDate.split('-');
                                                       if (parts.length === 3) {
                                                         const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                                         return `${parts[2]} ${months[parseInt(parts[1], 10) - 1] || parts[1]}`;
                                                       }
                                                       return newIssueDueDate;
                                                     })()}
                                                   </span>
                                                 ) : null}
                                               </button>
                                               {openInlineDropdown === 'date' && (
                                                 <div className="absolute left-0 bottom-full mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-2xl p-3 z-50 text-gray-800 animate-in fade-in zoom-in-95 duration-100">
                                                   <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2.5">
                                                     <span className="font-semibold text-xs text-gray-700 flex items-center gap-1.5">
                                                       <Calendar size={13} className="text-blue-600" /> Due Date
                                                     </span>
                                                     {newIssueDueDate && (
                                                       <button
                                                         type="button"
                                                         onClick={() => {
                                                           setNewIssueDueDate('');
                                                           setOpenInlineDropdown(null);
                                                         }}
                                                         className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                                                       >
                                                         Clear
                                                       </button>
                                                     )}
                                                   </div>

                                                   <input
                                                     type="date"
                                                     value={newIssueDueDate}
                                                     onChange={(e) => {
                                                       setNewIssueDueDate(e.target.value);
                                                       setOpenInlineDropdown(null);
                                                     }}
                                                     className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500 text-gray-800"
                                                   />

                                                   {/* Quick selection chips */}
                                                   <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
                                                     <button
                                                       type="button"
                                                       onClick={() => {
                                                         const today = new Date();
                                                         const y = today.getFullYear();
                                                         const m = String(today.getMonth() + 1).padStart(2, '0');
                                                         const d = String(today.getDate()).padStart(2, '0');
                                                         setNewIssueDueDate(`${y}-${m}-${d}`);
                                                         setOpenInlineDropdown(null);
                                                       }}
                                                       className="px-2 py-0.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-[11px] font-medium rounded transition"
                                                     >
                                                       Today
                                                     </button>
                                                     <button
                                                       type="button"
                                                       onClick={() => {
                                                         const tom = new Date();
                                                         tom.setDate(tom.getDate() + 1);
                                                         const y = tom.getFullYear();
                                                         const m = String(tom.getMonth() + 1).padStart(2, '0');
                                                         const d = String(tom.getDate()).padStart(2, '0');
                                                         setNewIssueDueDate(`${y}-${m}-${d}`);
                                                         setOpenInlineDropdown(null);
                                                       }}
                                                       className="px-2 py-0.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-[11px] font-medium rounded transition"
                                                     >
                                                       Tomorrow
                                                     </button>
                                                     <button
                                                       type="button"
                                                       onClick={() => {
                                                         const nextWeek = new Date();
                                                         nextWeek.setDate(nextWeek.getDate() + 7);
                                                         const y = nextWeek.getFullYear();
                                                         const m = String(nextWeek.getMonth() + 1).padStart(2, '0');
                                                         const d = String(nextWeek.getDate()).padStart(2, '0');
                                                         setNewIssueDueDate(`${y}-${m}-${d}`);
                                                         setOpenInlineDropdown(null);
                                                       }}
                                                       className="px-2 py-0.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-[11px] font-medium rounded transition"
                                                     >
                                                       Next week
                                                     </button>
                                                   </div>
                                                 </div>
                                               )}
                                             </div>

                                             {/* Assignee selector dropdown */}
                                             <div className="relative inline-dropdown">
                                               <button
                                                 type="button"
                                                 onClick={() => {
                                                   setOpenInlineDropdown(openInlineDropdown === 'assignee' ? null : 'assignee');
                                                   setInlineAssigneeSearch('');
                                                 }}
                                                 className={`px-1 py-1 rounded flex items-center gap-1 transition ${
                                                   newIssueAssignee && newIssueAssignee !== 'Unassigned'
                                                     ? 'bg-blue-50 text-blue-700'
                                                     : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                                                 }`}
                                                 title={`Assignee: ${newIssueAssignee || 'Unassigned'}`}
                                               >
                                                 {newIssueAssignee && newIssueAssignee !== 'Unassigned' && newIssueAssignee !== 'Automatic' ? (
                                                   <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
                                                     {getInitials(newIssueAssignee)}
                                                   </div>
                                                 ) : (
                                                   <User size={14} />
                                                 )}
                                                 {newIssueAssignee && newIssueAssignee !== 'Unassigned' && (
                                                   <span className="text-[11px] font-medium max-w-[80px] truncate">
                                                     {newIssueAssignee}
                                                   </span>
                                                 )}
                                               </button>
                                               {openInlineDropdown === 'assignee' && (
                                                 <div className="absolute left-0 bottom-full mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-2xl py-1.5 z-50 text-xs text-gray-700 border-t-2 border-t-blue-500 animate-in fade-in zoom-in-95 duration-100">
                                                   <div className="p-2 border-b border-gray-100 bg-white">
                                                     <input
                                                       type="text"
                                                       autoFocus
                                                       value={inlineAssigneeSearch}
                                                       onChange={(e) => setInlineAssigneeSearch(e.target.value)}
                                                       placeholder="Search team members..."
                                                       className="w-full px-2.5 py-1 text-xs border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                                                     />
                                                     {newIssueAssignee && newIssueAssignee !== 'Unassigned' && (
                                                       <div className="mt-1 px-0.5 flex items-center justify-between text-[11px] text-gray-500">
                                                         <span className="truncate">Selected: <strong className="text-gray-800">{newIssueAssignee}</strong></span>
                                                         <button
                                                           type="button"
                                                           onClick={() => {
                                                             setNewIssueAssignee('Unassigned');
                                                             setOpenInlineDropdown(null);
                                                           }}
                                                           className="text-red-600 hover:text-red-700 hover:underline font-semibold ml-2 shrink-0 cursor-pointer"
                                                         >
                                                           Unassign
                                                         </button>
                                                       </div>
                                                     )}
                                                   </div>

                                                   <div className="max-h-52 overflow-y-auto py-1 custom-scrollbar">
                                                     {/* Unassigned Option */}
                                                     {(!inlineAssigneeSearch.trim() || 'unassigned'.includes(inlineAssigneeSearch.toLowerCase().trim())) && (
                                                       <div
                                                         onClick={() => {
                                                           setNewIssueAssignee('Unassigned');
                                                           setOpenInlineDropdown(null);
                                                         }}
                                                         className={`px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition-colors ${
                                                           newIssueAssignee === 'Unassigned' ? 'bg-[#deebff] font-semibold text-blue-900' : 'text-gray-700'
                                                         }`}
                                                       >
                                                         <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                                                           <User size={12} />
                                                         </div>
                                                         <span className="text-xs font-medium">Unassigned</span>
                                                         {newIssueAssignee === 'Unassigned' && <Check size={13} className="text-blue-600 ml-auto shrink-0" />}
                                                       </div>
                                                     )}

                                                     {/* Automatic Option */}
                                                     {(!inlineAssigneeSearch.trim() || 'automatic'.includes(inlineAssigneeSearch.toLowerCase().trim())) && (
                                                       <div
                                                         onClick={() => {
                                                           setNewIssueAssignee('Automatic');
                                                           setOpenInlineDropdown(null);
                                                         }}
                                                         className={`px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition-colors ${
                                                           newIssueAssignee === 'Automatic' ? 'bg-[#deebff] font-semibold text-blue-900' : 'text-gray-700'
                                                         }`}
                                                       >
                                                         <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                                                           <User size={12} />
                                                         </div>
                                                         <span className="text-xs font-medium">Automatic</span>
                                                         {newIssueAssignee === 'Automatic' && <Check size={13} className="text-blue-600 ml-auto shrink-0" />}
                                                       </div>
                                                     )}

                                                     {/* Logged-in User (Assign to me) Option */}
                                                     {user && (!inlineAssigneeSearch.trim() || 'assign to me'.includes(inlineAssigneeSearch.toLowerCase()) || (user.first_name || '').toLowerCase().includes(inlineAssigneeSearch.toLowerCase())) && (
                                                       <div
                                                         onClick={() => {
                                                           const myName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
                                                           setNewIssueAssignee(myName);
                                                           setOpenInlineDropdown(null);
                                                         }}
                                                         className={`px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 border-b border-gray-100 transition-colors ${
                                                           newIssueAssignee && (newIssueAssignee.toLowerCase() === (user.username || '').toLowerCase() || newIssueAssignee.toLowerCase().includes((user.first_name || '').toLowerCase()))
                                                             ? 'bg-[#deebff] font-semibold text-blue-900'
                                                             : 'text-gray-700'
                                                         }`}
                                                       >
                                                         <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                                                           {getInitials(user.first_name || user.username)}
                                                         </div>
                                                         <div className="flex-1 min-w-0">
                                                           <div className="truncate text-xs font-medium text-gray-900">
                                                             {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username} <span className="text-[10px] text-gray-500 font-normal">(Assign to me)</span>
                                                           </div>
                                                           {user.email && <div className="text-[10px] text-gray-500 truncate leading-none mt-0.5">{user.email}</div>}
                                                         </div>
                                                         {newIssueAssignee && (newIssueAssignee.toLowerCase() === (user.username || '').toLowerCase() || newIssueAssignee.toLowerCase().includes((user.first_name || '').toLowerCase())) && (
                                                           <Check size={13} className="text-blue-600 shrink-0" />
                                                         )}
                                                       </div>
                                                     )}

                                                     {/* Team Users List from real users */}
                                                     {itUsersList
                                                       .filter(u => {
                                                         if (user && (u.id === user.id || u.username === user.username)) return false;
                                                         const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '';
                                                         return !inlineAssigneeSearch.trim() || name.toLowerCase().includes(inlineAssigneeSearch.toLowerCase()) || (u.email && u.email.toLowerCase().includes(inlineAssigneeSearch.toLowerCase()));
                                                       })
                                                       .map((u) => {
                                                         const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || 'User';
                                                         const initials = getInitials(fullName);
                                                         const isSelected = newIssueAssignee && newIssueAssignee.toLowerCase() === fullName.toLowerCase();

                                                         const colors = [
                                                           'bg-blue-600 text-white',
                                                           'bg-purple-600 text-white',
                                                           'bg-amber-600 text-white',
                                                           'bg-pink-600 text-white',
                                                           'bg-indigo-600 text-white',
                                                           'bg-teal-600 text-white'
                                                         ];
                                                         const colorClass = colors[Number(u.id || 0) % colors.length];

                                                         return (
                                                           <div
                                                             key={u.id || u.username}
                                                             onClick={() => {
                                                               setNewIssueAssignee(fullName);
                                                               setOpenInlineDropdown(null);
                                                             }}
                                                             className={`px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition-colors ${
                                                               isSelected ? 'bg-[#deebff] text-blue-900 font-semibold' : 'text-gray-700'
                                                             }`}
                                                           >
                                                             <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${colorClass}`}>
                                                               {initials}
                                                             </div>
                                                             <div className="flex-1 min-w-0">
                                                               <div className="truncate text-xs font-medium text-gray-900">{fullName}</div>
                                                               {u.email && <div className="text-[10px] text-gray-500 truncate leading-none mt-0.5">{u.email}</div>}
                                                             </div>
                                                             {isSelected && <Check size={13} className="text-blue-600 shrink-0" />}
                                                           </div>
                                                         );
                                                       })}
                                                   </div>
                                                 </div>
                                               )}
                                             </div>

                                             {/* Project selector dropdown */}
                                             {projectsList.length > 0 && (
                                               <div className="relative inline-dropdown">
                                                 <button
                                                   type="button"
                                                   onClick={() => setOpenInlineDropdown(openInlineDropdown === 'project' ? null : 'project')}
                                                   className="px-1.5 py-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition flex items-center gap-1"
                                                   title="Select Project"
                                                 >
                                                   <Folder size={13} className="text-amber-500 shrink-0" />
                                                   <span className="text-[11px] font-medium text-gray-600 max-w-[70px] truncate">
                                                     {projectsList.find(p => Number(p.id) === Number(newIssueProjectId))?.name || 'Project'}
                                                   </span>
                                                   <ChevronDown size={10} />
                                                 </button>
                                                 {openInlineDropdown === 'project' && (
                                                   <div className="absolute left-0 bottom-full mb-2 w-52 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 text-xs">
                                                     <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                       Assign to Project
                                                     </div>
                                                     <div className="max-h-40 overflow-y-auto">
                                                       {projectsList.map(proj => (
                                                         <div
                                                           key={proj.id}
                                                           onClick={() => {
                                                             setNewIssueProjectId(proj.id);
                                                             setOpenInlineDropdown(null);
                                                           }}
                                                           className={`px-2.5 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center gap-2 truncate ${
                                                             Number(newIssueProjectId) === Number(proj.id) ? 'bg-[#deebff] font-semibold text-blue-900' : 'text-gray-700'
                                                           }`}
                                                         >
                                                           <Folder size={12} className="text-amber-500 shrink-0" />
                                                           <span className="truncate">{proj.name}</span>
                                                         </div>
                                                       ))}
                                                     </div>
                                                   </div>
                                                 )}
                                               </div>
                                             )}
                                           </div>

                                           {/* Right Side Action Buttons */}
                                           <div className="flex items-center gap-1">
                                             {/* Expand to Full Create Drawer */}
                                             <button
                                               type="button"
                                               onClick={() => handleExpandToDrawer(col)}
                                               className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-800 transition"
                                               title="Open detailed create drawer"
                                             >
                                               <Maximize2 size={13} />
                                             </button>

                                             {/* Cancel Button */}
                                             <button
                                               type="button"
                                               onClick={() => {
                                                 setActiveCreateColumn(null);
                                                 setOpenInlineDropdown(null);
                                               }}
                                               className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition"
                                               title="Cancel"
                                             >
                                               <X size={14} />
                                             </button>

                                             {/* Submit Button */}
                                             <button
                                               type="button"
                                               onClick={() => handleCreateInlineIssue(col)}
                                               disabled={!newIssueTitle.trim()}
                                               className={`p-1.5 rounded transition ${
                                                 newIssueTitle.trim()
                                                   ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                                   : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                               }`}
                                               title="Create task (Enter)"
                                             >
                                               <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
                                             </button>
                                           </div>
                                         </div>
                                       </div>
                                     ) : (
                                       <button
                                         onClick={() => handleOpenInlineCreate(col)}
                                         className="mt-2 shrink-0 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-200 p-2 rounded transition-colors w-full create-trigger-btn"
                                       >
                                         <Plus size={14} /> Create issue
                                       </button>
                                     )}
                                  </div>
                                )
                              }}
                            </Draggable>
                          ))}
                          {/* ADD NEW COLUMN BUTTON */}
                          <div className="min-w-[260px] h-min rounded p-3 bg-gray-50/50 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors flex flex-col">
                            {isAddingColumn ? (
                              <div className="flex flex-col gap-2">
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Enter column name..."
                                  className="w-full p-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  value={newColumnName}
                                  onChange={(e) => setNewColumnName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newColumnName.trim()) {
                                      const colName = newColumnName.toUpperCase();
                                      if (!columnOrder.includes(colName)) {
                                        setColumnOrder([...columnOrder, colName]);
                                        setBoardData({ ...boardData, [colName]: [] });
                                      }
                                      setNewColumnName('');
                                      setIsAddingColumn(false);
                                    } else if (e.key === 'Escape') {
                                      setIsAddingColumn(false);
                                      setNewColumnName('');
                                    }
                                  }}
                                  onBlur={() => {
                                    if (newColumnName.trim()) {
                                      const colName = newColumnName.toUpperCase();
                                      if (!columnOrder.includes(colName)) {
                                        setColumnOrder([...columnOrder, colName]);
                                        setBoardData({ ...boardData, [colName]: [] });
                                      }
                                    }
                                    setNewColumnName('');
                                    setIsAddingColumn(false);
                                  }}
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => setIsAddingColumn(true)}
                                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 w-full"
                              >
                                <Plus size={14} /> Add column
                              </button>
                            )}
                          </div>

                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              )}

            </div>

            {/* RIGHT SIDE PANEL (ISSUE DETAILS) */}
            <ITIssueDetailsPanel
              issue={selectedIssueData}
              updateIssue={updateIssue}
              deleteIssue={deleteIssue}
              onClose={() => setSelectedIssue(null)}
              onIssueCreated={fetchKanbanData}
              department={currentDept}
            />

            <CompleteSprintModal
              isOpen={isCompletingSprint}
              sprints={allSprints}
              initialSprintId={activeSprints[0]?.id}
              onCancel={() => setIsCompletingSprint(false)}
              onComplete={handleCompleteSprint}
            />

          </div>
        </div>
      </div>
    </>
  );
};

export default ITKanbanPage;

import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search, Bell, HelpCircle, Settings, ChevronDown, ChevronRight,
  Share2, Download, MoreHorizontal, LayoutList, Plus, AlertCircle, ArrowUp, ArrowDown, CheckSquare,
  Trash2, User, Check, Megaphone, Palette, Video, FileText, IterationCw
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ITCreateIssueDrawer from './ITCreateIssueDrawer';
import ITIssueDetailsPanel from './ITIssueDetailsPanel';
import MarketingCreateIssueDrawer from '../marketing/MarketingCreateIssueDrawer';
import { DEPARTMENT_KANBAN_CONFIG } from '../../config/departmentKanbanConfig';
import BoardTabs from '../common/BoardTabs';
import CompleteSprintModal from '../common/CompleteSprintModal';
import Swal from 'sweetalert2';

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
  Content: <FileText size={14} className="text-green-600" />
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
  Content: <FileText size={12} className="text-green-600" />
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

const INITIAL_KANBAN_DATA = {
  'TO DO': [],
  'IN PROGRESS': [],
  'IN REVIEW': [],
  'TESTING': [],
  'DONE': []
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

  const isManager = designation ? (
    designation.toLowerCase().includes('manager') ||
    designation.toLowerCase().includes('admin') ||
    designation.toLowerCase().includes('lead')
  ) : false;

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

  const [boardData, setBoardData] = useState({
    'TO DO': [],
    'IN PROGRESS': [],
    'IN REVIEW': [],
    'TESTING': [],
    'DONE': []
  });
  const [columnOrder, setColumnOrder] = useState(() => {
    const saved = localStorage.getItem(`${currentDept}_kanbanColumnOrder`);
    return saved ? JSON.parse(saved) : Object.keys(INITIAL_KANBAN_DATA);
  });

  const [allRawIssues, setAllRawIssues] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [onlyMyIssues, setOnlyMyIssues] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterDropdown, setActiveFilterDropdown] = useState(null);
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
    setAllRawIssues(prev => prev.map(t => (t.issue_key === issueKey || t.key === issueKey) ? { ...t, assignee: newAssignee } : t));
    setOpenCardAssigneeDropdown(null);
    try {
      const res = await fetch(`${API_BASE_URL}/it-kanban/issues/${issueKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Without this the assignment notification reads "Someone assigned you…" instead
          // of naming the manager who did it.
          'x-user-name': user ? (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username) : (username || 'System')
        },
        body: JSON.stringify({ assignee: newAssignee })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        fetchKanbanData(); // The optimistic change didn't stick; show what the server has.
        Swal.fire('Could not assign', data.error || 'Update rejected by the server', 'error');
      }
    } catch (err) {
      console.error('Failed to update assignee', err);
      fetchKanbanData();
    }
  };

  const fetchKanbanData = () => {
    // Which sprints are running determines what the board is allowed to show.
    fetch(`${API_BASE_URL}/sprints?department=${encodeURIComponent(currentDept)}`)
      .then(res => res.json())
      .then(data => {
        const running = data.activeSprints || (data.activeSprint ? [data.activeSprint] : []);
        setActiveSprints(running);
        setAllSprints(data.sprints || []);
      })
      .catch(err => console.error('Error fetching active sprints:', err));

    fetch(`${API_BASE_URL}/it-kanban/issues?department=${currentDept}`)
      .then(res => res.json())
      .then(data => {
        setAllRawIssues(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error('Error fetching kanban data:', err));
  };

  useEffect(() => {
    fetchKanbanData();

    // Fetch projects list for filter dropdown
    fetch(`${API_BASE_URL}/projects?department=${currentDept}`)
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
    const newBoard = {
      'TO DO': [],
      'IN PROGRESS': [],
      'IN REVIEW': [],
      'TESTING': [],
      'DONE': []
    };
    columnOrder.forEach(col => {
      if (!newBoard[col]) newBoard[col] = [];
    });

    let filtered = allRawIssues.filter(issue => {
      // Removed department-based validation so everyone can view tasks of everyone
      /* if (currentDept === 'Marketing') {
        return issue.department === 'Marketing' || (issue.issue_key && !issue.issue_key.startsWith('WR-'));
      }
      return issue.department !== 'Marketing' && (!issue.issue_key || !issue.issue_key.startsWith('MKT')); */
      return true;
    });

    // Scrum rule: the board shows the running sprints only — all of them, since sprints can
    // run in parallel. Everything else lives in the Backlog until its sprint is started.
    if (activeSprints.length > 0) {
      const runningIds = new Set(activeSprints.map(s => Number(s.id)));
      filtered = filtered.filter(issue => runningIds.has(Number(issue.sprint_id)));
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
    const isUserTask = (issue) => {
      const assigneeStr = (issue.assignee || '').toLowerCase();
      const reporterStr = (issue.reporter || '').toLowerCase();
      return userSearchTerms.some(term => assigneeStr.includes(term) || reporterStr.includes(term));
    };

    // The employee gate is an access boundary, not a convenience filter, so it matches the
    // person exactly. Substring matching would leak: two staff share the surname "khedekar",
    // two share "patil", and one has the last name "IT", which appears inside plenty of
    // unrelated names.
    const isMine = (issue) =>
      myIdentities.includes(normalizePerson(issue.assignee)) ||
      myIdentities.includes(normalizePerson(issue.reporter));

    // Employees get a personal board: their own work from the running sprints, nothing else.
    // Managers keep the whole board and can narrow it with the "Only My Issues" toggle.
    // Removed isManager validation so everyone can view tasks of everyone
    /* if (!isManager) {
      filtered = filtered.filter(issue => isMine(issue));
    } else */ if (onlyMyIssues) {
      filtered = filtered.filter(issue => isUserTask(issue));
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
  }, [allRawIssues, activeSprints, columnOrder, selectedProjectId, selectedType, selectedStatus, selectedPriority, selectedAssignees, onlyMyIssues, isManager, userSearchTerms, myIdentities, searchQuery, username]);

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
    localStorage.setItem('kanbanColumnOrder', JSON.stringify(columnOrder));
  }, [columnOrder]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  // Inline creation states
  const [activeCreateColumn, setActiveCreateColumn] = useState(null);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueType, setNewIssueType] = useState('Task');
  const [newIssueAssignee, setNewIssueAssignee] = useState('Unassigned');
  const [newIssueDueDate, setNewIssueDueDate] = useState('');
  const [openInlineDropdown, setOpenInlineDropdown] = useState(null);

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

    let assigneeVal = newIssueAssignee === 'Unassigned' || newIssueAssignee === 'Automatic' ? 'Unassigned' : newIssueAssignee;
    const reporterVal = username ? username : 'Unassigned';

    if (assigneeVal === 'Unassigned') {
      assigneeVal = reporterVal;
    }

    try {
      const prefix = deptConfig.defaultPrefix;
      const res = await fetch(API_BASE_URL + '/it-kanban/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newIssueTitle,
          type: newIssueType,
          status: col,
          assignee: assigneeVal,
          reporter: reporterVal,
          priority: 'Medium',
          department: currentDept,
          keyPrefix: prefix
        })
      });
      const data = await res.json();

      const newCard = {
        key: data.issue_key,
        title: newIssueTitle,
        type: newIssueType,
        status: col,
        assignee: assigneeVal,
        priority: 'Medium',
        labels: [currentDept],
        sprint: 'Sprint 1',
        subtasks: [],
        linked_issues: [],
        comments: []
      };

      setBoardData(prev => ({
        ...prev,
        [col]: [...(prev[col] || []), newCard]
      }));

      setNewIssueTitle('');
      setNewIssueType('Task');
      setNewIssueAssignee('Unassigned');
      setNewIssueDueDate('');
      setActiveCreateColumn(null);
      setOpenInlineDropdown(null);
    } catch (err) {
      console.error('Failed to save inline task', err);
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
        const idx = next[col].findIndex(c => c.key === key);
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

      if (!res.ok) {
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

      setBoardData(prev => {
        const next = { ...prev };
        for (const col of Object.keys(next)) {
          next[col] = next[col].filter(c => c.key !== key);
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
      const sourceCol = [...boardData[source.droppableId]];
      const destCol = [...boardData[destination.droppableId]];
      const [removed] = sourceCol.splice(source.index, 1);
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
      updateIssue(removed.key, { status: destination.droppableId });
    } else {
      const col = [...boardData[source.droppableId]];
      const [removed] = col.splice(source.index, 1);
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
        <MarketingCreateIssueDrawer isOpen={isCreateDrawerOpen} onIssueCreated={fetchKanbanData} onClose={() => setIsCreateDrawerOpen(false)} />
      ) : (
        <ITCreateIssueDrawer department={currentDept} isOpen={isCreateDrawerOpen} onIssueCreated={fetchKanbanData} onClose={() => setIsCreateDrawerOpen(false)} />
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
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all relative border-2 border-white cursor-pointer ${isSelected
                              ? 'ring-2 ring-blue-600 ring-offset-1 z-20 scale-110 shadow-md'
                              : 'hover:z-10 hover:scale-105 opacity-90 hover:opacity-100'
                              } ${colorClass}`}
                          >
                            {uppercaseInitials}
                          </button>
                        );
                      })}
                      {itUsersList.length > 5 && (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold bg-gray-100 text-gray-600 border-2 border-white z-0 ml-[-8px]" title={`${itUsersList.length - 5} more members`}>
                          +{itUsersList.length - 5}
                        </div>
                      )}
                    </div>

                    {/* Project Filter Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'project' ? null : 'project')}
                        className={`flex items-center gap-1.5 p-2 rounded text-xs font-medium border hover:bg-gray-50 transition-colors ${selectedProjectId !== 'ALL' ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold' : 'bg-white border-gray-300 text-gray-700'}`}
                      >
                        Project: {selectedProjectId !== 'ALL' ? (projectsList.find(p => Number(p.id) === Number(selectedProjectId))?.name || 'Selected') : 'All Projects'} <ChevronDown size={14} />
                      </button>
                      {activeFilterDropdown === 'project' && (
                        <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-xl py-1 z-50 text-xs text-gray-700 max-h-60 overflow-y-auto">
                          <div
                            onClick={() => { setSelectedProjectId('ALL'); setActiveFilterDropdown(null); }}
                            className={`px-3 py-2 hover:bg-gray-100 cursor-pointer font-medium border-b border-gray-100 ${selectedProjectId === 'ALL' ? 'text-blue-600 font-bold bg-blue-50' : ''}`}
                          >
                            All Projects
                          </div>
                          {projectsList.map(p => (
                            <div
                              key={p.id}
                              onClick={() => { setSelectedProjectId(p.id); setActiveFilterDropdown(null); }}
                              className={`px-3 py-2 hover:bg-gray-100 cursor-pointer truncate ${Number(selectedProjectId) === Number(p.id) ? 'text-blue-600 font-bold bg-blue-50' : ''}`}
                            >
                              {p.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Type Filter Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'type' ? null : 'type')}
                        className={`flex items-center gap-1.5 p-2 rounded text-xs font-medium border hover:bg-gray-50 transition-colors ${selectedType !== 'ALL' ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold' : 'bg-white border-gray-300 text-gray-700'}`}
                      >
                        Type: {selectedType !== 'ALL' ? selectedType : 'All'} <ChevronDown size={14} />
                      </button>
                      {activeFilterDropdown === 'type' && (
                        <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-xl py-1 z-50 text-xs text-gray-700">
                          {['ALL', ...deptIssueTypes].map(t => (
                            <div
                              key={t}
                              onClick={() => { setSelectedType(t); setActiveFilterDropdown(null); }}
                              className={`px-3 py-1.5 hover:bg-gray-100 cursor-pointer ${selectedType === t ? 'text-blue-600 font-bold bg-blue-50' : ''}`}
                            >
                              {t === 'ALL' ? 'All Types' : t}
                            </div>
                          ))}
                        </div>
                      )}
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
                          {['ALL', 'TO DO', 'IN PROGRESS', 'IN REVIEW', 'TESTING', 'DONE'].map(s => (
                            <div
                              key={s}
                              onClick={() => { setSelectedStatus(s); setActiveFilterDropdown(null); }}
                              className={`px-3 py-1.5 hover:bg-gray-100 cursor-pointer ${selectedStatus === s ? 'text-blue-600 font-bold bg-blue-50' : ''}`}
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
                              className={`px-3 py-1.5 hover:bg-gray-100 cursor-pointer ${selectedPriority === p ? 'text-blue-600 font-bold bg-blue-50' : ''}`}
                            >
                              {p === 'ALL' ? 'All Priorities' : p}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assignee Filter Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'assignee' ? null : 'assignee')}
                        className={`flex items-center gap-1.5 p-2 rounded text-xs font-medium border hover:bg-gray-50 transition-colors ${selectedAssignees.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold' : 'bg-white border-gray-300 text-gray-700'}`}
                      >
                        Assignee: {selectedAssignees.length === 0 ? 'All' : selectedAssignees.length === 1 ? selectedAssignees[0] : `${selectedAssignees.length} Selected`} <ChevronDown size={14} />
                      </button>
                      {activeFilterDropdown === 'assignee' && (
                        <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-md shadow-xl py-1 z-50 text-xs text-gray-700 max-h-60 overflow-y-auto">
                          <div
                            onClick={() => { setSelectedAssignees([]); setActiveFilterDropdown(null); }}
                            className={`px-3 py-2 hover:bg-gray-100 cursor-pointer font-medium border-b border-gray-100 ${selectedAssignees.length === 0 ? 'text-blue-600 font-bold bg-blue-50' : ''}`}
                          >
                            All Assignees
                          </div>
                          <div
                            onClick={() => {
                              if (selectedAssignees.includes('UNASSIGNED')) {
                                setSelectedAssignees(prev => prev.filter(a => a !== 'UNASSIGNED'));
                              } else {
                                setSelectedAssignees(prev => [...prev, 'UNASSIGNED']);
                              }
                            }}
                            className={`px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 ${selectedAssignees.includes('UNASSIGNED') ? 'text-blue-600 font-bold bg-blue-50' : ''}`}
                          >
                            Unassigned
                          </div>
                          {usersList.map(u => {
                            const uName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
                            if (!uName) return null;
                            const isSelected = selectedAssignees.includes(uName);
                            return (
                              <div
                                key={u.id || uName}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedAssignees(prev => prev.filter(a => a !== uName));
                                  } else {
                                    setSelectedAssignees(prev => [...prev, uName]);
                                  }
                                }}
                                className={`px-3 py-2 hover:bg-gray-100 cursor-pointer truncate ${isSelected ? 'text-blue-600 font-bold bg-blue-50' : ''}`}
                              >
                                {uName}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Only My Issues Quick Filter Pill — Only visible to Managers */}
                    {isManager && (
                      <button
                        onClick={() => setOnlyMyIssues(!onlyMyIssues)}
                        className={`flex items-center gap-1.5 p-2 rounded text-xs font-semibold border transition-all cursor-pointer ${onlyMyIssues
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                          }`}
                        title="Show only tasks assigned to or reported by me"
                      >
                        <User size={13} />
                        Only My Issues
                      </button>
                    )}

                    {/* Clear Filters reset button */}
                    {(selectedProjectId !== 'ALL' || selectedType !== 'ALL' || selectedStatus !== 'ALL' || selectedPriority !== 'ALL' || selectedAssignees.length > 0 || onlyMyIssues || searchQuery) && (
                      <button
                        onClick={() => {
                          setSelectedProjectId('ALL');
                          setSelectedType('ALL');
                          setSelectedStatus('ALL');
                          setSelectedPriority('ALL');
                          setSelectedAssignees([]);
                          setOnlyMyIssues(false);
                          setSearchQuery('');
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
                          <div className="absolute right-0 top-full mt-2 w-[350px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-5 max-h-[70vh] overflow-y-auto">
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
                                                  <div className={`text-blue-600 text-xs hover:underline mb-1 font-medium cursor-pointer ${isDoneStatus(card.status) ? 'line-through' : ''}`} onClick={(e) => { e.stopPropagation(); setSelectedIssue(card.key); }}>{card.key}</div>
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
                                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 text-[11px] font-medium text-gray-700 cursor-pointer transition-all hover:border-gray-300 w-full justify-between select-none"
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
                                                    {col === 'DONE' ? (
                                                      <CheckCircleIcon className="text-green-500" size={16} />
                                                    ) : (
                                                      <div className="relative card-assignee-dropdown">
                                                        <button
                                                          onClick={(e) => handleOpenCardAssignee(e, card.key)}
                                                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border border-white shrink-0 cursor-pointer transition-transform hover:scale-110 ${card.assignee === 'Unassigned' || !card.assignee
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
                                                            className="bg-white border border-gray-200 rounded-lg shadow-2xl py-1.5 text-xs text-gray-700 font-sans border-t-2 border-t-blue-500"
                                                          >
                                                            {/* Jira Top Active / Search Input Box */}
                                                            <div className="p-2 border-b border-gray-100 bg-white">
                                                              <div className="relative">
                                                                <input
                                                                  type="text"
                                                                  autoFocus
                                                                  value={assigneeSearchQuery}
                                                                  onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                                                                  placeholder={card.assignee || "Search users..."}
                                                                  className="w-full px-3 py-1.5 text-xs border-2 border-blue-500 rounded-md focus:outline-none bg-white text-gray-900 font-medium"
                                                                />
                                                              </div>
                                                            </div>

                                                            <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                                                              {/* Unassigned Option */}
                                                              <div
                                                                onClick={() => handleUpdateCardAssignee(card.key, 'Unassigned')}
                                                                className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition-colors ${card.assignee === 'Unassigned' || !card.assignee ? 'bg-[#deebff] font-semibold text-blue-900' : 'text-gray-700'
                                                                  }`}
                                                              >
                                                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                                                                  <User size={13} className="text-gray-600" />
                                                                </div>
                                                                <span className="text-xs font-medium">Unassigned</span>
                                                              </div>

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
                                                                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
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
                                                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${colorClass}`}>
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
                                              )}
                                            </Draggable>
                                          ))}
                                          {provided.placeholder}
                                        </div>
                                      )}
                                    </Droppable>

                                    {activeCreateColumn === col ? (
                                      <div className="mt-2 p-3 bg-white border border-blue-500 rounded  flex flex-col gap-3 font-sans text-xs inline-create-box">
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
                                            }
                                          }}
                                        />

                                        {/* Bottom Row */}
                                        <div className="flex items-center justify-between mt-1 relative">
                                          <div className="flex items-center gap-2">
                                            {/* Work Type selector dropdown */}
                                            <div className="relative inline-dropdown">
                                              <button
                                                onClick={() => setOpenInlineDropdown(openInlineDropdown === 'type' ? null : 'type')}
                                                className="flex items-center gap-1 p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition"
                                              >
                                                {TYPE_ICONS[newIssueType] || <CheckSquare size={14} className="text-blue-500 fill-blue-100" />}
                                                <ChevronDown size={10} />
                                              </button>
                                              {openInlineDropdown === 'type' && (
                                                <div className="absolute left-0 bottom-full mb-1.5 w-36 bg-white border border-gray-200 rounded shadow-lg py-1 z-50 text-sm">
                                                  {deptIssueTypes.map(type => (
                                                    <div
                                                      key={type}
                                                      onClick={() => {
                                                        setNewIssueType(type);
                                                        setOpenInlineDropdown(null);
                                                      }}
                                                      className="px-2.5 py-1.5 hover:bg-gray-50 flex items-center gap-2 cursor-pointer text-gray-700 font-medium"
                                                    >
                                                      {TYPE_ICONS_SM[type] || <CheckSquare size={12} className="text-blue-500 fill-blue-100" />} {type}
                                                    </div>
                                                  ))}
                                                  <div className="border-t border-gray-100 my-1"></div>
                                                  <div className="px-2.5 py-1.5 hover:bg-gray-50 cursor-pointer text-gray-500 font-medium">Add work type</div>
                                                  <div className="px-2.5 py-1.5 hover:bg-gray-50 cursor-pointer text-gray-500 font-medium">Edit work type</div>
                                                  <div className="px-2.5 py-1.5 hover:bg-gray-50 cursor-pointer text-gray-500 font-medium">Manage</div>
                                                </div>
                                              )}
                                            </div>

                                            {/* Due date picker dropdown */}
                                            <div className="relative inline-dropdown">
                                              <button
                                                onClick={() => setOpenInlineDropdown(openInlineDropdown === 'date' ? null : 'date')}
                                                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition"
                                              >
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                              </button>
                                              {openInlineDropdown === 'date' && (
                                                <div className="absolute left-0 bottom-full mb-1.5 w-64 bg-white border border-gray-200 rounded shadow-xl p-3 z-50 text-gray-800">
                                                  <div className="font-semibold text-xs text-gray-500 mb-1">Due date</div>
                                                  <input
                                                    type="text"
                                                    placeholder="7/13/2026"
                                                    value={newIssueDueDate || '7/13/2026'}
                                                    onChange={(e) => setNewIssueDueDate(e.target.value)}
                                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                                                  />
                                                  {/* Calendar Grid */}
                                                  <div className="mt-3">
                                                    <div className="flex justify-between items-center text-xs font-semibold text-gray-700 px-1 mb-2">
                                                      <span>July 2026</span>
                                                      <div className="flex gap-2">
                                                        <span className="cursor-pointer hover:text-blue-500">{"<"}</span>
                                                        <span className="cursor-pointer hover:text-blue-500">{">"}</span>
                                                      </div>
                                                    </div>
                                                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 mb-1">
                                                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <span key={d}>{d}</span>)}
                                                    </div>
                                                    <div className="grid grid-cols-7 gap-1 text-xs">
                                                      {[28, 29, 30, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 1].map((day, idx) => {
                                                        const isCurrentMonth = idx >= 3 && idx <= 33;
                                                        const isToday = day === 13 && isCurrentMonth;
                                                        return (
                                                          <span
                                                            key={idx}
                                                            onClick={() => {
                                                              setNewIssueDueDate(`7/${day}/2026`);
                                                              setOpenInlineDropdown(null);
                                                            }}
                                                            className={`py-1 rounded cursor-pointer transition ${isToday ? 'bg-blue-600 text-white ' :
                                                              isCurrentMonth ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300'
                                                              }`}
                                                          >
                                                            {day}
                                                          </span>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>

                                            {/* Assignee selector dropdown */}
                                            <div className="relative inline-dropdown">
                                              <button
                                                onClick={() => setOpenInlineDropdown(openInlineDropdown === 'assignee' ? null : 'assignee')}
                                                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition"
                                              >
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                              </button>
                                              {openInlineDropdown === 'assignee' && (
                                                <div className="absolute left-0 bottom-full mb-1.5 w-60 bg-white border border-gray-200 rounded-md shadow-lg py-1.5 z-50 text-sm">
                                                  <div className="px-2 pb-1.5 border-b border-gray-100">
                                                    <input
                                                      type="text"
                                                      placeholder="Search users..."
                                                      defaultValue="Unassigned"
                                                      className="w-full px-2 py-1 border border-gray-200 rounded outline-none focus:border-blue-500"
                                                    />
                                                  </div>
                                                  <div className="max-h-48 overflow-y-auto mt-1">
                                                    {[
                                                      { name: 'Automatic', sub: '' },
                                                      { name: 'codigix infotech (Assign to me)', sub: 'codigixinfotech@gmail.com' },
                                                      { name: 'sonalicodigix', sub: '' },
                                                      { name: 'sanika mote', sub: '' },
                                                      { name: 'Dinesh Dhage', sub: '' },
                                                      { name: 'Abhijit Khedekar', sub: '' },
                                                      { name: 'wpdevelopercodigix', sub: '' }
                                                    ].map(user => (
                                                      <div
                                                        key={user.name}
                                                        onClick={() => {
                                                          setNewIssueAssignee(user.name);
                                                          setOpenInlineDropdown(null);
                                                        }}
                                                        className="p-2 hover:bg-gray-50 cursor-pointer text-gray-700 font-medium"
                                                      >
                                                        <div className="flex items-center gap-2">
                                                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] ">
                                                            {user.name.charAt(0).toUpperCase()}
                                                          </div>
                                                          <div>
                                                            <div>{user.name}</div>
                                                            {user.sub && <div className="text-[9px] text-gray-400 font-normal">{user.sub}</div>}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {/* Submit Arrow Button */}
                                          <button
                                            onClick={() => handleCreateInlineIssue(col)}
                                            disabled={!newIssueTitle.trim()}
                                            className={`p-1.5 rounded transition ${newIssueTitle.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                              }`}
                                          >
                                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setActiveCreateColumn(col)}
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

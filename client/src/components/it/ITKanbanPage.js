import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search, Bell, HelpCircle, Settings, ChevronDown, ChevronRight,
  Share2, Download, MoreHorizontal, LayoutList, Plus, AlertCircle, ArrowUp, ArrowDown, CheckSquare,
  Trash2, User, Check, Megaphone, Palette, Video, FileText, Globe, Users, IterationCw, Calendar,
  Folder, Maximize2, X, ChevronsUp
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ITCreateIssueDrawer from './ITCreateIssueDrawer';
import ITIssueDetailsPanel from './ITIssueDetailsPanel';
import MarketingCreateIssueDrawer from '../marketing/MarketingCreateIssueDrawer';
import { DEPARTMENT_KANBAN_CONFIG } from '../../config/departmentKanbanConfig';
import BoardTabs from '../common/BoardTabs';
import CompleteSprintModal from '../common/CompleteSprintModal';
import SearchableSelect from '../common/SearchableSelect';
import TimeTrackingModal from '../common/TimeTrackingModal';
import Swal from 'sweetalert2';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { canDeleteTickets, ticketDeleteHeaders, TICKET_DELETE_DENIED_MESSAGE, isManagerUser, hasWorkStarted, isUserTaskReporter } from '../../utils/access';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


function BookmarkIcon(props) {
  return <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}><path d="M5 3v18l7-4.5 7 4.5V3z" /></svg>;
}
function TestTubeIcon(props) {
  return <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}><rect x="9" y="3" width="6" height="3" rx="1" /><path d="M10 6v11a2 2 0 004 0V6" /></svg>;
}

// Card popovers render on <body>: a card inside the draggable/scrolling column would
// otherwise clip a position:fixed menu or offset it from where it was opened.
const BodyPortal = ({ children }) => createPortal(children, document.body);

const PRIORITY_ICONS = {
  Critical: <ChevronsUp size={14} className="text-red-600" />,
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

// Work-type chips shown on a card (e.g. "GMB Graphics", "Content Writing").
// 'content-calendar' only marks where the task came from, so it is not shown.
const HIDDEN_CARD_LABELS = new Set(['content-calendar', 'not-in-performance']);
// chip: the badge itself; accent: the card's left edge, keyed off its first label.
const LABEL_STYLES = {
  'GMB': { chip: 'bg-blue-50 text-blue-700 ring-blue-200', accent: 'border-l-blue-500' },
  'GMB Graphics': { chip: 'bg-purple-50 text-purple-700 ring-purple-200', accent: 'border-l-purple-500' },
  'Content Writing': { chip: 'bg-green-50 text-green-700 ring-green-200', accent: 'border-l-green-500' },
  'Blogs': { chip: 'bg-amber-50 text-amber-700 ring-amber-200', accent: 'border-l-amber-500' },
  'Blogs Graphics': { chip: 'bg-pink-50 text-pink-700 ring-pink-200', accent: 'border-l-pink-500' },
  'SEO': { chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200', accent: 'border-l-indigo-500' }
};
const DEFAULT_LABEL_STYLE = { chip: 'bg-gray-100 text-gray-700 ring-gray-200', accent: 'border-l-gray-300' };
const getLabelStyle = (label) => LABEL_STYLES[label] || DEFAULT_LABEL_STYLE;

// Content-calendar titles read "<Client> - <Task>"; show the client as a subtitle
// rather than repeating it at the start of every card's title.
const splitCardTitle = (card) => {
  const title = card.title || '';
  let raw = card.labels;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch (e) { raw = []; }
  }
  const fromCalendar = Array.isArray(raw) && raw.some(l => String(l).toLowerCase() === 'content-calendar');
  const idx = title.indexOf(' - ');
  if (!fromCalendar || idx <= 0 || idx > 60) return { client: null, text: title };
  return { client: title.slice(0, idx).trim(), text: title.slice(idx + 3).trim() };
};

const getCardLabels = (card) => {
  let labels = card.labels;
  if (typeof labels === 'string') {
    try { labels = JSON.parse(labels); } catch (e) { labels = []; }
  }
  if (!Array.isArray(labels)) return [];
  return labels
    .map(l => String(l || '').trim())
    .filter(l => l && !HIDDEN_CARD_LABELS.has(l.toLowerCase()));
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

const getIssueEffectiveDateStr = (issue) => {
  if (!issue) return '';
  if (issue.start_date) {
    const s = getIssueDateParts(issue.start_date);
    if (s) return s;
  }
  if (issue.created_at || issue.createdAt) {
    const s = getIssueDateParts(issue.created_at || issue.createdAt);
    if (s) return s;
  }
  if (issue.due_date || issue.dueDate) {
    const s = getIssueDateParts(issue.due_date || issue.dueDate);
    if (s) return s;
  }
  return '';
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
const normalizePerson = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

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
  // Same rule as the server: only managers change size/dates once work has started.
  const canManageWork = isManagerUser(user);
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

  // Everyone can edit tickets; only managers can delete them.
  const canDelete = canDeleteTickets(user);

  const isManager = Boolean(
    isManagerUser(user) ||
    String(user?.department_role || '').toLowerCase() === 'manager' ||
    (user?.email && user.email.toLowerCase() === 'sonalicodigix@gmail.com') ||
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
    (user?.role_name && (
      user.role_name.toLowerCase().includes('manager') ||
      user.role_name.toLowerCase().includes('admin') ||
      user.role_name.toLowerCase().includes('lead') ||
      user.role_name.toLowerCase().includes('management') ||
      user.role_name.toLowerCase().includes('hr') ||
      user.role_name.toLowerCase().includes('director') ||
      user.role_name.toLowerCase().includes('head')
    )) ||
    (user?.designation && (
      user.designation.toLowerCase().includes('manager') ||
      user.designation.toLowerCase().includes('admin') ||
      user.designation.toLowerCase().includes('lead') ||
      user.designation.toLowerCase().includes('management') ||
      user.designation.toLowerCase().includes('head')
    )) ||
    (user?.job_title && (
      user.job_title.toLowerCase().includes('manager') ||
      user.job_title.toLowerCase().includes('admin') ||
      user.job_title.toLowerCase().includes('lead')
    ))
  );

  const [usersList, setUsersList] = useState([]);
  const [allRawIssues, setAllRawIssues] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  // Labels filter (multi-select): a card shows if it has any of the chosen labels.
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [labelSearch, setLabelSearch] = useState('');
  const labelsOf = (issue) => {
    let l = issue && issue.labels;
    if (typeof l === 'string') { try { l = JSON.parse(l); } catch (e) { l = []; } }
    return (Array.isArray(l) ? l : []).map(x => String(x || '').trim()).filter(Boolean);
  };
  const issueHasSelectedLabel = (issue) => {
    const wanted = selectedLabels.map(x => x.toLowerCase());
    return labelsOf(issue).some(x => wanted.includes(x.toLowerCase()));
  };
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [onlyMyIssues, setOnlyMyIssues] = useState(true);
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'TOMORROW' | 'THIS_WEEK' | 'THIS_MONTH' | 'OVERDUE' | 'EXACT' | 'RANGE' | 'NO_DATE'
  const [exactDate, setExactDate] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  const userSearchTerms = React.useMemo(() => {
    const terms = new Set();
    if (username) {
      terms.add(username.toLowerCase());
      username.toLowerCase().split(/[-_\s]+/).forEach(t => { if (t.length > 2) terms.add(t); });
      const alphaOnly = username.toLowerCase().replace(/[0-9]/g, '');
      if (alphaOnly && alphaOnly.length > 2) terms.add(alphaOnly);
    }
    if (user) {
      if (user.username) terms.add(user.username.toLowerCase());
      if (user.first_name) terms.add(user.first_name.toLowerCase());
      if (user.last_name) terms.add(user.last_name.toLowerCase());
      if (user.name) user.name.toLowerCase().split(/\s+/).forEach(t => { if (t.length > 2) terms.add(t); });
    }
    if (usersList && usersList.length > 0) {
      const match = usersList.find(u =>
        (u.username && (u.username.toLowerCase() === username?.toLowerCase() || u.username.toLowerCase() === user?.username?.toLowerCase())) ||
        (u.email && (u.email.toLowerCase() === username?.toLowerCase() || u.email.toLowerCase() === user?.email?.toLowerCase())) ||
        (u.id && user?.id && String(u.id) === String(user.id))
      );
      if (match) {
        if (match.name) match.name.toLowerCase().split(/\s+/).forEach(t => { if (t.length > 2) terms.add(t); });
        if (match.first_name) terms.add(match.first_name.toLowerCase());
        if (match.last_name) terms.add(match.last_name.toLowerCase());
        if (match.username) terms.add(match.username.toLowerCase());
      }
    }
    return Array.from(terms);
  }, [username, user, usersList]);

  // Every spelling that means "this is me", compared exactly by the employee board.
  const myIdentities = React.useMemo(() => {
    const ids = new Set();
    const add = (v) => { const n = normalizePerson(v); if (n) ids.add(n); };
    if (username) add(username);
    if (user) {
      add(user.username);
      add(user.name);
      add(`${user.first_name || ''} ${user.last_name || ''}`);
      if (user.first_name) add(user.first_name);
      if (user.email) add(user.email);
    }
    if (usersList && usersList.length > 0) {
      const match = usersList.find(u =>
        (u.username && (u.username.toLowerCase() === username?.toLowerCase() || u.username.toLowerCase() === user?.username?.toLowerCase())) ||
        (u.email && (u.email.toLowerCase() === username?.toLowerCase() || u.email.toLowerCase() === user?.email?.toLowerCase())) ||
        (u.id && user?.id && String(u.id) === String(user.id))
      );
      if (match) {
        if (match.name) add(match.name);
        if (match.username) add(match.username);
        add(`${match.first_name || ''} ${match.last_name || ''}`);
        if (match.first_name) add(match.first_name);
        if (match.email) add(match.email);
      }
    }
    return Array.from(ids).filter(Boolean);
  }, [username, user, usersList]);

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
  const [openCardPriorityDropdown, setOpenCardPriorityDropdown] = useState(null);
  // Drawing hundreds of draggable cards at once freezes the browser, so each column shows
  // a page of cards and "Show more" adds the next page.
  const CARD_PAGE = 50;
  const [columnLimits, setColumnLimits] = useState({});
  const limitFor = (col) => columnLimits[col] || CARD_PAGE;
  const [cardPriorityPos, setCardPriorityPos] = useState({ top: 0, left: 0 });
  // Reschedule: clicking a card's date opens a small calendar to move the task to another day.
  const [openCardDateDropdown, setOpenCardDateDropdown] = useState(null);
  const [cardDatePos, setCardDatePos] = useState({ top: 0, left: 0 });

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

  const handleOpenCardPriority = (e, cardKey) => {
    e.stopPropagation();
    if (openCardPriorityDropdown === cardKey) {
      setOpenCardPriorityDropdown(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const popupWidth = 160;
    const popupHeight = 130;
    let leftPos = rect.left;
    if (leftPos + popupWidth > window.innerWidth) {
      leftPos = Math.max(10, window.innerWidth - popupWidth - 10);
    }
    let topPos = rect.bottom + 6;
    if (topPos + popupHeight > window.innerHeight) {
      topPos = Math.max(10, rect.top - popupHeight - 6);
    }
    setCardPriorityPos({ top: topPos, left: leftPos });
    setOpenCardAssigneeDropdown(null);
    setOpenCardPriorityDropdown(cardKey);
  };

  const handleOpenCardDate = (e, cardKey) => {
    e.stopPropagation();
    if (openCardDateDropdown === cardKey) {
      setOpenCardDateDropdown(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const popupWidth = 250;
    const popupHeight = 250;
    let leftPos = rect.right - popupWidth;
    if (leftPos < 10) leftPos = 10;
    if (leftPos + popupWidth > window.innerWidth) leftPos = Math.max(10, window.innerWidth - popupWidth - 10);
    let topPos = rect.bottom + 6;
    if (topPos + popupHeight > window.innerHeight) topPos = Math.max(10, rect.top - popupHeight - 6);
    setCardDatePos({ top: topPos, left: leftPos });
    setOpenCardAssigneeDropdown(null);
    setOpenCardPriorityDropdown(null);
    setOpenCardDateDropdown(cardKey);
  };

  // Moves a task to another day. The change is recorded in the ticket's History, and the
  // on-time check uses the new date from then on.
  const handleRescheduleCard = (card, newDate) => {
    setOpenCardDateDropdown(null);
    if (!newDate) return;
    const current = getIssueDateParts(card.due_date || card.start_date);
    if (current === newDate) return;
    const label = new Date(`${newDate}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });

    if (card.isSubtask) {
      const parent = allRawIssues.find(i => (i.issue_key === card.parentKey || i.key === card.parentKey));
      if (!parent) return;
      let curSt = parent.subtasks;
      if (typeof curSt === 'string') {
        try { curSt = JSON.parse(curSt); } catch (err) { curSt = []; }
      }
      const updated = (Array.isArray(curSt) ? curSt : []).map(st => String(st.id) === String(card.subtaskId) ? { ...st, due_date: newDate } : st);
      updateIssue(card.parentKey, { subtasks: updated });
      showSuccessToast(`${card.key} moved to ${label}`);
      return;
    }

    const updates = { due_date: newDate };
    // A start date after the new due date would be invalid, so it moves with it.
    const start = getIssueDateParts(card.start_date);
    if (start && start > newDate) updates.start_date = newDate;
    updateIssue(card.key, updates);
    showSuccessToast(`${card.key} moved to ${label}`);
  };

  const handleUpdateCardPriority = (card, priority) => {
    setOpenCardPriorityDropdown(null);
    if (card.priority === priority) return;

    // A subtask card's priority lives in its parent's subtasks list, not in its own row.
    if (card.isSubtask) {
      const parent = allRawIssues.find(i => (i.issue_key === card.parentKey || i.key === card.parentKey));
      if (!parent) return;
      let curSt = parent.subtasks;
      if (typeof curSt === 'string') {
        try { curSt = JSON.parse(curSt); } catch (err) { curSt = []; }
      }
      const updated = (Array.isArray(curSt) ? curSt : []).map(s => String(s.id) === String(card.subtaskId) ? { ...s, priority } : s);
      updateIssue(card.parentKey, { subtasks: updated });
      return;
    }

    updateIssue(card.key, { priority });
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

  const handleUpdateCardAssignee = async (issueKey, newAssignee, card = null) => {
    const normAssignee = (!newAssignee || newAssignee === 'Unassigned' || newAssignee === 'Automatic') ? 'Unassigned' : newAssignee;

    if (card && card.isSubtask) {
      setOpenCardAssigneeDropdown(null);
      const parent = allRawIssues.find(i => (i.issue_key === card.parentKey || i.key === card.parentKey));
      if (parent) {
        let curSt = parent.subtasks;
        if (typeof curSt === 'string') {
          try { curSt = JSON.parse(curSt); } catch (e) { curSt = []; }
        }
        const updated = (Array.isArray(curSt) ? curSt : []).map(s =>
          String(s.id) === String(card.subtaskId) ? { ...s, assignee: normAssignee } : s
        );
        updateIssue(card.parentKey, { subtasks: updated });
        showSuccessToast(normAssignee === 'Unassigned' ? 'Subtask unassigned' : `Assigned subtask to ${normAssignee}`);
      }
      return;
    }

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
    const deptParam = 'ALL';
    const roleParam = encodeURIComponent(user?.role || designation || '');
    // Which sprints are running determines what the board is allowed to show.
    fetch(`${API_BASE_URL}/sprints?lite=true&department=${encodeURIComponent(deptParam)}&role=${roleParam}&_t=${bust}`, { cache: 'no-store' })
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
  }, [currentDept, isManager, user?.role, designation]);

  const itUsersList = React.useMemo(() => {
    const SYSTEM_DUMMY_USERNAMES = ['admin', 'leads', 'deals', 'sales', 'marketing', 'it', 'accounting'];
    return usersList.filter(u => {
      const un = (u.username || '').toLowerCase();
      if (SYSTEM_DUMMY_USERNAMES.includes(un)) return false;
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

    // Board shows ONLY tasks in running sprint(s); backlog tasks remain in Backlog view
    const deptActiveSprints = activeSprints;

    if (deptActiveSprints.length > 0) {
      const runningIds = new Set(deptActiveSprints.map(s => Number(s.id)));
      filtered = filtered.filter(issue =>
        Boolean(issue.sprint_id) && (
          runningIds.has(Number(issue.sprint_id)) ||
          issue.sprint_status === 'Active'
        )
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
    if (selectedLabels.length > 0) {
      filtered = filtered.filter(issueHasSelectedLabel);
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
          const aLower = normalizePerson(a);
          const assLower = normalizePerson(issue.assignee);
          const repLower = normalizePerson(issue.reporter);
          const matchAssignee = assLower === aLower || (aLower.includes(' ') && assLower.includes(aLower));
          const matchReporter = repLower === aLower || (aLower.includes(' ') && repLower.includes(aLower));
          return matchAssignee || matchReporter;
        });
      });
    }

    const isPersonMatch = (personString) => {
      if (!personString) return false;
      const pNorm = normalizePerson(personString);
      if (!pNorm || pNorm === 'unassigned' || pNorm === 'automatic' || pNorm === 'none') return false;

      // 1. Exact match against myIdentities
      if (myIdentities.includes(pNorm)) return true;

      // 2. Multi-word or full-term substring match (e.g. "Purvesh Patil (Tester)" contains "purvesh patil")
      // NEVER match an isolated surname like "patil", which collides with other colleagues!
      for (const term of myIdentities) {
        if (term.includes(' ') || term === username?.toLowerCase() || (user?.email && term === user.email.toLowerCase())) {
          if (pNorm.includes(term)) return true;
        }
      }

      return false;
    };

    const isAssignedToMe = (issue) => {
      return isPersonMatch(issue.assignee) || isPersonMatch(issue.reporter);
    };

    const isTaskAssigned = (issue) => {
      if (!issue || !issue.assignee) return false;
      const a = String(issue.assignee).trim().toLowerCase();
      return a !== '' && a !== 'unassigned' && a !== 'automatic' && a !== 'none' && a !== 'null' && a !== 'undefined';
    };

    // Managers see all tasks (both assigned and unassigned), and can narrow with the "Only My Tasks" toggle.
    // Unassigned tasks are ONLY visible to the manager. Employees / non-managers only see assigned tasks.
    const shouldFilterOnlyMy = onlyMyIssues && selectedAssignees.length === 0;
    if (!isManager) {
      filtered = filtered.filter(issue => isTaskAssigned(issue));
      if (shouldFilterOnlyMy) {
        filtered = filtered.filter(issue => isAssignedToMe(issue));
      }
    } else if (shouldFilterOnlyMy) {
      filtered = filtered.filter(issue => isAssignedToMe(issue));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(issue =>
        (issue.title && issue.title.toLowerCase().includes(q)) ||
        (issue.issue_key && issue.issue_key.toLowerCase().includes(q)) ||
        (issue.assignee && issue.assignee.toLowerCase().includes(q)) ||
        (issue.reporter && issue.reporter.toLowerCase().includes(q))
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
        created_at: issue.created_at,
        description: issue.description,
        subtasks: issue.subtasks,
        linked_issues: issue.linked_issues,
        comments: issue.comments,
        project_id: issue.project_id
      });
    });

    // Also populate subtasks as individual cards on the Kanban board, belonging to their parent task
    const todayStr = getTodayStr();
    const tomorrowStr = getTomorrowStr();
    const { start: weekStart, end: weekEnd } = getThisWeekRange();
    const { start: monthStart, end: monthEnd } = getThisMonthRange();

    allRawIssues.forEach(issue => {
      // Check sprint membership if active sprints exist - only subtasks belonging to active sprint tasks
      if (deptActiveSprints.length > 0) {
        const runningIds = new Set(deptActiveSprints.map(s => Number(s.id)));
        const inActiveSprint = Boolean(issue.sprint_id) && (
          runningIds.has(Number(issue.sprint_id)) ||
          issue.sprint_status === 'Active'
        );
        if (!inActiveSprint) return;
      }
      if (selectedProjectId !== 'ALL' && Number(issue.project_id) !== Number(selectedProjectId)) {
        return;
      }
      if (selectedType !== 'ALL' && selectedType !== 'Task') {
        return;
      }

      let rawSt = issue.subtasks;
      if (typeof rawSt === 'string') {
        try { rawSt = JSON.parse(rawSt); } catch (e) { rawSt = []; }
      }
      if (!Array.isArray(rawSt) || rawSt.length === 0) return;

      // Subtasks follow their parent ticket's labels.
      if (selectedLabels.length > 0 && !issueHasSelectedLabel(issue)) return;

      rawSt.forEach((st, idx) => {
        const stStatus = (st.completed ? 'DONE' : (st.status || 'TO DO')).toUpperCase();
        if (selectedStatus !== 'ALL' && stStatus !== selectedStatus.toUpperCase()) {
          return;
        }
        if (selectedPriority !== 'ALL' && (st.priority || 'Medium') !== selectedPriority) {
          return;
        }

        const stAssignee = st.assignee || 'Unassigned';
        if (selectedAssignees.length > 0) {
          const isUnass = !stAssignee || stAssignee === 'Unassigned' || stAssignee === 'Automatic';
          if (!selectedAssignees.includes('UNASSIGNED') && isUnass) return;
          const matches = (selectedAssignees.includes('UNASSIGNED') && isUnass) ||
            selectedAssignees.some(a => {
              if (a === 'UNASSIGNED') return false;
              const aLower = normalizePerson(a);
              const assLower = normalizePerson(stAssignee);
              const repLower = normalizePerson(issue.reporter);
              const matchAss = assLower === aLower || (aLower.includes(' ') && assLower.includes(aLower));
              const matchRep = repLower === aLower || (aLower.includes(' ') && repLower.includes(aLower));
              return matchAss || matchRep;
            });
          if (!matches) return;
        }

        const isStAssignedToMe = (stAss) => {
          return isPersonMatch(stAss) || isPersonMatch(issue.reporter);
        };

        const isStAssigned = (stAss) => {
          if (!stAss) return false;
          const a = String(stAss).trim().toLowerCase();
          return a !== '' && a !== 'unassigned' && a !== 'automatic' && a !== 'none' && a !== 'null' && a !== 'undefined';
        };

        const shouldFilterOnlyMy = onlyMyIssues && selectedAssignees.length === 0;
        if (!isManager) {
          if (!isStAssigned(stAssignee)) return; // Unassigned subtasks are strictly visible to managers only
          if (shouldFilterOnlyMy && !isStAssignedToMe(stAssignee)) return;
        } else if (shouldFilterOnlyMy && !isStAssignedToMe(stAssignee)) {
          return;
        }

        const stKey = st.subtaskKey || `${issue.issue_key || issue.key}-${idx + 1}`;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            (st.title && st.title.toLowerCase().includes(q)) ||
            stKey.toLowerCase().includes(q) ||
            (stAssignee && stAssignee.toLowerCase().includes(q)) ||
            (issue.reporter && issue.reporter.toLowerCase().includes(q)) ||
            (issue.issue_key && issue.issue_key.toLowerCase().includes(q)) ||
            (issue.title && issue.title.toLowerCase().includes(q));
          if (!matches) return;
        }

        const stStart = st.start_date || issue.start_date;
        const stDue = st.due_date || issue.due_date;
        if (dateFilter !== 'ALL') {
          const startStr = getIssueDateParts(stStart);
          const dueStr = getIssueDateParts(stDue);
          const hasAnyDate = Boolean(startStr || dueStr);

          if (dateFilter === 'NO_DATE' && hasAnyDate) return;
          if (dateFilter === 'OVERDUE') {
            if (isDoneStatus(stStatus)) return;
            if (!stDue || !isPastDate(stDue)) return;
          }
          if (dateFilter !== 'NO_DATE' && dateFilter !== 'OVERDUE') {
            if (!hasAnyDate) return;
            const minDate = startStr && dueStr ? (startStr <= dueStr ? startStr : dueStr) : (startStr || dueStr);
            const maxDate = startStr && dueStr ? (startStr <= dueStr ? dueStr : startStr) : (dueStr || startStr);
            if (dateFilter === 'TODAY' && !(minDate <= todayStr && todayStr <= maxDate)) return;
            if (dateFilter === 'TOMORROW' && !(minDate <= tomorrowStr && tomorrowStr <= maxDate)) return;
            if (dateFilter === 'THIS_WEEK' && !(minDate <= weekEnd && maxDate >= weekStart)) return;
            if (dateFilter === 'THIS_MONTH' && !(minDate <= monthEnd && maxDate >= monthStart)) return;
            if (dateFilter === 'EXACT' && exactDate && !(minDate <= exactDate && exactDate <= maxDate)) return;
            if (dateFilter === 'RANGE' && (rangeStart || rangeEnd)) {
              const rStart = rangeStart || '1970-01-01';
              const rEnd = rangeEnd || '2999-12-31';
              if (!(minDate <= rEnd && maxDate >= rStart)) return;
            }
          }
        }

        const targetCol = newBoard[stStatus] ? stStatus : (newBoard['TO DO'] ? 'TO DO' : (columnOrder[0] || 'TO DO'));
        newBoard[targetCol].push({
          ...issue,
          id: `subtask-${st.id || idx}`,
          key: stKey,
          issue_key: stKey,
          subtaskId: st.id,
          isSubtask: true,
          parentKey: issue.issue_key || issue.key,
          parentTitle: issue.title,
          title: st.title,
          type: 'Task',
          priority: st.priority || 'Medium',
          status: stStatus,
          assignee: stAssignee,
          reporter: issue.reporter,
          subtasks: [],
          description: st.description || '',
          created_at: st.created_at || issue.created_at,
          due_date: stDue,
          start_date: stStart
        });
      });
    });

    // Sort cards in each column by the date shown on the card, earliest first (1st → 30th),
    // so the board reads in calendar order. Undated cards go last.
    const cardSortDate = (c) =>
      getIssueDateParts(c.due_date || c.dueDate) || getIssueDateParts(c.start_date) || getIssueEffectiveDateStr(c);
    Object.keys(newBoard).forEach(col => {
      newBoard[col].sort((a, b) => {
        const dateA = cardSortDate(a);
        const dateB = cardSortDate(b);
        if (dateA && dateB && dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;

        const timeA = a.created_at ? new Date(a.created_at).getTime() : (Number(a.id) || 0);
        const timeB = b.created_at ? new Date(b.created_at).getTime() : (Number(b.id) || 0);
        if (timeA && timeB && timeA !== timeB) {
          return timeA - timeB;
        }

        return (Number(a.id) || 0) - (Number(b.id) || 0);
      });
    });

    setBoardData(newBoard);
  }, [allRawIssues, activeSprints, columnOrder, selectedProjectId, selectedType, selectedStatus, selectedPriority, selectedLabels, selectedAssignees, onlyMyIssues, isManager, userSearchTerms, myIdentities, searchQuery, username, dateFilter, exactDate, rangeStart, rangeEnd]);

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
  const [selectedSubtaskKey, setSelectedSubtaskKey] = useState(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isKanbanConfigOpen, setIsKanbanConfigOpen] = useState(false);

  // Time Tracking Modal State
  const [isTimeTrackingModalOpen, setIsTimeTrackingModalOpen] = useState(false);
  const [timeTrackingTask, setTimeTrackingTask] = useState(null);
  const [pendingDragResult, setPendingDragResult] = useState(null);
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
      if (openCardPriorityDropdown && !e.target.closest('.card-priority-dropdown')) {
        setOpenCardPriorityDropdown(null);
      }
      if (openCardDateDropdown && !e.target.closest('.card-date-dropdown')) {
        setOpenCardDateDropdown(null);
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
  }, [activeCreateColumn, activeFilterDropdown, openCardAssigneeDropdown, openCardPriorityDropdown, openCardDateDropdown, openSubtasksPopover, showSprintDetails]);


  const handleCreateInlineIssue = async (col) => {
    if (!newIssueTitle.trim()) return;

    const currentUserName = user ? (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.name) : (username || 'Unassigned');
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
    const rawMatch = allRawIssues.find(i => !i.isSubtask && (i.issue_key === selectedIssue || i.key === selectedIssue));
    let cardMatch = null;
    Object.values(boardData).forEach(col => {
      const found = col.find(c => !c.isSubtask && (c.key === selectedIssue || c.issue_key === selectedIssue));
      if (found) cardMatch = found;
    });

    if (rawMatch || cardMatch) {
      const merged = { ...(rawMatch || {}), ...(cardMatch || {}) };
      // Always guarantee that the main issue's full subtasks array is preserved
      if (rawMatch && Array.isArray(rawMatch.subtasks) && rawMatch.subtasks.length > 0) {
        merged.subtasks = rawMatch.subtasks;
      }
      selectedIssueData = merged;
    }
  }


  const updateIssue = async (key, updates) => {
    // Only the reporter of a task may move it to DONE
    if (updates.status && String(updates.status).toUpperCase() === 'DONE') {
      const targetIssue = allRawIssues.find(i => i.issue_key === key || i.key === key);
      const rep = targetIssue?.reporter;
      if (!isUserTaskReporter(rep, user, myIdentities)) {
        Swal.fire({
          icon: 'warning',
          title: 'Only Reporter Can Mark Done',
          text: `Only the reporter of this task (${rep || 'Reporter'}) can move it to Done.`
        });
        return;
      }
    }

    // Optimistic update locally
    setBoardData(prev => {
      const next = { ...prev };
      let foundCol = null;
      let foundIdx = -1;

      // Find issue (must not be a subtask card)
      for (const col of Object.keys(next)) {
        const idx = next[col].findIndex(c => !c.isSubtask && (c.key === key || c.issue_key === key));
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
        const okData = await res.clone().json().catch(() => ({}));
        if (okData.pendingEstimate) {
          // The plan was above the limit: it is waiting for a manager, the ticket is unchanged.
          Swal.fire({ icon: 'info', title: 'Sent for approval', text: `${okData.pendingEstimate.requested} is more than 1.5× the standard for ${okData.pendingEstimate.workType} (${okData.pendingEstimate.standardHours} h). Your manager has been asked to approve it.` });
          fetchKanbanData();
        }
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
        } else if (data.code === 'REPORTER_ONLY') {
          Swal.fire({
            icon: 'warning',
            title: 'Only Reporter Can Mark Done',
            text: data.error || 'Only the reporter of this task can move it to Done.'
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
    if (!canDelete) {
      showErrorToast(TICKET_DELETE_DENIED_MESSAGE);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/it-kanban/issues/${key}`, { method: 'DELETE', headers: ticketDeleteHeaders(user) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showErrorToast(data.error || 'Failed to delete ticket');
        return;
      }

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
      const newStatus = destination.droppableId;
      const isMovingToDone = String(newStatus || '').toUpperCase() === 'DONE';

      // Check reporter-only rule when moving to DONE
      if (isMovingToDone) {
        const itemToCheck = (boardData[source.droppableId] || [])[source.index];
        if (itemToCheck) {
          let taskReporter = itemToCheck.reporter;
          if (itemToCheck.isSubtask) {
            const parent = allRawIssues.find(i => (i.issue_key === itemToCheck.parentKey || i.key === itemToCheck.parentKey));
            taskReporter = itemToCheck.reporter || parent?.reporter;
          }
          if (!isUserTaskReporter(taskReporter, user, myIdentities)) {
            Swal.fire({
              icon: 'warning',
              title: 'Only Reporter Can Mark Done',
              text: `Only the reporter of this task (${taskReporter || 'Reporter'}) can move it to Done.`
            });
            return;
          }
        }
      }

      const sourceCol = [...(boardData[source.droppableId] || [])];
      const destCol = [...(boardData[destination.droppableId] || [])];
      const [removed] = sourceCol.splice(source.index, 1);
      if (!removed) return;

      if (removed.isSubtask) {
        removed.status = newStatus;
        destCol.splice(destination.index, 0, removed);
        setBoardData({
          ...boardData,
          [source.droppableId]: sourceCol,
          [destination.droppableId]: destCol
        });

        // Update the parent's subtasks array in allRawIssues and DB
        const parent = allRawIssues.find(i => (i.issue_key === removed.parentKey || i.key === removed.parentKey));
        let parentSubtasks = [];
        if (parent?.subtasks) {
          if (typeof parent.subtasks === 'string') {
            try { parentSubtasks = JSON.parse(parent.subtasks); } catch (e) { parentSubtasks = []; }
          } else if (Array.isArray(parent.subtasks)) {
            parentSubtasks = [...parent.subtasks];
          }
        }

        const isDone = newStatus.toUpperCase() === 'DONE';
        const updatedSubtasks = parentSubtasks.map(st => {
          if (String(st.id) === String(removed.subtaskId)) {
            return {
              ...st,
              status: newStatus,
              completed: isDone
            };
          }
          return st;
        });

        updateIssue(removed.parentKey, { subtasks: updatedSubtasks });
        return;
      }

      if (newStatus === 'IN PROGRESS') {
        setPendingDragResult(result);
        setTimeTrackingTask(removed);
        setIsTimeTrackingModalOpen(true);
        return;
      }

      // Update the card's status to match the new column
      removed.status = newStatus;
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
      updateIssue(removed.key || removed.issue_key, { status: newStatus });
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

  const handleTimeTrackingConfirm = (timeData) => {
    if (!pendingDragResult || !timeTrackingTask) return;

    const { source, destination } = pendingDragResult;
    const sourceCol = [...(boardData[source.droppableId] || [])];
    const destCol = [...(boardData[destination.droppableId] || [])];
    const [removed] = sourceCol.splice(source.index, 1);

    if (!removed) {
      setIsTimeTrackingModalOpen(false);
      setPendingDragResult(null);
      setTimeTrackingTask(null);
      return;
    }

    const newStatus = destination.droppableId;
    removed.status = newStatus;

    destCol.splice(destination.index, 0, removed);
    setBoardData({
      ...boardData,
      [source.droppableId]: sourceCol,
      [destination.droppableId]: destCol
    });

    // Also update with timer data
    const updatePayload = {
      status: newStatus,
      is_timer_running: true,
      timer_start_time: timeData.start_time
    };

    if (timeData.estimated_time) {
      updatePayload.original_estimate = timeData.estimated_time;
      // We can optimistically update the local issue state
      removed.original_estimate = timeData.estimated_time;
    }
    removed.is_timer_running = true;
    removed.timer_start_time = timeData.start_time;

    updateIssue(removed.key || removed.issue_key, updatePayload);

    setIsTimeTrackingModalOpen(false);
    setPendingDragResult(null);
    setTimeTrackingTask(null);
  };

  const handleTimeTrackingCancel = () => {
    // Just revert the UI state (do nothing to boardData)
    setIsTimeTrackingModalOpen(false);
    setPendingDragResult(null);
    setTimeTrackingTask(null);
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

      <TimeTrackingModal
        isOpen={isTimeTrackingModalOpen}
        onClose={handleTimeTrackingCancel}
        onConfirm={handleTimeTrackingConfirm}
        taskDetails={timeTrackingTask}
      />
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
                onClick={() => {
                  setCreateDrawerInitialStatus(null);
                  setCreateDrawerInitialSummary('');
                  setIsCreateDrawerOpen(true);
                }}
                className="bg-red-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <Plus size={14} /> Create
              </button>
            </div>
          </div>

          <BoardTabs department={currentDept} />

          <div className="flex-1 overflow-hidden flex relative">
            <div className="flex-1 flex flex-col p-4 pb-0 min-w-0 bg-white">

              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div className="flex-1 min-w-0">
                  {/* No sprint name or status here: Jira's board header carries only the
                      toolbar and the Complete sprint button. Which sprints are running is
                      the Backlog's job to show. */}
                  <div className="flex items-center gap-2 flex-wrap relative">

                    {/* JIRA USER AVATAR BUBBLES */}
                    <div className="flex items-center -space-x-1.5 mr-1">
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
                          'bg-red-600 text-white',
                          'bg-purple-600 text-white',
                          'bg-amber-600 text-white',
                          'bg-pink-600 text-white',
                          'bg-red-600 text-white',
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
                                setOnlyMyIssues(false);
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
                    <div className="w-40">
                      <SearchableSelect
                        prefix="Project:"
                        buttonClassName={`h-8 px-2.5 rounded text-xs font-medium border transition-colors whitespace-nowrap ${selectedProjectId !== 'ALL' ? 'bg-blue-50 border-blue-200 text-blue-700 ' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
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
                        className={`flex items-center gap-1.5 h-8 px-2.5 rounded text-xs font-medium border whitespace-nowrap hover:bg-gray-50 transition-colors ${selectedStatus !== 'ALL' ? 'bg-blue-50 border-blue-200 text-blue-700 ' : 'bg-white border-gray-300 text-gray-700'}`}
                      >
                        Status: {selectedStatus !== 'ALL' ? selectedStatus : 'All'} <ChevronDown size={14} />
                      </button>
                      {activeFilterDropdown === 'status' && (
                        <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded shadow-xl py-1 z-50 text-xs text-gray-700">
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
                        className={`flex items-center gap-1.5 h-8 px-2.5 rounded text-xs font-medium border whitespace-nowrap hover:bg-gray-50 transition-colors ${selectedPriority !== 'ALL' ? 'bg-blue-50  ' : 'bg-white border-gray-300 text-gray-700'}`}
                      >
                        Priority: {selectedPriority !== 'ALL' ? selectedPriority : 'All'} <ChevronDown size={14} />
                      </button>
                      {activeFilterDropdown === 'priority' && (
                        <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded shadow-xl py-1 z-50 text-xs text-gray-700">
                          {['ALL', 'Critical', 'High', 'Medium', 'Low'].map(p => (
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

                    {/* Labels Filter Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => { setActiveFilterDropdown(activeFilterDropdown === 'labels' ? null : 'labels'); setLabelSearch(''); }}
                        className={`flex items-center gap-1.5 h-8 px-2.5 rounded text-xs font-medium border whitespace-nowrap hover:bg-gray-50 transition-colors ${selectedLabels.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700'}`}
                      >
                        Labels: {selectedLabels.length === 0 ? 'All' : selectedLabels.length === 1 ? selectedLabels[0] : `${selectedLabels.length} selected`} <ChevronDown size={14} />
                      </button>
                      {activeFilterDropdown === 'labels' && (() => {
                        // Every label in use, with how many tickets carry it ('content-calendar' only marks the source).
                        const counts = new Map();
                        allRawIssues.forEach(issue => labelsOf(issue).forEach(l => {
                          if (HIDDEN_CARD_LABELS.has(l.toLowerCase())) return;
                          counts.set(l, (counts.get(l) || 0) + 1);
                        }));
                        const q = labelSearch.trim().toLowerCase();
                        const options = [...counts.entries()]
                          .filter(([l]) => !q || l.toLowerCase().includes(q))
                          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
                        const toggle = (l) => setSelectedLabels(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
                        return (
                          <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded shadow-xl z-50 text-xs text-gray-700">
                            <div className="p-2 border-b border-gray-100">
                              <input
                                autoFocus
                                value={labelSearch}
                                onChange={(e) => setLabelSearch(e.target.value)}
                                placeholder="Search labels..."
                                className="w-full border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="max-h-64 overflow-y-auto py-1">
                              {options.length === 0 ? (
                                <div className="px-3 py-2 text-gray-400">No labels found</div>
                              ) : options.map(([l, n]) => (
                                <label key={l} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer select-none">
                                  <input type="checkbox" checked={selectedLabels.includes(l)} onChange={() => toggle(l)} />
                                  <span className={`px-1.5 py-0.5 rounded ring-1 ring-inset text-[10px] font-semibold uppercase tracking-wide truncate max-w-[150px] ${getLabelStyle(l).chip}`}>{l}</span>
                                  <span className="ml-auto text-gray-400 tabular-nums">{n}</span>
                                </label>
                              ))}
                            </div>
                            {selectedLabels.length > 0 && (
                              <div className="p-2 border-t border-gray-100 flex justify-between">
                                <button onClick={() => setSelectedLabels([])} className="text-red-600 hover:underline cursor-pointer">Clear</button>
                                <button onClick={() => setActiveFilterDropdown(null)} className="text-blue-600 font-medium hover:underline cursor-pointer">Done</button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Date Filter Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'date' ? null : 'date')}
                        className={`flex items-center gap-1.5 h-8 px-2.5 rounded text-xs font-medium border whitespace-nowrap hover:bg-gray-50 transition-colors ${dateFilter !== 'ALL' ? 'bg-blue-50 border-blue-200 text-blue-700 ' : 'bg-white border-gray-300 text-gray-700'}`}
                        title="Filter issues date wise"
                      >
                        <Calendar size={13} className={dateFilter !== 'ALL' ? 'text-blue-600' : 'text-gray-500'} />
                        <span>{getDateFilterLabel()}</span>
                        <ChevronDown size={14} />
                      </button>
                      {activeFilterDropdown === 'date' && (
                        <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded shadow-xl p-3 z-50 text-xs text-gray-700 font-sans">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                            <span className=" text-gray-800 flex items-center gap-1.5">
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
                              <label className="block text-[11px]  text-gray-600 mb-1">
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
                              <label className="block text-[11px]  text-gray-600 mb-1">
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
                                className="px-3 py-1 bg-red-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Assignee Filter (Searchable Select) */}
                    <div className="w-40">
                      <SearchableSelect
                        prefix="Assignee:"
                        multiple={true}
                        buttonClassName={`h-8 px-2.5 rounded text-xs font-medium border transition-colors whitespace-nowrap ${selectedAssignees.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 ' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
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
                        onChange={(val) => {
                          const nextAssignees = Array.isArray(val) ? val : (val && val !== 'ALL' ? [val] : []);
                          setSelectedAssignees(nextAssignees);
                          if (nextAssignees.length > 0) {
                            setOnlyMyIssues(false);
                          }
                        }}
                        placeholder="All"
                      />
                    </div>

                    <span className="w-px h-6 bg-gray-200 mx-1" aria-hidden="true" />

                    {/* Only My Tasks Quick Filter Pill — Visible to All */}
                    <button
                      onClick={() => {
                        const nextVal = !onlyMyIssues;
                        setOnlyMyIssues(nextVal);
                        if (nextVal) {
                          setSelectedAssignees([]);
                        }
                      }}
                      className={`flex items-center gap-1.5 h-8 px-3 rounded text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${onlyMyIssues
                        ? 'bg-red-600 border-red-600 text-white shadow-sm'
                        : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                        }`}
                      title="Show only tasks assigned to me"
                    >
                      <User size={13} />
                      Only My Tasks
                    </button>

                    {/* Clear Filters reset button */}
                    {(selectedProjectId !== 'ALL' || selectedType !== 'ALL' || selectedStatus !== 'ALL' || selectedPriority !== 'ALL' || selectedLabels.length > 0 || selectedAssignees.length > 0 || onlyMyIssues || searchQuery || dateFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSelectedProjectId('ALL');
                          setSelectedType('ALL');
                          setSelectedStatus('ALL');
                          setSelectedPriority('ALL');
                          setSelectedLabels([]);
                          setSelectedAssignees([]);
                          setOnlyMyIssues(false);
                          setSearchQuery('');
                          setDateFilter('ALL');
                          setExactDate('');
                          setRangeStart('');
                          setRangeEnd('');
                        }}
                        className="h-8 px-1 text-xs text-red-600 font-medium hover:underline whitespace-nowrap cursor-pointer"
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
                <div className="flex items-center gap-2 shrink-0">
                  {/* Sprint controls are manager-only; employees just work the board. */}
                  {isManager && activeSprints.length > 0 && (
                    <>
                      <button
                        onClick={() => setIsCompletingSprint(true)}
                        className="h-8 px-3 text-xs font-semibold rounded bg-red-600 text-white hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Complete sprint
                      </button>

                      {/* Jira's sprint details popover: what is running, and how long is left. */}
                      <div className="relative sprint-details-popover">
                        <button
                          onClick={() => setShowSprintDetails(!showSprintDetails)}
                          title="Sprint details"
                          className={`h-8 w-8 flex items-center justify-center rounded border transition-colors cursor-pointer ${showSprintDetails
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                          <IterationCw size={16} />
                        </button>

                        {showSprintDetails && (
                          <div className="absolute right-0 top-full mt-2 w-[350px] bg-white border border-gray-200 rounded shadow-xl z-50 p-5 max-h-[70vh] overflow-y-auto">
                            {activeSprints.map((s, i) => (
                              <div key={s.id} className={i > 0 ? 'mt-5 pt-5 border-t border-gray-200' : ''}>
                                <h4 className="text-[15px]  text-gray-900">{s.name}</h4>
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
                  <button className="h-8 px-3 flex items-center gap-1.5 rounded border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap cursor-pointer"><Download size={14} /> Export</button>
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
                      <h3 className="text-base  text-gray-900 mb-1">Get started in the backlog</h3>
                      <p className="text-sm text-gray-500 mb-4">Plan and start a sprint to see work items here.</p>
                      <button
                        onClick={() => navigate(`${workspaceBase}/backlog`)}
                        className="p-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Go to Backlog
                      </button>
                    </>
                  ) : (
                    // Employees cannot open the Backlog, so pointing them there would dead-end.
                    <>
                      <h3 className="text-base  text-gray-900 mb-1">No work items yet</h3>
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
                          className="flex gap-4 overflow-x-auto overflow-y-hidden h-full items-stretch no-scrollbar"
                        >
                          {columnOrder.map((col, index) => (
                            <Draggable key={col} draggableId={col} index={index}>
                              {(provided) => {
                                const colBg = COLUMN_COLORS[col] || 'bg-gray-50';
                                return (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`flex-1 min-w-[300px] ${colBg} rounded p-2 flex flex-col`}
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
                                          {(boardData[col] || []).slice(0, limitFor(col)).map((card, idx) => (
                                            <Draggable key={card.key} draggableId={card.key} index={idx}>
                                              {(provided, snapshot) => (
                                                <div
                                                  ref={provided.innerRef}
                                                  {...provided.draggableProps}
                                                  {...provided.dragHandleProps}
                                                  onClick={() => {
                                                    if (card.isSubtask) {
                                                      setSelectedIssue(card.parentKey);
                                                      setSelectedSubtaskKey(card.subtaskId || card.key);
                                                    } else {
                                                      setSelectedIssue(card.key);
                                                      setSelectedSubtaskKey(null);
                                                    }
                                                  }}
                                                  style={{
                                                    ...provided.draggableProps.style,
                                                  }}
                                                  className={`relative group bg-white border border-gray-200 border-l-4 ${getLabelStyle(getCardLabels(card)[0]).accent} rounded px-3 pt-2.5 pb-2 ${(selectedIssue === card.key || (card.isSubtask && selectedIssue === card.parentKey && String(selectedSubtaskKey) === String(card.subtaskId))) ? 'ring-2 ring-blue-500 shadow-sm' : ''} ${snapshot.isDragging ? 'shadow-lg' : 'shadow-sm hover:shadow-md transition-shadow duration-150'}`}
                                                >
                                                  {/* Delete Trash Button (managers only) */}
                                                  {canDelete && <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (card.isSubtask) {
                                                        if (window.confirm(`Are you sure you want to delete subtask "${card.title}"?`)) {
                                                          const parent = allRawIssues.find(i => (i.issue_key === card.parentKey || i.key === card.parentKey));
                                                          if (parent) {
                                                            let curSt = parent.subtasks;
                                                            if (typeof curSt === 'string') {
                                                              try { curSt = JSON.parse(curSt); } catch (err) { curSt = []; }
                                                            }
                                                            const updated = (Array.isArray(curSt) ? curSt : []).filter(s => String(s.id) !== String(card.subtaskId));
                                                            updateIssue(card.parentKey, { subtasks: updated });
                                                          }
                                                        }
                                                      } else {
                                                        if (window.confirm(`Are you sure you want to delete ticket ${card.key}?`)) {
                                                          deleteIssue(card.key);
                                                        }
                                                      }
                                                    }}
                                                    className="absolute top-2.5 right-2.5 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 cursor-pointer"
                                                    title={card.isSubtask ? "Delete Subtask" : "Delete Ticket"}
                                                  >
                                                    <Trash2 size={13} />
                                                  </button>}

                                                  {(() => {
                                                    const labels = getCardLabels(card);
                                                    const { client, text } = splitCardTitle(card);
                                                    return (
                                                      <>
                                                        {/* WORK-TYPE LABELS */}
                                                        {(labels.length > 0 || card.isSubtask) && (
                                                          <div className="flex items-center gap-1 mb-1.5 flex-wrap pr-6">
                                                            {card.isSubtask && (
                                                              <span className="text-[10px]  uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200">
                                                                Subtask
                                                              </span>
                                                            )}
                                                            {labels.map(label => (
                                                              <span
                                                                key={label}
                                                                title={label}
                                                                className={`text-[10px]  uppercase tracking-wide px-1.5 py-0.5 rounded ring-1 ring-inset max-w-[150px] truncate ${getLabelStyle(label).chip}`}
                                                              >
                                                                {label}
                                                              </span>
                                                            ))}
                                                          </div>
                                                        )}

                                                        {/* CLIENT + TITLE */}
                                                        {client && (
                                                          <div className="text-[11px] text-gray-500 font-medium truncate pr-6" title={client}>
                                                            {client}
                                                          </div>
                                                        )}
                                                        <div
                                                          className={`text-[13px] text-gray-900 font-medium leading-snug line-clamp-2 mb-2.5 cursor-grab active:cursor-grabbing ${labels.length === 0 && !client ? 'pr-6' : ''}`}
                                                          title={card.title}
                                                        >
                                                          {text}
                                                        </div>
                                                      </>
                                                    );
                                                  })()}

                                                  {/* FOOTER: key + priority | date + assignee */}
                                                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                      {TYPE_ICONS[card.type] || TYPE_ICONS.Task}
                                                      {/* Jira strikes through the key of a finished work item. */}
                                                      <span
                                                        className={`text-[11px]  text-gray-500 hover:text-blue-600 hover:underline cursor-pointer truncate ${isDoneStatus(card.status) ? 'line-through' : ''}`}
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          if (card.isSubtask) {
                                                            setSelectedIssue(card.parentKey);
                                                            setSelectedSubtaskKey(card.subtaskId || card.key);
                                                          } else {
                                                            setSelectedIssue(card.key);
                                                            setSelectedSubtaskKey(null);
                                                          }
                                                        }}
                                                      >
                                                        {card.key}
                                                      </span>
                                                      <div className="relative card-priority-dropdown shrink-0">
                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            if (!canManageWork && hasWorkStarted(card.status)) {
                                                              e.stopPropagation();
                                                              showErrorToast('Only a manager can change the priority once work has started');
                                                              return;
                                                            }
                                                            handleOpenCardPriority(e, card.key);
                                                          }}
                                                          className={`flex items-center gap-0.5 pl-0.5 pr-1 py-0.5 rounded text-[11px] text-gray-600 hover:bg-gray-100 transition cursor-pointer ${openCardPriorityDropdown === card.key ? 'bg-gray-100' : ''}`}
                                                          title={`Priority: ${card.priority || 'None'} (click to change)`}
                                                        >
                                                          {PRIORITY_ICONS[card.priority] || <ArrowUp size={14} className="text-gray-300" />}
                                                          <span>{card.priority || 'Set'}</span>
                                                        </button>

                                                        {openCardPriorityDropdown === card.key && (
                                                          <BodyPortal>
                                                            <div
                                                              onClick={(e) => e.stopPropagation()}
                                                              onMouseDown={(e) => e.stopPropagation()}
                                                              onPointerDown={(e) => e.stopPropagation()}
                                                              style={{
                                                                position: 'fixed',
                                                                top: `${cardPriorityPos.top}px`,
                                                                left: `${cardPriorityPos.left}px`,
                                                                width: '160px',
                                                                zIndex: 99999
                                                              }}
                                                              className="card-priority-dropdown bg-white border border-gray-200 rounded shadow-xl py-1 text-xs text-gray-700"
                                                            >
                                                              <div className="px-3 pt-1 pb-1.5 text-[10px]  uppercase tracking-wide text-gray-400">Priority</div>
                                                              {['Critical', 'High', 'Medium', 'Low'].map(p => (
                                                                <div
                                                                  key={p}
                                                                  onClick={() => handleUpdateCardPriority(card, p)}
                                                                  className={`px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-blue-50 transition-colors ${card.priority === p ? 'bg-[#deebff]  text-blue-900' : ''}`}
                                                                >
                                                                  {PRIORITY_ICONS[p]}
                                                                  <span>{p}</span>
                                                                  {card.priority === p && <Check size={14} className="text-blue-600 ml-auto" />}
                                                                </div>
                                                              ))}
                                                            </div>
                                                          </BodyPortal>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                      {/* Due / Start Date Badge */}
                                                      {(() => {
                                                        const value = card.due_date || card.start_date;
                                                        const text = formatDate(value);
                                                        const isDue = !!card.due_date;
                                                        const overdue = isDue && !isDoneStatus(card.status) && isPastDate(value);
                                                        // Anyone can set a missing date; moving a set date is for managers.
                                                        const canMove = !isDoneStatus(card.status) && (canManageWork || !card.due_date);
                                                        const dayStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                                        const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
                                                        // Next working day (Sunday is off).
                                                        const nextWorkingDay = () => { const d = addDays(1); if (d.getDay() === 0) d.setDate(d.getDate() + 1); return d; };
                                                        const nextMonday = () => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d; };
                                                        const current = getIssueDateParts(value);
                                                        const quick = [
                                                          ['Today', dayStr(new Date())],
                                                          ['Next working day', dayStr(nextWorkingDay())],
                                                          ['Next Monday', dayStr(nextMonday())],
                                                          ['In one week', dayStr(addDays(7))]
                                                        ];
                                                        if (!text && !canMove) return null;
                                                        return (
                                                          <div className="relative card-date-dropdown shrink-0">
                                                            <button
                                                              type="button"
                                                              onClick={(e) => canMove ? handleOpenCardDate(e, card.key) : e.stopPropagation()}
                                                              title={canMove ? `${text ? `${isDue ? 'Due' : 'Starts'} ${text}${overdue ? ' (overdue)' : ''}. ` : ''}Click to reschedule` : `${isDue ? 'Due' : 'Started'} ${text}`}
                                                              className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border transition ${canMove ? 'cursor-pointer hover:ring-1 hover:ring-blue-400' : 'cursor-default'} ${openCardDateDropdown === card.key ? 'ring-1 ring-blue-500' : ''} ${overdue
                                                                ? 'bg-red-50 text-red-700 border-red-200 font-medium'
                                                                : 'bg-gray-50 text-gray-600 border-gray-200'
                                                                }`}
                                                            >
                                                              <Calendar size={11} className={overdue ? 'text-red-500' : 'text-gray-500'} />
                                                              {text || 'Set date'}
                                                            </button>

                                                            {openCardDateDropdown === card.key && (
                                                              <BodyPortal>
                                                                <div
                                                                  className="card-date-dropdown bg-white border border-gray-200 rounded shadow-2xl p-3 text-xs text-gray-700 border-t-2 border-t-blue-500"
                                                                  onClick={(e) => e.stopPropagation()}
                                                                  onMouseDown={(e) => e.stopPropagation()}
                                                                  style={{ position: 'fixed', top: `${cardDatePos.top}px`, left: `${cardDatePos.left}px`, width: '250px', zIndex: 99999 }}
                                                                >
                                                                  <div className="font-semibold text-gray-900 mb-0.5">Reschedule {card.key}</div>
                                                                  <div className="text-[11px] text-gray-500 mb-2">{text ? `Currently ${isDue ? 'due' : 'starting'} ${text}` : 'No date set'}</div>
                                                                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                                                                    {quick.map(([label, d]) => (
                                                                      <button
                                                                        key={label}
                                                                        type="button"
                                                                        disabled={d === current}
                                                                        onClick={() => handleRescheduleCard(card, d)}
                                                                        className="px-2 py-1.5 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-left disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                                                      >
                                                                        <div className="font-medium text-gray-800">{label}</div>
                                                                        <div className="text-[10px] text-gray-500">{new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}</div>
                                                                      </button>
                                                                    ))}
                                                                  </div>
                                                                  <label className="block text-[11px] text-gray-600 mb-1" htmlFor={`resched-${card.key}`}>Or pick a date</label>
                                                                  <input
                                                                    id={`resched-${card.key}`}
                                                                    type="date"
                                                                    autoFocus
                                                                    min={dayStr(new Date())}
                                                                    defaultValue={current || ''}
                                                                    onChange={(e) => { if (e.target.value) handleRescheduleCard(card, e.target.value); }}
                                                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                                                                  />
                                                                  <p className="text-[10px] text-gray-400 mt-2">The change is saved in the ticket's History.</p>
                                                                </div>
                                                              </BodyPortal>
                                                            )}
                                                          </div>
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
                                                              : 'bg-red-600 text-white shadow-sm'
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
                                                            <BodyPortal>
                                                              <div
                                                                onClick={(e) => e.stopPropagation()}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                style={{
                                                                  position: 'fixed',
                                                                  top: `${cardAssigneePos.top}px`,
                                                                  left: `${cardAssigneePos.left}px`,
                                                                  width: '260px',
                                                                  zIndex: 99999
                                                                }}
                                                                className="card-assignee-dropdown bg-white border border-gray-200 rounded shadow-2xl py-1.5 text-xs text-gray-700 font-sans border-t-2 border-t-blue-500"
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
                                                                      className="w-full px-3 py-1.5 text-xs border-2 border-blue-500 rounded focus:outline-none bg-white text-gray-900 font-medium placeholder:text-gray-400"
                                                                    />
                                                                  </div>
                                                                  {card.assignee && card.assignee !== 'Unassigned' && (
                                                                    <div className="mt-1.5 px-0.5 flex items-center justify-between text-[11px] text-gray-500">
                                                                      <span className="truncate">Current: <strong className="text-gray-800 ">{card.assignee}</strong></span>
                                                                      <button
                                                                        type="button"
                                                                        onClick={() => handleUpdateCardAssignee(card.key, 'Unassigned', card)}
                                                                        className="text-red-600 hover:text-red-700 hover:underline  ml-2 shrink-0 cursor-pointer"
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
                                                                      onClick={() => handleUpdateCardAssignee(card.key, 'Unassigned', card)}
                                                                      className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition-colors ${card.assignee === 'Unassigned' || !card.assignee ? 'bg-[#deebff]  text-blue-900' : 'text-gray-700'
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
                                                                      handleUpdateCardAssignee(card.key, myName, card);
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
                                                                        handleUpdateCardAssignee(card.key, myName, card);
                                                                      }}
                                                                      className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition-colors ${card.assignee && (card.assignee.toLowerCase().includes((user.first_name || '').toLowerCase()) || card.assignee.toLowerCase() === user.username.toLowerCase())
                                                                        ? 'bg-[#deebff]  text-blue-900'
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
                                                                        'bg-red-600 text-white',
                                                                        'bg-purple-600 text-white',
                                                                        'bg-amber-600 text-white',
                                                                        'bg-pink-600 text-white',
                                                                        'bg-red-600 text-white',
                                                                        'bg-teal-600 text-white'
                                                                      ];
                                                                      const colorClass = colors[Number(u.id || 0) % colors.length];

                                                                      return (
                                                                        <div
                                                                          key={u.id || u.username}
                                                                          onClick={() => handleUpdateCardAssignee(card.key, fullName, card)}
                                                                          className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition-colors ${isCurrentAssignee ? 'bg-[#deebff] text-blue-900 ' : 'text-gray-700'
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
                                                            </BodyPortal>
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
                                          {(boardData[col] || []).length > limitFor(col) && (
                                            <button
                                              type="button"
                                              onClick={() => setColumnLimits(prev => ({ ...prev, [col]: limitFor(col) + CARD_PAGE }))}
                                              className="w-full py-2 text-xs font-medium text-gray-600 bg-white/70 border border-dashed border-gray-300 rounded hover:bg-white hover:text-gray-900 cursor-pointer"
                                            >
                                              Show more ({(boardData[col] || []).length - limitFor(col)} hidden)
                                            </button>
                                          )}
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
                                                <div className="absolute left-0 bottom-full mb-1.5 w-40 bg-white border border-gray-200 rounded shadow-xl py-1 z-50 text-xs text-gray-800 animate-in fade-in zoom-in-95 duration-100">
                                                  <div className="px-2.5 py-1 text-[10px]  text-gray-400 uppercase tracking-wider">
                                                    Work Type
                                                  </div>
                                                  {deptIssueTypes.map(type => (
                                                    <div
                                                      key={type}
                                                      onClick={() => {
                                                        setNewIssueType(type);
                                                        setOpenInlineDropdown(null);
                                                      }}
                                                      className={`px-2.5 py-1.5 hover:bg-blue-50 flex items-center gap-2 cursor-pointer font-medium ${newIssueType === type ? 'bg-[#deebff] text-blue-900 ' : 'text-gray-700'
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
                                                className={`px-1.5 py-1 rounded flex items-center gap-1 transition ${newIssueDueDate
                                                  ? 'bg-blue-50 text-blue-600 font-medium'
                                                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                                  }`}
                                                title={newIssueDueDate ? `Due: ${newIssueDueDate}` : "Set due date"}
                                              >
                                                <Calendar size={13} />
                                                {newIssueDueDate ? (
                                                  <span className="text-[11px] ">
                                                    {(() => {
                                                      const parts = newIssueDueDate.split('-');
                                                      if (parts.length === 3) {
                                                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                                        return `${parts[2]} ${months[parseInt(parts[1], 10) - 1] || parts[1]}`;
                                                      }
                                                      return newIssueDueDate;
                                                    })()}
                                                  </span>
                                                ) : null}
                                              </button>
                                              {openInlineDropdown === 'date' && (
                                                <div className="absolute left-0 bottom-full mb-2 w-64 bg-white border border-gray-200 rounded shadow-2xl p-3 z-50 text-gray-800 animate-in fade-in zoom-in-95 duration-100">
                                                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2.5">
                                                    <span className=" text-xs text-gray-700 flex items-center gap-1.5">
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
                                                className={`px-1 py-1 rounded flex items-center gap-1 transition ${newIssueAssignee && newIssueAssignee !== 'Unassigned'
                                                  ? 'bg-blue-50 text-blue-700'
                                                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                                                  }`}
                                                title={`Assignee: ${newIssueAssignee || 'Unassigned'}`}
                                              >
                                                {newIssueAssignee && newIssueAssignee !== 'Unassigned' && newIssueAssignee !== 'Automatic' ? (
                                                  <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] ">
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
                                                <div className="absolute left-0 bottom-full mb-2 w-64 bg-white border border-gray-200 rounded shadow-2xl py-1.5 z-50 text-xs text-gray-700 border-t-2 border-t-blue-500 animate-in fade-in zoom-in-95 duration-100">
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
                                                          className="text-red-600 hover:text-red-700 hover:underline  ml-2 shrink-0 cursor-pointer"
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
                                                        className={`px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition-colors ${newIssueAssignee === 'Unassigned' ? 'bg-[#deebff]  text-blue-900' : 'text-gray-700'
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
                                                        className={`px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition-colors ${newIssueAssignee === 'Automatic' ? 'bg-[#deebff]  text-blue-900' : 'text-gray-700'
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
                                                        className={`px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 border-b border-gray-100 transition-colors ${newIssueAssignee && (newIssueAssignee.toLowerCase() === (user.username || '').toLowerCase() || newIssueAssignee.toLowerCase().includes((user.first_name || '').toLowerCase()))
                                                          ? 'bg-[#deebff]  text-blue-900'
                                                          : 'text-gray-700'
                                                          }`}
                                                      >
                                                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px]  shrink-0">
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
                                                          'bg-red-600 text-white',
                                                          'bg-purple-600 text-white',
                                                          'bg-amber-600 text-white',
                                                          'bg-pink-600 text-white',
                                                          'bg-red-600 text-white',
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
                                                            className={`px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center gap-2.5 transition-colors ${isSelected ? 'bg-[#deebff] text-blue-900 ' : 'text-gray-700'
                                                              }`}
                                                          >
                                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px]  shrink-0 ${colorClass}`}>
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
                                                  <div className="absolute left-0 bottom-full mb-2 w-52 bg-white border border-gray-200 rounded shadow-xl py-1 z-50 text-xs">
                                                    <div className="px-2.5 py-1 text-[10px]  text-gray-400 uppercase tracking-wider">
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
                                                          className={`px-2.5 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center gap-2 truncate ${Number(newIssueProjectId) === Number(proj.id) ? 'bg-[#deebff]  text-blue-900' : 'text-gray-700'
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
                                              className={`p-1.5 rounded transition ${newIssueTitle.trim()
                                                ? 'bg-red-600 text-white hover:bg-blue-700 shadow-sm'
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
              deleteIssue={canDelete ? deleteIssue : undefined}
              onClose={() => {
                setSelectedIssue(null);
                setSelectedSubtaskKey(null);
              }}
              onIssueCreated={fetchKanbanData}
              department={currentDept}
              initialSubtaskKey={selectedSubtaskKey}
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

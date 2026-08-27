import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Search, Bell, HelpCircle, Settings, ChevronDown, ChevronRight,
  Share2, Download, MoreHorizontal, LayoutList, Plus, AlertCircle, ArrowUp, ArrowDown, CheckSquare,
  Trash2, User, Check, X
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import UniversalCreateIssueDrawer from './UniversalCreateIssueDrawer';
import ITIssueDetailsPanel from '../it/ITIssueDetailsPanel';
import { DEPARTMENT_KANBAN_CONFIG } from '../../config/departmentKanbanConfig';
import { API_BASE_URL } from '../../config/environment';

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
  Task: <CheckSquare size={14} className="text-blue-500 fill-blue-100" />,
  Story: <BookmarkIcon size={14} className="text-green-500 fill-green-100" />,
  Bug: <AlertCircle size={14} className="text-red-500 fill-red-100" />,
  Test: <TestTubeIcon size={14} className="text-purple-500 fill-purple-100" />,
  Campaign: <CheckSquare size={14} className="text-orange-500 fill-orange-100" />,
  Design: <CheckSquare size={14} className="text-purple-500 fill-purple-100" />,
  Video: <CheckSquare size={14} className="text-red-500 fill-red-100" />,
  Content: <CheckSquare size={14} className="text-green-500 fill-green-100" />
};

const COLUMN_COLORS = {
  'TO DO': 'bg-gray-100',
  'IN PROGRESS': 'bg-blue-50',
  'IN REVIEW': 'bg-purple-50',
  'TESTING': 'bg-orange-50',
  'APPROVAL / QA': 'bg-orange-50',
  'DONE': 'bg-green-50',
};

const CheckCircleIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

const getInitials = (name) => {
  if (!name || name === 'Unassigned') return 'U';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word[0].toUpperCase())
    .slice(0, 2)
    .join('');
};

const UniversalKanbanPage = ({ department = 'IT' }) => {
  const { user } = useAuth();
  const { designation, username } = useParams();
  const config = DEPARTMENT_KANBAN_CONFIG[department] || DEPARTMENT_KANBAN_CONFIG['IT'];

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

  const [boardData, setBoardData] = useState({
    'TO DO': [],
    'IN PROGRESS': [],
    'IN REVIEW': [],
    'TESTING': [],
    'DONE': []
  });
  const [columnOrder, setColumnOrder] = useState(() => {
    const saved = localStorage.getItem(`${department}_kanbanColumnOrder`);
    return saved ? JSON.parse(saved) : ['TO DO', 'IN PROGRESS', 'IN REVIEW', 'TESTING', 'DONE'];
  });

  const [allRawIssues, setAllRawIssues] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Filters
  const [selectedSpace, setSelectedSpace] = useState('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState('ALL');
  const [onlyMyIssues, setOnlyMyIssues] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterDropdown, setActiveFilterDropdown] = useState(null);

  // Popover overlays
  const [openCardAssigneeDropdown, setOpenCardAssigneeDropdown] = useState(null);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const [cardAssigneePos, setCardAssigneePos] = useState({ top: 0, left: 0 });
  const [openSubtasksPopover, setOpenSubtasksPopover] = useState(null);
  const [subtaskPos, setSubtaskPos] = useState({ top: 0, left: 0 });
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Modals and drawers
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [activeCreateColumn, setActiveCreateColumn] = useState(null);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueType, setNewIssueType] = useState(config.issueTypes[0]?.name || 'Task');
  const [newIssueAssignee, setNewIssueAssignee] = useState('Unassigned');
  const [newIssueDueDate, setNewIssueDueDate] = useState('');
  const [openInlineDropdown, setOpenInlineDropdown] = useState(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  useEffect(() => {
    localStorage.setItem(`${department}_kanbanColumnOrder`, JSON.stringify(columnOrder));
  }, [columnOrder, department]);

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
      await fetch(`${API_BASE_URL}/it-kanban/issues/${issueKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee: newAssignee })
      });
    } catch (err) {
      console.error('Failed to update assignee', err);
    }
  };

  const fetchKanbanData = () => {
    fetch(`${API_BASE_URL}/it-kanban/issues?department=${department}`)
      .then(res => res.json())
      .then(data => {
        setAllRawIssues(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error('Error fetching kanban data:', err));
  };

  useEffect(() => {
    fetchKanbanData();

    fetch(`${API_BASE_URL}/projects?department=${department}`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        setProjectsList(list);
      })
      .catch(err => console.error('Error fetching projects:', err));

    fetch(`${API_BASE_URL}/users`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data?.value) ? data.value : (Array.isArray(data) ? data : []);
        setUsersList(list);
      })
      .catch(err => console.error('Error fetching users:', err));
  }, [department]);

  const departmentUsersList = React.useMemo(() => {
    const SYSTEM_DUMMY_USERNAMES = ['admin', 'leads', 'deals', 'sales', 'marketing', 'it', 'accounting'];
    return usersList.filter(u => {
      const un = (u.username || '').toLowerCase();
      if (SYSTEM_DUMMY_USERNAMES.includes(un)) return false;
      return true;
    });
  }, [usersList]);

  // Re-build board data whenever issues or filters change
  useEffect(() => {
    const newBoard = {};
    columnOrder.forEach(col => {
      newBoard[col] = [];
    });

    let filtered = allRawIssues.filter(issue => {
      // Department Isolation Guard
      // Removed department-based validation so everyone can view tasks of everyone
      /* if (issue.department && issue.department !== department) return false;
      if (department === 'Marketing' && issue.issue_key?.startsWith('WR-') && issue.department !== 'Marketing') return false;
      if (department === 'IT' && issue.issue_key?.startsWith('MKT-') && issue.department !== 'IT') return false; */
      return true;
    });

    if (selectedSpace !== 'ALL') {
      filtered = filtered.filter(issue => issue.issue_key?.startsWith(selectedSpace));
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

    if (selectedAssignee !== 'ALL') {
      if (selectedAssignee === 'UNASSIGNED') {
        filtered = filtered.filter(issue => !issue.assignee || issue.assignee === 'Unassigned' || issue.assignee === 'Automatic');
      } else {
        const a = selectedAssignee.toLowerCase();
        filtered = filtered.filter(issue => issue.assignee && issue.assignee.toLowerCase().includes(a));
      }
    }

    if (onlyMyIssues) {
      filtered = filtered.filter(issue => {
        const assigneeStr = (issue.assignee || '').toLowerCase();
        const reporterStr = (issue.reporter || '').toLowerCase();
        return userSearchTerms.some(term => assigneeStr.includes(term) || reporterStr.includes(term));
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(issue =>
        (issue.title && issue.title.toLowerCase().includes(q)) ||
        (issue.issue_key && issue.issue_key.toLowerCase().includes(q)) ||
        (issue.description && issue.description.toLowerCase().includes(q))
      );
    }

    filtered.forEach(issue => {
      let st = (issue.status || 'TO DO').trim();
      let matchedCol = columnOrder.find(c => c.toUpperCase() === st.toUpperCase());
      if (!matchedCol) {
        matchedCol = st.toUpperCase();
        if (!newBoard[matchedCol]) newBoard[matchedCol] = [];
      }
      newBoard[matchedCol].push(issue);
    });

    setBoardData(newBoard);
  }, [allRawIssues, columnOrder, selectedSpace, selectedProjectId, selectedType, selectedStatus, selectedPriority, selectedAssignee, onlyMyIssues, searchQuery, department, userSearchTerms]);

  const updateIssue = async (key, updatedFields) => {
    setAllRawIssues(prev => prev.map(issue => (issue.issue_key === key || issue.key === key) ? { ...issue, ...updatedFields } : issue));

    try {
      await fetch(`${API_BASE_URL}/it-kanban/issues/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
    } catch (err) {
      console.error('Failed to update issue', err);
    }
  };

  const deleteIssue = async (key) => {
    setAllRawIssues(prev => prev.filter(issue => issue.issue_key !== key && issue.key !== key));
    setSelectedIssue(null);

    try {
      await fetch(`${API_BASE_URL}/it-kanban/issues/${key}`, { method: 'DELETE' });
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

    if (source.droppableId !== destination.droppableId || source.index !== destination.index) {
      const sourceItems = Array.from(boardData[source.droppableId] || []);
      const destItems = Array.from(boardData[destination.droppableId] || []);
      const [removed] = sourceItems.splice(source.index, 1);

      removed.status = destination.droppableId;
      destItems.splice(destination.index, 0, removed);

      setBoardData(prev => ({
        ...prev,
        [source.droppableId]: sourceItems,
        [destination.droppableId]: destItems
      }));

      fetch(`${API_BASE_URL}/it-kanban/issues/${removed.issue_key || removed.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: destination.droppableId })
      }).catch(err => console.error('Failed to update status on server:', err));
    }
  };

  const handleCreateInlineIssue = (col) => {
    if (!newIssueTitle.trim()) return;
    const prefix = selectedSpace !== 'ALL' ? selectedSpace : config.defaultPrefix;
    const newCard = {
      title: newIssueTitle.trim(),
      type: newIssueType,
      status: col,
      assignee: newIssueAssignee === 'Unassigned' || newIssueAssignee === 'Automatic' ? 'Unassigned' : newIssueAssignee,
      priority: 'Medium',
      reporter: user?.name || `${department} User`,
      department,
      keyPrefix: prefix,
      due_date: newIssueDueDate || null
    };

    setNewIssueTitle('');
    setNewIssueType(config.issueTypes[0]?.name || 'Task');
    setNewIssueAssignee('Unassigned');
    setNewIssueDueDate('');
    setActiveCreateColumn(null);
    setOpenInlineDropdown(null);

    fetch(`${API_BASE_URL}/it-kanban/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCard)
    })
      .then(res => res.json())
      .then(() => fetchKanbanData())
      .catch(err => console.error('Failed to save inline issue', err));
  };

  let selectedIssueData = null;
  if (selectedIssue) {
    Object.values(boardData).forEach(col => {
      const found = col.find(c => c.issue_key === selectedIssue || c.key === selectedIssue);
      if (found) selectedIssueData = found;
    });
  }

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-gray-100 font-sans">
        {/* HEADER & BREADCRUMBS */}
        <div className="bg-white border-b border-gray-200 shrink-0">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span className="hover:text-gray-700 cursor-pointer">Enterprise CRM</span>
              <ChevronRight size={12} />
              <span className="hover:text-gray-700 cursor-pointer">{config.departmentName}</span>
              <ChevronRight size={12} />
              <span className="text-gray-900 font-medium">Kanban Board</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search issues..."
                  className="pl-8 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-2.5 top-2 text-gray-400" size={14} />
              </div>
              <button
                onClick={() => setIsCreateDrawerOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus size={14} />
                Create Issue
              </button>
            </div>
          </div>

          {/* SPACE & FILTERS TOOLBAR */}
          <div className="px-6 py-2 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between overflow-x-auto text-xs">
            <div className="flex items-center space-x-3">
              {/* SPACE SWITCHER DROPDOWN */}
              <div className="relative">
                <button
                  onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'space' ? null : 'space')}
                  className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded border border-gray-200 hover:border-gray-300 font-medium text-gray-700 shadow-sm"
                >
                  <span className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {selectedSpace !== 'ALL' ? selectedSpace : config.defaultPrefix}
                  </span>
                  <span>
                    {config.spaces.find(s => s.code === selectedSpace)?.name || config.spaces[0].name}
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {activeFilterDropdown === 'space' && (
                  <div className="absolute left-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-30">
                    {config.spaces.map(sp => (
                      <div
                        key={sp.id}
                        onClick={() => { setSelectedSpace(sp.code); setActiveFilterDropdown(null); }}
                        className={`px-3 py-2 text-xs flex items-center space-x-2 hover:bg-gray-50 cursor-pointer ${selectedSpace === sp.code ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'}`}
                      >
                        <span className="w-4 h-4 rounded bg-gray-200 text-gray-700 flex items-center justify-center text-[9px] font-bold">
                          {sp.code}
                        </span>
                        <span>{sp.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PROJECT FILTER */}
              <div className="relative">
                <button
                  onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'project' ? null : 'project')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded border font-medium transition ${selectedProjectId !== 'ALL' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}
                >
                  <span>Project: {selectedProjectId === 'ALL' ? 'All' : (projectsList.find(p => Number(p.id) === Number(selectedProjectId))?.name || selectedProjectId)}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {activeFilterDropdown === 'project' && (
                  <div className="absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-30">
                    <div
                      onClick={() => { setSelectedProjectId('ALL'); setActiveFilterDropdown(null); }}
                      className={`px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer ${selectedProjectId === 'ALL' ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                    >
                      All Projects
                    </div>
                    {projectsList.map(p => (
                      <div
                        key={p.id}
                        onClick={() => { setSelectedProjectId(p.id); setActiveFilterDropdown(null); }}
                        className={`px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer truncate ${Number(selectedProjectId) === Number(p.id) ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                      >
                        {p.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TYPE FILTER */}
              <div className="relative">
                <button
                  onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'type' ? null : 'type')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded border font-medium transition ${selectedType !== 'ALL' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}
                >
                  <span>Type: {selectedType}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {activeFilterDropdown === 'type' && (
                  <div className="absolute left-0 mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-30">
                    <div
                      onClick={() => { setSelectedType('ALL'); setActiveFilterDropdown(null); }}
                      className={`px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer ${selectedType === 'ALL' ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                    >
                      All Types
                    </div>
                    {config.issueTypes.map(t => (
                      <div
                        key={t.name}
                        onClick={() => { setSelectedType(t.name); setActiveFilterDropdown(null); }}
                        className={`px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer flex items-center space-x-2 ${selectedType === t.name ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                      >
                        <t.icon size={13} />
                        <span>{t.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PRIORITY FILTER */}
              <div className="relative">
                <button
                  onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'priority' ? null : 'priority')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded border font-medium transition ${selectedPriority !== 'ALL' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}
                >
                  <span>Priority: {selectedPriority}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {activeFilterDropdown === 'priority' && (
                  <div className="absolute left-0 mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-30">
                    {['ALL', 'High', 'Medium', 'Low'].map(p => (
                      <div
                        key={p}
                        onClick={() => { setSelectedPriority(p); setActiveFilterDropdown(null); }}
                        className={`px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer ${selectedPriority === p ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                      >
                        {p === 'ALL' ? 'All Priorities' : p}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ASSIGNEE FILTER */}
              <div className="relative">
                <button
                  onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'assignee' ? null : 'assignee')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded border font-medium transition ${selectedAssignee !== 'ALL' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}
                >
                  <span>Assignee: {selectedAssignee}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {activeFilterDropdown === 'assignee' && (
                  <div className="absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-30 max-h-60 overflow-y-auto">
                    <div
                      onClick={() => { setSelectedAssignee('ALL'); setActiveFilterDropdown(null); }}
                      className={`px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer ${selectedAssignee === 'ALL' ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                    >
                      All Assignees
                    </div>
                    <div
                      onClick={() => { setSelectedAssignee('UNASSIGNED'); setActiveFilterDropdown(null); }}
                      className={`px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer ${selectedAssignee === 'UNASSIGNED' ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                    >
                      Unassigned
                    </div>
                    {departmentUsersList.map(u => {
                      const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
                      return (
                        <div
                          key={u.id}
                          onClick={() => { setSelectedAssignee(name); setActiveFilterDropdown(null); }}
                          className={`px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer truncate ${selectedAssignee === name ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                        >
                          {name}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ONLY MY ISSUES TOGGLE */}
              <button
                onClick={() => setOnlyMyIssues(!onlyMyIssues)}
                className={`px-3 py-1.5 rounded border text-xs font-medium transition ${onlyMyIssues ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                Only My Issues
              </button>
            </div>

            <div className="text-xs text-gray-500 font-medium shrink-0 ml-4">
              Showing {Object.values(boardData).reduce((acc, curr) => acc + (curr?.length || 0), 0)} issues
            </div>
          </div>
        </div>

        {/* KANBAN BOARD CONTAINER */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-start gap-4 min-h-full">
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="board" type="column" direction="horizontal">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="flex gap-4 items-start min-h-[calc(100vh-220px)]"
                  >
                    {columnOrder.map((col, index) => (
                      <Draggable key={col} draggableId={col} index={index}>
                        {(provided) => {
                          const colCards = boardData[col] || [];
                          return (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="w-72 min-w-[280px] bg-gray-50 rounded-lg flex flex-col max-h-[calc(100vh-220px)] border border-gray-200 shadow-sm shrink-0"
                            >
                              {/* COLUMN HEADER */}
                              <div
                                {...provided.dragHandleProps}
                                className="p-3 bg-white border-b border-gray-200 rounded-t-lg flex items-center justify-between font-semibold text-xs text-gray-700 select-none cursor-grab active:cursor-grabbing"
                              >
                                <div className="flex items-center space-x-2">
                                  <span>{col}</span>
                                  <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-bold">
                                    {colCards.length}
                                  </span>
                                </div>
                                <button
                                  onClick={() => setActiveCreateColumn(col)}
                                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>

                              {/* COLUMN CARDS CONTAINER */}
                              <Droppable droppableId={col} type="card">
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`p-2 flex-1 overflow-y-auto space-y-2 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50' : ''}`}
                                  >
                                    {colCards.map((card, cardIndex) => {
                                      const cardKey = card.issue_key || card.key;
                                      let cardSubtasks = card.subtasks || [];
                                      if (typeof cardSubtasks === 'string') {
                                        try { cardSubtasks = JSON.parse(cardSubtasks); } catch (e) { cardSubtasks = []; }
                                      }
                                      if (!Array.isArray(cardSubtasks)) cardSubtasks = [];
                                      const completedSubtasksCount = cardSubtasks.filter(s => s.completed).length;
                                      const totalSubtasksCount = cardSubtasks.length;

                                      return (
                                        <Draggable key={cardKey} draggableId={cardKey} index={cardIndex}>
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              onClick={() => setSelectedIssue(cardKey)}
                                              className={`bg-white p-3.5 rounded border shadow-sm hover:shadow-md transition-all cursor-pointer select-none group relative ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 opacity-90' : 'border-gray-200'}`}
                                            >
                                              {/* CARD HEADER (KEY & PRIORITY) */}
                                              <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-1.5">
                                                  {TYPE_ICONS[card.type] || TYPE_ICONS.Task}
                                                  <span className="text-xs font-semibold text-blue-600 group-hover:underline">
                                                    {cardKey}
                                                  </span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                  {PRIORITY_ICONS[card.priority]}
                                                </div>
                                              </div>

                                              {/* CARD TITLE */}
                                              <h4 className="text-xs text-gray-800 font-medium mb-3 line-clamp-2 leading-relaxed">
                                                {card.title}
                                              </h4>

                                              {/* SUBTASKS SUMMARY BADGE */}
                                              {totalSubtasksCount > 0 && (
                                                <div className="mb-2">
                                                  <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                                                    <span>Subtasks ({completedSubtasksCount}/{totalSubtasksCount})</span>
                                                    <span>{Math.round((completedSubtasksCount / totalSubtasksCount) * 100)}%</span>
                                                  </div>
                                                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                      className="bg-green-500 h-full transition-all duration-300"
                                                      style={{ width: `${(completedSubtasksCount / totalSubtasksCount) * 100}%` }}
                                                    />
                                                  </div>
                                                </div>
                                              )}

                                              {/* CARD FOOTER */}
                                              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                                                <div className="flex items-center space-x-2">
                                                  {/* SUBTASK OVERLAY TRIGGER */}
                                                  <button
                                                    onClick={(e) => handleOpenSubtasksPopover(e, cardKey)}
                                                    className="flex items-center space-x-1 text-[11px] text-gray-500 hover:bg-gray-100 px-1.5 py-0.5 rounded transition"
                                                    title="Manage subtasks"
                                                  >
                                                    <CheckSquare size={12} className={totalSubtasksCount > 0 ? 'text-blue-500' : 'text-gray-400'} />
                                                    <span>{completedSubtasksCount}/{totalSubtasksCount}</span>
                                                  </button>
                                                </div>

                                                {/* ASSIGNEE AVATAR POPOVER TRIGGER */}
                                                <button
                                                  onClick={(e) => handleOpenCardAssignee(e, cardKey)}
                                                  className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] hover:ring-2 hover:ring-blue-400 transition"
                                                  title={`Assigned to: ${card.assignee || 'Unassigned'}`}
                                                >
                                                  {getInitials(card.assignee)}
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </Draggable>
                                      );
                                    })}
                                    {provided.placeholder}

                                    {/* INLINE CARD CREATION FORM */}
                                    {activeCreateColumn === col && (
                                      <div className="bg-white p-3 rounded border border-blue-400 shadow-md inline-create-box">
                                        <input
                                          type="text"
                                          autoFocus
                                          placeholder="What needs to be done?"
                                          className="w-full text-xs p-1 border-b border-gray-200 focus:outline-none mb-2"
                                          value={newIssueTitle}
                                          onChange={(e) => setNewIssueTitle(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCreateInlineIssue(col);
                                            if (e.key === 'Escape') setActiveCreateColumn(null);
                                          }}
                                        />
                                        <div className="flex items-center justify-between">
                                          <button
                                            onClick={() => handleCreateInlineIssue(col)}
                                            className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
                                          >
                                            Add
                                          </button>
                                          <button
                                            onClick={() => setActiveCreateColumn(null)}
                                            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Droppable>

                              {/* COLUMN FOOTER CREATE TRIGGER */}
                              {activeCreateColumn !== col && (
                                <div className="p-2 border-t border-gray-200 bg-white/50 rounded-b-lg">
                                  <button
                                    onClick={() => setActiveCreateColumn(col)}
                                    className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded flex items-center justify-center gap-1 transition"
                                  >
                                    <Plus size={14} />
                                    <span>Create issue</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        }}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {/* ADD COLUMN BUTTON */}
                    <div className="w-64 shrink-0">
                      {isAddingColumn ? (
                        <div className="p-3 bg-white rounded-lg border border-gray-300 shadow-sm">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Column name (e.g. IN REVIEW)"
                            className="w-full h-8 px-2 border border-gray-300 rounded text-xs mb-2 focus:outline-none focus:border-blue-500"
                            value={newColumnName}
                            onChange={(e) => setNewColumnName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newColumnName.trim()) handleAddColumn();
                              if (e.key === 'Escape') setIsAddingColumn(false);
                            }}
                          />
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setIsAddingColumn(false)}
                              className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleAddColumn}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsAddingColumn(true)}
                          className="w-full h-10 border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 transition bg-white/40 hover:bg-white"
                        >
                          <Plus size={14} />
                          <span>Add column</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      </div>

      {/* CREATE ISSUE DRAWER */}
      <UniversalCreateIssueDrawer
        department={department}
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onIssueCreated={fetchKanbanData}
      />

      {/* ISSUE DETAILS PANEL OVERLAY */}
      {selectedIssueData && (
        <ITIssueDetailsPanel
          issue={selectedIssueData}
          updateIssue={updateIssue}
          deleteIssue={deleteIssue}
          onClose={() => setSelectedIssue(null)}
          onIssueCreated={fetchKanbanData}
        />
      )}

      {/* CARD SUBTASKS POPOVER OVERLAY */}
      {openSubtasksPopover && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3 text-xs w-72 animate-fade-in"
          style={{ top: subtaskPos.top, left: subtaskPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2 font-semibold text-gray-800 border-b pb-1.5">
            <span>Subtasks ({openSubtasksPopover})</span>
            <button onClick={() => setOpenSubtasksPopover(null)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1.5 mb-3">
            {(() => {
              const card = allRawIssues.find(i => (i.issue_key || i.key) === openSubtasksPopover);
              let stList = card?.subtasks || [];
              if (typeof stList === 'string') {
                try { stList = JSON.parse(stList); } catch (e) { stList = []; }
              }
              if (!Array.isArray(stList)) stList = [];
              if (stList.length === 0) return <div className="text-gray-400 text-center py-2">No subtasks yet</div>;
              return stList.map(st => (
                <div key={st.id} className="flex items-center space-x-2 text-gray-700 hover:bg-gray-50 p-1 rounded cursor-pointer" onClick={() => handleToggleCardSubtask(openSubtasksPopover, st.id)}>
                  <input type="checkbox" checked={Boolean(st.completed)} readOnly className="rounded text-blue-600 focus:ring-0 cursor-pointer" />
                  <span className={st.completed ? 'line-through text-gray-400' : ''}>{st.title}</span>
                </div>
              ));
            })()}
          </div>
          <div className="flex items-center space-x-1.5 pt-2 border-t border-gray-100">
            <input
              type="text"
              placeholder="Add new subtask..."
              className="flex-1 px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-blue-500 text-xs"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCardSubtask(openSubtasksPopover)}
            />
            <button
              onClick={() => handleAddCardSubtask(openSubtasksPopover)}
              className="px-2.5 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 text-xs"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* CARD ASSIGNEE POPOVER OVERLAY */}
      {openCardAssigneeDropdown && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-2 text-xs w-60 animate-fade-in"
          style={{ top: cardAssigneePos.top, left: cardAssigneePos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2 font-semibold text-gray-800 border-b pb-1.5">
            <span>Assignee ({openCardAssigneeDropdown})</span>
            <button onClick={() => setOpenCardAssigneeDropdown(null)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
          <input
            type="text"
            placeholder="Search team member..."
            className="w-full px-2 py-1 border border-gray-200 rounded mb-2 text-xs focus:outline-none focus:border-blue-500"
            value={assigneeSearchQuery}
            onChange={(e) => setAssigneeSearchQuery(e.target.value)}
          />
          <div className="max-h-44 overflow-y-auto space-y-0.5">
            <div
              onClick={() => handleUpdateCardAssignee(openCardAssigneeDropdown, 'Unassigned')}
              className="p-1.5 hover:bg-gray-50 rounded cursor-pointer flex items-center space-x-2 text-gray-700"
            >
              <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 font-bold flex items-center justify-center text-[9px]">U</div>
              <span>Unassigned</span>
            </div>
            {departmentUsersList
              .filter(u => {
                const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
                return name.toLowerCase().includes(assigneeSearchQuery.toLowerCase());
              })
              .map(u => {
                const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
                return (
                  <div
                    key={u.id}
                    onClick={() => handleUpdateCardAssignee(openCardAssigneeDropdown, name)}
                    className="p-1.5 hover:bg-gray-50 rounded cursor-pointer flex items-center space-x-2 text-gray-700"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px]">
                      {getInitials(name)}
                    </div>
                    <span className="truncate">{name}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </>
  );
};

export default UniversalKanbanPage;

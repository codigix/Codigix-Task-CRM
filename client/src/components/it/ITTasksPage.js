import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search, ChevronDown, ChevronRight,
  Share2, Download, MoreHorizontal, LayoutList,
  CheckSquare, Plus, AlertCircle, ArrowUp, ArrowDown, Trash2
} from 'lucide-react';
import ITCreateIssueDrawer from './ITCreateIssueDrawer';
import ITIssueDetailsPanel from './ITIssueDetailsPanel';
import BoardTabs from '../common/BoardTabs';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


// Matches the server's definition of finished work.
const isDoneStatus = (s) => ['DONE', 'COMPLETED', 'CLOSED'].includes(String(s || '').toUpperCase().trim());

const PRIORITY_ICONS = {
  High: <ArrowUp size={14} className="text-red-500" />,
  Medium: <ArrowUp size={14} className="text-orange-500" />,
  Low: <ArrowDown size={14} className="text-blue-500" />
};

const TYPE_ICONS = {
  Task: <CheckSquare size={14} className="text-blue-500 fill-blue-100" />,
  Story: <BookmarkIcon size={14} className="text-green-500 fill-green-100" />,
  Bug: <AlertCircle size={14} className="text-red-500 fill-red-100" />,
  Test: <TestTubeIcon size={14} className="text-purple-500 fill-purple-100" />
};

// SVG substitutes for lucide icons that might be missing or not perfectly matched
function BookmarkIcon(props) {
  return <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}><path d="M5 3v18l7-4.5 7 4.5V3z" /></svg>;
}
function TestTubeIcon(props) {
  return <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}><rect x="9" y="3" width="6" height="3" rx="1" /><path d="M10 6v11a2 2 0 004 0V6" /></svg>;
}

const LIST_DATA = [];

const ALL_COLUMNS = [
  { key: 'workType', label: 'Type', defaultChecked: true },
  { key: 'key', label: 'Key', defaultChecked: true },
  { key: 'summary', label: 'Summary', defaultChecked: true },
  { key: 'assignee', label: 'Assignee', defaultChecked: true },
  { key: 'reporter', label: 'Reporter', defaultChecked: true },
  { key: 'team', label: 'Team', defaultChecked: true },
  { key: 'priority', label: 'Priority', defaultChecked: true },
  { key: 'status', label: 'Status', defaultChecked: true },
  { key: 'resolution', label: 'Resolution', defaultChecked: true },
  { key: 'created', label: 'Created', defaultChecked: true },
  { key: 'updated', label: 'Updated', defaultChecked: false },
  { key: 'dueDate', label: 'Due Date', defaultChecked: true },
  { key: 'progress', label: 'Progress', defaultChecked: false },
  { key: 'actions', label: 'Actions', defaultChecked: true }
];

const ITTasksPage = () => {
  const { user } = useAuth();
  const { designation, username } = useParams();
  const isManager = designation ? designation.toLowerCase().includes('manager') || designation.toLowerCase().includes('admin') : true;

  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [openFilterDropdown, setOpenFilterDropdown] = useState(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [onlyMyIssues, setOnlyMyIssues] = useState(false);

  const [projectsList, setProjectsList] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Columns filter state
  const [selectedColumns, setSelectedColumns] = useState(
    new Set(['workType', 'key', 'summary', 'assignee', 'reporter', 'team', 'priority', 'status', 'resolution', 'created', 'dueDate', 'actions'])
  );
  const [columnSearchQuery, setColumnSearchQuery] = useState('');
  const [activeColumnsTab, setActiveColumnsTab] = useState('My defaults');

  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetchTasks();
    fetch(API_BASE_URL + '/projects')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setProjectsList(data); })
      .catch(err => console.error('Error fetching projects:', err));

    fetch(API_BASE_URL + '/users')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setUsersList(data); })
      .catch(err => console.error('Error fetching users:', err));
  }, []);

  const itUsersList = React.useMemo(() => {
    const SYSTEM_DUMMY_USERNAMES = ['admin', 'leads', 'deals', 'sales', 'marketing', 'it', 'accounting'];
    return usersList.filter(u => {
      const un = (u.username || '').toLowerCase();
      if (SYSTEM_DUMMY_USERNAMES.includes(un)) return false;
      // Removed department-based validation so everyone can assign task to everyone
      /* const dept = (u.department || '').toLowerCase();
      const role = (u.role_name || u.role || '').toLowerCase();
      return dept.includes('it') || role.includes('it') || role.includes('developer') || role.includes('tester') || role.includes('devops'); */
      return true;
    });
  }, [usersList]);

  const fetchTasks = async () => {
    try {
      // Scoped to this department. Without it the IT list showed Marketing work too — the
      // two departments are separate workspaces and shouldn't see each other's tickets.
      const res = await fetch(`${API_BASE_URL}/it-kanban/issues?department=IT`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Error fetching tasks', err);
    }
  };

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

  const filteredTasks = React.useMemo(() => {
    let result = tasks;

    if (selectedProjectId !== 'ALL') {
      result = result.filter(issue => Number(issue.project_id) === Number(selectedProjectId));
    }
    if (selectedType !== 'ALL') {
      result = result.filter(issue => issue.type === selectedType);
    }
    if (selectedStatus !== 'ALL') {
      result = result.filter(issue => (issue.status || 'TO DO').toUpperCase() === selectedStatus.toUpperCase());
    }
    if (selectedPriority !== 'ALL') {
      result = result.filter(issue => issue.priority === selectedPriority);
    }
    if (selectedAssignees.length > 0) {
      result = result.filter(issue => {
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

    if (onlyMyIssues) {
      result = result.filter(issue => isUserTask(issue));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(issue =>
        (issue.title && issue.title.toLowerCase().includes(q)) ||
        (issue.issue_key && issue.issue_key.toLowerCase().includes(q)) ||
        (issue.assignee && issue.assignee.toLowerCase().includes(q)) ||
        (issue.reporter && issue.reporter.toLowerCase().includes(q))
      );
    }
    return result;
  }, [tasks, selectedProjectId, selectedType, selectedStatus, selectedPriority, selectedAssignees, onlyMyIssues, isManager, userSearchTerms, searchQuery]);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const totalPages = Math.ceil(filteredTasks.length / rowsPerPage) || 1;
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    if (tasks.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const ticketKey = params.get('ticketKey');
      if (ticketKey) {
        const exists = tasks.some(t => t.issue_key === ticketKey || t.key === ticketKey);
        if (exists) {
          setSelectedIssue(ticketKey);
        }
      }
    }
  }, [tasks]);

  const updateIssue = async (key, updates) => {
    setTasks(prev => prev.map(t => t.issue_key === key || t.key === key ? { ...t, ...updates } : t));
    try {
      await fetch(`${API_BASE_URL}/it-kanban/issues/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': user ? (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username) : 'System'
        },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.error('Failed to update issue', err);
    }
  };

  const deleteIssue = async (key) => {
    try {
      await fetch(`${API_BASE_URL}/it-kanban/issues/${key}`, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.issue_key !== key && t.key !== key));
      setSelectedIssue(null);
    } catch (err) {
      console.error('Failed to delete issue', err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openFilterDropdown && !e.target.closest('.interactive-dropdown')) {
        setOpenFilterDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilterDropdown]);

  const toggleDropdown = (name) => {
    setOpenFilterDropdown(openFilterDropdown === name ? null : name);
  };

  return (
    <>
      <ITCreateIssueDrawer isOpen={isCreateDrawerOpen} onIssueCreated={fetchTasks} onClose={() => setIsCreateDrawerOpen(false)} />
      <div className="flex w-full min-h-screen bg-white font-sans">
        <div className="flex-1 flex flex-col min-w-0">
          <BoardTabs department="IT" spaceName="IT Workspace" />
          <div className="flex-1 flex relative">
            <div className="flex-1 flex flex-col p-4 pb-0 min-w-0 bg-white">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h1 className="text-2xl text-gray-900 mb-4">All Issues</h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search issues"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-40"
                      />
                    </div> */}

                    <div className="flex items-center -space-x-1.5 mx-1">
                      {usersList.slice(0, 5).map((u) => {
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
                            title={`Filter tasks by ${fullName}`}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all relative border-2 border-white cursor-pointer ${isSelected
                              ? 'ring-2 ring-blue-600 ring-offset-1 z-20 scale-110 shadow-md'
                              : 'hover:z-10 hover:scale-105 opacity-90 hover:opacity-100'
                              } ${colorClass}`}
                          >
                            {uppercaseInitials}
                          </button>
                        );
                      })}
                      {usersList.length > 5 && (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold bg-gray-100 text-gray-600 border-2 border-white z-0 ml-[-8px]" title={`${usersList.length - 5} more members`}>
                          +{usersList.length - 5}
                        </div>
                      )}
                    </div>

                    <div className="relative interactive-dropdown">
                      <button onClick={() => toggleDropdown('project')} className="flex items-center gap-1.5 p-2 rounded text-xs font-medium border bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100 transition-colors">
                        Project: {selectedProjectId === 'ALL' ? 'All Projects' : (projectsList.find(p => Number(p.id) === Number(selectedProjectId))?.name || 'Selected Project')} <ChevronDown size={14} />
                      </button>
                      {openFilterDropdown === 'project' && (
                        <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30 text-xs max-h-60 overflow-y-auto">
                          <div onClick={() => { setSelectedProjectId('ALL'); setOpenFilterDropdown(null); }} className={`p-2 hover:bg-gray-50 cursor-pointer ${selectedProjectId === 'ALL' ? 'font-bold text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                            All Projects
                          </div>
                          {projectsList.map(p => (
                            <div key={p.id} onClick={() => { setSelectedProjectId(p.id); setOpenFilterDropdown(null); }} className={`p-2 hover:bg-gray-50 cursor-pointer ${Number(selectedProjectId) === Number(p.id) ? 'font-bold text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                              {p.name || p.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative interactive-dropdown">
                      <button onClick={() => toggleDropdown('type')} className="flex items-center gap-1.5 p-2 rounded text-xs font-medium border bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors">
                        Type: {selectedType === 'ALL' ? 'All' : selectedType} <ChevronDown size={14} />
                      </button>
                      {openFilterDropdown === 'type' && (
                        <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30 text-xs">
                          {['ALL', 'Task', 'Bug', 'Story', 'Test'].map(t => (
                            <div key={t} onClick={() => { setSelectedType(t); setOpenFilterDropdown(null); }} className={`p-2 hover:bg-gray-50 cursor-pointer ${selectedType === t ? 'font-bold text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                              {t === 'ALL' ? 'All Types' : t}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative interactive-dropdown">
                      <button onClick={() => toggleDropdown('status')} className="flex items-center gap-1.5 p-2 rounded text-xs font-medium border bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors">
                        Status: {selectedStatus === 'ALL' ? 'All' : selectedStatus} <ChevronDown size={14} />
                      </button>
                      {openFilterDropdown === 'status' && (
                        <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30 text-xs">
                          {['ALL', 'TO DO', 'IN PROGRESS', 'IN REVIEW', 'TESTING', 'DONE'].map(st => (
                            <div key={st} onClick={() => { setSelectedStatus(st); setOpenFilterDropdown(null); }} className={`p-2 hover:bg-gray-50 cursor-pointer ${selectedStatus === st ? 'font-bold text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                              {st === 'ALL' ? 'All Statuses' : st}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative interactive-dropdown">
                      <button onClick={() => toggleDropdown('priority')} className="flex items-center gap-1.5 p-2 rounded text-xs font-medium border bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors">
                        Priority: {selectedPriority === 'ALL' ? 'All' : selectedPriority} <ChevronDown size={14} />
                      </button>
                      {openFilterDropdown === 'priority' && (
                        <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30 text-xs">
                          {['ALL', 'Low', 'Medium', 'High'].map(pr => (
                            <div key={pr} onClick={() => { setSelectedPriority(pr); setOpenFilterDropdown(null); }} className={`p-2 hover:bg-gray-50 cursor-pointer ${selectedPriority === pr ? 'font-bold text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                              {pr === 'ALL' ? 'All Priorities' : pr}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {isManager && (
                      <>
                        <div className="relative interactive-dropdown">
                          <button
                            onClick={() => setOpenFilterDropdown(openFilterDropdown === 'assignee' ? null : 'assignee')}
                            className={`flex items-center gap-1.5 p-2 rounded text-xs font-medium border hover:bg-gray-50 transition-colors ${selectedAssignees.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold' : 'bg-white border-gray-300 text-gray-700'}`}
                          >
                            Assignee: {selectedAssignees.length === 0 ? 'All' : selectedAssignees.length === 1 ? selectedAssignees[0] : `${selectedAssignees.length} Selected`} <ChevronDown size={14} />
                          </button>
                          {openFilterDropdown === 'assignee' && (
                            <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-md shadow-xl py-1 z-50 text-xs text-gray-700 max-h-60 overflow-y-auto">
                              <div onClick={() => { setSelectedAssignees([]); setOpenFilterDropdown(null); }} className={`p-2 hover:bg-gray-50 cursor-pointer ${selectedAssignees.length === 0 ? 'font-bold text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                                All Assignees
                              </div>
                              <div onClick={() => {
                                if (selectedAssignees.includes('UNASSIGNED')) {
                                  setSelectedAssignees(prev => prev.filter(a => a !== 'UNASSIGNED'));
                                } else {
                                  setSelectedAssignees(prev => [...prev, 'UNASSIGNED']);
                                }
                              }} className={`p-2 hover:bg-gray-50 cursor-pointer ${selectedAssignees.includes('UNASSIGNED') ? 'font-bold text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                                Unassigned
                              </div>
                              {usersList.map(u => {
                                const uName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
                                if (!uName) return null;
                                const isSelected = selectedAssignees.includes(uName);
                                return (
                                  <div key={u.id} onClick={() => {
                                    if (isSelected) {
                                      setSelectedAssignees(prev => prev.filter(a => a !== uName));
                                    } else {
                                      setSelectedAssignees(prev => [...prev, uName]);
                                    }
                                  }} className={`p-2 hover:bg-gray-50 cursor-pointer ${isSelected ? 'font-bold text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                                    {uName}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => setOnlyMyIssues(!onlyMyIssues)}
                          className={`px-3 py-1.5 rounded text-xs font-semibold border transition cursor-pointer ${onlyMyIssues ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                        >
                          Only My Issues
                        </button>
                      </>
                    )}

                    <button onClick={() => setIsCreateDrawerOpen(true)} className="flex items-center gap-1.5 p-2 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors ml-2 font-medium">
                      <Plus size={14} /> Create Issue
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative interactive-dropdown">
                    <button onClick={() => toggleDropdown('moreOptions')} className="text-gray-400 hover:text-gray-600"><MoreHorizontal size={16} /></button>
                    {openFilterDropdown === 'moreOptions' && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30 text-xs">
                        <div className="p-2 hover:bg-gray-50 cursor-pointer text-gray-700">Bulk modify</div>
                        <div className="p-2 hover:bg-gray-50 cursor-pointer text-gray-700">Import issues</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* METRICS ROW */}


              {/* LIST VIEW */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">All Issues</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded-full">{tasks.length}</span>
                  </div>

                  {/* Columns dropdown trigger */}
                  <div className="relative interactive-dropdown">
                    <button
                      onClick={() => toggleDropdown('columns')}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 p-2 rounded border border-gray-200  transition-all"
                    >
                      <LayoutList size={14} /> Columns <ChevronDown size={14} />
                    </button>

                    {openFilterDropdown === 'columns' && (
                      <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-gray-200 rounded shadow-xl z-50 flex flex-col font-sans text-xs text-gray-700 py-1.5">

                        {/* Tab Headers */}
                        <div className="flex border-b border-gray-100 px-3 pb-1">
                          <button
                            onClick={() => setActiveColumnsTab('My defaults')}
                            className={`pb-1 px-2 font-medium transition-all relative ${activeColumnsTab === 'My defaults' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'
                              }`}
                          >
                            My defaults
                            {activeColumnsTab === 'My defaults' && (
                              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500" />
                            )}
                          </button>
                          <button
                            onClick={() => setActiveColumnsTab('System')}
                            className={`pb-1 px-2 font-medium transition-all relative ${activeColumnsTab === 'System' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'
                              }`}
                          >
                            System
                            {activeColumnsTab === 'System' && (
                              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500" />
                            )}
                          </button>
                        </div>

                        {/* Search columns */}
                        <div className="p-2 border-b border-gray-100 relative flex items-center">
                          <Search size={12} className="absolute left-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search columns"
                            className="w-full pl-7 pr-3 py-1.5 border border-blue-500 rounded-[3px] text-xs outline-none focus:ring-1 focus:ring-blue-400"
                            value={columnSearchQuery}
                            onChange={(e) => setColumnSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        {/* Columns list */}
                        <div className="max-h-72 overflow-y-auto px-1 py-1 custom-scrollbar">
                          {ALL_COLUMNS.filter(col =>
                            col.label.toLowerCase().includes(columnSearchQuery.toLowerCase())
                          ).map(col => {
                            const isChecked = selectedColumns.has(col.key);
                            return (
                              <label
                                key={col.key}
                                className="flex items-center gap-2.5 p-2 hover:bg-gray-50 cursor-pointer rounded"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const next = new Set(selectedColumns);
                                    if (isChecked) {
                                      // Summary is required
                                      if (col.key !== 'summary') {
                                        next.delete(col.key);
                                      }
                                    } else {
                                      next.add(col.key);
                                    }
                                    setSelectedColumns(next);
                                  }}
                                  className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500/20"
                                />
                                <span className={`${isChecked ? 'font-medium text-gray-900' : 'text-gray-600'}`}>{col.label}</span>
                              </label>
                            );
                          })}
                        </div>

                        {/* Dropdown footer */}
                        <div className="flex justify-between items-center px-3 pt-2 pb-0.5 border-t border-gray-100 text-xs text-gray-500">
                          <button
                            className="text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1"
                            onClick={() => {
                              const defaultKeys = ALL_COLUMNS.filter(c => c.defaultChecked).map(c => c.key);
                              setSelectedColumns(new Set(defaultKeys));
                            }}
                          >
                            + Restore defaults
                          </button>
                          <span>{selectedColumns.size} of 48</span>
                        </div>

                      </div>
                    )}
                  </div>
                </div>

                <div className="border border-gray-200 rounded bg-white overflow-x-auto w-full max-w-full">
                  <table className="w-full text-left whitespace-nowrap overflow-auto">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500   tracking-wider">
                      <tr>
                        <th className="p-3 w-10 text-center">#</th>
                        {ALL_COLUMNS.filter(col => selectedColumns.has(col.key)).map(col => (
                          <th key={col.key} className="p-3 select-none">{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                      {tasks.length === 0 ? (
                        <tr>
                          <td colSpan="100%" className="p-12 text-center">
                            <div className="flex flex-col items-center justify-center text-gray-400">
                              <LayoutList size={40} className="mb-3 opacity-30" />
                              <span className="text-sm font-semibold text-gray-600 mb-1">No issues found</span>
                              <span className="text-xs mb-4">There are no tasks matching your current filters or in your database.</span>
                              <button onClick={() => setIsCreateDrawerOpen(true)} className="p-2 bg-blue-600 text-white rounded text-xs  hover:bg-blue-700 transition  flex items-center gap-1.5"><Plus size={14} /> Create your first issue</button>
                            </div>
                          </td>
                        </tr>
                      ) : paginatedTasks.map((row, i) => (
                        <tr key={i} className={`hover:bg-blue-50 cursor-pointer ${selectedIssue === (row.issue_key || row.key) ? 'bg-blue-50' : ''}`} onClick={() => setSelectedIssue((row.issue_key || row.key))}>
                          <td className="p-3 text-center text-gray-400 text-xs">{(currentPage - 1) * rowsPerPage + i + 1}</td>
                          {ALL_COLUMNS.filter(col => selectedColumns.has(col.key)).map(col => {
                            switch (col.key) {
                              case 'workType':
                                return (
                                  <td key={col.key} className="p-3">
                                    <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                                      {TYPE_ICONS[row.type] || TYPE_ICONS.Task} {row.type}
                                    </div>
                                  </td>
                                );
                              case 'key':
                                // Jira strikes through the key of a finished work item.
                                return (
                                  <td key={col.key} className={`p-3 text-blue-600 font-semibold hover:underline ${isDoneStatus(row.status) ? 'line-through' : ''
                                    }`}>
                                    {(row.issue_key || row.key)}
                                  </td>
                                );
                              case 'summary':
                                const fullSummary = row.title || row.summary || '';
                                const words = fullSummary.trim().split(/\s+/);
                                const isLong = words.length > 2;
                                const displaySummary = isLong ? `${words.slice(0, 2).join(' ')}...` : fullSummary;

                                return (
                                  <td key={col.key} className="p-3">
                                    <span className="text-gray-900 font-semibold cursor-pointer" title={fullSummary}>
                                      {displaySummary}
                                    </span>
                                  </td>
                                );
                              case 'assignee':
                                return (
                                  <td key={col.key} className="p-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] ">
                                        {(row.assignee ? row.assignee.charAt(0) : "U")}
                                      </div>
                                      <span>{row.assignee || "Unassigned"}</span>
                                    </div>
                                  </td>
                                );
                              case 'reporter':
                                return (
                                  <td key={col.key} className="p-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-semibold">
                                        {(row.reporter ? row.reporter.charAt(0) : "U")}
                                      </div>
                                      <span>{row.reporter || "Unassigned"}</span>
                                    </div>
                                  </td>
                                );
                              case 'priority':
                                return (
                                  <td key={col.key} className="p-3">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                      {PRIORITY_ICONS[row.priority]} {row.priority}
                                    </div>
                                  </td>
                                );
                              case 'status':
                                return (
                                  <td key={col.key} className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-xs   tracking-wide border ${row.status === 'TO DO' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                                      row.status === 'IN PROGRESS' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                        row.status === 'IN REVIEW' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                          row.status === 'TESTING' ? 'bg-green-100 text-green-700 border-green-200' :
                                            'bg-teal-100 text-teal-700 border-teal-200'
                                      }`}>
                                      {row.status}
                                    </span>
                                  </td>
                                );
                              case 'team':
                                return <td key={col.key} className="p-3 text-gray-700 font-medium">{row.team || '-'}</td>;
                              case 'resolution':
                                return <td key={col.key} className="p-3 text-gray-500 font-medium">{row.status === 'DONE' ? 'Done' : 'Unresolved'}</td>;
                              case 'created':
                                return <td key={col.key} className="p-3 text-gray-500 font-medium">{row.created_at ? new Date(row.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>;
                              case 'updated':
                                return <td key={col.key} className="p-3 text-gray-500 font-medium">{row.updated_at ? new Date(row.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>;
                              case 'dueDate':
                                return <td key={col.key} className="p-3 text-gray-500 font-medium">{row.due_date ? new Date(row.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : row.due_date || '-'}</td>;
                              case 'actions':
                                return (
                                  <td key={col.key} className="p-3">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Are you sure you want to delete ticket ${(row.issue_key || row.key)}?`)) {
                                          deleteIssue((row.issue_key || row.key));
                                        }
                                      }}
                                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors cursor-pointer flex items-center justify-center"
                                      title="Delete Ticket"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                );

                              // Unselected/extra columns mock renders
                              case 'progress':
                                return <td key={col.key} className="p-3 text-gray-700 ">{row.progress || 0}%</td>;
                              case 'remainingEstimate':
                                return <td key={col.key} className="p-3 text-gray-600">{row.remaining_estimate || '0h'}</td>;
                              case 'originalEstimate':
                                return <td key={col.key} className="p-3 text-gray-600">{row.original_estimate || '0h'}</td>;
                              case 'timeSpent':
                                return <td key={col.key} className="p-3 text-gray-600">{row.time_spent || '0h'}</td>;
                              case 'comments':
                                const commentCount = row.comments ? (Array.isArray(row.comments) ? row.comments.length : JSON.parse(row.comments).length) : 0;
                                return <td key={col.key} className="p-3 text-gray-600">{commentCount} Comments</td>;
                              case 'subTasks':
                                const subtaskCount = row.subtasks ? (Array.isArray(row.subtasks) ? row.subtasks.length : JSON.parse(row.subtasks).length) : 0;
                                return <td key={col.key} className="p-3 text-gray-600">{subtaskCount} Subtasks</td>;
                              case 'components':
                                return <td key={col.key} className="p-3 text-gray-600">{row.components || '-'}</td>;
                              case 'confluenceItems':
                                return <td key={col.key} className="p-3 text-gray-600">0 Links</td>;
                              case 'creator':
                                return <td key={col.key} className="p-3 text-gray-600">{row.reporter || 'System'}</td>;
                              case 'development':
                                return <td key={col.key} className="p-3 text-gray-600">0 Branches</td>;
                              case 'issueColor':
                                return (
                                  <td key={col.key} className="p-3">
                                    <div className="w-3.5 h-3.5 bg-blue-500 rounded-sm"></div>
                                  </td>
                                );
                              case 'rank':
                                return <td key={col.key} className="p-3 text-gray-600">High</td>;
                              case 'vulnerability':
                                return <td key={col.key} className="p-3 text-gray-600">None</td>;
                              case 'description':
                                return <td key={col.key} className="p-3 text-gray-500 truncate max-w-xs">Create wireframes and layout...</td>;
                              case 'environment':
                                return <td key={col.key} className="p-3 text-gray-600">Production</td>;
                              case 'fixVersions':
                                return <td key={col.key} className="p-3 text-gray-600">v1.0</td>;
                              case 'flagged':
                                return <td key={col.key} className="p-3 text-gray-600">No</td>;
                              case 'linkedWorkItems':
                                return <td key={col.key} className="p-3 text-gray-600">blocks WR-102</td>;
                              case 'labels':
                                return (
                                  <td key={col.key} className="p-3">
                                    <div className="flex items-center gap-1">
                                      {row.labels.map(l => (
                                        <span key={l} className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 rounded text-xs font-semibold">{l}</span>
                                      ))}
                                    </div>
                                  </td>
                                );
                              case 'lastViewed':
                                return <td key={col.key} className="p-3 text-gray-600">Just now</td>;
                              case 'parent':
                                return <td key={col.key} className="p-3 text-gray-600">Website Redesign</td>;
                              case 'space':
                                return <td key={col.key} className="p-3 text-gray-600">IT Workspace</td>;
                              case 'resolved':
                                return <td key={col.key} className="p-3 text-gray-600">-</td>;
                              case 'securityLevel':
                                return <td key={col.key} className="p-3 text-gray-600">Public</td>;
                              case 'startDate':
                                return <td key={col.key} className="p-3 text-gray-600">01 May 2024</td>;
                              case 'statusCategory':
                                return <td key={col.key} className="p-3 text-gray-600 font-medium">To Do</td>;
                              case 'statusCategoryChanged':
                                return <td key={col.key} className="p-3 text-gray-600 font-medium">01 May 2024</td>;
                              case 'subTasks':
                                return <td key={col.key} className="p-3 text-gray-600">0 Sub-tasks</td>;
                              case 'team':
                                return <td key={col.key} className="p-3 text-gray-600 font-semibold text-indigo-600">Frontend Team</td>;
                              case 'images':
                                return <td key={col.key} className="p-3 text-gray-600">1 Attachment</td>;
                              case 'affectsVersions':
                                return <td key={col.key} className="p-3 text-gray-600">v0.9</td>;
                              case 'votes':
                                return <td key={col.key} className="p-3 text-gray-600">2</td>;
                              case 'watchers':
                                return <td key={col.key} className="p-3 text-gray-600">5</td>;
                              case 'workRatio':
                                return <td key={col.key} className="p-3 text-gray-600">0.5</td>;
                              default:
                                return <td key={col.key} className="p-3 text-gray-500">-</td>;
                            }
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
                  <span>{tasks.length === 0 ? '0 issues' : `${(currentPage - 1) * rowsPerPage + 1}-${Math.min(currentPage * rowsPerPage, tasks.length)} of ${tasks.length} issues`}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 disabled:opacity-50"
                    >{'<'}</button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-6 h-6 flex items-center justify-center rounded ${currentPage === page ? 'bg-blue-600 text-white font-medium' : 'hover:bg-gray-100'}`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                    >{'>'}</button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE PANEL (ISSUE DETAILS) */}
            <ITIssueDetailsPanel
              issue={tasks.find(r => (r.issue_key || r.key) === selectedIssue)}
              updateIssue={updateIssue}
              deleteIssue={deleteIssue}
              onClose={() => setSelectedIssue(null)}
              onIssueCreated={fetchTasks}
            />

          </div>
        </div>
        <style>{`
        .animate-slide-left { animation: slideLeft 0.3s ease-out forwards; }
        @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
      </div>
    </>
  );
};

// Reusable custom SVG icons to match the screenshot
const CheckCircleIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);
const AlertTriangleIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
);

export default ITTasksPage;

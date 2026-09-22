import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskAPI, projectAPI, itKanbanAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import BoardTabs from '../common/BoardTabs';
import { 
  FileText, ChevronLeft, Search, Filter, Eye, X, Clock, User, 
  Briefcase, Activity, Calendar, MessageSquare, History, Tag, 
  CheckCircle2, AlertCircle, Clock3, UserCheck, UserX, ExternalLink,
  Layers, ArrowUpRight
} from 'lucide-react';

const ITTicketAssignmentsPage = () => {
  const { username, designation } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const urlPrefix = `/it/${designation || 'manager'}/${username || 'user'}`;

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Filters state
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');

  // Modal state
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const authParams = {
          user_id: user?.id || '',
          role: user?.role || designation || '',
          limit: 1000
        };

        const [projRes, generalTasksRes, projectTasksRes, kanbanRes, usersRes] = await Promise.allSettled([
          projectAPI.getAll(authParams),
          taskAPI.getAllGeneral(),
          taskAPI.getAllProjectTasks(),
          itKanbanAPI.getIssues(),
          usersAPI.getAll()
        ]);

        const rawProjects = projRes.status === 'fulfilled' ? (Array.isArray(projRes.value) ? projRes.value : (projRes.value?.data || [])) : [];
        const rawGeneral = generalTasksRes.status === 'fulfilled' ? (Array.isArray(generalTasksRes.value) ? generalTasksRes.value : (generalTasksRes.value?.data || [])) : [];
        const rawProjectTasks = projectTasksRes.status === 'fulfilled' ? (Array.isArray(projectTasksRes.value) ? projectTasksRes.value : (projectTasksRes.value?.data || [])) : [];
        const rawKanban = kanbanRes.status === 'fulfilled' ? (Array.isArray(kanbanRes.value) ? kanbanRes.value : (kanbanRes.value?.issues || kanbanRes.value?.data || [])) : [];
        const rawUsers = usersRes.status === 'fulfilled' ? (Array.isArray(usersRes.value) ? usersRes.value : (usersRes.value?.value || usersRes.value?.data || [])) : [];

        setProjects(rawProjects);
        setUsersList(rawUsers);

        // Map Kanban issues
        const mappedKanban = rawKanban.map(issue => {
          const key = issue.issue_key || `IT-${issue.id}`;
          const isMarketing = (issue.department && issue.department.toLowerCase().includes('market')) || (key.startsWith('MKT-'));
          const dept = isMarketing ? 'Marketing' : (issue.department || 'IT');
          const creator = issue.reporter && issue.reporter !== 'Unassigned' ? issue.reporter : 'System';
          const assignee = issue.assignee && issue.assignee !== 'Unassigned' ? issue.assignee : '';

          return {
            id: issue.id || key,
            key: key,
            issue_key: key,
            title: issue.title || issue.summary || 'Untitled Ticket',
            description: issue.description || '',
            created_by_name: creator,
            assigned_to_name: assignee,
            priority: issue.priority || 'Medium',
            status: (issue.status || 'TO DO').toUpperCase(),
            department: dept,
            project_id: issue.project_id || issue.parent_id,
            project_name: issue.parent_project_name || issue.project_name || (rawProjects.find(p => p.id === (issue.project_id || issue.parent_id))?.name),
            sprint_name: issue.sprint_name,
            created_at: issue.created_at,
            due_date: issue.due_date,
            start_date: issue.start_date,
            source: 'kanban_issue'
          };
        });

        // Map General tasks
        const mappedGeneral = rawGeneral.map(task => {
          const key = `GT-${task.id}`;
          const creator = task.assigned_by_name || (typeof task.created_by === 'string' ? task.created_by : 'System');
          const assignee = task.assigned_to_name || (typeof task.assigned_to === 'string' ? task.assigned_to : '');
          const dept = task.department || 'IT';

          return {
            id: task.id,
            key: key,
            issue_key: key,
            title: task.title || 'Untitled Task',
            description: task.description || '',
            created_by_name: creator,
            assigned_to_name: assignee,
            priority: task.priority || 'Medium',
            status: (task.status || 'TO DO').toUpperCase(),
            department: dept,
            project_id: task.project_id,
            project_name: task.project_name || (rawProjects.find(p => p.id === task.project_id)?.name),
            client_name: task.client_name,
            created_at: task.created_at,
            due_date: task.due_date,
            source: 'general_task'
          };
        });

        // Map Project tasks
        const mappedProjectTasks = rawProjectTasks.map(task => {
          const key = task.key || `TASK-${task.id}`;
          const creator = task.created_by_name || 'Project Lead';
          const assignee = task.assignee && task.assignee !== 'Unassigned' ? task.assignee : (task.assigned_to_name || '');
          const dept = task.department || 'IT';

          return {
            id: task.id,
            key: key,
            issue_key: key,
            title: task.title || 'Untitled Project Task',
            description: task.description || '',
            created_by_name: creator,
            assigned_to_name: assignee,
            priority: task.priority || 'Medium',
            status: (task.status || 'TO DO').toUpperCase(),
            department: dept,
            project_id: task.project_id,
            project_name: task.project_name || (rawProjects.find(p => p.id === task.project_id)?.name),
            created_at: task.created_at,
            due_date: task.due || task.due_date,
            source: 'project_task'
          };
        });

        // Combine all task sources
        const combined = [...mappedKanban, ...mappedGeneral, ...mappedProjectTasks]
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        setTasks(combined);
      } catch (err) {
        console.error('Error fetching ticket assignments data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, user?.role, designation]);

  // Derived unique filter options
  const uniqueStatuses = useMemo(() => {
    return [...new Set(tasks.map(t => t.status).filter(Boolean))].sort();
  }, [tasks]);

  const uniquePriorities = useMemo(() => {
    return [...new Set(tasks.map(t => t.priority).filter(Boolean))].sort();
  }, [tasks]);

  const uniqueCreators = useMemo(() => {
    return [...new Set(tasks.map(t => t.created_by_name).filter(Boolean))].sort();
  }, [tasks]);

  const uniqueAssignees = useMemo(() => {
    return [...new Set(tasks.map(t => t.assigned_to_name).filter(Boolean))].sort();
  }, [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q ||
        (task.title && task.title.toLowerCase().includes(q)) ||
        (task.key && task.key.toLowerCase().includes(q)) ||
        (task.project_name && task.project_name.toLowerCase().includes(q)) ||
        (task.created_by_name && task.created_by_name.toLowerCase().includes(q)) ||
        (task.assigned_to_name && task.assigned_to_name.toLowerCase().includes(q));

      const matchDept = departmentFilter === 'ALL' || (task.department || 'IT').toLowerCase() === departmentFilter.toLowerCase();
      const matchStatus = !statusFilter || task.status === statusFilter;
      const matchPriority = !priorityFilter || task.priority === priorityFilter;
      const matchCreator = !createdByFilter || task.created_by_name === createdByFilter;
      const matchAssignee = !assignedToFilter || 
        (assignedToFilter === 'UNASSIGNED' ? !task.assigned_to_name : task.assigned_to_name === assignedToFilter);

      return matchSearch && matchDept && matchStatus && matchPriority && matchCreator && matchAssignee;
    });
  }, [tasks, searchTerm, departmentFilter, statusFilter, priorityFilter, createdByFilter, assignedToFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter(t => t.status.includes('PROGRESS') || t.status.includes('ACTIVE')).length;
    const completed = tasks.filter(t => t.status.includes('DONE') || t.status.includes('COMPLETE') || t.status.includes('CLOSED')).length;
    const unassigned = tasks.filter(t => !t.assigned_to_name).length;
    return { total, inProgress, completed, unassigned };
  }, [tasks]);

  // Pagination
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(start, start + itemsPerPage);
  }, [filteredTasks, currentPage, itemsPerPage]);

  const resetFilters = () => {
    setDepartmentFilter('ALL');
    setStatusFilter('');
    setPriorityFilter('');
    setCreatedByFilter('');
    setAssignedToFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = departmentFilter !== 'ALL' || statusFilter || priorityFilter || createdByFilter || assignedToFilter || searchTerm;

  const getStatusBadgeClass = (status) => {
    const s = String(status || '').toUpperCase();
    if (s.includes('DONE') || s.includes('COMPLET') || s.includes('CLOSED')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s.includes('PROGRESS')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (s.includes('REVIEW') || s.includes('TEST')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getPriorityBadgeClass = (priority) => {
    const p = String(priority || '').toLowerCase();
    if (p.includes('high') || p.includes('urgent') || p.includes('critical')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (p.includes('medium')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC] font-sans">
      <div className="flex-1 flex flex-col min-w-0">
        <BoardTabs department="IT" spaceName="IT Workspace" />

        <div className="p-6 flex-1 max-w-[1600px] w-full mx-auto">
          {/* HEADER & METRICS */}
          <div className="flex flex-col gap-5 mb-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(urlPrefix + '/dashboard')}
                  className="p-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition shadow-sm"
                  title="Back to Dashboard"
                >
                  <ChevronLeft size={18} />
                </button>
                <div>
                  <h1 className="text-2xl text-gray-900 font-bold flex items-center gap-2">
                    <FileText className="text-blue-600" size={24} />
                    Ticket Assignments Overview
                  </h1>
                  <p className="text-gray-500 text-sm mt-0.5">
                    Centralized tracking of all ticket creations, assignments, and progression across IT and Marketing.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(urlPrefix + '/kanban')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 shadow-sm transition"
                >
                  <Layers size={14} className="text-blue-600" /> Open Kanban Board
                </button>
                <button
                  onClick={() => navigate(urlPrefix + '/backlog')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition"
                >
                  <ExternalLink size={14} /> Go to Backlog
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Tickets</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileText size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</div>
                <div className="text-xs text-gray-400 mt-1">Across all departments</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">In Progress</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Clock3 size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600 mt-2">{stats.inProgress}</div>
                <div className="text-xs text-gray-400 mt-1">Actively being worked on</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-600 mt-2">{stats.completed}</div>
                <div className="text-xs text-gray-400 mt-1">Resolved tickets</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unassigned</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <UserX size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-amber-600 mt-2">{stats.unassigned}</div>
                <div className="text-xs text-gray-400 mt-1">Awaiting assignment</div>
              </div>
            </div>

            {/* Department Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">Department:</span>
                {[
                  { key: 'ALL', label: 'All Departments', count: tasks.length },
                  { key: 'IT', label: 'IT', count: tasks.filter(t => (t.department || 'IT').toLowerCase() === 'it').length },
                  { key: 'Marketing', label: 'Marketing', count: tasks.filter(t => (t.department || '').toLowerCase() === 'marketing').length }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setDepartmentFilter(tab.key); setCurrentPage(1); }}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
                      departmentFilter === tab.key
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      departmentFilter === tab.key ? 'bg-blue-700 text-blue-100' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="text-xs text-gray-500">
                Showing <span className="font-bold text-gray-800">{filteredTasks.length}</span> of {tasks.length} tickets
              </div>
            </div>

            {/* Filters Toolbar */}
            <div className="flex items-center gap-3 flex-wrap p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold uppercase tracking-wider mr-1">
                <Filter size={14} className="text-blue-600" /> Filter by:
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[220px] flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search key, title, assignee..."
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>

              {/* Status Filter */}
              <select
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:bg-white focus:border-blue-500 cursor-pointer font-medium text-gray-700"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Priority Filter */}
              <select
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:bg-white focus:border-blue-500 cursor-pointer font-medium text-gray-700"
                value={priorityFilter}
                onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Priorities</option>
                {uniquePriorities.map(p => <option key={p} value={p}>{p}</option>)}
              </select>

              {/* Creator Filter */}
              <select
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:bg-white focus:border-blue-500 cursor-pointer font-medium text-gray-700 max-w-[170px]"
                value={createdByFilter}
                onChange={(e) => { setCreatedByFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Initiators</option>
                {uniqueCreators.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Assignee Filter */}
              <select
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:bg-white focus:border-blue-500 cursor-pointer font-medium text-gray-700 max-w-[170px]"
                value={assignedToFilter}
                onChange={(e) => { setAssignedToFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Assignees</option>
                <option value="UNASSIGNED">Unassigned Only</option>
                {uniqueAssignees.map(a => <option key={a} value={a}>{a}</option>)}
              </select>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg font-semibold transition ml-auto flex items-center gap-1"
                >
                  <X size={13} /> Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* TABLE CONTENT */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">Loading ticket assignments…</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Ticket Key</th>
                      <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Ticket Summary</th>
                      <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Department</th>
                      <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Project / Workspace</th>
                      <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Initiated By</th>
                      <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Assigned To</th>
                      <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Status</th>
                      <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Priority</th>
                      <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Due Date</th>
                      <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedTasks.map((task, idx) => {
                      const isMarketing = (task.department || '').toLowerCase() === 'marketing';
                      return (
                        <tr 
                          key={task.id || idx} 
                          onClick={() => setSelectedTicket(task)}
                          className="hover:bg-blue-50/40 transition cursor-pointer group"
                        >
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 group-hover:underline">
                              {task.key}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-gray-900 whitespace-normal break-words max-w-[320px] min-w-[220px]">
                            <div className="line-clamp-2 font-semibold text-gray-800 group-hover:text-blue-600 transition" title={task.title}>
                              {task.title}
                            </div>
                            {task.sprint_name && (
                              <span className="inline-block text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-1 font-medium">
                                🏃 {task.sprint_name}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                              isMarketing 
                                ? 'bg-orange-50 text-orange-700 border-orange-200' 
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {task.department || 'IT'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-gray-700 font-medium">
                              {task.project_name || 'General Workspace'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {(task.created_by_name || 'S').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-gray-800 font-medium">{task.created_by_name || 'System'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              {task.assigned_to_name ? (
                                <>
                                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                    {task.assigned_to_name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-gray-800 font-medium">{task.assigned_to_name}</span>
                                </>
                              ) : (
                                <span className="text-amber-700 bg-amber-50 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                                  Unassigned
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getStatusBadgeClass(task.status)}`}>
                              {task.status || 'TO DO'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getPriorityBadgeClass(task.priority)}`}>
                              {task.priority || 'Medium'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-500 font-medium">
                            {task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '–'}
                          </td>
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedTicket(task)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-semibold transition"
                            >
                              <Eye size={13} /> View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredTasks.length === 0 && !loading && (
                      <tr>
                        <td colSpan="10" className="p-16 text-center text-gray-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <FileText size={36} className="text-gray-300" />
                            <p className="font-semibold text-gray-700">No ticket assignments found</p>
                            <p className="text-xs text-gray-400">Try adjusting your department filter or search criteria.</p>
                            {hasActiveFilters && (
                              <button
                                onClick={resetFilters}
                                className="mt-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md text-xs font-semibold hover:bg-blue-100 transition"
                              >
                                Clear All Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/50">
                <span className="text-xs text-gray-500">
                  Page <span className="font-semibold text-gray-800">{currentPage}</span> of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-xs font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, index, array) => {
                      const prevVal = array[index - 1];
                      return (
                        <React.Fragment key={p}>
                          {prevVal && p - prevVal > 1 && <span className="text-gray-400 text-xs px-1">…</span>}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`px-2.5 py-1 text-xs font-medium rounded ${
                              currentPage === p
                                ? 'bg-blue-600 text-white font-semibold'
                                : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-xs font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* TICKET DETAILS HIERARCHY MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {selectedTicket.key}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                      selectedTicket.department?.toLowerCase() === 'marketing'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}>
                      {selectedTicket.department || 'IT'}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-gray-900 mt-1">
                    {selectedTicket.title}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Timeline & Details Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {/* Description if present */}
              {selectedTicket.description && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description</h4>
                  <div 
                    className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedTicket.description }}
                  />
                </div>
              )}

              {/* Steps Timeline */}
              <div className="relative pl-6 space-y-7 before:absolute before:inset-y-0 before:left-2.5 before:w-[2px] before:bg-blue-100">
                {/* Step 1: Initiation */}
                <div className="relative">
                  <div className="absolute -left-6 w-5 h-5 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center shadow-sm">
                    <User size={10} className="text-white" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Initiated By</h4>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                          {selectedTicket.created_by_name || 'System User'}
                        </span>
                      </div>
                    </div>
                    {selectedTicket.created_at && (
                      <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                        <Clock size={12} /> {new Date(selectedTicket.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Step 2: Project Workspace */}
                <div className="relative">
                  <div className="absolute -left-6 w-5 h-5 rounded-full bg-purple-600 border-2 border-white flex items-center justify-center shadow-sm">
                    <Briefcase size={10} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Project Workspace</h4>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
                        {selectedTicket.project_name || 'General Workspace'}
                      </span>
                      {selectedTicket.sprint_name && (
                        <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded border border-gray-200">
                          🏃 {selectedTicket.sprint_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 3: Assignment */}
                <div className="relative">
                  <div className="absolute -left-6 w-5 h-5 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center shadow-sm">
                    <UserCheck size={10} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned To</h4>
                    <div className="mt-1 flex items-center gap-2">
                      {selectedTicket.assigned_to_name ? (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                          {selectedTicket.assigned_to_name}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                          Unassigned
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 4: Status & Priority */}
                <div className="relative">
                  <div className="absolute -left-6 w-5 h-5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center shadow-sm">
                    <Activity size={10} className="text-white" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status & Priority</h4>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded border ${getStatusBadgeClass(selectedTicket.status)}`}>
                          {selectedTicket.status}
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded border ${getPriorityBadgeClass(selectedTicket.priority)}`}>
                          {selectedTicket.priority} Priority
                        </span>
                      </div>
                    </div>
                    {selectedTicket.due_date && (
                      <span className="text-xs text-gray-500 flex items-center gap-1 font-medium bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
                        <Calendar size={12} /> Due: {new Date(selectedTicket.due_date).toLocaleDateString([], { dateStyle: 'medium' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/60 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedTicket(null);
                  navigate(`${urlPrefix}/kanban?ticketKey=${encodeURIComponent(selectedTicket.key)}`);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
              >
                <ArrowUpRight size={14} /> Open in Kanban Board
              </button>
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition shadow-sm"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ITTicketAssignmentsPage;

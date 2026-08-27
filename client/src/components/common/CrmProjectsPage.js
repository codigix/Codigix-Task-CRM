import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Filter, Download, MoreHorizontal, Plus, Star, Eye, Edit, Trash2, FileText, Network, Folder, PlayCircle, CheckCircle, PauseCircle, Clock, XCircle, LayoutGrid, AlignJustify, Calendar, Import, Columns } from 'lucide-react';
import AddProjectModal from './AddProjectModal';
import { projectAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const CrmProjectsPage = ({ department }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isManager = user?.role && (user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('manager'));

  const navigateToProject = (id) => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length >= 3 && parts[1] !== 'employee' && parts[1] !== 'manager') {
      navigate(`/${parts[0]}/${parts[1]}/${parts[2]}/details/${id}`);
    } else if (parts.length >= 3) {
      navigate(`/${parts[0]}/${parts[1]}/${parts[2]}/details/${id}`);
    } else {
      navigate('/projects/details/' + id);
    }
  };
  const [allProjects, setAllProjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [activeView, setActiveView] = useState('table');
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isAssignTeamModalOpen, setIsAssignTeamModalOpen] = useState(false);
  const [selectedProjectToAssign, setSelectedProjectToAssign] = useState(null);
  const [assignTeamId, setAssignTeamId] = useState('');
  const [teamsList, setTeamsList] = useState([]);

  const defaultColumns = ['Project ID & Client', 'Project Name', 'Department', 'Team', 'Project Manager', 'Status', 'Priority', 'Date Range', 'Progress', 'Tasks', 'Actions'];
  const [visibleColumns, setVisibleColumns] = useState(defaultColumns);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);

  // DataTable States
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterManager, setFilterManager] = useState('');
  const [filterClient, setFilterClient] = useState('');

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (department) {
      const filtered = allProjects.filter(p =>
        (department === 'Marketing' && (p.category === 'Marketing' || p.project_type === 'Marketing' || p.workflow_type === 'Marketing' || p.service_type === 'Marketing')) ||
        (department === 'IT' && (p.category === 'IT' || p.project_type === 'IT' || p.workflow_type === 'IT' || p.service_type === 'IT' || p.category === 'Software'))
      );
      setProjects(filtered);
    } else {
      setProjects(allProjects);
    }
  }, [allProjects, department]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Note: deliberately no `assignedOnly` flag. That flag restricts results to projects the
      // user created or is explicitly rostered on, which hid the department's own projects from
      // its non-manager members. The API's non-manager branch already scopes results to
      // "mine OR my department", which is the visibility we want here.
      const authFilters = {
        department: user?.department || '',
        user_id: user?.id || '',
        role: user?.role || ''
      };

      const data = await projectAPI.getAll(authFilters);

      let projectsList = data;
      if (!Array.isArray(data)) {
        projectsList = data?.data || data?.projects || [];
      }

      if (Array.isArray(projectsList)) {
        setAllProjects(projectsList);
      } else {
        setAllProjects([]);
      }
    } catch (error) {
      console.error('❌ Failed to load projects:', error);
      setError('Failed to load projects: ' + error.message);
      setAllProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '0000-00-00') return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return '-';
    }
  };

  const handleAddProject = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await projectAPI.delete(projectId);
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } catch (err) {
        alert('Failed to delete project: ' + err.message);
      }
    }
  };

  const handleAssignTeamOpen = async (project) => {
    setSelectedProjectToAssign(project);
    setIsAssignTeamModalOpen(true);
    setAssignTeamId(project.team_id || '');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const deptParam = encodeURIComponent(department || 'IT');
      const res = await fetch(`${apiUrl}/teams?department=${deptParam}`);
      if (res.ok) {
        const data = await res.json();
        setTeamsList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignTeamSubmit = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiUrl}/projects/${selectedProjectToAssign.id}/assign-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: assignTeamId })
      });
      if (res.ok) {
        setIsAssignTeamModalOpen(false);
        loadProjects();
      } else {
        alert('Failed to assign team');
      }
    } catch (err) {
      console.error(err);
      alert('Error assigning team');
    }
  };

  const handleModalSubmit = async (formData) => {
    try {
      const projectData = {
        title: formData.name,
        name: formData.name,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        budget: parseFloat(String(formData.price).replace(/[^0-9.]/g, '')) || 0,
        due_date: formData.dueDate,
        start_date: formData.startDate,
        project_type: formData.projectType || department || 'IT',
        company: formData.client,
        company_id: formData.company_id,
        project_id: formData.projectId,
        manager_id: formData.manager_id,
        deal_id: formData.dealId || null,
        service_type: formData.category || null,
        department: department || 'IT'
      };

      if (editingProject) {
        await projectAPI.update(editingProject.id, projectData);
      } else {
        await projectAPI.create(projectData);
      }
      loadProjects();
      setIsModalOpen(false);
    } catch (err) {
      alert('Failed to save project: ' + err.message);
    }
  };

  const filteredProjects = projects.filter(p => {
    const projectTitle = (p.title || p.name || '').toLowerCase();
    const company = (p.company || p.client || p.company_name || '').toLowerCase();
    const projectIdCode = (p.project_id_code || '').toLowerCase();
    const manager = (p.manager_first_name ? `${p.manager_first_name} ${p.manager_last_name || ''}` : '').toLowerCase();
    const departmentName = (p.department_name || p.workflow_type || '').toLowerCase();
    const status = (p.status || '').toLowerCase();
    const priority = (p.priority || '').toLowerCase();

    const matchesSearch = projectTitle.includes(searchTerm.toLowerCase()) ||
      company.includes(searchTerm.toLowerCase()) ||
      projectIdCode.includes(searchTerm.toLowerCase());

    const matchesDepartment = !filterDepartment || departmentName.includes(filterDepartment.toLowerCase());
    const matchesStatus = !filterStatus || status === filterStatus.toLowerCase();
    const matchesPriority = !filterPriority || priority === filterPriority.toLowerCase();
    const matchesManager = !filterManager || manager.includes(filterManager.toLowerCase());
    const matchesClient = !filterClient || company.includes(filterClient.toLowerCase());

    return matchesSearch && matchesDepartment && matchesStatus && matchesPriority && matchesManager && matchesClient;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (!sortConfig.key) return 0;

    // special handling for nested/computed fields
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];

    if (sortConfig.key === 'manager') {
      valA = `${a.manager_first_name || ''} ${a.manager_last_name || ''}`.trim();
      valB = `${b.manager_first_name || ''} ${b.manager_last_name || ''}`.trim();
    } else if (sortConfig.key === 'client') {
      valA = a.company_name || a.company || a.client || '';
      valB = b.company_name || b.company || b.client || '';
    } else if (sortConfig.key === 'department') {
      valA = a.department_name || a.workflow_type || '';
      valB = b.department_name || b.workflow_type || '';
    }

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedProjects.length / itemsPerPage);
  const currentProjects = sortedProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('progress')) return <span className="text-xs px-2 py-0.5 rounded text-blue-600 bg-blue-50 border border-blue-200">In Progress</span>;
    if (s.includes('review') || s.includes('planning')) return <span className="text-xs px-2 py-0.5 rounded text-purple-600 bg-purple-50 border border-purple-200">Review</span>;
    if (s.includes('complete')) return <span className="text-xs px-2 py-0.5 rounded text-green-600 bg-green-50 border border-green-200">Completed</span>;
    if (s.includes('hold')) return <span className="text-xs px-2 py-0.5 rounded text-orange-600 bg-orange-50 border border-orange-200">On Hold</span>;
    return <span className="text-xs px-2 py-0.5 rounded text-gray-600 bg-gray-50 border border-gray-200">{status || 'Open'}</span>;
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || '').toLowerCase();
    if (p.includes('highest')) return <span className="text-xs px-2 py-0.5 rounded text-red-600 bg-red-50 border border-red-200 font-medium">Highest</span>;
    if (p.includes('high')) return <span className="text-xs px-2 py-0.5 rounded text-red-500 bg-red-50 border border-red-200 font-medium">High</span>;
    if (p.includes('low')) return <span className="text-xs px-2 py-0.5 rounded text-green-600 bg-green-50 border border-green-200 font-medium">Low</span>;
    return <span className="text-xs px-2 py-0.5 rounded text-yellow-600 bg-yellow-50 border border-yellow-200 font-medium">Medium</span>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);
  };

  // Metrics calculation
  const totalProjects = allProjects.length;
  const inProgress = allProjects.filter(p => (p.status || '').toLowerCase().includes('progress')).length;
  const completed = allProjects.filter(p => (p.status || '').toLowerCase().includes('complete')).length;
  const onHold = allProjects.filter(p => (p.status || '').toLowerCase().includes('hold')).length;
  const overdue = 0; // Placeholder
  const cancelled = 0; // Placeholder

  if (isLoading) {
    return (
      <div className="w-full bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 min-h-screen flex flex-col p-4 font-sans">
      {/* Header */}
      <div className="mb-3">
        <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
          <span>Dashboard</span> <span className="text-gray-400">›</span>
          <span>Projects</span> <span className="text-gray-400">›</span>
          <span className="text-gray-900 font-medium">All Projects</span>
        </div>
      </div>

      {/* Metrics Cards */}


      {/* Main Table Container */}
      <div className="">

        {/* Toolbar */}
        <div className=" border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl  text-gray-900">All Projects</h2>
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">{filteredProjects.length} Projects</span>
          </div>
          <div className="flex items-center gap-3 my-4">
            <button className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 p-2 rounded hover:bg-gray-50 transition">
              <Import size={14} /> Import
            </button>
            <button className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 p-2 rounded hover:bg-gray-50 transition">
              <Download size={14} /> Export
            </button>
            <div className="relative">
              <button
                onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 p-2 rounded hover:bg-gray-50 transition"
              >
                <Columns size={14} /> Columns
              </button>
              {showColumnsMenu && (
                <div className="absolute right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded w-48 z-50 p-2 text-xs text-gray-700">
                  <div className="font-medium text-gray-900 border-b pb-2 mb-2">Show/Hide Columns</div>
                  {defaultColumns.map(col => (
                    <label key={col} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 cursor-pointer rounded select-none">
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(col)}
                        onChange={() => {
                          if (visibleColumns.includes(col)) {
                            setVisibleColumns(visibleColumns.filter(c => c !== col));
                          } else {
                            setVisibleColumns([...visibleColumns, col]);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      {col}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {isManager && (
              <button
                onClick={handleAddProject}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 px-4 py-1.5 rounded hover:bg-blue-700 transition "
              >
                <Plus size={14} /> New Project
              </button>
            )}
          </div>
        </div>

        {/* Filters Row */}


        {/* Views Row */}
        <div className="px-4 mt-4 border-b border-gray-200 flex items-center gap-6 bg-white">
          <button
            onClick={() => setActiveView('table')}
            className={`flex items-center gap-1.5 py-3 -mb-px text-xs font-medium border-b-2 transition-colors ${activeView === 'table' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-900'}`}
          >
            <AlignJustify size={14} /> Table View
          </button>
          <button
            onClick={() => setActiveView('kanban')}
            className={`flex items-center gap-1.5 py-3 -mb-px text-xs font-medium border-b-2 transition-colors ${activeView === 'kanban' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-900'}`}
          >
            <LayoutGrid size={14} /> Kanban View
          </button>
          <button
            onClick={() => setActiveView('timeline')}
            className={`flex items-center gap-1.5 py-3 -mb-px text-xs font-medium border-b-2 transition-colors ${activeView === 'timeline' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-900'}`}
          >
            <AlignJustify size={14} /> Timeline View
          </button>
          <button
            onClick={() => setActiveView('calendar')}
            className={`flex items-center gap-1.5 py-3 -mb-px text-xs font-medium border-b-2 transition-colors ${activeView === 'calendar' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-900'}`}
          >
            <Calendar size={14} /> Calendar View
          </button>
        </div>

        {/* ── TABLE VIEW ── */}
        {activeView === 'table' && <div className="overflow-x-auto w-full">
          <table className="w-full text-left whitespace-nowrap border border-slate-200">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
              <tr>
                {visibleColumns.includes('Project ID & Client') && <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('project_id_code')}>Project ID & Client {sortConfig.key === 'project_id_code' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                {visibleColumns.includes('Project Name') && <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('name')}>Project Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                {visibleColumns.includes('Department') && <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('department')}>Department {sortConfig.key === 'department' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                {visibleColumns.includes('Team') && <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('team_name')}>Team {sortConfig.key === 'team_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                {visibleColumns.includes('Project Manager') && <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('manager')}>Project Manager {sortConfig.key === 'manager' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                {visibleColumns.includes('Status') && <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('status')}>Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                {visibleColumns.includes('Priority') && <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('priority')}>Priority {sortConfig.key === 'priority' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                {visibleColumns.includes('Date Range') && <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('start_date')}>Date Range {sortConfig.key === 'start_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                {visibleColumns.includes('Progress') && <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('progress')}>Progress {sortConfig.key === 'progress' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                {visibleColumns.includes('Tasks') && <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('completed_tasks')}>Tasks {sortConfig.key === 'completed_tasks' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                {visibleColumns.includes('Actions') && <th className="p-3 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {currentProjects.map((project) => {
                const progress = project.progress || 0;
                let teamMembers = [];
                if (project.team_members) {
                  try {
                    teamMembers = typeof project.team_members === 'string' ? JSON.parse(project.team_members) : project.team_members;
                  } catch (e) { }
                }

                return (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigateToProject(project.id)}>
                    {visibleColumns.includes('Project ID & Client') && <td className="p-3">
                      <div className="text-gray-900 font-medium mb-1">{project.project_id_code || `PRJ-00${project.id}`}</div>
                      {(project.company_name || project.company || project.client) ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                            {(project.company_name || project.company || project.client).charAt(0).toUpperCase()}
                          </div>
                          <span className="text-gray-500 text-xs truncate max-w-[120px]">{project.company_name || project.company || project.client}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>}
                    {visibleColumns.includes('Project Name') && <td className="p-3">
                      <div className="font-medium text-gray-900">{project.name || project.title}</div>
                      <div className="text-xs text-gray-500">{project.description ? project.description.substring(0, 30) + '...' : project.project_type || 'General'}</div>
                    </td>}
                    {visibleColumns.includes('Department') && <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs text-purple-600 bg-purple-50 border border-purple-100">
                        {project.department_name || project.workflow_type || 'Department'}
                      </span>
                    </td>}
                    {visibleColumns.includes('Team') && <td className="p-3">
                      {(project.team_name || project.assigned_team) ? (
                        <span className="px-2 py-0.5 rounded text-xs text-blue-600 bg-blue-50 border border-blue-100 font-medium">
                          {project.team_name || project.assigned_team}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>}
                    {visibleColumns.includes('Project Manager') && <td className="p-3">
                      <div className="flex items-center gap-2">
                        {project.manager_avatar ? (
                          <img src={project.manager_avatar} alt="Manager" className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                        ) : project.manager_first_name ? (
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                            {project.manager_first_name.charAt(0)}
                          </div>
                        ) : null}
                        <span className="text-gray-700">{project.manager_first_name ? `${project.manager_first_name} ${project.manager_last_name || ''}` : '-'}</span>
                      </div>
                    </td>}
                    {visibleColumns.includes('Status') && <td className="p-3">{getStatusBadge(project.status)}</td>}
                    {visibleColumns.includes('Priority') && <td className="p-3">{getPriorityBadge(project.priority)}</td>}
                    {visibleColumns.includes('Date Range') && <td className="p-3 text-gray-600">
                      {formatDate(project.start_date)} - {formatDate(project.due_date || project.end_date)}
                    </td>}
                    {visibleColumns.includes('Progress') && <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-600">{progress}%</span>
                      </div>
                    </td>}
                    {visibleColumns.includes('Tasks') && <td className="p-3 text-gray-600">{project.completed_tasks || 0}/{project.total_tasks || 0}</td>}
                    {visibleColumns.includes('Actions') && <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); navigateToProject(project.id); }} title="View" className="text-gray-400 hover:text-blue-600"><Eye size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleEditProject(project); }} title="Edit" className="text-gray-400 hover:text-green-600"><Edit size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleAssignTeamOpen(project); }} title="Assign Team" className="text-gray-400 hover:text-purple-600"><Network size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }} title="Delete" className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>}
                  </tr>
                )
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan="15" className="px-6 py-10 text-center text-gray-500">
                    No projects found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>}

        {/* ── KANBAN VIEW ── */}
        {activeView === 'kanban' && (
          <div className="overflow-x-auto p-4">
            <div className="flex gap-4 min-w-max">
              {['New', 'In Progress', 'Review', 'On Hold', 'Completed'].map(status => {
                const colProjects = filteredProjects.filter(p => {
                  const s = (p.status || '').toLowerCase();
                  if (status === 'New') return !s || s === 'new' || s === 'open' || s.includes('planning');
                  if (status === 'In Progress') return s.includes('progress');
                  if (status === 'Review') return s.includes('review');
                  if (status === 'On Hold') return s.includes('hold');
                  if (status === 'Completed') return s.includes('complete') || s.includes('done');
                  return false;
                });
                const colColors = {
                  'New': { bg: '#EFF6FF', border: '#BFDBFE', header: '#1D4ED8', dot: '#3B82F6' },
                  'In Progress': { bg: '#ECFDF5', border: '#A7F3D0', header: '#065F46', dot: '#10B981' },
                  'Review': { bg: '#F5F3FF', border: '#DDD6FE', header: '#5B21B6', dot: '#8B5CF6' },
                  'On Hold': { bg: '#FFF7ED', border: '#FED7AA', header: '#92400E', dot: '#F59E0B' },
                  'Completed': { bg: '#F0FDF4', border: '#BBF7D0', header: '#166534', dot: '#22C55E' },
                }[status];
                return (
                  <div key={status} style={{ width: 260, flexShrink: 0 }}>
                    <div style={{ background: colColors.bg, border: `1px solid ${colColors.border}`, borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${colColors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: colColors.dot, display: 'inline-block' }} />
                          <span style={{ fontWeight: 700, fontSize: 12, color: colColors.header }}>{status}</span>
                        </div>
                        <span style={{ background: colColors.border, color: colColors.header, fontSize: 11, fontWeight: 700, borderRadius: 12, padding: '1px 8px' }}>{colProjects.length}</span>
                      </div>
                      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
                        {colProjects.map(p => (
                          <div
                            key={p.id}
                            onClick={() => navigateToProject(p.id)}
                            style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,.08)', cursor: 'pointer', border: '1px solid #E5E7EB' }}
                          >
                            <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>{p.project_id_code || `PRJ-00${p.id}`}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>{p.name || p.title}</div>
                            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>{p.company_name || p.company || '-'}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <div style={{ flex: 1, height: 4, background: '#E5E7EB', borderRadius: 4 }}>
                                <div style={{ height: '100%', width: `${p.progress || 0}%`, background: colColors.dot, borderRadius: 4 }} />
                              </div>
                              <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>{p.progress || 0}%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9CA3AF' }}>
                              <span>Due: {formatDate(p.due_date || p.end_date)}</span>
                              {getPriorityBadge(p.priority)}
                            </div>
                          </div>
                        ))}
                        {colProjects.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: '#9CA3AF' }}>No projects</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TIMELINE VIEW ── */}
        {activeView === 'timeline' && (() => {
          const today = new Date();
          // Safely calculate min and max dates ensuring they are valid
          let validStartDates = filteredProjects.map(p => new Date(p.start_date || p.created_at || today)).filter(d => !isNaN(d));
          let validEndDates = filteredProjects.map(p => new Date(p.due_date || p.end_date || p.start_date || today)).filter(d => !isNaN(d));
          
          if (validStartDates.length === 0) validStartDates = [today];
          if (validEndDates.length === 0) validEndDates = [new Date(today.getTime() + 30 * 86400000)];

          const minDate = new Date(Math.min(...validStartDates, today.getTime() - 15 * 86400000));
          const maxDate = new Date(Math.max(...validEndDates, today.getTime() + 45 * 86400000));
          
          const totalDays = Math.max(1, (maxDate - minDate) / 86400000);
          
          const getLeft = d => !d ? 0 : Math.max(0, Math.min(100, (new Date(d) - minDate) / 86400000 / totalDays * 100));
          const getWidth = (s, e) => {
            const start = s ? Math.max(new Date(s), minDate) : minDate;
            const end = e ? Math.min(new Date(e), maxDate) : new Date(start.getTime() + 7 * 86400000);
            return Math.max(0.5, Math.min(100, (end - start) / 86400000 / totalDays * 100));
          };
          
          const months = [];
          const cur = new Date(minDate); 
          cur.setDate(1);
          while (cur <= maxDate) {
            months.push(new Date(cur));
            cur.setMonth(cur.getMonth() + 1);
          }
          
          // Generate an array of week markers
          const weeks = [];
          const curWeek = new Date(minDate);
          // adjust to nearest Monday or just add 7 days
          while (curWeek <= maxDate) {
            weeks.push(new Date(curWeek));
            curWeek.setDate(curWeek.getDate() + 7);
          }

          const getStatusColor = (status) => {
            switch ((status || '').toLowerCase()) {
              case 'completed': return 'from-emerald-400 to-emerald-500';
              case 'in progress': return 'from-blue-400 to-blue-500';
              case 'on hold': return 'from-amber-400 to-amber-500';
              case 'cancelled': return 'from-red-400 to-red-500';
              default: return 'from-indigo-400 to-indigo-500';
            }
          };

          return (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col mt-4 shadow-sm">
              <div className="overflow-x-auto custom-scrollbar" style={{ padding: '20px 24px' }}>
                <div style={{ minWidth: 1000, position: 'relative' }}>
                  
                  {/* Timeline Header (Months & Grid) */}
                  <div className="relative border-b border-gray-200 mb-4" style={{ height: 40, marginLeft: 220 }}>
                    {months.map((m, i) => {
                      const leftPos = getLeft(m);
                      return (
                        <div key={`m-${i}`} className="absolute top-0 text-[11px] font-bold text-gray-500 uppercase tracking-wider" style={{ left: `${leftPos}%`, transform: leftPos > 95 ? 'translateX(-100%)' : 'none' }}>
                          <div className="pl-1 border-l border-gray-300 h-10 pt-1">
                            {m.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Project Rows */}
                  <div className="space-y-3">
                    {filteredProjects.map((p, i) => {
                      const actualStart = p.start_date || p.created_at || today;
                      const actualEnd = p.due_date || p.end_date || new Date(new Date(actualStart).getTime() + 7 * 86400000);
                      
                      return (
                        <div key={p.id} className="flex items-center group">
                          {/* Left Panel: Project Info */}
                          <div className="w-[220px] pr-4 flex-shrink-0 flex items-center justify-between border-r border-gray-100 py-1">
                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors" onClick={() => navigateToProject(p.id)} title={p.name || p.title}>
                                {p.name || p.title}
                              </h4>
                              <p className="text-[10px] text-gray-500 truncate mt-0.5">{p.department_name || p.workflow_type || 'Uncategorized'}</p>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 flex-shrink-0 ml-2" title={p.manager_name || 'No Manager'}>
                              {p.manager_name ? p.manager_name.charAt(0).toUpperCase() : '?'}
                            </div>
                          </div>
                          
                          {/* Right Panel: Timeline Row */}
                          <div className="flex-1 relative h-10 bg-gray-50/40 rounded-r-md border-y border-r border-gray-100 overflow-hidden hover:bg-gray-50 transition-colors">
                            {/* Week Grid Lines */}
                            {weeks.map((w, wi) => (
                              <div key={`w-${wi}`} className="absolute top-0 bottom-0 border-l border-gray-200/60 border-dashed pointer-events-none" style={{ left: `${getLeft(w)}%` }} />
                            ))}
                            {/* Month Grid Lines */}
                            {months.map((m, mi) => (
                              <div key={`mline-${mi}`} className="absolute top-0 bottom-0 border-l border-gray-300 pointer-events-none" style={{ left: `${getLeft(m)}%` }} />
                            ))}
                            {/* Today Line */}
                            <div className="absolute top-0 bottom-0 border-l-2 border-red-400 pointer-events-none z-10" style={{ left: `${getLeft(today)}%` }}>
                              <div className="absolute -top-3 -translate-x-1/2 bg-red-100 text-red-600 text-[9px] font-bold px-1 rounded whitespace-nowrap">TODAY</div>
                            </div>
                            
                            {/* Gantt Bar */}
                            <div 
                              className={`absolute top-2 h-6 rounded-md shadow-sm bg-gradient-to-r ${getStatusColor(p.status)} cursor-pointer transition-all hover:scale-y-110 flex items-center overflow-hidden group-hover:shadow-md z-20`}
                              style={{
                                left: `${getLeft(actualStart)}%`,
                                width: `${getWidth(actualStart, actualEnd)}%`,
                                minWidth: '24px' // ensure it's visible even if duration is 0
                              }}
                              onClick={() => navigateToProject(p.id)}
                              title={`${p.name || p.title}\n${formatDate(actualStart)} - ${formatDate(actualEnd)}\nStatus: ${p.status || 'Unknown'}\nProgress: ${p.progress || 0}%`}
                            >
                              {/* Progress Fill */}
                              {p.progress > 0 && (
                                <div className="absolute top-0 left-0 bottom-0 bg-black/10 border-r border-black/10" style={{ width: `${p.progress}%` }} />
                              )}
                              <span className="relative z-10 text-[10px] text-white font-semibold px-2 truncate drop-shadow-sm">
                                {p.progress || 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredProjects.length === 0 && (
                      <div className="text-center py-12 bg-gray-50 rounded-md border border-gray-100 border-dashed">
                        <p className="text-sm text-gray-500 font-medium">No projects to display on timeline.</p>
                      </div>
                    )}
                  </div>
                  
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── CALENDAR VIEW ── */}
        {activeView === 'calendar' && (() => {
          const year = calendarDate.getFullYear();
          const month = calendarDate.getMonth();
          const firstDay = new Date(year, month, 1).getDay();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : i - firstDay + 1);
          const dotColors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
          const projectsByDay = {};
          filteredProjects.forEach(p => {
            const d = p.due_date || p.end_date;
            if (!d) return;
            const pd = new Date(d);
            if (pd.getFullYear() === year && pd.getMonth() === month) {
              const day = pd.getDate();
              if (!projectsByDay[day]) projectsByDay[day] = [];
              projectsByDay[day].push(p);
            }
          });
          return (
            <div style={{ padding: 16 }}>
              {/* Calendar nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <button
                  onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                  style={{ border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 12px', fontSize: 13, cursor: 'pointer', background: '#fff' }}
                >&lt; Prev</button>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                  {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                  style={{ border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 12px', fontSize: 13, cursor: 'pointer', background: '#fff' }}
                >Next &gt;</button>
              </div>
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6B7280', padding: '4px 0' }}>{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                {cells.map((day, idx) => {
                  const isToday = day && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                  const dayProjects = day ? (projectsByDay[day] || []) : [];
                  return (
                    <div
                      key={idx}
                      style={{
                        minHeight: 80, background: day ? '#fff' : 'transparent',
                        border: day ? (isToday ? '2px solid #4F46E5' : '1px solid #E5E7EB') : 'none',
                        borderRadius: 8, padding: day ? '6px 8px' : 0
                      }}
                    >
                      {day && (
                        <>
                          <div style={{
                            fontSize: 12, fontWeight: 700,
                            color: isToday ? '#fff' : '#374151',
                            background: isToday ? '#4F46E5' : 'transparent',
                            width: 22, height: 22, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 4
                          }}>{day}</div>
                          {dayProjects.slice(0, 3).map((p, pi) => (
                            <div
                              key={p.id}
                              onClick={() => navigateToProject(p.id)}
                              title={p.name || p.title}
                              style={{
                                fontSize: 10, fontWeight: 600, color: '#fff',
                                background: dotColors[pi % dotColors.length],
                                borderRadius: 4, padding: '1px 5px', marginBottom: 2,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                cursor: 'pointer'
                              }}
                            >
                              {p.name || p.title}
                            </div>
                          ))}
                          {dayProjects.length > 3 && (
                            <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>+{dayProjects.length - 3} more</div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Pagination */}
        {activeView === 'table' && <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-between text-xs text-gray-500">
          <div>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedProjects.length)} of {sortedProjects.length} projects</div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              &lt;
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-6 h-6 flex items-center justify-center rounded ${page === currentPage ? 'bg-blue-600 text-white font-medium' : 'border border-gray-200 hover:bg-gray-50'}`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              &gt;
            </button>
            <select className="ml-2 border border-gray-200 rounded px-2 py-1 outline-none">
              <option>10 / page</option>
            </select>
          </div>
        </div>}
      </div>

      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
        }}
        onSubmit={handleModalSubmit}
        initialData={editingProject}
        department={department}
      />

      {/* Assign Team Modal */}
      {isAssignTeamModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Network size={16} className="text-blue-600" /> Assign Team to Project</h2>
              <button onClick={() => setIsAssignTeamModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={18} />
              </button>
            </div>
            <form onSubmit={handleAssignTeamSubmit} className="p-5">
              {selectedProjectToAssign && (selectedProjectToAssign.team_name || selectedProjectToAssign.assigned_team) && (
                <div className="mb-4 bg-blue-50/50 p-3 rounded border border-blue-100">
                  <h3 className="text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Currently Assigned Team</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                    <span className="text-sm font-medium text-blue-700">{selectedProjectToAssign.team_name || selectedProjectToAssign.assigned_team}</span>
                  </div>
                </div>
              )}

              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  {(selectedProjectToAssign && (selectedProjectToAssign.team_name || selectedProjectToAssign.assigned_team)) ? 'Assign New Team' : 'Select a Team'}
                </label>
                <select
                  value={assignTeamId}
                  onChange={(e) => setAssignTeamId(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
                >
                  <option value="">-- No Team Assigned --</option>
                  {teamsList.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <p className="mt-2 text-[10px] text-gray-500">Selecting a team will assign all its members to this project.</p>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAssignTeamModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition"
                >
                  Assign Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrmProjectsPage;
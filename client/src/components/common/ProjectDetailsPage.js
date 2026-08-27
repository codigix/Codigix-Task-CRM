import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Edit3, MoreHorizontal, Plus, FileText, CheckSquare,
  Flag, Users, Clock, DollarSign, UploadCloud, Download,
  Folder as FolderIcon, Send, Calendar as CalendarIcon,
  Search, Filter, PlayCircle, BarChart2, PieChart as PieChartIcon, Trash2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import AddProjectModal from './AddProjectModal';
import AddNewTaskModal from './AddNewTaskModal';
import AddTeamMemberModal from './AddTeamMemberModal';
import AddTimeLogModal from './AddTimeLogModal';
import ITCreateIssueDrawer from '../it/ITCreateIssueDrawer';
import ITIssueDetailsPanel from '../it/ITIssueDetailsPanel';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


const TABS = ['Overview', 'Tasks', 'Milestones', 'Team', 'Documents', 'Time Logs', 'Activity', 'Reports', 'Timeline', 'Calendar', 'Settings'];

const ProjectDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isTimeLogModalOpen, setIsTimeLogModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const fileInputRef = useRef(null);
  const [assignedTeamName, setAssignedTeamName] = useState('');
  const [assignedTeam, setAssignedTeam] = useState(null);
  const [teamRoster, setTeamRoster] = useState([]); // team_members table (for overview card)
  const [milestones, setMilestones] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [newDiscussionMsg, setNewDiscussionMsg] = useState('');
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', owner_id: '', start_date: '', due_date: '', status: 'Not Started', progress: 0 });

  const handleSendDiscussion = async () => {
    if (!newDiscussionMsg.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${id}/discussions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newDiscussionMsg, user_id: 1 }) // Hardcoded user_id for now as per mock auth
      });
      if (res.ok) {
        const newMsg = await res.json();
        setDiscussions([...discussions, newMsg]);
        setNewDiscussionMsg('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskSubmit = async (formData) => {
    try {
      const taskData = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        assigned_to: formData.assigned_to[0] || null, // Assuming first assignee
        due_date: formData.due_date,
      };

      let res;
      if (editingTask) {
        res = await fetch(`${API_BASE_URL}/project-tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
      } else {
        res = await fetch(`${API_BASE_URL}/projects/${id}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
      }

      if (!res.ok) throw new Error('Failed to save task');

      const tRes = await fetch(`${API_BASE_URL}/projects/${id}/tasks`);
      if (tRes.ok) {
        setProjectTasks(await tRes.json());
      }
      setIsTaskModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTaskDelete = async (taskId, taskSource) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const sourceParam = taskSource ? `?task_source=${taskSource}` : '';
      const res = await fetch(`${API_BASE_URL}/project-tasks/${taskId}${sourceParam}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');

      const tRes = await fetch(`${API_BASE_URL}/projects/${id}/tasks`);
      if (tRes.ok) {
        setProjectTasks(await tRes.json());
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const formatProjectTaskForIssuePanel = (task) => {
    if (!task) return null;
    return {
      ...task,
      key: `TASK-${task.id}`,
      issue_key: `TASK-${task.id}`,
      title: task.title,
      description: task.description || '',
      status: task.status ? task.status.toUpperCase() : 'TO DO',
      priority: task.priority || 'Medium',
      assignee: task.first_name || 'Unassigned',
      subtasks: [],
      linked_issues: [],
      comments: []
    };
  };

  const handleUpdateProjectTask = async (key, updates) => {
    const taskId = key.split('-')[1];
    if (!taskId) return;

    try {
      const currentTask = projectTasks.find(t => String(t.id) === String(taskId));
      if (!currentTask) return;

      let status = updates.status || currentTask.status;

      const taskData = {
        title: updates.title !== undefined ? updates.title : currentTask.title,
        description: updates.description !== undefined ? updates.description : currentTask.description,
        status: status,
        priority: updates.priority !== undefined ? updates.priority : currentTask.priority,
        assigned_to: updates.assignee !== undefined ? (updates.assignee === 'Unassigned' ? null : currentTask.assigned_to) : currentTask.assigned_to,
        due_date: updates.due_date !== undefined ? updates.due_date : currentTask.due_date,
        task_source: currentTask.task_source,
      };

      const res = await fetch(`${API_BASE_URL}/project-tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (!res.ok) throw new Error('Failed to update task');

      await fetchTasks();
    } catch (err) {
      console.error('Error updating project task:', err);
    }
  };

  const handleDeleteProjectTask = async (key) => {
    const taskId = key.split('-')[1];
    if (!taskId) return;

    const task = projectTasks.find(t => String(t.id) === String(taskId));
    await handleTaskDelete(taskId, task?.task_source);
    setSelectedIssueId(null);
  };

  const reloadTeam = async () => {
    try {
      const teamRes = await fetch(`${API_BASE_URL}/projects/${id}/team`);
      if (teamRes.ok) {
        setTeamMembers(await teamRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${id}/team/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove member');
      reloadTeam();
    } catch (err) {
      alert(err.message);
    }
  };

  const reloadTimeLogs = async () => {
    try {
      const timeRes = await fetch(`${API_BASE_URL}/projects/${id}/timesheets`);
      if (timeRes.ok) {
        setTimeLogs(await timeRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const reloadDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/files?project_id=${id}`);
      if (res.ok) {
        setDocuments(await res.json());
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', '1'); // Default fallback user
    formData.append('project_id', id);

    try {
      const res = await fetch(API_BASE_URL + '/files/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      await reloadDocuments();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
  };

  const handleFileDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/files/${fileId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete file');
      await reloadDocuments();
    } catch (err) {
      alert(err.message);
    }
  };

  const fetchTasks = async () => {
    try {
      let combined = [];

      // 1. Fetch project_tasks
      const tasksRes = await fetch(`${API_BASE_URL}/projects/${id}/tasks`);
      if (tasksRes.ok) {
        const pTasks = await tasksRes.json();
        if (Array.isArray(pTasks)) combined.push(...pTasks);
      }

      // 2. Fetch IT Kanban issues for this project
      const kanbanRes = await fetch(API_BASE_URL + '/it-kanban/issues');
      if (kanbanRes.ok) {
        const kIssues = await kanbanRes.json();
        if (Array.isArray(kIssues)) {
          const projectKanban = kIssues.filter(issue => Number(issue.project_id) === Number(id));
          const formattedKanban = projectKanban.map(issue => ({
            id: issue.id,
            issue_key: issue.issue_key,
            title: issue.title,
            description: issue.description || '',
            status: issue.status || 'TO DO',
            priority: issue.priority || 'Medium',
            assigned_to: issue.assignee,
            first_name: issue.assignee ? issue.assignee.split(' ')[0] : 'Unassigned',
            last_name: issue.assignee ? issue.assignee.split(' ')[1] || '' : '',
            reporter: issue.reporter,
            team: issue.team,
            due_date: issue.due_date,
            isKanban: true
          }));
          combined.push(...formattedKanban);
        }
      }

      setProjectTasks(combined);
    } catch (err) {
      console.error('Error refreshing tasks:', err);
    }
  };

  const handleEditSubmit = async (formData) => {
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
        project_type: formData.projectType,
        company: formData.client,
        company_name: formData.client,
        company_id: formData.company_id,
        project_id: formData.projectId,
        manager_id: formData.manager_id
      };

      const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      if (!res.ok) throw new Error('Failed to update project');

      const pRes = await fetch(`${API_BASE_URL}/projects/${id}`);
      if (pRes.ok) {
        setProject(await pRes.json());
      }
      setIsEditModalOpen(false);
    } catch (err) {
      alert('Failed to save project: ' + err.message);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const pRes = await fetch(`${API_BASE_URL}/projects/${id}`);
        if (!pRes.ok) throw new Error('Failed to fetch project details');
        const pData = await pRes.json();
        setProject(pData);

        if (pData.team_id) {
          try {
            // Fetch team details (includes manager_name from the GET /api/teams query)
            const teamsRes = await fetch(API_BASE_URL + '/teams');
            if (teamsRes.ok) {
              const teamsList = await teamsRes.json();
              const matchedTeam = teamsList.find(t => Number(t.id) === Number(pData.team_id));
              if (matchedTeam) {
                setAssignedTeamName(matchedTeam.name);
                setAssignedTeam(matchedTeam);
              } else {
                setAssignedTeamName('');
                setAssignedTeam(null);
              }
            }

            // Fetch team roster for Overview card (from team_members table)
            const teamRosterRes = await fetch(`${API_BASE_URL}/teams/${pData.team_id}/members`);
            if (teamRosterRes.ok) {
              setTeamRoster(await teamRosterRes.json());
            }
          } catch (teamErr) {
            console.error('Failed to fetch team details:', teamErr);
          }
        } else {
          setAssignedTeamName('');
          setAssignedTeam(null);
        }

        const msRes = await fetch(`${API_BASE_URL}/projects/${id}/milestones`);
        if (msRes.ok) {
          setMilestones(await msRes.json());
        }

        await fetchTasks();

        // Fetch project_team members for Team tab
        const teamTabRes = await fetch(`${API_BASE_URL}/projects/${id}/team`);
        if (teamTabRes.ok) {
          setTeamMembers(await teamTabRes.json());
        }

        const timeRes = await fetch(`${API_BASE_URL}/projects/${id}/timesheets`);
        if (timeRes.ok) {
          setTimeLogs(await timeRes.json());
        }

        const docsRes = await fetch(`${API_BASE_URL}/files?project_id=${id}`);
        if (docsRes.ok) {
          setDocuments(await docsRes.json());
        }

        const discRes = await fetch(`${API_BASE_URL}/projects/${id}/discussions`);
        if (discRes.ok) {
          setDiscussions(await discRes.json());
        }

        const actRes = await fetch(`${API_BASE_URL}/projects/${id}/activity`);
        if (actRes.ok) {
          setActivityLogs(await actRes.json());
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  useEffect(() => {
    if (projectTasks.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const taskIdParam = params.get('taskId');
      if (taskIdParam && taskIdParam.startsWith('TASK-')) {
        const taskId = parseInt(taskIdParam.split('-')[1]);
        if (taskId) {
          const exists = projectTasks.some(t => Number(t.id) === Number(taskId));
          if (exists) {
            setSelectedIssueId(taskId);
            setActiveTab('Tasks');
          }
        }
      }
    }
  }, [projectTasks]);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="w-full h-screen p-8 bg-gray-50 flex flex-col items-center justify-center">
        <h2 className="text-xl  text-gray-900 mb-2">Project not found</h2>
        <p className="text-gray-600 mb-4">{error || "The project you're looking for doesn't exist."}</p>
        <button onClick={() => navigate(-1)} className="p-2 bg-blue-600 text-white rounded-md font-medium text-sm">
          Go Back
        </button>
      </div>
    );
  }



  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(val || 0);

  const getNormStatus = (s) => (s || '').toUpperCase().trim();

  const stats = {
    todo: projectTasks.filter(t => ['TO DO', 'OPEN', 'BACKLOG'].includes(getNormStatus(t.status))).length,
    inProgress: projectTasks.filter(t => ['IN PROGRESS'].includes(getNormStatus(t.status))).length,
    review: projectTasks.filter(t => ['IN REVIEW', 'REVIEW', 'PENDING', 'TESTING', 'ON HOLD'].includes(getNormStatus(t.status))).length,
    completed: projectTasks.filter(t => ['DONE', 'COMPLETED', 'CLOSED'].includes(getNormStatus(t.status))).length,
    total: projectTasks.length || 1, // avoid division by zero
  };
  const totalReal = projectTasks.length;

  const progress = Math.round((stats.completed / stats.total) * 100);

  const pieData = [
    { name: 'Completed', value: stats.completed, color: '#0ea5e9' },
    { name: 'In Progress', value: stats.inProgress, color: '#2563eb' },
    { name: 'To Do', value: stats.todo, color: '#eab308' },
    { name: 'Review', value: stats.review, color: '#f59e0b' }
  ];

  // =====================
  // TAB RENDER FUNCTIONS
  // =====================

  const renderOverview = () => (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white rounded border border-gray-200  p-2">
            <h3 className="text-sm  text-gray-900 mb-2">Project Overview</h3>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              {project.description || 'No description provided.'}
            </p>
            <div className="space-y-3">
              {[
                ['Project ID', project.project_id_code || `PRJ-00${project.id}`],
                ['Client', project.company_name || project.client || '-'],
                ['Department', project.department_name || project.workflow_type || '-'],
                ['Services', (project.client_services && project.client_services.length > 0) ? (
                  <div className="flex flex-wrap gap-1">
                    {project.client_services.map((s, si) => (
                      <span key={si} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-bold border border-indigo-100 text-[10px]">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (project.service_name || '-')],
                ['Assigned Team', (project.team_name || assignedTeamName) ? <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold border border-emerald-100 text-[10px]">{project.team_name || assignedTeamName}</span> : 'No team assigned'],
                ['Project Manager', `${project.manager_first_name || ''} ${project.manager_last_name || ''}`.trim() || 'Unassigned'],
                ['Priority', <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded text-[9px] font-medium border border-red-200">{project.priority || '-'}</span>],
                ['Start Date', formatDate(project.start_date)],
                ['End Date', formatDate(project.due_date || project.end_date)],
                ['Status', <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[9px] font-medium border border-blue-200">{project.status || '-'}</span>],
                ['Progress',
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 h-1 bg-gray-100 rounded-full"><div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }}></div></div>
                    <span className="text-xs">{progress}%</span>
                  </div>
                ],
              ].map(([label, val], i) => (
                <div key={i} className="flex text-xs">
                  <span className="w-1/3 text-gray-500">{label}</span>
                  <span className="w-4 text-gray-400">:</span>
                  <span className="flex-1 font-medium text-gray-900 flex items-center">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Team Info Card */}
          <div className="bg-white rounded border border-gray-200 p-3">
            <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5 border-b border-gray-100 pb-2 uppercase tracking-wider">
              <Users size={14} className="text-indigo-600" />
              Assigned Team Info
            </h3>
            {(project?.team_name || assignedTeamName) ? (
              <div className="space-y-4">
                <div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold border border-emerald-100 text-[10px]">
                    {project?.team_name || assignedTeamName}
                  </span>
                </div>
                
                {/* Team Manager */}
                <div className="border-t border-gray-100 pt-3">
                  <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Team Manager</h4>
                  <div className="flex items-center gap-2">
                    {assignedTeam?.manager_name ? (
                      <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {assignedTeam.manager_name[0].toUpperCase()}
                      </div>
                    ) : null}
                    <div>
                      <p className="text-xs font-bold text-gray-800">
                        {assignedTeam?.manager_name || 'Unassigned'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Team Members List */}
                <div className="border-t border-gray-100 pt-3">
                  <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Allocated Team Roster ({teamRoster.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {teamRoster.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          {m.avatar ? (
                            <img src={m.avatar} alt="A" className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className="w-5 h-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-[9px] font-bold">
                              {m.first_name ? m.first_name[0].toUpperCase() : 'U'}
                            </div>
                          )}
                          <span className="font-semibold text-gray-800">{m.first_name} {m.last_name}</span>
                        </div>
                        <span className="text-[9px] text-gray-500 font-semibold bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{m.role || 'Member'}</span>
                      </div>
                    ))}
                    {teamRoster.length === 0 && (
                      <p className="text-gray-400 italic text-[10px]">No team members allocated.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 italic text-xs">
                No team currently assigned to this project.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded border border-gray-200  p-2 flex flex-col">
          <h3 className="text-sm  text-gray-900 mb-6">Progress Overview</h3>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="h-40 w-40 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl  text-gray-900">{progress}%</span>
                <span className="text-[9px] text-gray-500 w-16 leading-tight">Overall Progress</span>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-2 w-full px-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#0ea5e9]"></div> <span className="text-gray-600">Completed</span></div>
                <span className="font-medium">{stats.completed} ({Math.round((stats.completed / stats.total) * 100)}%)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-600"></div> <span className="text-gray-600">In Progress</span></div>
                <span className="font-medium">{stats.inProgress} ({Math.round((stats.inProgress / stats.total) * 100)}%)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> <span className="text-gray-600">To Do</span></div>
                <span className="font-medium">{stats.todo} ({Math.round((stats.todo / stats.total) * 100)}%)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded border border-gray-200  p-2">
          <h3 className="text-sm  text-gray-900 mb-6">Task Status</h3>
          <div className="flex flex-col gap-2">
            {[
              { label: 'To Do', count: stats.todo, color: 'bg-gray-200' },
              { label: 'In Progress', count: stats.inProgress, color: 'bg-blue-600' },
              { label: 'Review', count: stats.review, color: 'bg-yellow-500' },
              { label: 'Completed', count: stats.completed, color: 'bg-[#0ea5e9]' },
            ].map((status, i) => {
              const pct = Math.round((status.count / stats.total) * 100) || 0;
              return (
                <div key={i} className="flex items-center text-xs">
                  <span className="w-20 text-gray-600">{status.label}</span>
                  <div className="flex-1 mx-3 h-1.5 bg-gray-100 rounded-full flex overflow-hidden">
                    <div className={`h-full rounded-full ${status.color}`} style={{ width: `${pct}%` }}></div>
                  </div>
                  <span className="w-12 text-right font-medium text-gray-900">{status.count} ({pct}%)</span>
                </div>
              )
            })}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between  text-gray-900 text-[12px]">
              <span>Total</span>
              <span>{totalReal}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="bg-white rounded border border-gray-200  animate-fade-in">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input type="text" placeholder="Search tasks..." className="pl-9 pr-4 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-blue-500" />
          </div>
          <button className="flex items-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 p-2 rounded hover:bg-gray-50"><Filter size={12} /> Filter</button>
        </div>
        <button onClick={() => setIsCreateDrawerOpen(true)} className="flex items-center gap-1.5 text-xs text-white bg-blue-600 p-2 rounded font-medium hover:bg-blue-700"><Plus size={12} /> Create Task</button>
      </div>
      <table className="w-full text-left whitespace-nowrap text-xs">
        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
          <tr>
            <th className="p-3 font-medium text-center w-10"><input type="checkbox" className="rounded border-gray-300" /></th>
            <th className="p-3 font-medium">Task</th>
            <th className="p-3 font-medium">Assignee</th>
            <th className="p-3 font-medium">Reporter</th>
            <th className="p-3 font-medium">Priority</th>
            <th className="p-3 font-medium">Status</th>
            <th className="p-3 font-medium">Due Date</th>
            <th className="p-3 font-medium">Progress</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-gray-700">
          {projectTasks.length > 0 ? projectTasks.map((t, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="p-3 text-center"><input type="checkbox" className="rounded border-gray-300" /></td>
              <td className="p-3 font-medium text-gray-900">{t.title}</td>
              <td className="p-3 flex items-center gap-1.5">
                {t.avatar ? <img src={t.avatar} alt="A" className="w-5 h-5 rounded-full" /> : <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex justify-center items-center text-[9px] font-semibold">{t.first_name?.[0] || 'U'}</div>}
                {t.first_name || t.assigned_to || 'Unassigned'}
              </td>
              <td className="p-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex justify-center items-center text-[9px] font-semibold">
                    {(t.reporter || 'U').substring(0, 1).toUpperCase()}
                  </div>
                  <span className="text-gray-700 font-medium">{t.reporter || 'Unassigned'}</span>
                </div>
              </td>
              <td className="p-3">
                <span className={`px-2 py-0.5 rounded text-[9px] font-medium border ${t.priority === 'High' ? 'text-red-500 bg-red-50 border-red-100' : t.priority === 'Medium' ? 'text-orange-500 bg-orange-50 border-orange-100' : 'text-blue-500 bg-blue-50 border-blue-100'}`}>
                  {t.priority || 'Medium'}
                </span>
              </td>
              <td className="p-3">
                <span className={`px-2 py-0.5 rounded text-[9px] font-medium border ${t.status === 'Completed' || t.status === 'DONE' ? 'text-green-600 bg-green-50 border-green-200' : t.status === 'In Progress' || t.status === 'IN PROGRESS' ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-gray-500 bg-gray-100 border-gray-200'}`}>
                  {t.status || 'To Do'}
                </span>
              </td>
              <td className="p-3 text-gray-500">{formatDate(t.due_date)}</td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${t.status === 'Completed' || t.status === 'DONE' ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: t.status === 'Completed' || t.status === 'DONE' ? '100%' : t.status === 'In Progress' || t.status === 'IN PROGRESS' ? '60%' : '0%' }}></div>
                  </div>
                  <span className="text-xs text-gray-500">{t.status === 'Completed' || t.status === 'DONE' ? '100%' : t.status === 'In Progress' || t.status === 'IN PROGRESS' ? '60%' : '0%'}</span>
                </div>
              </td>
              <td className="p-3 text-center">
                <div className="relative inline-block text-left group">
                  <button className="text-gray-400 hover:text-gray-600 focus:outline-none"><MoreHorizontal size={14} /></button>
                  <div className="hidden group-hover:block absolute right-0 z-10 w-24 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <button onClick={() => setSelectedIssueId(t.id)} className="text-gray-700 block p-2 text-xs w-full text-left hover:bg-gray-100">Edit</button>
                      <button onClick={() => handleTaskDelete(t.id, t.task_source)} className="text-red-600 block p-2 text-xs w-full text-left hover:bg-gray-100">Delete</button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          )) : (
            <tr><td colSpan="9" className="p-6 text-center text-gray-500">No tasks found. Create one to get started.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const handleMilestoneSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingMilestone
        ? `${API_BASE_URL}/projects/${id}/milestones/${editingMilestone.id}`
        : `${API_BASE_URL}/projects/${id}/milestones`;
      const method = editingMilestone ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(milestoneForm)
      });
      if (!res.ok) throw new Error('Failed');
      const msRes = await fetch(`${API_BASE_URL}/projects/${id}/milestones`);
      if (msRes.ok) setMilestones(await msRes.json());
      setIsMilestoneModalOpen(false);
      setEditingMilestone(null);
      setMilestoneForm({ title: '', description: '', owner_id: '', start_date: '', due_date: '', status: 'Not Started', progress: 0 });
    } catch (err) {
      console.error('Failed to save milestone:', err);
    }
  };

  const handleMilestoneDelete = async (msId) => {
    if (!window.confirm('Delete this milestone?')) return;
    try {
      await fetch(`${API_BASE_URL}/projects/${id}/milestones/${msId}`, { method: 'DELETE' });
      setMilestones(prev => prev.filter(m => m.id !== msId));
    } catch (err) {
      console.error('Failed to delete milestone:', err);
    }
  };

  const renderMilestones = () => {
    return (
      <>
        {/* Add/Edit Milestone Modal */}
        {isMilestoneModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-base">{editingMilestone ? 'Edit Milestone' : 'Add Milestone'}</h3>
                <button onClick={() => { setIsMilestoneModalOpen(false); setEditingMilestone(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <form onSubmit={handleMilestoneSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                  <input required type="text" value={milestoneForm.title} onChange={e => setMilestoneForm(p => ({...p, title: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Milestone title" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={2} value={milestoneForm.description} onChange={e => setMilestoneForm(p => ({...p, description: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional description" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                    <input type="date" value={milestoneForm.start_date} onChange={e => setMilestoneForm(p => ({...p, start_date: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                    <input type="date" value={milestoneForm.due_date} onChange={e => setMilestoneForm(p => ({...p, due_date: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select value={milestoneForm.status} onChange={e => setMilestoneForm(p => ({...p, status: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Not Started</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                      <option>On Hold</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Progress ({milestoneForm.progress}%)</label>
                    <input type="range" min={0} max={100} value={milestoneForm.progress} onChange={e => setMilestoneForm(p => ({...p, progress: Number(e.target.value)}))} className="w-full mt-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Owner</label>
                  <select value={milestoneForm.owner_id} onChange={e => setMilestoneForm(p => ({...p, owner_id: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Unassigned --</option>
                    {teamMembers.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.first_name} {m.last_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => { setIsMilestoneModalOpen(false); setEditingMilestone(null); }} className="px-4 py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">{editingMilestone ? 'Update' : 'Create'} Milestone</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white rounded border border-gray-200 animate-fade-in">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-gray-900 text-sm font-semibold">Project Milestones ({milestones.length})</h3>
            <button onClick={() => { setEditingMilestone(null); setMilestoneForm({ title: '', description: '', owner_id: '', start_date: '', due_date: '', status: 'Not Started', progress: 0 }); setIsMilestoneModalOpen(true); }} className="flex items-center gap-1.5 text-xs text-white bg-blue-600 p-2 rounded font-medium hover:bg-blue-700">
              <Plus size={12} /> Add Milestone
            </button>
          </div>
          {milestones.length === 0 ? (
            <div className="p-10 text-center">
              <Flag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">No milestones yet</p>
              <p className="text-gray-400 text-xs mt-1">Click "Add Milestone" to create your first project milestone.</p>
            </div>
          ) : (
            <table className="w-full text-left whitespace-nowrap text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="p-3 font-medium">Milestone</th>
                  <th className="p-3 font-medium">Owner</th>
                  <th className="p-3 font-medium">Start Date</th>
                  <th className="p-3 font-medium">Due Date</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Progress</th>
                  <th className="p-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {milestones.map((m, i) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{i + 1}. {m.title}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {m.owner_avatar ? <img src={m.owner_avatar} alt="" className="w-5 h-5 rounded-full" /> : <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex justify-center items-center text-[9px]">{m.owner_name?.[0] || '?'}</div>}
                        {m.owner_name || <span className="text-gray-400 italic">Unassigned</span>}
                      </div>
                    </td>
                    <td className="p-3 text-gray-500">{formatDate(m.start_date)}</td>
                    <td className="p-3 text-gray-500">{formatDate(m.due_date)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-medium border ${
                        m.status === 'Completed' ? 'text-green-600 bg-green-50 border-green-200' :
                        m.status === 'In Progress' ? 'text-blue-600 bg-blue-50 border-blue-200' :
                        m.status === 'On Hold' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                        'text-gray-500 bg-gray-100 border-gray-200'
                      }`}>
                        {m.status === 'Completed' ? '✓ Completed' : m.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${m.status === 'Completed' ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${m.progress}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-500">{m.progress}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => { setEditingMilestone(m); setMilestoneForm({ title: m.title, description: m.description || '', owner_id: m.owner_id || '', start_date: m.start_date ? m.start_date.slice(0,10) : '', due_date: m.due_date ? m.due_date.slice(0,10) : '', status: m.status, progress: m.progress }); setIsMilestoneModalOpen(true); }} className="text-blue-500 hover:text-blue-700"><Edit3 size={13} /></button>
                        <button onClick={() => handleMilestoneDelete(m.id)} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>
    );
  };


  const renderTeam = () => {
    return (
      <div className="bg-white rounded border border-gray-200  animate-fade-in">
        <div className="p-4 border-b border-gray-100 flex justify-end">
          <button onClick={() => setIsTeamModalOpen(true)} className="flex items-center gap-1.5 text-xs text-white bg-blue-600 p-2 rounded font-medium hover:bg-blue-700"><Plus size={12} /> Add Member</button>
        </div>
        <table className="w-full text-left whitespace-nowrap text-xs">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
            <tr>
              <th className="p-3 font-medium">Member</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">Department</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Workload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {teamMembers.length > 0 ? teamMembers.map((m, i) => {
              // Look up correct role from team_members table (most authoritative)
              const rosterEntry = teamRoster.find(r => Number(r.user_id) === Number(m.user_id));
              // If member is the team manager (not in team_members), use manager_role
              const isTeamManager = assignedTeam && Number(assignedTeam.manager_id) === Number(m.user_id);
              const displayRole = rosterEntry?.role || (isTeamManager ? (assignedTeam.manager_role || 'Manager') : null) || m.role || '-';
              return (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-3 flex items-center gap-1.5">
                  {m.avatar ? <img src={m.avatar} alt="A" className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex justify-center items-center  text-xs">{m.first_name?.[0] || 'U'}</div>}
                  <span className="font-medium text-gray-900">{m.first_name} {m.last_name}</span>
                </td>
                <td className="p-3">{displayRole}</td>
                <td className="p-3">{m.department || project.department_name || '-'}</td>
                <td className="p-3 text-blue-600 hover:underline cursor-pointer">{m.email}</td>
                <td className="p-3"><span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[9px] font-medium border border-emerald-100">Active</span></td>
                <td className="p-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(20, 100 - i * 15)}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-500">{Math.max(20, 100 - i * 15)}%</span>
                    </div>
                    <button onClick={() => handleRemoveMember(m.user_id)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
              );
            }) : (
              <tr><td colSpan="6" className="p-6 text-center text-gray-500">No team members assigned.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDocuments = () => {
    const filteredDocs = documents.filter(doc =>
      doc.name.toLowerCase().includes(fileSearchQuery.toLowerCase())
    );

    return (
      <div className="bg-white rounded border border-gray-200  animate-fade-in">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search files..."
                value={fileSearchQuery}
                onChange={(e) => setFileSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 w-64"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 p-2 rounded hover:bg-gray-50 transition  cursor-pointer"
            >
              <UploadCloud size={12} /> Upload Document
            </button>
          </div>
        </div>
        <table className="w-full text-left whitespace-nowrap text-xs">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
            <tr>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Storage</th>
              <th className="p-3 font-medium">Uploaded By</th>
              <th className="p-3 font-medium">Size</th>
              <th className="p-3 font-medium">Uploaded On</th>
              <th className="p-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {filteredDocs.length > 0 ? filteredDocs.map((doc) => {
              const dateStr = new Date(doc.created_at).toLocaleDateString('en-US', {
                day: 'numeric', month: 'short', year: 'numeric'
              });
              const sizeStr = doc.size_bytes
                ? (doc.size_bytes > 1024 * 1024
                  ? (doc.size_bytes / (1024 * 1024)).toFixed(1) + ' MB'
                  : (doc.size_bytes / 1024).toFixed(0) + ' KB')
                : '-';

              const fileUrl = doc.file_path ? `${API_BASE_URL.replace(/\/api\/?$/, '')}${doc.file_path}` : '#';

              return (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-2 font-medium text-gray-900">
                      <FileText className="text-red-500" size={16} />
                      <a href={fileUrl} target="_blank" rel="noreferrer" className="hover:text-blue-600 hover:underline">
                        {doc.name}
                      </a>
                    </div>
                  </td>
                  <td className="p-3">{doc.file_type || 'FILE'}</td>
                  <td className="p-3">{doc.storage_type || 'Internal'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        <span className="text-[9px] text-gray-600">
                          {doc.first_name ? doc.first_name.charAt(0) : 'U'}
                        </span>
                      </div>
                      {doc.first_name ? `${doc.first_name} ${doc.last_name || ''}` : 'System'}
                    </div>
                  </td>
                  <td className="p-3">{sizeStr}</td>
                  <td className="p-3">{dateStr}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-3">
                      {doc.file_path && (
                        <a href={fileUrl} download={doc.name} className="text-gray-400 hover:text-gray-600">
                          <Download size={14} />
                        </a>
                      )}
                      <button onClick={() => handleFileDelete(doc.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="7" className="p-6 text-center text-gray-500">
                  No documents found. Click 'Upload Document' to add files.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };


  const renderTimeLogs = () => {
    const totalHoursLogged = timeLogs.reduce((acc, log) => acc + (parseFloat(log.hours_worked) || 0), 0);
    const estimatedHours = project?.budget ? Math.round(project.budget / 50) : 250; // simple estimation logic

    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Estimated Hours', val: `${estimatedHours}h`, icon: <Clock size={16} />, color: 'text-gray-500 bg-gray-50' },
            { label: 'Logged Hours', val: `${totalHoursLogged}h`, icon: <PlayCircle size={16} />, color: 'text-blue-500 bg-blue-50' },
            { label: 'Remaining Hours', val: `${Math.max(0, estimatedHours - totalHoursLogged)}h`, icon: <Clock size={16} />, color: 'text-orange-500 bg-orange-50' },
            { label: 'Billable', val: `${totalHoursLogged}h`, icon: <DollarSign size={16} />, color: 'text-green-500 bg-green-50' },
            { label: 'Non-Billable', val: '0h', icon: <DollarSign size={16} />, color: 'text-red-500 bg-red-50' }
          ].map((c, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded p-4 ">
              <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 font-medium">
                <div className={`p-1.5 rounded-full ${c.color}`}>{c.icon}</div>
                {c.label}
              </div>
              <div className="text-xl  text-gray-900">{c.val}</div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded border border-gray-200 ">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className=" text-gray-900 text-sm">Time Log History</h3>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 text-xs text-gray-700 bg-white border border-gray-200 p-2 rounded font-medium hover:bg-gray-50"><Download size={12} /> Export</button>
              <button onClick={() => setIsTimeLogModalOpen(true)} className="flex items-center gap-1.5 text-xs text-white bg-blue-600 p-2 rounded font-medium hover:bg-blue-700"><Clock size={12} /> Log Time</button>
            </div>
          </div>
          <table className="w-full text-left whitespace-nowrap text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
              <tr>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Member</th>
                <th className="p-3 font-medium">Notes</th>
                <th className="p-3 font-medium text-right">Hours</th>
                <th className="p-3 font-medium">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {timeLogs.length > 0 ? timeLogs.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-3 text-gray-500">{new Date(r.work_date).toLocaleDateString()}</td>
                  <td className="p-3 font-medium text-gray-900">{r.first_name} {r.last_name || ''}</td>
                  <td className="p-3 text-gray-500">{r.description || '-'}</td>
                  <td className="p-3 font-medium text-right">{r.hours_worked}h</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[9px] font-medium border text-green-600 bg-green-50 border-green-200">
                      Billable
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="p-6 text-center text-gray-500">No time logged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderActivity = () => (
    <div className="bg-white rounded border border-gray-200  animate-fade-in p-6">
      <h3 className=" text-gray-900 text-sm mb-6">Recent Activity</h3>
      <div className="relative border-l border-gray-200 ml-4 space-y-6 pb-4">
        {activityLogs.length > 0 ? activityLogs.map(a => (
          <div key={a.id} className="pl-6 relative">
            <div className="w-3 h-3 bg-blue-500 rounded-full border-4 border-white absolute -left-1.5 top-1"></div>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 mb-1">
              <span className="font-medium text-sm text-gray-900">{a.action}</span>
              <span className="text-xs text-gray-400">
                {new Date(a.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            <div className="text-xs text-gray-500 flex gap-2 items-center mt-1">
              {a.first_name && <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">{a.first_name} {a.last_name || ''}</span>}
              <span>{a.details}</span>
            </div>
          </div>
        )) : (
          <div className="text-gray-500 pl-4 text-sm">No recent activity.</div>
        )}
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="flex flex-col gap-6 animate-fade-in">
      <h3 className=" text-gray-900 text-sm">Project Reports</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { icon: <BarChart2 size={24} className="text-purple-500" />, title: 'Project Summary', desc: 'Overall project summary report' },
          { icon: <CheckSquare size={24} className="text-blue-500" />, title: 'Task Report', desc: 'Detailed task status report' },
          { icon: <Clock size={24} className="text-orange-500" />, title: 'Time Log Report', desc: 'Logged hours and time analysis' },
          { icon: <DollarSign size={24} className="text-green-500" />, title: 'Budget Report', desc: 'Budget vs Actual report' },
          { icon: <Users size={24} className="text-red-500" />, title: 'Workload Report', desc: 'Team workload summary' },
          { icon: <PieChartIcon size={24} className="text-emerald-500" />, title: 'Client Report', desc: 'Client-friendly progress report' },
        ].map((r, i) => (
          <div key={i} className="bg-white rounded border border-gray-200  p-2 flex items-center justify-between hover:border-blue-300 transition cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded bg-gray-50 flex items-center justify-center border border-gray-100">
                {r.icon}
              </div>
              <div>
                <h4 className=" text-gray-900 text-sm">{r.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
              </div>
            </div>
            <button className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded hover:bg-blue-100 transition">
              Generate
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTimeline = () => (
    <div className="bg-white rounded border border-gray-200  animate-fade-in p-6 h-[500px] flex items-center justify-center flex-col">
      <BarChart2 size={48} className="text-gray-300 mb-4" />
      <h3 className="text-gray-900  mb-2">Gantt Chart View</h3>
      <p className="text-xs text-gray-500 max-w-md text-center">
        The Timeline visualization is a premium component. In a full implementation, a library like `dhtmlx-gantt` or `frappe-gantt` would be mounted here.
      </p>
    </div>
  );

  const renderCalendar = () => (
    <div className="bg-white rounded border border-gray-200  animate-fade-in p-6 h-[500px] flex items-center justify-center flex-col">
      <CalendarIcon size={48} className="text-gray-300 mb-4" />
      <h3 className="text-gray-900  mb-2">Monthly Calendar</h3>
      <p className="text-xs text-gray-500 max-w-md text-center">
        The Calendar visualization is a premium component. In a full implementation, `react-big-calendar` or `fullcalendar` would be rendered here.
      </p>
    </div>
  );


  const renderSettings = () => (
    <div className="bg-white rounded border border-gray-200  animate-fade-in p-6">
      <h3 className=" text-gray-900 text-sm mb-4">Project Settings</h3>
      <p className="text-xs text-gray-500 mb-6">Manage advanced configuration and access control for this project.</p>

      <div className="space-y-6 max-w-xl text-sm">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Project Name</label>
          <input type="text" defaultValue={project.name || project.title} className="w-full border border-gray-200 rounded-md p-2 focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select className="w-full border border-gray-200 rounded-md p-2 focus:border-blue-500 focus:outline-none">
            <option>Planning</option>
            <option selected={project.status === 'In Progress'}>In Progress</option>
            <option>On Hold</option>
            <option>Completed</option>
          </select>
        </div>
        <div className="pt-4 border-t border-gray-100">
          <h4 className=" text-red-600 text-xs mb-2">Danger Zone</h4>
          <button className="bg-red-50 text-red-600 border border-red-200 p-2 rounded-md text-xs font-medium hover:bg-red-100 transition">
            Archive Project
          </button>
        </div>
      </div>
    </div>
  );

  const renderTopActions = () => {
    return (
      <div className="flex items-center gap-3">
        <button onClick={() => setIsEditModalOpen(true)} className="p-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
          <Edit3 size={14} /> Edit Project
        </button>
        <button onClick={() => setIsCreateDrawerOpen(true)} className="p-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2 ">
          <Plus size={14} /> Create Task
        </button>
      </div>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'Overview': return renderOverview();
      case 'Tasks': return renderTasks();
      case 'Milestones': return renderMilestones();
      case 'Team': return renderTeam();
      case 'Documents': return renderDocuments();
      case 'Time Logs': return renderTimeLogs();
      case 'Activity': return renderActivity();
      case 'Reports': return renderReports();
      case 'Timeline': return renderTimeline();
      case 'Calendar': return renderCalendar();
      case 'Settings': return renderSettings();
      default: return renderOverview();
    }
  };

  return (
    <div className="w-full bg-gray-50 min-h-screen flex flex-col p-4 font-sans">
      <div className="flex items-center text-xs text-gray-500 mb-4 gap-2">
        <span className="text-blue-600 hover:underline cursor-pointer" onClick={() => navigate('/')}>Projects</span>
        <span>›</span>
        <span className="text-blue-600 hover:underline cursor-pointer" onClick={() => navigate(-1)}>All Projects</span>
        <span>›</span>
        <span className="text-gray-900 font-medium">Project Details</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl  text-gray-900">{project.name || project.title}</h1>
            <span className="px-2 py-0.5 rounded text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100">
              {project.status || 'In Progress'}
            </span>
          </div>
          <p className="text-xs text-gray-500">{project.project_id_code || `PRJ-00${project.id}`}</p>
        </div>
        {renderTopActions()}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT SIDEBAR */}
        <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-white rounded border border-gray-200  overflow-hidden">
            <div className="h-40 bg-gradient-to-br from-blue-900 to-indigo-900 flex flex-col items-center justify-center p-4 text-center">
              <h3 className="text-white  text-lg">{project.name}</h3>
              <p className="text-blue-200 text-xs mt-1">Project Details Dashboard</p>
            </div>

            <div className="p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Client</span>
                <span className="font-medium text-blue-600 hover:underline cursor-pointer">{project.company_name || project.client || '-'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Department</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium text-purple-600 bg-purple-50 border border-purple-100">
                  {project.department_name || project.workflow_type || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Project Manager</span>
                <div className="flex items-center gap-1.5 font-medium text-gray-900">
                  {project.manager_avatar ? (
                    <img src={project.manager_avatar} alt="manager" className="w-5 h-5 rounded-full" />
                  ) : project.manager_first_name ? (
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[9px] font-semibold">
                      {project.manager_first_name.charAt(0)}
                    </div>
                  ) : null}
                  {project.manager_first_name ? `${project.manager_first_name} ${project.manager_last_name || ''}` : '-'}
                </div>
              </div>

              <div className="h-px bg-gray-100 my-1"></div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Start Date</span>
                <span className="font-medium text-gray-900">{formatDate(project.start_date)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">End Date</span>
                <span className="font-medium text-gray-900">{formatDate(project.due_date || project.end_date)}</span>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Progress</span>
                  <span className=" text-gray-900">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
              </div>

              <div className="h-px bg-gray-100 my-1"></div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Budget</span>
                <span className="font-medium text-gray-900">{formatCurrency(project.budget)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Spent</span>
                <span className="font-medium text-gray-900">{formatCurrency(project.spent)}</span>
              </div>

              <div className="h-px bg-gray-100 my-1"></div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Status</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200">
                  {project.status || 'In Progress'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Project Type</span>
                <span className="font-medium text-gray-900">{project.project_type || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded border border-gray-200 p-4  flex flex-col justify-between h-20">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500"><CheckSquare size={16} /></div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 font-medium">Tasks</div>
                  <div className="text-lg  text-gray-900 leading-tight">{project.completed_tasks || 0} / {project.total_tasks || 0}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded border border-gray-200 p-4  flex flex-col justify-between h-20">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><Flag size={16} /></div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 font-medium">Milestones</div>
                  <div className="text-lg  text-gray-900 leading-tight">{milestones.filter(m => m.status === 'Completed').length} / {milestones.length}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded border border-gray-200 p-4  flex flex-col justify-between h-20">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-500"><Users size={16} /></div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 font-medium">Team Members</div>
                  <div className="text-lg  text-gray-900 leading-tight">{teamMembers.length || 0}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded border border-gray-200 p-4  flex flex-col justify-between h-20">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-500"><DollarSign size={16} /></div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 font-medium">Budget Spent</div>
                  <div className="text-lg  text-gray-900 leading-tight">{formatCurrency(project.spent)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="border-b border-gray-200 mb-6 flex gap-2 overflow-x-auto hide-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-[12px] font-medium whitespace-nowrap border-b-2 transition ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
              >
                {tab}
                {tab === 'Documents' && <span className="ml-1 bg-gray-100 text-gray-600 py-0.5 px-1.5 rounded-full text-[9px]">24</span>}
              </button>
            ))}
          </div>

          {/* Active Tab Content */}
          <div className="flex-1 pb-12">
            {renderActiveTab()}
          </div>

        </div>
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>

      {isEditModalOpen && (
        <AddProjectModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          initialData={project}
          onSubmit={handleEditSubmit}
        />
      )}

      {isTaskModalOpen && (
        <AddNewTaskModal
          isOpen={isTaskModalOpen}
          onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
          onSubmit={handleTaskSubmit}
          initialData={editingTask ? {
            ...editingTask,
            assigned_to: editingTask.assigned_to ? [editingTask.assigned_to] : []
          } : { linked_type: 'Project', linked_id: parseInt(id) }}
        />
      )}

      {isCreateDrawerOpen && (
        <ITCreateIssueDrawer
          isOpen={isCreateDrawerOpen}
          onClose={() => setIsCreateDrawerOpen(false)}
          onIssueCreated={fetchTasks}
          projectId={id}
        />
      )}

      {isTeamModalOpen && (
        <AddTeamMemberModal
          isOpen={isTeamModalOpen}
          onClose={() => setIsTeamModalOpen(false)}
          projectId={id}
          onAdd={reloadTeam}
        />
      )}

      {isTimeLogModalOpen && (
        <AddTimeLogModal
          isOpen={isTimeLogModalOpen}
          onClose={() => setIsTimeLogModalOpen(false)}
          projectId={id}
          onAdd={reloadTimeLogs}
        />
      )}

      {selectedIssueId && (
        <ITIssueDetailsPanel
          issue={formatProjectTaskForIssuePanel(projectTasks.find(t => t.id === selectedIssueId))}
          updateIssue={handleUpdateProjectTask}
          deleteIssue={handleDeleteProjectTask}
          onClose={() => setSelectedIssueId(null)}
          onIssueCreated={fetchTasks}
        />
      )}
    </div>
  );
};

export default ProjectDetailsPage;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Folder, ClipboardCheck, FileText, Bug, Cloud, Clock,
  Settings, Layout, Activity, Calendar, MoreHorizontal, Plus,
  Flag, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { projectAPI, taskAPI, activitiesAPI } from '../../services/api';

const ITManagerDashboard = () => {
  const { user } = useAuth();
  const { username, designation } = useParams();
  const navigate = useNavigate();
  const urlPrefix = `/it/${designation || 'manager'}/${username || 'ashwini'}`;

  // Format the name for display if derived from URL, or use auth context
  const displayName = user?.name ? user.name.split(' ')[0] :
    (username ? username.split('-')[0].charAt(0).toUpperCase() + username.split('-')[0].slice(1) : 'Manager');

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isWidgetDrawerOpen, setIsWidgetDrawerOpen] = useState(false);
  const [widgets, setWidgets] = useState({
    kpi: true,
    projectHealth: true,
    timeline: true,
    activity: true,
    taskSummary: true,
    workload: true,
    timeTracking: true,
    openTasks: true
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projRes, tasksRes] = await Promise.all([
          projectAPI.getAll({ department: 'IT' }),
          taskAPI.getAllGeneral()
        ]);

        // Filter projects for IT department if API doesn't fully filter it
        const itProjects = (projRes || []).filter(p => p.department === 'IT' || p.department === 'IT Department');
        setProjects(itProjects);

        // Filter tasks linked to IT projects
        const itProjectIds = new Set(itProjects.map(p => p.id));
        const itTasks = (tasksRes || []).filter(t => itProjectIds.has(t.project_id) || t.department === 'IT');
        setTasks(itTasks);

        // Fetch activities
        // activitiesAPI might not exist or might need fallback if it fails
        try {
          if (activitiesAPI && activitiesAPI.getAll) {
            const actRes = await activitiesAPI.getAll();
            setActivities(actRes || []);
          }
        } catch (actErr) {
          console.warn('Activities fetch failed:', actErr);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute KPI Data
  const activeProjectsCount = projects.filter(p => p.status === 'Active' || p.status === 'In Progress').length;
  const inProgressTasksCount = tasks.filter(t => t.status === 'In Progress').length;
  const openBugsCount = tasks.filter(t => (t.task_type === 'Bug' || (t.title && t.title.toLowerCase().includes('bug'))) && (t.status !== 'Completed' && t.status !== 'Done')).length;

  const kpiData = [
    { title: 'Total Projects', value: projects.length.toString(), trend: 'Live Data', icon: Folder, color: 'text-indigo-600', bg: 'bg-indigo-50', trendColor: 'text-gray-500' },
    { title: 'Active Projects', value: activeProjectsCount.toString(), trend: 'Live Data', icon: ClipboardCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', trendColor: 'text-gray-500' },
    { title: 'Tasks In Progress', value: inProgressTasksCount.toString(), trend: 'Live Data', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50', trendColor: 'text-gray-500' },
    { title: 'Open Bugs', value: openBugsCount.toString(), trend: 'Live Data', icon: Bug, color: 'text-rose-500', bg: 'bg-rose-50', trendColor: 'text-gray-500' },
    { title: 'Deployments', value: '0', trend: 'Live Data', icon: Cloud, color: 'text-blue-500', bg: 'bg-blue-50', trendColor: 'text-gray-400' },
    { title: 'Logged Hours', value: '0h', trend: 'Live Data', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50', trendColor: 'text-gray-400' },
  ];

  // Project Health Data
  const onTrackCount = projects.filter(p => p.status === 'Active' || p.status === 'On Track').length;
  const atRiskCount = projects.filter(p => p.status === 'At Risk').length;
  const delayedCount = projects.filter(p => p.status === 'Delayed').length;
  const onHoldCount = projects.filter(p => p.status === 'On Hold').length;

  const projectHealthData = [
    { name: 'On Track', value: onTrackCount, color: '#22c55e' },
    { name: 'At Risk', value: atRiskCount, color: '#3b82f6' },
    { name: 'Delayed', value: delayedCount, color: '#eab308' },
    { name: 'On Hold', value: onHoldCount, color: '#ef4444' },
  ];
  if (onTrackCount === 0 && atRiskCount === 0 && delayedCount === 0 && onHoldCount === 0) {
    projectHealthData.push({ name: 'No Data', value: 1, color: '#e5e7eb' });
  }

  // Time Tracking (Mocked since we don't have time logs)
  const timeTrackingData = [
    { name: 'Development', value: 720, color: '#3b82f6' },
    { name: 'Testing', value: 240, color: '#8b5cf6' },
    { name: 'Design', value: 160, color: '#22c55e' },
    { name: 'Meetings', value: 128, color: '#eab308' },
  ];

  // Map Real Projects to Gantt Timeline
  const projectsTimeline = projects.slice(0, 6).map((p, idx) => {
    // Generate pseudo-random progress based on id or fallback
    const progress = p.progress || 0;
    const colors = [
      { color: 'bg-indigo-500', phaseBg: 'bg-indigo-50 text-indigo-600' },
      { color: 'bg-amber-500', phaseBg: 'bg-amber-50 text-amber-600' },
      { color: 'bg-green-500', phaseBg: 'bg-green-50 text-green-600' },
      { color: 'bg-blue-600', phaseBg: 'bg-blue-50 text-blue-600' },
      { color: 'bg-teal-500', phaseBg: 'bg-teal-50 text-teal-600' },
      { color: 'bg-rose-500', phaseBg: 'bg-rose-50 text-rose-600' }
    ];
    const c = colors[idx % colors.length];

    return {
      name: p.name || `Project ${p.id}`,
      progress: progress,
      phase: p.status || 'Development',
      start: 20 + (idx * 5),
      length: 30,
      color: c.color,
      phaseBg: c.phaseBg
    };
  });

  // Map Real Activities if available, else fallback
  let activityFeed = activities.slice(0, 4).map((a, i) => {
    const icons = [Layout, CheckCircle, Bug, Cloud];
    const bgs = ['bg-purple-100', 'bg-green-100', 'bg-orange-100', 'bg-indigo-100'];
    const textColors = ['text-purple-600', 'text-green-600', 'text-orange-500', 'text-indigo-600'];
    return {
      user: a.created_by_name || 'User',
      action: a.activity_type || 'updated something',
      target: a.title || 'Task',
      project: a.project_name || 'System',
      time: new Date(a.created_at).toLocaleDateString(),
      icon: icons[i % 4],
      bg: bgs[i % 4],
      color: textColors[i % 4]
    };
  });

  if (activityFeed.length === 0) {
    activityFeed = [
      { user: 'System', action: 'Live fetch', target: 'No recent activities found in database.', project: 'IT Dept', time: 'Just now', icon: Layout, bg: 'bg-gray-100', color: 'text-gray-600' }
    ];
  }

  // Calculate Team Workload dynamically from Tasks
  const taskAssignees = {};
  tasks.forEach(t => {
    if (t.assigned_to_name || t.assigned_to) {
      const name = t.assigned_to_name || `User ${t.assigned_to}`;
      if (!taskAssignees[name]) taskAssignees[name] = { total: 0, completed: 0 };
      taskAssignees[name].total += 1;
      if (t.status === 'Completed' || t.status === 'Done') taskAssignees[name].completed += 1;
    }
  });

  const teamWorkload = Object.keys(taskAssignees).slice(0, 5).map((name, idx) => {
    const data = taskAssignees[name];
    const progress = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
    const colors = ['bg-indigo-600', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500'];
    return {
      name: name,
      role: 'IT Staff',
      progress: progress,
      color: colors[idx % colors.length]
    };
  });

  if (teamWorkload.length === 0) {
    teamWorkload.push({ name: 'No tasks assigned', role: 'N/A', progress: 0, color: 'bg-gray-300' });
  }

  // Top Open Tasks
  const topOpenTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Done')
    .slice(0, 5)
    .map(t => {
      let priorityColor = 'text-green-600 bg-green-50';
      if (t.priority === 'High') priorityColor = 'text-rose-600 bg-rose-50';
      else if (t.priority === 'Medium') priorityColor = 'text-amber-600 bg-amber-50';

      return {
        title: t.title || 'Untitled Task',
        project: projects.find(p => p.id === t.project_id)?.name || 'General IT',
        priority: t.priority || 'Low',
        due: t.due_date ? new Date(t.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No Due Date',
        priorityColor: priorityColor
      };
    });

  // Task Summary Counts
  const todoCount = tasks.filter(t => t.status === 'TO DO' || t.status === 'To Do' || t.status === 'Pending').length;
  const inReviewCount = tasks.filter(t => t.status === 'IN REVIEW' || t.status === 'In Review').length;
  const completedCount = tasks.filter(t => t.status === 'DONE' || t.status === 'Completed' || t.status === 'Done').length;

  return (
    <div className="p-4 bg-[#F8FAFC] min-h-screen font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl  text-gray-900">IT Department Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {displayName}! Here's what's happening with your projects today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsWidgetDrawerOpen(true)} className="p-2 bg-white border border-indigo-200 text-indigo-600 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-indigo-50 transition-colors cursor-pointer">
            <Layout size={16} />
            Manage Widgets
          </button>
          <button onClick={() => navigate(urlPrefix + '/projects')} className="p-2 bg-indigo-600 text-white rounded-md text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 transition-colors">
            <Plus size={16} />
            New Project
          </button>
          <div className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-md ml-2 cursor-pointer ">
            <Calendar size={14} className="text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Today, 15 July 2026</span>
            <ChevronRight size={14} className="text-gray-400 rotate-90 ml-1" />
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      {widgets.kpi && (
        <div className="grid grid-cols-6 gap-2 mb-6">
          {kpiData.map((kpi, idx) => (
            <div key={idx} className="bg-white p-4 rounded border border-gray-100  flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded ${kpi.bg} ${kpi.color}`}>
                  <kpi.icon size={20} />
                </div>
                <div className="text-xs font-medium text-gray-500">{kpi.title}</div>
              </div>
              <div>
                <div className="text-2xl  text-gray-900 mb-1">{kpi.value}</div>
                <div className={`text-xs font-medium ${kpi.trendColor}`}>
                  {kpi.trend}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MIDDLE ROW */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        {/* Project Health Overview */}
        {widgets.projectHealth && (
          <div className="col-span-3 bg-white p-2 rounded border border-gray-100 ">
            <h3 className="text-sm  text-gray-900 mb-6">Project Health Overview</h3>
            <div className="relative h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectHealthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {projectHealthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl  text-gray-900">28</span>
                <span className="text-xs text-gray-500">Total Projects</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-3 mt-4">
              {projectHealthData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between pr-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-xs text-gray-600">{item.name}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">Overall Project Health</span>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-green-50 text-green-600 text-xs  rounded-full border border-green-100">Good</span>
                <span className="text-sm  text-gray-900">{projects.length > 0 ? `${onTrackCount} / ${projects.length}` : '0 / 0'}</span>
              </div>
            </div>
          </div>
        )}

        {widgets.timeline && (
          <div className="col-span-6 bg-white p-2 rounded border border-gray-100  flex flex-col">
            <h3 className="text-sm  text-gray-900 mb-6">Projects Timeline</h3>
            <div className="flex-1 flex flex-col gap-2 relative">
              {projectsTimeline.map((proj, idx) => (
                <div key={idx} className="flex items-center w-full z-10 group">
                  <div className="w-48 shrink-0 pr-4">
                    <div className="text-xs  text-gray-900 truncate">{proj.name}</div>
                    <div className="text-xs text-gray-500">Progress {proj.progress}%</div>
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full relative overflow-visible mr-8">
                    <div className={`absolute h-2 rounded-full ${proj.color}`} style={{ left: `${proj.start}%`, width: `${proj.length}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {widgets.activity && (
          <div className="col-span-3 bg-white p-2 rounded border border-gray-100  flex flex-col">
            <h3 className="text-sm  text-gray-900 mb-6">Activity Feed</h3>
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
              {activityFeed.map((activity, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${activity.bg} ${activity.color}`}>
                    <activity.icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-800 leading-tight mb-1">
                      <span className=" text-gray-900">{activity.user}</span> {activity.action} <span className="font-medium text-gray-900">{activity.target}</span>
                    </div>
                    <div className="text-xs font-medium text-gray-400">{activity.project}</div>
                  </div>
                  <div className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{activity.time}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        {/* Task Summary */}
        {widgets.taskSummary && (
          <div className="col-span-3 bg-white p-2 rounded border border-gray-100 ">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm  text-gray-900">Task Summary</h3>
              <span onClick={() => navigate(urlPrefix + '/tasks')} className="text-xs text-indigo-600 font-medium hover:underline cursor-pointer">View All</span>
            </div>

            <div className="space-y-5">
              {[
                { label: 'To Do', count: todoCount, color: 'bg-indigo-600', icon: Folder, iconBg: 'bg-indigo-50' },
                { label: 'In Progress', count: inProgressTasksCount, color: 'bg-blue-600', icon: ClipboardCheck, iconBg: 'bg-blue-50' },
                { label: 'In Review', count: inReviewCount, color: 'bg-amber-500', icon: FileText, iconBg: 'bg-amber-50' },
                { label: 'Completed', count: completedCount, color: 'bg-emerald-500', icon: CheckCircle, iconBg: 'bg-emerald-50' },
              ].map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-2 w-28">
                    <div className={`p-1.5 rounded ${stat.iconBg} text-gray-500 group-hover:text-indigo-600 transition-colors`}>
                      <stat.icon size={12} className={stat.iconBg === 'bg-indigo-50' ? 'text-indigo-600' : stat.iconBg === 'bg-blue-50' ? 'text-blue-600' : stat.iconBg === 'bg-amber-50' ? 'text-amber-600' : 'text-emerald-600'} />
                    </div>
                    <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900">{stat.label}</span>
                  </div>
                  <div className="flex-1 mx-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${stat.color} rounded-full`} style={{ width: tasks.length > 0 ? `${(stat.count / tasks.length) * 100}%` : '0%' }}></div>
                  </div>
                  <div className="text-sm  text-gray-900 w-8 text-right">{stat.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Workload */}
        {widgets.workload && (
          <div className="col-span-3 bg-white p-2 rounded border border-gray-100 ">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm  text-gray-900">Team Workload</h3>
              <span onClick={() => navigate(urlPrefix + '/teams')} className="text-xs text-indigo-600 font-medium hover:underline cursor-pointer">View All</span>
            </div>

            <div className="space-y-4">
              {teamWorkload.map((member, idx) => (
                <div key={idx} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs  shrink-0">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-xs  text-gray-900 group-hover:text-indigo-600 transition-colors">{member.name}</div>
                      <div className="text-xs text-gray-400">{member.role}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end w-24">
                    <div className="text-xs  text-gray-700 mb-1">{member.progress}%</div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${member.color} rounded-full`} style={{ width: `${member.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time Tracking */}
        {widgets.timeTracking && (
          <div className="col-span-3 bg-white p-2 rounded border border-gray-100  flex flex-col">
            <div className="mb-4">
              <h3 className="text-sm  text-gray-900 inline-block">Time Tracking</h3>
              <span className="text-xs text-gray-400 ml-2">(This Week)</span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="relative h-40 w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={timeTrackingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {timeTrackingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl  text-gray-900">1,248h</span>
                  <span className="text-xs text-gray-500">Total Hours</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 px-4">
                {timeTrackingData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-xs font-medium text-gray-600">{item.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs  text-gray-900">{item.value}h</span>
                      <span className="text-[8px] text-gray-400">({Math.round((item.value / 1248) * 100)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top Open Tasks */}
        {widgets.openTasks && (
          <div className="col-span-3 bg-white p-2 rounded border border-gray-100 ">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm  text-gray-900">Top Open Tasks</h3>
              <span onClick={() => navigate(urlPrefix + '/tasks')} className="text-xs text-indigo-600 font-medium hover:underline cursor-pointer">View All</span>
            </div>

            <div className="space-y-4">
              {topOpenTasks.map((task, idx) => (
                <div key={idx} className="group cursor-pointer">
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-xs  text-gray-900 leading-tight pr-2 group-hover:text-indigo-600 transition-colors">{task.title}</div>
                    <span className={`px-2 py-0.5 rounded text-[9px]  whitespace-nowrap ${task.priorityColor}`}>{task.priority}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">{task.project}</div>
                    <div className="text-xs font-medium text-gray-400">Due: {task.due}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER BAR */}
      <div className="bg-white p-4 rounded border border-gray-100  flex items-center justify-between overflow-x-auto gap-8 whitespace-nowrap">
        <div className="flex items-center gap-3 min-w-[120px]">
          <div className="p-1.5 rounded bg-indigo-50 text-indigo-600"><Activity size={16} /></div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Active Sprints</div>
            <div className="text-sm  text-gray-900">5</div>
          </div>
        </div>

        <div className="flex items-center gap-3 min-w-[140px]">
          <div className="p-1.5 rounded bg-blue-50 text-blue-600"><Flag size={16} /></div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Upcoming Milestones</div>
            <div className="text-sm  text-gray-900">7</div>
          </div>
        </div>

        <div className="flex items-center gap-3 min-w-[140px]">
          <div className="p-1.5 rounded bg-sky-50 text-sky-600"><CheckCircle size={16} /></div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Client Approvals</div>
            <div className="text-sm  text-gray-900">3 <span className="text-xs font-medium text-gray-400">Pending</span></div>
          </div>
        </div>

        <div className="flex items-center gap-3 min-w-[130px]">
          <div className="p-1.5 rounded bg-rose-50 text-rose-500"><Bug size={16} /></div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Unresolved Bugs</div>
            <div className="text-sm  text-gray-900">42</div>
          </div>
        </div>

        <div className="flex items-center gap-3 min-w-[120px]">
          <div className="p-1.5 rounded bg-amber-50 text-amber-500"><Clock size={16} /></div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Overdue Tasks</div>
            <div className="text-sm  text-gray-900">18</div>
          </div>
        </div>

        <div className="flex-1 flex justify-end">
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-full border border-gray-100">
            <div className="text-xs text-gray-500 font-medium">System Status</div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <div className="text-xs  text-gray-900">All Systems Operational</div>
            </div>
          </div>
        </div>
      </div>

      {/* Widget Drawer */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isWidgetDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-2 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-900">Manage Widgets</h3>
          <button onClick={() => setIsWidgetDrawerOpen(false)} className="text-gray-500 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
        <div className="p-2 space-y-4">
          {[
            { key: 'kpi', label: 'KPI Cards' },
            { key: 'projectHealth', label: 'Project Health' },
            { key: 'timeline', label: 'Projects Timeline' },
            { key: 'activity', label: 'Activity Feed' },
            { key: 'taskSummary', label: 'Task Summary' },
            { key: 'workload', label: 'Team Workload' },
            { key: 'timeTracking', label: 'Time Tracking' },
            { key: 'openTasks', label: 'Top Open Tasks' }
          ].map(w => (
            <div key={w.key} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{w.label}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={widgets[w.key]} onChange={() => setWidgets({ ...widgets, [w.key]: !widgets[w.key] })} />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default ITManagerDashboard;

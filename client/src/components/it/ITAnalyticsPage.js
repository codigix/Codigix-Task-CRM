import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Folder, ClipboardCheck, FileText, Bug, Cloud, Clock, DollarSign,
  Calendar, Filter, Download, ChevronDown, Activity, Settings, Users, Link2, CheckCircle
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../hooks/useAuth';
import { projectAPI, taskAPI, activitiesAPI } from '../../services/api';

const ITAnalyticsPage = () => {
  const { user } = useAuth();
  const { username } = useParams();

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projRes, tasksRes] = await Promise.all([
          projectAPI.getAll({ department: 'IT' }),
          taskAPI.getAllGeneral()
        ]);

        const itProjects = (projRes || []).filter(p => p.department === 'IT' || p.department === 'IT Department');
        setProjects(itProjects);

        const itProjectIds = new Set(itProjects.map(p => p.id));
        const itTasks = (tasksRes || []).filter(t => itProjectIds.has(t.project_id) || t.department === 'IT');
        setTasks(itTasks);

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

  const handleExportPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('IT-Department-Reports.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // --- KPI CALCULATIONS ---
  const activeProjectsCount = projects.filter(p => p.status === 'Active' || p.status === 'In Progress').length;
  const tasksCompleted = tasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
  const inProgressTasksCount = tasks.filter(t => t.status === 'In Progress').length;
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Completed' && t.status !== 'Done').length;
  const totalBugs = tasks.filter(t => t.task_type === 'Bug' || (t.title && t.title.toLowerCase().includes('bug'))).length;

  // --- CHARTS DATA ---
  const projectHealthData = [
    { name: 'On Track', value: projects.filter(p => p.status === 'Active' || p.status === 'On Track').length, color: '#22c55e' },
    { name: 'At Risk', value: projects.filter(p => p.status === 'At Risk').length, color: '#3b82f6' },
    { name: 'Delayed', value: projects.filter(p => p.status === 'Delayed').length, color: '#eab308' },
    { name: 'On Hold', value: projects.filter(p => p.status === 'On Hold').length, color: '#ef4444' },
  ];

  const timeTrackingData = [];

  const taskTrendData = [];

  // --- TABLES DATA ---
  const perfSummary = projects.slice(0, 6).map(p => {
    const pTasks = tasks.filter(t => t.project_id === p.id);
    const pCompleted = pTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
    const pInProgress = pTasks.filter(t => t.status === 'In Progress').length;
    const pOverdue = pTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Completed').length;
    return {
      name: p.name || 'Untitled',
      health: p.status === 'Active' ? 'Good' : p.status === 'At Risk' ? 'At Risk' : p.status === 'Delayed' ? 'Delayed' : 'Good',
      progress: p.progress || Math.floor(Math.random() * 60) + 20,
      tasks: { completed: pCompleted, inProgress: pInProgress, overdue: pOverdue },
      bugs: { open: Math.floor(Math.random() * 10), closed: Math.floor(Math.random() * 20) },
      hours: { logged: Math.floor(Math.random() * 300), billable: Math.floor(Math.random() * 200) }
    };
  });

  const teamPerf = [];

  const topOpenBugs = tasks.filter(t => (t.task_type === 'Bug' || (t.title && t.title.toLowerCase().includes('bug'))) && (t.status !== 'Completed' && t.status !== 'Done')).slice(0, 5);
  const displayBugs = topOpenBugs.map((t, idx) => ({
    id: `BUG-${idx + 101}`,
    title: t.title || 'Untitled',
    project: projects.find(p => p.id === t.project_id)?.name || 'General',
    priority: t.priority || 'Medium',
    status: t.status || 'Open',
    age: '2d'
  }));

  const recentDeployments = [];

  const projectsTimeline = projects.slice(0, 6).map((p, idx) => {
    const colors = ['bg-indigo-500', 'bg-amber-500', 'bg-blue-600', 'bg-rose-500', 'bg-teal-500', 'bg-purple-500'];
    return {
      name: p.name,
      start: 10 + (idx * 5),
      length: 20 + (Math.random() * 40),
      color: colors[idx % colors.length],
      status: p.status
    };
  });

  return (
    <div className="p-4 bg-[#F8FAFC] min-h-screen font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl  text-gray-900 mb-1">IT Department Reports</h1>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Dashboard</span>
            <ChevronDown size={10} className="rotate-[-90deg]" />
            <span className="text-gray-900 font-medium">Reports</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-md cursor-pointer  hover:bg-gray-50 transition-colors">
            <span className="text-sm font-medium text-gray-700">All Projects</span>
            <ChevronDown size={14} className="text-gray-400 ml-2" />
          </div>
          <div className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-md cursor-pointer  hover:bg-gray-50 transition-colors">
            <Calendar size={14} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">01 Jul 2026 - 15 Jul 2026</span>
            <ChevronDown size={14} className="text-gray-400 ml-2" />
          </div>
          <button className="p-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium flex items-center gap-2  hover:bg-gray-50 transition-colors">
            <Filter size={14} className="text-gray-500" /> Filters
          </button>
          <button onClick={handleExportPDF} className="p-2 bg-indigo-600 text-white rounded-md text-sm font-medium flex items-center gap-2  hover:bg-indigo-700 transition-colors">
            Export Report <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <div id="report-content" className="bg-[#F8FAFC] space-y-6">
        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-8 gap-3">
          {[
            { title: 'Total Projects', val: projects.length, trend: '', trendUp: true, icon: Folder, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { title: 'Active Projects', val: activeProjectsCount, trend: '', trendUp: true, icon: ClipboardCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { title: 'Tasks Completed', val: tasksCompleted, trend: '', trendUp: true, icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
            { title: 'Tasks In Progress', val: inProgressTasksCount, trend: '', trendUp: true, icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50' },
            { title: 'Overdue Tasks', val: overdueTasks, trend: '', trendUp: false, icon: Clock, color: 'text-rose-500', bg: 'bg-rose-50' },
            { title: 'Total Bugs', val: totalBugs, trend: '', trendUp: false, icon: Bug, color: 'text-rose-500', bg: 'bg-rose-50' },
            { title: 'Logged Hours', val: '1,248h', trend: '', trendUp: true, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
            { title: 'Billable Hours', val: '$ 872h', trend: '', trendUp: true, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map((k, i) => (
            <div key={i} className="bg-white p-3 rounded border border-gray-100  flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded ${k.bg} ${k.color}`}><k.icon size={14} /></div>
                <div className="text-xs font-medium text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis">{k.title}</div>
              </div>
              <div>
                <div className="text-xl  text-gray-900 mb-0.5">{k.val}</div>
                <div className={`text-[9px] font-medium ${k.trendUp ? 'text-emerald-500' : 'text-rose-500'} flex items-center gap-1`}>
                  <div className={`w-0 h-0 border-l-[3px] border-r-[3px] border-b-[4px] border-transparent ${k.trendUp ? 'border-b-emerald-500' : 'border-t-[4px] border-t-rose-500 border-b-0'}`}></div>
                  {k.trend}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ROW 1: CHARTS */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3 bg-white p-2 rounded border border-gray-100  flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[13px]  text-gray-900">Projects Overview</h3>
              <span className="text-xs text-indigo-600 font-medium cursor-pointer hover:underline">View Details</span>
            </div>
            <div className="flex flex-col flex-1">
              <div className="relative h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={projectHealthData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                      {projectHealthData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                  <span className="text-2xl  text-gray-900 leading-none">{projects.length || 28}</span>
                  <span className="text-xs text-gray-500 mt-1">Total Projects</span>
                </div>
              </div>
              <div className="flex flex-col justify-center px-4 space-y-3 mt-4">
                {projectHealthData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                      <span className="text-sm font-medium text-gray-600">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm  text-gray-900">{d.value}</span>
                      <span className="text-xs text-gray-400">({Math.round((d.value / (projects.length || 28)) * 100)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-6 bg-white p-2 rounded border border-gray-100  flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[13px]  text-gray-900">Task Completion Trend</h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 rounded bg-emerald-500"></div>Completed</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 rounded bg-blue-500"></div>In Progress</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 rounded bg-rose-500"></div>Overdue</div>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100">
                  This Month <ChevronDown size={12} className="ml-1" />
                </div>
              </div>
            </div>
            <div className="h-64 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={taskTrendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <RechartsTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="inProgress" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="overdue" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-span-3 bg-white p-2 rounded border border-gray-100  flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[13px]  text-gray-900">Logged Hours Overview</h3>
              <div className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100">
                This Week <ChevronDown size={12} className="ml-1" />
              </div>
            </div>
            <div className="flex flex-col flex-1">
              <div className="relative h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={timeTrackingData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                      {timeTrackingData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                  <span className="text-2xl  text-gray-900 leading-none">1,248h</span>
                  <span className="text-xs text-gray-500 mt-1">Total Hours</span>
                </div>
              </div>
              <div className="flex flex-col justify-center px-4 space-y-3 mt-4">
                {timeTrackingData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                      <span className="text-sm font-medium text-gray-600">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm  text-gray-900">{d.value}h</span>
                      <span className="text-xs text-gray-400">({Math.round((d.value / 1248) * 100)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: TABLES & TASK SUMMARY */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6 bg-white p-2 rounded border border-gray-100 ">
            <h3 className="text-[13px]  text-gray-900 mb-5">Project Performance Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-100 text-xs  text-gray-500">
                    <th className="py-2.5 px-2">Project</th>
                    <th className="py-2.5 px-2 text-center">Health</th>
                    <th className="py-2.5 px-2 text-center">Progress</th>
                    <th className="py-2.5 px-2 text-center border-l border-gray-100" colSpan={3}>Tasks <div className="text-[9px] font-medium text-gray-400 mt-1 font-normal flex justify-around"><span>Completed</span> <span>In Progress</span> <span>Overdue</span></div></th>
                    <th className="py-2.5 px-2 text-center border-l border-gray-100" colSpan={2}>Bugs <div className="text-[9px] font-medium text-gray-400 mt-1 font-normal flex justify-around"><span>Open</span> <span>Closed</span></div></th>
                    <th className="py-2.5 px-2 text-center border-l border-gray-100" colSpan={2}>Hours <div className="text-[9px] font-medium text-gray-400 mt-1 font-normal flex justify-around"><span>Logged</span> <span>Billable</span></div></th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-700">
                  {perfSummary.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-2  text-gray-900">{p.name}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs  ${p.health === 'Good' ? 'text-emerald-600 bg-emerald-50' : p.health === 'At Risk' ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50'}`}>
                          {p.health}
                        </span>
                      </td>
                      <td className="p-2 text-center  text-gray-900">{p.progress}%</td>
                      <td className="p-2 text-center font-medium border-l border-gray-50">{p.tasks.completed}</td>
                      <td className="p-2 text-center font-medium">{p.tasks.inProgress}</td>
                      <td className="p-2 text-center font-medium text-rose-500">{p.tasks.overdue}</td>
                      <td className="p-2 text-center font-medium border-l border-gray-50">{p.bugs.open}</td>
                      <td className="p-2 text-center font-medium">{p.bugs.closed}</td>
                      <td className="p-2 text-center  text-gray-900 border-l border-gray-50">{p.hours.logged}h</td>
                      <td className="p-2 text-center  text-emerald-600">{p.hours.billable}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm  text-indigo-600 cursor-pointer hover:underline">View All Projects &rarr;</div>
          </div>

          <div className="col-span-3 bg-white p-2 rounded border border-gray-100 ">
            <h3 className="text-[13px]  text-gray-900 mb-5">Team Performance</h3>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-xs  text-gray-500">
                  <th className="py-2.5">Team Member / Role</th>
                  <th className="py-2.5 text-center">Tasks<br />Completed</th>
                  <th className="py-2.5 text-center">Hours<br />Logged</th>
                  <th className="py-2.5 text-right">Efficiency</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {teamPerf.map((t, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700  text-[9px] shrink-0">
                        {t.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="truncate">
                        <div className=" text-gray-900 truncate">{t.name}</div>
                        <div className="text-[9px] text-gray-500 truncate">{t.role}</div>
                      </div>
                    </td>
                    <td className="py-3 text-center  text-gray-700">{t.completed}</td>
                    <td className="py-3 text-center  text-gray-700">{t.hours}h</td>
                    <td className="py-3 text-right  text-emerald-500">{t.eff}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-sm  text-indigo-600 cursor-pointer hover:underline">View All Team Members &rarr;</div>
          </div>

          <div className="col-span-3 bg-white p-2 rounded border border-gray-100  flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[13px]  text-gray-900">Task Summary</h3>
              <div className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100">
                This Week <ChevronDown size={12} className="ml-1" />
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center space-y-5">
              {[
                { label: 'To Do', count: 86, color: 'bg-indigo-200', icon: Folder, text: 'text-indigo-600' },
                { label: 'In Progress', count: 132, color: 'bg-blue-600', icon: ClipboardCheck, text: 'text-blue-600' },
                { label: 'In Review', count: 28, color: 'bg-amber-500', icon: FileText, text: 'text-amber-500' },
                { label: 'Completed', count: 156, color: 'bg-emerald-500', icon: CheckCircle, text: 'text-emerald-500' },
              ].map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2.5 w-24">
                    <stat.icon size={14} className={stat.text} />
                    <span className="text-sm  text-gray-700">{stat.label}</span>
                  </div>
                  <div className="flex-1 mx-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${stat.color} rounded-full`} style={{ width: `${(stat.count / 402) * 100}%` }}></div>
                  </div>
                  <div className="text-[13px]  text-gray-900 w-8 text-right">{stat.count}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[12px]  text-gray-700">Total Tasks</span>
              <span className="text-base  text-gray-900">402</span>
            </div>
          </div>
        </div>

        {/* ROW 3: BUGS, DEPLOYMENTS, TIMELINE */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3 bg-white p-2 rounded border border-gray-100 ">
            <h3 className="text-[13px]  text-gray-900 mb-5">Top Open Bugs</h3>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-xs  text-gray-500 ">
                  <th className="py-2.5 pr-1">Bug ID</th>
                  <th className="py-2.5">Title / Project</th>
                  <th className="py-2.5 text-center">Priority</th>
                  <th className="py-2.5 text-center">Status</th>
                  <th className="py-2.5 text-right">Age</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {displayBugs.map((b, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-1  text-gray-600">{b.id}</td>
                    <td className="py-3 w-36 truncate pr-2">
                      <div className=" text-gray-900 truncate" title={b.title}>{b.title}</div>
                      <div className="text-[9px] text-gray-400 truncate mt-0.5">{b.project}</div>
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px]  ${b.priority === 'High' ? 'text-rose-600 bg-rose-50' : b.priority === 'Medium' ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}`}>{b.priority}</span>
                    </td>
                    <td className="py-3 text-center text-gray-700 font-medium">{b.status}</td>
                    <td className="py-3 text-right font-medium text-gray-500">{b.age}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-sm  text-indigo-600 cursor-pointer hover:underline">View All Bugs &rarr;</div>
          </div>

          <div className="col-span-5 bg-white p-2 rounded border border-gray-100 ">
            <h3 className="text-[13px]  text-gray-900 mb-5">Recent Deployments</h3>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-xs  text-gray-500 ">
                  <th className="py-2.5">Version</th>
                  <th className="py-2.5">Project</th>
                  <th className="py-2.5">Environment</th>
                  <th className="py-2.5">Deployed By</th>
                  <th className="py-2.5">Date & Time</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recentDeployments.map((d, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3  text-gray-900">{d.version}</td>
                    <td className="py-3  text-gray-600">{d.project}</td>
                    <td className="py-3 text-gray-600">{d.env}</td>
                    <td className="py-3 text-gray-600">{d.deployedBy}</td>
                    <td className="py-3 text-gray-500 font-medium">{d.date}</td>
                    <td className="py-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[9px]  text-emerald-600 bg-emerald-50">{d.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-sm  text-indigo-600 cursor-pointer hover:underline">View All Deployments &rarr;</div>
          </div>

          <div className="col-span-4 bg-white p-2 rounded border border-gray-100  flex flex-col">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-[13px]  text-gray-900">Project Timeline Overview</h3>
              <div className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100">
                This Month <ChevronDown size={12} className="ml-1" />
              </div>
            </div>
            <div className="flex-1 flex flex-col relative">
              <div className="flex justify-between text-[9px] font-medium text-gray-400 mb-3 pl-28">
                <span>Jul 01</span><span>Jul 05</span><span>Jul 10</span><span>Jul 15</span><span>Jul 20</span><span>Jul 25</span><span>Jul 31</span>
              </div>
              <div className="flex-1 flex flex-col justify-around relative">
                <div className="absolute inset-y-0 right-0 left-28 flex justify-between pointer-events-none opacity-40">
                  {[...Array(7)].map((_, i) => <div key={i} className="w-px h-full bg-gray-200"></div>)}
                </div>
                {projectsTimeline.map((p, i) => (
                  <div key={i} className="flex items-center w-full z-10 my-1.5 group cursor-pointer">
                    <div className="w-28 shrink-0 pr-3">
                      <div className="text-xs  text-gray-900 truncate group-hover:text-indigo-600 transition-colors" title={p.name}>{p.name}</div>
                    </div>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full relative overflow-hidden">
                      <div className={`absolute h-full rounded-full ${p.color}  group-hover:opacity-80 transition-opacity`} style={{ left: `${p.start}%`, width: `${p.length}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-600 px-1">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>On Track</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>At Risk</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>Delayed</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>On Hold</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>Completed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ITAnalyticsPage;

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SeoGmbProjectSelector from './SeoGmbProjectSelector';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  CheckCircle, ChevronRight, Edit3, MoreHorizontal, ArrowUpRight, ArrowDownRight,
  Search, Bell, Calendar, MessageSquare, Plus, FileText, Globe, TrendingUp, ClipboardList,
  Sliders, ChevronDown, Check, Target, Zap, Link, MapPin, Star, Users, User, Shield, Info,
  Mail, Phone, Video, ExternalLink, Download, Eye, Trash2, Folder, Grid, List, PlusCircle, Activity,
  Briefcase, ArrowLeft
} from 'lucide-react';

/* ── Static Data Removed ── */

import AdvancedDateRangePicker from '../common/AdvancedDateRangePicker';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


export default function SeoGmbProjectsPage() {
  const [activeTab, setActiveTab] = useState('Project Overview');
  const [viewingProjectId, setViewingProjectId] = useState(null);
  const [dateRange, setDateRange] = useState({ start: null, end: null, label: 'Last 30 Days' });

  // List Mode State
  const [projectsList, setProjectsList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  // Selected Project State
  const [project, setProject] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [gmb, setGmb] = useState(null);
  const [tasks, setTasks] = useState([]);

  const fetchProjectsList = async () => {
    setLoadingList(true);
    try {
      const response = await fetch(API_BASE_URL + '/projects?department=SEO+%26+GMB+Department');
      if (response.ok) {
        const data = await response.json();
        setProjectsList(data);
      }
    } catch (err) {
      console.error('Error fetching SEO & GMB projects:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjectsList();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlId = params.get('id');
    if (urlId) {
      setViewingProjectId(Number(urlId));
    } else {
      setViewingProjectId(null);
    }
  }, [location.search]);

  const handleProjectSelect = (id) => {
    setViewingProjectId(id);
    navigate(`/seo-gmb/projects?id=${id}`);
  };

  const handleBackToList = () => {
    setViewingProjectId(null);
    navigate(`/seo-gmb/projects`);
  };

  const loadProjectData = async (projId) => {
    try {
      const pRes = await fetch(`${API_BASE_URL}/projects/${projId}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProject(pData);
      }

      const sRes = await fetch(`${API_BASE_URL}/marketing/seo?project_id=${projId}`);
      if (sRes.ok) {
        const sData = await sRes.json();
        setKeywords(sData.success ? sData.data : []);
      }

      const gRes = await fetch(`${API_BASE_URL}/marketing/gmb?project_id=${projId}`);
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData.success && gData.data.length > 0) {
          setGmb(gData.data[0]);
        } else {
          setGmb(null);
        }
      }

      const tRes = await fetch(`${API_BASE_URL}/projects/${projId}/tasks`);
      if (tRes.ok) {
        const tData = await tRes.json();
        setTasks(tData);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error('Error loading project details:', err);
    }
  };

  useEffect(() => {
    if (viewingProjectId) {
      loadProjectData(viewingProjectId);
    }
  }, [viewingProjectId]);

  const handleProjectChange = (proj) => {
    handleProjectSelect(proj.id);
  };

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjectsList(prev => prev.filter(p => p.id !== id));
        if (viewingProjectId === id) setViewingProjectId(null);
      } else {
        alert('Failed to delete project');
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  // Filter project list by search term
  const filteredProjects = projectsList.filter(p =>
    p.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    (p.company_name && p.company_name.toLowerCase().includes(searchQ.toLowerCase()))
  );

  const currentProjectName = project ? project.name : 'Loading...';
  const currentStatus = project ? project.status : 'Active';
  const currentBudget = project ? project.budget : 250000;
  const currentStartDate = project && project.start_date ? new Date(project.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '15 Apr 2026';
  const currentEndDate = project && project.due_date ? new Date(project.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '15 Oct 2026';
  const currentPM = project ? `${project.manager_first_name || 'Emma'} ${project.manager_last_name || 'Johnson'}` : 'Emma Johnson';

  return (
    <div className="bg-slate-50 min-h-screen font-sans pb-10">

      {/* ─── BREADCRUMB HEADER ─── */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="cursor-pointer hover:text-blue-500" onClick={handleBackToList}>SEO Projects</span>
          <ChevronRight size={14} />
          {viewingProjectId ? (
            <>
              <SeoGmbProjectSelector onProjectChange={handleProjectChange} />
              <ChevronRight size={14} />
              <span className="text-slate-900 ">Project Overview</span>
            </>
          ) : (
            <span className="text-slate-900 ">All Projects</span>
          )}
        </div>
      </div>

      {/* ─── DUAL RENDER: LIST VIEW OR DETAIL VIEW ─── */}
      {!viewingProjectId ? (
        /* ─── LIST VIEW: ALL PROJECTS TABLE ─── */
        <div className="p-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 ">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-base  text-slate-900 m-0">All SEO &amp; GMB Projects</h2>
                <p className="text-xs text-slate-400 m-0 mt-0.5">Manage and track performance across all active client websites.</p>
              </div>
              <button
                onClick={() => window.location.href = '/seo-gmb/project-setup?mode=create'}
                className="bg-blue-500 hover:bg-blue-600 border-none text-white rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer transition-colors "
              >
                <Plus size={14} /> Add New Project
              </button>
            </div>

            {loadingList ? (
              <div className="py-20 text-center text-slate-400 text-sm">
                <Activity className="animate-spin mx-auto mb-2 text-blue-500" size={24} />
                Loading projects list...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs text-slate-700">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="p-2 text-left text-slate-500  text-xs ">Project Name</th>
                      <th className="p-2 text-left text-slate-500  text-xs ">Client / Company</th>
                      <th className="p-2 text-right text-slate-500  text-xs ">Monthly Budget</th>
                      <th className="p-2 text-center text-slate-500  text-xs ">Start Date</th>
                      <th className="p-2 text-center text-slate-500  text-xs ">Due Date</th>
                      <th className="p-2 text-center text-slate-500  text-xs ">Progress</th>
                      <th className="p-2 text-center text-slate-500  text-xs ">Status</th>
                      <th className="p-2 text-center text-slate-500  text-xs ">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => handleProjectSelect(row.id)}
                        className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-3.5  text-slate-900 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">
                              {row.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="m-0  text-slate-800 leading-tight">{row.name}</p>
                              <p className="m-0 text-xs text-slate-400 mt-0.5">{row.project_id_code || `PRJ-${row.id}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3.5 text-slate-600 font-medium">{row.company_name || row.name}</td>
                        <td className="py-3.5 px-3.5 text-right  text-slate-950 text-xs">
                          ₹ {parseFloat(row.budget || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3.5 text-center text-slate-500 font-medium">
                          {row.start_date ? new Date(row.start_date).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="py-3.5 px-3.5 text-center text-slate-500 font-medium">
                          {row.due_date ? new Date(row.due_date).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="py-3.5 px-3.5 text-center">
                          <div className="flex items-center gap-2 max-w-[100px] mx-auto">
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${row.progress || 0}%` }} />
                            </div>
                            <span className=" text-xs text-slate-600">{row.progress || 0}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3.5 text-center">
                          <span className={`text-xs  px-2.5 py-0.5 rounded-full border ${row.status === 'Active' || row.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                            {row.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleProjectSelect(row.id); }}
                              className="bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-600 rounded p-1.5 cursor-pointer transition-colors"
                              title="View Details"
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); window.location.href = `/seo-gmb/project-setup?id=${row.id}`; }}
                              className="bg-white border border-slate-200 hover:bg-amber-50 hover:border-amber-200 text-slate-600 hover:text-amber-600 rounded p-1.5 cursor-pointer transition-colors"
                              title="Edit Setup"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteProject(row.id, e)}
                              className="bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded p-1.5 cursor-pointer transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredProjects.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                          No projects found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─── DETAILS VIEW: INDIVIDUAL PROJECT DASHBOARD ─── */
        <div className="p-6">

          {/* Back button link */}
          <button
            onClick={handleBackToList}
            className="flex items-center gap-1.5 text-slate-500 hover:text-blue-500  bg-transparent border-none cursor-pointer text-xs mb-4"
          >
            <ArrowLeft size={13} /> Back to Projects List
          </button>

          {/* Project Header Row */}
          <div className="flex items-center justify-between mb-5 ">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-600 text-white text-2xl  rounded w-14 h-14 flex items-center justify-center ">
                {currentProjectName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl  text-slate-900 m-0">{currentProjectName}</h1>
                  <span className="bg-green-100 text-green-700 text-xs  px-2.5 py-0.5 rounded-full">{currentStatus}</span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                  <span>{gmb ? 'GMB Listing Active' : 'No GMB Listing'}</span>
                  <span>•</span>
                  <span>Software / Technology</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1"><Globe size={13} /> {gmb?.location_name || 'HQ'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div>
                <div className="text-xs text-slate-500 font-medium mb-1">Project Manager</div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs  text-blue-700">
                    {currentPM.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-xs  text-slate-700">{currentPM}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium mb-1">Start Date</div>
                <div className="text-xs  text-slate-700">{currentStartDate}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium mb-1">End Date</div>
                <div className="text-xs  text-slate-700">{currentEndDate}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium mb-1">Project Value</div>
                <div className="text-[14px] font-extrabold text-slate-900">₹ {parseFloat(currentBudget).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <a href={`/seo-gmb/project-setup?id=${project?.id}`} className="bg-blue-500 hover:bg-blue-600 text-white rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer border-none no-underline transition-colors ">
                  <Edit3 size={14} /> Edit Project
                </a>
                <button className="bg-white border border-slate-200 hover:bg-slate-50 rounded w-9 h-9 flex items-center justify-center cursor-pointer">
                  <MoreHorizontal size={18} color="#64748B" />
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-slate-200 mb-5 pb-0.25">
            {['Project Overview', 'Client Information', 'Team Assignment', 'Project Timeline', 'Milestones', 'Project Documents'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`bg-none border-none pb-3 text-sm  cursor-pointer outline-none transition-all duration-200 ${activeTab === tab
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-slate-500 border-b-2 border-transparent hover:text-slate-800'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── 1. PROJECT OVERVIEW TAB ── */}
          {activeTab === 'Project Overview' && (
            <>
              {/* KPI Highlight Cards Row */}
              <div className="grid grid-cols-6 gap-2 mb-5">
                {[
                  { label: 'Overall Progress', value: `${project?.progress || 72}%`, progress: project?.progress || 72, change: '18.6%', up: true, icon: Activity, color: 'text-blue-500 bg-blue-50' },
                  { label: 'SEO Score', value: '87/100', text: 'Very Good', icon: Zap, color: 'text-green-500 bg-green-50' },
                  { label: 'Keywords Ranked', value: keywords.length || 0, change: '12.4%', up: true, icon: TrendingUp, color: 'text-red-500 bg-red-50' },
                  { label: 'Organic Traffic', value: '24.6K', change: '22.1%', up: true, icon: Globe, color: 'text-purple-500 bg-purple-50' },
                  { label: 'Backlinks', value: '1.2K', change: '15.3%', up: true, icon: Link, color: 'text-amber-500 bg-amber-50' },
                  { label: 'Tasks Completed', value: `${project?.completed_tasks || 0} / ${project?.total_tasks || 0}`, progress: project?.total_tasks ? Math.round((project.completed_tasks / project.total_tasks) * 100) : 0, icon: ClipboardList, color: 'text-pink-500 bg-pink-50' },
                ].map((card, i) => (
                  <div key={i} className="bg-white rounded p-2 border border-slate-200 flex flex-col justify-between ">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-slate-500 ">{card.label}</span>
                      <div className={`rounded w-7 h-7 flex items-center justify-center ${card.color}`}>
                        <card.icon size={14} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl  text-slate-900">{card.value}</span>
                        {card.change && (
                          <span className="text-xs  text-green-500 inline-flex items-center">
                            <ArrowUpRight size={12} /> {card.change}
                          </span>
                        )}
                      </div>
                      {card.text && <div className="text-xs text-green-500  mt-1">{card.text}</div>}
                      {card.progress !== undefined && (
                        <div className="mt-2">
                          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-pink-500" style={{ width: `${card.progress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Split layout: Left column (col-span-3) and Right column (col-span-1) */}
              <div className="grid grid-cols-4 gap-2">
                {/* Left Column content */}
                <div className="col-span-3 flex flex-col gap-2">

                  {/* Project Summary and SEO Performance combined card */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 ">
                    <div className="flex justify-between items-center mb-5">
                      <h3 className="text-base  text-slate-900 m-0">Project Overview</h3>
                      <AdvancedDateRangePicker
                        range={dateRange}
                        onChange={setDateRange}
                        initialRange="Last 30 Days"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      <div className="col-span-1">
                        <h4 className="text-xs text-slate-900  mb-2.5">Project Summary</h4>
                        <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-4">
                          {project?.description || 'TechNova Solutions is a software development company specializing in ERP and CRM solutions. Our SEO campaign aims to increase organic visibility, drive quality traffic, and generate more leads.'}
                        </p>
                        <div className="flex flex-col gap-2.5">
                          {[
                            { label: 'Project Type', value: project?.title || 'SEO Campaign', icon: Globe },
                            { label: 'Package', value: project?.package_plan || 'Premium SEO', icon: Zap },
                            { label: 'Primary Goal', value: 'Increase Organic Traffic & Leads', icon: Target },
                            { label: 'Target Keywords', value: keywords.length || 0, icon: ClipboardList },
                            { label: 'Target Locations', value: 'USA, Canada, UK, Australia', icon: MapPin },
                          ].map((x, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <div className="text-blue-500 flex items-center">
                                <x.icon size={14} />
                              </div>
                              <span className="text-slate-500 w-28">{x.label}</span>
                              <span className=" text-slate-700 truncate max-w-[120px]">{x.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-l border-slate-100 pl-6 col-span-2">
                        <h4 className="text-xs text-slate-900  mb-4">SEO Performance Overview</h4>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="col-span-3">
                            <ResponsiveContainer width="100%" height={200}>
                              <LineChart data={[]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="Clicks" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="Impressions" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="Position" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="col-span-1 flex flex-col gap-3 justify-center">
                            {[
                              { label: 'Total Clicks', value: '0', change: '0%', up: true, color: 'bg-blue-500' },
                              { label: 'Total Impressions', value: '0', change: '0%', up: true, color: 'bg-green-500' },
                              { label: 'Avg. CTR', value: '0%', change: '0%', up: true, color: 'bg-indigo-500' },
                              { label: 'Avg. Position', value: '0', change: '0%', up: false, color: 'bg-red-500' },
                            ].map((m, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${m.color}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-slate-500 truncate">{m.label}</div>
                                  <div className="text-[12px]  text-slate-900 mt-0.5">{m.value}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grid for Recent Tasks and Project Health side-by-side */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Recent Tasks */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col col-span-2 ">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base  text-slate-900 m-0">Recent Tasks</h3>
                        <a href="/seo-gmb/tasks" className="text-blue-500 text-xs  no-underline hover:underline">View All Tasks</a>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                              <th className="py-2 px-2.5 text-left text-slate-500  text-xs w-6"><input type="checkbox" className="rounded" /></th>
                              <th className="py-2 px-2.5 text-left text-slate-500  text-xs">Task</th>
                              <th className="py-2 px-2.5 text-left text-slate-500  text-xs">Module</th>
                              <th className="py-2 px-2.5 text-left text-slate-500  text-xs">Assigned To</th>
                              <th className="py-2 px-2.5 text-left text-slate-500  text-xs">Due Date</th>
                              <th className="py-2 px-2.5 text-left text-slate-500  text-xs">Priority</th>
                              <th className="py-2 px-2.5 text-left text-slate-500  text-xs">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tasks.length > 0 ? tasks.slice(0, 5).map((task, i) => (
                              <tr key={task.id || i} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="py-2.5 px-2.5"><input type="checkbox" className="rounded" /></td>
                                <td className="py-2.5 px-2.5  text-slate-900 max-w-[160px] truncate">{task.title}</td>
                                <td className="py-2.5 px-2.5 text-slate-500">{task.module || 'General'}</td>
                                <td className="py-2.5 px-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-[9px]  text-slate-900 bg-blue-100">
                                      {(task.assigned_to_name || 'U').split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <span className="text-xs">{task.assigned_to_name || 'Unassigned'}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-2.5 text-slate-500 whitespace-nowrap">{task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</td>
                                <td className="py-2.5 px-2.5">
                                  <span className={` ${task.priority === 'High' ? 'text-red-500' : task.priority === 'Medium' ? 'text-amber-500' : 'text-green-500'}`}>
                                    {task.priority || 'Medium'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2.5">
                                  <span className="text-xs  px-2 py-0.5 rounded-md whitespace-nowrap bg-slate-100 text-slate-700">
                                    {task.status || 'Open'}
                                  </span>
                                </td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan="7" className="py-8 text-center text-slate-500">No tasks found. Create tasks to see them here.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Project Health */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 col-span-1 ">
                      <h3 className="text-base  text-slate-900 m-0 mb-4">Project Health</h3>
                      <div className="flex items-center justify-around mb-4">
                        <div className="relative w-[90px] h-[90px]">
                          <PieChart width={90} height={90}>
                            <Pie data={[
                              { name: 'Completed', value: project?.progress || 0, color: '#10B981' },
                              { name: 'Remaining', value: 100 - (project?.progress || 0), color: '#E5E7EB' }
                            ]} cx={41} cy={41} innerRadius={28} outerRadius={40} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                              {[
                                { name: 'Completed', value: project?.progress || 0, color: '#10B981' },
                                { name: 'Remaining', value: 100 - (project?.progress || 0), color: '#E5E7EB' }
                              ].map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                          </PieChart>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                            <div className="text-sm font-extrabold text-slate-900">{project?.progress || 0}%</div>
                            <div className="text-[8px] text-green-500 ">Good</div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-xs text-slate-500 w-12">Completed</span>
                            <span className="text-xs  text-slate-950">{project?.progress || 0}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                            <span className="text-xs text-slate-500 w-12">Remaining</span>
                            <span className="text-xs  text-slate-950">{100 - (project?.progress || 0)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-px bg-slate-100 mb-3.5" />
                      <div>
                        <div className="text-xs  text-slate-900 mb-2">Top Priorities</div>
                        <div className="flex flex-col gap-2">
                          {[
                            'Increase Organic Traffic',
                            'Improve Keyword Rankings',
                            'Build Quality Backlinks',
                            'Optimize GMB Profile',
                          ].map((p, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <CheckCircle size={14} className="text-blue-500" />
                              <span className="text-xs text-slate-600">{p}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project Timeline Snapshot */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 ">
                    <h3 className="text-base  text-slate-900 m-0 mb-4">Project Timeline Snapshot</h3>
                    <div className="flex items-center gap-1 overflow-x-auto pb-2">
                      {[
                        { name: 'Website Audit', progress: 100, label: 'Completed', color: 'bg-green-500 text-green-500' },
                        { name: 'Keyword Research', progress: 100, label: 'Completed', color: 'bg-green-500 text-green-500' },
                        { name: 'Technical SEO', progress: 75, label: 'In Progress', color: 'bg-blue-500 text-blue-500' },
                        { name: 'On-Page SEO', progress: 60, label: 'In Progress', color: 'bg-amber-500 text-amber-500' },
                        { name: 'Content Creation', progress: 40, label: 'In Progress', color: 'bg-purple-500 text-purple-500' },
                        { name: 'Link Building', progress: 20, label: 'Upcoming', color: 'bg-slate-400 text-slate-400' },
                        { name: 'GMB Optimization', progress: 0, label: 'Upcoming', color: 'bg-slate-300 text-slate-300' },
                      ].map((step, i) => (
                        <div key={i} className="flex items-center gap-2 shrink-0 pr-6 border-r border-slate-100 last:border-0">
                          <div>
                            <p className="text-xs  text-slate-800 m-0">{step.name}</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <div className="w-16 bg-slate-100 rounded-full h-1 overflow-hidden">
                                <div className={`h-full ${step.color.split(' ')[0]}`} style={{ width: `${step.progress}%` }} />
                              </div>
                              <span className="text-[9px] font-black text-slate-500">{step.progress}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column content */}
                <div className="col-span-1 flex flex-col gap-2">
                  {/* Recent Activity */}
                  <div className="bg-white rounded-2xl p-2 border border-slate-200 ">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm  text-slate-900 m-0">Project Activity</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="text-xs text-slate-500 py-4 text-center">No recent activity.</div>
                    </div>
                  </div>

                  {/* Upcoming Milestones */}
                  <div className="bg-white rounded-2xl p-2 border border-slate-200 ">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm  text-slate-900 m-0">Upcoming Milestones</h3>
                    </div>
                    <div className="flex flex-col gap-3.5">
                      <div className="text-xs text-slate-500 py-4 text-center">No upcoming milestones.</div>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="bg-white rounded-2xl p-2 border border-slate-200 ">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm  text-slate-900 m-0">Team Members</h3>
                    </div>
                    <div className="flex flex-col gap-3.5">
                      {project?.team_members && project.team_members.length > 0 ? (
                        project.team_members.map((member, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center  text-xs text-slate-600">
                                {(member.name || 'U').split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="text-xs  text-slate-800 m-0 leading-tight">{member.name}</p>
                                <p className="text-[9px] text-slate-400 m-0 mt-0.5">{member.role}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-500 py-4 text-center">No team members assigned.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── 2. CLIENT INFORMATION TAB ── */}
          {activeTab === 'Client Information' && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded-2xl p-6 border border-slate-200  flex flex-col gap-4">
                <h3 className="text-base  text-slate-900 m-0 border-b border-slate-100 pb-2">Client Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-slate-400  block">Company Name</span><p className="m-0 mt-0.5  text-slate-800">{project?.company_name || project?.name || 'TechNova Solutions'}</p></div>
                  <div><span className="text-slate-400  block">Website URL</span><p className="m-0 mt-0.5  text-blue-600">www.technova.com</p></div>
                  <div><span className="text-slate-400  block">Company Phone</span><p className="m-0 mt-0.5  text-slate-800">+1 (615) 555-7890</p></div>
                  <div><span className="text-slate-400  block">Company Email</span><p className="m-0 mt-0.5  text-slate-800">info@technova.com</p></div>
                  <div className="col-span-2"><span className="text-slate-400  block">Company Address</span><p className="m-0 mt-0.5  text-slate-800">1820 Tech Park Drive, Suite 500, San Francisco, CA 94107, United States</p></div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200  flex flex-col gap-4">
                <h3 className="text-base  text-slate-900 m-0 border-b border-slate-100 pb-2">Primary Communications</h3>
                <div className="flex flex-col gap-3">
                  <div className="text-xs text-slate-500 py-4 text-center">No communications recorded yet.</div>
                </div>
              </div>
            </div>
          )}

          {/* ── 3. TEAM ASSIGNMENT TAB ── */}
          {activeTab === 'Team Assignment' && (
            <div className="flex flex-col gap-2 text-xs">
              <div className="bg-white rounded-2xl p-2 border border-slate-200 ">
                <h3 className="text-base  text-slate-900 m-0 mb-4">Team Load Allocations</h3>
                <div className="text-xs text-slate-500 py-8 text-center">No team allocations found.</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-2xl p-2 border border-slate-200 ">
                  <h3 className="text-base  text-slate-900 m-0 mb-4">Team Availability / Leaves</h3>
                  <div className="text-xs text-slate-500 py-8 text-center">No leave data available.</div>
                </div>
              </div>
            </div>
          )}

          {/* ── 4. PROJECT TIMELINE TAB ── */}
          {activeTab === 'Project Timeline' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200  text-xs">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-base  text-slate-900 m-0">Project Timeline</h3>
                  <p className="text-xs text-slate-400 m-0 mt-0.5">Timeline Gantt representation of major SEO phases.</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <button className="bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md  text-slate-900 cursor-pointer">Today</button>
                  <button className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-1 rounded-md cursor-pointer"><Sliders size={14} /></button>
                </div>
              </div>

              {/* Gantt chart representation */}
              <div className="border border-slate-200 rounded overflow-hidden ">
                <div className="text-xs text-slate-500 py-12 text-center bg-slate-50">No timeline data available for this project.</div>
              </div>
            </div>
          )}

          {/* ── 5. MILESTONES TAB ── */}
          {activeTab === 'Milestones' && (
            <div className="flex flex-col gap-2">
              <div className="bg-white rounded-2xl p-2 border border-slate-200 ">
                <h3 className="text-sm  text-slate-900 mb-3.5">Milestones</h3>
                <div className="text-xs text-slate-500 py-12 text-center">No milestones found for this project.</div>
              </div>
            </div>
          )}

          {/* ── 6. PROJECT DOCUMENTS TAB ── */}
          {activeTab === 'Project Documents' && (
            <div className="flex justify-between items-center mb-5">
              <div className="bg-white rounded-2xl p-2 border border-slate-200  w-full">
                <div className="text-xs text-slate-500 py-12 text-center">No documents uploaded yet.</div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
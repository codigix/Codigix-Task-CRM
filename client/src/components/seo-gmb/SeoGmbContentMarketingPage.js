import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Plus, Calendar, Download, RefreshCw, BookOpen, FileText, Cpu, Layers,
  CheckCircle, BarChart2, Copy, AlignLeft, Globe, Tag, User, ArrowUpRight,
  TrendingUp, Eye, Clock, AlertCircle,
} from 'lucide-react';
import SeoGmbProjectSelector from './SeoGmbProjectSelector';
import CrudTable from '../common/CrudTable';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


// ── Static chart data ──────────────────────────────────────────────────────
const PERFORMANCE_DATA = [];

const DUPLICATE_PIE = [];

const CLUSTER_BUBBLE_DATA = [];

// ── Helpers ────────────────────────────────────────────────────────────────
const statusBadge = (status) => {
  const map = {
    'Published': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'In Progress': 'bg-blue-50 text-blue-700 border border-blue-200',
    'Draft': 'bg-amber-50 text-amber-700 border border-amber-200',
    'Planned': 'bg-slate-50 text-slate-600 border border-slate-200',
    'Pending': 'bg-rose-50 text-rose-600 border border-rose-200',
    'Approved': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };
  return <span className={`text-xs  px-2.5 py-0.5 rounded-full ${map[status] || 'bg-slate-100 text-slate-500'}`}>{status}</span>;
};

const priorityBadge = (p) => {
  const map = {
    High: 'bg-red-100 text-red-600',
    Medium: 'bg-amber-100 text-amber-600',
    Low: 'bg-emerald-100 text-emerald-700',
  };
  return <span className={`text-xs  px-2 py-0.5 rounded ${map[p] || ''}`}>{p}</span>;
};

// ── Tab definitions ────────────────────────────────────────────────────────
const TABS = [
  { id: 'Content Planner', icon: BookOpen },
  { id: 'Content Calendar', icon: Calendar },
  { id: 'AI Content Generator', icon: Cpu },
  { id: 'Blog Management', icon: FileText },
  { id: 'Content Approval', icon: CheckCircle },
  { id: 'Content Performance', icon: BarChart2 },
  { id: 'Duplicate Content', icon: Copy },
  { id: 'Pillar Pages', icon: Layers },
  { id: 'Topic Clusters', icon: AlignLeft },
];

// ── Column definitions ────────────────────────────────────────────────────
const plannerCols = [
  { header: 'Topic / Title', accessor: 'title' },
  { header: 'Content Type', accessor: 'type' },
  { header: 'Target Keyword', accessor: 'keyword' },
  { header: 'Priority', accessor: 'priority' },
  { header: 'Author', accessor: 'author' },
  { header: 'Due Date', accessor: 'due' },
  { header: 'Status', accessor: 'status' },
];
const calendarCols = [
  { header: 'Title', accessor: 'title' },
  { header: 'Date', accessor: 'date' },
  { header: 'Type', accessor: 'type' },
  { header: 'Status', accessor: 'status' },
];
const aiGeneratorCols = [
  { header: 'Topic', accessor: 'topic' },
  { header: 'Content Type', accessor: 'type' },
  { header: 'Tone', accessor: 'tone' },
  { header: 'Generated At', accessor: 'createdAt' },
];
const blogCols = [
  { header: 'Title', accessor: 'title' },
  { header: 'Author', accessor: 'author' },
  { header: 'Published', accessor: 'published' },
  { header: 'Status', accessor: 'status' },
];
const approvalCols = [
  { header: 'Title', accessor: 'title' },
  { header: 'Author', accessor: 'author' },
  { header: 'Submitted', accessor: 'submitted' },
  { header: 'Status', accessor: 'status' },
];
const performanceCols = [
  { header: 'Page / Title', accessor: 'page' },
  { header: 'Views', accessor: 'views' },
  { header: 'Engagement', accessor: 'engagement' },
  { header: 'Avg. Time', accessor: 'avgTime' },
];
const duplicateCols = [
  { header: 'URL', accessor: 'url' },
  { header: 'Duplicate Of', accessor: 'duplicateOf' },
  { header: 'Risk', accessor: 'risk' },
  { header: 'Action', accessor: 'action' },
];
const pillarCols = [
  { header: 'Pillar Page', accessor: 'page' },
  { header: 'Linked Clusters', accessor: 'clusters' },
  { header: 'Total Posts', accessor: 'posts' },
  { header: 'Status', accessor: 'status' },
];
const clusterCols = [
  { header: 'Cluster Name', accessor: 'name' },
  { header: 'Pillar Page', accessor: 'pillar' },
  { header: 'Total Posts', accessor: 'posts' },
  { header: 'Status', accessor: 'status' },
];

// ── Default data ──────────────────────────────────────────────────────────
const initPlanner = [];
const initCalendar = [];
const initAiGenerator = [];
const initBlogs = [];
const initApprovals = [];
const initPerformance = [];
const initDuplicate = [];
const initPillar = [];
const initCluster = [];

// ═══════════════════════════════════════════════════════════════════════════
export default function SeoGmbContentMarketingPage() {
  const [activeTab, setActiveTab] = useState('Content Planner');
  const [project, setProject] = useState(null);

  // CRUD state
  const [planner, setPlanner] = useState(initPlanner);
  const [calendarItems, setCalendarItems] = useState(initCalendar);
  const [aiItems, setAiItems] = useState(initAiGenerator);
  const [blogs, setBlogs] = useState(initBlogs);
  const [approvals, setApprovals] = useState(initApprovals);
  const [performance, setPerformance] = useState(initPerformance);
  const [duplicate, setDuplicate] = useState(initDuplicate);
  const [pillar, setPillar] = useState(initPillar);
  const [cluster, setCluster] = useState(initCluster);

  // Generic handlers
  const makeAdd = (setter) => (item) =>
    setter((prev) => [...prev, { ...item, id: prev.length ? Math.max(...prev.map((i) => i.id)) + 1 : 1 }]);
  const makeEdit = (setter) => (id, item) =>
    setter((prev) => prev.map((i) => (i.id === id ? { ...i, ...item } : i)));
  const makeDel = (setter) => (id) =>
    setter((prev) => prev.filter((i) => i.id !== id));

  const loadProject = async (proj) => {
    try {
      const r = await fetch(`${API_BASE_URL}/projects/${proj.id}`);
      if (r.ok) setProject(await r.json());
    } catch { }
  };

  const totalContent = planner.length + blogs.length;
  const published = [...planner, ...blogs].filter((i) => i.status === 'Published').length;
  const drafts = [...planner, ...blogs].filter((i) => i.status === 'Draft').length;
  const inReview = approvals.filter((i) => i.status === 'Pending').length;

  return (
    <div className="bg-slate-50 min-h-screen font-sans pb-10">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded flex items-center justify-center">
            <BookOpen size={16} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-lg  text-slate-900 m-0 leading-none">Content Marketing {project ? `for ${project.name}` : ''}</h1>
            <p className="text-xs text-slate-400 m-0 mt-0.5">Plan, create, manage and analyze your content for better engagement and ranking.</p>
          </div>
          <SeoGmbProjectSelector onProjectChange={loadProject} />
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer">
            <Calendar size={13} /> May 8 – May 15, 2026
          </button>
          <button className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer">
            <Download size={13} /> Export Report
          </button>
          <button
            onClick={() => setActiveTab('Content Planner')}
            className="bg-blue-500 hover:bg-blue-600 border-none text-white rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus size={14} /> Create New Content
          </button>
        </div>
      </div>

      <div className="px-6 py-4">

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-6 gap-4 mb-5">
          {[
            { label: 'Total Content', value: totalContent, sub: '+18.5% vs last 30 days', color: 'text-blue-500', bg: 'bg-blue-50', icon: FileText },
            { label: 'Published', value: published, sub: '+22.1% vs last 30 days', color: 'text-emerald-500', bg: 'bg-emerald-50', icon: CheckCircle },
            { label: 'Drafts', value: drafts, sub: '-5.3% vs last 30 days', color: 'text-amber-500', bg: 'bg-amber-50', icon: FileText },
            { label: 'In Review', value: inReview, sub: '+12.7% vs last 30 days', color: 'text-rose-500', bg: 'bg-rose-50', icon: Clock },
            { label: 'Scheduled', value: 17, sub: '+8.9% vs last 30 days', color: 'text-purple-500', bg: 'bg-purple-50', icon: Calendar },
            { label: 'Avg. Engagement', value: '4.8K', sub: '+15.6% vs last 30 days', color: 'text-indigo-500', bg: 'bg-indigo-50', icon: TrendingUp },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400  block">{card.label}</span>
                <strong className="text-xl font-black text-slate-900 mt-1 block">{card.value}</strong>
                <span className={`text-xs  flex items-center gap-0.5 mt-1 ${card.color}`}>
                  <ArrowUpRight size={10} /> {card.sub}
                </span>
              </div>
              <div className={`w-9 h-9 rounded flex items-center justify-center ${card.bg}`}>
                <card.icon size={16} className={card.color} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs Nav ── */}
        <div className="flex gap-1.5 mb-5 bg-white p-1 rounded border border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
          {TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 p-2 rounded text-xs  cursor-pointer border-none outline-none transition-all shrink-0 ${activeTab === id ? 'bg-blue-50 text-blue-600 ' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              <Icon size={12} /> {id}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════
            Content Planner Tab (dashboard overview + CRUD)
        ══════════════════════════════════════════════════ */}
        {activeTab === 'Content Planner' && (
          <div className="flex flex-col gap-2">
            {/* Mini overview cards + calendar preview */}
            <div className="grid grid-cols-3 gap-2">
              {/* Content Planner Table */}
              <div className="col-span-2">
                <CrudTable
                  title="Content Planner"
                  columns={plannerCols}
                  data={planner}
                  onAdd={makeAdd(setPlanner)}
                  onEdit={makeEdit(setPlanner)}
                  onDelete={makeDel(setPlanner)}
                />
              </div>

              {/* Content Calendar mini preview */}
              <div className="bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm  text-slate-900 m-0">Content Calendar</h3>
                  <button
                    onClick={() => setActiveTab('Content Calendar')}
                    className="text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline"
                  >View Calendar →</button>
                </div>
                <p className="text-xs text-slate-400 m-0 mb-3">Your upcoming content schedule</p>
                {/* Simple calendar grid */}
                <div className="text-xs  text-slate-400 mb-2">
                  <div className="flex justify-between px-1 mb-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <span key={d}>{d}</span>)}
                  </div>
                  {[[26, 27, 28, 29, 30, 1, 2], [3, 4, 5, 6, 7, 8, 9], [10, 11, 12, 13, 14, 15, 16], [17, 18, 19, 20, 21, 22, 23], [24, 25, 26, 27, 28, 29, 30], [31, 1, 2, 3, 4, 5, 6]].map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 text-center mb-0.5">
                      {week.map((d, di) => (
                        <span key={di} className={`py-1 rounded text-slate-600 ${d === 18 ? 'bg-blue-500 text-white font-black' : 'hover:bg-slate-100'}`}>{d}</span>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-2 text-xs ">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Published</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Scheduled</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Draft</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" />Review</span>
                </div>
              </div>
            </div>

            {/* Bottom row: section previews */}
            <div className="grid grid-cols-5 gap-4">
              {[
                { tab: 'AI Content Generator', icon: Cpu, color: 'text-purple-500 bg-purple-50', title: 'AI Content Generator', desc: 'Generate SEO optimized content with AI', count: aiItems.length },
                { tab: 'Blog Management', icon: FileText, color: 'text-blue-500 bg-blue-50', title: 'Blog Management', desc: 'Manage your blog posts and pages', count: blogs.length },
                { tab: 'Content Approval', icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50', title: 'Content Approval', desc: 'Review and approve content', count: approvals.length },
                { tab: 'Content Performance', icon: BarChart2, color: 'text-amber-500 bg-amber-50', title: 'Content Performance', desc: 'Track content performance metrics', count: performance.length },
                { tab: 'Duplicate Content', icon: Copy, color: 'text-rose-500 bg-rose-50', title: 'Duplicate Content', desc: 'Check for duplicate content issues', count: duplicate.length },
              ].map((card) => (
                <div key={card.tab} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between hover: transition-shadow">
                  <div className={`w-8 h-8 rounded flex items-center justify-center mb-2 ${card.color}`}>
                    <card.icon size={16} />
                  </div>
                  <h4 className="text-xs  text-slate-900 m-0">{card.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 mb-3">{card.desc}</p>
                  <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                    <span className="text-xs  text-slate-500">{card.count} items</span>
                    <button
                      onClick={() => setActiveTab(card.tab)}
                      className="text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline"
                    >View All →</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pillar Pages + Topic Clusters preview */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-teal-50 rounded flex items-center justify-center">
                      <Layers size={14} className="text-teal-500" />
                    </div>
                    <h3 className="text-sm  text-slate-900 m-0">Pillar Pages</h3>
                  </div>
                  <button onClick={() => setActiveTab('Pillar Pages')} className="text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline">View All Pillar Pages →</button>
                </div>
                <table className="w-full text-xs text-slate-700">
                  <thead>
                    <tr className="text-xs text-slate-400   border-b border-slate-100">
                      <th className="pb-2 text-left">Pillar Page</th>
                      <th className="pb-2 text-left">Clusters</th>
                      <th className="pb-2 text-left">Posts</th>
                      <th className="pb-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pillar.slice(0, 3).map((row) => (
                      <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2 font-medium text-slate-800">{row.page}</td>
                        <td className="py-2 text-slate-500">{row.clusters}</td>
                        <td className="py-2 text-slate-500">{row.posts}</td>
                        <td className="py-2">{statusBadge(row.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-violet-50 rounded flex items-center justify-center">
                      <AlignLeft size={14} className="text-violet-500" />
                    </div>
                    <h3 className="text-sm  text-slate-900 m-0">Topic Clusters</h3>
                  </div>
                  <button onClick={() => setActiveTab('Topic Clusters')} className="text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline">View All Clusters →</button>
                </div>
                <table className="w-full text-xs text-slate-700">
                  <thead>
                    <tr className="text-xs text-slate-400   border-b border-slate-100">
                      <th className="pb-2 text-left">Cluster Name</th>
                      <th className="pb-2 text-left">Pillar Page</th>
                      <th className="pb-2 text-left">Posts</th>
                      <th className="pb-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cluster.slice(0, 4).map((row) => (
                      <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2 font-medium text-slate-800">{row.name}</td>
                        <td className="py-2 text-slate-400 text-xs">{row.pillar}</td>
                        <td className="py-2 text-slate-500">{row.posts}</td>
                        <td className="py-2">{statusBadge(row.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Content Calendar ── */}
        {activeTab === 'Content Calendar' && (
          <CrudTable
            title="Content Calendar"
            columns={calendarCols}
            data={calendarItems}
            onAdd={makeAdd(setCalendarItems)}
            onEdit={makeEdit(setCalendarItems)}
            onDelete={makeDel(setCalendarItems)}
          />
        )}

        {/* ── AI Content Generator ── */}
        {activeTab === 'AI Content Generator' && (
          <div className="flex flex-col gap-2">
            {/* Generator form */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-purple-50 rounded flex items-center justify-center">
                  <Cpu size={16} className="text-purple-500" />
                </div>
                <div>
                  <h3 className="text-sm  text-slate-900 m-0">AI Content Generator</h3>
                  <p className="text-xs text-slate-400 m-0">Generate SEO optimized content with AI</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs  text-slate-400  block mb-1">Topic</label>
                  <input
                    type="text"
                    defaultValue="Benefits of content marketing for businesses"
                    className="w-full border border-slate-200 rounded p-2.5 text-xs text-slate-800 focus:border-blue-400 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs  text-slate-400  block mb-1">Content Type</label>
                    <select className="w-full border border-slate-200 rounded p-2.5 text-xs text-slate-700 focus:border-blue-400 outline-none">
                      <option>Blog Post</option>
                      <option>Guide</option>
                      <option>Article</option>
                      <option>List Article</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs  text-slate-400  block mb-1">Tone</label>
                    <select className="w-full border border-slate-200 rounded p-2.5 text-xs text-slate-700 focus:border-blue-400 outline-none">
                      <option>Professional</option>
                      <option>Friendly</option>
                      <option>Informative</option>
                      <option>Casual</option>
                    </select>
                  </div>
                </div>
              </div>
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white border-none rounded py-2.5 text-sm  cursor-pointer transition-colors flex items-center justify-center gap-2">
                <Cpu size={15} /> Generate Content
              </button>
            </div>
            {/* Table of generated content */}
            <CrudTable
              title="AI Generated Content"
              columns={aiGeneratorCols}
              data={aiItems}
              onAdd={makeAdd(setAiItems)}
              onEdit={makeEdit(setAiItems)}
              onDelete={makeDel(setAiItems)}
            />
          </div>
        )}

        {/* ── Blog Management ── */}
        {activeTab === 'Blog Management' && (
          <CrudTable
            title="Blog Management"
            columns={blogCols}
            data={blogs}
            onAdd={makeAdd(setBlogs)}
            onEdit={makeEdit(setBlogs)}
            onDelete={makeDel(setBlogs)}
          />
        )}

        {/* ── Content Approval ── */}
        {activeTab === 'Content Approval' && (
          <CrudTable
            title="Content Approval"
            columns={approvalCols}
            data={approvals}
            onAdd={makeAdd(setApprovals)}
            onEdit={makeEdit(setApprovals)}
            onDelete={makeDel(setApprovals)}
          />
        )}

        {/* ── Content Performance ── */}
        {activeTab === 'Content Performance' && (
          <div className="flex flex-col gap-2">
            {/* Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-2">
              <h3 className="text-sm  text-slate-900 m-0 mb-4">Views & Engagement Over Time</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={PERFORMANCE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="views" stroke="#3B82F6" fill="#DBEAFE" strokeWidth={2} name="Views" />
                  <Area type="monotone" dataKey="engagement" stroke="#10B981" fill="#D1FAE5" strokeWidth={2} name="Engagement" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <CrudTable
              title="Content Performance"
              columns={performanceCols}
              data={performance}
              onAdd={makeAdd(setPerformance)}
              onEdit={makeEdit(setPerformance)}
              onDelete={makeDel(setPerformance)}
            />
          </div>
        )}

        {/* ── Duplicate Content ── */}
        {activeTab === 'Duplicate Content' && (
          <div className="flex flex-col gap-2">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <CrudTable
                  title="Duplicate Content Issues"
                  columns={duplicateCols}
                  data={duplicate}
                  onAdd={makeAdd(setDuplicate)}
                  onEdit={makeEdit(setDuplicate)}
                  onDelete={makeDel(setDuplicate)}
                />
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-col items-center justify-center">
                <h3 className="text-sm  text-slate-900 m-0 mb-4 self-start">Risk Distribution</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={DUPLICATE_PIE} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                      {DUPLICATE_PIE.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center mt-2">
                  <strong className="text-2xl font-black text-slate-900">{duplicate.length}</strong>
                  <p className="text-xs text-slate-400  m-0">Total Issues</p>
                </div>
                <div className="flex flex-col gap-1 mt-3 w-full">
                  {DUPLICATE_PIE.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs  text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </div>
                      <strong>{d.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Pillar Pages ── */}
        {activeTab === 'Pillar Pages' && (
          <CrudTable
            title="Pillar Pages"
            columns={pillarCols}
            data={pillar}
            onAdd={makeAdd(setPillar)}
            onEdit={makeEdit(setPillar)}
            onDelete={makeDel(setPillar)}
          />
        )}

        {/* ── Topic Clusters ── */}
        {activeTab === 'Topic Clusters' && (
          <div className="flex flex-col gap-2">
            <CrudTable
              title="Topic Clusters"
              columns={clusterCols}
              data={cluster}
              onAdd={makeAdd(setCluster)}
              onEdit={makeEdit(setCluster)}
              onDelete={makeDel(setCluster)}
            />
            {/* Visual cluster map */}
            <div className="bg-white rounded-2xl border border-slate-200 p-2">
              <h3 className="text-sm  text-slate-900 m-0 mb-4">Cluster Relationship Map</h3>
              <div className="relative w-full h-64 bg-slate-50 rounded overflow-hidden">
                {/* Center pillar */}
                <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
                  <div className="w-28 h-28 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center text-center">
                    <span className="text-xs  text-blue-700 leading-tight px-2">Complete SEO Guide (Pillar)</span>
                  </div>
                </div>
                {/* Surrounding clusters */}
                {[
                  { label: 'Keyword Research', left: '12%', top: '10%', color: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
                  { label: 'On-Page SEO', left: '75%', top: '8%', color: 'bg-purple-100 border-purple-300 text-purple-700' },
                  { label: 'Local SEO', left: '5%', top: '55%', color: 'bg-amber-100 border-amber-300 text-amber-700' },
                  { label: 'Content Optimization', left: '20%', top: '78%', color: 'bg-rose-100 border-rose-300 text-rose-700' },
                  { label: 'Link Building', left: '72%', top: '72%', color: 'bg-sky-100 border-sky-300 text-sky-700' },
                  { label: 'Technical SEO', left: '78%', top: '42%', color: 'bg-indigo-100 border-indigo-300 text-indigo-700' },
                ].map((c) => (
                  <div key={c.label} className="absolute" style={{ left: c.left, top: c.top, transform: 'translate(-50%,-50%)' }}>
                    <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center text-center ${c.color}`}>
                      <span className="text-[9px]  leading-tight px-1">{c.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

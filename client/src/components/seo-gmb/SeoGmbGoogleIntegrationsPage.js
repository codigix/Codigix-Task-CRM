import React, { useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList,
} from 'recharts';
import {
  Plus, Calendar, Download, Globe, BarChart2, Search, Tag, Target, TrendingUp,
  Users, ArrowUpRight, ArrowDownRight, Eye, MousePointerClick, FileText,
  Zap, CheckCircle, AlertCircle, RefreshCw, Settings, Link2, Activity,
  ChevronDown,
} from 'lucide-react';
import SeoGmbProjectSelector from './SeoGmbProjectSelector';
import CrudTable from '../common/CrudTable';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


// ── Chart Data ────────────────────────────────────────────────────────────
const SEARCH_PERF_DATA = [];

const ORGANIC_DATA = [];

const USER_BEHAVIOR = [];

const FUNNEL_DATA = [];

const INTEGRATION_STATUS = [];

// ── Column Definitions ────────────────────────────────────────────────────
const searchConsoleCols = [
  { header: 'Query', accessor: 'query' },
  { header: 'Clicks', accessor: 'clicks' },
  { header: 'Impressions', accessor: 'impressions' },
  { header: 'CTR', accessor: 'ctr' },
  { header: 'Avg Position', accessor: 'position' },
];
const ga4Cols = [
  { header: 'Metric', accessor: 'metric' },
  { header: 'Value', accessor: 'value' },
  { header: 'Change', accessor: 'change' },
  { header: 'Period', accessor: 'period' },
];
const businessInsightsCols = [
  { header: 'Metric', accessor: 'metric' },
  { header: 'Value', accessor: 'value' },
  { header: 'Change', accessor: 'change' },
  { header: 'Date', accessor: 'date' },
];
const tagManagerCols = [
  { header: 'Tag Name', accessor: 'name' },
  { header: 'Type', accessor: 'type' },
  { header: 'Trigger', accessor: 'trigger' },
  { header: 'Status', accessor: 'status' },
  { header: 'Last Modified', accessor: 'modified' },
];
const conversionCols = [
  { header: 'Conversion Name', accessor: 'name' },
  { header: 'Type', accessor: 'type' },
  { header: 'Value', accessor: 'value' },
  { header: 'Completions', accessor: 'completions' },
  { header: 'Status', accessor: 'status' },
];
const searchPerfCols = [
  { header: 'Query', accessor: 'query' },
  { header: 'Clicks', accessor: 'clicks' },
  { header: 'Impressions', accessor: 'impressions' },
  { header: 'CTR', accessor: 'ctr' },
  { header: 'Position', accessor: 'position' },
];
const organicCols = [
  { header: 'Source / Medium', accessor: 'source' },
  { header: 'Users', accessor: 'users' },
  { header: 'Sessions', accessor: 'sessions' },
  { header: 'Bounce Rate', accessor: 'bounce' },
  { header: 'Conversions', accessor: 'conversions' },
];
const landingPageCols = [
  { header: 'Page URL', accessor: 'page' },
  { header: 'Users', accessor: 'users' },
  { header: 'Sessions', accessor: 'sessions' },
  { header: 'Bounce Rate', accessor: 'bounce' },
  { header: 'Avg Duration', accessor: 'duration' },
];
const userBehaviorCols = [
  { header: 'User Type', accessor: 'type' },
  { header: 'Users', accessor: 'users' },
  { header: 'Sessions', accessor: 'sessions' },
  { header: 'Engagement Rate', accessor: 'engagement' },
  { header: 'Avg Session Duration', accessor: 'duration' },
];
const goalsCols = [
  { header: 'Event / Goal', accessor: 'event' },
  { header: 'Completions', accessor: 'completions' },
  { header: 'Conversion Rate', accessor: 'rate' },
  { header: 'Value', accessor: 'value' },
  { header: 'Status', accessor: 'status' },
];

// ── Initial Data ──────────────────────────────────────────────────────────
const INIT = {
  'Search Console': [
    { id: 1, query: 'digital marketing agency', clicks: '1,218', impressions: '24,500', ctr: '4.97%', position: '2.4' },
    { id: 2, query: 'seo services near me', clicks: '986', impressions: '18,200', ctr: '5.42%', position: '3.1' },
    { id: 3, query: 'local seo new york', clicks: '754', impressions: '14,600', ctr: '5.16%', position: '4.2' },
    { id: 4, query: 'content marketing agency', clicks: '632', impressions: '12,400', ctr: '5.10%', position: '5.8' },
    { id: 5, query: 'google business profile management', clicks: '518', impressions: '9,800', ctr: '5.29%', position: '3.7' },
  ],
  'Google Analytics (GA4)': [
    { id: 1, metric: 'Total Users', value: '24,562', change: '+18.5%', period: 'Last 7 Days' },
    { id: 2, metric: 'Sessions', value: '32,195', change: '+14.2%', period: 'Last 7 Days' },
    { id: 3, metric: 'Engaged Sessions', value: '21,234', change: '+16.3%', period: 'Last 7 Days' },
    { id: 4, metric: 'Engagement Rate', value: '65.9%', change: '+6.3%', period: 'Last 7 Days' },
    { id: 5, metric: 'Avg Session Duration', value: '3m 42s', change: '+8.1%', period: 'Last 7 Days' },
  ],
  'Business Insights': [
    { id: 1, metric: 'Profile Views', value: '24,562', change: '+18.6%', date: 'May 15, 2026' },
    { id: 2, metric: 'Search Views', value: '15,263', change: '+21.4%', date: 'May 15, 2026' },
    { id: 3, metric: 'Map Views', value: '9,299', change: '+16.2%', date: 'May 15, 2026' },
    { id: 4, metric: 'Website Clicks', value: '2,396', change: '+22.8%', date: 'May 15, 2026' },
    { id: 5, metric: 'Direction Requests', value: '933', change: '+16.3%', date: 'May 15, 2026' },
  ],
  'Google Tag Manager': [
    { id: 1, name: 'GA4 Base Tag', type: 'Google Analytics', trigger: 'All Pages', status: 'Active', modified: 'May 10, 2026' },
    { id: 2, name: 'Google Ads Conversion', type: 'Google Ads', trigger: 'Form Submit', status: 'Active', modified: 'May 8, 2026' },
    { id: 3, name: 'Facebook Pixel', type: 'Custom HTML', trigger: 'All Pages', status: 'Active', modified: 'Apr 30, 2026' },
    { id: 4, name: 'Scroll Depth Tracking', type: 'Custom Event', trigger: 'Scroll 50%', status: 'Paused', modified: 'May 5, 2026' },
    { id: 5, name: 'Phone Click Tracking', type: 'Custom Event', trigger: 'Click - Phone', status: 'Active', modified: 'May 12, 2026' },
  ],
  'Conversion Tracking': [
    { id: 1, name: 'Contact Form Submit', type: 'Lead', value: '$50', completions: '482', status: 'Active' },
    { id: 2, name: 'Phone Call Click', type: 'Phone Call', value: '$75', completions: '312', status: 'Active' },
    { id: 3, name: 'Newsletter Signup', type: 'Engagement', value: '$10', completions: '266', status: 'Active' },
    { id: 4, name: 'Download PDF', type: 'Engagement', value: '$5', completions: '198', status: 'Active' },
    { id: 5, name: 'Demo Request', type: 'Lead', value: '$150', completions: '48', status: 'Active' },
  ],
  'Search Performance': [
    { id: 1, query: 'digital marketing agency', clicks: '1,218', impressions: '24,500', ctr: '4.97%', position: '2.4' },
    { id: 2, query: 'seo services new york', clicks: '986', impressions: '18,200', ctr: '5.42%', position: '3.1' },
    { id: 3, query: 'google business profile setup', clicks: '754', impressions: '14,600', ctr: '5.16%', position: '4.2' },
    { id: 4, query: 'content marketing strategy', clicks: '632', impressions: '12,400', ctr: '5.10%', position: '5.8' },
    { id: 5, query: 'local seo services', clicks: '518', impressions: '9,800', ctr: '5.29%', position: '3.7' },
  ],
  'Organic Traffic': [
    { id: 1, source: 'google / organic', users: '18,420', sessions: '24,100', bounce: '38.5%', conversions: '842' },
    { id: 2, source: 'bing / organic', users: '2,840', sessions: '3,620', bounce: '42.1%', conversions: '124' },
    { id: 3, source: 'yahoo / organic', users: '1,240', sessions: '1,580', bounce: '45.8%', conversions: '58' },
    { id: 4, source: 'duckduckgo / organic', users: '980', sessions: '1,240', bounce: '39.6%', conversions: '44' },
    { id: 5, source: '(direct) / none', users: '1,082', sessions: '1,655', bounce: '35.2%', conversions: '96' },
  ],
  'Landing Pages': [
    { id: 1, page: '/', users: '6,642', sessions: '7,284', bounce: '42.8%', duration: '2m 18s' },
    { id: 2, page: '/services/seo', users: '3,421', sessions: '4,328', bounce: '38.7%', duration: '3m 45s' },
    { id: 3, page: '/blog/', users: '2,987', sessions: '3,912', bounce: '45.2%', duration: '4m 12s' },
    { id: 4, page: '/about-us', users: '2,156', sessions: '2,758', bounce: '41.8%', duration: '1m 56s' },
    { id: 5, page: '/contact', users: '1,858', sessions: '2,421', bounce: '39.5%', duration: '2m 34s' },
  ],
  'User Behavior': [
    { id: 1, type: 'New Users', users: '14,862', sessions: '18,240', engagement: '58.2%', duration: '2m 46s' },
    { id: 2, type: 'Returning Users', users: '8,245', sessions: '12,480', engagement: '74.6%', duration: '4m 12s' },
    { id: 3, type: 'Engaged Users', users: '6,987', sessions: '10,950', engagement: '82.4%', duration: '5m 28s' },
    { id: 4, type: 'Casual Visitors', users: '768', sessions: '525', engagement: '24.8%', duration: '0m 48s' },
  ],
  'Goals & Events': [
    { id: 1, event: 'Contact Form Submit', completions: '482', rate: '2.54%', value: '$24,100', status: 'Active' },
    { id: 2, event: 'Phone Call Click', completions: '312', rate: '1.52%', value: '$23,400', status: 'Active' },
    { id: 3, event: 'Newsletter Signup', completions: '266', rate: '1.24%', value: '$2,660', status: 'Active' },
    { id: 4, event: 'Download PDF', completions: '198', rate: '0.96%', value: '$990', status: 'Active' },
    { id: 5, event: 'Demo Request', completions: '48', rate: '0.23%', value: '$7,200', status: 'Active' },
  ],
};

// ── Tabs list ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'Overview', icon: BarChart2 },
  { id: 'Search Console', icon: Search },
  { id: 'Google Analytics (GA4)', icon: Activity },
  { id: 'Business Insights', icon: TrendingUp },
  { id: 'Google Tag Manager', icon: Tag },
  { id: 'Conversion Tracking', icon: Target },
  { id: 'Search Performance', icon: BarChart2 },
  { id: 'Organic Traffic', icon: Globe },
  { id: 'Landing Pages', icon: FileText },
  { id: 'User Behavior', icon: Users },
  { id: 'Goals & Events', icon: Zap },
];

// ── Status Badge ──────────────────────────────────────────────────────────
const statusBadge = (s) => {
  const m = {
    Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Connected: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Paused: 'bg-amber-50 text-amber-700 border border-amber-200',
    Error: 'bg-rose-50 text-rose-600 border border-rose-200',
    Inactive: 'bg-slate-100 text-slate-500',
  };
  return <span className={`text-xs  px-2.5 py-0.5 rounded-full ${m[s] || 'bg-slate-100 text-slate-500'}`}>{s}</span>;
};

// ═══════════════════════════════════════════════════════════════════════════
export default function SeoGmbGoogleIntegrationsPage() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [project, setProject] = useState(null);
  const [tableData, setTableData] = useState(INIT);

  const makeAdd = (key) => (item) => setTableData(prev => ({ ...prev, [key]: [...prev[key], { ...item, id: prev[key].length ? Math.max(...prev[key].map(i => i.id)) + 1 : 1 }] }));
  const makeEdit = (key) => (id, item) => setTableData(prev => ({ ...prev, [key]: prev[key].map(i => i.id === id ? { ...i, ...item } : i) }));
  const makeDel = (key) => (id) => setTableData(prev => ({ ...prev, [key]: prev[key].filter(i => i.id !== id) }));

  const loadProject = async (proj) => {
    try { const r = await fetch(`${API_BASE_URL}/projects/${proj.id}`); if (r.ok) setProject(await r.json()); } catch { }
  };

  // Metric card helper
  const MetricCard = ({ label, value, change, pos = true, icon: Icon, color }) => (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
      <div>
        <span className="text-xs text-slate-400  block mb-1">{label}</span>
        <strong className="text-xl font-black text-slate-900 block">{value}</strong>
        <span className={`text-xs  flex items-center gap-0.5 mt-1 ${pos ? 'text-emerald-500' : 'text-rose-500'}`}>
          {pos ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} {change} vs last 7 days
        </span>
        {/* Mini sparkline */}
        <div className="mt-1 h-6 w-24">
          <ResponsiveContainer width="100%" height={24}>
            <AreaChart data={ORGANIC_DATA}>
              <Area type="monotone" dataKey="users" stroke={color} fill={`${color}20`} strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
        <Icon size={18} style={{ color }} />
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen font-sans pb-10">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Google G logo */}
          <div className="w-9 h-9 rounded border border-slate-200 flex items-center justify-center bg-white  flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          </div>
          <div>
            <h1 className="text-base  text-slate-900 m-0 leading-none">Google Integrations {project ? `for ${project.name}` : ''}</h1>
            <p className="text-xs text-slate-400 m-0 mt-0.5">Connect and monitor all your Google tools and data in one place.</p>
          </div>
          <SeoGmbProjectSelector onProjectChange={loadProject} />
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer">
            <Calendar size={13} /> May 8 – May 15, 2026
          </button>
          <button className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer">
            <Download size={13} /> Export Report
          </button>
          <button className="bg-blue-500 hover:bg-blue-600 border-none text-white rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer transition-colors">
            <Plus size={14} /> Add Integration
          </button>
        </div>
      </div>

      <div className="px-6 py-4">

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 bg-white p-1 rounded border border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
          {TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 py-2.5 px-3 rounded text-xs  cursor-pointer border-none outline-none transition-all shrink-0 ${activeTab === id ? 'bg-blue-50 text-blue-600 ' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              <Icon size={12} /> {id}
            </button>
          ))}
        </div>

        {/* ═══════════════════ OVERVIEW ═══════════════════ */}
        {activeTab === 'Overview' && (
          <div className="flex flex-col gap-2">

            {/* Integration Status Cards */}
            <div className="grid grid-cols-5 gap-4">
              {INTEGRATION_STATUS.map((intg) => (
                <div key={intg.name} className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded flex items-center justify-center text-base" style={{ backgroundColor: `${intg.color}15` }}>
                      <span>{intg.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs  text-slate-800 m-0 leading-tight">{intg.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs  text-emerald-600">{intg.status}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 m-0">Last synced: {intg.synced}</p>
                  <button onClick={() => setActiveTab(intg.name === 'Google Business Profile' ? 'Business Insights' : intg.name === 'Conversion Tracking' ? 'Conversion Tracking' : intg.name === 'Google Analytics (GA4)' ? 'Google Analytics (GA4)' : intg.name === 'Google Tag Manager' ? 'Google Tag Manager' : 'Search Console')} className="mt-2 text-blue-500 text-[9px]  border-none bg-transparent cursor-pointer hover:underline p-0">View Details →</button>
                </div>
              ))}
            </div>

            {/* 6 KPI Cards */}
            <div className="grid grid-cols-6 gap-4">
              <MetricCard label="Total Users" value="24,562" change="+18.5%" icon={Users} color="#3B82F6" />
              <MetricCard label="Sessions" value="32,195" change="+14.2%" icon={Activity} color="#10B981" />
              <MetricCard label="Impressions" value="248,146" change="+22.6%" icon={Eye} color="#8B5CF6" />
              <MetricCard label="Clicks" value="12,842" change="+16.3%" icon={MousePointerClick} color="#F59E0B" />
              <MetricCard label="Conversions" value="1,296" change="+24.6%" icon={Target} color="#EF4444" />
              <MetricCard label="Conversion Rate" value="4.02%" change="+8.7%" icon={TrendingUp} color="#06B6D4" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-3 gap-2">
              {/* Search Performance */}
              <div className="col-span-1 bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm  text-slate-900 m-0">Search Performance</h3>
                    <p className="text-xs text-slate-400 m-0">Google Search Console</p>
                  </div>
                  <span className="text-xs border border-slate-200 rounded px-2 py-0.5 text-slate-400 ">Last 7 Days ▾</span>
                </div>
                <div className="flex gap-3 mb-2 text-xs  text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> Clicks</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-500 inline-block" /> Impressions</span>
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={SEARCH_PERF_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 8, fill: '#94A3B8' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="clicks" stroke="#3B82F6" strokeWidth={2} dot={false} name="Clicks" />
                    <Line type="monotone" dataKey="impressions" stroke="#8B5CF6" strokeWidth={2} dot={false} name="Impressions" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-4 gap-2 mt-2 border-t border-slate-100 pt-2">
                  {[{ l: 'Total Clicks', v: '12,842' }, { l: 'Impressions', v: '248,146' }, { l: 'Avg CTR', v: '5.18%' }, { l: 'Avg Position', v: '18.7' }].map(s => (
                    <div key={s.l} className="text-center">
                      <strong className="text-xs font-black text-slate-900 block">{s.v}</strong>
                      <span className="text-[8px] text-slate-400 ">{s.l}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Organic Traffic */}
              <div className="col-span-1 bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm  text-slate-900 m-0">Organic Traffic</h3>
                    <p className="text-xs text-slate-400 m-0">GA4</p>
                  </div>
                  <span className="text-xs border border-slate-200 rounded px-2 py-0.5 text-slate-400 ">Last 7 Days ▾</span>
                </div>
                <div className="flex gap-3 mb-2 text-xs  text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> Users</span>
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={ORGANIC_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 8, fill: '#94A3B8' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="users" stroke="#3B82F6" fill="#DBEAFE" strokeWidth={2} name="Users" />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-4 gap-2 mt-2 border-t border-slate-100 pt-2">
                  {[{ l: 'Users', v: '24,562' }, { l: 'Sessions', v: '32,195' }, { l: 'Engaged', v: '21,234' }, { l: 'Eng. Rate', v: '65.9%' }].map(s => (
                    <div key={s.l} className="text-center">
                      <strong className="text-xs font-black text-slate-900 block">{s.v}</strong>
                      <span className="text-[8px] text-slate-400 ">{s.l}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Landing Pages */}
              <div className="col-span-1 bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm  text-slate-900 m-0">Top Landing Pages</h3>
                  <button onClick={() => setActiveTab('Landing Pages')} className="text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline">View All Pages →</button>
                </div>
                <table className="w-full text-xs text-slate-700">
                  <thead><tr className="text-[9px] text-slate-400   border-b border-slate-100"><th className="pb-1.5 text-left">Page</th><th className="pb-1.5 text-right">Users</th><th className="pb-1.5 text-right">Sessions</th><th className="pb-1.5 text-right">Bounce</th></tr></thead>
                  <tbody>
                    {tableData['Landing Pages'].slice(0, 5).map(p => (
                      <tr key={p.id} className="border-b border-slate-50">
                        <td className="py-1.5 font-medium text-blue-600 truncate max-w-[100px]">{p.page}</td>
                        <td className="py-1.5 text-right  text-slate-800">{p.users}</td>
                        <td className="py-1.5 text-right text-slate-500">{p.sessions}</td>
                        <td className="py-1.5 text-right text-slate-500">{p.bounce}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* User Behavior + Goals + Conversions Funnel */}
            <div className="grid grid-cols-3 gap-2">
              {/* User Behavior donut */}
              <div className="bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex justify-between items-center mb-3">
                  <div><h3 className="text-sm  text-slate-900 m-0">User Behavior</h3><p className="text-xs text-slate-400 m-0">GA4</p></div>
                  <span className="text-xs border border-slate-200 rounded px-2 py-0.5 text-slate-400 ">Last 7 Days ▾</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie data={USER_BEHAVIOR} cx="50%" cy="50%" innerRadius={36} outerRadius={55} dataKey="value" paddingAngle={2}>
                          {USER_BEHAVIOR.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <strong className="text-sm font-black text-slate-900">24,562</strong>
                      <span className="text-[8px] text-slate-400">Total Users</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    {USER_BEHAVIOR.map((u) => (
                      <div key={u.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: u.color }} /><span className="text-slate-600">{u.name}</span></div>
                        <div className="text-right"><strong className="text-slate-800">{u.value.toLocaleString()}</strong><span className="text-slate-400 ml-1">({u.pct})</span></div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => setActiveTab('User Behavior')} className="w-full text-center text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline mt-3">View Behavior Report →</button>
              </div>

              {/* Goals & Events */}
              <div className="bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex justify-between items-center mb-3">
                  <div><h3 className="text-sm  text-slate-900 m-0">Goals & Events</h3><p className="text-xs text-slate-400 m-0">GA4</p></div>
                  <span className="text-xs border border-slate-200 rounded px-2 py-0.5 text-slate-400 ">Last 7 Days ▾</span>
                </div>
                <table className="w-full text-xs text-slate-700">
                  <thead><tr className="text-[9px] text-slate-400   border-b border-slate-100"><th className="pb-1.5 text-left">Event / Goal</th><th className="pb-1.5 text-right">Completions</th><th className="pb-1.5 text-right">Rate</th><th className="pb-1.5 text-right">Trend</th></tr></thead>
                  <tbody>
                    {tableData['Goals & Events'].map(g => (
                      <tr key={g.id} className="border-b border-slate-50">
                        <td className="py-1.5 font-medium text-slate-700">{g.event}</td>
                        <td className="py-1.5 text-right  text-slate-800">{g.completions}</td>
                        <td className="py-1.5 text-right text-slate-500">{g.rate}</td>
                        <td className="py-1.5 text-right">
                          <span className="text-emerald-500 text-[9px]">↑↑↗</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={() => setActiveTab('Goals & Events')} className="w-full text-center text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline mt-3">View Goals Report →</button>
              </div>

              {/* Conversions Funnel */}
              <div className="bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm  text-slate-900 m-0">Conversions Overview</h3>
                  <span className="text-xs border border-slate-200 rounded px-2 py-0.5 text-slate-400 ">Last 7 Days ▾</span>
                </div>
                {/* Funnel visualization */}
                <div className="flex flex-col gap-1.5 mb-3">
                  {FUNNEL_DATA.map((item, i) => {
                    const maxVal = FUNNEL_DATA[0].value;
                    const pct = Math.round((item.value / maxVal) * 100);
                    const pctOfTotal = ((item.value / maxVal) * 100).toFixed(1);
                    return (
                      <div key={item.name}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs  text-slate-600">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <strong className="text-xs font-black text-slate-800">{item.value.toLocaleString()}</strong>
                            <span className="text-[9px] text-slate-400">({pctOfTotal}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3">
                          <div className="h-3 rounded-full" style={{ width: `${pct}%`, backgroundColor: item.fill }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setActiveTab('Conversion Tracking')} className="w-full text-center text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline">View Conversions Report →</button>
              </div>
            </div>

            {/* Integration Status Footer */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm  text-slate-900 m-0">Integration Status</h3>
                <button className="text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline">Manage Integrations →</button>
              </div>
              <div className="flex items-center gap-6 mt-3">
                {INTEGRATION_STATUS.map((intg) => (
                  <div key={intg.name} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded flex items-center justify-center text-sm" style={{ backgroundColor: `${intg.color}15` }}>{intg.icon}</div>
                    <div>
                      <p className="text-[9px]  text-slate-700 m-0">{intg.name.split(' ')[0]} {intg.name.split(' ')[1] || ''}</p>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[9px] text-emerald-600 ">{intg.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ═══════════════════ SEARCH CONSOLE ═══════════════════ */}
        {activeTab === 'Search Console' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-4">
              {[{ l: 'Total Clicks', v: '12,842', c: '+16.3%' }, { l: 'Impressions', v: '248,146', c: '+22.6%' }, { l: 'Average CTR', v: '5.18%', c: '+0.8%' }, { l: 'Average Position', v: '18.7', c: '+2.1' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200">
                  <span className="text-xs text-slate-400  block">{s.l}</span>
                  <strong className="text-2xl font-black text-slate-900 block mt-1">{s.v}</strong>
                  <span className="text-xs text-emerald-500  flex items-center gap-0.5 mt-1"><ArrowUpRight size={10} /> {s.c} vs last 30 days</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-2 mb-1">
              <h3 className="text-sm  text-slate-900 m-0 mb-3">Clicks & Impressions Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={SEARCH_PERF_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="clicks" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Clicks" />
                  <Line type="monotone" dataKey="impressions" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} name="Impressions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <CrudTable title="Search Console — Top Queries" columns={searchConsoleCols} data={tableData['Search Console']} onAdd={makeAdd('Search Console')} onEdit={makeEdit('Search Console')} onDelete={makeDel('Search Console')} />
          </div>
        )}

        {/* ═══════════════════ GOOGLE ANALYTICS GA4 ═══════════════════ */}
        {activeTab === 'Google Analytics (GA4)' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-4">
              {[{ l: 'Total Users', v: '24,562', c: '+18.5%' }, { l: 'Sessions', v: '32,195', c: '+14.2%' }, { l: 'Engaged Sessions', v: '21,234', c: '+16.3%' }, { l: 'Engagement Rate', v: '65.9%', c: '+6.3%' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200">
                  <span className="text-xs text-slate-400  block">{s.l}</span>
                  <strong className="text-2xl font-black text-slate-900 block mt-1">{s.v}</strong>
                  <span className="text-xs text-emerald-500  flex items-center gap-0.5 mt-1"><ArrowUpRight size={10} /> {s.c} vs last 7 days</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-2">
              <h3 className="text-sm  text-slate-900 m-0 mb-3">User & Session Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={ORGANIC_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="users" stroke="#3B82F6" fill="#DBEAFE" strokeWidth={2} name="Users" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <CrudTable title="Google Analytics (GA4) — Key Metrics" columns={ga4Cols} data={tableData['Google Analytics (GA4)']} onAdd={makeAdd('Google Analytics (GA4)')} onEdit={makeEdit('Google Analytics (GA4)')} onDelete={makeDel('Google Analytics (GA4)')} />
          </div>
        )}

        {/* ═══════════════════ BUSINESS INSIGHTS ═══════════════════ */}
        {activeTab === 'Business Insights' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-5 gap-4">
              {[{ l: 'Profile Views', v: '24,562', c: '+18.6%' }, { l: 'Search Views', v: '15,263', c: '+21.4%' }, { l: 'Map Views', v: '9,299', c: '+16.2%' }, { l: 'Website Clicks', v: '2,396', c: '+22.8%' }, { l: 'Direction Requests', v: '933', c: '+16.3%' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200">
                  <span className="text-xs text-slate-400  block">{s.l}</span>
                  <strong className="text-xl font-black text-slate-900 block mt-1">{s.v}</strong>
                  <span className="text-xs text-emerald-500  flex items-center gap-0.5 mt-1"><ArrowUpRight size={10} /> {s.c} vs last 30 days</span>
                </div>
              ))}
            </div>
            <CrudTable title="Google Business Profile Insights" columns={businessInsightsCols} data={tableData['Business Insights']} onAdd={makeAdd('Business Insights')} onEdit={makeEdit('Business Insights')} onDelete={makeDel('Business Insights')} />
          </div>
        )}

        {/* ═══════════════════ GOOGLE TAG MANAGER ═══════════════════ */}
        {activeTab === 'Google Tag Manager' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-4">
              {[{ l: 'Total Tags', v: '24', c: 'Active' }, { l: 'Active Tags', v: '20', c: 'Published' }, { l: 'Paused Tags', v: '3', c: 'Review' }, { l: 'Triggers', v: '18', c: 'Configured' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200">
                  <span className="text-xs text-slate-400  block">{s.l}</span>
                  <strong className="text-2xl font-black text-slate-900 block mt-1">{s.v}</strong>
                  <span className="text-xs text-blue-500  mt-1 block">{s.c}</span>
                </div>
              ))}
            </div>
            <CrudTable title="Google Tag Manager — Tags" columns={tagManagerCols} data={tableData['Google Tag Manager']} onAdd={makeAdd('Google Tag Manager')} onEdit={makeEdit('Google Tag Manager')} onDelete={makeDel('Google Tag Manager')} />
          </div>
        )}

        {/* ═══════════════════ CONVERSION TRACKING ═══════════════════ */}
        {activeTab === 'Conversion Tracking' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-4">
              {[{ l: 'Total Conversions', v: '1,306', c: '+24.6%' }, { l: 'Conversion Rate', v: '4.02%', c: '+8.7%' }, { l: 'Total Value', v: '$58,350', c: '+31.2%' }, { l: 'Avg. Conv. Value', v: '$44.68', c: '+5.9%' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200">
                  <span className="text-xs text-slate-400  block">{s.l}</span>
                  <strong className="text-2xl font-black text-slate-900 block mt-1">{s.v}</strong>
                  <span className="text-xs text-emerald-500  flex items-center gap-0.5 mt-1"><ArrowUpRight size={10} /> {s.c} vs last 7 days</span>
                </div>
              ))}
            </div>
            <CrudTable title="Conversion Tracking" columns={conversionCols} data={tableData['Conversion Tracking']} onAdd={makeAdd('Conversion Tracking')} onEdit={makeEdit('Conversion Tracking')} onDelete={makeDel('Conversion Tracking')} />
          </div>
        )}

        {/* ═══════════════════ SEARCH PERFORMANCE ═══════════════════ */}
        {activeTab === 'Search Performance' && (
          <div className="flex flex-col gap-2">
            <div className="bg-white rounded-2xl border border-slate-200 p-2">
              <h3 className="text-sm  text-slate-900 m-0 mb-3">Clicks & Impressions</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={SEARCH_PERF_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="clicks" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Clicks" />
                  <Line type="monotone" dataKey="impressions" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} name="Impressions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <CrudTable title="Search Performance — Top Queries" columns={searchPerfCols} data={tableData['Search Performance']} onAdd={makeAdd('Search Performance')} onEdit={makeEdit('Search Performance')} onDelete={makeDel('Search Performance')} />
          </div>
        )}

        {/* ═══════════════════ ORGANIC TRAFFIC ═══════════════════ */}
        {activeTab === 'Organic Traffic' && (
          <div className="flex flex-col gap-2">
            <div className="bg-white rounded-2xl border border-slate-200 p-2">
              <h3 className="text-sm  text-slate-900 m-0 mb-3">Organic User Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={ORGANIC_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="users" stroke="#10B981" fill="#D1FAE5" strokeWidth={2} name="Organic Users" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <CrudTable title="Organic Traffic — Sources" columns={organicCols} data={tableData['Organic Traffic']} onAdd={makeAdd('Organic Traffic')} onEdit={makeEdit('Organic Traffic')} onDelete={makeDel('Organic Traffic')} />
          </div>
        )}

        {/* ═══════════════════ LANDING PAGES ═══════════════════ */}
        {activeTab === 'Landing Pages' && (
          <CrudTable title="Landing Pages" columns={landingPageCols} data={tableData['Landing Pages']} onAdd={makeAdd('Landing Pages')} onEdit={makeEdit('Landing Pages')} onDelete={makeDel('Landing Pages')} />
        )}

        {/* ═══════════════════ USER BEHAVIOR ═══════════════════ */}
        {activeTab === 'User Behavior' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-2xl border border-slate-200 p-2">
                <h3 className="text-sm  text-slate-900 m-0 mb-3">User Distribution</h3>
                <div className="flex items-center gap-6">
                  <div className="relative flex-shrink-0">
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie data={USER_BEHAVIOR} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" paddingAngle={2}>
                          {USER_BEHAVIOR.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <strong className="text-sm font-black text-slate-900">24,562</strong>
                      <span className="text-[8px] text-slate-400">Total Users</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {USER_BEHAVIOR.map(u => (
                      <div key={u.name} className="flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.color }} /><span className="text-slate-600">{u.name}</span></div>
                        <div className="text-right"><strong className="text-slate-800">{u.value.toLocaleString()}</strong><span className="text-slate-400 ml-1">({u.pct})</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-2">
                <h3 className="text-sm  text-slate-900 m-0 mb-3">User Trend</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={ORGANIC_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="users" stroke="#8B5CF6" fill="#EDE9FE" strokeWidth={2} name="Users" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <CrudTable title="User Behavior" columns={userBehaviorCols} data={tableData['User Behavior']} onAdd={makeAdd('User Behavior')} onEdit={makeEdit('User Behavior')} onDelete={makeDel('User Behavior')} />
          </div>
        )}

        {/* ═══════════════════ GOALS & EVENTS ═══════════════════ */}
        {activeTab === 'Goals & Events' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-4">
              {[{ l: 'Total Events', v: '1,306', c: '+24.6%' }, { l: 'Unique Completions', v: '1,258', c: '+22.1%' }, { l: 'Total Value', v: '$58,350', c: '+31.2%' }, { l: 'Top Conversion', v: 'Form Submit', c: '482 completions' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200">
                  <span className="text-xs text-slate-400  block">{s.l}</span>
                  <strong className="text-xl font-black text-slate-900 block mt-1">{s.v}</strong>
                  <span className="text-xs text-emerald-500  mt-1 block">{s.c}</span>
                </div>
              ))}
            </div>
            <CrudTable title="Goals & Events" columns={goalsCols} data={tableData['Goals & Events']} onAdd={makeAdd('Goals & Events')} onEdit={makeEdit('Goals & Events')} onDelete={makeDel('Goals & Events')} />
          </div>
        )}

      </div>
    </div>
  );
}

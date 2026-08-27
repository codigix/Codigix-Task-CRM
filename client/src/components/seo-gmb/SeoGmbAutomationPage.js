import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Plus, Calendar, Download, Search, Filter, Settings, Bell, Play, Pause,
  Edit3, Trash2, ArrowUpRight, Clock, CheckCircle, AlertCircle, Zap, Mail,
  Link2, Star, FileText, BarChart2, RefreshCw, Activity, Toggle, ChevronDown,
  Shield, Target, TrendingDown,
} from 'lucide-react';
import SeoGmbProjectSelector from './SeoGmbProjectSelector';
import CrudTable from '../common/CrudTable';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


// ── Chart / Status Data ───────────────────────────────────────────────────
const ACTIVITY_TREND = [];

const AUTOMATION_STATUS = [];

// ── Category Config ───────────────────────────────────────────────────────
const CATEGORIES = [];

const UPCOMING = [];

const RECENT_ACTIVITY = [];

// ── Column Definitions ─────────────────────────────────────────────────────
const automationCols = [
  { header: 'Automation Name', accessor: 'name' },
  { header: 'Category', accessor: 'category' },
  { header: 'Frequency', accessor: 'frequency' },
  { header: 'Last Run', accessor: 'lastRun' },
  { header: 'Next Run', accessor: 'nextRun' },
  { header: 'Status', accessor: 'status' },
];
const scheduledAuditCols = [
  { header: 'Audit Name', accessor: 'name' },
  { header: 'Site', accessor: 'site' },
  { header: 'Frequency', accessor: 'frequency' },
  { header: 'Last Run', accessor: 'lastRun' },
  { header: 'Next Run', accessor: 'nextRun' },
  { header: 'Status', accessor: 'status' },
];
const scheduledReportCols = [
  { header: 'Report Name', accessor: 'name' },
  { header: 'Client', accessor: 'client' },
  { header: 'Frequency', accessor: 'frequency' },
  { header: 'Recipients', accessor: 'recipients' },
  { header: 'Next Send', accessor: 'nextSend' },
  { header: 'Status', accessor: 'status' },
];
const keywordAlertCols = [
  { header: 'Alert Name', accessor: 'name' },
  { header: 'Keyword', accessor: 'keyword' },
  { header: 'Threshold', accessor: 'threshold' },
  { header: 'Last Triggered', accessor: 'lastTrigger' },
  { header: 'Status', accessor: 'status' },
];
const rankingAlertCols = [
  { header: 'Alert Name', accessor: 'name' },
  { header: 'Keyword', accessor: 'keyword' },
  { header: 'Position Drop', accessor: 'drop' },
  { header: 'Last Triggered', accessor: 'lastTrigger' },
  { header: 'Status', accessor: 'status' },
];
const brokenLinkCols = [
  { header: 'Alert Name', accessor: 'name' },
  { header: 'Site URL', accessor: 'site' },
  { header: 'Scan Frequency', accessor: 'frequency' },
  { header: 'Last Scan', accessor: 'lastScan' },
  { header: 'Links Found', accessor: 'links' },
  { header: 'Status', accessor: 'status' },
];
const reviewAlertCols = [
  { header: 'Alert Name', accessor: 'name' },
  { header: 'Platform', accessor: 'platform' },
  { header: 'Trigger', accessor: 'trigger' },
  { header: 'Last Triggered', accessor: 'lastTrigger' },
  { header: 'Status', accessor: 'status' },
];
const contentWorkflowCols = [
  { header: 'Workflow Name', accessor: 'name' },
  { header: 'Type', accessor: 'type' },
  { header: 'Trigger', accessor: 'trigger' },
  { header: 'Assignee', accessor: 'assignee' },
  { header: 'Status', accessor: 'status' },
];
const emailNotifCols = [
  { header: 'Notification Name', accessor: 'name' },
  { header: 'Event', accessor: 'event' },
  { header: 'Recipients', accessor: 'recipients' },
  { header: 'Last Sent', accessor: 'lastSent' },
  { header: 'Status', accessor: 'status' },
];

// ── Initial Data ───────────────────────────────────────────────────────────
const INIT = {
  automations: [
    { id: 1, name: 'Daily Technical SEO Audit', category: 'Scheduled Audits', frequency: 'Daily', lastRun: 'May 15, 2026 02:00 AM', nextRun: 'May 16, 2026 02:00 AM', status: 'Active' },
    { id: 2, name: 'Weekly SEO Performance Report', category: 'Scheduled Reports', frequency: 'Weekly', lastRun: 'May 15, 2026 09:02 AM', nextRun: 'May 22, 2026 09:00 AM', status: 'Active' },
    { id: 3, name: 'Keyword Ranking Alert', category: 'Keyword Alerts', frequency: 'Daily', lastRun: 'May 15, 2026 12:15 PM', nextRun: 'May 16, 2026 12:00 PM', status: 'Active' },
    { id: 4, name: 'Broken Link Monitoring', category: 'Broken Link Alerts', frequency: 'Daily', lastRun: 'May 15, 2026 01:30 PM', nextRun: 'May 16, 2026 01:00 PM', status: 'Active' },
    { id: 5, name: 'Monthly SEO Report', category: 'Scheduled Reports', frequency: 'Monthly', lastRun: 'May 1, 2026 09:00 AM', nextRun: 'Jun 1, 2026 09:00 AM', status: 'Active' },
  ],
  scheduledAudits: [
    { id: 1, name: 'Daily Technical SEO Audit', site: 'abc digital solutions', frequency: 'Daily', lastRun: 'May 15, 2026 02:00 AM', nextRun: 'May 16, 2026 02:00 AM', status: 'Active' },
    { id: 2, name: 'Weekly Full Site Audit', site: 'Growth Marketing Co.', frequency: 'Weekly', lastRun: 'May 12, 2026 01:00 AM', nextRun: 'May 19, 2026 01:00 AM', status: 'Active' },
    { id: 3, name: 'Monthly Deep Audit', site: 'Tech Solutions Inc.', frequency: 'Monthly', lastRun: 'May 1, 2026 02:00 AM', nextRun: 'Jun 1, 2026 02:00 AM', status: 'Paused' },
  ],
  scheduledReports: [
    { id: 1, name: 'Weekly SEO Performance Report', client: 'Growth Marketing Co.', frequency: 'Weekly', recipients: '3 contacts', nextSend: 'May 22, 2026 09:00 AM', status: 'Active' },
    { id: 2, name: 'Monthly SEO Report', client: 'Tech Solutions Inc.', frequency: 'Monthly', recipients: '2 contacts', nextSend: 'Jun 1, 2026 09:00 AM', status: 'Active' },
    { id: 3, name: 'Bi-weekly Ranking Report', client: 'Web Innovators', frequency: 'Bi-weekly', recipients: '4 contacts', nextSend: 'May 20, 2026 09:00 AM', status: 'Active' },
    { id: 4, name: 'Weekly GMB Report', client: 'Digital Boosters', frequency: 'Weekly', recipients: '2 contacts', nextSend: 'May 22, 2026 10:00 AM', status: 'Paused' },
    { id: 5, name: 'Monthly Analytics Report', client: 'ABC Digital Solutions', frequency: 'Monthly', recipients: '5 contacts', nextSend: 'Jun 1, 2026 10:00 AM', status: 'Active' },
  ],
  keywordAlerts: [
    { id: 1, name: 'Top Keyword Drop Alert', keyword: 'digital marketing agency', threshold: 'Drop > 3 positions', lastTrigger: 'May 12, 2026', status: 'Active' },
    { id: 2, name: 'SEO Keyword Alert', keyword: 'seo services near me', threshold: 'Drop > 5 positions', lastTrigger: 'May 10, 2026', status: 'Active' },
    { id: 3, name: 'Content Keyword Monitor', keyword: 'content marketing strategy', threshold: 'Drop > 3 positions', lastTrigger: 'May 8, 2026', status: 'Active' },
    { id: 4, name: 'GMB Keyword Alert', keyword: 'google business profile', threshold: 'Drop > 2 positions', lastTrigger: 'Never', status: 'Active' },
    { id: 5, name: 'Local Keyword Tracker', keyword: 'local seo services', threshold: 'Drop > 5 positions', lastTrigger: 'May 14, 2026', status: 'Active' },
    { id: 6, name: 'Brand Keyword Monitor', keyword: 'abc digital solutions', threshold: 'Drop > 1 position', lastTrigger: 'Never', status: 'Active' },
  ],
  rankingAlerts: [
    { id: 1, name: 'Top 10 Exit Alert', keyword: 'digital marketing agency', drop: 'Exit Top 10', lastTrigger: 'May 13, 2026', status: 'Active' },
    { id: 2, name: 'Top 3 Drop Alert', keyword: 'seo services', drop: 'Exit Top 3', lastTrigger: 'May 11, 2026', status: 'Active' },
    { id: 3, name: 'Position 1 Loss Alert', keyword: 'content marketing', drop: 'Lose #1 spot', lastTrigger: 'Never', status: 'Active' },
    { id: 4, name: 'Mobile Ranking Alert', keyword: 'local seo near me', drop: 'Drop > 5', lastTrigger: 'May 9, 2026', status: 'Paused' },
    { id: 5, name: 'Competitor Overtake Alert', keyword: 'digital agency nyc', drop: 'Overtaken', lastTrigger: 'May 14, 2026', status: 'Active' },
    { id: 6, name: 'Page 2 Alert', keyword: 'seo audit service', drop: 'Enter Page 2', lastTrigger: 'May 7, 2026', status: 'Active' },
  ],
  brokenLinks: [
    { id: 1, name: 'Daily Broken Link Scan', site: 'abcdigitalsolutions.com', frequency: 'Daily', lastScan: 'May 15, 2026 01:30 PM', links: '12', status: 'Active' },
    { id: 2, name: 'Weekly Full Site Link Check', site: 'growthmarketing.co', frequency: 'Weekly', lastScan: 'May 12, 2026 02:00 AM', links: '3', status: 'Active' },
  ],
  reviewAlerts: [
    { id: 1, name: 'New Review Alert', platform: 'Google Business', trigger: 'Any new review', lastTrigger: 'May 15, 2026 04:00 PM', status: 'Active' },
    { id: 2, name: 'Low Rating Alert', platform: 'Google Business', trigger: 'Rating ≤ 3 stars', lastTrigger: 'May 10, 2026 02:15 PM', status: 'Active' },
  ],
  contentWorkflow: [
    { id: 1, name: 'Blog Post Approval', type: 'Approval', trigger: 'New blog draft submitted', assignee: 'Editorial Team', status: 'Active' },
    { id: 2, name: 'Social Post Publisher', type: 'Publishing', trigger: 'Scheduled post time reached', assignee: 'Marketing Team', status: 'Active' },
    { id: 3, name: 'GMB Post Scheduler', type: 'Publishing', trigger: 'Monday 9:00 AM weekly', assignee: 'SEO Team', status: 'Paused' },
  ],
  emailNotifications: [
    { id: 1, name: 'Audit Complete Email', event: 'Audit finishes', recipients: '3 contacts', lastSent: 'May 15, 2026 02:05 AM', status: 'Active' },
    { id: 2, name: 'Report Ready Email', event: 'Report generated', recipients: '5 contacts', lastSent: 'May 15, 2026 09:02 AM', status: 'Active' },
    { id: 3, name: 'Alert Triggered Email', event: 'Any alert fires', recipients: '2 contacts', lastSent: 'May 15, 2026 12:16 PM', status: 'Active' },
    { id: 4, name: 'Weekly Summary Email', event: 'Every Monday 8:00 AM', recipients: '8 contacts', lastSent: 'May 12, 2026 08:00 AM', status: 'Active' },
    { id: 5, name: 'Broken Link Alert Email', event: 'Broken links found', recipients: '3 contacts', lastSent: 'May 15, 2026 01:30 PM', status: 'Active' },
  ],
};

// ── Tabs ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'Overview', icon: Activity },
  { id: 'Scheduled Audits', icon: Shield },
  { id: 'Scheduled Reports', icon: FileText },
  { id: 'Keyword Alerts', icon: Bell },
  { id: 'Ranking Alerts', icon: BarChart2 },
  { id: 'Broken Link Alerts', icon: Link2 },
  { id: 'Review Alerts', icon: Star },
  { id: 'Content Workflow', icon: Zap },
  { id: 'Email Notifications', icon: Mail },
];

// ── Status Badge ───────────────────────────────────────────────────────────
const sBadge = (s) => {
  const m = { Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200', Scheduled: 'bg-blue-50 text-blue-700 border border-blue-200', Paused: 'bg-amber-50 text-amber-700 border border-amber-200', Failed: 'bg-rose-50 text-rose-600 border border-rose-200' };
  return <span className={`text-xs  px-2.5 py-0.5 rounded-full ${m[s] || 'bg-slate-100 text-slate-500'}`}>{s}</span>;
};

const getCatBadge = (cat) => {
  const c = CATEGORIES.find(x => x.id === cat);
  return c ? <span className={`text-[9px]  px-2 py-0.5 rounded-full ${c.badge}`}>{cat}</span> : <span className="text-[9px] text-slate-500">{cat}</span>;
};

// ═══════════════════════════════════════════════════════════════════════════
export default function SeoGmbAutomationPage() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [searchQ, setSearchQ] = useState('');
  const [catFilter, setCatFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [tableData, setTableData] = useState(INIT);
  const [project, setProject] = useState(null);

  const makeAdd = (k) => (item) => setTableData(prev => ({ ...prev, [k]: [...prev[k], { ...item, id: prev[k].length ? Math.max(...prev[k].map(i => i.id)) + 1 : 1 }] }));
  const makeEdit = (k) => (id, item) => setTableData(prev => ({ ...prev, [k]: prev[k].map(i => i.id === id ? { ...i, ...item } : i) }));
  const makeDel = (k) => (id) => setTableData(prev => ({ ...prev, [k]: prev[k].filter(i => i.id !== id) }));

  const loadProject = async (p) => {
    try { const r = await fetch(`${API_BASE_URL}/projects/${p.id}`); if (r.ok) setProject(await r.json()); } catch { }
  };

  const filteredAll = useMemo(() => {
    let d = tableData.automations;
    if (searchQ) d = d.filter(a => a.name.toLowerCase().includes(searchQ.toLowerCase()) || a.category.toLowerCase().includes(searchQ.toLowerCase()));
    if (catFilter !== 'All Categories') d = d.filter(a => a.category === catFilter);
    if (statusFilter !== 'All Status') d = d.filter(a => a.status === statusFilter);
    return d;
  }, [tableData.automations, searchQ, catFilter, statusFilter]);

  const toggleStatus = (id) => setTableData(prev => ({ ...prev, automations: prev.automations.map(a => a.id === id ? { ...a, status: a.status === 'Active' ? 'Paused' : 'Active' } : a) }));

  return (
    <div className="bg-slate-50 min-h-screen font-sans pb-10">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-50 border border-purple-100 rounded flex items-center justify-center">
            <Zap size={16} className="text-purple-500" />
          </div>
          <div>
            <h1 className="text-base  text-slate-900 m-0 leading-none">Automation {project ? `for ${project.name}` : ''}</h1>
            <p className="text-xs text-slate-400 m-0 mt-0.5">Automate your SEO tasks, alerts, reports and notifications to save time and stay ahead.</p>
          </div>
          <SeoGmbProjectSelector onProjectChange={loadProject} />
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer">
            <Calendar size={13} /> May 8 – May 15, 2026
          </button>
          <button className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer">
            <Settings size={13} /> Automation Settings
          </button>
          <button
            onClick={() => makeAdd('automations')({ name: 'New Automation', category: 'Scheduled Audits', frequency: 'Daily', lastRun: 'Never', nextRun: 'Tomorrow 02:00 AM', status: 'Active' })}
            className="bg-purple-500 hover:bg-purple-600 border-none text-white rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus size={14} /> Create Automation
          </button>
        </div>
      </div>

      <div className="px-6 py-4">

        {/* ── Tab Bar ── */}
        <div className="flex gap-1 mb-5 bg-white p-1 rounded border border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
          {TABS.map(({ id, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 py-2.5 px-3 rounded text-xs  cursor-pointer border-none outline-none transition-all shrink-0 ${activeTab === id ? 'bg-purple-50 text-purple-600 ' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Icon size={12} /> {id}
            </button>
          ))}
        </div>

        {/* ═══════════════════ OVERVIEW ═══════════════════ */}
        {activeTab === 'Overview' && (
          <div className="flex flex-col gap-2">

            {/* KPI Cards */}
            <div className="grid grid-cols-6 gap-4">
              {[
                { label: 'Active Automations', val: '24', sub: '+20% vs last 7 days', icon: Zap, color: 'text-purple-500 bg-purple-50' },
                { label: 'Tasks Executed', val: '156', sub: '+18% vs last 7 days', icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50' },
                { label: 'Alerts Sent', val: '89', sub: '+12% vs last 7 days', icon: Bell, color: 'text-amber-500 bg-amber-50' },
                { label: 'Emails Sent', val: '124', sub: '+13% vs last 7 days', icon: Mail, color: 'text-blue-500 bg-blue-50' },
                { label: 'Time Saved', val: '36h 45m', sub: '+20% vs last 7 days', icon: Clock, color: 'text-indigo-500 bg-indigo-50' },
                { label: 'Success Rate', val: '98%', sub: '+3% vs last 7 days', icon: Target, color: 'text-teal-500 bg-teal-50' },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400  block mb-1">{c.label}</span>
                    <strong className="text-xl font-black text-slate-900 block">{c.val}</strong>
                    <span className="text-[9px] text-emerald-500  flex items-center gap-0.5 mt-1"><ArrowUpRight size={9} /> {c.sub}</span>
                  </div>
                  <div className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 ${c.color}`}><c.icon size={16} /></div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Automation Activity Chart */}
              <div className="col-span-1 bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm  text-slate-900 m-0">Automation Activity</h3>
                  <span className="text-xs border border-slate-200 rounded px-2 py-0.5 text-slate-400 ">Last 7 Days ▾</span>
                </div>
                <div className="flex gap-3 mb-2 text-xs  text-slate-500">
                  {[{ l: 'Tasks Executed', c: '#3B82F6' }, { l: 'Alerts Sent', c: '#F59E0B' }, { l: 'Emails Sent', c: '#8B5CF6' }].map(d => (
                    <span key={d.l} className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ backgroundColor: d.c }} />{d.l}</span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={ACTIVITY_TREND}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 8, fill: '#94A3B8' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="tasks" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2 }} name="Tasks Executed" />
                    <Line type="monotone" dataKey="alerts" stroke="#F59E0B" strokeWidth={2} dot={{ r: 2 }} name="Alerts Sent" />
                    <Line type="monotone" dataKey="emails" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 2 }} name="Emails Sent" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Automation Status donut */}
              <div className="col-span-1 bg-white rounded-2xl border border-slate-200 p-2">
                <h3 className="text-sm  text-slate-900 m-0 mb-3">Automation Status</h3>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <ResponsiveContainer width={130} height={130}>
                      <PieChart>
                        <Pie data={AUTOMATION_STATUS} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" paddingAngle={2}>
                          {AUTOMATION_STATUS.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <strong className="text-base font-black text-slate-900">24</strong>
                      <span className="text-[8px] text-slate-400">Automations</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    {AUTOMATION_STATUS.map(s => (
                      <div key={s.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} /><span className="text-slate-600">{s.name}</span></div>
                        <div><strong className="text-slate-800">{s.value}</strong><span className="text-slate-400 ml-1">({s.pct})</span></div>
                      </div>
                    ))}
                    <button onClick={() => setActiveTab('Scheduled Audits')} className="text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline mt-1 text-left p-0">View All Automations →</button>
                  </div>
                </div>
              </div>

              {/* Upcoming Automations */}
              <div className="col-span-1 bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm  text-slate-900 m-0">Upcoming Automations</h3>
                </div>
                <div className="flex flex-col gap-2">
                  {UPCOMING.map((u, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: `${u.color}15` }}>
                          <Zap size={10} style={{ color: u.color }} />
                        </div>
                        <div>
                          <p className="text-xs  text-slate-800 m-0 leading-tight">{u.name}</p>
                          <p className="text-[9px] text-slate-400 m-0">{u.client}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-[9px]  text-slate-600 m-0">{u.when}</p>
                        <p className="text-[9px] text-slate-400 m-0">{u.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full text-center text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline mt-2">View All Scheduled →</button>
              </div>
            </div>

            {/* Automation Categories */}
            <div className="bg-white rounded-2xl border border-slate-200 p-2">
              <h3 className="text-sm  text-slate-900 m-0 mb-4">Automation Categories</h3>
              <div className="grid grid-cols-4 gap-4">
                {CATEGORIES.map(cat => (
                  <div key={cat.id} className="border border-slate-200 rounded p-4 hover: transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 ${cat.bg} rounded flex items-center justify-center`}><cat.icon size={15} style={{ color: cat.color }} /></div>
                      <div>
                        <p className="text-xs  text-slate-800 m-0 leading-tight">{cat.label}</p>
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-400 m-0 mb-2 leading-relaxed">{cat.desc}</p>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-[9px] text-slate-500 ">{cat.active} Active</span></div>
                      <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /><span className="text-[9px] text-slate-500 ">{cat.paused} Paused</span></div>
                    </div>
                    <button onClick={() => setActiveTab(cat.id)} className="text-blue-500 text-[9px]  border-none bg-transparent cursor-pointer p-0 hover:underline">Manage →</button>
                  </div>
                ))}
              </div>
            </div>

            {/* All Automations Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm  text-slate-900 m-0">All Automations</h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search automations..."
                      className="border border-slate-200 rounded pl-7 pr-3 py-1.5 text-xs text-slate-700 focus:border-purple-400 outline-none w-48" />
                  </div>
                  <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 outline-none">
                    <option>All Categories</option>
                    {CATEGORIES.map(c => <option key={c.id}>{c.id}</option>)}
                  </select>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 outline-none">
                    {['All Status', 'Active', 'Paused', 'Scheduled', 'Failed'].map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={() => makeAdd('automations')({ name: 'New Automation', category: 'Scheduled Audits', frequency: 'Daily', lastRun: 'Never', nextRun: 'Tomorrow', status: 'Active' })}
                    className="bg-purple-500 hover:bg-purple-600 border-none text-white rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus size={13} /> Create Automation
                  </button>
                </div>
              </div>

              <table className="w-full text-xs text-slate-700">
                <thead>
                  <tr className="text-xs text-slate-400   border-b border-slate-200 bg-slate-50">
                    <th className="py-2 px-3 text-left">Automation Name</th>
                    <th className="py-2 px-3 text-left">Category</th>
                    <th className="py-2 px-3 text-left">Frequency</th>
                    <th className="py-2 px-3 text-left">Last Run</th>
                    <th className="py-2 px-3 text-left">Next Run</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAll.map(row => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-purple-50 rounded flex items-center justify-center flex-shrink-0"><Zap size={11} className="text-purple-500" /></div>
                          <div>
                            <p className=" text-slate-800 m-0">{row.name}</p>
                            <p className="text-[9px] text-slate-400 m-0">Client: {row.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">{getCatBadge(row.category)}</td>
                      <td className="py-2.5 px-3 text-slate-500">{row.frequency}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs">{row.lastRun}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs">{row.nextRun}</td>
                      <td className="py-2.5 px-3 text-center">{sBadge(row.status)}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => toggleStatus(row.id)} className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer border transition-colors ${row.status === 'Active' ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'}`} title={row.status === 'Active' ? 'Pause' : 'Resume'}>
                            {row.status === 'Active' ? <Pause size={10} className="text-amber-500" /> : <Play size={10} className="text-emerald-500" />}
                          </button>
                          <button className="w-6 h-6 bg-slate-50 hover:bg-blue-50 rounded flex items-center justify-center cursor-pointer border border-slate-200 hover:border-blue-200 transition-colors"><Edit3 size={10} className="text-slate-400" /></button>
                          <button onClick={() => makeDel('automations')(row.id)} className="w-6 h-6 bg-slate-50 hover:bg-rose-50 rounded flex items-center justify-center cursor-pointer border border-slate-200 hover:border-rose-200 transition-colors"><Trash2 size={10} className="text-slate-400" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAll.length === 0 && (
                    <tr><td colSpan={7} className="py-10 text-center text-slate-400 text-sm">No automations found</td></tr>
                  )}
                </tbody>
              </table>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-400 m-0">Showing 1 to {filteredAll.length} of 24 results</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(p => (
                      <button key={p} className={`w-7 h-7 rounded text-xs  border cursor-pointer ${p === 1 ? 'bg-purple-500 text-white border-purple-500' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>{p}</button>
                    ))}
                    <span className="text-slate-400 text-xs">…</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    5 / page
                    <ChevronDown size={10} />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Automation Activity */}
            <div className="bg-white rounded-2xl border border-slate-200 p-2">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm  text-slate-900 m-0">Recent Automation Activity</h3>
              </div>
              <div className="flex flex-col gap-2">
                {RECENT_ACTIVITY.map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${a.color}15` }}>
                        <a.icon size={13} style={{ color: a.color }} />
                      </div>
                      <div>
                        <p className="text-xs  text-slate-800 m-0">{a.name}</p>
                        <p className="text-[9px] text-slate-400 m-0">{a.detail}</p>
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 font-medium flex-shrink-0 ml-4">{a.time}</span>
                  </div>
                ))}
              </div>
              <button className="w-full text-center text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline mt-2">View All Activity →</button>
            </div>
          </div>
        )}

        {/* ═══ SCHEDULED AUDITS ═══ */}
        {activeTab === 'Scheduled Audits' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-4">
              {[{ l: 'Total Audits', v: '3', c: 'Active' }, { l: 'Paused', v: '1', c: 'Review needed' }, { l: 'Last Run', v: 'Today 02:00', c: 'Successful' }, { l: 'Success Rate', v: '100%', c: 'All passed' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200"><span className="text-xs text-slate-400  block">{s.l}</span><strong className="text-2xl font-black text-slate-900 block mt-1">{s.v}</strong><span className="text-xs text-emerald-500  mt-1 block">{s.c}</span></div>
              ))}
            </div>
            <CrudTable title="Scheduled Audits" columns={scheduledAuditCols} data={tableData.scheduledAudits} onAdd={makeAdd('scheduledAudits')} onEdit={makeEdit('scheduledAudits')} onDelete={makeDel('scheduledAudits')} />
          </div>
        )}

        {/* ═══ SCHEDULED REPORTS ═══ */}
        {activeTab === 'Scheduled Reports' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-4">
              {[{ l: 'Active Schedules', v: '4', c: 'Running' }, { l: 'Paused', v: '1', c: 'Review needed' }, { l: 'Reports Sent This Month', v: '18', c: '+22%' }, { l: 'Open Rate', v: '76%', c: '+8.2%' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200"><span className="text-xs text-slate-400  block">{s.l}</span><strong className="text-2xl font-black text-slate-900 block mt-1">{s.v}</strong><span className="text-xs text-emerald-500  mt-1 block">{s.c}</span></div>
              ))}
            </div>
            <CrudTable title="Scheduled Reports" columns={scheduledReportCols} data={tableData.scheduledReports} onAdd={makeAdd('scheduledReports')} onEdit={makeEdit('scheduledReports')} onDelete={makeDel('scheduledReports')} />
          </div>
        )}

        {/* ═══ KEYWORD ALERTS ═══ */}
        {activeTab === 'Keyword Alerts' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-4">
              {[{ l: 'Active Alerts', v: '6', c: 'Monitoring' }, { l: 'Triggered This Week', v: '3', c: 'Alerts fired' }, { l: 'Keywords Monitored', v: '6', c: 'Tracked' }, { l: 'Avg. Response Time', v: '< 5 min', c: 'Instant alerts' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200"><span className="text-xs text-slate-400  block">{s.l}</span><strong className="text-2xl font-black text-slate-900 block mt-1">{s.v}</strong><span className="text-xs text-emerald-500  mt-1 block">{s.c}</span></div>
              ))}
            </div>
            <CrudTable title="Keyword Alerts" columns={keywordAlertCols} data={tableData.keywordAlerts} onAdd={makeAdd('keywordAlerts')} onEdit={makeEdit('keywordAlerts')} onDelete={makeDel('keywordAlerts')} />
          </div>
        )}

        {/* ═══ RANKING ALERTS ═══ */}
        {activeTab === 'Ranking Alerts' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-4">
              {[{ l: 'Active Alerts', v: '5', c: 'Monitoring' }, { l: 'Paused', v: '1', c: 'Review' }, { l: 'Triggered This Week', v: '4', c: 'Alerts fired' }, { l: 'Keywords Tracked', v: '6', c: 'Active' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200"><span className="text-xs text-slate-400  block">{s.l}</span><strong className="text-2xl font-black text-slate-900 block mt-1">{s.v}</strong><span className="text-xs text-emerald-500  mt-1 block">{s.c}</span></div>
              ))}
            </div>
            <CrudTable title="Ranking Alerts" columns={rankingAlertCols} data={tableData.rankingAlerts} onAdd={makeAdd('rankingAlerts')} onEdit={makeEdit('rankingAlerts')} onDelete={makeDel('rankingAlerts')} />
          </div>
        )}

        {/* ═══ BROKEN LINK ALERTS ═══ */}
        {activeTab === 'Broken Link Alerts' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-4">
              {[{ l: 'Active Scans', v: '2', c: 'Running' }, { l: 'Broken Links Found', v: '15', c: 'Today' }, { l: 'Last Scan', v: '01:30 PM', c: 'Today' }, { l: 'Sites Monitored', v: '2', c: 'Active' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200"><span className="text-xs text-slate-400  block">{s.l}</span><strong className="text-2xl font-black text-slate-900 block mt-1">{s.v}</strong><span className="text-xs text-emerald-500  mt-1 block">{s.c}</span></div>
              ))}
            </div>
            <CrudTable title="Broken Link Alerts" columns={brokenLinkCols} data={tableData.brokenLinks} onAdd={makeAdd('brokenLinks')} onEdit={makeEdit('brokenLinks')} onDelete={makeDel('brokenLinks')} />
          </div>
        )}

        {/* ═══ REVIEW ALERTS ═══ */}
        {activeTab === 'Review Alerts' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-4">
              {[{ l: 'Active Alerts', v: '2', c: 'Monitoring' }, { l: 'Alerts Triggered', v: '8', c: 'This month' }, { l: 'Platforms', v: '1', c: 'Google' }, { l: 'Avg. Response', v: '< 2 hrs', c: 'Fast response' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200"><span className="text-xs text-slate-400  block">{s.l}</span><strong className="text-2xl font-black text-slate-900 block mt-1">{s.v}</strong><span className="text-xs text-emerald-500  mt-1 block">{s.c}</span></div>
              ))}
            </div>
            <CrudTable title="Review Alerts" columns={reviewAlertCols} data={tableData.reviewAlerts} onAdd={makeAdd('reviewAlerts')} onEdit={makeEdit('reviewAlerts')} onDelete={makeDel('reviewAlerts')} />
          </div>
        )}

        {/* ═══ CONTENT WORKFLOW ═══ */}
        {activeTab === 'Content Workflow' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-4">
              {[{ l: 'Active Workflows', v: '2', c: 'Running' }, { l: 'Paused', v: '1', c: 'Review needed' }, { l: 'Items Processed', v: '24', c: 'This month' }, { l: 'Pending Approvals', v: '3', c: 'Action required' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200"><span className="text-xs text-slate-400  block">{s.l}</span><strong className="text-2xl font-black text-slate-900 block mt-1">{s.v}</strong><span className="text-xs text-emerald-500  mt-1 block">{s.c}</span></div>
              ))}
            </div>
            <CrudTable title="Content Workflows" columns={contentWorkflowCols} data={tableData.contentWorkflow} onAdd={makeAdd('contentWorkflow')} onEdit={makeEdit('contentWorkflow')} onDelete={makeDel('contentWorkflow')} />
          </div>
        )}

        {/* ═══ EMAIL NOTIFICATIONS ═══ */}
        {activeTab === 'Email Notifications' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-4">
              {[{ l: 'Active Notifications', v: '5', c: 'Running' }, { l: 'Emails Sent Today', v: '18', c: '+12%' }, { l: 'Total Recipients', v: '21', c: 'Contacts' }, { l: 'Open Rate', v: '82%', c: 'Above average' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200"><span className="text-xs text-slate-400  block">{s.l}</span><strong className="text-2xl font-black text-slate-900 block mt-1">{s.v}</strong><span className="text-xs text-emerald-500  mt-1 block">{s.c}</span></div>
              ))}
            </div>
            <CrudTable title="Email Notifications" columns={emailNotifCols} data={tableData.emailNotifications} onAdd={makeAdd('emailNotifications')} onEdit={makeEdit('emailNotifications')} onDelete={makeDel('emailNotifications')} />
          </div>
        )}

      </div>
    </div>
  );
}

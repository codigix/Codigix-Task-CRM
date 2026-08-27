import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Plus, Calendar, Download, Link2, Globe, Mail, FileText, BookOpen, Share2,
  MessageSquare, User, BarChart2, ArrowUpRight, ArrowDownRight, TrendingUp,
  ExternalLink, Target, Zap, Shield, AlertTriangle, CheckCircle, Eye,
} from 'lucide-react';
import SeoGmbProjectSelector from './SeoGmbProjectSelector';
import CrudTable from '../common/CrudTable';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


// ── Static Chart Data ─────────────────────────────────────────────────────
const BACKLINK_TREND = [];

const BACKLINK_SOURCES = [];

const BACKLINK_HEALTH = [];

const TOP_ANCHORS = [];

// ── Column Definitions ────────────────────────────────────────────────────
const backlinkCols = [
  { header: 'Page Title & URL', accessor: 'title' },
  { header: 'Source URL', accessor: 'source' },
  { header: 'DA', accessor: 'da' },
  { header: 'PA', accessor: 'pa' },
  { header: 'Anchor Text', accessor: 'anchor' },
  { header: 'Type', accessor: 'type' },
  { header: 'Status', accessor: 'status' },
  { header: 'Date Found', accessor: 'date' },
];
const outreachCols = [
  { header: 'Website / Prospect', accessor: 'site' },
  { header: 'Contact Email', accessor: 'email' },
  { header: 'Status', accessor: 'status' },
  { header: 'Sent Date', accessor: 'sent' },
  { header: 'Follow-up', accessor: 'followup' },
];
const guestPostCols = [
  { header: 'Target Website', accessor: 'site' },
  { header: 'Topic Proposed', accessor: 'topic' },
  { header: 'Status', accessor: 'status' },
  { header: 'DA', accessor: 'da' },
  { header: 'Published Date', accessor: 'published' },
];
const digitalPrCols = [
  { header: 'Campaign Name', accessor: 'name' },
  { header: 'Publication', accessor: 'publication' },
  { header: 'Status', accessor: 'status' },
  { header: 'Mentions', accessor: 'mentions' },
  { header: 'Links Earned', accessor: 'links' },
];
const directoryCols = [
  { header: 'Directory Name', accessor: 'name' },
  { header: 'URL', accessor: 'url' },
  { header: 'Status', accessor: 'status' },
  { header: 'DA', accessor: 'da' },
  { header: 'Submitted Date', accessor: 'submitted' },
];
const bookmarkingCols = [
  { header: 'Platform', accessor: 'platform' },
  { header: 'Page Bookmarked', accessor: 'page' },
  { header: 'Status', accessor: 'status' },
  { header: 'Votes / Shares', accessor: 'votes' },
  { header: 'Date', accessor: 'date' },
];
const forumCols = [
  { header: 'Forum Name', accessor: 'forum' },
  { header: 'Thread / Post URL', accessor: 'url' },
  { header: 'Status', accessor: 'status' },
  { header: 'Replies', accessor: 'replies' },
  { header: 'Date', accessor: 'date' },
];
const profileCols = [
  { header: 'Platform', accessor: 'platform' },
  { header: 'Profile URL', accessor: 'url' },
  { header: 'Status', accessor: 'status' },
  { header: 'DA', accessor: 'da' },
  { header: 'Created Date', accessor: 'created' },
];
const competitorCols = [
  { header: 'Competitor Domain', accessor: 'domain' },
  { header: 'Total Backlinks', accessor: 'backlinks' },
  { header: 'Referring Domains', accessor: 'domains' },
  { header: 'DA', accessor: 'da' },
  { header: 'Unique Anchors', accessor: 'anchors' },
];

// ── Default Data ──────────────────────────────────────────────────────────
const initBacklinks = [];
const initOutreach = [];
const initGuestPosts = [];
const initDigitalPr = [];
const initDirectories = [];
const initBookmarks = [];
const initForums = [];
const initProfiles = [];
const initCompetitors = [];

// ── Tab List ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'Backlink Dashboard', icon: BarChart2 },
  { id: 'Backlink Management', icon: Link2 },
  { id: 'Link Outreach', icon: Mail },
  { id: 'Guest Posting', icon: FileText },
  { id: 'Digital PR', icon: Globe },
  { id: 'Directory Submission', icon: BookOpen },
  { id: 'Social Bookmarking', icon: Share2 },
  { id: 'Forum Submission', icon: MessageSquare },
  { id: 'Profile Creation', icon: User },
  { id: 'Competitor Backlinks', icon: Target },
];

// ── Status Badge ──────────────────────────────────────────────────────────
const statusBadge = (s) => {
  const map = {
    Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Created: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Converted: 'bg-blue-50 text-blue-700 border border-blue-200',
    'In Progress': 'bg-blue-50 text-blue-700 border border-blue-200',
    Sent: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    Replied: 'bg-purple-50 text-purple-700 border border-purple-200',
    Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    Rejected: 'bg-rose-50 text-rose-600 border border-rose-200',
  };
  return <span className={`text-xs  px-2.5 py-0.5 rounded-full ${map[s] || 'bg-slate-100 text-slate-500'}`}>{s}</span>;
};

// ═══════════════════════════════════════════════════════════════════════════
export default function SeoGmbOffPageSeoPage() {
  const [activeTab, setActiveTab] = useState('Backlink Dashboard');
  const [project, setProject] = useState(null);

  // CRUD state
  const [backlinks, setBacklinks] = useState(initBacklinks);
  const [outreach, setOutreach] = useState(initOutreach);
  const [guestPosts, setGuestPosts] = useState(initGuestPosts);
  const [digitalPr, setDigitalPr] = useState(initDigitalPr);
  const [directories, setDirectories] = useState(initDirectories);
  const [bookmarks, setBookmarks] = useState(initBookmarks);
  const [forums, setForums] = useState(initForums);
  const [profiles, setProfiles] = useState(initProfiles);
  const [competitors, setCompetitors] = useState(initCompetitors);

  // Generic CRUD factories
  const makeAdd = (s) => (item) => s((p) => [...p, { ...item, id: p.length ? Math.max(...p.map(i => i.id)) + 1 : 1 }]);
  const makeEdit = (s) => (id, item) => s((p) => p.map(i => i.id === id ? { ...i, ...item } : i));
  const makeDel = (s) => (id) => s((p) => p.filter(i => i.id !== id));

  const loadProject = async (proj) => {
    try { const r = await fetch(`${API_BASE_URL}/projects/${proj.id}`); if (r.ok) setProject(await r.json()); } catch { }
  };

  // Derived stats
  const totalBacklinks = backlinks.length + 12453;
  const totalDomains = directories.length + 2152;
  const newBacklinks = 842;
  const lostBacklinks = 213;
  const domainAuthority = 42;
  const spamScore = '5%';

  return (
    <div className="bg-slate-50 min-h-screen font-sans pb-10">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded flex items-center justify-center">
            <Link2 size={16} className="text-indigo-500" />
          </div>
          <div>
            <h1 className="text-lg  text-slate-900 m-0 leading-none">Off-Page SEO {project ? `for ${project.name}` : ''}</h1>
            <p className="text-xs text-slate-400 m-0 mt-0.5">Manage and monitor all your off-page SEO activities to build authority and improve rankings.</p>
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
            onClick={() => setActiveTab('Backlink Management')}
            className="bg-indigo-500 hover:bg-indigo-600 border-none text-white rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus size={14} /> Add New Campaign
          </button>
        </div>
      </div>

      <div className="px-6 py-4">

        {/* ── Tabs Nav ── */}
        <div className="flex gap-1 mb-5 bg-white p-1 rounded border border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
          {TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 py-2.5 px-3 rounded text-xs  cursor-pointer border-none outline-none transition-all shrink-0 ${activeTab === id ? 'bg-indigo-50 text-indigo-600 ' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              <Icon size={12} /> {id}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════
            Backlink Dashboard Tab (overview + charts)
        ═══════════════════════════════════════════════ */}
        {activeTab === 'Backlink Dashboard' && (
          <div className="flex flex-col gap-2">

            {/* Metric Cards */}
            <div className="grid grid-cols-6 gap-4">
              {[
                { label: 'Total Backlinks', value: totalBacklinks.toLocaleString(), sub: '+11.6% vs last 30 days', pos: true, icon: Link2, color: 'text-blue-500 bg-blue-50' },
                { label: 'Referring Domains', value: totalDomains.toLocaleString(), sub: '+12.5% vs last 30 days', pos: true, icon: Globe, color: 'text-emerald-500 bg-emerald-50' },
                { label: 'Domain Authority', value: domainAuthority, sub: '+3.2% vs last 30 days', pos: true, icon: Shield, color: 'text-purple-500 bg-purple-50' },
                { label: 'Spam Score', value: spamScore, sub: '-2.1% vs last 30 days', pos: false, icon: AlertTriangle, color: 'text-amber-500 bg-amber-50' },
                { label: 'New Backlinks', value: newBacklinks.toLocaleString(), sub: '+7.1% vs last 30 days', pos: true, icon: ArrowUpRight, color: 'text-indigo-500 bg-indigo-50' },
                { label: 'Lost Backlinks', value: lostBacklinks.toLocaleString(), sub: '-7.9% vs last 30 days', pos: false, icon: ArrowDownRight, color: 'text-rose-500 bg-rose-50' },
              ].map((card, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400  block">{card.label}</span>
                    <strong className="text-xl font-black text-slate-900 mt-1 block">{card.value}</strong>
                    <span className={`text-xs  flex items-center gap-0.5 mt-1 ${card.pos ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {card.pos ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} {card.sub}
                    </span>
                  </div>
                  <div className={`w-9 h-9 rounded flex items-center justify-center ${card.color}`}>
                    <card.icon size={16} />
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-3 gap-2">
              {/* Backlink Overview Chart */}
              <div className="col-span-1 bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm  text-slate-900 m-0">Backlink Overview</h3>
                  <span className="text-xs text-slate-400  border border-slate-200 rounded px-2 py-1">Last 30 Days</span>
                </div>
                <div className="flex gap-4 mb-3 text-xs  text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> New Backlinks</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-rose-400 inline-block" /> Lost Backlinks</span>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={BACKLINK_TREND}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="newLinks" stroke="#3B82F6" fill="#DBEAFE" strokeWidth={2} name="New Backlinks" />
                    <Area type="monotone" dataKey="lostLinks" stroke="#F87171" fill="#FEE2E2" strokeWidth={2} name="Lost Backlinks" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Backlink Sources Donut */}
              <div className="col-span-1 bg-white rounded-2xl border border-slate-200 p-2">
                <h3 className="text-sm  text-slate-900 m-0 mb-3">Backlink Sources</h3>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie data={BACKLINK_SOURCES} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={2}>
                          {BACKLINK_SOURCES.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <strong className="text-sm font-black text-slate-900">12,458</strong>
                      <span className="text-[9px] text-slate-400">Total Backlinks</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    {BACKLINK_SOURCES.map((s) => (
                      <div key={s.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-slate-600 font-medium">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className=" text-slate-800">{s.value.toLocaleString()}</span>
                          <span className="text-slate-400">({s.pct})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Anchors */}
              <div className="col-span-1 bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm  text-slate-900 m-0">Top Anchors</h3>
                  <button onClick={() => setActiveTab('Backlink Management')} className="text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline">View All Anchors →</button>
                </div>
                <table className="w-full text-xs text-slate-700">
                  <thead>
                    <tr className="text-xs text-slate-400   border-b border-slate-100">
                      <th className="pb-2 text-left">Anchor Text</th>
                      <th className="pb-2 text-right">Backlinks</th>
                      <th className="pb-2 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOP_ANCHORS.map((a) => (
                      <tr key={a.text} className="border-b border-slate-50">
                        <td className="py-1.5 font-medium text-slate-700">{a.text}</td>
                        <td className="py-1.5 text-right  text-slate-800">{a.backlinks.toLocaleString()}</td>
                        <td className="py-1.5 text-right text-slate-500">{a.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Backlinks Table */}
            <CrudTable
              title="Recent Backlinks"
              columns={backlinkCols}
              data={backlinks}
              onAdd={makeAdd(setBacklinks)}
              onEdit={makeEdit(setBacklinks)}
              onDelete={makeDel(setBacklinks)}
            />

            {/* Bottom Activity Cards */}
            <div className="grid grid-cols-5 gap-4">
              {[
                {
                  tab: 'Link Outreach', icon: Mail, color: 'text-blue-500 bg-blue-50', title: 'Link Outreach',
                  desc: 'Find link opportunities and reach out to websites.',
                  stats: [{ label: 'Sent', val: outreach.length * 64 }, { label: 'In Progress', val: outreach.filter(i => i.status === 'In Progress').length * 10 }, { label: 'Replied', val: outreach.filter(i => i.status === 'Replied').length * 8 }, { label: 'Converted', val: outreach.filter(i => i.status === 'Converted').length * 6 }],
                },
                {
                  tab: 'Guest Posting', icon: FileText, color: 'text-amber-500 bg-amber-50', title: 'Guest Posting',
                  desc: 'Manage guest post opportunities and submissions.',
                  stats: [{ label: 'Opportunities', val: guestPosts.length * 7 }, { label: 'In Progress', val: guestPosts.filter(i => i.status === 'In Progress').length }, { label: 'Published', val: guestPosts.filter(i => i.status === 'Published').length }, { label: 'Rejected', val: guestPosts.filter(i => i.status === 'Rejected').length }],
                },
                {
                  tab: 'Digital PR', icon: Globe, color: 'text-emerald-500 bg-emerald-50', title: 'Digital PR',
                  desc: 'Manage PR campaigns and media outreach.',
                  stats: [{ label: 'Campaigns', val: digitalPr.length * 5 }, { label: 'In Progress', val: digitalPr.filter(i => i.status === 'In Progress').length * 14 }, { label: 'Mentions', val: 42 }, { label: 'Links Earned', val: 23 }],
                },
                {
                  tab: 'Directory Submission', icon: BookOpen, color: 'text-purple-500 bg-purple-50', title: 'Directory Submission',
                  desc: 'Submit to directories and manage listings.',
                  stats: [{ label: 'Submitted', val: directories.length * 78 }, { label: 'Approved', val: directories.filter(i => i.status === 'Approved').length * 45 }, { label: 'Pending', val: directories.filter(i => i.status === 'Pending').length * 24 }, { label: 'Rejected', val: directories.filter(i => i.status === 'Rejected').length * 10 }],
                },
                {
                  tab: 'Social Bookmarking', icon: Share2, color: 'text-rose-500 bg-rose-50', title: 'Social Bookmarking',
                  desc: 'Share and bookmark content on social platforms.',
                  stats: [{ label: 'Submitted', val: bookmarks.length * 62 }, { label: 'Approved', val: bookmarks.filter(i => i.status === 'Approved').length * 40 }, { label: 'Pending', val: bookmarks.filter(i => i.status === 'Pending').length * 16 }, { label: 'Rejected', val: bookmarks.filter(i => i.status === 'Rejected').length * 7 }],
                },
              ].map((card) => (
                <div key={card.tab} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded flex items-center justify-center ${card.color}`}>
                      <card.icon size={14} />
                    </div>
                    <h4 className="text-xs  text-slate-900 m-0">{card.title}</h4>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{card.desc}</p>
                  <div className="grid grid-cols-4 gap-1 mb-3">
                    {card.stats.map((s) => (
                      <div key={s.label} className="text-center">
                        <strong className="text-sm font-black text-slate-900 block">{s.val}</strong>
                        <span className="text-[9px] text-slate-400 ">{s.label}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setActiveTab(card.tab)} className="w-full text-center text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline">
                    Manage {card.title.split(' ')[0]} →
                  </button>
                </div>
              ))}
            </div>

            {/* Forum + Profile + Competitor + Backlink Health */}
            <div className="grid grid-cols-4 gap-2">
              {/* Forum Submission */}
              <div className="bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded flex items-center justify-center bg-sky-50 text-sky-500">
                    <MessageSquare size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs  text-slate-900 m-0">Forum Submission</h4>
                    <p className="text-xs text-slate-400 m-0">Participate in forums and build backlinks.</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 mb-3">
                  {[{ l: 'Submitted', v: forums.length * 47 }, { l: 'Approved', v: forums.filter(i => i.status === 'Approved').length * 34 }, { l: 'Pending', v: forums.filter(i => i.status === 'Pending').length * 10 }, { l: 'Rejected', v: 1 }].map(s => (
                    <div key={s.l} className="text-center">
                      <strong className="text-sm font-black text-slate-900 block">{s.v}</strong>
                      <span className="text-[9px] text-slate-400 ">{s.l}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setActiveTab('Forum Submission')} className="w-full text-center text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline">Manage Forum Submissions →</button>
              </div>

              {/* Profile Creation */}
              <div className="bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded flex items-center justify-center bg-violet-50 text-violet-500">
                    <User size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs  text-slate-900 m-0">Profile Creation</h4>
                    <p className="text-xs text-slate-400 m-0">Create and manage profile backlinks.</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 mb-3">
                  {[{ l: 'Created', v: profiles.filter(i => i.status === 'Created').length + 140 }, { l: 'Approved', v: 98 }, { l: 'Pending', v: profiles.filter(i => i.status === 'Pending').length + 30 }, { l: 'Rejected', v: 12 }].map(s => (
                    <div key={s.l} className="text-center">
                      <strong className="text-sm font-black text-slate-900 block">{s.v}</strong>
                      <span className="text-[9px] text-slate-400 ">{s.l}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setActiveTab('Profile Creation')} className="w-full text-center text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline">Manage Profiles →</button>
              </div>

              {/* Competitor Backlinks */}
              <div className="bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded flex items-center justify-center bg-rose-50 text-rose-500">
                    <Target size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs  text-slate-900 m-0">Competitor Backlinks</h4>
                    <p className="text-xs text-slate-400 m-0">Analyze and track competitor backlinks.</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 mb-3">
                  {[{ l: 'Competitors', v: competitors.length }, { l: 'Total Backlinks', v: '24,156' }, { l: 'Unique Domains', v: '3,248' }, { l: 'Shared Domains', v: '742' }].map(s => (
                    <div key={s.l} className="text-center">
                      <strong className="text-sm font-black text-slate-900 block">{s.v}</strong>
                      <span className="text-[9px] text-slate-400 ">{s.l}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setActiveTab('Competitor Backlinks')} className="w-full text-center text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline">Analyze Competitors →</button>
              </div>

              {/* Backlink Health */}
              <div className="bg-white rounded-2xl border border-slate-200 p-2">
                <h4 className="text-xs  text-slate-900 m-0 mb-3">Backlink Health</h4>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <ResponsiveContainer width={80} height={80}>
                      <PieChart>
                        <Pie data={BACKLINK_HEALTH} cx="50%" cy="50%" innerRadius={25} outerRadius={38} dataKey="value" paddingAngle={2}>
                          {BACKLINK_HEALTH.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <strong className="text-xs font-black text-slate-900">85</strong>
                      <span className="text-[8px] text-slate-400">Good</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    {BACKLINK_HEALTH.map((h) => (
                      <div key={h.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: h.color }} />
                          <span className="text-slate-500 font-medium">{h.name}</span>
                        </div>
                        <span className=" text-slate-700">{h.value.toLocaleString()} ({h.pct}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="w-full text-center text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline mt-3">View Full Report →</button>
              </div>
            </div>

          </div>
        )}

        {/* ── Backlink Management ── */}
        {activeTab === 'Backlink Management' && (
          <CrudTable
            title="Backlink Management"
            columns={backlinkCols}
            data={backlinks}
            onAdd={makeAdd(setBacklinks)}
            onEdit={makeEdit(setBacklinks)}
            onDelete={makeDel(setBacklinks)}
          />
        )}

        {/* ── Link Outreach ── */}
        {activeTab === 'Link Outreach' && (
          <CrudTable
            title="Link Outreach"
            columns={outreachCols}
            data={outreach}
            onAdd={makeAdd(setOutreach)}
            onEdit={makeEdit(setOutreach)}
            onDelete={makeDel(setOutreach)}
          />
        )}

        {/* ── Guest Posting ── */}
        {activeTab === 'Guest Posting' && (
          <CrudTable
            title="Guest Posting"
            columns={guestPostCols}
            data={guestPosts}
            onAdd={makeAdd(setGuestPosts)}
            onEdit={makeEdit(setGuestPosts)}
            onDelete={makeDel(setGuestPosts)}
          />
        )}

        {/* ── Digital PR ── */}
        {activeTab === 'Digital PR' && (
          <CrudTable
            title="Digital PR"
            columns={digitalPrCols}
            data={digitalPr}
            onAdd={makeAdd(setDigitalPr)}
            onEdit={makeEdit(setDigitalPr)}
            onDelete={makeDel(setDigitalPr)}
          />
        )}

        {/* ── Directory Submission ── */}
        {activeTab === 'Directory Submission' && (
          <CrudTable
            title="Directory Submission"
            columns={directoryCols}
            data={directories}
            onAdd={makeAdd(setDirectories)}
            onEdit={makeEdit(setDirectories)}
            onDelete={makeDel(setDirectories)}
          />
        )}

        {/* ── Social Bookmarking ── */}
        {activeTab === 'Social Bookmarking' && (
          <CrudTable
            title="Social Bookmarking"
            columns={bookmarkingCols}
            data={bookmarks}
            onAdd={makeAdd(setBookmarks)}
            onEdit={makeEdit(setBookmarks)}
            onDelete={makeDel(setBookmarks)}
          />
        )}

        {/* ── Forum Submission ── */}
        {activeTab === 'Forum Submission' && (
          <CrudTable
            title="Forum Submission"
            columns={forumCols}
            data={forums}
            onAdd={makeAdd(setForums)}
            onEdit={makeEdit(setForums)}
            onDelete={makeDel(setForums)}
          />
        )}

        {/* ── Profile Creation ── */}
        {activeTab === 'Profile Creation' && (
          <CrudTable
            title="Profile Creation"
            columns={profileCols}
            data={profiles}
            onAdd={makeAdd(setProfiles)}
            onEdit={makeEdit(setProfiles)}
            onDelete={makeDel(setProfiles)}
          />
        )}

        {/* ── Competitor Backlinks ── */}
        {activeTab === 'Competitor Backlinks' && (
          <CrudTable
            title="Competitor Backlinks"
            columns={competitorCols}
            data={competitors}
            onAdd={makeAdd(setCompetitors)}
            onEdit={makeEdit(setCompetitors)}
            onDelete={makeDel(setCompetitors)}
          />
        )}

      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import {
  Plus, Calendar, Download, Search, Filter, BarChart2, TrendingUp,
  TrendingDown, Minus, ArrowUpRight, ArrowDownRight, Smartphone, Monitor,
  MapPin, Clock, Star, Target, Activity, Eye,
} from 'lucide-react';
import SeoGmbProjectSelector from './SeoGmbProjectSelector';
import CrudTable from '../common/CrudTable';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


// ── Chart Data ────────────────────────────────────────────────────────────
const RANKING_TREND = [];

const AVG_POSITION_TREND = [];

const RANKING_DIST = [];

// ── Column Definitions ────────────────────────────────────────────────────
const keywordCols = [
  { header: 'Keyword', accessor: 'keyword' },
  { header: 'Location', accessor: 'location' },
  { header: 'Device', accessor: 'device' },
  { header: 'Current Rank', accessor: 'rank' },
  { header: 'Previous Rank', accessor: 'prevRank' },
  { header: 'Change', accessor: 'change' },
  { header: 'Best Rank', accessor: 'best' },
  { header: 'Search Volume', accessor: 'volume' },
];
const dailyCols = [
  { header: 'Keyword', accessor: 'keyword' },
  { header: 'Rank', accessor: 'rank' },
  { header: 'Change', accessor: 'change' },
  { header: 'Date', accessor: 'date' },
];
const weeklyCols = [
  { header: 'Keyword', accessor: 'keyword' },
  { header: 'Rank', accessor: 'rank' },
  { header: 'Change', accessor: 'change' },
  { header: 'Week', accessor: 'week' },
];
const monthlyCols = [
  { header: 'Keyword', accessor: 'keyword' },
  { header: 'Rank', accessor: 'rank' },
  { header: 'Change', accessor: 'change' },
  { header: 'Month', accessor: 'month' },
];
const cityCols = [
  { header: 'City', accessor: 'city' },
  { header: 'Keyword', accessor: 'keyword' },
  { header: 'Avg Rank', accessor: 'avgRank' },
  { header: 'Change', accessor: 'change' },
  { header: 'Top 3', accessor: 'top3' },
  { header: 'Top 10', accessor: 'top10' },
];
const mobileCols = [
  { header: 'Keyword', accessor: 'keyword' },
  { header: 'Mobile Rank', accessor: 'rank' },
  { header: 'Change', accessor: 'change' },
  { header: 'Desktop Rank', accessor: 'desktop' },
  { header: 'Difference', accessor: 'diff' },
];
const desktopCols = [
  { header: 'Keyword', accessor: 'keyword' },
  { header: 'Desktop Rank', accessor: 'rank' },
  { header: 'Change', accessor: 'change' },
  { header: 'Mobile Rank', accessor: 'mobile' },
  { header: 'Difference', accessor: 'diff' },
];

// ── Initial Data ──────────────────────────────────────────────────────────
const INIT = {
  keywords: [
    { id: 1, keyword: 'digital marketing services', location: 'India', device: 'Desktop', rank: '1', prevRank: '2', change: '↑ 1', best: '1', volume: '14,800' },
    { id: 2, keyword: 'seo services', location: 'India', device: 'Mobile', rank: '3', prevRank: '4', change: '↑ 1', best: '2', volume: '9,900' },
    { id: 3, keyword: 'content marketing strategy', location: 'India', device: 'Desktop', rank: '5', prevRank: '6', change: '↑ 1', best: '3', volume: '4,400' },
    { id: 4, keyword: 'social media marketing', location: 'Mumbai', device: 'Mobile', rank: '2', prevRank: '3', change: '↑ 1', best: '1', volume: '6,600' },
    { id: 5, keyword: 'ppc management', location: 'Delhi', device: 'Desktop', rank: '7', prevRank: '8', change: '↑ 1', best: '5', volume: '3,600' },
    { id: 6, keyword: 'local seo services', location: 'Bangalore', device: 'Mobile', rank: '4', prevRank: '4', change: '→ 0', best: '2', volume: '5,200' },
    { id: 7, keyword: 'google ads management', location: 'India', device: 'Desktop', rank: '6', prevRank: '5', change: '↓ 1', best: '4', volume: '7,800' },
    { id: 8, keyword: 'website design company', location: 'Mumbai', device: 'Desktop', rank: '9', prevRank: '12', change: '↑ 3', best: '7', volume: '8,400' },
  ],
  daily: [
    { id: 1, keyword: 'digital marketing services', rank: '1', change: '↑ 1', date: 'May 15, 2026' },
    { id: 2, keyword: 'seo services', rank: '3', change: '↑ 1', date: 'May 15, 2026' },
    { id: 3, keyword: 'content marketing strategy', rank: '5', change: '↑ 1', date: 'May 15, 2026' },
    { id: 4, keyword: 'social media marketing', rank: '2', change: '↑ 1', date: 'May 15, 2026' },
    { id: 5, keyword: 'ppc management', rank: '7', change: '↑ 1', date: 'May 15, 2026' },
  ],
  weekly: [
    { id: 1, keyword: 'digital marketing services', rank: '1', change: '↑ 1', week: 'May 8 – May 15, 2026' },
    { id: 2, keyword: 'seo services', rank: '3', change: '↑ 1', week: 'May 8 – May 15, 2026' },
    { id: 3, keyword: 'content marketing strategy', rank: '5', change: '↑ 1', week: 'May 8 – May 15, 2026' },
    { id: 4, keyword: 'social media marketing', rank: '2', change: '↑ 1', week: 'May 8 – May 15, 2026' },
    { id: 5, keyword: 'ppc management', rank: '7', change: '↑ 1', week: 'May 8 – May 15, 2026' },
  ],
  monthly: [
    { id: 1, keyword: 'digital marketing services', rank: '1', change: '↑ 1', month: 'May 2026' },
    { id: 2, keyword: 'seo services', rank: '3', change: '↑ 1', month: 'May 2026' },
    { id: 3, keyword: 'content marketing strategy', rank: '3', change: '↑ 2', month: 'May 2026' },
    { id: 4, keyword: 'social media marketing', rank: '2', change: '↑ 1', month: 'May 2026' },
    { id: 5, keyword: 'ppc management', rank: '7', change: '↑ 1', month: 'May 2026' },
  ],
  city: [
    { id: 1, city: 'Mumbai', keyword: 'digital marketing services', avgRank: '12.4', change: '↑ 2', top3: '8', top10: '24' },
    { id: 2, city: 'Delhi', keyword: 'seo services', avgRank: '14.7', change: '↑ 1.7', top3: '5', top10: '18' },
    { id: 3, city: 'Bangalore', keyword: 'content marketing', avgRank: '15.6', change: '↑ 0.0', top3: '4', top10: '16' },
    { id: 4, city: 'Hyderabad', keyword: 'social media marketing', avgRank: '16.3', change: '↓ 0.5', top3: '3', top10: '14' },
    { id: 5, city: 'Chennai', keyword: 'ppc management', avgRank: '17.4', change: '↑ 1.3', top3: '2', top10: '12' },
  ],
  mobile: [
    { id: 1, keyword: 'digital marketing services', rank: '320', change: '↑ 12', desktop: '340', diff: '-20' },
    { id: 2, keyword: 'seo services', rank: '690', change: '↑ 21', desktop: '750', diff: '-60' },
    { id: 3, keyword: 'content marketing', rank: '940', change: '↑ 22', desktop: '980', diff: '-40' },
    { id: 4, keyword: 'social media marketing', rank: '1,120', change: '↑ 15', desktop: '1,180', diff: '-60' },
    { id: 5, keyword: 'ppc management', rank: '1,210', change: '↑ 12', desktop: '1,240', diff: '-30' },
  ],
  desktop: [
    { id: 1, keyword: 'digital marketing services', rank: '340', change: '↑ 16', mobile: '320', diff: '+20' },
    { id: 2, keyword: 'seo services', rank: '750', change: '↑ 25', mobile: '690', diff: '+60' },
    { id: 3, keyword: 'content marketing', rank: '980', change: '↑ 22', mobile: '940', diff: '+40' },
    { id: 4, keyword: 'social media marketing', rank: '1,180', change: '↑ 17', mobile: '1,120', diff: '+60' },
    { id: 5, keyword: 'ppc management', rank: '1,240', change: '↑ 12', mobile: '1,210', diff: '+30' },
  ],
};

// ── Tabs ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'Keyword Rankings', icon: BarChart2 },
  { id: 'Daily Ranking', icon: Clock },
  { id: 'Weekly Ranking', icon: Calendar },
  { id: 'Monthly Ranking', icon: Target },
  { id: 'City Rankings', icon: MapPin },
  { id: 'Mobile Rankings', icon: Smartphone },
  { id: 'Desktop Rankings', icon: Monitor },
];

// ── Change Badge ──────────────────────────────────────────────────────────
const changeBadge = (c) => {
  if (!c) return null;
  const up = c.includes('↑');
  const down = c.includes('↓');
  return (
    <span className={`text-xs  px-1.5 py-0.5 rounded ${up ? 'bg-emerald-50 text-emerald-600' : down ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
      {c}
    </span>
  );
};

// ── Mini Table for Overview ───────────────────────────────────────────────
const MiniTable = ({ title, period, data, onMore }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-4">
    <div className="flex justify-between items-center mb-3">
      <h4 className="text-xs  text-slate-900 m-0">{title}</h4>
      <span className="text-xs text-slate-400 border border-slate-200 rounded px-2 py-0.5">{period}</span>
    </div>
    <table className="w-full text-xs">
      <thead>
        <tr className="text-[9px] text-slate-400   border-b border-slate-100">
          <th className="pb-1.5 text-left">Keyword</th>
          <th className="pb-1.5 text-center">Rank</th>
          <th className="pb-1.5 text-center">Change</th>
        </tr>
      </thead>
      <tbody>
        {data.slice(0, 5).map((row) => (
          <tr key={row.id} className="border-b border-slate-50">
            <td className="py-1 font-medium text-slate-700 truncate max-w-[100px]">{row.keyword}</td>
            <td className="py-1 text-center font-black text-slate-900">{row.rank}</td>
            <td className="py-1 text-center">
              <span className={` ${row.change?.includes('↑') ? 'text-emerald-500' : row.change?.includes('↓') ? 'text-rose-500' : 'text-slate-400'}`}>
                {row.change}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <button onClick={onMore} className="w-full text-center text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline mt-2">View Full Report →</button>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
export default function SeoGmbRankTrackingPage() {
  const [activeTab, setActiveTab] = useState('Keyword Rankings');
  const [project, setProject] = useState(null);
  const [tableData, setTableData] = useState(INIT);
  const [searchQ, setSearchQ] = useState('');

  const makeAdd = (key) => (item) => setTableData(prev => ({ ...prev, [key]: [...prev[key], { ...item, id: prev[key].length ? Math.max(...prev[key].map(i => i.id)) + 1 : 1 }] }));
  const makeEdit = (key) => (id, item) => setTableData(prev => ({ ...prev, [key]: prev[key].map(i => i.id === id ? { ...i, ...item } : i) }));
  const makeDel = (key) => (id) => setTableData(prev => ({ ...prev, [key]: prev[key].filter(i => i.id !== id) }));

  const loadProject = async (proj) => {
    try { const r = await fetch(`${API_BASE_URL}/projects/${proj.id}`); if (r.ok) setProject(await r.json()); } catch { }
  };

  const filteredKeywords = tableData.keywords.filter(k =>
    k.keyword.toLowerCase().includes(searchQ.toLowerCase()) ||
    k.location.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="bg-slate-50 min-h-screen font-sans pb-10">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded flex items-center justify-center">
            <BarChart2 size={16} className="text-indigo-500" />
          </div>
          <div>
            <h1 className="text-base  text-slate-900 m-0 leading-none">Rank Tracking {project ? `for ${project.name}` : ''}</h1>
            <p className="text-xs text-slate-400 m-0 mt-0.5">Track keyword rankings across all search engines, locations and devices.</p>
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
          <button
            onClick={() => setActiveTab('Keyword Rankings')}
            className="bg-indigo-500 hover:bg-indigo-600 border-none text-white rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus size={14} /> Add Keywords
          </button>
        </div>
      </div>

      <div className="px-6 py-4">

        {/* ── Tab Bar ── */}
        <div className="flex gap-1 mb-5 bg-white p-1 rounded border border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
          {TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 py-2.5 px-4 rounded text-xs  cursor-pointer border-none outline-none transition-all shrink-0 ${activeTab === id ? 'bg-indigo-50 text-indigo-600 ' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              <Icon size={12} /> {id}
            </button>
          ))}
        </div>

        {/* ═══════════════════ KEYWORD RANKINGS (Overview) ═══════════════════ */}
        {activeTab === 'Keyword Rankings' && (
          <div className="flex flex-col gap-2">

            {/* Metric Cards */}
            <div className="grid grid-cols-6 gap-4">
              {[
                { label: 'Total Keywords', val: '1,248', sub: '+8.45% vs last 7 days', pos: true, icon: BarChart2, color: 'text-indigo-500 bg-indigo-50' },
                { label: 'Top 3 Rankings', val: '312', sub: '+12.28% vs last 7 days', pos: true, icon: Star, color: 'text-amber-500 bg-amber-50' },
                { label: 'Top 10 Rankings', val: '712', sub: '+9.15% vs last 7 days', pos: true, icon: Target, color: 'text-emerald-500 bg-emerald-50' },
                { label: 'Top 20 Rankings', val: '980', sub: '+6.72% vs last 7 days', pos: true, icon: TrendingUp, color: 'text-blue-500 bg-blue-50' },
                { label: 'No Change', val: '156', sub: '-3.21% vs last 7 days', pos: false, icon: Minus, color: 'text-slate-500 bg-slate-100' },
                { label: 'Dropped Rankings', val: '88', sub: '-10.43% vs last 7 days', pos: false, icon: TrendingDown, color: 'text-rose-500 bg-rose-50' },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400  block mb-1">{c.label}</span>
                    <strong className="text-xl font-black text-slate-900 block">{c.val}</strong>
                    <span className={`text-[9px]  flex items-center gap-0.5 mt-1 ${c.pos ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {c.pos ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />} {c.sub}
                    </span>
                  </div>
                  <div className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 ${c.color}`}>
                    <c.icon size={16} />
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-3 gap-2">
              {/* Ranking Overview */}
              <div className="col-span-1 bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm  text-slate-900 m-0">Ranking Overview</h3>
                  <span className="text-xs border border-slate-200 rounded px-2 py-0.5 text-slate-400 ">Last 7 Days ▾</span>
                </div>
                <div className="flex flex-wrap gap-3 mb-2 text-xs  text-slate-500">
                  {[{ l: 'Top 3', c: '#3B82F6' }, { l: 'Top 10', c: '#10B981' }, { l: 'Top 20', c: '#8B5CF6' }, { l: 'Top 100', c: '#F59E0B' }].map(d => (
                    <span key={d.l} className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ backgroundColor: d.c }} />{d.l}</span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={RANKING_TREND}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 8, fill: '#94A3B8' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="top3" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2 }} name="Top 3" />
                    <Line type="monotone" dataKey="top10" stroke="#10B981" strokeWidth={2} dot={{ r: 2 }} name="Top 10" />
                    <Line type="monotone" dataKey="top20" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 2 }} name="Top 20" />
                    <Line type="monotone" dataKey="top100" stroke="#F59E0B" strokeWidth={2} dot={{ r: 2 }} name="Top 100" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Ranking Distribution */}
              <div className="col-span-1 bg-white rounded-2xl border border-slate-200 p-2">
                <h3 className="text-sm  text-slate-900 m-0 mb-3">Ranking Distribution</h3>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie data={RANKING_DIST} cx="50%" cy="50%" innerRadius={36} outerRadius={55} dataKey="value" paddingAngle={2}>
                          {RANKING_DIST.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <strong className="text-sm font-black text-slate-900">1,248</strong>
                      <span className="text-[8px] text-slate-400">Total</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    {RANKING_DIST.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} /><span className="text-slate-600">{d.name}</span></div>
                        <div className="text-right"><strong className="text-slate-800">{d.value}</strong><span className="text-slate-400 ml-1">({d.pct})</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Average Position */}
              <div className="col-span-1 bg-white rounded-2xl border border-slate-200 p-2">
                <h3 className="text-sm  text-slate-900 m-0 mb-1">Average Position</h3>
                <div className="flex items-end gap-2 mb-2">
                  <strong className="text-4xl font-black text-slate-900">18.7</strong>
                  <span className="text-xs text-emerald-500  flex items-center gap-0.5 mb-1">
                    <ArrowUpRight size={10} /> +2.3% vs last 7 days
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={AVG_POSITION_TREND}>
                    <Area type="monotone" dataKey="pos" stroke="#6366F1" fill="#EDE9FE" strokeWidth={2} dot={false} />
                    <Tooltip formatter={(v) => `Position ${v}`} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-100">
                  <div className="text-center">
                    <p className="text-xs text-slate-400  m-0">Best Position</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <strong className="text-xl font-black text-slate-900">1</strong>
                      <span className="text-[9px] text-emerald-500 ">↑ 0</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400  m-0">Worst Position</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <strong className="text-xl font-black text-slate-900">98</strong>
                      <span className="text-[9px] text-rose-500 ">↓ 4</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Keywords Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm  text-slate-900 m-0">Top Keywords</h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchQ}
                      onChange={e => setSearchQ(e.target.value)}
                      placeholder="Search keywords..."
                      className="border border-slate-200 rounded pl-7 pr-3 py-1.5 text-xs text-slate-700 focus:border-indigo-400 outline-none w-48"
                    />
                  </div>
                  <button className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer">
                    <Filter size={12} /> Filters
                  </button>
                  <button
                    onClick={() => makeAdd('keywords')({ keyword: 'New Keyword', location: 'India', device: 'Desktop', rank: '10', prevRank: '10', change: '→ 0', best: '10', volume: '1,000' })}
                    className="bg-indigo-500 hover:bg-indigo-600 border-none text-white rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus size={13} /> Add Keywords
                  </button>
                </div>
              </div>
              {/* Custom table with change badges */}
              <table className="w-full text-xs text-slate-700">
                <thead>
                  <tr className="text-xs text-slate-400   border-b border-slate-200 bg-slate-50">
                    <th className="py-2 px-3 text-left">Keyword</th>
                    <th className="py-2 px-3 text-left">Location</th>
                    <th className="py-2 px-3 text-left">Device</th>
                    <th className="py-2 px-3 text-center">Current Rank</th>
                    <th className="py-2 px-3 text-center">Previous Rank</th>
                    <th className="py-2 px-3 text-center">Change</th>
                    <th className="py-2 px-3 text-center">Best Rank</th>
                    <th className="py-2 px-3 text-right">Search Volume</th>
                    <th className="py-2 px-3 text-center">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeywords.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3  text-slate-800">{row.keyword}</td>
                      <td className="py-2.5 px-3 text-slate-500">{row.location}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1 text-slate-500">
                          {row.device === 'Mobile' ? <Smartphone size={11} /> : <Monitor size={11} />}
                          {row.device}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-slate-900">{row.rank}</td>
                      <td className="py-2.5 px-3 text-center text-slate-500">{row.prevRank}</td>
                      <td className="py-2.5 px-3 text-center">{changeBadge(row.change)}</td>
                      <td className="py-2.5 px-3 text-center  text-emerald-600">{row.best}</td>
                      <td className="py-2.5 px-3 text-right  text-slate-800">{row.volume}</td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="w-16 h-6 mx-auto">
                          <ResponsiveContainer width="100%" height={24}>
                            <AreaChart data={AVG_POSITION_TREND.slice(4)}>
                              <Area type="monotone" dataKey="pos" stroke="#10B981" fill="#D1FAE5" strokeWidth={1.5} dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-400 m-0">Showing 1 to {filteredKeywords.length} of 1,248 results</p>
                <div className="flex items-center gap-1">
                  {['‹', 1, 2, 3, 4, 5, '…', 250, '›'].map((p, i) => (
                    <button key={i} className={`w-7 h-7 rounded text-xs  border-none cursor-pointer ${p === 1 ? 'bg-indigo-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>{p}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom mini-tables row */}
            <div className="grid grid-cols-6 gap-4">
              <MiniTable title="Daily Ranking" period="May 15, 2026" data={tableData.daily} onMore={() => setActiveTab('Daily Ranking')} />
              <MiniTable title="Weekly Ranking" period="May 8 – May 15, 2026" data={tableData.weekly} onMore={() => setActiveTab('Weekly Ranking')} />
              <MiniTable title="Monthly Ranking" period="May 2026" data={tableData.monthly} onMore={() => setActiveTab('Monthly Ranking')} />
              {/* City Rankings mini */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs  text-slate-900 m-0">City Rankings</h4>
                </div>
                <table className="w-full text-xs">
                  <thead><tr className="text-[9px] text-slate-400   border-b border-slate-100"><th className="pb-1.5 text-left">City</th><th className="pb-1.5 text-center">Avg Rank</th><th className="pb-1.5 text-center">Δ</th></tr></thead>
                  <tbody>
                    {tableData.city.map(r => (
                      <tr key={r.id} className="border-b border-slate-50">
                        <td className="py-1 font-medium text-slate-700">{r.city}</td>
                        <td className="py-1 text-center font-black text-slate-900">{r.avgRank}</td>
                        <td className={`py-1 text-center  ${r.change.includes('↑') ? 'text-emerald-500' : 'text-rose-500'}`}>{r.change}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={() => setActiveTab('City Rankings')} className="w-full text-center text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline mt-2">View Full Report →</button>
              </div>
              {/* Mobile mini */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-1 mb-3"><Smartphone size={12} className="text-indigo-500" /><h4 className="text-xs  text-slate-900 m-0">Mobile Rankings</h4></div>
                <table className="w-full text-xs">
                  <thead><tr className="text-[9px] text-slate-400   border-b border-slate-100"><th className="pb-1.5 text-left">Device</th><th className="pb-1.5 text-center">Avg</th><th className="pb-1.5 text-center">Δ</th></tr></thead>
                  <tbody>
                    {[{ l: 'Top 3', v: '320', c: '↑ 12' }, { l: 'Top 10', v: '690', c: '↑ 21' }, { l: 'Top 20', v: '940', c: '↑ 22' }, { l: 'Top 50', v: '1,120', c: '↑ 15' }, { l: 'Top 100', v: '1,210', c: '↑ 12' }].map(r => (
                      <tr key={r.l} className="border-b border-slate-50">
                        <td className="py-1 font-medium text-slate-700">{r.l}</td>
                        <td className="py-1 text-center font-black text-slate-900">{r.v}</td>
                        <td className="py-1 text-center text-emerald-500 ">{r.c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={() => setActiveTab('Mobile Rankings')} className="w-full text-center text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline mt-2">View Full Report →</button>
              </div>
              {/* Desktop mini */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-1 mb-3"><Monitor size={12} className="text-indigo-500" /><h4 className="text-xs  text-slate-900 m-0">Desktop Rankings</h4></div>
                <table className="w-full text-xs">
                  <thead><tr className="text-[9px] text-slate-400   border-b border-slate-100"><th className="pb-1.5 text-left">Device</th><th className="pb-1.5 text-center">Avg</th><th className="pb-1.5 text-center">Δ</th></tr></thead>
                  <tbody>
                    {[{ l: 'Top 3', v: '340', c: '↑ 16' }, { l: 'Top 10', v: '750', c: '↑ 25' }, { l: 'Top 20', v: '980', c: '↑ 22' }, { l: 'Top 50', v: '1,180', c: '↑ 17' }, { l: 'Top 100', v: '1,240', c: '↑ 12' }].map(r => (
                      <tr key={r.l} className="border-b border-slate-50">
                        <td className="py-1 font-medium text-slate-700">{r.l}</td>
                        <td className="py-1 text-center font-black text-slate-900">{r.v}</td>
                        <td className="py-1 text-center text-emerald-500 ">{r.c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={() => setActiveTab('Desktop Rankings')} className="w-full text-center text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline mt-2">View Full Report →</button>
              </div>
            </div>

          </div>
        )}

        {/* ═══ DAILY RANKING ═══ */}
        {activeTab === 'Daily Ranking' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-4">
              {[{ l: 'Improved', v: '186', c: '+22 today' }, { l: 'Declined', v: '42', c: '-8 today' }, { l: 'New', v: '12', c: '+12 today' }, { l: 'Dropped Out', v: '6', c: '-6 today' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200">
                  <span className="text-xs text-slate-400  block">{s.l}</span>
                  <strong className="text-2xl font-black text-slate-900 block mt-1">{s.v}</strong>
                  <span className="text-xs text-emerald-500  mt-1 block">{s.c}</span>
                </div>
              ))}
            </div>
            <CrudTable title="Daily Ranking — May 15, 2026" columns={dailyCols} data={tableData.daily} onAdd={makeAdd('daily')} onEdit={makeEdit('daily')} onDelete={makeDel('daily')} />
          </div>
        )}

        {/* ═══ WEEKLY RANKING ═══ */}
        {activeTab === 'Weekly Ranking' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-4">
              {[{ l: 'Improved', v: '248', c: '+31 this week' }, { l: 'Declined', v: '56', c: '-12 this week' }, { l: 'New', v: '28', c: '+28 this week' }, { l: 'No Change', v: '68', c: 'stable' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200">
                  <span className="text-xs text-slate-400  block">{s.l}</span>
                  <strong className="text-2xl font-black text-slate-900 block mt-1">{s.v}</strong>
                  <span className="text-xs text-emerald-500  mt-1 block">{s.c}</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-2">
              <h3 className="text-sm  text-slate-900 m-0 mb-3">Weekly Ranking Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={RANKING_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="top3" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Top 3" />
                  <Line type="monotone" dataKey="top10" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Top 10" />
                  <Line type="monotone" dataKey="top20" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} name="Top 20" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <CrudTable title="Weekly Ranking — May 8 – May 15, 2026" columns={weeklyCols} data={tableData.weekly} onAdd={makeAdd('weekly')} onEdit={makeEdit('weekly')} onDelete={makeDel('weekly')} />
          </div>
        )}

        {/* ═══ MONTHLY RANKING ═══ */}
        {activeTab === 'Monthly Ranking' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-4">
              {[{ l: 'Improved', v: '412', c: '+68 this month' }, { l: 'Declined', v: '124', c: '-24 this month' }, { l: 'New Keywords', v: '86', c: '+86 this month' }, { l: 'Lost Keywords', v: '18', c: '-18 this month' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200">
                  <span className="text-xs text-slate-400  block">{s.l}</span>
                  <strong className="text-2xl font-black text-slate-900 block mt-1">{s.v}</strong>
                  <span className="text-xs text-emerald-500  mt-1 block">{s.c}</span>
                </div>
              ))}
            </div>
            <CrudTable title="Monthly Ranking — May 2026" columns={monthlyCols} data={tableData.monthly} onAdd={makeAdd('monthly')} onEdit={makeEdit('monthly')} onDelete={makeDel('monthly')} />
          </div>
        )}

        {/* ═══ CITY RANKINGS ═══ */}
        {activeTab === 'City Rankings' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-5 gap-4">
              {tableData.city.slice(0, 5).map(c => (
                <div key={c.id} className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center gap-1.5 mb-2"><MapPin size={12} className="text-indigo-500" /><span className="text-xs text-slate-400 ">{c.city}</span></div>
                  <strong className="text-xl font-black text-slate-900 block">{c.avgRank}</strong>
                  <span className="text-xs text-slate-400  block">Avg. Rank</span>
                  <span className={`text-xs  flex items-center gap-0.5 mt-1 ${c.change.includes('↑') ? 'text-emerald-500' : 'text-rose-500'}`}>{c.change}</span>
                </div>
              ))}
            </div>
            <CrudTable title="City Rankings" columns={cityCols} data={tableData.city} onAdd={makeAdd('city')} onEdit={makeEdit('city')} onDelete={makeDel('city')} />
          </div>
        )}

        {/* ═══ MOBILE RANKINGS ═══ */}
        {activeTab === 'Mobile Rankings' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-5 gap-4">
              {[{ l: 'Top 3', v: '320', c: '↑ 12' }, { l: 'Top 10', v: '690', c: '↑ 21' }, { l: 'Top 20', v: '940', c: '↑ 22' }, { l: 'Top 50', v: '1,120', c: '↑ 15' }, { l: 'Top 100', v: '1,210', c: '↑ 12' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400  block">{s.l}</span>
                    <strong className="text-xl font-black text-slate-900 block mt-1">{s.v}</strong>
                    <span className="text-xs text-emerald-500  mt-1 block">{s.c}</span>
                  </div>
                  <div className="w-8 h-8 bg-indigo-50 rounded flex items-center justify-center"><Smartphone size={14} className="text-indigo-500" /></div>
                </div>
              ))}
            </div>
            <CrudTable title="Mobile Rankings" columns={mobileCols} data={tableData.mobile} onAdd={makeAdd('mobile')} onEdit={makeEdit('mobile')} onDelete={makeDel('mobile')} />
          </div>
        )}

        {/* ═══ DESKTOP RANKINGS ═══ */}
        {activeTab === 'Desktop Rankings' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-5 gap-4">
              {[{ l: 'Top 3', v: '340', c: '↑ 16' }, { l: 'Top 10', v: '750', c: '↑ 25' }, { l: 'Top 20', v: '980', c: '↑ 22' }, { l: 'Top 50', v: '1,180', c: '↑ 17' }, { l: 'Top 100', v: '1,240', c: '↑ 12' }].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400  block">{s.l}</span>
                    <strong className="text-xl font-black text-slate-900 block mt-1">{s.v}</strong>
                    <span className="text-xs text-emerald-500  mt-1 block">{s.c}</span>
                  </div>
                  <div className="w-8 h-8 bg-indigo-50 rounded flex items-center justify-center"><Monitor size={14} className="text-indigo-500" /></div>
                </div>
              ))}
            </div>
            <CrudTable title="Desktop Rankings" columns={desktopCols} data={tableData.desktop} onAdd={makeAdd('desktop')} onEdit={makeEdit('desktop')} onDelete={makeDel('desktop')} />
          </div>
        )}

      </div>
    </div>
  );
}

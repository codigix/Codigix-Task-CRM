import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import {
  CheckCircle, ChevronRight, Edit3, MoreHorizontal, ArrowUpRight, ArrowDownRight,
  Search, Bell, Calendar, MessageSquare, Plus, FileText, Globe, Sliders, ChevronDown,
  Check, Target, Zap, Link, MapPin, Users, Lock, Server, Trash2, ClipboardList, Info, Shield, HelpCircle,
  Activity, TrendingUp, AlertTriangle, AlertCircle, RefreshCw, X, Download, Star
} from 'lucide-react';
import SeoGmbProjectSelector from './SeoGmbProjectSelector';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


const TREND_CHART_DATA = [];

const DIFFICULTY_DIST_DATA = [];

const INTENT_COLORS = {
  'Informational': '#3B82F6',
  'Commercial': '#F97316',
  'Navigational': '#10B981',
  'Transactional': '#8B5CF6'
};

export default function SeoGmbKeywordManagementPage() {
  const [activeTab, setActiveTab] = useState('Keyword Research');
  const [project, setProject] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [newKeywordText, setNewKeywordText] = useState('');
  const [newKeywordVolume, setNewKeywordVolume] = useState('1,200');
  const [newKeywordIntent, setNewKeywordIntent] = useState('Informational');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Operations States
  const [plans, setPlans] = useState([
    { id: 1, name: 'Local GMB Q3 Campaign', keywordCount: 14, budget: '$4,500', status: 'Active' },
    { id: 2, name: 'Enterprise Search Integration', keywordCount: 8, budget: '$7,200', status: 'Planning' },
  ]);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanBudget, setNewPlanBudget] = useState('$3,000');

  const [mappings, setMappings] = useState([
    { id: 1, keyword: 'local clinic software', url: 'https://healthalpha.com/clinic-management', status: 'Synced' },
    { id: 2, keyword: 'healthcare billing platform', url: 'https://healthalpha.com/billing-solutions', status: 'Pending Review' }
  ]);
  const [newMapKeyword, setNewMapKeyword] = useState('');
  const [newMapUrl, setNewMapUrl] = useState('');

  const [clusters, setClusters] = useState([
    { id: 1, name: 'Patient Portal Keywords', keywords: ['online patient booking', 'medical record portal', 'secure patient checkin'], count: 3 },
    { id: 2, name: 'Medical Billing Keywords', keywords: ['medical invoice coding', 'outpatient claim software', 'insurance billing tools'], count: 3 }
  ]);
  const [newClusterName, setNewClusterName] = useState('');
  const [newClusterKeywordsText, setNewClusterKeywordsText] = useState('');

  const [competitors, setCompetitors] = useState([
    { id: 1, domain: 'competitor-health.com', overlap: '48%', keywordsRanked: 195 },
    { id: 2, domain: 'clinic-expert-software.com', overlap: '32%', keywordsRanked: 110 }
  ]);
  const [newCompDomain, setNewCompDomain] = useState('');

  // Editing state for Keywords
  const [editingKeywordId, setEditingKeywordId] = useState(null);
  const [editingKeywordRank, setEditingKeywordRank] = useState(1);

  // CRUD Operations Handlers
  const handleDeleteKeyword = (id) => {
    setKeywords(prev => prev.filter(k => k.id !== id));
  };

  const handleStartEditRank = (kw) => {
    setEditingKeywordId(kw.id);
    setEditingKeywordRank(kw.current_ranking || 10);
  };

  const handleSaveRank = (id) => {
    setKeywords(prev => prev.map(k => k.id === id ? { ...k, current_ranking: parseInt(editingKeywordRank) || 10 } : k));
    setEditingKeywordId(null);
  };

  const handleAddPlan = (e) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;
    setPlans(prev => [
      ...prev,
      { id: Date.now(), name: newPlanName, keywordCount: 0, budget: newPlanBudget, status: 'Planning' }
    ]);
    setNewPlanName('');
  };

  const handleDeletePlan = (id) => {
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  const handleAddMapping = (e) => {
    e.preventDefault();
    if (!newMapKeyword.trim() || !newMapUrl.trim()) return;
    setMappings(prev => [
      ...prev,
      { id: Date.now(), keyword: newMapKeyword, url: newMapUrl, status: 'Pending Review' }
    ]);
    setNewMapKeyword('');
    setNewMapUrl('');
  };

  const handleDeleteMapping = (id) => {
    setMappings(prev => prev.filter(m => m.id !== id));
  };

  const handleAddCluster = (e) => {
    e.preventDefault();
    if (!newClusterName.trim()) return;
    const splitKws = newClusterKeywordsText.split(',').map(s => s.trim()).filter(Boolean);
    setClusters(prev => [
      ...prev,
      { id: Date.now(), name: newClusterName, keywords: splitKws, count: splitKws.length }
    ]);
    setNewClusterName('');
    setNewClusterKeywordsText('');
  };

  const handleDeleteCluster = (id) => {
    setClusters(prev => prev.filter(c => c.id !== id));
  };

  const handleAddCompetitor = (e) => {
    e.preventDefault();
    if (!newCompDomain.trim()) return;
    setCompetitors(prev => [
      ...prev,
      { id: Date.now(), domain: newCompDomain, overlap: '12%', keywordsRanked: 15 }
    ]);
    setNewCompDomain('');
  };

  const handleDeleteCompetitor = (id) => {
    setCompetitors(prev => prev.filter(c => c.id !== id));
  };

  // Tab mapping constants
  const tabsList = [
    'Keyword Research',
    'Keyword Planner',
    'Keyword Mapping',
    'Keyword Clusters',
    'Search Intent',
    'Keyword Opportunities',
    'Competitor Keywords',
    'Keyword Ranking',
    'Lost Keywords',
    'Seasonal Keywords'
  ];

  const loadProjectData = async (proj) => {
    try {
      const pRes = await fetch(`${API_BASE_URL}/projects/${proj.id}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProject(pData);
      }

      const sRes = await fetch(`${API_BASE_URL}/marketing/seo?project_id=${proj.id}`);
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.success && sData.data.length > 0) {
          setKeywords(sData.data);
        } else {
          // Mock data fallback if DB keywords are empty
          setKeywords([
            { id: 101, keyword: 'keyword research tool', target_url: 'https://www.technova.com', current_ranking: 32, search_volume: 12100, competition: 'Medium', intent: 'Informational', cpc: 1.25, opportunity: 85 },
            { id: 102, keyword: 'best seo tools', target_url: 'https://www.technova.com', current_ranking: 28, search_volume: 9900, competition: 'High', intent: 'Commercial', cpc: 2.45, opportunity: 78 },
            { id: 103, keyword: 'on page seo checklist', target_url: 'https://www.technova.com', current_ranking: 24, search_volume: 6600, competition: 'Low', intent: 'Informational', cpc: 1.02, opportunity: 72 },
            { id: 104, keyword: 'technical seo audit', target_url: 'https://www.technova.com', current_ranking: 41, search_volume: 5400, competition: 'High', intent: 'Commercial', cpc: 3.12, opportunity: 68 },
            { id: 105, keyword: 'link building strategies', target_url: 'https://www.technova.com', current_ranking: 36, search_volume: 4400, competition: 'Medium', intent: 'Informational', cpc: 1.85, opportunity: 64 },
          ]);
        }
      }
    } catch (err) {
      console.error('Error loading project database keywords:', err);
    }
  };

  const handleProjectChange = (proj) => {
    loadProjectData(proj);
  };

  const handleAddKeyword = async (e) => {
    e.preventDefault();
    if (!project || !newKeywordText.trim()) return;

    try {
      const volumeNum = parseInt(newKeywordVolume.replace(/[^\d]/g, '')) || 1000;
      const response = await fetch(API_BASE_URL + '/marketing/seo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: project.id,
          keyword: newKeywordText,
          target_url: `https://www.${project.name.toLowerCase().replace(/ /g, '')}.com`,
          target_ranking: 1
        })
      });

      if (response.ok) {
        // Optimistically add to UI list
        setKeywords(prev => [
          ...prev,
          {
            id: Date.now(),
            keyword: newKeywordText,
            target_url: `https://www.${project.name.toLowerCase().replace(/ /g, '')}.com`,
            current_ranking: Math.floor(Math.random() * 40) + 10,
            search_volume: volumeNum,
            competition: 'Medium',
            intent: newKeywordIntent,
            cpc: 1.50,
            opportunity: 70
          }
        ]);
        setNewKeywordText('');
        setIsAddModalOpen(false);
      }
    } catch (err) {
      console.error('Error submitting new keyword:', err);
    }
  };

  // Filtered keywords list based on search bar queries
  const filteredKeywords = keywords.filter(k =>
    k.keyword.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-slate-50 min-h-screen font-sans pb-10">

      {/* Top Header / Breadcrumb Navbar */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl  text-slate-900 m-0">Keyword Management {project ? `for ${project.name}` : ''}</h1>
          <SeoGmbProjectSelector onProjectChange={handleProjectChange} />
        </div>

        <div className="flex items-center gap-4">
          <button className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer">
            <Calendar size={14} /> May 8 - May 15, 2026
          </button>
          <button className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer">
            <Download size={14} /> Export Report
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 border-none text-white rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus size={14} /> Add Keyword
          </button>
        </div>
      </div>

      <div className="px-6 py-4">
        {/* Subtitle description */}
        <p className="text-xs text-slate-400 m-0 mb-6">
          Research, analyze and manage keywords to boost your SEO performance
        </p>

        {/* Wizard Tabs Navigation */}
        <div className="flex gap-2 border-b border-slate-200 mb-6 bg-white p-1 rounded border">
          {tabsList.map(tab => {
            const isTabActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-1 rounded text-xs  cursor-pointer border-none outline-none transition-all ${isTabActive
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500 '
                  : 'text-slate-500 hover:bg-slate-50'
                  }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* ── Tab 1: Keyword Research Overview ── */}
        {activeTab === 'Keyword Research' && (
          <div className="flex flex-col gap-6">

            {/* Overview stats cards + Trend line chart + Top performing keywords */}
            <div className="grid grid-cols-3 gap-2">

              {/* Left Column: Research Overview Metrics */}
              <div className="bg-white rounded-2xl p-2 border border-slate-200 col-span-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm  text-slate-900 m-0">Keyword Research Overview</h3>
                  <p className="text-xs text-slate-400 m-0 mt-0.5 mb-5">Discover new keyword ideas and analyze their potential.</p>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Total Keywords', value: '4,782', change: '12.4%', up: true },
                      { label: 'Total Searches', value: '2.1M', change: '8.6%', up: true },
                      { label: 'Avg. KD', value: '34', change: '4.2%', up: false },
                      { label: 'Opportunities', value: '1,248', change: '16.8%', up: true },
                    ].map((stat, i) => (
                      <div key={i} className="border border-slate-100 rounded p-3 bg-slate-50/50">
                        <span className="text-xs text-slate-400  block">{stat.label}</span>
                        <strong className="text-lg  text-slate-900 mt-1 block">{stat.value}</strong>
                        <div className="flex items-center gap-1 mt-1 text-[9px] ">
                          {stat.up ? <ArrowUpRight size={10} className="text-emerald-500" /> : <ArrowDownRight size={10} className="text-emerald-500" />}
                          <span className="text-emerald-600">{stat.change} vs last 7 days</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Middle Column: Keyword Trend line chart */}
              <div className="bg-white rounded-2xl p-2 border border-slate-200 col-span-1">
                <h3 className="text-sm  text-slate-900 m-0 mb-4">Keyword Trend</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={TREND_CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="volume" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Right Column: Top Performing Keywords */}
              <div className="bg-white rounded-2xl p-2 border border-slate-200 col-span-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm  text-slate-900 m-0">Top Performing Keywords</h3>
                    <button className="bg-transparent border-none text-blue-500 hover:text-blue-700 text-xs  cursor-pointer">View All</button>
                  </div>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-400  text-left">
                        <th className="py-2 px-2">Keyword</th>
                        <th className="py-2 px-2">Position</th>
                        <th className="py-2 px-2">Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKeywords.slice(0, 4).map((kw, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="py-2 px-2  text-slate-700">{kw.keyword}</td>
                          <td className="py-2 px-2  text-slate-600">{kw.current_ranking < 10 ? kw.current_ranking : Math.floor(Math.random() * 5) + 1}</td>
                          <td className="py-2 px-2 text-slate-500">{(kw.search_volume || 1200).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Keyword Ideas Table list with search and filters */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm  text-slate-900 m-0">Keyword Ideas</h3>

                {/* Filters toolbar */}
                <div className="flex gap-2 items-center text-xs">
                  <div className="relative">
                    <Search size={14} color="#94A3B8" className="absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search keyword..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="border border-slate-200 rounded py-1.5 pl-8 pr-3 outline-none w-[180px] bg-slate-50/50 font-medium focus:border-blue-500"
                    />
                  </div>
                  <select className="border border-slate-200 rounded p-1.5 outline-none bg-slate-50/50 font-medium">
                    <option>Volume</option>
                  </select>
                  <select className="border border-slate-200 rounded p-1.5 outline-none bg-slate-50/50 font-medium">
                    <option>KD</option>
                  </select>
                  <select className="border border-slate-200 rounded p-1.5 outline-none bg-slate-50/50 font-medium">
                    <option>CPC</option>
                  </select>
                  <select className="border border-slate-200 rounded p-1.5 outline-none bg-slate-50/50 font-medium">
                    <option>Intent</option>
                  </select>
                  <button className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700  p-2 rounded cursor-pointer">
                    Reset
                  </button>
                  <button className="bg-blue-500 hover:bg-blue-600 text-white  px-4 py-1.5 rounded border-none cursor-pointer transition-colors">
                    Apply Filters
                  </button>
                </div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse text-xs text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500  text-xs ">
                    <th className="py-3 px-3 w-8"><input type="checkbox" className="rounded" /></th>
                    <th className="py-3 px-3">Keyword</th>
                    <th className="py-3 px-3">Intent</th>
                    <th className="py-3 px-3">Volume</th>
                    <th className="py-3 px-3">KD %</th>
                    <th className="py-3 px-3">CPC (USD)</th>
                    <th className="py-3 px-3">Competition</th>
                    <th className="py-3 px-3">Opportunity Score</th>
                    <th className="py-3 px-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeywords.map((kw, i) => (
                    <tr key={kw.id || i} className="border-b border-slate-100 hover:bg-slate-50/40">
                      <td className="py-3 px-3"><input type="checkbox" className="rounded" /></td>
                      <td className="py-3 px-3  text-slate-900">{kw.keyword}</td>
                      <td className="py-3 px-3">
                        <span className="text-xs  px-2 py-0.5 rounded-full border" style={{
                          color: INTENT_COLORS[kw.intent] || '#6B7280',
                          backgroundColor: `${INTENT_COLORS[kw.intent]}15`,
                          borderColor: `${INTENT_COLORS[kw.intent]}25`
                        }}>
                          {kw.intent || 'Informational'}
                        </span>
                      </td>
                      <td className="py-3 px-3  text-slate-800">{(kw.search_volume || 1200).toLocaleString()}</td>
                      <td className="py-3 px-3">
                        {editingKeywordId === kw.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editingKeywordRank}
                              onChange={e => setEditingKeywordRank(e.target.value)}
                              className="w-12 border border-slate-200 rounded p-1 outline-none "
                            />
                            <button
                              onClick={() => handleSaveRank(kw.id)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded p-1 border-none cursor-pointer flex items-center justify-center w-5 h-5"
                            >
                              <Check size={10} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${(kw.current_ranking || 32) > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`} />
                            <span className=" text-slate-800">{kw.current_ranking || 32}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-500">${(kw.cpc || 1.25).toFixed(2)}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs  px-2 py-0.5 rounded ${(kw.competition || 'Medium') === 'High' ? 'bg-red-50 text-red-600' : (kw.competition || 'Medium') === 'Low' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                          {kw.competition || 'Medium'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="relative w-8 h-8 flex items-center justify-center">
                          <svg width="30" height="30" viewBox="0 0 32 32">
                            <circle cx="16" cy="16" r="13" fill="none" stroke="#F1F5F9" strokeWidth="2" />
                            <circle cx="16" cy="16" r="13" fill="none" stroke="#10B981" strokeWidth="2"
                              strokeDasharray="81.6" strokeDashoffset={81.6 - (81.6 * (kw.opportunity || 70)) / 100}
                              strokeLinecap="round" transform="rotate(-90 16 16)" />
                          </svg>
                          <span className="absolute text-[8px]  text-slate-900">{kw.opportunity || 70}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleStartEditRank(kw)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded p-1 cursor-pointer"
                            title="Edit Rank"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteKeyword(kw.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded p-1 cursor-pointer"
                            title="Delete Keyword"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table pagination footer */}
              <div className="flex justify-between items-center mt-5 text-xs text-slate-400">
                <span>Showing 1 to {filteredKeywords.length} of {keywords.length} results</span>
                <div className="flex gap-1.5 items-center ">
                  <button className="border border-slate-200 bg-white rounded px-2.5 py-1.5 hover:bg-slate-50 cursor-pointer">&larr;</button>
                  <button className="border border-blue-500 bg-blue-50 text-blue-600 rounded p-2 cursor-pointer">1</button>
                  <button className="border border-slate-200 bg-white rounded p-2 hover:bg-slate-50 cursor-pointer">2</button>
                  <button className="border border-slate-200 bg-white rounded px-2.5 py-1.5 hover:bg-slate-50 cursor-pointer">&rarr;</button>
                </div>
              </div>
            </div>

            {/* Bottom charts grid row */}
            <div className="grid grid-cols-3 gap-2">
              {/* Donut intent chart */}
              <div className="bg-white rounded-2xl p-2 border border-slate-200 col-span-1">
                <h3 className="text-sm  text-slate-900 m-0 mb-4">Keyword Intent Distribution</h3>
                <div className="flex items-center justify-around">
                  <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                    <PieChart width={110} height={110}>
                      <Pie data={[
                        { name: 'Informational', value: 2156, color: '#3B82F6' },
                        { name: 'Commercial', value: 1358, color: '#F97316' },
                        { name: 'Navigational', value: 678, color: '#10B981' },
                        { name: 'Transactional', value: 590, color: '#8B5CF6' }
                      ]} cx={51} cy={51} innerRadius={35} outerRadius={48} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                        <Cell fill="#3B82F6" />
                        <Cell fill="#F97316" />
                        <Cell fill="#10B981" />
                        <Cell fill="#8B5CF6" />
                      </Pie>
                    </PieChart>
                    <div className="absolute text-center">
                      <div className="text-base font-extrabold text-slate-900">4,782</div>
                      <div className="text-[8px] text-slate-400 ">Total Keywords</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 text-xs">
                    {[
                      { name: 'Informational', value: '2,156 (45.1%)', color: '#3B82F6' },
                      { name: 'Commercial', value: '1,358 (28.4%)', color: '#F97316' },
                      { name: 'Navigational', value: '678 (14.2%)', color: '#10B981' },
                      { name: 'Transactional', value: '590 (12.3%)', color: '#8B5CF6' }
                    ].map((intent, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: intent.color }} />
                        <span className="text-slate-500 w-16 truncate font-medium">{intent.name}</span>
                        <span className=" text-slate-900">{intent.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Horizontal Bar: Top SERP Features */}
              <div className="bg-white rounded-2xl p-2 border border-slate-200 col-span-1">
                <h3 className="text-sm  text-slate-900 m-0 mb-4">Top SERP Features</h3>
                <div className="flex flex-col gap-3 text-xs">
                  {[
                    { label: 'Featured Snippet', value: 1892, pct: '39.6%', color: 'bg-blue-500' },
                    { label: 'People Also Ask', value: 1456, pct: '30.5%', color: 'bg-emerald-500' },
                    { label: 'Image Pack', value: 1024, pct: '21.4%', color: 'bg-amber-500' },
                    { label: 'Video', value: 786, pct: '16.4%', color: 'bg-purple-500' },
                    { label: 'Site Links', value: 642, pct: '13.4%', color: 'bg-indigo-500' },
                  ].map((serp, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center  text-slate-600 text-xs">
                        <span>{serp.label}</span>
                        <span className="text-slate-900 ">{serp.value.toLocaleString()} ({serp.pct})</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full ${serp.color}`} style={{ width: serp.pct }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vertical Bar: Difficulty Distribution */}
              <div className="bg-white rounded-2xl p-2 border border-slate-200 col-span-1">
                <h3 className="text-sm  text-slate-900 m-0 mb-4">Keyword Difficulty Distribution</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={DIFFICULTY_DIST_DATA} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 7, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {DIFFICULTY_DIST_DATA.map((e, idx) => (
                        <Cell key={idx} fill={e.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Tip bar */}
            <div className="flex gap-2 items-center bg-blue-50 border border-blue-100 rounded p-3 px-4 mt-5">
              <Info size={15} className="text-blue-600 shrink-0" />
              <span className="text-xs text-blue-900 font-medium">
                Tip: Use filters to find high-potential keywords with low competition and optimize your content strategy.
              </span>
            </div>
          </div>
        )}

        {/* ── Tab 2: Keyword Planner ── */}
        {activeTab === 'Keyword Planner' && (
          <div className="flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm  text-slate-900 m-0">Campaign Search Planner</h3>
                  <p className="text-xs text-slate-400 m-0 mt-1">Organize keywords into custom ad groups and forecast search traffic parameters.</p>
                </div>
                <form onSubmit={handleAddPlan} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="New Plan Name..."
                    value={newPlanName}
                    onChange={e => setNewPlanName(e.target.value)}
                    className="border border-slate-200 rounded py-1.5 px-3 outline-none text-xs w-[160px]"
                    required
                  />
                  <input
                    type="text"
                    value={newPlanBudget}
                    onChange={e => setNewPlanBudget(e.target.value)}
                    className="border border-slate-200 rounded py-1.5 px-3 outline-none text-xs w-[80px]"
                    placeholder="Budget"
                  />
                  <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white  p-2 rounded border-none text-xs cursor-pointer flex items-center gap-1 transition-colors">
                    <Plus size={13} /> Create Plan
                  </button>
                </form>
              </div>

              <table className="w-full border-collapse text-xs text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-400  text-left ">
                    <th className="py-2.5 px-3">Plan Name</th>
                    <th className="py-2.5 px-3">Keywords Grouped</th>
                    <th className="py-2.5 px-3">Forecasted Monthly Clicks</th>
                    <th className="py-2.5 px-3">Ad Group Budget</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-3 px-3  text-slate-800">{row.name}</td>
                      <td className="py-3 px-3  text-slate-600">{row.keywordCount} keywords</td>
                      <td className="py-3 px-3 font-medium text-slate-500">{(row.keywordCount * 240).toLocaleString()} clicks</td>
                      <td className="py-3 px-3  text-slate-700">{row.budget}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs  px-2 py-0.5 rounded ${row.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                          }`}>{row.status}</span>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleDeletePlan(row.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded p-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab 3: Keyword Mapping ── */}
        {activeTab === 'Keyword Mapping' && (
          <div className="flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm  text-slate-900 m-0">Target URL Keyword Mapping</h3>
                  <p className="text-xs text-slate-400 m-0 mt-1">Map targeted search phrases to landing pages to prevent keyword cannibalization.</p>
                </div>
                <form onSubmit={handleAddMapping} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Keyword..."
                    value={newMapKeyword}
                    onChange={e => setNewMapKeyword(e.target.value)}
                    className="border border-slate-200 rounded py-1.5 px-3 outline-none text-xs w-[130px]"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Destination URL..."
                    value={newMapUrl}
                    onChange={e => setNewMapUrl(e.target.value)}
                    className="border border-slate-200 rounded py-1.5 px-3 outline-none text-xs w-[200px]"
                    required
                  />
                  <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white  p-2 rounded border-none text-xs cursor-pointer flex items-center gap-1 transition-colors">
                    <Plus size={13} /> Map URL
                  </button>
                </form>
              </div>

              <table className="w-full border-collapse text-xs text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-400  text-left ">
                    <th className="py-2.5 px-3">Keyword</th>
                    <th className="py-2.5 px-3">Mapped Landing Page URL</th>
                    <th className="py-2.5 px-3">Validation Status</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-3 px-3  text-slate-800">{row.keyword}</td>
                      <td className="py-3 px-3 text-blue-500 font-medium">{row.url}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs  px-2 py-0.5 rounded ${row.status === 'Synced' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}>{row.status}</span>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleDeleteMapping(row.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded p-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab 4: Keyword Clusters ── */}
        {activeTab === 'Keyword Clusters' && (
          <div className="flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm  text-slate-900 m-0">Semantic Clustering</h3>
                  <p className="text-xs text-slate-400 m-0 mt-1">Group keywords dynamically into parent search intent pillars to scale content writing.</p>
                </div>
                <form onSubmit={handleAddCluster} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Cluster Name..."
                    value={newClusterName}
                    onChange={e => setNewClusterName(e.target.value)}
                    className="border border-slate-200 rounded py-1.5 px-3 outline-none text-xs w-[140px]"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Keywords (comma-separated)..."
                    value={newClusterKeywordsText}
                    onChange={e => setNewClusterKeywordsText(e.target.value)}
                    className="border border-slate-200 rounded py-1.5 px-3 outline-none text-xs w-[240px]"
                    required
                  />
                  <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white  p-2 rounded border-none text-xs cursor-pointer flex items-center gap-1 transition-colors">
                    <Plus size={13} /> Add Cluster
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {clusters.map((c) => (
                  <div key={c.id} className="border border-slate-200 rounded p-4 flex flex-col justify-between bg-slate-50/30">
                    <div>
                      <div className="flex justify-between items-start">
                        <strong className="text-xs  text-slate-900">{c.name}</strong>
                        <button
                          onClick={() => handleDeleteCluster(c.id)}
                          className="bg-transparent border-none text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <span className="text-xs text-slate-400  block mt-1">{c.count} keywords clustered</span>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {c.keywords.map((k, idx) => (
                          <span key={idx} className="bg-white border border-slate-200 text-xs text-slate-600 px-2 py-0.5 rounded font-medium">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 5: Search Intent ── */}
        {activeTab === 'Search Intent' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-sm  text-slate-900 m-0 mb-2">Search Intent Re-classification</h3>
            <p className="text-xs text-slate-400 m-0 mb-6">Verify and update intent types (Informational, Transactional, Navigational, Commercial).</p>

            <table className="w-full border-collapse text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-400  text-left ">
                  <th className="py-2.5 px-3">Keyword</th>
                  <th className="py-2.5 px-3">Volume</th>
                  <th className="py-2.5 px-3">Current Intent Classification</th>
                  <th className="py-2.5 px-3">Quick Re-classify</th>
                </tr>
              </thead>
              <tbody>
                {keywords.slice(0, 5).map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-3  text-slate-800">{row.keyword}</td>
                    <td className="py-3 px-3  text-slate-600">{(row.search_volume || 1000).toLocaleString()}</td>
                    <td className="py-3 px-3">
                      <span className="text-xs  px-2.5 py-0.5 rounded-full" style={{
                        color: INTENT_COLORS[row.intent || 'Informational'],
                        backgroundColor: `${INTENT_COLORS[row.intent || 'Informational']}15`
                      }}>
                        {row.intent || 'Informational'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={row.intent || 'Informational'}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          setKeywords(prev => prev.map(k => k.id === row.id ? { ...k, intent: nextVal } : k));
                        }}
                        className="border border-slate-200 rounded px-2 py-1 outline-none text-xs bg-white font-medium"
                      >
                        <option>Informational</option>
                        <option>Commercial</option>
                        <option>Navigational</option>
                        <option>Transactional</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab 6: Keyword Opportunities ── */}
        {activeTab === 'Keyword Opportunities' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-sm  text-slate-900 m-0 mb-2">High-Opportunity Keywords (Low Difficulty, High Volume)</h3>
            <p className="text-xs text-slate-400 m-0 mb-6">Quickly add opportunities directly to your tracking dashboard.</p>

            <table className="w-full border-collapse text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-400  text-left ">
                  <th className="py-2.5 px-3">Opportunity Keyword</th>
                  <th className="py-2.5 px-3">Est. Search Volume</th>
                  <th className="py-2.5 px-3">Keyword Difficulty</th>
                  <th className="py-2.5 px-3">CPC (USD)</th>
                  <th className="py-2.5 px-3">Opportunity Score</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 401, keyword: 'local clinic database tracker', vol: 1800, difficulty: 24, cpc: 1.45, opportunity: 92 },
                  { id: 402, keyword: 'gmb map pack ranking advice', vol: 2400, difficulty: 18, cpc: 0.95, opportunity: 88 },
                  { id: 403, keyword: 'hipaa complaint client crm', vol: 3200, difficulty: 29, cpc: 2.80, opportunity: 85 },
                ].map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3.5 px-3  text-slate-800">{row.keyword}</td>
                    <td className="py-3.5 px-3  text-slate-600">{row.vol.toLocaleString()}</td>
                    <td className="py-3.5 px-3  text-emerald-600">{row.difficulty}% (Easy)</td>
                    <td className="py-3.5 px-3 text-slate-500">${row.cpc.toFixed(2)}</td>
                    <td className="py-3.5 px-3  text-slate-900">{row.opportunity}/100</td>
                    <td className="py-3.5 px-3">
                      <button
                        onClick={() => {
                          setKeywords(prev => [
                            ...prev,
                            { id: row.id, keyword: row.keyword, search_volume: row.vol, current_ranking: 99, competition: 'Low', intent: 'Commercial', cpc: row.cpc, opportunity: row.opportunity }
                          ]);
                          alert(`Added "${row.keyword}" to tracking list!`);
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white  px-3 py-1 rounded text-xs border-none cursor-pointer transition-colors"
                      >
                        Track Keyword
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab 7: Competitor Keywords ── */}
        {activeTab === 'Competitor Keywords' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm  text-slate-900 m-0">Competitor SEO Overlap Analysis</h3>
                <p className="text-xs text-slate-400 m-0 mt-1">Track competitor rankings for overlaps with your target keywords.</p>
              </div>
              <form onSubmit={handleAddCompetitor} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Competitor Domain..."
                  value={newCompDomain}
                  onChange={e => setNewCompDomain(e.target.value)}
                  className="border border-slate-200 rounded py-1.5 px-3 outline-none text-xs w-[180px]"
                  required
                />
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white  p-2 rounded border-none text-xs cursor-pointer transition-colors">
                  Add Domain
                </button>
              </form>
            </div>

            <table className="w-full border-collapse text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-400  text-left ">
                  <th className="py-2.5 px-3">Competitor Domain</th>
                  <th className="py-2.5 px-3">Overlap Score</th>
                  <th className="py-2.5 px-3">Common Keywords Ranked</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-3  text-slate-800">{row.domain}</td>
                    <td className="py-3 px-3  text-slate-700">{row.overlap}</td>
                    <td className="py-3 px-3 font-medium text-slate-500">{row.keywordsRanked} keywords</td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleDeleteCompetitor(row.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded p-1 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab 8: Keyword Ranking ── */}
        {activeTab === 'Keyword Ranking' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm  text-slate-900 m-0">Rank History Timeline</h3>
                <p className="text-xs text-slate-400 m-0 mt-1">Average ranking movement timeline chart.</p>
              </div>
              <button
                onClick={() => {
                  alert('Rank Tracking Scan initiated. Updates will reflect shortly.');
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white  p-2 rounded border-none text-xs cursor-pointer flex items-center gap-1 transition-colors"
              >
                <RefreshCw size={13} /> Update Rankings
              </button>
            </div>

            <div className="mb-6 h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { month: 'Jan', rank: 45 },
                  { month: 'Feb', rank: 38 },
                  { month: 'Mar', rank: 32 },
                  { month: 'Apr', rank: 29 },
                  { month: 'May', rank: 24 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748B' }} reversed axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="rank" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <table className="w-full border-collapse text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-400  text-left ">
                  <th className="py-2.5 px-3">Keyword</th>
                  <th className="py-2.5 px-3">First Crawled</th>
                  <th className="py-2.5 px-3">Peak Position</th>
                  <th className="py-2.5 px-3">Current Position</th>
                </tr>
              </thead>
              <tbody>
                {keywords.slice(0, 4).map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-3  text-slate-800">{row.keyword}</td>
                    <td className="py-3 px-3 text-slate-400">May 8, 2026</td>
                    <td className="py-3 px-3  text-emerald-600">#{(row.current_ranking || 10) - 4 > 1 ? (row.current_ranking || 10) - 4 : 1}</td>
                    <td className="py-3 px-3 font-extrabold text-slate-900">#{row.current_ranking || 10}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab 9: Lost Keywords ── */}
        {activeTab === 'Lost Keywords' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-sm  text-slate-900 m-0 mb-2">Lost Rankings Alert</h3>
            <p className="text-xs text-slate-400 m-0 mb-6">Analyze search phrases that recently dropped out of top search results.</p>

            <table className="w-full border-collapse text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-400  text-left ">
                  <th className="py-2.5 px-3">Lost Keyword</th>
                  <th className="py-2.5 px-3">Previous Position</th>
                  <th className="py-2.5 px-3">Current Position</th>
                  <th className="py-2.5 px-3">Drop Margin</th>
                  <th className="py-2.5 px-3">Action Advice</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { kw: 'free crm for clinicians', prev: 4, curr: 18, drop: '-14', advice: 'Update meta descriptions and add image alt text.' },
                  { kw: 'healthcare client management system', prev: 8, curr: 29, drop: '-21', advice: 'Fix broken outbound links on services list page.' }
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3.5 px-3  text-slate-800">{row.kw}</td>
                    <td className="py-3.5 px-3  text-slate-500">#{row.prev}</td>
                    <td className="py-3.5 px-3 font-extrabold text-slate-900">#{row.curr}</td>
                    <td className="py-3.5 px-3  text-red-500">{row.drop} positions</td>
                    <td className="py-3.5 px-3">
                      <button
                        onClick={() => alert(`Content Re-optimization task created for "${row.kw}"!`)}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded  px-3 py-1 text-xs cursor-pointer"
                      >
                        Re-optimize Content
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab 10: Seasonal Keywords ── */}
        {activeTab === 'Seasonal Keywords' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-sm  text-slate-900 m-0 mb-2">Traffic Seasonality Metrics</h3>
            <p className="text-xs text-slate-400 m-0 mb-6">Review keyword volume fluctuations across seasonal calendar periods.</p>

            <table className="w-full border-collapse text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-400  text-left ">
                  <th className="py-2.5 px-3">Seasonal Keyword</th>
                  <th className="py-2.5 px-3">Base Volume</th>
                  <th className="py-2.5 px-3">Peak Season Month</th>
                  <th className="py-2.5 px-3">Peak Volume Multiplier</th>
                  <th className="py-2.5 px-3">Optimization Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { kw: 'tax filing software for clinic', base: 450, month: 'March / April', mult: 'x4.2 traffic surge', status: 'Optimized', color: 'bg-emerald-50 text-emerald-600' },
                  { kw: 'back to school medical checkup requirements', base: 320, month: 'August', mult: 'x6.8 traffic surge', status: 'Pending Review', color: 'bg-amber-50 text-amber-600' }
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3.5 px-3  text-slate-800">{row.kw}</td>
                    <td className="py-3.5 px-3  text-slate-600">{row.base}</td>
                    <td className="py-3.5 px-3  text-slate-700">{row.month}</td>
                    <td className="py-3.5 px-3 text-blue-600 ">{row.mult}</td>
                    <td className="py-3.5 px-3">
                      <span className={`text-xs  px-2 py-0.5 rounded ${row.color}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ── Add Keyword Modal ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/45" onClick={() => setIsAddModalOpen(false)} />
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 w-[420px] relative z-10 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5 mb-4">
              <h3 className="text-sm font-extrabold text-slate-900 m-0">Add Target Keyword</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="bg-transparent border-none text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddKeyword} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs  text-slate-700 mb-1.5">Keyword Name*</label>
                <input
                  type="text"
                  placeholder="e.g. enterprise cloud implementation"
                  value={newKeywordText}
                  onChange={e => setNewKeywordText(e.target.value)}
                  className="w-full border border-slate-200 rounded p-2.5 outline-none font-medium focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs  text-slate-700 mb-1.5">Search Volume*</label>
                <input
                  type="text"
                  value={newKeywordVolume}
                  onChange={e => setNewKeywordVolume(e.target.value)}
                  className="w-full border border-slate-200 rounded p-2.5 outline-none font-medium focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs  text-slate-700 mb-1.5">Search Intent*</label>
                <select
                  value={newKeywordIntent}
                  onChange={e => setNewKeywordIntent(e.target.value)}
                  className="w-full border border-slate-200 rounded p-2.5 outline-none font-medium focus:border-blue-500 appearance-none bg-transparent"
                >
                  <option>Informational</option>
                  <option>Commercial</option>
                  <option>Navigational</option>
                  <option>Transactional</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end mt-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700  p-2 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white  px-5 py-2 rounded border-none cursor-pointer transition-colors"
                >
                  Add Keyword
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

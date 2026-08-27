import React, { useState, useEffect } from 'react';
import SeoGmbProjectSelector from './SeoGmbProjectSelector';
import {

  CheckCircle, ChevronRight, Edit3, MoreHorizontal, ArrowUpRight, ArrowDownRight,
  Search, Bell, Calendar, MessageSquare, Plus, PlusCircle, FileText, Globe, Sliders, ChevronDown,
  Check, Target, Zap, Link, MapPin, Users, Lock, Server, Trash2, ClipboardList, Info, Shield, HelpCircle, Activity, TrendingUp,
  Folder, Laptop, Settings, Mail, Phone, Clock, AlertTriangle, UserCheck
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function SeoGmbProjectSetupPage() {
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [activeTab, setActiveTab] = useState('Project Onboarding');
  const [createStep, setCreateStep] = useState(1);
  const [project, setProject] = useState(null);

  // Edit Mode state values
  const [projectName, setProjectName] = useState('TechNova Solutions');
  const [clientName, setClientName] = useState('TechNova Solutions Pvt. Ltd.');
  const [packagePlan, setPackagePlan] = useState('Premium SEO');
  const [projectType, setProjectType] = useState('SEO Campaign');
  const [industry, setIndustry] = useState('Software / Technology');
  const [budget, setBudget] = useState('₹ 2,50,000 / Month');
  const [projectManager, setProjectManager] = useState('Emma Johnson');
  const [startDate, setStartDate] = useState('15/04/2026');
  const [endDate, setEndDate] = useState('15/04/2027');
  const [description, setDescription] = useState('This project aims to improve organic visibility...');

  // Edit Mode goals list
  const [goals, setGoals] = useState([
    { text: 'Increase Organic Traffic by 20%', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { text: 'Rank 50 Keywords in Top 10', color: 'bg-green-50 text-green-700 border-green-200' },
    { text: 'Generate 200+ Qualified Leads', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { text: 'Improve Brand Visibility', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  ]);
  const [newGoalText, setNewGoalText] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  // Edit Mode competitors list
  const [competitors, setCompetitors] = useState([
    { domain: 'competitor1.com', da: 45, traffic: '12,500', keywords: '1,250' },
    { domain: 'competitor2.com', da: 38, traffic: '8,200', keywords: '980' },
    { domain: 'competitor3.com', da: 41, traffic: '6,800', keywords: '870' },
  ]);
  const [newCompDomain, setNewCompDomain] = useState('');

  // ─── ADD NEW PROJECT WIZARD STATES ───
  const [newProj, setNewProj] = useState({
    name: '',
    type: 'SEO Project', // SEO Project / GMB Project / Both
    businessName: '',
    websiteUrl: '',
    industry: 'Software / Technology',
    description: '',
    owner: 'Emma Johnson',
    country: 'United States',
    city: '',
    timezone: '(GMT+05:30) Asia/Kolkata',
    startDate: '',
    tags: '',
    audience: 'Local', // Local / National / Global
    budget: '250000',
    primaryKpi: 'Organic Traffic',
    kpiTarget: '',
    kpiTimeframe: '6 Months',
    seoEngine: 'Google USA',
    seoLanguage: 'English',
    seoCrawlSchedule: 'Weekly',
    seoKeywords: '',
    gmbStoreCode: '',
    gmbCategory: 'Software Company',
    gmbServices: '',
    gmbSyncEnabled: true,
    trackingConsoleUrl: '',
    trackingGaId: '',
    trackingGtmId: '',
    teamManager: 'Emma Johnson',
    teamExecutives: 'Daniel Martinez',
    notifDigest: 'Weekly',
    notifInstantAlerts: true
  });

  const [newProjGoals, setNewProjGoals] = useState({
    'Improve Search Rankings': false,
    'Increase Organic Traffic': false,
    'Generate More Leads': false,
    'Improve Website Audit Score': false,
    'Google Business Profile Optimization': true,
    'Increase Map Visibility': false,
    'Improve Local SEO': false,
    'Increase Reviews & Ratings': false,
    'Brand Awareness': false,
    'Competitor Outranking': false,
    'Fix Technical Issues': false,
    'Content Strategy': false,
    'Link Building': false,
    'Local Citations': false,
    'E-commerce Growth': false,
    'Mobile Visibility': false,
    'Customer Engagement': false,
    'Other': false,
  });

  // SEO Module Toggle states
  const [seoModules, setSeoModules] = useState({
    'Website Audit': true, 'Keyword Research': true, 'Rank Tracking': true, 'On-Page SEO': true,
    'Technical SEO': true, 'Off-Page SEO / Backlinks': true, 'Content Marketing': true, 'Competitor Analysis': true,
    'SEO Reports': true, 'Traffic Analysis': true, 'Google Search Console': true, 'Google Analytics (GA4)': true,
    'Schema Markup': true, 'Broken Link Check': true, 'Page Speed / Core Web Vitals': true, 'Mobile Usability': true,
    'Sitemap & Robots.txt': true, 'Meta Tags Analysis': true, 'Duplicate Content Check': true, 'Content Optimization': true,
    'Internal Linking': true, 'Image SEO': true, 'Redirect Management': true, 'Local SEO': true,
    'Pillar Pages': true, 'Topic Clusters': true, 'Keyword Mapping': true, 'URL Analysis': true,
    'Canonicalization': true, 'Social Signals': true, 'Newsletter / Email SEO': true
  });

  // GMB Module Toggle states
  const [gmbModules, setGmbModules] = useState({
    'Business Profile Management': true, 'Business Information': true, 'Categories & Services': true,
    'Products Management': true, 'Service Areas': true, 'Business Hours': true, 'Holiday Hours': true,
    'Google Posts / Updates': true, 'Review Management': true, 'Review Replies': true, 'Questions & Answers': true,
    'Messaging': true, 'Calls & Bookings': true, 'Directions & Insights': true, 'Photos & Videos': true,
    'Logo & Cover Images': true, 'GMB Insights': true, 'Local SEO & Citations': true, 'NAP Management': true,
    'Local Keywords': true, 'Geo Rankings': true, 'Local Competitors': true, 'Local Backlinks': true
  });

  const [newProjCompetitors, setNewProjCompetitors] = useState(['competitor1.com', 'competitor2.com', 'competitor3.com']);
  const [newProjKpis, setNewProjKpis] = useState([
    { primaryKpi: 'Organic Traffic', targetValue: '50k visitors/mo', timeframe: '6 Months' }
  ]);

  // Options toggles
  const [optEngineTracking, setOptEngineTracking] = useState(true);
  const [optCompetitorMonitoring, setOptCompetitorMonitoring] = useState(true);
  const [optAiRecs, setOptAiRecs] = useState(true);
  const [optAdvancedAlerts, setOptAdvancedAlerts] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'create') {
      setIsCreateMode(true);
      setCreateStep(1);
    } else {
      setIsCreateMode(false);
    }
  }, []);

  const loadProjectData = async (proj) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${proj.id}`);
      if (response.ok) {
        const pData = await response.json();
        setProject(pData);
        setProjectName(pData.name || '');
        setClientName(pData.company_name || pData.name || '');
        setBudget(`₹ ${parseFloat(pData.budget || 250000).toLocaleString()} / Month`);
        setStartDate(pData.start_date ? new Date(pData.start_date).toLocaleDateString('en-GB') : '15/04/2026');
        setEndDate(pData.due_date ? new Date(pData.due_date).toLocaleDateString('en-GB') : '15/04/2027');
        setProjectManager(`${pData.manager_first_name || 'Emma'} ${pData.manager_last_name || 'Johnson'}`);
        setDescription(pData.description || '');
      }
    } catch (err) {
      console.error('Error loading project details:', err);
    }
  };

  const handleSaveProject = async () => {
    if (!project) return;
    try {
      const numericBudget = parseFloat(budget.replace(/[^\d.]/g, '')) || 250000;
      const parseDate = (dStr) => {
        const parts = dStr.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        const dateObj = new Date(dStr);
        if (!isNaN(dateObj.getTime())) return dateObj.toISOString().split('T')[0];
        return null;
      };

      const formattedStart = parseDate(startDate);
      const formattedEnd = parseDate(endDate);

      await fetch(`${API_BASE_URL}/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          budget: numericBudget,
          description: description,
          status: 'Active',
          start_date: formattedStart,
          due_date: formattedEnd,
          progress: tabToPercentage[activeTab],
          priority: 'Medium'
        })
      });
    } catch (err) {
      console.error('Error updating project:', err);
    }
  };

  const handleProjectChange = (proj) => {
    if (!isCreateMode) {
      loadProjectData(proj);
    }
  };

  // Create Project API Call
  const handleCreateProject = async () => {
    try {
      const selectedGoals = Object.keys(newProjGoals).filter(g => newProjGoals[g]);
      const reqBody = {
        name: newProj.name || newProj.businessName || 'Unnamed SEO GMB Project',
        title: `${newProj.type} - ${newProj.businessName || 'Business'}`,
        description: `${newProj.description}\nGoals: ${selectedGoals.join(', ')}\nAudience: ${newProj.audience}`,
        status: 'Active',
        department_id: 8,
        budget: parseFloat(newProj.budget) || 250000,
        start_date: newProj.startDate ? new Date(newProj.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year default
        progress: 17,
        priority: 'Medium'
      };

      const res = await fetch(API_BASE_URL + '/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });

      if (res.ok) {
        const created = await res.json();
        // Set new project as active in localStorage
        localStorage.setItem('seoGmbActiveProjectId', created.id || created.insertId);
        window.location.href = '/seo-gmb/projects';
      } else {
        alert('Failed to create project. Please verify inputs.');
      }
    } catch (err) {
      console.error('Error creating project:', err);
    }
  };

  // Tab mapping constants for Edit wizard
  const tabNames = [
    'Project Onboarding',
    'Website Information',
    'Business Information',
    'Domain & Hosting',
    'Competitor Setup',
    'Monthly Roadmap'
  ];

  const tabToStepNumber = {
    'Project Onboarding': 1,
    'Website Information': 2,
    'Business Information': 3,
    'Domain & Hosting': 4,
    'Competitor Setup': 5,
    'Monthly Roadmap': 6,
  };

  const tabToPercentage = {
    'Project Onboarding': 17,
    'Website Information': 33,
    'Business Information': 50,
    'Domain & Hosting': 67,
    'Competitor Setup': 83,
    'Monthly Roadmap': 100,
  };

  // Handlers for edit wizard navigation
  const handleNextTab = () => {
    handleSaveProject();
    const currentIndex = tabNames.indexOf(activeTab);
    if (currentIndex < tabNames.length - 1) {
      setActiveTab(tabNames[currentIndex + 1]);
    }
  };

  const handlePrevTab = () => {
    handleSaveProject();
    const currentIndex = tabNames.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabNames[currentIndex - 1]);
    }
  };

  const addGoal = () => {
    if (!newGoalText.trim()) return;
    const colors = [
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-green-50 text-green-700 border-green-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-purple-50 text-purple-700 border-purple-200',
    ];
    const randomColor = colors[goals.length % colors.length];
    setGoals([...goals, { text: newGoalText, color: randomColor }]);
    setNewGoalText('');
    setIsAddingGoal(false);
  };

  const removeGoal = (index) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const handleAddCompetitor = (e) => {
    e.preventDefault();
    if (!newCompDomain.trim()) return;
    setCompetitors([
      ...competitors,
      {
        domain: newCompDomain,
        da: Math.floor(Math.random() * 30) + 20,
        traffic: (Math.floor(Math.random() * 10) + 1) + ',500',
        keywords: Math.floor(Math.random() * 800) + 300,
      }
    ]);
    setNewCompDomain('');
  };

  const handleRemoveCompetitor = (index) => {
    setCompetitors(competitors.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans pb-10">

      {/* ─── RENDER ADD NEW PROJECT WIZARD ─── */}
      {isCreateMode ? (
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <div className="bg-white border-b border-slate-200 py-4 px-6 flex items-center justify-between  shrink-0">
            <div>
              <h1 className="text-base  text-slate-900 m-0">Add New Project</h1>
              <p className="text-xs text-slate-400 m-0 mt-0.5">Create and configure your SEO &amp; GMB project</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.href = '/seo-gmb/projects'}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => createStep === 6 ? handleCreateProject() : setCreateStep(s => Math.min(6, s + 1))}
                className="bg-blue-600 hover:bg-blue-700 border-none text-white rounded p-2 text-xs  flex items-center gap-1 cursor-pointer transition-colors"
              >
                {createStep === 6 ? 'Create Project' : 'Save & Continue'} &rarr;
              </button>
            </div>
          </div>

          <div className="flex flex-col flex-1 p-6 gap-6">
            {/* Top Steps Navigation */}
            <div className="w-full shrink-0">
              <div className="bg-white border border-slate-200 rounded-2xl p-2 flex flex-row gap-2  overflow-x-auto no-scrollbar">
                {[
                  { step: 1, title: 'Project Setup', sub: 'Basic project details', icon: ClipboardList },
                  { step: 2, title: 'SEO Settings', sub: 'Configure SEO modules', icon: Globe },
                  { step: 3, title: 'GMB Settings', sub: 'Configure Business Profile', icon: MapPin },
                  { step: 4, title: 'Tracking & Integrations', sub: 'Connect tools & analytics', icon: Link },
                  { step: 5, title: 'Team & Notifications', sub: 'Add team & alert preferences', icon: Users },
                  { step: 6, title: 'Review & Confirm', sub: 'Review all details', icon: CheckCircle },
                ].map((s) => (
                  <button
                    key={s.step}
                    onClick={() => setCreateStep(s.step)}
                    className={`flex-1 min-w-[180px] text-left p-3 rounded border-none cursor-pointer flex items-center gap-3 transition-colors ${createStep === s.step
                      ? 'bg-blue-50 text-blue-600 '
                      : 'bg-transparent text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${createStep === s.step ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                      {s.step}
                    </div>
                    <div>
                      <p className="text-[13px]  m-0 leading-tight">{s.title}</p>
                      <p className="text-xs text-slate-400 m-0 mt-0.5 whitespace-nowrap">{s.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Middle Main Scrollable Panel */}
            <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-2xl p-6  overflow-y-auto max-h-[calc(100vh-210px)]">

              {/* STEP 1: PROJECT SETUP */}
              {createStep === 1 && (
                <div className="flex flex-col gap-6">
                  {/* Title */}
                  <div>
                    <h2 className="text-sm  text-slate-900 m-0">Project Information</h2>
                    <p className="text-xs text-slate-400 m-0 mt-0.5">Provide project name, owners, budget, target audience, and set goals.</p>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Project Name *</label>
                      <input
                        type="text"
                        value={newProj.name}
                        onChange={e => setNewProj(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter project name"
                        className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Business / Website Name *</label>
                      <input
                        type="text"
                        value={newProj.businessName}
                        onChange={e => setNewProj(prev => ({ ...prev, businessName: e.target.value }))}
                        placeholder="Enter business or website name"
                        className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Website URL *</label>
                      <div className="flex border border-slate-200 rounded overflow-hidden focus-within:border-blue-500">
                        <span className="bg-slate-50 text-slate-400 px-2.5 py-2.5 border-r border-slate-200 text-xs select-none">https://</span>
                        <input
                          type="text"
                          value={newProj.websiteUrl}
                          onChange={e => setNewProj(prev => ({ ...prev, websiteUrl: e.target.value }))}
                          placeholder="Enter website URL"
                          className="w-full border-none outline-none px-2.5 font-medium text-slate-800 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Project Type *</label>
                      <select
                        value={newProj.type}
                        onChange={e => setNewProj(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 text-xs  text-slate-800"
                      >
                        <option>SEO Project</option>
                        <option>GMB Project</option>
                        <option>Both SEO &amp; GMB</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Country *</label>
                      <select
                        value={newProj.country}
                        onChange={e => setNewProj(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 text-xs text-slate-800"
                      >
                        <option>United States</option>
                        <option>United Kingdom</option>
                        <option>India</option>
                        <option>Canada</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">City</label>
                      <input
                        type="text"
                        value={newProj.city}
                        onChange={e => setNewProj(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Enter city"
                        className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Project Start Date</label>
                      <input
                        type="date"
                        value={newProj.startDate}
                        onChange={e => setNewProj(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Budget (INR / Month)</label>
                      <input
                        type="number"
                        value={newProj.budget}
                        onChange={e => setNewProj(prev => ({ ...prev, budget: e.target.value }))}
                        className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Project Owner</label>
                      <select
                        value={newProj.owner}
                        onChange={e => setNewProj(prev => ({ ...prev, owner: e.target.value }))}
                        className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 text-xs text-slate-800"
                      >
                        <option>Emma Johnson</option>
                        <option>Daniel Martinez</option>
                        <option>Sophia Davis</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs  text-slate-500  mb-1.5">Project Description</label>
                    <textarea
                      rows={3}
                      value={newProj.description}
                      onChange={e => setNewProj(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter project description, goals, and targets..."
                      className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 text-xs text-slate-800 bg-slate-50/50"
                    />
                  </div>

                  {/* Checklist Section */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="block text-xs  text-slate-500  mb-2">Project Goals (Select all that apply)</label>
                      <div className="grid grid-cols-2 gap-2 text-xs border border-slate-200 rounded p-3 bg-slate-50/30 max-h-48 overflow-y-auto">
                        {Object.keys(newProjGoals).map(g => (
                          <label key={g} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-slate-50 rounded px-1">
                            <input
                              type="checkbox"
                              checked={newProjGoals[g]}
                              onChange={e => setNewProjGoals(prev => ({ ...prev, [g]: e.target.checked }))}
                            />
                            <span className="text-xs text-slate-700 font-medium truncate">{g}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-2">Target Audience</label>
                      <div className="flex gap-4 border border-slate-200 rounded p-4 bg-slate-50/30 justify-around h-[80px] items-center">
                        {['Local', 'National', 'Global'].map(aud => (
                          <label key={aud} className="flex items-center gap-2  text-slate-700 cursor-pointer">
                            <input
                              type="radio"
                              name="audience"
                              value={aud}
                              checked={newProj.audience === aud}
                              onChange={e => setNewProj(prev => ({ ...prev, audience: e.target.value }))}
                            />
                            <span>{aud}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Modules Enable Grid */}
                  <div className="border-t border-slate-100 pt-5">
                    <label className="block text-xs  text-slate-500  mb-3.5">SEO Modules to Enable</label>
                    <div className="grid grid-cols-4 gap-2 border border-slate-200 rounded p-4 bg-slate-50/20 max-h-48 overflow-y-auto">
                      {Object.keys(seoModules).map(m => (
                        <label key={m} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={seoModules[m]} onChange={e => setSeoModules(prev => ({ ...prev, [m]: e.target.checked }))} />
                          <span className="text-xs text-slate-600 truncate">{m}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <label className="block text-xs  text-slate-500  mb-3.5">GMB Modules to Enable</label>
                    <div className="grid grid-cols-3 gap-2 border border-slate-200 rounded p-4 bg-slate-50/20 max-h-48 overflow-y-auto">
                      {Object.keys(gmbModules).map(m => (
                        <label key={m} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={gmbModules[m]} onChange={e => setGmbModules(prev => ({ ...prev, [m]: e.target.checked }))} />
                          <span className="text-xs text-slate-600 truncate">{m}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* KPIs */}
                  <div className="border-t border-slate-100 pt-5">
                    <label className="block text-xs  text-slate-500  mb-3">Project KPIs (Primary Metrics)</label>
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <span className="text-[9px]  text-slate-400">Primary KPI</span>
                        <select value={newProj.primaryKpi} onChange={e => setNewProj(p => ({ ...p, primaryKpi: e.target.value }))} className="w-full border border-slate-200 rounded p-2 mt-1 text-xs">
                          <option>Organic Traffic</option>
                          <option>Keyword Rankings</option>
                          <option>GMB Interactions</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <span className="text-[9px]  text-slate-400">Target Value</span>
                        <input type="text" placeholder="e.g. 50,000 visitors/mo" value={newProj.kpiTarget} onChange={e => setNewProj(p => ({ ...p, kpiTarget: e.target.value }))} className="w-full border border-slate-200 rounded p-2 mt-1 text-xs" />
                      </div>
                      <div className="flex-1">
                        <span className="text-[9px]  text-slate-400">Time Frame</span>
                        <select value={newProj.kpiTimeframe} onChange={e => setNewProj(p => ({ ...p, kpiTimeframe: e.target.value }))} className="w-full border border-slate-200 rounded p-2 mt-1 text-xs">
                          <option>3 Months</option>
                          <option>6 Months</option>
                          <option>12 Months</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Competitors List */}
                  <div className="border-t border-slate-100 pt-5">
                    <label className="block text-xs  text-slate-500  mb-3">Competitors (Add up to 5)</label>
                    <div className="flex flex-col gap-2">
                      {newProjCompetitors.map((comp, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={comp}
                            onChange={e => {
                              const list = [...newProjCompetitors];
                              list[idx] = e.target.value;
                              setNewProjCompetitors(list);
                            }}
                            placeholder="competitor.com"
                            className="flex-1 border border-slate-200 rounded p-2 text-xs"
                          />
                          <button onClick={() => setNewProjCompetitors(prev => prev.filter((_, i) => i !== idx))} className="border border-slate-200 bg-white hover:bg-rose-50 text-rose-500 rounded p-2 cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      {newProjCompetitors.length < 5 && (
                        <button onClick={() => setNewProjCompetitors(prev => [...prev, ''])} className="border border-dashed border-indigo-500 bg-indigo-50/10 text-indigo-600 rounded p-2 text-xs  cursor-pointer w-full text-center mt-1">
                          + Add Competitor Domain
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="border-t border-slate-100 pt-5">
                    <label className="block text-xs  text-slate-500  mb-3">Additional Options</label>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {[
                        { label: 'Allow Search Engine Updates Tracking', state: optEngineTracking, set: setOptEngineTracking },
                        { label: 'Monitor Competitor Changes', state: optCompetitorMonitoring, set: setOptCompetitorMonitoring },
                        { label: 'Send AI Recommendations', state: optAiRecs, set: setOptAiRecs },
                        { label: 'Enable Advanced Alerts', state: optAdvancedAlerts, set: setOptAdvancedAlerts },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between border border-slate-200 rounded p-3 bg-slate-50/10">
                          <span className=" text-slate-600">{item.label}</span>
                          <button
                            type="button"
                            onClick={() => item.set(s => !s)}
                            className={`w-10 h-5.5 rounded-full p-0.5 border-none cursor-pointer transition-colors ${item.state ? 'bg-indigo-600' : 'bg-slate-300'
                              }`}
                          >
                            <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform ${item.state ? 'translate-x-4.5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* STEP 2: SEO SETTINGS */}
              {createStep === 2 && (
                <div className="flex flex-col gap-6 text-xs">
                  <div>
                    <h2 className="text-sm  text-slate-900 m-0">SEO Configuration</h2>
                    <p className="text-xs text-slate-400 m-0 mt-0.5">Specify targeted search engines, target languages, keyword crawls and initial queries.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block  text-slate-500 mb-1.5">Target Search Engine</label>
                      <select value={newProj.seoEngine} onChange={e => setNewProj(p => ({ ...p, seoEngine: e.target.value }))} className="w-full border border-slate-200 rounded p-2.5 text-xs text-slate-800">
                        <option>Google USA</option>
                        <option>Google India</option>
                        <option>Google UK</option>
                        <option>Bing USA</option>
                      </select>
                    </div>
                    <div>
                      <label className="block  text-slate-500 mb-1.5">Language Target</label>
                      <select value={newProj.seoLanguage} onChange={e => setNewProj(p => ({ ...p, seoLanguage: e.target.value }))} className="w-full border border-slate-200 rounded p-2.5 text-xs text-slate-800">
                        <option>English</option>
                        <option>Spanish</option>
                        <option>French</option>
                        <option>German</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block  text-slate-500 mb-1.5">Crawl / Audit Frequency</label>
                    <div className="flex gap-4">
                      {['Daily', 'Weekly', 'Monthly'].map(freq => (
                        <label key={freq} className="flex items-center gap-2 cursor-pointer  text-slate-700">
                          <input type="radio" checked={newProj.seoCrawlSchedule === freq} onChange={() => setNewProj(p => ({ ...p, seoCrawlSchedule: freq }))} />
                          <span>{freq} Audits</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block  text-slate-500 mb-1.5">Initial Target Keywords (One per line or comma-separated)</label>
                    <textarea rows={5} value={newProj.seoKeywords} onChange={e => setNewProj(p => ({ ...p, seoKeywords: e.target.value }))} placeholder="e.g. digital marketing agency, local seo services, technical audit" className="w-full border border-slate-200 rounded p-2.5 text-xs outline-none bg-slate-50/50" />
                  </div>
                </div>
              )}

              {/* STEP 3: GMB SETTINGS */}
              {createStep === 3 && (
                <div className="flex flex-col gap-6 text-xs">
                  <div>
                    <h2 className="text-sm  text-slate-900 m-0">Google Business Profile (GMB) Settings</h2>
                    <p className="text-xs text-slate-400 m-0 mt-0.5">Link and optimize your business page parameters.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block  text-slate-500 mb-1.5">Store / Location Code</label>
                      <input type="text" placeholder="e.g. TECHNOVA-HQ" value={newProj.gmbStoreCode} onChange={e => setNewProj(p => ({ ...p, gmbStoreCode: e.target.value }))} className="w-full border border-slate-200 rounded p-2.5 text-xs text-slate-800" />
                    </div>
                    <div>
                      <label className="block  text-slate-500 mb-1.5">Primary GMB Category</label>
                      <input type="text" placeholder="e.g. Software Company" value={newProj.gmbCategory} onChange={e => setNewProj(p => ({ ...p, gmbCategory: e.target.value }))} className="w-full border border-slate-200 rounded p-2.5 text-xs text-slate-800" />
                    </div>
                  </div>
                  <div>
                    <label className="block  text-slate-500 mb-1.5">GMB Services Provided (Comma-separated)</label>
                    <input type="text" placeholder="e.g. Custom SEO, Local SEO optimization, Review campaign" value={newProj.gmbServices} onChange={e => setNewProj(p => ({ ...p, gmbServices: e.target.value }))} className="w-full border border-slate-200 rounded p-2.5 text-xs text-slate-800" />
                  </div>
                  <div className="flex items-center justify-between border border-slate-200 rounded p-3 bg-slate-50/10">
                    <div>
                      <p className=" text-slate-700 m-0">Auto Sync Reviews and Posts</p>
                      <p className="text-xs text-slate-400 m-0 mt-0.5">Automatically sync customer ratings and Google posts every 2 hours.</p>
                    </div>
                    <button type="button" onClick={() => setNewProj(p => ({ ...p, gmbSyncEnabled: !p.gmbSyncEnabled }))} className={`w-10 h-5.5 rounded-full p-0.5 border-none cursor-pointer transition-colors ${newProj.gmbSyncEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform ${newProj.gmbSyncEnabled ? 'translate-x-4.5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: TRACKING & INTEGRATIONS */}
              {createStep === 4 && (
                <div className="flex flex-col gap-6 text-xs">
                  <div>
                    <h2 className="text-sm  text-slate-900 m-0">Tracking &amp; APIs Connection</h2>
                    <p className="text-xs text-slate-400 m-0 mt-0.5">Connect Google Search Console, Google Analytics and GTM properties.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block  text-slate-500 mb-1.5">Google Search Console Verification URL</label>
                      <input type="text" placeholder="https://www.technova.com" value={newProj.trackingConsoleUrl} onChange={e => setNewProj(p => ({ ...p, trackingConsoleUrl: e.target.value }))} className="w-full border border-slate-200 rounded p-2.5 text-xs text-slate-800" />
                    </div>
                    <div>
                      <label className="block  text-slate-500 mb-1.5">Google Analytics (GA4) Measurement ID</label>
                      <input type="text" placeholder="G-XXXXXXXXXX" value={newProj.trackingGaId} onChange={e => setNewProj(p => ({ ...p, trackingGaId: e.target.value }))} className="w-full border border-slate-200 rounded p-2.5 text-xs text-slate-800" />
                    </div>
                    <div>
                      <label className="block  text-slate-500 mb-1.5">Google Tag Manager Container ID</label>
                      <input type="text" placeholder="GTM-XXXXXXX" value={newProj.trackingGtmId} onChange={e => setNewProj(p => ({ ...p, trackingGtmId: e.target.value }))} className="w-full border border-slate-200 rounded p-2.5 text-xs text-slate-800" />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: TEAM & NOTIFICATIONS */}
              {createStep === 5 && (
                <div className="flex flex-col gap-6 text-xs">
                  <div>
                    <h2 className="text-sm  text-slate-900 m-0">Team Allocation &amp; Alert Settings</h2>
                    <p className="text-xs text-slate-400 m-0 mt-0.5">Set managers, executors, and schedule notifications.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block  text-slate-500 mb-1.5">Assign Lead SEO Manager</label>
                      <select value={newProj.teamManager} onChange={e => setNewProj(p => ({ ...p, teamManager: e.target.value }))} className="w-full border border-slate-200 rounded p-2.5 text-xs text-slate-800">
                        <option>Emma Johnson</option>
                        <option>Daniel Martinez</option>
                      </select>
                    </div>
                    <div>
                      <label className="block  text-slate-500 mb-1.5">Assign SEO Content Writer</label>
                      <select value={newProj.teamExecutives} onChange={e => setNewProj(p => ({ ...p, teamExecutives: e.target.value }))} className="w-full border border-slate-200 rounded p-2.5 text-xs text-slate-800">
                        <option>Sophia Davis</option>
                        <option>Michael Brown</option>
                      </select>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-4 flex flex-col gap-4">
                    <div>
                      <label className="block  text-slate-500 mb-1.5">Email Digest frequency</label>
                      <div className="flex gap-4">
                        {['Daily', 'Weekly', 'Monthly'].map(f => (
                          <label key={f} className="flex items-center gap-2 cursor-pointer ">
                            <input type="radio" checked={newProj.notifDigest === f} onChange={() => setNewProj(p => ({ ...p, notifDigest: f }))} />
                            <span>{f} summaries</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between border border-slate-200 rounded p-3 bg-slate-50/10">
                      <div>
                        <p className=" text-slate-700 m-0">Rank Drop Instant Alert</p>
                        <p className="text-xs text-slate-400 m-0 mt-0.5">Send immediate notification if a target keyword drops out of top 10.</p>
                      </div>
                      <button type="button" onClick={() => setNewProj(p => ({ ...p, notifInstantAlerts: !p.notifInstantAlerts }))} className={`w-10 h-5.5 rounded-full p-0.5 border-none cursor-pointer transition-colors ${newProj.notifInstantAlerts ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                        <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform ${newProj.notifInstantAlerts ? 'translate-x-4.5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: REVIEW & CONFIRM */}
              {createStep === 6 && (
                <div className="flex flex-col gap-6 text-xs">
                  <div>
                    <h2 className="text-sm  text-slate-900 m-0">Review Configuration</h2>
                    <p className="text-xs text-slate-400 m-0 mt-0.5">Review all parameters and click 'Create Project'.</p>
                  </div>
                  <div className="border border-slate-200 rounded p-4 bg-slate-50/20 flex flex-col gap-3.5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-400 ">Project Name:</span>
                        <p className="m-0 mt-0.5 font-black text-slate-800 text-sm">{newProj.name || newProj.businessName || 'Unnamed Project'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 ">Website:</span>
                        <p className="m-0 mt-0.5  text-blue-600">https://{newProj.websiteUrl || 'technova.com'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 ">Project Type:</span>
                        <p className="m-0 mt-0.5  text-slate-700">{newProj.type}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 ">Owner / PM:</span>
                        <p className="m-0 mt-0.5  text-slate-700">{newProj.owner}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 ">Monthly Budget:</span>
                        <p className="m-0 mt-0.5 font-extrabold text-slate-900">₹ {parseFloat(newProj.budget).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 ">Target Audience:</span>
                        <p className="m-0 mt-0.5  text-slate-700">{newProj.audience}</p>
                      </div>
                    </div>
                    <div className="border-t border-slate-200 pt-3">
                      <span className="text-slate-400 ">Selected Goals:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {Object.keys(newProjGoals).filter(g => newProjGoals[g]).map(g => (
                          <span key={g} className="bg-indigo-50 border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded text-xs ">{g}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Right Panel "What's Next" & Checkbox List */}
            <div className="w-64 shrink-0 flex flex-col gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-2 ">
                <h3 className="text-xs  text-slate-900 m-0 mb-3.5">What's Next?</h3>
                <div className="flex flex-col gap-3">
                  {[
                    { text: 'Complete all steps', checked: true },
                    { text: 'Review project summary', checked: createStep === 6 },
                    { text: "Click 'Create Project' to get started", checked: createStep === 6 }
                  ].map((x, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${x.checked ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span className={x.checked ? 'text-slate-700 ' : 'text-slate-400'}>
                        {x.text}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleCreateProject}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2.5 mt-5 text-xs font-black border-none cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CheckCircle size={13} /> Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ─── RENDER STANDARD EDIT PROJECT WIZARD ─── */
        <>
          {/* Breadcrumbs Header */}
          <div className="bg-white border-b border-slate-200 py-3.5 px-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>SEO Projects</span>
              <ChevronRight size={14} />
              <SeoGmbProjectSelector onProjectChange={handleProjectChange} />
              <ChevronRight size={14} />
              <span className="text-slate-900 ">Project Setup</span>
            </div>
          </div>

          <div className="p-4">
            {/* Project Header Card */}
            <div className="flex items-center justify-between mb-5 ">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 text-white text-2xl  rounded w-14 h-14 flex items-center justify-center">
                  {projectName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl  text-slate-900 m-0">{projectName}</h1>
                    <span className="bg-green-100 text-green-700 text-xs  px-2.5 py-0.5 rounded-full">Active</span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-4 mt-1">
                    <span className="text-blue-500 hover:underline cursor-pointer">www.technova.com</span>
                    <span>•</span>
                    <span>Software / Technology</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1"><Globe size={13} /> United States</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1"><Users size={13} /> Project Manager: {projectManager}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setIsCreateMode(true)} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer">
                  <PlusCircle size={14} className="text-blue-500" /> Add New Project
                </button>
                <button onClick={handleSaveProject} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer">
                  <Edit3 size={14} /> Save Project
                </button>
                <button
                  onClick={handleNextTab}
                  disabled={activeTab === 'Monthly Roadmap'}
                  className={`rounded p-2 text-xs  flex items-center gap-1.5 border-none cursor-pointer text-white transition-colors ${activeTab === 'Monthly Roadmap' ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                >
                  Save &amp; Continue <ChevronRight size={14} />
                </button>
              </div>
            </div>sidebar

            {/* Wizard Tabs Navigation */}
            <div className="flex gap-2 border-b border-slate-200 mb-6 bg-white p-1 rounded border">
              {[
                { label: 'Project Onboarding', icon: ClipboardList },
                { label: 'Website Information', icon: Globe },
                { label: 'Business Information', icon: Users },
                { label: 'Domain & Hosting', icon: Server },
                { label: 'Competitor Setup', icon: Target },
                { label: 'Monthly Roadmap', icon: Calendar },
              ].map(tab => {
                const isTabActive = activeTab === tab.label;
                const isTabCompleted = tabToStepNumber[tab.label] < tabToStepNumber[activeTab];
                return (
                  <button
                    key={tab.label}
                    onClick={() => setActiveTab(tab.label)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-1 rounded text-xs  cursor-pointer border-none outline-none transition-all ${isTabActive
                      ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500 '
                      : isTabCompleted
                        ? 'text-green-600 hover:bg-slate-50'
                        : 'text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    <tab.icon size={15} className={isTabActive ? 'text-blue-500' : isTabCompleted ? 'text-green-500' : 'text-slate-400'} />
                    {tab.label}
                    {isTabCompleted && <Check size={12} className="text-green-600 ml-1 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* ── 1. PROJECT ONBOARDING STEP ── */}
            {activeTab === 'Project Onboarding' && (
              <div className="flex flex-col gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 flex justify-between items-center relative overflow-hidden ">
                  <div className="max-w-xl">
                    <h2 className="text-lg  text-slate-900 m-0 mb-2 flex items-center gap-2">
                      Welcome to Project Setup 🚀
                    </h2>
                    <p className="text-xs text-slate-500 leading-relaxed m-0">
                      Let's configure the basic details to kickstart your SEO project. This will help us create a custom strategy tailored to your business goals.
                    </p>
                  </div>
                  <div className="shrink-0 relative w-44 h-24 flex items-center justify-center">
                    <svg width="150" height="90" viewBox="0 0 150 90">
                      <rect x="25" y="30" width="100" height="55" rx="6" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="2" />
                      <rect x="25" y="30" width="100" height="12" rx="4" fill="#3B82F6" />
                      <circle cx="35" cy="36" r="3" fill="#fff" />
                      <circle cx="43" cy="36" r="3" fill="#fff" />
                      <circle cx="51" cy="36" r="3" fill="#fff" />
                      <rect x="15" y="82" width="120" height="5" rx="2" fill="#94A3B8" />
                      <g transform="translate(65, 10) rotate(15)">
                        <path d="M10 0 C 15 10, 15 30, 10 40 C 5 30, 5 10, 10 0" fill="#3B82F6" />
                        <path d="M7 15 L3 30 L7 28 Z" fill="#EF4444" />
                        <path d="M13 15 L17 30 L13 28 Z" fill="#EF4444" />
                        <circle cx="10" cy="16" r="3" fill="#fff" />
                        <path d="M8 40 L10 50 L12 40 Z" fill="#F59E0B" />
                      </g>
                    </svg>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 ">
                  <h3 className="text-[14px]  text-slate-900 m-0 mb-4">Project Basic Information</h3>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-xs  text-slate-700 mb-1.5">Project Name*</label>
                      <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-700 mb-1.5">Client Name*</label>
                      <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-700 mb-1.5">Package / Plan*</label>
                      <div className="relative">
                        <select value={packagePlan} onChange={e => setPackagePlan(e.target.value)} className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 appearance-none font-medium text-slate-800">
                          <option>Premium SEO</option>
                          <option>Standard SEO</option>
                          <option>Basic SEO</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-700 mb-1.5">Project Type*</label>
                      <div className="relative">
                        <select value={projectType} onChange={e => setProjectType(e.target.value)} className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 appearance-none font-medium text-slate-800">
                          <option>SEO Campaign</option>
                          <option>GMB Campaign</option>
                          <option>Audit &amp; Strategy Only</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-700 mb-1.5">Industry*</label>
                      <div className="relative">
                        <select value={industry} onChange={e => setIndustry(e.target.value)} className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 appearance-none font-medium text-slate-800">
                          <option>Software / Technology</option>
                          <option>Healthcare / Medical</option>
                          <option>Retail / Ecommerce</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-700 mb-1.5">Project Budget*</label>
                      <input type="text" value={budget} onChange={e => setBudget(e.target.value)} className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-700 mb-1.5">Project Manager*</label>
                      <div className="relative">
                        <select value={projectManager} onChange={e => setProjectManager(e.target.value)} className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 appearance-none font-medium text-slate-800">
                          <option>Emma Johnson</option>
                          <option>Daniel Martinez</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-700 mb-1.5">Start Date*</label>
                      <input type="text" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-700 mb-1.5">End Date*</label>
                      <input type="text" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 ">
                  <h3 className="text-[14px]  text-slate-900 m-0 mb-3.5">Project Description</h3>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800 bg-slate-50/50 text-xs"
                  />
                </div>
              </div>
            )}

            {/* ── 2. WEBSITE INFORMATION STEP ── */}
            {activeTab === 'Website Information' && (
              <div className="flex flex-col gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 ">
                  <h3 className="text-[14px]  text-slate-900 m-0 mb-4">Website Details</h3>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-xs  text-slate-700 mb-1.5">Website URL*</label>
                      <input type="text" defaultValue="https://www.technova.com" className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-700 mb-1.5">Website Name*</label>
                      <input type="text" defaultValue="TechNova Solutions" className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-700 mb-1.5">Website Language*</label>
                      <div className="relative">
                        <select className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 appearance-none font-medium text-slate-800">
                          <option>English</option>
                          <option>Spanish</option>
                          <option>French</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 ">
                  <h3 className="text-[14px]  text-slate-900 m-0 mb-4">Website Statistics (Current)</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'Domain Authority', value: '32', icon: Shield, bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                      { label: 'Page Authority', value: '28', icon: Activity, bg: 'bg-blue-50 text-blue-600 border-blue-100' },
                      { label: 'Organic Traffic / Month', value: '1,250', icon: TrendingUp, bg: 'bg-purple-50 text-purple-600 border-purple-100' },
                      { label: 'Total Keywords', value: '420', icon: Target, bg: 'bg-amber-50 text-amber-600 border-amber-100' },
                    ].map((item, i) => (
                      <div key={i} className={`border rounded p-4 flex items-center gap-3.5 ${item.bg}`}>
                        <div className="bg-white/90 rounded w-10 h-10 flex items-center justify-center  shrink-0">
                          <item.icon size={20} />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 ">{item.label}</div>
                          <div className="text-xl  text-slate-900 mt-0.5">{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── 3. BUSINESS INFORMATION STEP ── */}
            {activeTab === 'Business Information' && (
              <div className="flex flex-col gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 ">
                  <h3 className="text-[14px]  text-slate-900 m-0 mb-4">Company Details</h3>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-xs  text-slate-700 mb-1.5">Company Name*</label>
                      <input type="text" defaultValue="TechNova Solutions Pvt. Ltd." className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-700 mb-1.5">Company Email*</label>
                      <input type="text" defaultValue="info@technova.com" className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-700 mb-1.5">Company Phone*</label>
                      <input type="text" defaultValue="+1 (615) 555-7890" className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 ">
                  <h3 className="text-[14px]  text-slate-900 m-0 mb-4">Business Goals for SEO</h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {goals.map((g, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded p-2 ">
                        <CheckCircle size={13} className="text-blue-500" />
                        <span>{g.text}</span>
                        <button type="button" onClick={() => removeGoal(i)} className="bg-transparent border-none text-current hover:opacity-75 cursor-pointer  ml-1">×</button>
                      </div>
                    ))}

                    {isAddingGoal ? (
                      <div className="flex items-center gap-2 border border-slate-200 rounded p-1">
                        <input
                          type="text"
                          placeholder="Add goal..."
                          value={newGoalText}
                          onChange={e => setNewGoalText(e.target.value)}
                          className="border-none outline-none text-xs  px-2 py-1 w-44"
                        />
                        <button type="button" onClick={addGoal} className="bg-blue-500 text-white rounded px-2.5 py-1  border-none cursor-pointer">Save</button>
                        <button type="button" onClick={() => setIsAddingGoal(false)} className="bg-transparent text-slate-500 border-none cursor-pointer">×</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingGoal(true)}
                        className="border border-dashed border-blue-500 text-blue-500 hover:bg-blue-50/50 bg-white rounded p-2  flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} /> Add Goal
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── 4. DOMAIN & HOSTING STEP ── */}
            {activeTab === 'Domain & Hosting' && (
              <div className="flex flex-col gap-6 text-xs">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 ">
                  <h3 className="text-[14px]  text-slate-900 m-0 mb-4">Domain Information</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block  text-slate-700 mb-1.5">Domain Name*</label>
                      <input type="text" defaultValue="technova.com" className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800" />
                    </div>
                    <div>
                      <label className="block  text-slate-700 mb-1.5">Registrar</label>
                      <input type="text" defaultValue="GoDaddy" className="w-full border border-slate-200 rounded p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── 5. COMPETITOR SETUP STEP ── */}
            {activeTab === 'Competitor Setup' && (
              <div className="flex flex-col gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 ">
                  <h3 className="text-[14px]  text-slate-900 m-0 mb-1">Add Your Competitors</h3>
                  <form onSubmit={handleAddCompetitor} className="flex gap-2 text-xs mt-3">
                    <input
                      type="text"
                      placeholder="Enter competitor domain (e.g., example.com)"
                      value={newCompDomain}
                      onChange={e => setNewCompDomain(e.target.value)}
                      className="flex-1 border border-slate-200 rounded p-2.5 outline-none bg-white font-medium focus:border-blue-500"
                    />
                    <button type="submit" className="bg-blue-500 hover:bg-blue-600 border-none rounded px-5 py-2.5 text-white  cursor-pointer shrink-0 transition-colors">
                      Add Competitor
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 ">
                  <h3 className="text-[14px]  text-slate-900 m-0 mb-4">Competitor List</h3>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="py-2.5 px-3 text-left text-slate-500  text-xs">Domain</th>
                        <th className="py-2.5 px-3 text-left text-slate-500  text-xs">Domain Authority</th>
                        <th className="py-2.5 px-3 text-left text-slate-500  text-xs">Organic Traffic / Month</th>
                        <th className="py-2.5 px-3 text-left text-slate-500  text-xs">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {competitors.map((c, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="py-3.5 px-3  text-slate-900">{c.domain}</td>
                          <td className="py-3.5 px-3  text-slate-800">{c.da}</td>
                          <td className="py-3.5 px-3 text-slate-600">{c.traffic}</td>
                          <td className="py-3.5 px-3">
                            <button type="button" onClick={() => handleRemoveCompetitor(i)} className="bg-transparent border-none text-red-500 hover:text-red-700 cursor-pointer">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── 6. MONTHLY ROADMAP STEP ── */}
            {activeTab === 'Monthly Roadmap' && (
              <div className="flex flex-col gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 ">
                  <h3 className="text-[14px]  text-slate-900 m-0 mb-1">Monthly Roadmap Overview</h3>
                  <table className="w-full border-collapse text-xs mt-4">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="py-2.5 px-3 text-left text-slate-500  text-xs w-24">Month</th>
                        <th className="py-2.5 px-3 text-left text-slate-500  text-xs w-48">Focus Area</th>
                        <th className="py-2.5 px-3 text-left text-slate-500  text-xs">Key Activities</th>
                        <th className="py-2.5 px-3 text-left text-slate-500  text-xs w-28">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { month: 'Month 1', focus: 'Audit & Research', activities: 'Website Audit, Keyword Research, Competitor Analysis' },
                        { month: 'Month 2', focus: 'On-Page Optimization', activities: 'On-Page SEO, Technical Fixes, Meta Optimization' },
                        { month: 'Month 3', focus: 'Content Development', activities: 'Blog Content, Landing Pages, Content Optimization' },
                      ].map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="py-3 px-3  text-slate-900">{row.month}</td>
                          <td className="py-3 px-3  text-slate-800">{row.focus}</td>
                          <td className="py-3 px-3 text-slate-600">{row.activities}</td>
                          <td className="py-3 px-3">
                            <span className="bg-blue-50 text-blue-600 text-xs  px-2.5 py-0.5 rounded-md border border-blue-100">
                              Upcoming
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Wizard Footer Controls */}
            <div className="flex justify-between items-center mt-6 pt-5 border-t border-slate-200">
              <button
                onClick={handlePrevTab}
                disabled={activeTab === 'Project Onboarding'}
                className={`rounded p-2.5 text-xs  border cursor-pointer transition-colors bg-white ${activeTab === 'Project Onboarding'
                  ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                  : 'text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                &larr; Previous
              </button>

              <button
                onClick={handleNextTab}
                className={`rounded px-5 py-2.5 text-xs  border-none cursor-pointer transition-colors text-white ${activeTab === 'Monthly Roadmap'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-500 hover:bg-blue-600'
                  }`}
              >
                {activeTab === 'Monthly Roadmap' ? 'Setup Complete' : 'Save & Continue'} &rarr;
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

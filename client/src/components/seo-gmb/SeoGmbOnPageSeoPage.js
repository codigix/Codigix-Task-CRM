import React, { useState, useEffect } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
} from 'recharts';
import {
  CheckCircle, ArrowUpRight, Calendar, FileText, Globe, Sliders,
  Target, Zap, Link, Server, ClipboardList, Shield, HelpCircle,
  Activity, AlertTriangle, AlertCircle, RefreshCw, Download,
} from 'lucide-react';
import SeoGmbProjectSelector from './SeoGmbProjectSelector';
import CrudTable from '../common/CrudTable';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


const ON_PAGE_HEALTH_DATA = [];

export default function SeoGmbOnPageSeoPage() {
  const [activeTab, setActiveTab] = useState('Landing Pages');
  const [project, setProject] = useState(null);
  const [retestLoading, setRetestLoading] = useState(false);

  // ── CRUD State ──────────────────────────────────────────────────────────────
  const [metaTags, setMetaTags] = useState([
    { id: 1, title: 'Home Page Title', description: 'Home page meta description' },
    { id: 2, title: 'About Us Title', description: 'About us meta description' },
  ]);
  const [headingStructure, setHeadingStructure] = useState([
    { id: 1, heading: 'H1 - Main Heading', level: 'H1' },
    { id: 2, heading: 'H2 - Sub Heading', level: 'H2' },
  ]);
  const [urlOptimization, setUrlOptimization] = useState([
    { id: 1, url: '/about-us', issue: 'Missing trailing slash' },
    { id: 2, url: '/services', issue: 'Dynamic parameters' },
  ]);
  const [internalLinking, setInternalLinking] = useState([
    { id: 1, source: '/home', target: '/about-us', anchor: 'About Us' },
    { id: 2, source: '/services', target: '/contact-us', anchor: 'Contact Us' },
  ]);
  const [imageSeo, setImageSeo] = useState([
    { id: 1, src: '/images/logo.png', alt: 'Company Logo' },
    { id: 2, src: '/images/hero.jpg', alt: 'Hero Banner' },
  ]);
  const [schemaMarkup, setSchemaMarkup] = useState([
    { id: 1, type: 'Organization', json: '{"@type":"Organization","name":"TechNova"}' },
    { id: 2, type: 'LocalBusiness', json: '{"@type":"LocalBusiness","name":"TechNova"}' },
  ]);
  const [faqSchema, setFaqSchema] = useState([
    { id: 1, question: 'What is your service?', answer: 'We provide SEO services.' },
    { id: 2, question: 'How much does it cost?', answer: 'Plans start at $99/month.' },
  ]);
  const [breadcrumbSchema, setBreadcrumbSchema] = useState([
    { id: 1, name: 'Home', position: '1', url: '/' },
    { id: 2, name: 'Services', position: '2', url: '/services' },
  ]);
  const [featuredSnippets, setFeaturedSnippets] = useState([
    { id: 1, title: 'Best SEO Tips 2026', rank: '1' },
    { id: 2, title: 'How to rank on Google Maps', rank: '3' },
  ]);
  const [contentOptimization, setContentOptimization] = useState([
    { id: 1, page: '/blog', score: '78' },
    { id: 2, page: '/services', score: '65' },
  ]);

  // ── Column Definitions ──────────────────────────────────────────────────────
  const metaTagsColumns = [
    { header: 'Title', accessor: 'title' },
    { header: 'Description', accessor: 'description' },
  ];
  const headingStructureColumns = [
    { header: 'Heading Text', accessor: 'heading' },
    { header: 'Level (H1-H6)', accessor: 'level' },
  ];
  const urlOptimizationColumns = [
    { header: 'URL Path', accessor: 'url' },
    { header: 'Issue', accessor: 'issue' },
  ];
  const internalLinkingColumns = [
    { header: 'Source Page', accessor: 'source' },
    { header: 'Target Page', accessor: 'target' },
    { header: 'Anchor Text', accessor: 'anchor' },
  ];
  const imageSeoColumns = [
    { header: 'Image Source', accessor: 'src' },
    { header: 'Alt Text', accessor: 'alt' },
  ];
  const schemaMarkupColumns = [
    { header: 'Schema Type', accessor: 'type' },
    { header: 'JSON-LD', accessor: 'json' },
  ];
  const faqSchemaColumns = [
    { header: 'Question', accessor: 'question' },
    { header: 'Answer', accessor: 'answer' },
  ];
  const breadcrumbSchemaColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Position', accessor: 'position' },
    { header: 'URL', accessor: 'url' },
  ];
  const featuredSnippetsColumns = [
    { header: 'Title / Keyword', accessor: 'title' },
    { header: 'Current Rank', accessor: 'rank' },
  ];
  const contentOptimizationColumns = [
    { header: 'Page URL', accessor: 'page' },
    { header: 'Optimization Score', accessor: 'score' },
  ];

  // ── Generic CRUD Handlers ───────────────────────────────────────────────────
  const makeAdd = (setter) => (item) =>
    setter((prev) => [...prev, { ...item, id: prev.length ? Math.max(...prev.map((i) => i.id)) + 1 : 1 }]);
  const makeEdit = (setter) => (id, item) =>
    setter((prev) => prev.map((i) => (i.id === id ? { ...i, ...item } : i)));
  const makeDel = (setter) => (id) =>
    setter((prev) => prev.filter((i) => i.id !== id));

  const tabsList = [
    'Landing Pages', 'Meta Tags', 'Heading Structure', 'URL Optimization',
    'Internal Linking', 'Image SEO', 'Schema Markup', 'FAQ Schema',
    'Breadcrumb Schema', 'Featured Snippets', 'Content Optimization',
  ];

  const loadProjectData = async (proj) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${proj.id}`);
      if (response.ok) setProject(await response.json());
    } catch (err) {
      console.error('Error loading project for on-page SEO:', err);
    }
  };

  const handleRunAudit = () => {
    setRetestLoading(true);
    setTimeout(() => setRetestLoading(false), 1500);
  };

  const currentProjectName = project ? project.name : 'TechNova Solutions';
  const currentDomain = project ? project.name.toLowerCase().replace(/ /g, '') + '.com' : 'technova.com';

  return (
    <div className="bg-slate-50 min-h-screen font-sans pb-10">

      {/* ── Top Header ── */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl  text-slate-900 m-0">On-Page SEO {project ? `for ${project.name}` : ''}</h1>
          <SeoGmbProjectSelector onProjectChange={loadProjectData} />
        </div>
        <div className="flex items-center gap-4">
          <button className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer">
            <Calendar size={14} /> May 8 - May 15, 2026
          </button>
          <button className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer">
            <Download size={14} /> Export Report
          </button>
          <button
            onClick={handleRunAudit}
            className="bg-blue-500 hover:bg-blue-600 border-none text-white rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw size={14} className={retestLoading ? 'animate-spin' : ''} />
            {retestLoading ? 'Auditing...' : 'Run On-Page Audit'}
          </button>
        </div>
      </div>

      <div className="px-6 py-4">
        <p className="text-xs text-slate-400 m-0 mb-6">
          Optimize your website content and on-page elements for better search visibility.
        </p>

        {/* ── Tabs Nav ── */}
        <div className="flex gap-1.5 mb-6 bg-white p-1 rounded border border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
          {tabsList.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center py-2.5 px-3 rounded text-xs  cursor-pointer border-none outline-none transition-all shrink-0 ${activeTab === tab
                ? 'bg-blue-50 text-blue-600 '
                : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════
            Tab 1: Landing Pages Dashboard (read-only overview)
        ══════════════════════════════════════════════════ */}
        {activeTab === 'Landing Pages' && (
          <div className="flex flex-col gap-6">

            {/* Metric Cards */}
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400  block">Overall On-Page Score</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-slate-900">86</span>
                    <span className="text-xs text-slate-400 ">/100</span>
                  </div>
                  <span className="text-xs text-emerald-500  flex items-center gap-0.5 mt-2">
                    <ArrowUpRight size={12} /> +12% vs last audit
                  </span>
                </div>
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg width="60" height="60" viewBox="0 0 36 36">
                    <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-emerald-500" strokeWidth="3" strokeDasharray="86, 100" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <span className="absolute text-xs font-black text-slate-700">Good</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400  block">Pages Analyzed</span>
                  <strong className="text-2xl font-black text-slate-900 mt-2 block">142</strong>
                  <span className="text-xs text-emerald-500  mt-2 block">18 New Pages</span>
                </div>
                <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded flex items-center justify-center text-blue-500">
                  <FileText size={18} />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400  block">Issues Found</span>
                  <strong className="text-2xl font-black text-slate-900 mt-2 block">58</strong>
                  <span className="text-xs text-slate-500  mt-2 block">
                    <span className="text-red-500 ">23</span> Critical &bull; <span className="text-amber-500 ">35</span> Warnings
                  </span>
                </div>
                <div className="w-10 h-10 bg-red-50 border border-red-100 rounded flex items-center justify-center text-red-500">
                  <AlertTriangle size={18} />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400  block">Optimized Pages</span>
                  <strong className="text-2xl font-black text-slate-900 mt-2 block">112</strong>
                  <span className="text-xs text-emerald-500  mt-2 block">78.9% of total</span>
                </div>
                <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded flex items-center justify-center text-emerald-500">
                  <CheckCircle size={18} />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400  block">Avg. Page Load Impact</span>
                  <strong className="text-2xl font-black text-slate-900 mt-2 block">1.8s</strong>
                  <span className="text-xs text-emerald-500  mt-2 block">Good speed</span>
                </div>
                <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded flex items-center justify-center text-blue-500">
                  <Activity size={18} />
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-3 gap-2">
              {/* Landing Pages Table */}
              <div className="col-span-2 bg-white rounded-2xl p-2 border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm  text-slate-900 m-0">Landing Pages Overview</h3>
                  <button className="bg-transparent border-none text-blue-500 hover:text-blue-700 text-xs  cursor-pointer">View All &rarr;</button>
                </div>
                <table className="w-full border-collapse text-xs text-slate-700">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-400  text-left ">
                      <th className="py-2.5 px-3">Page</th>
                      <th className="py-2.5 px-3">URL</th>
                      <th className="py-2.5 px-3">On-Page Score</th>
                      <th className="py-2.5 px-3">Issues</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Home Page', path: '/', score: 92, count: 2, status: 'Excellent', color: 'bg-emerald-500' },
                      { name: 'About Us', path: '/about-us', score: 88, count: 3, status: 'Good', color: 'bg-blue-500' },
                      { name: 'Services', path: '/services', score: 74, count: 8, status: 'Needs Work', color: 'bg-amber-500' },
                      { name: 'Blog', path: '/blog', score: 90, count: 1, status: 'Excellent', color: 'bg-emerald-500' },
                      { name: 'Contact Us', path: '/contact-us', score: 70, count: 10, status: 'Needs Work', color: 'bg-amber-500' },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-2.5 px-3  text-slate-900">{row.name}</td>
                        <td className="py-2.5 px-3 text-blue-500 font-medium">{row.path}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className=" text-slate-800 w-6">{row.score}</span>
                            <div className="w-16 bg-slate-100 rounded-full h-1">
                              <div className={`h-full ${row.color}`} style={{ width: `${row.score}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1 ${row.count > 5 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          {row.count}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-xs  px-2.5 py-0.5 rounded-full border ${row.status === 'Excellent' ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : row.status === 'Good' ? 'bg-blue-50 text-blue-700 border-blue-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>{row.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Radar Chart */}
              <div className="col-span-1 bg-white rounded-2xl p-2 border border-slate-200">
                <h3 className="text-sm  text-slate-900 m-0 mb-4">On-Page SEO Health</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={ON_PAGE_HEALTH_DATA}>
                    <PolarGrid stroke="#F1F5F9" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#64748B' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Health" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Diagnostic Mini Cards */}
            <div className="grid grid-cols-5 gap-4">
              {[
                { title: 'Meta Tags', desc: 'Optimize titles & descriptions.', count: 12, score: 88, icon: Shield, color: 'text-blue-500 bg-blue-50 border-blue-100' },
                { title: 'Heading Structure', desc: 'Verify tag hierarchies.', count: 8, score: 82, icon: Target, color: 'text-indigo-500 bg-indigo-50 border-indigo-100' },
                { title: 'URL Optimization', desc: 'Verify parameters & slugs.', count: 5, score: 90, icon: Globe, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
                { title: 'Internal Linking', desc: 'Check authority flow.', count: 6, score: 84, icon: Link, color: 'text-amber-500 bg-amber-50 border-amber-100' },
                { title: 'Image SEO', desc: 'Alt-text validations.', count: 14, score: 79, icon: FileText, color: 'text-purple-500 bg-purple-50 border-purple-100' },
                { title: 'Schema Markup', desc: 'Structured data checks.', count: 9, score: 85, icon: Server, color: 'text-sky-500 bg-sky-50 border-sky-100' },
                { title: 'FAQ Schema', desc: 'FAQ tags integration.', count: 3, score: 92, icon: HelpCircle, color: 'text-cyan-500 bg-cyan-50 border-cyan-100' },
                { title: 'Breadcrumb Schema', desc: 'Breadcrumb tag marks.', count: 2, score: 94, icon: Sliders, color: 'text-teal-500 bg-teal-50 border-teal-100' },
                { title: 'Featured Snippets', desc: 'SERP feature opportunities.', count: 7, score: 78, icon: Zap, color: 'text-rose-500 bg-rose-50 border-rose-100' },
                { title: 'Content Optimization', desc: 'Readability checks.', count: 20, score: 81, icon: ClipboardList, color: 'text-violet-500 bg-violet-50 border-violet-100' },
              ].map((card, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover: transition-shadow">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${card.color}`}>
                        <card.icon size={15} />
                      </div>
                      <span className="text-xs  text-slate-800">{card.score}%</span>
                    </div>
                    <h4 className="text-[12px]  text-slate-900 m-0">{card.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 mb-3 leading-normal">{card.desc}</p>
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-xs  text-slate-500">
                    <span>Issues: {card.count}</span>
                    <button
                      onClick={() => setActiveTab(card.title)}
                      className="bg-transparent border-none text-blue-500 hover:underline cursor-pointer text-xs "
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════
            Tab 2 – 11: CRUD Tabs
        ══════════════════════════════════════════════════ */}

        {activeTab === 'Meta Tags' && (
          <CrudTable
            title="Meta Tags"
            columns={metaTagsColumns}
            data={metaTags}
            onAdd={makeAdd(setMetaTags)}
            onEdit={makeEdit(setMetaTags)}
            onDelete={makeDel(setMetaTags)}
          />
        )}

        {activeTab === 'Heading Structure' && (
          <CrudTable
            title="Heading Structure"
            columns={headingStructureColumns}
            data={headingStructure}
            onAdd={makeAdd(setHeadingStructure)}
            onEdit={makeEdit(setHeadingStructure)}
            onDelete={makeDel(setHeadingStructure)}
          />
        )}

        {activeTab === 'URL Optimization' && (
          <CrudTable
            title="URL Optimization"
            columns={urlOptimizationColumns}
            data={urlOptimization}
            onAdd={makeAdd(setUrlOptimization)}
            onEdit={makeEdit(setUrlOptimization)}
            onDelete={makeDel(setUrlOptimization)}
          />
        )}

        {activeTab === 'Internal Linking' && (
          <CrudTable
            title="Internal Linking"
            columns={internalLinkingColumns}
            data={internalLinking}
            onAdd={makeAdd(setInternalLinking)}
            onEdit={makeEdit(setInternalLinking)}
            onDelete={makeDel(setInternalLinking)}
          />
        )}

        {activeTab === 'Image SEO' && (
          <CrudTable
            title="Image SEO"
            columns={imageSeoColumns}
            data={imageSeo}
            onAdd={makeAdd(setImageSeo)}
            onEdit={makeEdit(setImageSeo)}
            onDelete={makeDel(setImageSeo)}
          />
        )}

        {activeTab === 'Schema Markup' && (
          <CrudTable
            title="Schema Markup"
            columns={schemaMarkupColumns}
            data={schemaMarkup}
            onAdd={makeAdd(setSchemaMarkup)}
            onEdit={makeEdit(setSchemaMarkup)}
            onDelete={makeDel(setSchemaMarkup)}
          />
        )}

        {activeTab === 'FAQ Schema' && (
          <CrudTable
            title="FAQ Schema"
            columns={faqSchemaColumns}
            data={faqSchema}
            onAdd={makeAdd(setFaqSchema)}
            onEdit={makeEdit(setFaqSchema)}
            onDelete={makeDel(setFaqSchema)}
          />
        )}

        {activeTab === 'Breadcrumb Schema' && (
          <CrudTable
            title="Breadcrumb Schema"
            columns={breadcrumbSchemaColumns}
            data={breadcrumbSchema}
            onAdd={makeAdd(setBreadcrumbSchema)}
            onEdit={makeEdit(setBreadcrumbSchema)}
            onDelete={makeDel(setBreadcrumbSchema)}
          />
        )}

        {activeTab === 'Featured Snippets' && (
          <CrudTable
            title="Featured Snippets"
            columns={featuredSnippetsColumns}
            data={featuredSnippets}
            onAdd={makeAdd(setFeaturedSnippets)}
            onEdit={makeEdit(setFeaturedSnippets)}
            onDelete={makeDel(setFeaturedSnippets)}
          />
        )}

        {activeTab === 'Content Optimization' && (
          <CrudTable
            title="Content Optimization"
            columns={contentOptimizationColumns}
            data={contentOptimization}
            onAdd={makeAdd(setContentOptimization)}
            onEdit={makeEdit(setContentOptimization)}
            onDelete={makeDel(setContentOptimization)}
          />
        )}

      </div>
    </div>
  );
}

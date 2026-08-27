import React, { useState } from 'react';
import {
  Globe, Zap, Target, Search, CheckCircle, ChevronDown, Plus, Minus,
  MessageSquare, Settings, Activity, FileText, Database, Shield,
  Bold, Italic, Underline, List, ListOrdered, Link, Image, Layout,
  RotateCcw, RefreshCw, Star, CheckCircle2, FileSearch, PenTool, LayoutTemplate,
  History, Eye, Copy, Download, Share2
} from 'lucide-react';
import AdvancedDateRangePicker from '../common/AdvancedDateRangePicker';
import SeoGmbProjectSelector from './SeoGmbProjectSelector';
import { useAuth } from '../../hooks/useAuth';

const SeoGmbAiContentGenerationPage = () => {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState(null);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('GEO');
  const [activeAssistantTab, setActiveAssistantTab] = useState('Suggestions');

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">Dashboard</span>
            <ChevronRightIcon />
            <span className="text-gray-500 text-sm">AI Content Generation</span>
            <ChevronRightIcon />
            <span className="text-gray-900 text-sm font-semibold">New Content</span>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Project:</span>
            <SeoGmbProjectSelector selectedProjectId={projectId} onSelectProject={setProjectId} />
          </div>
          <AdvancedDateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={(start, end) => setDateRange({ startDate: start, endDate: end })}
          />
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
            Save as Draft
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition shadow-sm">
            Publish / Export ▾
          </button>
        </div>
      </div>

      <div className="p-4 mx-auto grid grid-cols-1 xl:grid-cols-12 gap-4 max-w-[1900px]">
        {/* LEFT COLUMN: Content Brief */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 cursor-pointer">
              <h3 className="font-semibold text-gray-900">Content Brief</h3>
              <ChevronDown size={18} className="text-gray-400" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Content Type</label>
                <div className="relative">
                  <select className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none appearance-none cursor-pointer">
                    <option>Blog Post</option>
                    <option>Landing Page</option>
                    <option>Product Description</option>
                  </select>
                  <FileText size={14} className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>

              <div>
                <div className="flex justify-between">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Topic / Keyword <span className="text-red-500">*</span></label>
                  <span className="text-xs text-gray-400">42/100</span>
                </div>
                <input 
                  type="text" 
                  value="Benefits of Cloud ERP for Manufacturing" 
                  className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition" 
                  readOnly 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Content Goal</label>
                <select className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none">
                  <option>Informational</option>
                  <option>Transactional</option>
                  <option>Navigational</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Target Audience</label>
                <select className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none">
                  <option>Manufacturing Businesses</option>
                  <option>General Public</option>
                  <option>IT Professionals</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tone of Voice</label>
                <select className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none">
                  <option>Professional</option>
                  <option>Casual</option>
                  <option>Persuasive</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
                  <select className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none">
                    <option>English</option>
                    <option>Spanish</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Word Count</label>
                  <select className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none">
                    <option>1500 - 2000 Words</option>
                    <option>500 - 1000 Words</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">AI Model <Activity size={12} className="text-gray-400" /></label>
                <select className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none">
                  <option>GPT-4o</option>
                  <option>Claude 3.5 Sonnet</option>
                  <option>Gemini 1.5 Pro</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Additional Instructions (Optional)</label>
                  <span className="text-xs text-gray-400">0/500</span>
                </div>
                <textarea 
                  className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none h-24 resize-none focus:border-indigo-500 transition placeholder-gray-400"
                  placeholder="Add specific points you want to include..."
                ></textarea>
              </div>

              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                <Zap size={16} className="fill-white" /> Generate Content
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Content Ideas <span className="text-gray-500 font-normal text-sm">(AI Suggestions)</span></h3>
              <RefreshCw size={14} className="text-indigo-600 cursor-pointer" />
            </div>
            <div className="space-y-2">
              {['Cloud ERP Benefits for SMEs', 'Why Manufacturers Choose Cloud ERP', 'Cloud ERP vs On-Premise ERP', 'Future of Manufacturing with Cloud ERP', 'Cost Savings with Cloud ERP'].map((idea, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer transition">
                  <Plus size={16} className="text-indigo-600" />
                  <span className="text-sm text-gray-700 font-medium">{idea}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Text Editor */}
        <div className="xl:col-span-6 space-y-4 flex flex-col h-full">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1">
            
            {/* Editor Header */}
            <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">Generated Content</h3>
                <span className="bg-green-50 text-green-600 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">AI Generated</span>
              </div>
              <div className="flex items-center gap-4 text-gray-500 text-sm">
                <span>1,832 words</span>
                <div className="flex items-center gap-2">
                  <Copy size={16} className="cursor-pointer hover:text-gray-900" />
                  <Download size={16} className="cursor-pointer hover:text-gray-900" />
                  <Eye size={16} className="cursor-pointer hover:text-gray-900" />
                </div>
              </div>
            </div>

            {/* Editor Toolbar */}
            <div className="border-b border-gray-100 px-5 py-2 flex items-center gap-4 text-gray-600 overflow-x-auto">
              <select className="bg-transparent border-none outline-none text-sm font-medium cursor-pointer">
                <option>Heading 2</option>
              </select>
              <div className="w-px h-4 bg-gray-200"></div>
              <div className="flex items-center gap-3">
                <Bold size={16} className="cursor-pointer hover:text-gray-900" />
                <Italic size={16} className="cursor-pointer hover:text-gray-900" />
                <Underline size={16} className="cursor-pointer hover:text-gray-900" />
              </div>
              <div className="w-px h-4 bg-gray-200"></div>
              <div className="flex items-center gap-3">
                <List size={16} className="cursor-pointer hover:text-gray-900" />
                <ListOrdered size={16} className="cursor-pointer hover:text-gray-900" />
              </div>
              <div className="w-px h-4 bg-gray-200"></div>
              <div className="flex items-center gap-3">
                <Link size={16} className="cursor-pointer hover:text-gray-900" />
                <Image size={16} className="cursor-pointer hover:text-gray-900" />
              </div>
              <div className="w-px h-4 bg-gray-200"></div>
              <div className="flex items-center gap-3">
                <RotateCcw size={16} className="cursor-pointer hover:text-gray-900" />
              </div>
            </div>

            {/* Editor Content Area */}
            <div className="p-8 flex-1 overflow-y-auto">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Benefits of Cloud ERP for Manufacturing</h1>
              
              <p className="text-gray-700 mb-6 leading-relaxed">
                The manufacturing industry is evolving rapidly, and businesses need smarter solutions to stay competitive. Cloud ERP (Enterprise Resource Planning) has emerged as a game-changer, enabling manufacturers to streamline operations, reduce costs, and improve efficiency.
              </p>

              <h2 className="text-xl font-bold text-gray-900 mb-3 mt-8">1. Real-Time Data Access</h2>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Cloud ERP provides real-time access to critical business data from anywhere, at any time. This helps manufacturers make faster, data-driven decisions and respond quickly to market changes.
              </p>

              <h2 className="text-xl font-bold text-gray-900 mb-3 mt-8">2. Cost Savings</h2>
              <p className="text-gray-700 mb-6 leading-relaxed">
                With Cloud ERP, companies can significantly reduce IT infrastructure costs, maintenance expenses, and hardware investments. You pay only for what you use, making it a cost-effective solution for businesses of all sizes.
              </p>

              <h2 className="text-xl font-bold text-gray-900 mb-3 mt-8">3. Scalability and Flexibility</h2>
              <p className="text-gray-700 mb-6 leading-relaxed">
                As your manufacturing business grows, Cloud ERP grows with you. It allows you to easily add new users, modules, and features without complex upgrades or downtime.
              </p>

              <h2 className="text-xl font-bold text-gray-900 mb-3 mt-8">4. Improved Collaboration</h2>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Cloud ERP centralizes data across departments—production, inventory, finance, sales, and supply chain—improving communication and collaboration across your organization.
              </p>

              <h2 className="text-xl font-bold text-gray-900 mb-3 mt-8">5. Enhanced Security</h2>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Leading Cloud ERP providers implement robust security measures, including data encryption, regular backups, and multi-layer authentication, ensuring your sensitive business data is always protected.
              </p>

              <h2 className="text-xl font-bold text-gray-900 mb-3 mt-8">6. Better Production Planning</h2>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Cloud ERP helps manufacturers optimize production schedules, manage resources efficiently, and minimize downtime with accurate forecasting and planning tools.
              </p>
            </div>

            {/* Editor Footer */}
            <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between bg-gray-50/50 rounded-b-xl">
              <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                <span>Characters: 12,456</span>
                <span>Words: 1,832</span>
                <span>Readability: <span className="text-green-600">Good</span></span>
              </div>
              <button className="flex items-center gap-2 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 px-3 py-1.5 rounded transition border border-indigo-100 bg-white shadow-sm">
                <RefreshCw size={14} /> Regenerate
              </button>
            </div>
          </div>

          {/* AI Assistant & History Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* AI Assistant */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-64 flex flex-col">
              <h3 className="font-semibold text-gray-900 mb-4">AI Content Assistant</h3>
              <div className="flex gap-4 border-b border-gray-100 mb-4">
                {['Suggestions', 'Improve Content', 'Expand Content', 'Shorten Content', 'Make it Simple'].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveAssistantTab(tab)}
                    className={`text-xs font-semibold pb-2 border-b-2 transition-colors whitespace-nowrap ${activeAssistantTab === tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {[
                  { text: 'Add a comparison table: Cloud ERP vs On-Premise ERP' },
                  { text: 'Include customer success story for better engagement' },
                  { text: 'Add statistics or industry data to increase credibility' },
                  { text: 'Include FAQ section to target AI search queries' }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 justify-between">
                    <div className="flex gap-2">
                      <Star size={14} className="text-indigo-600 mt-0.5 flex-shrink-0 fill-indigo-100" />
                      <span className="text-sm text-gray-700">{item.text}</span>
                    </div>
                    <button className="text-xs font-semibold text-indigo-600 hover:underline flex-shrink-0">Apply</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Content History */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-64 flex flex-col">
              <h3 className="font-semibold text-gray-900 mb-4">Content History</h3>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                <div className="flex items-start justify-between border-b border-gray-50 pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Benefits of Cloud ERP for Manufacturing</h4>
                    <p className="text-[10px] text-gray-500">May 30, 2026 - 10:30 AM</p>
                  </div>
                  <span className="bg-green-50 text-green-600 border border-green-200 text-[9px] font-bold px-2 py-0.5 rounded-full">Published</span>
                </div>
                <div className="flex items-start justify-between border-b border-gray-50 pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Top ERP Features for Manufacturing</h4>
                    <p className="text-[10px] text-gray-500">May 28, 2026 - 04:15 PM</p>
                  </div>
                  <span className="bg-gray-50 text-gray-600 border border-gray-200 text-[9px] font-bold px-2 py-0.5 rounded-full">Draft</span>
                </div>
                <div className="flex items-start justify-between border-b border-gray-50 pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Manufacturing ERP Implementation Guide</h4>
                    <p className="text-[10px] text-gray-500">May 26, 2026 - 11:20 AM</p>
                  </div>
                  <span className="bg-gray-50 text-gray-600 border border-gray-200 text-[9px] font-bold px-2 py-0.5 rounded-full">Draft</span>
                </div>
              </div>
              <button className="text-indigo-600 text-xs font-semibold mt-2 hover:underline w-full text-left">View All History &rarr;</button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SEO/GEO & Tools */}
        <div className="xl:col-span-3 space-y-4">
          
          {/* Content Score */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Content Score (AI Optimization)</h3>
            <div className="flex items-center justify-between">
              
              <div className="relative w-28 h-28 flex flex-col items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray="88, 100" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold text-gray-900 leading-none tracking-tighter">88<span className="text-sm font-medium text-gray-400">/100</span></span>
                </div>
                <div className="absolute -bottom-2 text-[10px] font-semibold text-green-600">Excellent</div>
              </div>

              <div className="flex-1 ml-6 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">SEO Score</span>
                  <span className="font-semibold text-green-600">85<span className="text-gray-400 font-normal">/100</span></span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-medium">GEO Score</span>
                  <span className="font-semibold text-green-600">90<span className="text-gray-400 font-normal">/100</span></span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Readability</span>
                  <span className="font-semibold text-green-600">87<span className="text-gray-400 font-normal">/100</span></span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Engagement</span>
                  <span className="font-semibold text-green-600">86<span className="text-gray-400 font-normal">/100</span></span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Originality</span>
                  <span className="font-semibold text-green-600">91<span className="text-gray-400 font-normal">/100</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* SEO / GEO Analysis */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">SEO / GEO Analysis</h3>
            
            <div className="flex gap-2 border-b border-gray-100 mb-4">
              {['SEO', 'GEO', 'Readability', 'Tone'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveAnalysisTab(tab)}
                  className={`text-xs font-semibold pb-2 border-b-2 transition-colors flex-1 text-center ${activeAnalysisTab === tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500 fill-green-100" /> <span className="text-gray-700 font-medium">Entities Detected</span></div>
                <div className="flex items-center gap-3"><span className="font-semibold">12</span> <span className="text-indigo-600 cursor-pointer hover:underline">View</span></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500 fill-green-100" /> <span className="text-gray-700 font-medium">AI Search Friendly</span></div>
                <span className="font-semibold text-green-600">Yes</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500 fill-green-100" /> <span className="text-gray-700 font-medium">FAQ Opportunities</span></div>
                <div className="flex items-center gap-3"><span className="font-semibold">5</span> <span className="text-indigo-600 cursor-pointer hover:underline">View</span></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500 fill-green-100" /> <span className="text-gray-700 font-medium">Schema Suggested</span></div>
                <div className="flex items-center gap-3"><span className="font-semibold">6</span> <span className="text-indigo-600 cursor-pointer hover:underline">View</span></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500 fill-green-100" /> <span className="text-gray-700 font-medium">Citation Worthiness</span></div>
                <span className="font-semibold text-green-600">High</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500 fill-green-100" /> <span className="text-gray-700 font-medium">Topical Authority</span></div>
                <span className="font-semibold text-green-600">Strong</span>
              </div>
            </div>
          </div>

          {/* Recommended Entities */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Recommended Entities</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {['Cloud ERP', 'Manufacturing', 'Automation', 'Production Planning', 'Supply Chain', 'Real-time Data', 'Cost Reduction', 'Scalability', 'Data Security', 'Business Efficiency'].map((entity, i) => (
                <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-medium border border-indigo-100">
                  {entity}
                </span>
              ))}
            </div>
            <button className="text-indigo-600 text-xs font-semibold hover:underline text-left">View All Entities &rarr;</button>
          </div>

          {/* Suggested Schema */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Suggested Schema</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-700"><FileText size={12} className="text-gray-400" /> Article Schema</div>
                <button className="text-indigo-600 font-semibold hover:underline">Add</button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-700"><Search size={12} className="text-gray-400" /> FAQ Schema</div>
                <button className="text-indigo-600 font-semibold hover:underline">Add</button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-700"><FileText size={12} className="text-gray-400" /> FAQ Schema (S)</div>
                <button className="text-indigo-600 font-semibold hover:underline">Add</button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-700"><Globe size={12} className="text-gray-400" /> Organization Schema</div>
                <button className="text-indigo-600 font-semibold hover:underline">Add</button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-700"><LayoutTemplate size={12} className="text-gray-400" /> HowTo Schema</div>
                <button className="text-indigo-600 font-semibold hover:underline">Add</button>
              </div>
            </div>
            <button className="text-indigo-600 text-xs font-semibold hover:underline text-left">View All &rarr;</button>
          </div>

          {/* Content Actions */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Content Actions</h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition gap-2 text-center group">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition">
                  <Search size={14} className="text-indigo-600" />
                </div>
                <span className="text-[9px] font-semibold text-gray-700 leading-tight">Generate FAQ</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition gap-2 text-center group">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition">
                  <Globe size={14} className="text-blue-600" />
                </div>
                <span className="text-[9px] font-semibold text-gray-700 leading-tight">Generate Meta</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 hover:border-pink-300 hover:bg-pink-50 cursor-pointer transition gap-2 text-center group">
                <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition">
                  <FileText size={14} className="text-pink-600" />
                </div>
                <span className="text-[9px] font-semibold text-gray-700 leading-tight">Generate Summary</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 hover:border-green-300 hover:bg-green-50 cursor-pointer transition gap-2 text-center group">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition">
                  <Shield size={14} className="text-green-600" />
                </div>
                <span className="text-[9px] font-semibold text-gray-700 leading-tight">Check Plagiarism</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Helper Icon for Header Breadcrumbs
const ChevronRightIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

export default SeoGmbAiContentGenerationPage;

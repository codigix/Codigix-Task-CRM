import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  File, Folder, HardDrive, Search, Filter, ChevronDown,
  Download, MoreVertical, LayoutGrid, List, Info, RefreshCw,
  FolderOpen, Cloud, Database, FileText, Upload, Users, Star, Trash2, Clock,
  Plus, Eye, Lock, Globe
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';
import { filesAPI } from '../../services/api';
import SearchableSelect from '../common/SearchableSelect';
import AdvancedDateRangePicker from '../common/AdvancedDateRangePicker';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


const SeoGmbDocumentsPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isIT = location.pathname.includes('/it/');
  const navigate = useNavigate();
  const deptName = isIT ? 'IT' : 'SEO';

  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('All Projects');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedFileType, setSelectedFileType] = useState('All File Types');
  const [selectedFolder, setSelectedFolder] = useState('All Documents');
  const [selectedUploadedBy, setSelectedUploadedBy] = useState('Uploaded By');
  const [dateRange, setDateRange] = useState({ start: null, end: null, label: 'All Time' });
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (idx) => {
    setExpandedRows(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        if (isIT) {
          const res = await axios.get(API_BASE_URL + '/it-documents');
          const formattedFiles = res.data.map(f => {
            const dateObj = new Date(f.created_at);
            return {
              id: f.id,
              name: f.title || 'Untitled Document',
              sub: f.description || 'Document',
              project: f.project || 'General',
              category: f.category || 'Files',
              type: (f.file_type || 'PDF').toUpperCase(),
              size: '1.2 MB', // Simulated
              by: f.created_by || 'User',
              date: dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
              time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              version: f.version || 'v1.0',
              color: 'text-indigo-500',
              folder: f.folder || '',
              access: f.access_permission || 'Private',
              created_at: f.created_at
            };
          });
          setFiles(formattedFiles);
        } else {
          // Keep existing logic for SEO
          if (filesAPI && filesAPI.getAll) {
            const res = await filesAPI.getAll();
            const formattedFiles = (res || []).map((f, i) => {
              const dateObj = f.created_at ? new Date(f.created_at) : new Date();
              return {
                id: f.id || i,
                name: f.name || 'Unknown File',
                sub: 'Document',
                project: 'General',
                category: 'Content Files',
                type: (f.file_type || 'PDF').toUpperCase(),
                size: f.size_bytes ? (f.size_bytes / 1024 / 1024).toFixed(2) + ' MB' : '1.2 MB',
                by: 'User',
                date: dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                version: 'v1.0',
                color: 'text-indigo-500',
                created_at: f.created_at
              };
            });
            setFiles(formattedFiles);
          }
        }
      } catch (err) {
        console.error('Failed to fetch files:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, [isIT]);

  // Use real data if available, otherwise mock data for presentation
  // Derived stats
  const totalDocuments = files.length;
  const uniqueFolders = [...new Set(files.map(f => f.folder).filter(Boolean))];
  const totalFolders = uniqueFolders.length;
  const pdfDocuments = files.filter(f => f.type === 'PDF').length;
  const recentDocumentsCount = files.filter(f => {
    if (!f.created_at) return false;
    const diff = (new Date() - new Date(f.created_at)) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }).length;
  const sharedDocuments = files.filter(f => f.access !== 'Private').length;

  // Calculate folder counts for sidebar
  const folderCounts = uniqueFolders.reduce((acc, folder) => {
    acc[folder] = files.filter(f => f.folder === folder).length;
    return acc;
  }, {});

  // Extract unique projects, categories, file types for filters
  const uniqueProjects = ['All Projects', ...new Set(files.map(f => f.project).filter(Boolean))];
  const uniqueCategories = ['All Categories', ...new Set(files.map(f => f.category).filter(Boolean))];
  const uniqueFileTypes = ['All File Types', ...new Set(files.map(f => f.type).filter(Boolean))];
  const uniqueUploadedBy = ['Uploaded By', ...new Set(files.map(f => f.by).filter(Boolean))];

  // Filtering logic
  const filteredFiles = files.filter(f => {
    if (searchTerm && !f.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedProject !== 'All Projects' && f.project !== selectedProject) return false;
    if (selectedCategory !== 'All Categories' && f.category !== selectedCategory) return false;
    if (selectedFileType !== 'All File Types' && f.type !== selectedFileType) return false;
    if (selectedFolder !== 'All Documents' && f.folder !== selectedFolder) return false;
    if (selectedUploadedBy !== 'Uploaded By' && f.by !== selectedUploadedBy) return false;
    if (dateRange.start && dateRange.end && f.created_at) {
      const fileDate = new Date(f.created_at);
      if (fileDate < dateRange.start || fileDate > dateRange.end) return false;
    }
    return true;
  });

  const storageData = [
    { name: 'Documents', value: 6.45, color: '#3b82f6', pct: '74.8%' },
    { name: 'Images', value: 1.25, color: '#f59e0b', pct: '14.5%' },
    { name: 'Others', value: 0.92, color: '#22c55e', pct: '10.7%' },
  ];

  const badgeColors = {
    'SRS': 'text-purple-600 bg-purple-50',
    'BRD': 'text-blue-600 bg-blue-50',
    'Architecture': 'text-amber-600 bg-amber-50',
    'Design': 'text-teal-600 bg-teal-50',
    'Database': 'text-indigo-600 bg-indigo-50',
    'API': 'text-pink-600 bg-pink-50',
    'Test Plan': 'text-emerald-600 bg-emerald-50',
    'Deployment': 'text-orange-600 bg-orange-50',
    'User Manual': 'text-rose-600 bg-rose-50',
    'Security': 'text-green-600 bg-green-50'
  };

  return (
    <div className="p-4 bg-[#F8FAFC] min-h-screen font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl  text-gray-900 mb-1">{deptName} Documents</h1>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Dashboard</span>
            <ChevronDown size={10} className="rotate-[-90deg]" />
            <span className="text-gray-900 font-medium">Documents</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/${isIT ? 'it' : 'seo-gmb'}/manager/${user?.username || 'ashwini'}/documents/upload`)} className="p-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium flex items-center gap-2  hover:bg-gray-50 transition-colors">
            <Upload size={14} /> Upload Document
          </button>
          <button onClick={() => navigate(`/${isIT ? 'it' : 'seo-gmb'}/manager/${user?.username || 'ashwini'}/documents/upload`)} className="p-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium flex items-center gap-2  hover:bg-gray-50 transition-colors">
            <Folder size={14} /> New Folder
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-6 gap-2 mb-6">
        {[
          { title: 'Total Documents', val: totalDocuments.toString(), sub: 'Files in library', icon: Folder, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { title: 'Total Folders', val: totalFolders.toString(), sub: 'Organized folders', icon: FolderOpen, color: 'text-amber-500', bg: 'bg-amber-50' },
          { title: 'Total Size', val: '8.62 GB', sub: 'Storage used', icon: HardDrive, color: 'text-blue-500', bg: 'bg-blue-50' },
          { title: 'PDF Documents', val: pdfDocuments.toString(), sub: 'PDF files', icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50' },
          { title: 'Recently Added', val: recentDocumentsCount.toString(), sub: 'This week', icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { title: 'Shared Documents', val: sharedDocuments.toString(), sub: 'Shared files', icon: Users, color: 'text-cyan-500', bg: 'bg-cyan-50' },
        ].map((k, i) => (
          <div key={i} className="bg-white p-2 rounded-xl border border-gray-100  flex items-center gap-2">
            <div className={`p-3 rounded-xl ${k.bg} ${k.color} shrink-0`}><k.icon size={20} /></div>
            <div>
              <div className="text-sm font-medium text-gray-500 mb-0.5">{k.title}</div>
              <div className="text-xl  text-gray-900 mb-0.5">{k.val}</div>
              <div className="text-[9px] text-gray-400">{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT COLUMN (8 cols) */}
        <div className="col-span-8 flex flex-col gap-6">

          {/* Filters Bar */}
          <div className="flex items-center flex-wrap gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search documents by name..." className=" pl-9 pr-4 py-2 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow  w-[200px]" />
            </div>
            <div className="w-[150px]">
              <SearchableSelect
                options={uniqueProjects}
                value={selectedProject}
                onChange={setSelectedProject}
                placeholder="All Projects"
              />
            </div>
            <div className="w-[150px]">
              <SearchableSelect
                options={uniqueCategories}
                value={selectedCategory}
                onChange={setSelectedCategory}
                placeholder="All Categories"
              />
            </div>
            <div className="w-[150px]">
              <SearchableSelect
                options={uniqueFileTypes}
                value={selectedFileType}
                onChange={setSelectedFileType}
                placeholder="All File Types"
              />
            </div>
            <div className="w-[150px]">
              <SearchableSelect
                options={uniqueUploadedBy}
                value={selectedUploadedBy}
                onChange={setSelectedUploadedBy}
                placeholder="Uploaded By"
              />
            </div>
            <div>
              <AdvancedDateRangePicker
                range={dateRange}
                onChange={setDateRange}
                initialRange="All Time"
              />
            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-white rounded-xl border border-gray-100  flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-[13px]  text-gray-900">Documents List <span className="text-gray-500 font-normal">(Total: {filteredFiles.length})</span></h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-xs  text-gray-500  bg-gray-50/50">
                    <th className="py-3 px-5 w-8"></th>
                    <th className="p-2">Document Name</th>
                    <th className="p-2">Project</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">File Type</th>
                    <th className="p-2 text-right">Size</th>
                    <th className="p-2 text-center">Uploaded By</th>
                    <th className="p-2 text-center">Uploaded On</th>
                    <th className="p-2 text-center">Version</th>
                    <th className="py-3 px-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredFiles.length === 0 ? <tr><td colSpan="10" className="py-8 text-center text-gray-500 text-sm">No documents found matching your filters.</td></tr> : filteredFiles.slice(0, 10).map((doc, idx) => (
                    <React.Fragment key={idx}>
                      <tr className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors group ${expandedRows[idx] ? 'bg-gray-50/50' : ''}`}>
                        <td className="py-3 px-5" onClick={() => toggleRow(idx)}>
                          <ChevronDown size={14} className={`text-gray-400 cursor-pointer transition-transform ${expandedRows[idx] ? 'rotate-0 text-indigo-600' : 'rotate-[-90deg]'}`} />
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-3">
                            <FileText size={16} className={doc.color} />
                            <div>
                              <div className=" text-gray-900">{doc.name}</div>
                              <div className="text-[9px] text-gray-400 mt-0.5">{doc.sub}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 text-gray-600 font-medium">{doc.project}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-[9px]  ${badgeColors[doc.category] || 'text-gray-600 bg-gray-100'}`}>{doc.category}</span>
                        </td>
                        <td className="p-2 font-medium text-gray-700">{doc.type}</td>
                        <td className="p-2 text-right font-medium text-gray-700">{doc.size}</td>
                        <td className="p-2 text-center font-medium text-gray-600">{doc.by}</td>
                        <td className="p-2 text-center">
                          <div className="font-medium text-gray-700">{doc.date}</div>
                          <div className="text-[9px] text-gray-400">{doc.time}</div>
                        </td>
                        <td className="p-2 text-center text-gray-500">{doc.version}</td>
                        <td className="py-3 px-5 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); alert(`Previewing document: ${doc.name}`); }} title="Preview Document" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Eye size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); alert(`Downloading document: ${doc.name}`); }} title="Download Document" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Download size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); alert(`Opening context menu for: ${doc.name}`); }} title="More Options" className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"><MoreVertical size={14} /></button>
                          </div>
                        </td>
                      </tr>
                      {expandedRows[idx] && (
                        <tr className="bg-gray-50/30 border-b border-gray-100">
                          <td colSpan="10" className="px-5 py-4">
                            <div className="flex gap-8 pl-8 border-l-2 border-indigo-200 ml-4">
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Folder Location</p>
                                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                  <Folder size={14} className="text-gray-400" />
                                  {doc.folder || 'Root'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Access Level</p>
                                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                  {doc.access === 'Private' ? <Lock size={14} className="text-amber-500" /> : <Globe size={14} className="text-emerald-500" />}
                                  {doc.access || 'Private'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Document ID</p>
                                <p className="text-sm font-medium text-gray-900 font-mono">
                                  DOC-{String(doc.id).padStart(4, '0')}
                                </p>
                              </div>
                              <div className="flex-1">
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Description</p>
                                <p className="text-sm text-gray-700">
                                  {doc.sub !== 'Document' ? doc.sub : 'No additional description provided for this document.'}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <div>Showing 1 to {Math.min(10, filteredFiles.length)} of {filteredFiles.length} entries</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 mr-4">
                  <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100"><ChevronDown size={12} className="rotate-90" /></button>
                  <button className="w-6 h-6 flex items-center justify-center rounded bg-indigo-600 text-white font-medium">1</button>
                  <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 font-medium">2</button>
                  <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 font-medium">3</button>
                  <span className="px-1">...</span>
                  <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 font-medium">25</button>
                  <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100"><ChevronDown size={12} className="-rotate-90" /></button>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 border border-gray-200 rounded cursor-pointer">
                  <span>10 / page</span>
                  <ChevronDown size={12} />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Documents Cards */}
          <div className="bg-white rounded-xl border border-gray-100  p-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[13px]  text-gray-900">Recent Documents</h3>
              <span className="text-xs text-indigo-600 font-medium cursor-pointer hover:underline">View All</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {filteredFiles.slice(0, 4).map((doc, idx) => (
                <div key={idx} className="border border-gray-100 rounded p-3 hover:border-indigo-200 hover: transition-all group cursor-pointer relative">
                  <div className="flex items-start gap-3">
                    <FileText size={20} className={`${doc.color} shrink-0 mt-0.5`} />
                    <div className="min-w-0">
                      <div className=" text-sm text-gray-900 truncate" title={doc.name}>{doc.name}</div>
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">{doc.by}</div>
                      <div className="flex items-center gap-3 mt-2 text-[9px] text-gray-400 font-medium">
                        <span>{doc.date.split(' ')[0]} {doc.date.split(' ')[1]}</span>
                        <span>{doc.size}</span>
                      </div>
                    </div>
                  </div>
                  <button className="absolute bottom-3 right-3 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors opacity-0 group-hover:opacity-100">
                    <Download size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (4 cols) */}
        <div className="col-span-4 flex flex-col gap-6">

          {/* Storage Overview */}
          <div className="bg-white p-2 rounded-xl border border-gray-100  flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[13px]  text-gray-900">Storage Overview</h3>
              <span className="text-xs text-indigo-600 font-medium cursor-pointer hover:underline">View Details</span>
            </div>
            <div className="flex flex-col flex-1">
              <div className="relative h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={storageData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                      {storageData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                  <span className="text-2xl  text-gray-900 leading-none">8.62 GB</span>
                  <span className="text-xs text-gray-500 mt-1">Used</span>
                </div>
              </div>
              <div className="flex flex-col justify-center px-4 space-y-3 mt-6">
                {storageData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                      <span className="text-sm font-medium text-gray-600">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-500 w-12 text-right">{d.value} GB</span>
                      <span className="text-xs text-gray-400 w-8 text-right">({d.pct})</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100">
                  <span className="text-sm  text-gray-900 pl-4">Total</span>
                  <span className="text-sm  text-gray-900 pr-12">8.62 GB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access */}
          <div className="bg-white p-2 rounded-xl border border-gray-100 ">
            <h3 className="text-[13px]  text-gray-900 mb-4">Quick Access</h3>
            <div className="space-y-1">
              {[
                { label: 'Recent Documents', icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50', count: recentDocumentsCount },
                { label: 'Starred Documents', icon: Star, color: 'text-blue-600', bg: 'bg-blue-50', count: 0 },
                { label: 'Shared with Me', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', count: sharedDocuments },
                { label: 'Trash', icon: Trash2, color: 'text-orange-500', bg: 'bg-orange-50', count: 0 },
              ].map((q, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${q.bg} ${q.color}`}><q.icon size={14} /></div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{q.label}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500">{q.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Folders */}
          <div className="bg-white p-2 rounded-xl border border-gray-100  flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[13px]  text-gray-900">Folders</h3>
              <span className="text-xs text-indigo-600 font-medium cursor-pointer hover:underline flex items-center gap-1"><Plus size={10} /> New Folder</span>
            </div>

            <div className="space-y-2">
              <div onClick={() => setSelectedFolder('All Documents')} className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${selectedFolder === 'All Documents' ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <FolderOpen size={14} className="text-indigo-600" />
                  <span className="text-sm  text-indigo-700">All Documents</span>
                </div>
                <span className="text-xs  text-indigo-700">{totalDocuments}</span>
              </div>

              <div className="pl-4 space-y-1">
                {uniqueFolders.map((folder, i) => (
                  <div key={i} onClick={() => setSelectedFolder(folder)} className={`flex items-center justify-between p-1.5 rounded cursor-pointer group transition-colors ${selectedFolder === folder ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-2">
                      <Folder size={12} className={selectedFolder === folder ? "text-indigo-600" : "text-blue-500"} />
                      <span className={`text-sm font-medium group-hover:text-gray-900 ${selectedFolder === folder ? 'text-indigo-700' : 'text-gray-700'}`}>{folder}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-500">{folderCounts[folder]}</span>
                  </div>
                ))}
                {
                  []}
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="mt-8 text-center text-xs text-gray-400">
        © 2026 Codigix Infotech Pvt. Ltd. All rights reserved. <span className="float-right">Version 1.0.0</span>
      </div>
    </div>
  );
};

export default SeoGmbDocumentsPage;

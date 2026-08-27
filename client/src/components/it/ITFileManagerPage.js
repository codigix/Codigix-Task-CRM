import React, { useState } from 'react';
import {
  File, Folder, HardDrive, Search, Filter, ChevronDown,
  Download, Share2, MoreVertical, LayoutGrid, List, Info, RefreshCw,
  FolderOpen, Cloud, Database, FileText, Upload, Users, Star, Trash2, Clock,
  X, Check
} from 'lucide-react';

const ALL_FILES = [];

const STORAGE_LOCATIONS = [];

const QUICK_ACCESS = [];

const STORAGE_DETAILS = [];

function LocationIcon({ type, active }) {
  const cls = 'w-4 h-4 shrink-0';
  if (type === 'folder-red') return <Folder size={14} className={active ? 'text-red-500' : 'text-orange-400'} fill="currentColor" />;
  if (type === 'gdrive') return (
    <svg className={cls} viewBox="0 0 24 24" fill="none">
      <path d="M4.5 19.5L8 13.5H22.5L19 19.5H4.5Z" fill="#0066DA" />
      <path d="M1.5 19.5L8 8.5L11.5 14.5L5 19.5H1.5Z" fill="#00AC47" />
      <path d="M8 8.5L14.5 8.5L22.5 13.5H8L8 8.5Z" fill="#EA4335" opacity="0.9" />
    </svg>
  );
  if (type === 'dropbox') return (
    <svg className={cls} viewBox="0 0 24 24" fill="#0061FF">
      <path d="M6 2L12 6.5L6 11L0 6.5L6 2ZM18 2L24 6.5L18 11L12 6.5L18 2ZM0 12.5L6 8L12 12.5L6 17L0 12.5ZM12 12.5L18 8L24 12.5L18 17L12 12.5ZM6 18.5L12 14L18 18.5L12 23L6 18.5Z" />
    </svg>
  );
  if (type === 'onedrive') return <Cloud size={14} className="text-blue-500" />;
  if (type === 'aws') return <Database size={14} className="text-orange-500" />;
  if (type === 'hdd') return <HardDrive size={14} className="text-gray-500" />;
  if (type === 'folder') return <Folder size={14} className="text-gray-400" />;
  if (type === 'users') return <Users size={14} className="text-gray-400" />;
  if (type === 'clock') return <Clock size={14} className="text-gray-400" />;
  if (type === 'star') return <Star size={14} className="text-gray-400" />;
  if (type === 'trash') return <Trash2 size={14} className="text-gray-400" />;
  return <File size={14} className="text-gray-400" />;
}

function FileIcon({ type }) {
  if (type === 'Folder') return <Folder size={20} className="text-orange-400" fill="currentColor" />;
  if (type === 'PDF') return <FileText size={20} className="text-red-500" />;
  if (type === 'Excel') return <FileText size={20} className="text-green-600" />;
  if (type === 'Word') return <FileText size={20} className="text-blue-500" />;
  if (type === 'Visio') return <File size={20} className="text-blue-700" />;
  if (type === 'YAML') return <File size={20} className="text-purple-600" />;
  if (type === 'SQL') return <Database size={20} className="text-orange-500" />;
  return <FileText size={20} className="text-gray-400" />;
}

function ChevRight(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export default function ITFileManagerPage() {
  const [activeLocation, setActiveLocation] = useState('All Files');
  const [activeQuick, setActiveQuick] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('Name (A-Z)');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [contextMenu, setContextMenu] = useState(null); // { fileId, x, y }
  const [notification, setNotification] = useState(null);

  const showNotif = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  const handleLocationClick = (label) => {
    setActiveLocation(label);
    setActiveQuick(null);
    setSearchTerm('');
    setSelectedFiles([]);
  };

  const handleQuickClick = (label) => {
    setActiveQuick(label);
    setActiveLocation(null);
    setSelectedFiles([]);
  };

  const getFilteredFiles = () => {
    let list = ALL_FILES;
    if (activeLocation && activeLocation !== 'All Files') {
      list = list.filter(f => f.location === activeLocation);
    }
    if (activeQuick === 'My Files') list = list.filter(f => f.user.name === 'Emma Johnson');
    if (activeQuick === 'Recent Files') list = list.slice(0, 5);
    if (activeQuick === 'Important') list = list.filter(f => f.type !== 'Folder');
    if (activeQuick === 'Recycle Bin') list = [];
    if (searchTerm) list = list.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (sortBy === 'Name (A-Z)') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'Name (Z-A)') list = [...list].sort((a, b) => b.name.localeCompare(a.name));
    if (sortBy === 'Size') list = [...list].sort((a, b) => (a.size === '-' ? -1 : 1));
    if (sortBy === 'Date Modified') list = [...list].sort((a, b) => b.date.localeCompare(a.date));
    return list;
  };

  const filteredFiles = getFilteredFiles();

  const toggleSelectFile = (id) => {
    setSelectedFiles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) setSelectedFiles([]);
    else setSelectedFiles(filteredFiles.map(f => f.id));
  };

  const handleShare = (file) => {
    showNotif(`Link copied for "${file.name}"`);
  };

  const handleDownload = (file) => {
    showNotif(`Downloading "${file.name}"...`);
  };

  const handleContextMenuAction = (action, file) => {
    setContextMenu(null);
    if (action === 'share') handleShare(file);
    if (action === 'download') handleDownload(file);
    if (action === 'rename') showNotif(`Rename "${file.name}"`);
    if (action === 'delete') showNotif(`Deleted "${file.name}"`);
  };

  const kpis = [
    { label: 'Total Files', value: '1,248', trend: '+18%', icon: <File size={20} className="text-blue-500" />, bg: 'bg-blue-50' },
    { label: 'Total Folders', value: '156', trend: '+12%', icon: <FolderOpen size={20} className="text-orange-500" />, bg: 'bg-orange-50' },
    { label: 'Storage Used', value: '77.2 GB', subValue: 'of 100 GB', progress: 77, type: 'progress' },
    { label: 'Recent Uploads', value: '32', trend: '+8%', icon: <Upload size={20} className="text-purple-500" />, bg: 'bg-purple-50' },
    { label: 'Shared Files', value: '86', trend: '+15%', icon: <Users size={20} className="text-emerald-500" />, bg: 'bg-emerald-50' },
  ];

  const breadcrumbLabel = activeQuick || activeLocation || 'All Files';

  return (
    <div className="bg-[#f8fafc] min-h-screen p-6 font-sans text-gray-900 relative" onClick={() => { setShowSortMenu(false); setContextMenu(null); }}>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-2 right-6 z-50 bg-gray-900 text-white text-xs  p-2.5 rounded shadow-xl flex items-center gap-2 animate-pulse">
          <Check size={14} className="text-green-400" /> {notification}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded shadow-2xl py-1 w-44 text-[12px]  text-gray-700"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button className="w-full p-2 hover:bg-gray-50 flex items-center gap-2 text-left" onClick={() => handleContextMenuAction('share', contextMenu.file)}><Share2 size={13} className="text-blue-500" /> Share</button>
          <button className="w-full p-2 hover:bg-gray-50 flex items-center gap-2 text-left" onClick={() => handleContextMenuAction('download', contextMenu.file)}><Download size={13} className="text-green-600" /> Download</button>
          <button className="w-full p-2 hover:bg-gray-50 flex items-center gap-2 text-left" onClick={() => handleContextMenuAction('rename', contextMenu.file)}><FileText size={13} className="text-purple-500" /> Rename</button>
          <hr className="my-1 border-gray-100" />
          <button className="w-full p-2 hover:bg-red-50 text-red-500 flex items-center gap-2 text-left" onClick={() => handleContextMenuAction('delete', contextMenu.file)}><Trash2 size={13} /> Delete</button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px]  text-gray-900 leading-tight">File Manager</h1>
        <p className="text-sm text-gray-500 mt-1">Store, organize and manage all IT department files and documents</p>
        <div className="flex items-center text-xs text-gray-400 mt-2 font-medium gap-1">
          <span className="hover:text-blue-600 cursor-pointer flex items-center gap-1"><HomeIcon className="w-3 h-3" /> Home</span>
          <ChevRight className="w-3 h-3" />
          <span className="hover:text-blue-600 cursor-pointer">Applications</span>
          <ChevRight className="w-3 h-3" />
          <span className="text-gray-600 ">File Manager</span>
        </div>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {kpis.map((kpi, idx) => {
          if (kpi.type === 'progress') {
            return (
              <div key={idx} className="bg-white p-4 rounded  border border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-xs  text-gray-500  tracking-wider block mb-1">{kpi.label}</span>
                  <span className="text-[20px] font-black text-gray-900 leading-none">{kpi.value}</span>
                  <span className="text-xs font-medium text-gray-400 block mt-1">{kpi.subValue}</span>
                </div>
                <div className="relative w-12 h-12">
                  <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                    <path fill="none" stroke="#e5e7eb" strokeWidth="3" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path fill="none" stroke="#22c55e" strokeWidth="3" strokeDasharray={`${kpi.progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs  text-gray-800">{kpi.progress}%</span>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div key={idx} className="bg-white p-4 rounded  border border-gray-100 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full ${kpi.bg} flex items-center justify-center shrink-0`}>
                {kpi.icon}
              </div>
              <div>
                <span className="text-xs  text-gray-500  tracking-wider block mb-1">{kpi.label}</span>
                <span className="text-[20px] font-black text-gray-900 leading-none">{kpi.value}</span>
                <span className="text-xs  text-green-500 flex items-center gap-1 mt-1">
                  ↑ {kpi.trend} <span className="text-gray-400 font-medium">vs last month</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-6">

        {/* Left Sidebar */}
        <div className="w-[250px] shrink-0 space-y-5">

          {/* Storage Locations */}
          <div className="bg-white rounded  border border-gray-100 overflow-hidden">
            <h3 className="text-xs  text-gray-700   p-4 pb-2">Storage Locations</h3>
            <ul className="p-2 space-y-0.5">
              {STORAGE_LOCATIONS.map((loc) => {
                const isActive = activeLocation === loc.label && !activeQuick;
                return (
                  <li
                    key={loc.label}
                    onClick={() => handleLocationClick(loc.label)}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer text-[12px]  transition-colors
                      ${isActive ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LocationIcon type={loc.iconType} active={isActive} />
                      {loc.label}
                    </div>
                    <span className={`text-xs  ${isActive ? 'text-red-400' : 'text-gray-400'}`}>{loc.count}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Quick Access */}
          <div className="bg-white rounded  border border-gray-100 overflow-hidden">
            <h3 className="text-xs  text-gray-700   p-4 pb-2">Quick Access</h3>
            <ul className="p-2 space-y-0.5">
              {QUICK_ACCESS.map((item) => {
                const isActive = activeQuick === item.label;
                return (
                  <li
                    key={item.label}
                    onClick={() => handleQuickClick(item.label)}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer text-[12px]  transition-colors
                      ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LocationIcon type={item.iconType} />
                      {item.label}
                    </div>
                    {item.count && (
                      <span className="text-xs  bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{item.count}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Storage Details */}
          <div className="bg-white rounded  border border-gray-100 p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs  text-gray-700  ">Storage Details</h3>
              <span className="text-xs  bg-green-50 text-green-600 px-2 py-0.5 rounded">Used 77%</span>
            </div>
            <div className="space-y-2.5">
              {STORAGE_DETAILS.map((detail) => (
                <div key={detail.label} className="flex items-center justify-between text-xs  text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${detail.color} shrink-0`} />
                    {detail.label}
                  </div>
                  <span className="text-gray-900 ">{detail.size}</span>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <div className="flex justify-between text-xs  text-gray-900 mb-1.5">
                <span>Total Used</span>
                <span className="text-gray-500 ">77.2 GB / 100 GB</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="bg-green-500 h-full" style={{ width: '24%' }} />
                <div className="bg-yellow-500 h-full" style={{ width: '13%' }} />
                <div className="bg-blue-400 h-full" style={{ width: '8%' }} />
                <div className="bg-purple-500 h-full" style={{ width: '16%' }} />
                <div className="bg-orange-500 h-full" style={{ width: '15%' }} />
              </div>
            </div>
          </div>

        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white rounded  border border-gray-100 flex flex-col overflow-hidden">

          {/* Main Header */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-[15px]  text-gray-900">
              {breadcrumbLabel === 'Recycle Bin' ? '🗑 Recycle Bin' : 'All Files'}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={() => setViewMode('list')} className={`w-8 h-8 flex items-center justify-center rounded border transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-700 border-gray-200 ' : 'text-gray-400 border-transparent hover:bg-gray-50'}`}>
                <List size={16} />
              </button>
              <button onClick={() => setViewMode('grid')} className={`w-8 h-8 flex items-center justify-center rounded border transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-700 border-gray-200 ' : 'text-gray-400 border-transparent hover:bg-gray-50'}`}>
                <LayoutGrid size={16} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded ml-1" onClick={() => showNotif('Refreshing files...')}><RefreshCw size={15} /></button>
              <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded"><Info size={15} /></button>
            </div>
          </div>

          {/* Breadcrumb Row */}
          <div className="p-2.5 flex items-center text-xs  text-gray-600 gap-1.5 border-b border-gray-50 bg-gray-50/50">
            <input type="checkbox" className="rounded border-gray-300 mr-1" checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0} onChange={toggleSelectAll} />
            <button onClick={() => { setActiveLocation('All Files'); setActiveQuick(null); }} className="hover:text-blue-600"><HomeIcon className="w-3.5 h-3.5 inline" /></button>
            <ChevRight className="w-3 h-3 text-gray-300" />
            <button onClick={() => { setActiveLocation('All Files'); setActiveQuick(null); }} className="hover:text-blue-600">All Files</button>
            {activeQuick && <><ChevRight className="w-3 h-3 text-gray-300" /><span className="text-gray-900 ">{activeQuick}</span></>}
            {activeLocation && activeLocation !== 'All Files' && <><ChevRight className="w-3 h-3 text-gray-300" /><span className="text-gray-900 ">{activeLocation}</span></>}
            {!activeQuick && <><ChevRight className="w-3 h-3 text-gray-300" /><span className="text-gray-900 ">IT Department</span></>}
          </div>

          {/* Filters Row */}
          <div className="p-3 flex gap-2 border-b border-gray-100">
            <div className="relative max-w-[260px] flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search in IT Department"
                className="w-full pl-8 pr-4 py-1.5 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500 "
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>
              )}
            </div>
            <button className="flex items-center gap-1.5 p-2 bg-white border border-gray-200 rounded  text-gray-700 text-xs  hover:bg-gray-50">
              <Filter size={13} /> Filters
            </button>

            {/* Sort Dropdown */}
            <div className="relative ml-auto" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowSortMenu(prev => !prev)}
                className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded  cursor-pointer hover:bg-gray-50 text-xs  text-gray-700"
              >
                Sort by: {sortBy} <ChevronDown size={13} className="text-gray-400" />
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded shadow-xl py-1 w-44 text-[12px]  text-gray-700">
                  {['Name (A-Z)', 'Name (Z-A)', 'Date Modified', 'Size'].map(opt => (
                    <button key={opt} onClick={() => { setSortBy(opt); setShowSortMenu(false); }}
                      className={`w-full p-2 text-left hover:bg-gray-50 flex items-center gap-2 ${sortBy === opt ? 'text-blue-600' : ''}`}>
                      {sortBy === opt && <Check size={12} />} {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="px-2 py-1.5 border border-gray-200 rounded  hover:bg-gray-50 text-gray-500">
              <MoreVertical size={13} />
            </button>
          </div>

          {/* Bulk Action Bar */}
          {selectedFiles.length > 0 && (
            <div className="p-2 bg-blue-50 border-b border-blue-100 flex items-center gap-3 text-[12px]  text-blue-700">
              <span>{selectedFiles.length} item{selectedFiles.length > 1 ? 's' : ''} selected</span>
              <button onClick={() => showNotif('Downloading selected files...')} className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs"><Download size={12} /> Download</button>
              <button onClick={() => showNotif('Sharing selected files...')} className="flex items-center gap-1 px-2 py-1 rounded border border-blue-300 hover:bg-blue-100 text-xs"><Share2 size={12} /> Share</button>
              <button onClick={() => { showNotif('Deleted selected files'); setSelectedFiles([]); }} className="flex items-center gap-1 px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 text-xs"><Trash2 size={12} /> Delete</button>
              <button onClick={() => setSelectedFiles([])} className="ml-auto text-gray-500 hover:text-gray-700"><X size={14} /></button>
            </div>
          )}

          {/* Content Area */}
          {filteredFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-gray-400">
              <Trash2 size={40} className="opacity-30" />
              <p className="text-xs ">{activeQuick === 'Recycle Bin' ? 'Recycle Bin is empty' : 'No files found'}</p>
              {searchTerm && <button onClick={() => setSearchTerm('')} className="text-blue-600 text-xs hover:underline">Clear search</button>}
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 w-10"><input type="checkbox" className="rounded border-gray-300" checked={selectedFiles.length === filteredFiles.length} onChange={toggleSelectAll} /></th>
                    <th className="py-3 pr-4 text-xs  text-gray-500">Name</th>
                    <th className="px-4 py-3 text-xs  text-gray-500">Type</th>
                    <th className="px-4 py-3 text-xs  text-gray-500">Size</th>
                    <th className="px-4 py-3 text-xs  text-gray-500">Modified</th>
                    <th className="px-4 py-3 text-xs  text-gray-500">Modified By</th>
                    <th className="px-4 py-3 text-xs  text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedFiles.includes(file.id) ? 'bg-blue-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" className="rounded border-gray-300" checked={selectedFiles.includes(file.id)} onChange={() => toggleSelectFile(file.id)} />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => showNotif(`Opening "${file.name}"...`)}>
                          <FileIcon type={file.type} />
                          <div>
                            <p className="text-xs  text-gray-800 hover:text-blue-600 transition-colors">{file.name}</p>
                            <p className="text-xs text-gray-400 font-medium">{file.subtitle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {file.type === 'Folder' ? (
                          <span className="text-xs  text-gray-500">Folder</span>
                        ) : (
                          <span className={`text-xs  px-2 py-0.5 rounded bg-gray-100 ${file.typeColor || 'text-gray-600'}`}>{file.type}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs  text-gray-500">{file.size}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs  text-gray-700">{file.date}</p>
                        <p className="text-xs text-gray-400 font-medium">{file.time}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img src={file.user.avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover" />
                          <div>
                            <p className="text-xs  text-gray-800 leading-tight">{file.user.name}</p>
                            <p className="text-[9px] text-gray-400 font-medium">{file.user.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2 text-gray-400">
                          {file.type === 'Folder'
                            ? <button onClick={() => handleShare(file)} className="hover:text-blue-500 transition-colors p-1 rounded hover:bg-blue-50"><Share2 size={14} /></button>
                            : <button onClick={() => handleDownload(file)} className="hover:text-green-600 transition-colors p-1 rounded hover:bg-green-50"><Download size={14} /></button>
                          }
                          <button
                            className="hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-100"
                            onClick={(e) => { e.stopPropagation(); setContextMenu({ file, x: e.clientX, y: e.clientY }); }}
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="flex-1 p-4 grid grid-cols-4 gap-4 overflow-y-auto content-start">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => showNotif(`Opening "${file.name}"...`)}
                  className={`border border-gray-100 rounded p-4 hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group flex flex-col gap-3 ${selectedFiles.includes(file.id) ? 'ring-2 ring-blue-400 bg-blue-50/30' : 'bg-white'}`}
                >
                  <div className="flex items-start justify-between">
                    <FileIcon type={file.type} />
                    <button
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 p-0.5 rounded"
                      onClick={(e) => { e.stopPropagation(); setContextMenu({ file, x: e.clientX, y: e.clientY }); }}
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                  <div>
                    <p className="text-[12px]  text-gray-800 truncate group-hover:text-blue-600 transition-colors">{file.name}</p>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">{file.subtitle} • {file.size !== '-' ? file.size : 'Folder'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-auto">
                    <img src={file.user.avatar} alt="avatar" className="w-4 h-4 rounded-full" />
                    <p className="text-xs text-gray-500  truncate">{file.user.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Footer */}
          <div className="p-3 border-t border-gray-100 flex justify-between items-center bg-white">
            <span className="text-xs  text-gray-500">
              Showing {filteredFiles.length} of 1,248 files
            </span>
            <div className="flex items-center gap-1">
              <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100">
                <ChevRight className="w-3 h-3 rotate-180" />
              </button>
              {[1, 2, 3, 4, 5].map(pg => (
                <button key={pg} className={`w-7 h-7 flex items-center justify-center rounded text-xs  ${pg === 1 ? 'bg-red-600 text-white ' : 'text-gray-600 hover:bg-gray-100'}`}>{pg}</button>
              ))}
              <span className="text-gray-400 mx-1 text-xs">...</span>
              <button className="w-9 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded text-xs ">125</button>
              <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100">
                <ChevRight className="w-3 h-3" />
              </button>
              <div className="ml-3 flex items-center gap-1 border border-gray-200 rounded px-2 py-1 cursor-pointer hover:bg-gray-50 text-xs  text-gray-600">
                10 / page <ChevronDown size={11} className="text-gray-400" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

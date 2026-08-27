import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {

  Search, Plus, Star, MoreVertical, X, Filter, ChevronRight,
  FileText, BookOpen, Trash2, Clock, Users, Heart, ChevronDown,
  LayoutGrid, List, Download, Edit3, Eye, Paperclip, Tag, Folder,
  Hash, AlertCircle, Calendar, CheckSquare
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ─── Mock Data ──────────────────────────────────────────────────────────────
const AVATARS = {
  'Michael Brown': 'https://i.pravatar.cc/150?u=michael',
  'Daniel Martinez': 'https://i.pravatar.cc/150?u=daniel',
  'Emma Johnson': 'https://i.pravatar.cc/150?u=emma',
  'Sophia Davis': 'https://i.pravatar.cc/150?u=sophia',
  'James Wilson': 'https://i.pravatar.cc/150?u=james',
  'Olivia Taylor': 'https://i.pravatar.cc/150?u=olivia',
};

const ROLES = {
  'Michael Brown': 'DevOps Engineer',
  'Daniel Martinez': 'Tech Lead',
  'Emma Johnson': 'Project Manager',
  'Sophia Davis': 'System Analyst',
  'James Wilson': 'QA Engineer',
  'Olivia Taylor': 'Business Analyst',
};

const CATEGORIES = [];

const TAGS = ['#Policy', '#Server', '#Database', '#Security', '#Deployment', '#API', '#Manual', '#Guide', '#Incident', '#Meeting'];



const NAV_ITEMS = [];

const FILE_ICON_COLORS = {
  pdf: { bg: 'bg-red-100', text: 'text-red-600', label: 'PDF' },
  png: { bg: 'bg-green-100', text: 'text-green-600', label: 'PNG' },
  xlsx: { bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'XLS' },
  config: { bg: 'bg-purple-100', text: 'text-purple-600', label: 'CFG' },
  default: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'FILE' },
};

function FileIcon({ type, size = 32 }) {
  const cfg = FILE_ICON_COLORS[type] || FILE_ICON_COLORS.default;
  return (
    <div className={`${cfg.bg} rounded flex items-center justify-center text-[8px] font-black ${cfg.text}`} style={{ width: size, height: size }}>
      {cfg.label}
    </div>
  );
}

function Avatar({ name, size = 28 }) {
  const src = AVATARS[name] || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`;
  return (
    <img src={src} alt={name} className="rounded-full object-cover shrink-0 border-2 border-white"
      style={{ width: size, height: size }} />
  );
}

const TYPE_BADGE = {
  'Wiki Page': 'bg-blue-50 text-blue-600 border border-blue-100',
  'Note': 'bg-green-50 text-green-600 border border-green-100',
};

export default function ITNotesPage() {

  const navigate = useNavigate();
  const location = useLocation();
  const { username, designation } = useParams();
  const isIT = location.pathname.includes('/it/');

  const [allNotes, setAllNotes] = useState([]);

  const navCounts = useMemo(() => {
    return {
      'All Notes': allNotes.length,
      'My Notes': allNotes.filter(n => n.createdBy === 'Admin').length,
      'Favorites': allNotes.filter(n => n.starred).length,
      'Shared with Me': 0,
      'Recent': allNotes.slice(0, 10).length,
      'Trash': 0
    };
  }, [allNotes]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    allNotes.forEach(n => {
      const cat = n.category || 'Others';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [allNotes]);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await axios.get(API_BASE_URL + '/notes');
        const formatted = res.data.map(n => {
          let extra = {};
          try {
            if (n.description && n.description.startsWith('{')) {
              extra = JSON.parse(n.description);
            }
          } catch (e) { }

          return {
            id: n.id,
            title: n.title,
            starred: n.is_important === 1,
            subtitle: extra.summary || 'Note Document',
            type: extra.type || 'Note',
            category: extra.category || 'General',
            updatedBy: n.created_by || 'Admin',
            updatedAt: new Date(n.created_at).toLocaleDateString(),
            time: new Date(n.created_at).toLocaleTimeString(),
            createdBy: n.created_by || 'Admin',
            createdAt: new Date(n.created_at).toLocaleString(),
            lastUpdated: new Date(n.created_at).toLocaleString(),
            tags: extra.tags ? extra.tags.split(',').map(t => t.trim()) : [],
            description: extra.content || n.description || '',
            attachments: [],
            recentInCategory: []
          };
        });
        setAllNotes(formatted);
      } catch (err) {
        console.error('Failed to fetch notes', err);
      }
    };
    fetchNotes();
  }, []);

  const [selectedNav, setSelectedNav] = useState('All Notes');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);

  useEffect(() => {
    if (allNotes.length > 0 && !selectedNote) {
      setSelectedNote(allNotes[0]);
    }
  }, [allNotes]);
  const [activeTab, setActiveTab] = useState('All Content');
  const [viewMode, setViewMode] = useState('list');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('Recently Updated');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const filtered = useMemo(() => {
    let list = allNotes;
    if (activeTab === 'Notes') list = list.filter(n => n.type === 'Note');
    if (activeTab === 'Wiki Pages') list = list.filter(n => n.type === 'Wiki Page');
    if (selectedCategory) list = list.filter(n => n.category === selectedCategory);
    if (selectedNav === 'Favorites') list = list.filter(n => n.starred);
    if (search) list = list.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.subtitle.toLowerCase().includes(search.toLowerCase()));
    if (sortBy === 'Title A-Z') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === 'Oldest First') list = [...list].sort((a, b) => a.id - b.id);
    return list;
  }, [activeTab, selectedCategory, selectedNav, search, sortBy]);

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-gray-900 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
      <div className="w-[230px] shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">

        {/* Create New */}
        <div className="p-4 border-b border-gray-100">
          <button onClick={() => navigate(`/${isIT ? 'it' : 'seo-gmb'}/${designation || 'manager'}/${username || 'ashwini'}/notes/create`)} className="w-full flex items-center justify-between p-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded text-[12px]  text-gray-700 hover:text-blue-600 hover:border-blue-200 transition-all group">
            <div className="flex items-center gap-2"><Plus size={14} className="text-blue-500" /> Create New</div>
            <ChevronRight size={13} className="text-gray-400 group-hover:text-blue-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Nav Items */}
          {NAV_ITEMS.map(item => {
            const count = navCounts[item.label] || 0;
            return (
              <button key={item.label} onClick={() => { setSelectedNav(item.label); setSelectedCategory(null); }}
                className={`w-full flex items-center justify-between p-2 rounded text-[12px]  transition-all
                  ${selectedNav === item.label && !selectedCategory ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <div className="flex items-center gap-2.5">{item.icon}{item.label}</div>
                <span className={`text-xs  ${selectedNav === item.label && !selectedCategory ? 'text-red-400' : 'text-gray-400'}`}>{count}</span>
              </button>
            );
          })}

          {/* Categories */}
          <div className="pt-3">
            <div className="flex items-center justify-between p-2 mb-1">
              <span className="text-xs font-extrabold text-gray-400  tracking-wider">Categories</span>
              <button className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition-colors"><Plus size={12} /></button>
            </div>
            {CATEGORIES.map(cat => {
              const count = categoryCounts[cat.label] || 0;
              return (
                <button key={cat.label} onClick={() => { setSelectedCategory(cat.label); setSelectedNav(''); }}
                  className={`w-full flex items-center justify-between p-2 rounded text-xs  transition-all
                    ${selectedCategory === cat.label ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    <Folder size={12} className={selectedCategory === cat.label ? 'text-orange-400' : cat.color} />
                    <span className="truncate">{cat.label}</span>
                  </div>
                  <span className="text-[9px]  text-gray-400 shrink-0">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Tags */}
          <div className="pt-3">
            <div className="p-2 mb-2">
              <span className="text-xs font-extrabold text-gray-400  tracking-wider">Tags</span>
            </div>
            <div className="px-3 flex flex-wrap gap-1.5">
              {TAGS.slice(0, 7).map(tag => (
                <button key={tag} onClick={() => setSearch(tag.replace('#', ''))}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 rounded-full text-xs  transition-colors">
                  {tag}
                </button>
              ))}
            </div>
            <button className="mt-2 px-3 text-xs  text-blue-600 hover:text-blue-700">View all tags</button>
          </div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Page Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-white">
          <h1 className="text-[20px]  text-gray-900">Notes & Wiki</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">Create, organize and share knowledge with your team</p>
        </div>

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4">
          {/* Search */}
          <div className="relative max-w-[240px] flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search notes & wiki..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded text-[12px] focus:outline-none focus:border-blue-400 transition-all" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {['All Content', 'Notes', 'Wiki Pages'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`p-2 text-[12px]  rounded transition-colors border
                  ${activeTab === tab ? 'bg-red-600 text-white border-red-600 ' : 'text-gray-600 border-gray-100 hover:bg-gray-50'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Sort */}
            <div className="relative">
              <button onClick={() => setShowSortMenu(p => !p)}
                className="flex items-center gap-2 p-2 border border-gray-200 rounded bg-white text-[12px]  text-gray-700 hover:bg-gray-50 ">
                Sort by: {sortBy} <ChevronDown size={12} className="text-gray-400" />
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-9 z-50 bg-white border border-gray-200 rounded shadow-xl py-1 w-44">
                  {['Recently Updated', 'Title A-Z', 'Oldest First'].map(opt => (
                    <button key={opt} onClick={() => { setSortBy(opt); setShowSortMenu(false); }}
                      className={`w-full p-2 text-left text-[12px]  hover:bg-gray-50 ${sortBy === opt ? 'text-blue-600 ' : 'text-gray-700'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setViewMode('list')} className={`w-8 h-8 flex items-center justify-center rounded border transition-colors ${viewMode === 'list' ? 'bg-gray-100 border-gray-200 text-gray-700' : 'border-transparent text-gray-400 hover:bg-gray-50'}`}><List size={15} /></button>
            <button onClick={() => setViewMode('grid')} className={`w-8 h-8 flex items-center justify-center rounded border transition-colors ${viewMode === 'grid' ? 'bg-gray-100 border-gray-200 text-gray-700' : 'border-transparent text-gray-400 hover:bg-gray-50'}`}><LayoutGrid size={15} /></button>
          </div>
        </div>

        {/* Content Table / Grid */}
        <div className="flex-1 overflow-y-auto" onClick={() => setShowSortMenu(false)}>
          {viewMode === 'list' ? (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="pl-6 py-3 text-left text-xs font-extrabold text-gray-500  tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-gray-500  tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-gray-500  tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-gray-500  tracking-wider">Updated By</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-gray-500  tracking-wider">Updated At</th>
                  <th className="px-4 py-3 text-right text-xs font-extrabold text-gray-500  tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(note => (
                  <tr key={note.id} onClick={() => setSelectedNote(note)}
                    className={`border-b border-gray-50 cursor-pointer hover:bg-blue-50/30 transition-colors
                      ${selectedNote?.id === note.id ? 'bg-blue-50/40' : 'bg-white'}`}>
                    <td className="pl-6 py-3.5">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 mt-0.5
                          ${note.type === 'Wiki Page' ? 'bg-blue-100' : 'bg-green-100'}`}>
                          {note.type === 'Wiki Page' ? <BookOpen size={14} className="text-blue-600" /> : <FileText size={14} className="text-green-600" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs  text-gray-900 hover:text-blue-700">{note.title}</span>
                            {note.starred && <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" />}
                          </div>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">{note.subtitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs  px-2 py-1 rounded ${TYPE_BADGE[note.type]}`}>{note.type}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs  text-gray-600">{note.category}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={note.updatedBy} size={26} />
                        <div>
                          <p className="text-xs  text-gray-800 leading-tight">{note.updatedBy}</p>
                          <p className="text-[9px] text-gray-400 font-medium">{ROLES[note.updatedBy]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs  text-gray-700">{note.updatedAt}</p>
                      <p className="text-xs text-gray-400">{note.time}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={e => e.stopPropagation()} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 ml-auto transition-colors">
                        <MoreVertical size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-2 grid grid-cols-3 gap-4">
              {filtered.map(note => (
                <div key={note.id} onClick={() => setSelectedNote(note)}
                  className={`bg-white rounded border p-4 cursor-pointer hover:shadow-md transition-all group
                    ${selectedNote?.id === note.id ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-100 hover:border-blue-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded flex items-center justify-center ${note.type === 'Wiki Page' ? 'bg-blue-100' : 'bg-green-100'}`}>
                      {note.type === 'Wiki Page' ? <BookOpen size={16} className="text-blue-600" /> : <FileText size={16} className="text-green-600" />}
                    </div>
                    <div className="flex items-center gap-1">
                      {note.starred && <Star size={12} className="text-amber-400 fill-amber-400" />}
                      <span className={`text-[9px]  px-1.5 py-0.5 rounded ${TYPE_BADGE[note.type]}`}>{note.type}</span>
                    </div>
                  </div>
                  <h4 className="text-xs  text-gray-900 mb-1 group-hover:text-blue-700 transition-colors line-clamp-1">{note.title}</h4>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{note.subtitle}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Avatar name={note.updatedBy} size={20} />
                      <span className="text-xs  text-gray-500">{note.updatedAt}</span>
                    </div>
                    <span className="text-xs  text-gray-400">{note.category.split(' ')[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center">
            <span className="text-xs  text-gray-500">Showing 1 to {filtered.length} of {filtered.length} entries</span>
            <div className="flex items-center gap-1">
              <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"><ChevronRight size={13} className="rotate-180" /></button>
              {[1, 2, 3, 4, 5].map(p => (
                <button key={p} className={`w-7 h-7 flex items-center justify-center rounded text-[12px]  ${p === 1 ? 'bg-red-600 text-white ' : 'text-gray-600 hover:bg-gray-100'}`}>{p}</button>
              ))}
              <span className="text-gray-400 mx-1">...</span>
              <button className="w-8 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded text-[12px] ">13</button>
              <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"><ChevronRight size={13} /></button>
              <div className="ml-2 flex items-center gap-1 border border-gray-200 rounded px-2 py-1 cursor-pointer hover:bg-gray-50 text-xs  text-gray-600">10 / page <ChevronDown size={10} className="text-gray-400 ml-1" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Detail Panel ───────────────────────────────────────────── */}
      {selectedNote && (
        <div className="w-[270px] shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-hidden">
          {/* Panel Header */}
          <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs  text-gray-900 truncate flex-1 mr-2">{selectedNote.title}</h3>
            <button onClick={() => setSelectedNote(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 shrink-0"><X size={14} /></button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Type icon */}
            <div className="flex justify-center py-5 border-b border-gray-100">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center  ${selectedNote.type === 'Wiki Page' ? 'bg-blue-100' : 'bg-green-100'}`}>
                {selectedNote.type === 'Wiki Page' ? <BookOpen size={28} className="text-blue-600" /> : <FileText size={28} className="text-green-600" />}
              </div>
            </div>

            {/* Badges + meta */}
            <div className="px-4 py-4 border-b border-gray-100 space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs  px-2 py-1 rounded ${TYPE_BADGE[selectedNote.type]}`}>{selectedNote.type}</span>
                {selectedNote.starred && <Star size={13} className="text-amber-400 fill-amber-400" />}
              </div>

              <div className="space-y-2.5 text-xs">
                <MetaRow label="Category" value={selectedNote.category} />
                <div>
                  <span className="text-gray-500  block mb-1">Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedNote.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[9px] ">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 ">Created By</span>
                  <div className="flex items-center gap-1.5">
                    <Avatar name={selectedNote.createdBy} size={20} />
                    <div className="text-right">
                      <p className="text-xs  text-gray-800">{selectedNote.createdBy}</p>
                      <p className="text-[9px] text-gray-400">{ROLES[selectedNote.createdBy]}</p>
                    </div>
                  </div>
                </div>
                <MetaRow label="Created At" value={selectedNote.createdAt} />
                <MetaRow label="Last Updated" value={selectedNote.lastUpdated} />
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 ">Updated By</span>
                  <div className="flex items-center gap-1.5">
                    <Avatar name={selectedNote.updatedBy} size={20} />
                    <div className="text-right">
                      <p className="text-xs  text-gray-800">{selectedNote.updatedBy}</p>
                      <p className="text-[9px] text-gray-400">{ROLES[selectedNote.updatedBy]}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="px-4 py-4 border-b border-gray-100">
              <h4 className="text-xs font-extrabold text-gray-700  tracking-wider mb-2">Description</h4>
              <p className="text-xs text-gray-600 font-medium leading-relaxed">{selectedNote.description}</p>
            </div>

            {/* Action Buttons */}
            <div className="px-4 py-4 border-b border-gray-100 space-y-2">
              <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white text-[12px]  rounded hover:bg-red-700 transition-colors ">
                <Eye size={14} /> View Full Page
              </button>
              <button className="w-full flex items-center justify-center gap-2 py-2 border border-gray-200 text-gray-700 text-[12px]  rounded hover:bg-gray-50 transition-colors">
                <Edit3 size={13} /> Edit Page
              </button>
            </div>

            {/* Recent in Category */}
            {selectedNote.recentInCategory?.length > 0 && (
              <div className="px-4 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-extrabold text-gray-700  tracking-wider">Recent Pages in this Category</h4>
                  <button className="text-xs  text-blue-600">View All</button>
                </div>
                <div className="space-y-2.5">
                  {selectedNote.recentInCategory.map((item, i) => (
                    <div key={i} className="flex items-center justify-between hover:bg-gray-50 rounded p-1 -mx-1 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center"><BookOpen size={11} className="text-blue-500" /></div>
                        <span className="text-xs  text-gray-800">{item.title}</span>
                      </div>
                      <span className="text-[9px] text-gray-400 font-medium shrink-0 ml-2">{item.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {selectedNote.attachments?.length > 0 && (
              <div className="px-4 py-4">
                <h4 className="text-xs font-extrabold text-gray-700  tracking-wider mb-3">Attachments ({selectedNote.attachments.length})</h4>
                <div className="space-y-2">
                  {selectedNote.attachments.map((att, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-100 rounded hover:border-blue-200 transition-colors group">
                      <div className="flex items-center gap-2.5">
                        <FileIcon type={att.type} size={30} />
                        <div>
                          <p className="text-xs  text-gray-800 leading-tight">{att.name}</p>
                          <p className="text-[9px] text-gray-400 font-medium">{att.size}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-white text-gray-400 hover:text-blue-600 transition-colors"><Download size={12} /></button>
                        <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-white text-gray-400 hover:text-gray-700 transition-colors"><MoreVertical size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-gray-500  shrink-0">{label}</span>
      <span className="text-gray-800  text-right">{value}</span>
    </div>
  );
}

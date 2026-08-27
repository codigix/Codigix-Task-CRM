import React, { useState, useRef, useEffect } from 'react';
import {
  X, Maximize2, Minus, ChevronDown,
  Bold, Italic, Link, List, MoreHorizontal,
  Type, Calendar, UploadCloud, Check, HelpCircle,
  Paperclip, Image, Code, CheckSquare, Search, Columns, Clock,
  Sparkles, Megaphone, Palette, Video, FileText, AlertCircle, Layers
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config/environment';
import { insertFilesIntoEditor, makeEditorPasteHandler } from '../../utils/descriptionFiles';
import { normalizeLabel, suggestionsFor } from '../../utils/labels';
import Swal from 'sweetalert2';

const WORK_TYPES = [
  { name: 'Task', icon: CheckSquare, color: 'text-blue-500 bg-blue-50', description: 'General task or deliverable' },
  { name: 'Campaign', icon: Megaphone, color: 'text-orange-500 bg-orange-50', description: 'Marketing campaign or promo' },
  { name: 'Design', icon: Palette, color: 'text-purple-500 bg-purple-50', description: 'Graphic asset or UI design' },
  { name: 'Video', icon: Video, color: 'text-red-500 bg-red-50', description: 'Video editing or motion graphics' },
  { name: 'Content', icon: FileText, color: 'text-green-500 bg-green-50', description: 'Blog post, copy, or SEO article' },
  { name: 'Bug', icon: AlertCircle, color: 'text-red-600 bg-red-100', description: 'Website error or tracking pixel issue' },
];

const STATUSES = ['TO DO', 'IN PROGRESS', 'IN REVIEW', 'APPROVAL / QA', 'DONE'];

const SearchableDropdown = ({ value, options, onSelect, placeholder, labelRenderer, iconRenderer, searchPlaceholder, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    labelRenderer(opt).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`relative w-full ${className}`} ref={wrapperRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full border border-gray-300 rounded-[3px] px-2.5 py-1.5 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
      >
        {value ? (
          <div className="flex items-center gap-2">
            {iconRenderer && iconRenderer(value)}
            <span className="text-[13px] text-gray-900 font-medium">{labelRenderer(value)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {iconRenderer && iconRenderer(null)}
            <span className="text-[13px] text-gray-500">{placeholder}</span>
          </div>
        )}
        <ChevronDown size={14} className="text-gray-500" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-[3px] shadow-lg">
          <div className="p-2 border-b border-gray-100 flex items-center gap-2 text-gray-400 bg-gray-50/50">
            <Search size={12} />
            <input
              autoFocus
              type="text"
              placeholder={searchPlaceholder || "Search..."}
              className="w-full text-[12px] outline-none text-gray-700 bg-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
            {filteredOptions.length > 0 ? filteredOptions.map((opt, i) => (
              <div
                key={i}
                onClick={() => {
                  onSelect(opt);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer"
              >
                {iconRenderer && iconRenderer(opt)}
                <span className="text-[13px] text-gray-700">{labelRenderer(opt)}</span>
                {value && labelRenderer(value) === labelRenderer(opt) && (
                  <Check size={12} className="ml-auto text-blue-600" />
                )}
              </div>
            )) : (
              <div className="p-2 text-[12px] text-gray-500 text-center">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Compact pill dropdown used for Status / Priority, matching the IT drawer.
const SimpleDropdown = ({ value, options, onSelect, placeholder, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between border border-gray-300 rounded-[3px] bg-gray-100 px-2.5 py-1 cursor-pointer hover:bg-gray-200 transition-colors min-w-[100px]"
      >
        <span className="text-sm text-gray-700 tracking-wide">{value || placeholder}</span>
        <ChevronDown size={14} className="text-gray-500 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-[3px] shadow-lg py-1">
          {options.map((opt, i) => (
            <div
              key={i}
              onClick={() => { onSelect(opt); setIsOpen(false); }}
              className="px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MarketingCreateIssueDrawer = ({ isOpen, onClose, onIssueCreated, projectId = null }) => {
  const { user } = useAuth();
  const { designation, username } = useParams();
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [knownLabels, setKnownLabels] = useState([]);
  const [teams, setTeams] = useState([]);

  // Transition & Display state
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    space: null,
    workType: WORK_TYPES[0].name,
    status: 'TO DO',
    summary: '',
    description: '',
    team: null,
    assignee: null,
    reporter: null,
    priority: 'Medium',
    parent: null,
    startDate: '',
    dueDate: '',
    storyPoints: '',
    sprint: null,
    labels: [],
    linkedType: '',
    linkedTarget: null,
    flagged: false,
    createAnother: false
  });

  const [newLabel, setNewLabel] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImprovingDescription, setIsImprovingDescription] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const fileInputRef = useRef(null);
  const toolbarFileInputRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      const timer = setTimeout(() => setAnimateIn(true), 10);
      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Fetch users filtered for marketing
      fetch(API_BASE_URL + '/users')
        .then(res => res.json())
        .then(data => {
          const userList = Array.isArray(data?.value) ? data.value : (Array.isArray(data) ? data : []);
          const marketingUsers = userList.filter(u => {
            const dept = (u.department || '').toLowerCase();
            const role = (u.role_name || u.role || '').toLowerCase();
            return dept.includes('marketing') || dept.includes('seo') || role.includes('marketing') || role.includes('designer') || role.includes('video') || role.includes('seo') || role.includes('ppc') || role.includes('wordpress');
          });
          const finalUsers = marketingUsers.length > 0 ? marketingUsers : userList;
          setUsers(finalUsers);

          if (user) {
            const currentReporter = {
              id: user.id,
              name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email
            };
            setFormData(prev => ({
              ...prev,
              reporter: prev.reporter || currentReporter,
              assignee: prev.assignee || currentReporter
            }));
          }
        })
        .catch(err => console.error('Error fetching users:', err));

      // Fetch projects
      fetch(`${API_BASE_URL}/projects?department=Marketing`)
        .then(res => res.json())
        .then(data => {
          const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
          setProjects(list);
        })
        .catch(err => console.error('Error fetching projects:', err));

      // Real sprints for this board, so work can be created straight into one.
      fetch(`${API_BASE_URL}/sprints?department=Marketing`)
        .then(res => res.json())
        .then(data => setSprints(Array.isArray(data?.sprints) ? data.sprints : []))
        .catch(err => console.error('Error fetching sprints:', err));

      // Labels already used on this board, so typing offers real options instead of
      // letting near-duplicates accumulate.
      fetch(`${API_BASE_URL}/it-kanban/labels?department=Marketing`)
        .then(res => res.json())
        .then(data => setKnownLabels(Array.isArray(data) ? data.map(d => d.label) : []))
        .catch(err => console.error('Error fetching labels:', err));

      // Fetch the real Marketing teams so tickets attach to an actual team, not a placeholder.
      // Falls back to the built-in division list when none are set up yet.
      fetch(`${API_BASE_URL}/teams`)
        .then(res => res.json())
        .then(data => {
          const raw = Array.isArray(data) ? data : (data.data || []);
          // Only Marketing teams belong on this board. The API exposes department_name /
          // department_id (not `department`), so match on those.
          const formatted = raw
            .filter(t => String(t.department_name || '').toLowerCase().includes('marketing'))
            .map(t => ({ id: t.id, name: t.name }));
          setTeams(formatted);
          setFormData(prev => ({
            ...prev,
            team: formatted.find(f => prev.team && f.id === prev.team.id) || formatted[0] || null
          }));
        })
        .catch(err => console.error('Error fetching teams:', err));
    }
  }, [isOpen, user]);

  // Files dropped/attached into the description are uploaded to the server first, so the
  // embedded link keeps working after the ticket is saved and reopened.
  const descriptionFileMeta = () => ({
    userId: user?.id,
    project_id: formData.space?.id || formData.parent?.id || projectId || undefined
  });

  const handleToolbarFileUpload = async (filesList) => {
    if (!filesList || filesList.length === 0 || !editorRef.current) return;
    setIsUploadingFile(true);
    try {
      await insertFilesIntoEditor(editorRef.current, filesList, {
        meta: descriptionFileMeta,
        onHtmlChange: (html) => setFormData(prev => ({ ...prev, description: html })),
        onError: (err) => Swal.fire('Upload failed', err.message, 'error')
      });
      setAttachedFiles(prev => [...prev, ...Array.from(filesList)]);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDescriptionPaste = makeEditorPasteHandler({
    getEditor: () => editorRef.current,
    meta: descriptionFileMeta,
    onHtmlChange: (html) => setFormData(prev => ({ ...prev, description: html })),
    onError: (err) => Swal.fire('Upload failed', err.message, 'error'),
    onBusyChange: setIsUploadingFile
  });

  const handleImproveDescription = async () => {
    if (!formData.summary) {
      Swal.fire({
        icon: 'warning',
        title: 'Summary Required',
        text: 'Please enter a task summary first so AI can understand context!',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      return;
    }
    setIsImprovingDescription(true);
    try {
      const res = await fetch(`${API_BASE_URL}/it-kanban/ai/improve-description-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.summary,
          draftDescription: formData.description
        })
      });
      if (!res.ok) throw new Error('Failed to improve description');
      const data = await res.json();
      const improved = data.improvedDescription || formData.description;
      setFormData(prev => ({ ...prev, description: improved }));
      if (editorRef.current) {
        editorRef.current.innerHTML = improved;
      }
      Swal.fire({
        icon: 'success',
        title: 'Brief Enhanced',
        text: 'Marketing brief enhanced with AI specs!',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to enhance brief', 'error');
    } finally {
      setIsImprovingDescription(false);
    }
  };

  // Projects are shown as "Project Name (Client)" so it is obvious which client the
  // deliverable belongs to. Also makes the dropdown searchable by client name.
  const projectLabel = (p) => {
    if (!p) return '';
    const name = (p.name || p.title || '').trim();
    const client = p.company_name || p.company || p.client;
    return client ? `${name} (${client})` : name;
  };

  const handleAssignToMe = () => {
    const searchName = username || (user && user.first_name) || '';
    const me = users.find(u =>
      (u.first_name && searchName && u.first_name.toLowerCase() === searchName.toLowerCase()) ||
      (u.name && searchName && u.name.toLowerCase().includes(searchName.toLowerCase())) ||
      (user && u.id === user.id)
    );
    if (me) {
      setFormData(prev => ({ ...prev, assignee: me }));
    } else if (users.length > 0) {
      setFormData(prev => ({ ...prev, assignee: users[0] }));
    }
  };

  const handleCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setFormData(prev => ({ ...prev, description: editorRef.current.innerHTML }));
    }
  };

  const handleAddLabel = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const clean = normalizeLabel(newLabel);
      if (clean && !formData.labels.includes(clean)) {
        setFormData(prev => ({ ...prev, labels: [...prev.labels, clean] }));
      }
      setNewLabel('');
    }
  };

  const removeLabel = (labelToRemove) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels.filter(l => l !== labelToRemove)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.summary.trim()) {
      Swal.fire({ icon: 'warning', title: 'Validation Error', text: 'Summary / Task Title is required.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const currentUserName = user ? (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username) : (username || 'Marketing Lead');
      const reporterVal = formData.reporter
        ? (formData.reporter.name || `${formData.reporter.first_name || ''} ${formData.reporter.last_name || ''}`.trim() || currentUserName)
        : currentUserName;

      let assigneeVal = 'Unassigned';
      if (formData.assignee && (formData.assignee.name || formData.assignee.first_name)) {
        const aName = formData.assignee.name || `${formData.assignee.first_name || ''} ${formData.assignee.last_name || ''}`.trim();
        if (aName !== 'Automatic' && aName !== 'Unassigned') {
          assigneeVal = aName;
        }
      }

      const payload = {
        title: formData.summary,
        type: formData.workType || 'Task',
        status: formData.status ? formData.status.toUpperCase() : 'TO DO',
        assignee: assigneeVal,
        reporter: reporterVal,
        team: formData.team ? formData.team.name : 'Marketing Team',
        team_id: formData.team && typeof formData.team === 'object' ? formData.team.id : null,
        priority: formData.priority || 'Medium',
        description: formData.description || '',
        department: 'Marketing',
        keyPrefix: 'MKT',
        // The project chosen as the Space wins; otherwise fall back to Parent or the prop.
        project_id: formData.space?.id || formData.parent?.id || projectId || null,
        parent_id: formData.parent?.id || null,
        start_date: formData.startDate || null,
        due_date: formData.dueDate || null,
        sprint_id: formData.sprint?.id || null,
        sprint: formData.sprint?.name || null,
        story_points: formData.storyPoints || null,
        labels: formData.labels || [],
        flagged: formData.flagged || false,
        linked_issues: (formData.linkedType && formData.linkedTarget)
          ? [{ relation: formData.linkedType, key: formData.linkedTarget.name, id: formData.linkedTarget.id }]
          : []
      };

      const res = await fetch(`${API_BASE_URL}/it-kanban/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Lets the server name the actor in the assignment notification.
          'x-user-name': currentUserName,
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        Swal.fire({
          icon: 'success',
          title: 'Marketing Ticket Created',
          text: `Ticket ${created.issue_key} created successfully!`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
        if (onIssueCreated) onIssueCreated();

        if (formData.createAnother) {
          // Keep the drawer open and retain space/type/team/status so a run of
          // similar tickets can be filed back-to-back.
          setFormData(prev => ({
            ...prev,
            summary: '',
            description: '',
            parent: null,
            startDate: '',
            dueDate: '',
            storyPoints: '',
            linkedType: '',
            linkedTarget: null,
            flagged: false
          }));
          if (editorRef.current) editorRef.current.innerHTML = '';
          setAttachedFiles([]);
        } else {
          onClose();
        }
      } else {
        throw new Error('Failed to create ticket');
      }
    } catch (err) {
      Swal.fire('Error', err.message || 'Error creating marketing ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${animateIn && !isClosing ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      ></div>

      {/* Slide-out Panel / Centered Modal */}
      <div
        className={`fixed bg-white shadow-2xl z-50 flex flex-col transition-all duration-300 font-sans ${isMaximized
          ? 'inset-0 m-auto w-[90vw] max-w-4xl h-[90vh] max-h-[85vh] rounded'
          : 'inset-y-0 right-0 w-[600px] border-l border-gray-200'
          } ${animateIn && !isClosing
            ? 'translate-x-0 opacity-100 scale-100'
            : 'translate-x-full opacity-0 scale-95'
          }`}
      >

        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white rounded-t-lg">
          <h2 className="text-xl text-gray-800 font-medium tracking-tight">Create Marketing Ticket</h2>
          <div className="flex items-center gap-1 text-gray-500">
            <button type="button" className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" onClick={onClose} title="Minimize"><Minus size={16} /></button>
            <button type="button" className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" onClick={() => setIsMaximized(!isMaximized)} title={isMaximized ? "Shrink to side panel" : "Expand to centered modal"}><Maximize2 size={14} /></button>
            <button type="button" className="p-1.5 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors" onClick={onClose} title="Close"><X size={16} /></button>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-8 py-5 custom-scrollbar bg-white">
          <p className="text-[12px] text-gray-500 mb-6 font-medium">Required fields are marked with an asterisk <span className="text-red-500">*</span></p>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>

            {/* Space */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Space <span className="text-red-500">*</span></label>
              <SearchableDropdown
                options={projects}
                value={formData.space}
                onSelect={(v) => {
                  // Selecting a project auto-selects that project's team.
                  let matchedTeam = formData.team;
                  if (v && v.id) {
                    const found = teams.find(t =>
                      (v.team_id && Number(t.id) === Number(v.team_id)) ||
                      (v.team_name && t.name && t.name.toLowerCase() === v.team_name.toLowerCase())
                    );
                    if (found) matchedTeam = found;
                  }

                  // ...and that project's sprint. A sprint owns a project, so picking the
                  // project implies the sprint. Prefer the running one when several match.
                  let matchedSprint = formData.sprint;
                  if (v && v.id) {
                    const owning = sprints.filter(sp => Number(sp.project_id) === Number(v.id));
                    matchedSprint = owning.find(sp => sp.status === 'Active') || owning[0] || null;
                  }

                  setFormData(prev => ({ ...prev, space: v, team: matchedTeam, sprint: matchedSprint }));
                }}
                placeholder={projects.length === 0 ? 'No Marketing projects available' : 'Select project'}
                labelRenderer={projectLabel}
                iconRenderer={(p) => p ? <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center text-white text-xs">{(p.name || '').trim().charAt(0).toUpperCase()}</div> : null}
              />
            </div>

            {/* Sprint. Choosing a Space fills this in automatically when that project has a
                sprint; it stays selectable so work can go straight into any sprint, or be
                left in the Backlog. */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Sprint</label>
              <SearchableDropdown
                options={sprints}
                value={formData.sprint}
                onSelect={(v) => setFormData(prev => ({ ...prev, sprint: v }))}
                placeholder={sprints.length === 0 ? 'No sprints yet — goes to Backlog' : 'Backlog'}
                labelRenderer={(sp) => sp ? `${sp.name}${sp.status === 'Active' ? ' (active)' : ''}` : ''}
                iconRenderer={(sp) => sp ? <div className="w-5 h-5 bg-emerald-600 rounded flex items-center justify-center text-white text-xs">S</div> : null}
              />
              <p className="text-[11px] text-gray-500 mt-1">
                {formData.sprint
                  ? 'This work item will be created inside the sprint.'
                  : 'Leave empty to create it in the Backlog.'}
              </p>
            </div>

            {/* Work type */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Work type <span className="text-red-500">*</span></label>
              <SearchableDropdown
                options={WORK_TYPES.map(w => w.name)}
                value={formData.workType}
                onSelect={(v) => setFormData(prev => ({ ...prev, workType: v }))}
                placeholder="Select type"
                labelRenderer={(t) => t}
                iconRenderer={(t) => {
                  const wt = WORK_TYPES.find(w => w.name === t);
                  if (!wt) return null;
                  const Icon = wt.icon;
                  return <div className={`p-0.5 rounded-sm ${wt.color}`}><Icon size={12} /></div>;
                }}
              />
              <div className="flex items-center gap-1 text-sm text-blue-600 font-medium cursor-pointer hover:underline mt-1">
                Learn about work types <HelpCircle size={10} />
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Status */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Status</label>
              <SimpleDropdown
                options={STATUSES}
                value={formData.status}
                onSelect={(v) => setFormData(prev => ({ ...prev, status: v }))}
              />
              <p className="text-sm text-gray-500 mt-1">This is the initial status upon creation.</p>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Priority</label>
              <SimpleDropdown
                options={['High', 'Medium', 'Low']}
                value={formData.priority}
                onSelect={(v) => setFormData(prev => ({ ...prev, priority: v }))}
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Summary <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.summary}
                onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                className={`w-full border rounded-[3px] p-2 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow ${!formData.summary ? 'border-red-500 bg-red-50/20' : 'border-gray-300'}`}
              />
              {!formData.summary && (
                <div className="text-sm text-red-500 mt-1.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> Summary is required
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Description</label>
              <div className="border border-gray-300 rounded-[3px] overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-shadow bg-white">

                {/* Rich Text Toolbar */}
                <div className="flex flex-wrap items-center gap-1 p-1 border-b border-gray-200 bg-gray-50/50">
                  <button type="button" className="p-1 hover:bg-gray-200 rounded flex items-center gap-1 text-[12px] font-medium text-gray-600"><span className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 block"></span> <ChevronDown size={12} /></button>
                  <div className="w-px h-4 bg-gray-300 mx-1"></div>
                  <button
                    type="button"
                    onClick={handleImproveDescription}
                    disabled={isImprovingDescription}
                    className="px-2 py-1 hover:bg-gray-200 rounded text-[12px] text-gray-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isImprovingDescription ? 'Improving...' : 'Improve description'}
                    <span className="text-xs text-purple-600 border border-purple-200 bg-purple-50 px-1 rounded">AI</span>
                  </button>
                  <div className="w-px h-4 bg-gray-300 mx-1"></div>
                  <button type="button" className="p-1 hover:bg-gray-200 rounded text-gray-600"><Type size={14} /></button>
                  <button type="button" onClick={() => handleCommand('bold')} className="p-1 hover:bg-gray-200 rounded text-gray-600"><Bold size={14} /></button>
                  <button type="button" onClick={() => handleCommand('italic')} className="p-1 hover:bg-gray-200 rounded text-gray-600 italic"><Italic size={14} /></button>
                  <div className="w-px h-4 bg-gray-300 mx-1"></div>
                  <button type="button" className="p-1 hover:bg-gray-200 rounded text-gray-600"><Columns size={14} /></button>
                  <button type="button" className="p-1 hover:bg-gray-200 rounded text-gray-600"><CheckSquare size={14} /></button>
                  <button type="button" onClick={() => handleCommand('insertUnorderedList')} className="p-1 hover:bg-gray-200 rounded text-gray-600"><List size={14} /></button>
                  <button type="button" onClick={() => handleCommand('formatBlock', '<pre>')} className="p-1 hover:bg-gray-200 rounded text-gray-600 font-serif text-[12px] px-1.5">&lt;/&gt;</button>
                  <div className="w-px h-4 bg-gray-300 mx-1"></div>
                  <button type="button" onClick={() => toolbarFileInputRef.current?.click()} className="p-1 hover:bg-gray-200 rounded text-gray-600" title="Insert Image">
                    <Image size={14} />
                  </button>
                  <input
                    type="file"
                    ref={toolbarFileInputRef}
                    className="hidden"
                    multiple
                    onChange={(e) => {
                      if (e.target.files.length > 0) {
                        handleToolbarFileUpload(e.target.files);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button type="button" onClick={() => toolbarFileInputRef.current?.click()} className="p-1 hover:bg-gray-200 rounded text-gray-600" title="Attach file to description">
                    <Paperclip size={14} />
                  </button>
                  <button type="button" onClick={() => { const url = prompt('Enter URL:'); if (url) handleCommand('createLink', url); }} className="p-1 hover:bg-gray-200 rounded text-gray-600"><Link size={14} /></button>
                </div>

                {/* Editor Area (Visual Rich Text WYSIWYG) */}
                <div
                  ref={editorRef}
                  contentEditable={true}
                  onInput={(e) => {
                    const newHtml = e.currentTarget.innerHTML;
                    setFormData(prev => ({ ...prev, description: newHtml }));
                  }}
                  onPaste={handleDescriptionPaste}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    if (e.dataTransfer?.files?.length) {
                      e.preventDefault();
                      handleToolbarFileUpload(e.dataTransfer.files);
                    }
                  }}
                  className="w-full min-h-[120px] p-3 text-[13px] text-gray-800 outline-none overflow-y-auto rich-editor"
                  placeholder="Pro tip: paste or drop a file here to attach it."
                  style={{ minHeight: '120px' }}
                ></div>
                {isUploadingFile && (
                  <div className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-blue-600 border-t border-gray-200 bg-blue-50/50">
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Uploading file…
                  </div>
                )}
              </div>
            </div>

            {/* Assignee */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[12px] font-semibold text-gray-700">Assignee</label>
                <button
                  type="button"
                  onClick={handleAssignToMe}
                  className="text-[12px] text-blue-600 font-medium hover:underline cursor-pointer focus:outline-none"
                >
                  Assign to me
                </button>
              </div>
              <SearchableDropdown
                options={users}
                value={formData.assignee}
                onSelect={(v) => setFormData(prev => ({ ...prev, assignee: v }))}
                placeholder="Automatic"
                labelRenderer={(u) => u ? (u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username) : 'Unassigned'}
                iconRenderer={(u) => u ? (
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-700 border border-white overflow-hidden shrink-0">
                    {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : (u.name ? u.name[0] : (u.first_name?.[0] || 'U'))}
                  </div>
                ) : (
                  <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                    <Search size={12} />
                  </div>
                )}
              />
            </div>

            {/* Parent */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Parent</label>
              <SearchableDropdown
                options={projects}
                value={formData.parent}
                onSelect={(v) => setFormData(prev => ({ ...prev, parent: v }))}
                placeholder="Select parent"
                labelRenderer={projectLabel}
              />
              <p className="text-sm text-gray-500 mt-1 leading-tight">Link this deliverable to the client campaign or project it belongs to.</p>
            </div>

            {/* Due date */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Due date</label>
              <div className="flex items-center justify-between w-64 border border-gray-300 rounded-[3px] px-2.5 py-1.5 bg-white cursor-pointer hover:bg-gray-50 text-gray-500 relative">
                <input
                  type="date"
                  value={formData.dueDate}
                  min={formData.startDate || undefined}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full h-full outline-none text-[13px] text-gray-700 bg-transparent"
                />
                <Calendar size={14} className="absolute right-2.5 pointer-events-none text-gray-500" />
              </div>
            </div>

            {/* Labels */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Labels</label>
              <div className="flex flex-wrap gap-2 items-center border border-gray-300 rounded-[3px] px-2.5 py-1.5 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-shadow">
                {formData.labels.map(l => (
                  <span key={l} className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 group">
                    {l}
                    <X size={10} className="cursor-pointer text-indigo-400 hover:text-indigo-800" onClick={() => removeLabel(l)} />
                  </span>
                ))}
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={handleAddLabel}
                  placeholder={formData.labels.length === 0 ? "Type and press enter..." : "Add more..."}
                  className="flex-1 min-w-[100px] text-[13px] outline-none border-none bg-transparent"
                />
              </div>

              {/* Offering what already exists is what keeps a label set from fragmenting
                  into near-duplicates. Falls back to starters on an unlabelled board. */}
              {(() => {
                const pool = knownLabels.length > 0 ? knownLabels : suggestionsFor('Marketing');
                const typed = normalizeLabel(newLabel);
                const options = pool
                  .filter(l => !formData.labels.includes(l))
                  .filter(l => !typed || l.includes(typed))
                  .slice(0, 8);
                if (options.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[11px] text-gray-400 mr-0.5">
                      {knownLabels.length > 0 ? 'Used on this board:' : 'Suggestions:'}
                    </span>
                    {options.map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, labels: [...prev.labels, l] }));
                          setNewLabel('');
                        }}
                        className="text-[11px] px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                );
              })()}
              <p className="text-[11px] text-gray-500 mt-1.5">
                Group work across projects — the kind of work or the campaign. Not the
                department or team; those are already fields.
              </p>
            </div>

            {/* Team */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Team</label>
              <SearchableDropdown
                options={teams}
                value={formData.team}
                onSelect={(v) => setFormData(prev => ({ ...prev, team: v }))}
                placeholder="Choose a team"
                labelRenderer={(t) => t.name}
                iconRenderer={(t) => t ? (
                  <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center text-blue-700 text-xs">
                    {t.name ? t.name[0].toUpperCase() : 'T'}
                  </div>
                ) : (
                  <div className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center text-gray-500 border border-gray-200">
                    <Search size={10} />
                  </div>
                )}
              />
              <p className="text-sm text-gray-500 mt-1 leading-tight">Associates a team to a ticket. You can use this field to search and filter tickets by team.</p>
            </div>

            {/* Start date */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Start date</label>
              <div className="flex items-center justify-between w-64 border border-gray-300 rounded-[3px] px-2.5 py-1.5 bg-white cursor-pointer hover:bg-gray-50 text-gray-500 relative">
                <input
                  type="date"
                  value={formData.startDate}
                  max={formData.dueDate || undefined}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full h-full outline-none text-[13px] text-gray-700 bg-transparent"
                />
                <Calendar size={14} className="absolute right-2.5 pointer-events-none text-gray-500" />
              </div>
              <p className="text-sm text-gray-500 mt-1 leading-tight">Allows the planned start date for a piece of work to be set.</p>
            </div>

            {/* Effort points */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Effort points</label>
              <SimpleDropdown
                options={['None', '1', '2', '3', '5', '8']}
                value={formData.storyPoints || 'None'}
                onSelect={(v) => setFormData(prev => ({ ...prev, storyPoints: v === 'None' ? '' : v }))}
              />
              <p className="text-sm text-gray-500 mt-1 leading-tight">Relative effort estimate for this deliverable.</p>
            </div>

            {/* Reporter */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Reporter <span className="text-red-500">*</span></label>
              <SearchableDropdown
                options={users}
                value={formData.reporter}
                onSelect={(v) => setFormData(prev => ({ ...prev, reporter: v }))}
                placeholder="Select reporter"
                labelRenderer={(u) => u ? (u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username) : 'Reporter'}
                iconRenderer={(u) => u ? (
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-700 border border-white overflow-hidden shrink-0 mr-2">
                    {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : (u.name ? u.name[0] : (u.first_name?.[0] || 'U'))}
                  </div>
                ) : null}
              />
            </div>

            {/* Attachment */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Attachment</label>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files.length > 0) {
                    const newFiles = Array.from(e.target.files);
                    setAttachedFiles(prev => [...prev, ...newFiles]);
                    e.target.value = '';
                  }
                }}
                multiple
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-[3px] p-6 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 transition cursor-pointer gap-2 group"
              >
                <UploadCloud size={24} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                <div className="text-[13px] text-gray-600">
                  Drop files to attach or <span className="text-gray-900 bg-gray-100 border border-gray-300 rounded-[3px] px-2 py-0.5 ml-1 font-medium">Browse</span>
                </div>
              </div>

              {/* Attached file list */}
              {attachedFiles.length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachedFiles.map((file, i) => {
                    const isImg = file.type.startsWith('image/');
                    const formattedSize = (file.size / 1024).toFixed(1) + ' KB';
                    const formattedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    const previewUrl = isImg ? URL.createObjectURL(file) : null;

                    return (
                      <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm hover:border-blue-300 transition-all group">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isImg ? (
                            <img src={previewUrl} alt="" className="w-9 h-9 rounded object-cover border border-gray-100 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0 border border-blue-100">
                              <FileText size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-800 truncate" title={file.name}>
                              {file.name}
                            </div>
                            <div className="text-[10px] text-gray-400 font-medium">
                              {formattedDate} - {formattedSize}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAttachedFiles(prev => prev.filter((_, idx) => idx !== i));
                          }}
                          className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors shrink-0 ml-2 cursor-pointer"
                          title="Remove attachment"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Linked work items */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Linked work items</label>
              <div className="flex gap-2">
                <div className="w-1/3">
                  <SearchableDropdown
                    options={['blocks', 'is blocked by', 'clones', 'is cloned by', 'duplicates', 'is duplicated by', 'relates to']}
                    value={formData.linkedType}
                    onSelect={(v) => setFormData(prev => ({ ...prev, linkedType: v }))}
                    placeholder="Select type"
                    labelRenderer={(t) => t}
                  />
                </div>
                <div className="w-2/3">
                  <SearchableDropdown
                    options={projects}
                    value={formData.linkedTarget}
                    onSelect={(v) => setFormData(prev => ({ ...prev, linkedTarget: v }))}
                    placeholder="Type, search or paste URL"
                    labelRenderer={projectLabel}
                  />
                </div>
              </div>
            </div>

            {/* Flagged */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Flagged</label>
              <div className="flex items-center gap-2 mb-1 cursor-pointer" onClick={(e) => { e.preventDefault(); setFormData(prev => ({ ...prev, flagged: !prev.flagged })); }}>
                <input
                  type="checkbox"
                  checked={formData.flagged}
                  onChange={(e) => setFormData(prev => ({ ...prev, flagged: e.target.checked }))}
                  className="w-3.5 h-3.5 text-blue-600 rounded-[2px] border-gray-300 focus:ring-blue-500 focus:ring-offset-0 focus:ring-1 cursor-pointer pointer-events-none"
                />
                <span className="text-[13px] text-gray-900 select-none">Impediment</span>
              </div>
              <p className="text-sm text-gray-500 mt-1 leading-tight">Allows to flag tickets with impediments.</p>
            </div>

          </form>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white rounded-b-lg">
          <div className="flex items-center gap-2 cursor-pointer" onClick={(e) => { e.preventDefault(); setFormData(prev => ({ ...prev, createAnother: !prev.createAnother })); }}>
            <input
              type="checkbox"
              checked={formData.createAnother}
              onChange={(e) => setFormData(prev => ({ ...prev, createAnother: e.target.checked }))}
              className="w-3.5 h-3.5 text-blue-600 rounded-[2px] border-gray-300 focus:ring-blue-500 focus:ring-offset-0 focus:ring-1 cursor-pointer pointer-events-none"
            />
            <span className="text-[13px] text-gray-700 font-medium select-none">Create Another</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-[14px] font-medium text-gray-700 hover:bg-gray-100 rounded p-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.summary}
              className={`px-4 py-1.5 rounded-[3px] text-[14px] font-medium transition-colors flex items-center justify-center ${!formData.summary || isSubmitting ? 'bg-blue-600/50 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .rich-editor[contenteditable]:empty:before {
          content: attr(placeholder);
          color: #9ca3af;
          font-style: italic;
          cursor: text;
        }
      `}</style>
    </>
  );
};

export default MarketingCreateIssueDrawer;

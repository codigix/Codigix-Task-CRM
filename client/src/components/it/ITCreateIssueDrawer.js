import React, { useState, useRef, useEffect } from 'react';
import {
  X, Maximize2, Minus, ChevronDown,
  Bold, Italic, Link, List, MoreHorizontal,
  Type, Calendar, UploadCloud, Check, HelpCircle,
  Paperclip, Image, Code, CheckSquare, Search, Columns, Clock
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { insertFilesIntoEditor, makeEditorPasteHandler } from '../../utils/descriptionFiles';
import Swal from 'sweetalert2';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


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
        className="flex items-center justify-between w-full border border-gray-300 rounded-[3px] px-2.5 py-1.5 bg-white cursor-pointer hover:bg-gray-50 transition-colors "
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
                  <Check size={12} className="ml-auto text-blue-600 " />
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
        <span className="text-sm  text-gray-700  tracking-wide">{value || placeholder}</span>
        <ChevronDown size={14} className="text-gray-500 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-[3px] shadow-lg py-1">
          {options.map((opt, i) => (
            <div
              key={i}
              onClick={() => {
                onSelect(opt);
                setIsOpen(false);
              }}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px]  text-gray-700 "
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ITCreateIssueDrawer = ({ isOpen, onClose, onIssueCreated, projectId = null, department }) => {
  const { user } = useAuth();
  const { designation, username } = useParams();
  const path = window.location.pathname.toLowerCase();
  const currentDept = department || (
    path.includes('/marketing') ? 'Marketing' :
    path.includes('/seo-gmb') ? 'Marketing' :
    'IT'
  );
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [teams, setTeams] = useState([]);

  // Transition and display states
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Label tag state
  const [newLabel, setNewLabel] = useState('');

  // Attachment state — store actual File objects
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const fileInputRef = useRef(null);          // drag-drop area
  const toolbarFileInputRef = useRef(null);   // toolbar paperclip button

  // Editor Ref
  const editorRef = useRef(null);

  // Jira-like inline attachment insertion into Description editor
  // Files dropped/pasted/attached into the description are uploaded to the server first, so
  // the embedded link still resolves after the issue is saved and reopened.
  const descriptionFileMeta = () => ({
    userId: user?.id,
    project_id: (formData.space && formData.space.id !== 1 ? formData.space.id : null)
      || formData.parent?.id || projectId || undefined
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

  const [formData, setFormData] = useState({
    space: { id: 1, name: 'My Kanban Space (KAN)', code: 'KAN' },
    workType: 'Task',
    status: 'To Do',
    summary: '',
    description: '',
    assignee: null,
    reporter: null,
    parent: null,
    dueDate: '',
    labels: [],
    team: null,
    startDate: '',
    sprint: null,
    linkedType: 'blocks',
    linkedTarget: null,
    flagged: false,
    createAnother: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImprovingDescription, setIsImprovingDescription] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      const frame = requestAnimationFrame(() => {
        setAnimateIn(true);
      });
      return () => cancelAnimationFrame(frame);
    } else if (shouldRender) {
      setIsClosing(true);
      setAnimateIn(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
        setIsMaximized(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Fetch Real Teams
      fetch(API_BASE_URL + '/teams')
        .then(res => res.json())
        .then(data => {
          const rawTeams = Array.isArray(data) ? data : (data.data || []);
          const formattedTeams = rawTeams.map(t => ({
            ...t,
            icon: t.name ? t.name.charAt(0).toUpperCase() : 'T'
          }));
          setTeams(formattedTeams);
        })
        .catch(err => console.error('Error fetching teams:', err));

      // Fetch Real Users
      fetch(API_BASE_URL + '/users')
        .then(res => res.json())
        .then(data => {
          const userList = Array.isArray(data?.value) ? data.value : (Array.isArray(data) ? data : []);
          setUsers(userList);

          if (user) {
            const currentReporter = {
              id: user.id,
              name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'User',
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email
            };
            setFormData(prev => ({ 
              ...prev, 
              reporter: prev.reporter || currentReporter,
              assignee: prev.assignee || currentReporter 
            }));
          } else if (userList.length > 0) {
            const searchName = username || 'ashwini';
            const currentUser = userList.find(u =>
              (u.first_name && u.first_name.toLowerCase() === searchName.toLowerCase()) ||
              (u.name && u.name.toLowerCase().includes(searchName.toLowerCase()))
            ) || userList[0];
            setFormData(prev => ({ ...prev, reporter: prev.reporter || currentUser }));
          }
        })
        .catch(err => console.error('Error fetching users:', err));

      // Fetch Real Projects (Spaces/Parents) — scoped to this department so an IT board
      // never offers Marketing projects (and vice versa).
      fetch(`${API_BASE_URL}/projects?department=${encodeURIComponent(currentDept)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.data) {
            setProjects(data.data);
          } else if (Array.isArray(data)) {
            setProjects(data);
          }
        })
        .catch(err => console.error('Error fetching projects:', err));

      // Real sprints for this board, so work can be created straight into one.
      fetch(`${API_BASE_URL}/sprints?department=${encodeURIComponent(currentDept)}`)
        .then(res => res.json())
        .then(data => setSprints(Array.isArray(data?.sprints) ? data.sprints : []))
        .catch(err => console.error('Error fetching sprints:', err));
    }
  }, [isOpen, currentDept]);

  // Fetch Team Members whenever selected Team changes to filter Reporter and Assignee
  useEffect(() => {
    if (formData.team && formData.team.id) {
      fetch(`${API_BASE_URL}/teams/${formData.team.id}/members`)
        .then(res => res.json())
        .then(data => {
          const membersList = Array.isArray(data) ? data : [];
          const formatted = membersList.map(m => ({
            id: m.user_id || m.id,
            name: (m.first_name || m.last_name) ? `${m.first_name || ''} ${m.last_name || ''}`.trim() : (m.name || 'Team Member'),
            first_name: m.first_name,
            last_name: m.last_name,
            email: m.email,
            avatar: m.avatar
          }));

          // Also include Team Manager if available and not already in member list
          if (formData.team.manager_name || formData.team.manager_first_name) {
            const mgrName = formData.team.manager_name || `${formData.team.manager_first_name || ''} ${formData.team.manager_last_name || ''}`.trim();
            const exists = formatted.some(m => m.name.toLowerCase() === mgrName.toLowerCase());
            if (!exists && mgrName) {
              const mgrUser = users.find(u => (u.name && u.name.toLowerCase() === mgrName.toLowerCase()) || (u.id === formData.team.manager_id));
              formatted.unshift({
                id: formData.team.manager_id || (mgrUser ? mgrUser.id : 'mgr'),
                name: mgrName,
                first_name: formData.team.manager_first_name || (mgrUser ? mgrUser.first_name : mgrName),
                last_name: formData.team.manager_last_name || (mgrUser ? mgrUser.last_name : ''),
                email: mgrUser ? mgrUser.email : '',
                avatar: mgrUser ? mgrUser.avatar : null
              });
            }
          }

          if (formatted.length > 0) {
            setTeamMembers(formatted);

            // Keep current reporter if in list, otherwise keep current or fallback to first
            setFormData(prev => {
              const currentReporterName = prev.reporter ? (prev.reporter.name || `${prev.reporter.first_name || ''} ${prev.reporter.last_name || ''}`.trim()).toLowerCase() : '';
              const inTeam = formatted.find(m => m.name.toLowerCase() === currentReporterName);
              return inTeam ? prev : { ...prev, reporter: prev.reporter || formatted[0] };
            });
          } else {
            setTeamMembers([]);
          }
        })
        .catch(err => {
          console.error('Error fetching team members:', err);
          setTeamMembers([]);
        });
    } else {
      setTeamMembers([]);
    }
  }, [formData.team?.id, users]);

  // Automatically select Team when Project / Space / Parent or projectId prop changes
  useEffect(() => {
    if (!isOpen || teams.length === 0) return;

    let targetProject = null;
    if (projectId) {
      targetProject = projects.find(p => Number(p.id) === Number(projectId));
    } else if (formData.space && formData.space.id) {
      targetProject = projects.find(p => Number(p.id) === Number(formData.space.id));
    } else if (formData.parent && formData.parent.id) {
      targetProject = projects.find(p => Number(p.id) === Number(formData.parent.id));
    }

    if (targetProject) {
      const matchedTeam = teams.find(t => 
        (targetProject.team_id && Number(t.id) === Number(targetProject.team_id)) ||
        (targetProject.team_name && t.name && t.name.toLowerCase() === targetProject.team_name.toLowerCase())
      );
      if (matchedTeam) {
        setFormData(prev => ({ ...prev, team: matchedTeam }));
      }
    }
  }, [isOpen, projectId, projects, teams, formData.space, formData.parent]);

  // Set editor content when drawer opens
  useEffect(() => {
    if (isOpen && editorRef.current) {
      editorRef.current.innerHTML = formData.description || "";
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const handleAssignToMe = () => {
    const searchName = username || 'ashwini';
    const me = users.find(u =>
      (u.first_name && u.first_name.toLowerCase() === searchName.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchName.toLowerCase()))
    );
    if (me) {
      setFormData(prev => ({ ...prev, assignee: me }));
    } else if (users.length > 0) {
      setFormData(prev => ({ ...prev, assignee: users[0] }));
    }
  };

  const handleImproveDescription = async () => {
    if (!formData.summary) {
      Swal.fire({
        icon: 'warning',
        title: 'Summary Required',
        text: 'Please enter a summary/title first, as the AI needs it to understand the context of the issue!',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      return;
    }
    setIsImprovingDescription(true);
    try {
      const res = await fetch(API_BASE_URL + '/it-kanban/ai/improve-description-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.summary,
          description: formData.description
        })
      });
      if (!res.ok) throw new Error('Failed to improve description');
      const data = await res.json();

      // Update form state
      setFormData(prev => ({ ...prev, description: data.improvedDescription }));
      // Sync editor element
      if (editorRef.current) {
        editorRef.current.innerHTML = data.improvedDescription;
      }

      Swal.fire({
        icon: 'success',
        title: 'Description Improved',
        text: 'The description has been enhanced by AI!',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to improve description: ' + err.message, 'error');
    } finally {
      setIsImprovingDescription(false);
    }
  };

  const handleAddLabel = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (newLabel.trim() && !formData.labels.includes(newLabel.trim())) {
        setFormData(prev => ({
          ...prev,
          labels: [...prev.labels, newLabel.trim()]
        }));
        setNewLabel('');
      }
    }
  };

  const removeLabel = (labelToRemove) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels.filter(l => l !== labelToRemove)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.summary) {
      Swal.fire({ icon: 'warning', title: 'Validation Error', text: 'Summary is required.' });
      return;
    }

    setIsSubmitting(true);

    try {
      let res;

      if (projectId) {
        // Map Kanban status values to project_tasks schema ENUM values
        const statusMap = {
          'To Do': 'Open',
          'In Progress': 'In Progress',
          'In Review': 'On Hold',
          'Done': 'Completed'
        };
        const mappedStatus = statusMap[formData.status] || 'Open';

        // Create project task
        const projectPayload = {
          title: formData.summary,
          description: formData.description || '',
          status: mappedStatus,
          priority: 'Medium',
          assigned_to: formData.assignee ? formData.assignee.id : null,
          linked_type: 'Project',
          linked_id: parseInt(projectId)
        };

        res = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectPayload)
        });
      } else {
        const selectedProjId = (formData.space && formData.space.id !== 1 ? formData.space.id : null) || (formData.parent ? formData.parent.id : null);

        const currentUserName = user ? (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username) : (username || 'Unassigned');

        // Create Kanban issue
        const reporterVal = formData.reporter
          ? (formData.reporter.name || `${formData.reporter.first_name || ''} ${formData.reporter.last_name || ''}`.trim() || currentUserName)
          : currentUserName;

        const teamVal = formData.team
          ? (typeof formData.team === 'string' ? formData.team : (formData.team.name || 'None'))
          : 'None';

        let assigneeVal = 'Unassigned';
        if (formData.assignee && (formData.assignee.name || formData.assignee.first_name)) {
          const aName = formData.assignee.name || `${formData.assignee.first_name || ''} ${formData.assignee.last_name || ''}`.trim();
          if (aName !== 'Automatic' && aName !== 'Unassigned') {
            assigneeVal = aName;
          }
        }

        // Default Assignee fallback: Assignee defaults to Reporter (creator performing the work)
        if (assigneeVal === 'Unassigned') {
          assigneeVal = reporterVal !== 'Unassigned' ? reporterVal : currentUserName;
        }

        const cleanDescription = (formData.description || '')
          .replace(/<a [^>]*class="[^"]*jira-inline-file[^"]*"[^>]*>[\s\S]*?<\/a>(<br\s*\/?>)?/gi, '')
          .replace(/<div [^>]*class="[^"]*jira-inline-file[^"]*"[^>]*>[\s\S]*?<\/div>(<br\s*\/?>)?/gi, '')
          .trim();

        const payload = {
          title: formData.summary,
          type: formData.workType || 'Task',
          status: formData.status ? formData.status.toUpperCase() : 'TO DO',
          assignee: assigneeVal,
          reporter: reporterVal,
          team: teamVal,
          team_id: formData.team && typeof formData.team === 'object' ? formData.team.id : null,
          priority: 'Medium',
          description: cleanDescription,
          project_id: selectedProjId,
          // The sprint owns the project, so the server may override project_id with the
          // sprint's own project — that keeps sprint and project from contradicting.
          sprint_id: formData.sprint?.id || null,
          sprint: formData.sprint?.name || null,
          department: currentDept,
          keyPrefix: currentDept === 'Marketing' ? 'MKT' : 'WR'
        };

        res = await fetch(API_BASE_URL + '/it-kanban/issues', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Lets the server name the actor in the assignment notification.
            'x-user-name': currentUserName,
            'x-user-id': user?.id || ''
          },
          body: JSON.stringify(payload)
        });
      }

      let createdData = null;
      try { createdData = await res.json(); } catch (_) {}
      if (!res.ok) throw new Error(createdData?.error || 'Failed to create issue');

      // Upload attachments if any
      if (attachedFiles.length > 0) {
        const createdTaskId = createdData?.id || createdData?.insertId || null;
        const issueKey = createdData?.issue_key;

        for (const file of attachedFiles) {
          try {
            const fd = new FormData();
            fd.append('file', file);
            if (createdTaskId) fd.append('task_id', createdTaskId);
            if (projectId) fd.append('project_id', projectId);
            fd.append('userId', '1');
            await fetch(API_BASE_URL + '/files/upload', { method: 'POST', body: fd });

            if (issueKey) {
              await fetch(`${API_BASE_URL}/it-kanban/issues/${issueKey}/attachments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  file_name: file.name,
                  file_path: file.name,
                  file_size: `${(file.size / 1024).toFixed(1)} KB`,
                  file_type: file.type || 'document'
                })
              });
            }
          } catch (uploadErr) {
            console.error('Failed to upload attachment:', file.name, uploadErr);
          }
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'Ticket Created',
        text: `Task "${formData.summary}" created successfully!`,
        timer: 2000,
        showConfirmButton: false
      });

      if (onIssueCreated) onIssueCreated();

      if (!formData.createAnother) {
        onClose();
      } else {
        setFormData(prev => ({ ...prev, summary: '', description: '', labels: [] }));
        if (editorRef.current) editorRef.current.innerHTML = "";
        setAttachedFiles([]);
      }
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to create issue.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setFormData(prev => ({ ...prev, description: editorRef.current.innerHTML }));
    }
  };

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
          <h2 className="text-xl text-gray-800 font-medium tracking-tight">Create Task</h2>
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
                options={[{ id: 1, name: 'My Kanban Space (KAN)', code: 'KAN' }, ...projects]}
                value={formData.space}
                onSelect={(v) => {
                  let matchedTeam = formData.team;
                  if (v && v.id) {
                    const proj = projects.find(p => Number(p.id) === Number(v.id));
                    if (proj) {
                      const found = teams.find(t =>
                        (proj.team_id && Number(t.id) === Number(proj.team_id)) ||
                        (proj.team_name && t.name && t.name.toLowerCase() === proj.team_name.toLowerCase())
                      );
                      if (found) matchedTeam = found;
                    }
                  }
                  // ...and that project's sprint. A sprint owns a project, so picking
                  // the project implies the sprint; prefer the running one.
                  let matchedSprint = formData.sprint;
                  if (v && v.id) {
                    const owning = sprints.filter(sp => Number(sp.project_id) === Number(v.id));
                    matchedSprint = owning.find(sp => sp.status === 'Active') || owning[0] || null;
                  }
                  setFormData(prev => ({ ...prev, space: v, team: matchedTeam, sprint: matchedSprint }));
                }}
                placeholder="Select space"
                labelRenderer={(p) => p.name}
                iconRenderer={(p) => p ? <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center text-white text-xs ">{p.code ? p.code[0] : p.name.charAt(0)}</div> : null}
              />
            </div>

            {/* Sprint. Filled in automatically when the chosen Space has a sprint;
                still selectable so work can go into any sprint, or stay in the Backlog. */}
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
                options={['Task', 'Story', 'Bug']}
                value={formData.workType}
                onSelect={(v) => setFormData({ ...formData, workType: v })}
                placeholder="Select type"
                labelRenderer={(t) => t}
                iconRenderer={(t) => {
                  if (t === 'Task') return <div className="bg-blue-100 p-0.5 rounded-sm"><CheckSquare size={12} className="text-blue-500" /></div>;
                  if (t === 'Bug') return <div className="w-3.5 h-3.5 bg-red-500 rounded-sm"></div>;
                  if (t === 'Story') return <div className="w-3.5 h-3.5 bg-green-500 rounded-sm"></div>;
                  return null;
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
                options={['To Do', 'In Progress', 'In Review', 'Done']}
                value={formData.status}
                onSelect={(v) => setFormData({ ...formData, status: v })}
              />
              <p className="text-sm text-gray-500 mt-1">This is the initial status upon creation.</p>
            </div>

            {/* Summary */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Summary <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
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
                    <span className="text-xs text-purple-600  border border-purple-200 bg-purple-50 px-1 rounded">AI</span>
                  </button>
                  <div className="w-px h-4 bg-gray-300 mx-1"></div>
                  <button type="button" className="p-1 hover:bg-gray-200 rounded text-gray-600"><Type size={14} /></button>
                  <button type="button" onClick={() => handleCommand('bold')} className="p-1 hover:bg-gray-200 rounded text-gray-600 "><Bold size={14} /></button>
                  <button type="button" onClick={() => handleCommand('italic')} className="p-1 hover:bg-gray-200 rounded text-gray-600 italic"><Italic size={14} /></button>
                  <div className="w-px h-4 bg-gray-300 mx-1"></div>
                  <button type="button" className="p-1 hover:bg-gray-200 rounded text-gray-600"><Columns size={14} /></button>
                  <button type="button" className="p-1 hover:bg-gray-200 rounded text-gray-600"><CheckSquare size={14} /></button>
                  <button type="button" onClick={() => handleCommand('insertUnorderedList')} className="p-1 hover:bg-gray-200 rounded text-gray-600"><List size={14} /></button>
                  <button type="button" onClick={() => handleCommand('formatBlock', '<pre>')} className="p-1 hover:bg-gray-200 rounded text-gray-600 font-serif  text-[12px] px-1.5">&lt;/&gt;</button>
                  <div className="w-px h-4 bg-gray-300 mx-1"></div>
                  <button type="button" onClick={() => toolbarFileInputRef.current?.click()} className="p-1 hover:bg-gray-200 rounded text-gray-600" title="Insert Image">
                    <Image size={14} />
                  </button>
                  {/* Hidden input for toolbar paperclip */}
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
                options={(teamMembers.length > 0) ? teamMembers : users}
                value={formData.assignee}
                onSelect={(v) => setFormData({ ...formData, assignee: v })}
                placeholder="Automatic"
                labelRenderer={(u) => u.name || `${u.first_name} ${u.last_name}`}
                iconRenderer={(u) => u ? (
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-700  border border-white  overflow-hidden shrink-0">
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
                onSelect={(v) => {
                  let matchedTeam = formData.team;
                  if (v && v.id) {
                    const proj = projects.find(p => Number(p.id) === Number(v.id));
                    if (proj) {
                      const found = teams.find(t =>
                        (proj.team_id && Number(t.id) === Number(proj.team_id)) ||
                        (proj.team_name && t.name && t.name.toLowerCase() === proj.team_name.toLowerCase())
                      );
                      if (found) matchedTeam = found;
                    }
                  }
                  setFormData(prev => ({ ...prev, parent: v, team: matchedTeam }));
                }}
                placeholder="Select parent"
                labelRenderer={(p) => p.name}
              />
              <p className="text-sm text-gray-500 mt-1 leading-tight">Your work type hierarchy determines the work items you can select here.</p>
            </div>

            {/* Due date */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Due date</label>
              <div className="flex items-center justify-between w-64 border border-gray-300 rounded-[3px] px-2.5 py-1.5 bg-white cursor-pointer hover:bg-gray-50 text-gray-500 relative">
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
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
            </div>

            {/* Team */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Team</label>
              <SearchableDropdown
                options={teams}
                value={formData.team}
                onSelect={(v) => setFormData({ ...formData, team: v })}
                placeholder="Choose a team"
                labelRenderer={(t) => t.name}
                iconRenderer={(t) => t ? (
                  <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center text-blue-700  text-xs">
                    {t.icon}
                  </div>
                ) : (
                  <div className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center text-gray-500 border border-gray-200">
                    <Search size={10} />
                  </div>
                )}
              />
              <p className="text-sm text-gray-500 mt-1 leading-tight">Associates a team to an issue. You can use this field to search and filter issues by team.</p>
            </div>

            {/* Start date */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Start date</label>
              <div className="flex items-center justify-between w-64 border border-gray-300 rounded-[3px] px-2.5 py-1.5 bg-white cursor-pointer hover:bg-gray-50 text-gray-500 relative">
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full h-full outline-none text-[13px] text-gray-700 bg-transparent"
                />
                <Calendar size={14} className="absolute right-2.5 pointer-events-none text-gray-500" />
              </div>
              <p className="text-sm text-gray-500 mt-1 leading-tight">Allows the planned start date for a piece of work to be set.</p>
            </div>

            {/* Reporter */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Reporter <span className="text-red-500">*</span></label>
              <SearchableDropdown
                options={(teamMembers.length > 0) ? teamMembers : users}
                value={formData.reporter}
                onSelect={(v) => setFormData({ ...formData, reporter: v })}
                placeholder="Select reporter"
                labelRenderer={(u) => u.name || `${u.first_name} ${u.last_name}`}
                iconRenderer={(u) => u ? (
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-700  border border-white  overflow-hidden shrink-0 mr-2">
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
                    const newFiles = Array.from(e.target.files); // Store actual File objects
                    setAttachedFiles(prev => [...prev, ...newFiles]);
                    e.target.value = ''; // Reset so same file can be re-added
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
                  Drop files to attach or <span className="text-gray-900 bg-gray-100 border border-gray-300 rounded-[3px] px-2 py-0.5 ml-1  font-medium">Browse</span>
                </div>
              </div>

              {/* Attached file list — Jira style cards */}
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
                              📄
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-800 truncate" title={file.name}>
                              {file.name}
                            </div>
                            <div className="text-[10px] text-gray-400 font-medium">
                              {formattedDate} • {formattedSize}
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
                    onSelect={(v) => setFormData({ ...formData, linkedType: v })}
                    placeholder="Select type"
                    labelRenderer={(t) => t}
                  />
                </div>
                <div className="w-2/3">
                  <SearchableDropdown
                    options={projects}
                    value={formData.linkedTarget}
                    onSelect={(v) => setFormData({ ...formData, linkedTarget: v })}
                    placeholder="Type, search or paste URL"
                    labelRenderer={(p) => p.name}
                  />
                </div>
              </div>
            </div>

            {/* Flagged */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Flagged</label>
              <div className="flex items-center gap-2 mb-1 cursor-pointer" onClick={(e) => { e.preventDefault(); setFormData({ ...formData, flagged: !formData.flagged }); }}>
                <input
                  type="checkbox"
                  checked={formData.flagged}
                  onChange={(e) => setFormData({ ...formData, flagged: e.target.checked })}
                  className="w-3.5 h-3.5 text-blue-600 rounded-[2px] border-gray-300 focus:ring-blue-500 focus:ring-offset-0 focus:ring-1 cursor-pointer pointer-events-none"
                />
                <span className="text-[13px] text-gray-900 select-none">Impediment</span>
              </div>
              <p className="text-sm text-gray-500 mt-1 leading-tight">Allows to flag issues with impediments.</p>
            </div>

          </form>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white rounded-b-lg">
          <div className="flex items-center gap-2 cursor-pointer" onClick={(e) => { e.preventDefault(); setFormData({ ...formData, createAnother: !formData.createAnother }); }}>
            <input
              type="checkbox"
              checked={formData.createAnother}
              onChange={(e) => setFormData({ ...formData, createAnother: e.target.checked })}
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
              disabled={isSubmitting}
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

export default ITCreateIssueDrawer;

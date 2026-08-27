import React, { useState, useEffect } from 'react';
import {
  X, HelpCircle, Check, ArrowUp, ArrowDown, AlertCircle,
  Sparkles, CheckSquare, Upload, Paperclip, Trash2
} from 'lucide-react';
import { DEPARTMENT_KANBAN_CONFIG } from '../../config/departmentKanbanConfig';
import { API_BASE_URL } from '../../config/environment';
import { useAuth } from '../../hooks/useAuth';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const PRIORITIES = [
  { name: 'High', icon: ArrowUp, color: 'text-red-600' },
  { name: 'Medium', icon: ArrowUp, color: 'text-orange-500' },
  { name: 'Low', icon: ArrowDown, color: 'text-blue-500' },
];

const STATUSES = ['TO DO', 'IN PROGRESS', 'IN REVIEW', 'TESTING', 'DONE'];

const UniversalCreateIssueDrawer = ({ department = 'IT', isOpen, onClose, onIssueCreated }) => {
  const { user } = useAuth();
  const config = DEPARTMENT_KANBAN_CONFIG[department] || DEPARTMENT_KANBAN_CONFIG['IT'];
  
  const selectableSpaces = config.spaces.filter(s => s.id !== 'ALL');
  const [selectedSpace, setSelectedSpace] = useState(selectableSpaces[0] || config.spaces[0]);
  const [issueType, setIssueType] = useState(config.issueTypes[0]?.name || 'Task');
  const [status, setStatus] = useState('TO DO');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('Unassigned');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [storyPoints, setStoryPoints] = useState('');
  
  // UI states
  const [usersList, setUsersList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImprovingDescription, setIsImprovingDescription] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectableSpaces.length > 0) {
      setSelectedSpace(selectableSpaces[0]);
    }
    if (config.issueTypes.length > 0) {
      setIssueType(config.issueTypes[0].name);
    }
  }, [department]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/available-users/${user?.id || 1}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setUsersList(list);
      }
    } catch (err) {
      console.error('Failed to fetch available users:', err);
    }
  };

  const handleAiImproveDraft = async () => {
    if (!summary && !description) {
      showErrorToast('Please enter a title or draft description first');
      return;
    }
    try {
      setIsImprovingDescription(true);
      const res = await fetch(`${API_BASE_URL}/it-kanban/ai/improve-description-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: summary, draftDescription: description })
      });
      if (res.ok) {
        const data = await res.json();
        setDescription(data.improvedDescription || description);
        showSuccessToast('Description enhanced with AI!');
      } else {
        throw new Error('AI Service error');
      }
    } catch (err) {
      showErrorToast('Failed to generate AI description');
    } finally {
      setIsImprovingDescription(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!summary.trim()) {
      showErrorToast('Please enter an issue summary');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: summary.trim(),
        type: issueType,
        priority,
        status,
        assignee,
        reporter: user?.name || user?.email || `${department} User`,
        description,
        department,
        keyPrefix: selectedSpace?.code || config.defaultPrefix,
        due_date: dueDate || null,
        story_points: storyPoints || null
      };

      const res = await fetch(`${API_BASE_URL}/it-kanban/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        showSuccessToast(`Ticket ${data.issue_key} created successfully!`);
        if (onIssueCreated) onIssueCreated();
        handleClose();
      } else {
        throw new Error('Failed to create ticket');
      }
    } catch (err) {
      showErrorToast(err.message || 'Error creating ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSummary('');
    setDescription('');
    setStatus('TO DO');
    setAssignee('Unassigned');
    setPriority('Medium');
    setDueDate('');
    setStoryPoints('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm animate-fade-in flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-gray-200">
        
        {/* DRAWER HEADER */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-red-50/50 to-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs">
              {selectedSpace?.code || config.defaultPrefix}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Create {department} Ticket</h2>
              <p className="text-xs text-gray-500">Add a new task or deliverable to {config.departmentName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* DRAWER BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* SPACE SELECTION */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{department} Space / Track</label>
            <select
              value={selectedSpace?.id}
              onChange={(e) => {
                const found = selectableSpaces.find(s => s.id === e.target.value);
                if (found) setSelectedSpace(found);
              }}
              className="w-full h-9 px-3 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              {selectableSpaces.map(space => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          </div>

          {/* ISSUE TYPE SELECTOR */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ticket Type</label>
            <div className="grid grid-cols-3 gap-2">
              {config.issueTypes.map(type => {
                const Icon = type.icon;
                const isSelected = issueType === type.name;
                return (
                  <button
                    key={type.name}
                    type="button"
                    onClick={() => setIssueType(type.name)}
                    className={`flex items-center gap-2 p-2 border rounded-lg text-xs font-medium text-left transition-all ${
                      isSelected
                        ? 'border-red-500 bg-red-50/60 text-red-700 ring-1 ring-red-500'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className={`p-1.5 rounded-md ${type.color}`}>
                      <Icon size={14} />
                    </div>
                    <span>{type.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SUMMARY / TITLE */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Summary / Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Implement feature or create deliverable specs..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full h-9 px-3 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {/* DESCRIPTION WITH AI IMPROVER */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700">Detailed Description / Specs</label>
              <button
                type="button"
                onClick={handleAiImproveDraft}
                disabled={isImprovingDescription}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors"
              >
                <Sparkles size={13} className={isImprovingDescription ? 'animate-spin' : ''} />
                <span>{isImprovingDescription ? 'Enhancing...' : 'AI Enhance Brief'}</span>
              </button>
            </div>
            <textarea
              rows={4}
              placeholder="Provide objective, technical details, requirements, or links..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {/* STATUS & PRIORITY */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status Column</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                {STATUSES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                {PRIORITIES.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ASSIGNEE & DUE DATE */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Assignee</label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="Unassigned">Unassigned</option>
                {usersList.map(u => {
                  const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || u.email;
                  return (
                    <option key={u.id} value={fullName}>
                      {fullName} {u.department ? `(${u.department})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Target Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

        </form>

        {/* DRAWER FOOTER */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            {isSubmitting ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default UniversalCreateIssueDrawer;

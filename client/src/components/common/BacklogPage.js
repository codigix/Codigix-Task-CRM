import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, Plus, MoreHorizontal, Calendar,
  CheckSquare, ArrowUp, ArrowDown, Inbox, Search, Check, Lock, Trash2
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { DEPARTMENT_KANBAN_CONFIG } from '../../config/departmentKanbanConfig';
import { useAuth } from '../../hooks/useAuth';
import { isManagerDesignation } from '../../utils/access';
import { API_BASE_URL } from '../../config/environment';
import BoardTabs from './BoardTabs';
import StartSprintModal from './StartSprintModal';
import CreateSprintModal from './CreateSprintModal';
import CompleteSprintModal from './CompleteSprintModal';
import ImportCalendarModal from './ImportCalendarModal';
import ITIssueDetailsPanel from '../it/ITIssueDetailsPanel';
import Swal from 'sweetalert2';

const PRIORITY_ICONS = {
  Critical: <ArrowUp size={13} className="text-red-600" />,
  High: <ArrowUp size={13} className="text-red-500" />,
  Medium: <ArrowUp size={13} className="text-orange-500" />,
  Low: <ArrowDown size={13} className="text-blue-500" />
};

// The board's columns, so a status set here lands the item in the right column there.
const STATUS_OPTIONS = ['TO DO', 'IN PROGRESS', 'IN REVIEW', 'TESTING', 'DONE'];

const STATUS_STYLES = {
  'TO DO': 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
  'IN PROGRESS': 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  'IN REVIEW': 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  'TESTING': 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  'DONE': 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
};

const statusStyle = (s) => STATUS_STYLES[String(s || '').toUpperCase()] || STATUS_STYLES['TO DO'];

// Matches the server's definition of finished work.
const DONE_STATUSES = ['DONE', 'COMPLETED', 'CLOSED'];
const isDoneStatus = (s) => DONE_STATUSES.includes(String(s || '').toUpperCase().trim());

// "IN PROGRESS" reads as "In Progress" in the chip, matching Jira.
const titleCase = (s) => String(s || '')
  .toLowerCase()
  .replace(/\b\w/g, (c) => c.toUpperCase());

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-purple-600',
  'bg-orange-500', 'bg-pink-600', 'bg-teal-600', 'bg-indigo-600'
];

const avatarColor = (name) => {
  const n = String(name || '');
  let hash = 0;
  for (let i = 0; i < n.length; i++) hash = (hash + n.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
};

const initials = (name) => String(name || '')
  .trim().split(/\s+/).slice(0, 2)
  .map(p => p.charAt(0).toUpperCase()).join('') || '?';

const formatDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

// Compared as calendar days in local time: a DATE column comes back as e.g.
// 2026-08-04T18:30:00Z, which is 5 Aug in IST, so a UTC comparison would call it a day early.
const isPastDate = (v) => {
  if (!v) return false;
  const d = new Date(v);
  if (isNaN(d.getTime())) return false;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const now = new Date();
  return day < new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/**
 * Dropdown anchored to a trigger button using fixed positioning.
 * The sprint/backlog cards use `overflow-hidden` for their rounded corners, which clips a
 * normally-positioned absolute menu — fixed positioning escapes any ancestor clipping.
 */
const AnchoredMenu = ({ open, anchorRect, onClose, width = 208, children }) => {
  if (!open || !anchorRect) return null;

  // Flip above the trigger when there isn't room below.
  const estimatedHeight = 190;
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const top = spaceBelow < estimatedHeight
    ? Math.max(8, anchorRect.top - estimatedHeight)
    : anchorRect.bottom + 4;
  const left = Math.max(8, Math.min(anchorRect.right - width, window.innerWidth - width - 8));

  // The menu is a DOM descendant of a clickable row, so swallow clicks here — otherwise
  // choosing a status or an assignee would also open the work item.
  const swallow = (e) => e.stopPropagation();

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={(e) => { swallow(e); onClose(); }} />
      <div
        onClick={swallow}
        className="fixed bg-white border border-gray-200 rounded shadow-lg py-1 z-[61] text-[13px]"
        style={{ top, left, width }}
      >
        {children}
      </div>
    </>
  );
};

/**
 * Inline status chip. Jira lets you transition a work item straight from the backlog row
 * without opening it, so this writes the new status through the same endpoint the board uses.
 */
const StatusPicker = ({ status, onChange }) => {
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const current = String(status || 'TO DO').toUpperCase();

  return (
    <div className="shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setAnchorRect(e.currentTarget.getBoundingClientRect());
          setOpen(!open);
        }}
        className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded border transition ${statusStyle(current)}`}
      >
        {titleCase(current)} <ChevronDown size={11} />
      </button>
      <AnchoredMenu open={open} anchorRect={anchorRect} width={170} onClose={() => setOpen(false)}>
        {STATUS_OPTIONS.map(s => (
          <div
            key={s}
            onClick={() => { setOpen(false); if (s !== current) onChange(s); }}
            className="px-2.5 py-1.5 hover:bg-gray-50 cursor-pointer flex items-center justify-between gap-2"
          >
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${statusStyle(s)}`}>
              {titleCase(s)}
            </span>
            {s === current && <Check size={13} className="text-blue-600" />}
          </div>
        ))}
      </AnchoredMenu>
    </div>
  );
};

/**
 * Assignee avatar with a searchable picker, including Jira's "Unassigned" and
 * "Assign to me" entries.
 */
const AssigneePicker = ({ assignee, users, currentUserName, onChange }) => {
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const [query, setQuery] = useState('');

  const name = assignee && assignee !== 'Unassigned' ? assignee : '';
  const q = query.trim().toLowerCase();
  const matches = users.filter(u => !q || u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));

  const pick = (value) => { setOpen(false); setQuery(''); if (value !== assignee) onChange(value); };

  return (
    <div className="shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setAnchorRect(e.currentTarget.getBoundingClientRect());
          setOpen(!open);
          setQuery('');
        }}
        title={name || 'Unassigned'}
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ring-1 ring-white hover:ring-blue-400 transition ${name ? `${avatarColor(name)} text-white` : 'bg-gray-200 text-gray-500'
          }`}
      >
        {name ? initials(name) : '?'}
      </button>

      <AnchoredMenu open={open} anchorRect={anchorRect} width={260} onClose={() => setOpen(false)}>
        <div className="px-2 pb-1.5 pt-1">
          <div className="flex items-center gap-1.5 border border-gray-300 rounded px-2 py-1 focus-within:border-blue-500">
            <Search size={12} className="text-gray-400 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assignee"
              className="text-[12px] w-full outline-none"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          <div
            onClick={() => pick('Unassigned')}
            className="px-2.5 py-1.5 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
          >
            <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[9px] font-bold">?</span>
            <span className="text-gray-700">Unassigned</span>
            {(!assignee || assignee === 'Unassigned') && <Check size={13} className="text-blue-600 ml-auto" />}
          </div>

          {currentUserName && (
            <div
              onClick={() => pick(currentUserName)}
              className="px-2.5 py-1.5 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
            >
              <span className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[9px] font-bold ${avatarColor(currentUserName)}`}>
                {initials(currentUserName)}
              </span>
              <span className="text-gray-700 truncate">
                {currentUserName} <span className="text-gray-400">(Assign to me)</span>
              </span>
            </div>
          )}

          {matches.filter(u => u.name !== currentUserName).map(u => (
            <div
              key={u.id || u.name}
              onClick={() => pick(u.name)}
              className="px-2.5 py-1.5 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
            >
              <span className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[9px] font-bold shrink-0 ${avatarColor(u.name)}`}>
                {initials(u.name)}
              </span>
              <div className="min-w-0">
                <div className="text-gray-700 truncate">{u.name}</div>
                {u.email && <div className="text-[10px] text-gray-400 truncate">{u.email}</div>}
              </div>
              {assignee === u.name && <Check size={13} className="text-blue-600 ml-auto shrink-0" />}
            </div>
          ))}

          {matches.length === 0 && (
            <div className="px-2.5 py-3 text-center text-[12px] text-gray-400">No matching people</div>
          )}
        </div>
      </AnchoredMenu>
    </div>
  );
};

/**
 * Jira's "+ Create" row at the foot of every sprint and the backlog.
 * Typing a summary and pressing Enter creates the item in that section and keeps the field
 * open, so several items can be added in a row without reaching for the mouse.
 */
const InlineCreateRow = ({ sprintId, onCreate }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    const value = title.trim();
    if (!value || isSaving) return;
    setIsSaving(true);
    try {
      await onCreate(value, sprintId);
      setTitle(''); // Stay open for the next one, as Jira does.
    } catch (err) {
      Swal.fire('Could not create the work item', err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-[13px] text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition"
      >
        <Plus size={14} /> Create
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/40 border-t border-gray-100">
      <CheckSquare size={13} className="text-blue-500 shrink-0" />
      <input
        autoFocus
        value={title}
        disabled={isSaving}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); submit(); }
          if (e.key === 'Escape') { setOpen(false); setTitle(''); }
        }}
        // Closing on blur would swallow the text, so only close an empty field.
        onBlur={() => { if (!title.trim()) setOpen(false); }}
        placeholder="What needs to be done?"
        className="flex-1 text-[13px] bg-white border border-blue-400 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-60"
      />
      <button
        onMouseDown={(e) => e.preventDefault()} /* keep focus so onBlur doesn't fire first */
        onClick={submit}
        disabled={!title.trim() || isSaving}
        className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
      >
        {isSaving ? 'Creating…' : 'Create'}
      </button>
      <button
        onClick={() => { setOpen(false); setTitle(''); }}
        className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded transition"
      >
        Cancel
      </button>
    </div>
  );
};

// A single work item row, shared by sprint sections and the backlog.
const WorkItemRow = ({ item, index, sprints, currentSprintId, users, currentUserName, isSelected, onMove, onOpen, onUpdate, onDelete, onCopy }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);

  const destinations = [
    ...sprints.filter(s => s.id !== currentSprintId && s.status !== 'Completed')
      .map(s => ({ id: s.id, label: s.name })),
    ...(currentSprintId ? [{ id: null, label: 'Backlog' }] : [])
  ];

  return (
    <Draggable draggableId={item.issue_key} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpen(item.issue_key)}
          className={`flex items-center gap-3 px-3 py-2 border-b border-gray-100 last:border-0 cursor-pointer group transition ${snapshot.isDragging ? 'bg-white shadow-lg ring-1 ring-blue-300' :
              isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : 'bg-white hover:bg-blue-50/40'
            }`}
          style={provided.draggableProps.style}
        >
          <CheckSquare size={13} className="text-blue-500 shrink-0" />
          {/* Jira strikes through the key of a finished item — the key only, not the title. */}
          <span className={`text-xs text-blue-600 font-medium shrink-0 w-20 group-hover:underline ${isDoneStatus(item.status) ? 'line-through' : ''
            }`}>
            {item.issue_key}
          </span>
          <span className="text-xs text-gray-800 flex-1 truncate group-hover:underline">{item.title}</span>

          {/* Due date, or the start date when only that is set. Overdue work is called out,
          but only while it is still unfinished — a late-finished item is just done. */}
          {(() => {
            const value = item.due_date || item.start_date;
            const text = formatDate(value);
            if (!text) return null;
            const isDue = !!item.due_date;
            const overdue = isDue && !isDoneStatus(item.status) && isPastDate(value);
            return (
              <span
                title={`${isDue ? 'Due' : 'Starts'} ${text}${overdue ? ' — overdue' : ''}`}
                className={`shrink-0 flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border ${overdue
                    ? 'bg-red-50 text-red-700 border-red-200 font-medium'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
              >
                <Calendar size={10} /> {text}
              </span>
            );
          })()}

          <StatusPicker status={item.status} onChange={(s) => onUpdate(item.issue_key, { status: s })} />

          <span className="shrink-0" title={item.priority}>{PRIORITY_ICONS[item.priority] || PRIORITY_ICONS.Medium}</span>

          <AssigneePicker
            assignee={item.assignee}
            users={users}
            currentUserName={currentUserName}
            onChange={(a) => onUpdate(item.issue_key, { assignee: a })}
          />

          <div className="shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAnchorRect(e.currentTarget.getBoundingClientRect());
                setMenuOpen(!menuOpen);
              }}
              className="p-1 text-gray-400 hover:text-gray-700 transition"
            >
              <MoreHorizontal size={14} />
            </button>
            <AnchoredMenu open={menuOpen} anchorRect={anchorRect} width={230} onClose={() => setMenuOpen(false)}>
              <div className="px-3 py-1 text-[10px] text-gray-400 uppercase tracking-wide">Move to</div>
              {destinations.length === 0 && (
                <div className="px-3 py-1.5 text-gray-400 text-xs">No other sprint yet</div>
              )}
              {destinations.map(d => (
                <div
                  key={String(d.id)}
                  onClick={() => { onMove(item.issue_key, d.id); setMenuOpen(false); }}
                  className="px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-gray-700"
                >
                  {d.label}
                </div>
              ))}

              <div className="border-t border-gray-100 my-1" />
              <div
                onClick={() => { setMenuOpen(false); onCopy('link', item.issue_key); }}
                className="px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-gray-700"
              >
                Copy link
              </div>
              <div
                onClick={() => { setMenuOpen(false); onCopy('key', item.issue_key); }}
                className="px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-gray-700"
              >
                Copy key
              </div>

              <div className="border-t border-gray-100 my-1" />
              <div
                onClick={() => { setMenuOpen(false); onDelete(item); }}
                className="px-3 py-1.5 hover:bg-red-50 cursor-pointer text-red-600 flex items-center gap-2"
              >
                <Trash2 size={12} /> Delete
              </div>
            </AnchoredMenu>
          </div>
        </div>
      )}
    </Draggable>
  );
};

const BacklogPage = ({ department }) => {
  const { user } = useAuth();
  const { designation, username } = useParams();
  const canPlanSprints = isManagerDesignation(designation);

  const currentDept = department
    || (user?.department || '').replace(/\s*department\s*$/i, '').trim()
    || 'IT';

  const currentUserName = user
    ? (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username)
    : (username || '');

  const [sprints, setSprints] = useState([]);
  const [backlog, setBacklog] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [sprintToStart, setSprintToStart] = useState(null);
  const [sprintToEdit, setSprintToEdit] = useState(null);
  const [sprintToComplete, setSprintToComplete] = useState(null);
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  // Which sprint the import lands in; null means the Backlog.
  const [importSprintId, setImportSprintId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/sprints?department=${encodeURIComponent(currentDept)}`);
      if (!res.ok) throw new Error('Failed to load backlog');
      const data = await res.json();
      setSprints(data.sprints || []);
      setBacklog(data.backlog || []);
    } catch (err) {
      console.error('Failed to load backlog:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentDept]);

  useEffect(() => { load(); }, [load]);

  // Projects a sprint can belong to, scoped to this department.
  useEffect(() => {
    fetch(`${API_BASE_URL}/projects?department=${encodeURIComponent(currentDept)}`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        setProjects(list);
      })
      .catch(err => console.error('Failed to load projects for sprint creation:', err));
  }, [currentDept]);

  // People who can be assigned work on this board — same department scoping the board uses.
  useEffect(() => {
    fetch(`${API_BASE_URL}/users`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data?.value) ? data.value : (Array.isArray(data) ? data : []);
        setUsersList(list);
      })
      .catch(err => console.error('Failed to load users for assignee picker:', err));
  }, []);

  const assignableUsers = React.useMemo(() => {
    const SYSTEM_ACCOUNTS = ['admin', 'leads', 'deals', 'sales', 'marketing', 'it', 'accounting'];
    const target = currentDept.toLowerCase();

    // Match on the department itself rather than on job titles. Matching titles lets people
    // leak across boards — "Video Editor" contains "it" and "Wordpress Developer" contains
    // "developer", so both would show up on the IT board. Titles are only a fallback for
    // users whose department was never set.
    const normalizeDept = (d) => String(d || '').toLowerCase().replace(/\s*department\s*$/, '').trim();

    return usersList
      .filter(u => {
        if (SYSTEM_ACCOUNTS.includes(String(u.username || '').toLowerCase())) return false;
        const dept = normalizeDept(u.department);
        if (dept) return dept === target;

        const role = String(u.role_name || u.role || '').toLowerCase();
        return target === 'marketing'
          ? /marketing|designer|video|seo|ppc/.test(role)
          : /\bit\b|developer|tester|devops/.test(role);
      })
      .map(u => ({
        id: u.id,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
        email: u.email
      }))
      .filter(u => u.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [usersList, currentDept]);

  // Clicking a row opens the same details panel the board uses, right here in the backlog.
  const openIssue = (key) => setSelectedKey(key);

  const allItems = React.useMemo(
    () => [...sprints.flatMap(s => s.issues || []), ...backlog],
    [sprints, backlog]
  );

  const selectedIssue = React.useMemo(
    () => allItems.find(i => i.issue_key === selectedKey) || null,
    [allItems, selectedKey]
  );

  // Recomputed after an inline status change so the sprint's To Do / In Progress / Done
  // badges stay truthful without waiting for a refetch.
  const recount = (issues) => issues.reduce((acc, i) => {
    const st = String(i.status || '').toUpperCase();
    if (isDoneStatus(st)) acc.done++;
    else if (st === 'IN PROGRESS') acc.inProgress++;
    else acc.todo++;
    return acc;
  }, { todo: 0, inProgress: 0, done: 0 });

  // Writes through the same endpoint the board uses, so history is attributed identically.
  const updateItem = async (issueKey, updates) => {
    const patch = (list) => list.map(i => (i.issue_key === issueKey ? { ...i, ...updates } : i));
    setSprints(prev => prev.map(s => {
      const issues = patch(s.issues || []);
      return { ...s, issues, counts: recount(issues) };
    }));
    setBacklog(prev => patch(prev));

    try {
      const res = await fetch(`${API_BASE_URL}/it-kanban/issues/${issueKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': currentUserName || 'System'
        },
        body: JSON.stringify(updates)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error || 'Update rejected by the server');
        err.openSubtasks = data.openSubtasks;
        throw err;
      }
    } catch (err) {
      console.error('Failed to update work item:', err);
      // Blocked by the subtask rule? Name the subtasks so it is obvious what to finish.
      if (err.openSubtasks && err.openSubtasks.length) {
        Swal.fire({
          icon: 'warning',
          title: 'Finish the subtasks first',
          html: `<div style="text-align:left;font-size:13px">
                   <p style="margin-bottom:8px">${err.message}</p>
                   <ul style="margin:0;padding-left:18px">
                     ${err.openSubtasks.map(t => `<li>${t}</li>`).join('')}
                   </ul>
                 </div>`
        });
      } else {
        Swal.fire('Could not save the change', err.message, 'error');
      }
      load(); // Roll the optimistic edit back to what the server actually has.
    }
  };

  const deleteItem = async (issueKey) => {
    try {
      await fetch(`${API_BASE_URL}/it-kanban/issues/${issueKey}`, { method: 'DELETE' });
      setSelectedKey(null);
      load();
    } catch (err) {
      console.error('Failed to delete work item:', err);
    }
  };

  // Jira's Copy link / Copy key. The link is the deep link the board already understands.
  const copyToClipboard = async (what, issueKey) => {
    const base = `${window.location.origin}/${currentDept.toLowerCase() === 'marketing' ? 'marketing' : 'it'}/${designation}/${username}`;
    const text = what === 'key' ? issueKey : `${base}/kanban?ticketKey=${encodeURIComponent(issueKey)}`;
    try {
      await navigator.clipboard.writeText(text);
      Swal.fire({
        toast: true, position: 'bottom-end', icon: 'success',
        title: what === 'key' ? 'Key copied' : 'Link copied',
        timer: 1600, showConfirmButton: false
      });
    } catch (err) {
      // Clipboard access needs a secure context; show the value so it can still be copied.
      Swal.fire('Copy this', text, 'info');
    }
  };

  // Creates a work item straight into a sprint section or the backlog, the way Jira's
  // inline "+ Create" does. New items land unranked, so they sort to the bottom of their
  // section until someone drags them.
  const createWorkItem = async (title, sprintId) => {
    const res = await fetch(`${API_BASE_URL}/it-kanban/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-name': currentUserName || 'System'
      },
      body: JSON.stringify({
        title,
        type: 'Task',
        status: 'TO DO',
        priority: 'Medium',
        department: currentDept,
        keyPrefix: DEPARTMENT_KANBAN_CONFIG[currentDept]?.defaultPrefix,
        reporter: currentUserName || 'Unassigned',
        assignee: 'Unassigned',
        sprint_id: sprintId ?? null
      })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to create the work item');
    await load();
  };

  const createSprint = async (values) => {
    const res = await fetch(`${API_BASE_URL}/sprints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, department: currentDept })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to create sprint');
    setIsCreatingSprint(false);
    load();
  };

  const moveItem = async (issueKey, sprintId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/sprints/move-issues`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueKeys: [issueKey], sprintId })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      load();
    } catch (err) {
      Swal.fire('Could not move work item', err.message, 'error');
    }
  };

  // Opens the Jira-style Start Sprint dialog; the modal handles validation and reports
  // errors inline, so a failed start keeps the user's input rather than closing.
  const handleStartSprint = async (values) => {
    const res = await fetch(`${API_BASE_URL}/sprints/${sprintToStart.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to start sprint');

    // The name may have been edited in the dialog.
    if (values.name && values.name !== sprintToStart.name) {
      await fetch(`${API_BASE_URL}/sprints/${sprintToStart.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name })
      });
    }

    setSprintToStart(null);
    load();
    Swal.fire({
      icon: 'success', title: 'Sprint started',
      text: `${data.itemCount} work item${data.itemCount === 1 ? '' : 's'} are now on the board.`,
      timer: 2500, showConfirmButton: false
    });
  };

  // Errors surface inside the dialog, so a rejected completion keeps the user's choices.
  const handleCompleteSprint = async (sprint, moveTo) => {
    const res = await fetch(`${API_BASE_URL}/sprints/${sprint.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moveTo })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to complete sprint');

    setSprintToComplete(null);
    load();
    Swal.fire({
      icon: 'success',
      title: 'Sprint completed',
      text: data.movedCount > 0
        ? `${data.completedCount} done · ${data.movedCount} moved to ${data.movedTo}`
        : `${data.completedCount} work item${data.completedCount === 1 ? '' : 's'} completed.`,
      timer: 3000, showConfirmButton: false
    });
  };

  // Deletes straight away, with no confirmation step. Safe to do because the work itself
  // is never lost — every item returns to the Backlog and only the sprint is removed.
  const deleteSprint = async (sprint) => {
    try {
      const res = await fetch(`${API_BASE_URL}/sprints/${sprint.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      load();
      if (data.movedToBacklog > 0) {
        Swal.fire({
          icon: 'success',
          title: 'Sprint deleted',
          text: `${data.movedToBacklog} work item${data.movedToBacklog === 1 ? '' : 's'} moved to the Backlog.`,
          timer: 2500, showConfirmButton: false
        });
      }
    } catch (err) {
      Swal.fire('Could not delete sprint', err.message, 'error');
    }
  };

  const reorderSprint = async (sprint, direction) => {
    try {
      const res = await fetch(`${API_BASE_URL}/sprints/${sprint.id}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      load();
    } catch (err) {
      Swal.fire('Could not reorder sprint', err.message, 'error');
    }
  };

  const saveSprintEdits = async (values) => {
    const res = await fetch(`${API_BASE_URL}/sprints/${sprintToEdit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: values.name, goal: values.goal,
        start_date: values.start_date, end_date: values.end_date
      })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to save sprint');
    setSprintToEdit(null);
    load();
  };

  // Dragging a work item is Jira's ranking gesture: it sets priority order and, when dropped
  // into a different section, sprint membership too. The whole board order is sent so ranks
  // stay globally comparable — that is what lets the List view sort by the same field.
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const idOf = (droppableId) => (droppableId === 'backlog' ? null : Number(droppableId.replace('sprint-', '')));
    const destSprintId = idOf(destination.droppableId);

    // Refuse drops into a completed sprint, matching the server's rule.
    const destSprint = sprints.find(s => Number(s.id) === Number(destSprintId));
    if (destSprint && destSprint.status === 'Completed') {
      Swal.fire('Cannot move work into a completed sprint', '', 'warning');
      return;
    }

    // Build the new lists locally so the row lands where it was dropped without a refetch.
    const listFor = (droppableId) => (droppableId === 'backlog'
      ? [...backlog]
      : [...(sprints.find(s => `sprint-${s.id}` === droppableId)?.issues || [])]);

    const from = listFor(source.droppableId);
    const [moved] = from.splice(source.index, 1);
    if (!moved) return;

    const to = source.droppableId === destination.droppableId ? from : listFor(destination.droppableId);
    to.splice(destination.index, 0, { ...moved, sprint_id: destSprintId });

    const nextSprints = sprints.map(s => {
      if (`sprint-${s.id}` === source.droppableId && source.droppableId !== destination.droppableId) {
        return { ...s, issues: from, counts: recount(from) };
      }
      if (`sprint-${s.id}` === destination.droppableId) {
        return { ...s, issues: to, counts: recount(to) };
      }
      return s;
    });
    const nextBacklog = destination.droppableId === 'backlog'
      ? to
      : (source.droppableId === 'backlog' ? from : backlog);

    setSprints(nextSprints);
    setBacklog(nextBacklog);

    // Top-to-bottom order of everything on screen, which is the order we persist.
    const order = [
      ...nextSprints.flatMap(s => (s.issues || []).map(i => ({ issue_key: i.issue_key, sprint_id: s.id }))),
      ...nextBacklog.map(i => ({ issue_key: i.issue_key, sprint_id: null }))
    ];

    try {
      const res = await fetch(`${API_BASE_URL}/sprints/rank`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save the new order');
    } catch (err) {
      Swal.fire('Could not save the new order', err.message, 'error');
      load(); // Put the board back to what the server actually has.
    }
  };

  const toggle = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  // Jira's per-sprint "..." menu.
  const SprintMenu = ({ sprint, index, total }) => {
    const [open, setOpen] = useState(false);
    const [anchorRect, setAnchorRect] = useState(null);
    const actions = [
      { label: 'Move sprint up', hidden: index === 0, run: () => reorderSprint(sprint, 'up') },
      { label: 'Move sprint down', hidden: index === total - 1, run: () => reorderSprint(sprint, 'down') },
      { label: 'Move sprint to top', hidden: index === 0, run: () => reorderSprint(sprint, 'top') },
      { label: 'Move sprint to bottom', hidden: index === total - 1, run: () => reorderSprint(sprint, 'bottom') },
      { label: 'Edit sprint', run: () => setSprintToEdit(sprint) },
      // Imports straight into this sprint rather than the backlog.
      { label: 'Import calendar', run: () => { setImportSprintId(sprint.id); setIsImporting(true); } },
      // Always offered, running or not: deleting only removes the sprint, never the work.
      { label: 'Delete sprint', danger: true, run: () => deleteSprint(sprint) }
    ].filter(a => !a.hidden);

    return (
      <div>
        <button
          onClick={(e) => {
            setAnchorRect(e.currentTarget.getBoundingClientRect());
            setOpen(!open);
          }}
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition"
          title="Sprint actions"
        >
          <MoreHorizontal size={15} />
        </button>
        <AnchoredMenu open={open} anchorRect={anchorRect} width={210} onClose={() => setOpen(false)}>
          {actions.map(a => (
            <div
              key={a.label}
              onClick={() => { setOpen(false); a.run(); }}
              className={`px-3 py-2 hover:bg-gray-50 cursor-pointer ${a.danger ? 'text-red-600' : 'text-gray-700'}`}
            >
              {a.label}
            </div>
          ))}
        </AnchoredMenu>
      </div>
    );
  };

  const CountBadges = ({ counts }) => (
    <div className="flex items-center gap-1">
      <span className="min-w-[22px] text-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700" title="To Do">{counts.todo}</span>
      <span className="min-w-[22px] text-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700" title="In Progress">{counts.inProgress}</span>
      <span className="min-w-[22px] text-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700" title="Done">{counts.done}</span>
    </div>
  );

  // Hiding the tab is not enough — the URL can still be typed.
  if (!canPlanSprints) {
    return (
      <div className="bg-[#f8fafc] min-h-screen font-sans">
        <BoardTabs department={currentDept} spaceName={`${currentDept} Workspace`} />
        <div className="flex flex-col items-center justify-center text-center py-24 px-6">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Lock size={22} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Backlog is managed by your manager</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            Sprint planning is handled by managers. Your assigned work is on the Board.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-gray-400">Loading backlog…</div>;
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans">
      <BoardTabs department={currentDept} spaceName={`${currentDept} Workspace`} />

      <StartSprintModal
        isOpen={!!sprintToStart}
        sprint={sprintToStart}
        itemCount={sprintToStart ? sprintToStart.issues.length : 0}
        onCancel={() => setSprintToStart(null)}
        onStart={handleStartSprint}
      />

      <StartSprintModal
        mode="edit"
        isOpen={!!sprintToEdit}
        sprint={sprintToEdit}
        itemCount={sprintToEdit ? sprintToEdit.issues.length : 0}
        onCancel={() => setSprintToEdit(null)}
        onStart={saveSprintEdits}
      />

      <CreateSprintModal
        isOpen={isCreatingSprint}
        defaultName={`${currentDept} Sprint ${sprints.length + 1}`}
        projects={projects}
        onCancel={() => setIsCreatingSprint(false)}
        onCreate={createSprint}
      />

      <ImportCalendarModal
        isOpen={isImporting}
        department={currentDept}
        sprints={sprints}
        defaultSprintId={importSprintId}
        currentUserName={currentUserName}
        onCancel={() => setIsImporting(false)}
        onImported={(count) => {
          setIsImporting(false);
          load();
          Swal.fire({
            icon: 'success', title: 'Calendar imported',
            text: `${count} work item${count === 1 ? '' : 's'} created.`,
            timer: 2600, showConfirmButton: false
          });
        }}
      />

      <CompleteSprintModal
        isOpen={!!sprintToComplete}
        sprints={sprints}
        initialSprintId={sprintToComplete?.id}
        onCancel={() => setSprintToComplete(null)}
        onComplete={handleCompleteSprint}
      />

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="p-6">

          {/* Sprint sections */}
          {sprints.map((sprint, idx) => {
            const isCollapsed = collapsed[`s${sprint.id}`];
            const dates = formatDate(sprint.start_date) && formatDate(sprint.end_date)
              ? `${formatDate(sprint.start_date)} – ${formatDate(sprint.end_date)}` : null;

            return (
              <div key={sprint.id} className="mb-4 border border-gray-200 rounded-lg bg-white overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border-b border-gray-200">
                  <button onClick={() => toggle(`s${sprint.id}`)} className="text-gray-500 hover:text-gray-800">
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <span className="font-semibold text-sm text-gray-900">{sprint.name}</span>

                  {sprint.status === 'Active' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">ACTIVE</span>
                  )}
                  {dates ? (
                    <button
                      onClick={() => setSprintToEdit(sprint)}
                      className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-blue-600 hover:underline"
                      title="Edit sprint dates"
                    >
                      <Calendar size={11} /> {dates}
                    </button>
                  ) : (
                    <button
                      onClick={() => setSprintToEdit(sprint)}
                      className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      <Calendar size={11} /> Add dates
                    </button>
                  )}
                  <span className="text-[11px] text-gray-500">
                    ({sprint.issues.length} work item{sprint.issues.length === 1 ? '' : 's'})
                  </span>
                  {/* Which project this sprint's work belongs to. */}
                  {/* {sprint.project_id != null && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {projects.find(p => Number(p.id) === Number(sprint.project_id))?.name || `Project #${sprint.project_id}`}
                </span>
              )} */}
                  {sprint.goal && <span className="text-[11px] text-gray-400 italic truncate max-w-[220px]">{sprint.goal}</span>}

                  <div className="ml-auto flex items-center gap-3">
                    <CountBadges counts={sprint.counts} />
                    {sprint.status === 'Active' ? (
                      <button
                        onClick={() => setSprintToComplete(sprint)}
                        className="px-3 py-1 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                      >
                        Complete sprint
                      </button>
                    ) : (
                      <button
                        onClick={() => setSprintToStart(sprint)}
                        className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                      >
                        Start sprint
                      </button>
                    )}
                    <SprintMenu sprint={sprint} index={idx} total={sprints.length} />
                  </div>
                </div>

                {!isCollapsed && (
                  <Droppable droppableId={`sprint-${sprint.id}`}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={snapshot.isDraggingOver ? 'bg-blue-50/60' : ''}
                      >
                        {sprint.issues.map((item, i) => (
                          <WorkItemRow key={item.issue_key} item={item} index={i} sprints={sprints}
                            currentSprintId={sprint.id} users={assignableUsers}
                            currentUserName={currentUserName} isSelected={selectedKey === item.issue_key}
                            onMove={moveItem} onOpen={openIssue} onUpdate={updateItem}
                            onDelete={(item) => deleteItem(item.issue_key)} onCopy={copyToClipboard} />
                        ))}
                        {sprint.issues.length === 0 && (
                          <div className="px-4 py-6 text-center text-xs text-gray-400">
                            Plan this sprint by dragging work items in from the backlog below,
                            or create them here.
                          </div>
                        )}
                        {provided.placeholder}
                        <InlineCreateRow sprintId={sprint.id} onCreate={createWorkItem} />
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            );
          })}

          {/* Backlog section */}
          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border-b border-gray-200">
              <button onClick={() => toggle('backlog')} className="text-gray-500 hover:text-gray-800">
                {collapsed.backlog ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </button>
              <Inbox size={14} className="text-gray-500" />
              <span className="font-semibold text-sm text-gray-900">Backlog</span>
              <span className="text-[11px] text-gray-500">
                ({backlog.length} work item{backlog.length === 1 ? '' : 's'})
              </span>
              <button
                onClick={() => setIsCreatingSprint(true)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition"
              >
                <Plus size={13} /> Create sprint
              </button>
            </div>

            {!collapsed.backlog && (
              <Droppable droppableId="backlog">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={snapshot.isDraggingOver ? 'bg-blue-50/60' : ''}
                  >
                    {backlog.map((item, i) => (
                      <WorkItemRow key={item.issue_key} item={item} index={i} sprints={sprints}
                        currentSprintId={null} users={assignableUsers}
                        currentUserName={currentUserName} isSelected={selectedKey === item.issue_key}
                        onMove={moveItem} onOpen={openIssue} onUpdate={updateItem}
                        onDelete={(item) => deleteItem(item.issue_key)} onCopy={copyToClipboard} />
                    ))}
                    {backlog.length === 0 && (
                      <div className="px-4 py-8 text-center text-xs text-gray-400">Your backlog is empty.</div>
                    )}
                    {provided.placeholder}
                    <InlineCreateRow sprintId={null} onCreate={createWorkItem} />
                  </div>
                )}
              </Droppable>
            )}
          </div>
        </div>
      </DragDropContext>

      {/* The board's work item panel, opened straight from a backlog row. */}
      <ITIssueDetailsPanel
        issue={selectedIssue}
        updateIssue={updateItem}
        deleteIssue={deleteItem}
        onClose={() => setSelectedKey(null)}
        onIssueCreated={load}
      />
    </div>
  );
};

export default BacklogPage;

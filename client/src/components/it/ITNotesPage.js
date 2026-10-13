import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import {
  Search, Plus, Pin, X, FileText, Link2, KeyRound, FileArchive, FolderOpen, Trash2, RotateCcw,
  Eye, EyeOff, Copy, ExternalLink, Loader2, Pencil, Paperclip, Layers, User, ChevronDown,
  Lock, Users, ShieldCheck, Download, History, Wand2, Building2, UserCheck, Check, Sparkles
} from 'lucide-react';
import { API_BASE_URL } from '../../config/environment';
import { useAuth } from '../../hooks/useAuth';
import { uploadDescriptionFile, toAbsoluteFileUrl, formatFileSize } from '../../utils/descriptionFiles';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

/**
 * Notes & Wiki: the team's knowledge base. Notes, links, logins/passwords and documents,
 * each optionally tied to a project, plus a read-only view of files already uploaded to
 * projects and tickets. Passwords are stored encrypted and fetched only on Reveal / Copy.
 */

const DEPARTMENTS_LIST = [
  'All Departments',
  'IT Department',
  'Marketing Department',
  'Sales Department',
  'HR Department',
  'SEO & GMB Department'
];

const TYPE_META = {
  note: { label: 'Note', plural: 'Notes', icon: FileText, tone: 'bg-emerald-50 text-emerald-700' },
  link: { label: 'Link', plural: 'Links', icon: Link2, tone: 'bg-blue-50 text-blue-700' },
  credential: { label: 'Password / login', plural: 'Passwords & logins', icon: KeyRound, tone: 'bg-amber-50 text-amber-800' },
  document: { label: 'Document', plural: 'Documents', icon: FileArchive, tone: 'bg-violet-50 text-violet-700' }
};
const VIS_META = {
  team: { label: 'Everyone in company', short: 'All Team', desc: 'Accessible to all employees in every department', icon: Users, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  department: { label: 'Department members only', short: 'Department', desc: 'Accessible only to people in the selected department & managers', icon: Building2, tone: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  managers: { label: 'Managers & Admins only', short: 'Managers', desc: 'Restricted to administrators, HR and managers', icon: ShieldCheck, tone: 'bg-purple-50 text-purple-700 border-purple-200' },
  specific: { label: 'Specific people (given access)', short: 'Specific', desc: 'Restricted to particular colleagues you choose', icon: UserCheck, tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  private: { label: 'Only me (Private)', short: 'Private', desc: 'Visible and editable only by you', icon: Lock, tone: 'bg-gray-100 text-gray-700 border-gray-200' }
};
const VIEWS = [
  { key: 'all', label: 'All items', icon: Layers },
  { key: 'pinned', label: 'Pinned', icon: Pin },
  { key: 'mine', label: 'Created by me', icon: User },
  { key: 'trash', label: 'Trash', icon: Trash2 }
];

const api = async (path, opts = {}) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...opts,
    headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};

const fmtWhen = (v) => (v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtDay = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const hostOf = (u) => { try { return new URL(u).host.replace(/^www\./, ''); } catch (e) { return u; } };
const copyText = async (text, label) => {
  try { await navigator.clipboard.writeText(text); showSuccessToast(`${label} copied`); } catch (e) { showErrorToast('Could not copy'); }
};
const randomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_';
  const arr = new Uint32Array(16);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, n => chars[n % chars.length]).join('');
};

// Plain text with clickable links, line breaks kept.
const Linkified = ({ text }) => {
  const parts = String(text || '').split(/(https?:\/\/[^\s<]+)/g);
  return (
    <div className="whitespace-pre-wrap break-words text-[13px] text-gray-800 leading-relaxed">
      {parts.map((p, i) => (/^https?:\/\//.test(p)
        ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline break-all">{p}</a>
        : <React.Fragment key={i}>{p}</React.Fragment>))}
    </div>
  );
};

const TypeIcon = ({ type, size = 15, box = 'w-8 h-8' }) => {
  const m = TYPE_META[type] || TYPE_META.note;
  const Icon = m.icon;
  return <span className={`${box} rounded flex items-center justify-center shrink-0 ${m.tone}`}><Icon size={size} /></span>;
};

const FileTiles = ({ files, onRemove }) => (
  <div className="flex flex-wrap gap-2">
    {files.map((f, i) => {
      const href = toAbsoluteFileUrl(f.url);
      return (
        <div key={`${f.url}-${i}`} className="relative group w-32">
          <a href={href} target="_blank" rel="noopener noreferrer" title={f.name}
            className="block h-20 w-32 rounded border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center hover:border-blue-300">
            {f.isImage ? <img src={href} alt={f.name} className="h-full w-full object-cover" /> : <FileArchive size={22} className="text-gray-400" />}
          </a>
          <div className="text-[11px] text-gray-700 truncate mt-0.5" title={f.name}>{f.name}</div>
          {f.size ? <div className="text-[10px] text-gray-400">{formatFileSize(f.size)}</div> : null}
          {onRemove && (
            <button type="button" onClick={() => onRemove(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-500 hover:text-red-600 flex items-center justify-center cursor-pointer" aria-label="Remove file"><X size={11} /></button>
          )}
        </div>
      );
    })}
  </div>
);

// ── Password field shown in the details view ─────────────────────────────
function SecretRow({ item }) {
  const [secret, setSecret] = useState(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { setSecret(null); }, [item.id]);

  const fetchSecret = async (action) => {
    setBusy(true);
    try {
      const d = await api(`/kb/items/${item.id}/reveal`, { method: 'POST', body: { action } });
      return d.secret;
    } catch (e) { showErrorToast(e.message); return null; } finally { setBusy(false); }
  };
  const reveal = async () => {
    if (secret != null) { setSecret(null); return; }
    const s = await fetchSecret('reveal');
    if (s == null) return;
    setSecret(s);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSecret(null), 30000); // hide again after 30 s
  };
  const copy = async () => {
    const s = secret ?? await fetchSecret('copy');
    if (s != null) copyText(s, 'Password');
  };

  if (!item.hasSecret) return <span className="text-gray-400 text-[13px]">Not saved</span>;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <code className="flex-1 min-w-0 truncate text-[13px] bg-gray-50 border border-gray-200 rounded px-2 py-1 font-mono">{secret != null ? secret : '••••••••••••'}</code>
      <button onClick={reveal} disabled={busy} className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 cursor-pointer" title={secret != null ? 'Hide' : 'Reveal (logged)'}>
        {busy ? <Loader2 size={13} className="animate-spin" /> : secret != null ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
      <button onClick={copy} disabled={busy} className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 cursor-pointer" title="Copy password (logged)"><Copy size={13} /></button>
    </div>
  );
}

const CopyField = ({ value, label, href }) => (
  <div className="flex items-center gap-2 min-w-0">
    {href
      ? <a href={href} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate text-[13px] text-blue-700 hover:underline">{value}</a>
      : <span className="flex-1 min-w-0 truncate text-[13px] text-gray-900">{value}</span>}
    <button onClick={() => copyText(value, label)} className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 cursor-pointer" title={`Copy ${label.toLowerCase()}`}><Copy size={13} /></button>
  </div>
);

// ── Create / edit form ───────────────────────────────────────────────────
function ItemForm({ initial, projects, categories, allUsers = [], defaultDepartment = 'All Departments', onSaved, onCancel }) {
  const isNew = !initial.id;
  const [f, setF] = useState(() => ({
    type: initial.type || 'note', title: initial.title || '', body: initial.body || '', url: initial.url || '',
    username: initial.username || '', email: initial.email || '', secret: '', projectId: initial.projectId || '',
    department: initial.department || defaultDepartment || 'All Departments',
    category: initial.category || '', tags: (initial.tags || []).join(', '), files: initial.files || [],
    visibility: initial.visibility || (initial.type === 'credential' ? 'managers' : 'team'),
    sharedWith: Array.isArray(initial.sharedWith) ? initial.sharedWith : [],
    pinned: Boolean(initial.pinned)
  }));
  const [userSearch, setUserSearch] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef(null);
  const set = (k, v) => { setF(prev => ({ ...prev, [k]: v })); setError(''); };

  const toggleSharedUser = (user) => {
    setF(prev => {
      const exists = (prev.sharedWith || []).some(u => String(u.id) === String(user.id));
      const nextShared = exists
        ? prev.sharedWith.filter(u => String(u.id) !== String(user.id))
        : [...(prev.sharedWith || []), {
            id: user.id,
            name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
            email: user.email || '',
            department: user.department || ''
          }];
      return { ...prev, sharedWith: nextShared };
    });
  };

  const removeSharedUser = (userId) => {
    setF(prev => ({
      ...prev,
      sharedWith: (prev.sharedWith || []).filter(u => String(u.id) !== String(userId))
    }));
  };

  const addFiles = async (list) => {
    for (const file of Array.from(list || [])) {
      setUploading(n => n + 1);
      try {
        const saved = await uploadDescriptionFile(file, { project_id: f.projectId || undefined });
        setF(prev => ({ ...prev, files: [...prev.files, { name: saved.name, url: saved.filePath || saved.url, size: saved.sizeBytes, mime: saved.mimeType, isImage: saved.isImage }] }));
      } catch (e) {
        setError(e.message);
      } finally {
        setUploading(n => n - 1);
      }
    }
  };

  const save = async () => {
    if (!f.title.trim()) { setError('Give it a title.'); return; }
    if (f.type === 'link' && !f.url.trim()) { setError('Enter the link.'); return; }
    if (f.type === 'document' && f.files.length === 0 && !f.url.trim()) { setError('Upload a file or add a link to the document.'); return; }
    setSaving(true);
    try {
      const body = {
        type: f.type, title: f.title, body: f.body, url: f.url, username: f.username, email: f.email,
        projectId: f.projectId || null, department: f.department || 'All Departments', category: f.category,
        tags: f.tags, files: f.files, visibility: f.visibility,
        sharedWith: f.visibility === 'specific' ? f.sharedWith : [], pinned: f.pinned
      };
      // An empty password field when editing keeps the saved password.
      if (f.secret || isNew) body.secret = f.secret;
      const d = isNew ? await api('/kb/items', { method: 'POST', body }) : await api(`/kb/items/${initial.id}`, { method: 'PUT', body });
      showSuccessToast(isNew ? 'Saved' : 'Changes saved');
      onSaved(d.item);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const label = 'block text-xs font-semibold text-gray-700 mb-1';
  const input = 'w-full h-9 text-[13px] border border-gray-300 rounded px-2.5 outline-none focus:border-blue-500 bg-white';

  const filteredUsers = allUsers.filter(u => {
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    return (u.name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.department || '').toLowerCase().includes(term);
  });

  return (
    <div className="space-y-4" onPaste={e => { const files = Array.from(e.clipboardData?.files || []); if (files.length) { e.preventDefault(); addFiles(files); } }}>
      {isNew && (
        <div className="grid grid-cols-4 gap-1.5">
          {Object.entries(TYPE_META).map(([k, m]) => {
            const Icon = m.icon;
            return (
              <button key={k} type="button" onClick={() => setF(prev => ({ ...prev, type: k, visibility: k === 'credential' && prev.visibility === 'team' ? 'managers' : prev.visibility }))}
                className={`flex flex-col items-center gap-1 py-2 rounded border text-[11px] font-medium cursor-pointer ${f.type === k ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                <Icon size={15} /> {m.label}
              </button>
            );
          })}
        </div>
      )}

      <div>
        <label className={label}>Title <span className="text-red-600">*</span></label>
        <input autoFocus value={f.title} onChange={e => set('title', e.target.value)} className={input}
          placeholder={f.type === 'credential' ? 'e.g. Bakul Caterings – GMB account' : f.type === 'link' ? 'e.g. Brand guidelines (Drive)' : f.type === 'document' ? 'e.g. Signed proposal' : 'e.g. How we publish GMB posts'} />
      </div>

      {(f.type === 'link' || f.type === 'credential' || f.type === 'document') && (
        <div>
          <label className={label}>{f.type === 'credential' ? 'Login page / website' : 'Link'} {f.type === 'link' && <span className="text-red-600">*</span>}</label>
          <input value={f.url} onChange={e => set('url', e.target.value)} className={input} placeholder="https://…" />
        </div>
      )}

      {f.type === 'credential' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Username</label>
              <input value={f.username} onChange={e => set('username', e.target.value)} className={input} autoComplete="off" />
            </div>
            <div>
              <label className={label}>Email</label>
              <input type="email" value={f.email} onChange={e => set('email', e.target.value)} className={input} autoComplete="off" />
            </div>
          </div>
          <div>
            <label className={label}>Password</label>
            <div className="flex gap-2">
              <input type={showSecret ? 'text' : 'password'} value={f.secret} onChange={e => set('secret', e.target.value)} className={`${input} font-mono`} autoComplete="new-password"
                placeholder={!isNew && initial.hasSecret ? 'Leave empty to keep the saved password' : ''} />
              <button type="button" onClick={() => setShowSecret(s => !s)} className="h-9 w-9 shrink-0 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 cursor-pointer" title={showSecret ? 'Hide' : 'Show'}>{showSecret ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              <button type="button" onClick={() => { set('secret', randomPassword()); setShowSecret(true); }} className="h-9 px-2.5 shrink-0 flex items-center gap-1 rounded border border-gray-300 hover:bg-gray-50 text-xs cursor-pointer" title="Generate a strong password"><Wand2 size={13} /> Generate</button>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Stored encrypted. Every reveal or copy is logged.</p>
          </div>
        </>
      )}

      <div>
        <label className={label}>{f.type === 'note' ? 'Content' : 'Notes'}</label>
        <textarea value={f.body} onChange={e => set('body', e.target.value)} rows={f.type === 'note' ? 12 : 4}
          className="w-full text-[13px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500 resize-y bg-white leading-relaxed"
          placeholder={f.type === 'credential' ? 'e.g. 2-step code goes to the client’s phone; recovery email…' : 'Write here. Links are clickable.'} />
      </div>

      <div>
        <label className={label}>{f.type === 'document' ? <>Files <span className="text-red-600">*</span></> : 'Attachments'}</label>
        <button type="button" onClick={() => fileInput.current?.click()}
          onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          className="w-full border-2 border-dashed border-gray-300 rounded p-3 text-xs text-gray-500 hover:border-blue-400 hover:bg-blue-50/30 flex items-center justify-center gap-2 cursor-pointer">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
          {uploading ? `Uploading ${uploading}…` : 'Click to choose, drag files here, or paste a screenshot'}
        </button>
        <input ref={fileInput} type="file" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        {f.files.length > 0 && <div className="mt-2"><FileTiles files={f.files} onRemove={(i) => setF(prev => ({ ...prev, files: prev.files.filter((_, j) => j !== i) }))} /></div>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Department</label>
          <select value={f.department || 'All Departments'} onChange={e => set('department', e.target.value)} className={input}>
            {DEPARTMENTS_LIST.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Project</label>
          <select value={f.projectId || ''} onChange={e => set('projectId', e.target.value)} className={input}>
            <option value="">No project (general)</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name || p.title}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Category</label>
          <input value={f.category} onChange={e => set('category', e.target.value)} list="kb-categories" className={input} placeholder="e.g. Process, Client access" />
          <datalist id="kb-categories">{categories.map(c => <option key={c.name} value={c.name} />)}</datalist>
        </div>
        <div>
          <label className={label}>Tags</label>
          <input value={f.tags} onChange={e => set('tags', e.target.value)} className={input} placeholder="gmb, seo, hosting" />
        </div>
      </div>

      <div>
        <label className={label}>Access & Visibility</label>
        <select value={f.visibility} onChange={e => set('visibility', e.target.value)} className={input}>
          {Object.entries(VIS_META).map(([k, m]) => <option key={k} value={k}>{m.label} – {m.desc}</option>)}
        </select>
        <p className="text-[11px] text-gray-500 mt-1">{VIS_META[f.visibility]?.desc}</p>
      </div>

      {f.visibility === 'specific' && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
              <UserCheck size={14} className="text-amber-700" />
              Particular Colleagues Granted Access ({f.sharedWith?.length || 0})
            </label>
            <span className="text-[10px] text-amber-700">Author & managers always have access</span>
          </div>

          {f.sharedWith?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white border border-amber-200 rounded">
              {f.sharedWith.map(u => (
                <span key={u.id} className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-medium">
                  <span>{u.name || u.email}</span>
                  <button type="button" onClick={() => removeSharedUser(u.id)} className="text-amber-700 hover:text-amber-950 cursor-pointer" title="Remove">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search colleagues to give access..."
              className="w-full h-8 pl-8 pr-2.5 text-xs border border-gray-300 rounded bg-white outline-none focus:border-amber-500"
            />
          </div>

          <div className="max-h-36 overflow-y-auto border border-gray-200 rounded bg-white divide-y divide-gray-100 text-xs">
            {filteredUsers.length === 0 ? (
              <div className="p-2 text-center text-gray-400">No colleagues found</div>
            ) : (
              filteredUsers.slice(0, 30).map(u => {
                const isSelected = f.sharedWith?.some(s => String(s.id) === String(u.id));
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleSharedUser(u)}
                    className={`w-full flex items-center justify-between p-2 text-left cursor-pointer transition-colors ${isSelected ? 'bg-amber-50 text-amber-900 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isSelected ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {(u.name || u.first_name || 'U').charAt(0).toUpperCase()}
                      </span>
                      <div className="truncate">
                        <div className="truncate font-medium">{u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}</div>
                        <div className="text-[10px] text-gray-400 truncate">{u.email} {u.department ? `· ${u.department}` : ''}</div>
                      </div>
                    </div>
                    {isSelected ? <Check size={14} className="text-amber-600 shrink-0" /> : <Plus size={13} className="text-gray-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
        <input type="checkbox" checked={f.pinned} onChange={e => set('pinned', e.target.checked)} /> Pin to the top
      </label>

      {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5">{error}</div>}

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} disabled={saving} className="h-9 px-4 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer">Cancel</button>
        <button onClick={save} disabled={saving || uploading > 0} className="h-9 px-4 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer">
          {saving && <Loader2 size={14} className="animate-spin" />} {isNew ? 'Save' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

// ── Details view ─────────────────────────────────────────────────────────
function ItemDetails({ item, onEdit, onChanged, isTrash }) {
  const [log, setLog] = useState(null);
  useEffect(() => { setLog(null); }, [item.id]);
  const Vis = VIS_META[item.visibility] || VIS_META.team;
  const VisIcon = Vis.icon;

  const togglePin = async () => {
    try { const d = await api(`/kb/items/${item.id}`, { method: 'PUT', body: { pinned: !item.pinned } }); onChanged(d.item); } catch (e) { showErrorToast(e.message); }
  };
  const trash = async () => {
    const ok = await Swal.fire({ icon: 'warning', title: 'Move to Trash?', text: 'You can restore it from Trash.', showCancelButton: true, confirmButtonText: 'Move to Trash', confirmButtonColor: '#dc2626' });
    if (!ok.isConfirmed) return;
    try { await api(`/kb/items/${item.id}`, { method: 'DELETE' }); showSuccessToast('Moved to Trash'); onChanged(null); } catch (e) { showErrorToast(e.message); }
  };
  const restore = async () => {
    try { await api(`/kb/items/${item.id}/restore`, { method: 'POST' }); showSuccessToast('Restored'); onChanged(null); } catch (e) { showErrorToast(e.message); }
  };
  const destroy = async () => {
    const ok = await Swal.fire({ icon: 'warning', title: 'Delete for good?', text: 'This cannot be undone.', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#dc2626' });
    if (!ok.isConfirmed) return;
    try { await api(`/kb/items/${item.id}?permanent=1`, { method: 'DELETE' }); showSuccessToast('Deleted'); onChanged(null); } catch (e) { showErrorToast(e.message); }
  };
  const loadLog = async () => {
    try { const d = await api(`/kb/items/${item.id}/access-log`); setLog(d.log); } catch (e) { showErrorToast(e.message); }
  };

  const row = 'grid grid-cols-[110px_1fr] items-center gap-2 py-1.5';
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <TypeIcon type={item.type} size={18} box="w-10 h-10" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-semibold text-gray-900 leading-snug break-words">{item.title}</h2>
          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-gray-500">
            <span>{TYPE_META[item.type]?.label}</span>
            <span>·</span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">
              <Building2 size={11} /> {item.department || 'All Departments'}
            </span>
            {item.project && <><span>·</span><span className="flex items-center gap-1"><FolderOpen size={11} /> {item.project}</span></>}
            <span>·</span>
            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${Vis.tone || 'text-gray-600'}`}>
              <VisIcon size={11} /> {Vis.label}
            </span>
          </div>
        </div>
      </div>

      {item.visibility === 'specific' && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3">
          <div className="text-xs font-semibold text-amber-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <UserCheck size={14} className="text-amber-700" /> Particular People With Access ({item.sharedWith?.length || 0})
            </span>
            <span className="text-[10px] text-amber-700/90 font-normal">Author & managers also have access</span>
          </div>
          {(!item.sharedWith || item.sharedWith.length === 0) ? (
            <div className="text-xs text-amber-800 mt-1">No particular users designated yet. Only author and managers can access.</div>
          ) : (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {item.sharedWith.map(u => (
                <span key={u.id || u.email} className="inline-flex items-center gap-1.5 text-xs bg-white border border-amber-200 px-2.5 py-1 rounded-full text-gray-800 shadow-xs">
                  <User size={12} className="text-amber-600" />
                  <span className="font-medium">{u.name || u.email}</span>
                  {u.department && <span className="text-[10px] text-gray-400">· {u.department}</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {item.visibility === 'department' && (
        <div className="bg-indigo-50/60 border border-indigo-200/70 rounded-lg p-2.5 text-xs text-indigo-900 flex items-center gap-2">
          <Building2 size={14} className="text-indigo-600 shrink-0" />
          <span>Restricted to members of <strong>{item.department || 'the specified department'}</strong> and management.</span>
        </div>
      )}

      {!isTrash && item.canEdit && (
        <div className="flex flex-wrap gap-2">
          <button onClick={onEdit} className="h-8 px-3 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-1.5 cursor-pointer"><Pencil size={13} /> Edit</button>
          <button onClick={togglePin} className="h-8 px-3 text-xs rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"><Pin size={13} className={item.pinned ? 'fill-current' : ''} /> {item.pinned ? 'Unpin' : 'Pin'}</button>
          {item.type === 'credential' && <button onClick={loadLog} className="h-8 px-3 text-xs rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"><History size={13} /> Who viewed</button>}
          <button onClick={trash} className="h-8 px-3 text-xs rounded border border-gray-300 hover:bg-red-50 hover:text-red-700 flex items-center gap-1.5 cursor-pointer ml-auto"><Trash2 size={13} /> Trash</button>
        </div>
      )}
      {isTrash && item.canEdit && (
        <div className="flex gap-2">
          <button onClick={restore} className="h-8 px-3 text-xs font-medium rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"><RotateCcw size={13} /> Restore</button>
          <button onClick={destroy} className="h-8 px-3 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50 flex items-center gap-1.5 cursor-pointer"><Trash2 size={13} /> Delete for good</button>
        </div>
      )}

      {(item.url || item.type === 'credential') && (
        <div className="border border-gray-200 rounded px-3 py-1 divide-y divide-gray-100">
          {item.url && <div className={row}><span className="text-xs text-gray-500">{item.type === 'credential' ? 'Website' : 'Link'}</span><CopyField value={item.url} label="Link" href={item.url} /></div>}
          {item.type === 'credential' && (
            <>
              {item.username && <div className={row}><span className="text-xs text-gray-500">Username</span><CopyField value={item.username} label="Username" /></div>}
              {item.email && <div className={row}><span className="text-xs text-gray-500">Email</span><CopyField value={item.email} label="Email" /></div>}
              <div className={row}><span className="text-xs text-gray-500">Password</span><SecretRow item={item} /></div>
            </>
          )}
        </div>
      )}

      {item.body && <div><div className="text-xs font-semibold text-gray-700 mb-1.5">{item.type === 'note' ? 'Content' : 'Notes'}</div><Linkified text={item.body} /></div>}

      {item.files?.length > 0 && <div><div className="text-xs font-semibold text-gray-700 mb-1.5">Files ({item.files.length})</div><FileTiles files={item.files} /></div>}

      {(item.category || item.tags?.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {item.category && <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">{item.category}</span>}
          {item.tags.map(t => <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">#{t}</span>)}
        </div>
      )}

      <div className="text-[11px] text-gray-500 space-y-0.5 border-t border-gray-100 pt-3">
        <div>Created by <strong className="text-gray-700">{item.createdBy || '—'}</strong> · {fmtWhen(item.createdAt)}</div>
        <div>Last updated by <strong className="text-gray-700">{item.updatedBy || '—'}</strong> · {fmtWhen(item.updatedAt)}</div>
      </div>

      {log && (
        <div className="border-t border-gray-100 pt-3">
          <div className="text-xs font-semibold text-gray-700 mb-1.5">Password access</div>
          {log.length === 0 ? <div className="text-xs text-gray-500">Nobody has viewed it yet.</div> : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {log.map((l, i) => <div key={i} className="text-xs text-gray-700 flex justify-between gap-2"><span>{l.user_name || 'Someone'} · {l.action}</span><span className="text-gray-400">{fmtWhen(l.at)}</span></div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function ITNotesPage() {
  const { user: currentUser } = useAuth();
  const [view, setView] = useState('all');
  const [type, setType] = useState('');          // note | link | credential | document | files
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [projectId, setProjectId] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [files, setFiles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [panel, setPanel] = useState(null);       // { mode: 'view' | 'edit' | 'new', item }
  const [newMenu, setNewMenu] = useState(false);

  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/projects`).then(r => r.json())
      .then(d => setProjects((Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []).filter(p => p.name || p.title).sort((a, b) => String(a.name || a.title).localeCompare(String(b.name || b.title)))))
      .catch(() => { });
    fetch(`${API_BASE_URL}/users?limit=300&excludeSystem=true`).then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
        setAllUsers(list.map(u => ({
          id: u.id,
          name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || 'User',
          email: u.email || '',
          department: u.department || '',
          role: u.role_name || u.role || ''
        })));
      })
      .catch(() => { });
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (type === 'files') {
        const p = new URLSearchParams(); if (projectId) p.set('project_id', projectId); if (q) p.set('q', q);
        setFiles(await api(`/kb/project-files?${p}`));
        // Keep the sidebar counts fresh too.
        if (!data) setData(await api('/kb/items'));
      } else {
        const p = new URLSearchParams({ view });
        if (type) p.set('type', type);
        if (departmentFilter) p.set('department', departmentFilter);
        if (projectId) p.set('project_id', projectId);
        if (category) p.set('category', category);
        if (tag) p.set('tag', tag);
        if (q) p.set('q', q);
        setData(await api(`/kb/items?${p}`));
      }
    } catch (e) { setError(e.message); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, type, departmentFilter, projectId, category, tag, q]);

  useEffect(() => { load(); }, [load]);

  const items = useMemo(() => data?.items || [], [data]);
  const counts = data?.counts;
  const selectedId = panel?.item?.id;

  const openNew = (t) => {
    setNewMenu(false);
    setPanel({
      mode: 'new',
      item: {
        type: t,
        projectId: projectId || '',
        department: departmentFilter || currentUser?.department || 'All Departments'
      }
    });
  };
  const afterSave = (item) => { setPanel(item ? { mode: 'view', item } : null); load(); };
  const resetFilters = () => { setView('all'); setType(''); setDepartmentFilter(''); setProjectId(''); setCategory(''); setTag(''); setSearch(''); };

  const navBtn = (active) => `w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-[13px] cursor-pointer ${active ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`;
  const projectName = projects.find(p => String(p.id) === String(projectId))?.name || data?.projects?.find(p => String(p.id) === String(projectId))?.name;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#f8fafc] font-sans text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[240px] shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-3 border-b border-gray-100 relative">
          <button onClick={() => setNewMenu(m => !m)} className="w-full h-9 flex items-center justify-center gap-1.5 rounded bg-red-600 text-white text-[13px] font-medium hover:bg-red-700 cursor-pointer">
            <Plus size={15} /> New <ChevronDown size={13} />
          </button>
          {newMenu && (
            <div className="absolute left-3 right-3 top-[52px] z-30 bg-white border border-gray-200 rounded shadow-xl py-1">
              {Object.entries(TYPE_META).map(([k, m]) => {
                const Icon = m.icon;
                return <button key={k} onClick={() => openNew(k)} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 cursor-pointer"><Icon size={14} /> {m.label}</button>;
              })}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          <div className="space-y-0.5">
            {VIEWS.map(v => {
              const Icon = v.icon;
              const n = v.key === 'all' ? counts?.all : v.key === 'pinned' ? counts?.pinned : v.key === 'mine' ? counts?.mine : null;
              return (
                <button key={v.key} onClick={() => { setView(v.key); if (type === 'files') setType(''); }} className={navBtn(view === v.key && type !== 'files' && !type && !departmentFilter && !projectId && !category && !tag)}>
                  <span className="flex items-center gap-2"><Icon size={14} /> {v.label}</span>{n != null && <span className="text-[11px] text-gray-400">{n}</span>}
                </button>
              );
            })}
          </div>

          <div>
            <div className="px-2.5 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Departments</div>
            <button
              onClick={() => setDepartmentFilter('')}
              className={navBtn(!departmentFilter && view !== 'trash' && type !== 'files' && !type && !projectId && !category && !tag)}
            >
              <span className="flex items-center gap-2"><Layers size={14} /> All Departments</span>
              <span className="text-[11px] text-gray-400">{counts?.all ?? ''}</span>
            </button>
            {DEPARTMENTS_LIST.filter(d => d !== 'All Departments').map(d => {
              const count = data?.departments?.find(x => x.name === d)?.count ?? 0;
              const short = d.replace(/\s*Department\s*$/i, '');
              return (
                <button key={d} onClick={() => setDepartmentFilter(departmentFilter === d ? '' : d)} className={navBtn(departmentFilter === d)}>
                  <span className="truncate flex items-center gap-2"><Building2 size={13} /> {short}</span>
                  {count > 0 && <span className="text-[11px] text-gray-400 shrink-0">{count}</span>}
                </button>
              );
            })}
          </div>

          <div>
            <div className="px-2.5 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Type</div>
            {Object.entries(TYPE_META).map(([k, m]) => {
              const Icon = m.icon;
              return (
                <button key={k} onClick={() => { setType(type === k ? '' : k); if (view === 'trash') setView('all'); }} className={navBtn(type === k)}>
                  <span className="flex items-center gap-2"><Icon size={14} /> {m.plural}</span><span className="text-[11px] text-gray-400">{counts?.byType?.[k] ?? ''}</span>
                </button>
              );
            })}
            <button onClick={() => { setType(type === 'files' ? '' : 'files'); setView('all'); }} className={navBtn(type === 'files')}>
              <span className="flex items-center gap-2"><FolderOpen size={14} /> Project files</span><span className="text-[11px] text-gray-400">{files?.total ?? ''}</span>
            </button>
          </div>
          {data?.projects?.length > 0 && (
            <div>
              <div className="px-2.5 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Projects</div>
              {data.projects.map(p => (
                <button key={p.id} onClick={() => setProjectId(String(projectId) === String(p.id) ? '' : String(p.id))} className={navBtn(String(projectId) === String(p.id))}>
                  <span className="truncate">{p.name}</span><span className="text-[11px] text-gray-400 shrink-0">{p.count}</span>
                </button>
              ))}
            </div>
          )}
          {data?.categories?.length > 0 && (
            <div>
              <div className="px-2.5 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Categories</div>
              {data.categories.map(c => (
                <button key={c.name} onClick={() => setCategory(category === c.name ? '' : c.name)} className={navBtn(category === c.name)}>
                  <span className="truncate">{c.name}</span><span className="text-[11px] text-gray-400 shrink-0">{c.count}</span>
                </button>
              ))}
            </div>
          )}
          {data?.tags?.length > 0 && (
            <div>
              <div className="px-2.5 pb-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Tags</div>
              <div className="px-2 flex flex-wrap gap-1">
                {data.tags.slice(0, 30).map(t => (
                  <button key={t.name} onClick={() => setTag(tag === t.name ? '' : t.name)}
                    className={`text-[11px] px-2 py-0.5 rounded-full cursor-pointer ${tag === t.name ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-50'}`}>#{t.name}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col" onClick={() => newMenu && setNewMenu(false)}>
        <div className="px-6 pt-5 pb-3 bg-white border-b border-gray-200">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[20px] font-semibold">Notes & Wiki</h1>
              <p className="text-[12px] text-gray-500 mt-0.5">Notes, links, logins and documents for each department and project, properly structured with granular access control.</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={type === 'files' ? 'Search files, projects, tickets…' : 'Search titles, content, links, usernames, tags…'}
                className="w-full h-9 pl-9 pr-8 text-[13px] border border-gray-300 rounded outline-none focus:border-blue-500" />
              {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Clear"><X size={14} /></button>}
            </div>
          </div>
          {(type || departmentFilter || projectId || category || tag || view !== 'all') && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3 text-[12px]">
              <span className="text-gray-500">Showing:</span>
              {view !== 'all' && <span className="px-2 py-0.5 rounded bg-gray-100">{VIEWS.find(v => v.key === view)?.label}</span>}
              {departmentFilter && <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium flex items-center gap-1"><Building2 size={11} /> {departmentFilter}</span>}
              {type && <span className="px-2 py-0.5 rounded bg-gray-100">{type === 'files' ? 'Project files' : TYPE_META[type].plural}</span>}
              {projectId && <span className="px-2 py-0.5 rounded bg-gray-100">{projectName || 'Project'}</span>}
              {category && <span className="px-2 py-0.5 rounded bg-gray-100">{category}</span>}
              {tag && <span className="px-2 py-0.5 rounded bg-gray-100">#{tag}</span>}
              <button onClick={resetFilters} className="text-blue-600 hover:underline cursor-pointer ml-1">Clear</button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div>}
          {loading && !data && !files && <div className="py-20 flex items-center justify-center gap-2 text-sm text-gray-400"><Loader2 size={15} className="animate-spin" /> Loading…</div>}

          {type === 'files' ? (
            files && (files.files.length === 0
              ? <div className="py-16 text-center text-sm text-gray-500 bg-white border border-gray-200 rounded">No files found.</div>
              : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                  {files.files.map(f => {
                    const href = toAbsoluteFileUrl(f.url);
                    return (
                      <div key={f.id} className="bg-white border border-gray-200 rounded overflow-hidden flex flex-col">
                        <a href={href} target="_blank" rel="noopener noreferrer" className="h-32 bg-gray-50 flex items-center justify-center border-b border-gray-100">
                          {f.isImage ? <img src={href} alt={f.name} className="h-full w-full object-cover" loading="lazy" /> : <FileArchive size={28} className="text-gray-400" />}
                        </a>
                        <div className="p-2.5 flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-gray-900 truncate" title={f.name}>{f.name}</div>
                          <div className="text-[11px] text-gray-500 truncate">{f.project || 'No project'}{f.issueKey ? ` · ${f.issueKey}` : ''}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">{f.source} · {fmtDay(f.at)}{f.size ? ` · ${formatFileSize(f.size)}` : f.sizeText ? ` · ${f.sizeText}` : ''}</div>
                        </div>
                        <div className="px-2.5 pb-2.5 flex gap-1.5">
                          <a href={href} target="_blank" rel="noopener noreferrer" className="flex-1 h-7 text-[12px] rounded border border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-1"><ExternalLink size={12} /> Open</a>
                          <a href={href} download={f.name} className="flex-1 h-7 text-[12px] rounded border border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-1"><Download size={12} /> Download</a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
          ) : data && (items.length === 0 ? (
            <div className="py-16 text-center bg-white border border-gray-200 rounded">
              <div className="text-sm text-gray-600">{view === 'trash' ? 'Trash is empty.' : q || type || departmentFilter || projectId || category || tag ? 'Nothing matches these filters.' : 'Nothing saved yet.'}</div>
              {view !== 'trash' && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {Object.entries(TYPE_META).map(([k, m]) => {
                    const Icon = m.icon;
                    return <button key={k} onClick={() => openNew(k)} className="h-8 px-3 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"><Icon size={13} /> New {m.label.toLowerCase()}</button>;
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className={`bg-white border border-gray-200 rounded divide-y divide-gray-100 ${loading ? 'opacity-60' : ''}`}>
              {items.map(it => {
                const Vis = VIS_META[it.visibility] || VIS_META.team;
                const VisIcon = Vis.icon;
                const sub = it.type === 'link' ? hostOf(it.url)
                  : it.type === 'credential' ? [it.username, it.email, it.url && hostOf(it.url)].filter(Boolean).join(' · ') || 'Login'
                    : it.type === 'document' ? `${it.files.length} file${it.files.length === 1 ? '' : 's'}${it.url ? ` · ${hostOf(it.url)}` : ''}`
                      : String(it.body || '').replace(/\s+/g, ' ').slice(0, 140);
                return (
                  <div key={it.id} onClick={() => setPanel({ mode: 'view', item: it })}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${selectedId === it.id ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}>
                    <TypeIcon type={it.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium text-gray-900 truncate">{it.title}</span>
                        {it.pinned && <Pin size={12} className="text-red-500 fill-red-500 shrink-0" />}
                        {it.files?.length > 0 && it.type !== 'document' && <Paperclip size={12} className="text-gray-400 shrink-0" />}
                        {it.department && it.department !== 'All Departments' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 font-medium shrink-0 flex items-center gap-0.5">
                            <Building2 size={9} /> {it.department.replace(/\s*Department\s*$/i, '')}
                          </span>
                        )}
                        {it.visibility === 'specific' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium shrink-0 flex items-center gap-0.5" title={`Restricted to ${it.sharedWith?.length || 0} designated users`}>
                            <UserCheck size={9} /> {it.sharedWith?.length || 0} user{it.sharedWith?.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-gray-500 truncate">{sub || '—'}</div>
                      {(it.project || it.tags.length > 0) && (
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {it.project && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 flex items-center gap-1"><FolderOpen size={10} /> {it.project}</span>}
                          {it.tags.slice(0, 4).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">#{t}</span>)}
                        </div>
                      )}
                    </div>
                    <div className="hidden md:flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {it.url && <a href={it.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Open link"><ExternalLink size={14} /></a>}
                      {it.type === 'credential' && it.username && <button onClick={() => copyText(it.username, 'Username')} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 cursor-pointer" title="Copy username"><User size={14} /></button>}
                      {it.type === 'credential' && it.hasSecret && (
                        <button onClick={async () => { try { const d = await api(`/kb/items/${it.id}/reveal`, { method: 'POST', body: { action: 'copy' } }); copyText(d.secret, 'Password'); } catch (e) { showErrorToast(e.message); } }}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 cursor-pointer" title="Copy password (logged)"><KeyRound size={14} /></button>
                      )}
                    </div>
                    <div className="hidden lg:block w-48 shrink-0 text-right">
                      <div className="text-[12px] text-gray-700 truncate">{it.updatedBy || it.createdBy}</div>
                      <div className="text-[11px] text-gray-400 flex items-center justify-end gap-1"><VisIcon size={10} /> {Vis.short} · {fmtDay(it.updatedAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {data && type !== 'files' && items.length > 0 && <div className="text-[11px] text-gray-500 mt-2">{items.length} item{items.length === 1 ? '' : 's'}</div>}
        </div>
      </main>

      {/* Details / editor */}
      {panel && (
        <aside className="w-[460px] max-w-[48vw] shrink-0 bg-white border-l border-gray-200 flex flex-col">
          <div className="px-4 h-12 border-b border-gray-200 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-gray-700 flex items-center gap-1.5">
              {panel.mode === 'new' ? <><Plus size={14} /> New item</> : panel.mode === 'edit' ? <><Pencil size={14} /> Edit</> : 'Details'}
            </span>
            <button onClick={() => setPanel(null)} className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer" aria-label="Close"><X size={17} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {panel.mode === 'view'
              ? <ItemDetails item={panel.item} isTrash={view === 'trash'} onEdit={() => setPanel({ mode: 'edit', item: panel.item })} onChanged={(it) => { setPanel(it ? { mode: 'view', item: it } : null); load(); }} />
              : <ItemForm key={`${panel.mode}-${panel.item.id || panel.item.type}`} initial={panel.item} projects={projects} categories={data?.categories || []}
                allUsers={allUsers} defaultDepartment={departmentFilter || currentUser?.department || 'All Departments'}
                onSaved={afterSave} onCancel={() => setPanel(panel.mode === 'edit' ? { mode: 'view', item: panel.item } : null)} />}
          </div>
        </aside>
      )}
    </div>
  );
}

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  Search, Plus, Hash, Lock, Users, MessageSquare, Send, Paperclip, Smile, X, Reply, Pencil, Trash2, Pin,
  Star, BellOff, Bell, Info, Loader2, FileText, Download, Copy, LogOut, UserPlus, Check,
  CheckCheck, Image as ImageIcon, AtSign, Shield, Compass
} from 'lucide-react';
import { API_BASE_URL } from '../../config/environment';
import { uploadDescriptionFile, toAbsoluteFileUrl, formatFileSize } from '../../utils/descriptionFiles';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { setActiveChatRoom } from '../../utils/chatState';

/**
 * Team chat: direct messages, private groups and team channels with live updates.
 * Server: server/routes/chat-routes.js (identity from the session; live events over SSE).
 */

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '👀', '✅'];
const EMOJIS = ['😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🤔', '😅', '😇', '🙂', '🙃', '😉', '😴', '😢', '😭', '😡', '🤯', '🥳',
  '👍', '👎', '👏', '🙏', '💪', '👌', '✌️', '🤝', '👋', '🙌', '❤️', '🔥', '🎉', '✅', '❌', '⚠️', '💡', '📌', '📎', '🚀', '⭐', '💯', '👀', '☕', '🍕', '📅', '⏰', '📞'];

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

const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
const AVATAR_TONES = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600', 'bg-cyan-700', 'bg-fuchsia-600', 'bg-teal-600'];
const toneFor = (id) => AVATAR_TONES[Math.abs(Number(id) || 0) % AVATAR_TONES.length];
const dayKey = (v) => { const d = new Date(v); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const dayLabel = (v) => {
  const d = new Date(v); const t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1);
  if (dayKey(d) === dayKey(t)) return 'Today';
  if (dayKey(d) === dayKey(y)) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === t.getFullYear() ? undefined : 'numeric' });
};
const timeOf = (v) => new Date(v).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const shortWhen = (v) => {
  if (!v) return '';
  const d = new Date(v); const t = new Date();
  if (dayKey(d) === dayKey(t)) return timeOf(v);
  const diff = (t - d) / 86400000;
  if (diff < 6) return d.toLocaleDateString('en-GB', { weekday: 'short' });
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};
const lastSeen = (v) => {
  if (!v) return 'Offline';
  const mins = Math.round((Date.now() - new Date(v)) / 60000);
  if (mins < 1) return 'Active just now';
  if (mins < 60) return `Active ${mins} min ago`;
  if (mins < 1440) return `Active ${Math.round(mins / 60)} h ago`;
  return `Last seen ${new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
};

const Avatar = ({ name, id, src, size = 'w-8 h-8', text = 'text-[11px]', online }) => (
  <span className={`relative ${size} shrink-0`}>
    {src
      ? <img src={toAbsoluteFileUrl(src)} alt={name} className={`${size} rounded-full object-cover`} />
      : <span className={`${size} ${text} rounded-full ${toneFor(id)} text-white font-semibold flex items-center justify-center`}>{initials(name)}</span>}
    {online !== undefined && <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-gray-300'}`} />}
  </span>
);

const RoomIcon = ({ room, size = 'w-8 h-8' }) => {
  if (room.kind === 'dm') return <Avatar name={room.name} id={room.other?.id} src={room.other?.avatar} size={size} online={room.other?.online} />;
  const Icon = room.kind === 'channel' ? Hash : Users;
  return <span className={`${size} rounded-lg flex items-center justify-center shrink-0 ${room.kind === 'channel' ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-600'}`}><Icon size={15} /></span>;
};
const roomTitle = (room) => (room.kind === 'channel' ? `#${room.name}` : room.name);

// Message text: escaped, with links, @mentions, ticket keys, **bold**, _italic_, `code` and ``` blocks.
function RichText({ text, names, meName, onTicket }) {
  const blocks = String(text || '').split(/```/);
  const inline = (s, keyBase) => {
    const out = [];
    const re = /(https?:\/\/[^\s<]+)|(@(?:everyone|here)\b)|(@[A-Za-z][\w.]*(?: [A-Z][\w.]*)?)|(\*\*[^*\n]+\*\*)|(`[^`\n]+`)|(\b_[^_\n]+_\b)|([A-Z][A-Z0-9]{1,9}(?:-\d{2,4}){1,3}\b)/g;
    let last = 0; let m; let k = 0;
    while ((m = re.exec(s))) {
      if (m.index > last) out.push(s.slice(last, m.index));
      const [tok] = m;
      if (m[1]) out.push(<a key={`${keyBase}-${k++}`} href={tok} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline break-all">{tok}</a>);
      else if (m[2]) out.push(<span key={`${keyBase}-${k++}`} className="px-0.5 rounded bg-amber-100 text-amber-900 font-medium">{tok}</span>);
      else if (m[3]) {
        const nm = tok.slice(1);
        const match = names.find(n => nm.toLowerCase().startsWith(n.toLowerCase()) || n.toLowerCase().startsWith(nm.toLowerCase()));
        if (match) {
          const rest = tok.slice(1 + match.length);
          const mine = meName && match.toLowerCase() === meName.toLowerCase();
          out.push(<span key={`${keyBase}-${k++}`} className={`px-0.5 rounded font-medium ${mine ? 'bg-amber-100 text-amber-900' : 'bg-blue-50 text-blue-700'}`}>@{tok.slice(1, 1 + match.length)}</span>);
          if (rest) out.push(rest);
        } else out.push(tok);
      } else if (m[4]) out.push(<strong key={`${keyBase}-${k++}`}>{tok.slice(2, -2)}</strong>);
      else if (m[5]) out.push(<code key={`${keyBase}-${k++}`} className="px-1 py-0.5 rounded bg-gray-100 text-[12px] font-mono text-rose-700">{tok.slice(1, -1)}</code>);
      else if (m[6]) out.push(<em key={`${keyBase}-${k++}`}>{tok.slice(1, -1)}</em>);
      else if (m[7]) out.push(<button key={`${keyBase}-${k++}`} type="button" onClick={() => onTicket(tok)} className="font-mono text-[12px] text-blue-700 hover:underline cursor-pointer" title="Open ticket">{tok}</button>);
      last = m.index + tok.length;
    }
    if (last < s.length) out.push(s.slice(last));
    return out;
  };
  return (
    <div className="text-[13.5px] text-gray-900 leading-relaxed break-words">
      {blocks.map((b, i) => (i % 2 === 1
        ? <pre key={i} className="my-1 p-2.5 rounded bg-gray-900 text-gray-100 text-[12px] font-mono overflow-x-auto whitespace-pre">{b.replace(/^\n/, '')}</pre>
        : <span key={i} className="whitespace-pre-wrap">{inline(b, i)}</span>))}
    </div>
  );
}

const Attachments = ({ items }) => {
  if (!items?.length) return null;
  const images = items.filter(a => a.isImage);
  const files = items.filter(a => !a.isImage);
  return (
    <div className="mt-1.5 space-y-1.5">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {images.map((a, i) => (
            <a key={i} href={toAbsoluteFileUrl(a.url)} target="_blank" rel="noopener noreferrer" title={a.name}>
              <img src={toAbsoluteFileUrl(a.url)} alt={a.name} loading="lazy" className={`${images.length === 1 ? 'max-h-72 max-w-[min(420px,100%)]' : 'h-32 w-32 object-cover'} rounded-lg border border-gray-200 bg-gray-50`} />
            </a>
          ))}
        </div>
      )}
      {files.map((a, i) => (
        <a key={i} href={toAbsoluteFileUrl(a.url)} target="_blank" rel="noopener noreferrer" download={a.name}
          className="flex items-center gap-2.5 max-w-sm p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
          <span className="w-9 h-9 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><FileText size={17} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] text-gray-900 truncate">{a.name}</span>
            <span className="block text-[11px] text-gray-500">{a.size ? formatFileSize(a.size) : 'File'}</span>
          </span>
          <Download size={14} className="text-gray-400 shrink-0" />
        </a>
      ))}
    </div>
  );
};

// ── Small modals ─────────────────────────────────────────────────────────
function Modal({ title, onClose, children, width = 'max-w-md' }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className={`relative w-full ${width} max-h-[88vh] flex flex-col bg-white rounded-xl shadow-2xl`}>
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer" aria-label="Close"><X size={17} /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function PeoplePicker({ people, selected, onToggle, exclude = [] }) {
  const [term, setTerm] = useState('');
  const list = people.filter(p => !exclude.includes(p.id) && (!term || `${p.name} ${p.email} ${p.department}`.toLowerCase().includes(term.toLowerCase())));
  return (
    <div>
      <div className="relative mb-2">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={term} onChange={e => setTerm(e.target.value)} placeholder="Search people" className="w-full h-9 pl-8 pr-2 text-[13px] border border-gray-300 rounded outline-none focus:border-blue-500" />
      </div>
      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100">
        {list.length === 0 && <div className="p-3 text-xs text-gray-500">No one found.</div>}
        {list.map(p => (
          <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={selected.includes(p.id)} onChange={() => onToggle(p.id)} />
            <Avatar name={p.name} id={p.id} src={p.avatar} size="w-7 h-7" text="text-[10px]" online={p.online} />
            <span className="min-w-0 flex-1"><span className="block text-[13px] text-gray-900 truncate">{p.name}</span><span className="block text-[11px] text-gray-500 truncate">{p.title || p.department || p.email}</span></span>
          </label>
        ))}
      </div>
    </div>
  );
}

function NewRoomModal({ kind, people, meId, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setSaving(true); setError('');
    try {
      const d = await api('/chat/rooms', { method: 'POST', body: { kind, name, description, memberIds: members } });
      onCreated(d);
    } catch (e) { setError(e.message); setSaving(false); }
  };
  return (
    <Modal title={kind === 'channel' ? 'Create a channel' : 'Create a group'} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-gray-500">{kind === 'channel' ? 'Channels are open to the whole team: anyone can find and join them.' : 'Groups are private: only the people you add can see them.'}</p>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Name</label>
          <div className="relative">
            {kind === 'channel' && <Hash size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />}
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder={kind === 'channel' ? 'e.g. marketing-updates' : 'e.g. Bakul Caterings team'}
              className={`w-full h-9 ${kind === 'channel' ? 'pl-8' : 'pl-2.5'} pr-2 text-[13px] border border-gray-300 rounded outline-none focus:border-blue-500`} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Description <span className="font-normal text-gray-400">(optional)</span></label>
          <input value={description} onChange={e => setDescription(e.target.value)} className="w-full h-9 px-2.5 text-[13px] border border-gray-300 rounded outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">{kind === 'channel' ? 'Add people now (optional)' : 'Members'} <span className="font-normal text-gray-400">{members.length ? `· ${members.length} selected` : ''}</span></label>
          <PeoplePicker people={people} selected={members} exclude={[meId]} onToggle={(id) => setMembers(m => (m.includes(id) ? m.filter(x => x !== id) : [...m, id]))} />
        </div>
        {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5">{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="h-9 px-4 text-sm rounded border border-gray-300 hover:bg-gray-50 cursor-pointer">Cancel</button>
          <button onClick={save} disabled={saving} className="h-9 px-4 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer flex items-center gap-1.5">{saving && <Loader2 size={14} className="animate-spin" />} Create</button>
        </div>
      </div>
    </Modal>
  );
}

function BrowseChannelsModal({ onClose, onOpen }) {
  const [channels, setChannels] = useState(null);
  const [busy, setBusy] = useState(null);
  useEffect(() => { api('/chat/channels').then(d => setChannels(d.channels)).catch(e => showErrorToast(e.message)); }, []);
  const join = async (c) => {
    setBusy(c.id);
    try { await api(`/chat/rooms/${c.id}/members`, { method: 'POST', body: {} }); onOpen(c.id); } catch (e) { showErrorToast(e.message); setBusy(null); }
  };
  return (
    <Modal title="Browse channels" onClose={onClose}>
      {!channels ? <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={18} /></div> : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded">
          {channels.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
              <Hash size={16} className="text-gray-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-gray-900">{c.name}</div>
                <div className="text-[11px] text-gray-500 truncate">{c.members} member{c.members === 1 ? '' : 's'}{c.description ? ` · ${c.description}` : ''}</div>
              </div>
              {c.joined
                ? <button onClick={() => onOpen(c.id)} className="h-8 px-3 text-xs rounded border border-gray-300 hover:bg-gray-50 cursor-pointer">Open</button>
                : <button onClick={() => join(c)} disabled={busy === c.id} className="h-8 px-3 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer disabled:opacity-60">Join</button>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Details drawer ───────────────────────────────────────────────────────
function RoomDetails({ room, me, people, pinned, onClose, onChanged, onJump, onLeft }) {
  const [tab, setTab] = useState(room.kind === 'dm' ? 'about' : 'members');
  const [members, setMembers] = useState(null);
  const [files, setFiles] = useState(null);
  const [adding, setAdding] = useState(false);
  const [toAdd, setToAdd] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: room.name, description: room.description });
  const isAdmin = room.role === 'owner' || room.role === 'admin' || me.isAdmin;

  const loadMembers = useCallback(() => { api(`/chat/rooms/${room.id}/members`).then(d => setMembers(d.members)).catch(() => setMembers([])); }, [room.id]);
  useEffect(() => { setMembers(null); setFiles(null); setTab(room.kind === 'dm' ? 'about' : 'members'); setForm({ name: room.name, description: room.description }); }, [room.id, room.kind, room.name, room.description]);
  useEffect(() => { if (tab === 'members' && !members) loadMembers(); }, [tab, members, loadMembers]);
  useEffect(() => { if (tab === 'files' && !files) api(`/chat/rooms/${room.id}/files`).then(d => setFiles(d.files)).catch(() => setFiles([])); }, [tab, files, room.id]);

  const addPeople = async () => {
    try { await api(`/chat/rooms/${room.id}/members`, { method: 'POST', body: { userIds: toAdd } }); setAdding(false); setToAdd([]); loadMembers(); onChanged(); } catch (e) { showErrorToast(e.message); }
  };
  const remove = async (m) => {
    const ok = await Swal.fire({ title: `Remove ${m.name}?`, showCancelButton: true, confirmButtonText: 'Remove', confirmButtonColor: '#dc2626' });
    if (!ok.isConfirmed) return;
    try { await api(`/chat/rooms/${room.id}/members/${m.id}`, { method: 'DELETE' }); loadMembers(); onChanged(); } catch (e) { showErrorToast(e.message); }
  };
  const setRole = async (m, role) => {
    try { await api(`/chat/rooms/${room.id}/role`, { method: 'POST', body: { userId: m.id, role } }); loadMembers(); } catch (e) { showErrorToast(e.message); }
  };
  const leave = async () => {
    const ok = await Swal.fire({ title: `Leave ${roomTitle(room)}?`, showCancelButton: true, confirmButtonText: 'Leave', confirmButtonColor: '#dc2626' });
    if (!ok.isConfirmed) return;
    try { await api(`/chat/rooms/${room.id}/members/${me.id}`, { method: 'DELETE' }); onLeft(); } catch (e) { showErrorToast(e.message); }
  };
  const saveAbout = async () => {
    try { await api(`/chat/rooms/${room.id}`, { method: 'PUT', body: form }); setEditing(false); onChanged(); } catch (e) { showErrorToast(e.message); }
  };

  const tabs = room.kind === 'dm' ? [['about', 'About'], ['pinned', `Pinned${pinned.length ? ` (${pinned.length})` : ''}`], ['files', 'Files']]
    : [['members', `Members (${room.memberCount})`], ['pinned', `Pinned${pinned.length ? ` (${pinned.length})` : ''}`], ['files', 'Files'], ['about', 'About']];

  return (
    <aside className="w-[320px] shrink-0 border-l border-gray-200 bg-white flex flex-col">
      <div className="h-14 px-4 border-b border-gray-200 flex items-center justify-between">
        <span className="text-[14px] font-semibold text-gray-900">Details</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer" aria-label="Close details"><X size={17} /></button>
      </div>
      <div className="px-3 pt-2 border-b border-gray-200 flex gap-1 overflow-x-auto">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-2.5 py-2 text-[12px] font-medium -mb-px border-b-2 whitespace-nowrap cursor-pointer ${tab === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{l}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'members' && (
          <div className="space-y-3">
            {(isAdmin || room.kind === 'channel') && !adding && <button onClick={() => setAdding(true)} className="w-full h-8 text-xs font-medium rounded border border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-1.5 cursor-pointer"><UserPlus size={13} /> Add people</button>}
            {adding && (
              <div className="space-y-2">
                <PeoplePicker people={people} selected={toAdd} exclude={(members || []).map(m => m.id)} onToggle={(id) => setToAdd(a => (a.includes(id) ? a.filter(x => x !== id) : [...a, id]))} />
                <div className="flex gap-2">
                  <button onClick={() => { setAdding(false); setToAdd([]); }} className="flex-1 h-8 text-xs rounded border border-gray-300 cursor-pointer">Cancel</button>
                  <button onClick={addPeople} disabled={!toAdd.length} className="flex-1 h-8 text-xs font-medium rounded bg-blue-600 text-white disabled:opacity-50 cursor-pointer">Add {toAdd.length || ''}</button>
                </div>
              </div>
            )}
            {!members ? <Loader2 className="animate-spin text-gray-400 mx-auto" size={16} /> : members.map(m => (
              <div key={m.id} className="flex items-center gap-2.5 group">
                <Avatar name={m.name} id={m.id} src={m.avatar} size="w-8 h-8" online={m.online} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-gray-900 truncate">{m.name}{m.id === me.id ? ' (you)' : ''}</div>
                  <div className="text-[11px] text-gray-500 truncate">{m.role !== 'member' ? <span className="text-blue-700 font-medium capitalize">{m.role} · </span> : ''}{m.title || m.department}</div>
                </div>
                {isAdmin && m.id !== me.id && m.role !== 'owner' && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => setRole(m, m.role === 'admin' ? 'member' : 'admin')} className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer" title={m.role === 'admin' ? 'Remove admin' : 'Make admin'}><Shield size={13} /></button>
                    <button onClick={() => remove(m)} className="p-1 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 cursor-pointer" title="Remove"><X size={13} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {tab === 'pinned' && (pinned.length === 0 ? <div className="text-xs text-gray-500">No pinned messages. Hover a message and click the pin to keep it here.</div> : (
          <div className="space-y-2">
            {pinned.map(p => (
              <button key={p.id} onClick={() => onJump(p.id)} className="w-full text-left p-2.5 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <div className="text-[11px] text-gray-500">{p.sender} · {shortWhen(p.createdAt)}</div>
                <div className="text-[13px] text-gray-800 line-clamp-3">{p.body || (p.attachments.length ? '📎 Attachment' : '')}</div>
              </button>
            ))}
          </div>
        ))}
        {tab === 'files' && (!files ? <Loader2 className="animate-spin text-gray-400 mx-auto" size={16} /> : files.length === 0 ? <div className="text-xs text-gray-500">No files shared yet.</div> : (
          <div className="space-y-2">
            {files.map((f, i) => (
              <a key={i} href={toAbsoluteFileUrl(f.url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-2 rounded border border-gray-200 hover:bg-gray-50">
                {f.isImage ? <img src={toAbsoluteFileUrl(f.url)} alt={f.name} className="w-10 h-10 rounded object-cover" loading="lazy" /> : <span className="w-10 h-10 rounded bg-blue-50 text-blue-600 flex items-center justify-center"><FileText size={16} /></span>}
                <span className="min-w-0 flex-1"><span className="block text-[12px] text-gray-900 truncate">{f.name}</span><span className="block text-[11px] text-gray-500">{f.sender} · {shortWhen(f.at)}</span></span>
              </a>
            ))}
          </div>
        ))}
        {tab === 'about' && (
          <div className="space-y-4">
            {room.kind === 'dm' && room.other ? (
              <div className="text-center">
                <div className="flex justify-center"><Avatar name={room.other.name} id={room.other.id} src={room.other.avatar} size="w-16 h-16" text="text-lg" online={room.other.online} /></div>
                <div className="mt-2 text-[15px] font-semibold text-gray-900">{room.other.name}</div>
                <div className="text-xs text-gray-500">{room.other.title || room.other.department}</div>
                <div className="text-xs text-gray-500 mt-1">{room.other.online ? 'Online' : lastSeen(people.find(p => p.id === room.other.id)?.lastActive)}</div>
                {room.other.email && <a href={`mailto:${room.other.email}`} className="inline-block mt-2 text-xs text-blue-700 hover:underline">{room.other.email}</a>}
              </div>
            ) : editing ? (
              <div className="space-y-2">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full h-9 px-2.5 text-[13px] border border-gray-300 rounded" />
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Description" className="w-full p-2.5 text-[13px] border border-gray-300 rounded" />
                <div className="flex gap-2"><button onClick={() => setEditing(false)} className="flex-1 h-8 text-xs rounded border border-gray-300 cursor-pointer">Cancel</button><button onClick={saveAbout} className="flex-1 h-8 text-xs font-medium rounded bg-blue-600 text-white cursor-pointer">Save</button></div>
              </div>
            ) : (
              <div>
                <div className="text-[15px] font-semibold text-gray-900">{roomTitle(room)}</div>
                <div className="text-xs text-gray-500 mt-0.5">{room.kind === 'channel' ? 'Team channel · anyone can join' : 'Private group'}</div>
                <p className="text-[13px] text-gray-700 mt-2 whitespace-pre-wrap">{room.description || 'No description.'}</p>
                {isAdmin && <button onClick={() => setEditing(true)} className="mt-2 h-8 px-3 text-xs rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"><Pencil size={12} /> Edit</button>}
              </div>
            )}
            {room.kind !== 'dm' && !(room.kind === 'channel' && room.name === 'general') && (
              <button onClick={leave} className="w-full h-8 text-xs rounded border border-red-200 text-red-700 hover:bg-red-50 flex items-center justify-center gap-1.5 cursor-pointer"><LogOut size={13} /> Leave {room.kind === 'channel' ? 'channel' : 'group'}</button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function ITChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { designation, username } = useParams();
  const [me, setMe] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pinned, setPinned] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [newMenu, setNewMenu] = useState(false);
  const [modal, setModal] = useState(null); // 'group' | 'channel' | 'browse' | 'dm'
  const [showDetails, setShowDetails] = useState(false);
  const [typing, setTyping] = useState({}); // roomId -> { userId: { name, at } }
  const [draft, setDraft] = useState('');
  const [mentionIds, setMentionIds] = useState([]);
  const [pending, setPending] = useState([]); // attachments being uploaded / ready
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null); // message
  const [sending, setSending] = useState(false);
  const [emojiFor, setEmojiFor] = useState(null); // 'composer' | messageId
  const [mention, setMention] = useState(null); // { query, start }
  const [mentionIndex, setMentionIndex] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const [firstUnreadId, setFirstUnreadId] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [connected, setConnected] = useState(true);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const activeRef = useRef(null);
  const meRef = useRef(null);
  const roomsRef = useRef([]);
  const lastTypingSent = useRef(0);
  const stickToBottom = useRef(true);
  activeRef.current = activeId;
  meRef.current = me;
  roomsRef.current = rooms;

  const active = rooms.find(r => r.id === activeId) || null;
  const nameList = useMemo(() => people.map(p => p.name).concat(me ? [me.name] : []).sort((a, b) => b.length - a.length), [people, me]);

  const refreshRooms = useCallback(async () => {
    try { const d = await api('/chat/rooms'); setRooms(d.rooms); } catch (e) { /* keep what we have */ }
  }, []);

  // Start-up.
  useEffect(() => {
    api('/chat/bootstrap').then(d => {
      setMe(d.me); setRooms(d.rooms); setPeople(d.people);
      const wanted = Number(new URLSearchParams(location.search).get('room'));
      const first = d.rooms.find(r => r.id === wanted) || d.rooms[0];
      if (first) setActiveId(first.id);
    }).catch(e => showErrorToast(e.message)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unread total in the tab title.
  useEffect(() => {
    const total = rooms.filter(r => !r.muted).reduce((s, r) => s + r.unread, 0);
    const base = 'Chat';
    document.title = total ? `(${total}) ${base}` : base;
    return () => { document.title = 'CRM'; };
  }, [rooms]);

  const markRead = useCallback((roomId, messageId) => {
    setRooms(rs => rs.map(r => (r.id === roomId ? { ...r, unread: 0, lastReadId: Math.max(r.lastReadId, messageId || 0) } : r)));
    api(`/chat/rooms/${roomId}/read`, { method: 'POST', body: { messageId } }).catch(() => {});
  }, []);

  // Load a conversation.
  const loadRoom = useCallback(async (roomId, around) => {
    setLoadingMsgs(true);
    try {
      const d = await api(`/chat/rooms/${roomId}/messages${around ? `?around=${around}` : ''}`);
      if (activeRef.current !== roomId) return;
      setMessages(d.messages); setPinned(d.pinned); setHasMore(around ? true : d.hasMore);
      const room = roomsRef.current.find(r => r.id === roomId);
      const firstUnread = room && room.unread ? d.messages.find(m => m.id > room.lastReadId && m.senderId !== meRef.current?.id) : null;
      setFirstUnreadId(firstUnread ? firstUnread.id : null);
      stickToBottom.current = !around;
      if (around) { setHighlight(around); setTimeout(() => setHighlight(null), 2500); }
      const lastId = d.messages.length ? d.messages[d.messages.length - 1].id : 0;
      if (lastId) markRead(roomId, lastId);
    } catch (e) { showErrorToast(e.message); } finally { setLoadingMsgs(false); }
  }, [markRead]);

  // Tell the app-wide notifier which conversation is on screen.
  useEffect(() => { setActiveChatRoom(activeId); }, [activeId]);
  useEffect(() => () => setActiveChatRoom(null), []);

  // Opened from a notification while already on the chat page: switch conversation.
  useEffect(() => {
    const wanted = Number(new URLSearchParams(location.search).get('room'));
    if (wanted && wanted !== activeRef.current && roomsRef.current.some(r => r.id === wanted)) setActiveId(wanted);
  }, [location.search]);

  useEffect(() => {
    if (!activeId) return;
    setMessages([]); setReplyTo(null); setEditing(null); setDraft(''); setMentionIds([]); setPending([]); setSearchOpen(false); setSearchResults(null);
    loadRoom(activeId);
    const url = new URL(window.location.href); url.searchParams.set('room', activeId); window.history.replaceState(null, '', url);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [activeId, loadRoom]);

  // Keep the view at the bottom when new messages arrive (unless reading older ones).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (highlight) {
      const target = el.querySelector(`[data-mid="${highlight}"]`);
      if (target) target.scrollIntoView({ block: 'center' });
      return;
    }
    if (stickToBottom.current) {
      const marker = firstUnreadId ? el.querySelector('[data-unread-marker]') : null;
      if (marker && !el.dataset.scrolledOnce) { marker.scrollIntoView({ block: 'center' }); el.dataset.scrolledOnce = '1'; } else el.scrollTop = el.scrollHeight;
    }
  }, [messages, highlight, firstUnreadId]);
  useEffect(() => { if (scrollRef.current) delete scrollRef.current.dataset.scrolledOnce; }, [activeId]);

  const onScroll = async () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 60 && hasMore && !loadingMsgs && messages.length) {
      setLoadingMsgs(true);
      const prevHeight = el.scrollHeight;
      try {
        const d = await api(`/chat/rooms/${activeId}/messages?before=${messages[0].id}`);
        setMessages(ms => [...d.messages.filter(m => !ms.some(x => x.id === m.id)), ...ms]);
        setHasMore(d.hasMore);
        requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight; });
      } catch (e) { /* ignore */ } finally { setLoadingMsgs(false); }
    }
  };

  // Live updates.
  useEffect(() => {
    if (!me) return undefined;
    const es = new EventSource(`${API_BASE_URL}/chat/stream`, { withCredentials: true });
    es.addEventListener('hello', () => setConnected(true));
    es.onerror = () => setConnected(false);
    es.onopen = () => setConnected(true);
    es.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      const mine = msg.senderId === meRef.current?.id;
      const room = roomsRef.current.find(r => r.id === msg.roomId);
      if (!room) { refreshRooms(); return; }
      const visible = activeRef.current === msg.roomId && document.visibilityState === 'visible';
      if (activeRef.current === msg.roomId) {
        setMessages(ms => (ms.some(m => m.id === msg.id) ? ms : [...ms, msg]));
        if (visible && !mine) markRead(msg.roomId, msg.id);
      }
      setTyping(t => { const r = { ...(t[msg.roomId] || {}) }; delete r[msg.senderId]; return { ...t, [msg.roomId]: r }; });
      setRooms(rs => rs.map(r => (r.id === msg.roomId ? {
        ...r, lastAt: msg.createdAt, unread: mine || visible ? r.unread : r.unread + (msg.kind === 'system' ? 0 : 1),
        last: { id: msg.id, sender: mine ? 'You' : msg.sender, text: msg.body || (msg.attachments.length ? '📎 Attachment' : ''), at: msg.createdAt, kind: msg.kind }
      } : r)).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt)));
      // Desktop notifications are shown app-wide by ChatNotifier.
    });
    es.addEventListener('message:update', (e) => {
      const msg = JSON.parse(e.data);
      setMessages(ms => ms.map(m => (m.id === msg.id ? msg : m)));
      setPinned(ps => {
        if (activeRef.current !== msg.roomId) return ps;
        const rest = ps.filter(p => p.id !== msg.id);
        return msg.pinnedAt && !msg.deletedAt ? [msg, ...rest] : rest;
      });
    });
    es.addEventListener('read', (e) => {
      const d = JSON.parse(e.data);
      if (d.userId === meRef.current?.id) return;
      setRooms(rs => rs.map(r => (r.id === d.roomId && r.kind === 'dm' ? { ...r, otherReadId: Math.max(r.otherReadId || 0, d.messageId) } : r)));
    });
    es.addEventListener('typing', (e) => {
      const d = JSON.parse(e.data);
      setTyping(t => ({ ...t, [d.roomId]: { ...(t[d.roomId] || {}), [d.userId]: { name: d.name, at: Date.now() } } }));
    });
    es.addEventListener('presence', (e) => {
      const d = JSON.parse(e.data);
      setPeople(ps => ps.map(p => (p.id === d.userId ? { ...p, online: d.online, lastActive: d.lastActive || p.lastActive } : p)));
      setRooms(rs => rs.map(r => (r.other?.id === d.userId ? { ...r, other: { ...r.other, online: d.online } } : r)));
    });
    es.addEventListener('rooms', () => refreshRooms());
    es.addEventListener('notify', () => window.dispatchEvent(new Event('crm-refresh-notifications')));
    return () => es.close();
  }, [me, markRead, refreshRooms]);

  // Typing indicators fade after 5 s.
  useEffect(() => {
    const t = setInterval(() => setTyping(cur => {
      let changed = false; const next = {};
      Object.entries(cur).forEach(([rid, users]) => {
        const keep = Object.fromEntries(Object.entries(users).filter(([, v]) => Date.now() - v.at < 5000));
        if (Object.keys(keep).length !== Object.keys(users).length) changed = true;
        next[rid] = keep;
      });
      return changed ? next : cur;
    }), 1500);
    return () => clearInterval(t);
  }, []);

  // Mark read when coming back to the tab.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && activeRef.current) {
        const r = roomsRef.current.find(x => x.id === activeRef.current);
        if (r && r.unread) markRead(r.id, r.last?.id);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [markRead]);

  // ── Composer ───────────────────────────────────────────────────────────
  const roomMembersForMention = useMemo(() => {
    if (!active) return [];
    if (active.kind === 'dm') return active.other ? [people.find(p => p.id === active.other.id) || active.other] : [];
    return people; // filtered to members on the server
  }, [active, people]);

  const mentionOptions = useMemo(() => {
    if (!mention) return [];
    const term = mention.query.toLowerCase();
    const opts = roomMembersForMention.filter(p => p.id !== me?.id && p.name.toLowerCase().includes(term)).slice(0, 7).map(p => ({ id: p.id, name: p.name, sub: p.title || p.department }));
    if (active && active.kind !== 'dm') ['everyone', 'here'].filter(k => k.startsWith(term)).forEach(k => opts.push({ id: k, name: k, sub: k === 'everyone' ? 'Notify everyone in this conversation' : 'Notify everyone here' }));
    return opts;
  }, [mention, roomMembersForMention, me, active]);

  const onDraftChange = (e) => {
    const val = e.target.value;
    setDraft(val);
    const caret = e.target.selectionStart;
    const before = val.slice(0, caret);
    const m = before.match(/(^|\s)@([\w.]*(?: [\w.]*)?)$/);
    if (m && m[2].length <= 30) { setMention({ query: m[2], start: caret - m[2].length - 1 }); setMentionIndex(0); } else setMention(null);
    if (activeId && val && Date.now() - lastTypingSent.current > 3000) {
      lastTypingSent.current = Date.now();
      api(`/chat/rooms/${activeId}/typing`, { method: 'POST', body: {} }).catch(() => {});
    }
  };

  const pickMention = (opt) => {
    const el = inputRef.current;
    const caret = el ? el.selectionStart : draft.length;
    const insert = `@${opt.name} `;
    const next = draft.slice(0, mention.start) + insert + draft.slice(caret);
    setDraft(next);
    if (typeof opt.id === 'number') setMentionIds(ids => [...new Set([...ids, opt.id])]);
    setMention(null);
    requestAnimationFrame(() => { if (el) { el.focus(); const pos = mention.start + insert.length; el.setSelectionRange(pos, pos); } });
  };

  const insertText = (t) => {
    const el = inputRef.current;
    const caret = el ? el.selectionStart : draft.length;
    setDraft(d => d.slice(0, caret) + t + d.slice(caret));
    requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(caret + t.length, caret + t.length); } });
  };

  const addFiles = async (list) => {
    for (const file of Array.from(list || []).slice(0, 10)) {
      const key = `${Date.now()}-${Math.random()}`;
      const isImage = String(file.type || '').startsWith('image/');
      setPending(p => [...p, { key, name: file.name || 'screenshot.png', isImage, preview: isImage ? URL.createObjectURL(file) : null, uploading: true }]);
      try {
        const saved = await uploadDescriptionFile(file);
        setPending(p => p.map(x => (x.key === key ? { ...x, uploading: false, url: saved.filePath || saved.url, size: saved.sizeBytes, mime: saved.mimeType, isImage: saved.isImage, name: saved.name } : x)));
      } catch (e) {
        showErrorToast(e.message);
        setPending(p => p.filter(x => x.key !== key));
      }
    }
  };

  const send = async () => {
    if (!active || sending) return;
    const body = draft.trim();
    if (editing) {
      if (!body) return;
      setSending(true);
      try { await api(`/chat/messages/${editing.id}`, { method: 'PUT', body: { body } }); setEditing(null); setDraft(''); } catch (e) { showErrorToast(e.message); } finally { setSending(false); }
      return;
    }
    if (pending.some(p => p.uploading)) { showErrorToast('Wait for the upload to finish'); return; }
    const attachments = pending.filter(p => p.url).map(({ name, url, size, mime, isImage }) => ({ name, url, size, mime, isImage }));
    if (!body && !attachments.length) return;
    // Keep only mentions whose name is still in the text.
    const ids = mentionIds.filter(id => { const p = people.find(x => x.id === id); return p && body.includes(`@${p.name}`); });
    setSending(true);
    stickToBottom.current = true;
    try {
      const d = await api(`/chat/rooms/${active.id}/messages`, { method: 'POST', body: { body, attachments, replyToId: replyTo?.id || null, mentions: ids } });
      setMessages(ms => (ms.some(m => m.id === d.message.id) ? ms : [...ms, d.message]));
      setDraft(''); setPending([]); setReplyTo(null); setMentionIds([]); setFirstUnreadId(null);
    } catch (e) { showErrorToast(e.message); } finally { setSending(false); inputRef.current?.focus(); }
  };

  const onKeyDown = (e) => {
    if (mention && mentionOptions.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => (i + 1) % mentionOptions.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => (i - 1 + mentionOptions.length) % mentionOptions.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(mentionOptions[mentionIndex]); return; }
      if (e.key === 'Escape') { setMention(null); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); return; }
    if (e.key === 'Escape') { if (editing) { setEditing(null); setDraft(''); } else if (replyTo) setReplyTo(null); return; }
    // Up arrow in an empty box edits your last message.
    if (e.key === 'ArrowUp' && !draft) {
      const mine = [...messages].reverse().find(m => m.senderId === me?.id && !m.deletedAt && m.kind === 'text' && m.body);
      if (mine) { e.preventDefault(); startEdit(mine); }
    }
  };

  const startEdit = (m) => { setEditing(m); setReplyTo(null); setDraft(m.body); requestAnimationFrame(() => inputRef.current?.focus()); };

  // ── Message actions ────────────────────────────────────────────────────
  const react = async (m, emoji) => {
    setEmojiFor(null);
    try { const d = await api(`/chat/messages/${m.id}/react`, { method: 'POST', body: { emoji } }); setMessages(ms => ms.map(x => (x.id === m.id ? d.message : x))); } catch (e) { showErrorToast(e.message); }
  };
  const remove = async (m) => {
    const ok = await Swal.fire({ title: 'Delete this message?', text: 'It will be removed for everyone.', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#dc2626' });
    if (!ok.isConfirmed) return;
    try { const d = await api(`/chat/messages/${m.id}`, { method: 'DELETE' }); setMessages(ms => ms.map(x => (x.id === m.id ? d.message : x))); } catch (e) { showErrorToast(e.message); }
  };
  const pin = async (m) => {
    try { const d = await api(`/chat/messages/${m.id}/pin`, { method: 'POST' }); setMessages(ms => ms.map(x => (x.id === m.id ? d.message : x))); showSuccessToast(d.message.pinnedAt ? 'Pinned' : 'Unpinned'); } catch (e) { showErrorToast(e.message); }
  };
  const jumpTo = (id) => {
    if (messages.some(m => m.id === id)) { setHighlight(id); setTimeout(() => setHighlight(null), 2500); } else loadRoom(activeId, id);
  };
  const openTicket = (key) => navigate(`/${['it', 'marketing'].includes(window.location.pathname.split('/')[1]) ? window.location.pathname.split('/')[1] : 'it'}/${designation || 'user'}/${username || 'me'}/kanban?ticketKey=${encodeURIComponent(key)}`);

  const setPrefs = async (patch) => {
    if (!active) return;
    setRooms(rs => rs.map(r => (r.id === active.id ? { ...r, ...patch } : r)));
    try { await api(`/chat/rooms/${active.id}/prefs`, { method: 'POST', body: patch }); } catch (e) { showErrorToast(e.message); refreshRooms(); }
  };

  const openDm = async (userId) => {
    try { const d = await api('/chat/dm', { method: 'POST', body: { userId } }); setRooms(d.rooms); setActiveId(d.roomId); setModal(null); setListSearch(''); } catch (e) { showErrorToast(e.message); }
  };

  const runSearch = useCallback(async (term) => {
    if (term.trim().length < 2) { setSearchResults(null); return; }
    try { const d = await api(`/chat/search?q=${encodeURIComponent(term.trim())}${activeId ? `&roomId=${activeId}` : ''}`); setSearchResults(d.results); } catch (e) { showErrorToast(e.message); }
  }, [activeId]);
  useEffect(() => { if (!searchOpen) return undefined; const t = setTimeout(() => runSearch(searchTerm), 300); return () => clearTimeout(t); }, [searchTerm, searchOpen, runSearch]);

  // ── Sidebar lists ──────────────────────────────────────────────────────
  const term = listSearch.trim().toLowerCase();
  const matchRoom = (r) => !term || roomTitle(r).toLowerCase().includes(term) || (r.other?.email || '').toLowerCase().includes(term);
  const starred = rooms.filter(r => r.starred && matchRoom(r));
  const channels = rooms.filter(r => !r.starred && r.kind === 'channel' && matchRoom(r));
  const groups = rooms.filter(r => !r.starred && r.kind === 'group' && matchRoom(r));
  const dms = rooms.filter(r => !r.starred && r.kind === 'dm' && matchRoom(r));
  const dmIds = new Set(rooms.filter(r => r.kind === 'dm').map(r => r.other?.id));
  const newPeople = term ? people.filter(p => p.id !== me?.id && !dmIds.has(p.id) && `${p.name} ${p.email} ${p.department}`.toLowerCase().includes(term)).slice(0, 8) : [];

  const RoomRow = ({ r }) => (
    <button onClick={() => setActiveId(r.id)} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left cursor-pointer ${activeId === r.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
      <RoomIcon room={r} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span className={`truncate text-[13px] ${r.unread ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>{roomTitle(r)}</span>
          {r.muted && <BellOff size={11} className="text-gray-400 shrink-0" />}
          <span className="ml-auto text-[10px] text-gray-400 shrink-0">{r.last ? shortWhen(r.last.at) : ''}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className={`truncate text-[12px] ${r.unread ? 'text-gray-800' : 'text-gray-500'}`}>
            {typing[r.id] && Object.keys(typing[r.id]).length ? <em className="text-blue-600">typing…</em>
              : r.last ? `${r.kind !== 'dm' && r.last.kind !== 'system' && r.last.sender ? `${r.last.sender}: ` : r.last.sender === 'You' ? 'You: ' : ''}${r.last.text}` : 'No messages yet'}
          </span>
          {r.unread > 0 && <span className={`ml-auto shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center ${r.muted ? 'bg-gray-300 text-gray-700' : 'bg-blue-600 text-white'}`}>{r.unread > 99 ? '99+' : r.unread}</span>}
        </span>
      </span>
    </button>
  );
  const Section = ({ title, list, action }) => (list.length > 0 || action ? (
    <div className="mb-3">
      <div className="px-2.5 py-1 flex items-center justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
        <span>{title}</span>{action}
      </div>
      {list.map(r => <RoomRow key={r.id} r={r} />)}
    </div>
  ) : null);

  const typingNames = active ? Object.values(typing[active.id] || {}).map(v => v.name) : [];

  // Group consecutive messages from the same person within 5 minutes.
  const rendered = useMemo(() => {
    const out = [];
    let prev = null;
    messages.forEach(m => {
      if (!prev || dayKey(prev.createdAt) !== dayKey(m.createdAt)) out.push({ type: 'day', key: `d-${m.id}`, label: dayLabel(m.createdAt) });
      if (firstUnreadId && m.id === firstUnreadId) out.push({ type: 'unread', key: 'unread' });
      const compact = prev && prev.kind !== 'system' && m.kind !== 'system' && prev.senderId === m.senderId && dayKey(prev.createdAt) === dayKey(m.createdAt)
        && new Date(m.createdAt) - new Date(prev.createdAt) < 5 * 60000 && !m.replyTo && m.id !== firstUnreadId;
      out.push({ type: 'msg', key: m.id, m, compact });
      prev = m;
    });
    return out;
  }, [messages, firstUnreadId]);

  const myLastId = useMemo(() => { const mine = [...messages].reverse().find(m => m.senderId === me?.id && m.kind === 'text'); return mine?.id; }, [messages, me]);
  const peopleById = useMemo(() => new Map(people.map(p => [p.id, p.name])), [people]);

  if (loading) return <div className="h-[calc(100vh-64px)] flex items-center justify-center text-sm text-gray-500 gap-2"><Loader2 size={16} className="animate-spin" /> Loading chat…</div>;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white text-gray-900 overflow-hidden" onClick={() => { if (newMenu) setNewMenu(false); }}>
      {/* Conversations */}
      <aside className="w-[300px] shrink-0 border-r border-gray-200 flex flex-col bg-[#fbfcfd]">
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200">
          <span className="text-[16px] font-semibold flex items-center gap-2"><MessageSquare size={17} className="text-blue-600" /> Chat</span>
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setNewMenu(m => !m); }} className="h-8 px-2.5 rounded-lg bg-blue-600 text-white text-[12px] font-medium hover:bg-blue-700 flex items-center gap-1 cursor-pointer"><Plus size={14} /> New</button>
            {newMenu && (
              <div className="absolute right-0 top-10 z-30 w-52 bg-white border border-gray-200 rounded-lg shadow-xl py-1" onClick={e => e.stopPropagation()}>
                {[['dm', MessageSquare, 'New message'], ['group', Users, 'New group'], ['channel', Hash, 'New channel'], ['browse', Compass, 'Browse channels']].map(([k, Icon, l]) => (
                  <button key={k} onClick={() => { setModal(k); setNewMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 cursor-pointer"><Icon size={14} /> {l}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Search conversations or people" className="w-full h-9 pl-8 pr-7 text-[13px] bg-white border border-gray-300 rounded-lg outline-none focus:border-blue-500" />
            {listSearch && <button onClick={() => setListSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer" aria-label="Clear"><X size={13} /></button>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-1.5 pb-3">
          <Section title="Starred" list={starred} />
          <Section title="Channels" list={channels} action={<button onClick={() => setModal('browse')} className="text-gray-400 hover:text-blue-600 cursor-pointer" title="Browse channels"><Compass size={13} /></button>} />
          <Section title="Groups" list={groups} action={<button onClick={() => setModal('group')} className="text-gray-400 hover:text-blue-600 cursor-pointer" title="New group"><Plus size={13} /></button>} />
          <Section title="Direct messages" list={dms} action={<button onClick={() => setModal('dm')} className="text-gray-400 hover:text-blue-600 cursor-pointer" title="New message"><Plus size={13} /></button>} />
          {newPeople.length > 0 && (
            <div className="mb-3">
              <div className="px-2.5 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Start a conversation</div>
              {newPeople.map(p => (
                <button key={p.id} onClick={() => openDm(p.id)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 text-left cursor-pointer">
                  <Avatar name={p.name} id={p.id} src={p.avatar} online={p.online} />
                  <span className="min-w-0"><span className="block text-[13px] text-gray-800 truncate">{p.name}</span><span className="block text-[11px] text-gray-500 truncate">{p.title || p.department}</span></span>
                </button>
              ))}
            </div>
          )}
          {term && !starred.length && !channels.length && !groups.length && !dms.length && !newPeople.length && <div className="px-3 py-6 text-center text-xs text-gray-500">Nothing found.</div>}
        </div>
        {!connected && <div className="px-3 py-1.5 text-[11px] text-amber-800 bg-amber-50 border-t border-amber-200">Reconnecting… new messages will appear when back online.</div>}
      </aside>

      {/* Conversation */}
      <section className="flex-1 min-w-0 flex flex-col" onDragOver={e => { if (active && e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); setDragOver(true); } }}
        onDragLeave={e => { if (e.currentTarget === e.target) setDragOver(false); }} onDrop={e => { if (!active) return; e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#f8fafc]">
            <MessageSquare size={40} className="text-gray-300 mb-3" />
            <div className="text-[15px] font-semibold text-gray-800">Pick a conversation</div>
            <p className="text-sm text-gray-500 mt-1">or start one with a teammate.</p>
            <button onClick={() => setModal('dm')} className="mt-4 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 cursor-pointer">New message</button>
          </div>
        ) : (
          <>
            <header className="h-14 px-4 border-b border-gray-200 flex items-center gap-3 bg-white">
              <RoomIcon room={active} size="w-9 h-9" />
              <button onClick={() => setShowDetails(s => !s)} className="min-w-0 text-left cursor-pointer">
                <div className="text-[14px] font-semibold text-gray-900 truncate flex items-center gap-1.5">
                  {roomTitle(active)} {active.kind === 'group' && <Lock size={12} className="text-gray-400" />}
                </div>
                <div className="text-[11px] text-gray-500 truncate">
                  {typingNames.length ? <span className="text-blue-600">{typingNames.join(', ')} {typingNames.length > 1 ? 'are' : 'is'} typing…</span>
                    : active.kind === 'dm' ? (active.other?.online ? <span className="text-emerald-600">Online</span> : lastSeen(people.find(p => p.id === active.other?.id)?.lastActive))
                      : `${active.memberCount} member${active.memberCount === 1 ? '' : 's'}${active.description ? ` · ${active.description}` : ''}`}
                </div>
              </button>
              <div className="ml-auto flex items-center gap-0.5">
                <button onClick={() => { setSearchOpen(s => !s); setSearchTerm(''); setSearchResults(null); }} className={`p-2 rounded-lg cursor-pointer ${searchOpen ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`} title="Search in this conversation"><Search size={16} /></button>
                <button onClick={() => setPrefs({ starred: !active.starred })} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer" title={active.starred ? 'Unstar' : 'Star'}><Star size={16} className={active.starred ? 'fill-amber-400 text-amber-500' : ''} /></button>
                <button onClick={() => setPrefs({ muted: !active.muted })} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer" title={active.muted ? 'Unmute' : 'Mute notifications'}>{active.muted ? <BellOff size={16} /> : <Bell size={16} />}</button>
                <button onClick={() => setShowDetails(s => !s)} className={`p-2 rounded-lg cursor-pointer ${showDetails ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`} title="Details, members, pinned and files"><Info size={16} /></button>
              </div>
            </header>

            {searchOpen && (
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input autoFocus value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={`Search in ${roomTitle(active)}`} className="w-full h-8 pl-8 pr-2 text-[13px] border border-gray-300 rounded bg-white outline-none focus:border-blue-500" />
                </div>
                {searchResults && (
                  <div className="mt-2 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded divide-y divide-gray-100">
                    {searchResults.length === 0 ? <div className="p-3 text-xs text-gray-500">No messages found.</div> : searchResults.map(r => (
                      <button key={r.id} onClick={() => { setSearchOpen(false); jumpTo(r.id); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <div className="text-[11px] text-gray-500">{r.sender} · {shortWhen(r.createdAt)}</div>
                        <div className="text-[13px] text-gray-800 line-clamp-2">{r.body || r.attachments.map(a => a.name).join(', ')}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {pinned.length > 0 && !searchOpen && (
              <button onClick={() => jumpTo(pinned[0].id)} className="px-4 py-1.5 border-b border-gray-200 bg-amber-50/60 text-left flex items-center gap-2 text-[12px] text-gray-700 hover:bg-amber-50 cursor-pointer">
                <Pin size={12} className="text-amber-600 shrink-0" /><span className="truncate"><strong>{pinned[0].sender}:</strong> {pinned[0].body || '📎 Attachment'}</span>
                {pinned.length > 1 && <span className="ml-auto shrink-0 text-[11px] text-gray-500">+{pinned.length - 1} more</span>}
              </button>
            )}

            <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 overflow-y-auto bg-[#f8fafc] px-4 py-3">
              {dragOver && <div className="absolute inset-2 z-20 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/80 flex items-center justify-center text-blue-700 font-medium pointer-events-none">Drop files to share</div>}
              {loadingMsgs && <div className="flex justify-center py-2"><Loader2 size={16} className="animate-spin text-gray-400" /></div>}
              {!loadingMsgs && !hasMore && messages.length > 0 && (
                <div className="text-center py-6">
                  <div className="inline-flex"><RoomIcon room={active} size="w-12 h-12" /></div>
                  <div className="mt-2 text-[14px] font-semibold text-gray-800">{active.kind === 'dm' ? `This is the start of your conversation with ${active.name}` : `Welcome to ${roomTitle(active)}`}</div>
                </div>
              )}
              {!loadingMsgs && messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                  <RoomIcon room={active} size="w-14 h-14" />
                  <div className="mt-3 text-[14px] font-semibold text-gray-800">{active.kind === 'dm' ? `Say hello to ${active.name}` : `Start the conversation in ${roomTitle(active)}`}</div>
                </div>
              )}
              {rendered.map(item => {
                if (item.type === 'day') return <div key={item.key} className="flex items-center gap-3 my-3"><div className="flex-1 h-px bg-gray-200" /><span className="text-[11px] font-medium text-gray-500 px-2 py-0.5 rounded-full bg-white border border-gray-200">{item.label}</span><div className="flex-1 h-px bg-gray-200" /></div>;
                if (item.type === 'unread') return <div key="unread" data-unread-marker className="flex items-center gap-3 my-2"><div className="flex-1 h-px bg-red-300" /><span className="text-[11px] font-semibold text-red-600">New messages</span><div className="flex-1 h-px bg-red-300" /></div>;
                const { m, compact } = item;
                if (m.kind === 'system') return <div key={m.id} data-mid={m.id} className="text-center text-[11px] text-gray-500 my-2">{m.body} · {timeOf(m.createdAt)}</div>;
                const mine = m.senderId === me?.id;
                const isAdmin = active.role === 'owner' || active.role === 'admin' || me?.isAdmin;
                const seen = active.kind === 'dm' && mine && m.id === myLastId && (active.otherReadId || 0) >= m.id;
                return (
                  <div key={m.id} data-mid={m.id} className={`group relative flex gap-2.5 px-2 -mx-2 rounded-lg ${compact ? 'mt-0.5' : 'mt-3'} ${highlight === m.id ? 'bg-amber-100/70' : 'hover:bg-white'}`}>
                    <div className="w-9 shrink-0">
                      {compact ? <span className="hidden group-hover:block text-[10px] text-gray-400 pt-1.5 text-right">{timeOf(m.createdAt)}</span>
                        : <Avatar name={m.sender} id={m.senderId} src={people.find(p => p.id === m.senderId)?.avatar} size="w-9 h-9" text="text-[12px]" />}
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      {!compact && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-semibold text-gray-900">{mine ? 'You' : m.sender}</span>
                          <span className="text-[11px] text-gray-400">{timeOf(m.createdAt)}</span>
                          {m.pinnedAt && <span className="text-[10px] text-amber-700 flex items-center gap-0.5"><Pin size={10} /> Pinned</span>}
                        </div>
                      )}
                      {m.replyTo && (
                        <button onClick={() => jumpTo(m.replyTo.id)} className="mt-0.5 mb-1 max-w-full flex items-start gap-1.5 pl-2 border-l-2 border-blue-300 text-left cursor-pointer">
                          <Reply size={11} className="text-blue-500 mt-0.5 shrink-0" />
                          <span className="text-[12px] text-gray-500 truncate"><strong className="text-gray-700">{m.replyTo.sender}</strong> {m.replyTo.body || (m.replyTo.hasAttachment ? '📎 Attachment' : '')}</span>
                        </button>
                      )}
                      {m.deletedAt ? <div className="text-[13px] italic text-gray-400">This message was deleted</div> : (
                        <>
                          {m.body && <RichText text={m.body} names={nameList} meName={me?.name} onTicket={openTicket} />}
                          <Attachments items={m.attachments} />
                          {m.editedAt && <span className="text-[10px] text-gray-400">(edited)</span>}
                        </>
                      )}
                      {Object.keys(m.reactions || {}).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(m.reactions).map(([emoji, ids]) => (
                            <button key={emoji} onClick={() => react(m, emoji)} title={ids.map(id => (id === me?.id ? 'You' : peopleById.get(id) || 'Someone')).join(', ')}
                              className={`h-6 px-1.5 rounded-full border text-[12px] flex items-center gap-1 cursor-pointer ${ids.includes(me?.id) ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                              <span>{emoji}</span><span className="text-[11px] font-medium">{ids.length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {seen && <div className="text-[10px] text-blue-600 mt-0.5 flex items-center gap-0.5"><CheckCheck size={12} /> Seen</div>}
                      {active.kind === 'dm' && mine && m.id === myLastId && !seen && <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-0.5"><Check size={12} /> Sent</div>}
                    </div>
                    {!m.deletedAt && (
                      <div className={`absolute -top-3 right-2 z-10 ${emojiFor === m.id ? 'flex' : 'hidden group-hover:flex'} items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-sm px-1 py-0.5`}>
                        {QUICK_REACTIONS.slice(0, 4).map(e => <button key={e} onClick={() => react(m, e)} className="w-7 h-7 rounded hover:bg-gray-100 text-[15px] cursor-pointer" title={`React ${e}`}>{e}</button>)}
                        <div className="relative">
                          <button onClick={() => setEmojiFor(emojiFor === m.id ? null : m.id)} className="w-7 h-7 rounded hover:bg-gray-100 text-gray-500 flex items-center justify-center cursor-pointer" title="More reactions"><Smile size={15} /></button>
                          {emojiFor === m.id && (
                            <div className="absolute right-0 top-8 z-30 w-64 p-2 bg-white border border-gray-200 rounded-lg shadow-xl grid grid-cols-8 gap-0.5">
                              {EMOJIS.map(e => <button key={e} onClick={() => react(m, e)} className="w-7 h-7 rounded hover:bg-gray-100 text-[16px] cursor-pointer">{e}</button>)}
                            </div>
                          )}
                        </div>
                        <button onClick={() => { setReplyTo(m); setEditing(null); inputRef.current?.focus(); }} className="w-7 h-7 rounded hover:bg-gray-100 text-gray-500 flex items-center justify-center cursor-pointer" title="Reply"><Reply size={15} /></button>
                        <button onClick={() => pin(m)} className="w-7 h-7 rounded hover:bg-gray-100 text-gray-500 flex items-center justify-center cursor-pointer" title={m.pinnedAt ? 'Unpin' : 'Pin'}><Pin size={14} className={m.pinnedAt ? 'fill-amber-400 text-amber-600' : ''} /></button>
                        {m.body && <button onClick={() => { navigator.clipboard.writeText(m.body).then(() => showSuccessToast('Copied')).catch(() => {}); }} className="w-7 h-7 rounded hover:bg-gray-100 text-gray-500 flex items-center justify-center cursor-pointer" title="Copy text"><Copy size={14} /></button>}
                        {mine && m.kind === 'text' && <button onClick={() => startEdit(m)} className="w-7 h-7 rounded hover:bg-gray-100 text-gray-500 flex items-center justify-center cursor-pointer" title="Edit"><Pencil size={14} /></button>}
                        {(mine || isAdmin) && <button onClick={() => remove(m)} className="w-7 h-7 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 flex items-center justify-center cursor-pointer" title="Delete"><Trash2 size={14} /></button>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Composer */}
            <div className="px-4 pb-4 pt-2 bg-[#f8fafc]">
              <div className="relative bg-white border border-gray-300 rounded-xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                {(replyTo || editing) && (
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 bg-gray-50 rounded-t-xl text-[12px]">
                    {editing ? <Pencil size={12} className="text-blue-600" /> : <Reply size={12} className="text-blue-600" />}
                    <span className="truncate text-gray-600">{editing ? 'Editing your message' : <>Replying to <strong>{replyTo.senderId === me?.id ? 'yourself' : replyTo.sender}</strong>: {replyTo.body || '📎 Attachment'}</>}</span>
                    <button onClick={() => { if (editing) setDraft(''); setEditing(null); setReplyTo(null); }} className="ml-auto text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Cancel"><X size={13} /></button>
                  </div>
                )}
                {pending.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-3 pt-2">
                    {pending.map(p => (
                      <div key={p.key} className="relative">
                        {p.isImage && (p.preview || p.url) ? <img src={p.preview || toAbsoluteFileUrl(p.url)} alt={p.name} className="h-16 w-16 rounded-lg object-cover border border-gray-200" />
                          : <div className="h-16 w-36 rounded-lg border border-gray-200 bg-gray-50 px-2 flex items-center gap-1.5 text-[11px] text-gray-700"><FileText size={14} className="shrink-0 text-blue-600" /><span className="truncate">{p.name}</span></div>}
                        {p.uploading && <div className="absolute inset-0 rounded-lg bg-white/70 flex items-center justify-center"><Loader2 size={14} className="animate-spin text-gray-500" /></div>}
                        <button onClick={() => setPending(ps => ps.filter(x => x.key !== p.key))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center cursor-pointer" aria-label="Remove"><X size={11} /></button>
                      </div>
                    ))}
                  </div>
                )}
                {mention && mentionOptions.length > 0 && (
                  <div className="absolute bottom-full left-2 mb-1 w-72 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-30">
                    {mentionOptions.map((o, i) => (
                      <button key={o.id} onMouseDown={e => { e.preventDefault(); pickMention(o); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-left cursor-pointer ${i === mentionIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                        {typeof o.id === 'number' ? <Avatar name={o.name} id={o.id} size="w-6 h-6" text="text-[9px]" /> : <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center"><AtSign size={12} /></span>}
                        <span className="min-w-0"><span className="block text-[13px] text-gray-900 truncate">{typeof o.id === 'number' ? o.name : `@${o.name}`}</span><span className="block text-[11px] text-gray-500 truncate">{o.sub}</span></span>
                      </button>
                    ))}
                  </div>
                )}
                <textarea ref={inputRef} value={draft} onChange={onDraftChange} onKeyDown={onKeyDown} rows={1}
                  onPaste={e => { const files = Array.from(e.clipboardData?.files || []); if (files.length) { e.preventDefault(); addFiles(files); } }}
                  placeholder={editing ? 'Edit your message' : `Message ${roomTitle(active)}`}
                  className="block w-full resize-none px-3 pt-2.5 pb-1 text-[14px] outline-none rounded-xl max-h-48 min-h-[44px] bg-transparent"
                  style={{ height: `${Math.min(192, 44 + Math.max(0, draft.split('\n').length - 1) * 20)}px` }} />
                <div className="flex items-center gap-1 px-2 pb-1.5">
                  <button onClick={() => fileRef.current?.click()} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer" title="Attach files or images"><Paperclip size={16} /></button>
                  <input ref={fileRef} type="file" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
                  <div className="relative">
                    <button onClick={() => setEmojiFor(emojiFor === 'composer' ? null : 'composer')} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer" title="Emoji"><Smile size={16} /></button>
                    {emojiFor === 'composer' && (
                      <div className="absolute left-0 bottom-9 z-30 w-72 p-2 bg-white border border-gray-200 rounded-lg shadow-xl grid grid-cols-8 gap-0.5">
                        {EMOJIS.map(e => <button key={e} onClick={() => { insertText(e); setEmojiFor(null); }} className="w-8 h-8 rounded hover:bg-gray-100 text-[17px] cursor-pointer">{e}</button>)}
                      </div>
                    )}
                  </div>
                  <button onClick={() => insertText('@')} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer" title="Mention someone"><AtSign size={16} /></button>
                  <button onClick={() => fileRef.current?.click()} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer" title="Share an image"><ImageIcon size={16} /></button>
                  <span className="ml-2 text-[11px] text-gray-400 hidden md:inline">Enter to send · Shift+Enter new line · **bold** `code` · ↑ edits your last message</span>
                  <button onClick={send} disabled={sending || (!draft.trim() && !pending.some(p => p.url))}
                    className="ml-auto h-8 px-3 rounded-lg bg-blue-600 text-white text-[13px] font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer">
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {editing ? 'Save' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {active && showDetails && (
        <RoomDetails room={active} me={me} people={people} pinned={pinned} onClose={() => setShowDetails(false)}
          onChanged={refreshRooms} onJump={jumpTo} onLeft={() => { setShowDetails(false); setActiveId(null); refreshRooms(); }} />
      )}

      {modal === 'dm' && (
        <Modal title="New message" onClose={() => setModal(null)}>
          <DmPicker people={people.filter(p => p.id !== me?.id)} onPick={openDm} />
        </Modal>
      )}
      {(modal === 'group' || modal === 'channel') && (
        <NewRoomModal kind={modal} people={people} meId={me?.id} onClose={() => setModal(null)}
          onCreated={(d) => { setRooms(d.rooms); setActiveId(d.roomId); setModal(null); }} />
      )}
      {modal === 'browse' && <BrowseChannelsModal onClose={() => setModal(null)} onOpen={async (id) => { await refreshRooms(); setActiveId(id); setModal(null); }} />}
    </div>
  );
}

function DmPicker({ people, onPick }) {
  const [term, setTerm] = useState('');
  const list = people.filter(p => !term || `${p.name} ${p.email} ${p.department} ${p.title}`.toLowerCase().includes(term.toLowerCase()));
  return (
    <div>
      <div className="relative mb-2">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input autoFocus value={term} onChange={e => setTerm(e.target.value)} placeholder="Search by name, email or department" className="w-full h-9 pl-8 pr-2 text-[13px] border border-gray-300 rounded outline-none focus:border-blue-500" />
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded">
        {list.length === 0 && <div className="p-3 text-xs text-gray-500">No one found.</div>}
        {list.map(p => (
          <button key={p.id} onClick={() => onPick(p.id)} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left cursor-pointer">
            <Avatar name={p.name} id={p.id} src={p.avatar} online={p.online} />
            <span className="min-w-0 flex-1"><span className="block text-[13px] text-gray-900 truncate">{p.name}</span><span className="block text-[11px] text-gray-500 truncate">{p.title || p.department}{p.email ? ` · ${p.email}` : ''}</span></span>
            {p.online && <span className="text-[11px] text-emerald-600">Online</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

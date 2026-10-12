import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, MessageSquare } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config/environment';
import { toAbsoluteFileUrl } from '../../utils/descriptionFiles';
import { getActiveChatRoom } from '../../utils/chatState';

/**
 * Chat notifications for the whole app, on every page while signed in.
 *
 * Listens to the chat's live stream and shows a system (desktop) notification for each new
 * message: who sent it, where, and a preview. Also for @mentions, reactions to your messages
 * and being added to a group or channel. Clicking one opens that conversation.
 *
 * Skipped: your own messages, the conversation you are looking at right now, and muted
 * conversations (unless you are mentioned). If desktop notifications are not allowed, the
 * same thing appears as a small card in the corner of the app instead.
 */

const PERMISSION_KEY = 'chatNotifyPromptDismissed';
const DEPT_SEGMENTS = ['it', 'marketing', 'sales', 'hr', 'seo-gmb', 'deals', 'leads', 'projects'];

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const plain = (text) => String(text || '')
  .replace(/```[\s\S]*?```/g, '[code]')
  .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/\b_([^_]+)_\b/g, '$1')
  .replace(/\s+/g, ' ').trim();
const preview = (msg) => {
  const text = plain(msg.body);
  const att = msg.attachments || [];
  if (text) return text.length > 140 ? `${text.slice(0, 140)}…` : text;
  if (att.length === 1) return att[0].isImage ? '📷 Photo' : `📎 ${att[0].name}`;
  if (att.length > 1) return `📎 ${att.length} files`;
  return 'New message';
};
const roomLabel = (room) => (room ? (room.kind === 'channel' ? `#${room.name}` : room.name) : '');

// A short, quiet two-tone chime.
const chime = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [[880, 0], [1320, 0.09]].forEach(([freq, at]) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.18);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + 0.2);
    });
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch (e) { /* audio unavailable */ }
};

export default function ChatNotifier() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [permission, setPermission] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));
  const [promptHidden, setPromptHidden] = useState(() => { try { return localStorage.getItem(PERMISSION_KEY) === '1'; } catch (e) { return false; } });
  const rooms = useRef(new Map());
  const people = useRef(new Map());
  const userRef = useRef(user);
  userRef.current = user;

  // Where the chat lives for this person (keeps them in their own department's section).
  const chatPath = useCallback((roomId) => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const u = userRef.current;
    if (DEPT_SEGMENTS.includes(parts[0]) && parts.length >= 3) return `/${parts[0]}/${parts[1]}/${parts[2]}/chat?room=${roomId}`;
    const dept = String(u?.department || '').toLowerCase();
    const seg = dept.includes('marketing') ? 'marketing' : dept.includes('sales') ? 'sales' : dept.includes('hr') ? 'hr' : 'it';
    return `/${seg}/${slug(u?.role || 'employee')}/${slug(u?.username || u?.first_name || 'me')}/chat?room=${roomId}`;
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/chat/rooms`);
      if (!r.ok) return;
      const d = await r.json();
      rooms.current = new Map((d.rooms || []).map(x => [x.id, x]));
    } catch (e) { /* offline */ }
  }, []);

  const notify = useCallback(({ title, body, roomId, icon, tag }) => {
    const open = () => { window.focus(); navigate(chatPath(roomId)); };
    chime();
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, { body, icon: icon || '/logo192.png', badge: '/favicon.ico', tag: tag || `chat-room-${roomId}`, renotify: true });
        n.onclick = () => { open(); n.close(); };
        return;
      } catch (e) { /* fall back to the in-app card */ }
    }
    const id = `${Date.now()}-${Math.random()}`;
    setCards(cs => [...cs.slice(-3), { id, title, body, icon, roomId }]);
    setTimeout(() => setCards(cs => cs.filter(c => c.id !== id)), 8000);
  }, [navigate, chatPath]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let closed = false;
    loadRooms();
    fetch(`${API_BASE_URL}/chat/bootstrap`).then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.people) people.current = new Map(d.people.map(p => [p.id, p])); }).catch(() => {});

    const es = new EventSource(`${API_BASE_URL}/chat/stream`, { withCredentials: true });
    const looking = (roomId) => getActiveChatRoom() === Number(roomId) && document.visibilityState === 'visible' && document.hasFocus();
    const avatarOf = (id) => { const a = people.current.get(Number(id))?.avatar; return a ? toAbsoluteFileUrl(a) : null; };

    es.addEventListener('message', async (e) => {
      const msg = JSON.parse(e.data);
      const me = Number(userRef.current?.id);
      if (msg.senderId === me || msg.kind === 'system' || looking(msg.roomId)) return;
      if (!rooms.current.has(msg.roomId)) await loadRooms();
      if (closed) return;
      const room = rooms.current.get(msg.roomId);
      const mentioned = (msg.mentions || []).includes(me) || /(^|\s)@(everyone|here)\b/i.test(msg.body || '');
      if (room?.muted && !mentioned) return;
      const where = roomLabel(room);
      const title = mentioned
        ? `${msg.sender} mentioned you${room && room.kind !== 'dm' ? ` in ${where}` : ''}`
        : room?.kind === 'dm' || !room ? msg.sender : `${msg.sender} · ${where}`;
      const body = msg.replyTo ? `↪ ${preview(msg)}` : preview(msg);
      notify({ title, body, roomId: msg.roomId, icon: avatarOf(msg.senderId) });
    });

    es.addEventListener('reaction', (e) => {
      const d = JSON.parse(e.data);
      if (looking(d.roomId)) return;
      const room = rooms.current.get(d.roomId);
      if (room?.muted) return;
      const what = d.preview ? `“${plain(d.preview).slice(0, 100)}”` : d.hasAttachment ? 'your attachment' : 'your message';
      notify({ title: `${d.by} reacted ${d.emoji}`, body: `to ${what}${room && room.kind !== 'dm' ? ` in ${roomLabel(room)}` : ''}`, roomId: d.roomId, icon: avatarOf(d.byId), tag: `chat-reaction-${d.messageId}` });
    });

    es.addEventListener('added', async (e) => {
      const d = JSON.parse(e.data);
      await loadRooms();
      notify({ title: `${d.by} added you to ${d.kind === 'channel' ? `#${d.name}` : d.name}`, body: 'Open the conversation to catch up.', roomId: d.roomId, tag: `chat-added-${d.roomId}` });
    });

    es.addEventListener('rooms', () => loadRooms());
    // Muting / starring happens on the chat page; pick it up when coming back.
    const onFocus = () => loadRooms();
    window.addEventListener('focus', onFocus);
    return () => { closed = true; es.close(); window.removeEventListener('focus', onFocus); };
  }, [user?.id, loadRooms, notify]);

  const enable = async () => {
    try {
      const p = await Notification.requestPermission();
      setPermission(p);
      if (p !== 'default') { setPromptHidden(true); try { localStorage.setItem(PERMISSION_KEY, '1'); } catch (e) { /* storage unavailable */ } }
    } catch (e) { setPromptHidden(true); }
  };
  const dismiss = () => { setPromptHidden(true); try { localStorage.setItem(PERMISSION_KEY, '1'); } catch (e) { /* storage unavailable */ } };

  if (!user?.id) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[2500] flex flex-col items-end gap-2 pointer-events-none">
      {cards.map(c => (
        <button key={c.id} onClick={() => { setCards(cs => cs.filter(x => x.id !== c.id)); navigate(chatPath(c.roomId)); }}
          className="pointer-events-auto w-80 text-left bg-white border border-gray-200 rounded-xl shadow-xl p-3 flex gap-3 cursor-pointer hover:border-blue-300">
          {c.icon ? <img src={c.icon} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
            : <span className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0"><MessageSquare size={16} /></span>}
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-gray-900 truncate">{c.title}</span>
            <span className="block text-[12px] text-gray-600 line-clamp-2">{c.body}</span>
          </span>
        </button>
      ))}
      {permission === 'default' && !promptHidden && (
        <div className="pointer-events-auto w-80 bg-white border border-gray-200 rounded-xl shadow-xl p-3">
          <div className="flex items-start gap-2.5">
            <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Bell size={15} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-gray-900">Get chat notifications</div>
              <div className="text-[12px] text-gray-600">See who messaged you and a preview, even when this tab is in the background.</div>
              <div className="flex gap-2 mt-2">
                <button onClick={enable} className="h-7 px-3 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">Turn on</button>
                <button onClick={dismiss} className="h-7 px-3 text-xs rounded border border-gray-300 hover:bg-gray-50 cursor-pointer">Not now</button>
              </div>
            </div>
            <button onClick={dismiss} className="text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Close"><X size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

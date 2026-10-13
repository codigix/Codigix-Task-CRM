import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, MessageSquare, Share, PlusSquare, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config/environment';
import { toAbsoluteFileUrl } from '../../utils/descriptionFiles';
import { getActiveChatRoom } from '../../utils/chatState';
import {
  enablePush, syncPush, pushActiveFor, needsHomeScreen, pushSupported, permission as pushPermission,
  showLocalNotification, sendTestPush, isIOS
} from '../../utils/push';

/**
 * Chat notifications for the whole app, on every page while signed in.
 *
 * Notification bar (phone / desktop): through Web Push, sent by the server for new messages,
 * @mentions, reactions to your messages and being added to a group or channel, with who
 * sent it and a preview. Works with the CRM in the background or closed. On iPhone/iPad this
 * needs the CRM added to the Home Screen (iOS 16.4+); the card below walks people through it.
 *
 * Without push (not turned on / not supported): the open app still shows a system
 * notification where the browser allows it, or a small card in the corner.
 *
 * Skipped: your own messages, the conversation on screen, muted conversations (unless you
 * are mentioned).
 */

const PROMPT_KEY = 'chatPushPromptDismissed';
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
    setTimeout(() => ctx.close().catch(() => { }), 600);
  } catch (e) { /* audio unavailable */ }
};

export default function ChatNotifier() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [perm, setPerm] = useState(pushPermission());
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [promptHidden, setPromptHidden] = useState(() => { try { return localStorage.getItem(PROMPT_KEY) === '1'; } catch (e) { return false; } });
  const rooms = useRef(new Map());
  const people = useRef(new Map());
  const userRef = useRef(user);
  const pushOnRef = useRef(false);
  userRef.current = user;
  pushOnRef.current = pushOn;

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

  const addCard = useCallback((title, body, icon, roomId) => {
    const id = `${Date.now()}-${Math.random()}`;
    setCards(cs => [...cs.slice(-3), { id, title, body, icon, roomId }]);
    setTimeout(() => setCards(cs => cs.filter(c => c.id !== id)), 8000);
  }, []);

  const notify = useCallback(async ({ title, body, roomId, icon, tag }) => {
    if (document.visibilityState === 'visible') chime();
    // With push on, the server's push puts it in the notification bar; nothing more to do.
    if (pushOnRef.current) return;
    const shown = await showLocalNotification(title, { body, icon: icon || '/logo192.png', badge: '/logo192.png', tag: tag || `chat-room-${roomId}`, renotify: true, data: { url: chatPath(roomId), roomId } });
    if (!shown) addCard(title, body, icon, roomId);
  }, [chatPath, addCard]);

  // Keep this device registered for push for whoever is signed in.
  useEffect(() => {
    if (!user?.id) return;
    syncPush(user.id).then(ok => setPushOn(ok || pushActiveFor(user.id)));
  }, [user?.id]);

  // A notification tapped while the app is open (some browsers hand the link to the page).
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const onMsg = (e) => {
      if (e.data?.type === 'open-url' && e.data.url) {
        try { const u = new URL(e.data.url); navigate(`${u.pathname}${u.search}`); } catch (err) { /* ignore */ }
      }
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    return () => navigator.serviceWorker.removeEventListener('message', onMsg);
  }, [navigate]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let closed = false;
    loadRooms();
    fetch(`${API_BASE_URL}/chat/bootstrap`).then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.people) people.current = new Map(d.people.map(p => [p.id, p])); }).catch(() => { });

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
      notify({ title, body: msg.replyTo ? `↪ ${preview(msg)}` : preview(msg), roomId: msg.roomId, icon: avatarOf(msg.senderId) });
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
    const onFocus = () => loadRooms();
    window.addEventListener('focus', onFocus);
    return () => { closed = true; es.close(); window.removeEventListener('focus', onFocus); };
  }, [user?.id, loadRooms, notify]);

  const hidePrompt = () => { setPromptHidden(true); try { localStorage.setItem(PROMPT_KEY, '1'); } catch (e) { /* storage unavailable */ } };
  const turnOn = async () => {
    setBusy(true); setNote('');
    try {
      const ok = await enablePush(user?.id);
      setPerm(pushPermission());
      setPushOn(ok);
      if (ok) {
        const sent = await sendTestPush().catch(() => 0);
        setNote(sent ? 'Done. A test notification is on its way.' : 'Notifications are on.');
        setTimeout(hidePrompt, 4000);
      } else {
        setNote(pushPermission() === 'denied' ? 'Notifications are blocked. Allow them for this site in your browser settings.' : '');
        if (pushPermission() === 'denied') setTimeout(hidePrompt, 6000);
      }
    } catch (e) {
      setNote(e.message);
    } finally { setBusy(false); }
  };

  if (!user?.id) return null;
  const showIOSGuide = needsHomeScreen() && !promptHidden;
  const showTurnOn = !needsHomeScreen() && pushSupported() && !pushOn && perm !== 'denied' && !promptHidden;

  return (
    <div className="fixed bottom-4 right-4 z-[2500] flex flex-col items-end gap-2 pointer-events-none max-w-[calc(100vw-2rem)]">
      {cards.map(c => (
        <button key={c.id} onClick={() => { setCards(cs => cs.filter(x => x.id !== c.id)); navigate(chatPath(c.roomId)); }}
          className="pointer-events-auto w-80 max-w-full text-left bg-white border border-gray-200 rounded-xl shadow-xl p-3 flex gap-3 cursor-pointer hover:border-blue-300">
          {c.icon ? <img src={c.icon} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
            : <span className="w-9 h-9 rounded bg-red-600 text-white flex items-center justify-center shrink-0"><MessageSquare size={16} /></span>}
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-gray-900 truncate">{c.title}</span>
            <span className="block text-[12px] text-gray-600 line-clamp-2">{c.body}</span>
          </span>
        </button>
      ))}

      {showIOSGuide && (
        <div className="pointer-events-auto w-80 max-w-full bg-white border border-gray-200 rounded-xl shadow-xl p-3">
          <div className="flex items-start gap-2.5">
            <span className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Bell size={15} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-gray-900">Chat notifications on iPhone</div>
              <ol className="text-[12px] text-gray-600 mt-1 space-y-1 list-decimal pl-4">
                <li>Tap <Share size={12} className="inline -mt-0.5" /> <strong>Share</strong> in Safari.</li>
                <li>Choose <PlusSquare size={12} className="inline -mt-0.5" /> <strong>Add to Home Screen</strong>.</li>
                <li>Open <strong>Codigix</strong> from the Home Screen and tap <strong>Turn on</strong>.</li>
              </ol>
              <p className="text-[11px] text-gray-500 mt-1">Needs iOS 16.4 or newer. Safari tabs cannot show notifications.</p>
            </div>
            <button onClick={hidePrompt} className="text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Close"><X size={14} /></button>
          </div>
        </div>
      )}

      {showTurnOn && (
        <div className="pointer-events-auto w-80 max-w-full bg-white border border-gray-200 rounded-xl shadow-xl p-3">
          <div className="flex items-start gap-2.5">
            <span className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Bell size={15} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-gray-900">Get chat notifications</div>
              <div className="text-[12px] text-gray-600">Who messaged you and a preview, in your {isIOS() ? 'iPhone' : 'phone or computer'}'s notification bar, even when the CRM is closed.</div>
              {note && <div className="text-[12px] text-blue-700 mt-1">{note}</div>}
              <div className="flex gap-2 mt-2">
                <button onClick={turnOn} disabled={busy} className="h-7 px-3 text-xs font-medium rounded bg-red-600 text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer flex items-center gap-1">{busy && <Loader2 size={12} className="animate-spin" />} Turn on</button>
                <button onClick={hidePrompt} className="h-7 px-3 text-xs rounded border border-gray-300 hover:bg-gray-50 cursor-pointer">Not now</button>
              </div>
            </div>
            <button onClick={hidePrompt} className="text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Close"><X size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

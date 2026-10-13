import { API_BASE_URL } from '../config/environment';

/**
 * Live updates for the whole app (server-sent events from /api/live/stream).
 * The server only says WHAT changed; each page reloads its own data through the normal API.
 *
 * A browser only allows a handful of open streams per site, and chat already holds one per tab. So when
 * several tabs are open, ONE of them (the "leader", chosen with the Web Locks API) holds the connection and
 * passes every event to the other tabs through a BroadcastChannel. If the leader tab closes, another takes
 * over. Browsers without those APIs simply open one connection per tab.
 */
const subscribers = new Set(); // { topics: Set<string>, cb }
let source = null;
let wasDown = false;
let channel = null;
let opened = false;
let leaderAbort = null;
let leaderRelease = null;

const dispatch = (event) => {
  // topic "*" (sent after a reconnect) is for everyone, whatever they listen to
  subscribers.forEach((s) => { if (event.topic === '*' || s.topics.has('*') || s.topics.has(event.topic)) { try { s.cb(event); } catch (e) { /* one page's error must not stop the others */ } } });
};
// Deliver here and hand it to the other tabs.
const publishAll = (event) => {
  dispatch(event);
  if (channel) { try { channel.postMessage(event); } catch (e) { /* channel closed */ } }
};

const startSource = () => {
  if (source || typeof EventSource === 'undefined') return;
  source = new EventSource(`${API_BASE_URL}/live/stream`, { withCredentials: true });
  source.addEventListener('change', (e) => {
    try { publishAll(JSON.parse(e.data)); } catch (err) { /* malformed frame */ }
  });
  // After a dropped connection, changes may have been missed: tell every page to reload once it is back.
  source.addEventListener('hello', () => {
    if (wasDown) { wasDown = false; publishAll({ topic: '*', reconnected: true }); }
  });
  source.onerror = () => { wasDown = true; };
};

const stopSource = () => {
  if (source) { source.close(); source = null; }
};

const open = () => {
  if (opened) return;
  opened = true;
  const canShare = typeof BroadcastChannel !== 'undefined' && typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function';
  if (!canShare) { startSource(); return; }

  channel = new BroadcastChannel('crm-live-v1');
  channel.onmessage = (m) => dispatch(m.data);
  leaderAbort = new AbortController();
  // Waits until no other tab is the leader; held until this tab stops listening or closes.
  navigator.locks.request('crm-live-leader', { signal: leaderAbort.signal }, () => new Promise((resolve) => {
    startSource();
    leaderRelease = () => { stopSource(); resolve(); };
  })).catch(() => { /* aborted while waiting: another tab is the leader */ });
};

const close = () => {
  opened = false;
  if (leaderAbort) { leaderAbort.abort(); leaderAbort = null; }
  if (leaderRelease) { leaderRelease(); leaderRelease = null; } else stopSource();
  if (channel) { channel.close(); channel = null; }
};

/** Subscribe to areas of the app. Returns an unsubscribe function. */
export const subscribeLive = (topics, cb) => {
  const entry = { topics: new Set(topics), cb };
  subscribers.add(entry);
  open();
  return () => {
    subscribers.delete(entry);
    if (subscribers.size === 0) close();
  };
};

import { API_BASE_URL } from '../config/environment';

/**
 * ONE live connection per browser for chat and for "something changed" updates.
 *
 * Why: a browser allows only about 6 open connections to a site (HTTP/1.1). Chat used to open two per tab and live
 * updates a third, so a few tabs starved every other request and chat sat on "connecting". Now one tab (chosen with
 * the Web Locks API) holds the stream and relays every event to the other tabs through a BroadcastChannel.
 *
 * Reliability: if the connection fails or the server answers with an error, the browser gives up by itself
 * (EventSource closes for good). This reconnects with a growing delay, tells the pages the status, and after
 * a drop tells every page to reload what it shows ("resync") so nothing missed is lost.
 */
const EVENTS = ['hello', 'message', 'message:update', 'read', 'typing', 'presence', 'reaction', 'added', 'rooms', 'notify', 'change'];

const subs = new Map();      // event name -> Set<callback(rawDataString)>
const statusCbs = new Set(); // callback('connected' | 'connecting')
let status = 'connecting';
let source = null;
let channel = null;
let opened = false;
let wasDown = false;
let retry = 0;
let retryTimer = null;
let leaderAbort = null;
let leaderRelease = null;
let subscriberCount = 0;

const deliver = (name, raw) => { (subs.get(name) || []).forEach((cb) => { try { cb(raw); } catch (e) { /* one listener must not stop the rest */ } }); };
const setStatus = (s) => { if (status === s) return; status = s; statusCbs.forEach((cb) => { try { cb(s); } catch (e) { /* ignore */ } }); };
const relay = (msg) => { if (channel) { try { channel.postMessage(msg); } catch (e) { /* channel closed */ } } };

const startSource = () => {
  clearTimeout(retryTimer);
  if (source || typeof EventSource === 'undefined') return;
  source = new EventSource(`${API_BASE_URL}/chat/stream`, { withCredentials: true });
  EVENTS.forEach((name) => source.addEventListener(name, (e) => {
    if (name === 'hello' && wasDown) { wasDown = false; deliver('resync', ''); relay({ t: 'ev', name: 'resync', raw: '' }); }
    deliver(name, e.data); relay({ t: 'ev', name, raw: e.data });
  }));
  source.onopen = () => { retry = 0; setStatus('connected'); relay({ t: 'status', status: 'connected' }); };
  source.onerror = () => {
    wasDown = true; setStatus('connecting'); relay({ t: 'status', status: 'connecting' });
    // The browser retries by itself while the connection is merely lost; once it has closed the stream
    // (for example after a 502 or 401 from the server or a proxy) it never will, so do it here.
    if (source && source.readyState === 2) {
      source.close(); source = null;
      retry += 1;
      retryTimer = setTimeout(startSource, Math.min(30000, 1000 * 2 ** Math.min(retry, 5)));
    }
  };
};
const stopSource = () => { clearTimeout(retryTimer); if (source) { source.close(); source = null; } };

// Coming back to a tab that sat in the background: make sure the connection is alive, and refresh what it shows.
const onVisible = () => {
  if (document.visibilityState !== 'visible' || !opened) return;
  if (leaderRelease && !source) { retry = 0; startSource(); }
  if (wasDown || status !== 'connected') deliver('resync', '');
};

const open = () => {
  if (opened) return;
  opened = true;
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onVisible);
  const canShare = typeof BroadcastChannel !== 'undefined' && typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function';
  if (!canShare) { leaderRelease = stopSource; startSource(); return; }
  channel = new BroadcastChannel('crm-stream-v1');
  channel.onmessage = (m) => {
    const d = m.data || {};
    if (d.t === 'ev') deliver(d.name, d.raw);
    else if (d.t === 'status') setStatus(d.status);
    else if (d.t === 'ask' && leaderRelease) relay({ t: 'status', status });
  };
  relay({ t: 'ask' });
  leaderAbort = new AbortController();
  // Held for as long as this tab keeps the stream; when the tab closes another tab takes over.
  navigator.locks.request('crm-stream-leader', { signal: leaderAbort.signal }, () => new Promise((resolve) => {
    startSource();
    leaderRelease = () => { stopSource(); resolve(); };
  })).catch(() => { /* aborted while waiting: another tab is the leader */ });
};

const close = () => {
  opened = false;
  document.removeEventListener('visibilitychange', onVisible);
  window.removeEventListener('online', onVisible);
  if (leaderAbort) { leaderAbort.abort(); leaderAbort = null; }
  if (leaderRelease) { leaderRelease(); leaderRelease = null; } else stopSource();
  if (channel) { channel.close(); channel = null; }
  status = 'connecting'; wasDown = false; retry = 0;
};

const retain = () => { subscriberCount += 1; open(); };
const release = () => { subscriberCount = Math.max(0, subscriberCount - 1); if (subscriberCount === 0) close(); };

/** Listen to one event ('message', 'presence', 'change', 'resync', ...). callback receives the raw data string. Returns unsubscribe. */
export const subscribeStream = (name, cb) => {
  if (!subs.has(name)) subs.set(name, new Set());
  subs.get(name).add(cb); retain();
  return () => { const set = subs.get(name); if (set) set.delete(cb); release(); };
};

/** Watch the connection state. Calls back at once with the current state. Returns unsubscribe. */
export const watchStreamStatus = (cb) => { statusCbs.add(cb); retain(); cb(status); return () => { statusCbs.delete(cb); release(); }; };

/**
 * Drop-in for `new EventSource(...)` in code written for it: addEventListener(name, handler), onopen, onerror, close().
 * Handlers get { data } like the real thing.
 */
export const openChatStream = () => {
  const unsubs = [];
  const api = {
    onopen: null, onerror: null,
    addEventListener(name, handler) { unsubs.push(subscribeStream(name, (raw) => handler({ data: raw }))); },
    close() { unsubs.splice(0).forEach((u) => u()); stopWatch(); }
  };
  const stopWatch = watchStreamStatus((s) => {
    if (s === 'connected' && api.onopen) api.onopen();
    if (s === 'connecting' && api.onerror && status !== 'connected') api.onerror();
  });
  return api;
};

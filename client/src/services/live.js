import { subscribeStream } from './chatStream';

/**
 * Live "something changed" updates. They travel on the same single stream as chat (see chatStream.js), so a tab
 * opens no extra connection. The server only says WHAT changed; each page reloads its own data through the normal API.
 */
export const subscribeLive = (topics, cb) => {
  const wanted = new Set(topics);
  const unChange = subscribeStream('change', (raw) => {
    let event; try { event = JSON.parse(raw); } catch (e) { return; }
    if (wanted.has('*') || wanted.has(event.topic)) cb(event);
  });
  // After a dropped connection changes may have been missed: every page reloads once.
  const unResync = subscribeStream('resync', () => cb({ topic: '*', reconnected: true }));
  return () => { unChange(); unResync(); };
};

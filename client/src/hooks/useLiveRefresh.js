import { useEffect, useRef } from 'react';
import { subscribeLive } from '../services/live';

/**
 * Reload a page's data when something it shows changes anywhere in the app.
 *
 *   useLiveRefresh(['work'], () => loadTickets());
 *
 * topics   what to listen to: 'work' (tickets, tasks, sprints, projects, time), 'meetings', 'notifications',
 *          or any other area name; '*' for everything
 * refresh  the page's own load function. Give it one that does not show a loading spinner, so the page
 *          updates quietly. It runs once after a burst of changes (wait), and at least every maxWait while
 *          changes keep arriving. It never runs while the tab is hidden; it runs when the tab is shown again.
 */
export default function useLiveRefresh(topics, refresh, { wait = 700, maxWait = 5000, enabled = true } = {}) {
  const latest = useRef(refresh);
  latest.current = refresh;
  const topicsKey = Array.isArray(topics) ? topics.join('|') : String(topics);

  useEffect(() => {
    if (!enabled) return undefined;
    let timer = null;
    let burstStart = 0;
    let stale = false;

    const run = () => {
      clearTimeout(timer); timer = null; burstStart = 0;
      if (document.visibilityState === 'hidden') { stale = true; return; }
      stale = false;
      try {
        const result = latest.current && latest.current();
        if (result && typeof result.catch === 'function') result.catch(() => { });
      } catch (e) { /* the page reports its own errors */ }
    };
    const onEvent = () => {
      const now = Date.now();
      if (!burstStart) burstStart = now;
      clearTimeout(timer);
      timer = setTimeout(run, Math.max(0, Math.min(wait, burstStart + maxWait - now)));
    };
    const onVisible = () => { if (document.visibilityState === 'visible' && stale) run(); };

    const unsubscribe = subscribeLive(topicsKey.split('|'), onEvent);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubscribe();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [topicsKey, wait, maxWait, enabled]);
}

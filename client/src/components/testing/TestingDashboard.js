import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Circle, ExternalLink, Search, FlaskConical, RotateCcw, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { TESTING_GROUPS, TESTING_PAGE_COUNT, resolveTestingPath } from '../../config/testingPages';

/**
 * Testing workspace: every page hidden from the sidebars, in one place, with a checklist so
 * each can be opened and marked as working or broken. The checklist is kept in this browser.
 */

const STATUS = {
  '': { label: 'Not checked', icon: Circle, chip: 'bg-gray-100 text-gray-600 ring-gray-200' },
  ok: { label: 'Works', icon: CheckCircle2, chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  issue: { label: 'Has issues', icon: AlertTriangle, chip: 'bg-red-50 text-red-700 ring-red-200' }
};

const storeKey = (user) => `crm-testing-checklist:${user?.id || user?.username || 'me'}`;
const loadChecks = (user) => {
  try { return JSON.parse(localStorage.getItem(storeKey(user)) || '{}') || {}; } catch (e) { return {}; }
};
const saveChecks = (user, checks) => {
  try { localStorage.setItem(storeKey(user), JSON.stringify(checks)); } catch (e) { /* private window: keep in memory only */ }
};

export default function TestingDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checks, setChecks] = useState(() => loadChecks(user)); // template path -> { status, note, at }
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const update = (path, patch) => setChecks(prev => {
    const next = { ...prev, [path]: { ...(prev[path] || {}), ...patch, at: new Date().toISOString() } };
    saveChecks(user, next);
    return next;
  });
  const resetAll = () => {
    if (!window.confirm('Clear every check and note on this list?')) return;
    setChecks({}); saveChecks(user, {});
  };

  const counts = useMemo(() => {
    const c = { ok: 0, issue: 0, none: 0 };
    TESTING_GROUPS.forEach(g => g.pages.forEach(p => {
      const s = checks[p.path]?.status || '';
      if (s === 'ok') c.ok += 1; else if (s === 'issue') c.issue += 1; else c.none += 1;
    }));
    return c;
  }, [checks]);

  const needle = q.trim().toLowerCase();
  const groups = TESTING_GROUPS
    .filter(g => group === 'all' || g.id === group)
    .map(g => ({
      ...g,
      pages: g.pages.filter(p => {
        const s = checks[p.path]?.status || '';
        if (statusFilter === 'none' && s) return false;
        if (statusFilter !== 'all' && statusFilter !== 'none' && s !== statusFilter) return false;
        return !needle || p.label.toLowerCase().includes(needle) || p.path.toLowerCase().includes(needle) || g.label.toLowerCase().includes(needle);
      })
    }))
    .filter(g => g.pages.length);

  const done = counts.ok + counts.issue;
  const progress = Math.round((done / TESTING_PAGE_COUNT) * 100);

  return (
    <div className="p-4 bg-[#F7F8F9] min-h-screen">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl text-gray-900 flex items-center gap-2"><FlaskConical size={20} className="text-violet-600" /> Testing Dashboard</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Marketing and SEO &amp; GMB pages hidden from the sidebars, in one place. Open each one, then mark it as working or broken.</p>
        </div>
        <button onClick={resetAll} className="h-8 px-3 flex items-center gap-1.5 rounded border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
          <RotateCcw size={13} /> Reset checklist
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded p-3">
          <div className="text-[11px] text-gray-500 font-medium">Marketing pages to check</div>
          <div className="text-2xl font-semibold text-gray-900 tabular-nums mt-1">{TESTING_PAGE_COUNT}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">{TESTING_GROUPS.length} groups</div>
        </div>
        <button onClick={() => setStatusFilter(statusFilter === 'ok' ? 'all' : 'ok')} className={`text-left bg-white border rounded p-3 cursor-pointer ${statusFilter === 'ok' ? 'border-emerald-400 ring-1 ring-emerald-300' : 'border-gray-200 hover:border-gray-300'}`}>
          <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-600" /> Works</div>
          <div className="text-2xl font-semibold text-emerald-700 tabular-nums mt-1">{counts.ok}</div>
        </button>
        <button onClick={() => setStatusFilter(statusFilter === 'issue' ? 'all' : 'issue')} className={`text-left bg-white border rounded p-3 cursor-pointer ${statusFilter === 'issue' ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200 hover:border-gray-300'}`}>
          <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1"><AlertTriangle size={12} className="text-red-600" /> Has issues</div>
          <div className="text-2xl font-semibold text-red-700 tabular-nums mt-1">{counts.issue}</div>
        </button>
        <button onClick={() => setStatusFilter(statusFilter === 'none' ? 'all' : 'none')} className={`text-left bg-white border rounded p-3 cursor-pointer ${statusFilter === 'none' ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200 hover:border-gray-300'}`}>
          <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1"><Circle size={12} className="text-gray-400" /> Not checked</div>
          <div className="text-2xl font-semibold text-gray-900 tabular-nums mt-1">{counts.none}</div>
          <div className="mt-1.5 h-1.5 bg-gray-100 rounded overflow-hidden"><div className="h-full bg-violet-500 rounded" style={{ width: `${progress}%` }} /></div>
          <div className="text-[11px] text-gray-500 mt-0.5">{progress}% checked</div>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search pages..."
            className="h-8 w-64 pl-8 pr-2 text-[13px] border border-gray-300 rounded bg-white outline-none focus:border-blue-500" />
        </div>
        <div className="flex flex-wrap items-center gap-1 bg-white border border-gray-200 rounded p-0.5">
          {[{ id: 'all', label: 'All' }, ...TESTING_GROUPS].map(g => (
            <button key={g.id} onClick={() => setGroup(g.id)}
              className={`px-2.5 h-7 text-xs font-medium rounded cursor-pointer ${group === g.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {g.label}
            </button>
          ))}
        </div>
        {statusFilter !== 'all' && (
          <button onClick={() => setStatusFilter('all')} className="text-xs text-blue-600 hover:underline cursor-pointer">Show all statuses</button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="py-14 text-center text-sm text-gray-400 bg-white border border-gray-200 rounded">No pages match.</div>
      ) : groups.map(g => {
        const all = TESTING_GROUPS.find(x => x.id === g.id).pages;
        const gDone = all.filter(p => checks[p.path]?.status).length;
        return (
          <section key={g.id} className="bg-white border border-gray-200 rounded mb-4">
            <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-100">
              <div className="min-w-0">
                <h2 className={`text-sm font-semibold ${g.id === 'missing' ? 'text-red-700' : 'text-gray-900'}`}>{g.label}</h2>
                <p className="text-[11px] text-gray-500">{g.note}</p>
              </div>
              <span className="text-[11px] text-gray-500 tabular-nums">{gDone}/{all.length} checked</span>
            </header>
            <div className="divide-y divide-gray-100">
              {g.pages.map(p => {
                const c = checks[p.path] || {};
                const st = STATUS[c.status || ''];
                const Icon = st.icon;
                const url = resolveTestingPath(p.path, user);
                return (
                  <div key={p.path} className="flex flex-wrap items-center gap-3 px-4 py-2 text-[13px]">
                    <span className={`shrink-0 w-24 flex items-center justify-center gap-1 px-1.5 py-0.5 rounded ring-1 ring-inset text-[10px] font-medium ${st.chip}`}>
                      <Icon size={11} /> {st.label}
                    </span>
                    <div className="flex-1 min-w-[200px]">
                      <button onClick={() => navigate(url)} className="text-gray-900 font-medium hover:text-blue-700 hover:underline cursor-pointer text-left">{p.label}</button>
                      {p.missing && <span className="ml-2 text-[10px] text-red-600 uppercase tracking-wide">no page built</span>}
                      <div className="font-mono text-[11px] text-gray-400 truncate">{url}</div>
                    </div>
                    <input
                      value={c.note || ''}
                      onChange={e => update(p.path, { note: e.target.value })}
                      placeholder="Note (what's wrong)..."
                      className="w-56 h-7 px-2 text-xs border border-gray-200 rounded outline-none focus:border-blue-500"
                    />
                    <div className="flex items-center gap-1">
                      <button onClick={() => update(p.path, { status: c.status === 'ok' ? '' : 'ok' })} title="Mark as working"
                        className={`h-7 w-7 flex items-center justify-center rounded border cursor-pointer ${c.status === 'ok' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'}`}>
                        <CheckCircle2 size={14} />
                      </button>
                      <button onClick={() => update(p.path, { status: c.status === 'issue' ? '' : 'issue' })} title="Mark as having issues"
                        className={`h-7 w-7 flex items-center justify-center rounded border cursor-pointer ${c.status === 'issue' ? 'bg-red-600 border-red-600 text-white' : 'border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-700'}`}>
                        <AlertTriangle size={14} />
                      </button>
                      <a href={url} target="_blank" rel="noreferrer" title="Open in a new tab"
                        className="h-7 w-7 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-50">
                        <ExternalLink size={13} />
                      </a>
                      <button onClick={() => navigate(url)} className="h-7 px-2.5 flex items-center gap-1 rounded bg-gray-900 text-white text-xs hover:bg-gray-800 cursor-pointer">
                        Open <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="text-[11px] text-gray-500">The checklist and notes are saved in this browser only.</p>
    </div>
  );
}

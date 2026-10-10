import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Loader2, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '../../config/environment';

/**
 * Side panel showing the rows behind a figure on the Admin overview, so drilling down
 * never leaves the dashboard. `detail` = { title, subtitle, params } where params are the
 * query for GET /api/admin/overview/details.
 */

const LABELS = {
  key: 'Task', title: 'Title', label: 'Work type', assignee: 'Assignee', project: 'Project', status: 'Status',
  due: 'Due', finished: 'Finished', name: 'Name', role: 'Role', department: 'Department', open: 'Open',
  overdue: 'Overdue', joined: 'Joined', when: 'When', person: 'Person', hours: 'Hours', note: 'Note',
  tasks: 'Tasks', done: 'Done', progress: 'Progress', start: 'Start', end: 'End', workDate: 'Work date',
  requestedBy: 'Requested by', current: 'Current plan', requested: 'Requested', email: 'Email',
  company: 'Company', source: 'Source', value: 'Value', created: 'Created', stage: 'Stage',
  expectedClose: 'Expected close', number: 'Invoice', client: 'Client', amount: 'Amount', paid: 'Paid',
  outstanding: 'Outstanding', dueBy: 'Due by'
};
const NUMERIC = new Set(['open', 'overdue', 'hours', 'tasks', 'done', 'progress', 'value', 'amount', 'paid', 'outstanding']);
const MONEY = new Set(['value', 'amount', 'paid', 'outstanding']);
const DATES = new Set(['due', 'finished', 'joined', 'start', 'end', 'workDate', 'created', 'expectedClose', 'dueBy', 'requested_on']);
const BUCKET_LABEL = { todo: 'To Do', inProgress: 'In Progress', review: 'In Review', done: 'Done' };
const BUCKET_STYLE = {
  todo: 'bg-blue-50 text-blue-800 border-blue-200',
  inProgress: 'bg-orange-50 text-orange-800 border-orange-200',
  review: 'bg-amber-50 text-amber-800 border-amber-200',
  done: 'bg-emerald-50 text-emerald-800 border-emerald-200'
};

const fmtDate = (v) => (v ? new Date(String(v).length === 10 ? `${v}T00:00:00` : v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—');
const fmtWhen = (v) => (v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

const Cell = ({ col, row }) => {
  const v = row[col];
  if (col === 'status' && row.bucket) {
    return <span className={`text-[11px] px-1.5 py-0.5 rounded border whitespace-nowrap ${BUCKET_STYLE[row.bucket]}`}>{BUCKET_LABEL[row.bucket]}</span>;
  }
  if (col === 'due') {
    return <span className={row.overdue ? 'text-red-700 font-semibold whitespace-nowrap' : 'whitespace-nowrap'}>{fmtDate(v)}{row.overdue ? ' · overdue' : ''}</span>;
  }
  if (col === 'end' && row.late) return <span className="text-red-700 font-semibold whitespace-nowrap">{fmtDate(v)} · late</span>;
  if (col === 'progress') return <span className="tabular-nums">{v}%</span>;
  if (col === 'when') return <span className="whitespace-nowrap">{fmtWhen(v)}</span>;
  if (MONEY.has(col)) return <span className="tabular-nums">₹{Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>;
  if (DATES.has(col)) return <span className="whitespace-nowrap">{fmtDate(v)}</span>;
  if (col === 'overdue' && Number(v) > 0) return <span className="text-red-700 font-semibold tabular-nums">{v}</span>;
  if (col === 'key') return <span className="font-mono text-[11px] text-gray-600 whitespace-nowrap">{v}</span>;
  if (col === 'title' || col === 'note') return <span className="block max-w-[340px] truncate" title={v}>{v || '—'}</span>;
  if (v == null || v === '') return <span className="text-gray-400">—</span>;
  return <span className={NUMERIC.has(col) ? 'tabular-nums' : ''}>{String(v)}</span>;
};

export default function AdminDetailPanel({ detail, onClose }) {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [search, setSearch] = useState('');
  const [bucket, setBucket] = useState('');

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: '', data: null });
    setSearch(''); setBucket('');
    const qs = new URLSearchParams(Object.entries(detail.params).filter(([, v]) => v != null && v !== '')).toString();
    fetch(`${API_BASE_URL}/admin/overview/details?${qs}`)
      .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Could not load the details'); return d; })
      .then(d => { if (!cancelled) setState({ loading: false, error: '', data: d }); })
      .catch(e => { if (!cancelled) setState({ loading: false, error: e.message, data: null }); });
    return () => { cancelled = true; };
  }, [detail]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const data = state.data;
  const rows = useMemo(() => {
    let list = data?.rows || [];
    if (bucket) list = list.filter(r => r.bucket === bucket);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q)));
    return list;
  }, [data, search, bucket]);

  const columns = data?.columns || [];

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end" role="dialog" aria-label={detail.title}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-[880px] h-full bg-white shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">{detail.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {detail.subtitle ? `${detail.subtitle} · ` : ''}
              {data ? `${data.total.toLocaleString('en-IN')} ${data.total === 1 ? 'record' : 'records'}${data.truncated ? ` (first ${data.rows.length} shown)` : ''}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 cursor-pointer" aria-label="Close"><X size={18} /></button>
        </div>

        {data && (
          <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search these records"
                className="h-8 pl-8 pr-2 text-xs border border-gray-300 rounded w-64 max-w-full outline-none focus:border-blue-500" />
            </div>
            {data.byStatus && Object.entries(data.byStatus).filter(([, n]) => n > 0).length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setBucket('')} className={`h-8 px-2.5 text-xs rounded border cursor-pointer ${!bucket ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>All</button>
                {Object.entries(data.byStatus).filter(([, n]) => n > 0).map(([k, n]) => (
                  <button key={k} onClick={() => setBucket(k)} className={`h-8 px-2.5 text-xs rounded border cursor-pointer ${bucket === k ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                    {BUCKET_LABEL[k]} <span className="tabular-nums opacity-70">{n}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {data?.people?.length > 0 && (
          <div className="px-5 py-3 border-b border-gray-100">
            <div className="text-[11px] font-semibold text-gray-600 mb-1.5">Hours by person</div>
            <div className="flex flex-wrap gap-1.5">
              {data.people.map(p => (
                <button key={p.name} onClick={() => setSearch(p.name)} className="text-xs bg-gray-100 hover:bg-gray-200 rounded-full px-2.5 py-1 cursor-pointer">
                  {p.name}: <strong className="tabular-nums">{p.hours} h</strong>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {state.loading && <div className="py-20 flex items-center justify-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Loading…</div>}
          {state.error && <div className="m-5 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3"><AlertTriangle size={15} /> {state.error}</div>}
          {data && rows.length === 0 && <div className="m-5 text-center text-sm text-gray-500 py-10 border border-dashed border-gray-200 rounded">Nothing to show.</div>}
          {data && rows.length > 0 && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  {columns.map(c => <th key={c} className={`py-2 px-3 first:pl-5 font-medium ${NUMERIC.has(c) ? 'text-right' : ''}`}>{LABELS[c] || c}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.key || r.id || `${r.name || ''}-${i}`} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 align-top">
                    {columns.map(c => <td key={c} className={`py-2 px-3 first:pl-5 text-xs text-gray-800 ${NUMERIC.has(c) ? 'text-right' : ''}`}><Cell col={c} row={r} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

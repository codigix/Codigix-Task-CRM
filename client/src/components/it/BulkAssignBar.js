import React, { useEffect, useRef, useState } from 'react';
import { ChevronUp, Loader2, Search, User, X } from 'lucide-react';

const nameOf = (u) => u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();

/**
 * Bar shown at the bottom of the board while tickets are being picked: assign all the picked
 * tickets to one person (or unassign them) in one go.
 */
export default function BulkAssignBar({ count, usersList, busy, onAssign, onClear, onExit }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const people = [...new Map((usersList || [])
    .filter(u => !u.status || String(u.status).toLowerCase() === 'active')
    .map(u => [nameOf(u).toLowerCase(), nameOf(u)])
    .filter(([k]) => k)).values()]
    .sort((a, b) => a.localeCompare(b))
    .filter(n => !q.trim() || n.toLowerCase().includes(q.trim().toLowerCase()));

  const pick = (name) => { setOpen(false); setQ(''); onAssign(name); };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-gray-900 text-white rounded shadow-2xl px-3 py-2 text-[13px]">
      <span className="flex items-center gap-1.5 pr-2 border-r border-white/20">
        <span className="tabular-nums font-semibold">{count}</span> selected
      </span>
      <div className="relative" ref={ref}>
        <button
          type="button"
          disabled={!count || busy}
          onClick={() => setOpen(o => !o)}
          className="h-8 px-3 flex items-center gap-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-medium cursor-pointer"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />}
          {busy ? 'Assigning…' : 'Assign to'}
          {!busy && <ChevronUp size={13} />}
        </button>
        {open && (
          <div className="absolute bottom-full mb-2 left-0 w-64 bg-white text-gray-800 border border-gray-200 rounded shadow-xl overflow-hidden">
            <div className="p-2 border-b border-gray-100 flex items-center gap-1.5">
              <Search size={13} className="text-gray-400" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search employee..."
                className="flex-1 text-xs outline-none bg-transparent" />
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {(!q.trim() || 'unassigned'.includes(q.trim().toLowerCase())) && (
                <button type="button" onClick={() => pick('Unassigned')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 flex items-center gap-2 text-gray-600 cursor-pointer">
                  <span className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center"><User size={11} /></span> Unassigned
                </button>
              )}
              {people.map(n => (
                <button key={n} type="button" onClick={() => pick(n)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 flex items-center gap-2 cursor-pointer">
                  <span className="w-5 h-5 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] shrink-0">{n.substring(0, 2).toUpperCase()}</span>
                  <span className="truncate">{n}</span>
                </button>
              ))}
              {!people.length && q.trim() && <div className="px-3 py-2 text-xs text-gray-400">No one matches.</div>}
            </div>
          </div>
        )}
      </div>
      <button type="button" onClick={onClear} disabled={!count || busy} className="h-8 px-2.5 rounded hover:bg-white/10 disabled:opacity-40 cursor-pointer">Clear</button>
      <button type="button" onClick={onExit} disabled={busy} className="h-8 px-2.5 flex items-center gap-1 rounded hover:bg-white/10 cursor-pointer" title="Stop selecting (Esc)">
        <X size={14} /> Done
      </button>
    </div>
  );
}

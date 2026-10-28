import React, { useEffect, useMemo, useState } from 'react';
import { X, FlaskConical, Check } from 'lucide-react';

/**
 * "Who will test this?" - asked when a ticket moves into Testing (and when its tester is
 * changed). The tester owns the ticket while it is in Testing; the assignee stays the
 * developer, who keeps the credit and gets it back if testing fails.
 *
 * People with the Tester role (or in a Testing department) are listed first.
 * info: { issueKey, title, assignee, tester, moving }  (moving = the card is being moved to Testing)
 * onDone(name | null)  null = cancelled
 */

const nameOf = (u) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.name || u.username || '';
const norm = (v) => String(v || '').trim().toLowerCase();
export const isTesterUser = (u) => norm(u.role_name || u.role) === 'tester' || /testing/.test(norm(u.department));

export default function TesterPickerModal({ info, users = [], onDone }) {
  const [picked, setPicked] = useState('');
  const [query, setQuery] = useState('');

  const people = useMemo(() => {
    const active = users.filter(u => nameOf(u) && norm(u.status || 'active') === 'active');
    const testers = active.filter(isTesterUser).map(nameOf);
    const others = active.filter(u => !isTesterUser(u)).map(nameOf);
    return { testers: [...new Set(testers)], others: [...new Set(others)].sort((a, b) => a.localeCompare(b)) };
  }, [users]);

  useEffect(() => {
    if (!info) return;
    // A retest goes back to whoever tested it last; with one tester, it is them.
    const last = info.tester && norm(info.tester) !== 'unassigned' ? info.tester : '';
    setPicked(last || (people.testers.length === 1 ? people.testers[0] : ''));
    setQuery('');
  }, [info, people.testers]);

  if (!info) return null;

  const q = norm(query);
  const match = (n) => !q || norm(n).includes(q);
  const testers = people.testers.filter(match);
  const others = people.others.filter(match);

  const Row = ({ name, hint }) => (
    <button type="button" onClick={() => setPicked(name)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] cursor-pointer ${picked === name ? 'bg-purple-50 text-purple-900' : 'text-gray-700 hover:bg-gray-50'}`}>
      <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-[9px] flex items-center justify-center shrink-0">
        {name.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()}
      </span>
      <span className="truncate">{name}</span>
      {hint && <span className="text-[11px] text-gray-400 shrink-0">{hint}</span>}
      {picked === name && <Check size={14} className="ml-auto text-purple-600 shrink-0" />}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={() => onDone(null)} aria-hidden="true" />
      <div className="relative w-full max-w-[440px] max-h-[90vh] flex flex-col bg-white rounded shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
              <FlaskConical size={16} className="text-purple-600" /> Who will test this?
            </h2>
            <p className="text-xs text-gray-500 mt-1 truncate"><span className="font-mono">{info.issueKey}</span>{info.title ? ` · ${info.title}` : ''}</p>
          </div>
          <button onClick={() => onDone(null)} className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer" aria-label="Cancel"><X size={18} /></button>
        </div>

        <div className="px-5 pt-3">
          <p className="text-xs text-gray-500">
            The tester owns the ticket while it is in Testing.
            {info.assignee && norm(info.assignee) !== 'unassigned' ? <> If it fails, it goes back to <strong className="text-gray-700">{info.assignee}</strong>.</> : null}
          </p>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search people" autoFocus
            className="mt-3 w-full h-8 px-2.5 text-[13px] border border-gray-300 rounded outline-none focus:border-purple-500" />
        </div>

        <div className="mt-2 mx-5 border border-gray-200 rounded overflow-y-auto min-h-[120px] max-h-[320px]">
          <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Testers</div>
          {testers.length ? testers.map(n => <Row key={`t-${n}`} name={n} />)
            : <div className="px-3 pb-2 text-xs text-gray-500">{people.testers.length ? 'No match.' : 'Nobody has the Tester role yet. Pick anyone below, or give testers that role in Manage Users.'}</div>}
          {others.length > 0 && <div className="px-3 pt-3 pb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide border-t border-gray-100 mt-1">Everyone else</div>}
          {others.map(n => <Row key={`o-${n}`} name={n} />)}
        </div>

        <div className="px-5 py-4 flex justify-end gap-2">
          <button type="button" onClick={() => onDone(null)} className="h-8 px-3 text-[13px] border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">Cancel</button>
          <button type="button" disabled={!picked} onClick={() => onDone(picked)}
            className="h-8 px-3 text-[13px] rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 cursor-pointer">
            {info.moving ? 'Move to Testing' : 'Save tester'}
          </button>
        </div>
      </div>
    </div>
  );
}

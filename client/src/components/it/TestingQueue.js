import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FlaskConical, Play, Pause, CheckCircle2, XCircle, Clock, ListChecks, RefreshCw, User, RotateCcw } from 'lucide-react';
import { API_BASE_URL } from '../../config/environment';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

/**
 * The testers' to-do list. A ticket moved to the board's Testing column lands in "To test";
 * the tester starts it (drag to "Testing" or press Start), which starts their own testing clock,
 * then finishes it Passed or Failed. Testing time is logged as the tester's work, separately
 * from the developer's planned time.
 * Server: GET /api/it-kanban/testing/queue, POST /api/it-kanban/issues/:key/testing/:action.
 */

const hm = (sec) => {
  const v = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(v / 3600); const m = Math.floor((v % 3600) / 60); const s = v % 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
};
const ago = (d) => {
  if (!d) return '';
  const mins = Math.round((Date.now() - new Date(d)) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
};
const PRIORITY = { Highest: 'text-red-700 bg-red-50', High: 'text-red-700 bg-red-50', Critical: 'text-red-700 bg-red-50', Medium: 'text-amber-700 bg-amber-50', Low: 'text-gray-600 bg-gray-100' };

const COLUMNS = [
  { id: 'toTest', title: 'To test', hint: 'Moved to Testing on the board', icon: ListChecks, tone: 'text-slate-700' },
  { id: 'testing', title: 'Testing', hint: 'Your testing clock runs here', icon: FlaskConical, tone: 'text-blue-700' },
  { id: 'tested', title: 'Tested', hint: 'Last 14 days', icon: CheckCircle2, tone: 'text-emerald-700' }
];

const TestingQueue = ({ department = 'IT', onOpenTicket }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/it-kanban/testing/queue`, { params: { department } });
      setData(res.data); setError('');
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load the testing queue.');
    }
  }, [department]);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);
  // Running clocks tick every second.
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 1000); return () => clearInterval(t); }, []);

  const act = async (item, action) => {
    let note = '';
    if (action === 'fail' || action === 'pass') {
      const r = await Swal.fire({
        title: action === 'fail' ? `Failed: ${item.key}` : `Passed: ${item.key}`,
        input: 'textarea',
        inputLabel: action === 'fail' ? 'What failed? The developer sees this.' : 'Notes (optional)',
        inputPlaceholder: action === 'fail' ? 'Steps, what you expected, what happened…' : 'Anything worth knowing',
        showCancelButton: true,
        confirmButtonText: action === 'fail' ? 'Mark failed' : 'Mark passed',
        confirmButtonColor: action === 'fail' ? '#dc2626' : '#059669',
        inputValidator: (v) => (action === 'fail' && !String(v || '').trim() ? 'Say what failed.' : undefined)
      });
      if (!r.isConfirmed) return;
      note = String(r.value || '').trim();
    }
    setBusy(item.key);
    try {
      const res = await axios.post(`${API_BASE_URL}/it-kanban/issues/${encodeURIComponent(item.key)}/testing/${action}`, { note });
      const logged = res.data.seconds ? ` · ${res.data.logged} logged` : '';
      const paused = (res.data.pausedTimers || []).length ? ` · paused ${res.data.pausedTimers.join(', ')}` : '';
      showSuccessToast({ start: `Testing ${item.key}${paused}`, pause: `Paused${logged}`, pass: `Passed${logged}`, fail: `Failed${logged}` }[action]);
      await load();
    } catch (e) {
      showErrorToast(e.response?.data?.error || 'That did not work. Try again.');
    } finally {
      setBusy('');
    }
  };

  // Drag: To test → Testing starts; Testing → Tested asks Passed or Failed.
  const onDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination || destination.droppableId === source.droppableId) return;
    const item = (data?.[source.droppableId] || []).find(i => i.key === draggableId);
    if (!item) return;
    if (source.droppableId === 'toTest' && destination.droppableId === 'testing') return act(item, 'start');
    if (source.droppableId === 'testing' && destination.droppableId === 'tested') {
      const r = await Swal.fire({
        title: `Finish testing ${item.key}`, text: 'Did it pass?', icon: 'question',
        showDenyButton: true, showCancelButton: true,
        confirmButtonText: 'Passed', denyButtonText: 'Failed', confirmButtonColor: '#059669', denyButtonColor: '#dc2626'
      });
      if (r.isConfirmed) return act(item, 'pass');
      if (r.isDenied) return act(item, 'fail');
      return;
    }
    showErrorToast('Drag from To test to Testing to start, and from Testing to Tested to finish.');
  };

  if (!data) {
    return <div className="p-6 text-sm text-gray-500">{error || 'Loading testing queue…'}</div>;
  }

  const live = (since) => (since ? Math.max(0, (Date.now() - new Date(since)) / 1000) : 0);
  const s = data.stats;
  const running = live(s.runningSince);
  const canAct = data.canTest;

  const Stat = ({ label, value, sub }) => (
    <div className="bg-white rounded border border-gray-200 px-3 py-2 min-w-[130px]">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-[15px] font-semibold text-gray-900 tabular-nums">{value}</div>
      {sub && <div className="text-[10.5px] text-gray-500">{sub}</div>}
    </div>
  );

  const Card = ({ item, column, index }) => {
    const clock = item.timerStartedAt ? live(item.timerStartedAt) : 0;
    const total = item.testingSeconds + clock;
    const isBusy = busy === item.key;
    const failed = item.state === 'FAILED';
    return (
      <Draggable draggableId={item.key} index={index} isDragDisabled={!canAct || column === 'tested' || isBusy}>
        {(p) => (
          <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
            className={`bg-white rounded border ${item.timerStartedAt ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'} p-3 space-y-2 text-xs`}>
            <div className="flex items-start justify-between gap-2">
              <button type="button" onClick={() => onOpenTicket?.(item.key)} className="text-left min-w-0 cursor-pointer">
                <span className="block text-[11px] text-gray-500 hover:text-blue-600 hover:underline">{item.key}{item.project ? ` · ${item.project}` : ''}</span>
                <span className="block text-[13px] font-medium text-gray-900 leading-snug line-clamp-2">{item.title}</span>
              </button>
              {item.priority && <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY[item.priority] || PRIORITY.Low}`}>{item.priority}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
              {item.developer && <span className="flex items-center gap-1" title="Developer (assignee)"><User size={11} /> {item.developer}</span>}
              {item.round > 1 && <span className="flex items-center gap-1 text-amber-700" title="Times this ticket came to Testing"><RotateCcw size={11} /> Round {item.round}</span>}
              {column === 'toTest' && item.inTestingSince && <span title="Waiting in Testing">waiting {ago(item.inTestingSince)}</span>}
              {item.tester && column !== 'testing' && <span title="Tester">tested by {item.tester}</span>}
              {column === 'testing' && data.seesAll && item.tester && <span title="Tester">{item.tester}</span>}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-gray-100">
              <span className="flex items-center gap-1 text-[11px] text-gray-600" title="Testing time on this ticket (all rounds). The developer's time is separate.">
                <Clock size={11} className={item.timerStartedAt ? 'text-blue-600' : 'text-gray-400'} />
                <span className={`tabular-nums ${item.timerStartedAt ? 'text-blue-700 font-semibold' : ''}`}>{total ? hm(total) : 'No testing time'}</span>
                {item.worklogCount > 0 && <span className="text-gray-400">· {item.worklogCount} log{item.worklogCount === 1 ? '' : 's'}</span>}
              </span>
              <span className="text-[10.5px] text-gray-400" title="Developer time against plan">dev {item.devTime}{item.plannedTime ? ` / ${item.plannedTime}` : ''}</span>
            </div>
            {column === 'tested' ? (
              <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${failed ? 'text-red-700' : 'text-emerald-700'}`}>
                {failed ? <XCircle size={13} /> : <CheckCircle2 size={13} />} {failed ? 'Failed' : 'Passed'}
                {item.testedAt && <span className="font-normal text-gray-400">· {ago(item.testedAt)} ago</span>}
                {failed && <span className="font-normal text-gray-500">· back to the developer</span>}
              </div>
            ) : canAct && (
              <div className="flex flex-wrap gap-1.5">
                {column === 'toTest' && (
                  <button type="button" disabled={isBusy} onClick={() => act(item, 'start')} className="h-7 px-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1 disabled:opacity-50 cursor-pointer"><Play size={12} /> Start testing</button>
                )}
                {column === 'testing' && (
                  <>
                    {item.timerStartedAt
                      ? <button type="button" disabled={isBusy} onClick={() => act(item, 'pause')} className="h-7 px-2.5 rounded border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium flex items-center gap-1 disabled:opacity-50 cursor-pointer"><Pause size={12} /> Pause</button>
                      : <button type="button" disabled={isBusy} onClick={() => act(item, 'start')} className="h-7 px-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1 disabled:opacity-50 cursor-pointer"><Play size={12} /> Resume</button>}
                    <button type="button" disabled={isBusy} onClick={() => act(item, 'pass')} className="h-7 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1 disabled:opacity-50 cursor-pointer"><CheckCircle2 size={12} /> Passed</button>
                    <button type="button" disabled={isBusy} onClick={() => act(item, 'fail')} className="h-7 px-2.5 rounded bg-white border border-red-300 text-red-700 hover:bg-red-50 font-medium flex items-center gap-1 disabled:opacity-50 cursor-pointer"><XCircle size={12} /> Failed</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2"><FlaskConical size={17} className="text-blue-600" /> Testing queue</h2>
          <p className="text-xs text-gray-500 mt-0.5">Tickets moved to <b>Testing</b> on the board appear here. Testing time is logged as your work, separately from the developer's planned time.</p>
        </div>
        <button type="button" onClick={load} className="h-8 px-2.5 rounded border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1 cursor-pointer"><RefreshCw size={12} /> Refresh</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Stat label="Testing today" value={hm(s.todaySeconds + running)} sub={running ? 'clock running' : null} />
        <Stat label="This week" value={hm(s.weekSeconds + running)} sub={`${s.weekWorklogs} work log${s.weekWorklogs === 1 ? '' : 's'}`} />
        <Stat label="Testing work logs" value={s.worklogs} sub={`${hm(s.totalSeconds)} in total`} />
        <Stat label="Last 30 days" value={`${s.passed30} passed · ${s.failed30} failed`} />
      </div>

      {!canAct && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">Only testers (or a manager) can start and finish testing. You can see the queue.</p>}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {COLUMNS.map(col => {
            const items = data[col.id] || [];
            const Icon = col.icon;
            return (
              <div key={col.id} className="bg-gray-50 rounded border border-gray-200 flex flex-col min-h-[240px]">
                <div className="px-3 py-2 border-b border-gray-200">
                  <div className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${col.tone}`}><Icon size={13} /> {col.title} <span className="text-gray-400 font-normal">({items.length})</span></div>
                  <div className="text-[10.5px] text-gray-500">{col.hint}{col.id === 'testing' && data.othersTesting ? ` · ${data.othersTesting} being tested by others` : ''}</div>
                </div>
                <Droppable droppableId={col.id} isDropDisabled={col.id === 'toTest' || !canAct}>
                  {(p, snap) => (
                    <div ref={p.innerRef} {...p.droppableProps} className={`flex-1 p-2 space-y-2 ${snap.isDraggingOver ? 'bg-blue-50/60' : ''}`}>
                      {items.length === 0 && (
                        <p className="text-[11px] text-gray-400 text-center py-6">
                          {col.id === 'toTest' ? 'Nothing waiting. Tickets appear here when moved to Testing.' : col.id === 'testing' ? 'Start a ticket from To test.' : 'No results in the last 14 days.'}
                        </p>
                      )}
                      {items.map((item, i) => <Card key={item.key} item={item} column={col.id} index={i} />)}
                      {p.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

export default TestingQueue;

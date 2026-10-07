import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { API_BASE_URL } from '../../config/environment';

/**
 * Imports a content-calendar spreadsheet as work items.
 *
 * The sheet is a grid: column A is a calendar day per row, row 1 names a client per column,
 * and every filled cell is a piece of work. Nothing is created on upload — the file is
 * parsed into a preview first, and only the rows still ticked get imported. A stray column
 * turning into sixty tasks is not something anyone wants to undo by hand.
 */
const ImportCalendarModal = ({ isOpen, department, sprints = [], defaultSprintId = null, currentUserName, onCancel, onImported }) => {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [excluded, setExcluded] = useState(() => new Set());
  const [dayFirst, setDayFirst] = useState(false);
  // A content calendar says when a piece of work runs, not when it is due, so the date
  // becomes the start date unless told otherwise.
  const [dateField, setDateField] = useState('both');
  const [sprintId, setSprintId] = useState('');
  const [customProjectName, setCustomProjectName] = useState('');
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [isAutoMatched, setIsAutoMatched] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setFile(null); setPreview(null); setExcluded(new Set());
    setError(''); setIsBusy(false); setSprintId(''); setCustomProjectName(''); setDateField('both');
    setAvailableSheets([]); setSelectedSheet(''); setIsAutoMatched(false);
  };

  // Opened from a sprint's menu? Then that sprint is the destination, not the Backlog.
  useEffect(() => {
    if (isOpen) setSprintId(defaultSprintId == null ? '' : String(defaultSprintId));
  }, [isOpen, defaultSprintId]);

  if (!isOpen) return null;

  const rowId = (r) => `${r.rowNumber}:${r.colNumber || r.column}:${r.rawTitle || r.title}`;

  const getRowTitle = (r) => {
    const p = customProjectName.trim();
    const raw = r.rawTitle || r.title;
    return p ? `${p} - ${raw}` : raw;
  };

  const runPreview = async (chosenFile, useDayFirst, sheetOverride) => {
    const f = chosenFile || file;
    if (!f) return;
    setIsBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', f);
      const targetSheet = sheetOverride !== undefined ? sheetOverride : selectedSheet;
      const sheetParam = targetSheet ? `&sheetName=${encodeURIComponent(targetSheet)}` : '';
      const res = await fetch(
        `${API_BASE_URL}/it-kanban/import/preview?department=${encodeURIComponent(department)}&dayFirst=${useDayFirst}&sprintId=${encodeURIComponent(sprintId || '')}${sheetParam}`,
        { method: 'POST', body }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not read the spreadsheet');

      setPreview(data);
      setAvailableSheets(data.availableSheets || []);
      setSelectedSheet(data.sheetName || '');
      setIsAutoMatched(Boolean(data.matchedWithSprint));
      setCustomProjectName(data.projectName || '');
      // Rows already imported start unticked, so a re-upload doesn't duplicate the calendar.
      setExcluded(new Set(data.rows.filter(r => r.duplicate).map(rowId)));
    } catch (err) {
      setError(err.message);
      setPreview(null);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSheetChange = (newSheet) => {
    setSelectedSheet(newSheet);
    setIsAutoMatched(false);
    runPreview(file, dayFirst, newSheet);
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setSelectedSheet('');
    runPreview(f, dayFirst, '');
  };

  const toggleRow = (r) => {
    setExcluded(prev => {
      const next = new Set(prev);
      const id = rowId(r);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const chosenRows = (preview?.rows || []).filter(r => !excluded.has(rowId(r)));

  const handleImport = async () => {
    if (chosenRows.length === 0) return setError('Nothing selected to import.');
    setIsBusy(true);
    setError('');
    try {
      // Map rows with the dynamic title and description
      const payloadRows = chosenRows.map(r => ({
        ...r,
        title: getRowTitle(r),
        description: r.description || '',
        service: r.service || r.column || ''
      }));

      const res = await fetch(`${API_BASE_URL}/it-kanban/import/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: payloadRows,
          department,
          dateField,
          sprintId: sprintId === '' ? null : Number(sprintId),
          reporter: currentUserName || 'Unassigned',
          labels: ['content-calendar']
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      reset();
      onImported(data.created);
    } catch (err) {
      setError(err.message);
      setIsBusy(false);
    }
  };

  const summary = preview?.summary;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded shadow-2xl w-full max-w-[960px] max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between px-6 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="text-xl  text-gray-900">Import calendar tasks</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Review and create tasks automatically from your calendar spreadsheet.
            </p>
          </div>
          <button onClick={() => { reset(); onCancel(); }} className="text-gray-400 hover:text-gray-700 p-1 rounded transition">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-4 overflow-y-auto flex-1">
          {error && (
            <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">{error}</div>
          )}

          {!preview && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={isBusy}
              className="w-full border-2 border-dashed border-gray-300 rounded py-12 flex flex-col items-center gap-2 hover:border-blue-400 hover:bg-blue-50/30 transition disabled:opacity-60"
            >
              <UploadCloud size={30} className="text-gray-400" />
              <span className="text-[14px] font-medium text-gray-700">
                {isBusy ? 'Reading the spreadsheet…' : 'Choose an .xlsx file'}
              </span>
              <span className="text-[12px] text-gray-500">Nothing is created until you confirm</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />

          {preview && (
            <>
              <div className="flex items-center gap-2 text-[13px] text-gray-700 mb-3">
                <FileSpreadsheet size={15} className="text-emerald-600" />
                <strong>{file?.name}</strong>
                <button
                  onClick={() => { setPreview(null); setFile(null); setSelectedSheet(''); setAvailableSheets([]); }}
                  className="ml-auto text-[12px] text-blue-600 hover:underline"
                >
                  Choose a different file
                </button>
              </div>

              {/* Sheet Selector Dropdown */}
              {availableSheets.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3 bg-blue-50/70 p-2.5 rounded border border-blue-200">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <label className="text-[12px]  text-blue-950 whitespace-nowrap">
                      Client Worksheet:
                    </label>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      disabled={isBusy}
                      className="text-[12px] px-2.5 py-1.5 rounded border border-blue-300 bg-white text-blue-950 font-medium focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
                    >
                      {availableSheets.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {isAutoMatched && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                        ✓ Matched with Sprint
                      </span>
                    )}
                  </div>
                  {isBusy && (
                    <span className="text-[11px] text-blue-600 animate-pulse font-medium">
                      Reading worksheet…
                    </span>
                  )}
                </div>
              )}

              {/* Project name prefix input */}
              <div className="flex items-center gap-2 mb-3 bg-slate-50 p-2.5 rounded border border-gray-200">
                <label className="text-[12px]  text-gray-700 whitespace-nowrap">Project Name Prefix:</label>
                <input
                  type="text"
                  value={customProjectName}
                  onChange={(e) => setCustomProjectName(e.target.value)}
                  placeholder="e.g. Project Name (leave blank if not needed)"
                  className="text-[12px] px-2.5 py-1 border border-gray-300 rounded flex-1 bg-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-[11px] text-gray-400">Prepended to all task titles</span>
              </div>

              {summary.ambiguousDates > 0 && (
                <div className="flex items-start gap-2 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <strong>{summary.ambiguousDates}</strong> date{summary.ambiguousDates === 1 ? ' is' : 's are'} written
                    as text and could be read either way — check the order below before importing.
                  </div>
                </div>
              )}

              {/* What will be created */}
              <div className="border border-gray-200 rounded overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-200 text-[12px]">
                  <strong>{chosenRows.length}</strong> of {summary.total} will be imported
                  {summary.duplicates > 0 && (
                    <span className="text-gray-500">· {summary.duplicates} already imported, unticked</span>
                  )}
                  {summary.skippedNoDate > 0 && (
                    <span className="text-gray-500">· {summary.skippedNoDate} skipped with no date</span>
                  )}
                </div>
                <div className="max-h-[340px] overflow-y-auto">
                  <table className="w-full text-[12px]">
                    <thead className="bg-white sticky top-0 border-b border-gray-100 shadow-sm">
                      <tr className="text-gray-500">
                        <th className="w-8 p-2"></th>
                        <th className="text-left p-2 font-medium">Date</th>
                        <th className="text-left p-2 font-medium">Service</th>
                        <th className="text-left p-2 font-medium">Task Title</th>
                        <th className="text-left p-2 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.rows.map(r => {
                        const off = excluded.has(rowId(r));
                        return (
                          <tr key={rowId(r)} className={off ? 'opacity-40' : 'hover:bg-blue-50/40'}>
                            <td className="p-2 text-center">
                              <input type="checkbox" checked={!off} onChange={() => toggleRow(r)} className="cursor-pointer" />
                            </td>
                            <td className="p-2 text-gray-700 whitespace-nowrap">{r.date}</td>
                            <td className="p-2 whitespace-nowrap">
                              <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {r.service || r.column}
                              </span>
                            </td>
                            <td className="p-2 text-gray-900 font-medium">
                              {getRowTitle(r)}
                              {r.duplicate && <span className="ml-2 text-[10px] text-gray-500 font-normal">already imported</span>}
                            </td>
                            <td className="p-2 text-gray-600 max-w-[280px] truncate" title={r.description}>
                              {r.description || <span className="text-gray-400 italic">No description</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg shrink-0">
          <button
            onClick={() => { reset(); onCancel(); }}
            disabled={isBusy}
            className="p-2 text-[14px] font-medium text-gray-700 hover:bg-gray-200 rounded transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isBusy || !preview || chosenRows.length === 0}
            className="px-5 py-2 text-[14px] font-medium text-white bg-red-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
          >
            {isBusy ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportCalendarModal;

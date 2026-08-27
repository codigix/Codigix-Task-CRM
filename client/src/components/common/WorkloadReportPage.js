import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { Users, ClipboardList, Download } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config/environment';
import { isManagerDesignation } from '../../utils/access';
import BoardTabs from './BoardTabs';

/**
 * How much work each person is carrying, and where it has got to.
 *
 * Counts only — no charts, no drill-down. A manager sees every person on the board; an
 * employee sees only their own row, matching how the Board already scopes what they can see.
 */

// The board's columns. Anything with an unrecognised status is counted under Other so the
// row totals always add up rather than quietly losing work.
const COLUMNS = ['TO DO', 'IN PROGRESS', 'IN REVIEW', 'TESTING', 'DONE'];

const label = (s) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

// Local date parts throughout: a DATE column comes back as e.g. 2026-07-31T18:30:00Z, which
// is 1 August in IST. Comparing as UTC would file that item under the wrong month.
const monthKeyOf = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (key) => {
  const [y, m] = String(key).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

/**
 * Which month a work item belongs to. A content calendar dates work by when it runs, so the
 * start date leads; due date and then creation are fallbacks for items dated another way.
 */
const itemMonth = (issue) =>
  monthKeyOf(issue.start_date) || monthKeyOf(issue.due_date) || monthKeyOf(issue.created_at);

const WorkloadReportPage = ({ department }) => {
  const { user } = useAuth();
  const { designation, username } = useParams();

  const currentDept = department
    || (user?.department || '').replace(/\s*department\s*$/i, '').trim()
    || 'IT';

  const isManager = isManagerDesignation(designation);
  const myName = user
    ? (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username)
    : (username || '');

  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/it-kanban/issues?department=${encodeURIComponent(currentDept)}`)
      .then(res => res.json())
      .then(data => setIssues(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to load issues for the report:', err))
      .finally(() => setIsLoading(false));
  }, [currentDept]);

  // Months that actually have work, newest first, so the picker never offers empty months.
  const months = useMemo(() => {
    const set = new Set();
    for (const i of issues) {
      const m = itemMonth(i);
      if (m) set.add(m);
    }
    return [...set].sort().reverse();
  }, [issues]);

  const [month, setMonth] = useState('');
  useEffect(() => {
    if (months.length === 0) { setMonth(''); return; }
    // Default to the current month when it has work, otherwise the most recent month.
    const now = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    setMonth(months.includes(now) ? now : months[0]);
  }, [months]);

  const rows = useMemo(() => {
    const normalize = (v) => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const byPerson = new Map();

    for (const issue of issues) {
      if (month && itemMonth(issue) !== month) continue;
      const person = issue.assignee && issue.assignee !== 'Unassigned'
        ? issue.assignee
        : 'Unassigned';

      // An employee's report is their own work only, the same rule the Board applies.
      if (!isManager && normalize(person) !== normalize(myName)) continue;

      if (!byPerson.has(person)) {
        byPerson.set(person, { person, total: 0, other: 0, ...Object.fromEntries(COLUMNS.map(c => [c, 0])) });
      }
      const row = byPerson.get(person);
      const status = String(issue.status || '').toUpperCase().trim();

      if (COLUMNS.includes(status)) row[status] += 1;
      else row.other += 1;
      row.total += 1;
    }

    // Busiest first; Unassigned last, since it isn't a person's workload.
    return [...byPerson.values()].sort((a, b) => {
      if (a.person === 'Unassigned') return 1;
      if (b.person === 'Unassigned') return -1;
      return b.total - a.total || a.person.localeCompare(b.person);
    });
  }, [issues, isManager, myName, month]);

  const totals = useMemo(() => {
    const t = { total: 0, other: 0, ...Object.fromEntries(COLUMNS.map(c => [c, 0])) };
    for (const r of rows) {
      COLUMNS.forEach(c => { t[c] += r[c]; });
      t.other += r.other;
      t.total += r.total;
    }
    return t;
  }, [rows]);

  const hasOther = totals.other > 0;

  /**
   * Draws the table directly rather than screenshotting the page: the output stays real
   * text (selectable, searchable) and doesn't depend on how the page happens to be scrolled.
   */
  const downloadPdf = (only = null) => {
    // `only` is a single person's row — the per-employee export from the Action column.
    // Guarded because an onClick handler passed by reference would hand us a click event
    // here, whose cells are undefined and make jsPDF throw mid-draw.
    const single = only && typeof only === 'object' && typeof only.person === 'string' ? only : null;
    const exportRows = single ? [single] : rows;
    const showTotals = !single && rows.length > 1;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 40;
    let y = 50;

    doc.setFontSize(16);
    doc.setTextColor(17, 24, 39);
    doc.text(`${currentDept} — Workload report`, marginX, y);

    y += 18;
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(month ? monthLabel(month) : 'All time', marginX, y);
    y += 13;
    doc.text(
      `${single ? single.person : (isManager ? 'All assignees' : myName)} · generated ${new Date().toLocaleString('en-GB')}`,
      marginX, y
    );

    const headers = ['Assignee', ...COLUMNS.map(label), ...(hasOther ? ['Other'] : []), 'Total'];
    const body = exportRows.map(r => [
      r.person,
      ...COLUMNS.map(c => String(r[c])),
      ...(hasOther ? [String(r.other)] : []),
      String(r.total)
    ]);
    if (showTotals) {
      body.push([
        'All',
        ...COLUMNS.map(c => String(totals[c])),
        ...(hasOther ? [String(totals.other)] : []),
        String(totals.total)
      ]);
    }

    // First column takes the slack so long names aren't cramped by the count columns.
    const countWidth = 70;
    const nameWidth = pageWidth - marginX * 2 - countWidth * (headers.length - 1);
    const colWidth = (i) => (i === 0 ? nameWidth : countWidth);
    const colX = (i) => marginX + (i === 0 ? 0 : nameWidth + countWidth * (i - 1));

    y += 22;
    const drawHeader = () => {
      doc.setFillColor(243, 244, 246);
      doc.rect(marginX, y - 12, pageWidth - marginX * 2, 20, 'F');
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      headers.forEach((h, i) => {
        doc.text(h, i === 0 ? colX(i) + 6 : colX(i) + colWidth(i) / 2, y + 2, {
          align: i === 0 ? 'left' : 'center'
        });
      });
      y += 20;
    };
    drawHeader();

    doc.setFontSize(9);
    body.forEach((row, rowIndex) => {
      // New page before running off the bottom, repeating the header so it stays readable.
      if (y > pageHeight - 50) {
        doc.addPage();
        y = 50;
        drawHeader();
      }
      const isTotalRow = showTotals && rowIndex === body.length - 1;
      if (isTotalRow) {
        doc.setFillColor(249, 250, 251);
        doc.rect(marginX, y - 12, pageWidth - marginX * 2, 18, 'F');
      }
      doc.setTextColor(isTotalRow ? 17 : 31, isTotalRow ? 24 : 41, isTotalRow ? 39 : 55);
      row.forEach((cell, i) => {
        doc.text(cell, i === 0 ? colX(i) + 6 : colX(i) + colWidth(i) / 2, y, {
          align: i === 0 ? 'left' : 'center'
        });
      });
      doc.setDrawColor(229, 231, 235);
      doc.line(marginX, y + 6, pageWidth - marginX, y + 6);
      y += 18;
    });

    const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const who = single ? `-${slug(single.person)}` : '';
    doc.save(`workload-${slug(currentDept)}${who}-${month || 'all'}.pdf`);
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans">
      <BoardTabs department={currentDept} spaceName={`${currentDept} Workspace`} />

      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList size={18} className="text-gray-500" />
              <h1 className="text-xl font-semibold text-gray-900">Workload</h1>
            </div>
            <p className="text-[13px] text-gray-500">
              {isManager
                ? 'Work items per person on this board, by status.'
                : 'Your work items, by status.'}
              {' '}Counted by the month the work is scheduled in.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              disabled={months.length === 0}
              className="border border-gray-300 rounded px-3 py-1.5 text-[13px] bg-white outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
            >
              {months.length === 0 && <option value="">No dated work</option>}
              {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <button
              onClick={() => downloadPdf()}
              disabled={rows.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Download size={14} /> Download PDF
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400 bg-white border border-gray-200 rounded-lg">
            {isManager ? 'No work items on this board yet.' : 'You have no work items assigned.'}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5">
                      <span className="flex items-center gap-1.5"><Users size={13} /> Assignee</span>
                    </th>
                    {COLUMNS.map(c => (
                      <th key={c} className="text-center font-medium px-3 py-2.5">{label(c)}</th>
                    ))}
                    {hasOther && <th className="text-center font-medium px-3 py-2.5">Other</th>}
                    <th className="text-center font-semibold px-4 py-2.5">Total</th>
                    {/* A manager can pull one person's figures out on their own. */}
                    {isManager && <th className="text-center font-medium px-4 py-2.5">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map(r => (
                    <tr key={r.person} className="hover:bg-blue-50/40">
                      <td className="px-4 py-2.5 text-gray-900 font-medium">
                        {r.person === 'Unassigned'
                          ? <span className="text-gray-400">Unassigned</span>
                          : r.person}
                      </td>
                      {COLUMNS.map(c => (
                        <td key={c} className={`text-center px-3 py-2.5 ${r[c] ? 'text-gray-800' : 'text-gray-300'}`}>
                          {r[c]}
                        </td>
                      ))}
                      {hasOther && (
                        <td className={`text-center px-3 py-2.5 ${r.other ? 'text-gray-800' : 'text-gray-300'}`}>
                          {r.other}
                        </td>
                      )}
                      <td className="text-center px-4 py-2.5 font-semibold text-gray-900">{r.total}</td>
                      {isManager && (
                        <td className="text-center px-4 py-2.5">
                          {/* Unassigned isn't a person, so there's nothing to report on. */}
                          {r.person === 'Unassigned' ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <button
                              onClick={() => downloadPdf(r)}
                              title={`Download ${r.person}'s report for ${month ? monthLabel(month) : 'all time'}`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                            >
                              <Download size={12} /> PDF
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {rows.length > 1 && (
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td className="px-4 py-2.5 font-semibold text-gray-700">All</td>
                      {COLUMNS.map(c => (
                        <td key={c} className="text-center px-3 py-2.5 font-semibold text-gray-700">{totals[c]}</td>
                      ))}
                      {hasOther && <td className="text-center px-3 py-2.5 font-semibold text-gray-700">{totals.other}</td>}
                      <td className="text-center px-4 py-2.5 font-bold text-gray-900">{totals.total}</td>
                      {isManager && <td className="px-4 py-2.5" />}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkloadReportPage;

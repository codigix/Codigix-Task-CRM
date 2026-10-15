import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Sheet, ExternalLink, Link2, Unlink, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../../config/environment';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

/**
 * Google Sheet sync for the Backlog. A manager links the content-calendar sheet once; after
 * that anyone presses Sync to pull new rows in. Sync first asks the server what would change
 * (dry run), shows it, and only then creates the tickets.
 */

const ago = (v) => {
  if (!v) return 'never';
  const mins = Math.round((Date.now() - new Date(v).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDay = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '');

const postJson = async (url, body) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
};

export default function SheetSyncBar({ department, onSynced }) {
  const [sources, setSources] = useState(null);
  const [canManage, setCanManage] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`${API_BASE_URL}/sheet-sync/sources?department=${encodeURIComponent(department)}`)
      .then(r => r.json())
      .then(d => { setSources(d.sources || []); setCanManage(Boolean(d.canManage)); })
      .catch(() => setSources([]));
  }, [department]);

  useEffect(() => { load(); }, [load]);

  const linkSheet = async () => {
    const { value: url } = await Swal.fire({
      title: 'Link a Google Sheet',
      html: '<p style="font-size:13px;color:#4b5563;text-align:left;margin:0 0 8px">In Google Sheets choose <b>Share → General access → Anyone with the link (Viewer)</b>, copy the link and paste it below. Each client tab must be named like its project.</p>',
      input: 'url',
      inputPlaceholder: 'https://docs.google.com/spreadsheets/d/…',
      showCancelButton: true,
      confirmButtonText: 'Link sheet',
      showLoaderOnConfirm: true,
      preConfirm: async (value) => {
        try {
          return await postJson(`${API_BASE_URL}/sheet-sync/sources`, { url: value, department });
        } catch (e) {
          Swal.showValidationMessage(e.message);
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    });
    if (url && url.source) {
      showSuccessToast(`Sheet linked: ${url.tabs.length} client tab${url.tabs.length === 1 ? '' : 's'} found`);
      load();
    }
  };

  const unlink = async (source) => {
    const ok = await Swal.fire({
      icon: 'warning', title: 'Unlink this sheet?',
      text: 'Tickets already created stay as they are. Syncing stops until a sheet is linked again.',
      showCancelButton: true, confirmButtonText: 'Unlink', confirmButtonColor: '#dc2626'
    });
    if (!ok.isConfirmed) return;
    const r = await fetch(`${API_BASE_URL}/sheet-sync/sources/${source.id}`, { method: 'DELETE' });
    if (r.ok) { showSuccessToast('Sheet unlinked'); load(); } else showErrorToast('Could not unlink the sheet');
  };

  const sync = async (source) => {
    setBusy(true);
    try {
      const check = await postJson(`${API_BASE_URL}/sheet-sync/sources/${source.id}/run`, { dryRun: true });
      const skipped = (check.skippedTabs || []).filter(t => !/No tasks filled/.test(t.reason));
      const moved = check.moved || 0;
      if (!check.created && !check.updated && !moved) {
        setBusy(false);
        if (skipped.length) {
          Swal.fire({ icon: 'info', title: 'Nothing new to add', html: skippedHtml(skipped) });
        } else {
          showSuccessToast('Backlog is already up to date with the sheet');
        }
        load();
        return;
      }
      const tabsWithChanges = (check.tabs || []).filter(t => t.created || t.updated || t.moved);
      const html = `
        <div style="text-align:left;font-size:13px;color:#374151">
          <p style="margin:0 0 8px"><b>${check.created}</b> new task${check.created === 1 ? '' : 's'}${check.updated ? `, <b>${check.updated}</b> updated` : ''}${moved ? `, <b>${moved}</b> moved to the new date set in the sheet (no duplicate is created)` : ''}. ${check.alreadyInSystem + check.unchanged} already in the system are left as they are.</p>
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px">
            <tr style="color:#6b7280;text-align:left"><th style="padding:3px 4px">Client tab</th><th style="padding:3px 4px">Goes to</th><th style="padding:3px 4px;text-align:right">New</th><th style="padding:3px 4px;text-align:right">Updated</th><th style="padding:3px 4px;text-align:right">Moved</th></tr>
            ${tabsWithChanges.map(t => `<tr style="border-top:1px solid #f3f4f6"><td style="padding:3px 4px">${esc(t.tab)}</td><td style="padding:3px 4px">${t.sprint ? `Sprint: ${esc(t.sprint)}` : 'Backlog'}</td><td style="padding:3px 4px;text-align:right">${t.created}</td><td style="padding:3px 4px;text-align:right">${t.updated}</td><td style="padding:3px 4px;text-align:right">${t.moved || 0}</td></tr>`).join('')}
          </table>
          <div style="max-height:180px;overflow:auto;border:1px solid #e5e7eb;border-radius:4px;padding:4px 6px;font-size:12px">
            ${(check.preview || []).slice(0, 60).map(p => `<div style="padding:2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.kind === 'update' ? '✎' : p.kind === 'move' ? '⇄' : '+'} <span style="color:#6b7280">${p.kind === 'move' && p.from ? `${fmtDay(p.from)} → ` : ''}${fmtDay(p.date)}${p.service ? ` · ${esc(p.service)}` : ''}</span> ${p.kind === 'move' && p.issueKey ? `<b>${esc(p.issueKey)}</b> ` : ''}${esc(p.title)}</div>`).join('')}
          </div>
          ${skipped.length ? skippedHtml(skipped) : ''}
        </div>`;
      const go = await Swal.fire({ title: 'Sync from Google Sheet', html, width: 640, showCancelButton: true, confirmButtonText: `Apply ${check.created + check.updated + moved} change${check.created + check.updated + moved === 1 ? '' : 's'}` });
      if (!go.isConfirmed) { setBusy(false); return; }
      const done = await postJson(`${API_BASE_URL}/sheet-sync/sources/${source.id}/run`, {});
      showSuccessToast(`Synced: ${done.created} new, ${done.updated} updated${done.moved ? `, ${done.moved} moved` : ''}`);
      load();
      if (onSynced) onSynced();
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Sync failed', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  if (sources == null) return null;
  if (sources.length === 0) {
    if (!canManage) return null;
    return (
      <div className="mb-4 flex items-center justify-between gap-3 bg-white border border-dashed border-gray-300 rounded px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Sheet size={15} className="text-emerald-600" />
          Keep the backlog in step with your content-calendar Google Sheet.
        </div>
        <button onClick={linkSheet} className="h-8 px-3 text-xs font-medium rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer">
          <Link2 size={13} /> Link Google Sheet
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-2">
      {sources.map(s => {
        const last = s.lastResult;
        return (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 rounded px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0 text-xs">
              <Sheet size={15} className="text-emerald-600 shrink-0" />
              <span className="font-medium text-gray-800 truncate">{s.name || 'Google Sheet'}</span>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 shrink-0" title="Open the sheet">
                <ExternalLink size={12} />
              </a>
              <span className="text-gray-500 truncate">
                · Last synced {ago(s.lastSyncedAt)}{s.lastSyncedBy ? ` by ${s.lastSyncedBy}` : ''}
                {last && s.lastSyncedAt ? ` · ${last.created} added${last.updated ? `, ${last.updated} updated` : ''}${last.moved ? `, ${last.moved} moved` : ''}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {canManage && (
                <button onClick={() => unlink(s)} className="h-8 px-2 text-xs rounded text-gray-500 hover:bg-gray-100 flex items-center gap-1 cursor-pointer" title="Unlink this sheet">
                  <Unlink size={13} />
                </button>
              )}
              <button
                onClick={() => sync(s)}
                disabled={busy}
                className="h-8 px-3 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {busy ? 'Checking the sheet…' : 'Sync now'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function skippedHtml(skipped) {
  return `<div style="margin-top:8px;font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:4px;padding:6px 8px;text-align:left">
    <b>Tabs not synced:</b>${skipped.map(t => `<div>• ${esc(t.tab)}: ${esc(t.reason)}</div>`).join('')}
  </div>`;
}

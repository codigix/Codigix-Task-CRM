import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Link2, ImagePlus, Loader2, FileText, ShieldCheck, Send, Trash2 } from 'lucide-react';
import { uploadDescriptionFile, toAbsoluteFileUrl } from '../../utils/descriptionFiles';

/**
 * Proof needed to move a ticket into In Review (evidence the work is done) or to Done (the
 * reporting manager's sign-off comment). The server refuses the move without it.
 *
 * ProofForm is shown inside the ticket's details panel (the usual case: moving a card opens
 * the ticket with this box at the top). TransitionProofModal is the fallback for pages that
 * have no ticket panel.
 *
 * info: { kind: 'evidence' | 'approval', issueKey, title, from, to, reporter, assignee, evidence }
 */

const isUrl = (v) => /^https?:\/\/\S+$/i.test(String(v || '').trim());
const fmtWhen = (v) => (v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

export const ProofAttachments = ({ links = [], files = [] }) => (
  (links.length > 0 || files.length > 0) ? (
    <div className="mt-2 space-y-1.5">
      {links.map(l => (
        <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[12px] text-blue-700 hover:underline break-all">
          <Link2 size={12} className="shrink-0" /> {l}
        </a>
      ))}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map(f => {
            const href = toAbsoluteFileUrl(f.url);
            return f.isImage ? (
              <a key={f.url} href={href} target="_blank" rel="noopener noreferrer" title={f.name}>
                <img src={href} alt={f.name} className="h-20 w-28 object-cover rounded border border-gray-200" />
              </a>
            ) : (
              <a key={f.url} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[12px] text-blue-700 hover:underline px-2 py-1 border border-gray-200 rounded">
                <FileText size={12} /> {f.name}
              </a>
            );
          })}
        </div>
      )}
    </div>
  ) : null
);

/** The fields and buttons. onSubmit(proof) may be async; a thrown error is shown in the box. */
export function ProofForm({ info, onSubmit, onCancel, autoFocus = true }) {
  const isEvidence = info.kind === 'evidence';
  const [note, setNote] = useState('');
  const [linkDraft, setLinkDraft] = useState('');
  const [links, setLinks] = useState([]);
  const [files, setFiles] = useState([]); // { id, name, url, preview, isImage, uploading, error }
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInput = useRef(null);
  const noteRef = useRef(null);

  useEffect(() => { if (autoFocus) noteRef.current?.focus(); }, [autoFocus]);

  const addFiles = useCallback(async (list) => {
    const picked = Array.from(list || []).slice(0, 10);
    for (const file of picked) {
      const id = `${Date.now()}-${Math.random()}`;
      const isImage = String(file.type || '').startsWith('image/');
      setFiles(prev => [...prev, { id, name: file.name || 'screenshot.png', isImage, uploading: true, preview: isImage ? URL.createObjectURL(file) : null }]);
      try {
        const saved = await uploadDescriptionFile(file);
        setFiles(prev => prev.map(f => (f.id === id ? { ...f, uploading: false, name: saved.name, url: saved.filePath || saved.url, isImage: saved.isImage } : f)));
      } catch (e) {
        setFiles(prev => prev.map(f => (f.id === id ? { ...f, uploading: false, error: e.message } : f)));
      }
    }
  }, []);

  // Screenshots can be pasted straight in (Ctrl+V / Cmd+V).
  const onPaste = (e) => {
    const pasted = Array.from(e.clipboardData?.files || []);
    if (pasted.length) { e.preventDefault(); e.stopPropagation(); addFiles(pasted); }
  };

  const addLink = () => {
    const v = linkDraft.trim();
    if (!v) return;
    if (!isUrl(v)) { setError('Links must start with http:// or https://'); return; }
    if (!links.includes(v)) setLinks(prev => [...prev, v]);
    setLinkDraft(''); setError('');
  };

  const uploading = files.some(f => f.uploading);
  const readyFiles = files.filter(f => f.url && !f.error);
  const pendingLink = isUrl(linkDraft) ? [linkDraft.trim()] : [];
  const allLinks = [...links, ...pendingLink.filter(l => !links.includes(l))];
  const canSubmit = !uploading && (isEvidence ? Boolean(note.trim() || allLinks.length || readyFiles.length) : note.trim().length >= 3);

  const submit = async () => {
    if (!canSubmit) {
      setError(isEvidence ? 'Add a note, a link or a screenshot showing the work is done.' : 'Write a short comment on the finished work.');
      return;
    }
    setSaving(true); setError('');
    try {
      await onSubmit({ note: note.trim(), links: allLinks, files: readyFiles.map(f => ({ name: f.name, url: f.url, isImage: f.isImage })) });
    } catch (e) {
      setError(e.message || 'Could not save. Try again.');
      setSaving(false);
    }
  };

  const ev = info.evidence;

  return (
    <div onPaste={onPaste} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }} className="space-y-4">
      {!isEvidence && (
        <div className="rounded border border-purple-200 bg-purple-50/50 p-3">
          <div className="text-[11px] font-semibold text-purple-800 mb-1">Proof submitted</div>
          {ev ? (
            <>
              <div className="text-[11px] text-gray-500">{ev.author} · {fmtWhen(ev.time)}</div>
              {ev.text && <div className="text-[13px] text-gray-800 mt-1 whitespace-pre-wrap">{ev.text}</div>}
              <ProofAttachments links={ev.links} files={ev.files} />
            </>
          ) : <div className="text-xs text-gray-500">No proof was attached to this task. Check the work before approving it.</div>}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          {isEvidence ? 'What was done' : 'Your comment'} {!isEvidence && <span className="text-red-600">*</span>}
        </label>
        <textarea ref={noteRef} value={note} onChange={e => { setNote(e.target.value); setError(''); }} rows={3}
          placeholder={isEvidence ? 'e.g. Posted on GMB, creative approved by client, blog published at…' : 'e.g. Checked the post and the creative, looks good.'}
          className="w-full text-sm border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500 resize-y bg-white" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Links {isEvidence && <span className="font-normal text-gray-500">(live post, Drive, Figma, published page…)</span>}</label>
        <div className="flex gap-2">
          <input value={linkDraft} onChange={e => { setLinkDraft(e.target.value); setError(''); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
            placeholder="https://…" className="flex-1 h-9 text-sm border border-gray-300 rounded px-2.5 outline-none focus:border-blue-500 bg-white" />
          <button type="button" onClick={addLink} className="h-9 px-3 text-xs font-medium rounded border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer">Add</button>
        </div>
        {links.length > 0 && (
          <div className="mt-2 space-y-1">
            {links.map(l => (
              <div key={l} className="flex items-center gap-2 text-xs bg-white border border-gray-200 rounded px-2 py-1">
                <Link2 size={12} className="text-gray-400 shrink-0" />
                <span className="flex-1 truncate text-blue-700">{l}</span>
                <button onClick={() => setLinks(prev => prev.filter(x => x !== l))} className="text-gray-400 hover:text-red-600 cursor-pointer" aria-label="Remove link"><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Screenshots or files</label>
        <button type="button" onClick={() => fileInput.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 rounded p-3 text-xs text-gray-500 bg-white hover:border-blue-400 hover:bg-blue-50/30 flex items-center justify-center gap-2 cursor-pointer">
          <ImagePlus size={15} /> Click to choose, drag files here, or paste a screenshot (Ctrl+V)
        </button>
        <input ref={fileInput} type="file" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        {files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {files.map(f => (
              <div key={f.id} className="relative w-28">
                {f.preview || (f.isImage && f.url)
                  ? <img src={f.preview || toAbsoluteFileUrl(f.url)} alt={f.name} className={`h-20 w-28 object-cover rounded border ${f.error ? 'border-red-300 opacity-50' : 'border-gray-200'}`} />
                  : <div className="h-20 w-28 rounded border border-gray-200 bg-gray-50 flex items-center justify-center"><FileText size={20} className="text-gray-400" /></div>}
                {f.uploading && <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded"><Loader2 size={16} className="animate-spin text-gray-500" /></div>}
                <div className="text-[10px] text-gray-600 truncate mt-0.5" title={f.error || f.name}>{f.error ? `Failed: ${f.error}` : f.name}</div>
                <button onClick={() => setFiles(prev => prev.filter(x => x.id !== f.id))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-500 hover:text-red-600 flex items-center justify-center cursor-pointer" aria-label="Remove file"><Trash2 size={10} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5">{error}</div>}

      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-gray-500">{isEvidence ? 'At least one of: note, link or screenshot.' : 'A comment is required.'}</span>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={saving} className="h-9 px-4 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer disabled:opacity-60">Cancel</button>
          <button onClick={submit} disabled={uploading || saving}
            className={`h-9 px-4 text-sm font-medium rounded text-white cursor-pointer disabled:opacity-60 flex items-center gap-1.5 ${isEvidence ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            {(uploading || saving) && <Loader2 size={14} className="animate-spin" />}
            {uploading ? 'Uploading…' : saving ? 'Saving…' : isEvidence ? 'Submit for review' : 'Approve and mark Done'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Heading text shared by the panel box and the fallback dialog. */
export const ProofHeading = ({ info }) => {
  const isEvidence = info.kind === 'evidence';
  return (
    <div className="min-w-0">
      <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
        {isEvidence ? <Send size={16} className="text-purple-600" /> : <ShieldCheck size={16} className="text-emerald-600" />}
        {isEvidence ? 'Add proof of work to move this to In Review' : 'Approve and mark Done'}
      </h2>
      <p className="text-xs text-gray-500 mt-1">
        {isEvidence
          ? <>{info.reporter ? <><strong className="text-gray-700">{info.reporter}</strong> will check it and move it to Done.</> : 'Your reporting manager will check it and move it to Done.'}</>
          : <>Your comment is saved on the task{info.assignee ? <> for <strong className="text-gray-700">{info.assignee}</strong></> : ''}.</>}
      </p>
    </div>
  );
};

/** Fallback for pages without a ticket panel. onDone(proof | null). */
export default function TransitionProofModal({ info, onDone }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onDone(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={() => onDone(null)} aria-hidden="true" />
      <div className="relative w-full max-w-[560px] max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <ProofHeading info={info} />
            <p className="text-xs text-gray-500 mt-1 truncate"><span className="font-mono">{info.issueKey}</span>{info.title ? ` · ${info.title}` : ''}</p>
          </div>
          <button onClick={() => onDone(null)} className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer" aria-label="Cancel"><X size={18} /></button>
        </div>
        <div className="px-5 py-4">
          <ProofForm info={info} onSubmit={(proof) => onDone(proof)} onCancel={() => onDone(null)} />
        </div>
      </div>
    </div>
  );
}

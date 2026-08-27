import { API_BASE_URL, BASE_SERVER_URL } from '../config/environment';

/**
 * Helpers for putting real, persistent files inside a rich-text description.
 *
 * Previously the editors embedded `URL.createObjectURL(file)` blob URLs. Those only live as
 * long as the page does, so once the issue was saved and reloaded the attachment was a dead
 * link. These helpers upload the file first and embed the server URL instead, which is what
 * makes a pasted/attached file actually openable later (the Jira behaviour).
 */

/** Turn a stored file_path (`/uploads/x.pdf`) into an absolute, openable URL. */
export const toAbsoluteFileUrl = (filePath) => {
  if (!filePath) return '';
  if (/^https?:\/\//i.test(filePath)) return filePath;
  return `${BASE_SERVER_URL}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
};

export const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

/**
 * Uploads one file and returns its persisted details.
 * `meta` may carry project_id / task_id / deal_id / lead_id / userId so the file is linked
 * to the right record and shows up in that record's Files list too.
 */
/**
 * `meta` may be a plain object or a function returning one. Callers pass a function when the
 * values come from component state, so it is read at upload time rather than at render time
 * (reading it during render can hit the temporal dead zone for state declared further down).
 */
const resolveMeta = (meta) => {
  const resolved = typeof meta === 'function' ? meta() : meta;
  return resolved || {};
};

export const uploadDescriptionFile = async (file, meta = {}) => {
  const body = new FormData();
  body.append('file', file);
  Object.entries(resolveMeta(meta)).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      body.append(key, value);
    }
  });

  const res = await fetch(`${API_BASE_URL}/files/upload`, { method: 'POST', body });
  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err.error || err.details || '';
    } catch (e) { /* non-JSON error body */ }
    throw new Error(detail || `Upload failed for "${file.name}"`);
  }

  const saved = await res.json();
  return {
    id: saved.id,
    name: saved.name || file.name,
    url: toAbsoluteFileUrl(saved.file_path),
    sizeBytes: saved.size_bytes ?? file.size,
    mimeType: saved.mime_type || file.type,
    isImage: String(saved.mime_type || file.type || '').startsWith('image/')
  };
};

/**
 * HTML embedded into the description for an uploaded file.
 * Images render inline; anything else becomes a labelled download chip. Both are plain
 * anchors pointing at the server URL, so they keep working after save/reload.
 */
export const buildFileEmbedHtml = ({ url, name, sizeBytes, isImage }) => {
  const safeName = String(name || 'file').replace(/[<>&"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]
  ));
  const size = formatFileSize(sizeBytes);

  if (isImage) {
    return `<div class="crm-inline-file" contenteditable="false" style="margin:8px 0;">` +
      `<a href="${url}" target="_blank" rel="noopener noreferrer">` +
      `<img src="${url}" alt="${safeName}" style="max-width:100%;max-height:320px;border:1px solid #e5e7eb;border-radius:6px;display:block;" />` +
      `</a>` +
      `<div style="font-size:11px;color:#6b7280;margin-top:4px;">${safeName}${size ? ` (${size})` : ''}</div>` +
      `</div><p><br/></p>`;
  }

  return `<div class="crm-inline-file" contenteditable="false" style="margin:8px 0;">` +
    `<a href="${url}" target="_blank" rel="noopener noreferrer" download="${safeName}" ` +
    `style="display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;text-decoration:none;color:#0f172a;font-family:sans-serif;">` +
    `<span style="font-size:15px;">📎</span>` +
    `<span style="font-size:12px;font-weight:600;">${safeName}</span>` +
    `${size ? `<span style="font-size:11px;color:#64748b;">(${size})</span>` : ''}` +
    `</a></div><p><br/></p>`;
};

/**
 * Uploads the given files and inserts them at the caret in a contentEditable element.
 * Returns the uploaded file records so callers can also track them as attachments.
 */
export const insertFilesIntoEditor = async (editorEl, files, { meta = {}, onHtmlChange, onError } = {}) => {
  const list = Array.from(files || []);
  if (list.length === 0 || !editorEl) return [];

  const uploaded = [];
  for (const file of list) {
    try {
      const saved = await uploadDescriptionFile(file, meta);
      editorEl.focus();
      document.execCommand('insertHTML', false, buildFileEmbedHtml(saved));
      uploaded.push(saved);
    } catch (err) {
      if (onError) onError(err, file);
      else console.error('Failed to attach file to description:', err);
    }
  }

  if (onHtmlChange) onHtmlChange(editorEl.innerHTML);
  return uploaded;
};

/**
 * Paste handler for a contentEditable description: intercepts pasted files/images,
 * uploads them, and embeds them. Plain-text pastes fall through untouched.
 */
export const makeEditorPasteHandler = ({ getEditor, meta = {}, onHtmlChange, onError, onBusyChange }) => async (event) => {
  const items = event.clipboardData ? Array.from(event.clipboardData.files || []) : [];
  if (items.length === 0) return; // let normal text paste happen

  event.preventDefault();
  const editorEl = typeof getEditor === 'function' ? getEditor() : getEditor;
  if (!editorEl) return;

  if (onBusyChange) onBusyChange(true);
  try {
    await insertFilesIntoEditor(editorEl, items, { meta, onHtmlChange, onError });
  } finally {
    if (onBusyChange) onBusyChange(false);
  }
};

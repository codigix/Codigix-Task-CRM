/**
 * Deletes the screenshots of finished tickets once their sprint is completed.
 *
 * A screenshot is an image file this server stored (UPLOAD_DIR, linked as /api/uploads/<name>
 * or /uploads/<name>) that a ticket uses: an attachment, a proof-of-work file, or an image in
 * the description, comments or subtasks. Documents (PDF, Word, ...) are kept.
 *
 * For each screenshot: the file is deleted from the uploads folder, and only once that has
 * succeeded are its attachment and File manager rows removed and every place in the ticket
 * that showed it changed to say it was deleted. A file that is not in this server's uploads
 * folder (e.g. a copy of the database on another machine) is left alone and reported as
 * not found, so a path is never removed while its image stays on a server.
 * An image that any other ticket still uses is left alone. Deleting cannot be undone.
 */
const fs = require('fs');
const path = require('path');

// The server's uploads folder, unless a caller (e.g. scripts/purge-completed-screenshots.js run
// on the server) names it.
let defaultUploadDir = null;
const uploadDirOf = (override) => override || defaultUploadDir || (defaultUploadDir = require('../config/upload').UPLOAD_DIR);

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|heic|heif|avif|tiff?)$/i;
// "/api/uploads/<name>" or "/uploads/<name>" for an image, inside text or JSON.
const IMAGE_REF = /\/(?:api\/)?uploads\/([^"'\s)<>?#\\]+?\.(?:png|jpe?g|gif|webp|bmp|heic|heif|avif|tiff?))(?=["'\s)<>?#\\]|$)/gi;
const NOTE = 'Screenshot deleted after the sprint was completed';

const decode = (name) => { try { return decodeURIComponent(name); } catch (e) { return name; } };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const parseJson = (v, fallback) => {
  if (v == null) return fallback;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch (e) { return fallback; }
};

/** Image file names a piece of text refers to. */
const namesIn = (text) => {
  const out = new Set();
  String(text || '').replace(IMAGE_REF, (_, name) => { out.add(decode(name)); return _; });
  return out;
};

/** Text with every image pointing at one of `names` replaced by the deletion note. */
const scrub = (text, names) => {
  if (!text || !names.size) return text;
  let out = String(text);
  for (const name of names) {
    const ref = `[^"'\\s)<>]*?\\/(?:api\\/)?uploads\\/(?:${esc(name)}|${esc(encodeURIComponent(name))})`;
    out = out
      .replace(new RegExp(`<img\\b[^>]*?src=["']${ref}["'][^>]*>`, 'gi'), `<em>[${NOTE}]</em>`)
      .replace(new RegExp(`!\\[[^\\]]*\\]\\(${ref}\\)`, 'gi'), `_[${NOTE}]_`)
      .replace(new RegExp(`<a\\b[^>]*?href=["']${ref}["'][^>]*>[\\s\\S]*?<\\/a>`, 'gi'), `<em>[${NOTE}]</em>`);
  }
  return out;
};

/** The file on disk for a stored name, only if it really is inside the uploads folder. */
const diskPath = (name, uploadDir) => {
  const root = path.resolve(uploadDirOf(uploadDir));
  const full = path.resolve(root, path.basename(name));
  return full.startsWith(root + path.sep) ? full : null;
};

/**
 * Deletes the screenshots of these tickets. Returns
 *   { deleted: [{ issueKey, name }], notFound: [name], failed: [name], kept: [name] }
 * deleted: file removed from the uploads folder and from the ticket; notFound: not in this
 * server's uploads folder (ticket untouched); failed: could not be deleted (ticket untouched);
 * kept: still used by another ticket. dryRun: only report (deleted = would be deleted).
 */
async function purgeScreenshots(db, issueKeys, { actor = 'System', dryRun = false, uploadDir = null } = {}) {
  const keys = [...new Set((issueKeys || []).filter(Boolean))];
  if (!keys.length) return { deleted: [], notFound: [], failed: [], kept: [] };
  const inList = keys.map(() => '?').join(',');

  const [issues] = await db.query(
    `SELECT issue_key, description, comments, subtasks FROM it_kanban_issues WHERE issue_key IN (${inList})`, keys
  );
  const [attachments] = await db.query(
    `SELECT id, issue_key, file_path FROM it_kanban_attachments WHERE issue_key IN (${inList})`, keys
  ).catch(() => [[]]);

  // Which images each ticket uses.
  const byIssue = new Map();
  for (const row of issues) {
    const names = new Set([
      ...namesIn(row.description),
      ...namesIn(typeof row.comments === 'string' ? row.comments : JSON.stringify(row.comments || [])),
      ...namesIn(typeof row.subtasks === 'string' ? row.subtasks : JSON.stringify(row.subtasks || []))
    ]);
    byIssue.set(row.issue_key, names);
  }
  for (const a of attachments) {
    const name = decode(path.basename(String(a.file_path || '')));
    if (/\/uploads\//.test(String(a.file_path || '')) && IMAGE_EXT.test(name)) {
      if (!byIssue.has(a.issue_key)) byIssue.set(a.issue_key, new Set());
      byIssue.get(a.issue_key).add(name);
    }
  }

  // Never delete an image another ticket still uses.
  const all = new Set([...byIssue.values()].flatMap(s => [...s]));
  const kept = new Set();
  for (const name of all) {
    const like = `%uploads/${name}%`;
    const likeEnc = `%uploads/${encodeURIComponent(name)}%`;
    const [[other]] = await db.query(
      `SELECT COUNT(*) AS n FROM it_kanban_issues WHERE issue_key NOT IN (${inList})
         AND (description LIKE ? OR description LIKE ? OR comments LIKE ? OR comments LIKE ? OR subtasks LIKE ? OR subtasks LIKE ?)`,
      [...keys, like, likeEnc, like, likeEnc, like, likeEnc]
    );
    const [[otherAtt]] = await db.query(
      `SELECT COUNT(*) AS n FROM it_kanban_attachments WHERE issue_key NOT IN (${inList}) AND (file_path LIKE ? OR file_path LIKE ?)`,
      [...keys, like, likeEnc]
    ).catch(() => [[{ n: 0 }]]);
    if (Number(other?.n) > 0 || Number(otherAtt?.n) > 0) kept.add(name);
  }

  const candidates = [];
  for (const [issueKey, names] of byIssue) {
    for (const name of names) if (!kept.has(name)) candidates.push({ issueKey, name });
  }

  // Only a file that is really in this server's uploads folder counts.
  const onDisk = new Map();
  for (const name of new Set(candidates.map(c => c.name))) {
    const file = diskPath(name, uploadDir);
    onDisk.set(name, Boolean(file) && await fs.promises.stat(file).then(st => st.isFile()).catch(() => false));
  }
  const notFound = [...onDisk].filter(([, ok]) => !ok).map(([name]) => name);
  if (dryRun) return { deleted: candidates.filter(c => onDisk.get(c.name)), notFound, failed: [], kept: [...kept] };

  // Delete the files first; a ticket only changes for the files that are really gone.
  const gone = new Set();
  const failed = [];
  for (const [name, ok] of onDisk) {
    if (!ok) continue;
    try {
      await fs.promises.unlink(diskPath(name, uploadDir));
      gone.add(name);
    } catch (e) {
      if (e.code === 'ENOENT') gone.add(name); // removed in the meantime: it is gone either way
      else { failed.push(name); console.error(`Could not delete ${name}:`, e.message); }
    }
  }
  const deleted = candidates.filter(c => gone.has(c.name));
  if (!deleted.length) return { deleted, notFound, failed, kept: [...kept] };

  for (const name of gone) {
    const paths = [`/api/uploads/${name}`, `/uploads/${name}`, `/api/uploads/${encodeURIComponent(name)}`, `/uploads/${encodeURIComponent(name)}`];
    await db.query(`DELETE FROM files WHERE file_path IN (${paths.map(() => '?').join(',')})`, paths).catch(() => { });
  }

  for (const row of issues) {
    const names = new Set([...(byIssue.get(row.issue_key) || [])].filter(n => gone.has(n)));
    if (!names.size) continue;
    const comments = (parseJson(row.comments, []) || []).map(c => {
      if (!c || typeof c !== 'object') return c;
      const files = Array.isArray(c.files) ? c.files.filter(f => !names.has(decode(path.basename(String(f?.url || ''))))) : c.files;
      const removed = Array.isArray(c.files) ? c.files.length - files.length : 0;
      return { ...c, text: scrub(c.text, names), files, ...(removed ? { removed_files: (c.removed_files || 0) + removed } : {}) };
    });
    const subtasks = (parseJson(row.subtasks, []) || []).map(st => (st && typeof st === 'object'
      ? { ...st, description: scrub(st.description, names) } : st));
    await db.query(
      'UPDATE it_kanban_issues SET description = ?, comments = ?, subtasks = ? WHERE issue_key = ?',
      [scrub(row.description, names), JSON.stringify(comments), JSON.stringify(subtasks), row.issue_key]
    );
  }
  for (const a of attachments) {
    if (gone.has(decode(path.basename(String(a.file_path || ''))))) {
      await db.query('DELETE FROM it_kanban_attachments WHERE id = ?', [a.id]);
    }
  }
  const perIssue = deleted.reduce((m, d) => m.set(d.issueKey, (m.get(d.issueKey) || 0) + 1), new Map());
  for (const [issueKey, n] of perIssue) {
    await db.query('INSERT INTO it_kanban_history (issue_key, field, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?)',
      [issueKey, 'screenshots', String(n), `${n} screenshot${n === 1 ? '' : 's'} deleted (sprint completed)`, actor]).catch(() => { });
  }
  return { deleted, notFound, failed, kept: [...kept] };
}

module.exports = { purgeScreenshots, namesIn, scrub, IMAGE_EXT };

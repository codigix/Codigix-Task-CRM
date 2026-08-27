import React, { useRef, useEffect, useState } from 'react';
import {
  Sparkles, Paperclip, Check, X, FileText, Trash2,
  Bold, Italic, List, ListOrdered, Code, Link, Plus,
  Type
} from 'lucide-react';
import { API_BASE_URL } from '../../../config/environment';
import { insertFilesIntoEditor, makeEditorPasteHandler } from '../../../utils/descriptionFiles';
import Swal from 'sweetalert2';

const stripHtmlTags = (str) => {
  if (!str) return '';
  let text = str
    .replace(/###\s*/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<hr[^>]*>/gi, '\n---\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/✨\s*AI Enterprise Improvements.*$/gm, '')
    .replace(/\(Generated dynamically based on.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
};

const convertPastedHtml = (htmlText) => {
  if (!htmlText) return '';
  return htmlText
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, g1) => '\n\n' + g1.replace(/<[^>]+>/g, '').trim() + '\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, g1) => '\n• ' + g1.replace(/<[^>]+>/g, '').trim())
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, g1) => '\n' + g1.replace(/<[^>]+>/g, '').trim() + '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const renderFormattedDescription = (text) => {
  if (!text) return null;

  if (text.includes('<')) {
    return (
      <div
        className="prose prose-xs max-w-none text-xs text-gray-800 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_li]:my-1 [&_li]:text-gray-800 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mt-3 [&_h3]:mb-1 [&_h4]:text-xs [&_h4]:font-bold [&_h4]:text-gray-900 [&_h4]:mt-2 [&_h4]:mb-1 [&_strong]:font-bold [&_b]:font-bold font-sans [&_a]:text-blue-600 [&_a]:no-underline [&_img]:max-w-full [&_img]:rounded"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }

  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-xs text-gray-800 leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1.5" />;

        const lower = trimmed.toLowerCase();
        const knownHeaderTitles = [
          'summary', 'context', 'overview', 'user story', 'future enhancements:', 'future enhancements',
          'functional requirements:', 'functional requirements', 'acceptance criteria:', 'acceptance criteria',
          'user roles', 'user roles:', 'prepared by:', 'prepared by', 'system flow', 'admin dashboard',
          'client management', 'student (mentor) management', 'package management', 'reports & analytics',
          'user management', 'student (mentor) dashboard', 'assigned client management', 'remedy assignment',
          'follow-up tracking', 'notes management', 'progress monitoring', 'client activity tracking',
          'client dashboard', 'profile management', 'remedy tracking', 'follow-up schedule', 'progress tracking',
          'document upload', 'session history', 'remedies management', 'follow-up management', 'client pwa',
          'push notifications', 'other information', 'major database tables'
        ];
        const isHeader = /^#+\s+/.test(trimmed) || knownHeaderTitles.includes(lower) || (trimmed.endsWith(':') && trimmed.length < 45 && !trimmed.includes('http'));

        if (isHeader) {
          const title = trimmed.replace(/^#+\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '');
          return <h3 key={idx} className="text-sm font-bold text-gray-900 mt-4 mb-1 block">{title}</h3>;
        }

        const isExplicitBullet = /^[•\-\*]\s*/.test(trimmed);
        const isKnownListItem = /^(admin dashboard|student|client|remedies|follow-up|client pwa|whatsapp|internal chat|ai assistant|video calling|native android|native ios|multi-language|notes|sessions|notifications|activity_logs)/i.test(trimmed);

        if (isExplicitBullet || isKnownListItem) {
          const content = trimmed.replace(/^[•\-\*]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2.5 ml-2 my-1 text-gray-800">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-900 shrink-0 mt-1.5 inline-block" />
              <span className="font-medium text-gray-800 text-xs">{content}</span>
            </div>
          );
        }

        return <p key={idx} className="my-0.5 text-gray-800 font-normal">{trimmed}</p>;
      })}
    </div>
  );
};

const ITIssueDescription = ({
  issue,
  description,
  setDescription,
  isEditingDescription,
  setIsEditingDescription,
  tempDescription,
  setTempDescription,
  handleSaveDescription,
  handleImproveDescription,
  aiLoading,
  isImprovingSideBySide,
  setIsImprovingSideBySide,
  improvedDescription,
  setImprovedDescription,
  attachments,
  handleFileUpload,
  handleRemoveAttachment,
  selectedPdfUrl,
  setSelectedPdfUrl,
  fileInputRef,
  handleUpdate
}) => {
  const editorRef = useRef(null);
  const [isAiWriting, setIsAiWriting] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Files pasted/dropped into the description are uploaded and embedded as real server
  // URLs, so they stay openable after the issue is saved and reloaded.
  const descriptionFileMeta = () => ({
    project_id: issue?.project_id || undefined
  });

  const attachFilesToDescription = async (files) => {
    if (!files || files.length === 0 || !editorRef.current) return;
    setIsUploadingFile(true);
    try {
      await insertFilesIntoEditor(editorRef.current, files, {
        meta: descriptionFileMeta,
        onHtmlChange: (html) => setTempDescription(html),
        onError: (err) => Swal.fire('Upload failed', err.message, 'error')
      });
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDescriptionPaste = makeEditorPasteHandler({
    getEditor: () => editorRef.current,
    meta: descriptionFileMeta,
    onHtmlChange: (html) => setTempDescription(html),
    onError: (err) => Swal.fire('Upload failed', err.message, 'error'),
    onBusyChange: setIsUploadingFile
  });

  // Safely initialize editor content when mounted
  useEffect(() => {
    if (isEditingDescription && editorRef.current && !isAiWriting) {
      const contentToSet = tempDescription || description || '';
      if (!editorRef.current.innerHTML || editorRef.current.innerHTML.trim() === '') {
        editorRef.current.innerHTML = contentToSet.includes('<') ? contentToSet : contentToSet.replace(/\n/g, '<br/>');
      }
    }
  }, [isEditingDescription, description, isAiWriting]);

  // Execute native rich formatting command (Bold, Italic, Lists, Headings)
  const executeCommand = (command, value = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    setTempDescription(editorRef.current.innerHTML);
  };

  const handleSave = () => {
    const finalHtml = editorRef.current ? editorRef.current.innerHTML : (tempDescription || description);
    setTempDescription(finalHtml);
    // Delegate to the parent's save handler and pass the html explicitly. The parent knows
    // whether we're editing the issue or one of its subtasks; calling handleUpdate directly
    // here would always write to the parent issue and overwrite its description.
    handleSaveDescription(finalHtml);
  };

  const handleRovoAiWrite = async () => {
    setIsEditingDescription(true);
    setIsAiWriting(true);

    try {
      // Wait for editorRef element to mount in DOM
      await new Promise(r => setTimeout(r, 120));

      const targetIssueKey = issue?.issue_key || issue?.key || 'WR-101';
      const targetTitle = issue?.title || 'CRM Feature';
      const currentDesc = tempDescription || description || '';

      const res = await fetch(`${API_BASE_URL}/it-kanban/issues/${targetIssueKey}/ai/improve-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: targetTitle, description: currentDesc })
      });

      if (!res.ok) throw new Error('AI improvement request failed');
      const data = await res.json();
      const improvedHtml = data.improvedDescription || '';

      setTempDescription(improvedHtml);
      if (editorRef.current) {
        editorRef.current.innerHTML = improvedHtml;
      }
    } catch (err) {
      console.error('AI improvement failed:', err);
      // Fallback: restore current text if AI call fails
      if (editorRef.current && !editorRef.current.innerHTML) {
        const fallbackText = tempDescription || description || '';
        editorRef.current.innerHTML = fallbackText.includes('<') ? fallbackText : fallbackText.replace(/\n/g, '<br/>');
      }
    } finally {
      setIsAiWriting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Description Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-700 tracking-wide block">Description</label>
        </div>

        {isEditingDescription ? (
          <div className="space-y-3">
            {/* Jira-Style Rich WYSIWYG Editor Box */}
            <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
              {/* Rich Format Toolbar */}
              <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 flex-wrap text-gray-600 text-xs select-none">
                <button
                  type="button"
                  onClick={handleRovoAiWrite}
                  disabled={isAiWriting}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-indigo-700 font-semibold bg-indigo-50/80 hover:bg-indigo-100 rounded border border-indigo-200 transition disabled:opacity-50 cursor-pointer mr-1"
                  title="Improve description with AI"
                >
                  <Sparkles size={13} className="text-indigo-600 fill-indigo-100 animate-pulse" />
                  <span>{isAiWriting ? 'AI Writing...' : 'Improve description'}</span>
                </button>

                <div className="w-px h-4 bg-gray-300 mx-1" />

                <button
                  type="button"
                  onClick={() => executeCommand('formatBlock', '<h3>')}
                  className="p-1.5 hover:bg-gray-200 rounded text-gray-700 font-bold text-xs cursor-pointer flex items-center gap-0.5"
                  title="Heading H3"
                >
                  <Type size={13} />
                  <span className="text-[10px]">H3</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeCommand('bold')}
                  className="p-1.5 hover:bg-gray-200 rounded text-gray-700 cursor-pointer font-bold"
                  title="Bold (Ctrl+B)"
                >
                  <Bold size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => executeCommand('italic')}
                  className="p-1.5 hover:bg-gray-200 rounded text-gray-700 cursor-pointer"
                  title="Italic (Ctrl+I)"
                >
                  <Italic size={13} />
                </button>

                <div className="w-px h-4 bg-gray-300 mx-1" />

                <button
                  type="button"
                  onClick={() => executeCommand('insertUnorderedList')}
                  className="p-1.5 hover:bg-gray-200 rounded text-gray-700 cursor-pointer"
                  title="Bullet List"
                >
                  <List size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => executeCommand('insertOrderedList')}
                  className="p-1.5 hover:bg-gray-200 rounded text-gray-700 cursor-pointer"
                  title="Numbered List"
                >
                  <ListOrdered size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => executeCommand('formatBlock', '<pre>')}
                  className="p-1.5 hover:bg-gray-200 rounded text-gray-700 cursor-pointer"
                  title="Code Block"
                >
                  <Code size={13} />
                </button>

                <div className="w-px h-4 bg-gray-300 mx-1" />

                <button
                  type="button"
                  onClick={() => {
                    const url = prompt('Enter hyperlink URL:', 'https://');
                    if (url) executeCommand('createLink', url);
                  }}
                  className="p-1.5 hover:bg-gray-200 rounded text-gray-700 cursor-pointer"
                  title="Insert Hyperlink"
                >
                  <Link size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => executeCommand('insertHorizontalRule')}
                  className="p-1.5 hover:bg-gray-200 rounded text-gray-700 cursor-pointer"
                  title="Divider Line"
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* Real Visual ContentEditable Div */}
              <div
                ref={editorRef}
                contentEditable
                onInput={() => {
                  if (editorRef.current) setTempDescription(editorRef.current.innerHTML);
                }}
                onPaste={handleDescriptionPaste}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  if (e.dataTransfer?.files?.length) {
                    e.preventDefault();
                    attachFilesToDescription(e.dataTransfer.files);
                  }
                }}
                className="w-full text-xs p-3 focus:outline-none font-sans leading-relaxed text-gray-800 bg-white min-h-[180px] outline-none prose prose-xs max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mt-2 [&_h3]:mb-1 [&_strong]:font-bold [&_b]:font-bold [&_a]:text-blue-600 [&_a]:underline [&_img]:max-w-full [&_img]:rounded"
              />
              {isUploadingFile && (
                <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-blue-600 border-t border-gray-200 bg-blue-50/50">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Uploading file…
                </div>
              )}
            </div>

            {/* Jira Rovo AI Floating Status Bar */}
            {isAiWriting && (
              <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-lg text-white text-xs shadow-lg animate-pulse my-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="font-semibold flex-1">✨ AI is writing description...</span>
              </div>
            )}

            {/* Jira-Style Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSave}
                className="px-3.5 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 cursor-pointer transition shadow-xs"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingDescription(false);
                  setIsAiWriting(false);
                }}
                className="px-3.5 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-xs font-medium cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => {
              setTempDescription(description);
              setIsEditingDescription(true);
            }}
            className="min-h-[70px] p-3 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50/60 cursor-pointer text-xs text-gray-800 leading-relaxed transition font-sans group"
            title="Click to edit description"
          >
            {description ? (
              renderFormattedDescription(description)
            ) : (
              <span className="text-gray-400 italic group-hover:text-blue-600 transition">Add a description...</span>
            )}
          </div>
        )}
      </div>

      {/* Attachments Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-700 tracking-wide block">
            Attachments ({attachments.length})
          </label>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline bg-transparent cursor-pointer"
          >
            <Paperclip size={13} /> Add Attachment
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            multiple
          />
        </div>

        {attachments.length > 0 && (
          <div className="grid grid-cols-2 gap-2 my-2">
            {attachments.map((file, idx) => (
              <div key={idx} className="p-2 border border-gray-200 rounded flex items-center justify-between bg-gray-50/50 hover:bg-gray-50 transition group">
                <div
                  className="flex items-center gap-2 cursor-pointer truncate min-w-0"
                  onClick={() => {
                    if (file.type?.includes('pdf') || file.name?.endsWith('.pdf')) {
                      setSelectedPdfUrl(file.url);
                    } else if (file.url) {
                      window.open(file.url, '_blank');
                    }
                  }}
                >
                  <FileText size={14} className="text-blue-500 shrink-0" />
                  <div className="truncate">
                    <div className="text-xs font-medium text-gray-800 truncate" title={file.name}>{file.name}</div>
                    <div className="text-[10px] text-gray-400">{file.size || 'Attachment'}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveAttachment(idx)}
                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 transition cursor-pointer shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDF PREVIEW MODAL */}
      {selectedPdfUrl && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3 bg-gray-100 border-b flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-700">PDF Viewer</span>
              <button
                onClick={() => setSelectedPdfUrl(null)}
                className="p-1 hover:bg-gray-200 rounded text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <iframe src={selectedPdfUrl} className="w-full flex-1 border-none" title="PDF Preview" />
          </div>
        </div>
      )}

      {/* AI SIDE-BY-SIDE DESCRIPTION MODAL */}
      {isImprovingSideBySide && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-blue-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-600 fill-indigo-100" />
                <h3 className="text-sm font-semibold text-gray-900">AI Description Improver</h3>
              </div>
              <button onClick={() => setIsImprovingSideBySide(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4 flex-1 overflow-y-auto text-xs">
              <div className="space-y-1.5">
                <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Original Description</span>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 min-h-[150px] leading-relaxed">
                  {description ? renderFormattedDescription(description) : 'No description'}
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="font-semibold text-indigo-600 uppercase tracking-wider text-[10px]">AI Enhanced Description</span>
                <textarea
                  value={stripHtmlTags(improvedDescription)}
                  onChange={(e) => setImprovedDescription(e.target.value)}
                  className="w-full h-[180px] p-3 bg-indigo-50/30 border border-indigo-200 rounded-lg text-gray-900 leading-relaxed outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                />
              </div>
            </div>
            <div className="p-3 border-t bg-gray-50 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsImprovingSideBySide(false)}
                className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const cleanImp = stripHtmlTags(improvedDescription);
                  // Route through the parent's save handler so an AI rewrite applied while
                  // viewing a subtask lands on that subtask, not on the parent issue.
                  setTempDescription(cleanImp);
                  handleSaveDescription(cleanImp);
                  setIsImprovingSideBySide(false);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <Check size={13} /> Accept & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITIssueDescription;

import React, { useState, useRef, useEffect } from 'react';
import {
  Bold, Italic, Code, Heading, List, ListOrdered, Link,
  AtSign, User, Send, X, CornerDownLeft, Type, Underline
} from 'lucide-react';

const JiraCommentEditor = ({
  value = '',
  onChange,
  onSave,
  onCancel,
  usersList = [],
  currentUser = 'You',
  placeholder = 'Type /ai or @ to mention and notify someone...',
  autoFocus = true
}) => {
  const editorRef = useRef(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);

  // Normalize user names from usersList
  const normalizedUsers = React.useMemo(() => {
    return (usersList || []).map(u => {
      if (typeof u === 'string') return { name: u, id: u };
      return {
        name: u.name || u.full_name || u.username || 'User',
        id: u.id || u.username || u.name,
        avatar: u.avatar || null,
        department: u.department || null
      };
    }).filter(u => u.name && u.name !== 'Unassigned');
  }, [usersList]);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current) {
      if (value && editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
      if (autoFocus) {
        editorRef.current.focus();
      }
    }
  }, []);

  // Execute standard visual rich text command (bold, italic, list, etc.)
  const executeCommand = (cmd, arg = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(cmd, false, arg);
    checkActiveFormatting();
    handleContentChange();
  };

  const checkActiveFormatting = () => {
    try {
      setIsBoldActive(document.queryCommandState('bold'));
      setIsItalicActive(document.queryCommandState('italic'));
    } catch (_) {}
  };

  // Synchronize state with editor content
  const handleContentChange = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const plainText = editorRef.current.innerText || '';
    if (onChange) {
      onChange(html);
    }

    // Check for @mention trigger in plain text at cursor
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const textBeforeCursor = textNode.textContent.slice(0, range.startOffset);
        const match = textBeforeCursor.match(/@([a-zA-Z0-9_\s]*)$/);
        if (match && !match[1].includes('\n') && match[1].length <= 20) {
          setMentionQuery(match[1].toLowerCase());
          setSelectedMentionIndex(0);
          return;
        }
      }
    }
    setMentionQuery(null);
  };

  // Insert styled @mention chip directly into visual contentEditable
  const insertMention = (userName) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const mentionHtml = `<span class="mention-pill" contenteditable="false" style="display:inline-flex;align-items:center;padding:1px 6px;margin:0 2px;border-radius:12px;background:#e0e7ff;color:#3730a3;font-weight:600;font-size:11px;user-select:all;border:1px solid #c7d2fe;">@${userName}</span>&nbsp;`;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && mentionQuery !== null) {
      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const textBefore = textNode.textContent.slice(0, range.startOffset);
        const atIndex = textBefore.lastIndexOf('@');
        if (atIndex !== -1) {
          range.setStart(textNode, atIndex);
          range.deleteContents();
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = mentionHtml;
          const frag = document.createDocumentFragment();
          let node;
          while ((node = tempDiv.firstChild)) {
            frag.appendChild(node);
          }
          range.insertNode(frag);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } else {
      document.execCommand('insertHTML', false, mentionHtml);
    }

    setMentionQuery(null);
    handleContentChange();
  };

  // Filtered mention options
  const mentionMatches = React.useMemo(() => {
    if (mentionQuery === null) return [];
    return normalizedUsers.filter(u =>
      u.name.toLowerCase().includes(mentionQuery)
    ).slice(0, 6);
  }, [mentionQuery, normalizedUsers]);

  // Quick suggestion chips (top 4 team members)
  const quickSuggestions = React.useMemo(() => {
    return normalizedUsers.slice(0, 4);
  }, [normalizedUsers]);

  const handleKeyDown = (e) => {
    checkActiveFormatting();

    // Mention dropdown keyboard navigation
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => (prev + 1) % mentionMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => (prev - 1 + mentionMatches.length) % mentionMatches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionMatches[selectedMentionIndex].name);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }

    // Ctrl + Enter to Save
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  const handleSave = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML.trim();
    const text = editorRef.current.innerText.trim();
    if (!text && !html) return;
    if (onSave) {
      onSave(html);
    }
  };

  return (
    <div className="border border-blue-500/80 ring-2 ring-blue-500/20 rounded-lg bg-white shadow-sm overflow-hidden text-xs relative">
      {/* ── JIRA RICH TEXT TOOLBAR (VISUAL WYSIWYG) ── */}
      <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-gray-200 bg-gray-50/80 flex-wrap select-none">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('bold'); }}
          className={`p-1.5 rounded transition cursor-pointer font-bold ${
            isBoldActive ? 'bg-blue-100 text-blue-700 shadow-xs' : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold size={13} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('italic'); }}
          className={`p-1.5 rounded transition cursor-pointer ${
            isItalicActive ? 'bg-blue-100 text-blue-700 shadow-xs' : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic size={13} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('underline'); }}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700 transition cursor-pointer"
          title="Underline (Ctrl+U)"
        >
          <Underline size={13} />
        </button>
        <span className="w-px h-3.5 bg-gray-300 mx-0.5" />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('formatBlock', '<h3>'); }}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700 transition cursor-pointer font-bold flex items-center gap-0.5"
          title="Heading (H3)"
        >
          <Type size={13} />
          <span className="text-[10px]">H</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('insertUnorderedList'); }}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700 transition cursor-pointer"
          title="Bullet list"
        >
          <List size={13} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('insertOrderedList'); }}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700 transition cursor-pointer"
          title="Numbered list"
        >
          <ListOrdered size={13} />
        </button>
        <span className="w-px h-3.5 bg-gray-300 mx-0.5" />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('formatBlock', '<pre>'); }}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700 transition cursor-pointer"
          title="Code Block"
        >
          <Code size={13} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            const url = prompt('Enter link URL:', 'https://');
            if (url) executeCommand('createLink', url);
          }}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700 transition cursor-pointer"
          title="Insert Link"
        >
          <Link size={13} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            if (editorRef.current) {
              editorRef.current.focus();
              document.execCommand('insertText', false, '@');
              setMentionQuery('');
            }
          }}
          className="p-1 hover:bg-blue-100 text-blue-600 rounded transition ml-auto flex items-center gap-1 font-semibold text-[11px] cursor-pointer"
          title="Mention someone (@)"
        >
          <AtSign size={13} /> Mention
        </button>
      </div>

      {/* ── REAL CONTENTEDITABLE VISUAL EDITOR ── */}
      <div className="relative p-2.5">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleContentChange}
          onKeyUp={checkActiveFormatting}
          onMouseUp={checkActiveFormatting}
          onKeyDown={handleKeyDown}
          data-placeholder={placeholder}
          className="w-full text-xs outline-none min-h-[75px] font-sans leading-relaxed text-gray-800 bg-white prose prose-xs max-w-none [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-gray-900 [&_pre]:bg-gray-100 [&_pre]:p-1.5 [&_pre]:rounded [&_a]:text-blue-600 [&_a]:underline empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:cursor-text"
        />

        {/* ── @MENTION AUTOCOMPLETE DROPDOWN ── */}
        {mentionQuery !== null && mentionMatches.length > 0 && (
          <div className="absolute left-4 top-12 z-50 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
              Mention Teammate
            </div>
            {mentionMatches.map((u, idx) => (
              <div
                key={u.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(u.name);
                }}
                className={`px-2.5 py-1.5 flex items-center gap-2 cursor-pointer transition ${
                  idx === selectedMentionIndex ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                  {u.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="truncate">{u.name}</span>
                {u.department && (
                  <span className="ml-auto text-[9px] text-gray-400">{u.department}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── JIRA QUICK MENTION SUGGESTION CHIPS ── */}
      {quickSuggestions.length > 0 && (
        <div className="px-2.5 pb-2 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-400 font-medium">Quick mention:</span>
          {quickSuggestions.map(u => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(u.name);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 text-[10px] font-medium transition cursor-pointer border border-gray-200/60"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-gray-300 text-gray-700 text-[8px] flex items-center justify-center font-bold">
                {u.name[0]?.toUpperCase()}
              </span>
              <span>+ {u.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── ACTIONS BAR ── */}
      <div className="flex items-center justify-between px-2.5 py-2 bg-gray-50/70 border-t border-gray-100">
        <span className="text-[10px] text-gray-400 font-normal">
          Press <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-[9px] font-mono shadow-2xs">Ctrl + Enter</kbd> to save
        </span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 rounded text-xs text-gray-600 hover:bg-gray-200/70 transition cursor-pointer font-medium"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-3.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition cursor-pointer shadow-xs active:scale-95"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default JiraCommentEditor;

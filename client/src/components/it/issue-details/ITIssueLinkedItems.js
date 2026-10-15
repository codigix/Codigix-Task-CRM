import React, { useMemo } from 'react';
import { CornerDownRight, Plus, Trash2, Search } from 'lucide-react';

/**
 * Linked work items. Link by typing a key or part of a title (matching tickets are listed),
 * or by pasting a ticket link (the Share button's ...?ticketKey=KEY link) or any text with a key.
 */
const ITIssueLinkedItems = ({
  linkedIssues,
  isLinkingIssue,
  setIsLinkingIssue,
  linkRelation,
  setLinkRelation,
  linkSearchInput,
  setLinkSearchInput,
  handleCreateLinkedIssue,
  deleteLinkedIssue,
  issuesList = [],
  currentKey,
  inSubtask = false,
  onOpenLinked
}) => {
  // Suggestions while typing: key or title contains what was typed. A pasted link isn't searched.
  const suggestions = useMemo(() => {
    const q = String(linkSearchInput || '').trim().toLowerCase();
    if (!q || /^https?:\/\//.test(q)) return [];
    const linked = new Set(linkedIssues.map(l => `${l.key}|${l.relation}`));
    return issuesList
      // A task can't link to itself; from a subtask, its main task is offered (labelled).
      .filter(i => i.issue_key && (inSubtask || i.issue_key !== currentKey) && !linked.has(`${i.issue_key}|${linkRelation}`))
      .filter(i => String(i.issue_key).toLowerCase().includes(q) || String(i.title || '').toLowerCase().includes(q))
      .sort((a, b) => Number(!String(a.issue_key).toLowerCase().startsWith(q)) - Number(!String(b.issue_key).toLowerCase().startsWith(q)))
      .slice(0, 8);
  }, [linkSearchInput, issuesList, linkedIssues, linkRelation, inSubtask, currentKey]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs  text-gray-700 tracking-wide block">Linked work items</label>
        <button
          onClick={() => setIsLinkingIssue(!isLinkingIssue)}
          className="flex items-center gap-1 text-xs text-blue-600  hover:underline bg-transparent cursor-pointer"
        >
          <Plus size={13} /> Link work item
        </button>
      </div>

      <div className="space-y-2">
        {linkedIssues.map(li => (
          <div key={`${li.key}-${li.relation}`} className="flex items-center justify-between gap-2 text-xs border border-gray-100 p-2 rounded bg-gray-50/50 hover:bg-gray-50 transition">
            <div className="flex items-center gap-2 min-w-0">
              <CornerDownRight size={13} className="text-gray-400 shrink-0" />
              <span className="text-gray-500 shrink-0">{li.relation}</span>
              <button type="button" onClick={() => onOpenLinked && onOpenLinked(li.key)} className="text-blue-600 hover:underline shrink-0 cursor-pointer" title={`Open ${li.key}`}>{li.key}</button>
              <span className="text-gray-700 font-medium truncate">{li.title}</span>
            </div>
            <button
              onClick={() => deleteLinkedIssue(li.key)}
              className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition cursor-pointer shrink-0"
              title="Remove link"
              aria-label={`Remove link to ${li.key}`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {isLinkingIssue && (
        <div className="bg-gray-50 border border-gray-200 rounded p-3 space-y-3 animate-in fade-in duration-150">
          <select
            value={linkRelation}
            onChange={(e) => setLinkRelation(e.target.value)}
            className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="is blocked by">is blocked by</option>
            <option value="blocks">blocks</option>
            <option value="relates to">relates to</option>
            <option value="is duplicated by">is duplicated by</option>
          </select>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={linkSearchInput}
              onChange={(e) => setLinkSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && linkSearchInput.trim()) { e.preventDefault(); handleCreateLinkedIssue(); } }}
              placeholder="Search by key or title, or paste a ticket link"
              className="w-full text-xs bg-white border border-gray-300 rounded pl-8 pr-2.5 py-1.5 outline-none focus:border-blue-500"
              aria-label="Work item to link"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map(i => (
                  <li key={i.issue_key}>
                    <button
                      type="button"
                      onClick={() => handleCreateLinkedIssue(i.issue_key)}
                      className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-blue-600 shrink-0">{i.issue_key}</span>
                      <span className="text-gray-700 truncate">{i.title}</span>
                      {inSubtask && i.issue_key === currentKey && <span className="ml-auto shrink-0 text-[10px] text-gray-400">main task</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => handleCreateLinkedIssue()}
              disabled={!linkSearchInput.trim()}
              className={`px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition cursor-pointer ${!linkSearchInput.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Link
            </button>
            <button
              onClick={() => { setIsLinkingIssue(false); setLinkSearchInput(''); }}
              className="px-3 py-1 border border-gray-300 hover:bg-gray-100 rounded text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITIssueLinkedItems;

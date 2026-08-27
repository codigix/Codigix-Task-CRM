import React from 'react';
import { CornerDownRight, Plus, Trash2 } from 'lucide-react';

const ITIssueLinkedItems = ({
  linkedIssues,
  isLinkingIssue,
  setIsLinkingIssue,
  linkRelation,
  setLinkRelation,
  linkSearchInput,
  setLinkSearchInput,
  handleCreateLinkedIssue,
  deleteLinkedIssue
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-700 tracking-wide block">Linked work items</label>
        <button
          onClick={() => setIsLinkingIssue(!isLinkingIssue)}
          className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline bg-transparent cursor-pointer"
        >
          <Plus size={13} /> Link work item
        </button>
      </div>

      <div className="space-y-2">
        {linkedIssues.map(li => (
          <div key={li.key} className="flex items-center justify-between text-xs border border-gray-100 p-2 rounded bg-gray-50/50 hover:bg-gray-50 group transition">
            <div className="flex items-center gap-2">
              <CornerDownRight size={13} className="text-gray-400" />
              <span className="font-semibold text-gray-500">{li.relation}</span>
              <a href={`#${li.key}`} className="font-semibold text-blue-600 hover:underline">{li.key}</a>
              <span className="text-gray-700 font-medium truncate max-w-[200px]">{li.title}</span>
            </div>
            <button
              onClick={() => deleteLinkedIssue(li.key)}
              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 rounded transition cursor-pointer"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {isLinkingIssue && (
        <div className="bg-gray-50 border border-gray-200 rounded p-3 space-y-3 animate-in fade-in duration-150">
          <div className="flex gap-2">
            <div className="interactive-dropdown relative flex-1">
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
            </div>
          </div>
          <input
            type="text"
            value={linkSearchInput}
            onChange={(e) => setLinkSearchInput(e.target.value)}
            placeholder="Type, search or paste URL (e.g. WR-102)"
            className="w-full text-xs bg-white border border-gray-300 rounded px-2.5 py-1.5 outline-none focus:border-blue-500"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCreateLinkedIssue}
              disabled={!linkSearchInput.trim()}
              className={`px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition cursor-pointer ${!linkSearchInput.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Link
            </button>
            <button
              onClick={() => setIsLinkingIssue(false)}
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

import React from 'react';
import {
  Edit3, Eye, Share2, MoreHorizontal, Lock, Paperclip,
  Minimize2, Maximize2, X, Folder
} from 'lucide-react';

// Matches the server's definition of finished work.
const isDoneStatus = (s) => ['DONE', 'COMPLETED', 'CLOSED'].includes(String(s || '').toUpperCase().trim());

const ITIssueHeaderBar = ({
  issue,
  type,
  TYPE_ICONS,
  isWatching,
  watchCount,
  handleWatchToggle,
  isExpanded,
  setIsExpanded,
  onClose,
  deleteIssue,
  openDropdown,
  toggleDropdown,
  currentSubtask,
  onBackToParent,
  projectName
}) => {
  return (
    <div className="h-14 border-b border-gray-200 px-5 flex items-center justify-between bg-white shrink-0">
      {/* Breadcrumb Info */}
      <div className="flex items-center gap-1 text-sm text-gray-500 font-medium min-w-0">
        {/* The project leads the breadcrumb, so which project the work belongs to is visible
            without scrolling the Details list down to the Project field. */}
        {projectName && (
          <>
            <div className="flex items-center gap-1 py-1 px-1.5 text-gray-700 font-semibold truncate max-w-[220px]" title={projectName}>
              <Folder size={12} className="text-gray-400 shrink-0" />
              <span className="truncate">{projectName}</span>
            </div>
            <span className="text-gray-300">/</span>
          </>
        )}
        {currentSubtask ? (
          <>
            <button
              onClick={onBackToParent}
              className="flex items-center gap-1 py-1 px-1.5 hover:bg-gray-100 rounded text-blue-600 font-semibold transition cursor-pointer"
              title="Return to parent issue"
            >
              {TYPE_ICONS[type] || TYPE_ICONS.Task}
              <span>{issue?.issue_key || issue?.key}</span>
            </button>
            <span className="text-gray-300">/</span>
            <div className="flex items-center gap-1 py-1 px-1.5 text-gray-800 font-semibold">
              <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="3" x2="6" y2="15"></line>
                <circle cx="18" cy="6" r="3"></circle>
                <circle cx="6" cy="18" r="3"></circle>
                <path d="M18 9a9 9 0 0 1-9 9"></path>
              </svg>
              <span>{currentSubtask.subtaskKey || currentSubtask.key || `${issue?.key}-1`}</span>
            </div>
          </>
        ) : (
          <>
            <button className="flex items-center gap-1 py-1 px-1.5 hover:bg-gray-100 rounded text-gray-600 font-semibold transition">
              <Edit3 size={12} className="text-gray-400" />
              <span>Add epic</span>
            </button>
            <span className="text-gray-300">/</span>
            <div className="flex items-center gap-1 py-1 px-1.5 text-blue-600 font-semibold hover:underline cursor-pointer">
              {TYPE_ICONS[type] || TYPE_ICONS.Task}
              {/* Jira strikes through the key of a finished work item. */}
              <span className={isDoneStatus(issue?.status) ? 'line-through' : ''}>
                {issue?.issue_key || issue?.key}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Action icons on right */}
      <div className="flex items-center gap-1">
        {/* Watcher button */}
        <button
          onClick={handleWatchToggle}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded border transition ${
            isWatching
              ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Eye size={13} />
          <span>{watchCount}</span>
        </button>

        {/* Share */}
        <button className="p-1.5 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 transition" title="Share">
          <Share2 size={13} />
        </button>

        {/* More actions dropdown */}
        <div className="interactive-dropdown relative">
          <button
            onClick={() => toggleDropdown('header-more')}
            className="p-1.5 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 transition cursor-pointer"
          >
            <MoreHorizontal size={13} />
          </button>
          {openDropdown === 'header-more' && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-200 rounded shadow-lg py-1 z-50 text-xs">
              <div className="p-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2 text-gray-700">
                <Lock size={12} /> Restrict access
              </div>
              <div className="p-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2 text-gray-700">
                <Paperclip size={12} /> Attach file
              </div>
              <hr className="my-1 border-gray-100" />
              <div
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this issue?')) {
                    if (deleteIssue && issue) deleteIssue(issue.issue_key || issue.key);
                  }
                }}
                className="p-2 hover:bg-red-50 text-red-600 cursor-pointer font-medium"
              >
                Delete issue
              </div>
            </div>
          )}
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 transition ml-2 cursor-pointer"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>

        {/* Close Sidebar */}
        <button onClick={onClose} className="p-1.5 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 transition ml-1 cursor-pointer" title="Close">
          <X size={13} />
        </button>
      </div>
    </div>
  );
};

export default ITIssueHeaderBar;

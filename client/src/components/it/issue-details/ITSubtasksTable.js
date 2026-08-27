import React, { useState } from 'react';
import { Plus, Sparkles, ChevronDown, User, Trash2, X, CheckSquare, Edit3 } from 'lucide-react';

const ITSubtasksTable = ({
  issue,
  subtasks,
  setSubtasks,
  isAddingSubtask,
  setIsAddingSubtask,
  newSubtaskTitle,
  setNewSubtaskTitle,
  handleAddSubtask,
  handleDetailedSubtaskSuggest,
  handleSubtaskAiImprove,
  deleteSubtask,
  handleUpdate,
  aiLoading,
  getInitials,
  PRIORITY_ICONS,
  usersList = [],
  onSelectSubtask
}) => {
  const [selectedSubtaskForView, setSelectedSubtaskForView] = useState(null);
  const [subtaskViewIndex, setSubtaskViewIndex] = useState(null);

  const handleAssigneeChange = (stId, newAssignee) => {
    const updatedSubtasks = subtasks.map(item =>
      item.id === stId
        ? { ...item, assignee: newAssignee }
        : item
    );
    setSubtasks(updatedSubtasks);
    handleUpdate({ subtasks: updatedSubtasks });
    if (selectedSubtaskForView && selectedSubtaskForView.id === stId) {
      setSelectedSubtaskForView(prev => ({ ...prev, assignee: newAssignee }));
    }
  };

  const handlePriorityChange = (stId, newPriority) => {
    const updatedSubtasks = subtasks.map(item =>
      item.id === stId
        ? { ...item, priority: newPriority }
        : item
    );
    setSubtasks(updatedSubtasks);
    handleUpdate({ subtasks: updatedSubtasks });
    if (selectedSubtaskForView && selectedSubtaskForView.id === stId) {
      setSelectedSubtaskForView(prev => ({ ...prev, priority: newPriority }));
    }
  };

  const handleTitleChange = (stId, newTitle) => {
    const updatedSubtasks = subtasks.map(item =>
      item.id === stId
        ? { ...item, title: newTitle }
        : item
    );
    setSubtasks(updatedSubtasks);
    handleUpdate({ subtasks: updatedSubtasks });
  };

  return (
    <div className="space-y-3">
      {/* Subtasks Header & Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-700 tracking-wide block">
            Subtasks ({subtasks.filter(s => s.completed || s.status === 'Done').length} of {subtasks.length} completed)
          </label>
          {subtasks.length > 0 && (
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
              {Math.round((subtasks.filter(s => s.completed || s.status === 'Done').length / subtasks.length) * 100)}%
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setIsAddingSubtask(!isAddingSubtask);
            if (!isAddingSubtask) {
              setTimeout(() => document.getElementById('subtask-inline-input')?.focus(), 50);
            }
          }}
          className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline bg-transparent cursor-pointer"
          title="Add subtask"
        >
          <Plus size={13} /> Add subtask
        </button>
      </div>

      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(subtasks.filter(s => s.completed || s.status === 'Done').length / subtasks.length) * 100}%` }}
          />
        </div>
      )}

      {/* Unified Single Subtask Creation Box */}
      {isAddingSubtask && (
        <div className="p-3 bg-blue-50/40 border border-blue-200 rounded-lg space-y-2.5 my-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <input
              id="subtask-inline-input"
              type="text"
              autoFocus
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                  handleAddSubtask();
                }
              }}
              placeholder="What needs to be done?"
              className="flex-1 text-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 shadow-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer shadow-xs transition"
              >
                Create
              </button>
              <button
                onClick={() => setIsAddingSubtask(false)}
                className="px-2.5 py-1.5 text-gray-500 hover:text-gray-700 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* AI Auto-Suggest Button */}
            <button
              onClick={handleDetailedSubtaskSuggest}
              disabled={aiLoading.subtasks}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded text-xs font-medium transition cursor-pointer shadow-xs"
              title="AI reads description and creates 5-8 technical subtasks"
            >
              <Sparkles size={13} className="text-indigo-600 fill-indigo-100" />
              <span>{aiLoading.subtasks ? 'Generating...' : '✨ AI Auto-Subtasks'}</span>
            </button>
          </div>
        </div>
      )}

      {/* JIRA SUBTASKS DATA TABLE - CLEAN TABLE-FIXED FIT */}
      {subtasks.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden my-3 shadow-2xs font-sans text-xs bg-white">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-2 px-3 font-semibold text-gray-600 w-[42%] truncate">Work</th>
                <th className="py-2 px-1 font-semibold text-gray-600 w-[14%] text-center truncate">Priority</th>
                <th className="py-2 px-1 font-semibold text-gray-600 w-[24%] text-center truncate">Assignee</th>
                <th className="py-2 px-2 font-semibold text-gray-600 w-[16%] text-right truncate">Status</th>
                <th className="py-2 px-1 w-[4%] text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subtasks.map((st, idx) => {
                const subtaskKey = `${issue?.issue_key || issue?.key || 'WR-101'}-${idx + 1}`;
                const isDone = st.completed || st.status === 'Done' || st.status === 'DONE';
                const currentSubtaskStatus = isDone ? 'Done' : (st.status || 'To Do');
                const stAssignee = (!st.assignee || st.assignee === 'Unassigned' || st.assignee.includes('Manager') || st.assignee.includes('Admin')) ? 'Unassigned' : st.assignee;

                return (
                  <tr key={st.id || idx} className="hover:bg-blue-50/30 transition group">
                    {/* WORK COLUMN: Icon + Key + Title (Clickable & Hover Edit Pencil!) */}
                    <td className="py-2 px-3 align-middle">
                      <div className="flex items-center gap-2 min-w-0 group/title">
                        <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="6" y1="3" x2="6" y2="15"></line>
                          <circle cx="18" cy="6" r="3"></circle>
                          <circle cx="6" cy="18" r="3"></circle>
                          <path d="M18 9a9 9 0 0 1-9 9"></path>
                        </svg>
                        <span
                          onClick={() => {
                            if (onSelectSubtask) onSelectSubtask(st, subtaskKey);
                            else {
                              setSelectedSubtaskForView({ ...st, subtaskKey, assignee: stAssignee });
                              setSubtaskViewIndex(idx);
                            }
                          }}
                          className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer shrink-0"
                          title="Click to view subtask details"
                        >
                          {subtaskKey}
                        </span>
                        <span
                          onClick={() => {
                            if (onSelectSubtask) onSelectSubtask(st, subtaskKey);
                            else {
                              setSelectedSubtaskForView({ ...st, subtaskKey, assignee: stAssignee });
                              setSubtaskViewIndex(idx);
                            }
                          }}
                          className={`text-xs font-medium truncate cursor-pointer hover:text-blue-600 transition ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}
                          title={`Click to view: ${st.title}`}
                        >
                          {st.title}
                        </span>
                        <button
                          onClick={() => {
                            if (onSelectSubtask) onSelectSubtask(st, subtaskKey);
                            else {
                              setSelectedSubtaskForView({ ...st, subtaskKey, assignee: stAssignee });
                              setSubtaskViewIndex(idx);
                            }
                          }}
                          className="opacity-0 group-hover/title:opacity-100 text-gray-400 hover:text-blue-600 p-0.5 rounded transition cursor-pointer shrink-0 ml-0.5"
                          title="Edit subtask"
                        >
                          <Edit3 size={11} />
                        </button>
                      </div>
                    </td>

                    {/* PRIORITY COLUMN */}
                    <td className="py-2 px-1 align-middle text-center">
                      <div className="flex items-center justify-center gap-1" title={`Priority: ${st.priority || 'Medium'}`}>
                        {PRIORITY_ICONS[st.priority || 'Medium'] || PRIORITY_ICONS.Medium}
                        <span className="text-[11px] text-gray-600 font-medium">{st.priority || 'Medium'}</span>
                      </div>
                    </td>

                    {/* ASSIGNEE COLUMN: Native Interactive Select Dropdown */}
                    <td className="py-2 px-1 align-middle text-center">
                      <div className="flex items-center justify-center gap-1 min-w-0">
                        {stAssignee === 'Unassigned' ? (
                          <div className="w-4 h-4 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center shrink-0">
                            <User size={10} className="text-gray-500" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                            {getInitials(stAssignee)}
                          </div>
                        )}
                        <div className="relative flex items-center min-w-0">
                          <select
                            value={stAssignee}
                            onChange={(e) => handleAssigneeChange(st.id, e.target.value)}
                            className="text-[11px] font-medium text-gray-700 bg-transparent border-none focus:outline-none cursor-pointer truncate max-w-[85px] appearance-none pr-3"
                            title="Change subtask assignee"
                          >
                            <option value="Unassigned">Unassigned</option>
                            {usersList.map(u => {
                              const uName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
                              return (
                                <option key={u.id || uName} value={uName}>
                                  {uName}
                                </option>
                              );
                            })}
                          </select>
                          <ChevronDown size={9} className="text-gray-400 shrink-0 pointer-events-none absolute right-0 top-1" />
                        </div>
                      </div>
                    </td>

                    {/* STATUS COLUMN: Interactive Status Dropdown */}
                    <td className="py-2 px-2 align-middle text-right">
                      <div className="relative inline-block text-left">
                        <select
                          value={currentSubtaskStatus}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            const updatedSubtasks = subtasks.map(item =>
                              item.id === st.id
                                ? { ...item, status: newStatus, completed: newStatus === 'Done' }
                                : item
                            );
                            setSubtasks(updatedSubtasks);
                            handleUpdate({ subtasks: updatedSubtasks });
                          }}
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded border appearance-none cursor-pointer pr-5 focus:outline-none transition ${
                            currentSubtaskStatus === 'Done'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : currentSubtaskStatus === 'In Progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-300'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          <option value="To Do">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Done">Done</option>
                        </select>
                        <ChevronDown size={10} className="absolute right-1.5 top-1.5 text-gray-500 pointer-events-none" />
                      </div>
                    </td>

                    {/* ACTIONS COLUMN */}
                    <td className="py-2 px-1 align-middle text-right">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition justify-end">
                        <button
                          onClick={() => handleSubtaskAiImprove(st, idx)}
                          className="text-indigo-500 hover:text-indigo-700 p-0.5 rounded hover:bg-indigo-50 transition cursor-pointer"
                          title="✨ AI Subtask Spec Sheet"
                        >
                          <Sparkles size={11} className="fill-indigo-100" />
                        </button>
                        <button
                          onClick={() => deleteSubtask(st.id)}
                          className="text-gray-400 hover:text-red-500 p-0.5 rounded transition cursor-pointer"
                          title="Delete subtask"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SUBTASK QUICK VIEW / INSPECT MODAL */}
      {selectedSubtaskForView && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 font-sans animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 flex flex-col">
            {/* Modal Header */}
            <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-blue-600" />
                <span className="text-xs font-semibold text-blue-600">{selectedSubtaskForView.subtaskKey}</span>
                <span className="text-xs text-gray-400">Subtask Details</span>
              </div>
              <button
                onClick={() => setSelectedSubtaskForView(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 text-xs">
              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Subtask Title</label>
                <input
                  type="text"
                  value={selectedSubtaskForView.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setSelectedSubtaskForView(prev => ({ ...prev, title: newTitle }));
                    handleTitleChange(selectedSubtaskForView.id, newTitle);
                  }}
                  className="w-full text-sm font-semibold text-gray-900 border border-gray-300 rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Status & Priority & Assignee Grid */}
              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded border border-gray-100">
                {/* Status */}
                <div>
                  <span className="text-[10px] font-semibold text-gray-500 block mb-1">Status</span>
                  <select
                    value={selectedSubtaskForView.status || 'To Do'}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setSelectedSubtaskForView(prev => ({ ...prev, status: newStatus }));
                      const updatedSubtasks = subtasks.map(item =>
                        item.id === selectedSubtaskForView.id
                          ? { ...item, status: newStatus, completed: newStatus === 'Done' }
                          : item
                      );
                      setSubtasks(updatedSubtasks);
                      handleUpdate({ subtasks: updatedSubtasks });
                    }}
                    className="w-full text-xs font-semibold px-2 py-1 rounded border border-gray-300 bg-white"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <span className="text-[10px] font-semibold text-gray-500 block mb-1">Priority</span>
                  <select
                    value={selectedSubtaskForView.priority || 'Medium'}
                    onChange={(e) => handlePriorityChange(selectedSubtaskForView.id, e.target.value)}
                    className="w-full text-xs font-semibold px-2 py-1 rounded border border-gray-300 bg-white"
                  >
                    <option value="Highest">Highest</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="Lowest">Lowest</option>
                    <option value="Not Decided">Not Decided</option>
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <span className="text-[10px] font-semibold text-gray-500 block mb-1">Assignee</span>
                  <select
                    value={selectedSubtaskForView.assignee || 'Unassigned'}
                    onChange={(e) => handleAssigneeChange(selectedSubtaskForView.id, e.target.value)}
                    className="w-full text-xs font-semibold px-2 py-1 rounded border border-gray-300 bg-white"
                  >
                    <option value="Unassigned">Unassigned</option>
                    {usersList.map(u => {
                      const uName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
                      return <option key={u.id || uName} value={uName}>{uName}</option>;
                    })}
                  </select>
                </div>
              </div>

              {/* Parent Task Context */}
              <div className="bg-blue-50/50 border border-blue-100 rounded p-2.5 text-xs">
                <span className="text-gray-500 font-medium block text-[11px]">Parent Ticket</span>
                <span className="font-semibold text-blue-600">{issue?.key || 'WR-101'}: {issue?.title}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs">
              <button
                onClick={() => {
                  deleteSubtask(selectedSubtaskForView.id);
                  setSelectedSubtaskForView(null);
                }}
                className="text-red-600 hover:text-red-700 font-semibold cursor-pointer flex items-center gap-1"
              >
                <Trash2 size={13} /> Delete Subtask
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleSubtaskAiImprove(selectedSubtaskForView, subtaskViewIndex || 0);
                    setSelectedSubtaskForView(null);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold rounded hover:bg-indigo-100 cursor-pointer flex items-center gap-1"
                >
                  <Sparkles size={12} /> ✨ AI Spec Sheet
                </button>
                <button
                  onClick={() => setSelectedSubtaskForView(null)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold cursor-pointer"
                >
                  Done / Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITSubtasksTable;

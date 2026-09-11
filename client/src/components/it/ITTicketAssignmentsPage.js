import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskAPI, projectAPI, itKanbanAPI } from '../../services/api';
import BoardTabs from '../common/BoardTabs';
import { FileText, ChevronLeft, Search, Filter, Eye, X, Clock, User, Briefcase, Activity, Calendar, MessageSquare, History } from 'lucide-react';

const ITTicketAssignmentsPage = () => {
  const { username, designation } = useParams();
  const navigate = useNavigate();
  const urlPrefix = `/it/${designation || 'manager'}/${username || 'user'}`;

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Filters state
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');

  // Modal state
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projRes, generalTasksRes, projectTasksRes, kanbanRes] = await Promise.all([
          projectAPI.getAll(),
          taskAPI.getAllGeneral(),
          taskAPI.getAllProjectTasks(),
          itKanbanAPI.getIssues()
        ]);

        setProjects(projRes || []);

        // Map Kanban issues to standard task format
        const mappedKanban = (kanbanRes?.issues || kanbanRes || []).map(issue => ({
          ...issue,
          title: issue.summary || issue.title,
          created_by_name: issue.reporter || 'System',
          assigned_to_name: issue.assignee,
          priority: issue.priority,
          status: issue.status,
          project_id: issue.project_id,
          created_at: issue.created_at,
          due_date: issue.due_date,
          source: 'kanban_issue'
        }));

        // Combine both general, project, and kanban tasks, filtering out system-created ones
        const combinedTasks = [
          ...(generalTasksRes || []),
          ...(projectTasksRes || []),
          ...mappedKanban
        ]
          .filter(task => {
            const creator = task.created_by_name || task.reporter;
            return creator && creator !== 'System';
          })
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        setTasks(combinedTasks);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Get unique options for filters
  const uniqueStatuses = [...new Set(tasks.map(t => t.status).filter(Boolean))];
  const uniquePriorities = [...new Set(tasks.map(t => t.priority).filter(Boolean))];
  const uniqueCreators = [...new Set(tasks.map(t => t.created_by_name || t.reporter).filter(Boolean))];
  const uniqueAssignees = [...new Set(tasks.map(t => t.assigned_to_name || t.assignee).filter(Boolean))];

  const filteredTasks = tasks.filter(task => {
    const matchSearch = task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.created_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assigned_to_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = !statusFilter || task.status === statusFilter;
    const matchPriority = !priorityFilter || task.priority === priorityFilter;
    const matchCreator = !createdByFilter || (task.created_by_name || task.reporter) === createdByFilter;
    const matchAssignee = !assignedToFilter || (task.assigned_to_name || task.assignee) === assignedToFilter;

    return matchSearch && matchStatus && matchPriority && matchCreator && matchAssignee;
  });

  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC] font-sans">
      <div className="flex-1 flex flex-col min-w-0">
        <BoardTabs department="IT" spaceName="IT Workspace" />
        <div className="p-4 flex-1">
          {/* HEADER */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(urlPrefix + '/dashboard')}
                  className="p-2 bg-white border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <div>
                  <h1 className="text-xl text-gray-900 font-semibold flex items-center gap-2">
                    <FileText className="text-indigo-600" size={20} />
                    Ticket Assignments Overview
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">Detailed view of ticket creation and assignments across IT.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-white border border-gray-200 p-2 rounded-md text-sm">
                  <span className="font-semibold text-gray-900">{filteredTasks.length}</span> <span className="text-gray-500">Tickets Found</span>
                </div>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-3 flex-wrap p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mr-2">
                <Filter size={16} /> Filters:
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-indigo-500 w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select
                className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="">All Priorities</option>
                {uniquePriorities.map(p => <option key={p} value={p}>{p}</option>)}
              </select>

              <select
                className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 max-w-[150px]"
                value={createdByFilter}
                onChange={(e) => setCreatedByFilter(e.target.value)}
              >
                <option value="">All Creators</option>
                {uniqueCreators.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 max-w-[150px]"
                value={assignedToFilter}
                onChange={(e) => setAssignedToFilter(e.target.value)}
              >
                <option value="">All Assignees</option>
                {uniqueAssignees.map(a => <option key={a} value={a}>{a}</option>)}
              </select>

              {(statusFilter || priorityFilter || createdByFilter || assignedToFilter || searchTerm) && (
                <button
                  onClick={() => {
                    setStatusFilter('');
                    setPriorityFilter('');
                    setCreatedByFilter('');
                    setAssignedToFilter('');
                    setSearchTerm('');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-auto"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* TABLE CONTENT */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading tickets...</div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="p-4 font-medium">Ticket Title</th>
                      <th className="p-4 font-medium">Project</th>
                      <th className="p-4 font-medium">Created By</th>
                      <th className="p-4 font-medium">Assigned To</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Priority</th>
                      <th className="p-4 font-medium">Due Date</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTasks.map((task, idx) => {
                      let priorityColor = 'text-gray-600 bg-gray-50 border-gray-200';
                      if (task.priority === 'High') priorityColor = 'text-rose-700 bg-rose-50 border-rose-200';
                      else if (task.priority === 'Medium') priorityColor = 'text-amber-700 bg-amber-50 border-amber-200';
                      else if (task.priority === 'Low') priorityColor = 'text-green-700 bg-green-50 border-green-200';

                      let statusColor = 'text-gray-600 bg-gray-50 border-gray-200';
                      if (task.status === 'In Progress') statusColor = 'text-blue-700 bg-blue-50 border-blue-200';
                      else if (task.status === 'Completed' || task.status === 'Done') statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';

                      return (
                        <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-4 font-medium text-gray-900">{task.title || 'Untitled'}</td>
                          <td className="p-4 text-gray-600">{projects.find(p => p.id === task.project_id)?.name || 'General IT'}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
                                {(task.created_by_name || 'System').charAt(0)}
                              </div>
                              <span className="text-gray-700 font-medium">{task.created_by_name || 'System'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {task.assigned_to_name ? (
                                <>
                                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-semibold shrink-0">
                                    {task.assigned_to_name.charAt(0)}
                                  </div>
                                  <span className="text-gray-700 font-medium">{task.assigned_to_name}</span>
                                </>
                              ) : (
                                <span className="text-gray-400 italic text-xs px-2 py-1 bg-gray-100 rounded">Unassigned</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded text-xs font-medium border ${statusColor}`}>
                              {task.status || 'Pending'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded text-xs font-medium border ${priorityColor}`}>
                              {task.priority || 'Normal'}
                            </span>
                          </td>
                          <td className="p-4 text-gray-500 text-xs">
                            {task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Due Date'}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setSelectedTicket(task)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-xs font-semibold transition-colors"
                            >
                              <Eye size={14} /> View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredTasks.length === 0 && !loading && (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <FileText size={32} className="text-gray-300" />
                            <p>No tickets found matching your criteria.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* TICKET HIERARCHY MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                    {selectedTicket.title || 'Untitled Ticket'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {selectedTicket.source === 'kanban_issue' ? 'Kanban Issue' : selectedTicket.source === 'project_task' ? 'Project Task' : 'General Task'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-2 pb-10 max-h-[75vh] overflow-y-auto custom-scrollbar">

              <div className="relative pl-8 space-y-10 before:absolute before:inset-y-0 before:left-3 before:w-[2px] before:bg-indigo-50 animate-in fade-in slide-in-from-bottom-2 duration-300">

                {/* Step 1: Initiation */}
                <div className="relative">
                  <div className="absolute -left-8 w-6 h-6 rounded-full bg-blue-100 border-4 border-white flex items-center justify-center shadow-sm">
                    <User size={10} className="text-blue-600" />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Initiated By</h4>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                          {selectedTicket.created_by_name || selectedTicket.reporter || 'System User'}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
                      <Clock size={14} /> {selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown Time'}
                    </div>
                  </div>
                </div>

                {/* Step 2: Context / Project */}
                <div className="relative">
                  <div className="absolute -left-8 w-6 h-6 rounded-full bg-purple-100 border-4 border-white flex items-center justify-center shadow-sm">
                    <Briefcase size={10} className="text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Project Workspace</h4>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-medium text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md">
                        {selectedTicket.project_name || projects.find(p => p.id === selectedTicket.project_id)?.name || 'General Workspace'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 3: Assignment */}
                <div className="relative">
                  <div className="absolute -left-8 w-6 h-6 rounded-full bg-emerald-100 border-4 border-white flex items-center justify-center shadow-sm">
                    <User size={10} className="text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Assigned To</h4>
                    <div className="mt-1 flex items-center gap-2">
                      {selectedTicket.assigned_to_name || selectedTicket.assignee ? (
                        <span className="text-sm font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                          {selectedTicket.assigned_to_name || selectedTicket.assignee}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md italic">
                          Unassigned
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 4: Execution / Status */}
                <div className="relative">
                  <div className="absolute -left-8 w-6 h-6 rounded-full bg-amber-100 border-4 border-white flex items-center justify-center shadow-sm">
                    <Activity size={10} className="text-amber-600" />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Current Status</h4>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-800 bg-gray-100 px-3 py-1 rounded-md border border-gray-200">
                          {selectedTicket.status || 'Pending'}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-md border ${selectedTicket.priority === 'High' ? 'text-rose-700 bg-rose-50 border-rose-200' :
                          selectedTicket.priority === 'Medium' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                            'text-green-700 bg-green-50 border-green-200'
                          }`}>
                          {selectedTicket.priority || 'Normal'} Priority
                        </span>
                      </div>
                    </div>
                    {selectedTicket.due_date && (
                      <div className="text-xs text-gray-500 flex items-center gap-1.5 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <Calendar size={14} className="text-gray-400" />
                        Due: {new Date(selectedTicket.due_date).toLocaleDateString([], { dateStyle: 'medium' })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 5: Time Log */}
                <div className="relative">
                  <div className="absolute -left-8 w-6 h-6 rounded-full bg-slate-100 border-4 border-white flex items-center justify-center shadow-sm">
                    <Clock size={10} className="text-slate-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Time Log</h4>
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-3">
                      <span className="italic">No hours have been recorded for this ticket yet.</span>
                      <button className="text-indigo-600 font-semibold hover:underline">Log Time</button>
                    </div>
                  </div>
                </div>

                {/* Step 6: Activity History */}
                <div className="relative">
                  <div className="absolute -left-8 w-6 h-6 rounded-full bg-indigo-100 border-4 border-white flex items-center justify-center shadow-sm">
                    <History size={10} className="text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Activity History</h4>
                    <div className="mt-2 text-xs text-gray-500 italic">
                      Detailed audit history is currently empty or unavailable for this ticket type.
                    </div>
                  </div>
                </div>

                {/* Step 7: Comments */}
                <div className="relative">
                  <div className="absolute -left-8 w-6 h-6 rounded-full bg-sky-100 border-4 border-white flex items-center justify-center shadow-sm">
                    <MessageSquare size={10} className="text-sky-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Discussions</h4>
                    <div className="text-xs text-gray-500 italic mb-4">
                      There are no comments on this ticket.
                    </div>
                    <div className="w-full text-left border border-gray-200 rounded-lg overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                      <textarea
                        placeholder="Add a comment... Type @ to mention someone"
                        className="w-full p-3 text-sm focus:outline-none resize-none"
                        rows="2"
                      ></textarea>
                      <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 flex justify-end">
                        <button className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors">
                          Post Comment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ITTicketAssignmentsPage;

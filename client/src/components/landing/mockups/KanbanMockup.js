import React from 'react';
import { Plus, MoreHorizontal, MessageSquare, Paperclip, Clock, CheckSquare } from 'lucide-react';

const KanbanMockup = () => {
  const columns = [
    {
      title: 'To Do', count: 12, bg: 'bg-slate-100',
      tasks: [
        { title: 'Quarterly Marketing Strategy', desc: 'Draft initial strategy document for Q4.', tags: [{ l: 'High Priority', c: 'bg-red-100 text-red-700' }, { l: 'Marketing', c: 'bg-orange-100 text-orange-700' }], date: 'Oct 28', comments: 3, attach: 1, avatar: 'https://i.pravatar.cc/100?img=47' },
        { title: 'Onboard New Account: Nexus Inc.', desc: 'Send welcome packet and schedule kickoff.', tags: [{ l: 'Sales', c: 'bg-emerald-100 text-emerald-700' }, { l: 'Client', c: 'bg-blue-100 text-blue-700' }], date: 'Oct 30', comments: 0, attach: 2, avatar: 'https://i.pravatar.cc/100?img=12' },
      ]
    },
    {
      title: 'In Progress', count: 8, bg: 'bg-slate-100',
      tasks: [
        { title: 'Develop CRM API Integration', desc: 'Backend integration with third-party vendors.', tags: [{ l: 'Dev', c: 'bg-blue-100 text-blue-700' }, { l: 'Backend', c: 'bg-indigo-100 text-indigo-700' }], date: 'Nov 2', comments: 14, attach: 3, avatar: 'https://i.pravatar.cc/100?img=33', progress: 65 },
        { title: 'Prepare Client Proposal for Acme', desc: 'Finalize pricing and statement of work.', tags: [{ l: 'Sales', c: 'bg-emerald-100 text-emerald-700' }, { l: 'Proposal', c: 'bg-purple-100 text-purple-700' }], date: 'Oct 30', comments: 5, attach: 1, avatar: 'https://i.pravatar.cc/100?img=47' },
      ]
    },
    {
      title: 'Done', count: 24, bg: 'bg-slate-100',
      tasks: [
        { title: 'Analyze Q3 Sales Data', desc: 'Generate reports for board meeting.', tags: [{ l: 'Analytics', c: 'bg-orange-100 text-orange-700' }], date: 'Oct 25', comments: 2, attach: 4, avatar: 'https://i.pravatar.cc/100?img=47', completed: true },
        { title: 'Fix Bug #451 - Lead Form', desc: 'Validation error on mobile devices.', tags: [{ l: 'Bug', c: 'bg-red-100 text-red-700' }, { l: 'Dev', c: 'bg-blue-100 text-blue-700' }], date: 'Oct 24', comments: 8, attach: 0, avatar: 'https://i.pravatar.cc/100?img=33', completed: true },
      ]
    }
  ];

  return (
    <div className="w-full h-full bg-white flex flex-col font-sans select-none overflow-hidden relative">
      {/* Header */}
      <div className="h-14 border-b border-slate-200 px-5 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Task Board</h2>
          <span className="text-[10px] text-slate-500 font-medium">Kanban View</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2 mr-3">
             <img className="w-6 h-6 rounded-full border-2 border-white relative z-30" src="https://i.pravatar.cc/100?img=47" alt="User" />
             <img className="w-6 h-6 rounded-full border-2 border-white relative z-20" src="https://i.pravatar.cc/100?img=33" alt="User" />
             <img className="w-6 h-6 rounded-full border-2 border-white relative z-10" src="https://i.pravatar.cc/100?img=12" alt="User" />
             <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500 z-0">+4</div>
          </div>
          <button className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors">
            <Plus size={14} /> Add Task
          </button>
          <button className="text-slate-400 hover:text-slate-600 p-1.5 border border-slate-200 rounded-md">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-5 bg-slate-50">
        <div className="flex gap-5 h-full w-max">
          {columns.map((col, i) => (
            <div key={i} className={`w-[260px] flex flex-col ${col.bg} rounded-xl p-3 max-h-full`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-700">{col.title}</h3>
                  <span className="bg-slate-200 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{col.count}</span>
                </div>
                {i === 0 && (
                  <button className="text-white bg-red-500 hover:bg-red-600 p-0.5 rounded">
                    <Plus size={12} />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-3 pb-2">
                {col.tasks.map((task, j) => (
                  <div key={j} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:border-red-300 transition-colors cursor-grab group">
                    <div className="flex items-start gap-2 mb-1.5">
                       {task.completed ? (
                         <CheckSquare size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                       ) : (
                         <div className="w-3.5 h-3.5 rounded border-2 border-slate-300 flex-shrink-0 mt-0.5 group-hover:border-red-400 transition-colors"></div>
                       )}
                       <h4 className={`text-xs font-semibold leading-snug ${task.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                         {task.title}
                       </h4>
                    </div>
                    
                    <p className="text-[10px] text-slate-500 line-clamp-2 mb-3 pl-5 leading-relaxed">
                      {task.desc}
                    </p>

                    {task.progress && (
                      <div className="pl-5 mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] text-slate-500 font-medium">Progress</span>
                          <span className="text-[9px] font-bold text-red-600">{task.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${task.progress}%` }}></div>
                        </div>
                      </div>
                    )}

                    <div className="pl-5 flex flex-wrap gap-1.5 mb-3">
                      {task.tags.map((tag, k) => (
                        <span key={k} className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${tag.c}`}>
                          {tag.l}
                        </span>
                      ))}
                    </div>

                    <div className="pl-5 flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 text-slate-400">
                           <Clock size={10} />
                           <span className="text-[9px] font-medium">{task.date}</span>
                        </div>
                        {task.comments > 0 && (
                          <div className="flex items-center gap-0.5 text-slate-400 ml-1">
                            <MessageSquare size={10} />
                            <span className="text-[9px] font-medium">{task.comments}</span>
                          </div>
                        )}
                        {task.attach > 0 && (
                          <div className="flex items-center gap-0.5 text-slate-400 ml-1">
                            <Paperclip size={10} />
                            <span className="text-[9px] font-medium">{task.attach}</span>
                          </div>
                        )}
                      </div>
                      <img src={task.avatar} alt="Assignee" className="w-5 h-5 rounded-full border border-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KanbanMockup;

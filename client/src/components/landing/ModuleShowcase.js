import React, { useState } from 'react';
import { MessageSquare, Calendar, FolderKanban, Video } from 'lucide-react';
import KanbanMockup from './mockups/KanbanMockup';
import VideoMockup from './mockups/VideoMockup';
import ChatMockup from './mockups/ChatMockup';
import CalendarMockup from './mockups/CalendarMockup';

const modules = [
  {
    id: 'kanban',
    title: 'Visual Kanban Boards',
    icon: <FolderKanban size={24} />,
    description: 'Track deals, leads, or IT bugs with drag-and-drop ease. Customize stages to match your exact workflow across any department.',
    imageAlt: 'Kanban Board Interface Mockup',
    color: 'red'
  },
  {
    id: 'video',
    title: 'Built-in Video Calls',
    icon: <Video size={24} />,
    description: 'Connect with clients or team members instantly. No need for external tools; schedule and launch video calls directly from the CRM.',
    imageAlt: 'Video Call Interface Mockup',
    color: 'indigo'
  },
  {
    id: 'chat',
    title: 'Real-time Chat',
    icon: <MessageSquare size={24} />,
    description: 'Collaborate seamlessly with direct messaging and team channels. Share files, snippets, and context without leaving your workspace.',
    imageAlt: 'Chat Interface Mockup',
    color: 'emerald'
  },
  {
    id: 'calendar',
    title: 'Unified Calendar',
    icon: <Calendar size={24} />,
    description: 'Manage meetings, deadlines, and project milestones in one centralized view. Syncs perfectly with your workflow tasks.',
    imageAlt: 'Calendar Interface Mockup',
    color: 'purple'
  }
];

const ModuleShowcase = () => {
  const [activeModule, setActiveModule] = useState(modules[0].id);

  const activeContent = modules.find(m => m.id === activeModule);

  return (
    <section id="modules" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 tracking-tight">Powerful tools built right in</h2>
          <p className="text-base text-slate-600 font-light">
            Stop paying for separate software. Codigix CRM includes premium collaboration and productivity tools out of the box.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-center">
          {/* Navigation/List */}
          <div className="w-full lg:w-1/3 flex flex-col gap-3">
            {modules.map((module) => {
              const isActive = activeModule === module.id;
              return (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={`relative flex flex-col items-start p-6 rounded-3xl text-left transition-all duration-500 border ${
                    isActive 
                      ? 'bg-white border-red-600 shadow-xl shadow-red-600/5 translate-x-2' 
                      : 'bg-transparent border-transparent hover:bg-white/50 hover:border-slate-200'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-red-600 rounded-r-full"></div>
                  )}
                  <div className={`flex items-center gap-4 mb-2 ${isActive ? 'text-red-600' : 'text-slate-500'}`}>
                    <div className={`p-3 rounded-2xl transition-colors duration-500 ${isActive ? 'bg-red-100 text-red-600' : 'bg-slate-200/50 text-slate-500'}`}>
                      {module.icon}
                    </div>
                    <h4 className={`text-lg font-bold tracking-tight ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                      {module.title}
                    </h4>
                  </div>
                  <div className={`overflow-hidden transition-all duration-500 ${isActive ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                    <p className="text-slate-600 ml-16 text-sm leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive Mockup Area */}
          <div className="w-full lg:w-2/3">
            <div className="bg-slate-100/50 rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200/60 overflow-hidden h-[500px] lg:h-[600px] relative transition-all duration-500 flex flex-col backdrop-blur-sm">
              {/* Window Header */}
              <div className="bg-white/80 border-b border-slate-200/60 px-4 py-3 flex items-center gap-2 backdrop-blur-md relative z-20">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm border border-red-500/20"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm border border-amber-500/20"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm border border-green-500/20"></div>
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center text-xs font-medium text-slate-500 bg-slate-100/80 px-4 py-1.5 rounded-md shadow-sm border border-slate-200/50 max-w-[200px] truncate">
                    <span className="opacity-50 mr-1">🔒</span> app.codigix.com/module/{activeModule}
                  </div>
                </div>
              </div>
              
              {/* Fake Content Area based on Active Module */}
              <div className="flex-1 bg-slate-50 relative overflow-hidden">
                <div className={`absolute inset-0 transition-all duration-700 transform ${activeModule === 'kanban' ? 'opacity-100 translate-y-0 scale-100 z-10' : 'opacity-0 translate-y-8 scale-95 pointer-events-none z-0'}`}>
                   <KanbanMockup />
                </div>
                <div className={`absolute inset-0 transition-all duration-700 transform ${activeModule === 'video' ? 'opacity-100 translate-y-0 scale-100 z-10' : 'opacity-0 translate-y-8 scale-95 pointer-events-none z-0'}`}>
                   <VideoMockup />
                </div>
                <div className={`absolute inset-0 transition-all duration-700 transform ${activeModule === 'chat' ? 'opacity-100 translate-y-0 scale-100 z-10' : 'opacity-0 translate-y-8 scale-95 pointer-events-none z-0'}`}>
                   <ChatMockup />
                </div>
                <div className={`absolute inset-0 transition-all duration-700 transform ${activeModule === 'calendar' ? 'opacity-100 translate-y-0 scale-100 z-10' : 'opacity-0 translate-y-8 scale-95 pointer-events-none z-0'}`}>
                   <CalendarMockup />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ModuleShowcase;

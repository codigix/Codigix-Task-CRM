import React from 'react';
import { Mic, MicOff, Video as VideoIcon, MonitorUp, PhoneOff, MessageSquare, Users, Settings } from 'lucide-react';

const VideoMockup = () => {
  return (
    <div className="w-full h-full bg-slate-900 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Top Header */}
      <div className="h-12 bg-slate-900/90 border-b border-slate-700 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-white text-[10px] font-bold">C</div>
          <span className="font-semibold text-slate-200 text-sm">Weekly Sync</span>
          <span className="bg-red-500/20 text-red-400 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border border-red-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
            REC
          </span>
        </div>
        <div className="flex gap-4 text-xs font-medium text-slate-300 items-center">
          <span className="flex items-center gap-1.5">00:24:12</span>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 p-4 flex gap-4 overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 relative">
          
          {/* Main Speaker View */}
          <div className="flex-1 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden relative group">
            <img 
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800" 
              alt="Main Speaker" 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
              <span className="text-white text-xs font-semibold">Sarah Jenkins</span>
              <Mic size={12} className="text-emerald-400" />
            </div>
          </div>
          
          {/* Grid View for others */}
          <div className="h-32 flex gap-4 shrink-0">
            {[
              { name: 'Mike R.', img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=300', muted: true },
              { name: 'Elena V.', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=300', muted: true },
              { name: 'Alex T.', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300', muted: false }
            ].map((person, i) => (
              <div key={i} className="flex-1 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden relative group">
                <img src={person.img} alt={person.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-slate-900/60 backdrop-blur-md px-2 py-1 rounded-md border border-slate-700 flex items-center gap-1.5">
                  <span className="text-white text-[10px] font-semibold truncate max-w-[60px]">{person.name}</span>
                  {person.muted ? <MicOff size={10} className="text-red-400" /> : <Mic size={10} className="text-emerald-400" />}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right Sidebar (Participants/Chat) */}
        <div className="w-64 bg-slate-800 rounded-2xl border border-slate-700 flex flex-col overflow-hidden shrink-0 hidden lg:flex">
          <div className="flex border-b border-slate-700">
            <div className="flex-1 text-center py-3 text-xs font-bold text-slate-200 border-b-2 border-red-500 bg-slate-700/50">Participants (4)</div>
            <div className="flex-1 text-center py-3 text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer">Chat</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {[
              { name: 'Sarah Jenkins (Host)', role: 'Sales Dir', active: true },
              { name: 'Mike Ross', role: 'AE', active: false },
              { name: 'Elena Vance', role: 'Marketing', active: false },
              { name: 'Alex Torres', role: 'Engineering', active: true }
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.role}</div>
                  </div>
                </div>
                {p.active ? <Mic size={14} className="text-emerald-400" /> : <MicOff size={14} className="text-red-400" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-center px-6 shrink-0 relative z-10 gap-3">
        <button className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200 transition-colors">
          <Mic size={18} />
        </button>
        <button className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200 transition-colors">
          <VideoIcon size={18} />
        </button>
        <button className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200 transition-colors">
          <MonitorUp size={18} />
        </button>
        <div className="w-px h-6 bg-slate-700 mx-1"></div>
        <button className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200 transition-colors lg:hidden">
          <Users size={18} />
        </button>
        <button className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200 transition-colors">
          <Settings size={18} />
        </button>
        <button className="w-12 h-10 rounded-xl bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-colors ml-2 shadow-lg shadow-red-900/50">
          <PhoneOff size={18} />
        </button>
      </div>
    </div>
  );
};

export default VideoMockup;

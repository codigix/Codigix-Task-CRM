import React from 'react';
import { Search, Hash, Circle, Plus, Smile, Paperclip, Send, MoreVertical, Phone, Video } from 'lucide-react';

const ChatMockup = () => {
  return (
    <div className="w-full h-full bg-white flex font-sans select-none overflow-hidden relative">
      {/* Sidebar */}
      <div className="w-56 bg-slate-50 border-r border-slate-200 flex flex-col h-full shrink-0">
        <div className="h-14 border-b border-slate-200 flex items-center px-4 font-bold text-slate-800 shadow-sm shrink-0">
          Team Chat
        </div>
        <div className="flex-1 overflow-y-auto py-3 no-scrollbar">
          <div className="px-4 mb-4">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search..." className="w-full bg-white border border-slate-200 rounded text-xs pl-7 pr-2 py-1.5 outline-none" disabled />
            </div>
          </div>
          
          <div className="mb-4">
            <div className="px-4 flex justify-between items-center mb-1.5 group cursor-pointer">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Channels</span>
              <Plus size={12} className="text-slate-400 group-hover:text-red-500" />
            </div>
            {['general', 'sales-team', 'marketing-campaigns', 'announcements'].map((ch, i) => (
              <div key={i} className={`flex items-center gap-2 px-4 py-1.5 cursor-pointer text-xs font-medium ${i === 1 ? 'bg-red-50 text-red-600 border-r-2 border-red-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Hash size={14} className={i === 1 ? 'text-red-500' : 'text-slate-400'} />
                {ch}
                {i === 1 && <span className="ml-auto bg-red-600 text-white text-[9px] font-bold px-1.5 rounded-full">3</span>}
              </div>
            ))}
          </div>

          <div>
            <div className="px-4 flex justify-between items-center mb-1.5 group cursor-pointer">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Direct Messages</span>
              <Plus size={12} className="text-slate-400 group-hover:text-red-500" />
            </div>
            {[
              { name: 'Sarah J.', online: true, img: 'https://i.pravatar.cc/100?img=47' },
              { name: 'Mike R.', online: false, img: 'https://i.pravatar.cc/100?img=33' },
              { name: 'Elena V.', online: true, img: 'https://i.pravatar.cc/100?img=12' },
              { name: 'Alex T.', online: true, img: 'https://i.pravatar.cc/100?img=11' }
            ].map((user, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-1.5 cursor-pointer text-xs font-medium text-slate-600 hover:bg-slate-100">
                <div className="relative">
                  <img src={user.img} alt={user.name} className="w-5 h-5 rounded-full border border-slate-200" />
                  {user.online && <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-green-500 border border-white rounded-full"></div>}
                </div>
                {user.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white h-full relative">
        <div className="h-14 border-b border-slate-200 flex justify-between items-center px-6 shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <Hash size={18} className="text-slate-400" />
            <h3 className="font-bold text-slate-800 text-sm">sales-team</h3>
            <span className="text-xs text-slate-400 font-normal border-l border-slate-200 pl-2 ml-1">Q4 Quota discussion</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <Phone size={16} className="hover:text-red-500 cursor-pointer transition-colors" />
            <Video size={16} className="hover:text-red-500 cursor-pointer transition-colors" />
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <MoreVertical size={16} className="hover:text-slate-600 cursor-pointer transition-colors" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 no-scrollbar">
          {/* Message 1 */}
          <div className="flex gap-3">
            <img src="https://i.pravatar.cc/100?img=33" alt="Mike" className="w-8 h-8 rounded border border-slate-200 shrink-0" />
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-bold text-slate-800 text-xs">Mike R.</span>
                <span className="text-[10px] text-slate-400">10:24 AM</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg rounded-tl-none border border-slate-100">
                Hey team, just closed the Acme Corp deal! 🎉 Contracts are signed and uploaded to the CRM. We hit 120% of our monthly quota!
              </p>
              <div className="flex gap-1 mt-1.5">
                <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px]">🔥 4</span>
                <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px]">🚀 2</span>
              </div>
            </div>
          </div>

          {/* Message 2 */}
          <div className="flex gap-3">
            <img src="https://i.pravatar.cc/100?img=47" alt="Sarah" className="w-8 h-8 rounded border border-slate-200 shrink-0" />
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-bold text-slate-800 text-xs">Sarah J.</span>
                <span className="text-[10px] text-slate-400">10:26 AM</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg rounded-tl-none border border-slate-100">
                That is amazing news Mike! Excellent work on the negotiation. I'll inform the onboarding team right away to get them scheduled for next week.
              </p>
            </div>
          </div>

          {/* Message 3 */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded border border-slate-200 shrink-0 bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
              ME
            </div>
            <div className="w-full">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-bold text-slate-800 text-xs">You</span>
                <span className="text-[10px] text-slate-400">Just now</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-red-50 p-3 rounded-lg rounded-tl-none border border-red-100 inline-block">
                Great job! Let's review the pipeline for the rest of the month in our 2 PM sync.
              </p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          <div className="border border-slate-200 rounded-lg overflow-hidden focus-within:border-red-400 focus-within:ring-1 focus-within:ring-red-400 transition-all bg-slate-50">
            <input 
              type="text" 
              placeholder="Message #sales-team..." 
              className="w-full bg-transparent text-xs p-3 outline-none text-slate-700" 
              disabled 
            />
            <div className="flex justify-between items-center px-3 py-2 bg-white border-t border-slate-100">
              <div className="flex gap-2 text-slate-400">
                <Plus size={16} className="cursor-pointer hover:text-slate-600" />
                <Smile size={16} className="cursor-pointer hover:text-slate-600" />
                <Paperclip size={16} className="cursor-pointer hover:text-slate-600" />
              </div>
              <button className="bg-red-600 text-white p-1.5 rounded hover:bg-red-700 transition-colors">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMockup;

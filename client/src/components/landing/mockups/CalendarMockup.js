import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Search, Calendar as CalendarIcon, Clock, Users, Video } from 'lucide-react';

const CalendarMockup = () => {
  return (
    <div className="w-full h-full bg-white flex flex-col font-sans select-none overflow-hidden relative">
      {/* Header */}
      <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 shrink-0 bg-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon size={20} className="text-red-600" />
            <span className=" text-slate-800 text-lg">October 2026</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded border border-slate-200">
            <button className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-l transition-colors"><ChevronLeft size={16} /></button>
            <span className="text-xs font-semibold px-2 text-slate-600">Today</span>
            <button className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-r transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex text-xs font-medium bg-slate-100 rounded p-1 border border-slate-200">
            <button className="px-3 py-1 rounded bg-white text-slate-800 shadow-sm">Week</button>
            <button className="px-3 py-1 rounded text-slate-500 hover:text-slate-800">Month</button>
          </div>
          <button className="bg-red-600 text-white text-xs  px-3 py-1.5 rounded shadow-md shadow-red-600/20 hover:bg-red-700 transition-colors flex items-center gap-1.5">
            <Plus size={14} /> New Event
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-56 border-r border-slate-200 bg-slate-50/50 p-4 shrink-0 flex flex-col gap-6 hidden md:flex">
          {/* Mini Calendar (Dummy layout) */}
          <div>
            <div className="text-sm  text-slate-800 mb-3">October 2026</div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400  mb-2">
              <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-600">
              <div className="text-slate-300">27</div><div className="text-slate-300">28</div><div className="text-slate-300">29</div><div className="text-slate-300">30</div><div>1</div><div>2</div><div>3</div>
              <div>4</div><div>5</div><div>6</div><div>7</div><div>8</div><div>9</div><div>10</div>
              <div>11</div><div>12</div><div>13</div><div className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center mx-auto">14</div><div>15</div><div>16</div><div>17</div>
              <div>18</div><div>19</div><div>20</div><div>21</div><div>22</div><div>23</div><div>24</div>
            </div>
          </div>

          {/* Calendars List */}
          <div>
            <div className="text-xs  text-slate-500 uppercase tracking-widest mb-3">My Calendars</div>
            <div className="space-y-2">
              {[
                { name: 'Sales Calls', color: 'bg-red-500' },
                { name: 'Team Syncs', color: 'bg-blue-500' },
                { name: 'Project Deadlines', color: 'bg-emerald-500' },
                { name: 'Marketing Events', color: 'bg-purple-500' },
              ].map((cal, i) => (
                <label key={i} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer group">
                  <div className={`w-3.5 h-3.5 rounded ${cal.color} flex items-center justify-center text-white`}>
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <span className="group-hover:text-slate-900">{cal.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly Grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative bg-slate-50">

          {/* Day Headers */}
          <div className="grid grid-cols-5 border-b border-slate-200 sticky top-0 bg-white z-20">
            {['Mon 12', 'Tue 13', 'Wed 14', 'Thu 15', 'Fri 16'].map((day, i) => (
              <div key={i} className={`p-3 text-center border-r border-slate-200 last:border-0 ${i === 2 ? 'bg-red-50/30' : ''}`}>
                <div className={`text-[10px]  uppercase tracking-widest ${i === 2 ? 'text-red-600' : 'text-slate-400'}`}>{day.split(' ')[0]}</div>
                <div className={`text-xl font-medium mt-0.5 ${i === 2 ? 'text-red-600' : 'text-slate-700'}`}>{day.split(' ')[1]}</div>
              </div>
            ))}
          </div>

          {/* Grid Background & Events */}
          <div className="relative h-[800px]">
            {/* Hour lines */}
            {[...Array(9)].map((_, i) => (
              <div key={i} className="absolute w-full border-t border-slate-200/60" style={{ top: `${(i + 1) * 80}px` }}>
                <span className="absolute -top-2.5 left-2 text-[10px] font-medium text-slate-400 bg-slate-50 px-1 z-10">{i + 9}:00 AM</span>
              </div>
            ))}

            {/* Vertical lines */}
            <div className="absolute inset-0 grid grid-cols-5 pointer-events-none">
              <div className="border-r border-slate-200"></div>
              <div className="border-r border-slate-200"></div>
              <div className="border-r border-slate-200 bg-red-50/10"></div>
              <div className="border-r border-slate-200"></div>
              <div></div>
            </div>

            {/* Events */}
            <div className="absolute top-[80px] left-[0%] w-[20%] p-1 z-10">
              <div className="h-[120px] bg-red-100 border-l-4 border-red-500 rounded p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group">
                <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                <div className="text-[10px]  text-red-700">9:00 AM - 10:30 AM</div>
                <div className="text-xs font-semibold text-red-900 leading-tight mt-0.5">Acme Corp Discovery Call</div>
                <div className="flex items-center gap-1 mt-2 text-red-600">
                  <Video size={10} /> <span className="text-[9px] font-medium">Codigix Meet</span>
                </div>
              </div>
            </div>

            <div className="absolute top-[240px] left-[20%] w-[20%] p-1 z-10">
              <div className="h-[80px] bg-blue-100 border-l-4 border-blue-500 rounded p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group">
                <div className="text-[10px]  text-blue-700">11:00 AM - 12:00 PM</div>
                <div className="text-xs font-semibold text-blue-900 leading-tight mt-0.5">Weekly Sales Sync</div>
              </div>
            </div>

            <div className="absolute top-[400px] left-[40%] w-[20%] p-1 z-10">
              <div className="h-[160px] bg-emerald-100 border-l-4 border-emerald-500 rounded p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group">
                <div className="text-[10px]  text-emerald-700">1:00 PM - 3:00 PM</div>
                <div className="text-xs font-semibold text-emerald-900 leading-tight mt-0.5">Q4 Planning Workshop</div>
                <div className="flex items-center gap-1 mt-2 text-emerald-600">
                  <Users size={10} /> <span className="text-[9px] font-medium">Boardroom A</span>
                </div>
              </div>
            </div>

            <div className="absolute top-[320px] left-[60%] w-[20%] p-1 z-10">
              <div className="h-[80px] bg-purple-100 border-l-4 border-purple-500 rounded p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group">
                <div className="text-[10px]  text-purple-700">12:00 PM - 1:00 PM</div>
                <div className="text-xs font-semibold text-purple-900 leading-tight mt-0.5">Lunch & Learn: SEO</div>
              </div>
            </div>

            {/* Current Time Indicator */}
            <div className="absolute w-full z-20 flex items-center pointer-events-none" style={{ top: '440px' }}>
              <div className="w-2 h-2 rounded-full bg-red-500 translate-x-1"></div>
              <div className="flex-1 h-0.5 bg-red-500"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarMockup;

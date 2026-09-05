import React, { useState } from 'react';
import { ShieldCheck, TrendingUp, CheckSquare } from 'lucide-react';
import AdminMockup from './mockups/AdminMockup';
import DashboardMockup from './mockups/DashboardMockup';
import KanbanMockup from './mockups/KanbanMockup';

const RoleBasedSection = () => {
  const [activeRole, setActiveRole] = useState('admin');

  const roles = [
    {
      id: 'admin',
      title: 'For Administrators',
      description: 'Maintain complete control over your business infrastructure with global health metrics, user access management, and security logs. Keep your enterprise compliant and running smoothly.',
      icon: ShieldCheck,
      image: '/assets/mockups/role_admin.jpg'
    },
    {
      id: 'manager',
      title: 'For Team Managers',
      description: 'Track team performance, oversee active project pipelines, and ensure cross-department alignment with high-level analytics. Never lose sight of the big picture.',
      icon: TrendingUp,
      image: '/assets/mockups/hero_dashboard.jpg'
    },
    {
      id: 'employee',
      title: 'For Employees',
      description: 'Focus on what matters. Personal task boards, seamless team communication, and an organized daily schedule to maximize your productivity without the noise.',
      icon: CheckSquare,
      image: '/assets/mockups/kanban.jpg'
    }
  ];

  return (
    <section className="bg-slate-50 relative overflow-hidden" id="roles">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl  text-slate-900 mb-4 tracking-tight">
            Tailored workspaces for <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-rose-600">every role.</span>
          </h2>
          <p className="text-lg text-slate-600 font-light">
            Provide every member of your organization with exactly the tools and data they need to perform at their best, without overwhelming them.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-center">
          {/* Left Side: Role Selector */}
          <div className="w-full lg:w-1/3 flex flex-col gap-3">
            {roles.map((role) => {
              const isActive = activeRole === role.id;
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  onClick={() => setActiveRole(role.id)}
                  className={`text-left p-4 md:p-5 rounded-2xl transition-all duration-300 border-2 ${isActive ? 'bg-white border-red-500 shadow-xl shadow-red-900/5 scale-[1.02]' : 'bg-transparent border-transparent hover:bg-white/50'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2.5 rounded-xl transition-colors duration-300 ${isActive ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-slate-200 text-slate-500'}`}>
                      <Icon size={22} />
                    </div>
                    <h3 className={`text-xl  tracking-tight ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                      {role.title}
                    </h3>
                  </div>
                  {isActive && (
                    <p className="text-slate-600 text-sm leading-relaxed font-light ml-14 animate-fade-in">
                      {role.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Side: Interactive Mockup */}
          <div className="w-full lg:w-2/3">
            <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl shadow-slate-200/50 border border-slate-200/60 bg-slate-100 h-[450px] lg:h-[600px] flex flex-col">
              {/* Browser Header */}
              <div className="bg-white/90 border-b border-slate-200/60 px-4 py-3 flex items-center gap-2 backdrop-blur-md relative z-20">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                </div>
              </div>

              <div className="flex-1 relative overflow-hidden bg-slate-50">
                <div className={`absolute inset-0 transition-all duration-700 transform ${activeRole === 'admin' ? 'opacity-100 translate-y-0 scale-100 z-10' : 'opacity-0 translate-y-8 scale-95 pointer-events-none z-0'}`}>
                  <AdminMockup />
                </div>
                <div className={`absolute inset-0 transition-all duration-700 transform ${activeRole === 'manager' ? 'opacity-100 translate-y-0 scale-100 z-10' : 'opacity-0 translate-y-8 scale-95 pointer-events-none z-0'}`}>
                  <DashboardMockup />
                </div>
                <div className={`absolute inset-0 transition-all duration-700 transform ${activeRole === 'employee' ? 'opacity-100 translate-y-0 scale-100 z-10' : 'opacity-0 translate-y-8 scale-95 pointer-events-none z-0'}`}>
                  <KanbanMockup />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RoleBasedSection;

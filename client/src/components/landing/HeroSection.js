import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Users, Briefcase, Zap, Phone, CheckSquare, Mail, Layers } from 'lucide-react';
import DashboardMockup from './mockups/DashboardMockup';
import KanbanMockup from './mockups/KanbanMockup';
import SalesMockup from './mockups/SalesMockup';
import MarketingMockup from './mockups/MarketingMockup';

const HeroSection = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isHovered, setIsHovered] = useState(false);
  const menuItems = ['Dashboard', 'Sales pipeline', 'Contacts', 'IT Kanban', 'Marketing'];

  useEffect(() => {
    if (isHovered) return;
    
    const interval = setInterval(() => {
      setActiveTab((current) => {
        const currentIndex = menuItems.indexOf(current);
        const nextIndex = (currentIndex + 1) % menuItems.length;
        return menuItems[nextIndex];
      });
    }, 4000);
    
    return () => clearInterval(interval);
  }, [isHovered]);

  return (
    <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-slate-50 -z-20"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-600 opacity-20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
      <div className="absolute top-40 left-1/4 -translate-x-1/2 w-[400px] h-[400px] bg-rose-600 opacity-10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
      <div className="absolute top-20 right-1/4 translate-x-1/2 w-[500px] h-[500px] bg-orange-600 opacity-20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 pt-10">
        {/* Premium Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.05)] text-slate-800 text-xs sm:text-sm font-semibold mb-10 animate-fade-in-up hover:shadow-lg transition-all hover:scale-105 cursor-pointer">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-white animate-pulse"></span>
          </div>
          Codigix CRM 2.0 is now live
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          <span className="text-red-600 flex items-center gap-1">Read announcement <ArrowRight size={14} /></span>
        </div>
        
        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-[80px] font-extrabold tracking-tighter text-slate-900 mb-8 max-w-5xl mx-auto leading-[1.05] animate-fade-in-up animation-delay-100">
          The ultimate workspace <br className="hidden md:block" />
          for your <span className="relative inline-block">
            <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-500 to-red-500">entire business.</span>
            <span className="absolute bottom-2 left-0 w-full h-4 bg-red-200/50 -z-10 -rotate-1 skew-x-12"></span>
          </span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-lg md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200 font-light">
          Unify Sales, Marketing, HR, and IT in one powerful, beautifully designed platform. Replace fragmented tools with <strong className="font-semibold text-slate-900">seamless collaboration.</strong>
        </p>
        
        {/* Buttons & Social Proof */}
        <div className="flex flex-col items-center animate-fade-in-up animation-delay-300">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-10 w-full sm:w-auto">
            <a href="#demo" className="w-full sm:w-auto bg-slate-900 hover:bg-red-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(220,38,38,0.3)] flex items-center justify-center gap-2 hover:-translate-y-1">
              Start your free trial <ArrowRight size={20} />
            </a>
            <a href="#modules" className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200/80 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-1 hover:border-slate-300 shadow-sm">
              Explore modules
            </a>
          </div>
          
          <div className="flex items-center gap-5 text-sm font-medium text-slate-600 bg-white/50 backdrop-blur-sm px-6 py-3 rounded-full border border-slate-200/50 shadow-sm">
             <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`relative w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-md transition-transform hover:-translate-y-1 hover:z-50 ${['bg-red-600 z-40', 'bg-rose-500 z-30', 'bg-orange-500 z-20', 'bg-emerald-500 z-10', 'bg-purple-500 z-0'][i-1]}`}>
                    {['S', 'M', 'A', 'J', 'R'][i-1]}
                  </div>
                ))}
             </div>
             <div className="flex flex-col items-start leading-tight">
               <div className="flex text-amber-400 text-sm tracking-widest mb-0.5">★★★★★</div>
               <div>Trusted by <span className="font-bold text-slate-900">10,000+</span> teams</div>
             </div>
          </div>
        </div>

        {/* Dashboard Preview Mockup with Explanatory Callouts */}
        <div 
          className="mt-20 relative mx-auto max-w-5xl animate-fade-in-up animation-delay-400"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Decorative Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-500 blur-[80px] opacity-20 pointer-events-none transform -translate-y-4"></div>

          {/* Floating Explanatory Badges (Hidden on mobile, visible on lg screens) */}
          <div className="absolute -left-16 top-24 bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200/80 flex items-center gap-3 z-30 animate-fade-in-up animation-delay-500 hidden lg:flex hover:scale-105 transition-transform cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
              <Zap size={18} />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-slate-800 tracking-tight">Real-time Sync</div>
              <div className="text-[11px] text-slate-500 font-medium">Updates instantly across devices</div>
            </div>
          </div>

          <div className="absolute -right-20 top-1/3 bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200/80 flex items-center gap-3 z-30 animate-fade-in-up animation-delay-700 hidden lg:flex hover:scale-105 transition-transform cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
              <BarChart3 size={18} />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-slate-800 tracking-tight">Advanced Analytics</div>
              <div className="text-[11px] text-slate-500 font-medium">Custom KPIs & Forecasting</div>
            </div>
          </div>

          <div className="absolute -left-8 bottom-24 bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200/80 flex items-center gap-3 z-30 animate-fade-in-up animation-delay-600 hidden lg:flex hover:scale-105 transition-transform cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm">
              <Users size={18} />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-slate-800 tracking-tight">Role-Based Access</div>
              <div className="text-[11px] text-slate-500 font-medium">Bank-grade security & RBAC</div>
            </div>
          </div>

          {/* Main Dashboard Window */}
          <div className="relative rounded-2xl bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200/80 overflow-hidden text-left z-20">
            <div className="flex items-center px-4 py-3 border-b border-slate-200/80 bg-slate-100/80 backdrop-blur-md">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500/20"></div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 md:grid-cols-12 h-[450px] md:h-[550px] bg-slate-50">
              {/* Fake Sidebar */}
              <div className="hidden md:block col-span-3 lg:col-span-2 border-r border-slate-200 bg-white p-4">
                <div className="font-bold text-slate-800 mb-8 flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-white text-xs">C</div>
                  Menu
                </div>
                <div className="space-y-4">
                  {menuItems.map((item, i) => {
                    const isActive = activeTab === item;
                    return (
                      <div 
                        key={i} 
                        onClick={() => setActiveTab(item)}
                        className={`flex items-center gap-3 cursor-pointer transition-colors px-2 py-1.5 -mx-2 rounded-lg ${isActive ? 'text-red-600 bg-red-50' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${isActive ? 'text-red-600 bg-red-100' : 'bg-slate-100 text-slate-400'}`}>
                           {i === 0 ? <BarChart3 size={12} /> : i === 1 ? <Layers size={12} /> : i === 2 ? <Users size={12} /> : i === 3 ? <CheckSquare size={12} /> : <Briefcase size={12} />}
                        </div>
                        <div className={`text-sm font-medium select-none ${isActive ? 'text-red-600' : ''}`}>{item}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Fake Content Area replaced with Live HTML Mockups */}
              <div className="col-span-4 md:col-span-9 lg:col-span-10 bg-slate-50/50 flex flex-col relative overflow-hidden">
                <div 
                  key={activeTab} 
                  className="w-full h-full bg-slate-100 flex justify-center items-center overflow-hidden animate-fade-in"
                  style={{ animationDuration: '0.6s' }}
                >
                  {activeTab === 'Dashboard' && <DashboardMockup />}
                  {activeTab === 'Sales pipeline' && <SalesMockup />}
                  {activeTab === 'Contacts' && <SalesMockup />}
                  {activeTab === 'IT Kanban' && <KanbanMockup />}
                  {activeTab === 'Marketing' && <MarketingMockup />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

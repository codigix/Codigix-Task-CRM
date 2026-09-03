import React from 'react';
import { LineChart, Users, Laptop, Megaphone, CheckCircle2, Shield } from 'lucide-react';

const departments = [
  {
    title: 'Sales & CRM',
    description: 'Pipeline management, lead distribution, quotations, and revenue forecasting to close deals faster.',
    icon: <LineChart className="w-6 h-6 text-red-600" />,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-100',
    className: 'lg:col-span-2 md:col-span-2'
  },
  {
    title: 'HR Management',
    description: <span>Complete employee lifecycle management via our dedicated <a href="https://hrmsystem.codigixinfotech.com/" target="_blank" rel="noreferrer" className="text-red-600 font-semibold hover:underline relative z-20">Codigix HRM System</a>.</span>,
    icon: <Users className="w-6 h-6 text-rose-600" />,
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-100',
    className: 'lg:col-span-1 md:col-span-1'
  },
  {
    title: 'IT & DevOps',
    description: 'Bug tracking, test cases, code repositories, and specialized IT kanban boards.',
    icon: <Laptop className="w-6 h-6 text-red-600" />,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-100',
    className: 'lg:col-span-1 md:col-span-1'
  },
  {
    title: 'Marketing & SEO',
    description: 'Local SEO tools, rank tracking, AI content generation, and comprehensive campaign management.',
    icon: <Megaphone className="w-6 h-6 text-rose-600" />,
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-100',
    className: 'lg:col-span-1 md:col-span-1'
  },
  {
    title: 'Project Management',
    description: 'Agile sprint boards, backlog management, and time tracking to keep teams aligned.',
    icon: <CheckCircle2 className="w-6 h-6 text-red-600" />,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-100',
    className: 'lg:col-span-2 md:col-span-2'
  },
  {
    title: 'Super Admin',
    description: 'Multi-tenancy support with robust role-based access control (RBAC), subscriptions, and domains.',
    icon: <Shield className="w-6 h-6 text-rose-600" />,
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-100',
    className: 'lg:col-span-1 md:col-span-1'
  }
];

const FeaturesGrid = () => {
  return (
    <section id="features" className="py-24 bg-[#f8f9fa] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100/50 text-red-600 text-xs font-bold uppercase tracking-widest mb-6">
             <Shield className="w-3.5 h-3.5" /> Enterprise Grade
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 tracking-tight">One platform. Every department.</h2>
          <p className="text-lg text-slate-600 font-light leading-relaxed">
            Codigix CRM breaks down silos by providing tailored workspaces for every team in your organization, while keeping all data unified in one central system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-min">
          {departments.map((dept, index) => (
            <div 
              key={index} 
              className={`group relative bg-white p-8 rounded-2xl border border-slate-200/80 hover:border-red-300 transition-all duration-500 hover:shadow-[0_8px_30px_rgb(220,38,38,0.08)] hover:-translate-y-1 overflow-hidden flex flex-col justify-between ${dept.className}`}
            >
              {/* Fancy mesh background for bento box */}
              <div className={`absolute inset-0 bg-gradient-to-br ${dept.bgColor} to-transparent opacity-0 group-hover:opacity-40 transition-opacity duration-700`}></div>
              
              <div className="relative z-10 flex flex-col h-full">
                <div className={`w-12 h-12 ${dept.bgColor} ${dept.borderColor} border rounded-xl flex items-center justify-center mb-6 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3`}>
                  {dept.icon}
                </div>
                
                <h4 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">{dept.title}</h4>
                <p className="text-slate-500 leading-relaxed text-sm">
                  {dept.description}
                </p>
              </div>
              
              {/* Decorative corner accent on hover */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-100 to-transparent opacity-0 group-hover:opacity-50 rounded-bl-full transition-opacity duration-700"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;

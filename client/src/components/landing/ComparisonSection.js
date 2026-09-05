import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

const ComparisonSection = () => {
  const features = [
    { name: 'Advanced IT Kanban & Bug Tracking', legacy: false, point: false, codigix: true },
    { name: 'Built-in Sales CRM & Lead Pipelines', legacy: true, point: false, codigix: true },
    { name: 'Native Video Calls, Audio & Chat', legacy: false, point: false, codigix: true },
    { name: 'Integrated Marketing & SEO Tools', legacy: false, point: false, codigix: true },
    { name: 'Dedicated HR & Payroll integration', legacy: false, point: false, codigix: true },
    { name: 'Unified Role-based Dashboards', legacy: false, point: false, codigix: true },
    { name: 'Single transparent subscription', legacy: false, point: false, codigix: true },
  ];

  return (
    <section className="py-20 bg-slate-50 relative overflow-hidden" id="comparison">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-rose-100 opacity-30 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100/50 text-red-600 text-xs  uppercase tracking-widest mb-6">
            Why Codigix CRM?
          </div>
          <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Beyond Issue Tracking</h3>
          <p className="text-lg text-slate-600 font-light leading-relaxed">
            While platforms like Jira focus solely on software development, Codigix unifies your <strong className="font-semibold text-slate-800">entire business</strong>. Stop juggling multiple subscriptions and fragmented data.
          </p>
        </div>

        <div className="relative">
          {/* Glowing highlight column behind the Codigix column */}
          <div className="absolute top-0 right-0 w-1/4 h-full bg-gradient-to-b from-red-50/50 via-red-100/30 to-red-50/50 rounded-3xl blur-xl -z-10 hidden md:block"></div>

          {/* Table Headers */}
          <div className="hidden md:grid grid-cols-4 px-6 mb-4 items-end">
            <div className="col-span-2 text-[10px]  text-slate-400 uppercase tracking-widest pl-2">Feature Capability</div>
            <div className="col-span-1 text-center flex flex-col items-center">
              <span className="text-[11px]  text-slate-500 uppercase tracking-widest">Legacy Tools</span>
              <span className="text-[9px] text-slate-400 mt-0.5">(Jira, Trello)</span>
            </div>
            <div className="col-span-1 text-center">
              <span className="inline-block bg-red-600 text-white text-[11px]  uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg shadow-red-600/20">
                Codigix CRM
              </span>
            </div>
          </div>

          {/* Floating Rows */}
          <div className="flex flex-col gap-3">
            {features.map((feature, i) => (
              <div
                key={i}
                className="grid grid-cols-1 md:grid-cols-4 bg-white rounded-2xl p-2 items-center border border-slate-200/60 shadow-sm hover:shadow-md hover:border-red-200 transition-all duration-300 group"
              >
                <div className="col-span-1 md:col-span-2 pl-4 py-3 text-sm md:text-base font-semibold text-slate-800 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-red-400 transition-colors"></div>
                  {feature.name}
                </div>

                {/* Mobile labels */}
                <div className="md:hidden flex justify-between px-4 py-2 bg-slate-50 rounded mt-2 mb-1 text-xs font-medium text-slate-500">
                  <span>Legacy Tools</span>
                  <span className="text-red-600 ">Codigix CRM</span>
                </div>

                <div className="col-span-1 flex justify-between md:justify-center px-6 md:px-0 py-3 md:py-0 border-b md:border-0 border-slate-100">
                  <span className="md:hidden text-xs text-slate-400">Legacy Tools:</span>
                  {feature.legacy || feature.point ? (
                    <CheckCircle2 size={20} className="text-slate-300" />
                  ) : (
                    <X size={20} className="text-slate-200" />
                  )}
                </div>
                <div className="col-span-1 flex justify-between md:justify-center px-6 md:px-0 py-4 md:py-3 bg-red-50/40 rounded-xl border border-transparent group-hover:bg-red-50 group-hover:border-red-100 transition-colors relative overflow-hidden">
                  <span className="md:hidden text-xs  text-red-600">Codigix CRM:</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-opacity"></div>
                  {feature.codigix ? (
                    <div className="relative">
                      <div className="absolute inset-0 bg-red-400 rounded-full blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-300"></div>
                      <CheckCircle2 size={26} className="text-red-600 relative z-10 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm" />
                    </div>
                  ) : (
                    <X size={26} className="text-slate-200 relative z-10" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-8 text-center bg-white/50 backdrop-blur-sm rounded-xl py-3 border border-slate-200/50 inline-block px-6 mx-auto flex items-center justify-center gap-2">
            <span className="text-xs text-slate-500">
              * HR capabilities powered by our dedicated <a href="https://hrmsystem.codigixinfotech.com/" target="_blank" rel="noreferrer" className="text-red-600  hover:underline">Codigix HRM System</a>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;

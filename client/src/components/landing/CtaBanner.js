import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const CtaBanner = () => {
  return (
    <section className="py-24 relative overflow-hidden bg-slate-50">

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight">
          Ready to unify your entire business?
        </h2>
        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
          Join hundreds of fast-growing companies that use Codigix CRM to replace fragmented tools, align their teams, and accelerate growth.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#demo" className="w-full sm:w-auto bg-red-600 text-white hover:bg-red-700 px-8 py-4 rounded-full  text-lg transition-all shadow-[0_8px_30px_rgb(220,38,38,0.2)] flex items-center justify-center gap-2 hover:-translate-y-1">
            Start your free trial <ArrowRight size={20} />
          </a>
          <a href="#modules" className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full  text-lg transition-all flex items-center justify-center gap-2">
            See all features
          </a>
        </div>

        <p className="text-sm text-slate-500 mt-8 font-medium">
          No credit card required <span className="mx-2 text-slate-300">•</span> 14-day free trial <span className="mx-2 text-slate-300">•</span> Cancel anytime
        </p>
      </div>
    </section>
  );
};

export default CtaBanner;

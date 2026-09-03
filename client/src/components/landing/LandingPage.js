import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import HeroSection from './HeroSection';
import FeaturesGrid from './FeaturesGrid';
import ComparisonSection from './ComparisonSection';
import ModuleShowcase from './ModuleShowcase';
import RoleBasedSection from './RoleBasedSection';
import PricingSection from './PricingSection';
import BookDemoSection from './BookDemoSection';
import CtaBanner from './CtaBanner';

const LandingPage = () => {
  useEffect(() => {
    // Add a specific class to the body to handle landing page specific global styles if needed
    document.body.classList.add('landing-page-active');
    return () => {
      document.body.classList.remove('landing-page-active');
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden selection:bg-red-600 selection:text-white">
      {/* Floating Pill Navbar */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-50 transition-all duration-300 bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-full px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center cursor-pointer">
            <img src="/assets/logo.png" alt="Codigix Logo" className="h-8 object-contain" />
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-slate-600 hover:text-red-600 font-medium transition-colors text-sm">Features</a>
            <a href="#modules" className="text-slate-600 hover:text-red-600 font-medium transition-colors text-sm">Modules</a>
            <div className="flex items-center gap-3 ml-2 border-l border-slate-200 pl-6">
              <a href="#pricing" className="text-slate-700 hover:text-red-600 font-medium transition-colors text-sm">Billing</a>
              <a href="#demo" className="bg-slate-900 hover:bg-red-600 text-white px-5 py-2 rounded-full font-medium transition-all shadow-md hover:shadow-red-600/25 text-sm">Book Demo</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <HeroSection />
        <FeaturesGrid />
        <ComparisonSection />
        <ModuleShowcase />
        <RoleBasedSection />
        <PricingSection />
        <BookDemoSection />
        <CtaBanner />
      </main>
    </div>
  );
};

export default LandingPage;

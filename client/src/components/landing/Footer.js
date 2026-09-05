import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-900 pt-20 pb-10 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          <div className="col-span-1 lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white  text-lg">
                C
              </div>
              <span className=" text-xl tracking-tight text-white">Codigix<span className="text-red-600">CRM</span></span>
            </div>
            <p className="text-slate-400 leading-relaxed mb-8 max-w-sm">
              The only platform you need to run your entire business. Unify your data, automate your workflows, and grow faster.
            </p>
            <div className="mb-6">
              <h4 className="text-white font-semibold mb-3">Subscribe to our newsletter</h4>
              <div className="flex gap-2 max-w-sm">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 w-full transition-colors"
                />
                <button className="bg-red-600 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap shadow-lg shadow-red-600/20">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Modules</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Sales & CRM</a></li>
              <li><a href="https://hrmsystem.codigixinfotech.com/" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1">HR Management <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a></li>
              <li><a href="#" className="text-slate-400 hover:text-white transition-colors">IT & DevOps</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Marketing & SEO</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Project Management</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white transition-colors">API Reference</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-slate-400 hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Codigix. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-slate-500 hover:text-white transition-colors">Twitter</a>
            <a href="#" className="text-slate-500 hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="text-slate-500 hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

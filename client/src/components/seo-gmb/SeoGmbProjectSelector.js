import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Globe, Folder, Plus, Award } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


export default function SeoGmbProjectSelector({ onProjectChange }) {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchProjects();

    // Click outside handler to close dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch(API_BASE_URL + '/projects?department=SEO+%26+GMB+Department');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);

        if (data.length > 0) {
          // Check if there is an active project ID in localStorage
          const savedId = localStorage.getItem('seoGmbActiveProjectId');
          const found = data.find(p => p.id === parseInt(savedId));
          const defaultProject = found || data[0];

          setActiveProject(defaultProject);
          localStorage.setItem('seoGmbActiveProjectId', defaultProject.id);

          if (onProjectChange) {
            onProjectChange(defaultProject);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching SEO & GMB projects:', err);
    }
  };

  const handleSelect = (project) => {
    setActiveProject(project);
    localStorage.setItem('seoGmbActiveProjectId', project.id);
    setIsOpen(false);

    if (onProjectChange) {
      onProjectChange(project);
    } else {
      window.location.reload();
    }
  };

  if (!activeProject) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 ">
        <Folder size={14} className="animate-pulse" />
        <span>Loading Projects...</span>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded p-2 text-xs   cursor-pointer transition-colors"
      >
        <Folder size={13} className="text-blue-500 shrink-0" />
        <span className="truncate max-w-[150px]">{activeProject.name}</span>
        <ChevronDown size={13} className="text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded shadow-lg py-1.5 z-50 text-xs">
          <div className="p-2 border-b border-slate-100  text-slate-400 text-xs  tracking-wider">
            Switch Project
          </div>
          <div className="max-h-60 overflow-y-auto">
            {projects.map((project) => {
              const isSelected = project.id === activeProject.id;
              return (
                <button
                  key={project.id}
                  onClick={() => handleSelect(project)}
                  className={`w-full text-left p-2 flex items-center justify-between hover:bg-slate-50 border-none bg-transparent cursor-pointer font-medium ${isSelected ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'
                    }`}
                >
                  <div className="truncate pr-2">
                    <div className=" truncate">{project.name}</div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">{project.title || 'No Title'}</div>
                  </div>
                  {isSelected && (
                    <span className="bg-blue-100 text-blue-800 text-[9px]  px-1.5 py-0.5 rounded shrink-0">Active</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="p-2 border-t border-slate-100 flex gap-1">
            <a
              href="/seo-gmb/project-setup?mode=create"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded py-1.5 text-center  no-underline flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Plus size={12} /> Add New Project
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

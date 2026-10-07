import React, { useState, useEffect, useRef } from 'react';
import { X, Search, ChevronDown, Check, FolderKanban } from 'lucide-react';

/**
 * Creates a sprint and, optionally, ties it to a project.
 *
 * A sprint with a project owns that project's work: anything moved, dragged, or created
 * into it takes on the project automatically. Leaving it as "No project" keeps the sprint
 * neutral and never changes an item's own project.
 */
const CreateSprintModal = ({ isOpen, defaultName, defaultDepartment = 'IT', isManager = false, projects = [], onCancel, onCreate }) => {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState(defaultDepartment);
  const [projectId, setProjectId] = useState('');
  const [goal, setGoal] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [projectSearch, setProjectSearch] = useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setDepartment(defaultDepartment || 'IT');
    setName(defaultName || '');
    setProjectId('');
    setGoal('');
    setError('');
    setProjectSearch('');
    setIsProjectDropdownOpen(false);
  }, [isOpen, defaultName, defaultDepartment]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target)) {
        setIsProjectDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsProjectDropdownOpen(false);
      }
    };
    if (isProjectDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProjectDropdownOpen]);

  useEffect(() => {
    if (isProjectDropdownOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isProjectDropdownOpen]);

  if (!isOpen) return null;

  const filteredProjects = projects.filter(p => {
    if (!department || department === 'ALL') return true;
    const pDept = (p.department_name || p.workflow_type || p.department || '').toLowerCase();
    const targetDept = department.toLowerCase();
    return pDept.includes(targetDept) || (targetDept === 'it' && (pDept.includes('it') || pDept.includes('software')));
  });

  const availableProjects = filteredProjects.length > 0 ? filteredProjects : projects;

  const searchedProjects = availableProjects.filter(p => {
    if (!projectSearch.trim()) return true;
    const q = projectSearch.toLowerCase().trim();
    const nameMatch = (p.name || p.title || '').toLowerCase().includes(q);
    const companyMatch = (p.company_name || p.client_name || '').toLowerCase().includes(q);
    const deptMatch = (p.department_name || p.workflow_type || p.department || '').toLowerCase().includes(q);
    return nameMatch || companyMatch || deptMatch;
  });

  const selected = projects.find(p => String(p.id) === String(projectId));

  const handleDepartmentChange = (newDept) => {
    setDepartment(newDept);
    if (name.includes('Sprint')) {
      if (newDept === 'IT') {
        setName(name.replace(/^Marketing\s+Sprint/i, 'IT Sprint'));
      } else {
        setName(name.replace(/^IT\s+Sprint/i, 'Marketing Sprint'));
      }
    }
    if (selected) {
      const pDept = (selected.department_name || selected.workflow_type || selected.department || '').toLowerCase();
      const targetDept = newDept.toLowerCase();
      const matches = pDept.includes(targetDept) || (targetDept === 'it' && (pDept.includes('it') || pDept.includes('software')));
      if (!matches) {
        setProjectId('');
      }
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return setError('Sprint name is required.');
    setIsSaving(true);
    setError('');
    try {
      await onCreate({
        name: name.trim(),
        department: department || 'IT',
        goal: goal.trim(),
        project_id: projectId === '' ? null : Number(projectId)
      });
    } catch (err) {
      setError(err.message || 'Could not create the sprint.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded shadow-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <h2 className="text-xl  text-gray-900">Create sprint</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700 p-1 rounded transition">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-5 space-y-4">
          {error && (
            <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
          )}

          {isManager && (
            <div>
              <label className="block text-[13px]  text-gray-700 mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="sprint_dept"
                    value="IT"
                    checked={department === 'IT'}
                    onChange={() => handleDepartmentChange('IT')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>IT</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="sprint_dept"
                    value="Marketing"
                    checked={department === 'Marketing'}
                    onChange={() => handleDepartmentChange('Marketing')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Marketing</span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[13px]  text-gray-700 mb-1">
              Sprint name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="relative" ref={projectDropdownRef}>
            <label className="block text-[13px]  text-gray-700 mb-1">Project</label>

            {/* Trigger Button */}
            <div
              tabIndex={0}
              role="button"
              aria-haspopup="listbox"
              aria-expanded={isProjectDropdownOpen}
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsProjectDropdownOpen(!isProjectDropdownOpen);
                }
              }}
              className={`w-full border rounded px-3 py-2 text-[14px] bg-white flex items-center justify-between cursor-pointer transition select-none ${isProjectDropdownOpen
                ? 'border-blue-500 ring-1 ring-blue-500'
                : 'border-gray-300 hover:border-gray-400'
                }`}
            >
              <div className="flex items-center gap-2 min-w-0 mr-2">
                {selected ? (
                  <>
                    <FolderKanban size={15} className="text-blue-600 shrink-0" />
                    <span className="font-medium text-gray-900 truncate">
                      {selected.name || selected.title}
                    </span>
                    {(selected.company_name || selected.client_name) && (
                      <span className="text-xs text-gray-500 truncate">
                        ({selected.company_name || selected.client_name})
                      </span>
                    )}
                    <span className="ml-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                      [{selected.department_name || selected.workflow_type || (department || 'IT')}]
                    </span>
                  </>
                ) : (
                  <span className="text-gray-700">No project</span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {projectId !== '' && (
                  <span
                    role="button"
                    tabIndex={0}
                    title="Clear project"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProjectId('');
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition cursor-pointer"
                  >
                    <X size={14} />
                  </span>
                )}
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </div>

            {/* Dropdown Menu */}
            {isProjectDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded shadow-xl z-50 overflow-hidden">
                {/* Search Header */}
                <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                  <Search size={15} className="text-gray-400 shrink-0 ml-1" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Search project by name or department..."
                    className="w-full bg-transparent text-[13px] text-gray-800 placeholder-gray-400 outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {projectSearch && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectSearch('');
                        searchInputRef.current?.focus();
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Dropdown Options */}
                <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                  {/* "No project" item */}
                  {(!projectSearch || 'no project'.includes(projectSearch.toLowerCase())) && (
                    <button
                      type="button"
                      onClick={() => {
                        setProjectId('');
                        setIsProjectDropdownOpen(false);
                        setProjectSearch('');
                      }}
                      className={`w-full text-left px-3 py-2.5 text-[13px] flex items-center justify-between transition ${projectId === '' ? 'bg-blue-50/70 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="italic">No project</span>
                        <span className="text-[11px] text-gray-400">(keeps original item projects)</span>
                      </div>
                      {projectId === '' && <Check size={15} className="text-blue-600 shrink-0" />}
                    </button>
                  )}

                  {/* Filtered projects */}
                  {searchedProjects.length > 0 ? (
                    searchedProjects.map((p) => {
                      const isSelected = String(p.id) === String(projectId);
                      const dept = p.department_name || p.workflow_type || (department || 'IT');
                      const isMarketing = dept.toLowerCase().includes('marketing');
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setProjectId(p.id);
                            setIsProjectDropdownOpen(false);
                            setProjectSearch('');
                          }}
                          className={`w-full text-left px-3 py-2 text-[13px] flex items-center justify-between transition ${isSelected
                            ? 'bg-blue-50/70 text-blue-700 font-medium'
                            : 'text-gray-800 hover:bg-gray-50'
                            }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="truncate">{p.name || p.title}</span>
                              {(p.company_name || p.client_name) && (
                                <span className="text-[11px] text-gray-500 font-normal truncate">
                                  ({p.company_name || p.client_name})
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5">
                              <span
                                className={`inline-block text-[10px]  px-1.5 py-0.5 rounded ${isMarketing
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                                  }`}
                              >
                                {dept}
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check size={15} className="text-blue-600 shrink-0 ml-2" />}
                        </button>
                      );
                    })
                  ) : (
                    projectSearch && (
                      <div className="px-4 py-6 text-center text-xs text-gray-400">
                        No projects found matching "{projectSearch}"
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-1">
              {selected
                ? `Work added to this sprint will be assigned to “${selected.name || selected.title}”.`
                : 'Without a project, work keeps whatever project it already has.'}
            </p>
          </div>

          <div>
            <label className="block text-[13px]  text-gray-700 mb-1">Sprint goal</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              placeholder="What should this sprint achieve?"
              className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="p-2 text-[14px] font-medium text-gray-700 hover:bg-gray-200 rounded transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isSaving}
            className="px-5 py-2 text-[14px] font-medium text-white bg-red-700 hover:bg-blue-700 rounded transition disabled:opacity-50"
          >
            {isSaving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSprintModal;

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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

  useEffect(() => {
    if (!isOpen) return;
    setDepartment(defaultDepartment || 'IT');
    setName(defaultName || '');
    setProjectId('');
    setGoal('');
    setError('');
  }, [isOpen, defaultName, defaultDepartment]);

  if (!isOpen) return null;

  const filteredProjects = projects.filter(p => {
    if (!department || department === 'ALL') return true;
    const pDept = (p.department_name || p.workflow_type || p.department || '').toLowerCase();
    const targetDept = department.toLowerCase();
    return pDept.includes(targetDept) || (targetDept === 'it' && (pDept.includes('it') || pDept.includes('software')));
  });

  const selected = projects.find(p => String(p.id) === String(projectId));

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
          <h2 className="text-xl font-semibold text-gray-900">Create sprint</h2>
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
              <label className="block text-[13px] font-semibold text-gray-700 mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="sprint_dept"
                    value="IT"
                    checked={department === 'IT'}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      if (name.includes('Sprint')) {
                        setName(name.replace(/^Marketing\s+Sprint/i, 'IT Sprint'));
                      }
                    }}
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
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      if (name.includes('Sprint')) {
                        setName(name.replace(/^IT\s+Sprint/i, 'Marketing Sprint'));
                      }
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Marketing</span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1">
              Sprint name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] bg-white outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">No project</option>
              {(filteredProjects.length > 0 ? filteredProjects : projects).map(p => (
                <option key={p.id} value={p.id}>
                  {p.name || p.title}{p.company_name || p.client_name ? ` (${p.company_name || p.client_name})` : ''} [{p.department_name || p.workflow_type || 'IT'}]
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {selected
                ? `Work added to this sprint will be assigned to “${selected.name || selected.title}”.`
                : 'Without a project, work keeps whatever project it already has.'}
            </p>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1">Sprint goal</label>
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
            className="px-5 py-2 text-[14px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
          >
            {isSaving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSprintModal;

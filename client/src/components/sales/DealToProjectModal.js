import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const DealToProjectModal = ({ isOpen, onClose, dealId, dealName, dealValue }) => {
  const [departments, setDepartments] = useState([]);
  const [projects, setProjects] = useState([{
    name: dealName,
    department_id: '',
    budget: dealValue,
    isParent: true
  }]);
  const [loading, setLoading] = useState(false);
  const [showSubProject, setShowSubProject] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
    }
  }, [isOpen]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleAddSubProject = () => {
    setProjects(prev => [...prev, {
      name: '',
      department_id: '',
      budget: 0,
      isParent: false
    }]);
    setShowSubProject(true);
  };

  const handleProjectChange = (index, field, value) => {
    setProjects(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveProject = (index) => {
    if (index === 0) {
      showErrorToast('Cannot remove parent project');
      return;
    }
    setProjects(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create parent project
      const parentProject = projects[0];
      const parentRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: parentProject.name,
          title: parentProject.name,
          department_id: parentProject.department_id ? parseInt(parentProject.department_id) : null,
          budget: parentProject.budget,
          deal_id: dealId,
          status: 'Planning'
        })
      });

      if (!parentRes.ok) throw new Error('Failed to create parent project');
      const parentData = await parentRes.json();
      const parentProjectId = parentData.id;

      // Create sub-projects if any
      for (let i = 1; i < projects.length; i++) {
        const subProject = projects[i];
        if (subProject.name.trim()) {
          await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: subProject.name,
              title: subProject.name,
              parent_project_id: parentProjectId,
              department_id: subProject.department_id ? parseInt(subProject.department_id) : null,
              budget: subProject.budget,
              deal_id: dealId,
              status: 'Planning'
            })
          });
        }
      }

      showSuccessToast(`Project "${parentProject.name}" created with ${projects.length - 1} sub-projects!`);
      onClose();
      setProjects([{
        name: dealName,
        department_id: '',
        budget: dealValue,
        isParent: true
      }]);
    } catch (error) {
      showErrorToast('Failed to create project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded  shadow-xl w-full max-w-2xl max-h-96 overflow-y-auto">
        <div className="sticky top-0 bg-white border-bp-2   flex justify-between items-center">
          <h2 className="text-xl  text-gray-800">Convert Deal to Project(s)</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-3 flex gap-2">
            <AlertCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm  text-green-900">Multi-Project Support</p>
              <p className="text-sm text-green-700">Create a parent project with multiple sub-projects for deals with mixed services</p>
            </div>
          </div>

          {projects.map((project, index) => (
            <div key={index} className={`border rounded p-2   ${project.isParent ? 'bg-gray-50 border-gray-300' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm  text-gray-800">
                  {project.isParent ? '📌 Parent Project' : `📂 Sub-Project ${index}`}
                </h3>
                {!project.isParent && (
                  <button
                    type="button"
                    onClick={() => handleRemoveProject(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs  text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={project.name}
                    onChange={(e) => handleProjectChange(index, 'name', e.target.value)}
                    required={index === 0}
                    disabled={index === 0}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-xs  text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    value={project.department_id}
                    onChange={(e) => handleProjectChange(index, 'department_id', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs  text-gray-700 mb-1">
                    Budget
                  </label>
                  <input
                    type="number"
                    value={project.budget}
                    onChange={(e) => handleProjectChange(index, 'budget', parseFloat(e.target.value))}
                    step="0.01"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add Sub-Project Button */}
          <button
            type="button"
            onClick={handleAddSubProject}
            className="w-full border-2 border-dashed border-gray-300 rounded  p-3 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700 flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Add Sub-Project (for mixed services)
          </button>

          {/* Budget Summary */}
          <div className="bg-gray-100 rounded  p-3">
            <p className="text-sm text-gray-600">
              <span className="">Total Budget:</span> ${projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Parent: 1 | Sub-projects: {projects.length - 1}
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 rounded-md  hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creating Projects...' : 'Create Project(s)'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 py-2 rounded-md  text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DealToProjectModal;

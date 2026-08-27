import React, { useState } from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import DateRangeDropdown from './DateRangeDropdown';
import AddProjectModal from './AddProjectModal';

const RecentProjectsTable = ({ projects, onDateRangeChange, onAddProject, onEditProject, onDeleteProject, onViewProjectDetails, onViewCompanyDetails }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('Last 30 Days');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 border border-red-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'Low':
        return 'bg-green-100 text-green-800 border border-green-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '0000-00-00') return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' });
    } catch (e) {
      return '-';
    }
  };

  const handleEditClick = (project) => {
    setEditingProject(project);
    setShowAddModal(true);
  };

  const handleDeleteClick = (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      if (onDeleteProject) {
        onDeleteProject(projectId);
      }
    }
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setEditingProject(null);
  };

  return (
    <div className="bg-white rounded  border border-border-light">
      <div className="p-2 border-b border-border-light">
        <div className="flex items-center justify-between">
          <h2 className="text-sm text-gray-900">Recent Projects</h2>
          <div className="flex items-center gap-2">
            <DateRangeDropdown
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              onDateRangeChange={onDateRangeChange}
              options={['Last 15 Days', 'Last 30 Days']}
            />
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 p-2 rounded bg-red-500 text-white text-xs  hover:bg-red-600 transition-colors"
              title="Add Project"
            >
              <span>● Add Project</span>
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-border-light">
            <tr>
              <th className="p-2 text-left text-xs  text-gray-900 w-[30%]">Name</th>
              <th className="p-2 text-left text-xs  text-gray-900 w-[20%]">Company</th>
              <th className="p-2 text-left text-xs  text-gray-900 w-[15%]">Priority</th>
              <th className="p-2 text-left text-xs  text-gray-900 w-[15%]">Due Date</th>
              <th className="p-2 text-left text-xs  text-gray-900 w-[20%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {projects.slice(0, 5).map((project) => (
              <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-2 text-xs   text-gray-900 truncate">
                  <button
                    type="button"
                    onClick={() => onViewProjectDetails && onViewProjectDetails(project.id)}
                    className="text-white  hover:text-blue-700 hover:underline truncate"
                    title={project.name}
                  >
                    {project.name || '-'}
                  </button>
                </td>
                <td className="p-2 text-xs  ">
                  {project.company ? (
                    <button
                      type="button"
                      onClick={() => onViewCompanyDetails && onViewCompanyDetails(project.company)}
                      className="inline-flex items-center gap-2 p-1  rounded bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors truncate"
                      title={project.company}
                    >
                      <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0"></span>
                      <span className="truncate">{project.company}</span>
                    </button>
                  ) : (
                    <span className="text-[#1F2020] ">-</span>
                  )}
                </td>
                <td className="p-2 text-xs">
                  <span className={`inline-flex items-center p-1 rounded text-xs   ${getPriorityColor(project.priority)}`}>
                    {project.priority}
                  </span>
                </td>
                <td className="p-2 text-xs text-gray-600">{formatDate(project.dueDate)}</td>
                <td className="p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewProjectDetails && onViewProjectDetails(project.id)}
                      className="p-1 text-[#1F2020] hover:text-white  transition-colors"
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handleEditClick(project)}
                      className="p-1 text-[#1F2020] hover:text-yellow-600 transition-colors"
                      title="Edit Project"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(project.id)}
                      className="p-1 text-[#1F2020] hover:text-red  transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {projects.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">No projects found</p>
        </div>
      )}

      <AddProjectModal
        isOpen={showAddModal}
        onClose={handleModalClose}
        initialData={editingProject}
        onSubmit={(formData) => {
          if (editingProject) {
            if (onEditProject) onEditProject(editingProject.id, formData);
          } else {
            if (onAddProject) onAddProject(formData);
          }
          handleModalClose();
        }}
      />
    </div>
  );
};

export default RecentProjectsTable;

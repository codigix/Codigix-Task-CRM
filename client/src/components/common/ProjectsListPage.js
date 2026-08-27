import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, Trash2, Eye } from 'lucide-react';
import { projectAPI } from '../../services/api';
import AddProjectModal from './AddProjectModal';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const ProjectsListPage = ({ onProjectSelect }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await projectAPI.getAll();
      setProjects(res);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        const projectToDelete = projects.find(p => p.id === projectId);
        await projectAPI.delete(projectId);
        fetchProjects();
        showSuccessToast(`Project "${projectToDelete?.name || 'Unknown'}" deleted successfully!`);
      } catch (err) {
        console.error('Error deleting project:', err);
        showErrorToast('Failed to delete project');
      }
    }
  };

  const handleModalSubmit = async (formData) => {
    try {
      const projectData = {
        title: formData.name,
        name: formData.name,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        budget: parseFloat(String(formData.price).replace(/[^0-9.]/g, '')) || 0,
        due_date: formData.dueDate,
        start_date: formData.startDate,
        project_type: formData.projectType,
        company: formData.client,
        company_id: formData.company_id,
        project_id: formData.projectId,
        manager_id: formData.manager_id,
        deal_id: formData.dealId || null,
        service_type: formData.category || null
      };

      await projectAPI.create(projectData);
      fetchProjects();
      showSuccessToast('Project created successfully!');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error creating project:', err);
      showErrorToast('Failed to save project: ' + err.message);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (project.project_id_code || project.project_id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === 'created_at') {
      return new Date(b.created_at) - new Date(a.created_at);
    } else if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  const getStatusBadge = (status) => {
    const badges = {
      'Planning': 'bg-blue-50 text-blue-700 border-blue-200',
      'In Progress': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'On Hold': 'bg-orange-50 text-orange-700 border-orange-200',
      'Completed': 'bg-green-50 text-green-700 border-green-200',
      'Cancelled': 'bg-red-50 text-red-700 border-red-200'
    };
    return badges[status] || badges.Planning;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Critical': 'text-red ',
      'High': 'text-orange-600',
      'Medium': 'text-yellow-600',
      'Low': 'text-green-600'
    };
    return colors[priority] || colors.Medium;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading projects...</div>;
  }

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="p-6 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-2xl  text-gray-900">Projects</h1>
            <p className="text-xs  text-gray-600 mt-1">{sortedProjects.length} projects total</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 p-2  bg-red-600 text-white rounded  hover:bg-red-700 transition  "
          >
            <Plus size={18} /> New Project
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-white rounded  border border-gray-200 p-2 space-y-4">
            <div className="flex gap-2 flex-wrap">
              <div className="flex-grow">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1F2020]" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-2  border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
              >
                <option value="all">All Status</option>
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="p-2  border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
              >
                <option value="created_at">Newest First</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {sortedProjects.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 mb-4">No projects found</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-2  bg-red-600 text-white rounded  hover:bg-red-700 transition   inline-flex items-center gap-2"
                >
                  <Plus size={16} /> Create First Project
                </button>
              </div>
            ) : (
              sortedProjects.map(project => (
                <div key={project.id} className="bg-white rounded  border border-gray-200 hover:shadow-md transitionp-3 ">
                  <div className="flex items-start justify-between">
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-md  text-gray-900">{project.name}</h3>
                        <span className={`text-xs   p-1  rounded border ${getStatusBadge(project.status)}`}>
                          {project.status}
                        </span>
                        {project.priority && (
                          <span className={`text-xs   ${getPriorityColor(project.priority)}`}>
                            {project.priority} Priority
                          </span>
                        )}
                      </div>
                      <p className="text-xs  text-gray-600 mb-3">ID: {project.project_id}</p>
                      {project.description && (
                        <p className="text-xs  text-gray-700 mb-3 line-clamp-2">{project.description}</p>
                      )}
                      <div className="grid grid-cols-4 gap-2 text-xs ">
                        <div>
                          <p className="text-gray-600">Type</p>
                          <p className="  text-gray-900">{project.project_type || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Budget</p>
                          <p className="  text-gray-900">${(project.price / 1000).toFixed(0)}K</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Due Date</p>
                          <p className="  text-gray-900">
                            {project.due_date ? new Date(project.due_date).toLocaleDateString() : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Team Members</p>
                          <p className="  text-gray-900">{project.responsible_persons?.length || 0} members</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => onProjectSelect?.(project.id)}
                        className="p-2 text-white  hover:bg-blue-50 rounded  transition"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="p-2 text-red  hover:bg-red-50 rounded  transition"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded  transition">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default ProjectsListPage;

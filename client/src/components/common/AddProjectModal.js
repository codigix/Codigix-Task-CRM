import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AddProjectModal = ({ isOpen, onClose, onSubmit, initialData, department }) => {
  const [isFetching, setIsFetching] = useState(false);
  const [confirmedProjects, setConfirmedProjects] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [fetchedCategories, setFetchedCategories] = useState([]);
  const [customProjectName, setCustomProjectName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    projectId: '',
    projectType: '',
    client: '',
    category: '',
    projectTiming: '',
    price: '',
    responsiblePersons: [],
    teamLeader: '',
    startDate: '',
    dueDate: '',
    priority: '',
    status: '',
    description: '',
    team_id: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchRequiredData();
    }
  }, [isOpen]);

  const fetchRequiredData = async () => {
    setIsFetching(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const deptParam = encodeURIComponent(department || 'IT');
      const [companiesRes, confirmedRes, usersRes, catRes, teamsRes] = await Promise.all([
        fetch(`${apiUrl}/confirmed-it-clients?department=${deptParam}`),
        fetch(`${apiUrl}/confirmed-it-projects?department=${deptParam}`),
        fetch(`${apiUrl}/users`),
        fetch(`${apiUrl}/service-categories`),
        fetch(`${apiUrl}/teams?department=${deptParam}`)
      ]);

      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
      }

      if (confirmedRes.ok) {
        const confirmedData = await confirmedRes.json();
        setConfirmedProjects(Array.isArray(confirmedData) ? confirmedData : []);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        setFetchedCategories(Array.isArray(catData) ? catData : []);
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(Array.isArray(teamsData) ? teamsData : []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setCompanies([]);
      setConfirmedProjects([]);
      setUsers([]);
      setFetchedCategories([]);
      setTeams([]);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    const formatDateForInput = (dateStr) => {
      if (!dateStr || dateStr === '0000-00-00') return '';
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
      } catch (e) {
        return '';
      }
    };

    if (initialData) {
      setFormData({
        name: initialData.name || initialData.title || '',
        projectId: initialData.project_id_code || initialData.project_id || initialData.projectId || `PRJ-00${initialData.id}` || '',
        projectType: initialData.project_type || initialData.projectType || '',
        client: initialData.company_name || initialData.company || initialData.client || '',
        category: initialData.category || initialData.department_name || initialData.workflow_type || '',
        projectTiming: initialData.project_timing || initialData.projectTiming || '',
        price: initialData.budget !== undefined && initialData.budget !== null ? initialData.budget : (initialData.price || ''),
        responsiblePersons: Array.isArray(initialData.responsible_persons) ? initialData.responsible_persons :
          (Array.isArray(initialData.responsiblePersons) ? initialData.responsiblePersons : []),
        teamLeader: initialData.manager_name || initialData.team_leader || initialData.teamLeader || '',
        startDate: formatDateForInput(initialData.start_date || initialData.startDate),
        dueDate: formatDateForInput(initialData.due_date || initialData.dueDate || initialData.end_date),
        priority: initialData.priority || 'Medium',
        status: initialData.status || initialData.stage || 'Planning',
        description: initialData.description || '',
        team_id: initialData.team_id || '',
      });
      // If the project name isn't in confirmedProjects, customProjectName needs to be set so it doesn't get lost
      if (initialData.name && !confirmedProjects.find(p => p.name === initialData.name)) {
        // We'll still set formData.name to initialData.name, but we also ensure it's in the select options below.
      }
    } else {
      setFormData({
        name: '',
        projectId: 'PRJ-' + Math.floor(100000 + Math.random() * 900000), // Auto-generated ID
        projectType: '',
        client: '',
        category: '',
        projectTiming: '',
        price: '',
        responsiblePersons: [],
        teamLeader: '',
        startDate: '',
        dueDate: '',
        priority: '',
        status: '',
        description: '',
        team_id: '',
      });
    }
  }, [initialData, isOpen, confirmedProjects]);

  const [personInput, setPersonInput] = useState('');

  const assignableUsers = users.length > 0 ? users.map((u, i) => ({
    id: u.id,
    name: u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username,
    role_name: u.role_name || u.role || '',
    color: ['bg-purple-500', 'bg-cyan-500', 'bg-pink-500', 'bg-blue-500', 'bg-green-500'][i % 5]
  })) : [
    { id: 1, name: 'Robert Johnson', color: 'bg-purple-500' },
    { id: 2, name: 'Darlee Robertson', color: 'bg-cyan-500' },
    { id: 3, name: 'Sarah Johnson', color: 'bg-pink-500' },
    { id: 4, name: 'Michael Chen', color: 'bg-blue-500' },
    { id: 5, name: 'Emily Rodriguez', color: 'bg-green-500' },
  ];

  const projectTypes = fetchedCategories.length > 0 ? Array.from(new Set(fetchedCategories.map(c => c.parent_category).filter(Boolean))) : ['Web Development', 'Mobile App', 'Desktop Software', 'Cloud Migration', 'AI/ML Project'];
  const categories = fetchedCategories.length > 0 ? Array.from(new Set(fetchedCategories.map(c => c.name).filter(Boolean))) : ['Development', 'Design', 'Infrastructure', 'Consulting', 'Support'];
  const timings = ['Immediate', 'Short Term', 'Medium Term', 'Long Term'];
  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const statuses = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Auto-select client if a confirmed project is selected
    if (name === 'name' && value) {
      const selectedProject = confirmedProjects.find(p => p.name === value);
      if (selectedProject) {
        setFormData(prev => ({
          ...prev,
          name: value,
          client: selectedProject.company_name, // In this modal client seems to be name string
          dealId: selectedProject.id
        }));
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddPerson = (person) => {
    if (person && !formData.responsiblePersons.includes(person)) {
      setFormData(prev => ({
        ...prev,
        responsiblePersons: [...prev.responsiblePersons, person]
      }));
      setPersonInput('');
    }
  };

  const handleRemovePerson = (person) => {
    setFormData(prev => ({
      ...prev,
      responsiblePersons: prev.responsiblePersons.filter(p => p !== person)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const selectedCompany = companies.find(c => c.company_name === formData.client);
    const company_id = selectedCompany ? selectedCompany.id : null;

    const selectedManager = users.find(u => {
      const name = u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username;
      return name === formData.teamLeader;
    });
    const manager_id = selectedManager ? selectedManager.id : null;

    const finalName = formData.name === 'custom_add_project' ? customProjectName.trim() : formData.name.trim();

    if (!finalName) {
      alert('Project name is required');
      return;
    }

    if (onSubmit) {
      onSubmit({ ...formData, name: finalName, company_id, manager_id });
    }
    setFormData({
      name: '',
      projectId: '',
      projectType: '',
      client: '',
      category: '',
      projectTiming: '',
      price: '',
      responsiblePersons: [],
      teamLeader: '',
      startDate: '',
      dueDate: '',
      priority: '',
      status: '',
      description: '',
      team_id: '',
    });
    onClose();
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      projectId: '',
      projectType: '',
      client: '',
      category: '',
      projectTiming: '',
      price: '',
      responsiblePersons: [],
      teamLeader: '',
      startDate: '',
      dueDate: '',
      priority: '',
      status: '',
      description: '',
      team_id: '',
    });
    setCustomProjectName('');
    onClose();
  };

  const getTeamColor = (name) => {
    const user = assignableUsers.find(t => t.name === name);
    return user ? user.color : 'bg-gray-500';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={handleCancel}>
      <div
        className="h-full w-full md:w-[72%] lg:w-[60%] xl:w-[55%] bg-white shadow-xl overflow-y-auto border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-2 border-b border-gray-200">
          <h2 className="text-md  text-gray-900">{initialData ? 'Edit Project' : 'Add New Project'}</h2>
          <button
            onClick={handleCancel}
            className="text-gray-500 text-2xl hover:text-red  transition-colors"
          >
            ×
          </button>
        </div>

        <form id="add-project-form" onSubmit={handleSubmit} className="p-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {/* Name */}
          <div className="md:col-span-2">
            <label className="block text-xs    mb-2  text-gray-600">
              Name <span className="text-red-500">*</span>
            </label>
            <select
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              disabled={isFetching}
              className="w-full  p-2  border border-gray-300 rounded text-xs bg-white focus:ring-0 focus:border-gray-400 disabled:opacity-50"
            >
              <option value="">{isFetching ? 'Loading projects...' : 'Select Project'}</option>
              {confirmedProjects.map(project => (
                <option key={project.id} value={project.name}>
                  {project.name} ({project.company_name})
                </option>
              ))}
              {formData.name && formData.name !== 'custom_add_project' && !confirmedProjects.find(p => p.name === formData.name) && (
                <option value={formData.name}>{formData.name}</option>
              )}
              {!isFetching && confirmedProjects.length === 0 && (
                <option disabled>No confirmed {department || 'IT'} projects found</option>
              )}
              <option value="custom_add_project">+ Add Project</option>
            </select>
            {formData.name === 'custom_add_project' && (
              <input
                type="text"
                placeholder="Enter custom project name"
                value={customProjectName}
                onChange={(e) => setCustomProjectName(e.target.value)}
                className="w-full mt-2 p-2 border border-gray-300 rounded text-xs bg-white focus:ring-0 focus:border-gray-400 transition"
              />
            )}
          </div>

          {/* Project ID */}
          <div>
            <label className="block text-xs    mb-2  text-gray-600">
              Project ID
            </label>
            <input
              type="text"
              name="projectId"
              value={formData.projectId || 'Auto-generated'}
              readOnly
              disabled
              className="w-full  p-2  border border-gray-300 rounded text-xs bg-gray-50 text-gray-500 focus:ring-0 focus:border-gray-400 cursor-not-allowed"
            />
          </div>

          {/* Project Type */}
          <div>
            <label className="block text-xs    mb-2  text-gray-600">
              Project Type
            </label>
            <select
              name="projectType"
              value={formData.projectType}
              onChange={handleInputChange}
              className="w-full  p-2  border border-gray-300 rounded text-xs bg-white focus:ring-0 focus:border-gray-400"
            >
              <option value="">Choose</option>
              {formData.projectType && !projectTypes.includes(formData.projectType) && (
                <option value={formData.projectType}>{formData.projectType}</option>
              )}
              {projectTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Client */}
          <div>
            <label className="block text-xs    mb-2  text-gray-600">
              Client
            </label>
            <select
              name="client"
              value={formData.client}
              onChange={handleInputChange}
              disabled={isFetching}
              className="w-full  p-2  border border-gray-300 rounded text-xs bg-white focus:ring-0 focus:border-gray-400 disabled:opacity-50"
            >
              <option value="">{isFetching ? 'Loading companies...' : 'Select'}</option>
              {formData.client && !companies.some(c => c.company_name === formData.client) && (
                <option value={formData.client}>{formData.client}</option>
              )}
              {companies.map(company => (
                <option key={company.id} value={company.company_name}>
                  {company.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs    mb-2  text-gray-600">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full  p-2  border border-gray-300 rounded text-xs bg-white focus:ring-0 focus:border-gray-400"
            >
              <option value="">Select</option>
              {formData.category && !categories.includes(formData.category) && (
                <option value={formData.category}>{formData.category}</option>
              )}
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Project Timing */}
          <div>
            <label className="block text-xs    mb-2  text-gray-600">
              Project Timing
            </label>
            <select
              name="projectTiming"
              value={formData.projectTiming}
              onChange={handleInputChange}
              className="w-full  p-2  border border-gray-300 rounded text-xs bg-white focus:ring-0 focus:border-gray-400"
            >
              <option value="">Select</option>
              {timings.map(timing => (
                <option key={timing} value={timing}>{timing}</option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs    mb-2  text-gray-600">
              Price
            </label>
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              placeholder=""
              className="w-full  p-2  border border-gray-300 rounded text-xs bg-white focus:ring-0 focus:border-gray-400"
            />
          </div>

          {/* Assigned Team */}
          <div className="md:col-span-2">
            <label className="block text-xs    mb-2  text-gray-600">
              Assigned Team
            </label>
            <select
              name="team_id"
              value={formData.team_id || ''}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:ring-0 focus:border-gray-400"
            >
              <option value="">No Team Assigned</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>

          {/* Responsible Persons */}
          <div className="md:col-span-2">
            <label className="block text-xs    mb-2  text-gray-600">
              Responsible Persons
            </label>
            <div className="flex gap-2 mb-3">
              <select
                value={personInput}
                onChange={(e) => setPersonInput(e.target.value)}
                className="flex-1  p-2  border border-gray-300 rounded text-xs bg-white focus:ring-0 focus:border-gray-400"
              >
                <option value="">Add person</option>
                {assignableUsers.map(user => (
                  <option key={user.id} value={user.name}>{user.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleAddPerson(personInput)}
                className="p-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center justify-center flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {formData.responsiblePersons.map(person => (
                <div key={person} className="flex items-center justify-between bg-red-50 border border-red-100 rounded p-2">
                  <span className="text-xs text-gray-700 flex items-center gap-2">
                    <span className={`w-5 h-5 ${getTeamColor(person)} rounded-full flex items-center justify-center text-white text-xs `}>
                      {person.charAt(0)}
                    </span>
                    {person}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePerson(person)}
                    className="text-red-400 hover:text-red  transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Team Leader */}
          <div className="md:col-span-2">
            <label className="block text-xs    mb-2  text-gray-600">
              Team Leader
            </label>
            <select
              name="teamLeader"
              value={formData.teamLeader}
              onChange={handleInputChange}
              className="w-full  p-2  border border-gray-300 rounded text-xs bg-white focus:ring-0 focus:border-gray-400"
            >
              <option value="">Select</option>
              {assignableUsers
                .filter(u => u.role_name.toLowerCase().includes('manager') || u.role_name.toLowerCase().includes('admin'))
                .map(user => (
                  <option key={user.id} value={user.name}>{user.name}</option>
                ))}
              {formData.teamLeader && !assignableUsers.some(u => u.name === formData.teamLeader) && (
                <option value={formData.teamLeader}>{formData.teamLeader}</option>
              )}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs    mb-2  text-gray-600">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="w-full  p-2  border border-gray-300 rounded text-xs bg-white focus:ring-0 focus:border-gray-400"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs    mb-2  text-gray-600">
              Due Date
            </label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              className="w-full  p-2  border border-gray-300 rounded text-xs bg-white focus:ring-0 focus:border-gray-400"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs    mb-2  text-gray-600">
              Priority
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full  p-2  border border-gray-300 rounded text-xs bg-white focus:ring-0 focus:border-gray-400"
            >
              <option value="">Select</option>
              {priorities.map(pri => (
                <option key={pri} value={pri}>{pri}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs    mb-2  text-gray-600">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full  p-2  border border-gray-300 rounded text-xs bg-white focus:ring-0 focus:border-gray-400"
            >
              <option value="">Select</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-xs    mb-2  text-gray-600">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Description"
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded  text-xs  bg-white focus:ring-0 focus:border-gray-400 resize-none"
            ></textarea>
          </div>
        </form>

        <div className="p-6 flex justify-end gap-3 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded  text-xs  hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-project-form"
            className="p-2  bg-red-500 text-white rounded  text-xs  hover:bg-red-600 transition-colors"
          >
            {initialData ? 'Update Project' : 'Create New'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProjectModal;

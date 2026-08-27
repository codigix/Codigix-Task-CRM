import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Paperclip, Image as ImageIcon, Bell, FileText, UserPlus, Layout } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AddNewTaskModal = ({ isOpen, onClose, onSubmit, initialData = null, deals = [], projects = [], users = [], department = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [allUsers, setAllUsers] = useState(users);
  const [allDeals, setAllDeals] = useState(deals);
  const [allProjects, setAllProjects] = useState(projects);
  const [confirmedProjects, setConfirmedProjects] = useState([]);
  const [confirmedClients, setConfirmedClients] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [allQuotations, setAllQuotations] = useState([]);
  const [projectTeam, setProjectTeam] = useState([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'Open',
    assigned_to: [],
    due_date: '',
    due_time: '',
    linked_type: 'General',
    linked_id: '',
    project_id: '',
    client_id: '',
    tags: [],
    task_type: 'General',
    workflow_type: 'General',
    marketing_category: '',
    internal_notes: '',
    reminder_date: '',
    reminder_time: '',
    documents: [],
    images: [],
    next_followup_date: '',
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
      if (initialData) {
        let assigned = [];
        try {
          assigned = typeof initialData.assigned_to === 'string'
            ? JSON.parse(initialData.assigned_to)
            : (Array.isArray(initialData.assigned_to) ? initialData.assigned_to : [initialData.assigned_to]);
          assigned = assigned.map(id => parseInt(id)).filter(Boolean);
        } catch (e) {
          assigned = initialData.assigned_to ? [parseInt(initialData.assigned_to)] : [];
        }

        setFormData({
          title: initialData.title || '',
          description: initialData.description || '',
          priority: initialData.priority || 'Medium',
          status: initialData.status || 'Open',
          assigned_to: assigned,
          due_date: initialData.due_date ? initialData.due_date.substring(0, 10) : '',
          due_time: initialData.due_time || '',
          linked_type: initialData.linked_type || 'General',
          linked_id: initialData.linked_id || '',
          project_id: initialData.project_id || (initialData.linked_type === 'Project' ? initialData.linked_id : ''),
          tags: Array.isArray(initialData.tags) ? initialData.tags : [],
          task_type: initialData.task_type || 'General',
          workflow_type: department === 'IT' ? 'IT' : (initialData.workflow_type || 'General'),
          department_id: department === 'IT' ? 6 : (initialData.department_id || null),
          marketing_category: initialData.marketing_category || '',
          internal_notes: initialData.internal_notes || '',
          reminder_date: initialData.reminder_date ? initialData.reminder_date.substring(0, 10) : '',
          reminder_time: initialData.reminder_time || '',
          documents: Array.isArray(initialData.documents) ? initialData.documents : [],
          images: Array.isArray(initialData.images) ? initialData.images : [],
          next_followup_date: initialData.next_followup_date ? initialData.next_followup_date.substring(0, 10) : '',
        });
      } else {
        setFormData({
          title: '',
          description: '',
          priority: 'Medium',
          status: 'Open',
          assigned_to: [],
          due_date: '',
          due_time: '',
          linked_type: 'General',
          linked_id: '',
          project_id: '',
          client_id: '',
          tags: [],
          task_type: 'General',
          workflow_type: department === 'IT' ? 'IT' : 'General',
          department_id: department === 'IT' ? 6 : null,
          marketing_category: '',
          internal_notes: '',
          reminder_date: '',
          reminder_time: '',
          documents: [],
          images: [],
          next_followup_date: '',
        });
      }
      fetchData();
    }
  }, [isOpen, initialData]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const [usersRes, dealsRes, projectsRes, leadsRes, estimationsRes, confirmedRes, confirmedClientsRes] = await Promise.all([
        fetch(`${apiUrl}/contacts`).then(r => r.json()),
        fetch(`${apiUrl}/deals`).then(r => r.json()),
        fetch(`${apiUrl}/projects`).then(r => r.json()),
        fetch(`${apiUrl}/leads`).then(r => r.json()),
        fetch(`${apiUrl}/estimations`).then(r => r.json()),
        fetch(`${apiUrl}/confirmed-it-projects`).then(r => r.json()),
        fetch(`${apiUrl}/confirmed-it-clients`).then(r => r.json()),
      ]).catch(err => {
        console.error('Error fetching data:', err);
        return [[], [], [], [], [], [], []];
      });

      setAllUsers(Array.isArray(usersRes) ? usersRes : []);
      setAllDeals(Array.isArray(dealsRes) ? dealsRes : []);
      setAllProjects(Array.isArray(projectsRes) ? projectsRes : []);
      setAllLeads(Array.isArray(leadsRes) ? leadsRes : []);
      setAllQuotations(Array.isArray(estimationsRes) ? estimationsRes : []);
      setConfirmedProjects(Array.isArray(confirmedRes) ? confirmedRes : []);
      setConfirmedClients(Array.isArray(confirmedClientsRes) ? confirmedClientsRes : []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchProjectTeam = async (projectId) => {
    if (!projectId) {
      setProjectTeam([]);
      return;
    }
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/projects/${projectId}/team`);
      const data = await response.json();
      setProjectTeam(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching project team:', err);
      setProjectTeam([]);
    }
  };

  useEffect(() => {
    if (formData.project_id) {
      // Find the actual project ID. 
      // In IT tasks, project_id in confirmedProjects might be a deal_id
      const selectedProject = allProjects.find(p =>
        p.id === parseInt(formData.project_id) ||
        (p.deal_id && p.deal_id === parseInt(formData.project_id))
      );

      if (selectedProject) {
        fetchProjectTeam(selectedProject.id);
      } else {
        // If not found in allProjects, it might be a direct project ID
        fetchProjectTeam(formData.project_id);
      }
    } else {
      setProjectTeam([]);
    }
  }, [formData.project_id, allProjects]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Auto-link to project if project_id is selected
    if (name === 'project_id' || (name === 'linked_id' && formData.linked_type === 'Project')) {
      const pId = value;
      if (pId) {
        const selectedProject = confirmedProjects.find(p => p.id === parseInt(pId)) || allProjects.find(p => p.id === parseInt(pId));
        setFormData(prev => ({
          ...prev,
          project_id: pId,
          linked_type: 'Project',
          linked_id: pId,
          client_id: selectedProject ? (selectedProject.company_id || selectedProject.client_id || '').toString() : prev.client_id
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          project_id: '',
          linked_id: ''
        }));
      }
      return;
    }

    if (name === 'client_id') {
      setFormData(prev => ({
        ...prev,
        client_id: value
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAssigneeToggle = (userId) => {
    setFormData(prev => ({
      ...prev,
      assigned_to: prev.assigned_to.includes(userId)
        ? prev.assigned_to.filter(id => id !== userId)
        : [...prev.assigned_to, userId]
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleFileChange = (e, type) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], ...files]
    }));
  };

  const removeFile = (index, type) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Task title is required');
      return;
    }

    if (formData.linked_type !== 'General' && !formData.linked_id) {
      setError(`Please select a ${formData.linked_type} to link`);
      return;
    }

    setIsLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
      handleCancel();
    } catch (err) {
      setError(err.message || 'Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      setFormData({
        title: '',
        description: '',
        priority: 'Medium',
        status: 'Open',
        assigned_to: [],
        due_date: '',
        due_time: '',
        linked_type: 'General',
        linked_id: '',
        project_id: '',
        client_id: '',
        tags: [],
        task_type: 'General',
        workflow_type: department === 'IT' ? 'IT' : 'General',
        department_id: department === 'IT' ? 6 : null,
        marketing_category: '',
        internal_notes: '',
        reminder_date: '',
        reminder_time: '',
        documents: [],
        images: [],
        next_followup_date: '',
      });
      setError('');
      setTagInput('');
      onClose();
    }, 300);
  };

  const getAssignedUsers = () => {
    return formData.assigned_to
      .map(id => allUsers.find(u => u.id === parseInt(id)))
      .filter(Boolean);
  };

  const getLinkedName = () => {
    if (formData.linked_type === 'Deal' && formData.linked_id) {
      const deal = allDeals.find(d => d.id === parseInt(formData.linked_id));
      return deal ? deal.name || deal.title : '';
    } else if (formData.linked_type === 'Project' && formData.linked_id) {
      const project = allProjects.find(p => p.id === parseInt(formData.linked_id));
      return project ? project.name || project.title : '';
    } else if (formData.linked_type === 'Lead' && formData.linked_id) {
      const lead = allLeads.find(l => l.id === parseInt(formData.linked_id));
      return lead ? lead.lead_name || lead.name : '';
    } else if (formData.linked_type === 'Quotation' && formData.linked_id) {
      const quotation = allQuotations.find(q => q.id === parseInt(formData.linked_id));
      return quotation ? quotation.quotation_number || quotation.title : '';
    }
    return '';
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${isVisible ? 'bg-black/20 opacity-100' : 'bg-black/0 opacity-0'}`}>
      <div
        className={`h-full w-full md:w-[72%] lg:w-[60%] xl:w-[55%] bg-white shadow-xl overflow-y-auto border-l border-gray-200 transform transition-transform duration-300 ease-in-out ${isVisible ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex justify-between items-center p-3  border-b border-[#EAECF0] sticky top-0 bg-white z-10">
          <h2 className="text-md  text-gray-900">{initialData ? 'Edit Task' : 'Create New Task'}</h2>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="text-[#1F2020] hover:text-red  transition-colors text-2xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="p-2 m-4 bg-red-50 border border-red-200 rounded ">
            <p className="text-xs  text-red-700  ">{error}</p>
          </div>
        )}

        {loadingData && (
          <div className="p-6 text-center text-gray-600">Loading data...</div>
        )}

        {!loadingData && (
          <form onSubmit={handleSubmit} className="p-3 space-y-5">
            <div>
              <label className="block text-xs text-gray-700 mb-2">
                Project Name
              </label>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-red-500 transition"
              >
                <option value="">{department === 'IT' ? 'Select IT Project' : 'Select Project'}</option>
                {confirmedProjects.length > 0 ? (
                  confirmedProjects
                    .filter(p => !formData.client_id || p.company_id.toString() === formData.client_id.toString())
                    .map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name} {project.company_name ? `(${project.company_name})` : ''}
                      </option>
                    ))
                ) : (
                  allProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))
                )}
                {!loadingData && confirmedProjects.length === 0 && allProjects.length === 0 && (
                  <option disabled>No projects found</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter task title"
                className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter task description"
                rows="3"
                className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition resize-none"
              />
            </div>

            {department !== 'IT' && (
              <div>
                <label className="block text-xs text-gray-700 mb-2 flex items-center gap-1">
                  Workflow
                </label>
                <select
                  name="workflow_type"
                  value={formData.workflow_type}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      workflow_type: val,
                      linked_type: (val === 'SEO' || val === 'GMB') ? 'Project' : prev.linked_type
                    }));
                  }}
                  className="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-red-500 transition"
                >
                  <option value="General">General Task</option>
                  <option value="SEO">SEO Workflow</option>
                  <option value="GMB">GMB Workflow</option>
                  <option value="Content">Content Strategy</option>
                  <option value="Social">Social Media</option>
                </select>
              </div>
            )}

            {department !== 'IT' && (
              <div className="space-y-3">
                <label className="block text-xs  text-gray-700  tracking-wide">Link Task To</label>
                <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded border border-gray-100">
                  {['General', 'Deal', 'Project', 'Lead', 'Quotation'].map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="linked_type"
                        value={type}
                        checked={formData.linked_type === type}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300"
                      />
                      <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">{type}</span>
                    </label>
                  ))}
                </div>

                {formData.linked_type === 'Project' ? (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Select Project Name</label>
                    <select
                      name="linked_id"
                      value={formData.linked_id}
                      onChange={handleInputChange}
                      className="w-full p-2.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all "
                    >
                      <option value="">Select Project</option>
                      {confirmedProjects.length > 0 ? (
                        confirmedProjects.map(project => (
                          <option key={project.id} value={project.id}>
                            {project.name} {project.company_name ? `(${project.company_name})` : ''}
                          </option>
                        ))
                      ) : (
                        allProjects.map(project => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                ) : formData.linked_type !== 'General' && (
                  <select
                    name="linked_id"
                    value={formData.linked_id}
                    onChange={handleInputChange}
                    className="w-full p-2.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all "
                  >
                    <option value="">Select {formData.linked_type}</option>
                    {(formData.linked_type === 'Deal' ? allDeals :
                      formData.linked_type === 'Lead' ? allLeads :
                        allQuotations).map(item => (
                          <option key={item.id} value={item.id}>
                            {item.quotation_number || item.lead_name || item.name || item.title}
                          </option>
                        ))}
                  </select>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  Task Type
                </label>
                <select
                  name="task_type"
                  value={formData.task_type}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-red-500 transition"
                >
                  <option value="General">General</option>
                  <option value="Call">Call</option>
                  <option value="Message">Message</option>
                  <option value="Google Meet">Google Meet</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                  {formData.workflow_type === 'SEO' && (
                    <>
                      <option value="On-Page">On-Page</option>
                      <option value="Off-Page">Off-Page</option>
                      <option value="Technical">Technical</option>
                      <option value="Audit">Audit</option>
                    </>
                  )}
                  {formData.workflow_type === 'GMB' && (
                    <>
                      <option value="Post Update">Post Update</option>
                      <option value="Review Response">Review Response</option>
                      <option value="Photo Upload">Photo Upload</option>
                      <option value="Citation">Citation</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-red-500 transition"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            {(formData.workflow_type === 'SEO' || formData.workflow_type === 'GMB') && (
              <div className="p-3 bg-blue-50/50 rounded border border-blue-100">
                <label className="block text-xs  text-blue-700  mb-2">
                  {formData.workflow_type} Quick Suggestions
                </label>
                <div className="flex flex-wrap gap-2">
                  {(formData.workflow_type === 'SEO' ? [
                    "Keyword Research", "Meta Tags Optimization", "H1-H6 Audit", "Backlink Outreach", "Content Gap Analysis"
                  ] : [
                    "NAP Consistency Check", "Weekly GMB Post", "Respond to Reviews", "Update Business Hours", "Add New Photos"
                  ]).map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, title: suggestion }))}
                      className="px-2 py-1 bg-white border border-blue-200 rounded text-xs text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs  text-gray-700 mb-2  tracking-wide flex items-center gap-2">
                <UserPlus size={16} className="text-red-500" />
                Assign To <span className="text-red-500">*</span>
              </label>
              <select
                name="assigned_to"
                value={formData.assigned_to[0] || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value ? [parseInt(e.target.value)] : [] }))}
                className="w-full p-2.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all "
              >
                <option value="">{formData.project_id && projectTeam.length > 0 ? 'Select Team Member' : 'Select Assignee'}</option>
                {formData.project_id && projectTeam.length > 0 ? (
                  projectTeam.map(member => (
                    <option key={member.user_id || member.id} value={member.user_id || member.id}>
                      {member.first_name} {member.last_name} ({member.role || member.department || 'Team Member'})
                    </option>
                  ))
                ) : (
                  allUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.first_name} {user.last_name} ({user.department || 'Staff'})</option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-red-500 transition"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-red-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  Next Followup Date
                </label>
                <input
                  type="date"
                  name="next_followup_date"
                  value={formData.next_followup_date}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-red-500 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs  text-gray-700  tracking-wide flex items-center gap-2">
                  <Bell size={16} className="text-red-500" />
                  Set Reminder
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    name="reminder_date"
                    value={formData.reminder_date}
                    onChange={handleInputChange}
                    className="flex-1 p-2.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                  <input
                    type="time"
                    name="reminder_time"
                    value={formData.reminder_time}
                    onChange={handleInputChange}
                    className="w-28 p-2.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs  text-gray-700  tracking-wide flex items-center gap-2">
                <FileText size={16} className="text-red-500" />
                Task Notes & Internal Instructions
              </label>
              <textarea
                name="internal_notes"
                value={formData.internal_notes}
                onChange={handleInputChange}
                placeholder="Add internal notes or specific instructions for the team..."
                rows="4"
                className="w-full p-3 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none "
              />
              <div className="flex flex-wrap gap-2">
                {(formData.workflow_type === 'SEO' ? [
                  "Review meta descriptions", "Check H1 tags", "Analyze competitor backlinks", "Update robot.txt"
                ] : formData.workflow_type === 'GMB' ? [
                  "Verify business address", "Upload weekly post", "Check review responses", "Update holidays hours"
                ] : ["Final Review Required", "Client approval pending", "Needs revision", "Priority for today"]).map(note => (
                  <button
                    key={note}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, internal_notes: prev.internal_notes ? `${prev.internal_notes}\n${note}` : note }))}
                    className="p-2 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                  >
                    + {note}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs text-gray-700 flex items-center gap-1">
                  <Paperclip size={14} className="text-gray-400" />
                  Documents
                </label>
                <div
                  onClick={() => document.getElementById('doc-upload').click()}
                  className="border-2 border-dashed border-gray-200 rounded p-4 text-center cursor-pointer hover:border-red-400 transition-colors bg-gray-50/50"
                >
                  <Plus size={16} className="mx-auto text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Upload Doc</span>
                  <input
                    id="doc-upload"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'documents')}
                  />
                </div>
                {formData.documents.length > 0 && (
                  <div className="space-y-1">
                    {formData.documents.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-1 bg-gray-50 rounded text-xs">
                        <span className="truncate flex-1 pr-2">{file.name}</span>
                        <button type="button" onClick={() => removeFile(i, 'documents')} className="text-red-500 hover:text-red-700">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-gray-700 flex items-center gap-1">
                  <ImageIcon size={14} className="text-gray-400" />
                  Images
                </label>
                <div
                  onClick={() => document.getElementById('img-upload').click()}
                  className="border-2 border-dashed border-gray-200 rounded p-4 text-center cursor-pointer hover:border-red-400 transition-colors bg-gray-50/50"
                >
                  <Plus size={16} className="mx-auto text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Add Image</span>
                  <input
                    id="img-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'images')}
                  />
                </div>
                {formData.images.length > 0 && (
                  <div className="space-y-1">
                    {formData.images.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-1 bg-gray-50 rounded text-xs">
                        <span className="truncate flex-1 pr-2">{file.name}</span>
                        <button type="button" onClick={() => removeFile(i, 'images')} className="text-red-500 hover:text-red-700">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>



            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 p-2  border border-gray-300 rounded  text-xs    text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 p-2  bg-red-600 text-white rounded  text-xs    hover:bg-red-700 transition disabled:opacity-50"
              >
                {isLoading ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update Task' : 'Create Task')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddNewTaskModal;

import React, { useState, useEffect } from 'react';
import {
  X, Bug, ChevronDown, Bold, Italic, Underline, Link,
  List, ListOrdered, Code, Quote, Image as ImageIcon,
  File, Video, Paperclip, CloudUpload, PlaySquare, FileArchive, XCircle, Plus
} from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


const ReportBugModal = ({ isOpen, onClose, onBugCreated }) => {
  const [steps, setSteps] = useState(['']);
  const [attachments, setAttachments] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    project: '',
    module: '',
    status: '',
    severity: '',
    assignee: '',
    reporter: '',
    environment: '',
    version: '',
    priority: '',
    bug_type: '',
    description: '',
    expected_results: '',
    actual_results: ''
  });

  const [usersList, setUsersList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [projectsData, setProjectsData] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchUsersAndProjects();
    }
  }, [isOpen]);

  const fetchUsersAndProjects = async () => {
    try {
      const [usersRes, projectsRes] = await Promise.all([
        fetch(API_BASE_URL + '/users'),
        fetch(API_BASE_URL + '/projects')
      ]);
      const usersData = await usersRes.json();
      const pData = await projectsRes.json();

      if (Array.isArray(usersData)) {
        setUsersList(usersData.map(u => `${u.first_name || ''} ${u.last_name || ''}`.trim()));
      }
      if (Array.isArray(pData)) {
        setProjectsData(pData);
        setProjectsList(pData.map(p => p.name));
      }
    } catch (err) {
      console.error('Error fetching data for modal:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileData = new FormData();
    fileData.append('file', file);

    try {
      const res = await fetch(API_BASE_URL + '/files/upload', {
        method: 'POST',
        body: fileData
      });
      const data = await res.json();
      if (data && data.file_path) {
        setAttachments([...attachments, {
          id: data.id || Date.now(),
          name: file.name,
          file_path: data.file_path,
          size_bytes: data.size_bytes || file.size
        }]);
      }
    } catch (err) {
      console.error('File upload failed', err);
    }
  };

  const handleStepChange = (index, value) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const addStep = () => setSteps([...steps, '']);

  const removeStep = (index) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
  };

  const removeAttachment = (index) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    setAttachments(newAttachments);
  };

  const handleSubmit = async () => {
    try {
      const selectedProjectObj = projectsData.find(p => p.name === formData.project);
      const projectId = selectedProjectObj ? selectedProjectObj.id : 1;

      const res = await fetch(API_BASE_URL + '/tester/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          title: formData.title,
          module: formData.module,
          status: formData.status,
          priority: formData.priority,
          severity: formData.severity,
          assignee: formData.assignee,
          reporter: formData.reporter,
          environment: formData.environment,
          bug_type: formData.bug_type,
          description: formData.description,
          expected_results: formData.expected_results,
          actual_results: formData.actual_results,
          steps: steps.filter(s => s.trim() !== ''),
          attachments: attachments
        })
      });
      const data = await res.json();
      if (data.success && onBugCreated) {
        onBugCreated(data.data);
      } else {
        onClose();
      }
    } catch (err) {
      console.error(err);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded shadow-2xl w-full max-w-5xl my-8 relative flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Bug className="text-red-500" size={24} />
              <h2 className="text-xl  text-gray-900">Report New Bug</h2>
            </div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <span>Dashboard</span> <span className="text-gray-400">&gt;</span> <span>Bug Tracking</span> <span className="text-gray-400">&gt;</span> <span>Report New Bug</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 border border-gray-200 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 p-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
            >
              <Bug size={16} /> Submit Bug
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar max-h-[calc(100vh-140px)]">

          {/* Top Form Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <SearchableSelect
                  label="Project *"
                  placeholder="Select Project"
                  options={projectsList.length > 0 ? projectsList : ['Hospital ERP', 'E-Commerce', 'Fintech App']}
                  value={formData.project}
                  onChange={(val) => setFormData({ ...formData, project: val })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bug Title <span className="text-red-500">*</span></label>
                <input
                  value={formData.title}
                  placeholder="Enter bug title..."
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <SearchableSelect
                  label="Status *"
                  placeholder="Select Status"
                  options={['Open', 'In Progress', 'Resolved', 'Closed']}
                  value={formData.status}
                  onChange={(val) => setFormData({ ...formData, status: val })}
                />
              </div>

              <div>
                <SearchableSelect
                  label="Severity *"
                  placeholder="Select Severity"
                  options={['Critical', 'Major', 'Minor']}
                  value={formData.severity}
                  onChange={(val) => setFormData({ ...formData, severity: val })}
                />
              </div>

              <div>
                <SearchableSelect
                  label="Assignee *"
                  placeholder="Select Assignee"
                  options={usersList.length > 0 ? usersList : ['Rahul Patil', 'Sneha Joshi', 'Akshay More', 'Priya Sharma']}
                  value={formData.assignee}
                  onChange={(val) => setFormData({ ...formData, assignee: val })}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <SearchableSelect
                  label="Module *"
                  placeholder="Select Module"
                  options={['Authentication', 'User Management', 'Dashboard', 'Reports', 'Documents', 'Billing', 'Notifications', 'Mobile App']}
                  value={formData.module}
                  onChange={(val) => setFormData({ ...formData, module: val })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bug ID</label>
                <input
                  type="text"
                  disabled
                  placeholder="Auto-generated"
                  className="w-full p-2.5 border border-gray-100 bg-gray-50 rounded text-sm text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <SearchableSelect
                  label="Priority *"
                  placeholder="Select Priority"
                  options={['High', 'Medium', 'Low']}
                  value={formData.priority}
                  onChange={(val) => setFormData({ ...formData, priority: val })}
                />
              </div>

              <div>
                <SearchableSelect
                  label="Bug Type *"
                  placeholder="Select Bug Type"
                  options={['Functional', 'Performance', 'Security', 'UI/UX']}
                  value={formData.bug_type}
                  onChange={(val) => setFormData({ ...formData, bug_type: val })}
                />
              </div>

              <div>
                <SearchableSelect
                  label="Reporter *"
                  placeholder="Select Reporter"
                  options={usersList.length > 0 ? usersList : ['Rahul Patil (You)', 'Sneha Joshi', 'Akshay More', 'Priya Sharma']}
                  value={formData.reporter}
                  onChange={(val) => setFormData({ ...formData, reporter: val })}
                />
              </div>
            </div>
          </div>

          {/* Environment & Build Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-8">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Environment <span className="text-red-500">*</span></label>
              <SearchableSelect
                placeholder="Select Environment"
                options={['QA', 'Staging', 'UAT', 'Production']}
                value={formData.environment}
                onChange={(val) => setFormData({ ...formData, environment: val })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Build / Version</label>
              <SearchableSelect
                placeholder="Select Build / Version"
                options={['v2.4.1 (Build 245)', 'v2.4.0 (Build 240)', 'v2.3.9 (Build 235)']}
                value={formData.version}
                onChange={(val) => setFormData({ ...formData, version: val })}
              />
            </div>
          </div>

          {/* Description and Steps Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-8">

            {/* Description (Rich Text area) */}
            <div className="flex flex-col">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description <span className="text-red-500">*</span></label>
              <div className="flex-1 border border-gray-200 rounded overflow-hidden flex flex-col bg-white">
                {/* Toolbar */}
                <div className="flex items-center gap-2 p-2 border-b border-gray-200 bg-gray-50 flex-wrap">
                  <button className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded">Normal <ChevronDown size={14} /></button>
                  <div className="w-px h-4 bg-gray-300 mx-1"></div>
                  <button className="p-1 text-gray-500 hover:bg-gray-200 rounded"><Bold size={14} /></button>
                  <button className="p-1 text-gray-500 hover:bg-gray-200 rounded"><Italic size={14} /></button>
                  <button className="p-1 text-gray-500 hover:bg-gray-200 rounded"><Underline size={14} /></button>
                  <button className="p-1 text-gray-500 hover:bg-gray-200 rounded"><Link size={14} /></button>
                  <div className="w-px h-4 bg-gray-300 mx-1"></div>
                  <button className="p-1 text-gray-500 hover:bg-gray-200 rounded"><List size={14} /></button>
                  <button className="p-1 text-gray-500 hover:bg-gray-200 rounded"><ListOrdered size={14} /></button>
                  <div className="w-px h-4 bg-gray-300 mx-1"></div>
                  <button className="p-1 text-gray-500 hover:bg-gray-200 rounded"><Code size={14} /></button>
                  <button className="p-1 text-gray-500 hover:bg-gray-200 rounded"><Quote size={14} /></button>
                </div>
                {/* Text Area */}
                <textarea
                  className="flex-1 w-full p-3 text-sm text-gray-700 focus:outline-none resize-none"
                  rows="4"
                  placeholder="Provide a detailed description of the bug..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                ></textarea>
              </div>
            </div>

            {/* Steps to Reproduce */}
            <div className="flex flex-col">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Steps to Reproduce <span className="text-red-500">*</span></label>
              <div className="flex-1 flex flex-col gap-2">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3 group">
                    <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-xs font-medium text-gray-600 shrink-0">{index + 1}</span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => handleStepChange(index, e.target.value)}
                      placeholder="Describe this step..."
                      className="flex-1 p-2 border border-gray-200 rounded text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removeStep(index)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button onClick={addStep} className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 mt-2 w-max">
                  <Plus size={16} /> Add Step
                </button>
              </div>
            </div>

          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-8">
            <div className="flex flex-col">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Expected Result <span className="text-red-500">*</span></label>
              <textarea
                className="flex-1 w-full p-2.5 border border-gray-200 rounded text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                rows="3"
                placeholder="What did you expect to happen?"
                value={formData.expected_results}
                onChange={e => setFormData({ ...formData, expected_results: e.target.value })}
              />
            </div>

            <div className="flex flex-col">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Actual Result <span className="text-red-500">*</span></label>
              <textarea
                className="flex-1 w-full p-2.5 border border-gray-200 rounded text-sm text-gray-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none bg-red-50/30"
                rows="3"
                placeholder="What actually happened?"
                value={formData.actual_results}
                onChange={e => setFormData({ ...formData, actual_results: e.target.value })}
              />
            </div>
          </div>

          {/* Attachments Section */}
          <div className="mb-8">
            <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              Attachments <span className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[10px] text-gray-500  ml-1">i</span>
            </label>
            <div className="flex gap-4 items-stretch">

              {/* Drag Drop Area */}
              <label className="w-[300px] border-2 border-dashed border-blue-200 bg-blue-50/50 rounded flex flex-col items-center justify-center p-6 text-center hover:bg-blue-50 cursor-pointer transition-colors shrink-0">
                <input type="file" className="hidden" onChange={handleFileUpload} />
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center  mb-3">
                  <CloudUpload className="text-blue-500" size={20} />
                </div>
                <div className="text-sm font-medium text-blue-700 mb-1">
                  Drag and drop files here <span className="text-gray-500 font-normal">or</span> click to browse
                </div>
                <div className="text-xs text-gray-400">Screenshots, Videos, Logs, Documents (Max 20MB each)</div>
              </label>

              {/* Uploaded Previews */}
              <div className="flex-1 flex gap-3 overflow-x-auto pb-2 custom-scrollbar">

                {attachments.map((file, i) => (
                  <div key={i} className="w-[160px] border border-gray-200 rounded p-2 bg-white flex flex-col shrink-0 group relative">
                    <button onClick={() => removeAttachment(i)} className="absolute top-1 right-1 p-1 bg-white rounded-full shadow hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-gray-500">
                      <X size={12} />
                    </button>
                    <div className="h-[80px] bg-gray-100 rounded mb-2 overflow-hidden flex items-center justify-center relative">
                      <ImageIcon className="text-gray-400" size={24} />
                    </div>
                    <div className="text-xs font-medium text-gray-800 truncate mb-0.5">{file.name}</div>
                    <div className="text-[10px] text-gray-500">{Math.round((file.size_bytes || 0) / 1024)} KB</div>
                  </div>
                ))}

              </div>

            </div>
          </div>

          {/* Tags and Linked Test Case Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tags</label>
              <div className="w-full min-h-[42px] px-2 py-1.5 border border-gray-200 rounded flex flex-wrap gap-2 items-center bg-white">
                <span className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium">
                  Login <button><X size={12} className="text-indigo-400 hover:text-indigo-700" /></button>
                </span>
                <span className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium">
                  UI <button><X size={12} className="text-indigo-400 hover:text-indigo-700" /></button>
                </span>
                <span className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium">
                  Safari <button><X size={12} className="text-indigo-400 hover:text-indigo-700" /></button>
                </span>
                <input
                  type="text"
                  placeholder="Add tag and press enter"
                  className="flex-1 min-w-[150px] text-sm text-gray-700 focus:outline-none bg-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Linked Test Case (Optional)</label>
              <div className="relative">
                <select className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded text-sm text-gray-900 appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                  <option>TC-1025 - Verify Login with valid credentials</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ReportBugModal;

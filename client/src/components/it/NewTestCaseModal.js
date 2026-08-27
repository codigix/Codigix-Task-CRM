import React, { useState, useEffect } from 'react';
import {
  X, FileText, ChevronDown, Bold, Italic, Underline, Link,
  List, ListOrdered, Code, Quote, Plus, Trash2, CloudUpload, Image as ImageIcon
} from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import SearchableSelect from '../common/SearchableSelect';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


const NewTestCaseModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    project: '',
    title: '',
    module: '',
    priority: '',
    type: '',
    isAutomated: false,
    status: '',
    category: '',
    suite: '',
    tags: [],
    assignedTo: '',
    reviewer: '',
    milestone: ''
  });

  const [tagInput, setTagInput] = useState('');
  const [projectsList, setProjectsList] = useState([]);
  const [projectsData, setProjectsData] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [bugsList, setBugsList] = useState([]);
  const [testCasesList, setTestCasesList] = useState([]);

  const [testDataSets, setTestDataSets] = useState([]);
  const [testSteps, setTestSteps] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchProjectsAndUsers();
    }
  }, [isOpen]);

  const fetchProjectsAndUsers = async () => {
    try {
      const [projRes, usersRes, bugsRes, tcRes] = await Promise.all([
        fetch(API_BASE_URL + '/projects'),
        fetch(API_BASE_URL + '/users'),
        fetch(API_BASE_URL + '/tester/bugs'),
        fetch(API_BASE_URL + '/tester/test-cases')
      ]);
      const pData = await projRes.json();
      const uData = await usersRes.json();
      const bData = await bugsRes.json();
      const tcData = await tcRes.json();

      if (Array.isArray(pData)) {
        setProjectsData(pData);
        setProjectsList(pData.map(p => p.name));
      }
      if (Array.isArray(uData)) {
        setUsersList(uData.map(u => `${u.first_name || ''} ${u.last_name || ''}`.trim()));
      }
      if (bData && bData.success) {
        setBugsList(bData.data.map(b => `BUG-${b.id} - ${b.title}`));
      }
      if (tcData && tcData.success) {
        setTestCasesList(tcData.data.map(tc => `TC-${tc.id} - ${tc.title}`));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      const selectedProjectObj = projectsData.find(p => p.name === formData.project);
      const projectId = selectedProjectObj ? selectedProjectObj.id : 1;

      const res = await fetch(API_BASE_URL + '/tester/test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          title: formData.title,
          module: formData.module,
          priority: formData.priority,
          type: formData.type,
          isAutomated: formData.isAutomated,
          status: formData.status,
          category: formData.category,
          suite: formData.suite,
          tags: formData.tags,
          assignedTo: formData.assignedTo,
          reviewer: formData.reviewer,
          milestone: formData.milestone,
          steps: testSteps,
          dataSets: testDataSets
        })
      });

      const data = await res.json();
      if (data.success) {
        showSuccessToast('Test case created successfully');
        onSuccess(data.data);
      } else {
        showErrorToast('Failed to create test case');
      }
    } catch (err) {
      console.error(err);
      showErrorToast('Error connecting to server');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded shadow-2xl w-full max-w-6xl my-8 relative flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="text-purple-600" size={24} />
              <h2 className="text-xl  text-gray-900">New Test Case</h2>
            </div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <span>Dashboard</span> <span className="text-gray-400">&gt;</span> <span>Test Cases</span> <span className="text-gray-400">&gt;</span> <span>New Test Case</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 border border-gray-200 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button className="p-2 border border-gray-200 rounded text-sm font-medium text-gray-700 hover:bg-gray-50">
              Save Draft
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 p-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
            >
              <Plus size={16} /> Create Test Case
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar max-h-[calc(100vh-140px)] flex flex-col gap-8">

          {/* Section 1: Test Case Details */}
          <div>
            <h3 className="text-[13px]  text-gray-900 mb-4 flex items-center gap-2">
              1. Test Case Details
            </h3>

            <div className="grid grid-cols-3 gap-x-6 gap-y-5">
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
                <SearchableSelect
                  label="Module *"
                  placeholder="Select Module"
                  options={['Authentication', 'User Management', 'Dashboard', 'Reports', 'Documents', 'Billing', 'Notifications', 'Mobile App']}
                  value={formData.module}
                  onChange={(val) => setFormData({ ...formData, module: val })}
                />
              </div>

              <div>
                <SearchableSelect
                  label="Test Suite"
                  placeholder="Select Test Suite"
                  options={['Login Test Suite', 'Payment Test Suite', 'User Profile Suite']}
                  value={formData.suite || ''}
                  onChange={(val) => setFormData({ ...formData, suite: val })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Test Case ID <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value="TC-2024-001"
                  readOnly
                  className="w-full p-2.5 border border-gray-100 bg-gray-50 rounded text-sm text-gray-500"
                />
                <div className="text-[10px] text-gray-400 mt-1">Auto-generated</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex justify-between">
                  <span>Test Case Title <span className="text-red-500">*</span></span>
                  <span className="text-gray-400 font-normal">{formData.title?.length || 0} / 255</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter test case title..."
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <SearchableSelect
                  label="Test Case Type *"
                  placeholder="Select Type"
                  options={['Functional', 'Integration', 'Performance', 'Security']}
                  value={formData.type}
                  onChange={(val) => setFormData({ ...formData, type: val })}
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
                  label="Severity *"
                  placeholder="Select Severity"
                  options={['Critical', 'Major', 'Minor']}
                  value={formData.severity || ''}
                  onChange={(val) => setFormData({ ...formData, severity: val })}
                />
              </div>

              <div>
                <SearchableSelect
                  label="Status *"
                  placeholder="Select Status"
                  options={['Draft', 'In Review', 'Ready for Test', 'Approved', 'Rejected', 'Active', 'Obsolete']}
                  value={formData.status}
                  onChange={(val) => setFormData({ ...formData, status: val })}
                />
              </div>

              <div>
                <SearchableSelect
                  label="Automation Status"
                  placeholder="Select Status"
                  options={['To Be Automated', 'Automated', 'Not Automatable']}
                  value={formData.isAutomated ? 'Automated' : 'To Be Automated'}
                  onChange={(val) => setFormData({ ...formData, isAutomated: val === 'Automated' })}
                />
              </div>

              <div>
                <SearchableSelect
                  label="Category"
                  placeholder="Select Category"
                  options={['Positive', 'Negative', 'Boundary', 'Integration']}
                  value={formData.category || ''}
                  onChange={(val) => setFormData({ ...formData, category: val })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tags</label>
                <div className="w-full min-h-[42px] px-2 py-1.5 border border-gray-200 rounded flex flex-wrap gap-2 items-center bg-white">
                  {formData.tags.map((tag, idx) => (
                    <span key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
                      {tag}
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tags: formData.tags.filter((_, i) => i !== idx) })}
                      >
                        <X size={12} className="text-purple-400 hover:text-purple-700" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add tag and press Enter"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        e.preventDefault();
                        if (!formData.tags.includes(tagInput.trim())) {
                          setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
                        }
                        setTagInput('');
                      }
                    }}
                    className="flex-1 min-w-[120px] text-sm text-gray-700 focus:outline-none bg-transparent"
                  />
                </div>
              </div>

              <div>
                <SearchableSelect
                  label="Assigned To"
                  placeholder="Select Assignee"
                  options={usersList.length > 0 ? usersList : []}
                  value={formData.assignedTo || ''}
                  onChange={(val) => setFormData({ ...formData, assignedTo: val })}
                />
              </div>

              <div>
                <SearchableSelect
                  label="Reviewer"
                  placeholder="Select Reviewer"
                  options={usersList.length > 0 ? usersList : []}
                  value={formData.reviewer || ''}
                  onChange={(val) => setFormData({ ...formData, reviewer: val })}
                />
              </div>

              <div>
                <SearchableSelect
                  label="Milestone / Version"
                  placeholder="Select Milestone"
                  options={['v1.0', 'v1.1', 'v2.0', 'v2.4.1 (Build 245)']}
                  value={formData.milestone || ''}
                  onChange={(val) => setFormData({ ...formData, milestone: val })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Section 2: Preconditions */}
            <div>
              <h3 className="text-[13px]  text-gray-900 mb-4 flex items-center gap-2">
                2. Preconditions
              </h3>
              <div className="relative border border-gray-200 rounded bg-white">
                <textarea
                  className="w-full p-3 text-sm text-gray-700 focus:outline-none resize-none"
                  rows="4"
                  placeholder="Enter preconditions..."
                  value={formData.preconditions || ''}
                  onChange={e => setFormData({ ...formData, preconditions: e.target.value })}
                />
                <div className="absolute bottom-2 right-2 text-[10px] text-gray-400">
                  {(formData.preconditions || '').length} / 1000
                </div>
              </div>
            </div>

            {/* Section 3: Test Data */}
            <div>
              <h3 className="text-[13px]  text-gray-900 mb-4 flex items-center gap-2">
                3. Test Data
              </h3>
              <div className="border border-gray-200 rounded overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-900 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2 px-3">Data Set</th>
                      <th className="py-2 px-3">Username / Email</th>
                      <th className="py-2 px-3">Password</th>
                      <th className="py-2 px-3">Role</th>
                      <th className="py-2 px-3 w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {testDataSets.map((ds, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-medium">{idx + 1}</td>
                        <td className="py-2 px-1"><input type="text" className="w-full px-2 py-1 border border-gray-200 rounded" value={ds.email} onChange={e => { const newDs = [...testDataSets]; newDs[idx].email = e.target.value; setTestDataSets(newDs); }} /></td>
                        <td className="py-2 px-1"><input type="text" className="w-full px-2 py-1 border border-gray-200 rounded" value={ds.password} onChange={e => { const newDs = [...testDataSets]; newDs[idx].password = e.target.value; setTestDataSets(newDs); }} /></td>
                        <td className="py-2 px-1"><input type="text" className="w-full px-2 py-1 border border-gray-200 rounded" value={ds.role} onChange={e => { const newDs = [...testDataSets]; newDs[idx].role = e.target.value; setTestDataSets(newDs); }} /></td>
                        <td className="py-2 px-3 flex gap-2 text-gray-400 items-center justify-center h-full mt-1.5">
                          <button type="button" onClick={() => setTestDataSets(testDataSets.filter((_, i) => i !== idx))} className="hover:text-red-500"><Trash2 size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => setTestDataSets([...testDataSets, { email: '', password: '', role: '' }])} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 mt-2 w-max">
                <Plus size={14} /> Add New Data Set
              </button>
            </div>
          </div>

          {/* Section 4: Test Steps */}
          <div>
            <h3 className="text-[13px]  text-gray-900 mb-4 flex items-center gap-2">
              4. Test Steps
            </h3>
            <div className="border border-gray-200 rounded overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-900 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2 px-3 w-16">Step No.</th>
                    <th className="py-2 px-3 w-1/3">Steps</th>
                    <th className="py-2 px-3 w-1/4">Test Data</th>
                    <th className="py-2 px-3 w-1/3">Expected Result</th>
                    <th className="py-2 px-3 w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {testSteps.map((ts, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-medium">{idx + 1}</td>
                      <td className="py-2 px-1"><textarea rows="2" className="w-full px-2 py-1 border border-gray-200 rounded resize-none" value={ts.step} onChange={e => { const newTs = [...testSteps]; newTs[idx].step = e.target.value; setTestSteps(newTs); }} /></td>
                      <td className="py-2 px-1"><textarea rows="2" className="w-full px-2 py-1 border border-gray-200 rounded resize-none" value={ts.data} onChange={e => { const newTs = [...testSteps]; newTs[idx].data = e.target.value; setTestSteps(newTs); }} /></td>
                      <td className="py-2 px-1"><textarea rows="2" className="w-full px-2 py-1 border border-gray-200 rounded resize-none" value={ts.expected} onChange={e => { const newTs = [...testSteps]; newTs[idx].expected = e.target.value; setTestSteps(newTs); }} /></td>
                      <td className="py-2 px-3 flex gap-2 text-gray-400 items-center justify-center h-full mt-3">
                        <button type="button" onClick={() => setTestSteps(testSteps.filter((_, i) => i !== idx))} className="hover:text-red-500"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => setTestSteps([...testSteps, { step: '', data: '', expected: '' }])} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 mt-2 w-max">
              <Plus size={14} /> Add Step
            </button>
          </div>

          {/* Section 5: Expected Result */}
          <div>
            <h3 className="text-[13px]  text-gray-900 mb-4 flex items-center gap-2">
              5. Expected Result
            </h3>
            <div className="border border-gray-200 rounded overflow-hidden flex flex-col bg-white">
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
              <div className="relative">
                <textarea
                  className="w-full p-3 text-sm text-gray-700 focus:outline-none resize-none"
                  rows="3"
                  placeholder="Enter expected result..."
                  value={formData.expectedResult || ''}
                  onChange={e => setFormData({ ...formData, expectedResult: e.target.value })}
                />
                <div className="absolute bottom-2 right-2 text-[10px] text-gray-400">
                  {(formData.expectedResult || '').length} / 1000
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Section 6: Attachments */}
            <div>
              <h3 className="text-[13px]  text-gray-900 mb-4 flex items-center gap-2">
                6. Attachments (Optional)
              </h3>
              <div className="border border-gray-200 bg-gray-50 rounded p-4 flex gap-4">

                {/* Drag Drop Area */}
                <div className="flex-1 min-w-[200px] relative border-2 border-dashed border-blue-200 bg-white rounded flex flex-col items-center justify-center p-4 text-center hover:bg-blue-50 cursor-pointer transition-colors">
                  <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-blue-500 mb-2">
                    <CloudUpload size={24} />
                  </div>
                  <div className="text-xs font-medium text-blue-700 mb-1">
                    Drag and drop files here <span className="text-gray-500 font-normal">or</span> click to browse
                  </div>
                  <div className="text-[10px] text-gray-400">Supports: PNG, JPG, PDF, DOC, DOCX (Max 20MB each)</div>
                </div>

              </div>
            </div>

            {/* Section 7: Linked Items */}
            <div>
              <h3 className="text-[13px]  text-gray-900 mb-4 flex items-center gap-2">
                7. Linked Items (Optional)
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-1/3 text-xs text-gray-500">Linked Requirement</div>
                  <div className="flex-1 relative">
                    <SearchableSelect
                      options={['REQ-1250 - User Authentication', 'REQ-1251 - Role Management', 'REQ-1252 - Dashboard Metrics']}
                      placeholder="Search requirements..."
                      value={formData.linkedRequirement || ''}
                      onChange={val => setFormData({ ...formData, linkedRequirement: val })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-1/3 text-xs text-gray-500">Linked Bug</div>
                  <div className="flex-1 relative">
                    <SearchableSelect
                      options={bugsList}
                      placeholder="Search bugs..."
                      value={formData.linkedBug || ''}
                      onChange={val => setFormData({ ...formData, linkedBug: val })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-1/3 text-xs text-gray-500">Linked Test Case</div>
                  <div className="flex-1 relative">
                    <SearchableSelect
                      options={testCasesList}
                      placeholder="Search test cases..."
                      value={formData.linkedTestCase || ''}
                      onChange={val => setFormData({ ...formData, linkedTestCase: val })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default NewTestCaseModal;

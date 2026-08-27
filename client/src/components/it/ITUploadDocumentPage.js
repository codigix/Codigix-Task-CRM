import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FileText, Folder, Check, LayoutGrid, File, FileImage,
  Archive, FileCode, CheckCircle, Search, Calendar, Bell, Mail,
  ChevronDown, X, Upload, Cloud
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


export default function ITUploadDocumentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { username, designation } = useParams();
  const location = useLocation();
  const isIT = location.pathname.includes('/it/');
  const deptPath = isIT ? 'it' : 'seo-gmb';
  const rolePath = designation || 'manager';

  const [form, setForm] = useState({
    title: '',
    project: '',
    category: '',
    folder: '',
    fileType: '',
    version: '1.0',
    description: '',
    tags: '',
    uploadSource: 'Local',
    linkedEmail: 'ashwini.khedekar@codigix.com',
    notifyMembers: '',
    accessPermission: 'Private',
    allowDownload: true,
    allowPrint: true,
    addToStarred: false,
    versionControl: true,
    setExpiryDate: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const setAccess = (val) => setForm(p => ({ ...p, accessPermission: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title,
        project: form.project,
        category: form.category,
        folder: form.folder,
        file_type: form.fileType,
        version: form.version,
        description: form.description,
        tags: form.tags.split(',').map(t => t.trim()),
        upload_source: form.uploadSource,
        linked_email: form.linkedEmail,
        notify_members: form.notifyMembers.split(',').map(m => m.trim()),
        access_permission: form.accessPermission,
        allow_download: form.allowDownload,
        allow_print: form.allowPrint,
        add_to_starred: form.addToStarred,
        version_control: form.versionControl,
        set_expiry_date: form.setExpiryDate,
        created_by: user?.name || username || 'Admin'
      };

      await axios.post(API_BASE_URL + '/it-documents', payload);
      navigate(`/${deptPath}/${rolePath}/${username || user?.username}/documents`);
    } catch (err) {
      console.error('Failed to upload document:', err);
      alert('Failed to upload document. See console for details.');
    }
  };

  return (
    <div className="p-4 bg-[#F8FAFC] min-h-screen font-sans">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-[22px] font-medium text-gray-900">Upload Document</h1>
        <div className="flex items-center gap-2 text-[12px] text-gray-500 mt-1">
          <span className="hover:text-indigo-600 cursor-pointer">Dashboard</span>
          <span className="text-gray-300">&gt;</span>
          <span className="hover:text-indigo-600 cursor-pointer" onClick={() => navigate(`/${deptPath}/${rolePath}/${username || user?.username}/documents`)}>Documents</span>
          <span className="text-gray-300">&gt;</span>
          <span className="text-indigo-600">Upload Document</span>
        </div>
      </div>

      <div className="flex items-start gap-6">
        {/* MAIN FORM */}
        <div className="flex-1 space-y-6">
          {/* Document Information Box */}
          <div className="bg-white rounded  border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[15px] font-semibold text-gray-900">Document Information</h2>
              <span className="text-xs text-blue-600 font-medium">* Required Fields</span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Document Title <span className="text-red-500">*</span></label>
                <input type="text" name="title" value={form.title} onChange={handleChange} placeholder="Enter document title" className="w-full text-[13px] p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" required />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Project <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select name="project" value={form.project} onChange={handleChange} className="w-full text-[13px] p-2 border border-gray-200 rounded-md appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" required>
                    <option value="">Select Project</option>
                    <option value="Hospital ERP System">Hospital ERP System</option>
                    <option value="Manufacturing ERP">Manufacturing ERP</option>
                    <option value="CRM Platform">CRM Platform</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Category <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select name="category" value={form.category} onChange={handleChange} className="w-full text-[13px] p-2 border border-gray-200 rounded-md appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" required>
                    <option value="">Select Category</option>
                    <option value="SRS">SRS</option>
                    <option value="BRD">BRD</option>
                    <option value="Design">Design</option>
                    <option value="Architecture">Architecture</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Folder</label>
                <div className="relative">
                  <select name="folder" value={form.folder} onChange={handleChange} className="w-full text-[13px] p-2 border border-gray-200 rounded-md appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
                    <option value="">Select Folder (Optional)</option>
                    <option value="01. Project Documents">01. Project Documents</option>
                    <option value="02. Technical Documents">02. Technical Documents</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">File Type <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select name="fileType" value={form.fileType} onChange={handleChange} className="w-full text-[13px] p-2 border border-gray-200 rounded-md appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" required>
                    <option value="">Select File Type</option>
                    <option value="PDF">PDF</option>
                    <option value="Excel">Excel</option>
                    <option value="Word">Word</option>
                    <option value="Image">Image</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Document Version</label>
                <input type="text" name="version" value={form.version} onChange={handleChange} placeholder="1.0" className="w-full text-[13px] p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>

              <div className="col-span-2">
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} placeholder="Enter document description (optional)" rows="3" className="w-full text-[13px] p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"></textarea>
                <div className="text-right text-xs text-gray-400 mt-1">0/500</div>
              </div>

              <div className="col-span-2">
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Tags</label>
                <input type="text" name="tags" value={form.tags} onChange={handleChange} placeholder="Add tags and press Enter" className="w-full text-[13px] p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <div className="text-sm text-gray-400 mt-1">Add relevant tags to easily find your document</div>
              </div>
            </div>

            {/* Upload File Section */}
            <div className="mt-6">
              <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Upload File <span className="text-red-500">*</span></label>
              <div className="border border-dashed border-gray-300 rounded p-10 flex flex-col items-center justify-center bg-gray-50/50">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                  <Cloud size={20} />
                </div>
                <div className="text-[13px] font-medium text-gray-900">Drag & drop your file here</div>
                <div className="text-[13px] text-gray-500 mt-1">or <span className="text-indigo-600 cursor-pointer hover:underline">Browse Files</span></div>
                <div className="text-sm text-gray-400 mt-4 text-center">
                  Supports: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, ZIP, RAR, CSV, JPG, PNG, GIF<br />
                  Max file size: 100 MB
                </div>
              </div>
            </div>

            {/* Or upload from */}
            <div className="mt-6">
              <div className="text-[12px] text-gray-500 mb-3">Or upload from</div>
              <div className="flex items-center gap-3">
                <button type="button" className="flex items-center justify-center gap-2 flex-1 py-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50 transition-colors">
                  <span className="w-3 h-3 bg-blue-500 rounded-sm"></span>
                  <span className="text-[12px] font-medium text-gray-700">Google Drive</span>
                </button>
                <button type="button" className="flex items-center justify-center gap-2 flex-1 py-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50 transition-colors">
                  <FileText size={14} className="text-blue-500" />
                  <span className="text-[12px] font-medium text-gray-700">Google Docs</span>
                </button>
                <button type="button" className="flex items-center justify-center gap-2 flex-1 py-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50 transition-colors">
                  <LayoutGrid size={14} className="text-green-500" />
                  <span className="text-[12px] font-medium text-gray-700">Google Sheets</span>
                </button>
                <button type="button" className="flex items-center justify-center gap-2 flex-1 py-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50 transition-colors">
                  <FileImage size={14} className="text-yellow-500" />
                  <span className="text-[12px] font-medium text-gray-700">Google Slides</span>
                </button>
                <button type="button" className="flex items-center justify-center gap-2 flex-1 py-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50 transition-colors">
                  <Cloud size={14} className="text-blue-600" />
                  <span className="text-[12px] font-medium text-gray-700">OneDrive</span>
                </button>
                <button type="button" className="flex items-center justify-center gap-2 flex-1 py-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50 transition-colors">
                  <Archive size={14} className="text-blue-500" />
                  <span className="text-[12px] font-medium text-gray-700">Dropbox</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-8">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Linked Email (Registered) <span className="text-red-500">*</span></label>
                <input type="email" name="linkedEmail" value={form.linkedEmail} onChange={handleChange} className="w-full text-[13px] p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <div className="text-sm text-gray-400 mt-1">Document will be linked to this registered email</div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Notify Team Members</label>
                <input type="text" name="notifyMembers" value={form.notifyMembers} onChange={handleChange} placeholder="Select team members to notify" className="w-full text-[13px] p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <div className="text-sm text-gray-400 mt-1">Selected members will receive email notification</div>
              </div>
            </div>

            {/* Access & Permissions */}
            <div className="mt-8">
              <h3 className="text-[14px] font-semibold text-gray-900 mb-3">Access & Permissions</h3>
              <div className="grid grid-cols-4 gap-4">
                <div onClick={() => setAccess('Private')} className={`border rounded p-4 cursor-pointer transition-colors ${form.accessPermission === 'Private' ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${form.accessPermission === 'Private' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                      {form.accessPermission === 'Private' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                    <span className={`text-[13px] font-medium ${form.accessPermission === 'Private' ? 'text-indigo-900' : 'text-gray-900'}`}>Private</span>
                  </div>
                  <div className="text-sm text-gray-500 ml-5.5 pl-1 leading-snug">Only you can access this document</div>
                </div>

                <div onClick={() => setAccess('Team')} className={`border rounded p-4 cursor-pointer transition-colors ${form.accessPermission === 'Team' ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${form.accessPermission === 'Team' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                      {form.accessPermission === 'Team' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                    <span className={`text-[13px] font-medium ${form.accessPermission === 'Team' ? 'text-indigo-900' : 'text-gray-900'}`}>Team</span>
                  </div>
                  <div className="text-sm text-gray-500 ml-5.5 pl-1 leading-snug">All project team members can access</div>
                </div>

                <div onClick={() => setAccess('Department')} className={`border rounded p-4 cursor-pointer transition-colors ${form.accessPermission === 'Department' ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${form.accessPermission === 'Department' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                      {form.accessPermission === 'Department' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                    <span className={`text-[13px] font-medium ${form.accessPermission === 'Department' ? 'text-indigo-900' : 'text-gray-900'}`}>Department</span>
                  </div>
                  <div className="text-sm text-gray-500 ml-5.5 pl-1 leading-snug">All IT department members can access</div>
                </div>

                <div onClick={() => setAccess('Public')} className={`border rounded p-4 cursor-pointer transition-colors ${form.accessPermission === 'Public' ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${form.accessPermission === 'Public' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                      {form.accessPermission === 'Public' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                    <span className={`text-[13px] font-medium ${form.accessPermission === 'Public' ? 'text-indigo-900' : 'text-gray-900'}`}>Public (Read Only)</span>
                  </div>
                  <div className="text-sm text-gray-500 ml-5.5 pl-1 leading-snug">Anyone with the link can view</div>
                </div>
              </div>
            </div>

            {/* Additional Settings */}
            <div className="mt-8 mb-4">
              <h3 className="text-[14px] font-semibold text-gray-900 mb-3">Additional Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="allowDownload" checked={form.allowDownload} onChange={handleChange} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    <span className="text-[13px] text-gray-700 font-medium">Allow Download</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="allowPrint" checked={form.allowPrint} onChange={handleChange} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    <span className="text-[13px] text-gray-700 font-medium">Allow Print</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="addToStarred" checked={form.addToStarred} onChange={handleChange} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    <span className="text-[13px] text-gray-700 font-medium">Add to Starred</span>
                  </label>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="versionControl" checked={form.versionControl} onChange={handleChange} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    <span className="text-[13px] text-gray-700 font-medium">Version Control</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="setExpiryDate" checked={form.setExpiryDate} onChange={handleChange} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    <span className="text-[13px] text-gray-700 font-medium">Set Expiry Date</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
              <button type="button" onClick={() => navigate(`/${deptPath}/${rolePath}/${username || user?.username}/documents`)} className="px-5 py-2.5 text-[13px] font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors">
                Cancel
              </button>
              <button type="button" className="px-5 py-2.5 text-[13px] font-medium text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 rounded transition-colors ">
                Save as Draft
              </button>
              <button type="button" onClick={handleSubmit} className="px-5 py-2.5 text-[13px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors ">
                Upload Document
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-[320px] shrink-0 space-y-6">
          {/* Supported File Types */}
          <div className="bg-white rounded  border border-gray-100 p-2">
            <h3 className="text-[14px] font-semibold text-gray-900 mb-4">Supported File Types</h3>
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
                <div>
                  <div className="text-[13px] font-medium text-gray-900">Documents</div>
                  <div className="text-sm text-gray-500">PDF, DOC, DOCX, TXT, RTF</div>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                  <LayoutGrid size={16} />
                </div>
                <div>
                  <div className="text-[13px] font-medium text-gray-900">Spreadsheets</div>
                  <div className="text-sm text-gray-500">XLS, XLSX, CSV, Google Sheets</div>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
                  <FileImage size={16} />
                </div>
                <div>
                  <div className="text-[13px] font-medium text-gray-900">Presentations</div>
                  <div className="text-sm text-gray-500">PPT, PPTX, Google Slides</div>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                  <FileImage size={16} />
                </div>
                <div>
                  <div className="text-[13px] font-medium text-gray-900">Images</div>
                  <div className="text-sm text-gray-500">JPG, PNG, GIF, BMP, SVG</div>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                  <Archive size={16} />
                </div>
                <div>
                  <div className="text-[13px] font-medium text-gray-900">Archives</div>
                  <div className="text-sm text-gray-500">ZIP, RAR, 7Z, TAR, GZ</div>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <FileCode size={16} />
                </div>
                <div>
                  <div className="text-[13px] font-medium text-gray-900">Others</div>
                  <div className="text-sm text-gray-500">JSON, XML, ZIP, etc.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Document Guidelines */}
          <div className="bg-white rounded  border border-gray-100 p-2">
            <h3 className="text-[14px] font-semibold text-gray-900 mb-4">Document Guidelines</h3>
            <ul className="space-y-3">
              {[
                'File size should not exceed 100 MB',
                'Use clear and descriptive file names',
                'Select appropriate category and tags',
                'Maintain version numbers for updates',
                'Set proper access permissions',
                'Notify relevant team members'
              ].map((g, i) => (
                <li key={i} className="flex gap-2 items-start text-[12px] text-gray-600 leading-snug">
                  <CheckCircle size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Email Linking Information */}
          <div className="bg-white rounded  border border-gray-100 p-2">
            <h3 className="text-[14px] font-semibold text-gray-900 mb-3">Email Linking Information</h3>
            <p className="text-[12px] text-gray-600 mb-3">This document will be linked to your registered email:</p>
            <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded mb-3">
              <span className="text-[12px] text-indigo-700 font-medium">ashwini.khedekar@codigix.com</span>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">Verified</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              All document activities and notifications will be sent to this email address.
            </p>
          </div>

          {/* Need Help? */}
          <div className="bg-white rounded  border border-gray-100 p-2">
            <h3 className="text-[14px] font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-[12px] text-gray-600 leading-relaxed mb-4">
              For any assistance with uploading documents, please contact your system administrator or check our documentation.
            </p>
            <button className="text-[12px] font-medium text-indigo-600 border border-indigo-200 bg-white hover:bg-indigo-50 p-2 rounded transition-colors ">
              View Documentation ↗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

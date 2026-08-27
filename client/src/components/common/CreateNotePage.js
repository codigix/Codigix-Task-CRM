import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';
import { showSuccessToast } from '../../utils/toast';
import {

  X, Bold, Italic, Underline, Strikethrough, Code, List, ListOrdered,
  Quote, Link as LinkIcon, Image, Type, Table, Undo, Redo, CloudUpload,
  Mail, Calendar, BookOpen, FileText, Check, Star, Heart
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CreateNotePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Try to determine department from URL
  const pathParts = location.pathname.split('/');
  const isIT = pathParts.includes('it');
  const dept = isIT ? 'it' : 'seo-gmb';
  const username = user?.username || 'ashwini';

  const [formData, setFormData] = useState({
    title: '',
    type: 'Wiki Page',
    category: '',
    subCategory: '',
    tags: '',
    visibility: 'Team (All members can view)',
    summary: '',
    content: '',
    isImportant: false,
    allowComments: true,
    allowVersionHistory: true,
    addToFavorites: false,
    expiryDate: '',
    teamAccess: 'All Team Members'
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePublish = async () => {
    try {
      if (!formData.title) {
        showSuccessToast('Title is required');
        return;
      }

      // We stringify the extra UI info into description since the backend only accepts basic fields currently
      const enrichedDescription = JSON.stringify({
        content: formData.content,
        summary: formData.summary,
        type: formData.type,
        category: formData.category,
        tags: formData.tags,
        visibility: formData.visibility,
        teamAccess: formData.teamAccess
      });

      await axios.post(API_BASE_URL + '/notes', {
        title: formData.title,
        description: enrichedDescription,
        is_important: formData.isImportant ? 1 : 0,
        created_by: user?.name || user?.username || 'Admin'
      });

      showSuccessToast('Note / Wiki Page published successfully!');
      navigate(`/${dept}/manager/${username}/notes`);
    } catch (err) {
      console.error('Failed to create note', err);
      showSuccessToast('Failed to create note!');
    }
  };

  const ToggleSwitch = ({ checked, onChange }) => (
    <div
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}
    >
      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded flex items-center justify-center text-indigo-600">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 leading-tight">Create New Note / Wiki Page</h1>
            <p className="text-xs text-gray-500">Create, organize and share knowledge with your team.</p>
          </div>
        </div>
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">

          {/* Left Column */}
          <div className="flex-1 space-y-6">

            {/* 1. Basic Information */}
            <div className="bg-white rounded  border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-5">1. Basic Information</h2>

              <div className="grid grid-cols-2 gap-2 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.title} onChange={e => handleInputChange('title', e.target.value)} placeholder="Enter note or wiki page title" className="w-full border border-gray-200 rounded p-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type <span className="text-red-500">*</span></label>
                  <div className="flex bg-gray-50 p-1 rounded border border-gray-200">
                    <button onClick={() => handleInputChange('type', 'Note')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${formData.type === 'Note' ? 'bg-white  text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                      <FileText size={14} /> Note
                    </button>
                    <button onClick={() => handleInputChange('type', 'Wiki Page')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${formData.type === 'Wiki Page' ? 'bg-indigo-50  text-indigo-600 border border-indigo-100' : 'text-gray-500 hover:text-gray-700'}`}>
                      <BookOpen size={14} /> Wiki Page
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category <span className="text-red-500">*</span></label>
                  <select value={formData.category} onChange={e => handleInputChange('category', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm text-gray-600 focus:outline-none focus:border-indigo-500 transition-all bg-white appearance-none">
                    <option value="">Select Category</option>
                    <option value="IT">IT Policies</option>
                    <option value="Dev">Development</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Sub Category</label>
                  <select value={formData.subCategory} onChange={e => handleInputChange('subCategory', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm text-gray-600 focus:outline-none focus:border-indigo-500 transition-all bg-white appearance-none">
                    <option value="">Select Sub Category (Optional)</option>
                    <option value="Servers">Servers</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
                  <input type="text" value={formData.tags} onChange={e => handleInputChange('tags', e.target.value)} placeholder="Add tags and press Enter" className="w-full border border-gray-200 rounded p-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                  <p className="text-xs text-gray-400 mt-1">Add relevant tags to easily find your content</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Visibility <span className="text-red-500">*</span></label>
                  <select value={formData.visibility} onChange={e => handleInputChange('visibility', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm text-gray-600 focus:outline-none focus:border-indigo-500 transition-all bg-white appearance-none">
                    <option value="Team (All members can view)">Team (All members can view)</option>
                    <option value="Private">Private</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Set who can view this content</p>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Summary / Description</label>
                <div className="relative">
                  <textarea value={formData.summary} onChange={e => handleInputChange('summary', e.target.value)} placeholder="Enter a short summary about this page (optional)" className="w-full border border-gray-200 rounded p-2 text-sm h-20 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"></textarea>
                  <div className="absolute bottom-2 right-2 text-xs text-gray-400">{formData.summary.length}/300</div>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Content <span className="text-red-500">*</span></label>
                <div className="border border-gray-200 rounded overflow-hidden flex flex-col">
                  <div className="bg-gray-50 border-b border-gray-200 p-2 flex items-center gap-1 flex-wrap">
                    <select className="bg-transparent text-xs text-gray-600 font-medium outline-none border-r border-gray-200 pr-2 py-1 mr-2"><option>Paragraph</option></select>
                    {[Bold, Italic, Underline, Strikethrough, Code, List, ListOrdered, Quote, LinkIcon, Image, Type, Table, Undo, Redo].map((Icon, i) => (
                      <button key={i} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded transition-colors"><Icon size={14} /></button>
                    ))}
                  </div>
                  <textarea value={formData.content} onChange={e => handleInputChange('content', e.target.value)} placeholder="Write your content here..." className="w-full p-4 text-sm h-40 resize-none focus:outline-none"></textarea>
                  <div className="bg-gray-50 border-t border-gray-200 px-3 py-1 text-right text-xs text-gray-400">
                    {formData.content.split(' ').filter(c => c !== '').length} WORDS
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Attachments</label>
                <div className="border-2 border-dashed border-gray-200 rounded p-8 flex flex-col items-center justify-center text-center bg-gray-50/50 hover:bg-indigo-50/30 transition-colors cursor-pointer">
                  <CloudUpload size={28} className="text-indigo-500 mb-3" />
                  <p className="text-sm text-gray-600 mb-1">Drag & drop files here or <span className="text-indigo-600 font-medium">click to browse</span></p>
                  <p className="text-xs text-gray-400">Supports: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, ZIP, RAR, PNG, JPG, GIF (Max. 50 MB per file)</p>
                  <p className="text-xs text-gray-400 mt-1">You can upload up to 10 files</p>
                </div>
              </div>
            </div>

            {/* 2. Link to Registered Email */}
            <div className="bg-white rounded  border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">2. Link to Registered Email</h2>

              <div className="bg-indigo-50/50 border border-indigo-100 rounded p-3 flex items-start gap-2 text-indigo-700 text-xs mb-4">
                <Mail size={16} className="mt-0.5 shrink-0" />
                <p>This note / wiki page will be linked to your registered email address.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Registered Email</label>
                <div className="relative">
                  <input type="text" readOnly value={user?.email || 'michael.brown@codigix.com'} className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-sm text-gray-700 focus:outline-none" />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                    <Check size={12} /> Verified
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">All notifications and activities will be sent to this email address</p>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="w-full lg:w-[320px] space-y-6">

            {/* 3. Additional Settings */}
            <div className="bg-white rounded  border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-5">3. Additional Settings</h2>

              <div className="space-y-5">
                {[
                  { id: 'isImportant', title: 'Mark as Important', desc: 'Important pages will be highlighted', icon: Star, color: 'text-amber-500' },
                  { id: 'allowComments', title: 'Allow Comments', desc: 'Allow team members to comment', icon: Type, color: 'text-blue-500' },
                  { id: 'allowVersionHistory', title: 'Allow Version History', desc: 'Track changes and version history', icon: Undo, color: 'text-gray-500' },
                  { id: 'addToFavorites', title: 'Add to Favorites', desc: 'Add this page to your favorites', icon: Heart, color: 'text-gray-500' },
                ].map(setting => (
                  <div key={setting.id} className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <setting.icon size={16} className={`mt-0.5 ${setting.color}`} />
                      <div>
                        <div className="text-xs font-medium text-gray-900 mb-0.5">{setting.title}</div>
                        <div className="text-xs text-gray-500">{setting.desc}</div>
                      </div>
                    </div>
                    <ToggleSwitch checked={formData[setting.id]} onChange={(val) => handleInputChange(setting.id, val)} />
                  </div>
                ))}

                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Date <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={formData.expiryDate} onChange={e => handleInputChange('expiryDate', e.target.value)} placeholder="Select date (if applicable)" className="w-full border border-gray-200 rounded pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-all" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Set expiry date for this content</p>
                </div>
              </div>
            </div>

            {/* 4. Team Access */}
            <div className="bg-white rounded  border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">4. Team Access</h2>
              <p className="text-xs text-gray-500 mb-4">Select team members or roles who can access this content</p>

              <div className="space-y-4">
                {[
                  { id: 'All Team Members', desc: 'All members in the team can view' },
                  { id: 'Specific Roles', desc: 'Select specific roles' },
                  { id: 'Specific Members', desc: 'Select specific team members' },
                  { id: 'Custom', desc: 'Choose custom access permissions' },
                ].map(opt => (
                  <div key={opt.id} onClick={() => handleInputChange('teamAccess', opt.id)} className="flex items-start gap-3 cursor-pointer group">
                    <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${formData.teamAccess === opt.id ? 'border-indigo-600' : 'border-gray-300 group-hover:border-indigo-400'}`}>
                      {formData.teamAccess === opt.id && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                    </div>
                    <div>
                      <div className={`text-xs font-medium mb-0.5 ${formData.teamAccess === opt.id ? 'text-gray-900' : 'text-gray-700'}`}>{opt.id}</div>
                      <div className="text-xs text-gray-500">{opt.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Preview */}
            <div className="bg-white rounded  border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">5. Preview</h2>

              <div className="bg-indigo-50/50 border border-indigo-100 rounded p-4 flex items-start gap-3 text-indigo-600">
                <BookOpen size={18} className="shrink-0" />
                <div>
                  <div className="text-xs font-semibold mb-1">Wiki Page Preview</div>
                  <div className="text-xs text-gray-500">Your content will appear like this to team members.</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2 pb-8">
              <button onClick={() => navigate(-1)} className="flex-1 p-2 bg-white border border-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors">Cancel</button>
              <button className="flex-1 p-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded text-xs font-medium hover:bg-indigo-100 transition-colors">Save as Draft</button>
              <button onClick={handlePublish} className="flex-1 p-2 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 transition-colors">Publish</button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateNotePage;

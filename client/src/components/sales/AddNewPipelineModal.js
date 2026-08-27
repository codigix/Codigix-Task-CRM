import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { pipelineAPI } from '../../services/api';

const AddNewPipelineModal = ({ isOpen, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    stages: ['Inpipeline', 'Follow Up', 'Schedule Service'],
    access_type: 'All',
    user_ids: [],
  });

  const [editingStageIndex, setEditingStageIndex] = useState(null);
  const [editingStageValue, setEditingStageValue] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [showAddStage, setShowAddStage] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddStage = (e) => {
    e.preventDefault();
    if (newStageName.trim()) {
      setFormData(prev => ({
        ...prev,
        stages: [...prev.stages, newStageName.trim()]
      }));
      setNewStageName('');
      setShowAddStage(false);
    }
  };

  const handleEditStage = (index) => {
    setEditingStageIndex(index);
    setEditingStageValue(formData.stages[index]);
  };

  const handleSaveStage = (index) => {
    if (editingStageValue.trim()) {
      const newStages = [...formData.stages];
      newStages[index] = editingStageValue.trim();
      setFormData(prev => ({
        ...prev,
        stages: newStages
      }));
      setEditingStageIndex(null);
      setEditingStageValue('');
    }
  };

  const handleDeleteStage = (index) => {
    setFormData(prev => ({
      ...prev,
      stages: prev.stages.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Pipeline name is required');
      return;
    }

    if (formData.stages.length === 0) {
      setError('At least one stage is required');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        stages: formData.stages,
        access_type: formData.access_type,
        user_ids: formData.user_ids,
        status: 'Active'
      };

      await pipelineAPI.create(payload);

      if (onSuccess) {
        onSuccess();
      }
      handleCancel();
    } catch (err) {
      setError(err.message || 'Failed to create pipeline');
      console.error('Form submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      description: '',
      stages: ['Inpipeline', 'Follow Up', 'Schedule Service'],
      access_type: 'All',
      user_ids: [],
    });
    setError('');
    setEditingStageIndex(null);
    setNewStageName('');
    setShowAddStage(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={handleCancel}>
      <div
        className="h-full w-full md:w-[72%] lg:w-[60%] xl:w-[55%] bg-white shadow-xl overflow-y-auto border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-centerp-3  border-b border-[#EAECF0] sticky top-0 bg-white">
          <h2 className="text-md  text-gray-900">Add New Pipeline</h2>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Pipeline Name */}
          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Pipeline Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter pipeline name"
              className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
            />
          </div>

          {/* Pipeline Description */}
          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter pipeline description"
              rows="3"
              className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition resize-none"
            />
          </div>

          {/* Pipeline Stages */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <label className="text-xs   text-gray-900">
                Pipeline Stages
              </label>
              <button
                type="button"
                onClick={() => setShowAddStage(true)}
                className="text-red  hover:text-red-700 text-xs    flex items-center gap-1"
              >
                <Plus size={16} /> Add New
              </button>
            </div>

            {/* Add Stage Form */}
            {showAddStage && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded ">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="Enter stage name"
                    className="flex-1 p-2 border border-gray-300 rounded text-xs  focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddStage}
                    className="p-2 bg-red-600 text-white rounded text-xs    hover:bg-red-700 transition"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddStage(false);
                      setNewStageName('');
                    }}
                    className="p-2 bg-gray-200 text-gray-700 rounded text-xs    hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Stages List */}
            <div className="space-y-2 border-l-4 border-yellow-500 pl-4">
              {formData.stages.map((stage, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded  border border-gray-200 hover:bg-gray-100 transition"
                >
                  <div className="flex-1">
                    {editingStageIndex === index ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingStageValue}
                          onChange={(e) => setEditingStageValue(e.target.value)}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded text-xs  focus:outline-none focus:border-red-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveStage(index)}
                          className="p-1  bg-red-600 text-white rounded text-xs   hover:bg-red-700"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-yellow-500 rounded"></div>
                        <span className="text-xs    text-gray-900">{stage}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {editingStageIndex !== index && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEditStage(index)}
                          className="p-2 text-[#1F2020] hover:text-white  hover:bg-white rounded transition"
                          title="Edit stage"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStage(index)}
                          className="p-2 text-[#1F2020] hover:text-red  hover:bg-white rounded transition"
                          title="Delete stage"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Access Section */}
          <div className="border-t border-gray-200 pt-6">
            <label className="text-xs   text-gray-900 block mb-4">
              Access
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="access-all"
                    name="access_type"
                    value="All"
                    checked={formData.access_type === 'All'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-red  border-gray-300 focus:ring-red-500"
                  />
                </div>
                <label htmlFor="access-all" className="text-xs  text-gray-700   cursor-pointer">
                  All
                </label>
              </div>
              <button
                type="button"
                className="text-xs  text-gray-700   p-2  rounded border border-gray-300 hover:bg-gray-50 transition"
              >
                Select Person
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="p-2  text-gray-700   border border-gray-300 rounded  hover:bg-gray-50 transition disabled:opacity-50 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="p-2  bg-red-600 text-white   rounded  hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2 text-xs"
            >
              {isLoading ? 'Creating...' : 'Create New'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNewPipelineModal;

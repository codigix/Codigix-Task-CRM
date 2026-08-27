import React from 'react';
import { Sparkles, X } from 'lucide-react';
import Swal from 'sweetalert2';

const ITSubtaskAiModal = ({
  showSubtaskAiModal,
  setShowSubtaskAiModal,
  subtaskAiDetails,
  selectedSubtaskForAi,
  subtasks,
  setSubtasks,
  handleUpdate,
  logAiAction
}) => {
  if (!showSubtaskAiModal || !subtaskAiDetails || !selectedSubtaskForAi) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] animate-fade-in p-4 font-sans">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-600 fill-purple-100 animate-pulse" />
            <h3 className="text-gray-900 text-sm font-semibold">
              Subtask Specifications: {selectedSubtaskForAi.subtask.title}
            </h3>
          </div>
          <button onClick={() => setShowSubtaskAiModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded border border-gray-100">
            <div>
              <span className="font-semibold text-gray-500 block">Recommended Assignee:</span>
              <span className="text-gray-800 font-medium">{selectedSubtaskForAi.subtask.assignee || 'Olivia Taylor'}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500 block">Sprint & Priority:</span>
              <span className="text-gray-800 font-medium">{subtaskAiDetails.sprint || 'Sprint 1'} - {subtaskAiDetails.priority || 'Medium'} ({subtaskAiDetails.story_points || 3} SP)</span>
            </div>
          </div>

          <div>
            <span className="font-semibold text-indigo-700 block mb-1">Acceptance Criteria</span>
            <div className="bg-white border border-gray-200 rounded p-2.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: subtaskAiDetails.acceptance_criteria }} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-semibold text-gray-700 block mb-1">Developer Checklist</span>
              <ul className="list-disc pl-4 space-y-1 bg-white border border-gray-200 rounded p-2.5 leading-relaxed">
                {subtaskAiDetails.developer_checklist?.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            </div>
            <div>
              <span className="font-semibold text-gray-700 block mb-1">Testing Checklist</span>
              <ul className="list-disc pl-4 space-y-1 bg-white border border-gray-200 rounded p-2.5 leading-relaxed">
                {subtaskAiDetails.testing_checklist?.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            </div>
          </div>

          <div>
            <span className="font-semibold text-red-600 block mb-1">Risk Analysis & Dependency Mapping</span>
            <div className="bg-red-50/30 border border-red-100 rounded p-2.5 space-y-1 leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: subtaskAiDetails.risk_analysis }} />
              <p className="mt-1"><strong>Dependencies:</strong> {subtaskAiDetails.dependency_mapping}</p>
            </div>
          </div>

          <div>
            <span className="font-semibold text-gray-700 block mb-1">Implementation Notes</span>
            <div className="bg-white border border-gray-200 rounded p-2.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: subtaskAiDetails.implementation_notes }} />
          </div>
        </div>

        <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 text-xs">
          <button
            onClick={() => setShowSubtaskAiModal(false)}
            className="px-3.5 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded font-semibold transition cursor-pointer"
          >
            Reject / Close
          </button>
          <button
            onClick={() => {
              const copy = [...subtasks];
              const targetIdx = selectedSubtaskForAi.index;
              copy[targetIdx] = {
                ...copy[targetIdx],
                title: `${copy[targetIdx].title} (SP: ${subtaskAiDetails.story_points})`,
                aiSpecs: subtaskAiDetails
              };
              setSubtasks(copy);
              handleUpdate({ subtasks: copy });
              setShowSubtaskAiModal(false);

              logAiAction(`Approved AI subtask specs for "${selectedSubtaskForAi.subtask.title}".`);

              Swal.fire({
                icon: 'success',
                title: 'Specifications Saved',
                text: 'Subtask specs updated successfully!',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
              });
            }}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition cursor-pointer"
          >
            Accept Specifications
          </button>
        </div>
      </div>
    </div>
  );
};

export default ITSubtaskAiModal;

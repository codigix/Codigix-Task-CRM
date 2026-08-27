import React from 'react';
import { Trash2 } from 'lucide-react';

const DeleteConfirmationModal = ({ isOpen, onConfirm, onCancel, userName, isDeleting, count }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded  shadow-xl max-w-md w-full mx-4 p-3 ">
        <div className="flex justify-center mb-4">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
            <Trash2 size={32} className="text-red " />
          </div>
        </div>

        <h2 className="text-xl  text-gray-900 text-center mb-2">
          Delete Confirmation
        </h2>

        <p className="text-sm text-gray-600 text-center mb-6 px-4">
          {count > 1 ? (
            <>Are you sure you want to remove <span className="  text-gray-900">{count}</span> users you selected?</>
          ) : (
            <>Are you sure you want to remove user <span className="  text-gray-900">"{userName}"</span> you selected?</>
          )}
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-2  text-gray-700   border border-gray-300 rounded  hover:bg-gray-50 transition disabled:opacity-50 text-xs"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="p-2  bg-red-600 text-white   rounded  hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2 text-xs"
          >
            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;

import React, { useState, useEffect } from 'react';
import { X, Plus, Edit3, Trash2, Eye } from 'lucide-react';

export default function CrudTable({
  title,
  columns,
  data,
  onAdd,
  onEdit,
  onDelete,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
  const [editItem, setEditItem] = useState(null);
  const [formState, setFormState] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isModalOpen) {
      setFormState({});
      setEditItem(null);
    }
  }, [isModalOpen]);

  const openAdd = () => {
    const empty = {};
    columns.forEach(col => { empty[col.accessor] = ''; });
    setFormState(empty);
    setModalMode('add');
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setFormState({ ...item });
    setEditItem(item);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openView = (item) => {
    setFormState({ ...item });
    setEditItem(item);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (modalMode === 'add') {
      onAdd(formState);
    } else if (modalMode === 'edit') {
      onEdit(editItem.id, formState);
    }
    setIsModalOpen(false);
  };

  const confirmDelete = (id) => {
    setDeleteConfirm(id);
  };

  const executeDelete = () => {
    if (deleteConfirm !== null) {
      onDelete(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 ">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm  text-slate-900 m-0">{title}</h3>
          <p className="text-xs text-slate-400 m-0 mt-1">Manage {title.toLowerCase()} entries — add, edit, view, or remove records.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white border-none rounded p-2 text-xs  cursor-pointer transition-colors"
        >
          <Plus size={14} /> Add New
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs text-slate-700">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-400  text-left ">
              <th className="py-2.5 px-3 w-10">#</th>
              {columns.map(col => (
                <th key={col.accessor} className="py-2.5 px-3">{col.header}</th>
              ))}
              <th className="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="py-8 px-3 text-center text-slate-400 text-xs">
                  No records found. Click "Add New" to create one.
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-3 text-slate-400 font-medium">{idx + 1}</td>
                  {columns.map(col => (
                    <td key={col.accessor} className="py-2.5 px-3 font-medium text-slate-700">
                      {String(row[col.accessor] || '—')}
                    </td>
                  ))}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openView(row)}
                        title="View"
                        className="w-7 h-7 rounded bg-blue-50 hover:bg-blue-100 border border-blue-100 flex items-center justify-center text-blue-600 cursor-pointer transition-colors"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={() => openEdit(row)}
                        title="Edit"
                        className="w-7 h-7 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 flex items-center justify-center text-emerald-600 cursor-pointer transition-colors"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => confirmDelete(row.id)}
                        title="Delete"
                        className="w-7 h-7 rounded bg-rose-50 hover:bg-rose-100 border border-rose-100 flex items-center justify-center text-rose-600 cursor-pointer transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 ">
        <span>Showing {data.length} record{data.length !== 1 ? 's' : ''}</span>
        <span>Total: {data.length}</span>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={20} className="text-rose-500" />
              </div>
              <h4 className="text-sm  text-slate-900 m-0 mb-1">Delete Record?</h4>
              <p className="text-xs text-slate-400 m-0 mb-4">This action cannot be undone. Are you sure you want to permanently delete this item?</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="p-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs  border-none cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  className="p-2 rounded bg-rose-500 hover:bg-rose-600 text-white text-xs  border-none cursor-pointer transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit / View Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm  text-slate-900 m-0">
                {modalMode === 'add' ? `Add New ${title}` : modalMode === 'edit' ? `Edit ${title}` : `View ${title}`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 border-none flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            {modalMode === 'view' ? (
              <div className="space-y-3">
                {columns.map(col => (
                  <div key={col.accessor} className="bg-slate-50 rounded p-3">
                    <label className="block text-xs  text-slate-400  mb-1">{col.header}</label>
                    <p className="text-sm text-slate-900 font-medium m-0">{formState[col.accessor] || '—'}</p>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs  border-none cursor-pointer transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                {columns.map(col => (
                  <div key={col.accessor}>
                    <label className="block text-xs  text-slate-400  mb-1">{col.header}</label>
                    <input
                      type="text"
                      name={col.accessor}
                      value={formState[col.accessor] || ''}
                      onChange={handleChange}
                      className="w-full rounded border border-slate-200 p-2.5 text-xs text-slate-800 font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                      placeholder={`Enter ${col.header.toLowerCase()}...`}
                      required
                    />
                  </div>
                ))}
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs  border-none cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="p-2 rounded bg-blue-500 hover:bg-blue-600 text-white text-xs  border-none cursor-pointer transition-colors"
                  >
                    {modalMode === 'add' ? 'Create' : 'Update'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { X } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DeleteRequestModal = ({ isOpen, onClose, userId, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError('Please enter a reason for account deletion');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/delete-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          reason: reason.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit delete request');
      }

      setReason('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded  shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-betweenp-3  border-b border-gray-200">
          <h2 className="text-md  text-gray-900">Request Account Deletion</h2>
          <button
            onClick={onClose}
            className="text-[#1F2020] hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded  text-xs ">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Reason for Deletion
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please tell us why you want to delete your account..."
              rows={4}
              disabled={loading}
              className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed text-xs "
            />
            <p className="text-xs text-gray-500 mt-2">
              {reason.length}/500 characters
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded ">
            <p className="text-xs text-yellow-800">
              <strong>Warning:</strong> Once your account is deleted, all your data will be permanently removed. This action cannot be undone.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 p-2  text-xs    text-gray-700 bg-gray-100 hover:bg-gray-200 rounded  transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="flex-1 p-2  text-xs    text-white bg-red-600 hover:bg-red-700 rounded  transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteRequestModal;

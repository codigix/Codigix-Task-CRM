import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, User, FileText, Download } from 'lucide-react';

const ProposalVersionHistory = ({ proposal, versions = [] }) => {
  const [expandedVersion, setExpandedVersion] = useState(null);

  const mockVersions = [
    {
      id: 1,
      version: proposal.version || 1,
      status: proposal.status,
      created_at: proposal.created_at,
      created_by: proposal.created_by || 1,
      changes: 'Initial proposal created',
      total_amount: proposal.total_amount
    },
    ...(versions || [])
  ];

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'bg-blue-100 text-blue-700',
      'Submitted': 'bg-purple-100 text-purple-700',
      'Approved': 'bg-emerald-100 text-emerald-700',
      'Sent': 'bg-indigo-100 text-indigo-700',
      'Accepted': 'bg-green-100 text-green-700',
      'Declined': 'bg-red-100 text-red-700',
      'Rejected': 'bg-orange-100 text-orange-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded  border border-gray-200p-3 ">
      <h3 className="text-md  text-gray-900 mb-6">Version History & Changes</h3>

      {mockVersions.length === 0 ? (
        <div className="text-center py-8">
          <FileText size={40} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">No version history yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mockVersions.map((version) => (
            <div
              key={version.id}
              className="border border-gray-200 rounded  overflow-hidden hover:shadow-md transition-shadow"
            >
              <button
                onClick={() =>
                  setExpandedVersion(expandedVersion === version.id ? null : version.id)
                }
                className="w-full flex items-center justify-between p-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="text-center">
                    <div className="text-xs   text-gray-900">v{version.version}</div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs   p-1  rounded-full ${getStatusColor(version.status)}`}>
                        {version.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(version.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs  text-gray-600">{version.changes}</p>
                  </div>

                  <div className="text-right hidden sm:block">
                    <div className="text-xs   text-gray-900">
                      {version.total_amount ? `${proposal.currency} ${version.total_amount}` : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex-shrink-0">
                  {expandedVersion === version.id ? (
                    <ChevronUp size={20} className="text-[#1F2020]" />
                  ) : (
                    <ChevronDown size={20} className="text-[#1F2020]" />
                  )}
                </div>
              </button>

              {expandedVersion === version.id && (
                <div className="border-t bg-gray-50 p-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar size={16} className="text-gray-500" />
                        <span className="text-xs text-gray-600">Date</span>
                      </div>
                      <p className="text-xs   ">
                        {new Date(version.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <User size={16} className="text-gray-500" />
                        <span className="text-xs text-gray-600">Created By</span>
                      </div>
                      <p className="text-xs   ">User ID: {version.created_by}</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={16} className="text-gray-500" />
                        <span className="text-xs text-gray-600">Status</span>
                      </div>
                      <p className="text-xs   ">{version.status}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h5 className="text-xs   text-gray-900 mb-2">Details</h5>
                    <div className="space-y-2 text-xs ">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className=" ">
                          {version.total_amount ? `${proposal.currency} ${version.total_amount}` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Changes:</span>
                        <span className=" ">{version.changes}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <button className="flex items-center justify-center gap-2 p-2 bg-red-600  text-white text-xs  rounded hover:bg-blue-700 transition-colors flex-1">
                      <Download size={14} />
                      Download PDF
                    </button>
                    <button className="flex items-center justify-center gap-2 p-2 border border-gray-300 text-gray-700 text-xs  rounded hover:bg-gray-100 transition-colors flex-1">
                      View Details
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
        <p>
          <strong>Version Control:</strong> Each change creates a new version. You can review previous versions,
          compare changes, and restore earlier versions if needed.
        </p>
      </div>
    </div>
  );
};

export default ProposalVersionHistory;

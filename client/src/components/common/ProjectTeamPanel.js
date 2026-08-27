import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { projectTeamAPI, contactsAPI } from '../../services/api';

const ProjectTeamPanel = ({ projectId }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('Member');

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamRes, usersRes] = await Promise.all([
        projectTeamAPI.getMembers(projectId),
        contactsAPI.getAll()
      ]);
      setTeamMembers(teamRes);
      setAvailableUsers(usersRes);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await projectTeamAPI.addMember(projectId, {
        user_id: parseInt(selectedUser),
        role: selectedRole,
        added_by: 1
      });
      setSelectedUser('');
      setSelectedRole('Member');
      setShowAddForm(false);
      fetchData();
    } catch (err) {
      console.error('Error adding team member:', err);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await projectTeamAPI.removeMember(projectId, userId);
      fetchData();
    } catch (err) {
      console.error('Error removing team member:', err);
    }
  };

  if (loading) return <div className="text-center py-6 text-gray-600">Loading team...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-gray-600" />
          <h3 className="text-md  text-gray-900">Project Team</h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 p-2 bg-red-50 text-red  rounded  hover:bg-red-100 transition text-xs   "
        >
          <Plus size={16} /> Add Member
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddMember} className="bg-gray-50 border border-gray-200 rounded  p-2 space-y-3 mb-4">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
          >
            <option value="">Select a user...</option>
            {availableUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name}
              </option>
            ))}
          </select>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
          >
            <option value="Member">Member</option>
            <option value="Contributor">Contributor</option>
            <option value="Lead">Lead</option>
            <option value="Manager">Manager</option>
          </select>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-2 text-xs    text-gray-700 border border-gray-300 rounded  hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedUser}
              className="p-2 text-xs    text-white bg-red-600 rounded  hover:bg-red-700 disabled:opacity-50"
            >
              Add Member
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {teamMembers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs ">No team members yet. Add one to get started!</div>
        ) : (
          teamMembers.map(member => (
            <div key={member.user_id} className="border border-gray-200 rounded  p-2 flex items-center justify-between hover: transition bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center  text-xs  flex-shrink-0">
                  {member.first_name?.[0]}{member.last_name?.[0]}
                </div>
                <div>
                  <p className="  text-xs  text-gray-900">
                    {member.first_name} {member.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-block p-1  bg-blue-50 text-blue-700 rounded text-xs  ">
                  {member.role}
                </span>
                <button
                  onClick={() => handleRemoveMember(member.user_id)}
                  className="p-2 text-red  hover:bg-red-50 rounded transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectTeamPanel;

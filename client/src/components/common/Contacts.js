import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Phone, MapPin, Plus, MessageCircle, Users, ChevronDown, X, Search, LayoutGrid, List, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddContactModal from './AddContactModal';
import ContactActionDropdown from './ContactActionDropdown';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { projectTeamAPI, usersAPI, teamsAPI } from '../../services/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProjectTeamModal = ({ isOpen, onClose, projectId, currentTeam, users, teams, onAssign, onAssignTeam }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  const [role, setRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignType, setAssignType] = useState('user'); // 'user' or 'team'

  useEffect(() => {
    const fetchMembers = async () => {
      if (selectedTeam) {
        try {
          const data = await teamsAPI.getMembers(selectedTeam);
          setSelectedTeamMembers(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error('Error fetching team members:', error);
          setSelectedTeamMembers([]);
        }
      } else {
        setSelectedTeamMembers([]);
      }
    };
    fetchMembers();
  }, [selectedTeam]);

  if (!isOpen) return null;

  const handleAssign = async () => {
    if (assignType === 'user' && !selectedUser) return;
    if (assignType === 'team' && !selectedTeam) return;

    setIsSubmitting(true);
    try {
      if (assignType === 'user') {
        await onAssign(projectId, { user_id: selectedUser, role });
        setSelectedUser('');
        setRole('');
      } else {
        await onAssignTeam(projectId, selectedTeam);
        setSelectedTeam('');
        setSelectedTeamMembers([]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] animate-in fade-in duration-200">
      <div className="bg-white rounded shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg  text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Assign Project Team
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex p-1 bg-gray-100 rounded">
            <button
              onClick={() => setAssignType('user')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${assignType === 'user' ? 'bg-white  text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Single Member
            </button>
            <button
              onClick={() => setAssignType('team')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${assignType === 'team' ? 'bg-white  text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Whole Team
            </button>
          </div>

          {assignType === 'user' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Team Member</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full border border-gray-200 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="">Select User</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.first_name} {user.last_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role (Optional)</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Lead Developer, Designer"
                  className="w-full border border-gray-200 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full border border-gray-200 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">Select Team</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name || `Team #${team.id}`}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-gray-500">All members of this team will be assigned to the project.</p>

              {selectedTeamMembers.length > 0 && (
                <div className="mt-3 bg-blue-50/50 rounded p-3 border border-blue-100">
                  <h4 className="text-xs  text-blue-800 mb-2  tracking-wider">Team Members to be Added:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTeamMembers.map(member => (
                      <div key={member.id} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-blue-100 ">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700  text-[8px]">
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </div>
                        <span className="text-xs font-medium text-gray-700">{member.first_name} {member.last_name}</span>
                        <span className="text-[9px] text-gray-400">({member.role || 'Member'})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleAssign}
              disabled={(assignType === 'user' ? !selectedUser : !selectedTeam) || isSubmitting}
              className="w-full bg-blue-600 text-white rounded p-2.5 text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-all "
            >
              {isSubmitting ? 'Assigning...' : assignType === 'user' ? 'Assign Member' : 'Assign Team'}
            </button>
          </div>

          {currentTeam && currentTeam.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h4 className="text-sm  text-gray-900 mb-3 flex items-center gap-2">
                Current Team Members ({currentTeam.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {currentTeam.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded bg-gray-50 group hover:bg-gray-100 transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-xs border border-blue-200 ">
                        {member.first_name?.[0]}{member.last_name?.[0]}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-900">{member.first_name} {member.last_name}</div>
                        <div className="text-xs text-gray-500">{member.role || 'Team Member'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Contacts = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [viewMode, setViewMode] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [expandedFilters, setExpandedFilters] = useState({});
  const [projectTeams, setProjectTeams] = useState({});
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [filters, setFilters] = useState({
    name: '',
    tags: [],
    owner: '',
    location: [],
    rating: [],
    status: []
  });
  const [filterOptions, setFilterOptions] = useState({
    tags: [],
    owners: [],
    locations: [],
    ratings: [],
    statuses: []
  });

  const applyFilters = useCallback((contactsList, filterObj, searchTermValue) => {
    return contactsList.filter(contact => {
      const matchSearch =
        contact.name.toLowerCase().includes(searchTermValue) ||
        contact.email.toLowerCase().includes(searchTermValue) ||
        contact.position.toLowerCase().includes(searchTermValue);

      if (!matchSearch) return false;

      if (filterObj.name && !contact.name.toLowerCase().includes(filterObj.name.toLowerCase())) return false;
      if (filterObj.tags.length > 0 && !filterObj.tags.some(tag => contact.tags && contact.tags.includes(tag))) return false;
      if (filterObj.owner && contact.owner !== filterObj.owner) return false;
      if (filterObj.location.length > 0 && !filterObj.location.includes(contact.country)) return false;
      if (filterObj.rating.length > 0 && !filterObj.rating.includes(contact.rating)) return false;
      if (filterObj.status.length > 0 && !filterObj.status.includes(contact.status || 'Active')) return false;

      return true;
    });
  }, []);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = applyFilters(contacts, filters, term);
    setFilteredContacts(filtered);
  };

  const handleFilterChange = (filterType, value, isCheckbox = false) => {
    setFilters(prev => {
      let updated = { ...prev };
      if (isCheckbox) {
        updated[filterType] = updated[filterType].includes(value)
          ? updated[filterType].filter(item => item !== value)
          : [...updated[filterType], value];
      } else {
        updated[filterType] = value;
      }
      const filtered = applyFilters(contacts, updated, searchTerm);
      setFilteredContacts(filtered);
      return updated;
    });
  };

  const handleResetFilters = () => {
    setFilters({
      name: '',
      tags: [],
      owner: '',
      location: [],
      rating: [],
      status: []
    });
    const filtered = applyFilters(contacts, {
      name: '',
      tags: [],
      owner: '',
      location: [],
      rating: [],
      status: []
    }, searchTerm);
    setFilteredContacts(filtered);
  };

  const toggleFilterSection = (section) => {
    setExpandedFilters(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const avatarColors = {
    'DR': '#3B82F6',
    'SR': '#E74694',
    'VL': '#22C55E',
    'JL': '#F59E0B',
    'CT': '#8B5CF6',
    'DM': '#06B6D4',
    'RH': '#EC4899',
    'JC': '#3B82F6',
    'JS': '#22C55E',
    'BC': '#F59E0B',
    'EA': '#8B5CF6',
    'RC': '#06B6D4'
  };

  const getAvatarColor = (initials) => {
    return avatarColors[initials] || '#3B82F6';
  };

  const getTagStyle = (tag) => {
    if (tag === 'Collab') {
      return { bg: '#E4F8ED', text: '#28C76F' };
    } else if (tag === 'VIP') {
      return { bg: '#FFF4DE', text: '#FFA200' };
    } else if (tag === 'Rated') {
      return { bg: '#FFF4DE', text: '#FFA200' };
    }
    return { bg: '#F3F4F6', text: '#6B7280' };
  };

  const transformContactData = (apiContacts) => {
    if (!Array.isArray(apiContacts)) {
      console.warn('⚠️ Expected array, got:', typeof apiContacts);
      return [];
    }

    return apiContacts.map((contact) => {
      // Handle both individual contacts (first_name/last_name) and company clients (company_name)
      const name = contact.company_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown';
      const initials = contact.company_name
        ? contact.company_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : `${contact.first_name?.charAt(0) || ''}${contact.last_name?.charAt(0) || ''}`.toUpperCase();

      return {
        id: contact.id,
        project_id: contact.project_id,
        name: name,
        email: contact.email || '',
        phone: contact.phone || '',
        position: contact.position || 'Confirmed Client',
        country: contact.country || contact.company_name || 'India',
        owner: contact.owner || 'System',
        avatar: initials || '?',
        avatarImage: contact.avatar || null,
        tags: contact.tags ? (typeof contact.tags === 'string' ? contact.tags.split(',').map(t => t.trim()) : Array.isArray(contact.tags) ? contact.tags : ['Confirmed']) : ['Confirmed'],
        rating: contact.rating || 5,
        status: contact.status || 'Active',
        collaborators: [
          { avatar: initials || '?' }
        ]
      };
    });
  };

  const generateFilterOptions = useCallback((contactsList) => {
    const tags = new Set();
    const owners = new Set();
    const locations = new Set();
    const ratings = new Set();
    const statuses = new Set();

    contactsList.forEach(contact => {
      if (contact.tags && Array.isArray(contact.tags)) {
        contact.tags.forEach(tag => tags.add(tag));
      }
      if (contact.owner) owners.add(contact.owner);
      if (contact.country) locations.add(contact.country);
      if (contact.rating) ratings.add(contact.rating);
      if (contact.status) statuses.add(contact.status);
    });

    setFilterOptions({
      tags: Array.from(tags).sort(),
      owners: Array.from(owners).sort(),
      locations: Array.from(locations).sort(),
      ratings: Array.from(ratings).sort((a, b) => b - a),
      statuses: Array.from(statuses).sort()
    });
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await usersAPI.getAll();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const data = await teamsAPI.getAll();
      setTeams(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchProjectTeam = async (projectId) => {
    if (!projectId) return;
    try {
      const data = await projectTeamAPI.getMembers(projectId);
      setProjectTeams(prev => ({
        ...prev,
        [projectId]: Array.isArray(data) ? data : []
      }));
    } catch (error) {
      console.error(`Error fetching team for project ${projectId}:`, error);
    }
  };

  const fetchContacts = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      // Fetch all contacts
      const response = await fetch(`${apiUrl}/contacts`);
      if (!response.ok) {
        throw new Error(`API Error ${response.status}`);
      }
      let data = await response.json();
      console.log('🔍 Raw API response:', data);

      if (!Array.isArray(data)) {
        data = data.data || data.contacts || [];
      }

      const transformedData = transformContactData(data);
      console.log('🔍 Transformed data:', transformedData);
      setContacts(transformedData);
      setFilteredContacts(transformedData);
      generateFilterOptions(transformedData);
      console.log('✅ Confirmed IT clients fetched:', transformedData.length);

      // Fetch teams for projects
      transformedData.forEach(contact => {
        if (contact.project_id) {
          fetchProjectTeam(contact.project_id);
        }
      });
      fetchUsers();
      fetchTeams();
    } catch (error) {
      console.error('❌ Error fetching contacts:', error);
      setContacts([]);
      setFilteredContacts([]);
    }
  }, [generateFilterOptions]);

  const handleAssignTeam = async (projectId, memberData) => {
    try {
      await projectTeamAPI.addMember(projectId, memberData);
      showSuccessToast('Team member assigned successfully!');
      fetchProjectTeam(projectId);
    } catch (error) {
      console.error('Error assigning team member:', error);
      showErrorToast('Failed to assign team member');
    }
  };

  const handleAssignWholeTeam = async (projectId, teamId) => {
    try {
      await projectTeamAPI.assignTeam(projectId, teamId);
      showSuccessToast('Whole team assigned successfully!');
      fetchProjectTeam(projectId);
    } catch (error) {
      console.error('Error assigning whole team:', error);
      showErrorToast('Failed to assign whole team');
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleAddContact = async (formData) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setIsModalOpen(false);
        await fetchContacts();
        const contactName = `${formData.first_name} ${formData.last_name}`;
        showSuccessToast(`Contact "${contactName}" created successfully!`);
        navigate('/contact-details', { state: { contactId: result.id } });
      } else {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to create contact';
        showErrorToast(errorMessage);
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      showErrorToast('Error creating contact');
    }
  };

  const handleEdit = (contact) => {
    setSelectedContact(contact);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (contactId) => {
    try {
      const contactToDelete = contacts.find(c => c.id === contactId);
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/contacts/${contactId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchContacts();
        showSuccessToast(`Contact "${contactToDelete?.name || 'Unknown'}" deleted successfully!`);
      } else {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to delete contact';
        showErrorToast(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      showErrorToast('Error deleting contact');
    }
  };

  const handlePreview = (contact) => {
    navigate('/contact-details', { state: { contactId: contact.id, contact } });
  };

  const handleUpdateContact = async (formData) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/contacts/${selectedContact.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsEditModalOpen(false);
        setSelectedContact(null);
        await fetchContacts();
        const contactName = `${formData.first_name} ${formData.last_name}`;
        showSuccessToast(`Contact "${contactName}" updated successfully!`);
      } else {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to update contact';
        showErrorToast(errorMessage);
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      showErrorToast('Error updating contact');
    }
  };

  const renderTableView = () => (
    <div className="bg-white border border-[#EAECF0] rounded-[12px] shadow-[0_2px_6px_rgba(0,0,0,0.05)]">
      <div className="overflow-x-auto ">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-[#EAECF0]">
              <th className="px-6 py-4 text-xs  text-gray-900">Name</th>
              <th className="px-6 py-4 text-xs  text-gray-900">Email</th>
              <th className="px-6 py-4 text-xs  text-gray-900">Phone</th>
              <th className="px-6 py-4 text-xs  text-gray-900">Location</th>
              <th className="px-6 py-4 text-xs  text-gray-900">Team</th>
              <th className="px-6 py-4 text-xs  text-gray-900">Status</th>
              <th className="px-6 py-4 text-xs  text-gray-900">Tags</th>
              <th className="px-6 py-4 text-xs  text-gray-900 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAECF0]">
            {filteredContacts.map((contact) => (
              <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 overflow-hidden">
                      {contact.avatarImage ? (
                        <img src={contact.avatarImage} alt={contact.name} className="w-full h-full object-cover" />
                      ) : (
                        <div style={{ backgroundColor: getAvatarColor(contact.avatar) }} className="w-full h-full flex items-center justify-center text-white">
                          {contact.avatar}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-900">{contact.name}</div>
                      <div className="text-xs text-gray-500">{contact.position}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-gray-600">{contact.email}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-gray-600">{contact.phone}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-gray-600">{contact.country}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2 overflow-hidden">
                      {projectTeams[contact.project_id]?.map((member, i) => (
                        <div
                          key={member.id}
                          title={`${member.first_name} ${member.last_name} (${member.role || 'Team Member'})`}
                          className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-blue-100 flex items-center justify-center text-[8px]  text-blue-700 border border-blue-200  cursor-help"
                        >
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </div>
                      ))}
                    </div>
                    {contact.project_id && (
                      <button
                        onClick={() => {
                          setActiveProjectId(contact.project_id);
                          setIsTeamModalOpen(true);
                        }}
                        className="p-1 hover:bg-blue-50 text-blue-600 rounded-full transition-colors group"
                        title="Assign Team"
                      >
                        <UserPlus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${contact.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                    }`}>
                    {contact.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1 flex-wrap">
                    {contact.tags.slice(0, 2).map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: getTagStyle(tag).bg,
                          color: getTagStyle(tag).text
                        }}
                        className="text-xs px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {contact.tags.length > 2 && (
                      <span className="text-xs text-gray-400">+{contact.tags.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <ContactActionDropdown
                    contact={contact}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onPreview={handlePreview}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-gray-50">
      <div className="mb-8 px-6 pt-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[28px]  text-gray-900">Contacts</h1>
              <span className="bg-[#FFE5E5] text-[#F62416] px-2.5 py-0.5 rounded-full text-[12px] ">
                {filteredContacts.length}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs  mt-1">
              <button className="text-[#F97316] hover:text-[#EA580C]   bg-transparent border-none cursor-pointer p-0">
                Home
              </button>
              <span className="text-[#D1D5DB]">&gt;</span>
              <span className="text-[#6B7280]">Contacts</span>
            </div>
          </div>

          <div className="flex gap-2 bg-white p-1 border border-[#E5E7EB] rounded">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[#F62416] text-white ' : 'text-gray-400 hover:bg-gray-50'}`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-[#F62416] text-white ' : 'text-gray-400 hover:bg-gray-50'}`}
              title="Table View"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1F2020]" />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-9 pr-4 py-2 border border-[#E5E7EB] rounded  focus:outline-none focus:border-gray-400 text-xs  bg-white"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="p-2  border border-[#E5E7EB] rounded  hover:bg-gray-50 text-xs    text-gray-700 transition bg-white flex items-center gap-2"
              >
                Filter <ChevronDown size={16} />
              </button>
              {showFilter && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-[#E5E7EB] rounded  p-2 max-h-[calc(100vh-200px)] overflow-y-auto z-50 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className=" text-gray-900 text-xs ">Filter</h3>
                    <button
                      onClick={() => setShowFilter(false)}
                      className="text-[#1F2020] hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="border-b border-[#E5E7EB]">
                      <button
                        onClick={() => toggleFilterSection('name')}
                        className="w-full flex items-center gap-2 py-2 text-xs    text-gray-900"
                      >
                        <ChevronDown size={16} className={`transition ${expandedFilters.name ? '' : '-rotate-90'}`} />
                        Name
                      </button>
                      {expandedFilters.name && (
                        <div className="pb-3 px-2">
                          <input
                            type="text"
                            placeholder="Search name"
                            value={filters.name}
                            onChange={(e) => handleFilterChange('name', e.target.value)}
                            className="w-full p-2 border border-[#E5E7EB] rounded text-xs  focus:outline-none focus:border-red-500"
                          />
                        </div>
                      )}
                    </div>

                    <div className="border-b border-[#E5E7EB]">
                      <button
                        onClick={() => toggleFilterSection('tags')}
                        className="w-full flex items-center gap-2 py-2 text-xs    text-gray-900"
                      >
                        <ChevronDown size={16} className={`transition ${expandedFilters.tags ? '' : '-rotate-90'}`} />
                        Tags
                      </button>
                      {expandedFilters.tags && (
                        <div className="pb-3 space-y-2 px-2">
                          {filterOptions.tags.length > 0 ? (
                            filterOptions.tags.map(tag => (
                              <label key={tag} className="flex items-center gap-2 text-xs  text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={filters.tags.includes(tag)}
                                  onChange={(e) => handleFilterChange('tags', tag, true)}
                                  className="w-4 h-4 border border-[#E5E7EB] rounded cursor-pointer"
                                />
                                {tag}
                              </label>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500">No tags available</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="border-b border-[#E5E7EB]">
                      <button
                        onClick={() => toggleFilterSection('owner')}
                        className="w-full flex items-center gap-2 py-2 text-xs    text-gray-900"
                      >
                        <ChevronDown size={16} className={`transition ${expandedFilters.owner ? '' : '-rotate-90'}`} />
                        Owner
                      </button>
                      {expandedFilters.owner && (
                        <div className="pb-3 space-y-2 px-2">
                          {filterOptions.owners.length > 0 ? (
                            filterOptions.owners.map(owner => (
                              <label key={owner} className="flex items-center gap-2 text-xs  text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={filters.owner === owner}
                                  onChange={(e) => handleFilterChange('owner', e.target.checked ? owner : '')}
                                  className="w-4 h-4 border border-[#E5E7EB] rounded cursor-pointer"
                                />
                                {owner}
                              </label>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500">No owners available</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="border-b border-[#E5E7EB]">
                      <button
                        onClick={() => toggleFilterSection('location')}
                        className="w-full flex items-center gap-2 py-2 text-xs    text-gray-900"
                      >
                        <ChevronDown size={16} className={`transition ${expandedFilters.location ? '' : '-rotate-90'}`} />
                        Location
                      </button>
                      {expandedFilters.location && (
                        <div className="pb-3 space-y-2 px-2">
                          {filterOptions.locations.length > 0 ? (
                            filterOptions.locations.map(location => (
                              <label key={location} className="flex items-center gap-2 text-xs  text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={filters.location.includes(location)}
                                  onChange={(e) => handleFilterChange('location', location, true)}
                                  className="w-4 h-4 border border-[#E5E7EB] rounded cursor-pointer"
                                />
                                {location}
                              </label>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500">No locations available</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="border-b border-[#E5E7EB]">
                      <button
                        onClick={() => toggleFilterSection('rating')}
                        className="w-full flex items-center gap-2 py-2 text-xs    text-gray-900"
                      >
                        <ChevronDown size={16} className={`transition ${expandedFilters.rating ? '' : '-rotate-90'}`} />
                        Rating
                      </button>
                      {expandedFilters.rating && (
                        <div className="pb-3 space-y-2 px-2">
                          {filterOptions.ratings.length > 0 ? (
                            filterOptions.ratings.map(rating => (
                              <label key={rating} className="flex items-center gap-2 text-xs  text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={filters.rating.includes(rating)}
                                  onChange={(e) => handleFilterChange('rating', rating, true)}
                                  className="w-4 h-4 border border-[#E5E7EB] rounded cursor-pointer"
                                />
                                <span>{'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))} {rating}</span>
                              </label>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500">No ratings available</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="border-b border-[#E5E7EB]">
                      <button
                        onClick={() => toggleFilterSection('status')}
                        className="w-full flex items-center gap-2 py-2 text-xs    text-gray-900"
                      >
                        <ChevronDown size={16} className={`transition ${expandedFilters.status ? '' : '-rotate-90'}`} />
                        Status
                      </button>
                      {expandedFilters.status && (
                        <div className="pb-3 space-y-2 px-2">
                          {filterOptions.statuses.length > 0 ? (
                            filterOptions.statuses.map(status => (
                              <label key={status} className="flex items-center gap-2 text-xs  text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={filters.status.includes(status)}
                                  onChange={(e) => handleFilterChange('status', status, true)}
                                  className="w-4 h-4 border border-[#E5E7EB] rounded cursor-pointer"
                                />
                                {status}
                              </label>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500">No statuses available</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-[#E5E7EB]">
                    <button
                      onClick={handleResetFilters}
                      className="flex-1 p-2  border border-[#E5E7EB] text-gray-700 text-xs    rounded  hover:bg-gray-50 transition"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setShowFilter(false)}
                      className="flex-1 p-2  bg-[#F62416] text-white text-xs    rounded  hover:bg-red-700 transition"
                    >
                      Filter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#F62416] text-white p-2  rounded    flex items-center gap-2 hover:opacity-90 transition text-xs "
          >
            <Plus size={18} strokeWidth={2.5} />
            Add Contacts
          </button>
        </div>
      </div>

      <AddContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddContact}
      />

      <AddContactModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedContact(null);
        }}
        onSubmit={handleUpdateContact}
        initialData={selectedContact}
        isEditMode={true}
      />

      <div className="px-6 pb-8">
        {viewMode === 'table' ? (
          renderTableView()
        ) : (
          <div className="grid gap-6 grid-cols-4">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-white border border-[#EAECF0] rounded shadow-[0_2px_6px_rgba(0,0,0,0.05)] p-2"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center  text-xs  flex-shrink-0 overflow-hidden">
                      {contact.avatarImage ? (
                        <img src={contact.avatarImage} alt={contact.name} className="w-full h-full object-cover" />
                      ) : (
                        <div style={{ backgroundColor: getAvatarColor(contact.avatar) }} className="w-full h-full flex items-center justify-center text-white">
                          {contact.avatar}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs   text-gray-900 truncate">
                        {contact.name}
                      </h3>
                      <p className="text-xs  text-[#6B7280] truncate">
                        {contact.position}
                      </p>
                    </div>
                  </div>
                  <ContactActionDropdown
                    contact={contact}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onPreview={handlePreview}
                  />
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2  text-xs  text-[#6B7280]">
                    <Mail size={15} strokeWidth={1.5} className="flex-shrink-0" />
                    <a href={`mailto:${contact.email}`} className="hover:text-gray-900 truncate transition">
                      {contact.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2  text-xs  text-[#6B7280]">
                    <Phone size={15} strokeWidth={1.5} className="flex-shrink-0" />
                    <span className="truncate">{contact.phone}</span>
                  </div>
                  <div className="flex items-center gap-2  text-xs  text-[#6B7280]">
                    <MapPin size={15} strokeWidth={1.5} className="flex-shrink-0" />
                    <span className="truncate">{contact.country}</span>
                  </div>
                </div>

                <div className="flex gap-2 mb-4 flex-wrap">
                  {contact.tags.map((tag, idx) => {
                    const tagStyle = getTagStyle(tag);
                    return (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: tagStyle.bg,
                          color: tagStyle.text
                        }}
                        className="text-[12px] px-3 py-1 rounded   "
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-[#F3F4F6] flex items-center justify-between">
                  <div className="flex gap-2 text-[#6B7280]">
                    <a href={`mailto:${contact.email}`} className="hover:text-gray-900 transition p-0.5" title="Email">
                      <Mail size={15} strokeWidth={1.5} />
                    </a>
                    <a href={`tel:${contact.phone}`} className="hover:text-gray-900 transition p-0.5" title="Phone">
                      <Phone size={15} strokeWidth={1.5} />
                    </a>
                    <button className="hover:text-gray-900 transition p-0.5" title="Chat" onClick={() => alert(`Message for ${contact.name}`)}>
                      <MessageCircle size={15} strokeWidth={1.5} />
                    </button>
                    <button className="hover:text-gray-900 transition p-0.5" title="Users" onClick={() => alert(`Collaborators: ${contact.collaborators.map(c => c.avatar).join(', ')}`)}>
                      <Users size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {contact.collaborators.slice(0, 3).map((collaborator, idx) => (
                      <div
                        key={idx}
                        style={{ backgroundColor: getAvatarColor(collaborator.avatar) }}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs   border border-white"
                      >
                        {collaborator.avatar}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredContacts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xs  text-[#9CA3AF]  ">
              No contacts found
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <button className="bg-[#F62416] text-white rounded-[8px] px-8 py-3   hover:opacity-90 transition text-[14px]">
            Load More
          </button>
        </div>
      </div>

      <ProjectTeamModal
        isOpen={isTeamModalOpen}
        onClose={() => {
          setIsTeamModalOpen(false);
          setActiveProjectId(null);
        }}
        projectId={activeProjectId}
        currentTeam={projectTeams[activeProjectId] || []}
        users={users}
        teams={teams}
        onAssign={handleAssignTeam}
        onAssignTeam={handleAssignWholeTeam}
      />
    </div>
  );
};

export default Contacts;

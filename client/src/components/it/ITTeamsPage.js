import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Users, Plus, UserPlus, Briefcase, Trash2, Search, Filter, Shield, MoreVertical, X,
  ChevronDown, Folder, UserCheck, UserX, Clock, Calendar, Download, Eye, Edit3, ChevronRight, Activity, TrendingUp
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { teamsAPI, usersAPI, projectAPI, projectTeamAPI } from '../../services/api';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ITTeamsPage = ({ department }) => {
  const navigate = useNavigate();
  const { designation, username } = useParams();
  const path = window.location.pathname.toLowerCase();
  const currentDept = department || (
    path.includes('/marketing') ? 'Marketing' :
      path.includes('/seo-gmb') ? 'Marketing' :
        'IT'
  );
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isAssignProjectModalOpen, setIsAssignProjectModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [activeTab, setActiveTab] = useState('Team Allocation');
  const [expandedTeams, setExpandedTeams] = useState({});

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  const toggleTeamExpand = (teamId) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    manager_id: '',
    manager_role: '',
    members: [], // Array of { user_id: '', role: '', userName: '', roleSearch: '' }
    project_ids: []
  });
  const [newMember, setNewMember] = useState({ user_id: '', role: '' });
  const [projectAssignment, setProjectAssignment] = useState({ project_id: '' });

  // BOM-style member form local states
  const [memberFormUserId, setMemberFormUserId] = useState('');
  const [memberFormUserName, setMemberFormUserName] = useState('');
  const [memberFormUserEmail, setMemberFormUserEmail] = useState('');
  const [memberFormRole, setMemberFormRole] = useState('');
  const [memberFormUserSearchActive, setMemberFormUserSearchActive] = useState(false);
  const [memberFormRoleSearchActive, setMemberFormRoleSearchActive] = useState(false);

  // Search states for modals
  const [managerSearch, setManagerSearch] = useState('');
  const [managerRoleSearch, setManagerRoleSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleSearch, setMemberRoleSearch] = useState('');

  const [activeDropdown, setActiveDropdown] = useState(null); // 'manager', 'managerRole', 'member', 'memberRole'

  const commonRoles = currentDept === 'Marketing' ? [
    'Graphics Designer', 'Video Editor', 'Social Media Marketing',
    'SEO & GMB', 'PPC Manager', 'Wordpress Developer', 'Marketing Manager'
  ] : [
    'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'UI/UX Designer', 'Mobile Developer', 'QA   Engineer',
    'DevOps Engineer', 'Data Scientist', 'Project Manager',
    'Product Manager', 'Team Lead', 'IT Manager', 'CTO'
  ];

  useEffect(() => {
    fetchData();
    const handleClickOutside = () => {
      setActiveDropdown(null);
      setMemberFormUserSearchActive(false);
      setMemberFormRoleSearchActive(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [currentDept]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamsData, usersData, projectsData, departmentsData] = await Promise.all([
        teamsAPI.getAll(),
        usersAPI.getAll(),
        projectAPI.getAll(),
        fetch(`${process.env.REACT_APP_API_URL || API_BASE_URL + ''}/departments`).then(res => res.json())
      ]);

      const deptRecord = departmentsData.find(d => (d.name || '').toLowerCase().includes(currentDept.toLowerCase()));
      const targetDeptId = deptRecord ? deptRecord.id : (currentDept === 'Marketing' ? 2 : 4);

      const filteredTeams = teamsData.filter(t => t.department_id === targetDeptId || !t.department_id || (t.department && t.department.toLowerCase().includes(currentDept.toLowerCase())));

      // Fetch members for each team
      const teamsWithMembers = await Promise.all(filteredTeams.map(async (team) => {
        try {
          const members = await teamsAPI.getMembers(team.id);
          return { ...team, members };
        } catch (err) {
          console.error(`Failed to fetch members for team ${team.id}`, err);
          return { ...team, members: [] };
        }
      }));

      setTeams(teamsWithMembers);
      setUsers(usersData);
      setProjects(projectsData.filter(p =>
        p.workflow_type === currentDept ||
        p.project_type === currentDept ||
        p.category === currentDept ||
        p.department_id === targetDeptId ||
        (p.department && p.department.toLowerCase().includes(currentDept.toLowerCase()))
      ));
    } catch (error) {
      console.error('Failed to fetch teams data:', error);
      showErrorToast('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      const departmentsData = await fetch(`${process.env.REACT_APP_API_URL || API_BASE_URL + ''}/departments`).then(res => res.json());
      const deptRecord = departmentsData.find(d => (d.name || '').toLowerCase().includes(currentDept.toLowerCase()));
      const targetDeptId = deptRecord ? deptRecord.id : (currentDept === 'Marketing' ? 2 : 4);

      const teamData = {
        name: newTeam.name,
        description: newTeam.description,
        department_id: targetDeptId,
        manager_id: newTeam.manager_id,
        manager_role: newTeam.manager_role || 'Manager'
      };

      let teamId;
      if (isEditMode) {
        teamId = selectedTeamId;
        await teamsAPI.update(teamId, teamData);

        // Remove all previous members of the team to overwrite them
        const currentDbMembers = await teamsAPI.getMembers(teamId);
        for (const m of currentDbMembers) {
          await teamsAPI.removeMember(teamId, m.user_id);
        }
      } else {
        const response = await teamsAPI.create(teamData);
        teamId = response.id;
      }

      if (teamId && newTeam.members.length > 0) {
        for (const member of newTeam.members) {
          if (member.user_id && member.role) {
            await teamsAPI.addMember(teamId, {
              user_id: member.user_id,
              role: member.role
            });
          }
        }
      }

      // Sync project assignments
      if (teamId) {
        const prevAssignedProjects = projects.filter(p => p.team_id === teamId);

        // 1. Unassign team from any project that is no longer selected
        for (const p of prevAssignedProjects) {
          if (!newTeam.project_ids.includes(p.id)) {
            await projectAPI.update(p.id, { team_id: null });
          }
        }

        // 2. Assign team to any project that is newly selected
        if (newTeam.project_ids && newTeam.project_ids.length > 0) {
          for (const projectId of newTeam.project_ids) {
            const p = prevAssignedProjects.find(prev => prev.id === projectId);
            if (!p) {
              await projectTeamAPI.assignTeam(projectId, teamId);
            }
          }
        }
      }

      showSuccessToast(isEditMode ? 'Team updated successfully' : 'Team created successfully');
      setIsCreateModalOpen(false);
      setIsEditMode(false);
      setSelectedTeamId(null);
      setNewTeam({
        name: '',
        description: '',
        manager_id: '',
        manager_role: '',
        members: [],
        project_ids: []
      });
      setManagerSearch('');
      setManagerRoleSearch('');
      fetchData();
    } catch (error) {
      showErrorToast(isEditMode ? 'Failed to update team' : 'Failed to create team');
    }
  };

  const addMemberToList = () => {
    if (!memberFormUserId) {
      showErrorToast('Please select a team member.');
      return;
    }
    if (!memberFormRole.trim()) {
      showErrorToast('Please specify a role for the team member.');
      return;
    }

    // Check if member already added
    if (newTeam.members.some(m => m.user_id === memberFormUserId)) {
      showErrorToast('This member is already added to the team.');
      return;
    }

    setNewTeam(prev => ({
      ...prev,
      members: [
        ...prev.members,
        {
          user_id: memberFormUserId,
          userName: memberFormUserName,
          email: memberFormUserEmail,
          role: memberFormRole.trim(),
        }
      ]
    }));

    // Reset member form
    setMemberFormUserId('');
    setMemberFormUserName('');
    setMemberFormUserEmail('');
    setMemberFormRole('');
  };

  const removeMemberField = (index) => {
    const updatedMembers = [...newTeam.members];
    updatedMembers.splice(index, 1);
    setNewTeam({ ...newTeam, members: updatedMembers });
  };

  const [projectFormId, setProjectFormId] = useState('');

  const addProjectToList = () => {
    if (!projectFormId) {
      showErrorToast('Please select a project to assign.');
      return;
    }
    const projIdNum = Number(projectFormId);
    const alreadyExists = newTeam.project_ids?.includes(projIdNum);
    if (alreadyExists) {
      showErrorToast('This project is already assigned.');
      return;
    }
    setNewTeam(prev => ({
      ...prev,
      project_ids: [...(prev.project_ids || []), projIdNum]
    }));
    setProjectFormId('');
  };

  const removeProjectFromList = (projectId) => {
    setNewTeam(prev => ({
      ...prev,
      project_ids: (prev.project_ids || []).filter(id => id !== projectId)
    }));
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await teamsAPI.addMember(selectedTeam.id, newMember);
      showSuccessToast('Member added to team');
      setIsAddMemberModalOpen(false);
      setNewMember({ user_id: '', role: '' });
      setMemberSearch('');
      setMemberRoleSearch('');
      fetchData();
    } catch (error) {
      showErrorToast('Failed to add member');
    }
  };

  const handleAssignProject = async (e) => {
    e.preventDefault();
    const teamId = selectedTeam?.id || projectAssignment.team_id;
    if (!teamId) {
      showErrorToast('Please select a team');
      return;
    }
    try {
      await projectTeamAPI.assignTeam(projectAssignment.project_id, teamId);
      showSuccessToast('Team assigned to project');
      setIsAssignProjectModalOpen(false);
      setProjectAssignment({ project_id: '', team_id: '' });
      setSelectedTeam(null);
      fetchData();
    } catch (error) {
      showErrorToast('Failed to assign project');
    }
  };

  const deptUsers = users.filter(u => {
    const dept = (u.department || '').toLowerCase();
    const role = (u.job_title || u.role_name || u.role || '').toLowerCase();
    if (currentDept === 'Marketing') {
      return dept.includes('marketing') || dept.includes('seo') || role.includes('marketing') || role.includes('designer') || role.includes('video') || role.includes('seo') || role.includes('ppc') || role.includes('wordpress');
    }
    return dept.includes('it') || role.includes('it') || role.includes('developer') || role.includes('tester') || role.includes('devops') || role.includes('qa') || role.includes('manager');
  });

  const deptManagers = deptUsers.filter(u => {
    const role = (u.job_title || u.role_name || u.role || '').toLowerCase();
    return u.department_role === 'Manager' || role.includes('manager');
  });

  const filteredManagers = deptManagers.filter(u =>
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(managerSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(managerSearch.toLowerCase())
  );

  const filteredMembers = deptUsers.filter(u =>
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(memberSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const filteredManagerRoles = commonRoles.filter(role =>
    role.toLowerCase().includes(managerRoleSearch.toLowerCase())
  );

  const filteredMemberRoles = commonRoles.filter(role =>
    role.toLowerCase().includes(memberRoleSearch.toLowerCase())
  );


  const totalUsers = users.length;
  const activeAssignments = teams.reduce((acc, t) => acc + (t.members ? t.members.length : 0), 0);

  // Dynamic Role Allocations
  const roleMap = {};
  users.forEach(u => {
    const r = u.job_title || (u.job_title || u.role || 'Member') || 'Member';
    roleMap[r] = (roleMap[r] || 0) + 1;
  });
  const dynamicRoleAllocations = Object.entries(roleMap).map(([role, count]) => ({
    role,
    count,
    pct: totalUsers ? ((count / totalUsers) * 100).toFixed(2) + '%' : '0%'
  }));

  // Dynamic Workload Data (Mock mapping for now based on team assignments)
  const dynamicWorkloadData = totalUsers > 0 ? [
    { name: 'Overallocated', value: 0, color: '#ef4444', pct: '0%' },
    { name: 'High (80-100%)', value: Math.floor(totalUsers * 0.1), color: '#f59e0b', pct: '10%' },
    { name: 'Medium (50-79%)', value: Math.floor(totalUsers * 0.5), color: '#3b82f6', pct: '50%' },
    { name: 'Low (1-49%)', value: totalUsers - Math.floor(totalUsers * 0.6), color: '#22c55e', pct: '40%' }
  ] : [];


  return (
    <>
      <div className="p-4 bg-[#F8FAFC] min-h-screen font-sans">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl  text-gray-900 mb-1">{currentDept === 'Marketing' ? 'Marketing Team Management' : 'IT Team Management'}</h1>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span className="hover:text-indigo-600 cursor-pointer transition-colors">{currentDept} Dashboard</span>
              <ChevronRight size={10} />
              <span className="text-gray-900 font-medium">{currentDept === 'Marketing' ? 'Marketing Team Management' : 'Team Management'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 bg-white border border-gray-200 text-gray-700 rounded text-sm font-medium flex items-center gap-2  hover:bg-gray-50 transition-colors">
              <Users size={14} /> Team Workload
            </button>
            <button className="p-2 bg-white border border-gray-200 text-gray-700 rounded text-sm font-medium flex items-center gap-2  hover:bg-gray-50 transition-colors">
              <Download size={14} /> Import Team
            </button>
            <button onClick={() => { setSelectedTeam(null); setIsAssignProjectModalOpen(true); }} className="p-2 bg-indigo-600 text-white rounded text-sm font-medium flex items-center gap-2  hover:bg-indigo-700 transition-colors">
              <Plus size={14} /> Assign Team
            </button>
          </div>
        </div>

        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { title: 'Total Team Members', val: totalUsers, sub: 'Active Employees', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { title: 'Total Projects', val: projects.length, sub: 'Projects Assigned', icon: Folder, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { title: 'Active Assignments', val: activeAssignments, sub: 'Across All Projects', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
          ].map((k, i) => (
            <div key={i} className="bg-white p-4 rounded-lg border border-gray-100 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className={`p-3.5 rounded-lg ${k.bg} ${k.color} shrink-0`}><k.icon size={22} /></div>
              <div>
                <div className="text-sm  text-gray-500 mb-0.5">{k.title}</div>
                <div className="text-xl  text-gray-900 mb-0.5">{k.val}</div>
                <div className="text-[10px] text-gray-400">{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* TABS & FILTERS */}
        <div className="mb-6">
          <div className="flex items-center gap-8 border-b border-gray-200 mb-4 px-2">
            {['Team Allocation', 'Project Wise Team', 'Role Management', 'Skills Matrix', 'Availability Calendar', 'Leave & Attendance'].map((tab) => (
              <div
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-[12px]  cursor-pointer transition-colors relative ${activeTab === tab
                  ? 'text-indigo-600  border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {['All Projects', 'All Roles', 'All Skills', 'All Status'].map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-6 p-2 bg-white border border-gray-200 rounded cursor-pointer  hover:bg-gray-50 transition-colors w-40">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{f}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </div>
            ))}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search team members..." className=" pl-9 pr-4 py-2 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow  w-[200px]" />
            </div>
            <button className="p-2 bg-white border border-gray-200 text-gray-700 rounded text-sm font-medium flex items-center gap-2  hover:bg-gray-50 transition-colors">
              <Filter size={14} className="text-gray-500" /> More Filters
            </button>
            <button className="p-2 text-indigo-600 bg-indigo-50 rounded text-sm font-medium hover:bg-indigo-100 transition-colors">
              Reset
            </button>
          </div>
        </div>

        {/* TABS CONTENT CODES */}
        {activeTab === 'Team Allocation' && (
          <div className="space-y-6">
            <div className="bg-white rounded border border-gray-100 p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
                <div>
                  <h2 className="text-[14px]  text-gray-900">Active Teams</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Manage allocations, assign members, and monitor IT teams.</p>
                </div>
                <button
                  onClick={() => {
                    setIsEditMode(false);
                    setSelectedTeamId(null);
                    setNewTeam({
                      name: '',
                      description: '',
                      manager_id: '',
                      manager_role: '',
                      members: [],
                      project_ids: []
                    });
                    setManagerSearch('');
                    setManagerRoleSearch('');
                    setIsCreateModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs  flex items-center gap-1.5 hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={14} /> New Team
                </button>
              </div>

              {teams.length > 0 ? (
                <div className="overflow-x-auto border border-gray-100 rounded-lg shadow-sm">
                  <table className="w-full text-left border-collapse bg-white">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs  text-gray-500 bg-gray-50/50">
                        <th className="py-3 px-4 w-10"></th>
                        <th className="py-3 px-4">Team Name</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Manager</th>
                        <th className="py-3 px-4 text-center">Members Count</th>
                        <th className="py-3 px-4 text-center">Projects Count</th>
                        <th className="py-3 px-4 text-right pr-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {teams.map(team => {
                        const manager = users.find(u => u.id === team.manager_id);
                        const isExpanded = !!expandedTeams[team.id];
                        return (
                          <React.Fragment key={team.id}>
                            {/* Outer Row */}
                            <tr
                              onClick={() => toggleTeamExpand(team.id)}
                              className="border-b border-gray-100 hover:bg-gray-50/30 cursor-pointer transition-colors"
                            >
                              <td className="py-3.5 px-4 text-center">
                                {isExpanded ? (
                                  <ChevronDown size={14} className="text-gray-400" />
                                ) : (
                                  <ChevronRight size={14} className="text-gray-400" />
                                )}
                              </td>
                              <td className="py-3.5 px-4  text-gray-900">{team.name}</td>
                              <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate">{team.description || '—'}</td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-[10px] ">
                                    {manager ? manager.first_name[0].toUpperCase() : 'M'}
                                  </div>
                                  <span className=" text-gray-800">
                                    {manager ? `${manager.first_name} ${manager.last_name}` : 'Unassigned'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full ">
                                  {team.members?.length || 0} Members
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full ">
                                  {projects.filter(p => p.team_id === team.id).length} Projects
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => { setSelectedTeam(team); setIsViewModalOpen(true); }}
                                    className="p-1 hover:bg-blue-50 text-blue-600 rounded transition-colors"
                                    title="View Team Info"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    onClick={() => { setSelectedTeam(team); setIsAddMemberModalOpen(true); }}
                                    className="p-1 hover:bg-indigo-50 text-indigo-600 rounded transition-colors"
                                    title="Add Member"
                                  >
                                    <UserPlus size={14} />
                                  </button>
                                  <button
                                    onClick={() => { setSelectedTeam(team); setIsAssignProjectModalOpen(true); }}
                                    className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition-colors"
                                    title="Assign Project"
                                  >
                                    <Folder size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setIsEditMode(true);
                                      setSelectedTeamId(team.id);
                                      setNewTeam({
                                        name: team.name,
                                        description: team.description || '',
                                        manager_id: team.manager_id || '',
                                        manager_role: team.manager_role || '',
                                        members: team.members ? team.members.map(m => {
                                          const u = users.find(user => user.id === m.user_id);
                                          return {
                                            user_id: m.user_id,
                                            role: m.role,
                                            userName: u ? `${u.first_name} ${u.last_name}` : `User ID: ${m.user_id}`,
                                            email: u?.email || ''
                                          };
                                        }) : [],
                                        project_ids: projects.filter(p => p.team_id === team.id).map(p => p.id)
                                      });
                                      const manager = users.find(u => u.id === team.manager_id);
                                      setManagerSearch(manager ? `${manager.first_name} ${manager.last_name}` : '');
                                      setManagerRoleSearch(team.manager_role || '');
                                      setIsCreateModalOpen(true);
                                    }}
                                    className="p-1 hover:bg-amber-50 text-amber-600 rounded transition-colors"
                                    title="Edit Team"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (window.confirm(`Are you sure you want to delete the team "${team.name}"?`)) {
                                        try {
                                          await teamsAPI.delete(team.id);
                                          showSuccessToast('Team deleted successfully');
                                          fetchData();
                                        } catch (err) {
                                          showErrorToast('Failed to delete team');
                                        }
                                      }
                                    }}
                                    className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors"
                                    title="Delete Team"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Collapsible Inner Nested Table */}
                            {isExpanded && (
                              <tr className="bg-gray-50/30">
                                <td colSpan="7" className="py-3 px-8">
                                  <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden mb-2">
                                    <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                      <span className="text-[10px]  text-gray-500 uppercase tracking-wider">Allocated Team Members</span>
                                      <button
                                        onClick={() => { setSelectedTeam(team); setIsAddMemberModalOpen(true); }}
                                        className="text-[11px] text-indigo-600 hover:text-indigo-800  flex items-center gap-1"
                                      >
                                        <Plus size={12} /> Add Member
                                      </button>
                                    </div>
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="border-b border-gray-100 text-gray-400 bg-gray-50/20">
                                          <th className="py-2 px-4">Member Name</th>
                                          <th className="py-2 px-4">Role</th>
                                          <th className="py-2 px-4">Email</th>
                                          <th className="py-2 px-4 text-center">Status</th>
                                          <th className="py-2 px-4 text-right pr-6">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {team.members && team.members.length > 0 ? (
                                          team.members.map((member, i) => {
                                            const user = users.find(u => u.id === member.user_id);
                                            return (
                                              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                                                <td className="py-2 px-4  text-gray-800">
                                                  {user ? `${user.first_name} ${user.last_name}` : `User ID: ${member.user_id}`}
                                                </td>
                                                <td className="py-2 px-4 text-gray-600 ">{member.role}</td>
                                                <td className="py-2 px-4 text-gray-500">{user?.email || '—'}</td>
                                                <td className="py-2 px-4 text-center">
                                                  <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[9px] ">Active</span>
                                                </td>
                                                <td className="py-2 px-4 text-right pr-6">
                                                  <button
                                                    onClick={async () => {
                                                      if (window.confirm(`Remove member from ${team.name}?`)) {
                                                        try {
                                                          await teamsAPI.removeMember(team.id, member.user_id);
                                                          showSuccessToast('Member removed');
                                                          fetchData();
                                                        } catch (err) {
                                                          showErrorToast('Failed to remove member');
                                                        }
                                                      }
                                                    }}
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title="Remove Member"
                                                  >
                                                    <Trash2 size={13} />
                                                  </button>
                                                </td>
                                              </tr>
                                            );
                                          })
                                        ) : (
                                          <tr>
                                            <td colSpan="5" className="py-6 text-center text-gray-400">
                                              No members allocated to this team yet.
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>

                                  <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden mt-4 mb-2">
                                    <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                      <span className="text-[10px]  text-gray-500 uppercase tracking-wider">Assigned Projects</span>
                                      <button
                                        onClick={() => { setSelectedTeam(team); setIsAssignProjectModalOpen(true); }}
                                        className="text-[11px] text-emerald-600 hover:text-emerald-800  flex items-center gap-1"
                                      >
                                        <Plus size={12} /> Assign Project
                                      </button>
                                    </div>
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="border-b border-gray-100 text-gray-400 bg-gray-50/20">
                                          <th className="py-2 px-4">Project Name</th>
                                          <th className="py-2 px-4">Status</th>
                                          <th className="py-2 px-4 text-right pr-6">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(() => {
                                          const teamProjects = projects.filter(p => p.team_id === team.id);
                                          return teamProjects.length > 0 ? (
                                            teamProjects.map(p => (
                                              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                                                <td className="py-2 px-4  text-gray-800">{p.name}</td>
                                                <td className="py-2 px-4">
                                                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] ">
                                                    {p.status || 'Planning'}
                                                  </span>
                                                </td>
                                                <td className="py-2 px-4 text-right pr-6">
                                                  <button
                                                    onClick={() => navigate(`/projects/${designation || 'it-manager'}/${username || 'ashwini'}/details/${p.id}`)}
                                                    className="p-1 hover:bg-indigo-50 text-indigo-650 rounded transition-colors inline-flex items-center gap-1  text-[10px]"
                                                  >
                                                    <Eye size={12} /> View Project
                                                  </button>
                                                </td>
                                              </tr>
                                            ))
                                          ) : (
                                            <tr>
                                              <td colSpan="3" className="py-6 text-center text-gray-400">
                                                No projects currently assigned to this team.
                                              </td>
                                            </tr>
                                          );
                                        })()}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
                  <Users size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500 font-medium">No active teams found.</p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-3 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded  hover:bg-indigo-700 transition-colors"
                  >
                    Create First Team
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Project Wise Team' && (
          <div className="bg-white rounded border border-gray-100  flex flex-col mb-6">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-xl">
              <div>
                <h2 className="text-[13px]  text-gray-900">Project Wise Team Allocation</h2>
                <p className="text-xs text-gray-400 mt-0.5">Tracking team assignment across all active projects</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-xs  text-gray-500  bg-gray-50/50">
                    <th className="py-3 px-4">Project</th>
                    <th className="p-2">Assigned Team</th>
                    <th className="p-2">Team Size</th>
                    <th className="p-2">Project Manager</th>
                    <th className="p-2 text-center">Start Date</th>
                    <th className="p-2 text-center">End Date</th>
                    <th className="py-3 px-4 w-24">Progress</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {projects.map((p, i) => {
                    const assignedTeam = teams.find(t => t.id === p.team_id);
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className=" text-gray-900">{p.name}</div>
                          <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded mt-1 inline-block">IT Project</span>
                        </td>
                        <td className="p-2 font-medium text-indigo-600">
                          {assignedTeam ? assignedTeam.name : (
                            <span className="text-gray-400 font-normal">Unassigned</span>
                          )}
                        </td>
                        <td className="p-2  text-gray-700">
                          {assignedTeam ? `${assignedTeam.members?.length || 0} Members` : '-'}
                        </td>
                        <td className="p-2 text-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px]">
                              {p.manager_first_name ? p.manager_first_name[0] : 'U'}
                            </div>
                            <span>
                              {p.manager_first_name ? `${p.manager_first_name} ${p.manager_last_name || ''}` : 'System Admin'}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-center text-gray-600 font-medium">{p.start_date ? new Date(p.start_date).toLocaleDateString() : (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Unknown')}</td>
                        <td className="p-2 text-center text-gray-600 font-medium">{p.end_date ? new Date(p.end_date).toLocaleDateString() : 'Ongoing'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-700 w-6">{p.progress || 0}%</span>
                            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-600" style={{ width: `${p.progress || 0}%` }}></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {projects.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-gray-500 text-xs">
                        No IT projects found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Role Management' && (
          <div className="grid grid-cols-12 gap-6 mb-6">
            <div className="col-span-4 bg-white p-2 rounded border border-gray-100  flex flex-col">
              <h3 className="text-[13px]  text-gray-900 mb-4">Allocation by Role</h3>
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {dynamicRoleAllocations.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="text-gray-700 font-medium w-24">{r.role}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: r.pct }}></div>
                    </div>
                    <div className="w-16 flex justify-between text-gray-500">
                      <span className=" text-gray-900">{r.count}</span>
                      <span>({r.pct})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-8 bg-white rounded border border-gray-100  flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 bg-white rounded-t-xl">
                <h2 className="text-[13px]  text-gray-900">Role Breakdown Registry</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs  text-gray-500  bg-gray-50/50">
                      <th className="py-3 px-4">Role Title</th>
                      <th className="p-2">Department</th>
                      <th className="p-2 text-center">Total Staff</th>
                      <th className="p-2 text-center">Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {commonRoles.map((role, i) => {
                      const count = users.filter(u =>
                        (u.job_title && u.job_title.toLowerCase() === role.toLowerCase()) ||
                        (u.role && u.role.toLowerCase() === role.toLowerCase())
                      ).length;
                      return (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4  text-gray-900">{role}</td>
                          <td className="p-2 text-gray-600">IT Department</td>
                          <td className="p-2 text-center text-indigo-600 font-medium">
                            {count} Staff
                          </td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px]  ${count > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                              {count > 0 ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {activeTab === 'Skills Matrix' && (
          <div className="grid grid-cols-12 gap-6 mb-6">
            <div className="col-span-4 bg-white p-4 rounded border border-gray-100 flex flex-col">
              <h3 className="text-[13px]  text-gray-900 mb-4">Top Roles in Team</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(
                  users.reduce((acc, u) => {
                    const r = u.job_title || u.role || 'Member';
                    acc[r] = (acc[r] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([name, count], i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 border rounded border-indigo-100 bg-indigo-50 text-indigo-600">
                    <span className="text-xs">{name}</span>
                    <span className="text-[9px] opacity-80">{count}</span>
                  </div>
                ))}
                {users.length === 0 && (
                  <span className="text-xs text-gray-400">No active team members found.</span>
                )}
              </div>
            </div>

            <div className="col-span-8 bg-white rounded border border-gray-100 flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 bg-white rounded-t-xl">
                <h2 className="text-[13px]  text-gray-900">Skills & Designations Registry</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs  text-gray-500 bg-gray-50/50">
                      <th className="py-3 px-4">Resource</th>
                      <th className="p-2">Primary Skillset / Role</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {users.map((u, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4  text-gray-900">{`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'User'}</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] ">
                            {u.job_title || u.role || 'Member'}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded text-[9px]">Active Resource</span>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="3" className="py-8 text-center text-gray-500 text-xs">No resources found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Availability Calendar' && (
          <div className="bg-white rounded border border-gray-100 flex flex-col mb-6">
            <div className="px-5 py-4 border-b border-gray-100 bg-white rounded-t-xl">
              <h2 className="text-[13px]  text-gray-900">Resource Capacity & Calendar</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-xs  text-gray-500 bg-gray-50/50">
                    <th className="py-3 px-4">Member Name</th>
                    <th className="p-2">Weekly Allocated Hours</th>
                    <th className="p-2 text-center">Department</th>
                    <th className="p-2 text-center">Availability Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {users.map((u, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4  text-gray-900">{`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'User'}</td>
                      <td className="p-2 font-medium text-gray-700">40 Hours / week</td>
                      <td className="p-2 text-center text-gray-600">{u.department || 'IT Department'}</td>
                      <td className="p-2 text-center">
                        <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[9px]">Fully Available</span>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-gray-500 text-xs">No members found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Leave & Attendance' && (
          <div className="grid grid-cols-12 gap-6 mb-6">
            <div className="col-span-5 bg-white p-4 rounded border border-gray-100 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[13px]  text-gray-900">Upcoming Leaves Schedule</h3>
              </div>
              <div className="py-12 text-center text-gray-400 text-xs">
                No upcoming leaves scheduled.
              </div>
            </div>

            <div className="col-span-7 bg-white rounded border border-gray-100 flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 bg-white rounded-t-xl">
                <h2 className="text-[13px]  text-gray-900">Today's Attendance Registry</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs  text-gray-500 bg-gray-50/50">
                      <th className="py-3 px-4">Member</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {users.map((u, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4  text-gray-900">{`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'User'}</td>
                        <td className="p-2 text-center">
                          <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded-full text-[9px]">Offline</span>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="2" className="py-8 text-center text-gray-500 text-xs">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-full max-w-3xl shadow-xl border border-gray-200 overflow-y-auto max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
              <div>
                <h2 className="text-base  text-gray-900">{isEditMode ? 'Edit Team Details' : 'Create New Team'}</h2>
                <p className="text-[11px] text-gray-500">{isEditMode ? 'Modify team details, change the manager, or manage team allocations.' : 'Configure team properties, select the manager, and allocate team members.'}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditMode(false);
                  setSelectedTeamId(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              {/* Section 1: Team & Manager Information */}
              <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-100 mb-4">
                <div className="flex items-center gap-2 mb-3 text-xs  text-gray-900 border-b border-gray-100 pb-1.5">
                  <Briefcase size={14} className="text-indigo-600" />
                  <span>Team & Manager Information</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-700 font-medium mb-1">Team Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="Enter team name..."
                        className="w-full border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs bg-white"
                        value={newTeam.name}
                        onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-700 font-medium mb-1">Team Manager <span className="text-red-500">*</span></label>
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          placeholder="Search for manager..."
                          className="w-full border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs bg-white"
                          value={managerSearch}
                          onChange={(e) => {
                            setManagerSearch(e.target.value);
                            setActiveDropdown('manager');
                          }}
                          onFocus={() => setActiveDropdown('manager')}
                          required={!newTeam.manager_id}
                        />
                        {activeDropdown === 'manager' && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-auto">
                            {filteredManagers.length > 0 ? (
                              filteredManagers.map(u => (
                                <div
                                  key={u.id}
                                  className="p-2 hover:bg-gray-100 cursor-pointer flex flex-col text-left"
                                  onClick={() => {
                                    setNewTeam({ ...newTeam, manager_id: u.id, manager_role: 'Manager' });
                                    setManagerSearch(`${u.first_name} ${u.last_name}`);
                                    setActiveDropdown(null);
                                  }}
                                >
                                  <span className="text-xs  text-gray-900">{u.first_name} {u.last_name}</span>
                                  <span className="text-[10px] text-gray-500">{u.email}</span>
                                </div>
                              ))
                            ) : (
                              <div className="p-2 text-gray-500 text-xs">No users found</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div>
                    <label className="block text-xs text-gray-700 font-medium mb-1">Team Description</label>
                    <textarea
                      placeholder="Describe team focus, responsibilities, and department alignment..."
                      rows="5"
                      className="w-full border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs bg-white resize-none h-[106px]"
                      value={newTeam.description}
                      onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Allocate Team Member (Form) */}
              <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-100 mb-4">
                <div className="flex items-center gap-2 mb-3 text-xs  text-gray-900 border-b border-gray-100 pb-1.5">
                  <UserPlus size={14} className="text-emerald-600" />
                  <span>Allocate Team Member</span>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  {/* Select Member Column */}
                  <div className="col-span-5 relative" onClick={(e) => e.stopPropagation()}>
                    <label className="block text-xs text-gray-700 font-medium mb-1">Select Member Name</label>
                    <input
                      type="text"
                      placeholder="Search member name..."
                      className="w-full border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs bg-white"
                      value={memberFormUserName}
                      onChange={(e) => {
                        setMemberFormUserName(e.target.value);
                        setMemberFormUserSearchActive(true);
                        setMemberFormUserId(''); // Reset ID if they type manually
                      }}
                      onFocus={() => setMemberFormUserSearchActive(true)}
                    />
                    {memberFormUserSearchActive && (
                      <div className="absolute z-30 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-auto">
                        {deptUsers.filter(u =>
                          `${u.first_name} ${u.last_name}`.toLowerCase().includes(memberFormUserName.toLowerCase()) ||
                          u.email.toLowerCase().includes(memberFormUserName.toLowerCase())
                        ).map(u => (
                          <div
                            key={u.id}
                            className="px-2 py-1.5 hover:bg-gray-100 cursor-pointer flex flex-col text-left"
                            onClick={() => {
                              setMemberFormUserId(u.id);
                              setMemberFormUserName(`${u.first_name} ${u.last_name}`);
                              setMemberFormUserEmail(u.email);
                              setMemberFormUserSearchActive(false);
                            }}
                          >
                            <span className="text-xs  text-gray-900">{u.first_name} {u.last_name}</span>
                            <span className="text-[10px] text-gray-500">{u.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Member Role Column */}
                  <div className="col-span-5 relative" onClick={(e) => e.stopPropagation()}>
                    <label className="block text-xs text-gray-700 font-medium mb-1">Assign Role</label>
                    <input
                      type="text"
                      placeholder="Role (e.g., Frontend Developer)"
                      className="w-full border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs bg-white"
                      value={memberFormRole}
                      onChange={(e) => {
                        setMemberFormRole(e.target.value);
                        setMemberFormRoleSearchActive(true);
                      }}
                      onFocus={() => setMemberFormRoleSearchActive(true)}
                    />
                    {memberFormRoleSearchActive && (
                      <div className="absolute z-30 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-auto">
                        {commonRoles.filter(role =>
                          role.toLowerCase().includes(memberFormRole.toLowerCase())
                        ).map(role => (
                          <div
                            key={role}
                            className="px-2 py-1.5 hover:bg-gray-100 cursor-pointer text-xs text-left"
                            onClick={() => {
                              setMemberFormRole(role);
                              setMemberFormRoleSearchActive(false);
                            }}
                          >
                            {role}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Button Column */}
                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={addMemberToList}
                      className="w-full p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs  flex items-center justify-center gap-1 transition-colors h-8"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 3: Allocated Members Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                  <span className="text-xs  text-gray-900">Allocated Members List ({newTeam.members.length})</span>
                </div>

                <div className="overflow-x-auto max-h-48 custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 bg-gray-50/50  sticky top-0">
                        <th className="py-2.5 px-3 w-10">#</th>
                        <th className="p-2">Member Name</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Role</th>
                        <th className="py-2 px-3 text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newTeam.members.length > 0 ? (
                        newTeam.members.map((m, idx) => (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                            <td className="py-2.5 px-3 text-gray-500 font-medium">{idx + 1}</td>
                            <td className="p-2  text-gray-900">{m.userName}</td>
                            <td className="p-2 text-gray-500">{m.email}</td>
                            <td className="p-2 text-gray-700">{m.role}</td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeMemberField(idx)}
                                className="p-1 hover:bg-red-50 text-red-500 rounded transition-colors"
                                title="Remove member"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-gray-400 font-medium bg-white">
                            No members added yet. Use the form above to add your first member.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 4: Assign IT Project (Form) */}
              <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-100 mb-4">
                <div className="flex items-center gap-2 mb-3 text-xs  text-gray-900 border-b border-gray-100 pb-1.5">
                  <Folder size={14} className="text-indigo-600" />
                  <span>Assign IT Project</span>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  {/* Select IT Project Column */}
                  <div className="col-span-10">
                    <label className="block text-xs text-gray-700 font-medium mb-1">Select IT Project</label>
                    <select
                      className="w-full border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none text-xs bg-white h-[34px]"
                      value={projectFormId}
                      onChange={(e) => setProjectFormId(e.target.value)}
                    >
                      <option value="">Choose Project...</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Add Button Column */}
                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={addProjectToList}
                      className="w-full p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs  flex items-center justify-center gap-1 transition-colors h-[34px]"
                    >
                      <Plus size={14} /> Add Project
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 5: Assigned Projects List Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                  <span className="text-xs  text-gray-900">Assigned Projects List ({newTeam.project_ids?.length || 0})</span>
                </div>

                <div className="overflow-x-auto max-h-48 custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 bg-gray-50/50  sticky top-0">
                        <th className="py-2.5 px-3 w-10">#</th>
                        <th className="p-2">Project Name</th>
                        <th className="p-2">Status</th>
                        <th className="py-2 px-3 text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newTeam.project_ids && newTeam.project_ids.length > 0 ? (
                        newTeam.project_ids.map((projId, idx) => {
                          const p = projects.find(project => project.id === projId);
                          return (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                              <td className="py-2.5 px-3 text-gray-500 font-medium">{idx + 1}</td>
                              <td className="p-2  text-gray-900">{p ? p.name : `Project ID: ${projId}`}</td>
                              <td className="p-2">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] ">
                                  {p?.status || 'Planning'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeProjectFromList(projId)}
                                  className="p-1 hover:bg-red-55 text-red-500 rounded transition-colors"
                                  title="Remove project"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-gray-400 font-medium bg-white">
                            No projects assigned yet. Use the form above to assign your first IT project.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditMode(false);
                    setSelectedTeamId(null);
                  }}
                  className="px-4 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs "
                >
                  {isEditMode ? 'Update Team' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-2 w-full max-w-md shadow-xl">
            <h2 className="text-xl  mb-2">Add Member to {selectedTeam?.name}</h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs  text-gray-700 mb-1">Select User</label>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Search for user..."
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none text-xs"
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setActiveDropdown('member');
                    }}
                    onFocus={() => setActiveDropdown('member')}
                    required={!newMember.user_id}
                  />
                  {activeDropdown === 'member' && (
                    <div className="absolute z-10 w-full mt-1 bg-white border text-xs border-gray-300 rounded shadow-lg max-h-60 overflow-auto">
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map(u => (
                          <div
                            key={u.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer flex flex-col"
                            onClick={() => {
                              setNewMember({ ...newMember, user_id: u.id });
                              setMemberSearch(`${u.first_name} ${u.last_name}`);
                              setActiveDropdown(null);
                            }}
                          >
                            <span className=" text-sm">{u.first_name} {u.last_name}</span>
                            <span className="text-xs text-gray-500">{u.email}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-gray-500 text-sm">No users found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-1">Role in Team</label>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Search or type role..."
                    className="w-full border border-gray-300 rounded p-2 text-xs focus:ring-2 focus:ring-red-500 outline-none"
                    value={memberRoleSearch}
                    onChange={(e) => {
                      setMemberRoleSearch(e.target.value);
                      setNewMember({ ...newMember, role: e.target.value });
                      setActiveDropdown('memberRole');
                    }}
                    onFocus={() => setActiveDropdown('memberRole')}
                    required
                  />
                  {activeDropdown === 'memberRole' && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-auto">
                      {filteredMemberRoles.length > 0 ? (
                        filteredMemberRoles.map(role => (
                          <div
                            key={role}
                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => {
                              setNewMember({ ...newMember, role: role });
                              setMemberRoleSearch(role);
                              setActiveDropdown(null);
                            }}
                          >
                            {role}
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-gray-500 text-sm">Type to create custom role</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="flex-1 p-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white p-2 rounded hover:bg-red-700 text-xs"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Project Modal */}
      {isAssignProjectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-4 w-full max-w-md shadow-xl border border-gray-150">
            <h2 className="text-sm  text-gray-900 mb-4 pb-2 border-b border-gray-100">
              {selectedTeam ? `Assign Project to ${selectedTeam.name}` : 'Assign Project to Team'}
            </h2>
            <form onSubmit={handleAssignProject} className="space-y-4">

              {!selectedTeam && (
                <div>
                  <label className="block text-xs  text-gray-700 mb-1.5">Select Team <span className="text-red-500">*</span></label>
                  <select
                    required
                    className="w-full border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none text-xs bg-white"
                    value={projectAssignment.team_id || ''}
                    onChange={e => setProjectAssignment(prev => ({ ...prev, team_id: e.target.value }))}
                  >
                    <option value="">Select Team</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Show Currently Assigned Projects */}
              {(() => {
                const activeTeamId = selectedTeam?.id || projectAssignment.team_id;
                if (!activeTeamId) return null;
                const assignedProjects = projects.filter(p => String(p.team_id) === String(activeTeamId));
                return (
                  <div className="bg-gray-50 rounded p-3 border border-gray-100">
                    <h3 className="text-[11px]  text-gray-700 mb-2 uppercase tracking-wider">Currently Assigned Projects</h3>
                    {assignedProjects.length > 0 ? (
                      <ul className="text-xs text-gray-600 space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                        {assignedProjects.map(p => (
                          <li key={p.id} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                            <span className="truncate">{p.name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-gray-400 italic">No projects assigned yet</div>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs  text-gray-700 mb-1.5">Select IT Project to Assign <span className="text-red-500">*</span></label>
                <select
                  required
                  className="w-full border border-gray-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none text-xs bg-white"
                  value={projectAssignment.project_id}
                  onChange={e => setProjectAssignment(prev => ({ ...prev, project_id: e.target.value }))}
                >
                  <option value="">Select Project</option>
                  {projects.filter(p => {
                    const activeTeamId = selectedTeam?.id || projectAssignment.team_id;
                    return String(p.team_id) !== String(activeTeamId);
                  }).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-6 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAssignProjectModalOpen(false);
                    setProjectAssignment({ project_id: '', team_id: '' });
                    setSelectedTeam(null);
                  }}
                  className="flex-1 p-2 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700 "
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white p-2 rounded hover:bg-red-700 text-xs "
                >
                  Assign Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* View Team Modal */}
      {isViewModalOpen && selectedTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-full max-w-xl shadow-xl border border-gray-150 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-150">
              <div className="flex items-center gap-2">
                <Users className="text-indigo-600" size={18} />
                <h2 className="text-sm  text-gray-900">Team Profile: {selectedTeam.name}</h2>
              </div>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedTeam(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Manager & Description Section */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                <div>
                  <h3 className=" text-gray-500 uppercase text-[9px] tracking-wider mb-1">Team Manager</h3>
                  {(() => {
                    const manager = users.find(u => u.id === selectedTeam.manager_id);
                    return manager ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-[11px] ">
                          {manager.first_name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className=" text-gray-800">{manager.first_name} {manager.last_name}</p>
                          <p className="text-[10px] text-gray-500">{manager.email}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-400  italic mt-1">No manager assigned</p>
                    );
                  })()}
                </div>
                <div>
                  <h3 className=" text-gray-500 uppercase text-[9px] tracking-wider mb-1">Team Description</h3>
                  <p className="text-gray-700 leading-relaxed  mt-1">
                    {selectedTeam.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              {/* Members Section */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className=" text-gray-900 uppercase text-[9px] tracking-wider">Allocated Members ({selectedTeam.members?.length || 0})</h3>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 bg-gray-50/20">
                        <th className="py-2 px-3 ">Member Name</th>
                        <th className="py-2 px-3 ">Role</th>
                        <th className="py-2 px-3 ">Email</th>
                        <th className="py-2 px-3 text-center ">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTeam.members && selectedTeam.members.length > 0 ? (
                        selectedTeam.members.map((member, i) => {
                          const user = users.find(u => u.id === member.user_id);
                          return (
                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                              <td className="py-2.5 px-3  text-gray-800">
                                {user ? `${user.first_name} ${user.last_name}` : `User ID: ${member.user_id}`}
                              </td>
                              <td className="py-2.5 px-3 text-gray-600 ">{member.role}</td>
                              <td className="py-2.5 px-3 text-gray-500">{user?.email || '—'}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[9px] ">Active</span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="4" className="py-4 text-center text-gray-400">No members allocated to this team.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Projects Section */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className=" text-gray-900 uppercase text-[9px] tracking-wider">Assigned Projects</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeam(selectedTeam);
                      setIsAssignProjectModalOpen(true);
                      setIsViewModalOpen(false);
                    }}
                    className="text-[11px] text-emerald-600 hover:text-emerald-800  flex items-center gap-1 focus:outline-none"
                  >
                    <Plus size={12} /> Assign Project
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 bg-gray-50/20">
                        <th className="py-2 px-3 ">Project Name</th>
                        <th className="py-2 px-3 ">Status</th>
                        <th className="py-2 px-3 text-right pr-6 ">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const teamProjects = projects.filter(p => p.team_id === selectedTeam.id);
                        return teamProjects.length > 0 ? (
                          teamProjects.map(p => (
                            <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                              <td className="py-2.5 px-3  text-gray-800">{p.name}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] ">
                                  {p.status || 'Planning'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right pr-6">
                                <button
                                  onClick={() => {
                                    setIsViewModalOpen(false);
                                    navigate(`/projects/${designation || 'it-manager'}/${username || 'ashwini'}/details/${p.id}`);
                                  }}
                                  className="p-1 hover:bg-indigo-50 text-indigo-650 rounded transition-colors inline-flex items-center gap-1  text-[10px] focus:outline-none"
                                  title="View Project Details"
                                >
                                  <Eye size={12} /> View Project
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" className="py-4 text-center text-gray-400">No projects currently assigned to this team.</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-gray-150">
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedTeam(null);
                }}
                className="px-4 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700 "
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ITTeamsPage;

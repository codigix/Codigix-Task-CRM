import React, { useState, useEffect } from 'react';
import { Calendar, RotateCcw, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { projectAPI, leadsAPI, dealsAPI, companiesAPI } from '../../services/api';
import RecentProjectsTable from './RecentProjectsTable';
import ProjectByStageChart from './ProjectByStageChart';
import ProjectsByStageChart from './ProjectsByStageChart';
import LeadsByStageChart from '../sales/LeadsByStageChart';
import WonDealsChart from '../sales/WonDealsChart';
import ProjectKPISummary from './ProjectKPISummary';
import TasksKanban from './TasksKanban';
import { useAuth } from '../../hooks/useAuth';

const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const calendarPresets = ['Today', 'Yesterday', 'Last 7 Days', 'Last 15 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Custom Range'];

const formatISODate = (date) => date.toISOString().split('T')[0];

const addDays = (date, amount) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

const rangeFromDays = (days) => {
  const end = new Date();
  const start = addDays(end, -(days - 1));
  return { startDate: formatISODate(start), endDate: formatISODate(end) };
};

const getPresetRange = (label) => {
  const today = new Date();
  switch (label) {
    case 'Today':
      return { startDate: formatISODate(today), endDate: formatISODate(today) };
    case 'Yesterday': {
      const day = addDays(today, -1);
      return { startDate: formatISODate(day), endDate: formatISODate(day) };
    }
    case 'Last 7 Days':
      return rangeFromDays(7);
    case 'Last 15 Days':
      return rangeFromDays(15);
    case 'Last 30 Days':
      return rangeFromDays(30);
    case 'This Month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: formatISODate(start), endDate: formatISODate(today) };
    }
    case 'Last Month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: formatISODate(start), endDate: formatISODate(end) };
    }
    default:
      return null;
  }
};

const normalizeRange = (range) => ({
  startDate: range?.startDate || null,
  endDate: range?.endDate || null,
});

const buildMonthMatrix = (date) => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(date.getFullYear(), date.getMonth(), day));
  }
  while (cells.length < 42) {
    cells.push(null);
  }
  return cells;
};

const formatReadableDate = (iso) => {
  if (!iso) {
    return '';
  }
  return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: '2-digit' }).format(new Date(iso));
};

const formatReadableRange = (range) => {
  if (!range?.startDate || !range?.endDate) {
    return '';
  }
  return `${formatReadableDate(range.startDate)} - ${formatReadableDate(range.endDate)}`;
};

const ProjectsDashboard = ({ onViewProjectDetails, onViewCompanyDetails, department }) => {
  const { user } = useAuth();
  const [allProjects, setAllProjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [leads, setLeads] = useState([]);
  const [allDeals, setAllDeals] = useState([]);
  const [deals, setDeals] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(() => normalizeRange(getPresetRange('Last 30 Days')));
  const [pendingRange, setPendingRange] = useState(() => normalizeRange(getPresetRange('Last 30 Days')));
  const [activePreset, setActivePreset] = useState('Last 30 Days');
  const [showCalendarPanel, setShowCalendarPanel] = useState(false);
  const [isSelectingEnd, setIsSelectingEnd] = useState(false);
  const [hoverDate, setHoverDate] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  useEffect(() => {
    fetchAllData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (department) {
      const filteredProjects = allProjects.filter(p =>
        (department === 'Marketing' && (p.category === 'Marketing' || p.projectType === 'Marketing' || p.serviceType === 'Marketing')) ||
        (department === 'IT' && (p.category === 'IT' || p.projectType === 'IT' || p.serviceType === 'IT' || p.category === 'Software'))
      );
      setProjects(filteredProjects);

      const filteredLeads = allLeads.filter(l =>
        (department === 'Marketing' && (l.industry === 'Marketing' || l.leadType === 'Marketing' || l.source === 'Marketing')) ||
        (department === 'IT' && (l.industry === 'IT' || l.industry === 'Technology' || l.leadType === 'IT' || l.source === 'IT' || l.itServices))
      );
      setLeads(filteredLeads);

      const filteredDeals = allDeals.filter(d =>
        (department === 'Marketing' && (d.pipeline === 'Marketing' || d.pipeline === 'Marketing Pipeline' || (d.name && d.name.toLowerCase().includes('marketing')) || (d.name && d.name.toLowerCase().includes('campaign')))) ||
        (department === 'IT' && (d.pipeline === 'IT' || d.pipeline === 'IT Pipeline' || (d.name && d.name.toLowerCase().includes('it')) || (d.name && d.name.toLowerCase().includes('tech')) || (d.name && d.name.toLowerCase().includes('software')) || (d.name && d.name.toLowerCase().includes('cloud'))))
      );
      setDeals(filteredDeals);
    } else {
      setProjects(allProjects);
      setLeads(allLeads);
      setDeals(allDeals);
    }
  }, [allProjects, allLeads, allDeals, department]);

  const transformProject = (project) => ({
    id: project.id,
    name: project.name || project.title || '',
    company: project.company_name || project.company || '',
    priority: project.priority || 'Medium',
    dueDate: project.due_date || project.dueDate || '',
    startDate: project.start_date || project.startDate || '',
    stage: project.status || project.stage || '',
    status: project.status || project.stage || '',
    budget: project.budget || project.price || 0,
    description: project.description || '',
    projectType: project.project_type || project.projectType || '',
    category: project.category || '',
    projectTiming: project.project_timing || project.projectTiming || '',
    responsiblePersons: (() => {
      try {
        if (typeof project.responsible_persons === 'string') {
          return JSON.parse(project.responsible_persons || '[]');
        }
        return project.responsible_persons || [];
      } catch (e) {
        return [];
      }
    })(),
    teamLeader: project.team_leader || project.teamLeader || '',
    createdAt: project.created_at ? new Date(project.created_at).toISOString().split('T')[0] : '',
  });

  const transformLead = (lead) => ({
    id: lead.id,
    name: lead.name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    company: lead.company || '',
    source: lead.source || '',
    status: lead.status || '',
    rating: lead.rating || 0,
    industry: lead.industry || '',
    leadType: lead.lead_type || lead.leadType || '',
    itServices: lead.it_services || '',
    createdAt: lead.created_at ? new Date(lead.created_at).toISOString().split('T')[0] : '',
  });

  const transformDeal = (deal) => ({
    id: deal.id,
    name: deal.deal_name || '',
    company: deal.company_name || '',
    contact: deal.first_name && deal.last_name ? `${deal.first_name} ${deal.last_name}` : deal.first_name || '',
    stage: deal.deal_stage || deal.stage || '',
    pipeline: deal.pipeline || '',
    value: parseFloat(deal.deal_value) || 0,
    status: deal.status || '',
    probability: deal.probability || 0,
    createdAt: deal.created_at ? new Date(deal.created_at).toISOString().split('T')[0] : '',
    expectedCloseDate: deal.expected_close_date ? new Date(deal.expected_close_date).toISOString().split('T')[0] : '',
  });

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [projectsRes, leadsRes, dealsRes, companiesRes] = await Promise.all([
        projectAPI.getAll().catch(() => []),
        leadsAPI.getAll().catch(() => []),
        dealsAPI.getAll().catch(() => []),
        companiesAPI.getAll().catch(() => []),
      ]);

      const transformedProjects = Array.isArray(projectsRes) ? projectsRes.map(transformProject) : [];
      const transformedLeads = Array.isArray(leadsRes) ? leadsRes.map(transformLead) : [];
      const transformedDeals = Array.isArray(dealsRes) ? dealsRes.map(transformDeal) : [];
      const transformedCompanies = Array.isArray(companiesRes) ? companiesRes : [];

      setAllProjects(transformedProjects);
      setAllLeads(transformedLeads);
      setAllDeals(transformedDeals);
      setCompanies(transformedCompanies);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setAllProjects([]);
      setAllLeads([]);
      setAllDeals([]);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const updateDateRange = (range, presetLabel = 'Custom Range') => {
    const normalized = normalizeRange(range);
    setDateRange(normalized);
    setPendingRange(normalized);
    setActivePreset(presetLabel);
    setIsSelectingEnd(false);
    setHoverDate(null);
  };

  const handleDateRangeChange = (range) => {
    if (!range) {
      return;
    }
    updateDateRange(range);
  };

  const handleCompanyDetailsView = (companyName) => {
    if (!companyName || !onViewCompanyDetails) {
      return;
    }
    const companyRecord = companies.find((company) => company.name === companyName);
    onViewCompanyDetails(companyRecord || { name: companyName });
  };

  const openCalendarPanel = () => {
    setPendingRange(normalizeRange(dateRange));
    setShowCalendarPanel(true);
    setCalendarMonth(dateRange?.startDate ? new Date(dateRange.startDate) : new Date());
    setIsSelectingEnd(false);
    setHoverDate(null);
  };

  const closeCalendarPanel = () => {
    setShowCalendarPanel(false);
    setPendingRange(normalizeRange(dateRange));
    setIsSelectingEnd(false);
    setHoverDate(null);
  };

  const handlePresetSelect = (label) => {
    const presetRange = getPresetRange(label);
    if (presetRange) {
      updateDateRange(presetRange, label);
      setShowCalendarPanel(false);
      return;
    }
    setActivePreset(label);
    setPendingRange({ startDate: null, endDate: null });
    setIsSelectingEnd(false);
    setHoverDate(null);
  };

  const handleDayClick = (dateObj) => {
    if (!dateObj) {
      return;
    }
    const iso = formatISODate(dateObj);
    if (!pendingRange?.startDate || pendingRange.endDate || !isSelectingEnd) {
      setPendingRange({ startDate: iso, endDate: null });
      setIsSelectingEnd(true);
      setActivePreset('Custom Range');
      return;
    }
    const startDate = new Date(pendingRange.startDate);
    if (dateObj < startDate) {
      setPendingRange({ startDate: iso, endDate: pendingRange.startDate });
    } else {
      setPendingRange({ startDate: pendingRange.startDate, endDate: iso });
    }
    setIsSelectingEnd(false);
    setHoverDate(null);
  };

  const handleDayHover = (dateObj) => {
    if (!isSelectingEnd || !pendingRange?.startDate || !dateObj) {
      return;
    }
    setHoverDate(formatISODate(dateObj));
  };

  const isDateWithinPendingRange = (dateObj) => {
    if (!pendingRange?.startDate) {
      return false;
    }
    const comparison = pendingRange.endDate || (isSelectingEnd && hoverDate ? hoverDate : null);
    if (!comparison) {
      return false;
    }
    const start = new Date(pendingRange.startDate);
    const end = new Date(comparison);
    const min = start <= end ? start : end;
    const max = start <= end ? end : start;
    return dateObj >= min && dateObj <= max;
  };

  const handleApplyCustomRange = () => {
    if (pendingRange?.startDate && pendingRange?.endDate) {
      updateDateRange(pendingRange, 'Custom Range');
      setShowCalendarPanel(false);
    }
  };

  const handleMonthShift = (direction) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };

  const handleRefresh = () => {
    fetchAllData();
  };

  const handleExport = () => {
    if (!projects.length) {
      return;
    }
    const headers = ['ID', 'Name', 'Company', 'Priority', 'Due Date', 'Stage', 'Status'];
    const rows = projects.map((project) => [
      project.id,
      project.name,
      project.company,
      project.priority,
      project.dueDate,
      project.stage,
      project.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'projects-export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleAddProject = async (formData) => {
    try {
      const payload = {
        name: formData.name,
        projectId: formData.projectId,
        projectType: formData.projectType,
        client: formData.client,
        category: formData.category,
        projectTiming: formData.projectTiming,
        budget: formData.price,
        responsiblePersons: JSON.stringify(formData.responsiblePersons),
        teamLeader: formData.teamLeader,
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        priority: formData.priority,
        status: formData.status || 'Planning',
        description: formData.description,
      };
      const response = await projectAPI.create(payload);
      const newProject = transformProject(response);
      setAllProjects(prev => [newProject, ...prev]);
    } catch (err) {
      console.error('Failed to add project:', err);
      // Fallback for demo if API fails
      const newProject = {
        id: projects.length + 1,
        name: formData.name,
        company: formData.client,
        priority: formData.priority,
        dueDate: formData.dueDate,
        stage: 'Planning',
        status: formData.status,
        ...formData,
      };
      setAllProjects(prev => [newProject, ...prev]);
    }
  };

  const handleEditProject = async (projectId, formData) => {
    try {
      const payload = {
        name: formData.name,
        projectId: formData.projectId,
        projectType: formData.projectType,
        client: formData.client,
        category: formData.category,
        projectTiming: formData.projectTiming,
        budget: formData.price,
        responsiblePersons: JSON.stringify(formData.responsiblePersons),
        teamLeader: formData.teamLeader,
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        priority: formData.priority,
        status: formData.status,
        description: formData.description,
      };
      const response = await projectAPI.update(projectId, payload);
      const updatedProject = transformProject(response);
      setAllProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
    } catch (err) {
      console.error('Failed to edit project:', err);
      // Fallback for demo
      setAllProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...formData, company: formData.client, budget: formData.price } : p));
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await projectAPI.delete(projectId);
      setAllProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Failed to delete project:', err);
      // Even if API fails, update UI for demo purposes
      setAllProjects(prev => prev.filter(p => p.id !== projectId));
    }
  };

  const renderMonth = (baseDate) => {
    const cells = buildMonthMatrix(baseDate);
    return (
      <div className="flex-1">
        <div className="text-xs   text-gray-900 text-center mb-2">
          {baseDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 mb-2">
          {dayLabels.map((day) => (
            <div key={`${day}-${baseDate.getMonth()}`} className="text-center    tracking-wide">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs ">
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${baseDate.getMonth()}-${idx}`} className="h-8" />;
            }
            const iso = formatISODate(cell);
            const isStart = pendingRange?.startDate === iso;
            const isEnd = pendingRange?.endDate === iso;
            const inRange = isDateWithinPendingRange(cell);
            return (
              <button
                key={`${iso}-${idx}`}
                type="button"
                onClick={() => handleDayClick(cell)}
                onMouseEnter={() => handleDayHover(cell)}
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${isStart || isEnd
                    ? 'bg-red-500 text-white'
                    : inRange
                      ? 'bg-red-100 text-red '
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                {cell.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const headerRangeLabel = formatReadableRange(dateRange) || 'Select Range';
  const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);

  return (
    <div className="p-2 bg-[#F7F8F9] min-h-screen">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between animate-fade-in">
        <div>
          <h1 className="text-[1.250025rem]  text-gray-900 text-color-transition">Project Dashboard</h1>
          {headerRangeLabel && <p className="text-gray-600 text-xs ">{headerRangeLabel}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCalendarPanel}
            className="flex items-center gap-2 border border-border-light rounded  bg-white p-2 text-xs    text-gray-700 hover:border-red-500 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            title="Select date range"
          >
            <Calendar size={16} />
            <span className="whitespace-nowrap">{headerRangeLabel}</span>
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="h-10 w-10 flex items-center justify-center rounded  border border-border-light text-gray-600 hover:border-red-500 hover:text-red-500 transition-colors"
            title="Refresh"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="h-10 w-10 flex items-center justify-center rounded  border border-border-light text-gray-600 hover:border-red-500 hover:text-red-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            title="Export"
            disabled={!projects.length}
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      <ProjectKPISummary projects={projects} />

      {(user?.role === 'Employee' || user?.role === 'Project Manager') && (
        <div className="mb-6 animate-fade-in">
          <TasksKanban />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-6">
        <div className="chart-container col-span-2 transition-smooth">
          <RecentProjectsTable
            projects={projects}
            onDateRangeChange={handleDateRangeChange}
            onAddProject={handleAddProject}
            onEditProject={handleEditProject}
            onDeleteProject={handleDeleteProject}
            onViewProjectDetails={onViewProjectDetails}
            onViewCompanyDetails={handleCompanyDetailsView}
          />
        </div>
        <div className="chart-container col-span-1 transition-smooth">
          <ProjectByStageChart projects={projects} onDateRangeChange={handleDateRangeChange} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-6">
        <div className="chart-container transition-smooth">
          <ProjectsByStageChart projects={projects} onDateRangeChange={handleDateRangeChange} />
        </div>
        <div className="chart-container transition-smooth">
          <LeadsByStageChart leads={leads} onDateRangeChange={handleDateRangeChange} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 mb-6">
        <div className="chart-container transition-smooth">
          <WonDealsChart deals={deals} onDateRangeChange={handleDateRangeChange} />
        </div>
      </div>



      {showCalendarPanel && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black bg-opacity-25" onClick={closeCalendarPanel}></div>
          <div className="absolute right-8 top-24 w-[720px] bg-white rounded  overflow-hidden animate-fade-in p-2">
            <div className="flex">
              <div className="w-48 bg-gray-50 border-r border-gray-100 py-4">
                {calendarPresets.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handlePresetSelect(label)}
                    className={`w-full text-left p-2  text-xs  ${activePreset === label ? 'bg-red-500 text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex-1 p-2">
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => handleMonthShift(-1)}
                    className="p-2 rounded  text-gray-600 hover:bg-gray-100"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="text-xs   text-gray-900">
                    {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })} – {nextMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMonthShift(1)}
                    className="p-2 rounded  text-gray-600 hover:bg-gray-100"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="flex gap-2">
                  {renderMonth(calendarMonth)}
                  {renderMonth(nextMonth)}
                </div>
                <div className="flex gap-3 mt-6 justify-end">
                  <button
                    type="button"
                    onClick={closeCalendarPanel}
                    className="p-2  text-xs    text-gray-700 border border-border-light rounded  hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCustomRange}
                    className="p-2  text-xs    text-white bg-red-500 rounded  hover:bg-red-600"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsDashboard;

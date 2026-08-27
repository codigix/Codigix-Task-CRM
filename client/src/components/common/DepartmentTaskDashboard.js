import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, AlertCircle, Clock, Users, Filter } from 'lucide-react';

const DepartmentTaskDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, deptRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/departments')
      ]);

      const tasksData = await tasksRes.json();
      const deptData = await deptRes.json();

      setTasks(tasksData);
      setDepartments(deptData);
      if (deptData.length > 0) setSelectedDept(deptData[0].id);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Review': return 'bg-purple-100 text-purple-800';
      case 'To Do': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return <CheckCircle size={16} />;
      case 'In Progress': return <Clock size={16} />;
      case 'Review': return <AlertCircle size={16} />;
      default: return <Circle size={16} />;
    }
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date() && dueDate;
  };

  const filteredTasks = tasks.filter(task => {
    const matchesDept = selectedDept ? task.department_id === selectedDept : true;
    const matchesStatus = filterStatus === 'all' ? true : task.status === filterStatus;
    return matchesDept && matchesStatus;
  });

  const statusGroups = {
    'To Do': filteredTasks.filter(t => t.status === 'To Do'),
    'In Progress': filteredTasks.filter(t => t.status === 'In Progress'),
    'Review': filteredTasks.filter(t => t.status === 'Review'),
    'Completed': filteredTasks.filter(t => t.status === 'Completed')
  };

  const TaskCard = ({ task }) => (
    <div className={`p-3 rounded  border-l-4 ${isOverdue(task.due_date) ? 'bg-red-50 border-red-500' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon(task.status)}
            <p className=" text-sm text-gray-800">{task.title}</p>
          </div>
          <p className="text-xs text-gray-600 mb-2">{task.description}</p>
          <div className="flex gap-2 items-center text-xs">
            {task.due_date && (
              <span className={isOverdue(task.due_date) ? 'text-red  ' : 'text-gray-500'}>
                📅 {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
            {task.priority && (
              <span className={`p-1  rounded ${task.priority === 'High' ? 'bg-red-100 text-red-700' :
                  task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                }`}>
                {task.priority}
              </span>
            )}
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs  whitespace-nowrap ${getStatusColor(task.status)}`}>
          {task.status}
        </span>
      </div>
    </div>
  );

  if (loading) {
    return <div className="text-center py-10">Loading Department Tasks...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl   text-gray-900">Department Task Dashboard</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2 bg-red-600  text-white rounded  text-sm hover:bg-blue-700"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded p-2   border border-gray-200 space-y-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-sm  text-gray-700 mb-1">Department</label>
            <select
              value={selectedDept || ''}
              onChange={(e) => setSelectedDept(e.target.value ? parseInt(e.target.value) : null)}
              className="p-2 border border-gray-300 rounded  text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm  text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2 border border-gray-300 rounded  text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Review">Review</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="flex gap-2 text-sm">
            <span className=" text-gray-700">Total: {filteredTasks.length}</span>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(statusGroups).map(([status, statusTasks]) => (
          <div key={status} className="bg-gray-50 rounded p-2   border border-gray-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <h3 className={` text-sm flex items-center gap-2 ${getStatusColor(status).split(' ')[0]} px-2 py-1 rounded`}>
                {getStatusIcon(status)}
                {status}
              </h3>
              <span className="bg-white rounded-full p-1  text-xs  text-gray-700">
                {statusTasks.length}
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {statusTasks.length > 0 ? (
                statusTasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))
              ) : (
                <p className="text-center text-sm text-gray-500 py-4">No tasks</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded p-2   border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">To Do</div>
          <div className="text-3xl   text-gray-900">{statusGroups['To Do'].length}</div>
        </div>
        <div className="bg-white rounded p-2   border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">In Progress</div>
          <div className="text-3xl   text-white ">{statusGroups['In Progress'].length}</div>
        </div>
        <div className="bg-white rounded p-2   border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">In Review</div>
          <div className="text-3xl   text-purple-600">{statusGroups['Review'].length}</div>
        </div>
        <div className="bg-white rounded p-2   border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Completed</div>
          <div className="text-3xl   text-green-600">{statusGroups['Completed'].length}</div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentTaskDashboard;

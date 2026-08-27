import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const EmployeeDailyAllocation = () => {
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, taskRes, deptRes] = await Promise.all([
        fetch('/api/users'),
        fetch(`/api/tasks?skip=0&limit=1000`),
        fetch('/api/departments')
      ]);

      const empData = await empRes.json();
      const taskData = await taskRes.json();
      const deptData = await deptRes.json();

      setEmployees(empData);
      setTasks(taskData);
      setDepartments(deptData);
      if (deptData.length > 0) setSelectedDept(deptData[0].id);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTasksForEmployee = (empId) => {
    return tasks.filter(task => {
      try {
        let assigned = task.assigned_to;
        if (typeof assigned === 'string') {
          assigned = JSON.parse(assigned || '[]');
        }
        if (Array.isArray(assigned)) {
          return assigned.includes(empId) && task.due_date === selectedDate;
        }
        return (assigned === empId || String(assigned) === String(empId)) && task.due_date === selectedDate;
      } catch {
        return false;
      }
    });
  };

  const getEmployeesByDept = () => {
    if (!selectedDept) return employees;
    return employees.filter(emp => emp.department_id === selectedDept);
  };

  const getTotalTaskHours = (tasks) => {
    return tasks.length * 1; // Assuming 1 hour per task average
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return <CheckCircle size={16} className="text-green-600" />;
      case 'In Progress': return <Clock size={16} className="text-white " />;
      default: return <AlertCircle size={16} className="text-gray-600" />;
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading allocation data...</div>;
  }

  const deptEmployees = getEmployeesByDept();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl   text-gray-900">Daily Task Allocation</h2>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm  text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm  text-gray-700 mb-1">Department</label>
            <select
              value={selectedDept || ''}
              onChange={(e) => setSelectedDept(e.target.value ? parseInt(e.target.value) : null)}
              className="p-2 border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded p-2   border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Employees</p>
          <p className="text-3xl   text-gray-900">{deptEmployees.length}</p>
        </div>
        <div className="bg-white rounded p-2   border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Tasks Assigned</p>
          <p className="text-3xl   text-white ">
            {deptEmployees.reduce((sum, emp) => sum + getTasksForEmployee(emp.id).length, 0)}
          </p>
        </div>
        <div className="bg-white rounded p-2   border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">High Priority Tasks</p>
          <p className="text-3xl   text-red ">
            {tasks.filter(t => t.priority === 'High' && t.due_date === selectedDate).length}
          </p>
        </div>
        <div className="bg-white rounded p-2   border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Est. Workload</p>
          <p className="text-3xl   text-purple-600">
            {Math.round(deptEmployees.reduce((sum, emp) => sum + getTotalTaskHours(getTasksForEmployee(emp.id)), 0))} hrs
          </p>
        </div>
      </div>

      {/* Employee Allocation Grid */}
      <div className="space-y-4">
        {deptEmployees.length > 0 ? (
          deptEmployees.map(emp => {
            const empTasks = getTasksForEmployee(emp.id);
            const workload = getTotalTaskHours(empTasks);
            const completedTasks = empTasks.filter(t => t.status === 'Completed').length;

            return (
              <div key={emp.id} className="bg-white rounded  border border-gray-200 overflow-hidden">
                {/* Employee Header */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100p-2   flex justify-between items-start">
                  <div>
                    <h3 className=" text-gray-900">
                      {emp.first_name} {emp.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">{emp.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Tasks</p>
                        <p className="text-lg   text-white ">{empTasks.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Completed</p>
                        <p className="text-lg   text-green-600">{completedTasks}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Workload</p>
                        <p className="text-lg  ">{workload} hrs</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tasks List */}
                {empTasks.length > 0 ? (
                  <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
                    {empTasks.map(task => (
                      <div key={task.id} className={`p-3 rounded  border-l-4 ${getPriorityColor(task.priority)}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 flex items-start gap-2">
                            <div className="mt-0.5">
                              {getStatusIcon(task.status)}
                            </div>
                            <div className="flex-1">
                              <p className=" text-sm">{task.title}</p>
                              <p className="text-xs text-gray-600 mt-0.5">{task.description}</p>
                            </div>
                          </div>
                          <span className={`p-1  rounded text-xs  whitespace-nowrap ${task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-sm">No tasks assigned for this date</p>
                  </div>
                )}

                {/* Workload Bar */}
                <div className="px-4 py-3 bg-gray-50 border-t">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Workload Distribution</span>
                    <span className={workload > 8 ? 'text-red  ' : 'text-gray-600'}>
                      {workload > 8 ? '⚠️ High' : workload > 0 ? '✓ Balanced' : 'Empty'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${workload > 8 ? 'bg-red-600' :
                          workload > 4 ? 'bg-yellow-500' :
                            'bg-green-600'
                        }`}
                      style={{ width: `${Math.min((workload / 12) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {workload} / 8 hours recommended daily workload
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded  p-8 text-center text-gray-500 border border-gray-200">
            <Users size={48} className="mx-auto mb-3 opacity-50" />
            <p className="">No employees in this department</p>
          </div>
        )}
      </div>

      {/* Team Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded p-2   border border-blue-200">
          <h3 className=" text-blue-900 mb-2">💡 Allocation Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Recommended daily workload: 6-8 hours per employee</li>
            <li>✓ High priority tasks should be distributed evenly</li>
            <li>✓ Consider employee skills when assigning tasks</li>
            <li>✓ Monitor overallocated employees for burnout</li>
          </ul>
        </div>

        <div className="bg-green-50 rounded p-2   border border-green-200">
          <h3 className=" text-green-900 mb-2">📊 Team Performance</h3>
          <div className="text-sm text-green-800 space-y-1">
            <div className="flex justify-between">
              <span>Avg Tasks/Employee:</span>
              <span className="">
                {deptEmployees.length > 0
                  ? (deptEmployees.reduce((sum, emp) => sum + getTasksForEmployee(emp.id).length, 0) / deptEmployees.length).toFixed(1)
                  : 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Team Completion Rate:</span>
              <span className="">
                {tasks.length > 0
                  ? ((tasks.filter(t => t.status === 'Completed').length / tasks.length) * 100).toFixed(0)
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDailyAllocation;

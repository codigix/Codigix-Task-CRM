import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Filter,
  Search,
  ChevronDown,
  MoreVertical,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TaskReportsPage = () => {
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('2025');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthlyData, setMonthlyData] = useState([]);
  const [typeData, setTypeData] = useState([]);

  const generateMonthlyDataFromTasks = (tasksList, selectedYear) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthCounts = Array(12).fill(0);

    tasksList.forEach((task) => {
      if (task.created_at) {
        try {
          const date = new Date(task.created_at);
          if (!isNaN(date.getTime()) && date.getFullYear().toString() === selectedYear) {
            monthCounts[date.getMonth()]++;
          }
        } catch (e) {
          console.error('Error parsing date:', task.created_at);
        }
      }
    });

    return months.map((month, index) => ({
      month,
      value: monthCounts[index]
    }));
  };

  const generateTypeDataFromTasks = (tasksList) => {
    const typeCounts = {};
    const colors = {
      'Open': '#0ea5e9',
      'In Progress': '#6366f1',
      'Completed': '#10b981',
      'On Hold': '#f59e0b'
    };

    tasksList.forEach((task) => {
      const status = task.status || 'Open';
      typeCounts[status] = (typeCounts[status] || 0) + 1;
    });

    return Object.entries(typeCounts).map(([name, value]) => ({
      name,
      value,
      color: colors[name] || '#6B7280'
    }));
  };

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
        const response = await fetch(`${apiUrl}/tasks`);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        let data = await response.json();

        if (!Array.isArray(data)) {
          data = data?.data || data?.tasks || [];
        }

        if (Array.isArray(data)) {
          const formattedTasks = data.map((task, index) => ({
            id: task.id,
            color: ['blue', 'yellow', 'green', 'red'][index % 4],
            title: task.title || 'Untitled Task',
            tags: [task.status || 'Pending'],
            category: task.priority || 'Medium',
            date: task.created_at ? new Date(task.created_at).toLocaleDateString() : 'N/A',
            avatar: `https://i.pravatar.cc/32?img=${index}`,
            created_at: task.created_at,
            status: task.status,
            priority: task.priority
          }));

          setTasks(formattedTasks);

          const monthly = generateMonthlyDataFromTasks(formattedTasks, year);
          const typeBreakdown = generateTypeDataFromTasks(formattedTasks);

          setMonthlyData(monthly);
          setTypeData(typeBreakdown);
          setError('');
        } else {
          throw new Error('Invalid data format');
        }
      } catch (err) {
        console.error('❌ Error fetching tasks:', err);
        setError(err.message || 'Failed to fetch tasks');
        setTasks([]);
        setMonthlyData([]);
        setTypeData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      const monthly = generateMonthlyDataFromTasks(tasks, year);
      setMonthlyData(monthly);
    }
  }, [year, tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task =>
      task.title.toLowerCase().includes(query.toLowerCase())
    );
  }, [tasks, query]);

  const getTagColor = (tag) => {
    const colors = {
      'Open': 'bg-yellow-100 text-yellow-700',
      'In Progress': 'bg-blue-100 text-blue-700',
      'Completed': 'bg-green-100 text-green-700',
      'On Hold': 'bg-red-100 text-red-700',
      'Calls': 'bg-green-100 text-green-700',
      'Email': 'bg-blue-100 text-blue-700',
      'Pending': 'bg-yellow-100 text-yellow-700',
      'Inprogress': 'bg-yellow-100 text-yellow-700',
      'Task': 'bg-purple-100 text-purple-700',
      'Meeting': 'bg-pink-100 text-pink-700',
      'Rejected': 'bg-red-100 text-red-700',
    };
    return colors[tag] || 'bg-gray-100 text-gray-700';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Low': 'bg-green-100 text-green-600',
      'Medium': 'bg-yellow-100 text-yellow-600',
      'High': 'bg-orange-100 text-orange-600',
      'Critical': 'bg-red-100 text-red '
    };
    return colors[category] || 'bg-gray-100 text-gray-600';
  };

  const getBorderColor = (color) => {
    const colors = {
      blue: 'border-blue-400',
      red: 'border-red-400',
      yellow: 'border-yellow-400',
      green: 'border-green-400'
    };
    return colors[color] || 'border-gray-400';
  };

  const TaskItem = ({ task }) => (
    <div className={`bg-white border-l-4 ${getBorderColor(task.color)} rounded  p-2 flex justify-between items-center hover:shadow-md transition-shadow border border-gray-200`}>
      <div className="flex items-center gap-3 flex-1">
        <input type="checkbox" className="cursor-pointer" />
        <span className="text-[#1F2020] cursor-move">≡</span>
        <span className="  text-xs  text-gray-900">{task.title}</span>
        <div className="flex gap-2">
          {task.tags && (() => {
            try {
              const tagsArray = typeof task.tags === 'string' ? JSON.parse(task.tags) : task.tags;
              return Array.isArray(tagsArray) ? tagsArray.map((tag, i) => (
                <span key={i} className={`text-xs p-1  rounded ${getTagColor(tag)}`}>
                  {tag}
                </span>
              )) : null;
            } catch (e) {
              return null;
            }
          })()}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <span className={`px-3 py-1 rounded text-xs   ${getCategoryColor(task.category)}`}>
          {task.category}
        </span>
        <span className="text-xs  text-gray-500 whitespace-nowrap">{task.date}</span>
        <img src={task.avatar} alt="avatar" className="w-8 h-8 rounded-full" onError={(e) => e.target.src = 'https://i.pravatar.cc/32?img=0'} />
        <button className="p-1 hover:bg-gray-100 rounded transition-colors">
          <MoreVertical size={16} className="text-[#1F2020]" />
        </button>
      </div>
    </div>
  );

  const TaskGroup = ({ title, count, groupTasks }) => (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-gray-700  text-xs ">{title}</h3>
        {count > 0 && <span className="bg-red-100 text-red  text-xs p-1  rounded-full ">{count}</span>}
      </div>
      <div className="space-y-2">
        {groupTasks.length > 0 ? (
          groupTasks.map(task => (
            <TaskItem key={task.id} task={task} />
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">No tasks found</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 p-2 ">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl  text-gray-900">Task Reports</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs   bg-red-100 text-red-800">
                {tasks.length}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Home › Task Reports</p>
          </div>
          <button className="bg-red-600 text-white p-2  rounded  text-xs    hover:bg-red-700 transition-colors flex items-center gap-2">
            <Download size={16} />
            Download Report
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded   border border-gray-200p-3 ">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base  text-gray-900">Tasks By Year</h3>
                <select value={year} onChange={(e) => setYear(e.target.value)} className="text-xs  border border-gray-300 rounded p-1  text-gray-600">
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>
              {monthlyData.length > 0 ? (
                <TasksByYearChart data={monthlyData} />
              ) : (
                <div className="w-full h-[260px] flex items-center justify-center text-gray-500">
                  {loading ? 'Loading...' : 'No data available'}
                </div>
              )}
            </div>

            <div className="bg-white rounded   border border-gray-200p-3 ">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base  text-gray-900">Tasks By Status</h3>
                <select className="text-xs  border border-gray-300 rounded p-1  text-gray-600">
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>
              {typeData.length > 0 ? (
                <TasksByTypeChart data={typeData} />
              ) : (
                <div className="w-full h-[260px] flex items-center justify-center text-gray-500">
                  {loading ? 'Loading...' : 'No data available'}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded   border border-gray-200 p-2 mb-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1F2020]" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded  focus:outline-none focus:border-gray-400 text-xs  bg-white"
                  />
                </div>
                <select className="border border-gray-300 p-2 rounded  text-xs  text-gray-600 bg-white hover:border-gray-400">
                  <option>All Tasks</option>
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
                <button className="p-2 border border-gray-300 rounded  text-gray-600 text-xs    hover:bg-gray-50 flex items-center gap-2">
                  <Filter size={16} /> Filter
                </button>
                <div className="flex items-center gap-2 text-xs  text-gray-600">
                  <span>📅</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-xs  text-gray-600 hover:text-gray-900  ">
                  Mark all as read
                </button>
                <button className="border border-gray-300 p-2 rounded  text-gray-600 text-xs    hover:bg-gray-50 flex items-center gap-2">
                  Sort By <ChevronDown size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded   border border-gray-200p-3 ">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading tasks...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">Error: {error}</div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No tasks found</div>
            ) : (
              <TaskGroup title="All Tasks" count={filteredTasks.length} groupTasks={filteredTasks} />
            )}
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-gray-500 py-6 border-t border-gray-200 bg-white mt-6">
        <span>Copyright © 2025 <span className="text-red   ">AllINONE</span></span>
        <div className="flex gap-2 justify-center mt-2">
          <span className="cursor-pointer hover:text-gray-700">About</span>
          <span className="cursor-pointer hover:text-gray-700">Terms</span>
          <span className="cursor-pointer hover:text-gray-700">Contact Us</span>
        </div>
      </div>
    </div>
  );
};

function TasksByYearChart({ data }) {
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} />
          <YAxis tickFormatter={(v) => v} tick={{ fontSize: 12, fill: '#6B7280' }} />
          <Tooltip formatter={(v) => new Intl.NumberFormat().format(v)} />
          <Line type="monotone" dataKey="value" stroke="#1e40af" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TasksByTypeChart({ data }) {
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} innerRadius={60} outerRadius={95} dataKey="value" paddingAngle={3}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Legend verticalAlign="bottom" height={30} />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TaskReportsPage;

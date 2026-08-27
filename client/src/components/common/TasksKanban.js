import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, Plus, Search, GripVertical, Calendar, Clock, ChevronDown, User, CornerDownLeft, CheckSquare } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TasksKanban = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState(null);
  const draggedItemRef = useRef(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAddStatus, setActiveAddStatus] = useState(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [statusList, setStatusList] = useState([
    'TO DO',
    'in-progress',
    'pending requirements',
    'QA testing',
    'Done',
    'On Hold'
  ]);

  const STATUS_COLORS = {
    'TO DO': { bg: 'bg-blue-50', border: 'border-blue-200', header: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    'in-progress': { bg: 'bg-yellow-50', border: 'border-yellow-200', header: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    'pending requirements': { bg: 'bg-purple-50', border: 'border-purple-200', header: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    'QA testing': { bg: 'bg-indigo-50', border: 'border-indigo-200', header: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    'Done': { bg: 'bg-green-50', border: 'border-green-200', header: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    'On Hold': { bg: 'bg-red-50', border: 'border-red-200', header: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const updatedTask = { ...task, status: newStatus };

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask),
      });

      if (response.ok) {
        showSuccessToast(`Task moved to ${newStatus}`);
      } else {
        throw new Error('Failed to update task');
      }
    } catch (err) {
      console.error('Error updating task:', err);
      showErrorToast('Failed to move task');
      loadTasks(); // Rollback
    }
  };

  const handleAddStatus = () => {
    const newStatus = window.prompt('Enter new status name:');
    if (newStatus && !statusList.includes(newStatus)) {
      setStatusList([...statusList, newStatus]);
    }
  };

  const handleAddNewTask = async (status) => {
    if (!newTaskName.trim()) {
      setActiveAddStatus(null);
      return;
    }

    const newTask = {
      id: Date.now(),
      title: newTaskName,
      status: status,
      priority: 'Medium',
      due_date: new Date().toISOString()
    };

    // Optimistic update
    setTasks(prev => [...prev, newTask]);
    setNewTaskName('');
    setActiveAddStatus(null);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });

      if (response.ok) {
        const savedTask = await response.json();
        setTasks(prev => prev.map(t => t.id === newTask.id ? savedTask : t));
        showSuccessToast('Task created successfully');
      } else {
        throw new Error('Failed to create task');
      }
    } catch (err) {
      console.error('Error creating task:', err);
      showErrorToast('Failed to create task');
      loadTasks(); // Rollback
    }
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    draggedItemRef.current = task;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('application/json', JSON.stringify(task));
        e.dataTransfer.setData('text/plain', String(task.id));
      } catch (err) {
        console.error('Error setting drag data:', err);
      }
    }
  };

  const handleDragEnd = (e) => {
    setDraggedTask(null);
    draggedItemRef.current = null;
    setDragOverStatus(null);
  };

  const handleDragOver = (e, status) => {
    if (e) {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    }
    if (dragOverStatus !== status) {
      setDragOverStatus(status);
    }
  };

  const handleDrop = (e, newStatus) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setDragOverStatus(null);
    let taskToUpdate = draggedItemRef.current || draggedTask;

    if (!taskToUpdate && e && e.dataTransfer) {
      try {
        const id = e.dataTransfer.getData('text/plain');
        if (id) {
          taskToUpdate = tasks.find(t => String(t.id) === id);
        }
      } catch (err) {
        console.error('Error retrieving drop data:', err);
      }
    }

    if (!taskToUpdate) return;

    handleStatusChange(taskToUpdate.id, newStatus);

    setDraggedTask(null);
    draggedItemRef.current = null;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Critical': 'bg-red-100 text-red-700',
      'High': 'bg-orange-100 text-orange-700',
      'Medium': 'bg-yellow-100 text-yellow-700',
      'Low': 'bg-green-100 text-green-700'
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  const filteredTasks = tasks.filter(task =>
    task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTasksByStatus = (status) => {
    return filteredTasks.filter(t => (t.status || 'Open') === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-gray-50 rounded">
        <div className="text-gray-600">Loading Kanban board...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded">
      <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg  text-gray-900">Task Board</h2>
          <span className="bg-red-100 text-red  px-2.5 py-0.5 rounded-full text-[12px] ">{tasks.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2020]" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 border border-gray-300 rounded text-xs  focus:outline-none focus:border-red-500 bg-white w-64"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 p-2 overflow-x-auto">
        <div className="flex gap-4 h-full min-h-[500px]">
          {statusList.map(status => {
            const statusTasks = getTasksByStatus(status);
            const colors = STATUS_COLORS[status] || { bg: 'bg-gray-50', border: 'border-gray-200', header: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };

            return (
              <div
                key={status}
                className={`flex-shrink-0 w-80 ${colors.bg} border ${colors.border} rounded flex flex-col transition-all duration-200 ${dragOverStatus === status ? 'ring-2 ring-blue-400 bg-blue-50/50' : ''}`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className={`${colors.header} px-4 py-3 rounded-t flex items-center justify-between border-b ${colors.border}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
                    <h3 className={`text-xs   ${colors.text}`}>{status}</h3>
                  </div>
                  <span className="text-xs text-gray-500 bg-white/50 p-1  rounded-full border border-gray-200">
                    {statusTasks.length}
                  </span>
                </div>

                <div className="flex-1 p-2 space-y-3 overflow-y-auto">
                  {statusTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, task.status)}
                      className="bg-white rounded border border-gray-200 p-3  cursor-move hover:shadow-md transition-shadow group relative"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <GripVertical size={14} className="text-[#1F2020] opacity-0 group-hover:opacity-100 transition-opacity" />
                          <h4 className="text-xs   text-gray-900 line-clamp-2">{task.title}</h4>
                        </div>
                        <button className="text-[#1F2020] hover:text-gray-600">
                          <MoreVertical size={14} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {task.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                          <div className="flex items-center gap-3">
                            {task.due_date && (
                              <div className="flex items-center gap-1 text-xs  text-gray-500">
                                <Calendar size={12} />
                                {formatDate(task.due_date)}
                              </div>
                            )}
                            <span className={`text-xs  px-1.5 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs   text-blue-700 border border-blue-200">
                            {task.title?.[0]?.toUpperCase() || 'T'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {statusTasks.length === 0 && !activeAddStatus && (
                    <div className="flex flex-col items-center justify-center h-32 text-[#1F2020] border-2 border-dashed border-gray-200 rounded m-2">
                      <Clock size={24} className="mb-2 opacity-20" />
                      <p className="text-xs">No tasks</p>
                    </div>
                  )}
                </div>

                <div className="p-2 border-t mt-auto">
                  {activeAddStatus === status ? (
                    <div className="border rounded  p-2 bg-white  border-blue-500">
                      <textarea
                        autoFocus
                        className="w-full text-xs  outline-none resize-none min-h-[60px]"
                        placeholder="What needs to be done?"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddNewTask(status);
                          }
                          if (e.key === 'Escape') {
                            setActiveAddStatus(null);
                            setNewTaskName('');
                          }
                        }}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 text-[#1F2020]">
                          <CheckSquare size={16} className="cursor-pointer hover:text-blue-500" />
                          <ChevronDown size={16} className="cursor-pointer hover:text-blue-500" />
                          <Calendar size={16} className="cursor-pointer hover:text-blue-500" />
                          <User size={16} className="cursor-pointer hover:text-blue-500" />
                        </div>
                        <button
                          onClick={() => handleAddNewTask(status)}
                          className="p-1.5 bg-gray-100 rounded hover:bg-gray-200 text-gray-600"
                        >
                          <CornerDownLeft size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveAddStatus(status)}
                      className="w-full flex items-center justify-center gap-2 py-2 text-gray-500 hover:bg-gray-100 rounded  text-xs   transition-colors"
                    >
                      <Plus size={16} /> Add Task
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex-shrink-0">
            <button
              onClick={handleAddStatus}
              className="w-80 h-[52px] border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-500 hover:border-red-500 hover:text-red-500 transition-colors bg-white/50"
            >
              <Plus size={20} className="mr-2" />
              Add Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksKanban;

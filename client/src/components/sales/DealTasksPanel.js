import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Calendar } from 'lucide-react';

const DealTasksPanel = ({ dealId }) => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadTasks();
  }, [dealId]);

  const loadTasks = () => {
    try {
      const stored = localStorage.getItem(`deal_tasks_${dealId}`);
      if (stored) {
        setTasks(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
    }
  };

  const addTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const task = {
      id: Date.now(),
      title: newTask,
      completed: false,
      dueDate: dueDate || null,
      priority: priority,
      createdAt: new Date().toISOString()
    };

    const updated = [task, ...tasks];
    setTasks(updated);
    localStorage.setItem(`deal_tasks_${dealId}`, JSON.stringify(updated));
    setNewTask('');
    setDueDate('');
    setPriority('Medium');
  };

  const toggleTask = (id) => {
    const updated = tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    setTasks(updated);
    localStorage.setItem(`deal_tasks_${dealId}`, JSON.stringify(updated));
  };

  const deleteTask = (id) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    localStorage.setItem(`deal_tasks_${dealId}`, JSON.stringify(updated));
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'High': 'bg-red-100 text-red-700 border-red-300',
      'Medium': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'Low': 'bg-green-100 text-green-700 border-green-300'
    };
    return colors[priority] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && !tasks.find(t => t.dueDate === dueDate)?.completed;
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'completed') return task.completed;
    if (filterStatus === 'pending') return !task.completed;
    return true;
  });

  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.filter(t => !t.completed).length;

  return (
    <div className="space-y-6">
      <div className="border border-gray-200 rounded  p-2 bg-gray-50">
        <h3 className=" text-gray-900 mb-4">Add New Task</h3>
        <form onSubmit={addTask}>
          <div className="space-y-3">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Task title..."
              className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!newTask.trim()}
              className="w-full p-2  bg-red-600 text-white rounded    text-xs  hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center transition"
            >
              <Plus size={16} /> Add Task
            </button>
          </div>
        </form>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`p-2 rounded  text-xs    transition ${filterStatus === 'all'
              ? 'bg-red-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
        >
          All ({tasks.length})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`p-2 rounded  text-xs    transition ${filterStatus === 'pending'
              ? 'bg-yellow-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilterStatus('completed')}
          className={`p-2 rounded  text-xs    transition ${filterStatus === 'completed'
              ? 'bg-green-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-xs ">
              {filterStatus === 'all' ? 'No tasks yet.' : `No ${filterStatus} tasks.`}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`border rounded  p-2 flex items-start gap-3 transition ${task.completed
                  ? 'bg-gray-50 border-gray-200'
                  : isOverdue(task.dueDate)
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
            >
              <button
                onClick={() => toggleTask(task.id)}
                className={`mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${task.completed
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 hover:border-green-500'
                  }`}
              >
                {task.completed && <Check size={14} className="text-white" />}
              </button>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs    ${task.completed
                      ? 'line-through text-gray-500'
                      : 'text-gray-900'
                    }`}
                >
                  {task.title}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  {task.dueDate && (
                    <span className={`inline-flex items-center gap-1 text-xs ${isOverdue(task.dueDate) && !task.completed
                        ? 'text-red  '
                        : 'text-gray-600'
                      }`}>
                      <Calendar size={12} />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  <span
                    className={`inline-block p-1  rounded text-xs  border ${getPriorityColor(task.priority)}`}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>

              <button
                onClick={() => deleteTask(task.id)}
                className="p-1 hover:bg-red-100 rounded transition text-[#1F2020] hover:text-red  flex-shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DealTasksPanel;
